// Hand-written subset of the generated Supabase types, covering the tables/views/functions used
// by the app so far. Once a Supabase project is linked, replace this with the real output of:
//   supabase gen types typescript --linked > src/lib/supabase/types.ts
//
// NOTE: every table/view carries `Relationships: []` because postgrest-js's GenericTable /
// GenericView types require that field to exist (see @supabase/postgrest-js/src/types/common) —
// omitting it silently collapses every Row/Insert/Update to `never`. Foreign-table embeds
// (`.select("...,products(name)")`) are typed loosely here (`unknown`) since we don't model FK
// relationship metadata by hand; call sites narrow with `Array.isArray(...)` before use.

export type BusinessRole = "owner" | "manager" | "cashier" | "stock_manager";
export type BusinessType =
  | "general_retail"
  | "spaza_convenience"
  | "salon"
  | "barber"
  | "takeaway"
  | "butchery"
  | "boutique"
  | "hardware"
  | "car_wash"
  | "services"
  | "other";
export type InventoryMovementType =
  | "purchase"
  | "sale"
  | "return"
  | "adjustment"
  | "damage"
  | "expired"
  | "stock_take"
  | "transfer";
export type CreditTransactionType = "credit_sale" | "payment" | "refund" | "adjustment";
export type SaleStatus = "completed" | "voided" | "refunded" | "partially_refunded" | "cancelled";
export type PaymentMethod = "cash" | "card" | "eft" | "credit" | "other";

interface Table<Row, Insert, Update = Partial<Insert>> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

interface View<Row> {
  Row: Row;
  Relationships: [];
}

