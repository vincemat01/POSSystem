import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export default async function CreditPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, loyalty_points")
    .eq("business_id", business.id)
    .eq("status", "active")
    .order("name");

  const { data: balances } = await supabase
    .from("credit_account_balances")
    .select("customer_id, balance")
    .eq("business_id", business.id);

  const balanceByCustomer = new Map((balances ?? []).map((b) => [b.customer_id, Number(b.balance)]));

  const today = new Date().toISOString().slice(0, 10);
  const { data: overdueSales } = await supabase
    .from("credit_transactions")
    .select("credit_account_id")
    .eq("business_id", business.id)
    .eq("type", "credit_sale")
    .lt("due_date", today);
  const overdueAccountIds = new Set((overdueSales ?? []).map((t) => t.credit_account_id));

  const { data: accounts } = await supabase
    .from("credit_accounts")
    .select("id, customer_id")
    .eq("business_id", business.id);
  const accountByCustomer = new Map((accounts ?? []).map((a) => [a.customer_id, a.id]));

  const totalOwed = (balances ?? []).reduce((sum, b) => sum + Number(b.balance), 0);
  const owingCustomers = (customers ?? []).filter((c) => (balanceByCustomer.get(c.id) ?? 0) > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Credit Book</h1>
        <Link href="/credit/new">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" /> Customer
          </span>
        </Link>
      </div>

      <Card className="bg-primary-light/60 border-primary/20">
        <p className="text-xs font-medium text-text-secondary">Total owed to you</p>
        <p className="mt-1 text-2xl font-bold text-primary-dark">{formatMoney(totalOwed, business.currency)}</p>
        <p className="mt-1 text-xs text-text-secondary">{owingCustomers.length} customers with a balance</p>
      </Card>

      {!customers || customers.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          No customers yet. Add one to start tracking credit.
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => {
            const balance = balanceByCustomer.get(customer.id) ?? 0;
            const accountId = accountByCustomer.get(customer.id);
            const overdue = accountId ? overdueAccountIds.has(accountId) : false;
            return (
              <Link key={customer.id} href={`/credit/${customer.id}`}>
                <Card className="flex items-center justify-between hover:border-primary/30">
                  <div>
                    <p className="text-sm font-semibold">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-text-secondary">{customer.phone}</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${balance > 0 ? "text-text" : "text-text-secondary"}`}>
                      {formatMoney(balance, business.currency)}
                    </p>
                    {overdue && balance > 0 && <p className="text-xs font-medium text-danger">Overdue</p>}
                    {business.loyalty_enabled && Number(customer.loyalty_points) > 0 && (
                      <p className="flex items-center justify-end gap-0.5 text-xs text-accent-gold">
                        <Star className="h-3 w-3" /> {customer.loyalty_points} pts
                      </p>
                    )}
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
