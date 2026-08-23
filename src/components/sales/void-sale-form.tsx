"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { voidSale, type VoidFormState } from "@/app/(app)/more/sales/[id]/void/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: VoidFormState = {};

export function VoidSaleForm({ saleId, saleNumber }: { saleId: string; saleNumber: string }) {
  const [state, formAction, pending] = useActionState(voidSale, initialState);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Card className="space-y-3 border-danger/30 bg-danger-light/40">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        <p className="text-sm text-text">
          Voiding <span className="font-semibold">{saleNumber}</span> restocks every item, reverses
          any credit debt or loyalty points it created, and cannot be undone. Use Return Items
          instead if the customer is bringing goods back later.
        </p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="sale_id" value={saleId} />
        <div>
          <Label htmlFor="reason">Reason (optional)</Label>
          <textarea
            id="reason"
            name="reason"
            rows={2}
            placeholder="e.g. Rang up the wrong items"
            className="w-full rounded-[10px] border border-border bg-surface px-3.5 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          I understand this cannot be undone
        </label>

        {state.error && <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>}

        <Button type="submit" variant="danger" className="w-full" disabled={pending || !confirmed}>
          {pending ? "Voiding…" : "Void sale"}
        </Button>
      </form>
    </Card>
  );
}
