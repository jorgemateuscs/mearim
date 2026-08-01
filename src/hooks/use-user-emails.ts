import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Mapa id do usuário -> e-mail (ou nome), para exibir quem criou/alterou registros. */
export function useUserEmails() {
  const { data } = useQuery({
    queryKey: ["profiles-emails"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => {
        map[p.id] = p.email ?? p.full_name ?? "";
      });
      return map;
    },
  });
  return data ?? {};
}

export function userLabel(map: Record<string, string>, id?: string | null): string {
  if (!id) return "—";
  return map[id] || "usuário do sistema";
}
