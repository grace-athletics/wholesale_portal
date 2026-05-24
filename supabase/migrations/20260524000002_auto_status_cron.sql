-- SQL function to auto-advance order statuses on schedule
-- Order Submitted → Processing after 7 days
-- Processing → In Production after 21 more days
-- In Production → Shipped after 42 more days (manual tracking expected)

create or replace function public.auto_advance_order_statuses()
returns void
language plpgsql
security definer
as $$
declare
  r record;
  new_status text;
begin
  for r in
    select id, order_number, status, status_updated_at
    from public.orders
    where status in ('Order Submitted', 'Processing', 'In Production')
      and status_updated_at is not null
  loop
    new_status := null;

    if r.status = 'Order Submitted'
       and r.status_updated_at < now() - interval '7 days' then
      new_status := 'Processing';
    elsif r.status = 'Processing'
       and r.status_updated_at < now() - interval '21 days' then
      new_status := 'In Production';
    elsif r.status = 'In Production'
       and r.status_updated_at < now() - interval '42 days' then
      new_status := 'Shipped';
    end if;

    if new_status is not null then
      update public.orders
        set status = new_status,
            status_updated_at = now()
        where id = r.id;

      insert into public.order_status_history (order_id, old_status, new_status, note)
        values (r.id, r.status, new_status, 'Auto-updated by system');
    end if;
  end loop;
end;
$$;

-- Schedule to run every day at 6:00 AM UTC
select cron.schedule(
  'auto-advance-order-statuses',
  '0 6 * * *',
  'select public.auto_advance_order_statuses()'
);
