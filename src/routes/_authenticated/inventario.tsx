import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { AuditInfo } from "@/components/audit-info";
import { Plus, Pencil, Trash2, Boxes } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventario")({
  ssr: false,
  component: InventarioPage,
});

const CATEGORIAS = [
  { value: "peca", label: "Peça" },
  { value: "equipamento", label: "Equipamento" },
];

const STATUS = [
  { value: "pago", label: "Pago", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  { value: "parcial", label: "Pago parcialmente", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  { value: "pendente", label: "Pendente", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
];

function statusInfo(s: string) { return STATUS.find((x) => x.value === s) ?? { value: s, label: s, cls: "bg-muted" }; }
function categoriaLabel(c: string) { return CATEGORIAS.find((x) => x.value === c)?.label ?? c; }

function InventarioPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [detalhe, setDetalhe] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventario").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const valor_total = Number(v.valor_total) || 0;
      const valor_pago = v.status_pagamento === "pago" ? valor_total : v.status_pagamento === "pendente" ? 0 : Number(v.valor_pago) || 0;
      const payload = {
        nome: v.nome,
        categoria: v.categoria,
        descricao: v.descricao || null,
        quantidade: Number(v.quantidade) || 1,
        valor_total,
        valor_pago,
        status_pagamento: v.status_pagamento,
        data_aquisicao: v.data_aquisicao || null,
        fornecedor: v.fornecedor || null,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("inventario").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventario").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Cadastrado"); qc.invalidateQueries(); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("inventario").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries(); },
  });

  const filtered = useMemo(() => rows.filter((r) => (filtroCat === "todas" || r.categoria === filtroCat) && (filtroStatus === "todos" || r.status_pagamento === filtroStatus)), [rows, filtroCat, filtroStatus]);

  const totais = useMemo(() => ({
    itens: rows.length,
    valor: rows.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
    pago: rows.reduce((s, r) => s + Number(r.valor_pago ?? 0), 0),
    restante: rows.reduce((s, r) => s + (Number(r.valor_total ?? 0) - Number(r.valor_pago ?? 0)), 0),
  }), [rows]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Boxes className="h-6 w-6" />Gerenciar Inventário</h1>
        <p className="text-sm text-muted-foreground">Cadastro de peças e equipamentos com controle de pagamento.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Itens" value={String(totais.itens)} />
        <Stat label="Valor total" value={formatBRL(totais.valor)} />
        <Stat label="Pago" value={formatBRL(totais.pago)} tone="ok" />
        <Stat label="Restante" value={formatBRL(totais.restante)} tone="warn" />
      </div>

      <div className="flex flex-wrap items-end justify-end gap-2">
        <div>
          <Label className="text-xs mb-1">Categoria</Label>
          <Select value={filtroCat} onValueChange={setFiltroCat}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1">Status</Label>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" />Novo item</Button></DialogTrigger>
          <InventarioForm key={editing?.id ?? "new"} editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
        </Dialog>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Aquisição</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum item.</TableCell></TableRow>}
              {filtered.map((r) => {
                const info = statusInfo(r.status_pagamento);
                const restante = Number(r.valor_total ?? 0) - Number(r.valor_pago ?? 0);
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetalhe(r)}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{categoriaLabel(r.categoria)}</TableCell>
                    <TableCell>{r.data_aquisicao ? formatDate(r.data_aquisicao) : "—"}</TableCell>
                    <TableCell className="text-right">{Number(r.quantidade)}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.valor_total))}</TableCell>
                    <TableCell className="text-right text-emerald-500">{formatBRL(Number(r.valor_pago))}</TableCell>
                    <TableCell className="text-right text-amber-500">{formatBRL(restante)}</TableCell>
                    <TableCell><Badge variant="outline" className={info.cls}>{info.label}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir item?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
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

      <Dialog open={!!detalhe} onOpenChange={(v) => { if (!v) setDetalhe(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detalhe?.nome}</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="space-y-2 text-sm">
              <Info label="Categoria" value={categoriaLabel(detalhe.categoria)} />
              <Info label="Data de aquisição" value={detalhe.data_aquisicao ? formatDate(detalhe.data_aquisicao) : "—"} />
              <Info label="Quantidade" value={String(Number(detalhe.quantidade ?? 0))} />
              <Info label="Fornecedor" value={detalhe.fornecedor || "—"} />
              <Info label="Valor total" value={formatBRL(Number(detalhe.valor_total ?? 0))} />
              <Info label="Valor pago" value={formatBRL(Number(detalhe.valor_pago ?? 0))} />
              <Info label="Valor restante" value={formatBRL(Number(detalhe.valor_total ?? 0) - Number(detalhe.valor_pago ?? 0))} />
              <Info label="Status" value={statusInfo(detalhe.status_pagamento).label} />
              <Info label="Descrição" value={detalhe.descricao || "—"} />
              <Info label="Observações" value={detalhe.observacao || "—"} />
              <AuditInfo row={detalhe} />
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setDetalhe(null)}>Fechar</Button>
                <Button onClick={() => { setEditing(detalhe); setDetalhe(null); setOpen(true); }}>Editar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/50 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function InventarioForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    nome: editing?.nome ?? "",
    categoria: editing?.categoria ?? "peca",
    descricao: editing?.descricao ?? "",
    quantidade: editing?.quantidade ?? 1,
    valor_total: editing?.valor_total ?? "",
    valor_pago: editing?.valor_pago ?? "",
    status_pagamento: editing?.status_pagamento ?? "pendente",
    data_aquisicao: editing?.data_aquisicao ?? new Date().toISOString().slice(0, 10),
    fornecedor: editing?.fornecedor ?? "",
    observacao: editing?.observacao ?? "",
  }));

  const total = Number(v.valor_total) || 0;
  const pago = v.status_pagamento === "pago" ? total : v.status_pagamento === "pendente" ? 0 : Number(v.valor_pago) || 0;
  const restante = Math.max(0, total - pago);

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div className="col-span-2"><Label>Nome *</Label><Input required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></div>
        <div>
          <Label>Categoria *</Label>
          <Select value={v.categoria} onValueChange={(c) => setV({ ...v, categoria: c })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Data de aquisição</Label><Input type="date" value={v.data_aquisicao} onChange={(e) => setV({ ...v, data_aquisicao: e.target.value })} /></div>
        <div><Label>Quantidade *</Label><Input type="number" step="1" min="1" required value={v.quantidade} onChange={(e) => setV({ ...v, quantidade: e.target.value })} /></div>
        <div><Label>Fornecedor</Label><Input value={v.fornecedor} onChange={(e) => setV({ ...v, fornecedor: e.target.value })} /></div>
        <div><Label>Valor total *</Label><Input type="number" step="0.01" required value={v.valor_total} onChange={(e) => setV({ ...v, valor_total: e.target.value })} /></div>
        <div>
          <Label>Status pagamento *</Label>
          <Select value={v.status_pagamento} onValueChange={(s) => setV({ ...v, status_pagamento: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {v.status_pagamento === "parcial" && (
          <>
            <div><Label>Valor pago</Label><Input type="number" step="0.01" value={v.valor_pago} onChange={(e) => setV({ ...v, valor_pago: e.target.value })} /></div>
            <div><Label>Valor restante</Label><Input readOnly value={formatBRL(restante)} /></div>
          </>
        )}
        <div className="col-span-2"><Label>Descrição</Label><Textarea rows={2} value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></div>
        <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
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