import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchSchema } from "@/lib/validations";
import { createAuditLog, getRequestMetadata } from "@/lib/audit";
import { generateOtp, hashOtp, generateRbiComplianceRef } from "@/lib/utils";

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
    const parsed = searchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { searchType, searchValue, purpose } = parsed.data;
    const normalizedValue =
      searchType === "saathi_id"
        ? searchValue.toUpperCase().trim()
        : searchValue.replace(/\s/g, "").trim();

    let customerQuery = adminClient
      .from("customers")
      .select("*, societies(name), loans(*)");

    if (searchType === "mobile") {
      customerQuery = customerQuery.eq("mobile", normalizedValue);
    } else {
      customerQuery = customerQuery.eq("saathi_id", normalizedValue);
    }

    const { data: customers } = await customerQuery;

    await createAuditLog({
      societyId: profile.society_id,
      userId: profile.id,
      action: "search_customer",
      entityType: "customer",
      details: { searchType, searchValue: normalizedValue, purpose },
      ipAddress,
      userAgent,
    });

    if (!customers || customers.length === 0) {
      return NextResponse.json({
        found: false,
        requiresConsent: false,
        isOwnSociety: false,
        message: "No customer found with the provided search criteria.",
      });
    }

    const customer = customers[0];

    if (customer.society_id === profile.society_id) {
      return NextResponse.json({
        found: true,
        requiresConsent: false,
        isOwnSociety: true,
        customer,
        message: "Customer found in your society.",
      });
    }

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const rbiRef = generateRbiComplianceRef();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: consentRequest, error: consentError } = await adminClient
      .from("consent_requests")
      .insert({
        requesting_society_id: profile.society_id,
        target_customer_id: customer.id,
        requested_by: profile.id,
        search_type: searchType,
        search_value: normalizedValue,
        status: "sent",
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        purpose,
        rbi_compliance_ref: rbiRef,
      })
      .select("*")
      .single();

    if (consentError) {
      return NextResponse.json(
        { error: "Failed to initiate consent request." },
        { status: 500 }
      );
    }

    await createAuditLog({
      societyId: profile.society_id,
      userId: profile.id,
      action: "consent_request",
      entityType: "consent_request",
      entityId: consentRequest.id,
      details: {
        targetCustomerId: customer.id,
        searchType,
        rbiComplianceRef: rbiRef,
        sandboxOtp: otp,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      found: true,
      requiresConsent: true,
      isOwnSociety: false,
      customer: {
        id: customer.id,
        mobile: customer.mobile,
        saathi_id: customer.saathi_id,
        full_name: customer.full_name,
      },
      consentRequest,
      message:
        "Customer found in another society. OTP consent has been sent to the customer's registered mobile number.",
      sandboxNote:
        process.env.NODE_ENV !== "production"
          ? `Sandbox OTP (dev only): ${otp}`
          : undefined,
    });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
