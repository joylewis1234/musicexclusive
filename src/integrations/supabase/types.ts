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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agreement_acceptances: {
        Row: {
          accepted_at: string
          email: string
          id: string
          ip_address: string | null
          name: string
          privacy_version: string
          terms_version: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          email: string
          id?: string
          ip_address?: string | null
          name: string
          privacy_version: string
          terms_version: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          name?: string
          privacy_version?: string
          terms_version?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      artist_applications: {
        Row: {
          agrees_terms: boolean
          apple_music_url: string | null
          artist_name: string
          contact_email: string
          country_city: string | null
          created_at: string
          follower_count: number
          genres: string
          hook_preview_url: string | null
          id: string
          not_released_publicly: boolean
          owns_rights: boolean
          primary_social_platform: string
          social_profile_url: string
          song_sample_url: string
          spotify_url: string | null
          status: string
          updated_at: string
          years_releasing: string
        }
        Insert: {
          agrees_terms?: boolean
          apple_music_url?: string | null
          artist_name: string
          contact_email: string
          country_city?: string | null
          created_at?: string
          follower_count: number
          genres: string
          hook_preview_url?: string | null
          id?: string
          not_released_publicly?: boolean
          owns_rights?: boolean
          primary_social_platform: string
          social_profile_url: string
          song_sample_url: string
          spotify_url?: string | null
          status?: string
          updated_at?: string
          years_releasing: string
        }
        Update: {
          agrees_terms?: boolean
          apple_music_url?: string | null
          artist_name?: string
          contact_email?: string
          country_city?: string | null
          created_at?: string
          follower_count?: number
          genres?: string
          hook_preview_url?: string | null
          id?: string
          not_released_publicly?: boolean
          owns_rights?: boolean
          primary_social_platform?: string
          social_profile_url?: string
          song_sample_url?: string
          spotify_url?: string | null
          status?: string
          updated_at?: string
          years_releasing?: string
        }
        Relationships: []
      }
      artist_profiles: {
        Row: {
          artist_name: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          genre: string | null
          id: string
          instagram_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          artist_name: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          instagram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id: string
          youtube_url?: string | null
        }
        Update: {
          artist_name?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          instagram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          created_at: string
          credits_delta: number
          id: string
          reference: string | null
          type: string
          usd_delta: number
          user_email: string
        }
        Insert: {
          created_at?: string
          credits_delta: number
          id?: string
          reference?: string | null
          type: string
          usd_delta: number
          user_email: string
        }
        Update: {
          created_at?: string
          credits_delta?: number
          id?: string
          reference?: string | null
          type?: string
          usd_delta?: number
          user_email?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_tracks: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          listened_at: string | null
          note: string | null
          recipient_id: string
          sender_id: string
          track_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          listened_at?: string | null
          note?: string | null
          recipient_id: string
          sender_id: string
          track_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          listened_at?: string | null
          note?: string | null
          recipient_id?: string
          sender_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_tracks_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "vault_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_tracks_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "vault_members"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          event_type: string
          id: string
          payload: Json | null
          processed_at: string
        }
        Insert: {
          event_type: string
          id: string
          payload?: Json | null
          processed_at?: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          album: string | null
          artist_id: string
          artwork_url: string | null
          created_at: string
          duration: number
          full_audio_url: string | null
          genre: string | null
          id: string
          preview_audio_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          album?: string | null
          artist_id: string
          artwork_url?: string | null
          created_at?: string
          duration?: number
          full_audio_url?: string | null
          genre?: string | null
          id?: string
          preview_audio_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          album?: string | null
          artist_id?: string
          artwork_url?: string | null
          created_at?: string
          duration?: number
          full_audio_url?: string | null
          genre?: string | null
          id?: string
          preview_audio_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      vault_codes: {
        Row: {
          attempts_count: number | null
          code: string
          email: string
          expires_at: string | null
          id: string
          issued_at: string
          last_attempt_at: string | null
          name: string
          used_at: string | null
        }
        Insert: {
          attempts_count?: number | null
          code: string
          email: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          last_attempt_at?: string | null
          name: string
          used_at?: string | null
        }
        Update: {
          attempts_count?: number | null
          code?: string
          email?: string
          expires_at?: string | null
          id?: string
          issued_at?: string
          last_attempt_at?: string | null
          name?: string
          used_at?: string | null
        }
        Relationships: []
      }
      vault_members: {
        Row: {
          credits: number
          display_name: string
          email: string
          id: string
          joined_at: string
          updated_at: string
          vault_access_active: boolean
        }
        Insert: {
          credits?: number
          display_name: string
          email: string
          id?: string
          joined_at?: string
          updated_at?: string
          vault_access_active?: boolean
        }
        Update: {
          credits?: number
          display_name?: string
          email?: string
          id?: string
          joined_at?: string
          updated_at?: string
          vault_access_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "fan" | "artist"
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
      app_role: ["fan", "artist"],
    },
  },
} as const
