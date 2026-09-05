import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ContaCorrentePage } from "@/components/conta-corrente-page";

export const Route = createFileRoute("/_authenticated/contas-fornecedores")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    fornecedor: typeof search.fornecedor === "string" ? search.fornecedor : undefined,
  }),
  component: ContasFornecedoresPage,
});

function ContasFornecedoresPage() {
  const { fornecedor } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ContaCorrentePage
      parceiroTipo="fornecedor"
      selected={fornecedor}
      onSelect={(id) => navigate({ search: { fornecedor: id } })}
    />
  );
}
