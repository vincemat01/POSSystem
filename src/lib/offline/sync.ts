import { createClient } from "@/lib/supabase/client";
import { db, type OutboxItem } from "./db";

export type SyncListener = (state: SyncState) => void;

export interface SyncState {
  pending: number;
  syncing: boolean;
  lastError: string | null;
}

let listeners: SyncListener[] = [];
let syncingFlag = false;
// FIFO queue instead of a boolean re-entrancy guard: a caller of syncPending() must be able to
// trust that ITS OWN item (just put into the outbox) gets processed. A boolean guard that simply
// bails out when a sync is already in flight can skip an item enqueued after the in-flight run
// already took its outbox snapshot — the item then sits unsynced for up to 30s (the auto-sync
// interval) even though the caller was told "ok". Chaining onto a shared tail promise guarantees
// every call gets its own fresh runSync() pass that starts after its enqueue() completed.
let syncTail: Promise<unknown> = Promise.resolve();

export function onSyncStateChange(listener: SyncListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

async function notify(lastError: string | null = null) {
  // Only "pending"/"syncing" count as work still in flight. "failed" is a terminal, permanent
  // rejection (see syncPending) and is deleted immediately after its error is reported, so it
  // never lingers here — otherwise the badge would show "N waiting to sync" forever for a sale
  // that will never succeed no matter how many times it's retried.
  const pending = await db.outbox.where("status").anyOf("pending", "syncing").count();
  for (const listener of listeners) listener({ pending, syncing: syncingFlag, lastError });
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

  const { permanentFailures } = await syncPending();
  const failure = permanentFailures.get(item.client_transaction_id);
  if (failure) return { ok: false, error: failure };

  // The item should have been deleted from the outbox on success. If it's still there, sync hit
  // a transient error — report it so the caller doesn't navigate to a receipt page for a sale
  // that hasn't reached the server yet.
  const remaining = await db.outbox.get(item.client_transaction_id);
  if (remaining) {
    return { ok: false, error: remaining.last_error ?? "Could not reach the server — sale saved and will sync automatically" };
  }

  return { ok: true };
}

/** Drain the outbox against Supabase. Idempotent: replaying an already-applied operation is a
 * no-op server-side because every RPC dedupes on client_transaction_id.
 *
 * Only ever retries "pending" items. A permanent rejection (Postgres errcode P0001/42501 — a
 * business-rule error like insufficient stock, which will never succeed no matter how many times
 * it's retried) is deleted right away rather than left to retry forever; its error is returned in
 * permanentFailures so a caller waiting on this specific item (see enqueue) can report it.
 *
 * Queued on syncTail (see comment above) rather than run directly: this guarantees the caller's
 * own pass over the outbox starts only after every previously-queued call has finished, so an
 * item just written by this same caller's enqueue() is never skipped by a run that already took
 * its outbox snapshot before that write happened. */
export function syncPending(): Promise<{ permanentFailures: Map<string, string> }> {
  const result = syncTail.then(runSyncOnce);
  // Keep the tail alive even if this run rejects, so a later caller doesn't chain onto a
  // permanently-rejected promise and get stuck forever.
  syncTail = result.catch(() => undefined);
  return result;
}

async function runSyncOnce(): Promise<{ permanentFailures: Map<string, string> }> {
  const permanentFailures = new Map<string, string>();

  if (typeof navigator !== "undefined" && !navigator.onLine) return { permanentFailures };

  syncingFlag = true;
  await notify();

  const supabase = createClient();
  const items = await db.outbox.where("status").equals("pending").sortBy("created_at");

  let lastError: string | null = null;

  for (const item of items) {
    await db.outbox.update(item.client_transaction_id, { status: "syncing" });

    try {
      const { error } =
        item.operation.kind === "sale"
          ? await supabase.rpc("record_sale", item.operation.args as never)
          : await supabase.rpc("record_credit_payment", item.operation.args as never);

      if (error) throw error;

      await db.outbox.delete(item.client_transaction_id);
    } catch (err) {
      // Supabase PostgREST errors are plain objects with a `message` property but are NOT
      // instances of Error — the old `instanceof Error` check fell through to the generic
      // "Sync failed" string and hid the real problem (e.g. "column … does not exist").
      const errObj = err as Record<string, unknown> | null;
      const message =
        typeof errObj?.message === "string" ? errObj.message : err instanceof Error ? err.message : "Sync failed";
      const code = typeof errObj?.code === "string" ? errObj.code : undefined;

      const permanent = code === "P0001" || code === "42501";
      const exhausted = item.attempts + 1 >= 20;
      lastError = message;

      if (permanent || exhausted) {
        permanentFailures.set(item.client_transaction_id, message);
        await db.outbox.delete(item.client_transaction_id);
      } else {
        await db.outbox.update(item.client_transaction_id, {
          status: "pending",
          attempts: item.attempts + 1,
          last_error: message,
        });
      }
    }
  }

  syncingFlag = false;
  await notify(lastError);
  return { permanentFailures };
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
