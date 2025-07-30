import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { galleryId, imageId, action, sessionToken } = await req.json()
    
    if (!galleryId || !imageId || !action) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery ID, image ID, and action are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Logging image ${action} for image ${imageId} in gallery ${galleryId}`)

    // Call the database function to log image access
    const { error } = await supabase.rpc('log_image_access', {
      gallery_id: galleryId,
      image_id: imageId,
      action_type: action,
      session_token: sessionToken
    })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to log image access' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Image ${action} logged successfully`)

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Image analytics error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})