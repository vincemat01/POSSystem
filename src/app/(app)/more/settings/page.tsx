import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
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
    .select("name, phone, address, receipt_footer, low_stock_default_threshold, prevent_expired_sale, loyalty_enabled, loyalty_earn_rate, loyalty_point_value")
    .eq("id", context.business.id)
    .single();

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="text-xl font-bold">Settings</h1>

      {(context.role === "owner" || context.role === "manager") && (
        <Link href="/more/settings/categories">
          <Card className="flex items-center justify-between hover:border-primary/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-light">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Product Categories</p>
                <p className="text-xs text-text-secondary">Organise products into groups</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          </Card>
        </Link>
      )}

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
