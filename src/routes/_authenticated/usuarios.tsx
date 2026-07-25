import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, KeyRound, UserPlus } from "lucide-react";
import {
  listUsers,
  createUser,
  deleteUser,
  updateUserPassword,
  checkIsAdmin,
} from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Gestão" },
      { name: "description", content: "Gerencie usuários e permissões do sistema." },
    ],
  }),
  component: UsuariosPage,
});

const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "financeiro", label: "Financeiro" },
  { value: "operador", label: "Operador" },
  { value: "leitura", label: "Somente leitura" },
] as const;

function UsuariosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const check = useServerFn(checkIsAdmin);
  const list = useServerFn(listUsers);
  const create = useServerFn(createUser);
  const del = useServerFn(deleteUser);
  const updPwd = useServerFn(updateUserPassword);

  const adminQ = useQuery({ queryKey: ["is-admin"], queryFn: () => check() });

  useEffect(() => {
    if (adminQ.data && !adminQ.data.isAdmin) {
      toast.error("Acesso restrito a administradores");
      navigate({ to: "/painel" });
    }
  }, [adminQ.data, navigate]);

  const usersQ = useQuery({
    queryKey: ["users"],
    queryFn: () => list(),
    enabled: !!adminQ.data?.isAdmin,
  });

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("operador");

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<{ id: string; email: string } | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const createMut = useMutation({
    mutationFn: () => create({ data: { email, password, role } }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setOpen(false);
      setEmail("");
      setPassword("");
      setRole("operador");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwdMut = useMutation({
    mutationFn: () => updPwd({ data: { id: pwdTarget!.id, password: newPwd } }),
    onSuccess: () => {
      toast.success("Senha alterada");
      setPwdOpen(false);
      setNewPwd("");
      setPwdTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (adminQ.isLoading) return <div className="text-muted-foreground">Carregando…</div>;
  if (!adminQ.data?.isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre novos acessos e defina permissões.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Papéis</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQ.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : (
                (usersQ.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <Badge variant="outline">sem papel</Badge>
                        ) : (
                          u.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPwdTarget({ id: u.id, email: u.email });
                            setPwdOpen(true);
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                          Senha
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Excluir ${u.email}?`)) deleteMut.mutate(u.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!email || password.length < 6 || createMut.isPending}
            >
              {createMut.isPending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{pwdTarget?.email}</Label>
            <Input
              type="text"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Nova senha (mín. 6)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => pwdMut.mutate()}
              disabled={newPwd.length < 6 || pwdMut.isPending}
            >
              {pwdMut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}