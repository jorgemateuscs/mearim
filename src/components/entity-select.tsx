import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  table: string;
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  placeholder?: string;
  labelKey?: string;
  allowNone?: boolean;
  filter?: { column: string; value: string };
};

export function EntitySelect({ table, value, onChange, placeholder = "Selecione...", labelKey = "nome", allowNone = true, filter }: Props) {
  const { data = [] } = useQuery({
    queryKey: [`select-${table}`, filter?.column, filter?.value],
    queryFn: async () => {
      let q = supabase.from(table as any).select(`id, ${labelKey}`).order(labelKey);
      if (filter) q = q.eq(filter.column, filter.value);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
  return (
    <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="__none">— Nenhum —</SelectItem>}
        {data.map((r) => (
          <SelectItem key={r.id} value={r.id}>{r[labelKey]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
