import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, type Field } from "@/components/crud-page";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes")({
  ssr: false,
  component: ClientesPage,
});

const fields: Field[] = [
  { key: "nome", label: "Nome", required: true },
  { key: "contato", label: "Contato" },
  { key: "cpf_cnpj", label: "CPF/CNPJ" },
  { key: "instagram_email", label: "Instagram / E-mail" },
  { key: "data_nascimento", label: "Aniversário", type: "date", render: (v) => formatDate(v) },
  { key: "forma_prospeccao", label: "Origem" },
  { key: "interesse", label: "Interesses", type: "textarea", hideInTable: true },
  { key: "ultimo_contato", label: "Último contato", type: "date", render: (v) => formatDate(v), hideInTable: true },
  { key: "proximo_contato", label: "Próximo contato", type: "date", render: (v) => formatDate(v) },
  { key: "dias_proximo_contato", label: "Dias p/ próximo contato", type: "number", hideInTable: true },
  { key: "observacao", label: "Observações", type: "textarea", hideInTable: true },
];

function ClientesPage() {
  return <CrudPage title="Clientes" description="Cadastro completo com aniversário, origem e follow-up." table="clientes" fields={fields} searchKey="nome" />;
}
