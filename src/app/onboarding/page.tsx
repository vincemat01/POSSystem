"use client";

import { useActionState } from "react";
import { createBusiness, type OnboardingState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "general_retail", label: "General Retail" },
  { value: "spaza_convenience", label: "Spaza / Convenience" },
  { value: "salon", label: "Salon" },
  { value: "barber", label: "Barber" },
  { value: "takeaway", label: "Takeaway" },
  { value: "butchery", label: "Butchery" },
  { value: "boutique", label: "Boutique" },
  { value: "hardware", label: "Hardware" },
  { value: "car_wash", label: "Car Wash" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
];

const initialState: OnboardingState = {};

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createBusiness, initialState);

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-primary">Set up your business</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Just the essentials — you can fine-tune everything later.
          </p>
        </div>

        <Card className="p-6">
          <form action={formAction} className="space-y-4">
            <div>
              <Label htmlFor="name">Business name</Label>
              <Input id="name" name="name" placeholder="e.g. Thandi's Spaza" required autoFocus />
            </div>

            <div>
              <Label htmlFor="business_type">Business type</Label>
              <select
                id="business_type"
                name="business_type"
                required
                defaultValue="spaza_convenience"
                className="h-11 w-full rounded-[10px] border border-border bg-surface px-3.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="location_name">Shop / branch name</Label>
              <Input id="location_name" name="location_name" placeholder="Main Location" defaultValue="Main Location" />
            </div>

            {state.error && (
              <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={pending}>
              {pending ? "Setting up…" : "Start selling"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
