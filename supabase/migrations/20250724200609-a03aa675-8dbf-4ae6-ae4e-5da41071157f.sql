-- Fix security function issues by adding proper search_path settings
-- Handle the trigger dependency properly

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS update_galleries_updated_at ON public.galleries;

-- Drop and recreate the update function with proper security settings
DROP FUNCTION IF EXISTS public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_galleries_updated_at
BEFORE UPDATE ON public.galleries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create an RPC function for secure gallery access verification
CREATE OR REPLACE FUNCTION public.verify_gallery_access(gallery_id UUID, provided_password TEXT)
RETURNS JSON AS $$
DECLARE
  gallery_record galleries%ROWTYPE;
  is_valid BOOLEAN;
BEGIN
  -- Get the gallery record
  SELECT * INTO gallery_record 
  FROM public.galleries 
  WHERE id = gallery_id;
  
  -- Check if gallery exists
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Gallery not found');
  END IF;
  
  -- Verify password
  SELECT public.verify_password(provided_password, gallery_record.password_hash) INTO is_valid;
  
  IF is_valid THEN
    -- Return gallery info without password hash
    RETURN json_build_object(
      'success', true,
      'gallery', json_build_object(
        'id', gallery_record.id,
        'name', gallery_record.name,
        'description', gallery_record.description,
        'client_name', gallery_record.client_name,
        'created_at', gallery_record.created_at,
        'updated_at', gallery_record.updated_at
      )
    );
  ELSE
    RETURN json_build_object('success', false, 'message', 'Invalid password');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;