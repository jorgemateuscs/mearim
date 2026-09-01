import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBRL, formatDate } from "@/lib/format";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

export type Parcela = { label: string; vencimento: string; valor: number };

export type ModoParcelamento = "fixo" | "valores" | "personalizado" | "datas";

export const MODOS: { value: ModoParcelamento; label: string; desc: string }[] = [
  { value: "fixo", label: "Parcelamento fixo", desc: "Parcelas iguais, vencimentos calculados automaticamente." },
  { value: "valores", label: "Valores diferentes", desc: "Vencimentos no padrão, você informa cada valor." },
  { value: "personalizado", label: "Personalizado", desc: "Você define data e valor de cada parcela (permite sinal)." },
  { value: "datas", label: "Datas diferentes, valores iguais", desc: "Valor igual em todas, você informa só as datas." },
];

function addInterval(iso: string, i: number, intervalo: string) {
  const d = new Date(iso + "T12:00:00");
  if (intervalo === "semanal") d.setDate(d.getDate() + 7 * i);
  else if (intervalo === "quinzenal") d.setDate(d.getDate() + 15 * i);
  else if (intervalo === "anual") d.setFullYear(d.getFullYear() + i);
  else d.setMonth(d.getMonth() + i);
  return d.toISOString().slice(0, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Divide o total em n parcelas iguais, ajustando centavos na última. */
export function dividirIgual(total: number, n: number) {
  const base = round2(total / n);
  const arr = Array.from({ length: n }, () => base);
  arr[n - 1] = round2(total - base * (n - 1));
  return arr;
}

type Props = {
  valorTotal: number;
  primeiraData: string;
  onChange: (parcelas: Parcela[] | null, modo: ModoParcelamento | "avista") => void;
};

export function ParcelamentoBuilder({ valorTotal, primeiraData, onChange }: Props) {
  const [forma, setForma] = useState<"avista" | "parcelado">("avista");
  const [modo, setModo] = useState<ModoParcelamento>("fixo");
  const [qtd, setQtd] = useState(2);
  const [intervalo, setIntervalo] = useState("mensal");
  const [primeira, setPrimeira] = useState(primeiraData);
  const [linhas, setLinhas] = useState<{ label: string; vencimento: string; valor: string }[]>([]);
  const [valorIgual, setValorIgual] = useState("");

  useEffect(() => setPrimeira(primeiraData), [primeiraData]);

  // Recalcula as linhas quando os parâmetros mudam
  useEffect(() => {
    if (forma !== "parcelado") return;
    const n = Math.max(1, Number(qtd) || 1);
    if (modo === "fixo") {
      const vals = dividirIgual(valorTotal, n);
      setLinhas(Array.from({ length: n }, (_, i) => ({
        label: `${i + 1}/${n}`,
        vencimento: addInterval(primeira, i, intervalo),
        valor: String(vals[i]),
      })));
    } else if (modo === "valores") {
      setLinhas((prev) => Array.from({ length: n }, (_, i) => ({
        label: `${i + 1}/${n}`,
        vencimento: addInterval(primeira, i, intervalo),
        valor: prev[i]?.valor ?? "",
      })));
    } else if (modo === "datas") {
      const v = valorIgual !== "" ? Number(valorIgual) : round2(valorTotal / n);
      setLinhas((prev) => Array.from({ length: n }, (_, i) => ({
        label: `${i + 1}/${n}`,
        vencimento: prev[i]?.vencimento ?? addInterval(primeira, i, intervalo),
        valor: String(v),
      })));
    } else {
      setLinhas((prev) => (prev.length ? prev : [
        { label: "Sinal", vencimento: primeira, valor: "" },
        { label: "1ª", vencimento: addInterval(primeira, 1, "mensal"), valor: "" },
      ]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forma, modo, qtd, intervalo, primeira, valorTotal, valorIgual]);

  const parcelas: Parcela[] = useMemo(
    () => linhas.map((l) => ({ label: l.label, vencimento: l.vencimento, valor: Number(l.valor) || 0 })),
    [linhas],
  );

  const somaParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  const confere = Math.abs(somaParcelas - valorTotal) < 0.01;

  useEffect(() => {
    if (forma === "avista") onChange(null, "avista");
    else onChange(parcelas, modo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forma, modo, parcelas]);

  const setLinha = (i: number, patch: Partial<{ label: string; vencimento: string; valor: string }>) =>
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  return (
    <div className="col-span-2 space-y-3 rounded-lg border border-border p-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Forma de pagamento</Label>
          <Select value={forma} onValueChange={(v) => setForma(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="avista">À vista</SelectItem>
              <SelectItem value="parcelado">Parcelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {forma === "parcelado" && (
          <div>
            <Label>Modalidade</Label>
            <Select value={modo} onValueChange={(v) => { setModo(v as ModoParcelamento); setLinhas([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODOS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {forma === "parcelado" && (
        <>
          <p className="text-xs text-muted-foreground">{MODOS.find((m) => m.value === modo)?.desc}</p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {modo !== "personalizado" && (
              <div>
                <Label className="text-xs">Qtd. de parcelas</Label>
                <Input type="number" min={1} step={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
              </div>
            )}
            {modo !== "personalizado" && (
              <div>
                <Label className="text-xs">1ª parcela</Label>
                <Input type="date" value={primeira} onChange={(e) => setPrimeira(e.target.value)} />
              </div>
            )}
            {(modo === "fixo" || modo === "valores") && (
              <div>
                <Label className="text-xs">Intervalo</Label>
                <Select value={intervalo} onValueChange={setIntervalo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {modo === "datas" && (
              <div>
                <Label className="text-xs">Valor de cada parcela</Label>
                <Input type="number" step="0.01" value={valorIgual} onChange={(e) => setValorIgual(e.target.value)} />
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-24">Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  {modo === "personalizado" && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {modo === "personalizado"
                        ? <Input className="h-8 w-20" value={l.label} onChange={(e) => setLinha(i, { label: e.target.value })} />
                        : l.label}
                    </TableCell>
                    <TableCell>
                      {modo === "fixo" || modo === "valores"
                        ? formatDate(l.vencimento)
                        : <Input type="date" className="h-8" value={l.vencimento} onChange={(e) => setLinha(i, { vencimento: e.target.value })} />}
                    </TableCell>
                    <TableCell className="text-right">
                      {modo === "fixo"
                        ? formatBRL(Number(l.valor) || 0)
                        : <Input type="number" step="0.01" className="h-8 text-right" value={l.valor} onChange={(e) => setLinha(i, { valor: e.target.value })} />}
                    </TableCell>
                    {modo === "personalizado" && (
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                          onClick={() => setLinhas((prev) => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                <TableRow className="bg-muted/20 font-semibold hover:bg-muted/20">
                  <TableCell colSpan={2}>Soma das parcelas</TableCell>
                  <TableCell className="text-right">{formatBRL(somaParcelas)}</TableCell>
                  {modo === "personalizado" && <TableCell />}
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {modo === "personalizado" && (
            <Button type="button" variant="outline" size="sm"
              onClick={() => setLinhas((prev) => [...prev, {
                label: `${prev.filter((p) => p.label !== "Sinal").length + 1}ª`,
                vencimento: addInterval(primeira, prev.length, "mensal"),
                valor: "",
              }])}>
              <Plus className="mr-1 h-4 w-4" />Adicionar parcela
            </Button>
          )}

          {!confere && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-500">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Os valores das parcelas não correspondem ao valor total ({formatBRL(valorTotal)}). Diferença: {formatBRL(valorTotal - somaParcelas)}.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
