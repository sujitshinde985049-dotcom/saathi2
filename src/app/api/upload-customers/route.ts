import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeCustomerRow } from "@/lib/validations";
import { createAuditLog, getRequestMetadata } from "@/lib/audit";
import { generateSaathiId } from "@/lib/utils";
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
      return NextResponse.json(
        { error: "No records provided." },
        { status: 400 }
      );
    }

    if (records.length > 5000) {
      return NextResponse.json(
        { error: "Maximum 5000 records per upload." },
        { status: 400 }
      );
    }

    const allErrors: UploadError[] = [];
    const validRecords: Array<{
      full_name: string;
      mobile: string;
      email: string | null;
      aadhaar_last4: string | null;
      pan_number: string | null;
      address: string | null;
      city: string | null;
      state_code: string;
      zip_code: string;
      date_of_birth: string | null;
      saathi_id: string;
      society_id: string;
    }> = [];

    const seenMobiles = new Set<string>();

    for (let i = 0; i < records.length; i++) {
      const rowIndex = i + 2;
      const { data, errors } = normalizeCustomerRow(records[i], rowIndex);

      if (errors.length > 0) {
        errors.forEach((msg) => {
          allErrors.push({ row: rowIndex, message: msg });
        });
        continue;
      }

      if (!data) continue;

      if (seenMobiles.has(data.mobile)) {
        allErrors.push({
          row: rowIndex,
          field: "mobile",
          message: `Duplicate mobile number in upload: ${data.mobile}`,
        });
        continue;
      }
      seenMobiles.add(data.mobile);

      const { data: existing } = await adminClient
        .from("customers")
        .select("id")
        .eq("society_id", profile.society_id)
        .eq("mobile", data.mobile)
        .maybeSingle();

      if (existing) {
        allErrors.push({
          row: rowIndex,
          field: "mobile",
          message: `Customer with mobile ${data.mobile} already exists in this society.`,
        });
        continue;
      }

      const { data: saathiIdResult } = await adminClient.rpc("generate_saathi_id", {
        p_state_code: data.state_code,
        p_zip_code: data.zip_code,
      });

      const saathiId = saathiIdResult || generateSaathiId(data.state_code, data.zip_code);

      validRecords.push({
        full_name: data.full_name,
        mobile: data.mobile,
        email: data.email || null,
        aadhaar_last4: data.aadhaar_last4 || null,
        pan_number: data.pan_number || null,
        address: data.address || null,
        city: data.city || null,
        state_code: data.state_code,
        zip_code: data.zip_code,
        date_of_birth: data.date_of_birth || null,
        saathi_id: saathiId,
        society_id: profile.society_id,
      });
    }

    if (validRecords.length === 0) {
      return NextResponse.json(
        {
          error: "All records failed validation.",
          errors: allErrors,
        },
        { status: 422 }
      );
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("customers")
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
        upload_type: "customers",
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
      action: "upload_customers",
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
    console.error("Upload customers error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
