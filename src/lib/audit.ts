import { createAdminClient } from "@/lib/supabase/admin";
import type { AuditAction } from "@/lib/types";

interface AuditLogParams {
  societyId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    society_id: params.societyId ?? null,
    user_id: params.userId ?? null,
    action: params.action,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    details: params.details ?? {},
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });

  if (error) {
    console.error("Failed to create audit log:", error.message);
  }
}

export function getRequestMetadata(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;
  const userAgent = request.headers.get("user-agent");
  return { ipAddress, userAgent };
}
