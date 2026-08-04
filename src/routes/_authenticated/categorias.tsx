import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/categorias")({
  ssr: false,
  component: CategoriasPage,
});

const fields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  {
    key: "tipo",
    label: "Tipo",
    type: "select",
    required: true,
    defaultValue: "despesa",
    options: [
      { value: "despesa", label: "Despesa" },
      { value: "receita", label: "Receita" },
      { value: "patrimonio", label: "Patrimônio" },
      { value: "servico", label: "Serviço" },
      { value: "estoque", label: "Estoque" },
    ],
  },
  { key: "descricao", label: "Descrição", type: "textarea" },
  { key: "ativo", label: "Ativa", type: "boolean" },
];

function CategoriasPage() {
  return (
    <CrudPage
      title="Categorias"
      description="Categorias separadas por tipo: despesa, receita, patrimônio, serviço e estoque."
      table="categorias"
      fields={fields}
      searchKey="nome"
    />
  );
}