import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate } from "@/lib/format";
import { AuditInfo } from "@/components/audit-info";
import { CategoriaNomeSelect, useCategorias } from "@/components/lookup-select";
import { EntitySelect } from "@/components/entity-select";
import { HistoricoItem, MovimentarDialog, DesmembrarDialog } from "@/components/inventario-movimentar";
import { TIPOS, TIPO_SINGULAR, SITUACOES, STATUS_PAGAMENTO, situacaoInfo, statusPagamentoInfo } from "@/lib/inventario";
import { softDelete } from "@/lib/soft-delete";
import { exportCsv, exportPdf } from "@/components/data-export";
import { Plus, Pencil, Trash2, Boxes, Search, FileDown, ArrowLeftRight, Package, Unlink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventario")({
  ssr: false,
  component: InventarioPage,
});

function InventarioPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [movItem, setMovItem] = useState<any | null>(null);
  const [desmembrar, setDesmembrar] = useState<any | null>(null);

  const [tipo, setTipo] = useState("todos");
  const [busca, setBusca] = useState("");
  const [fCat, setFCat] = useState("todas");
  const [fSit, setFSit] = useState("todas");
  const [fStatus, setFStatus] = useState("todos");
  const [fLocal, setFLocal] = useState("todos");
  const [fResp, setFResp] = useState("todos");
  const [fFornecedor, setFFornecedor] = useState("todos");
  const [valorMin, setValorMin] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");

  const { data: categorias = [] } = useCategorias(["estoque", "patrimonio"]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventario")
        .select("*, categorias(nome), fornecedores(nome), bancos(nome)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const componentesDe = (id: string) => rows.filter((r) => r.kit_id === id);

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const quantidade = Number(v.quantidade) || 1;
      const valor_unitario = v.valor_unitario === "" ? null : Number(v.valor_unitario);
      const valor_total = v.valor_total !== "" && v.valor_total != null
        ? Number(v.valor_total)
        : (valor_unitario ?? 0) * quantidade;
      const valor_pago = v.status_pagamento === "pago" ? valor_total : v.status_pagamento === "pendente" ? 0 : Number(v.valor_pago) || 0;
      const payload = {
        nome: v.nome,
        tipo: v.tipo || "equipamento",
        categoria: v.categoria || "Sem categoria",
        categoria_id: v.categoria_id || null,
        descricao: v.descricao || null,
        marca: v.marca || null,
        modelo: v.modelo || null,
        numero_serie: v.numero_serie || null,
        localizacao: v.localizacao || null,
        responsavel: v.responsavel || null,
        situacao: v.situacao || "ativo",
        quantidade,
        valor_unitario,
        valor_total,
        valor_pago,
        status_pagamento: v.status_pagamento,
        data_aquisicao: v.data_aquisicao || null,
        fornecedor_id: v.fornecedor_id || null,
        fornecedor: v.fornecedor || null,
        banco_id: v.banco_id || null,
        is_kit: !!v.is_kit,
        kit_id: v.kit_id || null,
        observacao: v.observacao || null,
      };
      if (editing?.id) {
        const { error } = await supabase.from("inventario").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventario").insert({ ...payload, user_id, origem: "inventario" });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Cadastrado"); qc.invalidateQueries(); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await softDelete("inventario", id); },
    onSuccess: () => { toast.success("Movido para a lixeira (7 dias para recuperar)"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const locais = useMemo(() => [...new Set(rows.map((r) => r.localizacao).filter(Boolean))] as string[], [rows]);
  const responsaveis = useMemo(() => [...new Set(rows.map((r) => r.responsavel).filter(Boolean))] as string[], [rows]);
  const fornecedores = useMemo(
    () => [...new Set(rows.map((r) => r.fornecedores?.nome || r.fornecedor).filter(Boolean))] as string[],
    [rows],
  );

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (tipo !== "todos" && (r.tipo ?? "equipamento") !== tipo) return false;
      if (fCat !== "todas" && (r.categorias?.nome ?? r.categoria) !== fCat) return false;
      if (fSit !== "todas" && (r.situacao ?? "ativo") !== fSit) return false;
      if (fStatus !== "todos" && r.status_pagamento !== fStatus) return false;
      if (fLocal !== "todos" && r.localizacao !== fLocal) return false;
      if (fResp !== "todos" && r.responsavel !== fResp) return false;
      if (fFornecedor !== "todos" && (r.fornecedores?.nome ?? r.fornecedor) !== fFornecedor) return false;
      const total = Number(r.valor_total ?? 0);
      if (valorMin !== "" && total < Number(valorMin)) return false;
      if (valorMax !== "" && total > Number(valorMax)) return false;
      if (dataIni && (!r.data_aquisicao || r.data_aquisicao < dataIni)) return false;
      if (dataFim && (!r.data_aquisicao || r.data_aquisicao > dataFim)) return false;
      if (q) {
        const hay = [r.nome, r.numero_patrimonio, r.numero_serie, r.marca, r.modelo, r.localizacao, r.responsavel, r.descricao]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, tipo, busca, fCat, fSit, fStatus, fLocal, fResp, fFornecedor, valorMin, valorMax, dataIni, dataFim]);

  const totais = useMemo(() => ({
    itens: filtered.length,
    valor: filtered.reduce((s, r) => s + Number(r.valor_total ?? 0), 0),
    pago: filtered.reduce((s, r) => s + Number(r.valor_pago ?? 0), 0),
    restante: filtered.reduce((s, r) => s + (Number(r.valor_total ?? 0) - Number(r.valor_pago ?? 0)), 0),
  }), [filtered]);

  const headers = ["Patrimônio", "Nome", "Tipo", "Categoria", "Marca/Modelo", "Nº série", "Local", "Responsável", "Qtd", "Valor total", "Pago", "Restante", "Situação", "Pagamento"];
  const exportRows = () => filtered.map((r) => [
    r.numero_patrimonio ?? "—",
    r.nome,
    TIPO_SINGULAR[r.tipo ?? "equipamento"] ?? r.tipo,
    r.categorias?.nome ?? r.categoria ?? "—",
    [r.marca, r.modelo].filter(Boolean).join(" ") || "—",
    r.numero_serie ?? "—",
    r.localizacao ?? "—",
    r.responsavel ?? "—",
    Number(r.quantidade ?? 0),
    formatBRL(Number(r.valor_total ?? 0)),
    formatBRL(Number(r.valor_pago ?? 0)),
    formatBRL(Number(r.valor_total ?? 0) - Number(r.valor_pago ?? 0)),
    situacaoInfo(r.situacao).label,
    statusPagamentoInfo(r.status_pagamento).label,
  ]);

  const subtitulo = () => {
    const partes = [`${filtered.length} itens`, `Total ${formatBRL(totais.valor)}`];
    if (tipo !== "todos") partes.push(TIPO_SINGULAR[tipo]);
    if (dataIni || dataFim) partes.push(`Aquisição ${dataIni || "início"} a ${dataFim || "hoje"}`);
    return `${partes.join(" • ")} — gerado em ${new Date().toLocaleString("pt-BR")}`;
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Boxes className="h-6 w-6" />Inventário / Patrimônio</h1>
          <p className="text-sm text-muted-foreground">Equipamentos, peças, veículos e ferramentas em um único cadastro, com movimentações e kits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv("inventario", headers, exportRows())}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportPdf("inventario", "Relatório de Inventário / Patrimônio", headers, exportRows(), subtitulo())}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm" onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-1" />Novo item</Button></DialogTrigger>
            <InventarioForm key={editing?.id ?? "new"} editing={editing} kits={rows.filter((r) => r.is_kit)} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Itens" value={String(totais.itens)} />
        <Stat label="Valor total" value={formatBRL(totais.valor)} />
        <Stat label="Pago" value={formatBRL(totais.pago)} tone="ok" />
        <Stat label="Restante" value={formatBRL(totais.restante)} tone="warn" />
      </div>

      <Tabs value={tipo} onValueChange={setTipo}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {TIPOS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
      </Tabs>

      <Card className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, nº de patrimônio, nº de série, marca, local..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
          <Filtro label="Categoria" value={fCat} onChange={setFCat} allLabel="Todas" allValue="todas" options={categorias.map((c) => c.nome)} />
          <Filtro label="Situação" value={fSit} onChange={setFSit} allLabel="Todas" allValue="todas" options={SITUACOES.map((s) => s.value)} labels={Object.fromEntries(SITUACOES.map((s) => [s.value, s.label]))} />
          <Filtro label="Pagamento" value={fStatus} onChange={setFStatus} allLabel="Todos" allValue="todos" options={STATUS_PAGAMENTO.map((s) => s.value)} labels={Object.fromEntries(STATUS_PAGAMENTO.map((s) => [s.value, s.label]))} />
          <Filtro label="Localização" value={fLocal} onChange={setFLocal} allLabel="Todas" allValue="todos" options={locais} />
          <Filtro label="Responsável" value={fResp} onChange={setFResp} allLabel="Todos" allValue="todos" options={responsaveis} />
          <Filtro label="Fornecedor" value={fFornecedor} onChange={setFFornecedor} allLabel="Todos" allValue="todos" options={fornecedores} />
          <div><Label className="text-xs mb-1">Valor mínimo</Label><Input type="number" step="0.01" value={valorMin} onChange={(e) => setValorMin(e.target.value)} /></div>
          <div><Label className="text-xs mb-1">Valor máximo</Label><Input type="number" step="0.01" value={valorMax} onChange={(e) => setValorMax(e.target.value)} /></div>
          <div><Label className="text-xs mb-1">Aquisição de</Label><Input type="date" value={dataIni} onChange={(e) => setDataIni(e.target.value)} /></div>
          <div><Label className="text-xs mb-1">Aquisição até</Label><Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} /></div>
          <div className="flex items-end">
            <Button variant="ghost" size="sm" onClick={() => { setBusca(""); setFCat("todas"); setFSit("todas"); setFStatus("todos"); setFLocal("todos"); setFResp("todos"); setFFornecedor("todos"); setValorMin(""); setValorMax(""); setDataIni(""); setDataFim(""); }}>Limpar filtros</Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Patrimônio</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Local</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead className="text-right">Restante</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="w-36 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nenhum item encontrado.</TableCell></TableRow>}
              {filtered.map((r) => {
                const sit = situacaoInfo(r.situacao);
                const pag = statusPagamentoInfo(r.status_pagamento);
                const restante = Number(r.valor_total ?? 0) - Number(r.valor_pago ?? 0);
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetalhe(r)}>
                    <TableCell className="font-mono text-xs">{r.numero_patrimonio ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      {r.nome}
                      {r.is_kit && <Badge variant="outline" className="ml-2 text-[10px]"><Package className="h-3 w-3 mr-1" />Kit</Badge>}
                    </TableCell>
                    <TableCell>{TIPO_SINGULAR[r.tipo ?? "equipamento"] ?? r.tipo}</TableCell>
                    <TableCell>{r.categorias?.nome ?? r.categoria ?? "—"}</TableCell>
                    <TableCell>{r.localizacao ?? "—"}</TableCell>
                    <TableCell className="text-right">{Number(r.quantidade ?? 0)}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.valor_total ?? 0))}</TableCell>
                    <TableCell className="text-right text-amber-500">{formatBRL(restante)}</TableCell>
                    <TableCell><Badge variant="outline" className={sit.cls}>{sit.label}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={pag.cls}>{pag.label}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" title="Movimentar" onClick={() => setMovItem(r)}><ArrowLeftRight className="h-4 w-4" /></Button>
                        {r.is_kit && <Button size="icon" variant="ghost" title="Desmembrar kit" onClick={() => setDesmembrar(r)}><Unlink className="h-4 w-4" /></Button>}
                        <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir item?</AlertDialogTitle><AlertDialogDescription>O item vai para a lixeira e pode ser recuperado por 7 dias.</AlertDialogDescription></AlertDialogHeader>
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

      {/* Detalhe */}
      <Dialog open={!!detalhe} onOpenChange={(v) => { if (!v) setDetalhe(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detalhe?.nome} {detalhe?.numero_patrimonio ? `— ${detalhe.numero_patrimonio}` : ""}</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="space-y-2 text-sm">
              <Info label="Tipo" value={TIPO_SINGULAR[detalhe.tipo ?? "equipamento"] ?? "—"} />
              <Info label="Categoria" value={detalhe.categorias?.nome ?? detalhe.categoria ?? "—"} />
              <Info label="Marca / Modelo" value={[detalhe.marca, detalhe.modelo].filter(Boolean).join(" ") || "—"} />
              <Info label="Nº de série" value={detalhe.numero_serie || "—"} />
              <Info label="Localização" value={detalhe.localizacao || "—"} />
              <Info label="Responsável" value={detalhe.responsavel || "—"} />
              <Info label="Situação" value={situacaoInfo(detalhe.situacao).label} />
              <Info label="Data de aquisição" value={detalhe.data_aquisicao ? formatDate(detalhe.data_aquisicao) : "—"} />
              <Info label="Fornecedor" value={detalhe.fornecedores?.nome ?? detalhe.fornecedor ?? "—"} />
              <Info label="Banco de saída" value={detalhe.bancos?.nome ?? "—"} />
              <Info label="Quantidade" value={String(Number(detalhe.quantidade ?? 0))} />
              <Info label="Valor unitário" value={detalhe.valor_unitario != null ? formatBRL(Number(detalhe.valor_unitario)) : "—"} />
              <Info label="Valor total" value={formatBRL(Number(detalhe.valor_total ?? 0))} />
              <Info label="Valor pago" value={formatBRL(Number(detalhe.valor_pago ?? 0))} />
              <Info label="Valor restante" value={formatBRL(Number(detalhe.valor_total ?? 0) - Number(detalhe.valor_pago ?? 0))} />
              <Info label="Pagamento" value={statusPagamentoInfo(detalhe.status_pagamento).label} />
              <Info label="Descrição" value={detalhe.descricao || "—"} />
              <Info label="Observações" value={detalhe.observacao || "—"} />

              {detalhe.is_kit && (
                <div className="pt-2">
                  <div className="font-medium mb-1">Componentes do kit</div>
                  {componentesDe(detalhe.id).length === 0
                    ? <p className="text-muted-foreground text-sm">Nenhum componente vinculado.</p>
                    : <ul className="list-disc pl-5 text-sm">{componentesDe(detalhe.id).map((c) => <li key={c.id}>{c.nome} — qtd. {Number(c.quantidade ?? 0)}</li>)}</ul>}
                </div>
              )}

              <div className="pt-3">
                <div className="font-medium mb-2">Histórico de movimentações</div>
                <HistoricoItem itemId={detalhe.id} />
              </div>

              <AuditInfo row={detalhe} />
              <DialogFooter className="pt-2 flex-wrap">
                <Button variant="outline" onClick={() => setDetalhe(null)}>Fechar</Button>
                <Button variant="outline" onClick={() => { setMovItem(detalhe); setDetalhe(null); }}><ArrowLeftRight className="h-4 w-4 mr-1" />Movimentar</Button>
                {detalhe.is_kit && <Button variant="outline" onClick={() => { setDesmembrar(detalhe); setDetalhe(null); }}><Unlink className="h-4 w-4 mr-1" />Desmembrar kit</Button>}
                <Button onClick={() => { setEditing(detalhe); setDetalhe(null); setOpen(true); }}>Editar</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MovimentarDialog
        item={movItem}
        componentes={movItem ? componentesDe(movItem.id) : []}
        open={!!movItem}
        onOpenChange={(v) => { if (!v) setMovItem(null); }}
      />
      <DesmembrarDialog
        item={desmembrar}
        componentes={desmembrar ? componentesDe(desmembrar.id) : []}
        open={!!desmembrar}
        onOpenChange={(v) => { if (!v) setDesmembrar(null); }}
      />
    </div>
  );
}

function Filtro({ label, value, onChange, options, allLabel, allValue, labels }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  allLabel: string; allValue: string; labels?: Record<string, string>;
}) {
  return (
    <div>
      <Label className="text-xs mb-1">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={allValue}>{allLabel}</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{labels?.[o] ?? o}</SelectItem>)}
        </SelectContent>
      </Select>
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

