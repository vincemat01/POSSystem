"use client";

import { useActionState, useState } from "react";
import { adjustStock, type AdjustStockState } from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: AdjustStockState = {};

export function AdjustStockForm({ productId, tracksExpiry }: { productId: string; tracksExpiry: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(adjustStock, initialState);

  if (!open) {
    return (
      <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
        Adjust stock
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-[12px] border border-border bg-surface p-4">
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="quantity">Quantity change</Label>
          <Input id="quantity" name="quantity" type="number" step="1" placeholder="e.g. 20 or -3" required />
        </div>
        {tracksExpiry && (
          <div>
            <Label htmlFor="expiry_date">Expiry date</Label>
            <Input id="expiry_date" name="expiry_date" type="date" />
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" name="reason" placeholder="Optional — e.g. Initial stock, Stock count correction" />
      </div>

      {tracksExpiry && (
        <p className="text-xs text-text-secondary">
          This product tracks expiry, so a positive adjustment creates a new batch. Reducing stock isn&apos;t
          supported here yet — that needs Stock Take.
        </p>
      )}

      {state.error && <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.success && <p className="rounded-[10px] bg-primary-light px-3 py-2 text-sm text-primary-dark">Stock updated.</p>}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save adjustment"}
        </Button>
      </div>
    </form>
  );
}
