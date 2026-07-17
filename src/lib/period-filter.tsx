import { useState, useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";

export type PeriodPreset =
  | "hoje" | "ontem" | "semana" | "mes" | "30dias" | "ano" | "personalizado";

export type Period = { ini: string; fim: string; preset: PeriodPreset };

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function computePeriod(preset: PeriodPreset, custom?: { ini: string; fim: string }): Period {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  switch (preset) {
    case "hoje": return { ini: iso(today), fim: iso(today), preset };
    case "ontem": { const y1 = new Date(y, m, d - 1); return { ini: iso(y1), fim: iso(y1), preset }; }
    case "semana": { const dow = today.getDay(); const seg = new Date(y, m, d - ((dow + 6) % 7)); return { ini: iso(seg), fim: iso(today), preset }; }
    case "mes": return { ini: iso(new Date(y, m, 1)), fim: iso(new Date(y, m + 1, 0)), preset };
    case "30dias": return { ini: iso(new Date(y, m, d - 29)), fim: iso(today), preset };
    case "ano": return { ini: iso(new Date(y, 0, 1)), fim: iso(new Date(y, 11, 31)), preset };
    case "personalizado": return { ini: custom?.ini ?? iso(today), fim: custom?.fim ?? iso(today), preset };
  }
}

export function usePeriod(defaultPreset: PeriodPreset = "mes") {
  const [preset, setPreset] = useState<PeriodPreset>(defaultPreset);
  const [custom, setCustom] = useState<{ ini: string; fim: string }>(() => {
    const p = computePeriod(defaultPreset);
    return { ini: p.ini, fim: p.fim };
  });
  const period = useMemo(() => computePeriod(preset, custom), [preset, custom]);
  return {
    period,
    preset,
    setPreset: (p: PeriodPreset) => {
      setPreset(p);
      if (p !== "personalizado") {
        const np = computePeriod(p);
        setCustom({ ini: np.ini, fim: np.fim });
      }
    },
    custom,
    setCustom: (c: { ini: string; fim: string }) => { setCustom(c); setPreset("personalizado"); },
  };
}

const OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "hoje", label: "Hoje" },
  { value: "ontem", label: "Ontem" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "30dias", label: "Últimos 30 dias" },
  { value: "ano", label: "Este ano" },
  { value: "personalizado", label: "Período personalizado" },
];

export function PeriodFilter({ preset, setPreset, custom, setCustom }: ReturnType<typeof usePeriod>) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <Label className="text-xs mb-1 flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> Período</Label>
        <Select value={preset} onValueChange={(v) => setPreset(v as PeriodPreset)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {preset === "personalizado" && (
        <>
          <DateBtn label="De" value={custom.ini} onChange={(v) => setCustom({ ...custom, ini: v })} />
          <DateBtn label="Até" value={custom.fim} onChange={(v) => setCustom({ ...custom, fim: v })} />
        </>
      )}
    </div>
  );
}

function DateBtn({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col">
      <Label className="text-xs mb-1">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-40 justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? formatDate(value) : "Escolher"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ? new Date(value + "T00:00:00") : undefined}
            onSelect={(d) => d && onChange(d.toISOString().slice(0, 10))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}