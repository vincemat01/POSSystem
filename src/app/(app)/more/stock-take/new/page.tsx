import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { StockTakeForm } from "@/components/stock-take/stock-take-form";

export default async function NewStockTakePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business, locationId } = context;

  const [{ data: products }, { data: stockRows }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("product_stock")
      .select("product_id, quantity_on_hand")
      .eq("business_id", business.id)
      .eq("location_id", locationId),
  ]);

  const stockMap = new Map((stockRows ?? []).map((s) => [s.product_id, Number(s.quantity_on_hand)]));

  const productsWithStock = (products ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.unit,
    stock: stockMap.get(p.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more/stock-take" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to stock takes
      </Link>
      <h1 className="text-xl font-bold">New stock take</h1>
      <StockTakeForm products={productsWithStock} />
    </div>
  );
}
