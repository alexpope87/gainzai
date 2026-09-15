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
      analyses: {
        Row: {
          created_at: string
          data_notes: string | null
          date: string
          forza: string
          id: string
          macro: string
          peso: string
          priorita: string
          recupero: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_notes?: string | null
          date?: string
          forza?: string
          id?: string
          macro?: string
          peso?: string
          priorita?: string
          recupero?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_notes?: string | null
          date?: string
          forza?: string
          id?: string
          macro?: string
          peso?: string
          priorita?: string
          recupero?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          count: number
          created_at: string
          day: string
          endpoint: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          day?: string
          endpoint: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          day?: string
          endpoint?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          hunger: number | null
          id: string
          notes: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          stress: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          energy?: number | null
          hunger?: number | null
          id?: string
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          hunger?: number | null
          id?: string
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      macro_estimates_cache: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          hits: number
          id: string
          items: string[]
          kcal: number
          protein_g: number
          text_hash: string
          text_normalized: string
          updated_at: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          hits?: number
          id?: string
          items?: string[]
          kcal?: number
          protein_g?: number
          text_hash: string
          text_normalized: string
          updated_at?: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          hits?: number
          id?: string
          items?: string[]
          kcal?: number
          protein_g?: number
          text_hash?: string
          text_normalized?: string
          updated_at?: string
        }
        Relationships: []
      }
      meal_plan_days: {
        Row: {
          carbs_g: number | null
          cena: string
          colazione: string
          created_at: string
          fat_g: number | null
          id: string
          kcal: number | null
          pranzo: string
          protein_g: number | null
          spuntini: string
          updated_at: string
          user_id: string
          weekday: number
        }
        Insert: {
          carbs_g?: number | null
          cena?: string
          colazione?: string
          created_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          pranzo?: string
          protein_g?: number | null
          spuntini?: string
          updated_at?: string
          user_id: string
          weekday: number
        }
        Update: {
          carbs_g?: number | null
          cena?: string
          colazione?: string
          created_at?: string
          fat_g?: number | null
          id?: string
          kcal?: number | null
          pranzo?: string
          protein_g?: number | null
          spuntini?: string
          updated_at?: string
          user_id?: string
          weekday?: number
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          cena: string
          colazione: string
          created_at: string
          id: string
          mode: string
          notes: string | null
          pranzo: string
          spuntini: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cena?: string
          colazione?: string
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          pranzo?: string
          spuntini?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cena?: string
          colazione?: string
          created_at?: string
          id?: string
          mode?: string
          notes?: string | null
          pranzo?: string
          spuntini?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meals: {
        Row: {
          carbs_g: number
          created_at: string
          date: string
          description: string
          fat_g: number
          id: string
          kcal: number
          meal_type: string
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          date?: string
          description: string
          fat_g?: number
          id?: string
          kcal?: number
          meal_type?: string
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          date?: string
          description?: string
          fat_g?: number
          id?: string
          kcal?: number
          meal_type?: string
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          height_cm: number | null
          id: string
          name: string | null
          onboarded: boolean
          target_carbs_g: number | null
          target_fat_g: number | null
          target_kcal: number | null
          target_protein_g: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          height_cm?: number | null
          id: string
          name?: string | null
          onboarded?: boolean
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          name?: string | null
          onboarded?: boolean
          target_carbs_g?: number | null
          target_fat_g?: number | null
          target_kcal?: number | null
          target_protein_g?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      program_days: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          program_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          program_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          program_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          created_at: string
          day_id: string
          id: string
          name: string
          notes: string | null
          order_index: number
          target_reps_max: number
          target_reps_min: number
          target_rir: number | null
          target_sets: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          target_reps_max?: number
          target_reps_min?: number
          target_rir?: number | null
          target_sets?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          target_reps_max?: number
          target_reps_min?: number
          target_rir?: number | null
          target_sets?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          created_at: string
          date: string
          day_id: string | null
          day_name: string | null
          effort: number | null
          id: string
          motivation: number | null
          notes: string | null
          pump: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          day_id?: string | null
          day_name?: string | null
          effort?: number | null
          id?: string
          motivation?: number | null
          notes?: string | null
          pump?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_id?: string | null
          day_name?: string | null
          effort?: number | null
          id?: string
          motivation?: number | null
          notes?: string | null
          pump?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          reps: number | null
          rir: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          reps?: number | null
          rir?: number | null
          session_id: string
          set_index: number
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          reps?: number | null
          rir?: number | null
          session_id?: string
          set_index?: number
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_macro_estimate_hit: {
        Args: { _text_hash: string }
        Returns: undefined
      }
      consume_rate_limit: {
        Args: { _endpoint: string; _limit: number; _user_id: string }
        Returns: {
          allowed: boolean
          remaining: number
          used: number
        }[]
      }
      get_rate_limit_usage: {
        Args: { _endpoint: string; _user_id: string }
        Returns: number
      }
      upsert_macro_estimate: {
        Args: {
          _carbs_g: number
          _fat_g: number
          _items: string[]
          _kcal: number
          _protein_g: number
          _text_hash: string
          _text_normalized: string
        }
        Returns: undefined
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
