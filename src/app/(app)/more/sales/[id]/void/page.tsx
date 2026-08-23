import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { VoidSaleForm } from "@/components/sales/void-sale-form";

export default async function VoidSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") redirect(`/more/sales/${id}`);

  const supabase = await createClient();
  const { business } = context;

  const { data: sale } = await supabase
    .from("sales")
    .select("id, sale_number, status")
    .eq("id", id)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!sale) notFound();
  if (sale.status !== "completed") redirect(`/more/sales/${sale.id}`);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link
        href={`/more/sales/${sale.id}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary"
      >
        <ChevronLeft className="h-4 w-4" /> Back to receipt
      </Link>
      <h1 className="text-xl font-bold">Void Sale</h1>
      <VoidSaleForm saleId={sale.id} saleNumber={sale.sale_number} />
    </div>
  );
}
