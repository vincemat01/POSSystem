"use client";

import { useActionState, useMemo, useState } from "react";
import { submitStockTake, type StockTakeFormState } from "@/app/(app)/more/stock-take/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProductWithStock {
  id: string;
  name: string;
  unit: string;
  stock: number;
}

interface CountedItem {
  counted: string;
  reason: string;
}

const initialState: StockTakeFormState = {};

export function StockTakeForm({ products }: { products: ProductWithStock[] }) {
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Map<string, CountedItem>>(new Map());
  const [state, formAction, pending] = useActionState(submitStockTake, initialState);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const countedCount = [...counts.values()].filter((c) => c.counted !== "").length;

  function updateCount(productId: string, field: "counted" | "reason", value: string) {
    setCounts((prev) => {
      const next = new Map(prev);
      const existing = next.get(productId) ?? { counted: "", reason: "" };
      next.set(productId, { ...existing, [field]: value });
      return next;
    });
  }

  function handleSubmit() {
    const items = products
      .filter((p) => {
        const c = counts.get(p.id);
        return c && c.counted !== "";
      })
      .map((p) => {
        const c = counts.get(p.id)!;
        return {
          product_id: p.id,
          counted_quantity: parseFloat(c.counted),
          reason: c.reason || undefined,
        };
      });

    if (items.length === 0) return;

    const fd = new FormData();
    fd.set("payload", JSON.stringify({ items }));
    formAction(fd);
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        <Input
          placeholder="Search products…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <p className="text-xs text-text-secondary">
        Enter the counted quantity for each product. Only products you count will be included.
        {countedCount > 0 && <span className="font-medium text-primary"> {countedCount} counted</span>}
      </p>

      <div className="space-y-2">
        {filtered.map((product) => {
          const entry = counts.get(product.id);
          const counted = entry?.counted ?? "";
          const countedNum = counted !== "" ? parseFloat(counted) : null;
          const diff = countedNum !== null ? countedNum - product.stock : null;

          return (
            <div key={product.id} className="rounded-[12px] border border-border bg-surface p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="text-xs text-text-secondary">
                    System: {product.stock} {product.unit}
                  </p>
                </div>
                {diff !== null && diff !== 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      diff > 0
                        ? "bg-primary-light text-primary-dark"
                        : "bg-danger-light text-danger"
                    }`}
                  >
                    {diff > 0 ? "+" : ""}
                    {diff}
                  </span>
                )}
                {diff !== null && diff === 0 && (
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-text-secondary">
                    Match
                  </span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <Label>Counted</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="—"
                    value={counted}
                    onChange={(e) => updateCount(product.id, "counted", e.target.value)}
                  />
                </div>
                {counted !== "" && diff !== null && diff !== 0 && (
                  <div>
                    <Label>Reason</Label>
                    <Input
                      placeholder="Optional"
                      value={entry?.reason ?? ""}
                      onChange={(e) => updateCount(product.id, "reason", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-text-secondary">No products match your search.</p>
      )}

      {state.error && (
        <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => history.back()} disabled={pending}>
          Cancel
        </Button>
        <Button size="lg" className="flex-1" onClick={handleSubmit} disabled={pending || countedCount === 0}>
          {pending ? "Saving…" : `Submit count (${countedCount})`}
        </Button>
      </div>
    </div>
  );
}
