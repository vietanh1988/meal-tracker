-- AI viết bài: thêm bước "review" (soát bài sau khi viết) vào trạng thái hàng chờ
alter table public.web_ai_jobs drop constraint if exists web_ai_jobs_status_check;
alter table public.web_ai_jobs add constraint web_ai_jobs_status_check
  check (status in ('queued','research','writing','fixing','review','images','saving','done','error','canceled'));
