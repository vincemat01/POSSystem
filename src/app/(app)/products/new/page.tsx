"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ScanBarcode, Camera, ChevronLeft } from "lucide-react";
import { createProduct, type ProductFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: ProductFormState = {};

export default function NewProductPage() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>

      <h1 className="text-xl font-bold">Add Product</h1>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled
          title="Barcode scanning is coming soon"
          className="flex flex-col items-center gap-1.5 rounded-[12px] border border-border bg-surface py-4 text-sm font-medium text-text-secondary opacity-60"
        >
          <ScanBarcode className="h-5 w-5" />
          Scan Barcode
          <span className="text-[10px] uppercase tracking-wide">Coming soon</span>
        </button>
        <button
          type="button"
          disabled
          title="AI photo capture is coming soon"
          className="flex flex-col items-center gap-1.5 rounded-[12px] border border-border bg-surface py-4 text-sm font-medium text-text-secondary opacity-60"
        >
          <Camera className="h-5 w-5" />
          Take Photo
          <span className="text-[10px] uppercase tracking-wide">Coming soon</span>
        </button>
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Add manually</p>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Product name</Label>
            <Input id="name" name="name" placeholder="e.g. Coke 500ml" required autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input id="barcode" name="barcode" placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cost_price">Cost price (R)</Label>
              <Input id="cost_price" name="cost_price" type="number" step="0.01" min="0" defaultValue="0" required />
            </div>
            <div>
              <Label htmlFor="selling_price">Selling price (R)</Label>
              <Input id="selling_price" name="selling_price" type="number" step="0.01" min="0" defaultValue="0" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="each" defaultValue="each" />
            </div>
            <div>
              <Label htmlFor="minimum_stock">Low stock alert at</Label>
              <Input id="minimum_stock" name="minimum_stock" type="number" step="1" min="0" defaultValue="5" />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="tracks_expiry" className="h-4 w-4 rounded border-border" />
            This product has an expiry date (tracked per batch)
          </label>

          {state.error && (
            <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Save product"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
