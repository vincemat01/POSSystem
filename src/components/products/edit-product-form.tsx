"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateProduct, type ProductFormState } from "@/app/(app)/products/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/offline/db";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  category_id: string | null;
}

export function EditProductForm({ product }: { product: Product }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateProduct, {} as ProductFormState);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (editing) db.categories.toArray().then(setCategories);
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit details
      </button>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold">Edit product</p>
        <button type="button" onClick={() => setEditing(false)} className="text-text-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="product_id" value={product.id} />
        <div>
          <Label htmlFor="edit_name">Product name</Label>
          <Input id="edit_name" name="name" defaultValue={product.name} required />
        </div>

        {categories.length > 0 && (
          <div>
            <Label htmlFor="edit_category">Category</Label>
            <select
              id="edit_category"
              name="category_id"
              defaultValue={product.category_id ?? ""}
              className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit_barcode">Barcode</Label>
            <Input id="edit_barcode" name="barcode" defaultValue={product.barcode ?? ""} placeholder="Optional" />
          </div>
          <div>
            <Label htmlFor="edit_sku">SKU</Label>
            <Input id="edit_sku" name="sku" defaultValue={product.sku ?? ""} placeholder="Optional" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit_cost">Cost price</Label>
            <Input id="edit_cost" name="cost_price" type="number" step="0.01" min="0" defaultValue={product.cost_price} required />
          </div>
          <div>
            <Label htmlFor="edit_sell">Selling price</Label>
            <Input id="edit_sell" name="selling_price" type="number" step="0.01" min="0" defaultValue={product.selling_price} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edit_unit">Unit</Label>
            <Input id="edit_unit" name="unit" defaultValue={product.unit} />
          </div>
          <div>
            <Label htmlFor="edit_min">Low stock alert at</Label>
            <Input id="edit_min" name="minimum_stock" type="number" min="0" defaultValue={product.minimum_stock} />
          </div>
        </div>

        {state.error && (
          <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" type="button" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
          <Button className="flex-1" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
