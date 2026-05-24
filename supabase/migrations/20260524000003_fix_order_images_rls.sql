-- Users were missing INSERT/DELETE policies on order_images.
-- Uploads were being blocked by RLS silently (the catch block only console.error'd).

create policy "Users can insert own order images" on public.order_images
  for insert with check (
    exists (
      select 1 from public.orders
      where orders.id = order_images.order_id
        and orders.user_id = auth.uid()
    )
  );

create policy "Users can delete own order images" on public.order_images
  for delete using (
    exists (
      select 1 from public.orders
      where orders.id = order_images.order_id
        and orders.user_id = auth.uid()
    )
  );
