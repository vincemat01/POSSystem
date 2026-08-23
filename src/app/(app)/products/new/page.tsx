"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ScanBarcode, Camera, ChevronLeft, X } from "lucide-react";
import { createProduct, type ProductFormState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { db } from "@/lib/offline/db";

function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob!], "product.jpg", { type: "image/jpeg" })),
        "image/jpeg",
        quality,
      );
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

const initialState: ProductFormState = {};

export default function NewProductPage() {
  const [state, baseAction, pending] = useActionState(createProduct, initialState);
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    db.categories.toArray().then(setCategories);
  }, []);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));
  }

  function clearImage() {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formAction(formData: FormData) {
    if (imageFile) formData.set("image", imageFile);
    if (barcode) formData.set("barcode", barcode);
    return baseAction(formData);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 md:p-6">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-text-secondary">
        <ChevronLeft className="h-4 w-4" /> Back to products
      </Link>

      <h1 className="text-xl font-bold">Add Product</h1>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="flex flex-col items-center gap-1.5 rounded-[12px] border border-border bg-surface py-4 text-sm font-medium text-text hover:border-primary/40 active:bg-primary-light/40"
        >
          <ScanBarcode className="h-5 w-5" />
          Scan Barcode
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1.5 rounded-[12px] border border-border bg-surface py-4 text-sm font-medium text-text hover:border-primary/40 active:bg-primary-light/40"
        >
          <Camera className="h-5 w-5" />
          {imagePreview ? "Change Photo" : "Add Photo"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>

      {imagePreview && (
        <div className="relative mx-auto w-40">
          <img src={imagePreview} alt="Product preview" className="h-40 w-40 rounded-[12px] border border-border object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white shadow"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <Card className="p-5">
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="name">Product name</Label>
            <Input id="name" name="name" placeholder="e.g. Coke 500ml" required autoFocus />
          </div>

          {categories.length > 0 && (
            <div>
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                name="category_id"
                defaultValue=""
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
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                name="barcode"
                placeholder="Optional"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
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

          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="tax_exempt" className="h-4 w-4 rounded border-border" />
            This product is tax-exempt (zero-rated)
          </label>

          {state.error && (
            <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Saving…" : "Save product"}
          </Button>
        </form>
      </Card>

      {scanning && (
        <BarcodeScanner
          onScan={(value) => {
            setBarcode(value);
            setScanning(false);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
