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

    const { galleryId } = await req.json()
    console.log(`Starting HEIC conversion batch for gallery ${galleryId}`)

    if (!galleryId) {
      return new Response(
        JSON.stringify({ error: 'Missing galleryId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Find all HEIC images in the gallery
    const { data: heicImages, error: queryError } = await supabase
      .from('images')
      .select('id, filename, full_path, gallery_id')
      .eq('gallery_id', galleryId)
      .or('filename.ilike.%.heic,mime_type.eq.image/heic')

    if (queryError) {
      console.error('Failed to query HEIC images:', queryError)
      return new Response(
        JSON.stringify({ error: 'Failed to find HEIC images' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${heicImages.length} HEIC images to convert`)

    if (heicImages.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No HEIC images found to convert',
          converted: 0,
          total: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    // Process images in batches of 5 to avoid overwhelming the conversion service
    const batchSize = 5
    for (let i = 0; i < heicImages.length; i += batchSize) {
      const batch = heicImages.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (image) => {
        try {
          console.log(`Converting image ${image.id}: ${image.filename}`)
          
          // Call the convert-heic function
          const { data, error } = await supabase.functions.invoke('convert-heic', {
            body: { 
              imageId: image.id, 
              galleryId: image.gallery_id 
            }
          })

          if (error) {
            console.error(`Failed to convert ${image.filename}:`, error)
            errorCount++
            return {
              imageId: image.id,
              filename: image.filename,
              success: false,
              error: error.message
            }
          }

          console.log(`Successfully converted ${image.filename}`)
          successCount++
          return {
            imageId: image.id,
            filename: image.filename,
            success: true,
            convertedFilename: data.convertedFilename
          }
        } catch (error) {
          console.error(`Error converting ${image.filename}:`, error)
          errorCount++
          return {
            imageId: image.id,
            filename: image.filename,
            success: false,
            error: error.message
          }
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      results.push(...batchResults.map(result => 
        result.status === 'fulfilled' ? result.value : {
          success: false,
          error: 'Promise rejected',
          details: result.reason
        }
      ))

      // Wait between batches to avoid rate limiting
      if (i + batchSize < heicImages.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log(`Batch conversion completed. Success: ${successCount}, Errors: ${errorCount}`)

    return new Response(
      JSON.stringify({
        success: true,
        total: heicImages.length,
        converted: successCount,
        errors: errorCount,
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Batch HEIC conversion error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})