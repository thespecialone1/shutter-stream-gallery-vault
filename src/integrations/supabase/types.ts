export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      anonymous_favorites: {
        Row: {
          client_ip: unknown | null
          created_at: string
          gallery_id: string
          id: string
          image_id: string
          session_token: string
        }
        Insert: {
          client_ip?: unknown | null
          created_at?: string
          gallery_id: string
          id?: string
          image_id: string
          session_token: string
        }
        Update: {
          client_ip?: unknown | null
          created_at?: string
          gallery_id?: string
          id?: string
          image_id?: string
          session_token?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          client_ip: unknown | null
          created_at: string
          id: string
          metadata: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          client_ip?: unknown | null
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          client_ip?: unknown | null
          created_at?: string
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          id: string
          identifier: string
          window_start: string | null
        }
        Insert: {
          attempt_type: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier: string
          window_start?: string | null
        }
        Update: {
          attempt_type?: string
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          identifier?: string
          window_start?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          image_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          image_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          image_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      galleries: {
        Row: {
          client_name: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          password_hash: string | null
          photographer_id: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          client_name: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          password_hash?: string | null
          photographer_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          client_name?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          password_hash?: string | null
          photographer_id?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      gallery_access_sessions: {
        Row: {
          client_ip: unknown | null
          created_at: string
          expires_at: string
          gallery_id: string
          id: string
          last_accessed: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          client_ip?: unknown | null
          created_at?: string
          expires_at: string
          gallery_id: string
          id?: string
          last_accessed?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          client_ip?: unknown | null
          created_at?: string
          expires_at?: string
          gallery_id?: string
          id?: string
          last_accessed?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_access_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_access_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_access_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_analytics: {
        Row: {
          action: string
          client_ip: unknown | null
          created_at: string
          gallery_id: string
          id: string
          image_id: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          client_ip?: unknown | null
          created_at?: string
          gallery_id: string
          id?: string
          image_id?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          client_ip?: unknown | null
          created_at?: string
          gallery_id?: string
          id?: string
          image_id?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_analytics_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_analytics_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_analytics_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_analytics_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_analytics_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_invites: {
        Row: {
          alias: string | null
          created_at: string
          created_by: string
          description: string | null
          email_domains: string[] | null
          expires_at: string
          gallery_id: string
          id: string
          invite_token: string | null
          invite_token_hash: string | null
          ip_restrictions: unknown[] | null
          is_active: boolean
          last_used_at: string | null
          last_used_ip: unknown | null
          last_used_user_agent: string | null
          link_type: string | null
          max_uses: number | null
          requires_email: boolean | null
          used_count: number
        }
        Insert: {
          alias?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email_domains?: string[] | null
          expires_at?: string
          gallery_id: string
          id?: string
          invite_token?: string | null
          invite_token_hash?: string | null
          ip_restrictions?: unknown[] | null
          is_active?: boolean
          last_used_at?: string | null
          last_used_ip?: unknown | null
          last_used_user_agent?: string | null
          link_type?: string | null
          max_uses?: number | null
          requires_email?: boolean | null
          used_count?: number
        }
        Update: {
          alias?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email_domains?: string[] | null
          expires_at?: string
          gallery_id?: string
          id?: string
          invite_token?: string | null
          invite_token_hash?: string | null
          ip_restrictions?: unknown[] | null
          is_active?: boolean
          last_used_at?: string | null
          last_used_ip?: unknown | null
          last_used_user_agent?: string | null
          link_type?: string | null
          max_uses?: number | null
          requires_email?: boolean | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "gallery_invites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_invites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_invites_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
        ]
      }
      image_variants: {
        Row: {
          created_at: string
          file_path: string
          file_size: number
          height: number | null
          id: string
          image_id: string
          quality_setting: number | null
          variant_type: string
          width: number | null
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size: number
          height?: number | null
          id?: string
          image_id: string
          quality_setting?: number | null
          variant_type: string
          width?: number | null
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size?: number
          height?: number | null
          id?: string
          image_id?: string
          quality_setting?: number | null
          variant_type?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_variants_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_variants_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      images: {
        Row: {
          file_size: number
          filename: string
          full_path: string
          gallery_id: string
          height: number | null
          id: string
          metadata: Json | null
          mime_type: string
          original_filename: string
          section_id: string | null
          thumbnail_path: string | null
          upload_date: string
          width: number | null
        }
        Insert: {
          file_size: number
          filename: string
          full_path: string
          gallery_id: string
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type: string
          original_filename: string
          section_id?: string | null
          thumbnail_path?: string | null
          upload_date?: string
          width?: number | null
        }
        Update: {
          file_size?: number
          filename?: string
          full_path?: string
          gallery_id?: string
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          original_filename?: string
          section_id?: string | null
          thumbnail_path?: string | null
          upload_date?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          gallery_id: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit: {
        Row: {
          client_ip: unknown | null
          created_at: string
          details: Json | null
          event_type: string
          gallery_id: string | null
          id: string
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_ip?: unknown | null
          created_at?: string
          details?: Json | null
          event_type: string
          gallery_id?: string | null
          id?: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_ip?: unknown | null
          created_at?: string
          details?: Json | null
          event_type?: string
          gallery_id?: string | null
          id?: string
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      galleries_public_view: {
        Row: {
          client_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          view_count: number | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          view_count?: number | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      gallery_public: {
        Row: {
          client_name: string | null
          created_at: string | null
          description: string | null
          id: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_sessions_safe: {
        Row: {
          client_ip_masked: string | null
          created_at: string | null
          expires_at: string | null
          gallery_id: string | null
          id: string | null
          last_accessed: string | null
          session_status: string | null
          user_agent_partial: string | null
        }
        Insert: {
          client_ip_masked?: never
          created_at?: string | null
          expires_at?: string | null
          gallery_id?: string | null
          id?: string | null
          last_accessed?: string | null
          session_status?: never
          user_agent_partial?: never
        }
        Update: {
          client_ip_masked?: never
          created_at?: string | null
          expires_at?: string | null
          gallery_id?: string | null
          id?: string | null
          last_accessed?: string | null
          session_status?: never
          user_agent_partial?: never
        }
        Relationships: [
          {
            foreignKeyName: "gallery_access_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_access_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gallery_access_sessions_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
        ]
      }
      images_public_view: {
        Row: {
          filename: string | null
          gallery_id: string | null
          height: number | null
          id: string | null
          mime_type: string | null
          section_id: string | null
          thumbnail_path: string | null
          upload_date: string | null
          width: number | null
        }
        Relationships: [
          {
            foreignKeyName: "images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries_public_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "gallery_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anonymize_ip_address: {
        Args: { ip_addr: unknown }
        Returns: string
      }
      check_rate_limit: {
        Args: {
          attempt_type: string
          identifier: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_security_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_sensitive_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_gallery_invite: {
        Args: {
          expires_in_days?: number
          gallery_id: string
          max_uses?: number
        }
        Returns: Json
      }
      create_gallery_session: {
        Args: {
          client_ip?: unknown
          gallery_id: string
          provided_password: string
          user_agent?: string
        }
        Returns: Json
      }
      create_secure_share_link: {
        Args: {
          alias?: string
          description?: string
          email_domains?: string[]
          expires_in_days?: number
          gallery_id: string
          ip_restrictions?: unknown[]
          link_type?: string
          max_uses?: number
          requires_email?: boolean
        }
        Returns: Json
      }
      create_session_from_share_link: {
        Args:
          | {
              alias?: string
              client_ip?: unknown
              gallery_password?: string
              invite_token?: string
              user_agent?: string
            }
          | {
              alias?: string
              client_ip?: unknown
              invite_token?: string
              user_agent?: string
            }
        Returns: Json
      }
      generate_secure_gallery_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_anonymous_favorites: {
        Args: { p_gallery_id: string; p_session_token: string }
        Returns: {
          created_at: string
          image_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_gallery_analytics_summary: {
        Args: { gallery_uuid: string }
        Returns: {
          popular_images: Json
          recent_activity_days: number
          total_views: number
          unique_visitors_estimate: number
        }[]
      }
      get_gallery_safe_info: {
        Args: { gallery_uuid: string }
        Returns: Json
      }
      get_my_gallery_info: {
        Args: { gallery_uuid: string }
        Returns: Json
      }
      get_my_profile: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }[]
      }
      get_my_profile_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }[]
      }
      get_share_link_analytics: {
        Args: { gallery_id: string }
        Returns: Json
      }
      get_user_profile_secure: {
        Args: { user_uuid: string }
        Returns: {
          business_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_password: {
        Args: { password: string }
        Returns: string
      }
      hash_password_secure: {
        Args: { password: string }
        Returns: string
      }
      hash_session_token: {
        Args: { token: string }
        Returns: string
      }
      increment_gallery_views: {
        Args: { gallery_id: string }
        Returns: undefined
      }
      is_gallery_owner: {
        Args: { gallery_id: string; user_id: string }
        Returns: boolean
      }
      is_password_compromised: {
        Args: { password: string }
        Returns: boolean
      }
      is_valid_gallery_session: {
        Args: { gallery_id: string; session_token: string }
        Returns: boolean
      }
      log_audit_action: {
        Args: {
          _action: string
          _metadata?: Json
          _record_id?: string
          _table_name: string
        }
        Returns: undefined
      }
      log_image_access: {
        Args: {
          action_type: string
          gallery_id: string
          image_id: string
          session_token?: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string; severity?: string }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: {
          auto_block?: boolean
          details?: Json
          event_type: string
          severity?: string
        }
        Returns: undefined
      }
      log_unauthorized_access_attempt: {
        Args: { attempted_action: string; details?: Json; table_name: string }
        Returns: undefined
      }
      rotate_gallery_session: {
        Args: { gallery_id: string; old_session_token: string }
        Returns: Json
      }
      toggle_anonymous_favorite: {
        Args: {
          p_client_ip?: unknown
          p_gallery_id: string
          p_image_id: string
          p_session_token: string
        }
        Returns: Json
      }
      update_my_profile_secure: {
        Args: {
          p_business_name?: string
          p_email: string
          p_full_name: string
          p_phone?: string
        }
        Returns: Json
      }
      validate_gallery_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      validate_gallery_session: {
        Args: {
          action_type?: string
          gallery_id: string
          session_token: string
        }
        Returns: Json
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_secure_share_link: {
        Args: {
          alias?: string
          client_ip?: unknown
          email?: string
          invite_token?: string
          user_agent?: string
        }
        Returns: Json
      }
      validate_session_secure: {
        Args: { gallery_uuid: string; raw_token: string }
        Returns: boolean
      }
      verify_gallery_access: {
        Args: { gallery_id: string; provided_password: string }
        Returns: Json
      }
      verify_gallery_session: {
        Args: { gallery_id: string; session_token: string }
        Returns: Json
      }
      verify_password: {
        Args: { hash: string; password: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "photographer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "photographer"],
    },
  },
} as const
