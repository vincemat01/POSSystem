import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/utils";

const ACTION_LABEL: Record<string, string> = {
  "product.price_changed": "Changed product price",
  "product.stock_adjusted": "Adjusted stock",
  "staff.role_changed": "Changed staff role",
  "staff.removed": "Removed staff member",
  "credit.payment_recorded": "Recorded a credit payment",
};

const MONEY_KEYS = new Set(["cost_price", "selling_price", "amount"]);

function formatFieldValue(key: string, value: unknown, currency: string): string {
  if (value === null || value === undefined) return "—";
  if (MONEY_KEYS.has(key) && typeof value === "number") return formatMoney(value, currency);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function renderDiff(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
  currency: string,
): string[] {
  if (oldValue && newValue) {
    const keys = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])];
    return keys
      .filter((k) => oldValue[k] !== newValue[k])
      .map((k) => `${k.replace(/_/g, " ")}: ${formatFieldValue(k, oldValue[k], currency)} → ${formatFieldValue(k, newValue[k], currency)}`);
  }
  if (newValue) {
    return Object.entries(newValue).map(([k, v]) => `${k.replace(/_/g, " ")}: ${formatFieldValue(k, v, currency)}`);
  }
  return [];
}

export default async function AuditLogPage() {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");
  if (context.role !== "owner" && context.role !== "manager") redirect("/more");

  const supabase = await createClient();
  const { business } = context;

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, user_id, action, entity_type, entity_id, old_value, new_value, created_at")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: memberRows } = await supabase.rpc("get_member_emails", { p_business_id: business.id });
  const nameMap = new Map<string, string>();
  if (memberRows && Array.isArray(memberRows)) {
    for (const r of memberRows as { user_id: string; email: string; display_name: string | null }[]) {
      nameMap.set(r.user_id, r.display_name || r.email);
    }
  }

  const productIds = [...new Set((logs ?? []).filter((l) => l.entity_type === "product" && l.entity_id).map((l) => l.entity_id!))];
  const customerIds = [...new Set((logs ?? []).filter((l) => l.entity_type === "customer" && l.entity_id).map((l) => l.entity_id!))];
  const memberIds = [...new Set((logs ?? []).filter((l) => l.entity_type === "business_member" && l.entity_id).map((l) => l.entity_id!))];

  const [{ data: products }, { data: customers }, { data: members }] = await Promise.all([
    productIds.length > 0 ? supabase.from("products").select("id, name").in("id", productIds) : Promise.resolve({ data: [] }),
    customerIds.length > 0 ? supabase.from("customers").select("id, name").in("id", customerIds) : Promise.resolve({ data: [] }),
    memberIds.length > 0
      ? supabase.from("business_members").select("id, user_id, display_name").in("id", memberIds)
      : Promise.resolve({ data: [] }),
  ]);

  const entityNameMap = new Map<string, string>();
  for (const p of products ?? []) entityNameMap.set(`product:${p.id}`, p.name);
  for (const c of customers ?? []) entityNameMap.set(`customer:${c.id}`, c.name);
  for (const m of members ?? []) entityNameMap.set(`business_member:${m.id}`, m.display_name || nameMap.get(m.user_id) || "Unknown");

  function entityLabel(entityType: string, entityId: string | null) {
    if (!entityId) return null;
    return entityNameMap.get(`${entityType}:${entityId}`) ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">Audit Log</h1>
      <p className="text-sm text-text-secondary">
        Sensitive actions across your business — price changes, stock adjustments, staff permission
        changes, and credit payments. Showing the most recent 100.
      </p>

      {!logs || logs.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          <ScrollText className="mx-auto mb-2 h-8 w-8 text-text-secondary/50" />
          No audit events recorded yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const actor = log.user_id ? nameMap.get(log.user_id) ?? "Unknown user" : "System";
            const label = ACTION_LABEL[log.action] ?? log.action;
            const target = entityLabel(log.entity_type, log.entity_id);
            const diffLines = renderDiff(
              log.old_value as Record<string, unknown> | null,
              log.new_value as Record<string, unknown> | null,
              business.currency,
            );

            return (
              <Card key={log.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {label}
                      {target ? <span className="font-normal text-text-secondary"> — {target}</span> : ""}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {actor} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                </div>
                {diffLines.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {diffLines.map((line, i) => (
                      <p key={i} className="text-xs text-text-secondary">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
