import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate, daysUntil } from "@/lib/utils";
import { ReminderActions } from "@/components/credit/reminder-actions";

interface ReminderEntry {
  customerId: string;
  name: string;
  phone: string | null;
  balance: number;
  dueDate: string;
  daysUntil: number;
}

export default async function CreditRemindersPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const [{ data: accounts }, { data: balances }, { data: dueSales }, { data: customers }] = await Promise.all([
    supabase.from("credit_accounts").select("id, customer_id").eq("business_id", business.id),
    supabase.from("credit_account_balances").select("customer_id, balance").eq("business_id", business.id),
    supabase
      .from("credit_transactions")
      .select("credit_account_id, due_date")
      .eq("business_id", business.id)
      .eq("type", "credit_sale")
      .not("due_date", "is", null),
    supabase.from("customers").select("id, name, phone").eq("business_id", business.id),
  ]);

  const customerByAccount = new Map((accounts ?? []).map((a) => [a.id, a.customer_id]));
  const balanceByCustomer = new Map((balances ?? []).map((b) => [b.customer_id, Number(b.balance)]));
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  const dueDatesByCustomer = new Map<string, string[]>();
  for (const txn of dueSales ?? []) {
    const customerId = customerByAccount.get(txn.credit_account_id);
    if (!customerId || !txn.due_date) continue;
    const list = dueDatesByCustomer.get(customerId) ?? [];
    list.push(txn.due_date);
    dueDatesByCustomer.set(customerId, list);
  }

  const overdue: ReminderEntry[] = [];
  const dueSoon: ReminderEntry[] = [];

  for (const [customerId, dueDates] of dueDatesByCustomer) {
    const balance = balanceByCustomer.get(customerId) ?? 0;
    if (balance <= 0) continue;

    const customer = customerMap.get(customerId);
    if (!customer) continue;

    const overdueDates = dueDates.filter((d) => daysUntil(d) < 0).sort();
    const upcomingDates = dueDates.filter((d) => daysUntil(d) >= 0).sort();

    if (overdueDates.length > 0) {
      const oldest = overdueDates[0];
      overdue.push({
        customerId,
        name: customer.name,
        phone: customer.phone,
        balance,
        dueDate: oldest,
        daysUntil: daysUntil(oldest),
      });
    } else if (upcomingDates.length > 0 && daysUntil(upcomingDates[0]) <= 7) {
      const soonest = upcomingDates[0];
      dueSoon.push({
        customerId,
        name: customer.name,
        phone: customer.phone,
        balance,
        dueDate: soonest,
        daysUntil: daysUntil(soonest),
      });
    }
  }

  overdue.sort((a, b) => a.daysUntil - b.daysUntil);
  dueSoon.sort((a, b) => a.daysUntil - b.daysUntil);

  function buildMessage(entry: ReminderEntry) {
    const status =
      entry.daysUntil < 0
        ? `was due ${formatDate(entry.dueDate)} (${Math.abs(entry.daysUntil)} day${Math.abs(entry.daysUntil) === 1 ? "" : "s"} overdue)`
        : entry.daysUntil === 0
          ? `is due today`
          : `is due ${formatDate(entry.dueDate)} (in ${entry.daysUntil} day${entry.daysUntil === 1 ? "" : "s"})`;
    return `Hi ${entry.name}, this is a reminder from ${business.name} that your account balance of ${formatMoney(entry.balance, business.currency)} ${status}. Please settle at your earliest convenience. Thank you!`;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/credit" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to Credit Book
      </Link>
      <h1 className="text-xl font-bold">Credit Reminders</h1>
      <p className="text-sm text-text-secondary">
        Customers whose credit is overdue or due within 7 days. Sending is always manual — tap
        WhatsApp to open a prefilled message, or copy it to send by SMS or email yourself.
      </p>

      {overdue.length === 0 && dueSoon.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          <Bell className="mx-auto mb-2 h-8 w-8 text-text-secondary/50" />
          No reminders needed right now.
        </Card>
      ) : (
        <>
          {overdue.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-danger">Overdue ({overdue.length})</p>
              <div className="space-y-2">
                {overdue.map((entry) => (
                  <Card key={entry.customerId} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/credit/${entry.customerId}`} className="text-sm font-semibold hover:underline">
                          {entry.name}
                        </Link>
                        <p className="text-xs text-text-secondary">
                          {entry.phone ?? "No phone on file"} · Due {formatDate(entry.dueDate)} ·{" "}
                          <span className="font-medium text-danger">
                            {Math.abs(entry.daysUntil)} day{Math.abs(entry.daysUntil) === 1 ? "" : "s"} overdue
                          </span>
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatMoney(entry.balance, business.currency)}</p>
                    </div>
                    <ReminderActions phone={entry.phone} message={buildMessage(entry)} />
                  </Card>
                ))}
              </div>
            </div>
          )}

          {dueSoon.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Due soon ({dueSoon.length})</p>
              <div className="space-y-2">
                {dueSoon.map((entry) => (
                  <Card key={entry.customerId} className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/credit/${entry.customerId}`} className="text-sm font-semibold hover:underline">
                          {entry.name}
                        </Link>
                        <p className="text-xs text-text-secondary">
                          {entry.phone ?? "No phone on file"} ·{" "}
                          {entry.daysUntil === 0 ? "Due today" : `Due ${formatDate(entry.dueDate)} (in ${entry.daysUntil}d)`}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{formatMoney(entry.balance, business.currency)}</p>
                    </div>
                    <ReminderActions phone={entry.phone} message={buildMessage(entry)} />
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
