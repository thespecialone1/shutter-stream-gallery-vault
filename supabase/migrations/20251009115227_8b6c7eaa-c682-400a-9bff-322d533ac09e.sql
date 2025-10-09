-- Fix handle_new_user function to properly extract Gmail user data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create profile with data from Gmail OAuth
  INSERT INTO public.profiles (user_id, full_name, email, avatar_url, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name'
    )
  );
  
  -- Assign photographer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'photographer');
  
  RETURN NEW;
END;
$$;