"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

export async function startShift(formData: FormData): Promise<{ error?: string; shiftId?: string }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const openingCash = parseFloat(formData.get("opening_cash") as string) || 0;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("shifts")
    .select("id")
    .eq("business_id", context.business.id)
    .eq("user_id", context.userId)
    .is("ended_at", null)
    .maybeSingle();

  if (existing) {
    return { error: "You already have an open shift." };
  }

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      business_id: context.business.id,
      location_id: context.locationId,
      user_id: context.userId,
      opening_cash: openingCash,
    })
    .select("id")
    .single();

  if (error) return { error: "Could not start shift." };

  revalidatePath("/sale");
  revalidatePath("/more/staff");
  return { shiftId: data.id };
}

export async function endShift(formData: FormData): Promise<{ error?: string }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const shiftId = formData.get("shift_id") as string;
  const closingCash = parseFloat(formData.get("closing_cash") as string) || 0;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!shiftId) return { error: "Missing shift ID." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      ended_at: new Date().toISOString(),
      closing_cash: closingCash,
      notes,
    })
    .eq("id", shiftId)
    .eq("user_id", context.userId)
    .eq("business_id", context.business.id);

  if (error) return { error: "Could not end shift." };

  revalidatePath("/sale");
  revalidatePath("/more/staff");
  return {};
}

export async function getActiveShift() {
  const context = await getBusinessContext();
  if (!context) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("shifts")
    .select("id, started_at, opening_cash")
    .eq("business_id", context.business.id)
    .eq("user_id", context.userId)
    .is("ended_at", null)
    .maybeSingle();

  return data;
}
