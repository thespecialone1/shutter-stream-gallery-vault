-- Step 2: Create clean, simple RLS policies without recursion

-- Galleries policies - simple and clean
CREATE POLICY "Gallery owners can view their galleries" ON public.galleries
FOR SELECT 
TO authenticated
USING (photographer_id = auth.uid());

CREATE POLICY "Gallery owners can create galleries" ON public.galleries
FOR INSERT 
TO authenticated
WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Gallery owners can update their galleries" ON public.galleries
FOR UPDATE 
TO authenticated
USING (photographer_id = auth.uid())
WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Gallery owners can delete their galleries" ON public.galleries
FOR DELETE 
TO authenticated
USING (photographer_id = auth.uid());

-- Public can view basic info of public galleries only
CREATE POLICY "Public can view public galleries" ON public.galleries
FOR SELECT 
TO anon, authenticated
USING (is_public = true);

-- Images policies - simple and clean
CREATE POLICY "Gallery owners can manage images" ON public.images
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE id = images.gallery_id 
    AND photographer_id = auth.uid()
  )
);

CREATE POLICY "Public can view public gallery images" ON public.images
FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE id = images.gallery_id 
    AND is_public = true
  )
);

-- Sections policies - simple and clean
CREATE POLICY "Gallery owners can manage sections" ON public.sections
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE id = sections.gallery_id 
    AND photographer_id = auth.uid()
  )
);

CREATE POLICY "Public can view public gallery sections" ON public.sections
FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries 
    WHERE id = sections.gallery_id 
    AND is_public = true
  )
);

-- Log the successful cleanup
INSERT INTO public.security_audit (event_type, severity, details)
VALUES (
  'database_reset_complete',
  'info',
  '{"action": "fresh_start_complete", "description": "Database cleaned and simple RLS policies created"}'
);