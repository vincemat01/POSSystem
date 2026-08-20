import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export default async function NewPurchasePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { business } = context;

  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, cost_price, tracks_expiry")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("name"),
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("business_id", business.id)
      .eq("active", true)
      .order("name"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more/purchases" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to purchases
      </Link>
      <h1 className="text-xl font-bold">Receive stock</h1>
      <PurchaseForm
        products={(products ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          cost_price: Number(p.cost_price),
          tracks_expiry: p.tracks_expiry,
        }))}
        suppliers={(suppliers ?? []).map((s) => ({ id: s.id, name: s.name }))}
        currency={business.currency}
      />
    </div>
  );
}
