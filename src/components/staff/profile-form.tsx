"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/(app)/more/profile/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ProfileForm({ currentName }: { currentName: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={currentName}
          placeholder="e.g. Thandi Moyo"
          required
          autoFocus
        />
        <p className="mt-1 text-xs text-text-secondary">
          This name appears on receipts, reports, and shift logs.
        </p>
      </div>

      {state.error && (
        <p className="rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">{state.error}</p>
      )}

      {state.success && (
        <p className="rounded-[10px] bg-success-light px-3 py-2 text-sm text-success">Name updated.</p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
