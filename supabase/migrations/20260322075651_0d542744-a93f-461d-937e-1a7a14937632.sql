
-- Allow authenticated users to upload to their own folder in client-logos
CREATE POLICY "Users can upload own logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/overwrite their own logos
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own logos
CREATE POLICY "Users can read own logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can read all logos (for PDF generation / order review)
CREATE POLICY "Admins can read all logos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-logos'
  AND public.has_role(auth.uid(), 'admin')
);
