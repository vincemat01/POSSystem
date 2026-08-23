"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

const schema = z.object({
  name: z.string().trim().min(1, "Enter your business name."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  receipt_footer: z.string().trim().optional(),
  low_stock_default_threshold: z.coerce.number().min(0).default(5),
  prevent_expired_sale: z.coerce.boolean().default(false),
  loyalty_enabled: z.coerce.boolean().default(false),
  loyalty_earn_rate: z.coerce.number().min(0).default(1),
  loyalty_point_value: z.coerce.number().min(0).default(0.01),
  tax_rate: z.coerce.number().min(0).max(100).default(0),
  tax_inclusive: z.coerce.boolean().default(true),
});

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function updateBusinessSettings(_prevState: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    receipt_footer: formData.get("receipt_footer") || undefined,
    low_stock_default_threshold: formData.get("low_stock_default_threshold") || 5,
    prevent_expired_sale: formData.get("prevent_expired_sale") === "on",
    loyalty_enabled: formData.get("loyalty_enabled") === "on",
    loyalty_earn_rate: formData.get("loyalty_earn_rate") || 1,
    loyalty_point_value: formData.get("loyalty_point_value") || 0.01,
    tax_rate: formData.get("tax_rate") || 0,
    tax_inclusive: formData.get("tax_inclusive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner") {
    return { error: "Only the business owner can change these settings." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      receipt_footer: parsed.data.receipt_footer || null,
      low_stock_default_threshold: parsed.data.low_stock_default_threshold,
      prevent_expired_sale: parsed.data.prevent_expired_sale,
      loyalty_enabled: parsed.data.loyalty_enabled,
      loyalty_earn_rate: parsed.data.loyalty_earn_rate,
      loyalty_point_value: parsed.data.loyalty_point_value,
      tax_rate: parsed.data.tax_rate,
      tax_inclusive: parsed.data.tax_inclusive,
    })
    .eq("id", context.business.id);

  if (error) {
    return { error: "We couldn't save your settings. Please try again." };
  }

  revalidatePath("/more/settings");
  return { success: true };
}
