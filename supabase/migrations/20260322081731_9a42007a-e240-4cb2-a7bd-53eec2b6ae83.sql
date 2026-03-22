-- RLS policies for order-pdfs bucket
CREATE POLICY "Admins can upload order PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update order PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'order-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can read order PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-pdfs'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can read own order PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'order-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);