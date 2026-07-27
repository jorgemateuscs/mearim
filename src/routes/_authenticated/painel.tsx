import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatDate } from "@/lib/format";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Cake,
  PhoneCall,
  Package,
  AlertCircle,
} from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/painel")({
  ssr: false,
  component: PainelPage,
});

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lista de meses (chave YYYY-MM e rótulo) dentro do período */
function buildMeses(ini: string, fim: string) {
  const out: { key: string; label: string }[] = [];
  if (!ini || !fim || ini > fim) return out;
  const start = new Date(ini + "T00:00:00");
  const end = new Date(fim + "T00:00:00");
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end && out.length < 120) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const label = out.length > 0 && cur.getMonth() === 0 ? `${MESES[0]}/${String(cur.getFullYear()).slice(2)}` : MESES[cur.getMonth()];
    out.push({ key, label });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function PainelPage() {
  const now = new Date();
  const year = now.getFullYear();
  const today = iso(now);
  const in7 = iso(new Date(Date.now() + 7 * 86400000));

  const [dataIni, setDataIni] = useState<string>(`${year}-01-01`);
  const [dataFim, setDataFim] = useState<string>(`${year}-12-31`);

  const presets = [
    { label: "Últimos 30 dias", run: () => { setDataIni(iso(new Date(Date.now() - 29 * 86400000))); setDataFim(iso(new Date())); } },
    { label: "Últimos 365 dias", run: () => { setDataIni(iso(new Date(Date.now() - 364 * 86400000))); setDataFim(iso(new Date())); } },
    { label: "Mês vigente", run: () => { const d = new Date(); setDataIni(iso(new Date(d.getFullYear(), d.getMonth(), 1))); setDataFim(iso(new Date(d.getFullYear(), d.getMonth() + 1, 0))); } },
    { label: "Ano vigente", run: () => { const y = new Date().getFullYear(); setDataIni(`${y}-01-01`); setDataFim(`${y}-12-31`); } },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["painel", dataIni, dataFim],
    queryFn: async () => {
      const [vp, vs, cp, cr, cli, prod] = await Promise.all([
        supabase.from("vendas_produtos").select("data_venda,valor_total,custo_total").gte("data_venda", dataIni).lte("data_venda", dataFim),
        supabase.from("vendas_servicos").select("data_venda,valor_venda,valor_recebido,custo").gte("data_venda", dataIni).lte("data_venda", dataFim),
        supabase.from("contas_pagar").select("data_vencimento,valor_previsto,valor_pago,status,categoria").gte("data_vencimento", dataIni).lte("data_vencimento", dataFim),
        supabase.from("contas_receber").select("data_vencimento,valor_parcela,valor_recebido,status").gte("data_vencimento", dataIni).lte("data_vencimento", dataFim),
        supabase.from("clientes").select("id,data_nascimento,proximo_contato,forma_prospeccao"),
        supabase.from("produtos").select("qtde_adquirida,qtde_vendida,valor_venda,custo_medio"),
      ]);
      return {
        vendasProd: vp.data ?? [],
        vendasServ: vs.data ?? [],
        contasPagar: cp.data ?? [],
        contasReceber: cr.data ?? [],
        clientes: cli.data ?? [],
        produtos: prod.data ?? [],
      };
    },
  });

  const fatProdutos = (data?.vendasProd ?? []).reduce((s, v) => s + Number(v.valor_total ?? 0), 0);
  const fatServicos = (data?.vendasServ ?? []).reduce((s, v) => s + Number(v.valor_recebido ?? 0), 0);
  const faturamento = fatProdutos + fatServicos;
  const despesas = (data?.contasPagar ?? []).reduce((s, c) => s + Number(c.valor_pago ?? 0), 0);
  const saldo = faturamento - despesas;

  const meses = useMemo(() => buildMeses(dataIni, dataFim), [dataIni, dataFim]);

  const { receitasMes, despesasMes, lucroMes } = useMemo(() => {
    const idx = new Map(meses.map((m, i) => [m.key, i]));
    const receitas = Array(meses.length).fill(0);
    const desp = Array(meses.length).fill(0);
    const lucro = Array(meses.length).fill(0);
    const at = (d?: string | null) => (d ? idx.get(d.slice(0, 7)) : undefined);
    (data?.vendasProd ?? []).forEach((v) => {
      const i = at(v.data_venda); if (i === undefined) return;
      receitas[i] += Number(v.valor_total ?? 0);
      lucro[i] += Number(v.valor_total ?? 0) - Number(v.custo_total ?? 0);
    });
    (data?.vendasServ ?? []).forEach((v) => {
      const i = at(v.data_venda); if (i === undefined) return;
      receitas[i] += Number(v.valor_recebido ?? 0);
      lucro[i] += Number(v.valor_recebido ?? 0) - Number(v.custo ?? 0);
    });
    (data?.contasPagar ?? []).forEach((c) => {
      const i = at(c.data_vencimento); if (i === undefined) return;
      desp[i] += Number(c.valor_pago ?? 0);
    });
    return { receitasMes: receitas, despesasMes: desp, lucroMes: lucro };
  }, [data, meses]);

  const totalClientes = (data?.clientes ?? []).length;
  const aniversariantes = (data?.clientes ?? []).filter((c) => {
    if (!c.data_nascimento) return false;
    const d = new Date(c.data_nascimento + "T00:00:00");
    return d.getMonth() === new Date().getMonth();
  }).length;
  const proximosContatos = (data?.clientes ?? []).filter((c) => c.proximo_contato && c.proximo_contato >= today && c.proximo_contato <= in7).length;

  const contasVencidas = (data?.contasPagar ?? []).filter((c) => c.status !== "Pago" && c.data_vencimento < today);
  const contasHoje = (data?.contasPagar ?? []).filter((c) => c.status !== "Pago" && c.data_vencimento === today);
  const contasProxSemana = (data?.contasPagar ?? []).filter((c) => c.status !== "Pago" && c.data_vencimento > today && c.data_vencimento <= in7);

  const estoqueValor = (data?.produtos ?? []).reduce((s, p) => {
    const restante = Math.max(0, (p.qtde_adquirida ?? 0) - (p.qtde_vendida ?? 0));
    return s + restante * Number(p.valor_venda ?? 0);
  }, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </header>

      {/* Barra de período */}
      <Card className="p-4">
        <div className="flex flex-col xl:flex-row xl:items-end gap-4 xl:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs mb-1 block">Data inicial</Label>
              <Input type="date" className="w-40" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Data final</Label>
              <Input type="date" className="w-40" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button key={p.label} type="button" size="sm" variant="outline" onClick={p.run}>{p.label}</Button>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Período selecionado</div>
            <div className="text-sm font-semibold">{formatDate(dataIni)} a {formatDate(dataFim)}</div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={TrendingUp} label="Faturamento" value={formatBRL(faturamento)} tone="success" sub={`Produtos ${formatBRL(fatProdutos)} · Serviços ${formatBRL(fatServicos)}`} />
        <Kpi icon={TrendingDown} label="Despesas" value={formatBRL(despesas)} tone="destructive" />
        <Kpi icon={Wallet} label="Saldo" value={formatBRL(saldo)} tone={saldo >= 0 ? "success" : "destructive"} />
        <Kpi icon={Package} label="Valor em estoque" value={formatBRL(estoqueValor)} tone="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Faturamento mensal" data={receitasMes} labels={meses.map((m) => m.label)} color="var(--color-chart-1)" />
        <ChartCard title="Despesas mensais" data={despesasMes} labels={meses.map((m) => m.label)} color="var(--color-chart-5)" />
        <ChartCard title="Lucro mensal" data={lucroMes} labels={meses.map((m) => m.label)} color="var(--color-chart-2)" />
      </div>

      {/* Clientes + Contas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Clientes</h2>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat icon={Users} label="Cadastrados" value={totalClientes} />
            <MiniStat icon={Cake} label="Aniversariantes" value={aniversariantes} />
            <MiniStat icon={PhoneCall} label="Contatar 7d" value={proximosContatos} />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" /> Contas a pagar</h2>
          <div className="space-y-2 text-sm">
            <StatusRow label="Vencidas" count={contasVencidas.length} value={contasVencidas.reduce((s,c)=>s+Number(c.valor_previsto??0),0)} color="text-destructive" />
            <StatusRow label="Vencendo hoje" count={contasHoje.length} value={contasHoje.reduce((s,c)=>s+Number(c.valor_previsto??0),0)} color="text-warning" />
            <StatusRow label="Próximos 7 dias" count={contasProxSemana.length} value={contasProxSemana.reduce((s,c)=>s+Number(c.valor_previsto??0),0)} color="text-foreground" />
          </div>
        </Card>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Carregando dados...</p>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone, sub }: { icon: any; label: string; value: string; tone: "success"|"destructive"|"primary"; sub?: string }) {
  const toneClass = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <Card className="p-5 relative overflow-hidden">
      <div className={`absolute right-3 top-3 opacity-20 ${toneClass}`}><Icon className="h-8 w-8" /></div>
      <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <Icon className="h-4 w-4 text-primary mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function StatusRow({ label, count, value, color }: { label: string; count: number; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <span className={`text-sm font-medium ${color}`}>{label}</span>
      <div className="text-right">
        <div className="text-sm font-semibold">{formatBRL(value)}</div>
        <div className="text-[10px] text-muted-foreground">{count} conta{count === 1 ? "" : "s"}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, data, labels, color }: { title: string; data: number[]; labels: string[]; color: string }) {
  const chartData = data.map((v, i) => ({ mes: labels[i] ?? "", valor: v }));
  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-muted-foreground mb-3">{title}</div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="mes" tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => formatBRL(v)}
              labelStyle={{ color: "var(--color-muted-foreground)" }}
            />
            <Bar dataKey="valor" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
