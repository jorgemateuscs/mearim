import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useUserEmails, userLabel } from "@/hooks/use-user-emails";
import { ACAO_LABEL, MODULO_LABEL, SOFT_DELETE_TABLES, restoreRecord, expiraEm } from "@/lib/soft-delete";
import { exportCsv, exportPdf } from "@/components/data-export";
import { History, RotateCcw, Search, FileDown, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/auditoria")({
  ssr: false,
  component: AuditoriaPage,
});

function dataHora(v?: string | null) {
  return v ? new Date(v).toLocaleString("pt-BR") : "—";
}

const ACOES = ["criou", "editou", "excluiu", "recuperou", "excluiu_definitivo"];

function AuditoriaPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><History className="h-6 w-6" />Auditoria e Lixeira</h1>
        <p className="text-sm text-muted-foreground">Tudo que acontece no sistema fica registrado com data, hora e usuário. Itens excluídos podem ser recuperados por 7 dias.</p>
      </header>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Histórico de alterações</TabsTrigger>
          <TabsTrigger value="lixeira">Lixeira (7 dias)</TabsTrigger>
        </TabsList>
        <TabsContent value="log" className="pt-4"><LogTab /></TabsContent>
        <TabsContent value="lixeira" className="pt-4"><LixeiraTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function LogTab() {
  const emails = useUserEmails();
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState("todos");
  const [acao, setAcao] = useState("todas");
  const [ini, setIni] = useState("");
  const [fim, setFim] = useState("");
  const [detalhe, setDetalhe] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["audit_log", ini, fim],
    queryFn: async () => {
      let q = supabase.from("audit_log").select("*").order("occurred_at", { ascending: false }).limit(1000);
      if (ini) q = q.gte("occurred_at", `${ini}T00:00:00`);
      if (fim) q = q.lte("occurred_at", `${fim}T23:59:59`);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });

  const modulos = useMemo(() => [...new Set(rows.map((r) => r.tabela))] as string[], [rows]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (modulo !== "todos" && r.tabela !== modulo) return false;
      if (acao !== "todas" && r.acao !== acao) return false;
      if (q) {
        const hay = [r.registro_nome, r.tabela, userLabel(emails, r.user_id)].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, modulo, acao, busca, emails]);

  const headers = ["Data e hora", "Usuário", "Ação", "Módulo", "Registro"];
  const exportRows = () => filtered.map((r) => [
    dataHora(r.occurred_at),
    userLabel(emails, r.user_id),
    ACAO_LABEL[r.acao] ?? r.acao,
    MODULO_LABEL[r.tabela] ?? r.tabela,
    r.registro_nome ?? "—",
  ]);

  return (
    <div className="space-y-4">
      <Card className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        <div className="col-span-2 md:col-span-2">
          <Label className="text-xs mb-1">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Registro, usuário, módulo..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs mb-1">Módulo</Label>
          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {modulos.map((m) => <SelectItem key={m} value={m}>{MODULO_LABEL[m] ?? m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1">Ação</Label>
          <Select value={acao} onValueChange={setAcao}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {ACOES.map((a) => <SelectItem key={a} value={a}>{ACAO_LABEL[a]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs mb-1">De</Label><Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
        <div><Label className="text-xs mb-1">Até</Label><Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => exportCsv("auditoria", headers, exportRows())}><FileDown className="h-4 w-4 mr-1" />CSV</Button>
        <Button variant="outline" size="sm" onClick={() => exportPdf("auditoria", "Histórico de alterações", headers, exportRows())}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Data e hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro no período.</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetalhe(r)}>
                  <TableCell className="whitespace-nowrap">{dataHora(r.occurred_at)}</TableCell>
                  <TableCell>{userLabel(emails, r.user_id)}</TableCell>
                  <TableCell><Badge variant="outline">{ACAO_LABEL[r.acao] ?? r.acao}</Badge></TableCell>
                  <TableCell>{MODULO_LABEL[r.tabela] ?? r.tabela}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{r.registro_nome ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(v) => { if (!v) setDetalhe(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{ACAO_LABEL[detalhe?.acao] ?? detalhe?.acao} — {detalhe?.registro_nome}</DialogTitle></DialogHeader>
          {detalhe && <AlteracoesDiff anterior={detalhe.dados_anteriores} novo={detalhe.dados_novos} usuario={userLabel(emails, detalhe.user_id)} quando={dataHora(detalhe.occurred_at)} modulo={MODULO_LABEL[detalhe.tabela] ?? detalhe.tabela} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const OCULTOS = new Set(["id", "user_id", "created_at", "updated_at", "created_by", "updated_by", "deleted_by"]);

function AlteracoesDiff({ anterior, novo, usuario, quando, modulo }: { anterior: any; novo: any; usuario: string; quando: string; modulo: string }) {
  const chaves = [...new Set([...Object.keys(anterior ?? {}), ...Object.keys(novo ?? {})])].filter((k) => !OCULTOS.has(k));
  const mudancas = chaves.filter((k) => JSON.stringify(anterior?.[k]) !== JSON.stringify(novo?.[k]));
  const fmt = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Usuário: </span><span className="font-medium">{usuario}</span></div>
        <div><span className="text-muted-foreground">Data e hora: </span><span className="font-medium">{quando}</span></div>
        <div className="col-span-2"><span className="text-muted-foreground">Módulo: </span><span className="font-medium">{modulo}</span></div>
      </div>
      {mudancas.length === 0 ? (
        <p className="text-muted-foreground">Sem diferenças de campos registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead>Campo</TableHead><TableHead>Antes</TableHead><TableHead>Depois</TableHead></TableRow></TableHeader>
            <TableBody>
              {mudancas.map((k) => (
                <TableRow key={k}>
                  <TableCell className="font-medium">{k}</TableCell>
                  <TableCell className="text-muted-foreground">{fmt(anterior?.[k])}</TableCell>
                  <TableCell>{fmt(novo?.[k])}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function LixeiraTab() {
  const qc = useQueryClient();
  const emails = useUserEmails();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["lixeira"],
    queryFn: async () => {
      const results = await Promise.all(
        SOFT_DELETE_TABLES.map(async (t) => {
          const { data, error } = await supabase.from(t as any).select("*").not("deleted_at", "is", null);
          if (error) return [];
          return (data ?? []).map((r: any) => ({ ...r, __tabela: t }));
        }),
      );
      return results.flat().sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
    },
  });

  const restore = useMutation({
    mutationFn: async (r: any) => { await restoreRecord(r.__tabela, r.id); },
    onSuccess: () => { toast.success("Registro recuperado"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const purge = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase.from(r.__tabela as any).delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído definitivamente"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const nome = (r: any) => r.nome ?? r.descricao ?? r.codigo ?? r.id;

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Registro</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Excluído em</TableHead>
              <TableHead>Excluído por</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="w-40 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">A lixeira está vazia.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={`${r.__tabela}-${r.id}`}>
                <TableCell className="font-medium max-w-[280px] truncate">{nome(r)}</TableCell>
                <TableCell>{MODULO_LABEL[r.__tabela] ?? r.__tabela}</TableCell>
                <TableCell className="whitespace-nowrap">{dataHora(r.deleted_at)}</TableCell>
                <TableCell>{userLabel(emails, r.deleted_by)}</TableCell>
                <TableCell className="whitespace-nowrap">{expiraEm(r.deleted_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => restore.mutate(r)}><RotateCcw className="h-4 w-4 mr-1" />Recuperar</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => purge.mutate(r)}>Excluir</AlertDialogAction></AlertDialogFooter>
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
  );
}
