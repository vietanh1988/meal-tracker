-- Form Liên hệ trên fipilotai.com (khách chưa đăng nhập) → user_feedback (category 'web_contact'), hiện ở Quản trị › Góp ý.
-- Khách không ghi thẳng bảng: chỉ gọi hàm này. Chống spam: giới hạn độ dài, trùng nội dung trong 1 ngày, tối đa 20 lời nhắn web / 10 phút.
create or replace function public.web_contact_submit(p_name text, p_contact text, p_content text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n text := left(btrim(coalesce(p_name, '')), 80);
  c text := left(btrim(coalesce(p_contact, '')), 120);
  m text := btrim(coalesce(p_content, ''));
begin
  if length(c) < 5 then return 'contact'; end if;
  if length(m) < 5 or length(m) > 2000 then return 'content'; end if;
  if (select count(*) from user_feedback where category = 'web_contact' and created_at > now() - interval '10 minutes') >= 20 then return 'busy'; end if;
  if exists (select 1 from user_feedback where category = 'web_contact' and content = m and created_at > now() - interval '1 day') then return 'ok'; end if;
  insert into user_feedback (user_id, username, category, content, status)
  values (null, case when n = '' then c else n || ' · ' || c end, 'web_contact', m, 'pending');
  return 'ok';
end;
$$;
revoke all on function public.web_contact_submit(text, text, text) from public;
grant execute on function public.web_contact_submit(text, text, text) to anon, authenticated, service_role;
