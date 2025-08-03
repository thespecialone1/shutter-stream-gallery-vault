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
      .single()

    if (imageError || !imageRecord) {
      console.error('Image not found:', imageError)
      return new Response(
        JSON.stringify({ error: 'Image not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if it's a HEIC file
    if (!imageRecord.filename.toLowerCase().endsWith('.heic')) {
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

    console.log(`Downloaded HEIC file: ${imageRecord.filename}`)

    // Convert HEIC to JPEG using a conversion service
    // Since Deno doesn't have native HEIC support, we'll use CloudConvert API
    const cloudConvertApiKey = Deno.env.get('CLOUDCONVERT_API_KEY')
    
    if (!cloudConvertApiKey) {
      console.error('CloudConvert API key not configured')
      return new Response(
        JSON.stringify({ error: 'Image conversion service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create CloudConvert job
    const jobResponse = await fetch('https://api.cloudconvert.com/v2/jobs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cloudConvertApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tasks: {
          'import-heic': {
            operation: 'import/upload'
          },
          'convert-to-jpeg': {
            operation: 'convert',
            input: 'import-heic',
            output_format: 'jpg',
            options: {
              quality: 90
            }
          },
          'export-jpeg': {
            operation: 'export/url',
            input: 'convert-to-jpeg'
          }
        }
      })
    })

    const jobData = await jobResponse.json()
    console.log('CloudConvert job created:', jobData.data.id)

    if (!jobResponse.ok) {
      console.error('CloudConvert job creation failed:', jobData)
      return new Response(
        JSON.stringify({ error: 'Failed to create conversion job' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Upload HEIC file to CloudConvert
    const importTask = jobData.data.tasks.find((task: any) => task.name === 'import-heic')
    const uploadResponse = await fetch(importTask.result.form.url, {
      method: 'POST',
      body: (() => {
        const formData = new FormData()
        Object.entries(importTask.result.form.parameters).forEach(([key, value]) => {
          formData.append(key, value as string)
        })
        formData.append('file', fileData, imageRecord.filename)
        return formData
      })()
    })

    if (!uploadResponse.ok) {
      console.error('Failed to upload HEIC file to CloudConvert')
      return new Response(
        JSON.stringify({ error: 'Failed to upload file for conversion' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('HEIC file uploaded to CloudConvert')

    // Wait for conversion to complete and get the result
    let conversionComplete = false
    let attempts = 0
    const maxAttempts = 30 // 5 minutes max wait time
    let exportTask

    while (!conversionComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.cloudconvert.com/v2/jobs/${jobData.data.id}`, {
        headers: {
          'Authorization': `Bearer ${cloudConvertApiKey}`
        }
      })

      const statusData = await statusResponse.json()
      exportTask = statusData.data.tasks.find((task: any) => task.name === 'export-jpeg')
      
      if (exportTask && exportTask.status === 'finished') {
        conversionComplete = true
      } else if (exportTask && exportTask.status === 'error') {
        console.error('CloudConvert conversion failed:', exportTask)
        return new Response(
          JSON.stringify({ error: 'Image conversion failed' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      attempts++
    }

    if (!conversionComplete) {
      console.error('CloudConvert conversion timed out')
      return new Response(
        JSON.stringify({ error: 'Conversion timed out' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Download the converted JPEG
    const convertedResponse = await fetch(exportTask.result.files[0].url)
    const convertedBlob = await convertedResponse.blob()
    
    console.log('JPEG conversion completed, file size:', convertedBlob.size)

    // Upload converted JPEG to Supabase storage
    const newFilename = imageRecord.filename.replace(/\.heic$/i, '.jpg')
    const newFilePath = imageRecord.full_path.replace(/\.heic$/i, '.jpg')

    const { error: uploadError } = await supabase.storage
      .from('gallery-images')
      .upload(newFilePath, convertedBlob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Failed to upload converted JPEG:', uploadError)
      return new Response(
        JSON.stringify({ error: 'Failed to save converted image' }),
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
        mime_type: 'image/jpeg',
        file_size: convertedBlob.size
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

    console.log(`Successfully converted ${imageRecord.filename} to ${newFilename}`)

    return new Response(
      JSON.stringify({
        success: true,
        originalFilename: imageRecord.filename,
        convertedFilename: newFilename,
        convertedPath: newFilePath,
        fileSize: convertedBlob.size
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('HEIC conversion error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})