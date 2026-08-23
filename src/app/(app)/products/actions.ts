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
  tax_exempt: z.coerce.boolean().default(false),
  category_id: z.string().uuid().optional(),
});

export interface ProductFormState {
  error?: string;
}

export async function createProduct(_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const categoryId = formData.get("category_id") as string;
  const parsed = schema.safeParse({
    name: formData.get("name"),
    barcode: formData.get("barcode") || undefined,
    sku: formData.get("sku") || undefined,
    unit: formData.get("unit") || "each",
    cost_price: formData.get("cost_price") || 0,
    selling_price: formData.get("selling_price") || 0,
    minimum_stock: formData.get("minimum_stock") || 0,
    tracks_expiry: formData.get("tracks_expiry") === "on",
    tax_exempt: formData.get("tax_exempt") === "on",
    category_id: categoryId || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();

  let imageUrl: string | null = null;
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    const path = `${context.business.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(path, imageFile, { contentType: imageFile.type, upsert: true });
    if (!uploadErr) {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    }
  }

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
    tax_exempt: parsed.data.tax_exempt,
    category_id: parsed.data.category_id || null,
    image_url: imageUrl,
  });

  if (error) {
    return { error: "We couldn't save that product. Please try again." };
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProductImage(_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const productId = formData.get("product_id") as string;
  const imageFile = formData.get("image") as File | null;
  if (!productId || !imageFile || imageFile.size === 0) return { error: "No image selected." };

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const path = `${context.business.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadErr } = await supabase.storage
    .from("product-images")
    .upload(path, imageFile, { contentType: imageFile.type, upsert: true });

  if (uploadErr) return { error: "Image upload failed. Please try again." };

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  const { error } = await supabase
    .from("products")
    .update({ image_url: data.publicUrl })
    .eq("id", productId)
    .eq("business_id", context.business.id);

  if (error) return { error: "Could not update the product image." };

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return {};
}

const updateSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().trim().min(1, "Enter a product name."),
  barcode: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  unit: z.string().trim().min(1).default("each"),
  cost_price: z.coerce.number().min(0, "Cost price can't be negative."),
  selling_price: z.coerce.number().min(0, "Selling price can't be negative."),
  minimum_stock: z.coerce.number().min(0).default(0),
  tax_exempt: z.coerce.boolean().default(false),
  category_id: z.string().uuid().optional(),
});

export async function updateProduct(_prevState: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const catId = formData.get("category_id") as string;
  const parsed = updateSchema.safeParse({
    product_id: formData.get("product_id"),
    name: formData.get("name"),
    barcode: formData.get("barcode") || undefined,
    sku: formData.get("sku") || undefined,
    unit: formData.get("unit") || "each",
    cost_price: formData.get("cost_price") || 0,
    selling_price: formData.get("selling_price") || 0,
    minimum_stock: formData.get("minimum_stock") || 0,
    tax_exempt: formData.get("tax_exempt") === "on",
    category_id: catId || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      barcode: parsed.data.barcode || null,
      sku: parsed.data.sku || null,
      unit: parsed.data.unit,
      cost_price: parsed.data.cost_price,
      selling_price: parsed.data.selling_price,
      minimum_stock: parsed.data.minimum_stock,
      tax_exempt: parsed.data.tax_exempt,
      category_id: parsed.data.category_id || null,
    })
    .eq("id", parsed.data.product_id)
    .eq("business_id", context.business.id);

  if (error) {
    return { error: "We couldn't update that product. Please try again." };
  }

  revalidatePath(`/products/${parsed.data.product_id}`);
  revalidatePath("/products");
  redirect(`/products/${parsed.data.product_id}`);
}

const adjustStockSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.coerce.number().refine((n) => n !== 0, "Enter a non-zero quantity."),
  expiry_date: z.string().trim().optional(),
  reason: z.string().trim().optional(),
});

export interface AdjustStockState {
  error?: string;
  success?: boolean;
}

/** Quick stock adjustment for testing/small corrections — not a substitute for a proper
 * Purchases/receiving flow (not built yet), which would also record supplier and per-unit cost
 * for a purchase. Cost for non-expiry products already comes from products.cost_price at sale
 * time, so a plain movement is sufficient there; expiry-tracked products need a real batch since
 * FEFO deducts from inventory_batches, not from the movement ledger directly. */
export async function adjustStock(_prevState: AdjustStockState, formData: FormData): Promise<AdjustStockState> {
  const parsed = adjustStockSchema.safeParse({
    product_id: formData.get("product_id"),
    quantity: formData.get("quantity"),
    expiry_date: formData.get("expiry_date") || undefined,
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: product } = await supabase
    .from("products")
    .select("id, tracks_expiry, cost_price")
    .eq("business_id", context.business.id)
    .eq("id", parsed.data.product_id)
    .maybeSingle();

  if (!product) {
    return { error: "That product couldn't be found." };
  }

  const { quantity } = parsed.data;

  if (product.tracks_expiry) {
    if (quantity < 0) {
      return { error: "Reducing stock on an expiry-tracked product isn't supported here yet — that needs Stock Take." };
    }

    const { data: batch, error: batchError } = await supabase
      .from("inventory_batches")
      .insert({
        business_id: context.business.id,
        product_id: product.id,
        location_id: context.locationId,
        quantity_received: quantity,
        quantity_remaining: quantity,
        unit_cost: product.cost_price,
        expiry_date: parsed.data.expiry_date || null,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return { error: "We couldn't save that stock adjustment. Please try again." };
    }

    const { error: movementError } = await supabase.from("inventory_movements").insert({
      business_id: context.business.id,
      product_id: product.id,
      location_id: context.locationId,
      batch_id: batch.id,
      movement_type: "adjustment",
      quantity,
      reference_type: "manual_adjustment",
      notes: parsed.data.reason || null,
    });

    if (movementError) {
      return { error: "We couldn't save that stock adjustment. Please try again." };
    }
  } else {
    if (quantity < 0) {
      const { data: stockRow } = await supabase
        .from("product_stock")
        .select("quantity_on_hand")
        .eq("business_id", context.business.id)
        .eq("product_id", product.id)
        .eq("location_id", context.locationId)
        .maybeSingle();

      const available = Number(stockRow?.quantity_on_hand ?? 0);
      if (available + quantity < 0) {
        return { error: `Only ${available} in stock — can't reduce by ${Math.abs(quantity)}.` };
      }
    }

    const { error: movementError } = await supabase.from("inventory_movements").insert({
      business_id: context.business.id,
      product_id: product.id,
      location_id: context.locationId,
      movement_type: "adjustment",
      quantity,
      reference_type: "manual_adjustment",
      notes: parsed.data.reason || null,
    });

    if (movementError) {
      return { error: "We couldn't save that stock adjustment. Please try again." };
    }
  }

  revalidatePath(`/products/${parsed.data.product_id}`);
  revalidatePath("/products");
  return { success: true };
}
