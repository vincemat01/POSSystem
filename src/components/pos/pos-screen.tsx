"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { db, type CartItem } from "@/lib/offline/db";
import { formatMoney } from "@/lib/utils";
import { CheckoutSheet } from "./checkout-sheet";

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
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

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

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function handleComplete() {
    setCart([]);
    setShowCheckout(false);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2500);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <div className="relative">
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
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40">
        {!products || products.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary">
            {search ? "No products match." : "No products cached yet — connect to the internet once to sync your catalog."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="rounded-[12px] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/40 active:bg-primary-light/40"
              >
                <p className="text-sm font-semibold leading-tight">{product.name}</p>
                <p className="mt-1 text-xs text-text-secondary">{product.stock_on_hand} {product.unit}</p>
                <p className="mt-1 text-sm font-bold text-primary">{formatMoney(product.selling_price, currency)}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface md:bottom-0 md:left-60">
          <div className="max-h-56 overflow-y-auto p-3">
            {cart.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between gap-2 py-1.5">
                <p className="flex-1 truncate text-sm">{item.name}</p>
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

      {confirmed && (
        <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            Sale recorded
          </div>
        </div>
      )}
    </div>
  );
}
