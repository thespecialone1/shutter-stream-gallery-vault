-- Phase 1 & 2: Authentication and User Roles System

-- Create user role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'photographer');

-- Create profiles table for photographer information
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text NOT NULL,
  business_name text,
  email text NOT NULL,
  phone text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'photographer',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Add photographer_id to galleries table
ALTER TABLE public.galleries 
ADD COLUMN photographer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Phase 5: Logging & Analytics System
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  user_id uuid REFERENCES auth.users(id),
  client_ip inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create gallery analytics table
CREATE TABLE public.gallery_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid REFERENCES public.galleries(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- 'view', 'download', 'favorite', 'access'
  image_id uuid REFERENCES public.images(id) ON DELETE SET NULL,
  client_ip inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create image variants table for different quality levels
CREATE TABLE public.image_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid REFERENCES public.images(id) ON DELETE CASCADE NOT NULL,
  variant_type text NOT NULL, -- 'original', 'web', 'thumbnail', 'print'
  file_path text NOT NULL,
  file_size integer NOT NULL,
  width integer,
  height integer,
  quality_setting integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(image_id, variant_type)
);

-- Enable RLS on all new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_variants ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

-- Function to create profile and assign photographer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign photographer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'photographer');
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create profile and role on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated RLS Policies

-- Profiles: Users can manage their own profile, admins can see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: Users can view own roles, admins can manage all
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Updated galleries policies: Photographers can manage their own, public can view with password
DROP POLICY IF EXISTS "Authenticated users can manage galleries" ON public.galleries;
DROP POLICY IF EXISTS "Public can view gallery metadata" ON public.galleries;

CREATE POLICY "Photographers can manage own galleries" ON public.galleries
  FOR ALL USING (auth.uid() = photographer_id);

CREATE POLICY "Admins can manage all galleries" ON public.galleries
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view gallery metadata" ON public.galleries
  FOR SELECT USING (true);

-- Images: Photographers can manage images in their galleries, public can view
DROP POLICY IF EXISTS "Authenticated users can manage images" ON public.images;

CREATE POLICY "Photographers can manage own gallery images" ON public.images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE id = gallery_id AND photographer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all images" ON public.images
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Sections: Same as images
DROP POLICY IF EXISTS "Authenticated users can manage sections" ON public.sections;

CREATE POLICY "Photographers can manage own gallery sections" ON public.sections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE id = gallery_id AND photographer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all sections" ON public.sections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs: Only admins and users can view their own logs
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Gallery analytics: Photographers can view their gallery analytics
CREATE POLICY "Photographers can view own gallery analytics" ON public.gallery_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.galleries 
      WHERE id = gallery_id AND photographer_id = auth.uid()
    )
  );

CREATE POLICY "System can insert analytics" ON public.gallery_analytics
  FOR INSERT WITH CHECK (true);

-- Image variants: Follow same pattern as images
CREATE POLICY "Photographers can manage own image variants" ON public.image_variants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.images i
      JOIN public.galleries g ON i.gallery_id = g.id
      WHERE i.id = image_id AND g.photographer_id = auth.uid()
    )
  );

CREATE POLICY "Public can view image variants" ON public.image_variants
  FOR SELECT USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Logging function for audit trail
CREATE OR REPLACE FUNCTION public.log_audit_action(
  _action text,
  _table_name text,
  _record_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, user_id, metadata)
  VALUES (_action, _table_name, _record_id, auth.uid(), _metadata);
END;
$$;