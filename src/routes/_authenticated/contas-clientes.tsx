import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ContaCorrentePage } from "@/components/conta-corrente-page";

export const Route = createFileRoute("/_authenticated/contas-clientes")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    cliente: typeof search.cliente === "string" ? search.cliente : undefined,
  }),
  component: ContasClientesPage,
});

function ContasClientesPage() {
  const { cliente } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ContaCorrentePage
      parceiroTipo="cliente"
      selected={cliente}
      onSelect={(id) => navigate({ search: { cliente: id } })}
    />
  );
}
