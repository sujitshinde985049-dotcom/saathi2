import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { societySchema } from "@/lib/validations";
import { createAuditLog, getRequestMetadata } from "@/lib/audit";

async function verifySuperAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    return { error: "Forbidden", status: 403 };
  }

  return { profile, user };
}

export async function GET() {
  const auth = await verifySuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const adminClient = createAdminClient();
  const { data: societies, error } = await adminClient
    .from("societies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ societies });
}

export async function POST(request: Request) {
  const auth = await verifySuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const parsed = societySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { ipAddress, userAgent } = getRequestMetadata(request);

  const { data: society, error } = await adminClient
    .from("societies")
    .insert({
      name: parsed.data.name,
      registration_number: parsed.data.registration_number,
      state_code: parsed.data.state_code.toUpperCase(),
      zip_code: parsed.data.zip_code,
      address: parsed.data.address || null,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await createAuditLog({
    userId: auth.profile.id,
    action: "society_create",
    entityType: "society",
    entityId: society.id,
    details: { name: society.name, registration_number: society.registration_number },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ society }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await verifySuperAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { id, is_active } = body;

  if (!id) {
    return NextResponse.json({ error: "Society ID is required." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { ipAddress, userAgent } = getRequestMetadata(request);

  const { data: society, error } = await adminClient
    .from("societies")
    .update({ is_active })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await createAuditLog({
    userId: auth.profile.id,
    action: "society_update",
    entityType: "society",
    entityId: id,
    details: { is_active },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ society });
}
