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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/config/categorias")({
  ssr: false,
  component: CategoriasPage,
});

const TIPOS = [
  { value: "despesa", label: "Despesas" },
  { value: "receita", label: "Receitas" },
  { value: "patrimonio", label: "Patrimônio" },
  { value: "servico", label: "Serviços" },
  { value: "estoque", label: "Estoque" },
] as const;
type Tipo = typeof TIPOS[number]["value"];

function CategoriasPage() {
  const [tipo, setTipo] = useState<Tipo>("despesa");
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><Tag className="h-6 w-6 text-primary" /> Categorias</h1>
        <p className="text-sm text-muted-foreground">Categorias separadas por tipo. Toda alteração reflete automaticamente nos módulos que as consomem.</p>
      </header>
      <Tabs value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
        <TabsList>
          {TIPOS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        {TIPOS.map((t) => (
          <TabsContent key={t.value} value={t.value}><CategoriaCrud tipo={t.value} label={t.label} /></TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CategoriaCrud({ tipo, label }: { tipo: Tipo; label: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["categorias", tipo],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").eq("tipo", tipo).order("nome");
      if (error) throw error;
      return data as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (v: any) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user?.id;
      if (!user_id) throw new Error("Não autenticado");
      const payload = { nome: v.nome, descricao: v.descricao || null, ativo: v.ativo, tipo };
      if (editing?.id) {
        const { error } = await supabase.from("categorias").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categorias").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(editing ? "Atualizado" : "Cadastrado"); qc.invalidateQueries({ queryKey: ["categorias"] }); qc.invalidateQueries({ queryKey: ["select-categorias"] }); setOpen(false); setEditing(null); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("categorias").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["categorias"] }); },
  });

  return (
    <div className="space-y-3 pt-2">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">{rows.length} categoria(s) em <span className="font-medium">{label}</span></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Nova categoria</Button></DialogTrigger>
          <CategoriaForm editing={editing} onSubmit={(p) => save.mutate(p)} loading={save.isPending} />
        </Dialog>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma categoria cadastrada.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-muted-foreground max-w-md truncate">{r.descricao ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className={r.ativo ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-muted"}>{r.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir categoria?</AlertDialogTitle><AlertDialogDescription>Registros vinculados perderão a referência.</AlertDialogDescription></AlertDialogHeader>
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

function CategoriaForm({ editing, onSubmit, loading }: { editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [v, setV] = useState<any>(() => ({
    nome: editing?.nome ?? "",
    descricao: editing?.descricao ?? "",
    ativo: editing?.ativo ?? true,
  }));
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }} className="space-y-4 pt-2">
        <div><Label>Nome *</Label><Input required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></div>
        <div><Label>Descrição</Label><Textarea rows={2} value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></div>
        <div className="flex items-center gap-2"><Switch checked={v.ativo} onCheckedChange={(c) => setV({ ...v, ativo: c })} /><Label>Categoria ativa</Label></div>
        <DialogFooter><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}