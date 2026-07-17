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
};

export function EntitySelect({ table, value, onChange, placeholder = "Selecione...", labelKey = "nome", allowNone = true }: Props) {
  const { data = [] } = useQuery({
    queryKey: [`select-${table}`],
    queryFn: async () => {
      const { data, error } = await supabase.from(table as any).select(`id, ${labelKey}`).order(labelKey);
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
