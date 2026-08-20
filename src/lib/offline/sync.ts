import { createClient } from "@/lib/supabase/client";
import { db, type OutboxItem } from "./db";

export type SyncListener = (state: SyncState) => void;

export interface SyncState {
  pending: number;
  syncing: boolean;
  lastError: string | null;
}

let listeners: SyncListener[] = [];
let syncing = false;

export function onSyncStateChange(listener: SyncListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

async function notify(lastError: string | null = null) {
  const pending = await db.outbox.where("status").anyOf("pending", "failed").count();
  for (const listener of listeners) listener({ pending, syncing, lastError });
}

export type EnqueueResult = { ok: true } | { ok: false; error: string };

/** Queue an offline-safe operation. Call this instead of hitting Supabase directly from the POS
 * so sales keep working with no network (spec §45-46).
 *
 * When online, this waits for the actual sync attempt and reports whether the server accepted it
 * — a real failure (e.g. insufficient stock) must not be reported as success just because the
 * write reached local storage. When offline, it returns success immediately once queued, since
 * that's the correct behavior for offline-first: the operation is safely stored and will sync
 * later (spec §48-49). */
export async function enqueue(
  item: Omit<OutboxItem, "status" | "attempts" | "last_error" | "created_at" | "synced_at">,
): Promise<EnqueueResult> {
  await db.outbox.put({
    ...item,
    status: "pending",
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
    synced_at: null,
  });
  await notify();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { ok: true };
  }

  await syncPending();
  const stored = await db.outbox.get(item.client_transaction_id);
  // "pending" here means the attempt hit a transient error (e.g. a dropped connection) and will
  // retry automatically — that's still a success from the cashier's point of view, matching the
  // offline-first promise that a queued sale is safe. Only "failed" (a permanent rejection from
  // the server, like insufficient stock) needs their attention right now.
  if (!stored || stored.status === "synced" || stored.status === "pending") {
    return { ok: true };
  }

  // A permanent rejection (e.g. insufficient stock) will never succeed on retry — surface it now
  // and drop it, rather than leaving it to retry forever and permanently show "waiting to sync."
  const error = stored.last_error ?? "We couldn't complete that. Please try again.";
  await db.outbox.delete(item.client_transaction_id);
  await notify();
  return { ok: false, error };
}

/** Drain the outbox against Supabase. Idempotent: replaying an already-applied operation is a
 * no-op server-side because every RPC dedupes on client_transaction_id. */
export async function syncPending() {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  syncing = true;
  await notify();

  const supabase = createClient();
  const items = await db.outbox.where("status").anyOf("pending", "failed").sortBy("created_at");

  let lastError: string | null = null;

  for (const item of items) {
    await db.outbox.update(item.client_transaction_id, { status: "syncing" });

    try {
      const { error } =
        item.operation.kind === "sale"
          ? await supabase.rpc("record_sale", item.operation.args as never)
          : await supabase.rpc("record_credit_payment", item.operation.args as never);

      if (error) throw error;

      await db.outbox.update(item.client_transaction_id, {
        status: "synced",
        synced_at: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      const code = (err as { code?: string } | null)?.code;
      // Our RPCs raise P0001 for expected business-rule rejections (insufficient stock, missing
      // customer, etc.) — those will never succeed on retry, so surface them as a real failure.
      // Anything else (network drops, timeouts) has no stable Postgres error code and should stay
      // "pending" to retry automatically rather than alarm the user for a transient blip.
      const permanent = code === "P0001" || code === "42501";
      lastError = message;
      await db.outbox.update(item.client_transaction_id, {
        status: permanent ? "failed" : "pending",
        attempts: item.attempts + 1,
        last_error: message,
      });
    }
  }

  await db.outbox.where("status").equals("synced").delete();

  syncing = false;
  await notify(lastError);
}

export function startAutoSync() {
  if (typeof window === "undefined") return () => {};

  const onOnline = () => void syncPending();
  window.addEventListener("online", onOnline);
  const interval = window.setInterval(() => void syncPending(), 30_000);
  void syncPending();

  return () => {
    window.removeEventListener("online", onOnline);
    window.clearInterval(interval);
  };
}
