import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/utils";
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
    .select("id, user_id, role, active, display_name, created_at")
    .eq("business_id", context.business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const userIds = (members ?? []).map((m) => m.user_id);
  let memberInfo = new Map<string, { email: string; display_name: string | null }>();
  if (userIds.length > 0) {
    const { data } = await supabase.rpc("get_member_emails", {
      p_business_id: context.business.id,
    });
    if (data && Array.isArray(data)) {
      memberInfo = new Map(
        data.map((r: { user_id: string; email: string; display_name: string | null }) => [
          r.user_id,
          { email: r.email, display_name: r.display_name },
        ]),
      );
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

  const { data: recentShifts } = canManage
    ? await supabase
        .from("shifts")
        .select("id, user_id, started_at, ended_at, opening_cash, closing_cash, notes")
        .eq("business_id", context.business.id)
        .order("started_at", { ascending: false })
        .limit(20)
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">Staff</h1>

      <div className="space-y-2">
        {(members ?? []).map((m) => {
          const info = memberInfo.get(m.user_id);
          const label = info?.display_name || info?.email || "Unknown";
          return (
            <MemberRow
              key={m.id}
              member={{
                id: m.id,
                email: label,
                role: m.role,
                roleLabel: ROLE_LABEL[m.role] ?? m.role,
                isCurrentUser: m.user_id === context.userId,
              }}
              isOwner={context.role === "owner"}
            />
          );
        })}
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

          {recentShifts && recentShifts.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-semibold">Recent shifts</p>
              <div className="space-y-2">
                {recentShifts.map((shift) => {
                  const info = memberInfo.get(shift.user_id);
                  const name = info?.display_name || info?.email || "Unknown";
                  const started = new Date(shift.started_at);
                  const ended = shift.ended_at ? new Date(shift.ended_at) : null;
                  const duration = ended
                    ? Math.round((ended.getTime() - started.getTime()) / 60000)
                    : null;
                  const hours = duration ? Math.floor(duration / 60) : null;
                  const mins = duration ? duration % 60 : null;

                  return (
                    <Card key={shift.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-text-secondary">
                            {formatDateTime(shift.started_at)}
                            {ended ? ` — ${formatDateTime(shift.ended_at!)}` : " (active)"}
                          </p>
                          {duration !== null && (
                            <p className="text-xs text-text-secondary">
                              Duration: {hours}h {mins}m
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-secondary">
                            Open: {formatMoney(shift.opening_cash, context.business.currency)}
                          </p>
                          {shift.closing_cash !== null && (
                            <p className="text-xs text-text-secondary">
                              Close: {formatMoney(shift.closing_cash, context.business.currency)}
                            </p>
                          )}
                          {!ended && (
                            <span className="inline-block rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-medium text-primary">
                              Active
                            </span>
                          )}
                        </div>
                      </div>
                      {shift.notes && (
                        <p className="mt-1 text-xs text-text-secondary">{shift.notes}</p>
                      )}
                    </Card>
                  );
                })}
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
