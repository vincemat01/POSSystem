"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

const returnItemSchema = z.object({
  sale_item_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be positive."),
  reason: z.string().trim().optional(),
});

const returnSchema = z.object({
  sale_id: z.string().uuid(),
  items: z.array(returnItemSchema).min(1, "Select at least one item to return."),
  refund_method: z.enum(["cash", "credit", "original"]),
});

export interface ReturnFormState {
  error?: string;
}

export async function submitReturn(
  _prevState: ReturnFormState,
  formData: FormData,
): Promise<ReturnFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Invalid form data." };

  let parsed: z.infer<typeof returnSchema>;
  try {
    parsed = returnSchema.parse(JSON.parse(raw));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Please check the form and try again." };
    }
    return { error: "Invalid form data." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const clientTxnId = crypto.randomUUID();

  const { error } = await supabase.rpc("record_return", {
    p_business_id: context.business.id,
    p_location_id: context.locationId,
    p_sale_id: parsed.sale_id,
    p_items: parsed.items.map((i) => ({
      sale_item_id: i.sale_item_id,
      quantity: i.quantity,
      reason: i.reason || null,
    })) as never,
    p_refund_method: parsed.refund_method,
    p_client_transaction_id: clientTxnId,
  });

  if (error) {
    return { error: error.message || "We couldn't process that return. Please try again." };
  }

  revalidatePath(`/more/sales/${parsed.sale_id}`);
  revalidatePath("/more/sales");
  revalidatePath("/products");
  revalidatePath("/home");
  redirect(`/more/sales/${parsed.sale_id}`);
}
