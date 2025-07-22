-- Create galleries table
CREATE TABLE public.galleries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  password_hash TEXT NOT NULL,
  client_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sections table for organizing images within galleries
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create images table
CREATE TABLE public.images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  thumbnail_path TEXT,
  full_path TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-images', 'gallery-images', true);

-- Enable Row Level Security
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (will add password protection later)
CREATE POLICY "Public can view galleries" ON public.galleries FOR SELECT USING (true);
CREATE POLICY "Public can view sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Public can view images" ON public.images FOR SELECT USING (true);

-- Storage policies for public read access
CREATE POLICY "Public can view gallery images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery-images');

-- Admin policies for insert/update (will restrict later)
CREATE POLICY "Admin can manage galleries" ON public.galleries FOR ALL USING (true);
CREATE POLICY "Admin can manage sections" ON public.sections FOR ALL USING (true);
CREATE POLICY "Admin can manage images" ON public.images FOR ALL USING (true);

CREATE POLICY "Admin can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gallery-images');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON public.galleries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_images_gallery_id ON public.images(gallery_id);
CREATE INDEX idx_images_section_id ON public.images(section_id);
CREATE INDEX idx_sections_gallery_id ON public.sections(gallery_id);