type BusinessRow = {
  id: string;
  name: string;
  business_type: BusinessType;
  currency: string;
  timezone: string;
  logo_url: string | null;
  receipt_footer: string | null;
  address: string | null;
  phone: string | null;
  prevent_expired_sale: boolean;
  low_stock_default_threshold: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type LocationRow = {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  is_primary: boolean;
  active: boolean;
  created_at: string;
};

type BusinessMemberRow = {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  active: boolean;
  invited_by: string | null;
  created_at: string;
};

type CategoryRow = { id: string; business_id: string; name: string; parent_id: string | null; created_at: string };

type SupplierRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

type ProductRow = {
  id: string;
  business_id: string;
  category_id: string | null;
  primary_supplier_id: string | null;
  name: string;
  description: string | null;
  barcode: string | null;
  sku: string | null;
  image_url: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  tracks_expiry: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type CustomerRow = {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  address: string | null;
  id_reference: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CreditAccountRow = {
  id: string;
  business_id: string;
  customer_id: string;
  credit_limit: number;
  status: string;
  created_at: string;
};

type CreditTransactionRow = {
  id: string;
  business_id: string;
  credit_account_id: string;
  type: CreditTransactionType;
  amount: number;
  sale_id: string | null;
  due_date: string | null;
  notes: string | null;
  created_by: string | null;
  client_transaction_id: string | null;
  created_at: string;
};

type SaleRow = {
  id: string;
  business_id: string;
  location_id: string;
  customer_id: string | null;
  cashier_id: string | null;
  sale_number: string;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total: number;
  status: SaleStatus;
  client_transaction_id: string;
  device_id: string | null;
  sold_at: string;
  synced_at: string | null;
  created_at: string;
};

type SaleItemRow = {
  id: string;
  business_id: string;
  sale_id: string;
  product_id: string;
  batch_id: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  discount: number;
  line_total: number;
  profit: number;
  returned_quantity: number;
};

type PaymentRow = {
  id: string;
  business_id: string;
  sale_id: string | null;
  credit_transaction_id: string | null;
  method: PaymentMethod;
  amount: number;
  reference: string | null;
  received_by: string | null;
  client_transaction_id: string | null;
  created_at: string;
};

type InventoryBatchRow = {
  id: string;
  business_id: string;
  product_id: string;
  location_id: string;
  supplier_id: string | null;
  purchase_id: string | null;
  batch_reference: string | null;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  received_date: string;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
};

type InventoryMovementRow = {
  id: string;
  business_id: string;
  product_id: string;
  location_id: string;
  batch_id: string | null;
  movement_type: InventoryMovementType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  client_transaction_id: string | null;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  business_id: string;
  location_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: PaymentMethod;
  created_by: string | null;
  client_transaction_id: string | null;
  created_at: string;
};

type PurchaseRow = {
  id: string;
  business_id: string;
  location_id: string;
  supplier_id: string | null;
  purchase_date: string;
  total_cost: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type PurchaseItemRow = {
  id: string;
  business_id: string;
  purchase_id: string;
  product_id: string;
  batch_id: string | null;
  quantity: number;
  unit_cost: number;
  line_total: number;
};

type SupplierProductRow = {
  id: string;
  business_id: string;
  supplier_id: string;
  product_id: string;
  last_cost_price: number | null;
  last_purchase_date: string | null;
  created_at: string;
};

type StockTakeRow = {
  id: string;
  business_id: string;
  location_id: string;
  status: string;
  started_by: string | null;
  started_at: string;
  completed_at: string | null;
};

type StockTakeItemRow = {
  id: string;
  business_id: string;
  stock_take_id: string;
  product_id: string;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  reason: string | null;
};

type AiInsightRow = {
  id: string;
  business_id: string;
  type: string;
  title: string;
  body: string;
  data_reference: unknown;
  dismissed_at: string | null;
  created_at: string;
};

export interface Database {
  public: {
    Tables: {
      businesses: Table<BusinessRow, Partial<BusinessRow> & { name: string }>;
      locations: Table<LocationRow, Partial<LocationRow> & { business_id: string; name: string }>;
      business_members: Table<
        BusinessMemberRow,
        Partial<BusinessMemberRow> & { business_id: string; user_id: string }
      >;
      categories: Table<CategoryRow, Partial<CategoryRow> & { business_id: string; name: string }>;
      suppliers: Table<SupplierRow, Partial<SupplierRow> & { business_id: string; name: string }>;
      products: Table<ProductRow, Partial<ProductRow> & { business_id: string; name: string }>;
      customers: Table<CustomerRow, Partial<CustomerRow> & { business_id: string; name: string }>;
      credit_accounts: Table<
        CreditAccountRow,
        Partial<CreditAccountRow> & { business_id: string; customer_id: string }
      >;
      credit_transactions: Table<
        CreditTransactionRow,
        Partial<CreditTransactionRow> & {
          business_id: string;
          credit_account_id: string;
          type: CreditTransactionType;
          amount: number;
        }
      >;
      sales: Table<SaleRow, Partial<SaleRow> & { business_id: string; location_id: string; client_transaction_id: string }>;
      sale_items: Table<
        SaleItemRow,
        Partial<SaleItemRow> & {
          business_id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
          unit_price: number;
        }
      >;
      payments: Table<
        PaymentRow,
        Partial<PaymentRow> & { business_id: string; method: PaymentMethod; amount: number }
      >;
      inventory_batches: Table<
        InventoryBatchRow,
        Partial<InventoryBatchRow> & {
          business_id: string;
          product_id: string;
          location_id: string;
          quantity_received: number;
          quantity_remaining: number;
          unit_cost: number;
        }
      >;
      inventory_movements: Table<
        InventoryMovementRow,
        Partial<InventoryMovementRow> & {
          business_id: string;
          product_id: string;
          location_id: string;
          movement_type: InventoryMovementType;
          quantity: number;
        }
      >;
      purchases: Table<
        PurchaseRow,
        Partial<PurchaseRow> & { business_id: string; location_id: string }
      >;
      purchase_items: Table<
        PurchaseItemRow,
        Partial<PurchaseItemRow> & {
          business_id: string;
          purchase_id: string;
          product_id: string;
          quantity: number;
          unit_cost: number;
        }
      >;
      supplier_products: Table<
        SupplierProductRow,
        Partial<SupplierProductRow> & { business_id: string; supplier_id: string; product_id: string }
      >;
      stock_takes: Table<
        StockTakeRow,
        Partial<StockTakeRow> & { business_id: string; location_id: string }
      >;
      stock_take_items: Table<
        StockTakeItemRow,
        Partial<StockTakeItemRow> & {
          business_id: string;
          stock_take_id: string;
          product_id: string;
          system_quantity: number;
          counted_quantity: number;
        }
      >;
      expenses: Table<ExpenseRow, Partial<ExpenseRow> & { business_id: string; category: string; amount: number }>;
      ai_insights: Table<AiInsightRow, Partial<AiInsightRow> & { business_id: string; title: string; body: string }>;
    };
    Views: {
      product_stock: View<{ business_id: string; product_id: string; location_id: string; quantity_on_hand: number }>;
      credit_account_balances: View<{
        credit_account_id: string;
        business_id: string;
        customer_id: string;
        balance: number;
      }>;
    };
    Functions: {
      create_business_with_owner: {
        Args: {
          p_name: string;
          p_business_type: BusinessType;
          p_currency?: string;
          p_location_name?: string;
        };
        Returns: BusinessRow;
      };
      record_sale: {
        Args: {
          p_business_id: string;
          p_location_id: string;
          p_client_transaction_id: string;
          p_items: unknown;
          p_payments: unknown;
          p_customer_id?: string | null;
          p_credit_due_date?: string | null;
          p_allow_expired?: boolean;
          p_device_id?: string | null;
        };
        Returns: SaleRow;
      };
      record_stock_take: {
        Args: {
          p_business_id: string;
          p_location_id: string;
          p_items: unknown;
        };
        Returns: StockTakeRow;
      };
      record_purchase: {
        Args: {
          p_business_id: string;
          p_location_id: string;
          p_items: unknown;
          p_supplier_id?: string | null;
          p_purchase_date?: string;
          p_notes?: string | null;
        };
        Returns: PurchaseRow;
      };
      record_credit_payment: {
        Args: {
          p_business_id: string;
          p_customer_id: string;
          p_amount: number;
          p_method: PaymentMethod;
          p_client_transaction_id: string;
          p_reference?: string | null;
        };
        Returns: CreditTransactionRow;
      };
    };
  };
}
