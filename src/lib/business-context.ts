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
  displayName: string | null;
}

/** Server-side helper: resolves the signed-in user's business (their first active membership).
 * Multi-business switching is future scope (spec §77) — V1 assumes one business per owner. */
export async function getBusinessContext(): Promise<BusinessContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Ordered by created_at so this resolves to the SAME business on every request. Without an
  // explicit order, .limit(1) on a user with more than one active membership (easy to end up
  // with while testing — e.g. two businesses created during onboarding) is not guaranteed to
  // return the same row each time, which made pages intermittently 404/appear empty depending on
  // which business happened to get picked for that particular request.
  const { data: membership } = await supabase
    .from("business_members")
    .select("role, business_id, display_name, businesses(id, name, business_type, currency, prevent_expired_sale, low_stock_default_threshold)")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
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
    displayName: membership.display_name ?? null,
  };
}
