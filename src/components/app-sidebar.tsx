import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Users,
  UserCog,
  Wrench,
  Package,
  Landmark,
  Boxes,
  LogOut,
  Tags,
  Truck,
  CreditCard,
  FileText,
  History,
  Settings,
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";

const groups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: "Visão geral",
    items: [{ title: "Dashboard", url: "/painel", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    items: [
      { title: "Vendas", url: "/vendas", icon: ShoppingCart },
      { title: "Estoque", url: "/estoque", icon: Package },
      { title: "Serviços", url: "/servicos", icon: Wrench },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: Wallet },
      { title: "Conciliação", url: "/conciliacao", icon: Landmark },
      { title: "Categorias", url: "/categorias", icon: Tags },
      { title: "Meios de pagamento", url: "/meios-pagamento", icon: CreditCard },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Profissionais", url: "/profissionais", icon: UserCog },
      { title: "Fornecedores", url: "/fornecedores", icon: Truck },
    ],
  },
  {
    label: "Patrimônio",
    items: [{ title: "Inventário", url: "/inventario", icon: Boxes }],
  },
  {
    label: "Sistema",
    items: [
      { title: "Relatórios", url: "/relatorios", icon: FileText },
      { title: "Auditoria e Lixeira", url: "/auditoria", icon: History },
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ],
  },
];


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
              <div className="text-sm font-bold tracking-tight uppercase">FINANCEIRO</div>
              <div className="text-[10px] text-muted-foreground truncate">MEARIM DRONES LTDA</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
