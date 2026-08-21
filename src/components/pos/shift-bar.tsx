"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogIn, LogOut } from "lucide-react";
import { startShift, endShift } from "@/app/(app)/more/staff/shift-actions";
import { formatMoney } from "@/lib/utils";

export function ShiftBar({
  activeShift,
  currency,
}: {
  activeShift: { id: string; started_at: string; opening_cash: number } | null;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "clock-in" | "clock-out">("idle");
  const [error, setError] = useState("");

  function handleStartShift(formData: FormData) {
    startTransition(async () => {
      const result = await startShift(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setMode("idle");
        setError("");
        router.refresh();
      }
    });
  }

  function handleEndShift(formData: FormData) {
    startTransition(async () => {
      const result = await endShift(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setMode("idle");
        setError("");
        router.refresh();
      }
    });
  }

  if (mode === "clock-in") {
    return (
      <div className="border-b border-border bg-primary-light/50 p-3">
        <form action={handleStartShift} className="space-y-2">
          <p className="text-sm font-semibold">Start your shift</p>
          <div className="flex gap-2">
            <input
              name="opening_cash"
              type="number"
              step="0.01"
              min="0"
              placeholder="Opening cash in drawer"
              className="h-10 flex-1 rounded-[8px] border border-border bg-surface px-3 text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-[8px] bg-primary px-4 text-sm font-medium text-white"
            >
              {pending ? "..." : "Clock in"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("idle"); setError(""); }}
              className="h-10 rounded-[8px] border border-border px-3 text-sm text-text-secondary"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </div>
    );
  }

  if (mode === "clock-out" && activeShift) {
    return (
      <div className="border-b border-border bg-warning-light/50 p-3">
        <form action={handleEndShift} className="space-y-2">
          <input type="hidden" name="shift_id" value={activeShift.id} />
          <p className="text-sm font-semibold">End your shift</p>
          <div className="flex gap-2">
            <input
              name="closing_cash"
              type="number"
              step="0.01"
              min="0"
              placeholder="Closing cash in drawer"
              className="h-10 flex-1 rounded-[8px] border border-border bg-surface px-3 text-sm"
              autoFocus
            />
          </div>
          <textarea
            name="notes"
            placeholder="Shift notes (optional)"
            rows={2}
            className="w-full rounded-[8px] border border-border bg-surface px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="h-10 rounded-[8px] bg-warning px-4 text-sm font-medium text-white"
            >
              {pending ? "..." : "Clock out"}
            </button>
            <button
              type="button"
              onClick={() => { setMode("idle"); setError(""); }}
              className="h-10 rounded-[8px] border border-border px-3 text-sm text-text-secondary"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </form>
      </div>
    );
  }

  if (activeShift) {
    const startedAt = new Date(activeShift.started_at);
    const elapsed = Math.round((Date.now() - startedAt.getTime()) / 60000);
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;

    return (
      <div className="flex items-center justify-between border-b border-border bg-primary-light/30 px-4 py-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary-dark">
            On shift {hours > 0 ? `${hours}h ` : ""}{minutes}m
          </span>
          <span className="text-xs text-text-secondary">
            Opened with {formatMoney(activeShift.opening_cash, currency)}
          </span>
        </div>
        <button
          onClick={() => setMode("clock-out")}
          className="flex items-center gap-1 rounded-[8px] border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-warning/40 hover:text-warning"
        >
          <LogOut className="h-3.5 w-3.5" />
          Clock out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
      <span className="text-xs text-text-secondary">No active shift</span>
      <button
        onClick={() => setMode("clock-in")}
        className="flex items-center gap-1 rounded-[8px] border border-primary/30 bg-primary-light/50 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-light"
      >
        <LogIn className="h-3.5 w-3.5" />
        Clock in
      </button>
    </div>
  );
}
