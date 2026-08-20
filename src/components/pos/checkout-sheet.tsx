"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type CartItem, newClientTransactionId, getDeviceId } from "@/lib/offline/db";
import { enqueue } from "@/lib/offline/sync";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

type PaymentMethod = "cash" | "card" | "eft" | "credit" | "other";

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "eft", label: "EFT" },
  { value: "credit", label: "Credit" },
  { value: "other", label: "Other" },
];

export function CheckoutSheet({
  businessId,
  locationId,
  currency,
  items,
  total,
  allowExpired,
  onClose,
  onComplete,
}: {
  businessId: string;
  locationId: string;
  currency: string;
  items: CartItem[];
  total: number;
  allowExpired: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = useLiveQuery(() => db.customers.where("business_id").equals(businessId).toArray(), [businessId]);

  const selectedCustomer = useMemo(() => customers?.find((c) => c.id === customerId), [customers, customerId]);
  const overLimit =
    method === "credit" && selectedCustomer
      ? selectedCustomer.credit_balance + total > selectedCustomer.credit_limit && selectedCustomer.credit_limit > 0
      : false;

  async function handleConfirm() {
    if (method === "credit" && !customerId) return;
    setSubmitting(true);
    setError(null);

    const clientTransactionId = newClientTransactionId();
    const deviceId = await getDeviceId();

    const result = await enqueue({
      client_transaction_id: clientTransactionId,
      business_id: businessId,
      operation: {
        kind: "sale",
        args: {
          p_business_id: businessId,
          p_location_id: locationId,
          p_client_transaction_id: clientTransactionId,
          p_items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            unit_price: i.unit_price,
            discount: i.discount,
          })),
          p_payments: [{ method, amount: total }],
          p_customer_id: method === "credit" ? customerId : null,
          p_credit_due_date: method === "credit" ? dueDate : null,
          p_allow_expired: allowExpired,
          p_device_id: deviceId,
        },
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onComplete();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center">
      <div className="w-full max-w-md rounded-t-[16px] bg-surface p-5 md:rounded-[16px]">
        <h2 className="text-lg font-semibold">Checkout</h2>
        <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(total, currency)}</p>

        <div className="mt-4">
          <Label>Payment method</Label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`h-11 rounded-[10px] border text-sm font-medium ${
                  method === m.value ? "border-primary bg-primary-light text-primary-dark" : "border-border text-text"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {method === "credit" && (
          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="customer">Customer</Label>
              <select
                id="customer"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <option value="">Select a customer…</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            {selectedCustomer && (
              <p className="text-xs text-text-secondary">
                Current balance: {formatMoney(selectedCustomer.credit_balance, currency)}
                {selectedCustomer.credit_limit > 0 && ` · Limit: ${formatMoney(selectedCustomer.credit_limit, currency)}`}
              </p>
            )}
            {overLimit && (
              <p className="rounded-[10px] bg-warning-light px-3 py-2 text-sm text-warning">
                Credit limit exceeded. New balance would be{" "}
                {formatMoney((selectedCustomer?.credit_balance ?? 0) + total, currency)}.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-4 rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" size="lg" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            size="lg"
            onClick={handleConfirm}
            disabled={submitting || (method === "credit" && !customerId)}
          >
            {submitting ? "Recording…" : "Confirm sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
