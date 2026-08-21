"use client";

import { useActionState, useState } from "react";
import { createBusiness, joinWithCode, type OnboardingState, type JoinState } from "./actions";
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

export default function OnboardingPage() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [createState, createAction, createPending] = useActionState(createBusiness, {} as OnboardingState);
  const [joinState, joinAction, joinPending] = useActionState(joinWithCode, {} as JoinState);

  return (
    <div className="flex min-h-dvh flex-1 items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">
            {mode === "create" ? "Set up your business" : "Join a business"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {mode === "create"
              ? "Just the essentials — you can fine-tune everything later."
              : "Enter the invite code your manager shared with you."}
          </p>
        </div>

        <div className="mb-4 flex rounded-[10px] border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`flex-1 rounded-[8px] py-2 text-sm font-medium transition-colors ${
              mode === "create" ? "bg-primary text-white" : "text-text-secondary"
            }`}
          >
            New business
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`flex-1 rounded-[8px] py-2 text-sm font-medium transition-colors ${
              mode === "join" ? "bg-primary text-white" : "text-text-secondary"
            }`}
          >
            Join with code
          </button>
        </div>

        {mode === "create" ? (
          <Card className="p-6">
            <form action={createAction} className="space-y-4">
              <div>
                <Label htmlFor="owner_name">Your name</Label>
                <Input id="owner_name" name="owner_name" placeholder="e.g. Thandi Moyo" required autoFocus />
              </div>

              <div>
                <Label htmlFor="name">Business name</Label>
                <Input id="name" name="name" placeholder="e.g. Thandi's Spaza" required />
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

              {createState.error && (
                <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{createState.error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={createPending}>
                {createPending ? "Setting up…" : "Start selling"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="p-6">
            <form action={joinAction} className="space-y-4">
              <div>
                <Label htmlFor="display_name">Your name</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  placeholder="e.g. Thandi Moyo"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="code">Invite code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g. ABC123"
                  required
                  className="text-center text-lg font-bold tracking-widest uppercase"
                />
              </div>

              {joinState.error && (
                <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{joinState.error}</p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={joinPending}>
                {joinPending ? "Joining…" : "Join business"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
