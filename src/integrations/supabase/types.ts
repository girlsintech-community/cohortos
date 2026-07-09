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
      allowed_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      badges: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      challenge_submissions: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          notes: string | null
          screenshot_url: string | null
          solution_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          notes?: string | null
          screenshot_url?: string | null
          solution_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          screenshot_url?: string | null
          solution_url?: string | null
          status?: string
          user_id?: string
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
            foreignKeyName: "challenge_submissions_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          id: string
          is_active: boolean
          link: string | null
          title: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description: string
          difficulty: string
          id?: string
          is_active?: boolean
          link?: string | null
          title: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          id?: string
          is_active?: boolean
          link?: string | null
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      cohort_todos: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      community_reactions: {
        Row: {
          created_at: string
          giver_id: string
          id: string
          reaction_type: string
          receiver_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          giver_id: string
          id?: string
          reaction_type: string
          receiver_id: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          giver_id?: string
          id?: string
          reaction_type?: string
          receiver_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_giver_id_fkey"
            columns: ["giver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          discussion_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          discussion_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          discussion_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          tag: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          tag?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          tag?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_reports: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      masterclasses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          speaker_bio: string | null
          speaker_designation: string | null
          speaker_linkedin: string | null
          speaker_name: string
          title: string
          watch_link: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          speaker_bio?: string | null
          speaker_designation?: string | null
          speaker_linkedin?: string | null
          speaker_name: string
          title: string
          watch_link: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          speaker_bio?: string | null
          speaker_designation?: string | null
          speaker_linkedin?: string | null
          speaker_name?: string
          title?: string
          watch_link?: string
        }
        Relationships: []
      }
      mentor_appreciations: {
        Row: {
          card_type: string
          created_at: string
          id: string
          mentor_id: string
          message: string | null
          student_id: string
          week_start: string
          xp_bonus: number
        }
        Insert: {
          card_type: string
          created_at?: string
          id?: string
          mentor_id: string
          message?: string | null
          student_id: string
          week_start?: string
          xp_bonus?: number
        }
        Update: {
          card_type?: string
          created_at?: string
          id?: string
          mentor_id?: string
          message?: string | null
          student_id?: string
          week_start?: string
          xp_bonus?: number
        }
        Relationships: [
          {
            foreignKeyName: "mentor_appreciations_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentor_appreciations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_todos: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_guides: {
        Row: {
          body: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pod_members: {
        Row: {
          added_at: string
          id: string
          member_role: string
          pod_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          member_role?: string
          pod_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          member_role?: string
          pod_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_members_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pod_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pod_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          pod_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          pod_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          pod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pod_messages_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          mentor_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mentor_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          mentor_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pods_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_profile_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          branch: string | null
          city: string | null
          college: string | null
          course: string | null
          created_at: string
          display_name: string
          github_url: string | null
          graduation_year: number | null
          id: string
          last_active_date: string | null
          level: number
          linkedin_url: string | null
          onboarded: boolean
          primary_role: Database["public"]["Enums"]["app_role"] | null
          skills: string[]
          state: string | null
          streak: number
          updated_at: string
          username: string | null
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          city?: string | null
          college?: string | null
          course?: string | null
          created_at?: string
          display_name: string
          github_url?: string | null
          graduation_year?: number | null
          id: string
          last_active_date?: string | null
          level?: number
          linkedin_url?: string | null
          onboarded?: boolean
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          skills?: string[]
          state?: string | null
          streak?: number
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          branch?: string | null
          city?: string | null
          college?: string | null
          course?: string | null
          created_at?: string
          display_name?: string
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          last_active_date?: string | null
          level?: number
          linkedin_url?: string | null
          onboarded?: boolean
          primary_role?: Database["public"]["Enums"]["app_role"] | null
          skills?: string[]
          state?: string | null
          streak?: number
          updated_at?: string
          username?: string | null
          xp?: number
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          title: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          url?: string
        }
        Relationships: []
      }
      speed_networking_matches: {
        Row: {
          created_at: string
          id: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      speed_networking_queue: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          awarded_by: string | null
          badge_id: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          awarded_at?: string
          awarded_by?: string | null
          badge_id?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_awarded_by_fkey"
            columns: ["awarded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_guide_confirmations: {
        Row: {
          confirmed_at: string
          guide_version: string
          id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string
          guide_version?: string
          id?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string
          guide_version?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_guide_confirmations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      user_screen_time: {
        Row: {
          date: string
          id: string
          seconds_spent: number
          user_id: string
        }
        Insert: {
          date?: string
          id?: string
          seconds_spent?: number
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          seconds_spent?: number
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          best_count: number
          current_count: number
          id: string
          last_activity_date: string | null
          streak_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          best_count?: number
          current_count?: number
          id?: string
          last_activity_date?: string | null
          streak_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          best_count?: number
          current_count?: number
          id?: string
          last_activity_date?: string | null
          streak_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_todo_completions: {
        Row: {
          completed_at: string
          id: string
          todo_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          todo_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          todo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_todo_completions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "cohort_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_submission: {
        Args: { _submission_id: string }
        Returns: undefined
      }
      award_xp: {
        Args: { _amount: number; _meta?: Json; _type: string; _user: string }
        Returns: undefined
      }
      find_profile_by_email: { Args: { _email: string }; Returns: string }
      get_leaderboard_scores: {
        Args: never
        Returns: {
          community_score: number
          dsa_score: number
          mentor_score: number
          project_score: number
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
      increment_screen_time: {
        Args: { seconds_to_add: number }
        Returns: undefined
      }
      is_email_allowed: { Args: { _email: string }; Returns: boolean }
      is_pod_member: {
        Args: { _pod_id: string; _user_id: string }
        Returns: boolean
      }
      level_from_xp: { Args: { _xp: number }; Returns: number }
      level_name_from_level: { Args: { _level: number }; Returns: string }
      notify_mentions_from_text: {
        Args: {
          _link: string
          _source_user: string
          _text: string
          _title_prefix: string
        }
        Returns: undefined
      }
      record_daily_login: { Args: never; Returns: boolean }
      request_speed_match: {
        Args: never
        Returns: {
          match_id: string
          partner_id: string
          status: string
        }[]
      }
      set_user_primary_role: {
        Args: { _role: string; _target: string }
        Returns: undefined
      }
      touch_user_streak: {
        Args: { _streak_type: string; _user: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "mentee" | "mentor" | "team_member" | "admin"
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
      app_role: ["mentee", "mentor", "team_member", "admin"],
    },
  },
} as const
