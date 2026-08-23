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
    loyalty_enabled: boolean;
    loyalty_earn_rate: number;
    loyalty_point_value: number;
    tax_rate: number;
    tax_inclusive: boolean;
  };
  locationId: string;
  role: BusinessRole;
  userId: string;
  displayName: string | null;
}

export async function getBusinessContext(): Promise<BusinessContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("business_members")
    .select("role, business_id, businesses(id, name, business_type, currency, prevent_expired_sale, low_stock_default_threshold, loyalty_enabled, loyalty_earn_rate, loyalty_point_value, tax_rate, tax_inclusive)")
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

  let displayName: string | null = null;
  const { data: nameRow } = await supabase
    .from("business_members")
    .select("display_name")
    .eq("business_id", membership.business_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (nameRow && "display_name" in nameRow) {
    displayName = (nameRow as { display_name: string | null }).display_name;
  }

  return {
    business,
    locationId: location?.id ?? "",
    role: membership.role,
    userId: user.id,
    displayName,
  };
}
