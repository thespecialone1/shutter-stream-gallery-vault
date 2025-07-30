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

    const { galleryId, password } = await req.json()
    
    if (!galleryId || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery ID and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get client IP and user agent for security logging
    const clientIp = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log(`Gallery auth attempt for gallery ${galleryId} from IP ${clientIp}`)

    // Call the database function to verify password and create session
    const { data, error } = await supabase.rpc('create_gallery_session', {
      gallery_id: galleryId,
      provided_password: password,
      client_ip: clientIp,
      user_agent: userAgent
    })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ success: false, message: 'Authentication failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!data.success) {
      console.log(`Gallery auth failed for ${galleryId}: ${data.message}`)
      return new Response(
        JSON.stringify({ success: false, message: data.message }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Gallery auth successful for ${galleryId}`)

    // Return the session token and gallery info
    return new Response(
      JSON.stringify({
        success: true,
        sessionToken: data.session_token,
        expiresAt: data.expires_at,
        gallery: data.gallery
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Gallery auth error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})