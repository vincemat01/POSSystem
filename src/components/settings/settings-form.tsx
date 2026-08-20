"use client";

import { useActionState } from "react";
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
  };
}) {
  const [state, formAction, pending] = useActionState(updateBusinessSettings, initialState);

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

        {state.error && <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>}
        {state.success && <p className="rounded-[10px] bg-primary-light px-3 py-2 text-sm text-primary-dark">Saved.</p>}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}
