"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import type { PaymentMethod } from "@/lib/supabase/types";

const schema = z.object({
  category: z.string().trim().min(1, "Choose a category."),
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  description: z.string().trim().optional(),
  payment_method: z.enum(["cash", "card", "eft", "other"]),
  expense_date: z.string().min(1),
});

export interface ExpenseFormState {
  error?: string;
}

export async function createExpense(_prevState: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const parsed = schema.safeParse({
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: formData.get("description") || undefined,
    payment_method: formData.get("payment_method"),
    expense_date: formData.get("expense_date"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    business_id: context.business.id,
    location_id: context.locationId || null,
    category: parsed.data.category,
    amount: parsed.data.amount,
    description: parsed.data.description || null,
    payment_method: parsed.data.payment_method as PaymentMethod,
    expense_date: parsed.data.expense_date,
    client_transaction_id: crypto.randomUUID(),
  });

  if (error) {
    return { error: "We couldn't save that expense. Please try again." };
  }

  revalidatePath("/more/expenses");
  return {};
}
