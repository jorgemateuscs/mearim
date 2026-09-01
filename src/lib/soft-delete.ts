import { supabase } from "@/integrations/supabase/client";

/** Tabelas com lixeira (exclusão lógica de 7 dias). */
export const SOFT_DELETE_TABLES = [
  "inventario",
  "equipamentos",
  "pecas",
  "contas_pagar",
  "contas_receber",
  "clientes",
  "fornecedores",
  "profissionais",
  "servicos",
  "produtos",
  "vendas_produtos",
  "vendas_servicos",
  "categorias",
  "meios_pagamento",
  "bancos",
  "transferencias",
] as const;

export const MODULO_LABEL: Record<string, string> = {
  inventario: "Patrimônio / Inventário",
  inventario_movimentacoes: "Patrimônio / Movimentações",
  equipamentos: "Patrimônio / Equipamentos (legado)",
  pecas: "Patrimônio / Peças (legado)",
  contas_pagar: "Financeiro / Contas a pagar",
  contas_receber: "Financeiro / Contas a receber",
  clientes: "Pessoas / Clientes",
  fornecedores: "Pessoas / Fornecedores",
  profissionais: "Pessoas / Profissionais",
  servicos: "Comercial / Serviços",
  produtos: "Comercial / Estoque",
  vendas_produtos: "Comercial / Vendas de produtos",
  vendas_servicos: "Comercial / Vendas de serviços",
  categorias: "Configurações / Categorias",
  meios_pagamento: "Configurações / Meios de pagamento",
  bancos: "Financeiro / Bancos",
  transferencias: "Financeiro / Transferências",
};

export const ACAO_LABEL: Record<string, string> = {
  criou: "Criação",
  editou: "Edição",
  excluiu: "Exclusão",
  recuperou: "Recuperação",
  excluiu_definitivo: "Exclusão definitiva",
};

/** Move o registro para a lixeira (recuperável por 7 dias). */
export async function softDelete(table: string, id: string) {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase
    .from(table as any)
    .update({ deleted_at: new Date().toISOString(), deleted_by: data.user?.id ?? null } as any)
    .eq("id", id);
  if (error) throw error;
}

/** Restaura um registro da lixeira. */
export async function restoreRecord(table: string, id: string) {
  const { error } = await supabase
    .from(table as any)
    .update({ deleted_at: null, deleted_by: null } as any)
    .eq("id", id);
  if (error) throw error;
}

export function expiraEm(deletedAt: string) {
  const d = new Date(deletedAt);
  d.setDate(d.getDate() + 7);
  return d;
}
