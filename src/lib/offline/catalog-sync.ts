import { createClient } from "@/lib/supabase/client";
import { db } from "./db";

/** Refresh the local product/customer cache from Supabase so the POS can search and sell with no
 * network (spec §45, §70). Safe to call often — it's a full upsert of small business catalogs. */
export async function syncCatalog(businessId: string, locationId: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const supabase = createClient();

  const [{ data: products }, { data: stockRows }, { data: customers }, { data: balances }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("id, business_id, name, barcode, sku, image_url, unit, cost_price, selling_price, category_id, tracks_expiry, tax_exempt, active")
      .eq("business_id", businessId)
      .eq("active", true),
    supabase.from("product_stock").select("product_id, quantity_on_hand").eq("business_id", businessId).eq("location_id", locationId),
    supabase.from("customers").select("id, business_id, name, phone, loyalty_points").eq("business_id", businessId).eq("status", "active"),
    supabase.from("credit_accounts").select("id, customer_id, credit_limit").eq("business_id", businessId),
    supabase.from("categories").select("id, business_id, name").eq("business_id", businessId).order("name"),
  ]);

  if (products) {
    const stockByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, Number(r.quantity_on_hand)]));
    await db.products.bulkPut(
      products.map((p) => ({ ...p, stock_on_hand: stockByProduct.get(p.id) ?? 0 })),
    );
  }

  if (categories) {
    await db.categories.bulkPut(categories);
  }

  if (customers) {
    const balancesByCustomer = new Map<string, { limit: number }>();
    for (const account of balances ?? []) {
      balancesByCustomer.set(account.customer_id, { limit: Number(account.credit_limit) });
    }
    const { data: creditBalances } = await supabase
      .from("credit_account_balances")
      .select("customer_id, balance")
      .eq("business_id", businessId);
    const balanceByCustomer = new Map((creditBalances ?? []).map((b) => [b.customer_id, Number(b.balance)]));

    await db.customers.bulkPut(
      customers.map((c) => ({
        id: c.id,
        business_id: c.business_id,
        name: c.name,
        phone: c.phone,
        credit_limit: balancesByCustomer.get(c.id)?.limit ?? 0,
        credit_balance: balanceByCustomer.get(c.id) ?? 0,
        loyalty_points: Number(c.loyalty_points) || 0,
      })),
    );
  }
}
