export const TIPOS = [
  { value: "equipamento", label: "Equipamentos" },
  { value: "peca", label: "Peças" },
  { value: "veiculo", label: "Veículos" },
  { value: "ferramenta", label: "Ferramentas" },
  { value: "outro", label: "Outros" },
];

export const TIPO_SINGULAR: Record<string, string> = {
  equipamento: "Equipamento",
  peca: "Peça",
  veiculo: "Veículo",
  ferramenta: "Ferramenta",
  outro: "Outro",
};

export const SITUACOES = [
  { value: "ativo", label: "Ativo", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { value: "em_estoque", label: "Em estoque", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  { value: "em_uso", label: "Em uso", cls: "bg-primary/15 text-primary border-primary/30" },
  { value: "em_manutencao", label: "Em manutenção", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "transferido", label: "Transferido", cls: "bg-muted text-muted-foreground" },
  { value: "vendido", label: "Vendido", cls: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
  { value: "kit_parcial", label: "Kit parcialmente desmembrado", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "baixado", label: "Baixado", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  { value: "perdido", label: "Perdido", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  { value: "danificado", label: "Danificado", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
];

export const STATUS_PAGAMENTO = [
  { value: "pago", label: "Pago", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { value: "parcial", label: "Pago parcialmente", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "pendente", label: "Pendente", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
];

/** Tipos de movimentação patrimonial e o efeito sobre a quantidade. */
export const MOVIMENTACOES = [
  { value: "entrada", label: "➕ Entrada", efeito: "soma" as const, situacao: null },
  { value: "saida", label: "➖ Saída / Baixa", efeito: "subtrai" as const, situacao: "baixado" },
  { value: "venda", label: "💰 Venda", efeito: "subtrai" as const, situacao: "vendido" },
  { value: "descarte", label: "♻️ Descarte", efeito: "subtrai" as const, situacao: "baixado" },
  { value: "transferencia", label: "🔄 Transferência", efeito: "nenhum" as const, situacao: "transferido" },
  { value: "transferencia_estoque", label: "📦 Transferência de estoque", efeito: "nenhum" as const, situacao: "em_estoque" },
  { value: "manutencao_envio", label: "🛠️ Enviar para manutenção", efeito: "nenhum" as const, situacao: "em_manutencao" },
  { value: "manutencao_retorno", label: "✅ Retorno da manutenção", efeito: "nenhum" as const, situacao: "ativo" },
  { value: "ajuste", label: "✏️ Ajuste de quantidade", efeito: "define" as const, situacao: null },
];

export function situacaoInfo(s: string | null) {
  return SITUACOES.find((x) => x.value === s) ?? { value: s ?? "", label: s ?? "—", cls: "bg-muted text-muted-foreground" };
}

export function statusPagamentoInfo(s: string | null) {
  return STATUS_PAGAMENTO.find((x) => x.value === s) ?? { value: s ?? "", label: s ?? "—", cls: "bg-muted text-muted-foreground" };
}

export function movInfo(t: string) {
  return MOVIMENTACOES.find((m) => m.value === t) ?? { value: t, label: t, efeito: "nenhum" as const, situacao: null };
}
