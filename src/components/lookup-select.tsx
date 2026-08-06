import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CategoriaTipo = "despesa" | "receita" | "patrimonio" | "servico" | "estoque";

/** Categorias cadastradas (somente ativas), filtradas por tipo. */
export function useCategorias(tipos: CategoriaTipo[]) {
  const key = tipos.join(",");
  return useQuery({
    queryKey: ["lookup-categorias", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id,nome,tipo")
        .eq("ativo", true)
        .in("tipo", tipos as any)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string; tipo: string }[];
    },
  });
}

/** Meios de pagamento cadastrados (somente ativos). */
export function useMeiosPagamento() {
  return useQuery({
    queryKey: ["lookup-meios-pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meios_pagamento")
        .select("id,nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string }[];
    },
  });
}

type IdSelectProps = {
  valueId: string | null | undefined;
  valueNome?: string | null;
  onChange: (id: string | null, nome: string | null) => void;
  placeholder?: string;
};

function BaseIdSelect({
  options,
  valueId,
  valueNome,
  onChange,
  placeholder,
  emptyHint,
}: IdSelectProps & { options: { id: string; nome: string }[]; emptyHint: string }) {
  const known = valueId && options.some((o) => o.id === valueId);
  const legacy = !known && !!valueNome;
  const current = known ? (valueId as string) : legacy ? "__legacy" : "__none";
  return (
    <Select
      value={current}
      onValueChange={(v) => {
        if (v === "__none") return onChange(null, null);
        if (v === "__legacy") return;
        const opt = options.find((o) => o.id === v);
        onChange(v, opt?.nome ?? null);
      }}
    >
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecione..."} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">— Nenhum —</SelectItem>
        {legacy && <SelectItem value="__legacy">{valueNome} (antigo)</SelectItem>}
        {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{emptyHint}</div>
        )}
      </SelectContent>
    </Select>
  );
}

export function CategoriaSelect({ tipos, ...rest }: IdSelectProps & { tipos: CategoriaTipo[] }) {
  const { data = [] } = useCategorias(tipos);
  return <BaseIdSelect options={data} emptyHint="Nenhuma categoria cadastrada." {...rest} />;
}

export function MeioPagamentoSelect(props: IdSelectProps) {
  const { data = [] } = useMeiosPagamento();
  return <BaseIdSelect options={data} emptyHint="Nenhum meio de pagamento cadastrado." {...props} />;
}

/** Select que grava apenas o nome (para tabelas sem coluna de vínculo). */
export function NomeSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyHint = "Nenhum registro cadastrado.",
}: {
  options: { id: string; nome: string }[];
  value: string | null | undefined;
  onChange: (nome: string | null) => void;
  placeholder?: string;
  emptyHint?: string;
}) {
  const known = value && options.some((o) => o.nome === value);
  const legacy = !!value && !known;
  const current = known ? (value as string) : legacy ? "__legacy" : "__none";
  return (
    <Select
      value={current}
      onValueChange={(v) => {
        if (v === "__none") return onChange(null);
        if (v === "__legacy") return;
        onChange(v);
      }}
    >
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecione..."} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">— Nenhum —</SelectItem>
        {legacy && <SelectItem value="__legacy">{value} (antigo)</SelectItem>}
        {options.map((o) => <SelectItem key={o.id} value={o.nome}>{o.nome}</SelectItem>)}
        {options.length === 0 && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{emptyHint}</div>
        )}
      </SelectContent>
    </Select>
  );
}

export function MeioPagamentoNomeSelect({ value, onChange }: { value: string | null | undefined; onChange: (nome: string | null) => void }) {
  const { data = [] } = useMeiosPagamento();
  return <NomeSelect options={data} value={value} onChange={onChange} emptyHint="Nenhum meio de pagamento cadastrado." />;
}

export function CategoriaNomeSelect({ tipos, value, onChange }: { tipos: CategoriaTipo[]; value: string | null | undefined; onChange: (nome: string | null) => void }) {
  const { data = [] } = useCategorias(tipos);
  return <NomeSelect options={data} value={value} onChange={onChange} emptyHint="Nenhuma categoria cadastrada." />;
}
