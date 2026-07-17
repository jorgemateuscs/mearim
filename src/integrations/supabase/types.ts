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
      bancos: {
        Row: {
          created_at: string
          id: string
          nome: string
          saldo_inicial: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          saldo_inicial?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          saldo_inicial?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          data_nascimento: string | null
          dias_proximo_contato: number | null
          forma_prospeccao: string | null
          id: string
          instagram_email: string | null
          interesse: string | null
          nome: string
          observacao: string | null
          proximo_contato: string | null
          ultimo_contato: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_nascimento?: string | null
          dias_proximo_contato?: number | null
          forma_prospeccao?: string | null
          id?: string
          instagram_email?: string | null
          interesse?: string | null
          nome: string
          observacao?: string | null
          proximo_contato?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_nascimento?: string | null
          dias_proximo_contato?: number | null
          forma_prospeccao?: string | null
          id?: string
          instagram_email?: string | null
          interesse?: string | null
          nome?: string
          observacao?: string | null
          proximo_contato?: string | null
          ultimo_contato?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          banco_id: string | null
          categoria: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento: string | null
          id: string
          local_saida: string | null
          observacao: string | null
          status: string
          updated_at: string
          user_id: string
          valor_pago: number | null
          valor_previsto: number
        }
        Insert: {
          banco_id?: string | null
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          forma_pagamento?: string | null
          id?: string
          local_saida?: string | null
          observacao?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_pago?: number | null
          valor_previsto?: number
        }
        Update: {
          banco_id?: string | null
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          local_saida?: string | null
          observacao?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_pago?: number | null
          valor_previsto?: number
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          banco_id: string | null
          cliente_id: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          data_venda: string | null
          descricao: string
          id: string
          local_recebimento: string | null
          observacao: string | null
          pagador_nome: string | null
          parcela: string | null
          status: string
          updated_at: string
          user_id: string
          valor_parcela: number
          valor_recebido: number | null
        }
        Insert: {
          banco_id?: string | null
          cliente_id?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          data_venda?: string | null
          descricao: string
          id?: string
          local_recebimento?: string | null
          observacao?: string | null
          pagador_nome?: string | null
          parcela?: string | null
          status?: string
          updated_at?: string
          user_id: string
          valor_parcela?: number
          valor_recebido?: number | null
        }
        Update: {
          banco_id?: string | null
          cliente_id?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          data_venda?: string | null
          descricao?: string
          id?: string
          local_recebimento?: string | null
          observacao?: string | null
          pagador_nome?: string | null
          parcela?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          valor_parcela?: number
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          codigo: string | null
          created_at: string
          custo_medio: number | null
          descricao: string | null
          fornecedor: string | null
          id: string
          nome: string
          qtde_adquirida: number | null
          qtde_vendida: number | null
          updated_at: string
          user_id: string
          valor_venda: number | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          custo_medio?: number | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          nome: string
          qtde_adquirida?: number | null
          qtde_vendida?: number | null
          updated_at?: string
          user_id: string
          valor_venda?: number | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          custo_medio?: number | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          nome?: string
          qtde_adquirida?: number | null
          qtde_vendida?: number | null
          updated_at?: string
          user_id?: string
          valor_venda?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          beneficios: string | null
          comissao_percentual: number | null
          contato: string | null
          created_at: string
          dias_trabalho: string | null
          funcao: string | null
          id: string
          nome: string
          observacao: string | null
          salario_fixo: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficios?: string | null
          comissao_percentual?: number | null
          contato?: string | null
          created_at?: string
          dias_trabalho?: string | null
          funcao?: string | null
          id?: string
          nome: string
          observacao?: string | null
          salario_fixo?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficios?: string | null
          comissao_percentual?: number | null
          contato?: string | null
          created_at?: string
          dias_trabalho?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          salario_fixo?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          comissao_percentual: number | null
          created_at: string
          custo_medio: number | null
          descricao: string | null
          id: string
          nome: string
          observacao: string | null
          updated_at: string
          user_id: string
          valor_venda: number | null
        }
        Insert: {
          comissao_percentual?: number | null
          created_at?: string
          custo_medio?: number | null
          descricao?: string | null
          id?: string
          nome: string
          observacao?: string | null
          updated_at?: string
          user_id: string
          valor_venda?: number | null
        }
        Update: {
          comissao_percentual?: number | null
          created_at?: string
          custo_medio?: number | null
          descricao?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          updated_at?: string
          user_id?: string
          valor_venda?: number | null
        }
        Relationships: []
      }
      transferencias: {
        Row: {
          banco_destino_id: string | null
          banco_origem_id: string | null
          created_at: string
          data_transferencia: string
          id: string
          observacao: string | null
          user_id: string
          valor: number
        }
        Insert: {
          banco_destino_id?: string | null
          banco_origem_id?: string | null
          created_at?: string
          data_transferencia?: string
          id?: string
          observacao?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          banco_destino_id?: string | null
          banco_origem_id?: string | null
          created_at?: string
          data_transferencia?: string
          id?: string
          observacao?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_banco_destino_id_fkey"
            columns: ["banco_destino_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_banco_origem_id_fkey"
            columns: ["banco_origem_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_produtos: {
        Row: {
          cliente_id: string | null
          created_at: string
          custo_total: number | null
          data_venda: string
          descricao: string | null
          forma_pagamento: string | null
          id: string
          local_recebimento: string | null
          observacao: string | null
          produto_id: string | null
          quantidade: number
          updated_at: string
          user_id: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          custo_total?: number | null
          data_venda?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          local_recebimento?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number
          updated_at?: string
          user_id: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          custo_total?: number | null
          data_venda?: string
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          local_recebimento?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number
          updated_at?: string
          user_id?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_produtos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_servicos: {
        Row: {
          cliente_id: string | null
          created_at: string
          custo: number | null
          data_prevista_fim: string | null
          data_venda: string
          descricao: string | null
          id: string
          observacao: string | null
          profissional_id: string | null
          servico_id: string | null
          status: string | null
          updated_at: string
          user_id: string
          valor_recebido: number | null
          valor_venda: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          custo?: number | null
          data_prevista_fim?: string | null
          data_venda?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          valor_recebido?: number | null
          valor_venda?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          custo?: number | null
          data_prevista_fim?: string | null
          data_venda?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          valor_recebido?: number | null
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_servicos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_servicos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
