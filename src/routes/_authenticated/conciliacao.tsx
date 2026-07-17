import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Landmark } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conciliacao")({
  ssr: false,
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Conciliação Bancária</h1>
        <p className="text-sm text-muted-foreground">Contas bancárias, transferências e saldos.</p>
      </header>
      <Card className="p-12 text-center">
        <Landmark className="h-10 w-10 mx-auto text-primary/60 mb-4" />
        <h2 className="text-lg font-semibold">Conciliação — Fase 3</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Cadastro de bancos, registro de transferências e cálculo automático de saldo inicial, atual e disponível.
        </p>
      </Card>
    </div>
  ),
});
