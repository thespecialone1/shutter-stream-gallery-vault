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

    const { galleryId, imageId, sessionToken, action = 'toggle' } = await req.json()
    
    if (!galleryId || !imageId || !sessionToken) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery ID, image ID, and session token are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Anonymous favorite ${action} for image ${imageId} in gallery ${galleryId}`)

    // Get client IP from request headers
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown'

    if (action === 'toggle') {
      // Toggle favorite using the database function
      const { data, error } = await supabase.rpc('toggle_anonymous_favorite', {
        p_gallery_id: galleryId,
        p_image_id: imageId,
        p_session_token: sessionToken,
        p_client_ip: clientIP
      })

      if (error) {
        console.error('Toggle favorite error:', error)
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to toggle favorite' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify(data),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (action === 'list') {
      // Get list of favorites for this session
      const { data, error } = await supabase.rpc('get_anonymous_favorites', {
        p_gallery_id: galleryId,
        p_session_token: sessionToken
      })

      if (error) {
        console.error('Get favorites error:', error)
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to get favorites' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, favorites: data }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Anonymous favorites error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})