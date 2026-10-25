export type Column<T> = {
  key: keyof T | string;
  label: string;
  format?: (row: T) => string | number;
  align?: "left" | "right" | "center";
};

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV<T extends Record<string, unknown>>(filename: string, rows: T[], columns: Column<T>[]) {
  const header = columns.map((c) => csvEscape(c.label)).join(";");
  const body = rows
    .map((r) =>
      columns
        .map((c) => csvEscape(c.format ? c.format(r) : r[c.key]))
        .join(";")
    )
    .join("\n");
  const csv = "\uFEFF" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
