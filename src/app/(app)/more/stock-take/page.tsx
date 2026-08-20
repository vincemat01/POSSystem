import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function StockTakePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: stockTakes } = await supabase
    .from("stock_takes")
    .select("id, status, started_at, completed_at")
    .eq("business_id", business.id)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Stock Take</h1>
        <Link href="/more/stock-take/new">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" /> New count
          </span>
        </Link>
      </div>

      {!stockTakes || stockTakes.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          No stock takes yet. Tap &ldquo;New count&rdquo; to reconcile your physical stock.
        </Card>
      ) : (
        <div className="space-y-2">
          {stockTakes.map((st) => (
            <Link key={st.id} href={`/more/stock-take/${st.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    Stock take — {formatDate(st.completed_at ?? st.started_at)}
                  </p>
                  <p className="text-xs text-text-secondary capitalize">{st.status}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
