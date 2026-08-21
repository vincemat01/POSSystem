import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarClock, Lightbulb, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

function startOfTodayISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  const { data: todaysSales } = await supabase
    .from("sales")
    .select("id, total")
    .eq("business_id", business.id)
    .eq("status", "completed")
    .gte("sold_at", startOfTodayISO());

  const saleIds = (todaysSales ?? []).map((s) => s.id);
  const salesTotal = (todaysSales ?? []).reduce((sum, s) => sum + Number(s.total), 0);

  let profitTotal = 0;
  if (saleIds.length > 0) {
    const { data: items } = await supabase.from("sale_items").select("profit").in("sale_id", saleIds);
    profitTotal = (items ?? []).reduce((sum, i) => sum + Number(i.profit), 0);
  }

  const { data: balances } = await supabase
    .from("credit_account_balances")
    .select("credit_account_id, customer_id, balance")
    .eq("business_id", business.id)
    .gt("balance", 0);

  const creditOutstanding = (balances ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
  const creditCustomerCount = (balances ?? []).length;

  const today = new Date().toISOString().slice(0, 10);
  const { data: overdueSales } = await supabase
    .from("credit_transactions")
    .select("credit_account_id")
    .eq("business_id", business.id)
    .eq("type", "credit_sale")
    .lt("due_date", today);

  const overdueAccountIds = new Set((overdueSales ?? []).map((t) => t.credit_account_id));
  const overdueBalanceAccountIds = new Set(
    (balances ?? []).filter((b) => overdueAccountIds.has(b.credit_account_id)).map((b) => b.customer_id),
  );

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

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const { data: expiringBatches } = await supabase
    .from("inventory_batches")
    .select("product_id")
    .eq("business_id", business.id)
    .gt("quantity_remaining", 0)
    .not("expiry_date", "is", null)
    .lte("expiry_date", in30Days.toISOString().slice(0, 10))
    .gte("expiry_date", today);

  const expiringProductCount = new Set((expiringBatches ?? []).map((b) => b.product_id)).size;

  const { data: insight } = await supabase
    .from("ai_insights")
    .select("title, body")
    .eq("business_id", business.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold">
          {greeting()}{context.displayName ? `, ${context.displayName.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-sm text-text-secondary">{business.name}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Sales today</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(salesTotal, business.currency)}</p>
          <p className="mt-1 text-xs text-text-secondary">{todaysSales?.length ?? 0} sales</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Profit today</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(profitTotal, business.currency)}</p>
        </Card>
      </div>

      <Link href="/credit">
        <Card className="flex items-center justify-between hover:border-primary/30">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gold-light p-2">
              <Wallet className="h-5 w-5 text-accent-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold">People who owe you</p>
              <p className="text-xs text-text-secondary">
                {creditCustomerCount} customer{creditCustomerCount === 1 ? "" : "s"}
                {overdueBalanceAccountIds.size > 0 && `, ${overdueBalanceAccountIds.size} overdue`}
              </p>
            </div>
          </div>
          <p className="text-lg font-bold">{formatMoney(creditOutstanding, business.currency)}</p>
        </Card>
      </Link>

      <Link href="/products?filter=low_stock">
        <Card className="flex items-center gap-3 hover:border-primary/30">
          <div className="rounded-full bg-warning-light p-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-sm font-semibold">Stock running low</p>
            <p className="text-xs text-text-secondary">
              {lowStockProducts.length} product{lowStockProducts.length === 1 ? "" : "s"} below minimum
            </p>
          </div>
        </Card>
      </Link>

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
