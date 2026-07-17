export const formatBRL = (v: number | null | undefined): string => {
  const n = typeof v === "number" && !Number.isNaN(v) ? v : 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
};

export const parseNum = (v: string): number => {
  if (!v) return 0;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
};
