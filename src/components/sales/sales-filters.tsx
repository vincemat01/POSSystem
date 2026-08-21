"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "partially_refunded", label: "Partially refunded" },
  { value: "voided", label: "Voided" },
];

export function SalesFilters({
  query,
  fromDate,
  toDate,
  status,
}: {
  query: string;
  fromDate: string;
  toDate: string;
  status: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function apply() {
    const fd = new FormData(formRef.current!);
    const sp = new URLSearchParams();
    const q = (fd.get("q") as string)?.trim();
    const from = fd.get("from") as string;
    const to = fd.get("to") as string;
    const st = fd.get("status") as string;
    if (q) sp.set("q", q);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (st) sp.set("status", st);
    const qs = sp.toString();
    router.push(`/more/sales${qs ? `?${qs}` : ""}`);
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="space-y-2"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search by sale # or customer…"
          className="h-10 w-full rounded-[10px] border border-border bg-surface pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>
      <div className="flex gap-2">
        <input
          type="date"
          name="from"
          defaultValue={fromDate}
          onChange={apply}
          className="h-9 flex-1 rounded-[8px] border border-border bg-surface px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <input
          type="date"
          name="to"
          defaultValue={toDate}
          onChange={apply}
          className="h-9 flex-1 rounded-[8px] border border-border bg-surface px-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <select
          name="status"
          defaultValue={status}
          onChange={apply}
          className="h-9 rounded-[8px] border border-border bg-surface px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
