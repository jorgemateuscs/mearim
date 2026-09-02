import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntitySelect } from "@/components/entity-select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, FileDown, FileText, Columns3, Copy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AuditInfo } from "@/components/audit-info";
import { formatBRL, formatDateTime } from "@/lib/format";
import { useUserEmails, userLabel } from "@/hooks/use-user-emails";
import { exportCsv, exportPdf } from "@/components/data-export";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "email" | "select" | "boolean" | "entity";
  required?: boolean;
  colSpan?: 1 | 2;
  hideInTable?: boolean;
  /** options for type "select" */
  options?: { value: string; label: string }[];
  /** table name for type "entity" */
  entityTable?: string;
  entityLabelKey?: string;
  /** show a sum of this column in the table footer */
  total?: boolean;
  /** default value for new records */
  defaultValue?: any;
  render?: (v: any, row: any) => ReactNode;
};

type Props = {
  title: string;
  description?: string;
  table: string;
  fields: Field[];
  searchKey?: string;
};

const PAGE_SIZES = [25, 50, 100];

function useEntityMaps(fields: Field[]) {
  const entityFields = fields.filter((f) => f.type === "entity" && f.entityTable);
  const { data = {} } = useQuery({
    queryKey: ["entity-maps", entityFields.map((f) => f.entityTable).join(",")],
    enabled: entityFields.length > 0,
    queryFn: async () => {
      const out: Record<string, Record<string, string>> = {};
      for (const f of entityFields) {
        const labelKey = f.entityLabelKey ?? "nome";
        const { data } = await supabase.from(f.entityTable as any).select(`id, ${labelKey}`);
        const map: Record<string, string> = {};
        (data as any[] | null)?.forEach((r) => { map[r.id] = r[labelKey]; });
        out[f.key] = map;
      }
      return out;
    },
  });
  return data as Record<string, Record<string, string>>;
}

