import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
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

function PainelPage() {
  const year = new Date().getFullYear();
  const startYear = `${year}-01-01`;
  const endYear = `${year}-12-31`;
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const monthStart = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["painel", year],
    queryFn: async () => {
      const [vp, vs, cp, cr, cli, prod] = await Promise.all([
        supabase.from("vendas_produtos").select("data_venda,valor_total,custo_total").gte("data_venda", startYear).lte("data_venda", endYear),
        supabase.from("vendas_servicos").select("data_venda,valor_venda,valor_recebido,custo").gte("data_venda", startYear).lte("data_venda", endYear),
        supabase.from("contas_pagar").select("data_vencimento,valor_previsto,valor_pago,status,categoria").gte("data_vencimento", startYear).lte("data_vencimento", endYear),
        supabase.from("contas_receber").select("data_vencimento,valor_parcela,valor_recebido,status").gte("data_vencimento", startYear).lte("data_vencimento", endYear),
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

  const receitasMes = Array(12).fill(0);
  const despesasMes = Array(12).fill(0);
  const lucroMes = Array(12).fill(0);
  (data?.vendasProd ?? []).forEach((v) => {
    const m = new Date(v.data_venda + "T00:00:00").getMonth();
    receitasMes[m] += Number(v.valor_total ?? 0);
    lucroMes[m] += Number(v.valor_total ?? 0) - Number(v.custo_total ?? 0);
  });
  (data?.vendasServ ?? []).forEach((v) => {
    const m = new Date(v.data_venda + "T00:00:00").getMonth();
    receitasMes[m] += Number(v.valor_recebido ?? 0);
    lucroMes[m] += Number(v.valor_recebido ?? 0) - Number(v.custo ?? 0);
  });
  (data?.contasPagar ?? []).forEach((c) => {
    const m = new Date(c.data_vencimento + "T00:00:00").getMonth();
    despesasMes[m] += Number(c.valor_pago ?? 0);
  });

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
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio · {year}</p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={TrendingUp} label="Faturamento" value={formatBRL(faturamento)} tone="success" sub={`Produtos ${formatBRL(fatProdutos)} · Serviços ${formatBRL(fatServicos)}`} />
        <Kpi icon={TrendingDown} label="Despesas" value={formatBRL(despesas)} tone="destructive" />
        <Kpi icon={Wallet} label="Saldo" value={formatBRL(saldo)} tone={saldo >= 0 ? "success" : "destructive"} />
        <Kpi icon={Package} label="Valor em estoque" value={formatBRL(estoqueValor)} tone="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Faturamento mensal" data={receitasMes} color="var(--color-chart-1)" />
        <ChartCard title="Despesas mensais" data={despesasMes} color="var(--color-chart-5)" />
        <ChartCard title="Lucro mensal" data={lucroMes} color="var(--color-chart-2)" />
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

function ChartCard({ title, data, color }: { title: string; data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ mes: MESES[i], valor: v }));
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
