import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { FileBarChart, TrendingUp, TrendingDown, Users, Package, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  ssr: false,
  component: RelatoriosPage,
});

const relatorios = [
  { title: "Extrato Bancário (PDF)", desc: "Relatório completo por banco e período.", to: "/conciliacao", icon: History },
  { title: "Vendas por período", desc: "Total vendido, ticket médio, itens mais vendidos.", to: "/vendas", icon: TrendingUp },
  { title: "Contas a pagar", desc: "Detalhamento por categoria e vencimento.", to: "/financeiro", icon: TrendingDown },
  { title: "Contas a receber", desc: "Recebimentos previstos e realizados.", to: "/financeiro", icon: TrendingUp },
  { title: "Clientes ativos", desc: "Carteira, aniversariantes e contatos previstos.", to: "/clientes", icon: Users },
  { title: "Estoque atual", desc: "Situação dos produtos e valor imobilizado.", to: "/estoque", icon: Package },
];

function RelatoriosPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"><FileBarChart className="h-6 w-6 text-primary" /> Relatórios</h1>
        <p className="text-sm text-muted-foreground">Todos os relatórios usam as mesmas informações das telas do sistema — uma única fonte de dados.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatorios.map((r) => (
          <Link key={r.title} to={r.to} className="block">
            <Card className="p-5 hover:border-primary/50 transition-colors h-full">
              <r.icon className="h-6 w-6 text-primary mb-3" />
              <div className="font-semibold">{r.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}