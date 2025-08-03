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

    const { galleryId, sessionToken } = await req.json()
    
    if (!galleryId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Loading images for gallery ${galleryId}`)

    // First check if gallery is public
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('is_public, photographer_id')
      .eq('id', galleryId)
      .single()

    if (galleryError) {
      console.error('Gallery not found:', galleryError)
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If gallery is public, anyone can access
    // If gallery is private, validate session token
    if (!gallery.is_public && sessionToken) {
      const { data: sessionValid, error: sessionError } = await supabase.rpc('is_valid_gallery_session', {
        gallery_id: galleryId,
        session_token: sessionToken
      });

      if (sessionError || !sessionValid) {
        console.log(`Invalid session for gallery ${galleryId}`)
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid session' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    } else if (!gallery.is_public && !sessionToken) {
      return new Response(
        JSON.stringify({ success: false, message: 'Session token required for private gallery' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Load images, sections, and favorites
    const [imagesResult, sectionsResult, favoritesResult] = await Promise.all([
      supabase
        .from('images')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('upload_date', { ascending: true }),
      
      supabase
        .from('sections')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('sort_order', { ascending: true }),
      
      // For anonymous favorites, use session token if available
      sessionToken ? 
        supabase.rpc('get_anonymous_favorites', {
          p_gallery_id: galleryId,
          p_session_token: sessionToken
        }) :
        { data: [], error: null }
    ])

    if (imagesResult.error) {
      console.error('Error loading images:', imagesResult.error)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to load images' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully loaded ${imagesResult.data?.length || 0} images for gallery ${galleryId}`)

    return new Response(
      JSON.stringify({
        success: true,
        images: imagesResult.data || [],
        sections: sectionsResult.data || [],
        favorites: favoritesResult.data || []
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Gallery images loading error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})