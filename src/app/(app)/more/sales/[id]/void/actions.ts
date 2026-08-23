"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { logAuditEvent } from "@/lib/audit";

const voidSchema = z.object({
  sale_id: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
});

export interface VoidFormState {
  error?: string;
}

export async function voidSale(_prevState: VoidFormState, formData: FormData): Promise<VoidFormState> {
  const parsed = voidSchema.safeParse({
    sale_id: formData.get("sale_id"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") {
    return { error: "Only an owner or manager can void a sale." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("void_sale", {
    p_business_id: context.business.id,
    p_sale_id: parsed.data.sale_id,
    p_reason: parsed.data.reason || null,
  });

  if (error) {
    return { error: error.message || "We couldn't void that sale. Please try again." };
  }

  await logAuditEvent(supabase, {
    businessId: context.business.id,
    userId: context.userId,
    locationId: context.locationId,
    action: "sale.voided",
    entityType: "sale",
    entityId: parsed.data.sale_id,
    newValue: { reason: parsed.data.reason || null },
  });

  revalidatePath(`/more/sales/${parsed.data.sale_id}`);
  revalidatePath("/more/sales");
  revalidatePath("/products");
  revalidatePath("/home");
  redirect(`/more/sales/${parsed.data.sale_id}`);
}
