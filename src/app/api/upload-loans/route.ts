import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeLoanRow } from "@/lib/validations";
import { createAuditLog, getRequestMetadata } from "@/lib/audit";
import type { UploadError } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const adminClient = createAdminClient();
    const { ipAddress, userAgent } = getRequestMetadata(request);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, society_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.society_id) {
      return NextResponse.json(
        { error: "No society assigned to your account." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const records: Record<string, unknown>[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records provided." }, { status: 400 });
    }

    if (records.length > 5000) {
      return NextResponse.json(
        { error: "Maximum 5000 records per upload." },
        { status: 400 }
      );
    }

    const allErrors: UploadError[] = [];
    const validRecords: Array<{
      society_id: string;
      customer_id: string;
      loan_account_number: string;
      loan_type: string;
      principal_amount: number;
      outstanding_amount: number;
      interest_rate: number | null;
      disbursement_date: string | null;
      maturity_date: string | null;
      status: string;
    }> = [];

    for (let i = 0; i < records.length; i++) {
      const rowIndex = i + 2;
      const { data, errors } = normalizeLoanRow(records[i], rowIndex);

      if (errors.length > 0) {
        errors.forEach((msg) => {
          allErrors.push({ row: rowIndex, message: msg });
        });
        continue;
      }

      if (!data) continue;

      let customerQuery = adminClient
        .from("customers")
        .select("id")
        .eq("society_id", profile.society_id);

      if (data.saathi_id) {
        customerQuery = customerQuery.eq("saathi_id", data.saathi_id);
      } else if (data.mobile) {
        customerQuery = customerQuery.eq("mobile", data.mobile);
      }

      const { data: customer } = await customerQuery.maybeSingle();

      if (!customer) {
        allErrors.push({
          row: rowIndex,
          message: `Customer not found for ${data.saathi_id || data.mobile}.`,
        });
        continue;
      }

      const { data: existingLoan } = await adminClient
        .from("loans")
        .select("id")
        .eq("society_id", profile.society_id)
        .eq("loan_account_number", data.loan_account_number)
        .maybeSingle();

      if (existingLoan) {
        allErrors.push({
          row: rowIndex,
          field: "loan_account_number",
          message: `Loan account ${data.loan_account_number} already exists.`,
        });
        continue;
      }

      validRecords.push({
        society_id: profile.society_id,
        customer_id: customer.id,
        loan_account_number: data.loan_account_number,
        loan_type: data.loan_type,
        principal_amount: data.principal_amount,
        outstanding_amount: data.outstanding_amount ?? data.principal_amount,
        interest_rate: data.interest_rate ?? null,
        disbursement_date: data.disbursement_date || null,
        maturity_date: data.maturity_date || null,
        status: data.status ?? "active",
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json(
        { error: "All records failed validation.", errors: allErrors },
        { status: 422 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("loans")
      .insert(validRecords)
      .select("id");

    if (insertError) {
      return NextResponse.json(
        { error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }

    const { data: batch } = await adminClient
      .from("upload_batches")
      .insert({
        society_id: profile.society_id,
        uploaded_by: profile.id,
        upload_type: "loans",
        total_records: records.length,
        success_count: inserted?.length ?? 0,
        error_count: allErrors.length,
        errors: allErrors,
      })
      .select("id")
      .single();

    await createAuditLog({
      societyId: profile.society_id,
      userId: profile.id,
      action: "upload_loans",
      entityType: "upload_batch",
      entityId: batch?.id,
      details: {
        totalRecords: records.length,
        successCount: inserted?.length ?? 0,
        errorCount: allErrors.length,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      batchId: batch?.id,
      totalRecords: records.length,
      successCount: inserted?.length ?? 0,
      errorCount: allErrors.length,
      errors: allErrors,
    });
  } catch (err) {
    console.error("Upload loans error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
