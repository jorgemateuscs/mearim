import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, ShoppingCart, Wallet, Users, UserCog, Wrench, Package, Landmark, Boxes,
  LogOut, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Truck, Building2, HardDrive, Cog,
  ChevronDown, Tag, CreditCard, ShieldCheck, User, FileBarChart, History,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

type Sub = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; children: Sub[] };
type Item = { title: string; url: string; icon: any };

const painel: Item = { title: "Painel", url: "/painel", icon: LayoutDashboard };

const groups: Group[] = [
  { title: "Financeiro", icon: Wallet, children: [
    { title: "Contas a Pagar", url: "/financeiro?tab=pagar", icon: ArrowUpCircle },
    { title: "Contas a Receber", url: "/financeiro?tab=receber", icon: ArrowDownCircle },
    { title: "Transferências", url: "/conciliacao?tab=transferencias", icon: ArrowLeftRight },
    { title: "Conciliação Bancária", url: "/conciliacao", icon: History },
  ]},
  { title: "Comercial", icon: ShoppingCart, children: [
    { title: "Vendas", url: "/vendas", icon: ShoppingCart },
    { title: "Serviços", url: "/servicos", icon: Wrench },
  ]},
  { title: "Pessoas", icon: Users, children: [
    { title: "Clientes", url: "/clientes", icon: Users },
    { title: "Profissionais", url: "/profissionais", icon: UserCog },
    { title: "Fornecedores", url: "/fornecedores", icon: Truck },
  ]},
  { title: "Patrimônio", icon: Building2, children: [
    { title: "Estoque", url: "/estoque", icon: Package },
    { title: "Inventário", url: "/inventario", icon: Boxes },
    { title: "Equipamentos", url: "/equipamentos", icon: HardDrive },
    { title: "Peças", url: "/pecas", icon: Cog },
  ]},
];

const relatorios: Item = { title: "Relatórios", url: "/relatorios", icon: FileBarChart };

const configGroup: Group = {
  title: "Configurações", icon: Cog, children: [
    { title: "Bancos", url: "/config/bancos", icon: Landmark },
    { title: "Categorias", url: "/config/categorias", icon: Tag },
    { title: "Meios de Pagamento", url: "/config/meios-pagamento", icon: CreditCard },
    { title: "Usuários", url: "/config/usuarios", icon: User },
    { title: "Permissões", url: "/config/permissoes", icon: ShieldCheck },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}>
            <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight">Gestão</div>
              <div className="text-[10px] text-muted-foreground truncate">Sistema comercial</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(painel.url)} tooltip={painel.title}>
                  <Link to={painel.url}><painel.icon /><span>{painel.title}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {groups.map((g) => <GroupItem key={g.title} group={g} pathname={pathname} collapsed={collapsed} />)}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive(relatorios.url)} tooltip={relatorios.title}>
                  <Link to={relatorios.url}><relatorios.icon /><span>{relatorios.title}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <GroupItem group={configGroup} pathname={pathname} collapsed={collapsed} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} tooltip="Sair">
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function GroupItem({ group, pathname, collapsed }: { group: Group; pathname: string; collapsed: boolean }) {
  const isChildActive = group.children.some((c) => {
    const path = c.url.split("?")[0];
    return pathname === path || pathname.startsWith(path + "/");
  });
  if (collapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton isActive={isChildActive} tooltip={group.title}>
          <group.icon />
          <span>{group.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  return (
    <Collapsible defaultOpen={isChildActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={isChildActive}>
            <group.icon />
            <span>{group.title}</span>
            <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.children.map((c) => {
              const [path, qs] = c.url.split("?");
              const search = qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined;
              const active = pathname === path;
              return (
                <SidebarMenuSubItem key={c.url}>
                  <SidebarMenuSubButton asChild isActive={active}>
                    <Link to={path} search={search as any}><c.icon /><span>{c.title}</span></Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
