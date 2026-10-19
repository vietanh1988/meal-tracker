-- Lịch sử bài: thêm lý do 'import' (nhập từ WordPress/JSON) và 'ai' (bài do AI viết)
alter table public.web_revisions drop constraint if exists web_revisions_reason_check;
alter table public.web_revisions add constraint web_revisions_reason_check
  check (reason in ('autosave','draft','update','publish','restore','replace','import','ai'));
