"use client";

import { useActionState } from "react";
import { createInvite, type InviteFormState } from "@/app/(app)/more/staff/actions";
import { Button } from "@/components/ui/button";

const ROLES = [
  { value: "cashier", label: "Cashier" },
  { value: "stock_manager", label: "Stock Manager" },
  { value: "manager", label: "Manager" },
];

export function InviteForm() {
  const [state, formAction, pending] = useActionState(createInvite, {} as InviteFormState);

  return (
    <div>
      <form action={formAction} className="flex gap-2">
        <select
          name="role"
          defaultValue="cashier"
          className="h-10 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Generate invite code"}
        </Button>
      </form>

      {state.error && (
        <p className="mt-2 rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      {state.code && (
        <div className="mt-3 rounded-[12px] border border-primary/30 bg-primary-light p-4 text-center">
          <p className="text-xs text-text-secondary">Share this code with your new staff member</p>
          <p className="mt-1 text-2xl font-bold tracking-widest text-primary-dark">{state.code}</p>
          <p className="mt-2 text-xs text-text-secondary">
            They enter this code when signing up or on the join page. Expires in 7 days.
          </p>
        </div>
      )}
    </div>
  );
}
