import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";
import { formatBRL, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  ssr: false,
  component: EquipamentosPage,
});

const fields: Field[] = [
  { key: "nome", label: "Equipamento", required: true },
  { key: "categoria_id", label: "Categoria", type: "entity", entityTable: "categorias" },
  { key: "marca", label: "Marca" },
  { key: "modelo", label: "Modelo" },
  { key: "numero_serie", label: "Nº de série", hideInTable: true },
  { key: "data_compra", label: "Data da compra", type: "date", render: (v) => formatDate(v) },
  { key: "valor", label: "Valor", type: "number", total: true, render: (v) => formatBRL(Number(v)) },
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
  { key: "situacao", label: "Situação", hideInTable: true },
  { key: "fornecedor_id", label: "Fornecedor", type: "entity", entityTable: "fornecedores" },
  { key: "banco_id", label: "Banco de saída", type: "entity", entityTable: "bancos", hideInTable: true },
  { key: "observacao", label: "Observações", type: "textarea", hideInTable: true },
  { key: "ativo", label: "Ativo", type: "boolean" },
];

function EquipamentosPage() {
  return (
    <CrudPage
      title="Equipamentos"
      description="Máquinas e equipamentos da empresa, com status de pagamento."
      table="equipamentos"
      fields={fields}
      searchKey="nome"
    />
  );
}