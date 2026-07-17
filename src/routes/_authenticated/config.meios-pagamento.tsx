import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/config/meios-pagamento")({
  ssr: false,
  component: () => (
    <CrudPage
      title="Meios de Pagamento"
      description="Formas de pagamento disponíveis em todo o sistema (vendas, contas a pagar, contas a receber)."
      table="meios_pagamento"
      searchKey="nome"
      fields={[
        { key: "nome", label: "Nome", required: true, colSpan: 2 },
      ]}
    />
  ),
});