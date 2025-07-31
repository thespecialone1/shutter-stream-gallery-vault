-- Allow null password_hash for public galleries
ALTER TABLE public.galleries 
ALTER COLUMN password_hash DROP NOT NULL;