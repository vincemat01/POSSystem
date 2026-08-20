"use client";

import { useActionState } from "react";
import { recordPayment, type PaymentFormState } from "@/app/(app)/credit/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: PaymentFormState = {};

export function RecordPaymentForm({ customerId }: { customerId: string }) {
  const [state, formAction, pending] = useActionState(recordPayment, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="customer_id" value={customerId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="amount">Amount received (R)</Label>
          <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div>
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            name="method"
            defaultValue="cash"
            className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="eft">EFT</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {state.error && <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </Button>
    </form>
  );
}
