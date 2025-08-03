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

    const { imageId, galleryId } = await req.json();
    
    console.log(`Processing DNG conversion for image ${imageId} in gallery ${galleryId}`);

    // Get image details from database
    const { data: image, error: imageError } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .maybeSingle();

    if (imageError || !image) {
      console.error('Image not found:', imageError);
      return new Response(JSON.stringify({ success: false, error: 'Image not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Check if it's a DNG file
    const filename = image.filename.toLowerCase();
    if (!filename.endsWith('.dng')) {
      return new Response(JSON.stringify({ success: false, error: 'Not a DNG file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Download the DNG file from storage
    const { data: dngData, error: downloadError } = await supabase.storage
      .from('gallery-images')
      .download(image.full_path);

    if (downloadError || !dngData) {
      console.error('Failed to download DNG file:', downloadError);
      return new Response(JSON.stringify({ success: false, error: 'Failed to download DNG file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Downloaded DNG file: ${image.filename}, size: ${dngData.size} bytes`);

    // Convert DNG to JPEG using CloudConvert API
    // Note: You'll need to add your CloudConvert API key as a secret
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY');
    
    if (!cloudConvertApiKey) {
      console.error('CloudConvert API key not found');
      return new Response(JSON.stringify({ success: false, error: 'CloudConvert API key not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Create CloudConvert job
    const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/upload'
          },
          'convert-file': {
            operation: 'convert',
            input: 'import-file',
            output_format: 'jpg',
            options: {
              quality: 90,
              strip: false // Keep metadata
            }
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file'
          }
        }
      })
    });

    if (!jobResponse.ok) {
      console.error('Failed to create CloudConvert job');
      return new Response(JSON.stringify({ success: false, error: 'Failed to create conversion job' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const job = await jobResponse.json();
    const uploadTask = job.data.tasks.find((t: any) => t.name === 'import-file');
    
    // Upload DNG file to CloudConvert
    const formData = new FormData();
    formData.append('file', dngData, image.filename);
    
    const uploadResponse = await fetch(uploadTask.result.form.url, {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      console.error('Failed to upload DNG to CloudConvert');
      return new Response(JSON.stringify({ success: false, error: 'Failed to upload DNG file' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Wait for conversion to complete
    let conversionComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes timeout

    while (!conversionComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const jobStatusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${job.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`,
        }
      });

      const jobStatus = await jobStatusResponse.json();
      const exportTask = jobStatus.data.tasks.find((t: any) => t.name === 'export-file');
      
      if (exportTask && exportTask.status === 'finished') {
        conversionComplete = true;
        
        // Download converted JPEG
        const jpegResponse = await fetch(exportTask.result.files[0].url);
        const jpegBlob = await jpegResponse.blob();
        
        // Generate new filename
        const jpegFilename = image.filename.replace(/\.dng$/i, '.jpg');
        const jpegPath = `${galleryId}/${jpegFilename}`;
        
        // Upload JPEG to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('gallery-images')
          .upload(jpegPath, jpegBlob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Failed to upload converted JPEG:', uploadError);
          return new Response(JSON.stringify({ success: false, error: 'Failed to upload converted image' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        // Update database record
        const { error: updateError } = await supabase
          .from('images')
          .update({
            filename: jpegFilename,
            full_path: jpegPath,
            mime_type: 'image/jpeg'
          })
          .eq('id', imageId);

        if (updateError) {
          console.error('Failed to update database:', updateError);
          return new Response(JSON.stringify({ success: false, error: 'Failed to update database' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }

        // Remove original DNG file
        await supabase.storage
          .from('gallery-images')
          .remove([image.full_path]);

        console.log(`Successfully processed ${image.filename} -> ${jpegFilename}`);
        break;
      }
      
      attempts++;
    }

    if (!conversionComplete) {
      return new Response(JSON.stringify({ success: false, error: 'Conversion timeout' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('DNG conversion error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});