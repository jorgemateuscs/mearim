import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendas")({
  ssr: false,
  component: () => (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vendas</h1>
        <p className="text-sm text-muted-foreground">Produtos e serviços vendidos.</p>
      </header>
      <Card className="p-12 text-center">
        <ShoppingCart className="h-10 w-10 mx-auto text-primary/60 mb-4" />
        <h2 className="text-lg font-semibold">Módulo de Vendas — Fase 2</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Registro de vendas de produtos (com baixa automática de estoque) e vendas de serviços,
          integrados ao Contas a Receber e Painel.
        </p>
      </Card>
    </div>
  ),
});
