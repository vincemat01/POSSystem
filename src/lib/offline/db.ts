import Dexie, { type EntityTable } from "dexie";

// Local cache of the product catalog, kept fresh by the sync engine so the POS can search and
// sell without a network round-trip (spec §45, §70: checkout must work locally first).
export interface OfflineProduct {
  id: string;
  business_id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  image_url: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  category_id: string | null;
  tracks_expiry: boolean;
  tax_exempt: boolean;
  active: boolean;
  stock_on_hand: number;
}

export interface OfflineCustomer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  credit_limit: number;
  credit_balance: number;
  loyalty_points: number;
}

export type CartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  tax_exempt: boolean;
};

export interface OpenCart {
  id: "current";
  business_id: string;
  location_id: string;
  customer_id: string | null;
  items: CartItem[];
  updated_at: string;
}

// One row per offline-created transaction awaiting sync. `client_transaction_id` is the
// idempotency key the server functions dedupe on (spec §47).
export type OutboxOperation =
  | { kind: "sale"; args: Record<string, unknown> }
  | { kind: "credit_payment"; args: Record<string, unknown> };

export interface OutboxItem {
  client_transaction_id: string;
  business_id: string;
  operation: OutboxOperation;
  status: "pending" | "syncing" | "synced" | "failed";
  attempts: number;
  last_error: string | null;
  created_at: string;
  synced_at: string | null;
}

export interface OfflineCategory {
  id: string;
  business_id: string;
  name: string;
}

export interface KeyValue {
  key: string;
  value: string;
}

class KompassDB extends Dexie {
  products!: EntityTable<OfflineProduct, "id">;
  customers!: EntityTable<OfflineCustomer, "id">;
  categories!: EntityTable<OfflineCategory, "id">;
  cart!: EntityTable<OpenCart, "id">;
  outbox!: EntityTable<OutboxItem, "client_transaction_id">;
  meta!: EntityTable<KeyValue, "key">;

  constructor() {
    super("kompass-pos");
    this.version(1).stores({
      products: "id, business_id, barcode, sku, category_id, active",
      customers: "id, business_id, name, phone",
      cart: "id",
      outbox: "client_transaction_id, business_id, status, created_at",
      meta: "key",
    });
    this.version(2).stores({
      products: "id, business_id, barcode, sku, category_id, active",
      customers: "id, business_id, name, phone",
      categories: "id, business_id",
      cart: "id",
      outbox: "client_transaction_id, business_id, status, created_at",
      meta: "key",
    });
  }
}

export const db = new KompassDB();

export function newClientTransactionId() {
  return crypto.randomUUID();
}

export async function getDeviceId() {
  const existing = await db.meta.get("device_id");
  if (existing) return existing.value;
  const id = crypto.randomUUID();
  await db.meta.put({ key: "device_id", value: id });
  return id;
}
