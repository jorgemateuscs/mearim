import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/config/permissoes")({
  ssr: false,
  component: PermissoesPage,
});

const ROLES = ["admin", "financeiro", "operador", "leitura"] as const;

function PermissoesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["permissoes"],
    queryFn: async () => {
      const [profiles, roles, me] = await Promise.all([
        supabase.from("profiles").select("id,full_name"),
        supabase.from("user_roles").select("*"),
        supabase.auth.getUser(),
      ]);
      return {
        profiles: profiles.data ?? [],
        roles: roles.data ?? [],
        myId: me.data.user?.id ?? null,
      };
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Papel concedido"); qc.invalidateQueries({ queryKey: ["permissoes"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message ?? "Sem permissão. Você precisa ser admin."),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("user_roles").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Papel removido"); qc.invalidateQueries({ queryKey: ["permissoes"] }); },
    onError: (e: any) => toast.error(e.message ?? "Sem permissão."),
  });

  const bootstrap = useMutation({
    mutationFn: async () => {
      if (!data?.myId) throw new Error("Não autenticado");
      const hasAnyAdmin = (data.roles ?? []).some((r: any) => r.role === "admin");
      if (hasAnyAdmin) throw new Error("Já existe um admin.");
      const { error } = await supabase.from("user_roles").insert({ user_id: data.myId, role: "admin" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Você agora é administrador"); qc.invalidateQueries({ queryKey: ["permissoes"] }); },
    onError: (e: any) => toast.error(e.message ?? "Erro"),
  });

  const hasAnyAdmin = (data?.roles ?? []).some((r: any) => r.role === "admin");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> Permissões</h1>
          <p className="text-sm text-muted-foreground">Controle de acesso por papéis. Somente administradores podem gerenciar.</p>
        </div>
        {!hasAnyAdmin && !isLoading && (
          <Button variant="outline" onClick={() => bootstrap.mutate()}>Tornar-me administrador</Button>
        )}
        {hasAnyAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Conceder papel</Button></DialogTrigger>
            <AddRoleDialog profiles={data?.profiles ?? []} onSubmit={(u, r) => addRole.mutate({ user_id: u, role: r })} loading={addRole.isPending} />
          </Dialog>
        )}
      </header>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && (data?.roles.length ?? 0) === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum papel atribuído.</TableCell></TableRow>}
            {(data?.roles ?? []).map((r: any) => {
              const p = data!.profiles.find((x: any) => x.id === r.user_id);
              return (
                <TableRow key={r.id}>
                  <TableCell>{p?.full_name ?? r.user_id}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">{r.role}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeRole.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AddRoleDialog({ profiles, onSubmit, loading }: { profiles: any[]; onSubmit: (userId: string, role: string) => void; loading: boolean }) {
  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<string>("operador");
  return (
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>Conceder papel</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); if (userId) onSubmit(userId, role); }} className="space-y-4 pt-2">
        <div>
          <Label>Usuário</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.id}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Papel</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter><Button type="submit" disabled={loading || !userId}>{loading ? "Salvando..." : "Conceder"}</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}