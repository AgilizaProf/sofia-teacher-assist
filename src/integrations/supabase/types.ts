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
      agenda_eventos: {
        Row: {
          client_id: string | null
          created_at: string
          data: Json
          data_evento: string
          hora: string | null
          id: string
          notas: string | null
          tipo: string | null
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          data?: Json
          data_evento: string
          hora?: string | null
          id?: string
          notas?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          data?: Json
          data_evento?: string
          hora?: string | null
          id?: string
          notas?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alunos_anamnese: {
        Row: {
          aluno_client_id: string
          created_at: string
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aluno_client_id: string
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aluno_client_id?: string
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alunos_inclusao: {
        Row: {
          aee: string | null
          cid: string | null
          client_id: string | null
          condicao: string | null
          created_at: string
          data: Json
          id: string
          idade: number | null
          nivel_suporte: string | null
          nome: string
          observacoes: string | null
          turma: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aee?: string | null
          cid?: string | null
          client_id?: string | null
          condicao?: string | null
          created_at?: string
          data?: Json
          id?: string
          idade?: number | null
          nivel_suporte?: string | null
          nome: string
          observacoes?: string | null
          turma?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aee?: string | null
          cid?: string | null
          client_id?: string | null
          condicao?: string | null
          created_at?: string
          data?: Json
          id?: string
          idade?: number | null
          nivel_suporte?: string | null
          nome?: string
          observacoes?: string | null
          turma?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alunos_registros: {
        Row: {
          aluno_client_id: string
          created_at: string
          data: Json
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aluno_client_id: string
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aluno_client_id?: string
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: string
          key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pareceres: {
        Row: {
          aluno_client_id: string | null
          aluno_nome: string | null
          bimestre: string | null
          client_id: string | null
          created_at: string
          data: Json
          id: string
          texto: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aluno_client_id?: string | null
          aluno_nome?: string | null
          bimestre?: string | null
          client_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          texto?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aluno_client_id?: string | null
          aluno_nome?: string | null
          bimestre?: string | null
          client_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          texto?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      planos_aula: {
        Row: {
          client_id: string | null
          created_at: string
          data: Json
          dia: string | null
          id: string
          semana: string | null
          titulo: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          data?: Json
          dia?: string | null
          id?: string
          semana?: string | null
          titulo?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          data?: Json
          dia?: string | null
          id?: string
          semana?: string | null
          titulo?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bonus_days_total: number
          cidade: string | null
          created_at: string
          disciplinas: string[] | null
          display_name: string | null
          email: string | null
          escola: string | null
          etapa_ensino: string | null
          id: string
          preferencias: Json
          referral_code: string | null
          referred_by_code: string | null
          sofia_lembretes: boolean
          sofia_tom: string | null
          telefone: string | null
          turmas: string[] | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bonus_days_total?: number
          cidade?: string | null
          created_at?: string
          disciplinas?: string[] | null
          display_name?: string | null
          email?: string | null
          escola?: string | null
          etapa_ensino?: string | null
          id?: string
          preferencias?: Json
          referral_code?: string | null
          referred_by_code?: string | null
          sofia_lembretes?: boolean
          sofia_tom?: string | null
          telefone?: string | null
          turmas?: string[] | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bonus_days_total?: number
          cidade?: string | null
          created_at?: string
          disciplinas?: string[] | null
          display_name?: string | null
          email?: string | null
          escola?: string | null
          etapa_ensino?: string | null
          id?: string
          preferencias?: Json
          referral_code?: string | null
          referred_by_code?: string | null
          sofia_lembretes?: boolean
          sofia_tom?: string | null
          telefone?: string | null
          turmas?: string[] | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          credit_at: string
          credited: boolean
          credited_at: string | null
          id: string
          plan: string
          purchased_at: string
          referral_code: string
          referred_bonus_days: number
          referred_user_id: string
          referrer_bonus_days: number
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          credit_at: string
          credited?: boolean
          credited_at?: string | null
          id?: string
          plan: string
          purchased_at?: string
          referral_code: string
          referred_bonus_days: number
          referred_user_id: string
          referrer_bonus_days: number
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          credit_at?: string
          credited?: boolean
          credited_at?: string | null
          id?: string
          plan?: string
          purchased_at?: string
          referral_code?: string
          referred_bonus_days?: number
          referred_user_id?: string
          referrer_bonus_days?: number
          referrer_user_id?: string
        }
        Relationships: []
      }
      sofia_conversations: {
        Row: {
          context: Json
          created_at: string
          id: string
          origin_route: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          origin_route?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          origin_route?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sofia_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          issues: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          issues?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          issues?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sofia_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sofia_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_sofia_conversations: { Args: never; Returns: undefined }
      ensure_referral_code: { Args: { _uid: string }; Returns: string }
      process_due_referrals: { Args: { _uid: string }; Returns: number }
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
