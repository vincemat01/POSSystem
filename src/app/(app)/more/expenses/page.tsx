import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/utils";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function ExpensesPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, amount, description, expense_date")
    .eq("business_id", business.id)
    .order("expense_date", { ascending: false })
    .limit(50);

  const total = (expenses ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Expenses</h1>

      <ExpenseForm />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Recent</p>
          <p className="text-sm text-text-secondary">{formatMoney(total, business.currency)} total</p>
        </div>
        {!expenses || expenses.length === 0 ? (
          <Card className="py-8 text-center text-sm text-text-secondary">No expenses recorded yet.</Card>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <Card key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{e.category}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(e.expense_date)}
                    {e.description ? ` · ${e.description}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold">{formatMoney(e.amount, business.currency)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
