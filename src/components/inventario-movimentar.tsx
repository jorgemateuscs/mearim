import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EntitySelect } from "@/components/entity-select";
import { formatDate } from "@/lib/format";
import { MOVIMENTACOES, movInfo, TIPO_SINGULAR } from "@/lib/inventario";
import { toast } from "sonner";

type Item = any;

/** Histórico de movimentações de um item. */
export function HistoricoItem({ itemId }: { itemId: string }) {
  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["inv-movs", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario_movimentacoes")
        .select("*, clientes(nome), fornecedores(nome)")
        .eq("inventario_id", itemId)
        .order("data_movimentacao", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  if (movs.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>;

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead>Data</TableHead>
            <TableHead>Movimentação</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movs.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="whitespace-nowrap">{formatDate(m.data_movimentacao)}</TableCell>
              <TableCell>{movInfo(m.tipo_movimentacao).label}</TableCell>
              <TableCell className="text-right">{Number(m.quantidade ?? 0)}</TableCell>
              <TableCell className="text-right">{m.quantidade_final != null ? Number(m.quantidade_final) : "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {[m.motivo, m.clientes?.nome, m.fornecedores?.nome, m.nota_fiscal && `NF ${m.nota_fiscal}`, m.destino, m.observacao]
                  .filter(Boolean)
                  .join(" • ") || "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Diálogo de movimentação de um item (ou dos componentes de um kit). */
export function MovimentarDialog({
  item,
  componentes,
  open,
  onOpenChange,
}: {
  item: Item | null;
  componentes: Item[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState("entrada");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [quantidade, setQuantidade] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [fornecedorId, setFornecedorId] = useState<string | null>(null);
  const [nf, setNf] = useState("");
  const [valorUnit, setValorUnit] = useState("");
  const [destino, setDestino] = useState("");
  const [obs, setObs] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const isKit = !!item?.is_kit && componentes.length > 0;
  const alvos: Item[] = isKit ? componentes.filter((c) => selecionados.includes(c.id)) : item ? [item] : [];

  const mov = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      if (alvos.length === 0) throw new Error("Selecione ao menos um item.");
      const info = movInfo(tipo);

      for (const alvo of alvos) {
        const anterior = Number(alvo.quantidade ?? 0);
        const qtd = Number(quantidade) || 0;
        let final = anterior;
        if (info.efeito === "soma") final = anterior + qtd;
        else if (info.efeito === "subtrai") final = Math.max(0, anterior - qtd);
        else if (info.efeito === "define") final = qtd;

        const { error: mErr } = await supabase.from("inventario_movimentacoes").insert({
          user_id,
          inventario_id: alvo.id,
          data_movimentacao: data,
          tipo_movimentacao: tipo,
          quantidade: qtd,
          quantidade_anterior: anterior,
          quantidade_final: final,
          motivo: motivo || null,
          cliente_id: clienteId,
          fornecedor_id: fornecedorId,
          nota_fiscal: nf || null,
          valor_unitario: valorUnit === "" ? null : Number(valorUnit),
          destino: destino || null,
          situacao_final: info.situacao,
          observacao: obs || null,
        });
        if (mErr) throw mErr;

        const patch: any = { quantidade: final };
        if (info.situacao) patch.situacao = final === 0 ? info.situacao : alvo.situacao;
        if (info.situacao && info.efeito === "nenhum") patch.situacao = info.situacao;
        if (info.efeito === "soma") patch.valor_total = Number(alvo.valor_unitario ?? 0) * final || alvo.valor_total;
        const { error: uErr } = await supabase.from("inventario").update(patch).eq("id", alvo.id);
        if (uErr) throw uErr;
      }

      // Kit parcialmente desmembrado
      if (isKit && item) {
        const restantes = componentes.filter((c) => !selecionados.includes(c.id));
        const situacaoKit = restantes.length === 0 ? "baixado" : "kit_parcial";
        const { error } = await supabase.from("inventario").update({ situacao: situacaoKit }).eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Movimentação registrada");
      qc.invalidateQueries();
      onOpenChange(false);
      setSelecionados([]);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao movimentar"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Movimentar {isKit ? "kit" : "item"} — {item?.nome}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 pt-2">
          {isKit && (
            <div className="col-span-2 space-y-2 rounded-lg border border-border p-3">
              <div className="text-sm font-medium">Componentes do kit</div>
              <p className="text-xs text-muted-foreground">Marque apenas os componentes afetados por esta movimentação.</p>
              {componentes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selecionados.includes(c.id)}
                    onCheckedChange={(v) =>
                      setSelecionados((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))
                    }
                  />
                  <span className="flex-1">{c.nome} <span className="text-muted-foreground">({TIPO_SINGULAR[c.tipo] ?? c.tipo})</span></span>
                  <span className="text-muted-foreground">Qtd. {Number(c.quantidade ?? 0)}</span>
                </label>
              ))}
            </div>
          )}

          <div>
            <Label>Movimentação *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MOVIMENTACOES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data *</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Quantidade *</Label><Input type="number" step="0.01" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></div>
          <div><Label>Motivo</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Venda, compra, empréstimo..." /></div>
          <div><Label>Cliente</Label><EntitySelect table="clientes" value={clienteId} onChange={setClienteId} /></div>
          <div><Label>Fornecedor</Label><EntitySelect table="fornecedores" value={fornecedorId} onChange={setFornecedorId} /></div>
          <div><Label>Nota fiscal</Label><Input value={nf} onChange={(e) => setNf(e.target.value)} /></div>
          <div><Label>Valor unitário</Label><Input type="number" step="0.01" value={valorUnit} onChange={(e) => setValorUnit(e.target.value)} /></div>
          <div className="col-span-2"><Label>Destino / localização</Label><Input value={destino} onChange={(e) => setDestino(e.target.value)} /></div>
          <div className="col-span-2"><Label>Observação</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mov.mutate()} disabled={mov.isPending}>
            {mov.isPending ? "Registrando..." : "Registrar movimentação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Desmembramento de kit: retira componentes selecionados do kit. */
export function DesmembrarDialog({
  item,
  componentes,
  open,
  onOpenChange,
}: {
  item: Item | null;
  componentes: Item[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [sel, setSel] = useState<string[]>([]);

  const run = useMutation({
    mutationFn: async () => {
      if (sel.length === 0) throw new Error("Selecione os componentes a retirar.");
      const { error } = await supabase.from("inventario").update({ kit_id: null }).in("id", sel);
      if (error) throw error;
      const restantes = componentes.filter((c) => !sel.includes(c.id));
      if (item) {
        const { error: e2 } = await supabase
          .from("inventario")
          .update({ situacao: restantes.length === 0 ? "baixado" : "kit_parcial" })
          .eq("id", item.id);
        if (e2) throw e2;
      }
    },
    onSuccess: () => { toast.success("Kit desmembrado"); qc.invalidateQueries(); onOpenChange(false); setSel([]); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Deseja desmembrar este kit?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">Os componentes selecionados deixam de fazer parte do kit, mas continuam cadastrados no inventário.</p>
        <div className="space-y-2 rounded-lg border border-border p-3">
          {componentes.length === 0 && <p className="text-sm text-muted-foreground">Este kit não possui componentes vinculados.</p>}
          {componentes.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={sel.includes(c.id)} onCheckedChange={(v) => setSel((prev) => (v ? [...prev, c.id] : prev.filter((x) => x !== c.id)))} />
              <span className="flex-1">{c.nome}</span>
              <span className="text-muted-foreground">Qtd. {Number(c.quantidade ?? 0)}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>Desmembrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
