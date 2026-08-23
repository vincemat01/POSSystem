-- Kompass POS — Audit log write access
-- audit_logs (table + select policy for owner/manager) already exists from 0008/0009, but no
-- INSERT policy was ever added — meaning nothing has been able to write to it. This adds that
-- policy, pinning user_id to the authenticated caller so no one can attribute an action to
-- someone else (spec §62/§63).
create policy audit_logs_write on audit_logs
  for insert with check (is_business_member(business_id) and user_id = auth.uid());
