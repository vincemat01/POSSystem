import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate, daysUntil } from "@/lib/utils";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", business.id)
    .eq("id", id)
    .maybeSingle();

  if (!product) notFound();

  const { data: stockRows } = await supabase
    .from("product_stock")
    .select("quantity_on_hand")
    .eq("business_id", business.id)
    .eq("product_id", id)
    .eq("location_id", locationId)
    .maybeSingle();

  const stock = Number(stockRows?.quantity_on_hand ?? 0);
  const profit = Number(product.selling_price) - Number(product.cost_price);
  const margin = Number(product.selling_price) > 0 ? (profit / Number(product.selling_price)) * 100 : 0;

  const { data: batches } = product.tracks_expiry
    ? await supabase
        .from("inventory_batches")
        .select("id, quantity_remaining, expiry_date, received_date")
        .eq("business_id", business.id)
        .eq("product_id", id)
        .gt("quantity_remaining", 0)
        .order("expiry_date", { ascending: true, nullsFirst: false })
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>

      <div>
        <h1 className="text-xl font-bold">{product.name}</h1>
        {product.barcode && <p className="text-xs text-text-secondary">{product.barcode}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <p className="text-xs font-medium text-text-secondary">Selling price</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(product.selling_price, business.currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Cost price</p>
          <p className="mt-1 text-xl font-bold">{formatMoney(product.cost_price, business.currency)}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">Profit / unit</p>
          <p className="mt-1 text-xl font-bold text-primary">{formatMoney(profit, business.currency)}</p>
          <p className="text-xs text-text-secondary">{margin.toFixed(1)}% margin</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-text-secondary">In stock</p>
          <p className="mt-1 text-xl font-bold">
            {stock} <span className="text-sm font-normal text-text-secondary">{product.unit}</span>
          </p>
          {product.minimum_stock > 0 && stock <= product.minimum_stock && (
            <p className="text-xs font-medium text-warning">Below minimum of {product.minimum_stock}</p>
          )}
        </Card>
      </div>

      {product.tracks_expiry && (
        <Card>
          <p className="mb-2 text-sm font-semibold">Batches</p>
          {!batches || batches.length === 0 ? (
            <p className="text-sm text-text-secondary">No stock on hand.</p>
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => {
                const daysLeft = batch.expiry_date ? daysUntil(batch.expiry_date) : null;
                return (
                  <div key={batch.id} className="flex items-center justify-between text-sm">
                    <span>{batch.quantity_remaining} units</span>
                    <span className={daysLeft !== null && daysLeft <= 7 ? "font-medium text-danger" : "text-text-secondary"}>
                      {batch.expiry_date
                        ? daysLeft! < 0
                          ? `Expired ${formatDate(batch.expiry_date)}`
                          : `Expires ${formatDate(batch.expiry_date)} (${daysLeft}d)`
                        : "No expiry"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
