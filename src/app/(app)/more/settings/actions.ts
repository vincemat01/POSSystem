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
    })
    .eq("id", context.business.id);

  if (error) {
    return { error: "We couldn't save your settings. Please try again." };
  }

  revalidatePath("/more/settings");
  return { success: true };
}
