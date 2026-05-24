-- The original storage policy only allowed admins to upload to order-images.
-- Clients need to upload their own glove screenshots.

create policy "Users can upload order images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'order-images');

create policy "Users can update order images"
on storage.objects for update
to authenticated
using (bucket_id = 'order-images');
