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
  // Only "pending"/"syncing" count as work still in flight. "failed" is a terminal, permanent
  // rejection (see syncPending) and is deleted immediately after its error is reported, so it
  // never lingers here — otherwise the badge would show "N waiting to sync" forever for a sale
  // that will never succeed no matter how many times it's retried.
  const pending = await db.outbox.where("status").anyOf("pending", "syncing").count();
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

  const { permanentFailures } = await syncPending();
  const failure = permanentFailures.get(item.client_transaction_id);
  return failure ? { ok: false, error: failure } : { ok: true };
}

/** Drain the outbox against Supabase. Idempotent: replaying an already-applied operation is a
 * no-op server-side because every RPC dedupes on client_transaction_id.
 *
 * Only ever retries "pending" items. A permanent rejection (Postgres errcode P0001/42501 — a
 * business-rule error like insufficient stock, which will never succeed no matter how many times
 * it's retried) is deleted right away rather than left to retry forever; its error is returned in
 * permanentFailures so a caller waiting on this specific item (see enqueue) can report it. */
export async function syncPending(): Promise<{ permanentFailures: Map<string, string> }> {
  const permanentFailures = new Map<string, string>();

  if (syncing) return { permanentFailures };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { permanentFailures };

  syncing = true;
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
      const message = err instanceof Error ? err.message : "Sync failed";
      const code = (err as { code?: string } | null)?.code;
      // Our RPCs raise P0001 for expected business-rule rejections (insufficient stock, missing
      // customer, etc.) — those will never succeed on retry. Anything else (network drops,
      // timeouts) has no stable Postgres error code and should stay "pending" to retry
      // automatically rather than be discarded for a transient blip.
      const permanent = code === "P0001" || code === "42501";
      lastError = message;

      if (permanent) {
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

  syncing = false;
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
