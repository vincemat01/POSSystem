import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { PrintButton } from "@/components/reports/print-button";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  eft: "EFT",
  credit: "Credit",
  other: "Other",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function DailyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date = todayIso() } = await searchParams;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59`;

  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_number, total, status, sold_at, cashier_id, customer_id")
    .eq("business_id", business.id)
    .gte("sold_at", start)
    .lte("sold_at", end)
    .order("sold_at", { ascending: true });

  const completedSales = (sales ?? []).filter((s) => s.status === "completed");
  const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.total), 0);
  const saleIds = completedSales.map((s) => s.id);

  const { data: allCategories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("business_id", business.id);

  const categoryNameMap = new Map((allCategories ?? []).map((c) => [c.id, c.name]));

  let totalProfit = 0;
  let totalCogs = 0;
  const productSales = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();
  const categorySales = new Map<string, { name: string; qty: number; revenue: number; profit: number }>();

  if (saleIds.length > 0) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("product_id, quantity, unit_cost, unit_price, line_total, profit, products(name, category_id)")
      .in("sale_id", saleIds);

    for (const item of items ?? []) {
      totalProfit += Number(item.profit);
      totalCogs += Number(item.quantity) * Number(item.unit_cost);
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const name = product?.name ?? "Unknown";
      const existing = productSales.get(item.product_id) ?? { name, qty: 0, revenue: 0, profit: 0 };
      existing.qty += Number(item.quantity);
      existing.revenue += Number(item.line_total);
      existing.profit += Number(item.profit);
      productSales.set(item.product_id, existing);

      const catId = (product as Record<string, unknown>)?.category_id as string | null;
      const catKey = catId ?? "__uncategorised";
      const catName = catId ? (categoryNameMap.get(catId) ?? "Unknown") : "Uncategorised";
      const catExisting = categorySales.get(catKey) ?? { name: catName, qty: 0, revenue: 0, profit: 0 };
      catExisting.qty += Number(item.quantity);
      catExisting.revenue += Number(item.line_total);
      catExisting.profit += Number(item.profit);
      categorySales.set(catKey, catExisting);
    }
  }

  const { data: payments } = await supabase
    .from("payments")
    .select("method, amount")
    .eq("business_id", business.id)
    .gte("created_at", start)
    .lte("created_at", end);

  const paymentTotals = new Map<string, number>();
  for (const p of payments ?? []) {
    paymentTotals.set(p.method, (paymentTotals.get(p.method) ?? 0) + Number(p.amount));
  }

  const cashierIds = [...new Set(completedSales.map((s) => s.cashier_id).filter(Boolean))] as string[];
  const cashierNames = new Map<string, string>();
  for (const cid of cashierIds) {
    const { data: name } = await supabase.rpc("get_cashier_name", {
      p_business_id: business.id,
      p_user_id: cid,
    });
    if (name) cashierNames.set(cid, name as string);
  }

  const cashierSales = new Map<string, { count: number; total: number }>();
  for (const s of completedSales) {
    const key = s.cashier_id ?? "unknown";
    const existing = cashierSales.get(key) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += Number(s.total);
    cashierSales.set(key, existing);
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("category, amount")
    .eq("business_id", business.id)
    .gte("expense_date", date)
    .lte("expense_date", date);

  const totalExpenses = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  const { data: shifts } = await supabase
    .from("shifts")
    .select("user_id, started_at, ended_at, opening_cash, closing_cash")
    .eq("business_id", business.id)
    .gte("started_at", start)
    .lte("started_at", end + "Z")
    .order("started_at", { ascending: true });

  const topProducts = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const prevDate = new Date(`${date}T12:00:00`);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(`${date}T12:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  const isToday = date === todayIso();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/more/reports" className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <ChevronLeft className="h-4 w-4" /> Reports
        </Link>
        <PrintButton />
      </div>

      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold">Daily Report</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/more/reports/daily?date=${prevDate.toISOString().slice(0, 10)}`}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-text-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[6.5rem] text-center text-sm font-medium">
            {isToday ? "Today" : date}
          </span>
          <Link
            href={`/more/reports/daily?date=${nextDate.toISOString().slice(0, 10)}`}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-text-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{business.name} — Daily Report</h1>
        <p className="text-sm">{date}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Revenue</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(totalRevenue, business.currency)}</p>
          <p className="text-xs text-text-secondary">{completedSales.length} sales</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Profit</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatMoney(totalProfit, business.currency)}</p>
          <p className="text-xs text-text-secondary">
            {totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% margin` : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">COGS</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(totalCogs, business.currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Expenses</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(totalExpenses, business.currency)}</p>
        </Card>
      </div>

      {/* Payment breakdown */}
      <div>
        <p className="mb-2 text-sm font-semibold">Payments by method</p>
        {paymentTotals.size === 0 ? (
          <Card className="py-6 text-center text-sm text-text-secondary">No payments.</Card>
        ) : (
          <div className="space-y-1.5">
            {[...paymentTotals.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([method, amount]) => (
                <Card key={method} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">{METHOD_LABEL[method] ?? method}</span>
                  <span className="text-sm font-semibold">{formatMoney(amount, business.currency)}</span>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Sales by cashier */}
      {cashierSales.size > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Sales by cashier</p>
          <div className="space-y-1.5">
            {[...cashierSales.entries()]
              .sort((a, b) => b[1].total - a[1].total)
              .map(([cashierId, data]) => (
                <Card key={cashierId} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{cashierNames.get(cashierId) ?? "Unknown"}</p>
                    <p className="text-xs text-text-secondary">{data.count} sale{data.count !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(data.total, business.currency)}</span>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Sales by category */}
      {categorySales.size > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Sales by category</p>
          <div className="space-y-1.5">
            {[...categorySales.values()]
              .sort((a, b) => b.revenue - a.revenue)
              .map((cat) => (
                <Card key={cat.name} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-text-secondary">
                      {cat.qty} item{cat.qty !== 1 ? "s" : ""} · {formatMoney(cat.profit, business.currency)} profit
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(cat.revenue, business.currency)}</span>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Top products */}
      {topProducts.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Top products</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                  <th className="pb-2 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-b border-border/50">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right">{p.qty}</td>
                    <td className="py-2 text-right">{formatMoney(p.revenue, business.currency)}</td>
                    <td className="py-2 text-right text-primary">{formatMoney(p.profit, business.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift log */}
      {shifts && shifts.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Shift log</p>
          <div className="space-y-1.5">
            {shifts.map((shift, i) => {
              const name = cashierNames.get(shift.user_id) ?? "Unknown";
              const started = new Date(shift.started_at);
              const ended = shift.ended_at ? new Date(shift.ended_at) : null;
              const duration = ended
                ? Math.round((ended.getTime() - started.getTime()) / 60000)
                : null;

              return (
                <Card key={i} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-text-secondary">
                        {formatDateTime(shift.started_at)}
                        {ended ? ` — ${formatDateTime(shift.ended_at!)}` : " (active)"}
                        {duration !== null ? ` · ${Math.floor(duration / 60)}h ${duration % 60}m` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs text-text-secondary">
                      <p>Open: {formatMoney(shift.opening_cash, business.currency)}</p>
                      {shift.closing_cash !== null && (
                        <p>Close: {formatMoney(shift.closing_cash, business.currency)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All sales list */}
      {completedSales.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">All sales</p>
          <div className="space-y-1.5">
            {completedSales.map((s) => (
              <Link key={s.id} href={`/more/sales/${s.id}`}>
                <Card className="flex items-center justify-between py-2.5 hover:border-primary/30">
                  <div>
                    <p className="text-sm font-medium">{s.sale_number}</p>
                    <p className="text-xs text-text-secondary">
                      {formatDateTime(s.sold_at)}
                      {s.cashier_id ? ` · ${cashierNames.get(s.cashier_id) ?? "Staff"}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatMoney(s.total, business.currency)}</span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
