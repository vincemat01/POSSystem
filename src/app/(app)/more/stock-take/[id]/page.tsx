import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function StockTakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: stockTake } = await supabase
    .from("stock_takes")
    .select("*")
    .eq("business_id", business.id)
    .eq("id", id)
    .maybeSingle();

  if (!stockTake) notFound();

  const { data: items } = await supabase
    .from("stock_take_items")
    .select("id, product_id, system_quantity, counted_quantity, difference, reason")
    .eq("stock_take_id", id)
    .eq("business_id", business.id);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name, unit").in("id", productIds)
      : { data: [] };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const totalDifferences = (items ?? []).filter((i) => i.difference !== 0).length;
  const totalSurplus = (items ?? []).filter((i) => i.difference > 0).reduce((s, i) => s + i.difference, 0);
  const totalShortage = (items ?? []).filter((i) => i.difference < 0).reduce((s, i) => s + i.difference, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more/stock-take" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to stock takes
      </Link>

      <div>
        <h1 className="text-xl font-bold">Stock take details</h1>
        <p className="text-sm text-text-secondary">
          {formatDate(stockTake.completed_at ?? stockTake.started_at)} · {items?.length ?? 0} products counted
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Differences</p>
          <p className="mt-1 text-xl font-bold">{totalDifferences}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Surplus</p>
          <p className="mt-1 text-xl font-bold text-primary">+{totalSurplus}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Shortage</p>
          <p className="mt-1 text-xl font-bold text-danger">{totalShortage}</p>
        </Card>
      </div>

      <Card>
        <p className="mb-2 text-sm font-semibold">Items</p>
        {!items || items.length === 0 ? (
          <p className="text-sm text-text-secondary">No items.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const product = productMap.get(item.product_id);
              return (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{product?.name ?? "Unknown"}</p>
                    <p className="text-xs text-text-secondary">
                      System: {item.system_quantity} → Counted: {item.counted_quantity}
                      {item.reason ? ` · ${item.reason}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.difference > 0
                        ? "bg-primary-light text-primary-dark"
                        : item.difference < 0
                          ? "bg-danger-light text-danger"
                          : "text-text-secondary"
                    }`}
                  >
                    {item.difference > 0 ? "+" : ""}
                    {item.difference} {product?.unit ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
