import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { galleryId } = await req.json();
    
    console.log(`Starting batch DNG conversion for gallery ${galleryId}`);

    // Get all DNG images in the gallery
    const { data: dngImages, error: queryError } = await supabase
      .from('images')
      .select('*')
      .eq('gallery_id', galleryId)
      .ilike('filename', '%.dng');

    if (queryError) {
      console.error('Failed to query DNG images:', queryError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to query images' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!dngImages || dngImages.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No DNG images found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${dngImages.length} DNG images to convert`);

    let successCount = 0;
    let errorCount = 0;

    // Process each DNG image
    for (const image of dngImages) {
      try {
        console.log(`Converting image ${image.id}: ${image.filename}`);
        
        // Call the individual DNG conversion function
        const conversionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/convert-dng`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageId: image.id,
            galleryId: galleryId
          })
        });

        if (conversionResponse.ok) {
          successCount++;
          console.log(`Successfully converted ${image.filename}`);
        } else {
          errorCount++;
          console.error(`Failed to convert ${image.filename}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error converting ${image.filename}:`, error);
      }
    }

    console.log(`Batch conversion completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed: dngImages.length,
      successful: successCount,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Batch DNG conversion error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});