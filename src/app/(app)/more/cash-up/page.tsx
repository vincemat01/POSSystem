import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { CashCount } from "@/components/cash-up/cash-count";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  eft: "EFT",
  credit: "Sold on credit",
  other: "Other",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashUpPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date = todayIso() } = await searchParams;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: payments } = await supabase
    .from("payments")
    .select("method, amount")
    .eq("business_id", business.id)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  const totals = new Map<string, { amount: number; count: number }>();
  for (const p of payments ?? []) {
    const entry = totals.get(p.method) ?? { amount: 0, count: 0 };
    entry.amount += Number(p.amount);
    entry.count += 1;
    totals.set(p.method, entry);
  }

  const cashTotal = totals.get("cash")?.amount ?? 0;
  const moneyCollected = [...totals.entries()]
    .filter(([method]) => method !== "credit")
    .reduce((sum, [, v]) => sum + v.amount, 0);

  const prevDate = new Date(start);
  prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(start);
  nextDate.setDate(nextDate.getDate() + 1);
  const isToday = date === todayIso();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cash Up</h1>
        <div className="flex items-center gap-1">
          <Link
            href={`/more/cash-up?date=${prevDate.toISOString().slice(0, 10)}`}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-text-secondary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="min-w-[6.5rem] text-center text-sm font-medium">
            {isToday ? "Today" : date}
          </span>
          <Link
            href={`/more/cash-up?date=${nextDate.toISOString().slice(0, 10)}`}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border text-text-secondary"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card>
        <p className="text-xs font-medium text-text-secondary">Expected cash in drawer</p>
        <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(cashTotal, business.currency)}</p>
        <p className="text-xs text-text-secondary">
          {totals.get("cash")?.count ?? 0} cash payment{(totals.get("cash")?.count ?? 0) === 1 ? "" : "s"}
        </p>
      </Card>

      <div>
        <p className="mb-2 text-sm font-semibold">By payment method</p>
        {totals.size === 0 ? (
          <Card className="py-8 text-center text-sm text-text-secondary">No payments recorded for this day.</Card>
        ) : (
          <div className="space-y-2">
            {[...totals.entries()]
              .sort((a, b) => b[1].amount - a[1].amount)
              .map(([method, v]) => (
                <Card key={method} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{METHOD_LABEL[method] ?? method}</p>
                    <p className="text-xs text-text-secondary">
                      {v.count} payment{v.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(v.amount, business.currency)}</p>
                </Card>
              ))}
          </div>
        )}
      </div>

      <Card className="flex items-center justify-between bg-primary-light">
        <span className="text-sm font-semibold text-primary-dark">Total collected (excl. credit)</span>
        <span className="text-lg font-bold text-primary-dark">{formatMoney(moneyCollected, business.currency)}</span>
      </Card>

      <CashCount expectedCash={cashTotal} currency={business.currency} />
    </div>
  );
}
