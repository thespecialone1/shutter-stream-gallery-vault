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

    const { galleryId, sessionToken, action = 'gallery_view' } = await req.json()
    
    if (!galleryId || !sessionToken) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery ID and session token are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Session validation for gallery ${galleryId} with action ${action}`)

    // Additional security check - use the new secure validation function
    const { data: secureValidation, error: secureError } = await supabase.rpc('is_valid_gallery_session', {
      gallery_id: galleryId,
      session_token: sessionToken
    });

    if (secureError) {
      console.error('Secure validation error:', secureError);
      // Continue with original validation as fallback
    } else if (!secureValidation) {
      console.log(`Secure validation failed for ${galleryId}`);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid session' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Call the database function to validate session and log access
    const { data, error } = await supabase.rpc('validate_gallery_session', {
      gallery_id: galleryId,
      session_token: sessionToken,
      action_type: action
    })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ success: false, message: 'Session validation failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!data.success) {
      console.log(`Session validation failed for ${galleryId}: ${data.message}`)
      return new Response(
        JSON.stringify({ success: false, message: data.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Session validation successful for ${galleryId}`)

    // Return the validation result and gallery info
    return new Response(
      JSON.stringify({
        success: true,
        gallery: data.gallery,
        sessionExpires: data.session_expires
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Gallery session validation error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})