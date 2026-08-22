import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/utils";
import { RecordPaymentForm } from "@/components/credit/record-payment-form";

const TYPE_LABEL: Record<string, string> = {
  credit_sale: "Sale on credit",
  payment: "Payment received",
  refund: "Refund",
  adjustment: "Adjustment",
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;
  const loyaltyEnabled = business.loyalty_enabled;

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("business_id", business.id)
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) notFound();

  const { data: account } = await supabase
    .from("credit_accounts")
    .select("id, credit_limit")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .maybeSingle();

  const { data: balanceRow } = await supabase
    .from("credit_account_balances")
    .select("balance")
    .eq("business_id", business.id)
    .eq("customer_id", customerId)
    .maybeSingle();

  const balance = Number(balanceRow?.balance ?? 0);

  const { data: transactions } = account
    ? await supabase
        .from("credit_transactions")
        .select("id, type, amount, due_date, notes, created_at")
        .eq("credit_account_id", account.id)
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: loyaltyTxns } = loyaltyEnabled
    ? await supabase
        .from("loyalty_transactions")
        .select("id, type, points, description, created_at")
        .eq("customer_id", customerId)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [] };

  const loyaltyPoints = Number(customer.loyalty_points) || 0;
  const pointValue = business.loyalty_point_value;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/credit" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to Credit Book
      </Link>

      <div>
        <h1 className="text-xl font-bold">{customer.name}</h1>
        {customer.phone && <p className="text-sm text-text-secondary">{customer.phone}</p>}
      </div>

      <Card className="bg-primary-light/60 border-primary/20">
        <p className="text-xs font-medium text-text-secondary">Outstanding balance</p>
        <p className="mt-1 text-2xl font-bold text-primary-dark">{formatMoney(balance, business.currency)}</p>
        {account && account.credit_limit > 0 && (
          <p className="mt-1 text-xs text-text-secondary">Limit: {formatMoney(account.credit_limit, business.currency)}</p>
        )}
      </Card>

      {loyaltyEnabled && (
        <Card className="bg-gold-light/60 border-accent-gold/30">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-accent-gold" />
            <p className="text-xs font-medium text-text-secondary">Loyalty points</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-primary-dark">{loyaltyPoints}</p>
          <p className="mt-1 text-xs text-text-secondary">
            Worth {formatMoney(loyaltyPoints * pointValue, business.currency)} in discounts
          </p>
        </Card>
      )}

      {balance > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">Record a payment</p>
          <RecordPaymentForm customerId={customerId} />
        </Card>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">History</p>
        {!transactions || transactions.length === 0 ? (
          <Card className="py-8 text-center text-sm text-text-secondary">No transactions yet.</Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn) => (
              <Card key={txn.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{TYPE_LABEL[txn.type] ?? txn.type}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(txn.created_at)}
                    {txn.due_date ? ` · due ${formatDate(txn.due_date)}` : ""}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${Number(txn.amount) >= 0 ? "text-text" : "text-primary"}`}>
                  {Number(txn.amount) >= 0 ? "+" : ""}
                  {formatMoney(Math.abs(Number(txn.amount)), business.currency)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
      {loyaltyEnabled && (loyaltyTxns ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Loyalty history</p>
          <div className="space-y-2">
            {(loyaltyTxns ?? []).map((txn) => (
              <Card key={txn.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">
                    {txn.type === "earned" ? "Points earned" : txn.type === "redeemed" ? "Points redeemed" : "Adjustment"}
                  </p>
                  <p className="text-xs text-text-secondary">{formatDate(txn.created_at)}</p>
                </div>
                <p className={`text-sm font-semibold ${txn.points > 0 ? "text-primary" : "text-text"}`}>
                  {txn.points > 0 ? "+" : ""}{txn.points}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
