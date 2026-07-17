import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { EntitySelect } from "@/components/entity-select";
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Pencil, Trash2, HardDrive } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  ssr: false,
  component: EquipamentosPage,
});

const STATUS = ["pago", "parcial", "pendente"] as const;
const statusLabel = { pago: "Pago", parcial: "Pago parcial", pendente: "Pendente" };
const statusCls: Record<string, string> = {
  pago: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  parcial: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  pendente: "bg-red-500/15 text-red-500 border-red-500/30",
};

function EquipamentosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipamentos").select("*, categorias(nome), fornecedores(nome), bancos(nome)").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const valor = Number(v.valor) || 0;
      const valor_pago = v.status_pagamento === "pago" ? valor : Number(v.valor_pago) || 0;
      const payload = {
        nome: v.nome,
        categoria_id: v.categoria_id || null,
        marca: v.marca || null,
        modelo: v.modelo || null,
        numero_serie: v.numero_serie || null,
        data_compra: v.data_compra || null,
        valor,
        valor_pago,
        status_pagamento: v.status_pagamento,
        situacao: v.situacao || null,
        fornecedor_id: v.fornecedor_id || null,
        banco_id: v.banco_id || null,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("equipamentos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("equipamentos").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Cadastrado"); qc.invalidateQueries({ queryKey: ["equipamentos"] }); qc.invalidateQueries({ queryKey: ["conciliacao-movs"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("equipamentos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["equipamentos"] }); },
  });

  const totais = useMemo(() => ({
    total: rows.reduce((s, r) => s + Number(r.valor ?? 0), 0),
    pago: rows.reduce((s, r) => s + Number(r.valor_pago ?? 0), 0),
    qtde: rows.length,
  }), [rows]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><HardDrive className="h-6 w-6 text-primary" /> Equipamentos</h1>
          <p className="text-sm text-muted-foreground">Máquinas, drones, notebooks e demais bens da empresa.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Novo equipamento</Button></DialogTrigger>
          <EquipamentoForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
        </Dialog>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Quantidade</div><div className="text-2xl font-semibold">{totais.qtde}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Valor total</div><div className="text-2xl font-semibold">{formatBRL(totais.total)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground uppercase">Já pago</div><div className="text-2xl font-semibold text-emerald-500">{formatBRL(totais.pago)}</div></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Data compra</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum equipamento.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}<div className="text-xs text-muted-foreground">{[r.marca, r.modelo].filter(Boolean).join(" · ")}</div></TableCell>
                  <TableCell>{r.categorias?.nome ?? "—"}</TableCell>
                  <TableCell>{r.fornecedores?.nome ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.data_compra)}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(r.valor))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(r.valor_pago))}</TableCell>
                  <TableCell><Badge variant="outline" className={statusCls[r.status_pagamento]}>{statusLabel[r.status_pagamento as keyof typeof statusLabel]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir equipamento?</AlertDialogTitle><AlertDialogDescription>Movimentações relacionadas no histórico serão removidas.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => del.mutate(r.id)}>Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function EquipamentoForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    nome: editing?.nome ?? "",
    categoria_id: editing?.categoria_id ?? null,
    marca: editing?.marca ?? "",
    modelo: editing?.modelo ?? "",
    numero_serie: editing?.numero_serie ?? "",
    data_compra: editing?.data_compra ?? new Date().toISOString().slice(0, 10),
    valor: editing?.valor ?? "",
    valor_pago: editing?.valor_pago ?? "",
    status_pagamento: editing?.status_pagamento ?? "pendente",
    situacao: editing?.situacao ?? "",
    fornecedor_id: editing?.fornecedor_id ?? null,
    banco_id: editing?.banco_id ?? null,
    observacao: editing?.observacao ?? "",
  }));
  const restante = Math.max(0, (Number(v.valor) || 0) - (Number(v.valor_pago) || 0));
  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar equipamento" : "Novo equipamento"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div className="col-span-2"><Label>Nome *</Label><Input required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></div>
        <div><Label>Categoria</Label><EntitySelect table="categorias" value={v.categoria_id} onChange={(id) => setV({ ...v, categoria_id: id })} filter={{ column: "tipo", value: "patrimonio" }} /></div>
        <div><Label>Fornecedor</Label><EntitySelect table="fornecedores" value={v.fornecedor_id} onChange={(id) => setV({ ...v, fornecedor_id: id })} /></div>
        <div><Label>Marca</Label><Input value={v.marca} onChange={(e) => setV({ ...v, marca: e.target.value })} /></div>
        <div><Label>Modelo</Label><Input value={v.modelo} onChange={(e) => setV({ ...v, modelo: e.target.value })} /></div>
        <div><Label>Número de série</Label><Input value={v.numero_serie} onChange={(e) => setV({ ...v, numero_serie: e.target.value })} /></div>
        <div><Label>Data da compra</Label><Input type="date" value={v.data_compra} onChange={(e) => setV({ ...v, data_compra: e.target.value })} /></div>
        <div><Label>Valor *</Label><Input type="number" step="0.01" required value={v.valor} onChange={(e) => setV({ ...v, valor: e.target.value })} /></div>
        <div><Label>Status pagamento</Label>
          <Select value={v.status_pagamento} onValueChange={(s) => setV({ ...v, status_pagamento: s, valor_pago: s === "pago" ? v.valor : s === "pendente" ? 0 : v.valor_pago })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {v.status_pagamento === "parcial" && (
          <>
            <div><Label>Valor pago</Label><Input type="number" step="0.01" value={v.valor_pago} onChange={(e) => setV({ ...v, valor_pago: e.target.value })} /></div>
            <div><Label>Valor restante</Label><Input readOnly value={formatBRL(restante)} /></div>
          </>
        )}
        <div><Label>Banco (origem do pagamento)</Label><EntitySelect table="bancos" value={v.banco_id} onChange={(id) => setV({ ...v, banco_id: id })} /></div>
        <div><Label>Situação</Label><Input value={v.situacao} onChange={(e) => setV({ ...v, situacao: e.target.value })} placeholder="Em uso, Reparo..." /></div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
        <DialogFooter className="col-span-2"><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}