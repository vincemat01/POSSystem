import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q, filter } = await searchParams;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  let query = supabase
    .from("products")
    .select("id, name, selling_price, unit, minimum_stock, barcode, active")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products } = await query;

  const { data: stockRows } = await supabase
    .from("product_stock")
    .select("product_id, quantity_on_hand")
    .eq("business_id", business.id)
    .eq("location_id", locationId);

  const stockByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, Number(r.quantity_on_hand)]));

  let rows = (products ?? []).map((p) => ({ ...p, stock: stockByProduct.get(p.id) ?? 0 }));
  if (filter === "low_stock") {
    rows = rows.filter((p) => p.minimum_stock > 0 && p.stock <= p.minimum_stock);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <Link href="/products/new">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" /> Add
          </span>
        </Link>
      </div>

      <form className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search products…"
          className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </form>

      {filter === "low_stock" && (
        <p className="text-sm text-text-secondary">Showing products at or below their low-stock threshold.</p>
      )}

      {rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          {q ? "No products match your search." : "No products yet. Add your first one to get started."}
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((product) => {
            const low = product.minimum_stock > 0 && product.stock <= product.minimum_stock;
            return (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="flex items-center justify-between hover:border-primary/30">
                  <div>
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-text-secondary">
                      {product.stock} {product.unit} in stock
                      {product.barcode ? ` · ${product.barcode}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatMoney(product.selling_price, business.currency)}</p>
                    {low && <p className={cn("text-xs font-medium text-warning")}>Low stock</p>}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
