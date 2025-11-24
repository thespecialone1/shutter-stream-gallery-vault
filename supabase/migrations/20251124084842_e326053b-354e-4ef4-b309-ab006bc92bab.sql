-- Enable real-time updates for profiles table
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Add profiles to realtime publication if not already there
DO $$
BEGIN
  -- Check if profiles table is in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;