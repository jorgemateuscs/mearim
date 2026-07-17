import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/config/bancos")({
  ssr: false,
  component: () => (
    <CrudPage
      title="Bancos"
      description="Cadastro central de contas bancárias. Usado em todos os módulos financeiros."
      table="bancos"
      searchKey="nome"
      fields={[
        { key: "nome", label: "Nome", required: true, colSpan: 2 },
        { key: "saldo_inicial", label: "Saldo inicial", type: "number" },
      ]}
    />
  ),
});
