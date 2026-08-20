"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

const itemSchema = z.object({
  product_id: z.string().uuid(),
  counted_quantity: z.coerce.number().min(0, "Counted quantity can't be negative."),
  reason: z.string().trim().optional(),
});

const stockTakeSchema = z.object({
  items: z.array(itemSchema).min(1, "Count at least one product."),
});

export interface StockTakeFormState {
  error?: string;
}

export async function submitStockTake(
  _prevState: StockTakeFormState,
  formData: FormData,
): Promise<StockTakeFormState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Invalid form data." };

  let parsed: z.infer<typeof stockTakeSchema>;
  try {
    parsed = stockTakeSchema.parse(JSON.parse(raw));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { error: err.issues[0]?.message ?? "Please check the form and try again." };
    }
    return { error: "Invalid form data." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_stock_take", {
    p_business_id: context.business.id,
    p_location_id: context.locationId,
    p_items: parsed.items.map((i) => ({
      product_id: i.product_id,
      counted_quantity: i.counted_quantity,
      reason: i.reason || null,
    })) as never,
  });

  if (error) {
    return { error: error.message || "We couldn't save that stock take. Please try again." };
  }

  revalidatePath("/more/stock-take");
  revalidatePath("/products");
  revalidatePath("/home");
  redirect("/more/stock-take");
}
