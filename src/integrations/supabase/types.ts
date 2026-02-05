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
      admin_action_logs: {
        Row: {
          action_type: string
          admin_email: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id: string
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
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
      application_action_tokens: {
        Row: {
          action_type: string
          application_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          action_type: string
          application_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          action_type?: string
          application_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_action_tokens_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "artist_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_agreement_acceptances: {
        Row: {
          accepted_at: string
          agreement_version: string
          artist_id: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          agreement_version: string
          artist_id: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          agreement_version?: string
          artist_id?: string
          id?: string
          ip_address?: string | null
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
      artist_invitations: {
        Row: {
          apply_link: string
          artist_email: string | null
          artist_name: string
          artist_social_handle: string | null
          created_at: string
          created_by_admin_id: string
          id: string
          notes: string | null
          platform: string
          status: string
        }
        Insert: {
          apply_link: string
          artist_email?: string | null
          artist_name: string
          artist_social_handle?: string | null
          created_at?: string
          created_by_admin_id: string
          id?: string
          notes?: string | null
          platform: string
          status?: string
        }
        Update: {
          apply_link?: string
          artist_email?: string | null
          artist_name?: string
          artist_social_handle?: string | null
          created_at?: string
          created_by_admin_id?: string
          id?: string
          notes?: string | null
          platform?: string
          status?: string
        }
        Relationships: []
      }
      artist_payouts: {
        Row: {
          artist_id: string
          artist_net_amount: number
          created_at: string
          failure_reason: string | null
          gross_amount: number
          id: string
          payout_batch_id: string
          platform_fee_amount: number
          status: string
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
        }
        Insert: {
          artist_id: string
          artist_net_amount?: number
          created_at?: string
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          payout_batch_id: string
          platform_fee_amount?: number
          status?: string
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
        }
        Update: {
          artist_id?: string
          artist_net_amount?: number
          created_at?: string
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          payout_batch_id?: string
          platform_fee_amount?: number
          status?: string
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_payouts_payout_batch_id_fkey"
            columns: ["payout_batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
        ]
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
          payout_status: string | null
          stripe_account_id: string | null
          tiktok_url: string | null
          tutorial_completed: boolean | null
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
          payout_status?: string | null
          stripe_account_id?: string | null
          tiktok_url?: string | null
          tutorial_completed?: boolean | null
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
          payout_status?: string | null
          stripe_account_id?: string | null
          tiktok_url?: string | null
          tutorial_completed?: boolean | null
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
          payout_batch_id: string | null
          reference: string | null
          type: string
          usd_delta: number
          user_email: string
        }
        Insert: {
          created_at?: string
          credits_delta: number
          id?: string
          payout_batch_id?: string | null
          reference?: string | null
          type: string
          usd_delta: number
          user_email: string
        }
        Update: {
          created_at?: string
          credits_delta?: number
          id?: string
          payout_batch_id?: string | null
          reference?: string | null
          type?: string
          usd_delta?: number
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_payout_batch_id_fkey"
            columns: ["payout_batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          application_id: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "artist_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_terms_acceptances: {
        Row: {
          accepted_at: string
          agreement_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          agreement_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          agreement_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      invitation_email_logs: {
        Row: {
          admin_user_id: string
          artist_email: string | null
          artist_name: string
          artist_social_handle: string | null
          created_at: string
          error_message: string | null
          id: string
          invite_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          admin_user_id: string
          artist_email?: string | null
          artist_name: string
          artist_social_handle?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invite_type: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          admin_user_id?: string
          artist_email?: string | null
          artist_name?: string
          artist_social_handle?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          invite_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      marketing_assets: {
        Row: {
          artist_id: string
          badges: string[] | null
          chosen_caption: string | null
          created_at: string
          format: string
          id: string
          promo_image_url: string
          template_id: string
          track_id: string
        }
        Insert: {
          artist_id: string
          badges?: string[] | null
          chosen_caption?: string | null
          created_at?: string
          format: string
          id?: string
          promo_image_url: string
          template_id: string
          track_id: string
        }
        Update: {
          artist_id?: string
          badges?: string[] | null
          chosen_caption?: string | null
          created_at?: string
          format?: string
          id?: string
          promo_image_url?: string
          template_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_assets_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_batches: {
        Row: {
          artist_user_id: string
          created_at: string
          id: string
          paid_at: string | null
          status: string
          stripe_transfer_id: string | null
          total_artist_net: number
          total_credits: number
          total_gross: number
          total_platform_fee: number
          total_usd: number
          week_end: string
          week_start: string
        }
        Insert: {
          artist_user_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          total_artist_net?: number
          total_credits?: number
          total_gross?: number
          total_platform_fee?: number
          total_usd?: number
          week_end: string
          week_start: string
        }
        Update: {
          artist_user_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          stripe_transfer_id?: string | null
          total_artist_net?: number
          total_credits?: number
          total_gross?: number
          total_platform_fee?: number
          total_usd?: number
          week_end?: string
          week_start?: string
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
      report_email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string
          report_date: string
          report_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          report_date: string
          report_type?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          report_date?: string
          report_type?: string
          sent_at?: string | null
          status?: string
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
      stream_ledger: {
        Row: {
          amount_artist: number
          amount_platform: number
          amount_total: number
          artist_id: string
          created_at: string
          credits_spent: number
          fan_email: string
          fan_id: string
          id: string
          payout_batch_id: string | null
          payout_status: string
          track_id: string
        }
        Insert: {
          amount_artist?: number
          amount_platform?: number
          amount_total?: number
          artist_id: string
          created_at?: string
          credits_spent?: number
          fan_email: string
          fan_id: string
          id?: string
          payout_batch_id?: string | null
          payout_status?: string
          track_id: string
        }
        Update: {
          amount_artist?: number
          amount_platform?: number
          amount_total?: number
          artist_id?: string
          created_at?: string
          credits_spent?: number
          fan_email?: string
          fan_id?: string
          id?: string
          payout_batch_id?: string | null
          payout_status?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_ledger_payout_batch_id_fkey"
            columns: ["payout_batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
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
      track_likes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          track_id: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          track_id: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_likes_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "vault_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_likes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
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
          preview_start_seconds: number
          status: string
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
          preview_start_seconds?: number
          status?: string
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
          preview_start_seconds?: number
          status?: string
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
          next_draw_date: string | null
          status: string
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
          next_draw_date?: string | null
          status?: string
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
          next_draw_date?: string | null
          status?: string
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
      admin_stream_report_view: {
        Row: {
          amount_artist: number | null
          amount_platform: number | null
          amount_total: number | null
          artist_id: string | null
          artist_name: string | null
          artist_profile_id: string | null
          artist_user_id: string | null
          created_at: string | null
          credits_spent: number | null
          fan_display_name: string | null
          fan_email: string | null
          fan_id: string | null
          payout_batch_id: string | null
          payout_status: string | null
          stream_id: string | null
          track_album: string | null
          track_id: string | null
          track_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stream_ledger_payout_batch_id_fkey"
            columns: ["payout_batch_id"]
            isOneToOne: false
            referencedRelation: "payout_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      public_artist_profiles: {
        Row: {
          artist_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          genre: string | null
          id: string | null
          instagram_url: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string | null
          youtube_url: string | null
        }
        Insert: {
          artist_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          genre?: string | null
          id?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          youtube_url?: string | null
        }
        Update: {
          artist_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          genre?: string | null
          id?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_fan_top_artists: {
        Args: { p_fan_id: string; p_limit?: number }
        Returns: {
          artist_id: string
          artist_name: string
          avatar_url: string
          like_count: number
        }[]
      }
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
      is_admin_email: { Args: { email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "fan" | "artist" | "admin"
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
      app_role: ["fan", "artist", "admin"],
    },
  },
} as const
