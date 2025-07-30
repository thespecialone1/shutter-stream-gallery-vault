-- Enable leaked password protection and improve security
-- This will be handled via Supabase dashboard settings for Auth

-- Create audit table for better security logging
CREATE TABLE IF NOT EXISTS public.security_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  gallery_id UUID REFERENCES public.galleries(id),
  user_id UUID,
  client_ip INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_audit ENABLE ROW LEVEL SECURITY;

-- Admin-only access to security audit
CREATE POLICY "Admins can view security audit" 
ON public.security_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security audit" 
ON public.security_audit 
FOR INSERT 
WITH CHECK (true);