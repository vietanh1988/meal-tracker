-- Bổ sung cho 20261019210000_web_ai_writer: prod không tự cấp quyền bảng mới cho service_role
-- (hàm web-writer đọc / ghi hàng chờ, cài đặt, Thư viện ảnh). Đã chạy trên prod 19/10 qua connector.
grant all on public.web_ai_jobs to service_role;
grant all on public.web_ai_config to service_role;
grant all on public.web_media to service_role;
