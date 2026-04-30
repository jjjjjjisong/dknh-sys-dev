-- Schedule the MCEE press release crawler.
--
-- Supabase Cron uses UTC. This runs every day at 18:00 UTC, which is 03:00
-- the next day in Asia/Seoul. The Edge Function computes the Korean day of
-- week and processes the keywords assigned to that day in mcee_crawl_keywords.
--
-- Replace the placeholders before running:
-- - <PROJECT_URL>: https://your-project-ref.supabase.co
-- - <MCEE_CRAWL_SECRET>: same value as the Edge Function secret

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'mcee-press-releases-daily-0300-kst',
  '0 18 * * *',
  $$
  select net.http_post(
    url := 'https://unsjsnckzudigffpdcgf.supabase.co/functions/v1/crawl-mcee-press-releases',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-crawl-secret', '<chemical!2>'
    ),
    body := jsonb_build_object('mode', 'scheduled')
  );
  $$
);
