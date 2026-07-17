import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/financeiro")({
  ssr: false,
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Contas a pagar e contas a receber.</p>
      </header>
      <Card className="p-12 text-center">
        <Wallet className="h-10 w-10 mx-auto text-primary/60 mb-4" />
        <h2 className="text-lg font-semibold">Módulo Financeiro — Fase 2</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Contas a pagar (com filtros por ano/mês/status) e contas a receber com controle de parcelas.
        </p>
      </Card>
    </div>
  ),
});
