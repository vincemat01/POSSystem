"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a product name."),
  barcode: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  unit: z.string().trim().min(1).default("each"),
  cost_price: z.coerce.number().min(0, "Cost price can't be negative."),
  selling_price: z.coerce.number().min(0, "Selling price can't be negative."),
  minimum_stock: z.coerce.number().min(0).default(0),
  tracks_expiry: z.coerce.boolean().default(false),
});

export interface ProductFormState {
  error?: string;
}

export async function createProduct(_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    barcode: formData.get("barcode") || undefined,
    sku: formData.get("sku") || undefined,
    unit: formData.get("unit") || "each",
    cost_price: formData.get("cost_price") || 0,
    selling_price: formData.get("selling_price") || 0,
    minimum_stock: formData.get("minimum_stock") || 0,
    tracks_expiry: formData.get("tracks_expiry") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    business_id: context.business.id,
    name: parsed.data.name,
    barcode: parsed.data.barcode || null,
    sku: parsed.data.sku || null,
    unit: parsed.data.unit,
    cost_price: parsed.data.cost_price,
    selling_price: parsed.data.selling_price,
    minimum_stock: parsed.data.minimum_stock,
    tracks_expiry: parsed.data.tracks_expiry,
  });

  if (error) {
    return { error: "We couldn't save that product. Please try again." };
  }

  revalidatePath("/products");
  redirect("/products");
}
