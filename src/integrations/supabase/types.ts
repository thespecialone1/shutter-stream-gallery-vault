export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
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
        }
        Insert: {
          created_at?: string
          gallery_id: string
          id?: string
          image_id: string
        }
        Update: {
          created_at?: string
          gallery_id?: string
          id?: string
          image_id?: string
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
            foreignKeyName: "favorites_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
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
            foreignKeyName: "gallery_analytics_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "images"
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
      [_ in never]: never
    }
    Functions: {
      check_rate_limit: {
        Args: {
          identifier: string
          attempt_type: string
          max_attempts?: number
          window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_gallery_session: {
        Args: {
          gallery_id: string
          provided_password: string
          client_ip?: unknown
          user_agent?: string
        }
        Returns: Json
      }
      generate_secure_gallery_password: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
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
      increment_gallery_views: {
        Args: { gallery_id: string }
        Returns: undefined
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
          _table_name: string
          _record_id?: string
          _metadata?: Json
        }
        Returns: undefined
      }
      log_image_access: {
        Args: {
          gallery_id: string
          image_id: string
          action_type: string
          session_token?: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: { event_type: string; severity?: string; details?: Json }
        Returns: undefined
      }
      rotate_gallery_session: {
        Args: { gallery_id: string; old_session_token: string }
        Returns: Json
      }
      validate_gallery_session: {
        Args: {
          gallery_id: string
          session_token: string
          action_type?: string
        }
        Returns: Json
      }
      validate_password_strength: {
        Args: { password: string }
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
        Args: { password: string; hash: string }
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
