import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatDate } from "@/lib/format";

export type ParceiroTipo = "cliente" | "fornecedor";
export type LancTipo = "venda" | "compra" | "pagamento" | "credito" | "uso_credito" | "ajuste";

export type Lancamento = {
  id: string;
  tipo: LancTipo;
  descricao: string;
  valor_debito: number;
  valor_credito: number;
  saldo_apos: number;
  data_lancamento: string;
  data_vencimento: string | null;
  forma_pagamento: string | null;
  observacao: string | null;
  banco_id: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  bancos?: { nome: string } | null;
  meios_pagamento?: { nome: string } | null;
};

export const TIPO_LABEL: Record<LancTipo, string> = {
  venda: "Venda fiado",
  compra: "Compra a prazo",
  pagamento: "Pagamento",
  credito: "Haver / crédito",
  uso_credito: "Uso de crédito",
  ajuste: "Ajuste",
};

/** Rótulos que mudam conforme o parceiro (cliente x fornecedor). */
export function textos(tipo: ParceiroTipo) {
  const cliente = tipo === "cliente";
  return {
    parceiro: cliente ? "Cliente" : "Fornecedor",
    parceiros: cliente ? "Clientes" : "Fornecedores",
    titulo: cliente ? "Contas de clientes" : "Contas de fornecedores",
    descricao: cliente
      ? "Fiado e crediário: cada cliente tem uma conta com saldo devedor e créditos."
      : "Compras a prazo: cada fornecedor tem uma conta com saldo devedor e adiantamentos.",
    debitoLabel: cliente ? "Nova venda fiado" : "Nova compra a prazo",
    debitoTipo: (cliente ? "venda" : "compra") as LancTipo,
    pagamentoLabel: cliente ? "Registrar pagamento" : "Registrar pagamento ao fornecedor",
    creditoLabel: cliente ? "Registrar haver" : "Registrar adiantamento",
    totalDebito: cliente ? "Total comprado" : "Total em compras",
    totalCredito: cliente ? "Total pago" : "Total pago ao fornecedor",
    devedor: cliente ? "Saldo devedor do cliente" : "Saldo devedor ao fornecedor",
    creditoDisponivel: cliente ? "Créditos (haver) do cliente" : "Adiantamentos disponíveis",
    ultimo: cliente ? "Último pagamento" : "Último pagamento",
  };
}

export type StatusConta = "quitado" | "em_aberto" | "credito" | "atraso";

export function statusConta(saldo: number, credito: number, vencidoEm: string | null): StatusConta {
  if (saldo > 0.005) {
    if (vencidoEm && new Date(vencidoEm + "T23:59:59") < new Date()) return "atraso";
    return "em_aberto";
  }
  if (credito > 0.005) return "credito";
  return "quitado";
}

export const STATUS_INFO: Record<StatusConta, { label: string; cls: string }> = {
  quitado: { label: "Quitado", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  em_aberto: { label: "Em aberto", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  credito: { label: "Crédito disponível", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  atraso: { label: "Em atraso", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
};

/** Resumo calculado a partir dos lançamentos (o saldo nunca é digitado). */
export function resumo(lancs: Lancamento[]) {
  const ordenados = ordenar(lancs);
  const debitos = ordenados.reduce((s, l) => s + Number(l.valor_debito || 0), 0);
  const creditos = ordenados.reduce((s, l) => s + Number(l.valor_credito || 0), 0);
  const corrente = debitos - creditos;
  const pagamentos = ordenados.filter((l) => l.tipo === "pagamento");
  const vencidos = ordenados.filter((l) => l.data_vencimento && (l.tipo === "venda" || l.tipo === "compra"));
  return {
    debitos,
    creditos,
    saldoDevedor: Math.max(corrente, 0),
    saldoCredito: Math.max(-corrente, 0),
    ultimoPagamento: pagamentos.length ? pagamentos[pagamentos.length - 1].data_lancamento : null,
    vencimentoMaisAntigo: vencidos.length ? vencidos[0].data_vencimento : null,
  };
}

export function ordenar(lancs: Lancamento[]) {
  return [...lancs].sort((a, b) => {
    if (a.data_lancamento !== b.data_lancamento) return a.data_lancamento < b.data_lancamento ? -1 : 1;
    return (a.created_at ?? "") < (b.created_at ?? "") ? -1 : 1;
  });
}

/** Saldo corrido recalculado no cliente, para o extrato nunca depender do cache. */
export function comSaldo(lancs: Lancamento[]) {
  let run = 0;
  return ordenar(lancs).map((l) => {
    run += Number(l.valor_debito || 0) - Number(l.valor_credito || 0);
    return { ...l, saldo: run };
  });
}

const NAVY: [number, number, number] = [23, 37, 84];

export function gerarExtratoPdf(opts: {
  empresa: string;
  parceiroTipo: ParceiroTipo;
  nome: string;
  contato?: string | null;
  lancamentos: Lancamento[];
  geradoPor: string;
  imprimir?: boolean;
}) {
  const t = textos(opts.parceiroTipo);
  const linhas = comSaldo(opts.lancamentos);
  const r = resumo(opts.lancamentos);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("EXTRATO DA CONTA", M, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(opts.empresa, M, 20);
  doc.setFontSize(9);
  doc.text(`${t.parceiro}: ${opts.nome}${opts.contato ? ` - ${opts.contato}` : ""}`, M, 26);
  doc.setFontSize(8);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")} por ${opts.geradoPor}`, W - M, 26, { align: "right" });

  doc.setTextColor(0, 0, 0);
  autoTable(doc, {
    startY: 38,
    margin: { left: M, right: M },
    head: [["Resumo", "Valor"]],
    body: [
      [t.totalDebito, formatBRL(r.debitos)],
      [t.totalCredito, formatBRL(r.creditos)],
      [t.devedor, formatBRL(r.saldoDevedor)],
      [t.creditoDisponivel, formatBRL(r.saldoCredito)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: NAVY },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 8,
    margin: { left: M, right: M },
    head: [["Data", "Descricao", "Debito", "Credito", "Saldo"]],
    body: linhas.map((l) => [
      formatDate(l.data_lancamento),
      `${TIPO_LABEL[l.tipo]}${l.descricao ? ` - ${l.descricao}` : ""}${l.forma_pagamento ? ` (${l.forma_pagamento})` : ""}${l.observacao ? `\nObs.: ${l.observacao}` : ""}`,
      Number(l.valor_debito) > 0 ? formatBRL(Number(l.valor_debito)) : "-",
      Number(l.valor_credito) > 0 ? formatBRL(Number(l.valor_credito)) : "-",
      formatBRL(l.saldo),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: NAVY },
    columnStyles: {
      0: { cellWidth: 20 },
      2: { halign: "right", cellWidth: 26 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 28 },
    },
    didDrawPage: () => {
      const H = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(110, 118, 135);
      doc.text(`${opts.empresa} - Extrato da conta`, M, H - 8);
      doc.text(`Pagina ${doc.getNumberOfPages()}`, W - M, H - 8, { align: "right" });
      doc.setTextColor(0, 0, 0);
    },
  });

  const arquivo = `extrato-${opts.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  if (opts.imprimir) {
    const url = doc.output("bloburl");
    window.open(url as any, "_blank");
  } else {
    doc.save(arquivo);
  }
}
