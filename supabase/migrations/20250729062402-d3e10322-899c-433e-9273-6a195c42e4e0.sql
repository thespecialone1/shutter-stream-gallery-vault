-- Fix search path security warnings
SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.log_audit_action(
  _action text,
  _table_name text,
  _record_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, user_id, metadata)
  VALUES (_action, _table_name, _record_id, auth.uid(), _metadata);
END;
$$;