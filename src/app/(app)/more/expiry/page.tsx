import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { daysUntil, formatDate } from "@/lib/utils";

function categorize(days: number): "expired" | "urgent" | "soon" | "normal" {
  if (days < 0) return "expired";
  if (days <= 7) return "urgent";
  if (days <= 30) return "soon";
  return "normal";
}

const CATEGORY_LABEL: Record<string, string> = {
  expired: "Expired",
  urgent: "Urgent (≤7 days)",
  soon: "Expiring soon (≤30 days)",
};

const CATEGORY_STYLE: Record<string, string> = {
  expired: "border-danger/30 bg-danger-light",
  urgent: "border-danger/20 bg-danger-light/60",
  soon: "border-warning/20 bg-warning-light",
};

export default async function ExpiryPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);

  const { data: batches } = await supabase
    .from("inventory_batches")
    .select("id, product_id, quantity_remaining, unit_cost, expiry_date, products(name, selling_price)")
    .eq("business_id", business.id)
    .eq("location_id", locationId)
    .gt("quantity_remaining", 0)
    .not("expiry_date", "is", null)
    .lte("expiry_date", in30Days.toISOString().slice(0, 10))
    .order("expiry_date", { ascending: true });

  type Batch = NonNullable<typeof batches>[number];
  const grouped: Record<"expired" | "urgent" | "soon", Batch[]> = { expired: [], urgent: [], soon: [] };
  for (const batch of batches ?? []) {
    const days = daysUntil(batch.expiry_date!);
    const category = categorize(days);
    if (category !== "normal") grouped[category].push(batch);
  }

  const totalCostAtRisk = (batches ?? []).reduce((sum, b) => sum + Number(b.quantity_remaining) * Number(b.unit_cost), 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Expiry</h1>

      {totalCostAtRisk > 0 && (
        <Card className="border-warning/20 bg-warning-light">
          <p className="text-sm text-text">
            <span className="font-semibold">R{totalCostAtRisk.toFixed(2)}</span> of stock cost is at risk within the
            next 30 days.
          </p>
        </Card>
      )}

      {(["expired", "urgent", "soon"] as const).map((category) => {
        const items = grouped[category];
        if (items.length === 0) return null;
        return (
          <div key={category}>
            <p className="mb-2 text-sm font-semibold">{CATEGORY_LABEL[category]}</p>
            <div className="space-y-2">
              {items.map((batch) => {
                const product = Array.isArray(batch.products) ? batch.products[0] : batch.products;
                const days = daysUntil(batch.expiry_date!);
                return (
                  <Card key={batch.id} className={CATEGORY_STYLE[category]}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{product?.name ?? "Unknown product"}</p>
                        <p className="text-xs text-text-secondary">{batch.quantity_remaining} units</p>
                      </div>
                      <p className="text-sm font-medium">
                        {days < 0 ? `Expired ${formatDate(batch.expiry_date!)}` : `${days}d · ${formatDate(batch.expiry_date!)}`}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {(batches ?? []).length === 0 && (
        <Card className="py-10 text-center text-sm text-text-secondary">
          Nothing expiring in the next 30 days.
        </Card>
      )}
    </div>
  );
}
