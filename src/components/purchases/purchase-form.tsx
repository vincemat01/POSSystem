"use client";

import { useActionState, useMemo, useState } from "react";
import { createPurchase, type PurchaseFormState } from "@/app/(app)/more/purchases/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  cost_price: number;
  tracks_expiry: boolean;
}

interface Supplier {
  id: string;
  name: string;
}

interface LineItem {
  key: number;
  product_id: string;
  quantity: string;
  unit_cost: string;
  expiry_date: string;
}

let nextKey = 1;
function emptyLine(): LineItem {
  return { key: nextKey++, product_id: "", quantity: "", unit_cost: "", expiry_date: "" };
}

const initialState: PurchaseFormState = {};

export function PurchaseForm({
  products,
  suppliers,
  currency,
}: {
  products: Product[];
  suppliers: Supplier[];
  currency: string;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>(() => [emptyLine()]);
  const [state, formAction, pending] = useActionState(createPurchase, initialState);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const total = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0;
    const cost = parseFloat(l.unit_cost) || 0;
    return sum + qty * cost;
  }, 0);

  function updateLine(key: number, field: keyof LineItem, value: string) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const updated = { ...l, [field]: value };
        if (field === "product_id" && value) {
          const product = productsById.get(value);
          if (product && !l.unit_cost) {
            updated.unit_cost = String(product.cost_price);
          }
        }
        return updated;
      }),
    );
  }

  function removeLine(key: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  function handleSubmit() {
    const payload = {
      supplier_id: supplierId || undefined,
      purchase_date: purchaseDate,
      notes: notes || undefined,
      items: lines
        .filter((l) => l.product_id && l.quantity)
        .map((l) => ({
          product_id: l.product_id,
          quantity: parseFloat(l.quantity),
          unit_cost: parseFloat(l.unit_cost) || 0,
          expiry_date: l.expiry_date || undefined,
        })),
    };

    const fd = new FormData();
    fd.set("payload", JSON.stringify(payload));
    formAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="supplier">Supplier</Label>
          <select
            id="supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="purchase_date">Date received</Label>
          <Input id="purchase_date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Items</p>
        <div className="space-y-3">
          {lines.map((line) => {
            const product = productsById.get(line.product_id);
            return (
              <div key={line.key} className="rounded-[12px] border border-border bg-surface p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <Label>Product</Label>
                    <select
                      value={line.product_id}
                      onChange={(e) => updateLine(line.key, "product_id", e.target.value)}
                      className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <option value="">Select product…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      className="mt-6 rounded-[8px] p-2 text-text-secondary hover:bg-danger-light hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Unit cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={line.unit_cost}
                      onChange={(e) => updateLine(line.key, "unit_cost", e.target.value)}
                    />
                  </div>
                </div>

                {product?.tracks_expiry && (
                  <div>
                    <Label>Expiry date</Label>
                    <Input
                      type="date"
                      value={line.expiry_date}
                      onChange={(e) => updateLine(line.key, "expiry_date", e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button variant="secondary" size="md" className="mt-3" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
          <Plus className="h-4 w-4" /> Add item
        </Button>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Optional — e.g. Invoice #1234" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center justify-between rounded-[12px] bg-primary-light px-4 py-3">
        <span className="text-sm font-semibold text-primary-dark">Total</span>
        <span className="text-lg font-bold text-primary-dark">{formatMoney(total, currency)}</span>
      </div>

      {state.error && (
        <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => history.back()} disabled={pending}>
          Cancel
        </Button>
        <Button size="lg" className="flex-1" onClick={handleSubmit} disabled={pending || lines.every((l) => !l.product_id || !l.quantity)}>
          {pending ? "Saving…" : "Receive stock"}
        </Button>
      </div>
    </div>
  );
}
