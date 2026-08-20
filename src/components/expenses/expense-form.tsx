"use client";

import { useActionState } from "react";
import { createExpense, type ExpenseFormState } from "@/app/(app)/more/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const CATEGORIES = ["Electricity", "Transport", "Rent", "Stock delivery", "Packaging", "Other"];

const initialState: ExpenseFormState = {};

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(createExpense, initialState);

  return (
    <Card className="p-5">
      <p className="mb-3 text-sm font-semibold">Add expense</p>
      <form action={formAction} className="space-y-3" key={state.error ? "error" : "ok"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue="Stock delivery"
              className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="amount">Amount (R)</Label>
            <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="expense_date">Date</Label>
            <Input id="expense_date" name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
          </div>
          <div>
            <Label htmlFor="payment_method">Paid with</Label>
            <select
              id="payment_method"
              name="payment_method"
              defaultValue="cash"
              className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="eft">EFT</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="description">Note</Label>
          <Input id="description" name="description" placeholder="Optional" />
        </div>

        {state.error && <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Add expense"}
        </Button>
      </form>
    </Card>
  );
}
