import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { EntitySelect } from "@/components/entity-select";
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Pencil, Trash2, Package, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/vendas")({
  ssr: false,
  component: VendasPage,
});

function VendasPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vendas</h1>
        <p className="text-sm text-muted-foreground">Registro de vendas de produtos e serviços.</p>
      </header>
      <Tabs defaultValue="produtos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="produtos"><Package className="h-4 w-4 mr-2" />Produtos</TabsTrigger>
          <TabsTrigger value="servicos"><Scissors className="h-4 w-4 mr-2" />Serviços</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos"><VendasProdutos /></TabsContent>
        <TabsContent value="servicos"><VendasServicos /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================= PRODUTOS ============================= */

function VendasProdutos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vendas_produtos_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_produtos")
        .select("*, clientes(nome), produtos(nome)")
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const quantidade = Number(v.quantidade) || 0;
      const valor_unitario = Number(v.valor_unitario) || 0;
      const custo_unitario = Number(v.custo_unitario) || 0;
      const valor_total = quantidade * valor_unitario;
      const custo_total = quantidade * custo_unitario;
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id; if (!user_id) throw new Error("Não autenticado");
      const payload = {
        data_venda: v.data_venda,
        cliente_id: v.cliente_id || null,
        produto_id: v.produto_id || null,
        descricao: v.descricao || null,
        quantidade,
        valor_unitario,
        valor_total,
        custo_total,
        forma_pagamento: v.forma_pagamento || null,
        local_recebimento: v.local_recebimento || null,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("vendas_produtos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendas_produtos").insert({ ...payload, user_id });
        if (error) throw error;
        // baixa de estoque
        if (v.produto_id && quantidade > 0) {
          const { data: p } = await supabase.from("produtos").select("qtde_vendida").eq("id", v.produto_id).maybeSingle();
          const atual = Number(p?.qtde_vendida ?? 0);
          await supabase.from("produtos").update({ qtde_vendida: atual + quantidade }).eq("id", v.produto_id);
        }
        // gerar conta a receber
        if (v.gerar_receber) {
          await supabase.from("contas_receber").insert({
            user_id,
            cliente_id: v.cliente_id || null,
            descricao: `Venda de produto${v.descricao ? " - " + v.descricao : ""}`,
            data_venda: v.data_venda,
            valor_parcela: valor_total,
            data_vencimento: v.data_venda,
            status: "pendente",
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Venda registrada");
      qc.invalidateQueries();
      setOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas_produtos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries(); },
  });

  const total = rows.reduce((s, r) => s + Number(r.valor_total ?? 0), 0);
  const lucro = rows.reduce((s, r) => s + (Number(r.valor_total ?? 0) - Number(r.custo_total ?? 0)), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Vendas" value={String(rows.length)} />
        <Stat label="Faturamento" value={formatBRL(total)} />
        <Stat label="Lucro" value={formatBRL(lucro)} />
        <div className="flex items-end justify-end">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova venda</Button></DialogTrigger>
            <VendaProdutoForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma venda registrada.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.data_venda)}</TableCell>
                  <TableCell>{r.clientes?.nome ?? "—"}</TableCell>
                  <TableCell>{r.produtos?.nome ?? r.descricao ?? "—"}</TableCell>
                  <TableCell className="text-right">{r.quantidade}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(r.valor_unitario))}</TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(Number(r.valor_total))}</TableCell>
                  <TableCell className="text-right text-primary">{formatBRL(Number(r.valor_total) - Number(r.custo_total ?? 0))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir venda?</AlertDialogTitle><AlertDialogDescription>A baixa de estoque não será revertida automaticamente.</AlertDialogDescription></AlertDialogHeader>
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

function VendaProdutoForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    data_venda: editing?.data_venda ?? new Date().toISOString().slice(0, 10),
    cliente_id: editing?.cliente_id ?? null,
    produto_id: editing?.produto_id ?? null,
    descricao: editing?.descricao ?? "",
    quantidade: editing?.quantidade ?? 1,
    valor_unitario: editing?.valor_unitario ?? "",
    custo_unitario: editing ? (Number(editing.custo_total) / Math.max(1, Number(editing.quantidade))) : "",
    forma_pagamento: editing?.forma_pagamento ?? "",
    local_recebimento: editing?.local_recebimento ?? "",
    observacao: editing?.observacao ?? "",
    gerar_receber: !editing,
  }));

  async function pickProduct(id: string | null) {
    setV((s: any) => ({ ...s, produto_id: id }));
    if (!id) return;
    const { data } = await supabase.from("produtos").select("valor_venda,custo_medio,nome").eq("id", id).maybeSingle();
    if (data) setV((s: any) => ({ ...s, valor_unitario: data.valor_venda ?? s.valor_unitario, custo_unitario: data.custo_medio ?? s.custo_unitario, descricao: s.descricao || data.nome }));
  }

  const total = (Number(v.quantidade) || 0) * (Number(v.valor_unitario) || 0);

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar venda" : "Nova venda de produto"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div><Label>Data *</Label><Input type="date" required value={v.data_venda} onChange={(e) => setV({ ...v, data_venda: e.target.value })} /></div>
        <div><Label>Cliente</Label><EntitySelect table="clientes" value={v.cliente_id} onChange={(id) => setV({ ...v, cliente_id: id })} /></div>
        <div className="col-span-2"><Label>Produto</Label><EntitySelect table="produtos" value={v.produto_id} onChange={pickProduct} /></div>
        <div className="col-span-2"><Label>Descrição</Label><Input value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></div>
        <div><Label>Quantidade *</Label><Input type="number" min="1" required value={v.quantidade} onChange={(e) => setV({ ...v, quantidade: e.target.value })} /></div>
        <div><Label>Valor unitário *</Label><Input type="number" step="0.01" required value={v.valor_unitario} onChange={(e) => setV({ ...v, valor_unitario: e.target.value })} /></div>
        <div><Label>Custo unitário</Label><Input type="number" step="0.01" value={v.custo_unitario} onChange={(e) => setV({ ...v, custo_unitario: e.target.value })} /></div>
        <div><Label>Forma de pagamento</Label><Input value={v.forma_pagamento} onChange={(e) => setV({ ...v, forma_pagamento: e.target.value })} /></div>
        <div><Label>Local do recebimento</Label><Input value={v.local_recebimento} onChange={(e) => setV({ ...v, local_recebimento: e.target.value })} /></div>
        <div className="flex items-end"><div className="w-full rounded-md bg-muted/40 px-3 py-2 text-sm"><span className="text-muted-foreground">Total: </span><span className="font-semibold">{formatBRL(total)}</span></div></div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
        {!editing && (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.gerar_receber} onChange={(e) => setV({ ...v, gerar_receber: e.target.checked })} />
            Gerar conta a receber automaticamente
          </label>
        )}
        <DialogFooter className="col-span-2"><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

