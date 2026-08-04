import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][],
  subtitle?: string,
) {
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(subtitle ?? `Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 22);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c ?? ""))),
    startY: 27,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [23, 37, 84] },
  });
  doc.save(`${filename}.pdf`);
}