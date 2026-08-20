import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";

export default async function SuppliersPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("id, name, phone, email")
    .eq("business_id", context.business.id)
    .eq("active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Suppliers</h1>
        <Link href="/more/suppliers/new">
          <span className="inline-flex h-11 items-center gap-1.5 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
            <Plus className="h-4 w-4" /> Add
          </span>
        </Link>
      </div>

      {!suppliers || suppliers.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">No suppliers yet.</Card>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <Card key={s.id}>
              <p className="text-sm font-semibold">{s.name}</p>
              <p className="text-xs text-text-secondary">{[s.phone, s.email].filter(Boolean).join(" · ")}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
