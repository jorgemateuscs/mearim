import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "email";
  required?: boolean;
  colSpan?: 1 | 2;
  hideInTable?: boolean;
  render?: (v: any, row: any) => ReactNode;
};

type Props = {
  title: string;
  description?: string;
  table: string;
  fields: Field[];
  searchKey?: string;
};

export function CrudPage({ title, description, table, fields, searchKey }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (payload: any) => {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;
      const cleaned: any = {};
      fields.forEach((f) => {
        let v = payload[f.key];
        if (v === "" || v === undefined) v = null;
        if (f.type === "number" && v != null) v = Number(v);
        cleaned[f.key] = v;
      });
      if (editing?.id) {
        const { error } = await supabase.from(table as any).update(cleaned).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).insert({ ...cleaned, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atualizado" : "Cadastrado");
      qc.invalidateQueries({ queryKey: [table] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: [table] });
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });

  const filtered = q && searchKey
    ? rows.filter((r) => String(r[searchKey] ?? "").toLowerCase().includes(q.toLowerCase()))
    : rows;

  const tableFields = fields.filter((f) => !f.hideInTable);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex gap-2 items-center">
          {searchKey && (
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 w-64" />
            </div>
          )}
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </DialogTrigger>
            <FormDialog key={editing?.id ?? "new"} fields={fields} editing={editing} onSubmit={(p) => upsert.mutate(p)} loading={upsert.isPending} />
          </Dialog>
        </div>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {tableFields.map((f) => (
                  <TableHead key={f.key} className="whitespace-nowrap">{f.label}</TableHead>
                ))}
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={tableFields.length + 1} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={tableFields.length + 1} className="text-center text-muted-foreground py-8">Nenhum registro. Clique em "Novo" para começar.</TableCell></TableRow>
              )}
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  {tableFields.map((f) => (
                    <TableCell key={f.key} className="max-w-64 truncate">
                      {f.render ? f.render(row[f.key], row) : (row[f.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(row); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir este registro?</AlertDialogTitle>
                            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(row.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
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

function FormDialog({ fields, editing, onSubmit, loading }: { fields: Field[]; editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [values, setValues] = useState<any>(() => {
    const base: any = {};
    fields.forEach((f) => { base[f.key] = editing?.[f.key] ?? ""; });
    return base;
  });

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing ? "Editar registro" : "Novo registro"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }} className="grid grid-cols-2 gap-4 pt-2">
        {fields.map((f) => (
          <div key={f.key} className={f.colSpan === 2 || f.type === "textarea" ? "col-span-2" : "col-span-2 md:col-span-1"}>
            <Label htmlFor={f.key}>{f.label}{f.required && " *"}</Label>
            {f.type === "textarea" ? (
              <Textarea id={f.key} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} rows={3} />
            ) : (
              <Input
                id={f.key}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                step={f.type === "number" ? "0.01" : undefined}
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                required={f.required}
              />
            )}
          </div>
        ))}
        <DialogFooter className="col-span-2">
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
