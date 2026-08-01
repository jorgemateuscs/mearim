import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Assina todas as mudanças do banco e invalida o cache, mantendo
 * todas as telas abertas sincronizadas em tempo real entre usuários.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("erp-global-sync")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        qc.invalidateQueries();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
