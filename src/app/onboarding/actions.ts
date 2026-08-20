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
  const parsed = schema.safeParse({
    name: formData.get("name"),
    business_type: formData.get("business_type"),
    location_name: formData.get("location_name") || "Main Location",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_business_with_owner", {
    p_name: parsed.data.name,
    p_business_type: parsed.data.business_type as BusinessType,
    p_currency: "ZAR",
    p_location_name: parsed.data.location_name,
  });

  if (error) {
    return { error: "We couldn't set up your business. Please try again." };
  }

  redirect("/home");
}
