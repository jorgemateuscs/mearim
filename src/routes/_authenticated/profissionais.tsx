import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profissionais")({
  ssr: false,
  component: ProfissionaisPage,
});

const fields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  { key: "funcao", label: "Função" },
  { key: "contato", label: "Contato" },
  { key: "dias_trabalho", label: "Dias de trabalho" },
  { key: "salario_fixo", label: "Salário fixo", type: "number", render: (v) => formatBRL(v) },
  { key: "comissao_percentual", label: "Comissão (%)", type: "number" },
  { key: "beneficios", label: "Benefícios", type: "textarea", hideInTable: true },
  { key: "observacao", label: "Observações", type: "textarea", hideInTable: true },
];

function ProfissionaisPage() {
  return <CrudPage title="Profissionais" description="Equipe, remuneração e comissões." table="profissionais" fields={fields} searchKey="nome" />;
}
