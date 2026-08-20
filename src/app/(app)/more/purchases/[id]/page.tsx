import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate } from "@/lib/utils";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: purchase } = await supabase
    .from("purchases")
    .select("*")
    .eq("business_id", business.id)
    .eq("id", id)
    .maybeSingle();

  if (!purchase) notFound();

  const [{ data: items }, { data: supplier }] = await Promise.all([
    supabase
      .from("purchase_items")
      .select("id, product_id, quantity, unit_cost, line_total")
      .eq("purchase_id", id)
      .eq("business_id", business.id),
    purchase.supplier_id
      ? supabase.from("suppliers").select("name").eq("id", purchase.supplier_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name").in("id", productIds)
      : { data: [] };

  const productMap = new Map((products ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more/purchases" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to purchases
      </Link>

      <div>
        <h1 className="text-xl font-bold">Purchase details</h1>
        <p className="text-sm text-text-secondary">{formatDate(purchase.purchase_date)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Supplier</p>
          <p className="mt-1 text-sm font-semibold">{supplier?.name ?? "None"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Total cost</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatMoney(purchase.total_cost, business.currency)}</p>
        </Card>
      </div>

      {purchase.notes && (
        <Card>
          <p className="text-xs font-medium text-text-secondary">Notes</p>
          <p className="mt-1 text-sm">{purchase.notes}</p>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm font-semibold">Items ({items?.length ?? 0})</p>
        {!items || items.length === 0 ? (
          <p className="text-sm text-text-secondary">No items.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{productMap.get(item.product_id) ?? "Unknown product"}</p>
                  <p className="text-xs text-text-secondary">
                    {item.quantity} × {formatMoney(item.unit_cost, business.currency)}
                  </p>
                </div>
                <p className="font-semibold">{formatMoney(item.line_total, business.currency)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
