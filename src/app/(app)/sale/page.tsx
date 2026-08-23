import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/business-context";
import { getActiveShift } from "@/app/(app)/more/staff/shift-actions";
import { PosScreen } from "@/components/pos/pos-screen";
import { ShiftBar } from "@/components/pos/shift-bar";

export default async function SalePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const activeShift = await getActiveShift();

  return (
    <div className="flex h-full flex-col">
      <ShiftBar activeShift={activeShift} currency={context.business.currency} />
      <PosScreen
        businessId={context.business.id}
        locationId={context.locationId}
        currency={context.business.currency}
        preventExpiredSale={context.business.prevent_expired_sale}
        loyaltyEnabled={context.business.loyalty_enabled}
        loyaltyPointValue={context.business.loyalty_point_value}
        taxRate={context.business.tax_rate}
        taxInclusive={context.business.tax_inclusive}
      />
    </div>
  );
}
