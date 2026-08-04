import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { LayoutDashboard } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: zodValidator(searchSchema),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (redirect as string) || "/painel", replace: true });
    });
  }, [navigate, redirect]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: nome } },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo(a).");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: (redirect as string) || "/painel", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: (redirect as string) || "/painel", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no login com Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "radial-gradient(600px circle at 20% 20%, oklch(0.35 0.15 200 / 0.5), transparent), radial-gradient(500px circle at 80% 80%, oklch(0.35 0.12 220 / 0.35), transparent)" }} />
      <Card className="w-full max-w-md p-8 relative z-10 bg-card/80 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}>
            <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">FINANCEIRO</h1>
            <p className="text-xs text-muted-foreground">MEARIM DRONES LTDA</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-1">{mode === "signin" ? "Entrar" : "Criar conta"}</h2>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "Acesse seu painel de gestão" : "Comece a organizar seu negócio hoje"}
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="nome">Seu nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={loading}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar com Google
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {mode === "signin" ? "Não tem uma conta? " : "Já tem uma conta? "}
          <button type="button" className="text-primary hover:underline font-medium" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </Card>
    </div>
  );
}
