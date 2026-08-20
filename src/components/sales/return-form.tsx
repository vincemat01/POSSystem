"use client";

import { useActionState, useState } from "react";
import { submitReturn, type ReturnFormState } from "@/app/(app)/more/sales/[id]/return/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

interface ReturnableItem {
  sale_item_id: string;
  product_id: string;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  returned_quantity: number;
  remaining_quantity: number;
}

interface SelectedItem {
  checked: boolean;
  quantity: string;
  reason: string;
}

const initialState: ReturnFormState = {};

export function ReturnForm({
  saleId,
  items,
  currency,
  hasCustomer,
}: {
  saleId: string;
  items: ReturnableItem[];
  currency: string;
  hasCustomer: boolean;
}) {
  const [selections, setSelections] = useState<Map<string, SelectedItem>>(new Map());
  const [refundMethod, setRefundMethod] = useState<"cash" | "credit" | "original">("cash");
  const [state, formAction, pending] = useActionState(submitReturn, initialState);

  function updateItem(saleItemId: string, update: Partial<SelectedItem>) {
    setSelections((prev) => {
      const next = new Map(prev);
      const existing = next.get(saleItemId) ?? { checked: false, quantity: "", reason: "" };
      next.set(saleItemId, { ...existing, ...update });
      return next;
    });
  }

  const selectedItems = items.filter((i) => selections.get(i.sale_item_id)?.checked);
  const total = selectedItems.reduce((sum, item) => {
    const sel = selections.get(item.sale_item_id)!;
    const qty = parseFloat(sel.quantity) || 0;
    return sum + qty * item.unit_price;
  }, 0);

  function handleSubmit() {
    const returnItems = selectedItems
      .map((item) => {
        const sel = selections.get(item.sale_item_id)!;
        const qty = parseFloat(sel.quantity) || 0;
        if (qty <= 0) return null;
        return {
          sale_item_id: item.sale_item_id,
          quantity: qty,
          reason: sel.reason || undefined,
        };
      })
      .filter(Boolean);

    if (returnItems.length === 0) return;

    const fd = new FormData();
    fd.set(
      "payload",
      JSON.stringify({
        sale_id: saleId,
        items: returnItems,
        refund_method: refundMethod,
      }),
    );
    formAction(fd);
  }

  const refundMethods = [
    { value: "cash" as const, label: "Cash refund" },
    ...(hasCustomer ? [{ value: "credit" as const, label: "Store credit" }] : []),
    { value: "original" as const, label: "Original method" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {items.map((item) => {
          const sel = selections.get(item.sale_item_id);
          const checked = sel?.checked ?? false;
          const qtyStr = sel?.quantity ?? "";
          const qty = parseFloat(qtyStr) || 0;
          const overMax = qty > item.remaining_quantity;

          return (
            <Card key={item.sale_item_id} className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    updateItem(item.sale_item_id, {
                      checked: e.target.checked,
                      quantity: e.target.checked ? String(item.remaining_quantity) : "",
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-border accent-primary"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.product_name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatMoney(item.unit_price, currency)} &times; {item.quantity} {item.unit}
                    {item.returned_quantity > 0 && (
                      <span className="text-warning">
                        {" "}({item.returned_quantity} already returned)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">
                    Max returnable: {item.remaining_quantity} {item.unit}
                  </p>
                </div>
              </label>
              {checked && (
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.001"
                      max={item.remaining_quantity}
                      value={qtyStr}
                      onChange={(e) => updateItem(item.sale_item_id, { quantity: e.target.value })}
                    />
                    {overMax && (
                      <p className="mt-1 text-xs text-danger">
                        Max {item.remaining_quantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <Input
                      placeholder="Optional"
                      value={sel?.reason ?? ""}
                      onChange={(e) => updateItem(item.sale_item_id, { reason: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-text-secondary">
          All items have already been returned.
        </p>
      )}

      {selectedItems.length > 0 && (
        <Card className="space-y-3">
          <Label>Refund method</Label>
          <div className="flex flex-wrap gap-2">
            {refundMethods.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setRefundMethod(m.value)}
                className={`rounded-[10px] border px-3 py-2 text-sm font-medium transition-colors ${
                  refundMethod === m.value
                    ? "border-primary bg-primary-light text-primary-dark"
                    : "border-border bg-surface text-text-secondary hover:bg-primary-light/60"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium text-text-secondary">Refund total</span>
            <span className="text-lg font-bold">{formatMoney(total, currency)}</span>
          </div>
        </Card>
      )}

      {state.error && (
        <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => history.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          size="lg"
          className="flex-1"
          onClick={handleSubmit}
          disabled={pending || selectedItems.length === 0 || total <= 0}
        >
          {pending ? "Processing..." : `Process Return`}
        </Button>
      </div>
    </div>
  );
}
