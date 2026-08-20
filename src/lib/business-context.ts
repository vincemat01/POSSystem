import { createClient } from "@/lib/supabase/server";
import type { BusinessRole } from "@/lib/supabase/types";

export interface BusinessContext {
  business: {
    id: string;
    name: string;
    business_type: string;
    currency: string;
    prevent_expired_sale: boolean;
    low_stock_default_threshold: number;
  };
  locationId: string;
  role: BusinessRole;
  userId: string;
}

/** Server-side helper: resolves the signed-in user's business (their first active membership).
 * Multi-business switching is future scope (spec §77) — V1 assumes one business per owner. */
export async function getBusinessContext(): Promise<BusinessContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, business_id, businesses(id, name, business_type, currency, prevent_expired_sale, low_stock_default_threshold)")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!membership || !membership.businesses) return null;

  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("business_id", membership.business_id)
    .eq("is_primary", true)
    .maybeSingle();

  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;

  return {
    business,
    locationId: location?.id ?? "",
    role: membership.role,
    userId: user.id,
  };
}
