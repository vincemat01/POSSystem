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
  searchParams: Promise<{ q?: string; filter?: string; cat?: string }>;
}) {
  const { q, filter, cat } = await searchParams;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("business_id", business.id)
    .order("name");

  let query = supabase
    .from("products")
    .select("id, name, selling_price, unit, minimum_stock, barcode, active, image_url, category_id")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("name");

  if (q) query = query.ilike("name", `%${q}%`);
  if (cat) query = query.eq("category_id", cat);

  const { data: products } = await query;

  const { data: stockRows } = await supabase
    .from("product_stock")
    .select("product_id, quantity_on_hand")
    .eq("business_id", business.id)
    .eq("location_id", locationId);

  const stockByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, Number(r.quantity_on_hand)]));
  const categoryNames = new Map((categories ?? []).map((c) => [c.id, c.name]));

  let rows = (products ?? []).map((p) => ({ ...p, stock: stockByProduct.get(p.id) ?? 0 }));
  if (filter === "low_stock") {
    rows = rows.filter((p) => p.minimum_stock > 0 && p.stock <= p.minimum_stock);
  }

  const uncategorisedCount = filter !== "low_stock"
    ? (products ?? []).filter((p) => !p.category_id).length
    : rows.filter((p) => !p.category_id).length;

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
        {filter && <input type="hidden" name="filter" value={filter} />}
        {cat && <input type="hidden" name="cat" value={cat} />}
      </form>

      {(categories ?? []).length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <Link
            href={`/products${filter ? `?filter=${filter}` : ""}${q ? `${filter ? "&" : "?"}q=${q}` : ""}`}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              !cat
                ? "bg-primary text-white"
                : "bg-surface border border-border text-text-secondary hover:border-primary/40",
            )}
          >
            All
          </Link>
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              href={`/products?cat=${c.id}${filter ? `&filter=${filter}` : ""}${q ? `&q=${q}` : ""}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                cat === c.id
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-text-secondary hover:border-primary/40",
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {filter === "low_stock" && (
        <p className="text-sm text-text-secondary">Showing products at or below their low-stock threshold.</p>
      )}

      {rows.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          {q || cat ? "No products match your search." : "No products yet. Add your first one to get started."}
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((product) => {
            const low = product.minimum_stock > 0 && product.stock <= product.minimum_stock;
            return (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="flex items-center gap-3 hover:border-primary/30">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-[8px] object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] bg-primary-light text-lg font-bold text-primary">
                      {product.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-text-secondary">
                      {product.stock} {product.unit} in stock
                      {product.barcode ? ` · ${product.barcode}` : ""}
                      {product.category_id && categoryNames.has(product.category_id)
                        ? ` · ${categoryNames.get(product.category_id)}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
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
