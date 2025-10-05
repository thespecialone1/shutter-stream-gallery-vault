-- Add unique constraint to prevent duplicate favorites
ALTER TABLE favorites 
ADD CONSTRAINT favorites_user_gallery_image_unique 
UNIQUE (user_id, gallery_id, image_id);

-- Clean up any existing duplicates (keep the oldest record)
DELETE FROM favorites a 
USING favorites b
WHERE a.id > b.id 
AND a.user_id = b.user_id 
AND a.gallery_id = b.gallery_id 
AND a.image_id = b.image_id;

-- Delete orphaned favorites where image doesn't exist
DELETE FROM favorites 
WHERE image_id NOT IN (SELECT id FROM images);

-- Ensure proper foreign key with cascade delete exists
ALTER TABLE favorites
DROP CONSTRAINT IF EXISTS favorites_image_id_fkey;

ALTER TABLE favorites 
ADD CONSTRAINT favorites_image_id_fkey 
FOREIGN KEY (image_id) 
REFERENCES images(id) 
ON DELETE CASCADE;