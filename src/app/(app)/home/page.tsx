import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, Lightbulb, Wallet, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { SalesChart } from "@/components/dashboard/sales-chart";

function startOfDayISO(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function HomePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  // Fetch 7 days of sales for the chart + today/yesterday comparison
  const sevenDaysAgo = startOfDayISO(6);
  const { data: weekSales } = await supabase
    .from("sales")
    .select("id, total, sold_at")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("sold_at", sevenDaysAgo);

  // Group sales by day
  const dailyTotals = new Map<string, number>();
  const dailySaleIds = new Map<string, string[]>();
  for (const sale of weekSales ?? []) {
    const day = sale.sold_at.slice(0, 10);
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + Number(sale.total));
    const ids = dailySaleIds.get(day) ?? [];
    ids.push(sale.id);
    dailySaleIds.set(day, ids);
  }

  // Build 7-day chart data
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const chartDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    chartDays.push({
      label: DAY_LABELS[d.getDay()],
      revenue: dailyTotals.get(dateStr) ?? 0,
      isToday: i === 0,
    });
  }

  // Today's numbers
  const todayRevenue = dailyTotals.get(todayStr) ?? 0;
  const todaySaleCount = dailySaleIds.get(todayStr)?.length ?? 0;

  // Yesterday comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const yesterdayRevenue = dailyTotals.get(yesterdayStr) ?? 0;

  const revenueChange = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : todayRevenue > 0 ? 100 : 0;

  // Today's profit
  const todayIds = dailySaleIds.get(todayStr) ?? [];
  let profitTotal = 0;
  if (todayIds.length > 0) {
    const { data: items } = await supabase.from("sale_items").select("profit").in("sale_id", todayIds);
    profitTotal = (items ?? []).reduce((sum, i) => sum + Number(i.profit), 0);
  }

  // Top 5 selling products today
  type TopProduct = { name: string; qty: number; revenue: number };
  const topProducts: TopProduct[] = [];
  if (todayIds.length > 0) {
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("product_id, quantity, line_total, products(name)")
      .in("sale_id", todayIds);

    const productMap = new Map<string, TopProduct>();
    for (const item of saleItems ?? []) {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const name = (product as { name: string } | null)?.name ?? "Unknown";
      const existing = productMap.get(item.product_id) ?? { name, qty: 0, revenue: 0 };
      existing.qty += Number(item.quantity);
      existing.revenue += Number(item.line_total);
      productMap.set(item.product_id, existing);
    }
    topProducts.push(
      ...[...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    );
  }

  // Recent 5 sales
  const { data: recentSales } = await supabase
    .from("sales")
    .select("id, sale_number, total, sold_at")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .order("sold_at", { ascending: false })
    .limit(5);

  // Credit outstanding
  const { data: balances } = await supabase
    .from("credit_account_balances")
    .select("credit_account_id, customer_id, balance")
    .eq("business_id", business.id)
    .gt("balance", 0);

  const creditOutstanding = (balances ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
  const creditCustomerCount = (balances ?? []).length;

  const { data: overdueSales } = await supabase
    .from("credit_transactions")
    .select("credit_account_id")
    .eq("business_id", business.id)
    .eq("type", "credit_sale")
    .lt("due_date", todayStr);

  const overdueAccountIds = new Set((overdueSales ?? []).map((t) => t.credit_account_id));
  const overdueBalanceAccountIds = new Set(
    (balances ?? []).filter((b) => overdueAccountIds.has(b.credit_account_id)).map((b) => b.customer_id),
  );

  // Low stock
  const { data: products } = await supabase
    .from("products")
    .select("id, name, minimum_stock")
    .eq("business_id", business.id)
    .eq("active", true);

  const { data: stockRows } = await supabase
    .from("product_stock")
    .select("product_id, quantity_on_hand")
    .eq("business_id", business.id)
    .eq("location_id", locationId);

  const stockByProduct = new Map((stockRows ?? []).map((r) => [r.product_id, Number(r.quantity_on_hand)]));
  const lowStockProducts = (products ?? []).filter((p) => {
    const onHand = stockByProduct.get(p.id) ?? 0;
    return p.minimum_stock > 0 && onHand <= p.minimum_stock;
  });

  // Expiring products
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const { data: expiringBatches } = await supabase
    .from("inventory_batches")
    .select("product_id")
    .eq("business_id", business.id)
    .gt("quantity_remaining", 0)
    .not("expiry_date", "is", null)
    .lte("expiry_date", in30Days.toISOString().slice(0, 10))
    .gte("expiry_date", todayStr);

  const expiringProductCount = new Set((expiringBatches ?? []).map((b) => b.product_id)).size;

  // AI insight
  const { data: insight } = await supabase
    .from("ai_insights")
    .select("title, body")
    .eq("business_id", business.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Format time for recent sales
  function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">
          {greeting()}{context.displayName ? `, ${context.displayName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-text-secondary">{business.name}</p>
      </div>

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Sales today</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(todayRevenue, business.currency)}</p>
          <div className="mt-1 flex items-center gap-1">
            {revenueChange > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : revenueChange < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-danger" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-text-secondary" />
            )}
            <span className={`text-xs font-medium ${revenueChange > 0 ? "text-success" : revenueChange < 0 ? "text-danger" : "text-text-secondary"}`}>
              {revenueChange !== 0 ? `${revenueChange > 0 ? "+" : ""}${revenueChange.toFixed(0)}% vs yesterday` : "Same as yesterday"}
            </span>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Profit today</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(profitTotal, business.currency)}</p>
          <p className="mt-1 text-xs text-text-secondary">
            {todaySaleCount} sale{todaySaleCount !== 1 ? "s" : ""} completed
          </p>
        </Card>
      </div>

      {/* 7-day trend chart */}
      <Card>
        <p className="mb-3 text-xs font-medium text-text-secondary">Last 7 days</p>
        <SalesChart days={chartDays} currency={business.currency} />
      </Card>

      {/* Top products today */}
      {topProducts.length > 0 && (
        <Card>
          <p className="mb-2 text-xs font-medium text-text-secondary">Top sellers today</p>
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <span className="text-xs text-text-secondary">{p.qty} sold</span>
                <span className="text-sm font-semibold">{formatMoney(p.revenue, business.currency)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alerts row */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/credit">
          <Card className="h-full hover:border-primary/30">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-gold-light p-1.5">
                <Wallet className="h-4 w-4 text-accent-gold" />
              </div>
              <p className="text-xs font-semibold">Credit owed</p>
            </div>
            <p className="mt-2 text-lg font-bold">{formatMoney(creditOutstanding, business.currency)}</p>
            <p className="text-xs text-text-secondary">
              {creditCustomerCount} customer{creditCustomerCount === 1 ? "" : "s"}
              {overdueBalanceAccountIds.size > 0 && ` · ${overdueBalanceAccountIds.size} overdue`}
            </p>
          </Card>
        </Link>
        <Link href="/products?filter=low_stock">
          <Card className="h-full hover:border-primary/30">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-warning-light p-1.5">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <p className="text-xs font-semibold">Low stock</p>
            </div>
            <p className="mt-2 text-lg font-bold">{lowStockProducts.length}</p>
            <p className="text-xs text-text-secondary">
              product{lowStockProducts.length === 1 ? "" : "s"} below minimum
            </p>
          </Card>
        </Link>
      </div>

      {expiringProductCount > 0 && (
        <Link href="/more/expiry">
          <Card className="flex items-center gap-3 hover:border-primary/30">
            <div className="rounded-full bg-warning-light p-2">
              <CalendarClock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold">Expiring soon</p>
              <p className="text-xs text-text-secondary">
                {expiringProductCount} product{expiringProductCount === 1 ? "" : "s"} expiring within 30 days
              </p>
            </div>
          </Card>
        </Link>
      )}

      {/* Recent sales */}
      {(recentSales ?? []).length > 0 && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">Recent sales</p>
            <Link href="/more/sales" className="text-xs font-medium text-primary">View all</Link>
          </div>
          <div className="space-y-1.5">
            {(recentSales ?? []).map((s) => (
              <Link key={s.id} href={`/more/sales/${s.id}`} className="flex items-center justify-between py-1 hover:text-primary">
                <div>
                  <p className="text-sm font-medium">{s.sale_number}</p>
                  <p className="text-[11px] text-text-secondary">{timeAgo(s.sold_at)}</p>
                </div>
                <span className="text-sm font-semibold">{formatMoney(s.total, business.currency)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* AI insight */}
      <Card className="bg-gold-light/60 border-accent-gold/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark">
          <Lightbulb className="h-4 w-4 text-accent-gold" />
          AI Business Tip
        </div>
        <p className="mt-1.5 text-sm text-text">
          {insight?.body ?? "No insights yet — check back once you have more sales history."}
        </p>
      </Card>
    </div>
  );
}
