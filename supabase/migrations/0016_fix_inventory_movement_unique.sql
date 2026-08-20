-- The unique index on (business_id, client_transaction_id) only allows one inventory_movement
-- per transaction, but record_sale inserts one movement PER LINE ITEM (and possibly per batch
-- for FEFO products). Multi-item sales violate the constraint.
--
-- Idempotency is already enforced at the sales level:
--   1. sales_client_txn_unique prevents duplicate sale rows
--   2. record_sale's early-return check (`if found then return v_sale`) skips re-processing
-- So this index is both redundant and harmful — drop it.
drop index if exists inventory_movements_client_txn_unique;
