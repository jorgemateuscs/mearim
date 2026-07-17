import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
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
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Pencil, Trash2, Landmark, ArrowLeftRight, TrendingUp, TrendingDown, Wallet, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conciliacao")({
  ssr: false,
  component: ConciliacaoPage,
});

const ALL = "__all";

function ConciliacaoPage() {
  const [bancoFilter, setBancoFilter] = useState<string>(ALL);

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
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Conciliação Bancária</h1>
          <p className="text-sm text-muted-foreground">Contas bancárias, transferências e saldos por banco.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={bancoFilter} onValueChange={setBancoFilter}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar banco..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os bancos</SelectItem>
              {bancos.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <ResumoSaldos bancoId={bancoFilter} bancos={bancos} />

      <Tabs defaultValue="saldos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="saldos"><Wallet className="h-4 w-4 mr-2" />Saldos por banco</TabsTrigger>
          <TabsTrigger value="bancos"><Landmark className="h-4 w-4 mr-2" />Bancos</TabsTrigger>
          <TabsTrigger value="transferencias"><ArrowLeftRight className="h-4 w-4 mr-2" />Transferências</TabsTrigger>
        </TabsList>
        <TabsContent value="saldos"><SaldosPorBanco bancos={bancos} /></TabsContent>
        <TabsContent value="bancos"><Bancos /></TabsContent>
        <TabsContent value="transferencias"><Transferencias bancoId={bancoFilter} bancos={bancos} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================= CÁLCULO ============================= */

type BancoMov = { saldoInicial: number; entradas: number; saidas: number; saldoAtual: number };

function useMovimentacoes() {
  return useQuery({
    queryKey: ["conciliacao-movs"],
    queryFn: async () => {
      const [cr, cp, tr] = await Promise.all([
        supabase.from("contas_receber").select("banco_id,valor_recebido,status"),
        supabase.from("contas_pagar").select("banco_id,valor_pago,status"),
        supabase.from("transferencias").select("banco_origem_id,banco_destino_id,valor"),
      ]);
      return {
        recebidos: (cr.data ?? []).filter((r) => r.status === "recebido"),
        pagos: (cp.data ?? []).filter((r) => r.status === "pago"),
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

function ResumoSaldos({ bancoId, bancos }: { bancoId: string; bancos: any[] }) {
  const { data: movs } = useMovimentacoes();
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

/* ============================= SALDOS POR BANCO ============================= */

function SaldosPorBanco({ bancos }: { bancos: any[] }) {
  const { data: movs, isLoading } = useMovimentacoes();
  const rows = useMemo(() => {
    if (!movs) return [] as (BancoMov & { id: string; nome: string })[];
    return bancos.map((b) => ({ id: b.id, nome: b.nome, ...computeBanco(b.id, Number(b.saldo_inicial ?? 0), movs) }));
  }, [movs, bancos]);

  const totais = useMemo(() => rows.reduce((acc, r) => ({
    saldoInicial: acc.saldoInicial + r.saldoInicial,
    entradas: acc.entradas + r.entradas,
    saidas: acc.saidas + r.saidas,
    saldoAtual: acc.saldoAtual + r.saldoAtual,
  }), { saldoInicial: 0, entradas: 0, saidas: 0, saldoAtual: 0 }), [rows]);

  return (
    <Card className="overflow-hidden p-0">
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
          {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
          {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum banco cadastrado.</TableCell></TableRow>}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.nome}</TableCell>
              <TableCell className="text-right">{formatBRL(r.saldoInicial)}</TableCell>
              <TableCell className="text-right text-emerald-500">{formatBRL(r.entradas)}</TableCell>
              <TableCell className="text-right text-red-500">{formatBRL(r.saidas)}</TableCell>
              <TableCell className="text-right font-semibold">{formatBRL(r.saldoAtual)}</TableCell>
            </TableRow>
          ))}
          {rows.length > 0 && (
            <TableRow className="bg-muted/20 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatBRL(totais.saldoInicial)}</TableCell>
              <TableCell className="text-right text-emerald-500">{formatBRL(totais.entradas)}</TableCell>
              <TableCell className="text-right text-red-500">{formatBRL(totais.saidas)}</TableCell>
              <TableCell className="text-right">{formatBRL(totais.saldoAtual)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
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
