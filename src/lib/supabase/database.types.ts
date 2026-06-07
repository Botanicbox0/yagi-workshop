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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agency_artist_roster: {
        Row: {
          agency_workspace_id: string
          artist_workspace_id: string
          created_at: string
          id: string
          linked_by: string | null
          note: string | null
          updated_at: string
        }
        Insert: {
          agency_workspace_id: string
          artist_workspace_id: string
          created_at?: string
          id?: string
          linked_by?: string | null
          note?: string | null
          updated_at?: string
        }
        Update: {
          agency_workspace_id?: string
          artist_workspace_id?: string
          created_at?: string
          id?: string
          linked_by?: string | null
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_artist_roster_agency_workspace_id_fkey"
            columns: ["agency_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_artist_roster_artist_profile_fk"
            columns: ["artist_workspace_id"]
            isOneToOne: false
            referencedRelation: "artist_profile"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "agency_artist_roster_artist_workspace_id_fkey"
            columns: ["artist_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_artist_roster_linked_by_fkey"
            columns: ["linked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_profile: {
        Row: {
          activated_at: string | null
          auto_decline_categories: string[]
          bypass_brand_ids: string[]
          created_at: string
          display_name: string | null
          instagram_handle: string | null
          owner_user_id: string
          short_bio: string | null
          twin_r2_prefix: string | null
          twin_status: string
          updated_at: string
          visibility_mode: string
          workspace_id: string
        }
        Insert: {
          activated_at?: string | null
          auto_decline_categories?: string[]
          bypass_brand_ids?: string[]
          created_at?: string
          display_name?: string | null
          instagram_handle?: string | null
          owner_user_id: string
          short_bio?: string | null
          twin_r2_prefix?: string | null
          twin_status?: string
          updated_at?: string
          visibility_mode?: string
          workspace_id: string
        }
        Update: {
          activated_at?: string | null
          auto_decline_categories?: string[]
          bypass_brand_ids?: string[]
          created_at?: string
          display_name?: string | null
          instagram_handle?: string | null
          owner_user_id?: string
          short_bio?: string | null
          twin_r2_prefix?: string | null
          twin_status?: string
          updated_at?: string
          visibility_mode?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_profile_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_guide: Json
          created_at: string
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brand_guide?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          brand_guide?: Json
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      briefing_documents: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          filename: string | null
          id: string
          kind: string
          mime_type: string | null
          note: string | null
          oembed_html: string | null
          project_id: string
          provider: string | null
          size_bytes: number | null
          source_type: string
          storage_key: string | null
          thumbnail_url: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          filename?: string | null
          id?: string
          kind: string
          mime_type?: string | null
          note?: string | null
          oembed_html?: string | null
          project_id: string
          provider?: string | null
          size_bytes?: number | null
          source_type: string
          storage_key?: string | null
          thumbnail_url?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          filename?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          note?: string | null
          oembed_html?: string | null
          project_id?: string
          provider?: string | null
          size_bytes?: number | null
          source_type?: string
          storage_key?: string | null
          thumbnail_url?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "briefing_documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "briefing_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_categories: {
        Row: {
          campaign_id: string
          description: string | null
          display_order: number
          format_spec: Json | null
          id: string
          name: string
        }
        Insert: {
          campaign_id: string
          description?: string | null
          display_order?: number
          format_spec?: Json | null
          id?: string
          name: string
        }
        Update: {
          campaign_id?: string
          description?: string | null
          display_order?: number
          format_spec?: Json | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_categories_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_distributions: {
        Row: {
          added_by: string | null
          channel: string
          comment_count: number | null
          created_at: string
          id: string
          like_count: number | null
          metric_log_notes: string | null
          metric_logged_at: string | null
          notes: string | null
          posted_at: string
          submission_id: string
          updated_at: string
          url: string
          view_count: number | null
        }
        Insert: {
          added_by?: string | null
          channel: string
          comment_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          metric_log_notes?: string | null
          metric_logged_at?: string | null
          notes?: string | null
          posted_at?: string
          submission_id: string
          updated_at?: string
          url: string
          view_count?: number | null
        }
        Update: {
          added_by?: string | null
          channel?: string
          comment_count?: number | null
          created_at?: string
          id?: string
          like_count?: number | null
          metric_log_notes?: string | null
          metric_logged_at?: string | null
          notes?: string | null
          posted_at?: string
          submission_id?: string
          updated_at?: string
          url?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_distributions_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_distributions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "campaign_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_review_decisions: {
        Row: {
          comment: string | null
          decided_at: string
          decision: string
          id: string
          reviewer_user_id: string
          submission_id: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          decision: string
          id?: string
          reviewer_user_id: string
          submission_id: string
        }
        Update: {
          comment?: string | null
          decided_at?: string
          decision?: string
          id?: string
          reviewer_user_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_review_decisions_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_review_decisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "campaign_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_submissions: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_phone: string | null
          applicant_workspace_id: string | null
          approved_at: string | null
          campaign_id: string
          category_id: string
          content_mime: string | null
          content_r2_key: string | null
          created_at: string
          declined_at: string | null
          description: string | null
          distributed_at: string | null
          duration_seconds: number | null
          external_url: string | null
          id: string
          status: string
          submitted_at: string
          team_name: string | null
          thumbnail_r2_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_phone?: string | null
          applicant_workspace_id?: string | null
          approved_at?: string | null
          campaign_id: string
          category_id: string
          content_mime?: string | null
          content_r2_key?: string | null
          created_at?: string
          declined_at?: string | null
          description?: string | null
          distributed_at?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          status?: string
          submitted_at?: string
          team_name?: string | null
          thumbnail_r2_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_phone?: string | null
          applicant_workspace_id?: string | null
          approved_at?: string | null
          campaign_id?: string
          category_id?: string
          content_mime?: string | null
          content_r2_key?: string | null
          created_at?: string
          declined_at?: string | null
          description?: string | null
          distributed_at?: string | null
          duration_seconds?: number | null
          external_url?: string | null
          id?: string
          status?: string
          submitted_at?: string
          team_name?: string | null
          thumbnail_r2_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_submissions_applicant_workspace_id_fkey"
            columns: ["applicant_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_submissions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "campaign_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          allow_external_url: boolean
          allow_r2_upload: boolean
          brief: string | null
          compensation_metadata: Json | null
          compensation_model: string | null
          created_at: string
          created_by: string
          decision_metadata: Json | null
          description: string | null
          distribution_starts_at: string | null
          external_sponsor_name: string | null
          has_external_sponsor: boolean
          id: string
          prize_pool_krw: number | null
          prize_tiers: Json | null
          recruit_target: number | null
          reference_assets: Json | null
          request_metadata: Json | null
          slug: string
          sponsor_workspace_id: string | null
          status: string
          submission_close_at: string | null
          submission_open_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_external_url?: boolean
          allow_r2_upload?: boolean
          brief?: string | null
          compensation_metadata?: Json | null
          compensation_model?: string | null
          created_at?: string
          created_by: string
          decision_metadata?: Json | null
          description?: string | null
          distribution_starts_at?: string | null
          external_sponsor_name?: string | null
          has_external_sponsor?: boolean
          id?: string
          prize_pool_krw?: number | null
          prize_tiers?: Json | null
          recruit_target?: number | null
          reference_assets?: Json | null
          request_metadata?: Json | null
          slug: string
          sponsor_workspace_id?: string | null
          status?: string
          submission_close_at?: string | null
          submission_open_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_external_url?: boolean
          allow_r2_upload?: boolean
          brief?: string | null
          compensation_metadata?: Json | null
          compensation_model?: string | null
          created_at?: string
          created_by?: string
          decision_metadata?: Json | null
          description?: string | null
          distribution_starts_at?: string | null
          external_sponsor_name?: string | null
          has_external_sponsor?: boolean
          id?: string
          prize_pool_krw?: number | null
          prize_tiers?: Json | null
          recruit_target?: number | null
          reference_assets?: Json | null
          request_metadata?: Json | null
          slug?: string
          sponsor_workspace_id?: string | null
          status?: string
          submission_close_at?: string | null
          submission_open_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_sponsor_workspace_id_fkey"
            columns: ["sponsor_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_judgments: {
        Row: {
          admin_id: string
          challenge_id: string
          created_at: string
          id: string
          notes: string | null
          score: number | null
          submission_id: string
        }
        Insert: {
          admin_id: string
          challenge_id: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          submission_id: string
        }
        Update: {
          admin_id?: string
          challenge_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_judgments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_judgments_submission_challenge_consistency_fkey"
            columns: ["challenge_id", "submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["challenge_id", "id"]
          },
          {
            foreignKeyName: "challenge_judgments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          content: Json
          created_at: string
          id: string
          status: string
          submitter_id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          content?: Json
          created_at?: string
          id?: string
          status?: string
          submitter_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          content?: Json
          created_at?: string
          id?: string
          status?: string
          submitter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_votes: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          submission_id: string
          voter_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          submission_id: string
          voter_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          submission_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_votes_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_submission_challenge_consistency_fkey"
            columns: ["challenge_id", "submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["challenge_id", "id"]
          },
          {
            foreignKeyName: "challenge_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          announce_at: string | null
          close_at: string | null
          created_at: string
          created_by: string
          description_md: string | null
          hero_media_url: string | null
          id: string
          judging_config: Json
          open_at: string | null
          reminder_sent_at: string | null
          slug: string
          sponsor_client_id: string | null
          state: string
          submission_requirements: Json
          title: string
          updated_at: string
        }
        Insert: {
          announce_at?: string | null
          close_at?: string | null
          created_at?: string
          created_by: string
          description_md?: string | null
          hero_media_url?: string | null
          id?: string
          judging_config?: Json
          open_at?: string | null
          reminder_sent_at?: string | null
          slug: string
          sponsor_client_id?: string | null
          state?: string
          submission_requirements?: Json
          title: string
          updated_at?: string
        }
        Update: {
          announce_at?: string | null
          close_at?: string | null
          created_at?: string
          created_by?: string
          description_md?: string | null
          hero_media_url?: string | null
          id?: string
          judging_config?: Json
          open_at?: string | null
          reminder_sent_at?: string | null
          slug?: string
          sponsor_client_id?: string | null
          state?: string
          submission_requirements?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_sponsor_client_id_fkey"
            columns: ["sponsor_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_name: string
          company_type: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          instagram_handle: string | null
          updated_at: string
          verified_at: string | null
          website_url: string | null
        }
        Insert: {
          company_name: string
          company_type: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id: string
          instagram_handle?: string | null
          updated_at?: string
          verified_at?: string | null
          website_url?: string | null
        }
        Update: {
          company_name?: string
          company_type?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          instagram_handle?: string | null
          updated_at?: string
          verified_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_intakes: {
        Row: {
          admin_responded_at: string | null
          admin_responded_by: string | null
          admin_response_md: string | null
          brief_md: string
          budget_range: string
          category: string
          client_id: string
          converted_to_project_id: string | null
          created_at: string
          deadline_preference: string | null
          id: string
          reference_uploads: Json
          reference_urls: Json
          state: string
          timestamp_notes: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_responded_at?: string | null
          admin_responded_by?: string | null
          admin_response_md?: string | null
          brief_md: string
          budget_range: string
          category: string
          client_id: string
          converted_to_project_id?: string | null
          created_at?: string
          deadline_preference?: string | null
          id?: string
          reference_uploads?: Json
          reference_urls?: Json
          state?: string
          timestamp_notes?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_responded_at?: string | null
          admin_responded_by?: string | null
          admin_response_md?: string | null
          brief_md?: string
          budget_range?: string
          category?: string
          client_id?: string
          converted_to_project_id?: string | null
          created_at?: string
          deadline_preference?: string | null
          id?: string
          reference_uploads?: Json
          reference_urls?: Json
          state?: string
          timestamp_notes?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_intakes_admin_responded_by_fkey"
            columns: ["admin_responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_intakes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_intakes_converted_to_project_id_fkey"
            columns: ["converted_to_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creators_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_payment_events: {
        Row: {
          amount: number | null
          deal_id: string
          event_type: string
          id: string
          invoice_ref: string | null
          note: string | null
          occurred_at: string
          recorded_by: string | null
        }
        Insert: {
          amount?: number | null
          deal_id: string
          event_type: string
          id?: string
          invoice_ref?: string | null
          note?: string | null
          occurred_at?: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number | null
          deal_id?: string
          event_type?: string
          id?: string
          invoice_ref?: string | null
          note?: string | null
          occurred_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_payment_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_payment_events_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_status_history: {
        Row: {
          actor_id: string | null
          actor_role: string
          comment: string | null
          deal_id: string
          from_status: string | null
          id: string
          to_status: string
          transitioned_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          comment?: string | null
          deal_id: string
          from_status?: string | null
          id?: string
          to_status: string
          transitioned_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          comment?: string | null
          deal_id?: string
          from_status?: string | null
          id?: string
          to_status?: string
          transitioned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_status_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          artist_payout_amount: number | null
          artist_workspace_id: string
          brand_amount: number | null
          brand_workspace_id: string
          brief: string | null
          commission_rate: number | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          payment_status: string
          persona_id: string
          persona_name_snapshot: string | null
          project_id: string | null
          proposed_budget: number | null
          settlement_recipient_type: string | null
          settlement_recipient_workspace_id: string | null
          status: string
          updated_at: string
          usage_types: string[]
          yagi_commission_amount: number | null
        }
        Insert: {
          artist_payout_amount?: number | null
          artist_workspace_id: string
          brand_amount?: number | null
          brand_workspace_id: string
          brief?: string | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          payment_status?: string
          persona_id: string
          persona_name_snapshot?: string | null
          project_id?: string | null
          proposed_budget?: number | null
          settlement_recipient_type?: string | null
          settlement_recipient_workspace_id?: string | null
          status?: string
          updated_at?: string
          usage_types?: string[]
          yagi_commission_amount?: number | null
        }
        Update: {
          artist_payout_amount?: number | null
          artist_workspace_id?: string
          brand_amount?: number | null
          brand_workspace_id?: string
          brief?: string | null
          commission_rate?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          payment_status?: string
          persona_id?: string
          persona_name_snapshot?: string | null
          project_id?: string | null
          proposed_budget?: number | null
          settlement_recipient_type?: string | null
          settlement_recipient_workspace_id?: string | null
          status?: string
          updated_at?: string
          usage_types?: string[]
          yagi_commission_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_artist_workspace_id_fkey"
            columns: ["artist_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_brand_workspace_id_fkey"
            columns: ["brand_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "twin_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_settlement_recipient_workspace_id_fkey"
            columns: ["settlement_recipient_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_annotations: {
        Row: {
          asset_index: number
          coords: Json
          created_at: string
          created_by: string
          deliverable_id: string
          id: string
          project_id: string
          resolved_at: string | null
          resolved_by: string | null
          seq: number
          shape: string
          status: string
          thread_id: string
          timestamp_sec: number | null
          visibility: string
        }
        Insert: {
          asset_index?: number
          coords: Json
          created_at?: string
          created_by: string
          deliverable_id: string
          id?: string
          project_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          seq: number
          shape?: string
          status?: string
          thread_id: string
          timestamp_sec?: number | null
          visibility?: string
        }
        Update: {
          asset_index?: number
          coords?: Json
          created_at?: string
          created_by?: string
          deliverable_id?: string
          id?: string
          project_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          seq?: number
          shape?: string
          status?: string
          thread_id?: string
          timestamp_sec?: number | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_annotations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_annotations_project_deliverable_fkey"
            columns: ["project_id", "deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["project_id", "id"]
          },
          {
            foreignKeyName: "deliverable_annotations_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_annotations_thread_fkey"
            columns: ["thread_id"]
            isOneToOne: true
            referencedRelation: "project_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_views: {
        Row: {
          deliverable_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          deliverable_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          deliverable_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_views_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
        ]
      }
      embed_cache: {
        Row: {
          expires_at: string
          fetched_at: string
          provider: string
          response_json: Json
          url: string
        }
        Insert: {
          expires_at?: string
          fetched_at?: string
          provider: string
          response_json: Json
          url: string
        }
        Update: {
          expires_at?: string
          fetched_at?: string
          provider?: string
          response_json?: Json
          url?: string
        }
        Relationships: []
      }
      handle_history: {
        Row: {
          changed_at: string
          id: string
          new_handle: string
          old_handle: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_handle: string
          old_handle: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_handle?: string
          old_handle?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handle_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string
          display_order: number
          id: string
          invoice_id: string
          item_name: string
          note: string | null
          quantity: number
          source_id: string | null
          source_type: string | null
          specification: string | null
          supply_krw: number
          unit_price_krw: number
          vat_krw: number
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          invoice_id: string
          item_name: string
          note?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          specification?: string | null
          supply_krw: number
          unit_price_krw: number
          vat_krw: number
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          invoice_id?: string
          item_name?: string
          note?: string | null
          quantity?: number
          source_id?: string | null
          source_type?: string | null
          specification?: string | null
          supply_krw?: number
          unit_price_krw?: number
          vat_krw?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string
          deal_id: string | null
          due_date: string | null
          filed_at: string | null
          id: string
          invoice_number: string | null
          is_mock: boolean
          issue_date: string | null
          memo: string | null
          nts_approval_number: string | null
          paid_at: string | null
          popbill_mgt_key: string | null
          popbill_response: Json | null
          project_id: string | null
          status: string
          subtotal_krw: number
          supplier_id: string
          supply_date: string
          total_krw: number
          updated_at: string
          vat_krw: number
          void_at: string | null
          void_reason: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deal_id?: string | null
          due_date?: string | null
          filed_at?: string | null
          id?: string
          invoice_number?: string | null
          is_mock?: boolean
          issue_date?: string | null
          memo?: string | null
          nts_approval_number?: string | null
          paid_at?: string | null
          popbill_mgt_key?: string | null
          popbill_response?: Json | null
          project_id?: string | null
          status?: string
          subtotal_krw?: number
          supplier_id: string
          supply_date: string
          total_krw?: number
          updated_at?: string
          vat_krw?: number
          void_at?: string | null
          void_reason?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deal_id?: string | null
          due_date?: string | null
          filed_at?: string | null
          id?: string
          invoice_number?: string | null
          is_mock?: boolean
          issue_date?: string | null
          memo?: string | null
          nts_approval_number?: string | null
          paid_at?: string | null
          popbill_mgt_key?: string | null
          popbill_response?: Json | null
          project_id?: string | null
          status?: string
          subtotal_krw?: number
          supplier_id?: string
          supply_date?: string
          total_krw?: number
          updated_at?: string
          vat_krw?: number
          void_at?: string | null
          void_reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_organizer: boolean | null
          meeting_id: string
          response_status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          is_organizer?: boolean | null
          meeting_id: string
          response_status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_organizer?: boolean | null
          meeting_id?: string
          response_status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          assigned_admin_id: string | null
          calendar_sync_error: string | null
          calendar_sync_status: string
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number
          google_event_id: string | null
          ics_uid: string
          id: string
          meet_link: string | null
          project_id: string | null
          requested_at_options: Json
          scheduled_at: string | null
          status: string
          summary_md: string | null
          summary_sent_at: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          calendar_sync_error?: string | null
          calendar_sync_status?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          ics_uid?: string
          id?: string
          meet_link?: string | null
          project_id?: string | null
          requested_at_options?: Json
          scheduled_at?: string | null
          status?: string
          summary_md?: string | null
          summary_sent_at?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          calendar_sync_error?: string | null
          calendar_sync_status?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number
          google_event_id?: string | null
          ics_uid?: string
          id?: string
          meet_link?: string | null
          project_id?: string | null
          requested_at_options?: Json
          scheduled_at?: string | null
          status?: string
          summary_md?: string | null
          summary_sent_at?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          body: string | null
          created_at: string
          email_batch_id: string | null
          email_sent_at: string | null
          id: string
          in_app_seen_at: string | null
          kind: string
          payload: Json | null
          project_id: string | null
          severity: string
          title: string
          url_path: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_batch_id?: string | null
          email_sent_at?: string | null
          id?: string
          in_app_seen_at?: string | null
          kind: string
          payload?: Json | null
          project_id?: string | null
          severity: string
          title: string
          url_path?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          email_batch_id?: string | null
          email_sent_at?: string | null
          id?: string
          in_app_seen_at?: string | null
          kind?: string
          payload?: Json | null
          project_id?: string | null
          severity?: string
          title?: string
          url_path?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          challenge_updates_enabled: boolean
          digest_time_local: string
          email_digest_enabled: boolean
          email_immediate_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_updates_enabled?: boolean
          digest_time_local?: string
          email_digest_enabled?: boolean
          email_immediate_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_updates_enabled?: boolean
          digest_time_local?: string
          email_digest_enabled?: boolean
          email_immediate_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_unsubscribe_tokens: {
        Row: {
          created_at: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      preprod_boards: {
        Row: {
          approved_at: string | null
          approved_by_email: string | null
          cover_frame_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          project_id: string
          share_enabled: boolean
          share_password_hash: string | null
          share_recipient_email: string | null
          share_token: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_email?: string | null
          cover_frame_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          project_id: string
          share_enabled?: boolean
          share_password_hash?: string | null
          share_recipient_email?: string | null
          share_token?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by_email?: string | null
          cover_frame_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          project_id?: string
          share_enabled?: boolean
          share_password_hash?: string | null
          share_recipient_email?: string | null
          share_token?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preprod_boards_cover_frame_fk"
            columns: ["cover_frame_id"]
            isOneToOne: false
            referencedRelation: "preprod_frames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_boards_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      preprod_frame_comments: {
        Row: {
          author_display_name: string
          author_email: string | null
          author_user_id: string | null
          board_id: string
          body: string
          created_at: string
          frame_id: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          author_display_name: string
          author_email?: string | null
          author_user_id?: string | null
          board_id: string
          body: string
          created_at?: string
          frame_id: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          author_display_name?: string
          author_email?: string | null
          author_user_id?: string | null
          board_id?: string
          body?: string
          created_at?: string
          frame_id?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preprod_frame_comments_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "preprod_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_frame_comments_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "preprod_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      preprod_frame_reactions: {
        Row: {
          board_id: string
          created_at: string
          frame_id: string
          id: string
          reaction: string
          reactor_email: string
          reactor_name: string | null
          updated_at: string
        }
        Insert: {
          board_id: string
          created_at?: string
          frame_id: string
          id?: string
          reaction: string
          reactor_email: string
          reactor_name?: string | null
          updated_at?: string
        }
        Update: {
          board_id?: string
          created_at?: string
          frame_id?: string
          id?: string
          reaction?: string
          reactor_email?: string
          reactor_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preprod_frame_reactions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "preprod_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preprod_frame_reactions_frame_id_fkey"
            columns: ["frame_id"]
            isOneToOne: false
            referencedRelation: "preprod_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      preprod_frames: {
        Row: {
          board_id: string
          caption: string | null
          created_at: string
          director_note: string | null
          frame_order: number
          id: string
          is_current_revision: boolean
          media_embed_provider: string | null
          media_external_url: string | null
          media_storage_path: string | null
          media_type: string
          reference_ids: string[]
          revision: number
          revision_group: string
          thumbnail_path: string | null
          updated_at: string
        }
        Insert: {
          board_id: string
          caption?: string | null
          created_at?: string
          director_note?: string | null
          frame_order: number
          id?: string
          is_current_revision?: boolean
          media_embed_provider?: string | null
          media_external_url?: string | null
          media_storage_path?: string | null
          media_type: string
          reference_ids?: string[]
          revision?: number
          revision_group: string
          thumbnail_path?: string | null
          updated_at?: string
        }
        Update: {
          board_id?: string
          caption?: string | null
          created_at?: string
          director_note?: string | null
          frame_order?: number
          id?: string
          is_current_revision?: boolean
          media_embed_provider?: string | null
          media_external_url?: string | null
          media_storage_path?: string | null
          media_type?: string
          reference_ids?: string[]
          revision?: number
          revision_group?: string
          thumbnail_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preprod_frames_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "preprod_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          handle: string
          handle_changed_at: string | null
          id: string
          instagram_handle: string | null
          locale: string
          role: string | null
          role_switched_at: string | null
          team_chat_last_seen: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          handle: string
          handle_changed_at?: string | null
          id: string
          instagram_handle?: string | null
          locale?: string
          role?: string | null
          role_switched_at?: string | null
          team_chat_last_seen?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          handle_changed_at?: string | null
          id?: string
          instagram_handle?: string | null
          locale?: string
          role?: string | null
          role_switched_at?: string | null
          team_chat_last_seen?: Json
          updated_at?: string
        }
        Relationships: []
      }
      project_board_versions: {
        Row: {
          board_id: string
          created_at: string
          created_by: string | null
          document: Json
          id: string
          label: string | null
          version: number
        }
        Insert: {
          board_id: string
          created_at?: string
          created_by?: string | null
          document: Json
          id?: string
          label?: string | null
          version: number
        }
        Update: {
          board_id?: string
          created_at?: string
          created_by?: string | null
          document?: Json
          id?: string
          label?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_board_versions_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "project_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_board_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_boards: {
        Row: {
          asset_index: Json
          attached_pdfs: Json
          attached_urls: Json
          created_at: string
          document: Json
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          project_id: string
          schema_version: number
          source: string
          updated_at: string
        }
        Insert: {
          asset_index?: Json
          attached_pdfs?: Json
          attached_urls?: Json
          created_at?: string
          document?: Json
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          project_id: string
          schema_version?: number
          source: string
          updated_at?: string
        }
        Update: {
          asset_index?: Json
          attached_pdfs?: Json
          attached_urls?: Json
          created_at?: string
          document?: Json
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          project_id?: string
          schema_version?: number
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_boards_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_brief_assets: {
        Row: {
          byte_size: number
          id: string
          mime_type: string
          original_name: string | null
          project_id: string
          storage_key: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          byte_size: number
          id?: string
          mime_type: string
          original_name?: string | null
          project_id: string
          storage_key: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          byte_size?: number
          id?: string
          mime_type?: string
          original_name?: string | null
          project_id?: string
          storage_key?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_brief_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_brief_versions: {
        Row: {
          content_json: Json
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          project_id: string
          version_n: number
        }
        Insert: {
          content_json: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          project_id: string
          version_n: number
        }
        Update: {
          content_json?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          project_id?: string
          version_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_brief_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_briefs: {
        Row: {
          content_json: Json
          current_version: number
          project_id: string
          status: string
          tiptap_schema_version: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content_json?: Json
          current_version?: number
          project_id: string
          status?: string
          tiptap_schema_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content_json?: Json
          current_version?: number
          project_id?: string
          status?: string
          tiptap_schema_version?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          created_at: string
          external_urls: string[]
          id: string
          note: string | null
          project_id: string
          released_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_paths: string[]
          stream_ready_at: string | null
          stream_status: string | null
          stream_uid: string | null
          submitted_by: string
          version: number
        }
        Insert: {
          created_at?: string
          external_urls?: string[]
          id?: string
          note?: string | null
          project_id: string
          released_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_paths?: string[]
          stream_ready_at?: string | null
          stream_status?: string | null
          stream_uid?: string | null
          submitted_by: string
          version?: number
        }
        Update: {
          created_at?: string
          external_urls?: string[]
          id?: string
          note?: string | null
          project_id?: string
          released_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_paths?: string[]
          stream_ready_at?: string | null
          stream_status?: string | null
          stream_uid?: string | null
          submitted_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_guests: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          project_id: string
          workspace_member_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          project_id: string
          workspace_member_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          project_id?: string
          workspace_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_guests_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_guests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_guests_workspace_member_id_fkey"
            columns: ["workspace_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_licenses: {
        Row: {
          artist_share_percent: number
          campaign_name: string
          created_at: string
          created_by: string
          end_date: string | null
          fee_amount_krw: number
          fee_currency: string
          id: string
          project_id: string
          region: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          artist_share_percent?: number
          campaign_name: string
          created_at?: string
          created_by: string
          end_date?: string | null
          fee_amount_krw?: number
          fee_currency?: string
          id?: string
          project_id: string
          region?: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          artist_share_percent?: number
          campaign_name?: string
          created_at?: string
          created_by?: string
          end_date?: string | null
          fee_amount_krw?: number
          fee_currency?: string
          id?: string
          project_id?: string
          region?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_licenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_licenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          position: number
          project_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          position?: number
          project_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          position?: number
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_references: {
        Row: {
          added_by: string
          caption: string | null
          created_at: string
          duration_seconds: number | null
          embed_provider: string | null
          external_url: string | null
          id: string
          kind: string
          media_type: string
          note: string | null
          og_description: string | null
          og_image_url: string | null
          og_title: string | null
          page_count: number | null
          project_id: string
          sort_order: number
          storage_path: string | null
          tags: string[] | null
          thumbnail_path: string | null
          thumbnail_url: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          added_by: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          embed_provider?: string | null
          external_url?: string | null
          id?: string
          kind: string
          media_type?: string
          note?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_count?: number | null
          project_id: string
          sort_order?: number
          storage_path?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          added_by?: string
          caption?: string | null
          created_at?: string
          duration_seconds?: number | null
          embed_provider?: string | null
          external_url?: string | null
          id?: string
          kind?: string
          media_type?: string
          note?: string | null
          og_description?: string | null
          og_image_url?: string | null
          og_title?: string | null
          page_count?: number | null
          project_id?: string
          sort_order?: number
          storage_path?: string | null
          tags?: string[] | null
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_references_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_references_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_history: {
        Row: {
          actor_id: string | null
          actor_role: string
          comment: string | null
          from_status: string | null
          id: string
          project_id: string
          to_status: string
          transitioned_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_role: string
          comment?: string | null
          from_status?: string | null
          id?: string
          project_id: string
          to_status: string
          transitioned_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          comment?: string | null
          from_status?: string | null
          id?: string
          project_id?: string
          to_status?: string
          transitioned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_threads: {
        Row: {
          annotation_id: string | null
          created_at: string
          created_by: string
          deliverable_id: string | null
          id: string
          project_id: string
          title: string | null
        }
        Insert: {
          annotation_id?: string | null
          created_at?: string
          created_by: string
          deliverable_id?: string | null
          id?: string
          project_id: string
          title?: string | null
        }
        Update: {
          annotation_id?: string | null
          created_at?: string
          created_by?: string
          deliverable_id?: string | null
          id?: string
          project_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_threads_annotation_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "deliverable_annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_threads_deliverable_project_fkey"
            columns: ["project_id", "deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["project_id", "id"]
          },
          {
            foreignKeyName: "project_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          additional_notes: string | null
          brand_id: string | null
          brief: string | null
          budget_band: string | null
          channels: string[]
          created_at: string
          created_by: string
          deleted_at: string | null
          deliverable_share_enabled: boolean
          deliverable_share_recipient_email: string | null
          deliverable_share_token: string | null
          deliverable_types: string[]
          estimated_budget_range: string | null
          has_external_brand_party: boolean
          has_plan: string | null
          id: string
          intake_mode: string
          interested_in_twin: boolean
          kind: string
          meeting_preferred_at: string | null
          mood_keywords: string[]
          mood_keywords_free: string | null
          project_type: string
          proposal_audience: string | null
          proposal_budget_range: string | null
          proposal_goal: string | null
          proposal_timeline: string | null
          purpose: string[]
          revision_rounds_limit: number
          status: string
          submitted_at: string | null
          target_audience: string | null
          target_delivery_at: string | null
          title: string
          twin_intent: string
          updated_at: string
          visual_ratio: string | null
          visual_ratio_custom: string | null
          workspace_id: string
        }
        Insert: {
          additional_notes?: string | null
          brand_id?: string | null
          brief?: string | null
          budget_band?: string | null
          channels?: string[]
          created_at?: string
          created_by: string
          deleted_at?: string | null
          deliverable_share_enabled?: boolean
          deliverable_share_recipient_email?: string | null
          deliverable_share_token?: string | null
          deliverable_types?: string[]
          estimated_budget_range?: string | null
          has_external_brand_party?: boolean
          has_plan?: string | null
          id?: string
          intake_mode?: string
          interested_in_twin?: boolean
          kind?: string
          meeting_preferred_at?: string | null
          mood_keywords?: string[]
          mood_keywords_free?: string | null
          project_type?: string
          proposal_audience?: string | null
          proposal_budget_range?: string | null
          proposal_goal?: string | null
          proposal_timeline?: string | null
          purpose?: string[]
          revision_rounds_limit?: number
          status?: string
          submitted_at?: string | null
          target_audience?: string | null
          target_delivery_at?: string | null
          title: string
          twin_intent?: string
          updated_at?: string
          visual_ratio?: string | null
          visual_ratio_custom?: string | null
          workspace_id: string
        }
        Update: {
          additional_notes?: string | null
          brand_id?: string | null
          brief?: string | null
          budget_band?: string | null
          channels?: string[]
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          deliverable_share_enabled?: boolean
          deliverable_share_recipient_email?: string | null
          deliverable_share_token?: string | null
          deliverable_types?: string[]
          estimated_budget_range?: string | null
          has_external_brand_party?: boolean
          has_plan?: string | null
          id?: string
          intake_mode?: string
          interested_in_twin?: boolean
          kind?: string
          meeting_preferred_at?: string | null
          mood_keywords?: string[]
          mood_keywords_free?: string | null
          project_type?: string
          proposal_audience?: string | null
          proposal_budget_range?: string | null
          proposal_goal?: string | null
          proposal_timeline?: string | null
          purpose?: string[]
          revision_rounds_limit?: number
          status?: string
          submitted_at?: string | null
          target_audience?: string | null
          target_delivery_at?: string | null
          title?: string
          twin_intent?: string
          updated_at?: string
          visual_ratio?: string | null
          visual_ratio_custom?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      share_action_audit: {
        Row: {
          accepted: boolean
          action: string
          claimed_email: string | null
          created_at: string
          decision: string | null
          deliverable_id: string | null
          id: string
          ip: string | null
          recipient_email: string | null
          recipient_matched: boolean
          surface: string
          target_id: string
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          accepted: boolean
          action: string
          claimed_email?: string | null
          created_at?: string
          decision?: string | null
          deliverable_id?: string | null
          id?: string
          ip?: string | null
          recipient_email?: string | null
          recipient_matched: boolean
          surface: string
          target_id: string
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          accepted?: boolean
          action?: string
          claimed_email?: string | null
          created_at?: string
          decision?: string | null
          deliverable_id?: string | null
          id?: string
          ip?: string | null
          recipient_email?: string | null
          recipient_matched?: boolean
          surface?: string
          target_id?: string
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      showcase_challenge_winners: {
        Row: {
          announced_at: string
          announced_by: string
          challenge_id: string
          rank: number
          showcase_id: string | null
          submission_id: string
        }
        Insert: {
          announced_at?: string
          announced_by: string
          challenge_id: string
          rank?: number
          showcase_id?: string | null
          submission_id: string
        }
        Update: {
          announced_at?: string
          announced_by?: string
          challenge_id?: string
          rank?: number
          showcase_id?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_challenge_winners_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_challenge_winners_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "showcases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcase_challenge_winners_submission_challenge_consistency_fke"
            columns: ["challenge_id", "submission_id"]
            isOneToOne: false
            referencedRelation: "challenge_submissions"
            referencedColumns: ["challenge_id", "id"]
          },
          {
            foreignKeyName: "showcase_challenge_winners_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "challenge_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      showcase_media: {
        Row: {
          caption: string | null
          created_at: string
          embed_provider: string | null
          external_url: string | null
          id: string
          media_type: string
          showcase_id: string
          sort_order: number
          storage_path: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          embed_provider?: string | null
          external_url?: string | null
          id?: string
          media_type: string
          showcase_id: string
          sort_order: number
          storage_path?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          embed_provider?: string | null
          external_url?: string | null
          id?: string
          media_type?: string
          showcase_id?: string
          sort_order?: number
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "showcase_media_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "showcases"
            referencedColumns: ["id"]
          },
        ]
      }
      showcases: {
        Row: {
          badge_removal_approved_at: string | null
          badge_removal_approved_by: string | null
          badge_removal_requested: boolean
          board_id: string | null
          client_name_public: string | null
          cover_media_external_url: string | null
          cover_media_storage_path: string | null
          cover_media_type: string | null
          created_at: string
          created_by: string
          credits_md: string | null
          id: string
          is_password_protected: boolean
          made_with_yagi: boolean
          narrative_md: string | null
          og_image_path: string | null
          og_image_regenerated_at: string | null
          password_hash: string | null
          project_id: string
          published_at: string | null
          slug: string
          status: string
          subtitle: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          badge_removal_approved_at?: string | null
          badge_removal_approved_by?: string | null
          badge_removal_requested?: boolean
          board_id?: string | null
          client_name_public?: string | null
          cover_media_external_url?: string | null
          cover_media_storage_path?: string | null
          cover_media_type?: string | null
          created_at?: string
          created_by: string
          credits_md?: string | null
          id?: string
          is_password_protected?: boolean
          made_with_yagi?: boolean
          narrative_md?: string | null
          og_image_path?: string | null
          og_image_regenerated_at?: string | null
          password_hash?: string | null
          project_id: string
          published_at?: string | null
          slug: string
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          badge_removal_approved_at?: string | null
          badge_removal_approved_by?: string | null
          badge_removal_requested?: boolean
          board_id?: string | null
          client_name_public?: string | null
          cover_media_external_url?: string | null
          cover_media_storage_path?: string | null
          cover_media_type?: string | null
          created_at?: string
          created_by?: string
          credits_md?: string | null
          id?: string
          is_password_protected?: boolean
          made_with_yagi?: boolean
          narrative_md?: string | null
          og_image_path?: string | null
          og_image_regenerated_at?: string | null
          password_hash?: string | null
          project_id?: string
          published_at?: string | null
          slug?: string
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "showcases_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "preprod_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "showcases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          member_count: string | null
          studio_name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id: string
          member_count?: string | null
          studio_name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          member_count?: string | null
          studio_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studios_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_profile: {
        Row: {
          address: string
          business_item: string | null
          business_registration_number: string
          business_type: string | null
          contact_email: string
          contact_phone: string | null
          corporate_name: string
          created_at: string
          default_rates: Json
          id: string
          representative_name: string
          updated_at: string
        }
        Insert: {
          address: string
          business_item?: string | null
          business_registration_number: string
          business_type?: string | null
          contact_email: string
          contact_phone?: string | null
          corporate_name: string
          created_at?: string
          default_rates?: Json
          id?: string
          representative_name: string
          updated_at?: string
        }
        Update: {
          address?: string
          business_item?: string | null
          business_registration_number?: string
          business_type?: string | null
          contact_email?: string
          contact_phone?: string | null
          corporate_name?: string
          created_at?: string
          default_rates?: Json
          id?: string
          representative_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          thread_id: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          thread_id: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_threads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      team_channel_message_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          message_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_channel_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "team_channel_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      team_channel_messages: {
        Row: {
          author_id: string
          body: string
          channel_id: string
          created_at: string
          edited_at: string | null
          id: string
        }
        Insert: {
          author_id: string
          body: string
          channel_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          channel_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_channel_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "team_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      team_channels: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          name: string
          slug: string
          topic: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_archived?: boolean
          name: string
          slug: string
          topic?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          name?: string
          slug?: string
          topic?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_channels_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_message_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          thumbnail_path: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind: string
          message_id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          thumbnail_path?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          message_id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          thumbnail_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thread_message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          attachments: Json
          author_id: string
          body: string | null
          created_at: string
          edited_at: string | null
          id: string
          parent_message_id: string | null
          thread_id: string
          visibility: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_message_id?: string | null
          thread_id: string
          visibility?: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_message_id?: string | null
          thread_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "project_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_persona_assets: {
        Row: {
          asset_type: string | null
          created_at: string
          file_name: string | null
          id: string
          note: string | null
          persona_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          note?: string | null
          persona_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string
          file_name?: string | null
          id?: string
          note?: string | null
          persona_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twin_persona_assets_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "twin_personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "twin_persona_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_personas: {
        Row: {
          artist_workspace_id: string
          cover_asset_path: string | null
          created_at: string
          description: string | null
          id: string
          min_fee: number | null
          min_fee_public: boolean
          name: string | null
          persona_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          artist_workspace_id: string
          cover_asset_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          min_fee?: number | null
          min_fee_public?: boolean
          name?: string | null
          persona_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          artist_workspace_id?: string
          cover_asset_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          min_fee?: number | null
          min_fee_public?: boolean
          name?: string | null
          persona_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_personas_artist_profile_fkey"
            columns: ["artist_workspace_id"]
            isOneToOne: false
            referencedRelation: "artist_profile"
            referencedColumns: ["workspace_id"]
          },
          {
            foreignKeyName: "twin_personas_artist_workspace_id_fkey"
            columns: ["artist_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          project_id: string | null
          role: string
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          project_id?: string | null
          role: string
          token: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          project_id?: string | null
          role?: string
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          brand_guide: Json
          business_address: string | null
          business_item: string | null
          business_registration_number: string | null
          business_type: string | null
          created_at: string
          id: string
          is_test: boolean
          kind: string
          logo_url: string | null
          name: string
          plan: string
          representative_name: string | null
          slug: string
          tax_id: string | null
          tax_invoice_email: string | null
          updated_at: string
        }
        Insert: {
          brand_guide?: Json
          business_address?: string | null
          business_item?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          kind?: string
          logo_url?: string | null
          name: string
          plan?: string
          representative_name?: string | null
          slug: string
          tax_id?: string | null
          tax_invoice_email?: string | null
          updated_at?: string
        }
        Update: {
          brand_guide?: Json
          business_address?: string | null
          business_item?: string | null
          business_registration_number?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          is_test?: boolean
          kind?: string
          logo_url?: string | null
          name?: string
          plan?: string
          representative_name?: string | null
          slug?: string
          tax_id?: string | null
          tax_invoice_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_guest_invitation: {
        Args: { p_token: string }
        Returns: {
          project_id: string
          workspace_id: string
        }[]
      }
      add_project_board_pdf: {
        Args: {
          p_board_id: string
          p_filename: string
          p_size_bytes: number
          p_storage_key: string
        }
        Returns: string
      }
      add_project_board_url: {
        Args: {
          p_board_id: string
          p_note: string
          p_provider: string
          p_thumbnail_url: string
          p_title: string
          p_url: string
        }
        Returns: string
      }
      assert_caller_bound_pdf_storage_key: {
        Args: { p_board_id: string; p_caller_id: string; p_storage_key: string }
        Returns: undefined
      }
      bootstrap_workspace: {
        Args: { p_logo_url?: string; p_name: string; p_slug: string }
        Returns: string
      }
      change_handle: { Args: { new_handle_input: string }; Returns: undefined }
      convert_commission_to_project: {
        Args: { p_commission_id: string }
        Returns: Json
      }
      create_deal: {
        Args: {
          p_brand_workspace_id: string
          p_brief?: string
          p_persona_id: string
          p_proposed_budget?: number
          p_usage_types?: string[]
        }
        Returns: string
      }
      create_deliverable_annotation: {
        Args: {
          p_asset_index: number
          p_body?: string
          p_coords: Json
          p_deliverable_id: string
          p_project_id: string
          p_shape: string
          p_timestamp_sec?: number
          p_visibility?: string
        }
        Returns: {
          annotation_id: string
          annotation_seq: number
          annotation_thread_id: string
        }[]
      }
      create_invoice_from_deal: { Args: { p_deal_id: string }; Returns: string }
      create_meeting_with_attendees: {
        Args: {
          p_attendees: Json
          p_created_by: string
          p_description?: string
          p_duration_minutes: number
          p_project_id: string
          p_scheduled_at: string
          p_title: string
          p_workspace_id: string
        }
        Returns: string
      }
      deliverable_annotation_coords_valid: {
        Args: { p_coords: Json; p_shape: string }
        Returns: boolean
      }
      deliverable_seen_by_client: {
        Args: { p_deliverable_id: string }
        Returns: boolean
      }
      deliverable_seen_by_yagi: {
        Args: { p_deliverable_id: string }
        Returns: boolean
      }
      find_user_by_email: { Args: { p_email: string }; Returns: string }
      get_admin_invoice_sandbox_metrics: {
        Args: {
          p_include_test?: boolean
          p_month_start?: string
          p_today?: string
          p_year_start?: string
        }
        Returns: {
          mock_count: number
          mock_total_krw: number
          mtd_total_krw: number
          overdue_count: number
          overdue_total_krw: number
          status_counts: Json
          ytd_total_krw: number
        }[]
      }
      get_submission_vote_counts: {
        Args: { p_challenge_id: string }
        Returns: {
          submission_id: string
          vote_count: number
        }[]
      }
      increment_showcase_view: { Args: { sid: string }; Returns: number }
      init_project_board: { Args: { p_project_id: string }; Returns: string }
      is_artist_workspace_member: {
        Args: { uid: string; wsid: string }
        Returns: boolean
      }
      is_handle_available: { Args: { candidate: string }; Returns: boolean }
      is_project_guest: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      is_valid_deal_transition: {
        Args: { p_from: string; p_role: string; p_to: string }
        Returns: boolean
      }
      is_valid_transition: {
        Args: { actor_role: string; from_status: string; to_status: string }
        Returns: boolean
      }
      is_ws_admin: { Args: { uid: string; wsid: string }; Returns: boolean }
      is_ws_member: { Args: { uid: string; wsid: string }; Returns: boolean }
      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
      is_yagi_internal_ws: { Args: { ws_id: string }; Returns: boolean }
      list_discoverable_personas: {
        Args: never
        Returns: {
          cover_asset_path: string
          description: string
          id: string
          min_fee: number
          name: string
          persona_type: string
          status: string
        }[]
      }
      mark_invoice_paid: { Args: { p_invoice_id: string }; Returns: undefined }
      next_deliverable_version: {
        Args: { p_project_id: string }
        Returns: number
      }
      record_deal_payment: {
        Args: {
          p_amount?: number
          p_deal_id: string
          p_event_type: string
          p_invoice_ref?: string
          p_note?: string
        }
        Returns: undefined
      }
      remove_project_board_attachment: {
        Args: { p_attachment_id: string; p_board_id: string; p_kind: string }
        Returns: boolean
      }
      resolve_user_ids_by_emails: {
        Args: { p_emails: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      save_brief_version: {
        Args: { p_label?: string; p_project_id: string }
        Returns: Json
      }
      seed_project_board_from_wizard: {
        Args: {
          p_initial_asset_index?: Json
          p_initial_attached_pdfs?: Json
          p_initial_attached_urls?: Json
          p_initial_document: Json
          p_project_id: string
        }
        Returns: string
      }
      set_deliverable_annotation_status: {
        Args: { p_annotation_id: string; p_status: string }
        Returns: {
          annotation_id: string
          resolved_at: string
          resolved_by: string
          status: string
        }[]
      }
      set_project_revision_rounds_limit: {
        Args: { p_limit: number; p_project_id: string }
        Returns: undefined
      }
      toggle_project_board_lock: {
        Args: { p_board_id: string; p_locked: boolean }
        Returns: undefined
      }
      transition_deal_status: {
        Args: { p_comment?: string; p_deal_id: string; p_to_status: string }
        Returns: undefined
      }
      transition_project_status: {
        Args: { p_comment?: string; p_project_id: string; p_to_status: string }
        Returns: string
      }
      update_project_board_url_note: {
        Args: { p_attachment_id: string; p_board_id: string; p_note: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
