"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

export async function updateProfile(
  _prev: { error?: string; success?: boolean },
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const displayName = (formData.get("display_name") as string)?.trim();
  if (!displayName || displayName.length < 2) {
    return { error: "Enter at least 2 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_members")
    .update({ display_name: displayName })
    .eq("business_id", context.business.id)
    .eq("user_id", context.userId);

  if (error) return { error: "Could not update your name." };

  revalidatePath("/", "layout");
  return { success: true };
}
