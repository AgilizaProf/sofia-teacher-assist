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
          faixa_etaria: string | null
          id: string
          idade: number | null
          nivel: string | null
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
          faixa_etaria?: string | null
          id?: string
          idade?: number | null
          nivel?: string | null
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
          faixa_etaria?: string | null
          id?: string
          idade?: number | null
          nivel?: string | null
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
      defasagens: {
        Row: {
          aluno_id: string | null
          aluno_nome: string
          detectada_em: string
          habilidade_prerequisito: Json
          habilidade_trilha: Json
          id: string
          status: string
          sugestao_retomada: string | null
          trilha_id: string
          urgencia: string
          user_id: string
        }
        Insert: {
          aluno_id?: string | null
          aluno_nome: string
          detectada_em?: string
          habilidade_prerequisito: Json
          habilidade_trilha: Json
          id?: string
          status?: string
          sugestao_retomada?: string | null
          trilha_id: string
          urgencia?: string
          user_id: string
        }
        Update: {
          aluno_id?: string | null
          aluno_nome?: string
          detectada_em?: string
          habilidade_prerequisito?: Json
          habilidade_trilha?: Json
          id?: string
          status?: string
          sugestao_retomada?: string | null
          trilha_id?: string
          urgencia?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "defasagens_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      marcos_desenvolvimento: {
        Row: {
          campo_experiencia: string
          created_at: string
          crianca_client_id: string
          crianca_nome: string | null
          descricao: string
          evidencia: string | null
          id: string
          observado_em: string
          status: string
          user_id: string
        }
        Insert: {
          campo_experiencia: string
          created_at?: string
          crianca_client_id: string
          crianca_nome?: string | null
          descricao: string
          evidencia?: string | null
          id?: string
          observado_em?: string
          status?: string
          user_id: string
        }
        Update: {
          campo_experiencia?: string
          created_at?: string
          crianca_client_id?: string
          crianca_nome?: string | null
          descricao?: string
          evidencia?: string | null
          id?: string
          observado_em?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      observacoes_ei: {
        Row: {
          analise_sofia: Json | null
          campos: Json
          created_at: string
          crianca_client_id: string | null
          crianca_nome: string | null
          direitos: Json
          foto_url: string | null
          id: string
          registrado_em: string
          texto: string
          turma: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analise_sofia?: Json | null
          campos?: Json
          created_at?: string
          crianca_client_id?: string | null
          crianca_nome?: string | null
          direitos?: Json
          foto_url?: string | null
          id?: string
          registrado_em?: string
          texto: string
          turma?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analise_sofia?: Json | null
          campos?: Json
          created_at?: string
          crianca_client_id?: string | null
          crianca_nome?: string | null
          direitos?: Json
          foto_url?: string | null
          id?: string
          registrado_em?: string
          texto?: string
          turma?: string | null
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
      pei_evidencias: {
        Row: {
          aluno_client_id: string
          created_at: string
          data_evidencia: string
          descricao: string
          id: string
          objetivo_id: string | null
          pei_id: string
          registro_diario_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          aluno_client_id: string
          created_at?: string
          data_evidencia?: string
          descricao: string
          id?: string
          objetivo_id?: string | null
          pei_id: string
          registro_diario_id?: string | null
          tipo?: string
          user_id: string
        }
        Update: {
          aluno_client_id?: string
          created_at?: string
          data_evidencia?: string
          descricao?: string
          id?: string
          objetivo_id?: string | null
          pei_id?: string
          registro_diario_id?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pei_evidencias_pei_id_fkey"
            columns: ["pei_id"]
            isOneToOne: false
            referencedRelation: "pei_pdi"
            referencedColumns: ["id"]
          },
        ]
      }
      pei_pdi: {
        Row: {
          aluno_client_id: string
          aluno_nome: string
          avaliacao: Json
          bimestre: string
          contexto_adicional: string | null
          created_at: string
          estrategias: Json
          gerado_em: string
          id: string
          modelo: string | null
          objetivos_curto: Json
          objetivos_longo: Json
          perfil_aluno: Json
          responsaveis: Json
          revisado_em: string | null
          status: string
          updated_at: string
          user_id: string
          versao: number
          versao_familia: string | null
        }
        Insert: {
          aluno_client_id: string
          aluno_nome: string
          avaliacao?: Json
          bimestre: string
          contexto_adicional?: string | null
          created_at?: string
          estrategias?: Json
          gerado_em?: string
          id?: string
          modelo?: string | null
          objetivos_curto?: Json
          objetivos_longo?: Json
          perfil_aluno?: Json
          responsaveis?: Json
          revisado_em?: string | null
          status?: string
          updated_at?: string
          user_id: string
          versao?: number
          versao_familia?: string | null
        }
        Update: {
          aluno_client_id?: string
          aluno_nome?: string
          avaliacao?: Json
          bimestre?: string
          contexto_adicional?: string | null
          created_at?: string
          estrategias?: Json
          gerado_em?: string
          id?: string
          modelo?: string | null
          objetivos_curto?: Json
          objetivos_longo?: Json
          perfil_aluno?: Json
          responsaveis?: Json
          revisado_em?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          versao?: number
          versao_familia?: string | null
        }
        Relationships: []
      }
      pei_progresso: {
        Row: {
          avaliado_em: string
          created_at: string
          evidencia: string | null
          id: string
          objetivo: string
          pei_id: string
          recomendacao: string | null
          status: string
          user_id: string
        }
        Insert: {
          avaliado_em?: string
          created_at?: string
          evidencia?: string | null
          id?: string
          objetivo: string
          pei_id: string
          recomendacao?: string | null
          status?: string
          user_id: string
        }
        Update: {
          avaliado_em?: string
          created_at?: string
          evidencia?: string | null
          id?: string
          objetivo?: string
          pei_id?: string
          recomendacao?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pei_progresso_pei_id_fkey"
            columns: ["pei_id"]
            isOneToOne: false
            referencedRelation: "pei_pdi"
            referencedColumns: ["id"]
          },
        ]
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
          faixa_etaria: string | null
          id: string
          nivel_ensino: string | null
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
          faixa_etaria?: string | null
          id?: string
          nivel_ensino?: string | null
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
          faixa_etaria?: string | null
          id?: string
          nivel_ensino?: string | null
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
      progressao_alunos: {
        Row: {
          aluno_id: string | null
          aluno_nome: string
          atualizado_em: string
          evidencia: string | null
          habilidade_bncc: string
          habilidade_descricao: string | null
          id: string
          status: string
          trilha_id: string
          user_id: string
        }
        Insert: {
          aluno_id?: string | null
          aluno_nome: string
          atualizado_em?: string
          evidencia?: string | null
          habilidade_bncc: string
          habilidade_descricao?: string | null
          id?: string
          status?: string
          trilha_id: string
          user_id: string
        }
        Update: {
          aluno_id?: string | null
          aluno_nome?: string
          atualizado_em?: string
          evidencia?: string | null
          habilidade_bncc?: string
          habilidade_descricao?: string | null
          id?: string
          status?: string
          trilha_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progressao_alunos_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
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
      relatorios_ei: {
        Row: {
          bimestre: string
          conteudo_texto: string | null
          created_at: string
          crianca_client_id: string
          crianca_nome: string | null
          gerado_em: string
          id: string
          status: string
          updated_at: string
          user_id: string
          versao_familia: string | null
        }
        Insert: {
          bimestre: string
          conteudo_texto?: string | null
          created_at?: string
          crianca_client_id: string
          crianca_nome?: string | null
          gerado_em?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          versao_familia?: string | null
        }
        Update: {
          bimestre?: string
          conteudo_texto?: string | null
          created_at?: string
          crianca_client_id?: string
          crianca_nome?: string | null
          gerado_em?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          versao_familia?: string | null
        }
        Relationships: []
      }
      roteiros_ei: {
        Row: {
          campos_experiencia: Json
          conteudo: Json
          created_at: string
          duracao: number | null
          faixa_etaria: string | null
          gerado_em: string
          id: string
          modelo: string | null
          status: string
          tema: string | null
          tipo_experiencia: string | null
          turma: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campos_experiencia?: Json
          conteudo?: Json
          created_at?: string
          duracao?: number | null
          faixa_etaria?: string | null
          gerado_em?: string
          id?: string
          modelo?: string | null
          status?: string
          tema?: string | null
          tipo_experiencia?: string | null
          turma?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campos_experiencia?: Json
          conteudo?: Json
          created_at?: string
          duracao?: number | null
          faixa_etaria?: string | null
          gerado_em?: string
          id?: string
          modelo?: string | null
          status?: string
          tema?: string | null
          tipo_experiencia?: string | null
          turma?: string | null
          updated_at?: string
          user_id?: string
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
      trilha_semanas: {
        Row: {
          concluida_em: string | null
          conecta_anterior: string | null
          created_at: string
          habilidades_bncc: Json
          id: string
          plano_gerado: Json | null
          prepara_proxima: string | null
          semana: number
          status: string
          tipo_atividade: string | null
          titulo: string | null
          trilha_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concluida_em?: string | null
          conecta_anterior?: string | null
          created_at?: string
          habilidades_bncc?: Json
          id?: string
          plano_gerado?: Json | null
          prepara_proxima?: string | null
          semana: number
          status?: string
          tipo_atividade?: string | null
          titulo?: string | null
          trilha_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concluida_em?: string | null
          conecta_anterior?: string | null
          created_at?: string
          habilidades_bncc?: Json
          id?: string
          plano_gerado?: Json | null
          prepara_proxima?: string | null
          semana?: number
          status?: string
          tipo_atividade?: string | null
          titulo?: string | null
          trilha_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trilha_semanas_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      trilhas: {
        Row: {
          ano_escolar: string | null
          ano_letivo: number | null
          client_id: string | null
          contexto_adicional: string | null
          created_at: string
          data: Json
          disciplina: string | null
          id: string
          justificativa: string | null
          semestre: string | null
          status: string
          tema_central: string | null
          turma: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ano_escolar?: string | null
          ano_letivo?: number | null
          client_id?: string | null
          contexto_adicional?: string | null
          created_at?: string
          data?: Json
          disciplina?: string | null
          id?: string
          justificativa?: string | null
          semestre?: string | null
          status?: string
          tema_central?: string | null
          turma?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ano_escolar?: string | null
          ano_letivo?: number | null
          client_id?: string | null
          contexto_adicional?: string | null
          created_at?: string
          data?: Json
          disciplina?: string | null
          id?: string
          justificativa?: string | null
          semestre?: string | null
          status?: string
          tema_central?: string | null
          turma?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano: string | null
          created_at: string
          data: Json
          escola: string | null
          id: string
          nome: string
          qtd_alunos: string | null
          turno: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ano?: string | null
          created_at?: string
          data?: Json
          escola?: string | null
          id?: string
          nome: string
          qtd_alunos?: string | null
          turno?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: string | null
          created_at?: string
          data?: Json
          escola?: string | null
          id?: string
          nome?: string
          qtd_alunos?: string | null
          turno?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
