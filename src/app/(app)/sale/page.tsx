import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/business-context";
import { PosScreen } from "@/components/pos/pos-screen";

export default async function SalePage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  return (
    <PosScreen
      businessId={context.business.id}
      locationId={context.locationId}
      currency={context.business.currency}
      preventExpiredSale={context.business.prevent_expired_sale}
    />
  );
}
