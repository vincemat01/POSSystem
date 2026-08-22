"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

export async function createCategory(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") {
    return { error: "You don't have permission to manage categories." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 1) return { error: "Enter a category name." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", context.business.id)
    .ilike("name", name)
    .maybeSingle();

  if (existing) return { error: "A category with that name already exists." };

  const { error } = await supabase
    .from("categories")
    .insert({ business_id: context.business.id, name });

  if (error) return { error: "Could not create category." };

  revalidatePath("/more/settings/categories");
  revalidatePath("/products");
  return { success: true };
}

export async function updateCategory(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") {
    return { error: "You don't have permission to manage categories." };
  }

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name || name.length < 1) return { error: "Enter a category name." };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("business_id", context.business.id)
    .ilike("name", name)
    .neq("id", id)
    .maybeSingle();

  if (existing) return { error: "Another category already has that name." };

  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { error: "Could not update category." };

  revalidatePath("/more/settings/categories");
  revalidatePath("/products");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") {
    return { error: "You don't have permission to manage categories." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("business_id", context.business.id);

  if (error) return { error: "Could not delete category." };

  revalidatePath("/more/settings/categories");
  revalidatePath("/products");
  return {};
}
