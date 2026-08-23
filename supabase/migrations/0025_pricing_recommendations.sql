-- Kompass POS — Selling price recommendations (spec §23)
-- Lets the owner configure a desired markup or margin % and a rounding rule, so the product
-- forms can suggest a selling price from cost price. Plain arithmetic only — never a market-price
-- claim (spec §23 explicitly forbids that without a reliable market-price source).
alter table businesses
  add column if not exists pricing_method text not null default 'markup'
    check (pricing_method in ('markup', 'margin')),
  add column if not exists pricing_target_percent numeric(6, 2) not null default 30,
  add column if not exists pricing_rounding text not null default 'none'
    check (pricing_rounding in ('none', 'nearest_1', 'nearest_0_50', 'charm_99'));
