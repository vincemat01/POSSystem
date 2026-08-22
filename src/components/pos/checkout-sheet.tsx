"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Star } from "lucide-react";
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

interface PaymentEntry {
  key: string;
  method: PaymentMethod;
  amount: string;
  tendered: string;
}

function newEntry(method: PaymentMethod, amount: number): PaymentEntry {
  return { key: crypto.randomUUID(), method, amount: String(amount), tendered: "" };
}

export function CheckoutSheet({
  businessId,
  locationId,
  currency,
  items,
  total,
  allowExpired,
  loyaltyEnabled,
  loyaltyPointValue,
  onClose,
  onComplete,
}: {
  businessId: string;
  locationId: string;
  currency: string;
  items: CartItem[];
  total: number;
  allowExpired: boolean;
  loyaltyEnabled: boolean;
  loyaltyPointValue: number;
  onClose: () => void;
  onComplete: (receiptId?: string) => void;
}) {
  const [payments, setPayments] = useState<PaymentEntry[]>([newEntry("cash", total)]);
  const [customerId, setCustomerId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = useLiveQuery(() => db.customers.where("business_id").equals(businessId).toArray(), [businessId]);

  const selectedCustomer = useMemo(() => customers?.find((c) => c.id === customerId), [customers, customerId]);

  const customerLoyaltyPoints = selectedCustomer?.loyalty_points ?? 0;
  const parsedPointsToRedeem = redeemPoints ? Math.min(
    Math.max(Math.floor(parseFloat(pointsToRedeem) || 0), 0),
    customerLoyaltyPoints,
  ) : 0;
  const loyaltyDiscount = parsedPointsToRedeem * loyaltyPointValue;
  const maxRedeemablePoints = Math.floor(total / loyaltyPointValue);
  const effectiveMaxPoints = Math.min(customerLoyaltyPoints, maxRedeemablePoints);

  const effectiveTotal = Math.max(total - loyaltyDiscount, 0);

  const allocated = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const remaining = Math.round((effectiveTotal - allocated) * 100) / 100;
  const hasCredit = payments.some((p) => p.method === "credit");

  const creditTotal = payments
    .filter((p) => p.method === "credit")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const overLimit =
    hasCredit && selectedCustomer
      ? selectedCustomer.credit_balance + creditTotal > selectedCustomer.credit_limit && selectedCustomer.credit_limit > 0
      : false;

  function updatePayment(key: string, updates: Partial<PaymentEntry>) {
    setPayments((prev) => prev.map((p) => (p.key === key ? { ...p, ...updates } : p)));
  }

  function removePayment(key: string) {
    setPayments((prev) => prev.filter((p) => p.key !== key));
  }

  function addPayment() {
    const usedMethods = new Set(payments.map((p) => p.method));
    const availableMethod = METHODS.find((m) => !usedMethods.has(m.value))?.value ?? "cash";
    setPayments((prev) => [...prev, newEntry(availableMethod, Math.max(remaining, 0))]);
  }

  function getCashDetails(entry: PaymentEntry) {
    if (entry.method !== "cash") return null;
    const amount = parseFloat(entry.amount) || 0;
    const tenderedNum = entry.tendered !== "" ? parseFloat(entry.tendered) : null;
    const change = tenderedNum !== null ? tenderedNum - amount : null;
    const insufficient = tenderedNum !== null && tenderedNum < amount;
    return { amount, tenderedNum, change, insufficient };
  }

  const anyInsufficientTender = payments.some((p) => {
    const cash = getCashDetails(p);
    return cash?.insufficient;
  });

  const canConfirm =
    !submitting &&
    remaining <= 0 &&
    !anyInsufficientTender &&
    (!hasCredit || customerId !== "") &&
    payments.every((p) => (parseFloat(p.amount) || 0) > 0);

  function handleRedeemToggle(checked: boolean) {
    setRedeemPoints(checked);
    if (checked && effectiveMaxPoints > 0) {
      setPointsToRedeem(String(effectiveMaxPoints));
      const newEffectiveTotal = Math.max(total - effectiveMaxPoints * loyaltyPointValue, 0);
      if (payments.length === 1) {
        setPayments([newEntry(payments[0].method, newEffectiveTotal)]);
      }
    } else {
      setPointsToRedeem("");
      if (payments.length === 1) {
        setPayments([newEntry(payments[0].method, total)]);
      }
    }
  }

  function handlePointsChange(value: string) {
    setPointsToRedeem(value);
    const pts = Math.min(Math.max(Math.floor(parseFloat(value) || 0), 0), effectiveMaxPoints);
    const newEffectiveTotal = Math.max(total - pts * loyaltyPointValue, 0);
    if (payments.length === 1) {
      setPayments([newEntry(payments[0].method, newEffectiveTotal)]);
    }
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    setError(null);

    const clientTransactionId = newClientTransactionId();
    const deviceId = await getDeviceId();
    const wasOnline = typeof navigator === "undefined" || navigator.onLine;

    const saleArgs: Record<string, unknown> = {
      p_business_id: businessId,
      p_location_id: locationId,
      p_client_transaction_id: clientTransactionId,
      p_items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount,
      })),
      p_payments: payments.map((p) => {
        const cash = getCashDetails(p);
        return {
          method: p.method,
          amount: parseFloat(p.amount) || 0,
          tendered_amount: cash?.tenderedNum ?? undefined,
          change_amount: cash?.change != null ? Math.max(cash.change, 0) : undefined,
        };
      }),
      p_customer_id: hasCredit || customerId ? customerId || null : null,
      p_credit_due_date: hasCredit ? dueDate : null,
      p_allow_expired: allowExpired,
      p_device_id: deviceId,
    };

    if (parsedPointsToRedeem > 0) {
      saleArgs.p_loyalty_points_redeemed = parsedPointsToRedeem;
      saleArgs.p_customer_id = customerId;
    }

    const result = await enqueue({
      client_transaction_id: clientTransactionId,
      business_id: businessId,
      operation: {
        kind: "sale",
        args: saleArgs,
      },
    });

    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onComplete(wasOnline ? clientTransactionId : undefined);
  }

  const showLoyalty = loyaltyEnabled && customerId && customerLoyaltyPoints > 0;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[16px] bg-surface p-5 md:rounded-[16px]">
        <h2 className="text-lg font-semibold">Checkout</h2>
        <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(total, currency)}</p>

        {loyaltyEnabled && (
          <div className="mt-3">
            <Label htmlFor="checkout-customer">Customer (for loyalty points)</Label>
            <select
              id="checkout-customer"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setRedeemPoints(false);
                setPointsToRedeem("");
              }}
              className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="">No customer selected</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ""} {c.loyalty_points > 0 ? `- ${c.loyalty_points} pts` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {showLoyalty && (
          <div className="mt-3 rounded-[10px] border border-accent-gold/30 bg-gold-light/60 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-accent-gold" />
              <span className="text-sm font-semibold">{customerLoyaltyPoints} loyalty points</span>
              <span className="text-xs text-text-secondary">
                (worth {formatMoney(customerLoyaltyPoints * loyaltyPointValue, currency)})
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={redeemPoints}
                onChange={(e) => handleRedeemToggle(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              Redeem points as discount
            </label>

            {redeemPoints && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max={effectiveMaxPoints}
                    value={pointsToRedeem}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-xs text-text-secondary">of {effectiveMaxPoints} max</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <p className="text-xs font-medium text-primary-dark">
                    Discount: -{formatMoney(loyaltyDiscount, currency)} | Pay: {formatMoney(effectiveTotal, currency)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-4">
          {payments.map((entry, idx) => {
            const cash = getCashDetails(entry);
            const entryAmount = parseFloat(entry.amount) || 0;
            const quickAmounts = entry.method === "cash"
              ? [entryAmount, ...[50, 100, 200, 500].filter((n) => n > entryAmount)].slice(0, 4)
              : [];

            return (
              <div key={entry.key} className="rounded-[12px] border border-border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-secondary">
                    Payment {payments.length > 1 ? idx + 1 : ""}
                  </p>
                  {payments.length > 1 && (
                    <button type="button" onClick={() => removePayment(entry.key)} className="text-text-secondary">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {METHODS.filter((m) => m.value !== "credit" || !payments.some((p) => p.key !== entry.key && p.method === "credit")).map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => updatePayment(entry.key, { method: m.value, tendered: "" })}
                      className={`h-9 rounded-[8px] border text-xs font-medium ${
                        entry.method === m.value ? "border-primary bg-primary-light text-primary-dark" : "border-border text-text"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {payments.length > 1 && (
                  <div>
                    <Label htmlFor={`amount-${entry.key}`}>Amount</Label>
                    <Input
                      id={`amount-${entry.key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      value={entry.amount}
                      onChange={(e) => updatePayment(entry.key, { amount: e.target.value })}
                    />
                  </div>
                )}

                {entry.method === "cash" && (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`tendered-${entry.key}`}>Amount received</Label>
                      <Input
                        id={`tendered-${entry.key}`}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        placeholder={formatMoney(entryAmount, currency)}
                        value={entry.tendered}
                        onChange={(e) => updatePayment(entry.key, { tendered: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {quickAmounts.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => updatePayment(entry.key, { tendered: String(amount) })}
                          className="h-8 rounded-[8px] border border-border px-2.5 text-xs font-medium text-text-secondary hover:border-primary/40"
                        >
                          {amount === entryAmount ? "Exact" : formatMoney(amount, currency)}
                        </button>
                      ))}
                    </div>
                    {cash?.insufficient && (
                      <p className="rounded-[8px] bg-danger-light px-2.5 py-1.5 text-xs text-danger">
                        Amount received is less than this payment.
                      </p>
                    )}
                    {cash && !cash.insufficient && cash.change !== null && cash.change > 0 && (
                      <p className="rounded-[8px] bg-primary-light px-2.5 py-1.5 text-xs font-semibold text-primary-dark">
                        Change due: {formatMoney(cash.change, currency)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {remaining > 0.005 && (
            <button
              type="button"
              onClick={addPayment}
              className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-border py-2.5 text-sm font-medium text-text-secondary hover:border-primary/40"
            >
              <Plus className="h-4 w-4" /> Add payment ({formatMoney(remaining, currency)} remaining)
            </button>
          )}

          {remaining < -0.005 && (
            <p className="rounded-[10px] bg-warning-light px-3 py-2 text-sm text-warning">
              Over-allocated by {formatMoney(Math.abs(remaining), currency)}. Adjust payment amounts.
            </p>
          )}
        </div>

        {hasCredit && (
          <div className="mt-4 space-y-3">
            {!loyaltyEnabled && (
              <div>
                <Label htmlFor="customer">Customer</Label>
                <select
                  id="customer"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">Select a customer...</option>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                {formatMoney((selectedCustomer?.credit_balance ?? 0) + creditTotal, currency)}.
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-4 rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex gap-3">
          <Button variant="secondary" className="flex-1" size="lg" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button className="flex-1" size="lg" onClick={handleConfirm} disabled={!canConfirm}>
            {submitting ? "Recording..." : "Confirm sale"}
          </Button>
        </div>
      </div>
    </div>
  );
}
