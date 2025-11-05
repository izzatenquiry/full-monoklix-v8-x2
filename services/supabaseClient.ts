import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xbbhllhgbachkzvpxvam.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiYmhsbGhnYmFjaGt6dnB4dmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4Njk1NjksImV4cCI6MjA3MzQ0NTU2OX0.l--gaQSJ5hPnJyZOC9-QsRRQjr-hnsX_WeGSglbNP8E';

// Define types for your database for type-safe queries
export interface Database {
  public: {
    Tables: {
      trial_user: {
        Row: {
          id: number
          created_at: string
          username: string
          phone: string
          email: string
          storyboard_usage_count: number
        }
        Insert: {
          id?: number
          created_at?: string
          username: string
          phone: string
          email: string
          storyboard_usage_count?: number
        }
        Update: {
          username?: string
          phone?: string
          email?: string
          storyboard_usage_count?: number
        }
        Relationships: []
      }
      master_api_key: {
        Row: {
          id: number
          created_at: string
          api_key: string
        }
        Insert: {
          id?: number
          created_at?: string
          api_key: string
        }
        Update: {
          api_key?: string
        }
        Relationships: []
      }
      token_new_active: {
        Row: {
          id: number
          created_at: string
          token: string
          status: string | null
          total_user: number | null
        }
        Insert: {
          id?: number
          created_at?: string
          token: string
          status?: string | null
          total_user?: number | null
        }
        Update: {
          token?: string
          status?: string | null
          total_user?: number | null
        }
        Relationships: []
      }
      users: {
        Row: { // The data coming from the database
          id: string
          created_at: string
          full_name: string | null
          email: string
          phone: string
          // FIX: Use string literals instead of circular enum reference for correct type inference
          role: 'admin' | 'user'
          // FIX: Use string literals to include 'subscription' status
          status: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin' | 'subscription'
          api_key: string | null
          avatar_url: string | null
          subscription_expiry: string | null
          webhook_url: string | null
          total_image: number | null
          total_video: number | null
          last_seen_at: string | null
          force_logout_at: string | null
          app_version: string | null
          personal_auth_token: string | null
          proxy_server: string | null
        }
        Insert: { // The data you can insert
          id?: string // id is auto-generated
          created_at?: string
          full_name?: string | null
          email: string
          phone: string
          // FIX: Use string literals to include 'subscription' status
          role?: 'admin' | 'user'
          // FIX: Use string literals to include 'subscription' status
          status?: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin' | 'subscription'
          api_key?: string | null
          avatar_url?: string | null
          subscription_expiry?: string | null
          webhook_url?: string | null
          total_image?: number | null
          total_video?: number | null
          last_seen_at?: string | null
          force_logout_at?: string | null
          app_version?: string | null
          personal_auth_token?: string | null
          proxy_server?: string | null
        }
        Update: { // The data you can update
          full_name?: string | null
          email?: string
          phone?: string
          // FIX: Use string literals to include 'subscription' status
          role?: 'admin' | 'user'
          // FIX: Use string literals to include 'subscription' status
          status?: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin' | 'subscription'
          api_key?: string | null
          avatar_url?: string | null
          subscription_expiry?: string | null
          webhook_url?: string | null
          total_image?: number | null
          total_video?: number | null
          last_seen_at?: string | null
          force_logout_at?: string | null
          app_version?: string | null
          personal_auth_token?: string | null
          proxy_server?: string | null
        }
        // FIX: Added Relationships array to fix Supabase type inference issues, resolving 'never' types.
        Relationships: []
      }
      activity_log: {
        Row: {
          id: number
          created_at: string
          user_id: string
          activity_type: string
          username: string | null
          email: string | null
          // New structured fields
          model: string | null
          prompt: string | null
          output: string | null
          token_count: number | null
          status: string | null
          error_message: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          user_id: string
          username: string
          email: string
          activity_type: string
          // New structured fields (all optional)
          model?: string | null
          prompt?: string | null
          output?: string | null
          token_count?: number | null
          status?: string | null
          error_message?: string | null
        }
        Update: {}
        Relationships: [
          {
            foreignKeyName: 'activity_log_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      prompt_viral_my: {
        Row: {
          id: number
          created_at: string
          title: string
          author: string
          image_url: string
          prompt: string
        }
        Insert: {
          id?: number
          created_at?: string
          title: string
          author: string
          image_url: string
          prompt: string
        }
        Update: {
          title?: string
          author?: string
          image_url?: string
          prompt?: string
        }
        Relationships: []
      }
      generated_api_keys: {
        Row: {
          id: number
          created_at: string
          api_key: string
          claimed_by_user_id: string | null
          claimed_by_username: string | null
          claimed_at: string | null
        }
        Insert: {
          id?: number
          created_at?: string
          api_key: string
          claimed_by_user_id?: string | null
          claimed_by_username?: string | null
          claimed_at?: string | null
        }
        Update: {
          claimed_by_user_id?: string | null
          claimed_by_username?: string | null
          claimed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'generated_api_keys_claimed_by_user_id_fkey'
            columns: ['claimed_by_user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      proxy_server_throttle: {
        Row: {
          id: number;
          server_url: string;
          last_acquired_at: string;
        };
        Insert: {
          id?: number;
          server_url: string;
          last_acquired_at?: string;
        };
        Update: {
          id?: number;
          server_url?: string;
          last_acquired_at?: string;
        };
        Relationships: [];
      }
    }
    // FIX: Added 'token_new_active' view definition to resolve type errors in queries.
    Views: {
      [_ in never]: never
    }
    // FIX: Added RPC function definition to resolve 'never' type errors in rpc calls.
    Functions: {
      request_generation_slot: {
        Args: {
          cooldown_seconds: number
          server_url: string
        }
        Returns: boolean
      }
      // FIX: Add missing RPC function definition for 'increment_token_if_available' to resolve type error.
      increment_token_if_available: {
        Args: {
          token_to_check: string;
        };
        Returns: boolean;
      };
    }
    Enums: {
      user_role: 'admin' | 'user'
      user_status: 'pending_payment' | 'trial' | 'inactive' | 'lifetime' | 'admin' | 'subscription'
    }
    CompositeTypes: {}
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);