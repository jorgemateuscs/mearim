import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/servicos")({
  ssr: false,
  component: ServicosPage,
});

const fields: Field[] = [
  { key: "nome", label: "Serviço", required: true },
  { key: "descricao", label: "Descrição", type: "textarea", hideInTable: true },
  { key: "valor_venda", label: "Valor de venda", type: "number", render: (v) => formatBRL(v) },
  { key: "custo_medio", label: "Custo médio", type: "number", render: (v) => formatBRL(v) },
  { key: "comissao_percentual", label: "Comissão (%)", type: "number" },
  { key: "observacao", label: "Observações", type: "textarea", hideInTable: true },
];

function ServicosPage() {
  return <CrudPage title="Serviços" description="Catálogo de serviços oferecidos." table="servicos" fields={fields} searchKey="nome" />;
}
