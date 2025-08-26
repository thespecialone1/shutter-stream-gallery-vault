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

    const { galleryId } = await req.json()
    
    if (!galleryId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get authentication from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set auth context
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify gallery ownership
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('id, photographer_id')
      .eq('id', galleryId)
      .eq('photographer_id', user.id)
      .single()

    if (galleryError || !gallery) {
      return new Response(
        JSON.stringify({ success: false, message: 'Gallery not found or access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get anonymous favorites with session and IP details
    const { data: favorites, error: favError } = await supabase
      .from('anonymous_favorites')
      .select(`
        image_id,
        created_at,
        client_ip,
        session_token,
        images!inner(filename, original_filename)
      `)
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false })

    if (favError) {
      console.error('Error fetching favorites:', favError)
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to fetch favorites data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get session information for better user tracking
    const sessionTokens = [...new Set(favorites?.map(f => f.session_token) || [])]
    const { data: sessions, error: sessionError } = await supabase
      .from('gallery_access_sessions')
      .select('session_token, created_at, client_ip, user_agent')
      .in('session_token', sessionTokens)
      .eq('gallery_id', galleryId)

    if (sessionError) {
      console.error('Error fetching sessions:', sessionError)
    }

    // Create a map of session details
    const sessionMap = new Map()
    sessions?.forEach(session => {
      sessionMap.set(session.session_token, session)
    })

    // Group favorites by user/session for better analytics
    const userFavorites = new Map()
    favorites?.forEach(favorite => {
      const sessionInfo = sessionMap.get(favorite.session_token)
      const userKey = `${favorite.session_token}_${favorite.client_ip || 'unknown'}`
      
      if (!userFavorites.has(userKey)) {
        userFavorites.set(userKey, {
          sessionToken: favorite.session_token,
          clientIP: favorite.client_ip,
          userAgent: sessionInfo?.user_agent || 'Unknown',
          sessionCreated: sessionInfo?.created_at,
          favorites: [],
          totalFavorites: 0
        })
      }
      
      const user = userFavorites.get(userKey)
      user.favorites.push({
        imageId: favorite.image_id,
        filename: favorite.images.filename,
        originalFilename: favorite.images.original_filename,
        favoritedAt: favorite.created_at
      })
      user.totalFavorites++
    })

    // Convert to array and sort by total favorites
    const analyticsData = Array.from(userFavorites.values())
      .sort((a, b) => b.totalFavorites - a.totalFavorites)

    // Calculate summary statistics
    const totalUniqueFavorites = favorites?.length || 0
    const totalUniqueUsers = analyticsData.length
    const averageFavoritesPerUser = totalUniqueUsers > 0 ? Math.round(totalUniqueFavorites / totalUniqueUsers * 10) / 10 : 0

    // Most favorited images
    const imageFavoriteCount = new Map()
    favorites?.forEach(favorite => {
      const key = favorite.image_id
      if (!imageFavoriteCount.has(key)) {
        imageFavoriteCount.set(key, {
          imageId: favorite.image_id,
          filename: favorite.images.filename,
          originalFilename: favorite.images.original_filename,
          count: 0
        })
      }
      imageFavoriteCount.get(key).count++
    })

    const topImages = Array.from(imageFavoriteCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return new Response(
      JSON.stringify({
        success: true,
        analytics: {
          summary: {
            totalFavorites: totalUniqueFavorites,
            uniqueUsers: totalUniqueUsers,
            averageFavoritesPerUser
          },
          topImages,
          userBreakdown: analyticsData.slice(0, 50), // Limit to first 50 users
          recentActivity: favorites?.slice(0, 20) || [] // Most recent 20 favorites
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Gallery favorites analytics error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})