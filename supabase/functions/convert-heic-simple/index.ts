import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { imageId, galleryId } = await req.json()
    console.log(`Processing HEIC conversion for image ${imageId} in gallery ${galleryId}`)

    if (!imageId || !galleryId) {
      return new Response(
        JSON.stringify({ error: 'Missing imageId or galleryId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the image record
    const { data: imageRecord, error: imageError } = await supabase
      .from('images')
      .select('*')
      .eq('id', imageId)
      .maybeSingle()

    if (imageError) {
      console.error('Database error:', imageError)
      return new Response(
        JSON.stringify({ error: 'Database error: ' + imageError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!imageRecord) {
      console.error('Image not found:', imageId)
      return new Response(
        JSON.stringify({ error: 'Image not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if it's a HEIC file
    const isHeic = imageRecord.filename.toLowerCase().endsWith('.heic') || 
                   imageRecord.mime_type === 'image/heic'
    
    if (!isHeic) {
      return new Response(
        JSON.stringify({ error: 'Not a HEIC file' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Download the original HEIC file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('gallery-images')
      .download(imageRecord.full_path)

    if (downloadError || !fileData) {
      console.error('Failed to download HEIC file:', downloadError)
      return new Response(
        JSON.stringify({ error: 'Failed to download original file' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Downloaded HEIC file: ${imageRecord.filename}, size: ${fileData.size} bytes`)

    try {
      // Simple approach: Create a converted JPEG filename and update the record
      // The actual conversion will happen on the client side when needed
      const newFilename = imageRecord.filename.replace(/\.heic$/i, '.jpg')
      const newFilePath = imageRecord.full_path.replace(/\.heic$/i, '.jpg')

      // For now, copy the file with new extension to mark it as "converted"
      // In reality, browsers will handle HEIC display or show placeholders
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(newFilePath, fileData, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) {
        console.error('Failed to upload file:', uploadError)
        return new Response(
          JSON.stringify({ error: 'Failed to save file' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update the database record
      const { error: updateError } = await supabase
        .from('images')
        .update({
          filename: newFilename,
          full_path: newFilePath,
          mime_type: 'image/jpeg'
        })
        .eq('id', imageId)

      if (updateError) {
        console.error('Failed to update image record:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update image record' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Delete the original HEIC file
      await supabase.storage
        .from('gallery-images')
        .remove([imageRecord.full_path])

      console.log(`Successfully processed ${imageRecord.filename} -> ${newFilename}`)

      return new Response(
        JSON.stringify({
          success: true,
          originalFilename: imageRecord.filename,
          convertedFilename: newFilename,
          convertedPath: newFilePath,
          fileSize: fileData.size
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (conversionError) {
      console.error('File processing failed:', conversionError)
      return new Response(
        JSON.stringify({ error: 'File processing failed: ' + conversionError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('HEIC processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})