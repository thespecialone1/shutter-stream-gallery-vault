import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SecurityEvent {
  type: 'suspicious_activity' | 'rate_limit_exceeded' | 'failed_auth' | 'session_hijack';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  clientIp?: string;
  userAgent?: string;
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

    const { event } = await req.json() as { event: SecurityEvent }
    
    if (!event || !event.type) {
      return new Response(
        JSON.stringify({ success: false, message: 'Security event data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Security event: ${event.type} (${event.severity})`, event.details)

    // Log the security event
    const { error: logError } = await supabase.rpc('log_security_event', {
      event_type: event.type,
      severity: event.severity,
      details: event.details
    });

    if (logError) {
      console.error('Failed to log security event:', logError);
    }

    // Check for patterns that indicate attacks
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for brute force attempts
    if (event.type === 'failed_auth' && event.clientIp) {
      const { data: recentFailures, error: queryError } = await supabase
        .from('security_audit')
        .select('*')
        .eq('event_type', 'failed_auth')
        .eq('client_ip', event.clientIp)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!queryError && recentFailures && recentFailures.length > 10) {
        console.warn(`POTENTIAL BRUTE FORCE: ${event.clientIp} has ${recentFailures.length} failed auth attempts in the last hour`);
        
        // Log escalated security event
        await supabase.rpc('log_security_event', {
          event_type: 'brute_force_detected',
          severity: 'critical',
          details: {
            client_ip: event.clientIp,
            failure_count: recentFailures.length,
            time_window: '1_hour'
          }
        });
      }
    }

    // Check for session anomalies
    if (event.type === 'session_hijack') {
      console.error(`CRITICAL: Potential session hijacking detected for IP: ${event.clientIp}`);
      
      // Could trigger email alerts here if email service is configured
      // await sendSecurityAlert(event);
    }

    // Auto-cleanup old security audit logs (keep last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { error: cleanupError } = await supabase
      .from('security_audit')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (cleanupError) {
      console.error('Failed to cleanup old security logs:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Security event processed'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Security monitor error:', error)
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
