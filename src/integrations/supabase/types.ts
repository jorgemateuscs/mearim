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
      audit_log: {
        Row: {
          acao: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          modulo: string
          occurred_at: string
          registro_id: string | null
          registro_nome: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          modulo: string
          occurred_at?: string
          registro_id?: string | null
          registro_nome?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          modulo?: string
          occurred_at?: string
          registro_id?: string | null
          registro_nome?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bancos: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          nome: string
          saldo_inicial: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome: string
          saldo_inicial?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome?: string
          saldo_inicial?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["categoria_tipo"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["categoria_tipo"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["categoria_tipo"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          deleted_at: string | null
          deleted_by: string | null
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
          updated_by: string | null
          user_id: string
        }
        Insert: {
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          updated_by?: string | null
          user_id: string
        }
        Update: {
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
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
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          banco_id: string | null
          categoria: string | null
          categoria_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string
          deleted_at: string | null
          deleted_by: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          local_saida: string | null
          meio_pagamento_id: string | null
          observacao: string | null
          origem_id: string | null
          origem_tipo: Database["public"]["Enums"]["movimentacao_origem"] | null
          parcela_num: number | null
          parcela_total: number | null
          parcelamento_id: string | null
          parcelamento_modo: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_pago: number | null
          valor_previsto: number
          valor_total_parcelamento: number | null
        }
        Insert: {
          banco_id?: string | null
          categoria?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          local_saida?: string | null
          meio_pagamento_id?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?:
            | Database["public"]["Enums"]["movimentacao_origem"]
            | null
          parcela_num?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          parcelamento_modo?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_pago?: number | null
          valor_previsto?: number
          valor_total_parcelamento?: number | null
        }
        Update: {
          banco_id?: string | null
          categoria?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          local_saida?: string | null
          meio_pagamento_id?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?:
            | Database["public"]["Enums"]["movimentacao_origem"]
            | null
          parcela_num?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          parcelamento_modo?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor_pago?: number | null
          valor_previsto?: number
          valor_total_parcelamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_meio_pagamento_id_fkey"
            columns: ["meio_pagamento_id"]
            isOneToOne: false
            referencedRelation: "meios_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          banco_id: string | null
          categoria_id: string | null
          cliente_id: string | null
          contato: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_recebimento: string | null
          data_vencimento: string
          data_venda: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string
          id: string
          local_recebimento: string | null
          meio_pagamento_id: string | null
          observacao: string | null
          origem_id: string | null
          origem_tipo: Database["public"]["Enums"]["movimentacao_origem"] | null
          pagador_nome: string | null
          parcela: string | null
          parcela_num: number | null
          parcela_total: number | null
          parcelamento_id: string | null
          parcelamento_modo: string | null
          status: string
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_parcela: number
          valor_recebido: number | null
          valor_total_parcelamento: number | null
        }
        Insert: {
          banco_id?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_recebimento?: string | null
          data_vencimento: string
          data_venda?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao: string
          id?: string
          local_recebimento?: string | null
          meio_pagamento_id?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?:
            | Database["public"]["Enums"]["movimentacao_origem"]
            | null
          pagador_nome?: string | null
          parcela?: string | null
          parcela_num?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          parcelamento_modo?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_parcela?: number
          valor_recebido?: number | null
          valor_total_parcelamento?: number | null
        }
        Update: {
          banco_id?: string | null
          categoria_id?: string | null
          cliente_id?: string | null
          contato?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_recebimento?: string | null
          data_vencimento?: string
          data_venda?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string
          id?: string
          local_recebimento?: string | null
          meio_pagamento_id?: string | null
          observacao?: string | null
          origem_id?: string | null
          origem_tipo?:
            | Database["public"]["Enums"]["movimentacao_origem"]
            | null
          pagador_nome?: string | null
          parcela?: string | null
          parcela_num?: number | null
          parcela_total?: number | null
          parcelamento_id?: string | null
          parcelamento_modo?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor_parcela?: number
          valor_recebido?: number | null
          valor_total_parcelamento?: number | null
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
            foreignKeyName: "contas_receber_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_meio_pagamento_id_fkey"
            columns: ["meio_pagamento_id"]
            isOneToOne: false
            referencedRelation: "meios_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          ativo: boolean
          banco_id: string | null
          categoria_id: string | null
          created_at: string
          created_by: string | null
          data_compra: string | null
          deleted_at: string | null
          deleted_by: string | null
          fornecedor_id: string | null
          id: string
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string | null
          observacao: string | null
          situacao: string | null
          status_pagamento: Database["public"]["Enums"]["status_pagamento"]
          updated_at: string
          updated_by: string | null
          user_id: string
          valor: number
          valor_pago: number
        }
        Insert: {
          ativo?: boolean
          banco_id?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          fornecedor_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          observacao?: string | null
          situacao?: string | null
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor?: number
          valor_pago?: number
        }
        Update: {
          ativo?: boolean
          banco_id?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          fornecedor_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          observacao?: string | null
          situacao?: string | null
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          contato: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          documento: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacao: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          contato?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          documento?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventario: {
        Row: {
          banco_id: string | null
          categoria: string
          categoria_id: string | null
          created_at: string
          created_by: string | null
          data_aquisicao: string | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          fornecedor: string | null
          fornecedor_id: string | null
          id: string
          is_kit: boolean
          kit_id: string | null
          localizacao: string | null
          marca: string | null
          modelo: string | null
          nome: string
          numero_patrimonio: string | null
          numero_serie: string | null
          observacao: string | null
          origem: string | null
          quantidade: number
          responsavel: string | null
          situacao: string | null
          status_pagamento: string
          tipo: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_pago: number
          valor_total: number
          valor_unitario: number | null
        }
        Insert: {
          banco_id?: string | null
          categoria?: string
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_aquisicao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fornecedor?: string | null
          fornecedor_id?: string | null
          id?: string
          is_kit?: boolean
          kit_id?: string | null
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          responsavel?: string | null
          situacao?: string | null
          status_pagamento?: string
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_pago?: number
          valor_total?: number
          valor_unitario?: number | null
        }
        Update: {
          banco_id?: string | null
          categoria?: string
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_aquisicao?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fornecedor?: string | null
          fornecedor_id?: string | null
          id?: string
          is_kit?: boolean
          kit_id?: string | null
          localizacao?: string | null
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacao?: string | null
          origem?: string | null
          quantidade?: number
          responsavel?: string | null
          situacao?: string | null
          status_pagamento?: string
          tipo?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor_pago?: number
          valor_total?: number
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_kit_fk"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_movimentacoes: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_movimentacao: string
          destino: string | null
          fornecedor_id: string | null
          id: string
          inventario_id: string
          motivo: string | null
          nota_fiscal: string | null
          observacao: string | null
          quantidade: number
          quantidade_anterior: number | null
          quantidade_final: number | null
          situacao_final: string | null
          tipo_movimentacao: string
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_unitario: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          destino?: string | null
          fornecedor_id?: string | null
          id?: string
          inventario_id: string
          motivo?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          quantidade?: number
          quantidade_anterior?: number | null
          quantidade_final?: number | null
          situacao_final?: string | null
          tipo_movimentacao: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_unitario?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          destino?: string | null
          fornecedor_id?: string | null
          id?: string
          inventario_id?: string
          motivo?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          quantidade?: number
          quantidade_anterior?: number | null
          quantidade_final?: number | null
          situacao_final?: string | null
          tipo_movimentacao?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimentacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimentacoes_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario"
            referencedColumns: ["id"]
          },
        ]
      }
      meios_pagamento: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          nome: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          nome?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pecas: {
        Row: {
          ativo: boolean
          banco_id: string | null
          categoria_id: string | null
          created_at: string
          created_by: string | null
          data_compra: string | null
          deleted_at: string | null
          deleted_by: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          observacao: string | null
          quantidade: number
          status_pagamento: Database["public"]["Enums"]["status_pagamento"]
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_pago: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          ativo?: boolean
          banco_id?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          observacao?: string | null
          quantidade?: number
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_pago?: number
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          ativo?: boolean
          banco_id?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          data_compra?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          quantidade?: number
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor_pago?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pecas_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          codigo: string | null
          created_at: string
          created_by: string | null
          custo_medio: number | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          fornecedor: string | null
          id: string
          nome: string
          qtde_adquirida: number | null
          qtde_vendida: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_venda: number | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          custo_medio?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          nome: string
          qtde_adquirida?: number | null
          qtde_vendida?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_venda?: number | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          custo_medio?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          nome?: string
          qtde_adquirida?: number | null
          qtde_vendida?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          valor_venda?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
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
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          dias_trabalho: string | null
          funcao: string | null
          id: string
          nome: string
          observacao: string | null
          salario_fixo: number | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          beneficios?: string | null
          comissao_percentual?: number | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dias_trabalho?: string | null
          funcao?: string | null
          id?: string
          nome: string
          observacao?: string | null
          salario_fixo?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          beneficios?: string | null
          comissao_percentual?: number | null
          contato?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dias_trabalho?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          salario_fixo?: number | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      servicos: {
        Row: {
          comissao_percentual: number | null
          created_at: string
          created_by: string | null
          custo_medio: number | null
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          nome: string
          observacao: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_venda: number | null
        }
        Insert: {
          comissao_percentual?: number | null
          created_at?: string
          created_by?: string | null
          custo_medio?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_venda?: number | null
        }
        Update: {
          comissao_percentual?: number | null
          created_at?: string
          created_by?: string | null
          custo_medio?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
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
          created_by: string | null
          data_transferencia: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          observacao: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          valor: number
        }
        Insert: {
          banco_destino_id?: string | null
          banco_origem_id?: string | null
          created_at?: string
          created_by?: string | null
          data_transferencia?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor?: number
        }
        Update: {
          banco_destino_id?: string | null
          banco_origem_id?: string | null
          created_at?: string
          created_by?: string | null
          data_transferencia?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
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
      vendas_produtos: {
        Row: {
          cliente_id: string | null
          created_at: string
          created_by: string | null
          custo_total: number | null
          data_venda: string
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: string
          local_recebimento: string | null
          observacao: string | null
          produto_id: string | null
          quantidade: number
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_total?: number | null
          data_venda?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          local_recebimento?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custo_total?: number | null
          data_venda?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: string
          local_recebimento?: string | null
          observacao?: string | null
          produto_id?: string | null
          quantidade?: number
          updated_at?: string
          updated_by?: string | null
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
          created_by: string | null
          custo: number | null
          data_prevista_fim: string | null
          data_venda: string
          deleted_at: string | null
          deleted_by: string | null
          descricao: string | null
          id: string
          observacao: string | null
          profissional_id: string | null
          servico_id: string | null
          status: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
          valor_recebido: number | null
          valor_venda: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_prevista_fim?: string | null
          data_venda?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          observacao?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
          valor_recebido?: number | null
          valor_venda?: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_prevista_fim?: string | null
          data_venda?: string
          deleted_at?: string | null
          deleted_by?: string | null
          descricao?: string | null
          id?: string
          observacao?: string | null
          profissional_id?: string | null
          servico_id?: string | null
          status?: string | null
          updated_at?: string
          updated_by?: string | null
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
      movimentacoes_bancarias: {
        Row: {
          banco_id: string | null
          categoria_id: string | null
          data_mov: string | null
          descricao: string | null
          id: string | null
          meio_pagamento_id: string | null
          origem_id: string | null
          origem_tipo: Database["public"]["Enums"]["movimentacao_origem"] | null
          tipo: string | null
          user_id: string | null
          valor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purge_expired_deleted: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "financeiro" | "operador" | "leitura"
      categoria_tipo:
        | "despesa"
        | "receita"
        | "patrimonio"
        | "servico"
        | "estoque"
      movimentacao_origem:
        | "conta_pagar"
        | "conta_receber"
        | "transferencia"
        | "venda_produto"
        | "venda_servico"
        | "equipamento"
        | "peca"
        | "ajuste"
      status_pagamento: "pago" | "parcial" | "pendente"
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
    Enums: {
      app_role: ["admin", "financeiro", "operador", "leitura"],
      categoria_tipo: [
        "despesa",
        "receita",
        "patrimonio",
        "servico",
        "estoque",
      ],
      movimentacao_origem: [
        "conta_pagar",
        "conta_receber",
        "transferencia",
        "venda_produto",
        "venda_servico",
        "equipamento",
        "peca",
        "ajuste",
      ],
      status_pagamento: ["pago", "parcial", "pendente"],
    },
  },
} as const
