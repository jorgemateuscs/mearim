import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBRL, formatDate } from "@/lib/format";

const NAVY: [number, number, number] = [23, 37, 84];
const GRAY: [number, number, number] = [110, 118, 135];

export type RelatorioDados = {
  empresa: string;
  periodoIni: string;
  periodoFim: string;
  bancos: { nome: string; saldoInicial: number; entradas: number; saidas: number; saldoAtual: number }[];
  receitas: { descricao: string; data: string; categoria: string; banco: string; valor: number; status: string }[];
  despesas: { descricao: string; data: string; categoria: string; banco: string; valor: number; status: string }[];
  porCategoria: { categoria: string; receita: number; despesa: number }[];
  aReceber: number;
  aPagar: number;
  geradoPor: string;
};

export function gerarRelatorioFinanceiro(d: RelatorioDados) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 15;

  const totalReceitas = d.receitas.reduce((s, r) => s + r.valor, 0);
  const totalDespesas = d.despesas.reduce((s, r) => s + r.valor, 0);
  const resultado = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

  // Capa / cabeçalho
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("RELATORIO FINANCEIRO", M, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(d.empresa, M, 21);
  doc.text(`Periodo: ${formatDate(d.periodoIni)} a ${formatDate(d.periodoFim)}`, M, 27);
  doc.setFontSize(8);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")} por ${d.geradoPor}`, W - M, 27, { align: "right" });

  let y = 42;
  doc.setTextColor(0, 0, 0);

  // Resumo executivo
  section(doc, "1. Resumo executivo", M, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de receitas realizadas", formatBRL(totalReceitas)],
      ["Total de despesas pagas", formatBRL(totalDespesas)],
      ["Resultado do periodo", formatBRL(resultado)],
      ["Margem sobre receitas", `${margem.toFixed(1)}%`],
      ["Contas a receber em aberto", formatBRL(d.aReceber)],
      ["Contas a pagar em aberto", formatBRL(d.aPagar)],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: NAVY },
    columnStyles: { 1: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Posição por banco
  section(doc, "2. Posicao por banco", M, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Banco", "Saldo inicial", "Entradas", "Saidas", "Saldo atual"]],
    body: d.bancos.map((b) => [b.nome, formatBRL(b.saldoInicial), formatBRL(b.entradas), formatBRL(b.saidas), formatBRL(b.saldoAtual)]),
    foot: [[
      "TOTAL",
      formatBRL(d.bancos.reduce((s, b) => s + b.saldoInicial, 0)),
      formatBRL(d.bancos.reduce((s, b) => s + b.entradas, 0)),
      formatBRL(d.bancos.reduce((s, b) => s + b.saidas, 0)),
      formatBRL(d.bancos.reduce((s, b) => s + b.saldoAtual, 0)),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: NAVY },
    footStyles: { fillColor: [235, 238, 245], textColor: 20, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Resultado por categoria
  section(doc, "3. Resultado por categoria", M, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Categoria", "Receitas", "Despesas", "Saldo"]],
    body: d.porCategoria.map((c) => [c.categoria, formatBRL(c.receita), formatBRL(c.despesa), formatBRL(c.receita - c.despesa)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: NAVY },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  // Detalhamento
  doc.addPage();
  y = 20;
  section(doc, "4. Receitas realizadas no periodo", M, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Data", "Descricao", "Categoria", "Banco", "Valor"]],
    body: d.receitas.map((r) => [formatDate(r.data), r.descricao, r.categoria, r.banco, formatBRL(r.valor)]),
    foot: [["", "", "", "TOTAL", formatBRL(totalReceitas)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: NAVY },
    footStyles: { fillColor: [235, 238, 245], textColor: 20, fontStyle: "bold" },
    columnStyles: { 4: { halign: "right" } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (y > 240) { doc.addPage(); y = 20; }
  section(doc, "5. Despesas pagas no periodo", M, y);
  y += 6;
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Data", "Descricao", "Categoria", "Banco", "Valor"]],
    body: d.despesas.map((r) => [formatDate(r.data), r.descricao, r.categoria, r.banco, formatBRL(r.valor)]),
    foot: [["", "", "", "TOTAL", formatBRL(totalDespesas)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: NAVY },
    footStyles: { fillColor: [235, 238, 245], textColor: 20, fontStyle: "bold" },
    columnStyles: { 4: { halign: "right" } },
  });

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.2);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${d.empresa} — Relatorio financeiro confidencial`, M, H - 9);
    doc.text(`Pagina ${i} de ${pages}`, W - M, H - 9, { align: "right" });
  }

  doc.save(`relatorio-financeiro-${d.periodoIni}-a-${d.periodoFim}.pdf`);
}

function section(doc: jsPDF, titulo: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(titulo, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
}
