import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

const RANGES = [
  { key: "today", label: "Today", days: 0 },
  { key: "week", label: "This week", days: 7 },
  { key: "month", label: "This month", days: 30 },
] as const;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range = "today" } = await searchParams;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const selected = RANGES.find((r) => r.key === range) ?? RANGES[0];
  const since = new Date();
  since.setDate(since.getDate() - selected.days);
  since.setHours(0, 0, 0, 0);

  const { data: sales } = await supabase
    .from("sales")
    .select("id, total")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("sold_at", since.toISOString());

  const saleIds = (sales ?? []).map((s) => s.id);
  const revenue = (sales ?? []).reduce((sum, s) => sum + Number(s.total), 0);

  let cogs = 0;
  let profit = 0;
  const productProfits = new Map<string, number>();

  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity, unit_cost, profit, products(name)")
      .in("sale_id", saleIds);

    for (const item of items ?? []) {
      cogs += Number(item.quantity) * Number(item.unit_cost);
      profit += Number(item.profit);
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const name = product?.name ?? "Unknown";
      productProfits.set(name, (productProfits.get(name) ?? 0) + Number(item.profit));
    }
  }

  const topProducts = [...productProfits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Reports</h1>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/more/reports?range=${r.key}`}
            className={`h-9 rounded-[10px] px-3.5 text-sm font-medium leading-9 ${
              r.key === selected.key ? "bg-primary text-white" : "border border-border text-text-secondary"
            }`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Revenue</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(revenue, business.currency)}</p>
          <p className="text-xs text-text-secondary">{sales?.length ?? 0} sales</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Gross profit</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatMoney(profit, business.currency)}</p>
          <p className="text-xs text-text-secondary">{margin.toFixed(1)}% margin</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Cost of goods sold</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(cogs, business.currency)}</p>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Most profitable products</p>
        {topProducts.length === 0 ? (
          <Card className="py-8 text-center text-sm text-text-secondary">No sales in this period yet.</Card>
        ) : (
          <div className="space-y-2">
            {topProducts.map(([name, p]) => (
              <Card key={name} className="flex items-center justify-between py-3">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-sm font-semibold text-primary">{formatMoney(p, business.currency)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
