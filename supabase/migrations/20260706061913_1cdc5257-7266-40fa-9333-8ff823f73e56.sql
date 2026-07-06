
CREATE POLICY "authenticated read post-images" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'post-images');
CREATE POLICY "authenticated upload post-images own folder" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "authenticated delete own post-images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND (storage.foldername(name))[1] = auth.uid()::text);
