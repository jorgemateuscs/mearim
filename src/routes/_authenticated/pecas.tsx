import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pecas")({
  ssr: false,
  component: PecasPage,
});

const fields: Field[] = [
  { key: "nome", label: "Peça", required: true },
  { key: "categoria_id", label: "Categoria", type: "entity", entityTable: "categorias" },
  { key: "quantidade", label: "Qtd.", type: "number" },
  { key: "valor_unitario", label: "Valor unitário", type: "number", total: true, render: (v) => formatBRL(Number(v)) },
  { key: "valor_total", label: "Valor total", type: "number", total: true, render: (v) => formatBRL(Number(v)) },
  { key: "valor_pago", label: "Valor pago", type: "number", total: true, render: (v) => formatBRL(Number(v)) },
  {
    key: "status_pagamento",
    label: "Status",
    type: "select",
    defaultValue: "pendente",
    options: [
      { value: "pago", label: "Pago" },
      { value: "parcial", label: "Parcial" },
      { value: "pendente", label: "Pendente" },
    ],
  },
  { key: "fornecedor_id", label: "Fornecedor", type: "entity", entityTable: "fornecedores" },
  { key: "banco_id", label: "Banco de saída", type: "entity", entityTable: "bancos", hideInTable: true },
  { key: "data_compra", label: "Data da compra", type: "date", render: (v) => formatDate(v), hideInTable: true },
  { key: "observacao", label: "Observações", type: "textarea", hideInTable: true },
  { key: "ativo", label: "Ativa", type: "boolean" },
];

function PecasPage() {
  return (
    <CrudPage
      title="Peças"
      description="Peças de reposição, com quantidade, custo e status de pagamento."
      table="pecas"
      fields={fields}
      searchKey="nome"
    />
  );
}