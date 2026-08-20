"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import type { PaymentMethod } from "@/lib/supabase/types";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Enter the customer's name."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  credit_limit: z.coerce.number().min(0).default(0),
});

export interface CustomerFormState {
  error?: string;
}

export async function createCustomer(_prevState: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    credit_limit: formData.get("credit_limit") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      business_id: context.business.id,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    })
    .select("id")
    .single();

  if (error || !customer) {
    return { error: "We couldn't save that customer. Please try again." };
  }

  if (parsed.data.credit_limit > 0) {
    await supabase
      .from("credit_accounts")
      .insert({ business_id: context.business.id, customer_id: customer.id, credit_limit: parsed.data.credit_limit });
  }

  revalidatePath("/credit");
  redirect(`/credit/${customer.id}`);
}

const paymentSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  method: z.enum(["cash", "card", "eft", "other"]),
});

export interface PaymentFormState {
  error?: string;
}

export async function recordPayment(_prevState: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const parsed = paymentSchema.safeParse({
    customer_id: formData.get("customer_id"),
    amount: formData.get("amount"),
    method: formData.get("method"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_credit_payment", {
    p_business_id: context.business.id,
    p_customer_id: parsed.data.customer_id,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method as PaymentMethod,
    p_client_transaction_id: crypto.randomUUID(),
  });

  if (error) {
    return { error: "We couldn't record that payment. Please try again." };
  }

  revalidatePath(`/credit/${parsed.data.customer_id}`);
  revalidatePath("/credit");
  return {};
}
