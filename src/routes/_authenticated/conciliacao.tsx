import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Pencil, Trash2, Landmark, ArrowLeftRight, TrendingUp, TrendingDown, Wallet, Filter, History, FileDown } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/conciliacao")({
  ssr: false,
  component: ConciliacaoPage,
});

const ALL = "__all";

function ConciliacaoPage() {
  const [bancoFilter, setBancoFilter] = useState<string>(ALL);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dataIni, setDataIni] = useState<string>(firstDay.toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState<string>(today.toISOString().slice(0, 10));
  const [tab, setTab] = useState<string>("historico");

  const { data: bancos = [] } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Conciliação Bancária</h1>
          <p className="text-sm text-muted-foreground">Histórico, transferências e cadastro de bancos.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <Label className="text-xs mb-1">Banco</Label>
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={bancoFilter} onValueChange={setBancoFilter}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os bancos</SelectItem>
                  {bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col">
            <Label className="text-xs mb-1">Data inicial</Label>
            <Input type="date" className="w-40" value={dataIni} onChange={(e) => setDataIni(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <Label className="text-xs mb-1">Data final</Label>
            <Input type="date" className="w-40" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <RelatorioPdfDialog bancos={bancos} defaultBanco={bancoFilter === ALL ? "" : bancoFilter} defaultIni={dataIni} defaultFim={dataFim} />
        </div>
      </header>

      <ResumoSaldos bancoId={bancoFilter} bancos={bancos} dataIni={dataIni} dataFim={dataFim} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="historico"><History className="h-4 w-4 mr-2" />Histórico</TabsTrigger>
          <TabsTrigger value="transferencias"><ArrowLeftRight className="h-4 w-4 mr-2" />Transferências</TabsTrigger>
          <TabsTrigger value="bancos"><Landmark className="h-4 w-4 mr-2" />Cadastro de bancos</TabsTrigger>
        </TabsList>
        <TabsContent value="historico"><Historico bancoId={bancoFilter} bancos={bancos} dataIni={dataIni} dataFim={dataFim} /></TabsContent>
        <TabsContent value="transferencias"><Transferencias bancoId={bancoFilter} bancos={bancos} /></TabsContent>
        <TabsContent value="bancos"><Bancos /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================= CÁLCULO ============================= */

type BancoMov = { saldoInicial: number; entradas: number; saidas: number; saldoAtual: number };

function useMovimentacoes(dataIni?: string, dataFim?: string) {
  return useQuery({
    queryKey: ["conciliacao-movs", dataIni, dataFim],
    queryFn: async () => {
      let crQ = supabase.from("contas_receber").select("id,banco_id,valor_recebido,status,data_recebimento,descricao,pagador_nome,clientes(nome)").eq("status", "recebido");
      let cpQ = supabase.from("contas_pagar").select("id,banco_id,valor_pago,status,data_pagamento,descricao").eq("status", "pago");
      let trQ = supabase.from("transferencias").select("id,banco_origem_id,banco_destino_id,valor,data_transferencia,observacao");
      if (dataIni) { crQ = crQ.gte("data_recebimento", dataIni); cpQ = cpQ.gte("data_pagamento", dataIni); trQ = trQ.gte("data_transferencia", dataIni); }
      if (dataFim) { crQ = crQ.lte("data_recebimento", dataFim); cpQ = cpQ.lte("data_pagamento", dataFim); trQ = trQ.lte("data_transferencia", dataFim); }
      const [cr, cp, tr] = await Promise.all([crQ, cpQ, trQ]);
      return {
        recebidos: cr.data ?? [],
        pagos: cp.data ?? [],
        transfers: tr.data ?? [],
      };
    },
  });
}

function computeBanco(bancoId: string | null, saldoInicial: number, movs: any): BancoMov {
  const recebidos = movs.recebidos.filter((r: any) => (bancoId ? r.banco_id === bancoId : true))
    .reduce((s: number, r: any) => s + Number(r.valor_recebido ?? 0), 0);
  const pagos = movs.pagos.filter((r: any) => (bancoId ? r.banco_id === bancoId : true))
    .reduce((s: number, r: any) => s + Number(r.valor_pago ?? 0), 0);
  const transfIn = bancoId ? movs.transfers.filter((t: any) => t.banco_destino_id === bancoId).reduce((s: number, t: any) => s + Number(t.valor ?? 0), 0) : 0;
  const transfOut = bancoId ? movs.transfers.filter((t: any) => t.banco_origem_id === bancoId).reduce((s: number, t: any) => s + Number(t.valor ?? 0), 0) : 0;
  const entradas = recebidos + transfIn;
  const saidas = pagos + transfOut;
  return { saldoInicial, entradas, saidas, saldoAtual: saldoInicial + entradas - saidas };
}

/* ============================= RESUMO ============================= */

function ResumoSaldos({ bancoId, bancos, dataIni, dataFim }: { bancoId: string; bancos: any[]; dataIni: string; dataFim: string }) {
  const { data: movs } = useMovimentacoes(dataIni, dataFim);
  const r = useMemo<BancoMov>(() => {
    if (!movs) return { saldoInicial: 0, entradas: 0, saidas: 0, saldoAtual: 0 };
    if (bancoId === ALL) {
      const saldoInicial = bancos.reduce((s, b) => s + Number(b.saldo_inicial ?? 0), 0);
      return computeBanco(null, saldoInicial, movs);
    }
    const b = bancos.find((x) => x.id === bancoId);
    return computeBanco(bancoId, Number(b?.saldo_inicial ?? 0), movs);
  }, [movs, bancoId, bancos]);

  const label = bancoId === ALL ? "Todos os bancos" : (bancos.find((b) => b.id === bancoId)?.nome ?? "");

  return (
    <div className="space-y-2">
      {bancoId !== ALL && <div className="text-xs uppercase tracking-wider text-muted-foreground">Exibindo: <span className="text-foreground font-medium">{label}</span></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Saldo inicial" value={formatBRL(r.saldoInicial)} icon={<Wallet className="h-4 w-4" />} />
        <Kpi label="Entradas" value={formatBRL(r.entradas)} icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} />
        <Kpi label="Saídas" value={formatBRL(r.saidas)} icon={<TrendingDown className="h-4 w-4 text-red-500" />} />
        <Kpi label="Saldo atual" value={formatBRL(r.saldoAtual)} icon={<Landmark className="h-4 w-4 text-primary" />} highlight />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <Card className={`p-4 ${highlight ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

/* ============================= HISTÓRICO ============================= */

type HistItem = {
  id: string;
  tipo: "recebimento" | "pagamento" | "transferencia_out" | "transferencia_in";
  data: string;
  descricao: string;
  banco_id: string | null;
  bancoNome: string;
  valor: number;
  entrada: boolean;
};

function buildHistorico(bancoId: string, bancos: any[], movs: any): HistItem[] {
  const bancoNome = (id: string | null) => bancos.find((b) => b.id === id)?.nome ?? "—";
  const items: HistItem[] = [];
  for (const r of movs.recebidos as any[]) {
    if (bancoId !== ALL && r.banco_id !== bancoId) continue;
    items.push({
      id: r.id, tipo: "recebimento",
      data: r.data_recebimento,
      descricao: `Recebimento: ${r.clientes?.nome ?? r.pagador_nome ?? r.descricao ?? "—"}`,
      banco_id: r.banco_id, bancoNome: bancoNome(r.banco_id),
      valor: Number(r.valor_recebido ?? 0), entrada: true,
    });
  }
  for (const r of movs.pagos as any[]) {
    if (bancoId !== ALL && r.banco_id !== bancoId) continue;
    items.push({
      id: r.id, tipo: "pagamento",
      data: r.data_pagamento,
      descricao: `Pagamento: ${r.descricao ?? "—"}`,
      banco_id: r.banco_id, bancoNome: bancoNome(r.banco_id),
      valor: Number(r.valor_pago ?? 0), entrada: false,
    });
  }
  for (const t of movs.transfers as any[]) {
    if (bancoId === ALL) {
      items.push({
        id: t.id, tipo: "transferencia_out", data: t.data_transferencia,
        descricao: `Transferência: ${bancoNome(t.banco_origem_id)} → ${bancoNome(t.banco_destino_id)}`,
        banco_id: t.banco_origem_id, bancoNome: bancoNome(t.banco_origem_id),
        valor: Number(t.valor ?? 0), entrada: false,
      });
    } else {
      if (t.banco_origem_id === bancoId) {
        items.push({
          id: t.id, tipo: "transferencia_out", data: t.data_transferencia,
          descricao: `Transferência enviada → ${bancoNome(t.banco_destino_id)}`,
          banco_id: t.banco_origem_id, bancoNome: bancoNome(t.banco_origem_id),
          valor: Number(t.valor ?? 0), entrada: false,
        });
      }
      if (t.banco_destino_id === bancoId) {
        items.push({
          id: t.id, tipo: "transferencia_in", data: t.data_transferencia,
          descricao: `Transferência recebida ← ${bancoNome(t.banco_origem_id)}`,
          banco_id: t.banco_destino_id, bancoNome: bancoNome(t.banco_destino_id),
          valor: Number(t.valor ?? 0), entrada: true,
        });
      }
    }
  }
  return items.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
}

function tipoBadge(tipo: HistItem["tipo"]) {
  const map: Record<HistItem["tipo"], { label: string; cls: string }> = {
    recebimento: { label: "Recebimento", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    pagamento: { label: "Pagamento", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
    transferencia_out: { label: "Transferência (saída)", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    transferencia_in: { label: "Transferência (entrada)", cls: "bg-sky-500/15 text-sky-500 border-sky-500/30" },
  };
  return map[tipo];
}

function Historico({ bancoId, bancos, dataIni, dataFim }: { bancoId: string; bancos: any[]; dataIni: string; dataFim: string }) {
  const navigate = useNavigate();
  const { data: movs, isLoading } = useMovimentacoes(dataIni, dataFim);
  const items = useMemo(() => movs ? buildHistorico(bancoId, bancos, movs) : [], [movs, bancoId, bancos]);

  const handleClick = (h: HistItem) => {
    if (h.tipo === "recebimento") navigate({ to: "/financeiro", search: { tab: "receber" } as any });
    else if (h.tipo === "pagamento") navigate({ to: "/financeiro", search: { tab: "pagar" } as any });
    else navigate({ to: "/conciliacao", hash: "transferencias" });
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && items.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sem movimentações no período.</TableCell></TableRow>}
            {items.map((h) => {
              const b = tipoBadge(h.tipo);
              return (
                <TableRow key={`${h.tipo}-${h.id}`} className="cursor-pointer" onClick={() => handleClick(h)}>
                  <TableCell>{formatDate(h.data)}</TableCell>
                  <TableCell><Badge variant="outline" className={b.cls}>{b.label}</Badge></TableCell>
                  <TableCell className="max-w-md truncate">{h.descricao}</TableCell>
                  <TableCell>{h.bancoNome}</TableCell>
                  <TableCell className={`text-right font-medium ${h.entrada ? "text-emerald-500" : "text-red-500"}`}>
                    {h.entrada ? "+" : "−"} {formatBRL(h.valor)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

/* ============================= RELATÓRIO PDF ============================= */

function RelatorioPdfDialog({ bancos, defaultBanco, defaultIni, defaultFim }: { bancos: any[]; defaultBanco: string; defaultIni: string; defaultFim: string }) {
  const [open, setOpen] = useState(false);
  const [bancoId, setBancoId] = useState<string>(defaultBanco || (bancos[0]?.id ?? ""));
  const [ini, setIni] = useState(defaultIni);
  const [fim, setFim] = useState(defaultFim);
  const qc = useQueryClient();

  const gerar = async () => {
    if (!bancoId) { toast.error("Selecione um banco"); return; }
    const movs = await qc.fetchQuery({
      queryKey: ["conciliacao-movs", ini, fim],
      queryFn: async () => {
        const [cr, cp, tr] = await Promise.all([
          supabase.from("contas_receber").select("id,banco_id,valor_recebido,status,data_recebimento,descricao,pagador_nome,clientes(nome)").eq("status", "recebido").gte("data_recebimento", ini).lte("data_recebimento", fim),
          supabase.from("contas_pagar").select("id,banco_id,valor_pago,status,data_pagamento,descricao").eq("status", "pago").gte("data_pagamento", ini).lte("data_pagamento", fim),
          supabase.from("transferencias").select("id,banco_origem_id,banco_destino_id,valor,data_transferencia,observacao").gte("data_transferencia", ini).lte("data_transferencia", fim),
        ]);
        return { recebidos: cr.data ?? [], pagos: cp.data ?? [], transfers: tr.data ?? [] };
      },
    });
    const items = buildHistorico(bancoId, bancos, movs);
    const banco = bancos.find((b) => b.id === bancoId);
    const saldoInicial = Number(banco?.saldo_inicial ?? 0);
    const r = computeBanco(bancoId, saldoInicial, movs);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Relatório Bancário", 14, 18);
    doc.setFontSize(10);
    doc.text(`Banco: ${banco?.nome ?? "—"}`, 14, 26);
    doc.text(`Período: ${formatDate(ini)} a ${formatDate(fim)}`, 14, 32);
    doc.text(`Saldo inicial: ${formatBRL(r.saldoInicial)}   Entradas: ${formatBRL(r.entradas)}   Saídas: ${formatBRL(r.saidas)}   Saldo atual: ${formatBRL(r.saldoAtual)}`, 14, 38);

    autoTable(doc, {
      startY: 44,
      head: [["Data", "Tipo", "Descrição", "Valor"]],
      body: items.map((h) => [
        formatDate(h.data),
        tipoBadge(h.tipo).label,
        h.descricao,
        `${h.entrada ? "+" : "-"} ${formatBRL(h.valor)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 41, 59] },
    });
    doc.save(`relatorio-${banco?.nome ?? "banco"}-${ini}-${fim}.pdf`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><FileDown className="h-4 w-4 mr-1" />Relatório PDF</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Relatório por banco (PDF)</DialogTitle></DialogHeader>
        <div className="grid gap-4 pt-2">
          <div>
            <Label>Banco *</Label>
            <Select value={bancoId} onValueChange={setBancoId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>{bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Data inicial *</Label><Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
            <div><Label>Data final *</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={gerar}><FileDown className="h-4 w-4 mr-1" />Gerar PDF</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================= BANCOS ============================= */

function Bancos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["bancos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bancos").select("*").order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const payload = { nome: v.nome, saldo_inicial: Number(v.saldo_inicial) || 0 };
      if (editing?.id) {
        const { error } = await supabase.from("bancos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bancos").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Cadastrado");
      qc.invalidateQueries({ queryKey: ["bancos"] });
      qc.invalidateQueries({ queryKey: ["conciliacao-movs"] });
      qc.invalidateQueries({ queryKey: ["select-bancos"] });
      setOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("bancos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["bancos"] }); qc.invalidateQueries({ queryKey: ["conciliacao-movs"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo banco</Button></DialogTrigger>
          <BancoForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
        </Dialog>
      </div>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Banco / Conta</TableHead>
              <TableHead className="text-right">Saldo inicial</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum banco cadastrado.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-right">{formatBRL(Number(r.saldo_inicial))}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir banco?</AlertDialogTitle><AlertDialogDescription>Transferências vinculadas ficarão sem referência.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function BancoForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    nome: editing?.nome ?? "",
    saldo_inicial: editing?.saldo_inicial ?? "",
  }));
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>{editing ? "Editar banco" : "Novo banco / conta"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid gap-4 pt-2">
        <div><Label>Nome *</Label><Input required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} placeholder="Ex.: Itaú - Corrente" /></div>
        <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={v.saldo_inicial} onChange={(e) => setV({ ...v, saldo_inicial: e.target.value })} /></div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ============================= TRANSFERÊNCIAS ============================= */

function Transferencias({ bancoId, bancos }: { bancoId: string; bancos: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["transferencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transferencias")
        .select("*, origem:banco_origem_id(nome), destino:banco_destino_id(nome)")
        .order("data_transferencia", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => bancoId === ALL ? rows : rows.filter((r) => r.banco_origem_id === bancoId || r.banco_destino_id === bancoId), [rows, bancoId]);

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const payload = {
        data_transferencia: v.data_transferencia,
        banco_origem_id: v.banco_origem_id || null,
        banco_destino_id: v.banco_destino_id || null,
        valor: Number(v.valor) || 0,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("transferencias").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("transferencias").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Registrada"); qc.invalidateQueries({ queryKey: ["transferencias"] }); qc.invalidateQueries({ queryKey: ["conciliacao-movs"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("transferencias").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removida"); qc.invalidateQueries({ queryKey: ["transferencias"] }); qc.invalidateQueries({ queryKey: ["conciliacao-movs"] }); },
  });

  const total = useMemo(() => filtered.reduce((s, r) => s + Number(r.valor ?? 0), 0), [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Transferências" value={String(filtered.length)} icon={<ArrowLeftRight className="h-4 w-4" />} />
        <Kpi label="Volume movimentado" value={formatBRL(total)} icon={<Wallet className="h-4 w-4" />} />
        <div />
        <div className="flex items-end justify-end">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button disabled={bancos.length < 1}><Plus className="h-4 w-4 mr-1" />Nova transferência</Button></DialogTrigger>
            <TransferForm editing={editing} bancos={bancos} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
          </Dialog>
        </div>
      </div>

      {bancos.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Cadastre pelo menos um banco na aba <span className="font-medium">Bancos</span> antes de registrar transferências.
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Data</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma transferência registrada.</TableCell></TableRow>}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{formatDate(r.data_transferencia)}</TableCell>
                <TableCell>{r.origem?.nome ?? "—"}</TableCell>
                <TableCell>{r.destino?.nome ?? "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatBRL(Number(r.valor))}</TableCell>
                <TableCell className="max-w-64 truncate text-muted-foreground">{r.observacao ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir transferência?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function TransferForm({ editing, bancos, onSubmit, loading }: { editing: any | null; bancos: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    data_transferencia: editing?.data_transferencia ?? new Date().toISOString().slice(0, 10),
    banco_origem_id: editing?.banco_origem_id ?? "",
    banco_destino_id: editing?.banco_destino_id ?? "",
    valor: editing?.valor ?? "",
    observacao: editing?.observacao ?? "",
  }));

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Editar transferência" : "Nova transferência"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div className="col-span-2"><Label>Data *</Label><Input type="date" required value={v.data_transferencia} onChange={(e) => setV({ ...v, data_transferencia: e.target.value })} /></div>
        <div>
          <Label>Banco origem *</Label>
          <Select value={v.banco_origem_id || undefined} onValueChange={(id) => setV({ ...v, banco_origem_id: id })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Banco destino *</Label>
          <Select value={v.banco_destino_id || undefined} onValueChange={(id) => setV({ ...v, banco_destino_id: id })}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Valor *</Label><Input type="number" step="0.01" required value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} /></div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
        <DialogFooter className="col-span-2"><Button type="submit" disabled={loading || !v.banco_origem_id || !v.banco_destino_id}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}
