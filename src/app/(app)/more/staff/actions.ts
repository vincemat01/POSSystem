"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import type { BusinessRole } from "@/lib/supabase/types";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += chars[b % chars.length];
  return code;
}

export interface InviteFormState {
  error?: string;
  code?: string;
}

const inviteSchema = z.object({
  role: z.enum(["manager", "cashier", "stock_manager"] as const),
});

export async function createInvite(_prev: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const parsed = inviteSchema.safeParse({ role: formData.get("role") });
  if (!parsed.success) return { error: "Select a valid role." };

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") {
    return { error: "Only owners and managers can invite staff." };
  }

  const supabase = await createClient();
  const code = generateCode();

  const { error } = await supabase.from("staff_invites").insert({
    business_id: context.business.id,
    code,
    role: parsed.data.role as BusinessRole,
    created_by: context.userId,
  });

  if (error) {
    return { error: "Could not create invite. Please try again." };
  }

  revalidatePath("/more/staff");
  return { code };
}

const updateRoleSchema = z.object({
  member_id: z.string().uuid(),
  role: z.enum(["manager", "cashier", "stock_manager"] as const),
});

export interface UpdateRoleState {
  error?: string;
  success?: boolean;
}

export async function updateMemberRole(_prev: UpdateRoleState, formData: FormData): Promise<UpdateRoleState> {
  const parsed = updateRoleSchema.safeParse({
    member_id: formData.get("member_id"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner") {
    return { error: "Only the owner can change roles." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_members")
    .update({ role: parsed.data.role as BusinessRole })
    .eq("id", parsed.data.member_id)
    .eq("business_id", context.business.id);

  if (error) return { error: "Could not update role." };

  revalidatePath("/more/staff");
  return { success: true };
}

export async function removeMember(memberId: string): Promise<{ error?: string }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner") {
    return { error: "Only the owner can remove staff." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_members")
    .update({ active: false })
    .eq("id", memberId)
    .eq("business_id", context.business.id)
    .neq("user_id", context.userId);

  if (error) return { error: "Could not remove member." };

  revalidatePath("/more/staff");
  return {};
}

export async function deleteInvite(inviteId: string): Promise<{ error?: string }> {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff_invites")
    .delete()
    .eq("id", inviteId)
    .eq("business_id", context.business.id)
    .is("claimed_by", null);

  if (error) return { error: "Could not delete invite." };

  revalidatePath("/more/staff");
  return {};
}
