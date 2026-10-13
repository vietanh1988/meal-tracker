-- Gói Premium 1 tháng (13/10/2026): giá price_1m + cho phép mã gói '1m' trong đơn hàng
alter table public.subscription_settings add column if not exists price_1m bigint;
alter table public.orders drop constraint if exists orders_package_check;
alter table public.orders add constraint orders_package_check check (package = any (array['1m'::text, '3m'::text, '6m'::text, '12m'::text]));
