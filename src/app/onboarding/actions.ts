"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { BusinessType } from "@/lib/supabase/types";

const BUSINESS_TYPES = [
  "general_retail",
  "spaza_convenience",
  "salon",
  "barber",
  "takeaway",
  "butchery",
  "boutique",
  "hardware",
  "car_wash",
  "services",
  "other",
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Enter your business name."),
  business_type: z.enum(BUSINESS_TYPES),
  location_name: z.string().trim().min(1).default("Main Location"),
});

export interface OnboardingState {
  error?: string;
}

export async function createBusiness(_prevState: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const ownerName = (formData.get("owner_name") as string)?.trim();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    business_type: formData.get("business_type"),
    location_name: formData.get("location_name") || "Main Location",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  if (!ownerName || ownerName.length < 2) {
    return { error: "Enter your name." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bizResult, error } = await supabase.rpc("create_business_with_owner", {
    p_name: parsed.data.name,
    p_business_type: parsed.data.business_type as BusinessType,
    p_currency: "ZAR",
    p_location_name: parsed.data.location_name,
  });

  if (error) {
    return { error: "We couldn't set up your business. Please try again." };
  }

  if (bizResult && typeof bizResult === "object" && "id" in bizResult) {
    await supabase
      .from("business_members")
      .update({ display_name: ownerName })
      .eq("business_id", (bizResult as { id: string }).id)
      .eq("user_id", user.id);
  }

  redirect("/home");
}

export interface JoinState {
  error?: string;
}

export async function joinWithCode(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const displayName = (formData.get("display_name") as string)?.trim();
  if (!code || code.length < 4) return { error: "Enter a valid invite code." };
  if (!displayName || displayName.length < 2) return { error: "Enter your name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("claim_invite", { p_code: code });

  if (error) return { error: "Something went wrong. Please try again." };

  const result = data as { ok: boolean; error?: string; business_id?: string };
  if (!result.ok) return { error: result.error ?? "Invalid invite code." };

  if (result.business_id) {
    await supabase
      .from("business_members")
      .update({ display_name: displayName })
      .eq("business_id", result.business_id)
      .eq("user_id", user.id);
  }

  redirect("/home");
}
