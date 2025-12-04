-- Add cover_image_id column to galleries table
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS cover_image_id uuid REFERENCES public.images(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_galleries_cover_image ON public.galleries(cover_image_id);