/* ============================= SERVIÇOS ============================= */

function VendasServicos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["vendas_servicos_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas_servicos")
        .select("*, clientes(nome), servicos(nome), profissionais(nome)")
        .order("data_venda", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id; if (!user_id) throw new Error("Não autenticado");
      const payload = {
        data_venda: v.data_venda,
        data_prevista_fim: v.data_prevista_fim || null,
        cliente_id: v.cliente_id || null,
        servico_id: v.servico_id || null,
        profissional_id: v.profissional_id || null,
        descricao: v.descricao || null,
        valor_venda: Number(v.valor_venda) || 0,
        valor_recebido: v.valor_recebido === "" ? null : Number(v.valor_recebido),
        custo: v.custo === "" ? null : Number(v.custo),
        status: v.status || "em_andamento",
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("vendas_servicos").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendas_servicos").insert({ ...payload, user_id });
        if (error) throw error;
        if (v.gerar_receber) {
          await supabase.from("contas_receber").insert({
            user_id,
            cliente_id: v.cliente_id || null,
            descricao: `Venda de serviço${v.descricao ? " - " + v.descricao : ""}`,
            data_venda: v.data_venda,
            valor_parcela: Number(v.valor_venda) || 0,
            data_vencimento: v.data_prevista_fim || v.data_venda,
            status: "pendente",
          });
        }
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Venda registrada");
      qc.invalidateQueries();
      setOpen(false); setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendas_servicos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries(); },
  });

  const total = rows.reduce((s, r) => s + Number(r.valor_venda ?? 0), 0);
  const recebido = rows.reduce((s, r) => s + Number(r.valor_recebido ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Serviços" value={String(rows.length)} />
        <Stat label="Faturamento" value={formatBRL(total)} />
        <Stat label="Recebido" value={formatBRL(recebido)} />
        <div className="flex items-end justify-end">
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova venda</Button></DialogTrigger>
            <VendaServicoForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
          </Dialog>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Data</TableHead>
                <TableHead>Prev. fim</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="w-20 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma venda registrada.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formatDate(r.data_venda)}</TableCell>
                  <TableCell>{formatDate(r.data_prevista_fim)}</TableCell>
                  <TableCell>{r.clientes?.nome ?? "—"}</TableCell>
                  <TableCell>{r.servicos?.nome ?? r.descricao ?? "—"}</TableCell>
                  <TableCell>{r.profissionais?.nome ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right font-medium">{formatBRL(Number(r.valor_venda))}</TableCell>
                  <TableCell className="text-right text-primary">{formatBRL(Number(r.valor_recebido ?? 0))}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir venda?</AlertDialogTitle><AlertDialogDescription>Ação irreversível.</AlertDialogDescription></AlertDialogHeader>
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

function VendaServicoForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    data_venda: editing?.data_venda ?? new Date().toISOString().slice(0, 10),
    data_prevista_fim: editing?.data_prevista_fim ?? "",
    cliente_id: editing?.cliente_id ?? null,
    servico_id: editing?.servico_id ?? null,
    profissional_id: editing?.profissional_id ?? null,
    descricao: editing?.descricao ?? "",
    valor_venda: editing?.valor_venda ?? "",
    valor_recebido: editing?.valor_recebido ?? "",
    custo: editing?.custo ?? "",
    status: editing?.status ?? "em_andamento",
    observacao: editing?.observacao ?? "",
    gerar_receber: !editing,
  }));

  async function pickServico(id: string | null) {
    setV((s: any) => ({ ...s, servico_id: id }));
    if (!id) return;
    const { data } = await supabase.from("servicos").select("valor_venda,custo_medio,nome").eq("id", id).maybeSingle();
    if (data) setV((s: any) => ({ ...s, valor_venda: data.valor_venda ?? s.valor_venda, custo: data.custo_medio ?? s.custo, descricao: s.descricao || data.nome }));
  }

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar venda" : "Nova venda de serviço"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div><Label>Data *</Label><Input type="date" required value={v.data_venda} onChange={(e) => setV({ ...v, data_venda: e.target.value })} /></div>
        <div><Label>Previsão de término</Label><Input type="date" value={v.data_prevista_fim} onChange={(e) => setV({ ...v, data_prevista_fim: e.target.value })} /></div>
        <div><Label>Cliente</Label><EntitySelect table="clientes" value={v.cliente_id} onChange={(id) => setV({ ...v, cliente_id: id })} /></div>
        <div><Label>Profissional</Label><EntitySelect table="profissionais" value={v.profissional_id} onChange={(id) => setV({ ...v, profissional_id: id })} /></div>
        <div className="col-span-2"><Label>Serviço</Label><EntitySelect table="servicos" value={v.servico_id} onChange={pickServico} /></div>
        <div className="col-span-2"><Label>Descrição</Label><Input value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></div>
        <div><Label>Valor de venda *</Label><Input type="number" step="0.01" required value={v.valor_venda} onChange={(e) => setV({ ...v, valor_venda: e.target.value })} /></div>
        <div><Label>Valor recebido</Label><Input type="number" step="0.01" value={v.valor_recebido} onChange={(e) => setV({ ...v, valor_recebido: e.target.value })} /></div>
        <div><Label>Custo</Label><Input type="number" step="0.01" value={v.custo} onChange={(e) => setV({ ...v, custo: e.target.value })} /></div>
        <div>
          <Label>Status</Label>
          <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={v.observacao} onChange={(e) => setV({ ...v, observacao: e.target.value })} /></div>
        {!editing && (
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={v.gerar_receber} onChange={(e) => setV({ ...v, gerar_receber: e.target.checked })} />
            Gerar conta a receber automaticamente
          </label>
        )}
        <DialogFooter className="col-span-2"><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    em_andamento: { label: "Em andamento", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
    concluido: { label: "Concluído", cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
    cancelado: { label: "Cancelado", cls: "bg-red-500/15 text-red-500 border-red-500/30" },
  };
  const info = map[status ?? ""] ?? { label: status ?? "—", cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={info.cls}>{info.label}</Badge>;
}
