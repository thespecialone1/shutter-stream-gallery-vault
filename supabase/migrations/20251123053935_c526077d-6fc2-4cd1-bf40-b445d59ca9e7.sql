-- Fix storage policy for avatar uploads to gallery-images bucket
-- The current policy only allows uploads to 'avatars' bucket, but we're using 'gallery-images' bucket

-- Add policy to allow authenticated users to upload avatars to gallery-images bucket
CREATE POLICY "Users can upload avatars to gallery-images bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'gallery-images' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] LIKE auth.uid()::text || '%'
);

-- Add policy to allow authenticated users to update their avatars in gallery-images bucket
CREATE POLICY "Users can update their avatars in gallery-images bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'gallery-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] LIKE auth.uid()::text || '%'
);

-- Add policy to allow authenticated users to delete their avatars in gallery-images bucket
CREATE POLICY "Users can delete their avatars in gallery-images bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'gallery-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] LIKE auth.uid()::text || '%'
);