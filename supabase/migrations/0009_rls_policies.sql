-- Kompass POS — Row Level Security. Tenant isolation is enforced here, not in the frontend
-- (spec §7, §62): every policy gates on membership of businesses.id via business_id.
alter table businesses enable row level security;
alter table locations enable row level security;
alter table business_members enable row level security;
alter table categories enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table product_price_history enable row level security;
alter table supplier_products enable row level security;
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table inventory_batches enable row level security;
alter table inventory_movements enable row level security;
alter table customers enable row level security;
alter table credit_accounts enable row level security;
alter table credit_transactions enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;
alter table refunds enable row level security;
alter table receipts enable row level security;
alter table expenses enable row level security;
alter table stock_takes enable row level security;
alter table stock_take_items enable row level security;
alter table notifications enable row level security;
alter table ai_insights enable row level security;
alter table audit_logs enable row level security;
alter table sync_queue enable row level security;

-- businesses: members can read; only owners can update; creation happens via the
-- create_business_with_owner() RPC (security definer) to avoid the chicken-and-egg problem of
-- inserting the first business_members row before any membership exists.
create policy businesses_select on businesses for select using (is_business_member(id));
create policy businesses_update on businesses for update using (has_business_role(id, array['owner']::business_role[]));

create policy locations_select on locations for select using (is_business_member(business_id));
create policy locations_write on locations for insert with check (has_business_role(business_id, array['owner', 'manager']::business_role[]));
create policy locations_update on locations for update using (has_business_role(business_id, array['owner', 'manager']::business_role[]));

create policy business_members_select on business_members for select using (is_business_member(business_id));
create policy business_members_write on business_members for insert with check (has_business_role(business_id, array['owner', 'manager']::business_role[]));
create policy business_members_update on business_members for update using (has_business_role(business_id, array['owner', 'manager']::business_role[]));
create policy business_members_delete on business_members for delete using (has_business_role(business_id, array['owner']::business_role[]));

create policy categories_select on categories for select using (is_business_member(business_id));
create policy categories_write on categories for insert with check (is_business_member(business_id));
create policy categories_update on categories for update using (has_business_role(business_id, array['owner', 'manager']::business_role[]));
create policy categories_delete on categories for delete using (has_business_role(business_id, array['owner', 'manager']::business_role[]));

create policy suppliers_select on suppliers for select using (is_business_member(business_id));
create policy suppliers_write on suppliers for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));
create policy suppliers_update on suppliers for update using (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy products_select on products for select using (is_business_member(business_id));
create policy products_write on products for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));
create policy products_update on products for update using (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy product_price_history_select on product_price_history for select using (is_business_member(business_id));

create policy supplier_products_select on supplier_products for select using (is_business_member(business_id));
create policy supplier_products_write on supplier_products for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));
create policy supplier_products_update on supplier_products for update using (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy purchases_select on purchases for select using (is_business_member(business_id));
create policy purchases_write on purchases for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy purchase_items_select on purchase_items for select using (is_business_member(business_id));
create policy purchase_items_write on purchase_items for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy inventory_batches_select on inventory_batches for select using (is_business_member(business_id));
create policy inventory_batches_write on inventory_batches for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));
create policy inventory_batches_update on inventory_batches for update using (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy inventory_movements_select on inventory_movements for select using (is_business_member(business_id));
create policy inventory_movements_write on inventory_movements for insert with check (is_business_member(business_id));

create policy customers_select on customers for select using (is_business_member(business_id));
create policy customers_write on customers for insert with check (is_business_member(business_id));
create policy customers_update on customers for update using (is_business_member(business_id));

create policy credit_accounts_select on credit_accounts for select using (is_business_member(business_id));
create policy credit_accounts_write on credit_accounts for insert with check (is_business_member(business_id));
create policy credit_accounts_update on credit_accounts for update using (has_business_role(business_id, array['owner', 'manager']::business_role[]));

create policy credit_transactions_select on credit_transactions for select using (is_business_member(business_id));
create policy credit_transactions_write on credit_transactions for insert with check (is_business_member(business_id));

create policy sales_select on sales for select using (is_business_member(business_id));
create policy sales_write on sales for insert with check (is_business_member(business_id));
create policy sales_update on sales for update using (has_business_role(business_id, array['owner', 'manager']::business_role[]));

create policy sale_items_select on sale_items for select using (is_business_member(business_id));
create policy sale_items_write on sale_items for insert with check (is_business_member(business_id));

create policy payments_select on payments for select using (is_business_member(business_id));
create policy payments_write on payments for insert with check (is_business_member(business_id));

create policy refunds_select on refunds for select using (is_business_member(business_id));
create policy refunds_write on refunds for insert with check (has_business_role(business_id, array['owner', 'manager']::business_role[]));

create policy receipts_select on receipts for select using (is_business_member(business_id));
create policy receipts_write on receipts for insert with check (is_business_member(business_id));

create policy expenses_select on expenses for select using (is_business_member(business_id));
create policy expenses_write on expenses for insert with check (is_business_member(business_id));

create policy stock_takes_select on stock_takes for select using (is_business_member(business_id));
create policy stock_takes_write on stock_takes for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));
create policy stock_takes_update on stock_takes for update using (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy stock_take_items_select on stock_take_items for select using (is_business_member(business_id));
create policy stock_take_items_write on stock_take_items for insert with check (has_business_role(business_id, array['owner', 'manager', 'stock_manager']::business_role[]));

create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());

create policy ai_insights_select on ai_insights for select using (is_business_member(business_id));
create policy ai_insights_update on ai_insights for update using (is_business_member(business_id));

create policy audit_logs_select on audit_logs for select using (has_business_role(business_id, array['owner', 'manager']::business_role[]));

create policy sync_queue_select on sync_queue for select using (is_business_member(business_id));
create policy sync_queue_write on sync_queue for insert with check (is_business_member(business_id));
