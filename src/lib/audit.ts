import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/** Records a sensitive action to audit_logs (spec §62/§63: changed price, adjusted stock, changed
 * user permissions, recorded payment, etc). Never blocks the caller — the underlying action has
 * already succeeded by the time this runs, so a logging failure is swallowed rather than surfaced. */
export async function logAuditEvent(
  supabase: SupabaseClient<Database>,
  event: {
    businessId: string;
    userId: string;
    locationId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    business_id: event.businessId,
    user_id: event.userId,
    location_id: event.locationId ?? null,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    old_value: event.oldValue ?? null,
    new_value: event.newValue ?? null,
  });
  if (error) {
    console.error("Failed to record audit log event", event.action, error);
  }
}
