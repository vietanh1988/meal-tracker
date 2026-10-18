-- 18/10 · Rà bảo mật (audit). Không đổi dữ liệu khách, chỉ siết quyền.

-- 1) ĐƠN HÀNG: khách chỉ được tạo đơn "chờ duyệt", số tiền lấy theo bảng giá (trước: tự gửi status 'confirmed', amount tuỳ ý
--    → làm sai báo cáo doanh thu / đánh lừa người duyệt)
DROP POLICY IF EXISTS "User create own orders" ON public.orders;
CREATE POLICY "User create own orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) AND status = 'pending' AND confirmed_by IS NULL AND confirmed_at IS NULL);

CREATE OR REPLACE FUNCTION public.orders_force_price()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  IF public.is_admin_user() OR coalesce(auth.role(), '') = 'service_role' THEN RETURN NEW; END IF;
  SELECT price_1m, price_3m, price_6m, price_12m INTO s FROM subscription_settings WHERE id = 1;
  NEW.amount := CASE NEW.package WHEN '1m' THEN s.price_1m WHEN '3m' THEN s.price_3m WHEN '6m' THEN s.price_6m WHEN '12m' THEN s.price_12m ELSE NEW.amount END;
  NEW.status := 'pending'; NEW.confirmed_by := NULL; NEW.confirmed_at := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_force_price ON public.orders;
CREATE TRIGGER orders_force_price BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.orders_force_price();
REVOKE ALL ON FUNCTION public.orders_force_price() FROM public, anon, authenticated;

-- 2) MÓN AI CHỜ DUYỆT: khách chỉ thấy món của mình (trước: ai đăng nhập cũng đọc được món người khác đã ăn + mã người ghi)
DROP POLICY IF EXISTS pending_select ON public.food_cache_pending;
CREATE POLICY pending_select ON public.food_cache_pending FOR SELECT TO authenticated
  USING (created_by = (select auth.uid()) OR (select public.is_admin_user()));

-- 3) HÀM QUẢN TRỊ / HÀM NỀN: không cho khách chưa đăng nhập gọi (các hàm admin đã tự kiểm quyền bên trong — thêm 1 lớp chặn)
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
      AND (p.proname LIKE 'admin\_%' OR p.proname IN ('auto_downgrade_expired_tiers','expire_subscriptions','handle_new_user','notify_admin_new_user','protect_profile_columns','update_updated_at'))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM public, anon', f.sig);
    -- hàm chạy nền / trigger: khách đăng nhập cũng không cần gọi trực tiếp
    IF f.proname IN ('auto_downgrade_expired_tiers','expire_subscriptions','handle_new_user','notify_admin_new_user','protect_profile_columns','update_updated_at') THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', f.sig);
    ELSE
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
  END LOOP;
END $$;

-- 4) Ghim search_path cho mọi hàm SECURITY DEFINER (chống mượn bảng/hàm giả qua schema khác)
DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
           WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
             AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
  END LOOP;
END $$;
