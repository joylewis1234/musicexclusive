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
      app_error_logs: {
        Row: {
          created_at: string
          error_message: string
          id: string
          page: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message: string
          id?: string
          page: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string
          id?: string
          page?: string
          user_id?: string | null
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
          artist_name: string | null
          id: string
          ip_address: string | null
          legal_name: string | null
          pdf_storage_key: string | null
          signed_at: string | null
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string
          agreement_version: string
          artist_id: string
          artist_name?: string | null
          id?: string
          ip_address?: string | null
          legal_name?: string | null
          pdf_storage_key?: string | null
          signed_at?: string | null
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string
          agreement_version?: string
          artist_id?: string
          artist_name?: string | null
          id?: string
          ip_address?: string | null
          legal_name?: string | null
          pdf_storage_key?: string | null
          signed_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      artist_applications: {
        Row: {
          agrees_terms: boolean
          apple_music_url: string | null
          approved_application_id: string | null
          approved_at: string | null
          approved_by: string | null
          artist_name: string
          auth_user_id: string | null
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
          approved_application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          artist_name: string
          auth_user_id?: string | null
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
          approved_application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          artist_name?: string
          auth_user_id?: string | null
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
      artist_waitlist: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artist_name: string
          created_at: string
          email: string
          genre: string | null
          id: string
          instagram: string | null
          location: string
          monthly_listeners: string | null
          music_link: string
          other_social: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artist_name: string
          created_at?: string
          email: string
          genre?: string | null
          id?: string
          instagram?: string | null
          location: string
          monthly_listeners?: string | null
          music_link: string
          other_social?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artist_name?: string
          created_at?: string
          email?: string
          genre?: string | null
          id?: string
          instagram?: string | null
          location?: string
          monthly_listeners?: string | null
          music_link?: string
          other_social?: string | null
          status?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          created_at: string
          credits_delta: number
          id: string
          payout_batch_id: string | null
          reference: string
          type: string
          usd_delta: number
          user_email: string
        }
        Insert: {
          created_at?: string
          credits_delta: number
          id?: string
          payout_batch_id?: string | null
          reference: string
          type: string
          usd_delta: number
          user_email: string
        }
        Update: {
          created_at?: string
          credits_delta?: number
          id?: string
          payout_batch_id?: string | null
          reference?: string
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
      fan_invites: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          invitee_email: string | null
          inviter_id: string
          inviter_type: string
          status: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          inviter_id: string
          inviter_type: string
          status?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          inviter_id?: string
          inviter_type?: string
          status?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      fan_playlists: {
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
            foreignKeyName: "fan_playlists_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
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
      fan_waitlist: {
        Row: {
          created_at: string
          email: string
          favorite_artist: string | null
          favorite_genre: string | null
          first_name: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          favorite_artist?: string | null
          favorite_genre?: string | null
          first_name: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          favorite_artist?: string | null
          favorite_genre?: string | null
          first_name?: string
          id?: string
          status?: string
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
      monitoring_events: {
        Row: {
          conflict: boolean
          contention_count: number
          created_at: string
          error_code: string | null
          error_message: string | null
          event_type: string
          function_name: string
          id: string
          latency_ms: number | null
          ledger_written: boolean | null
          metadata: Json | null
          retry_count: number
          stage: string | null
          status: number
        }
        Insert: {
          conflict?: boolean
          contention_count?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type: string
          function_name: string
          id?: string
          latency_ms?: number | null
          ledger_written?: boolean | null
          metadata?: Json | null
          retry_count?: number
          stage?: string | null
          status: number
        }
        Update: {
          conflict?: boolean
          contention_count?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          function_name?: string
          id?: string
          latency_ms?: number | null
          ledger_written?: boolean | null
          metadata?: Json | null
          retry_count?: number
          stage?: string | null
          status?: number
        }
        Relationships: []
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
      playback_sessions: {
        Row: {
          created_at: string
          expires_at: string
          ip_address: string | null
          revoked_at: string | null
          session_id: string
          track_id: string
          user_agent: string | null
          user_id: string
          watermark_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          ip_address?: string | null
          revoked_at?: string | null
          session_id: string
          track_id: string
          user_agent?: string | null
          user_id: string
          watermark_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          ip_address?: string | null
          revoked_at?: string | null
          session_id?: string
          track_id?: string
          user_agent?: string | null
          user_id?: string
          watermark_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playback_sessions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          stream_id: string
          token_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          stream_id: string
          token_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          stream_id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playback_tokens_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "stream_charges"
            referencedColumns: ["stream_id"]
          },
        ]
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
      request_rate_limits: {
        Row: {
          count: number
          endpoint: string
          id: number
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          endpoint: string
          id?: number
          key: string
          updated_at?: string
          window_start: string
        }
        Update: {
          count?: number
          endpoint?: string
          id?: number
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      shared_artist_profiles: {
        Row: {
          artist_profile_id: string
          created_at: string
          id: string
          note: string | null
          recipient_id: string
          sender_id: string
          viewed_at: string | null
        }
        Insert: {
          artist_profile_id: string
          created_at?: string
          id?: string
          note?: string | null
          recipient_id: string
          sender_id: string
          viewed_at?: string | null
        }
        Update: {
          artist_profile_id?: string
          created_at?: string
          id?: string
          note?: string | null
          recipient_id?: string
          sender_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_artist_profiles_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "shareable_vault_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_artist_profiles_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "vault_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_artist_profiles_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "shareable_vault_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_artist_profiles_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "vault_members"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "shareable_vault_members"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "shareable_vault_members"
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
      stream_charges: {
        Row: {
          created_at: string
          fan_email: string
          idempotency_key: string | null
          stream_id: string
          stream_ledger_id: string | null
          track_id: string
        }
        Insert: {
          created_at?: string
          fan_email: string
          idempotency_key?: string | null
          stream_id?: string
          stream_ledger_id?: string | null
          track_id: string
        }
        Update: {
          created_at?: string
          fan_email?: string
          idempotency_key?: string | null
          stream_id?: string
          stream_ledger_id?: string | null
          track_id?: string
        }
        Relationships: []
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
            referencedRelation: "shareable_vault_members"
            referencedColumns: ["id"]
          },
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
          artwork_key: string | null
          artwork_url: string | null
          created_at: string
          duration: number
          exclusivity_decision: string | null
          exclusivity_expires_at: string | null
          full_audio_key: string | null
          full_audio_url: string | null
          genre: string | null
          id: string
          is_preview_public: boolean
          like_count: number
          preview_audio_key: string | null
          preview_audio_url: string | null
          preview_start_seconds: number
          processing_error: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          album?: string | null
          artist_id: string
          artwork_key?: string | null
          artwork_url?: string | null
          created_at?: string
          duration?: number
          exclusivity_decision?: string | null
          exclusivity_expires_at?: string | null
          full_audio_key?: string | null
          full_audio_url?: string | null
          genre?: string | null
          id?: string
          is_preview_public?: boolean
          like_count?: number
          preview_audio_key?: string | null
          preview_audio_url?: string | null
          preview_start_seconds?: number
          processing_error?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          album?: string | null
          artist_id?: string
          artwork_key?: string | null
          artwork_url?: string | null
          created_at?: string
          duration?: number
          exclusivity_decision?: string | null
          exclusivity_expires_at?: string | null
          full_audio_key?: string | null
          full_audio_url?: string | null
          genre?: string | null
          id?: string
          is_preview_public?: boolean
          like_count?: number
          preview_audio_key?: string | null
          preview_audio_url?: string | null
          preview_start_seconds?: number
          processing_error?: string | null
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
          invite_token_used: string | null
          joined_at: string
          membership_type: string
          superfan_active: boolean
          superfan_since: string | null
          updated_at: string
          user_id: string | null
          vault_access_active: boolean
        }
        Insert: {
          credits?: number
          display_name: string
          email: string
          id?: string
          invite_token_used?: string | null
          joined_at?: string
          membership_type?: string
          superfan_active?: boolean
          superfan_since?: string | null
          updated_at?: string
          user_id?: string | null
          vault_access_active?: boolean
        }
        Update: {
          credits?: number
          display_name?: string
          email?: string
          id?: string
          invite_token_used?: string | null
          joined_at?: string
          membership_type?: string
          superfan_active?: boolean
          superfan_since?: string | null
          updated_at?: string
          user_id?: string | null
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
      shareable_vault_members: {
        Row: {
          display_name: string | null
          id: string | null
        }
        Insert: {
          display_name?: string | null
          id?: string | null
        }
        Update: {
          display_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_credit_purchase: {
        Args: {
          p_credits: number
          p_email: string
          p_ledger_type: string
          p_reference: string
          p_set_superfan?: boolean
          p_set_superfan_since?: boolean
          p_usd: number
        }
        Returns: undefined
      }
      debit_stream_credit: {
        Args: {
          p_artist_id: string
          p_fan_email: string
          p_fan_id: string
          p_idempotency_key: string
          p_track_id: string
        }
        Returns: {
          already_charged: boolean
          new_credits: number
          out_stream_id: string
          stream_ledger_id: string
        }[]
      }
      get_fan_top_artists: {
        Args: { p_fan_id: string; p_limit?: number }
        Returns: {
          artist_id: string
          artist_name: string
          avatar_url: string
          like_count: number
        }[]
      }
      get_public_preview_audio_key: {
        Args: { p_track_id: string }
        Returns: string
      }
      get_public_preview_tracks: {
        Args: never
        Returns: {
          artist_avatar_url: string
          artist_id: string
          artist_name: string
          artwork_url: string
          genre: string
          has_preview: boolean
          id: string
          like_count: number
          preview_start_seconds: number
          title: string
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
