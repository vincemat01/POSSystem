import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function PurchasesPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, purchase_date, total_cost, notes, supplier_id, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const supplierIds = [...new Set((purchases ?? []).map((p) => p.supplier_id).filter(Boolean))] as string[];
  const { data: suppliers } =
    supplierIds.length > 0
      ? await supabase.from("suppliers").select("id, name").in("id", supplierIds)
      : { data: [] };

  const supplierMap = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Purchases</h1>
        <Link href="/more/purchases/new">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" /> Receive stock
          </span>
        </Link>
      </div>

      {!purchases || purchases.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          No purchases recorded yet. Tap &ldquo;Receive stock&rdquo; to record your first delivery.
        </Card>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <Link key={p.id} href={`/more/purchases/${p.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {p.supplier_id ? supplierMap.get(p.supplier_id) ?? "Unknown supplier" : "No supplier"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(p.purchase_date)}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold">{formatMoney(p.total_cost, business.currency)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
