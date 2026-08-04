import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/meios-pagamento")({
  ssr: false,
  component: MeiosPagamentoPage,
});

const fields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  { key: "ativo", label: "Ativo", type: "boolean" },
];

function MeiosPagamentoPage() {
  return (
    <CrudPage
      title="Meios de pagamento"
      description="Formas de pagamento e recebimento utilizadas no financeiro."
      table="meios_pagamento"
      fields={fields}
      searchKey="nome"
    />
  );
}