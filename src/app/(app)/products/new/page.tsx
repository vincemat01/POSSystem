import { redirect } from "next/navigation";
import { getBusinessContext } from "@/lib/business-context";
import { NewProductForm } from "@/components/products/new-product-form";

export default async function NewProductPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  return (
    <NewProductForm
      currency={context.business.currency}
      pricing={{
        method: context.business.pricing_method,
        targetPercent: context.business.pricing_target_percent,
        rounding: context.business.pricing_rounding,
      }}
    />
  );
}
