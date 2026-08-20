import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDateTime } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  voided: "Voided",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  cancelled: "Cancelled",
};

export default async function SalesHistoryPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: sales } = await supabase
    .from("sales")
    .select("id, sale_number, total, status, sold_at, customer_id")
    .eq("business_id", business.id)
    .order("sold_at", { ascending: false })
    .limit(50);

  const customerIds = [...new Set((sales ?? []).map((s) => s.customer_id).filter(Boolean))] as string[];
  const { data: customers } =
    customerIds.length > 0
      ? await supabase.from("customers").select("id, name").in("id", customerIds)
      : { data: [] };
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">Sales History</h1>

      {!sales || sales.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">No sales recorded yet.</Card>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <Link key={s.id} href={`/more/sales/${s.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.sale_number}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateTime(s.sold_at)}
                    {s.customer_id ? ` · ${customerMap.get(s.customer_id) ?? "Customer"}` : ""}
                    {s.status !== "completed" ? ` · ${STATUS_LABEL[s.status] ?? s.status}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold">{formatMoney(s.total, business.currency)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