export function CrudPage({ title, description, table, fields, searchKey }: Props) {
  const qc = useQueryClient();
  const emails = useUserEmails();
  const entityMaps = useEntityMaps(fields);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [hidden, setHidden] = useState<string[]>([]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select("*").is("deleted_at", null).order("created_at", { ascending: false });
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
        if (f.type === "boolean") { cleaned[f.key] = !!v; return; }
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
      qc.invalidateQueries();
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { await softDelete(table, id); },
    onSuccess: () => {
      toast.success("Movido para a lixeira (recuperável por 7 dias)");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao excluir"),
  });


  const cellText = (f: Field, row: any): string => {
    const v = row[f.key];
    if (f.type === "entity") return entityMaps[f.key]?.[v] ?? (v ? "—" : "—");
    if (f.type === "boolean") return v ? "Sim" : "Não";
    if (f.type === "select") return f.options?.find((o) => o.value === v)?.label ?? String(v ?? "—");
    if (v == null || v === "") return "—";
    if (f.type === "number" && f.total) return formatBRL(Number(v));
    if (f.type === "date") return String(v);
    return String(v);
  };

  const searchable = useMemo(
    () => (searchKey ? fields : fields),
    [fields, searchKey],
  );

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const term = q.toLowerCase();
    return rows.filter((r) =>
      searchable.some((f) => cellText(f, r).toLowerCase().includes(term)) ||
      String(r[searchKey ?? "nome"] ?? "").toLowerCase().includes(term),
    );
  }, [rows, q, searchable, entityMaps]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const f = fields.find((x) => x.key === sort.key);
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: any = a[sort.key];
      let bv: any = b[sort.key];
      if (f?.type === "number") { av = Number(av) || 0; bv = Number(bv) || 0; }
      else { av = f ? cellText(f, a) : String(av ?? ""); bv = f ? cellText(f, b) : String(bv ?? ""); }
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort, fields, entityMaps]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages - 1);
  const paged = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const tableFields = fields.filter((f) => !f.hideInTable && !hidden.includes(f.key));
  const totalsFields = tableFields.filter((f) => f.total);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const exportHeaders = [...tableFields.map((f) => f.label), "Última alteração"];
  const exportRows = () =>
    sorted.map((row) => [
      ...tableFields.map((f) => cellText(f, row)),
      formatDateTime(row.updated_at ?? row.created_at),
    ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar em tudo..." value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="pl-9 w-56" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="Colunas"><Columns3 className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              <DropdownMenuLabel>Colunas visíveis</DropdownMenuLabel>
              {fields.filter((f) => !f.hideInTable).map((f) => (
                <DropdownMenuCheckboxItem
                  key={f.key}
                  checked={!hidden.includes(f.key)}
                  onCheckedChange={(v) => setHidden((h) => (v ? h.filter((k) => k !== f.key) : [...h, f.key]))}
                >
                  {f.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="icon" title="Exportar CSV" onClick={() => exportCsv(title.toLowerCase(), exportHeaders, exportRows())}>
            <FileDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" title="Exportar PDF" onClick={() => exportPdf(title.toLowerCase(), title, exportHeaders, exportRows())}>
            <FileText className="h-4 w-4" />
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </DialogTrigger>
            <FormDialog key={(editing?.id ?? "new") + (editing?.__copy ? "-copy" : "")} fields={fields} editing={editing} onSubmit={(p) => upsert.mutate(p)} loading={upsert.isPending} />
          </Dialog>
        </div>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {tableFields.map((f) => (
                  <TableHead key={f.key} className="whitespace-nowrap">
                    <button type="button" onClick={() => toggleSort(f.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                      {f.label}
                      <ArrowUpDown className={`h-3 w-3 ${sort?.key === f.key ? "text-primary" : "opacity-40"}`} />
                    </button>
                  </TableHead>
                ))}
                <TableHead className="whitespace-nowrap">Última alteração</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={tableFields.length + 2} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
              )}
              {!isLoading && sorted.length === 0 && (
                <TableRow><TableCell colSpan={tableFields.length + 2} className="text-center text-muted-foreground py-8">Nenhum registro. Clique em "Novo" para começar.</TableCell></TableRow>
              )}
              {paged.map((row) => (
                <TableRow key={row.id}>
                  {tableFields.map((f) => (
                    <TableCell key={f.key} className="max-w-64 truncate">
                      {f.render
                        ? f.render(row[f.key], row)
                        : f.type === "boolean"
                          ? <Badge variant="outline" className={row[f.key] ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-muted"}>{row[f.key] ? "Sim" : "Não"}</Badge>
                          : cellText(f, row)}
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    <div>{formatDateTime(row.updated_at ?? row.created_at)}</div>
                    <div className="text-[10px]">{userLabel(emails, row.updated_by ?? row.created_by)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(row); setOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Duplicar" onClick={() => { const { id, created_at, updated_at, created_by, updated_by, ...rest } = row; setEditing({ ...rest, __copy: true }); setOpen(true); }}>
                        <Copy className="h-4 w-4" />
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
              {totalsFields.length > 0 && sorted.length > 0 && (
                <TableRow className="bg-muted/20 font-semibold hover:bg-muted/20">
                  {tableFields.map((f, i) => (
                    <TableCell key={f.key} className="whitespace-nowrap">
                      {i === 0 ? "Totais" : f.total ? formatBRL(sorted.reduce((s, r) => s + (Number(r[f.key]) || 0), 0)) : ""}
                    </TableCell>
                  ))}
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <div>{sorted.length} registro(s){q && ` (filtrado de ${rows.length})`}</div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
              <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} / pág.</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</Button>
            <span>{current + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={current >= totalPages - 1} onClick={() => setPage(current + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FormDialog({ fields, editing, onSubmit, loading }: { fields: Field[]; editing: any | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [values, setValues] = useState<any>(() => {
    const base: any = {};
    fields.forEach((f) => {
      const fallback = f.defaultValue !== undefined ? f.defaultValue : f.type === "boolean" ? true : "";
      base[f.key] = editing?.[f.key] ?? fallback;
    });
    return base;
  });
  const set = (k: string, v: any) => setValues((prev: any) => ({ ...prev, [k]: v }));

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editing?.__copy ? "Duplicar registro" : editing ? "Editar registro" : "Novo registro"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }} className="grid grid-cols-2 gap-4 pt-2">
        {fields.map((f) => (
          <div key={f.key} className={f.colSpan === 2 || f.type === "textarea" ? "col-span-2" : "col-span-2 md:col-span-1"}>
            <Label htmlFor={f.key}>{f.label}{f.required && " *"}</Label>
            {f.type === "textarea" ? (
              <Textarea id={f.key} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} rows={3} />
            ) : f.type === "boolean" ? (
              <div className="flex h-10 items-center gap-2">
                <Switch id={f.key} checked={!!values[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                <span className="text-sm text-muted-foreground">{values[f.key] ? "Sim" : "Não"}</span>
              </div>
            ) : f.type === "select" ? (
              <Select value={values[f.key] || undefined} onValueChange={(v) => set(f.key, v)}>
                <SelectTrigger id={f.key}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : f.type === "entity" ? (
              <EntitySelect table={f.entityTable!} labelKey={f.entityLabelKey ?? "nome"} value={values[f.key] || null} onChange={(v) => set(f.key, v)} />
            ) : (
              <Input
                id={f.key}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                step={f.type === "number" ? "0.01" : undefined}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        ))}
        <DialogFooter className="col-span-2">
          <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </form>
      {editing && !editing.__copy && <AuditInfo row={editing} />}
    </DialogContent>
  );
}
