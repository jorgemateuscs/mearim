import { formatDateTime } from "@/lib/format";
import { Clock } from "lucide-react";
import { useUserLabels } from "@/hooks/use-user-labels";

type Row = {
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
} | null | undefined;

/** Bloco padrão de auditoria (data/hora de criação e da última alteração). */
export function AuditInfo({ row, className = "" }: { row: Row; className?: string }) {
  const label = useUserLabels([row?.created_by, row?.updated_by]);
  if (!row) return null;
  return (
    <div className={`col-span-2 mt-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        <Clock className="h-3 w-3" /> Registro
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
        <span>
          Criado em <span className="text-foreground font-medium">{formatDateTime(row.created_at)}</span>
          {" por "}<span className="text-foreground font-medium break-all">{label(row.created_by)}</span>
        </span>
        <span>
          Última alteração <span className="text-foreground font-medium">{formatDateTime(row.updated_at)}</span>
          {" por "}<span className="text-foreground font-medium break-all">{label(row.updated_by)}</span>
        </span>
      </div>
    </div>
  );
}