import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { ReturnForm } from "@/components/sales/return-form";

export default async function ReturnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!sale) notFound();

  if (sale.status !== "completed" && sale.status !== "partially_refunded") {
    redirect(`/more/sales/${sale.id}`);
  }

  const { data: saleItems } = await supabase
    .from("sale_items")
    .select("id, product_id, quantity, unit_price, discount, line_total, returned_quantity")
    .eq("sale_id", sale.id)
    .eq("business_id", business.id);

  const productIds = [...new Set((saleItems ?? []).map((i) => i.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select("id, name, unit").in("id", productIds)
      : { data: [] };
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const items = (saleItems ?? [])
    .map((si) => {
      const product = productMap.get(si.product_id);
      const remainingQty = si.quantity - si.returned_quantity;
      return {
        sale_item_id: si.id,
        product_id: si.product_id,
        product_name: product?.name ?? "Unknown product",
        unit: product?.unit ?? "",
        quantity: si.quantity,
        unit_price: si.unit_price,
        returned_quantity: si.returned_quantity,
        remaining_quantity: remainingQty,
      };
    })
    .filter((i) => i.remaining_quantity > 0);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link
        href={`/more/sales/${sale.id}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary"
      >
        <ChevronLeft className="h-4 w-4" /> Back to receipt
      </Link>
      <h1 className="text-xl font-bold">Return Items</h1>
      <p className="text-sm text-text-secondary">
        Sale {sale.sale_number}
      </p>
      <ReturnForm
        saleId={sale.id}
        items={items}
        currency={business.currency}
        hasCustomer={sale.customer_id !== null}
      />
    </div>
  );
}
