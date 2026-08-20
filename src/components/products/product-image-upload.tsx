"use client";

import { useActionState, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { updateProductImage, type ProductFormState } from "@/app/(app)/products/actions";

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

export function ProductImageUpload({
  productId,
  imageUrl,
  productName,
}: {
  productId: string;
  imageUrl: string | null;
  productName: string;
}) {
  const [state, action, pending] = useActionState(updateProductImage, {} as ProductFormState);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const displayUrl = preview ?? imageUrl;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPreview(URL.createObjectURL(compressed));

    const fd = new FormData();
    fd.set("product_id", productId);
    fd.set("image", compressed);
    action(fd);
  }

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="group relative shrink-0"
      disabled={pending}
    >
      {displayUrl ? (
        <img src={displayUrl} alt={productName} className="h-20 w-20 rounded-[12px] border border-border object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-[12px] border border-dashed border-border text-text-secondary group-hover:border-primary/40">
          <Camera className="h-6 w-6" />
        </div>
      )}
      {pending && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[12px] bg-black/40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </button>
  );
}
