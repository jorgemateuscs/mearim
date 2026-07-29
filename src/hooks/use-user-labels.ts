import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserLabels } from "@/lib/user-labels.functions";

/** Resolve IDs de usuário para e-mails, com cache longo. */
export function useUserLabels(ids: (string | null | undefined)[]) {
  const fetchLabels = useServerFn(getUserLabels);
  const clean = Array.from(new Set(ids.filter((v): v is string => !!v))).sort();
  const { data } = useQuery({
    queryKey: ["user-labels", clean],
    enabled: clean.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: () => fetchLabels({ data: { ids: clean } }),
  });
  return (id: string | null | undefined) => (id ? (data?.[id] ?? "—") : "—");
}