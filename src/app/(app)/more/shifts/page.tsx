import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default async function ShiftsPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const supabase = await createClient();
  const canSeeAll = context.role === "owner" || context.role === "manager";

  let query = supabase
    .from("shifts")
    .select("id, user_id, started_at, ended_at, opening_cash, closing_cash, notes")
    .eq("business_id", context.business.id)
    .order("started_at", { ascending: false })
    .limit(50);

  if (!canSeeAll) {
    query = query.eq("user_id", context.userId);
  }

  const { data: shifts } = await query;

  const userIds = [...new Set((shifts ?? []).map((s) => s.user_id))];
  const nameMap = new Map<string, string>();
  if (canSeeAll && userIds.length > 0) {
    const { data } = await supabase.rpc("get_member_emails", {
      p_business_id: context.business.id,
    });
    if (data && Array.isArray(data)) {
      for (const r of data as { user_id: string; email: string; display_name: string | null }[]) {
        nameMap.set(r.user_id, r.display_name || r.email);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">{canSeeAll ? "All Shifts" : "My Shifts"}</h1>

      {!shifts || shifts.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          No shifts recorded yet. Clock in from the Sale screen to start tracking.
        </Card>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const name = canSeeAll
              ? nameMap.get(shift.user_id) ?? "Unknown"
              : context.displayName ?? "You";
            const started = new Date(shift.started_at);
            const ended = shift.ended_at ? new Date(shift.ended_at) : null;
            const duration = ended
              ? Math.round((ended.getTime() - started.getTime()) / 60000)
              : null;
            const hours = duration !== null ? Math.floor(duration / 60) : null;
            const mins = duration !== null ? duration % 60 : null;

            return (
              <Card key={shift.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    {canSeeAll && <p className="text-sm font-medium">{name}</p>}
                    <p className="text-xs text-text-secondary">
                      {formatDateTime(shift.started_at)}
                      {ended ? ` — ${formatDateTime(shift.ended_at!)}` : ""}
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
      )}
    </div>
  );
}
