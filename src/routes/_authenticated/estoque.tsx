import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque")({
  ssr: false,
  component: EstoquePage,
});

const fields: Field[] = [
  { key: "codigo", label: "Código" },
  { key: "nome", label: "Produto", required: true },
  { key: "descricao", label: "Descrição", type: "textarea", hideInTable: true },
  { key: "fornecedor", label: "Fornecedor" },
  { key: "valor_venda", label: "Valor de venda", type: "number", render: (v) => formatBRL(v) },
  { key: "custo_medio", label: "Custo médio", type: "number", render: (v) => formatBRL(v) },
  { key: "qtde_adquirida", label: "Qtd. adquirida", type: "number" },
  { key: "qtde_vendida", label: "Qtd. vendida", type: "number" },
];

function EstoquePage() {
  return <CrudPage title="Estoque" description="Controle de produtos, custos e quantidades." table="produtos" fields={fields} searchKey="nome" />;
}
