-- Allow anonymous visitors to read article cover images (public news content),
-- so the media proxy can serve them without the service role key.
CREATE POLICY "Public can read article images" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'article-images');
