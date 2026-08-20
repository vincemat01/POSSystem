import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card } from "@/components/ui/card";

export default async function SettingsPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, phone, address, receipt_footer, low_stock_default_threshold, prevent_expired_sale")
    .eq("id", context.business.id)
    .single();

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Settings</h1>

      {context.role !== "owner" ? (
        <Card className="py-8 text-center text-sm text-text-secondary">
          Only the business owner can change these settings.
        </Card>
      ) : business ? (
        <SettingsForm business={business} />
      ) : null}
    </div>
  );
}
