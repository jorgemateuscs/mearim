import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import { gerarRelatorioFinanceiro } from "@/lib/relatorio-financeiro";
import { FileText, FileDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/relatorios")({
  ssr: false,
  component: RelatoriosPage,
});

const hoje = () => new Date().toISOString().slice(0, 10);
const primeiroDiaMes = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };

function RelatoriosPage() {
  const [ini, setIni] = useState(primeiroDiaMes());
  const [fim, setFim] = useState(hoje());

  const { data, isLoading } = useQuery({
    queryKey: ["relatorio-financeiro", ini, fim],
    queryFn: async () => {
      const [bancos, cr, cp, tr, crAberto, cpAberto] = await Promise.all([
        supabase.from("bancos").select("*").is("deleted_at", null).order("nome"),
        supabase.from("contas_receber").select("id,descricao,pagador_nome,data_recebimento,valor_recebido,status,banco_id,categorias(nome),bancos(nome)").is("deleted_at", null).eq("status", "recebido").gte("data_recebimento", ini).lte("data_recebimento", fim),
        supabase.from("contas_pagar").select("id,descricao,data_pagamento,valor_pago,status,banco_id,categoria,categorias(nome),bancos(nome)").is("deleted_at", null).eq("status", "pago").gte("data_pagamento", ini).lte("data_pagamento", fim),
        supabase.from("transferencias").select("id,valor,data_transferencia,banco_origem_id,banco_destino_id").is("deleted_at", null).gte("data_transferencia", ini).lte("data_transferencia", fim),
        supabase.from("contas_receber").select("valor_parcela,valor_recebido,status").is("deleted_at", null).neq("status", "recebido"),
        supabase.from("contas_pagar").select("valor_previsto,valor_pago,status").is("deleted_at", null).neq("status", "pago"),
      ]);
      return {
        bancos: bancos.data ?? [],
        receitas: cr.data ?? [],
        despesas: cp.data ?? [],
        transferencias: tr.data ?? [],
        aReceber: (crAberto.data ?? []).reduce((s: number, r: any) => s + Number(r.valor_parcela ?? 0), 0),
        aPagar: (cpAberto.data ?? []).reduce((s: number, r: any) => s + Number(r.valor_previsto ?? 0), 0),
      };
    },
  });

  const resumo = useMemo(() => {
    if (!data) return null;
    const receitas = data.receitas.map((r: any) => ({
      descricao: r.descricao || r.pagador_nome || "Recebimento",
      data: r.data_recebimento,
      categoria: r.categorias?.nome ?? "Sem categoria",
      banco: r.bancos?.nome ?? "—",
      banco_id: r.banco_id,
      valor: Number(r.valor_recebido ?? 0),
      status: "recebido",
    }));
    const despesas = data.despesas.map((r: any) => ({
      descricao: r.descricao,
      data: r.data_pagamento,
      categoria: r.categorias?.nome ?? r.categoria ?? "Sem categoria",
      banco: r.bancos?.nome ?? "—",
      banco_id: r.banco_id,
      valor: Number(r.valor_pago ?? 0),
      status: "pago",
    }));

    const bancos = data.bancos.map((b: any) => {
      const entradas = receitas.filter((r) => r.banco_id === b.id).reduce((s, r) => s + r.valor, 0)
        + data.transferencias.filter((t: any) => t.banco_destino_id === b.id).reduce((s: number, t: any) => s + Number(t.valor ?? 0), 0);
      const saidas = despesas.filter((r) => r.banco_id === b.id).reduce((s, r) => s + r.valor, 0)
        + data.transferencias.filter((t: any) => t.banco_origem_id === b.id).reduce((s: number, t: any) => s + Number(t.valor ?? 0), 0);
      const saldoInicial = Number(b.saldo_inicial ?? 0);
      return { nome: b.nome, saldoInicial, entradas, saidas, saldoAtual: saldoInicial + entradas - saidas };
    });

    const catMap = new Map<string, { categoria: string; receita: number; despesa: number }>();
    for (const r of receitas) {
      const c = catMap.get(r.categoria) ?? { categoria: r.categoria, receita: 0, despesa: 0 };
      c.receita += r.valor; catMap.set(r.categoria, c);
    }
    for (const r of despesas) {
      const c = catMap.get(r.categoria) ?? { categoria: r.categoria, receita: 0, despesa: 0 };
      c.despesa += r.valor; catMap.set(r.categoria, c);
    }

    const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
    const totalDespesas = despesas.reduce((s, r) => s + r.valor, 0);

    return {
      receitas, despesas, bancos,
      porCategoria: [...catMap.values()].sort((a, b) => b.despesa + b.receita - (a.despesa + a.receita)),
      totalReceitas, totalDespesas, resultado: totalReceitas - totalDespesas,
      aReceber: data.aReceber, aPagar: data.aPagar,
    };
  }, [data]);

  const gerar = async () => {
    if (!resumo) return;
    const { data: u } = await supabase.auth.getUser();
    gerarRelatorioFinanceiro({
      empresa: "MEARIM DRONES LTDA",
      periodoIni: ini,
      periodoFim: fim,
      bancos: resumo.bancos,
      receitas: resumo.receitas,
      despesas: resumo.despesas,
      porCategoria: resumo.porCategoria,
      aReceber: resumo.aReceber,
      aPagar: resumo.aPagar,
      geradoPor: u.user?.email ?? "usuário do sistema",
    });
    toast.success("Relatório gerado");
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><FileText className="h-6 w-6" />Relatórios</h1>
          <p className="text-sm text-muted-foreground">Relatório financeiro profissional em PDF (A4), pronto para bancos, contadores e sócios.</p>
        </div>
        <Button onClick={gerar} disabled={isLoading || !resumo}><FileDown className="h-4 w-4 mr-1" />Gerar PDF do período</Button>
      </header>

      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div><Label className="text-xs mb-1">Data inicial</Label><Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
        <div><Label className="text-xs mb-1">Data final</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        <div className="col-span-2 text-sm text-muted-foreground">
          Período de {formatDate(ini)} a {formatDate(fim)}.
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Receitas realizadas" value={formatBRL(resumo?.totalReceitas ?? 0)} tone="ok" />
        <Stat label="Despesas pagas" value={formatBRL(resumo?.totalDespesas ?? 0)} tone="bad" />
        <Stat label="Resultado" value={formatBRL(resumo?.resultado ?? 0)} tone={(resumo?.resultado ?? 0) >= 0 ? "ok" : "bad"} />
        <Stat label="Em aberto (receber / pagar)" value={`${formatBRL(resumo?.aReceber ?? 0)} / ${formatBRL(resumo?.aPagar ?? 0)}`} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="p-4 pb-0 font-semibold">Posição por banco</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Banco</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Saldo atual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resumo?.bancos ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum banco cadastrado.</TableCell></TableRow>}
              {(resumo?.bancos ?? []).map((b) => (
                <TableRow key={b.nome}>
                  <TableCell className="font-medium">{b.nome}</TableCell>
                  <TableCell className="text-right">{formatBRL(b.saldoInicial)}</TableCell>
                  <TableCell className="text-right text-emerald-500">{formatBRL(b.entradas)}</TableCell>
                  <TableCell className="text-right text-red-500">{formatBRL(b.saidas)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatBRL(b.saldoAtual)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="p-4 pb-0 font-semibold">Resultado por categoria</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Receitas</TableHead>
                <TableHead className="text-right">Despesas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resumo?.porCategoria ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Sem movimentação no período.</TableCell></TableRow>}
              {(resumo?.porCategoria ?? []).map((c) => (
                <TableRow key={c.categoria}>
                  <TableCell className="font-medium">{c.categoria}</TableCell>
                  <TableCell className="text-right text-emerald-500">{formatBRL(c.receita)}</TableCell>
                  <TableCell className="text-right text-red-500">{formatBRL(c.despesa)}</TableCell>
                  <TableCell className="text-right">{formatBRL(c.receita - c.despesa)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  const cls = tone === "ok" ? "text-emerald-500" : tone === "bad" ? "text-red-500" : "";
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${cls}`}>{value}</div>
    </Card>
  );
}
