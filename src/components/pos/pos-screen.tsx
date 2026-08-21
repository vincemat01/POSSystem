"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, ScanBarcode, Percent } from "lucide-react";
import { db, type CartItem } from "@/lib/offline/db";
import { formatMoney } from "@/lib/utils";
import { CheckoutSheet } from "./checkout-sheet";
import { BarcodeScanner } from "@/components/barcode-scanner";

export function PosScreen({
  businessId,
  locationId,
  currency,
  preventExpiredSale,
}: {
  businessId: string;
  locationId: string;
  currency: string;
  preventExpiredSale: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discountOpen, setDiscountOpen] = useState<string | null>(null);

  const products = useLiveQuery(async () => {
    const all = await db.products.where("business_id").equals(businessId).and((p) => p.active).toArray();
    if (!search) return all.slice(0, 50);
    const term = search.toLowerCase();
    return all
      .filter((p) => p.name.toLowerCase().includes(term) || p.barcode === search || p.sku === search)
      .slice(0, 50);
  }, [businessId, search]);

  useEffect(() => {
    db.cart.get("current").then((saved) => {
      if (saved && saved.business_id === businessId) setCart(saved.items);
    });
  }, [businessId]);

  useEffect(() => {
    void db.cart.put({
      id: "current",
      business_id: businessId,
      location_id: locationId,
      customer_id: null,
      items: cart,
      updated_at: new Date().toISOString(),
    });
  }, [cart, businessId, locationId]);

  function addToCart(product: { id: string; name: string; selling_price: number }) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product_id: product.id, name: product.name, unit_price: product.selling_price, quantity: 1, discount: 0 }];
    });
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product_id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  function applyDiscount(productId: string, type: "percent" | "fixed", value: number) {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const lineTotal = i.unit_price * i.quantity;
        const disc = type === "percent" ? Math.round(lineTotal * (value / 100) * 100) / 100 : Math.min(value, lineTotal);
        return { ...i, discount: Math.max(disc, 0) };
      }),
    );
    setDiscountOpen(null);
  }

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function handleComplete(receiptId?: string) {
    setCart([]);
    setShowCheckout(false);

    if (receiptId) {
      router.push(`/more/sales/${receiptId}`);
      return;
    }

    // Offline: the sale isn't queryable yet (still just a local outbox entry), so there's no
    // receipt to show — just confirm it was captured and will sync later.
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or scan a product…"
              autoFocus
              className="h-12 w-full rounded-[10px] border border-border bg-surface pl-10 pr-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-surface text-text-secondary hover:border-primary/40"
            aria-label="Scan barcode"
          >
            <ScanBarcode className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40">
        {!products || products.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">
            {search ? "No products match." : "No products cached yet — connect to the internet once to sync your catalog."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col rounded-[10px] border border-border bg-surface text-left transition-colors hover:border-primary/40 active:bg-primary-light/40"
              >
                <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-t-[10px] bg-primary-light/30 sm:h-20">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-lg font-bold text-primary/40">
                      {product.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="p-1.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight">{product.name}</p>
                  <p className="mt-0.5 text-[11px] text-text-secondary">{product.stock_on_hand} {product.unit}</p>
                  <p className="mt-0.5 text-xs font-bold text-primary">{formatMoney(product.selling_price, currency)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface md:bottom-0 md:left-60">
          <div className="max-h-56 overflow-y-auto p-3">
            {cart.map((item) => (
              <div key={item.product_id} className="py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountOpen(discountOpen === item.product_id ? null : item.product_id)}
                    className="flex-1 truncate text-left text-sm"
                  >
                    {item.name}
                    {item.discount > 0 && (
                      <span className="ml-1 text-xs text-primary">-{formatMoney(item.discount, currency)}</span>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="w-16 text-right text-sm font-semibold">
                    {formatMoney(item.unit_price * item.quantity - item.discount, currency)}
                  </p>
                  <button onClick={() => removeItem(item.product_id)} aria-label="Remove item">
                    <Trash2 className="h-4 w-4 text-text-secondary" />
                  </button>
                </div>
                {discountOpen === item.product_id && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-1">
                    {[5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyDiscount(item.product_id, "percent", pct)}
                        className="flex h-8 items-center gap-0.5 rounded-[8px] border border-border px-2 text-xs font-medium text-text-secondary hover:border-primary/40"
                      >
                        {pct}<Percent className="h-3 w-3" />
                      </button>
                    ))}
                    {item.discount > 0 && (
                      <button
                        type="button"
                        onClick={() => applyDiscount(item.product_id, "fixed", 0)}
                        className="h-8 rounded-[8px] border border-border px-2 text-xs font-medium text-danger hover:border-danger/40"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border p-3">
            <div>
              <p className="text-xs text-text-secondary">{itemCount} items</p>
              <p className="text-lg font-bold">{formatMoney(total, currency)}</p>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="flex h-14 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white hover:bg-primary-dark"
            >
              <ShoppingCart className="h-5 w-5" />
              Checkout
            </button>
          </div>
        </div>
      )}

      {showCheckout && (
        <CheckoutSheet
          businessId={businessId}
          locationId={locationId}
          currency={currency}
          items={cart}
          total={total}
          allowExpired={!preventExpiredSale}
          onClose={() => setShowCheckout(false)}
          onComplete={handleComplete}
        />
      )}

      {scanning && (
        <BarcodeScanner
          onScan={(value) => {
            setScanning(false);
            setSearch(value);
          }}
          onClose={() => setScanning(false)}
        />
      )}

      {confirmed && (
        <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            Sale saved — will sync when online
          </div>
        </div>
      )}
    </div>
  );
}