function InventarioForm({ editing, kits, onSubmit, loading }: { editing: any | null; kits: any[]; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    nome: editing?.nome ?? "",
    tipo: editing?.tipo ?? "equipamento",
    categoria: editing?.categoria ?? "",
    categoria_id: editing?.categoria_id ?? null,
    descricao: editing?.descricao ?? "",
    marca: editing?.marca ?? "",
    modelo: editing?.modelo ?? "",
    numero_serie: editing?.numero_serie ?? "",
    localizacao: editing?.localizacao ?? "",
    responsavel: editing?.responsavel ?? "",
    situacao: editing?.situacao ?? "ativo",
    quantidade: editing?.quantidade ?? 1,
    valor_unitario: editing?.valor_unitario ?? "",
    valor_total: editing?.valor_total ?? "",
    valor_pago: editing?.valor_pago ?? "",
    status_pagamento: editing?.status_pagamento ?? "pendente",
    data_aquisicao: editing?.data_aquisicao ?? new Date().toISOString().slice(0, 10),
    fornecedor_id: editing?.fornecedor_id ?? null,
    fornecedor: editing?.fornecedor ?? "",
    banco_id: editing?.banco_id ?? null,
    is_kit: editing?.is_kit ?? false,
    kit_id: editing?.kit_id ?? null,
    observacao: editing?.observacao ?? "",
  }));

  const total = v.valor_total !== "" ? Number(v.valor_total) || 0 : (Number(v.valor_unitario) || 0) * (Number(v.quantidade) || 0);
  const pago = v.status_pagamento === "pago" ? total : v.status_pagamento === "pendente" ? 0 : Number(v.valor_pago) || 0;
  const restante = Math.max(0, total - pago);

  return (
    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar item" : "Novo item de inventário"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="grid grid-cols-2 gap-4 pt-2">
        <div className="col-span-2"><Label>Nome *</Label><Input required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></div>
        <div>
          <Label>Tipo *</Label>
          <Select value={v.tipo} onValueChange={(s) => setV({ ...v, tipo: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{TIPO_SINGULAR[t.value]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Categoria *</Label>
          <CategoriaNomeSelect tipos={["estoque", "patrimonio"]} value={v.categoria} onChange={(n) => setV({ ...v, categoria: n ?? "" })} />
        </div>
        <div><Label>Marca</Label><Input value={v.marca} onChange={(e) => setV({ ...v, marca: e.target.value })} /></div>
        <div><Label>Modelo</Label><Input value={v.modelo} onChange={(e) => setV({ ...v, modelo: e.target.value })} /></div>
        <div><Label>Nº de série</Label><Input value={v.numero_serie} onChange={(e) => setV({ ...v, numero_serie: e.target.value })} /></div>
        <div><Label>Nº de patrimônio</Label><Input readOnly value={editing?.numero_patrimonio ?? "Gerado automaticamente"} /></div>
        <div><Label>Localização</Label><Input value={v.localizacao} onChange={(e) => setV({ ...v, localizacao: e.target.value })} /></div>
        <div><Label>Responsável</Label><Input value={v.responsavel} onChange={(e) => setV({ ...v, responsavel: e.target.value })} /></div>
        <div>
          <Label>Situação *</Label>
          <Select value={v.situacao} onValueChange={(s) => setV({ ...v, situacao: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SITUACOES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Data de aquisição</Label><Input type="date" value={v.data_aquisicao} onChange={(e) => setV({ ...v, data_aquisicao: e.target.value })} /></div>
        <div><Label>Quantidade *</Label><Input type="number" step="0.01" min="0" required value={v.quantidade} onChange={(e) => setV({ ...v, quantidade: e.target.value })} /></div>
        <div><Label>Valor unitário</Label><Input type="number" step="0.01" value={v.valor_unitario} onChange={(e) => setV({ ...v, valor_unitario: e.target.value })} /></div>
        <div><Label>Valor total *</Label><Input type="number" step="0.01" placeholder={String(total)} value={v.valor_total} onChange={(e) => setV({ ...v, valor_total: e.target.value })} /></div>
        <div><Label>Fornecedor</Label><EntitySelect table="fornecedores" value={v.fornecedor_id} onChange={(id) => setV({ ...v, fornecedor_id: id })} /></div>
        <div><Label>Banco de saída</Label><EntitySelect table="bancos" value={v.banco_id} onChange={(id) => setV({ ...v, banco_id: id })} /></div>
        <div>
          <Label>Status pagamento *</Label>
          <Select value={v.status_pagamento} onValueChange={(s) => setV({ ...v, status_pagamento: s })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_PAGAMENTO.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {v.status_pagamento === "parcial" && (
          <>
            <div><Label>Valor pago</Label><Input type="number" step="0.01" value={v.valor_pago} onChange={(e) => setV({ ...v, valor_pago: e.target.value })} /></div>
            <div><Label>Valor restante</Label><Input readOnly value={formatBRL(restante)} /></div>
          </>
        )}

        <div className="col-span-2 grid grid-cols-2 gap-4 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Este item é um kit</Label>
              <p className="text-xs text-muted-foreground">Kits agrupam outros itens do inventário.</p>
            </div>
            <Switch checked={v.is_kit} onCheckedChange={(c) => setV({ ...v, is_kit: c, kit_id: c ? null : v.kit_id })} />
          </div>
          {!v.is_kit && (
            <div>
              <Label>Pertence ao kit</Label>
              <Select value={v.kit_id ?? "none"} onValueChange={(s) => setV({ ...v, kit_id: s === "none" ? null : s })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {kits.filter((k) => k.id !== editing?.id).map((k) => <SelectItem key={k.id} value={k.id}>{k.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

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
