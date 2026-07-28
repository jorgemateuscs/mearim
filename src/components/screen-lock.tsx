import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { verifyScreenPin } from "@/lib/screen-lock.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, LogOut, ShieldCheck } from "lucide-react";

const IDLE_MS = 2 * 60 * 1000;

export function ScreenLock({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const verify = useServerFn(verifyScreenPin);
  const [locked, setLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [email, setEmail] = useState<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const resetIdle = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLocked(true), IDLE_MS);
  }, []);

  useEffect(() => {
    if (locked) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];
    events.forEach((e) => window.addEventListener(e, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [locked, resetIdle]);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [locked]);

  const unlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(null);
    try {
      const res = await verify({ data: { pin } });
      if (!res.configured) setError("PIN não configurado no sistema.");
      else if (!res.ok) setError("PIN incorreto.");
      else {
        setPin("");
        setLocked(false);
      }
    } catch {
      setError("Falha ao validar. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  const sair = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <>
      <div aria-hidden={locked} className={locked ? "pointer-events-none blur-md select-none" : undefined}>
        {children}
      </div>

      {locked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-background/80 backdrop-blur-xl">
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              background:
                "radial-gradient(700px circle at 25% 20%, oklch(0.35 0.15 200 / 0.55), transparent), radial-gradient(600px circle at 80% 80%, oklch(0.35 0.12 220 / 0.4), transparent)",
            }}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border/60 bg-card/80 backdrop-blur-2xl p-8 shadow-2xl text-center">
            <div className="text-5xl font-bold tracking-tight tabular-nums">
              {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="text-xs text-muted-foreground capitalize mt-1">
              {now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </div>

            <div className="my-6 flex flex-col items-center gap-2">
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}
              >
                <Lock className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-sm font-semibold">Tela bloqueada</div>
              {email && <div className="text-xs text-muted-foreground">{email}</div>}
            </div>

            <form onSubmit={unlock} className="space-y-3">
              <Input
                autoFocus
                type="password"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Digite o PIN"
                className="text-center text-lg tracking-[0.5em]"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={checking || !pin}>
                {checking ? "Verificando..." : "Desbloquear"}
              </Button>
            </form>

            <button
              type="button"
              onClick={sair}
              className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3 w-3" /> Sair da conta
            </button>

            <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" /> Bloqueio automático após 2 minutos sem atividade
            </p>
          </div>
        </div>
      )}
    </>
  );
}