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
import { Badge } from "@/components/ui/badge";
import { EntitySelect } from "@/components/entity-select";
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Pencil, Trash2, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  ssr: false,
  component: FinanceiroPage,
});

function FinanceiroPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Contas a pagar e contas a receber.</p>
      </header>
      <Tabs defaultValue="pagar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pagar"><ArrowUpCircle className="h-4 w-4 mr-2" />Contas a pagar</TabsTrigger>
          <TabsTrigger value="receber"><ArrowDownCircle className="h-4 w-4 mr-2" />Contas a receber</TabsTrigger>
        </TabsList>
        <TabsContent value="pagar"><ContasPagar /></TabsContent>
        <TabsContent value="receber"><ContasReceber /></TabsContent>
      </Tabs>
    </div>
  );
}

const STATUS_PAGAR = ["pendente", "pago", "atrasado"];
const STATUS_RECEBER = ["pendente", "recebido", "atrasado"];

function statusInfo(s: string | null) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    pago: { label: "Pago", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    recebido: { label: "Recebido", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    atrasado: { label: "Atrasado", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  };
  return map[s ?? ""] ?? { label: s ?? "—", cls: "bg-muted text-muted-foreground" };
}

/* ============================= PAGAR ============================= */

function ContasPagar() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contas_pagar_full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_pagar").select("*").order("data_vencimento", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const payload = {
        descricao: v.descricao,
        categoria: v.categoria || null,
        data_vencimento: v.data_vencimento,
        valor_previsto: Number(v.valor_previsto) || 0,
        data_pagamento: v.data_pagamento || null,
        valor_pago: v.valor_pago === "" ? null : Number(v.valor_pago),
        status: v.status || "pendente",
        forma_pagamento: v.forma_pagamento || null,
        local_saida: v.local_saida || null,
        banco_id: v.banco_id || null,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("contas_pagar").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_pagar").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Cadastrado"); qc.invalidateQueries({ queryKey: ["contas_pagar_full"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contas_pagar").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["contas_pagar_full"] }); },
  });

  const quitar = useMutation({
    mutationFn: async (row: any) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("contas_pagar").update({
        status: "pago",
        data_pagamento: row.data_pagamento ?? today,
        valor_pago: row.valor_pago ?? row.valor_previsto,
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marcada como paga"); qc.invalidateQueries({ queryKey: ["contas_pagar_full"] }); },
  });

  const filtered = statusFilter === "todos" ? rows : rows.filter((r) => r.status === statusFilter);
  const totais = useMemo(() => ({
    previsto: rows.reduce((s, r) => s + Number(r.valor_previsto ?? 0), 0),
    pago: rows.filter((r) => r.status === "pago").reduce((s, r) => s + Number(r.valor_pago ?? 0), 0),
    pendente: rows.filter((r) => r.status !== "pago").reduce((s, r) => s + Number(r.valor_previsto ?? 0), 0),
  }), [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total previsto" value={formatBRL(totais.previsto)} />
        <Stat label="Pago" value={formatBRL(totais.pago)} tone="ok" />
        <Stat label="Em aberto" value={formatBRL(totais.pendente)} tone="warn" />
        <div className="flex items-end justify-end gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_PAGAR.map((s) => <SelectItem key={s} value={s}>{statusInfo(s).label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova conta</Button></DialogTrigger>
            <PagarForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta.</TableCell></TableRow>}
              {filtered.map((r) => {
                const info = statusInfo(r.status);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{r.categoria ?? "—"}</TableCell>
                    <TableCell>{formatDate(r.data_vencimento)}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.valor_previsto))}</TableCell>
                    <TableCell className="text-right">{r.valor_pago != null ? formatBRL(Number(r.valor_pago)) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={info.cls}>{info.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.status !== "pago" && (
                          <Button size="icon" variant="ghost" title="Marcar como paga" onClick={() => quitar.mutate(r)}><CheckCircle2 className="h-4 w-4 text-emerald-500" /></Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir conta?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function PagarForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    descricao: editing?.descricao ?? "",
    categoria: editing?.categoria ?? "",
    data_vencimento: editing?.data_vencimento ?? new Date().toISOString().slice(0, 10),
    valor_previsto: editing?.valor_previsto ?? "",
    data_pagamento: editing?.data_pagamento ?? "",
    valor_pago: editing?.valor_pago ?? "",
    status: editing?.status ?? "pendente",
    forma_pagamento: editing?.forma_pagamento ?? "",
    local_saida: editing?.local_saida ?? "",
    banco_id: editing?.banco_id ?? null,
    observacao: editing?.observacao ?? "",
  }));

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar conta" : "Nova conta a pagar"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div className="col-span-2"><Label>Descrição *</Label><Input required value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></div>
        <div><Label>Categoria</Label><Input value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })} /></div>
        <div><Label>Status</Label>
          <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_PAGAR.map((s) => <SelectItem key={s} value={s}>{statusInfo(s).label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Vencimento *</Label><Input type="date" required value={v.data_vencimento} onChange={(e) => setV({ ...v, data_vencimento: e.target.value })} /></div>
        <div><Label>Valor previsto *</Label><Input type="number" step="0.01" required value={v.valor_previsto} onChange={(e) => setV({ ...v, valor_previsto: e.target.value })} /></div>
        <div><Label>Data pagamento</Label><Input type="date" value={v.data_pagamento} onChange={(e) => setV({ ...v, data_pagamento: e.target.value })} /></div>
        <div><Label>Valor pago</Label><Input type="number" step="0.01" value={v.valor_pago} onChange={(e) => setV({ ...v, valor_pago: e.target.value })} /></div>
        <div><Label>Forma de pagamento</Label><Input value={v.forma_pagamento} onChange={(e) => setV({ ...v, forma_pagamento: e.target.value })} /></div>
        <div><Label>Local de saída</Label><Input value={v.local_saida} onChange={(e) => setV({ ...v, local_saida: e.target.value })} /></div>
        <div className="col-span-2"><Label>Banco</Label><EntitySelect table="bancos" value={v.banco_id} onChange={(id) => setV({ ...v, banco_id: id })} /></div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
        <DialogFooter className="col-span-2"><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ============================= RECEBER ============================= */

function ContasReceber() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["contas_receber_full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contas_receber").select("*, clientes(nome)").order("data_vencimento", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const payload = {
        cliente_id: v.cliente_id || null,
        pagador_nome: v.pagador_nome || null,
        contato: v.contato || null,
        cpf_cnpj: v.cpf_cnpj || null,
        descricao: v.descricao,
        data_venda: v.data_venda || null,
        parcela: v.parcela || null,
        valor_parcela: Number(v.valor_parcela) || 0,
        data_vencimento: v.data_vencimento,
        data_recebimento: v.data_recebimento || null,
        valor_recebido: v.valor_recebido === "" ? null : Number(v.valor_recebido),
        status: v.status || "pendente",
        local_recebimento: v.local_recebimento || null,
        banco_id: v.banco_id || null,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("contas_receber").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_receber").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Cadastrado"); qc.invalidateQueries({ queryKey: ["contas_receber_full"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("contas_receber").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["contas_receber_full"] }); },
  });

  const receber = useMutation({
    mutationFn: async (row: any) => {
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from("contas_receber").update({
        status: "recebido",
        data_recebimento: row.data_recebimento ?? today,
        valor_recebido: row.valor_recebido ?? row.valor_parcela,
      }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Marcada como recebida"); qc.invalidateQueries({ queryKey: ["contas_receber_full"] }); },
  });

  const filtered = statusFilter === "todos" ? rows : rows.filter((r) => r.status === statusFilter);
  const totais = useMemo(() => ({
    previsto: rows.reduce((s, r) => s + Number(r.valor_parcela ?? 0), 0),
    recebido: rows.filter((r) => r.status === "recebido").reduce((s, r) => s + Number(r.valor_recebido ?? 0), 0),
    pendente: rows.filter((r) => r.status !== "recebido").reduce((s, r) => s + Number(r.valor_parcela ?? 0), 0),
  }), [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total previsto" value={formatBRL(totais.previsto)} />
        <Stat label="Recebido" value={formatBRL(totais.recebido)} tone="ok" />
        <Stat label="Em aberto" value={formatBRL(totais.pendente)} tone="warn" />
        <div className="flex items-end justify-end gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS_RECEBER.map((s) => <SelectItem key={s} value={s}>{statusInfo(s).label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova conta</Button></DialogTrigger>
            <ReceberForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta.</TableCell></TableRow>}
              {filtered.map((r) => {
                const info = statusInfo(r.status);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.clientes?.nome ?? r.pagador_nome ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{r.parcela ?? "—"}</TableCell>
                    <TableCell>{formatDate(r.data_vencimento)}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.valor_parcela))}</TableCell>
                    <TableCell className="text-right">{r.valor_recebido != null ? formatBRL(Number(r.valor_recebido)) : "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={info.cls}>{info.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.status !== "recebido" && (
                          <Button size="icon" variant="ghost" title="Marcar como recebida" onClick={() => receber.mutate(r)}><CheckCircle2 className="h-4 w-4 text-emerald-500" /></Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir conta?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function ReceberForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    cliente_id: editing?.cliente_id ?? null,
    pagador_nome: editing?.pagador_nome ?? "",
    contato: editing?.contato ?? "",
    cpf_cnpj: editing?.cpf_cnpj ?? "",
    descricao: editing?.descricao ?? "",
    data_venda: editing?.data_venda ?? new Date().toISOString().slice(0, 10),
    parcela: editing?.parcela ?? "",
    valor_parcela: editing?.valor_parcela ?? "",
    data_vencimento: editing?.data_vencimento ?? new Date().toISOString().slice(0, 10),
    data_recebimento: editing?.data_recebimento ?? "",
    valor_recebido: editing?.valor_recebido ?? "",
    status: editing?.status ?? "pendente",
    local_recebimento: editing?.local_recebimento ?? "",
    observacao: editing?.observacao ?? "",
  }));

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar conta" : "Nova conta a receber"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div><Label>Cliente</Label><EntitySelect table="clientes" value={v.cliente_id} onChange={(id) => setV({ ...v, cliente_id: id })} /></div>
        <div><Label>Pagador (avulso)</Label><Input value={v.pagador_nome} onChange={(e) => setV({ ...v, pagador_nome: e.target.value })} /></div>
        <div><Label>Contato</Label><Input value={v.contato} onChange={(e) => setV({ ...v, contato: e.target.value })} /></div>
        <div><Label>CPF/CNPJ</Label><Input value={v.cpf_cnpj} onChange={(e) => setV({ ...v, cpf_cnpj: e.target.value })} /></div>
        <div className="col-span-2"><Label>Descrição *</Label><Input required value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></div>
        <div><Label>Data venda</Label><Input type="date" value={v.data_venda} onChange={(e) => setV({ ...v, data_venda: e.target.value })} /></div>
        <div><Label>Parcela (ex.: 1/3)</Label><Input value={v.parcela} onChange={(e) => setV({ ...v, parcela: e.target.value })} /></div>
        <div><Label>Vencimento *</Label><Input type="date" required value={v.data_vencimento} onChange={(e) => setV({ ...v, data_vencimento: e.target.value })} /></div>
        <div><Label>Valor da parcela *</Label><Input type="number" step="0.01" required value={v.valor_parcela} onChange={(e) => setV({ ...v, valor_parcela: e.target.value })} /></div>
        <div><Label>Data recebimento</Label><Input type="date" value={v.data_recebimento} onChange={(e) => setV({ ...v, data_recebimento: e.target.value })} /></div>
        <div><Label>Valor recebido</Label><Input type="number" step="0.01" value={v.valor_recebido} onChange={(e) => setV({ ...v, valor_recebido: e.target.value })} /></div>
        <div><Label>Local de recebimento</Label><Input value={v.local_recebimento} onChange={(e) => setV({ ...v, local_recebimento: e.target.value })} /></div>
        <div><Label>Status</Label>
          <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_RECEBER.map((s) => <SelectItem key={s} value={s}>{statusInfo(s).label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
        <DialogFooter className="col-span-2"><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const cls = tone === "ok" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "";
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${cls}`}>{value}</div>
    </Card>
  );
}
