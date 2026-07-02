import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { consentVerifySchema } from "@/lib/validations";
import { createAuditLog, getRequestMetadata } from "@/lib/audit";
import { hashOtp } from "@/lib/utils";

const MAX_OTP_ATTEMPTS = 3;

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
      .select("id, society_id")
      .eq("id", user.id)
      .single();

    if (!profile?.society_id) {
      return NextResponse.json(
        { error: "No society assigned to your account." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = consentVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { consentId, otp } = parsed.data;

    const { data: consent } = await adminClient
      .from("consent_requests")
      .select("*")
      .eq("id", consentId)
      .eq("requesting_society_id", profile.society_id)
      .single();

    if (!consent) {
      return NextResponse.json(
        { error: "Consent request not found." },
        { status: 404 }
      );
    }

    if (consent.status === "verified") {
      return NextResponse.json(
        { error: "Consent already verified." },
        { status: 400 }
      );
    }

    if (consent.status === "denied" || consent.status === "expired") {
      return NextResponse.json(
        { error: `Consent request is ${consent.status}. Please initiate a new search.` },
        { status: 400 }
      );
    }

    if (consent.otp_expires_at && new Date(consent.otp_expires_at) < new Date()) {
      await adminClient
        .from("consent_requests")
        .update({ status: "expired" })
        .eq("id", consentId);

      return NextResponse.json(
        { error: "OTP has expired. Please initiate a new search." },
        { status: 400 }
      );
    }

    if (consent.otp_attempts >= MAX_OTP_ATTEMPTS) {
      await adminClient
        .from("consent_requests")
        .update({ status: "denied" })
        .eq("id", consentId);

      await createAuditLog({
        societyId: profile.society_id,
        userId: profile.id,
        action: "consent_denied",
        entityType: "consent_request",
        entityId: consentId,
        details: { reason: "max_attempts_exceeded" },
        ipAddress,
        userAgent,
      });

      return NextResponse.json(
        { error: "Maximum OTP attempts exceeded. Consent denied." },
        { status: 403 }
      );
    }

    const submittedHash = await hashOtp(otp);

    if (submittedHash !== consent.otp_hash) {
      await adminClient
        .from("consent_requests")
        .update({ otp_attempts: consent.otp_attempts + 1 })
        .eq("id", consentId);

      return NextResponse.json(
        {
          error: `Invalid OTP. ${MAX_OTP_ATTEMPTS - consent.otp_attempts - 1} attempts remaining.`,
        },
        { status: 400 }
      );
    }

    await adminClient
      .from("consent_requests")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        otp_hash: null,
      })
      .eq("id", consentId);

    const { data: customer } = await adminClient
      .from("customers")
      .select("*, societies(name), loans(*)")
      .eq("id", consent.target_customer_id)
      .single();

    await createAuditLog({
      societyId: profile.society_id,
      userId: profile.id,
      action: "consent_verify",
      entityType: "consent_request",
      entityId: consentId,
      details: {
        targetCustomerId: consent.target_customer_id,
        rbiComplianceRef: consent.rbi_compliance_ref,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      verified: true,
      customer,
      message: "Consent verified. Customer data is now accessible for 24 hours.",
    });
  } catch (err) {
    console.error("Consent verify error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
