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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      client_logos: {
        Row: {
          batting_back_hand_logo_filename: string | null
          batting_back_hand_logo_url: string | null
          batting_back_wrist_logo_filename: string | null
          batting_back_wrist_logo_url: string | null
          batting_front_wrist_logo_filename: string | null
          batting_front_wrist_logo_url: string | null
          id: string
          palm_logo_filename: string | null
          palm_logo_url: string | null
          thumb_logo_filename: string | null
          thumb_logo_url: string | null
          uploaded_at: string
          user_id: string
          version: number
          wrist_logo_filename: string | null
          wrist_logo_url: string | null
        }
        Insert: {
          batting_back_hand_logo_filename?: string | null
          batting_back_hand_logo_url?: string | null
          batting_back_wrist_logo_filename?: string | null
          batting_back_wrist_logo_url?: string | null
          batting_front_wrist_logo_filename?: string | null
          batting_front_wrist_logo_url?: string | null
          id?: string
          palm_logo_filename?: string | null
          palm_logo_url?: string | null
          thumb_logo_filename?: string | null
          thumb_logo_url?: string | null
          uploaded_at?: string
          user_id: string
          version?: number
          wrist_logo_filename?: string | null
          wrist_logo_url?: string | null
        }
        Update: {
          batting_back_hand_logo_filename?: string | null
          batting_back_hand_logo_url?: string | null
          batting_back_wrist_logo_filename?: string | null
          batting_back_wrist_logo_url?: string | null
          batting_front_wrist_logo_filename?: string | null
          batting_front_wrist_logo_url?: string | null
          id?: string
          palm_logo_filename?: string | null
          palm_logo_url?: string | null
          thumb_logo_filename?: string | null
          thumb_logo_url?: string | null
          uploaded_at?: string
          user_id?: string
          version?: number
          wrist_logo_filename?: string | null
          wrist_logo_url?: string | null
        }
        Relationships: []
      }
      order_images: {
        Row: {
          angle: number
          captured_at: string
          id: string
          image_url: string
          order_id: string
        }
        Insert: {
          angle: number
          captured_at?: string
          id?: string
          image_url: string
          order_id: string
        }
        Update: {
          angle?: number
          captured_at?: string
          id?: string
          image_url?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_images_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          builder_recipe_url: string | null
          hand: string | null
          has_flag: boolean | null
          id: string
          leather_type: string | null
          line_total: number
          notes: string | null
          order_id: string
          position: string | null
          product_id: string
          product_name: string
          quantity: number
          size: string | null
          unit_price: number
        }
        Insert: {
          builder_recipe_url?: string | null
          hand?: string | null
          has_flag?: boolean | null
          id?: string
          leather_type?: string | null
          line_total: number
          notes?: string | null
          order_id: string
          position?: string | null
          product_id: string
          product_name: string
          quantity?: number
          size?: string | null
          unit_price: number
        }
        Update: {
          builder_recipe_url?: string | null
          hand?: string | null
          has_flag?: boolean | null
          id?: string
          leather_type?: string | null
          line_total?: number
          notes?: string | null
          order_id?: string
          position?: string | null
          product_id?: string
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          order_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          order_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          logo_change_notes: string | null
          logo_change_requested: boolean | null
          notes: string | null
          order_number: string
          pdf_generated_at: string | null
          pdf_url: string | null
          status: string
          status_updated_at: string | null
          stripe_payment_intent_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_change_notes?: string | null
          logo_change_requested?: boolean | null
          notes?: string | null
          order_number?: string
          pdf_generated_at?: string | null
          pdf_url?: string | null
          status?: string
          status_updated_at?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_change_notes?: string | null
          logo_change_requested?: boolean | null
          notes?: string | null
          order_number?: string
          pdf_generated_at?: string | null
          pdf_url?: string | null
          status?: string
          status_updated_at?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          base_price: number
          category: string
          created_at: string
          description: string | null
          flag_upcharge: number | null
          has_hand_option: boolean | null
          id: string
          is_active: boolean | null
          japanese_kip_upcharge: number | null
          lead_time: string | null
          leather_options: Json | null
          leather_price_overrides: Json | null
          min_order_qty: number
          name: string
          position_options: Json | null
          show_recipe_url: boolean | null
          stock_min_qty: number | null
          stock_price: number | null
          updated_at: string
        }
        Insert: {
          base_price: number
          category?: string
          created_at?: string
          description?: string | null
          flag_upcharge?: number | null
          has_hand_option?: boolean | null
          id?: string
          is_active?: boolean | null
          japanese_kip_upcharge?: number | null
          lead_time?: string | null
          leather_options?: Json | null
          leather_price_overrides?: Json | null
          min_order_qty?: number
          name: string
          position_options?: Json | null
          show_recipe_url?: boolean | null
          stock_min_qty?: number | null
          stock_price?: number | null
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string
          created_at?: string
          description?: string | null
          flag_upcharge?: number | null
          has_hand_option?: boolean | null
          id?: string
          is_active?: boolean | null
          japanese_kip_upcharge?: number | null
          lead_time?: string | null
          leather_options?: Json | null
          leather_price_overrides?: Json | null
          min_order_qty?: number
          name?: string
          position_options?: Json | null
          show_recipe_url?: boolean | null
          stock_min_qty?: number | null
          stock_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          stripe_customer_id: string | null
          subscription_started_at: string | null
          subscription_status: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          stripe_customer_id?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
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
      app_role: ["admin", "client"],
    },
  },
} as const
