"use client";

import { useActionState, useState } from "react";
import { updateBusinessSettings, type SettingsFormState } from "@/app/(app)/more/settings/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const initialState: SettingsFormState = {};

export function SettingsForm({
  business,
}: {
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    receipt_footer: string | null;
    low_stock_default_threshold: number;
    prevent_expired_sale: boolean;
    loyalty_enabled: boolean;
    loyalty_earn_rate: number;
    loyalty_point_value: number;
  };
}) {
  const [state, formAction, pending] = useActionState(updateBusinessSettings, initialState);
  const [loyaltyOn, setLoyaltyOn] = useState(business.loyalty_enabled);

  return (
    <Card className="p-5">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Business name</Label>
          <Input id="name" name="name" defaultValue={business.name} required />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={business.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={business.address ?? ""} />
        </div>
        <div>
          <Label htmlFor="receipt_footer">Receipt footer message</Label>
          <Input id="receipt_footer" name="receipt_footer" defaultValue={business.receipt_footer ?? ""} placeholder="e.g. Thank you for your business!" />
        </div>
        <div>
          <Label htmlFor="low_stock_default_threshold">Default low-stock alert level</Label>
          <Input
            id="low_stock_default_threshold"
            name="low_stock_default_threshold"
            type="number"
            min="0"
            defaultValue={business.low_stock_default_threshold}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            name="prevent_expired_sale"
            defaultChecked={business.prevent_expired_sale}
            className="h-4 w-4 rounded border-border"
          />
          Prevent sale of expired stock
        </label>

        <div className="border-t border-border pt-4">
          <p className="mb-3 text-sm font-semibold">Loyalty Programme</p>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="loyalty_enabled"
              checked={loyaltyOn}
              onChange={(e) => setLoyaltyOn(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Enable customer loyalty points
          </label>

          {loyaltyOn && (
            <div className="mt-3 space-y-3 rounded-[10px] border border-border p-3">
              <div>
                <Label htmlFor="loyalty_earn_rate">Points earned per 1 unit of currency spent</Label>
                <Input
                  id="loyalty_earn_rate"
                  name="loyalty_earn_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={business.loyalty_earn_rate}
                />
                <p className="mt-1 text-xs text-text-secondary">
                  e.g. 1 means a R100 sale earns 100 points
                </p>
              </div>
              <div>
                <Label htmlFor="loyalty_point_value">Value of each point in currency</Label>
                <Input
                  id="loyalty_point_value"
                  name="loyalty_point_value"
                  type="number"
                  step="0.001"
                  min="0"
                  defaultValue={business.loyalty_point_value}
                />
                <p className="mt-1 text-xs text-text-secondary">
                  e.g. 0.01 means 100 points = R1.00 discount
                </p>
              </div>
            </div>
          )}
        </div>

        {state.error && <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state.success && <p className="rounded-[10px] bg-primary-light px-3 py-2 text-sm text-primary-dark">Saved.</p>}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}
