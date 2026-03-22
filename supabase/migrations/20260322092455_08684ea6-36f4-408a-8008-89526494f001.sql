UPDATE storage.buckets SET public = true WHERE id = 'order-images';

-- Allow authenticated users to upload to order-images bucket
CREATE POLICY "Admins can upload order images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-images' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow public read access
CREATE POLICY "Public read order images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-images');

-- Allow admins to update/delete
CREATE POLICY "Admins can manage order images storage"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-images' AND
  public.has_role(auth.uid(), 'admin')
);