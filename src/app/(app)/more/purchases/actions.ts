"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

const lineItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0."),
  unit_cost: z.coerce.number().min(0, "Cost can't be negative."),
  expiry_date: z.string().optional(),
});

const purchaseSchema = z.object({
  supplier_id: z.string().uuid().optional(),
  purchase_date: z.string().min(1, "Purchase date is required."),
  notes: z.string().trim().optional(),
  items: z.array(lineItemSchema).min(1, "Add at least one item."),
});

export interface PurchaseFormState {
  error?: string;
}

export async function createPurchase(
  _prevState: PurchaseFormState,
  formData: FormData,
): Promise<PurchaseFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Invalid form data." };

  let parsed: z.infer<typeof purchaseSchema>;
  try {
    parsed = purchaseSchema.parse(JSON.parse(raw));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Please check the form and try again." };
    }
    return { error: "Invalid form data." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_purchase", {
    p_business_id: context.business.id,
    p_location_id: context.locationId,
    p_items: parsed.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      expiry_date: i.expiry_date || null,
    })) as never,
    p_supplier_id: parsed.supplier_id || null,
    p_purchase_date: parsed.purchase_date,
    p_notes: parsed.notes || null,
  });

  if (error) {
    return { error: error.message || "We couldn't save that purchase. Please try again." };
  }

  revalidatePath("/more/purchases");
  revalidatePath("/products");
  revalidatePath("/home");
  redirect("/more/purchases");
}
