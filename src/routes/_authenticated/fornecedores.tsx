import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  ssr: false,
  component: FornecedoresPage,
});

const fields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  { key: "documento", label: "CPF/CNPJ" },
  { key: "contato", label: "Contato" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "endereco", label: "Endereço", colSpan: 2, hideInTable: true },
  { key: "observacao", label: "Observações", type: "textarea", hideInTable: true },
  { key: "ativo", label: "Ativo", type: "boolean" },
];

function FornecedoresPage() {
  return (
    <CrudPage
      title="Fornecedores"
      description="Cadastro de fornecedores usados em compras, peças e equipamentos."
      table="fornecedores"
      fields={fields}
      searchKey="nome"
    />
  );
}