import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  purchase: "Stock received",
  sale: "Sale",
  return: "Return",
  adjustment: "Adjustment",
  damage: "Damaged",
  expired: "Expired",
  stock_take: "Stock take",
  transfer: "Transfer",
};

export default async function InventoryPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: movements } = await supabase
    .from("inventory_movements")
    .select("id, movement_type, quantity, created_at, products(name)")
    .eq("business_id", context.business.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Inventory Movements</h1>
      <p className="text-sm text-text-secondary">
        Every stock change is recorded here — see <Link href="/products" className="text-primary underline">Products</Link> for current stock levels.
      </p>

      {!movements || movements.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">No stock movements recorded yet.</Card>
      ) : (
        <div className="space-y-2">
          {movements.map((m) => {
            const product = Array.isArray(m.products) ? m.products[0] : m.products;
            const qty = Number(m.quantity);
            return (
              <Card key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{product?.name ?? "Unknown product"}</p>
                  <p className="text-xs text-text-secondary">
                    {TYPE_LABEL[m.movement_type] ?? m.movement_type} · {formatDate(m.created_at)}
                  </p>
                </div>
                <p className={`text-sm font-semibold ${qty >= 0 ? "text-primary" : "text-text"}`}>
                  {qty >= 0 ? "+" : ""}
                  {qty}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
