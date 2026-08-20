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

/** Queue an offline-safe operation. Call this instead of hitting Supabase directly from the POS
 * so sales keep working with no network (spec §45-46). */
export async function enqueue(item: Omit<OutboxItem, "status" | "attempts" | "last_error" | "created_at" | "synced_at">) {
  await db.outbox.put({
    ...item,
    status: "pending",
    attempts: 0,
    last_error: null,
    created_at: new Date().toISOString(),
    synced_at: null,
  });
  await notify();
  if (typeof navigator !== "undefined" && navigator.onLine) {
    void syncPending();
  }
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
      lastError = message;
      await db.outbox.update(item.client_transaction_id, {
        status: "failed",
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
