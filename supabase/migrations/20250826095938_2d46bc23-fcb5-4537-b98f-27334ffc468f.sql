-- Add user_id column to favorites table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'favorites' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.favorites ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update RLS policies for favorites table
DROP POLICY IF EXISTS "Authenticated gallery owners can manage favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;

-- Create new RLS policies for favorites
CREATE POLICY "Users can view their own favorites"
ON public.favorites
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own favorites"
ON public.favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favorites
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Gallery owners can view favorites on their galleries"
ON public.favorites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.id = favorites.gallery_id AND g.photographer_id = auth.uid()
  )
);