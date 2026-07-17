import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel", replace: true });
      else navigate({ to: "/auth", replace: true });
      setChecking(false);
    });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">{checking ? "Carregando..." : ""}</div>
    </div>
  );
}
