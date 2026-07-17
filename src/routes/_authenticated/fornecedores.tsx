import { createFileRoute } from "@tanstack/react-router";
import { CrudPage } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  ssr: false,
  component: () => (
    <CrudPage
      title="Fornecedores"
      description="Cadastro de fornecedores de peças, equipamentos e produtos."
      table="fornecedores"
      searchKey="nome"
      fields={[
        { key: "nome", label: "Nome", required: true, colSpan: 2 },
        { key: "documento", label: "CPF / CNPJ" },
        { key: "contato", label: "Contato" },
        { key: "email", label: "E-mail", type: "email" },
        { key: "endereco", label: "Endereço", colSpan: 2 },
        { key: "observacao", label: "Observação", type: "textarea" },
      ]}
    />
  ),
});