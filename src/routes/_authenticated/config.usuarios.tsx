import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { User, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/config/usuarios")({
  ssr: false,
  component: UsuariosPage,
});

function UsuariosPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["config-usuarios"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
      ]);
      const rolesByUser: Record<string, string[]> = {};
      (roles.data ?? []).forEach((r: any) => { (rolesByUser[r.user_id] ??= []).push(r.role); });
      return (profiles.data ?? []).map((p: any) => ({ ...p, roles: rolesByUser[p.id] ?? [] }));
    },
  });

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><User className="h-6 w-6 text-primary" /> Usuários</h1>
        <p className="text-sm text-muted-foreground">Usuários cadastrados no sistema. Papéis são gerenciados em Permissões.</p>
      </header>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Nome</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead>Cadastrado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário.</TableCell></TableRow>}
            {rows.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.roles.length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                    {u.roles.map((r: string) => (
                      <Badge key={r} variant="outline" className="bg-primary/10 text-primary border-primary/30"><ShieldCheck className="h-3 w-3 mr-1" />{r}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDate(u.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}