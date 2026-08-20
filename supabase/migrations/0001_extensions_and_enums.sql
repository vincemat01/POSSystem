-- Kompass POS — extensions and shared enum types
create extension if not exists pgcrypto;

create type business_role as enum ('owner', 'manager', 'cashier', 'stock_manager');

create type business_type as enum (
  'general_retail', 'spaza_convenience', 'salon', 'barber', 'takeaway',
  'butchery', 'boutique', 'hardware', 'car_wash', 'services', 'other'
);

create type inventory_movement_type as enum (
  'purchase', 'sale', 'return', 'adjustment', 'damage', 'expired', 'stock_take', 'transfer'
);

create type credit_transaction_type as enum ('credit_sale', 'payment', 'refund', 'adjustment');

create type sale_status as enum ('completed', 'voided', 'refunded', 'partially_refunded', 'cancelled');

create type payment_method as enum ('cash', 'card', 'eft', 'credit', 'other');

create type sync_entity_type as enum (
  'sale', 'credit_transaction', 'inventory_movement', 'stock_take', 'payment', 'customer', 'expense'
);
