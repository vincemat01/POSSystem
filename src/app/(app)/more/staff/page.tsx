import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { InviteForm } from "@/components/staff/invite-form";
import { MemberRow } from "@/components/staff/member-row";
import { InviteRow } from "@/components/staff/invite-row";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  cashier: "Cashier",
  stock_manager: "Stock Manager",
};

export default async function StaffPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const canManage = context.role === "owner" || context.role === "manager";

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("business_members")
    .select("id, user_id, role, active, created_at")
    .eq("business_id", context.business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const userIds = (members ?? []).map((m) => m.user_id);
  let userEmails: Map<string, string> = new Map();
  if (userIds.length > 0) {
    const { data } = await supabase.rpc("get_member_emails", {
      p_business_id: context.business.id,
    });
    if (data && Array.isArray(data)) {
      userEmails = new Map(data.map((r: { user_id: string; email: string }) => [r.user_id, r.email]));
    }
  }

  const { data: invites } = canManage
    ? await supabase
        .from("staff_invites")
        .select("*")
        .eq("business_id", context.business.id)
        .is("claimed_by", null)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">Staff</h1>

      <div className="space-y-2">
        {(members ?? []).map((m) => (
          <MemberRow
            key={m.id}
            member={{
              id: m.id,
              email: userEmails.get(m.user_id) ?? "Unknown",
              role: m.role,
              roleLabel: ROLE_LABEL[m.role] ?? m.role,
              isCurrentUser: m.user_id === context.userId,
            }}
            isOwner={context.role === "owner"}
          />
        ))}
      </div>

      {canManage && (
        <>
          <div className="border-t border-border pt-4">
            <p className="mb-3 text-sm font-semibold">Invite new staff</p>
            <InviteForm />
          </div>

          {invites && invites.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">Pending invites</p>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <InviteRow
                    key={inv.id}
                    invite={{
                      id: inv.id,
                      code: inv.code,
                      role: ROLE_LABEL[inv.role] ?? inv.role,
                      expiresAt: formatDateTime(inv.expires_at),
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!canManage && (
        <Card className="py-8 text-center text-sm text-text-secondary">
          Only the owner or a manager can invite staff.
        </Card>
      )}
    </div>
  );
}
