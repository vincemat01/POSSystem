import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBusinessContext } from "@/lib/business-context";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { SalesFilters } from "@/components/sales/sales-filters";

const STATUS_LABEL: Record<string, string> = {
  completed: "Completed",
  voided: "Voided",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  cancelled: "Cancelled",
};

const PAGE_SIZE = 30;

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string; status?: string; page?: string }>;
}) {
  const context = await getBusinessContext();
  if (!context) redirect("/onboarding");

  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const fromDate = params.from ?? "";
  const toDate = params.to ?? "";
  const statusFilter = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const supabase = await createClient();
  const { business } = context;

  let customerIdsByName: string[] | null = null;
  if (query) {
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .ilike("name", `%${query}%`);
    customerIdsByName = (matchedCustomers ?? []).map((c) => c.id);
  }

  let dbQuery = supabase
    .from("sales")
    .select("id, sale_number, total, status, sold_at, customer_id, cashier_id", { count: "exact" })
    .eq("business_id", business.id);

  if (fromDate) {
    dbQuery = dbQuery.gte("sold_at", `${fromDate}T00:00:00`);
  }
  if (toDate) {
    dbQuery = dbQuery.lte("sold_at", `${toDate}T23:59:59`);
  }
  if (statusFilter) {
    dbQuery = dbQuery.eq("status", statusFilter as "completed" | "voided" | "refunded" | "partially_refunded" | "cancelled");
  }

  if (query) {
    const filters = [`sale_number.ilike.%${query}%`];
    if (customerIdsByName && customerIdsByName.length > 0) {
      filters.push(`customer_id.in.(${customerIdsByName.join(",")})`);
    }
    dbQuery = dbQuery.or(filters.join(","));
  }

  const offset = (page - 1) * PAGE_SIZE;
  const { data: sales, count } = await dbQuery
    .order("sold_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const customerIds = [...new Set((sales ?? []).map((s) => s.customer_id).filter(Boolean))] as string[];
  const { data: customers } =
    customerIds.length > 0
      ? await supabase.from("customers").select("id, name").in("id", customerIds)
      : { data: [] };
  const customerMap = new Map((customers ?? []).map((c) => [c.id, c.name]));

  const cashierIds = [...new Set((sales ?? []).map((s) => s.cashier_id).filter(Boolean))] as string[];
  const cashierMap = new Map<string, string>();
  for (const cid of cashierIds) {
    const { data: name } = await supabase.rpc("get_cashier_name", {
      p_business_id: business.id,
      p_user_id: cid,
    });
    if (name) cashierMap.set(cid, name as string);
  }

  function buildPageUrl(p: number) {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (fromDate) sp.set("from", fromDate);
    if (toDate) sp.set("to", toDate);
    if (statusFilter) sp.set("status", statusFilter);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/more/sales${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <Link href="/more" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-xl font-bold">Sales History</h1>

      <SalesFilters query={query} fromDate={fromDate} toDate={toDate} status={statusFilter} />

      {totalCount > 0 && (
        <p className="text-xs text-text-secondary">
          {totalCount} sale{totalCount !== 1 ? "s" : ""}
          {query || fromDate || toDate || statusFilter ? " matching filters" : ""}
        </p>
      )}

      {!sales || sales.length === 0 ? (
        <Card className="py-10 text-center text-sm text-text-secondary">
          {query || fromDate || toDate || statusFilter ? "No sales match your filters." : "No sales recorded yet."}
        </Card>
      ) : (
        <div className="space-y-2">
          {sales.map((s) => (
            <Link key={s.id} href={`/more/sales/${s.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{s.sale_number}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDateTime(s.sold_at)}
                    {s.cashier_id ? ` · ${cashierMap.get(s.cashier_id) ?? "Staff"}` : ""}
                    {s.customer_id ? ` · ${customerMap.get(s.customer_id) ?? "Customer"}` : ""}
                    {s.status !== "completed" ? ` · ${STATUS_LABEL[s.status] ?? s.status}` : ""}
                  </p>
                </div>
                <p className="text-sm font-bold">{formatMoney(s.total, business.currency)}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1)}
              className="flex h-9 items-center gap-1 rounded-[8px] border border-border px-3 text-sm font-medium text-text-secondary hover:border-primary/40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </Link>
          ) : (
            <span className="flex h-9 items-center gap-1 rounded-[8px] border border-border px-3 text-sm font-medium text-text-secondary/40">
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </span>
          )}
          <span className="text-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildPageUrl(page + 1)}
              className="flex h-9 items-center gap-1 rounded-[8px] border border-border px-3 text-sm font-medium text-text-secondary hover:border-primary/40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="flex h-9 items-center gap-1 rounded-[8px] border border-border px-3 text-sm font-medium text-text-secondary/40">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
