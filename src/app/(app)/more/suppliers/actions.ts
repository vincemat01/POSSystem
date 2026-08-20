"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a supplier name."),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional(),
});

export interface SupplierFormState {
  error?: string;
}

export async function createSupplier(_prevState: SupplierFormState, formData: FormData): Promise<SupplierFormState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    address: formData.get("address") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.from("suppliers").insert({
    business_id: context.business.id,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    email: parsed.data.email || null,
    address: parsed.data.address || null,
  });

  if (error) {
    return { error: "We couldn't save that supplier. Please try again." };
  }

  revalidatePath("/more/suppliers");
  redirect("/more/suppliers");
}
