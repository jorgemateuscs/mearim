import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Tags, Truck, CreditCard, Landmark, Users, Wrench, FileText, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  ssr: false,
  component: ConfiguracoesPage,
});

const groups = [
  { title: "Categorias", desc: "Despesa, receita, patrimônio, serviço e estoque.", url: "/categorias", icon: Tags },
  { title: "Fornecedores", desc: "Quem fornece produtos, peças e equipamentos.", url: "/fornecedores", icon: Truck },
  { title: "Meios de pagamento", desc: "Formas de pagar e receber.", url: "/meios-pagamento", icon: CreditCard },
  { title: "Bancos e conciliação", desc: "Contas bancárias, saldos e extrato oficial.", url: "/conciliacao", icon: Landmark },
  { title: "Profissionais", desc: "Equipe, comissões e benefícios.", url: "/profissionais", icon: Users },
  { title: "Serviços", desc: "Catálogo de serviços e comissões.", url: "/servicos", icon: Wrench },
  { title: "Relatórios", desc: "Relatório financeiro profissional em PDF por período.", url: "/relatorios", icon: FileText },
  { title: "Auditoria e Lixeira", desc: "Quem alterou o quê, quando — e recuperação de 7 dias.", url: "/auditoria", icon: History },
];


function ConfiguracoesPage() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Cadastros de apoio que alimentam todos os módulos do sistema.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <Link key={g.url} to={g.url}>
            <Card className="h-full p-5 transition-colors hover:border-primary/50">
              <g.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold">{g.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{g.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}