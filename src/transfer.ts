import Papa from "papaparse";
import {
  key,
  sum,
  validDate,
  validateHolding,
  liquidities,
  exposures,
  today,
  type Holding,
  type Data,
} from "./model";
export const columns = [
  "Holding ID",
  "Category",
  "Institution",
  "Holding Name",
  "Owner",
  "Account Reference",
  "Value INR",
  "Valuation Date",
  "Liquidity Class",
  "Exposure Class",
  "Quantity",
  "Unit Price",
  "Maturity Date",
  "Notes",
  "Custodian / Platform",
  "Equity Allocation %",
  "Premature Withdrawal",
  "Lock-in Details",
];
export type Sheet = { name: string; rows: string[][] };
export async function readFile(file: File): Promise<Sheet[]> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    const r = Papa.parse<string[]>(await file.text(), {
      skipEmptyLines: "greedy",
    });
    if (r.errors.length) throw Error(r.errors.map((e) => e.message).join("; "));
    return [{ name: "CSV", rows: r.data }];
  }
  if (!file.name.toLowerCase().endsWith(".xlsx"))
    throw Error("Choose .xlsx or .csv");
  const { default: ExcelJS } = await import("exceljs");
  const w = new ExcelJS.Workbook();
  await w.xlsx.load(await file.arrayBuffer());
  return w.worksheets.map((s) => {
    const rows: string[][] = [];
    s.eachRow((r) => {
      const out: string[] = [];
      for (let i = 1; i <= s.columnCount; i++) {
        const v = r.getCell(i).value;
        out.push(
          v instanceof Date
            ? v.toISOString().slice(0, 10)
            : v && typeof v === "object"
              ? "richText" in v
                ? v.richText.map((x) => x.text).join("")
                : "formula" in v
                  ? "[Formula not accepted]"
                  : String(r.getCell(i).text)
              : String(v ?? ""),
        );
      }
      rows.push(out);
    });
    return { name: s.name, rows };
  });
}
export const detect = (heads: string[]) =>
  columns.map((c) =>
    heads.findIndex((h) => h.trim().toLowerCase() === c.toLowerCase()),
  );
export const amount = (s: string) => {
  if (!s.trim()) throw Error("Blank value is not zero");
  const cleaned = s.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) throw Error("Invalid or negative amount");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw Error("Invalid amount");
  return n;
};
function date(s: string) {
  if (!s) return today();
  if (validDate(s)) return s;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n > 1 && n < 100000)
      return new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000)
        .toISOString()
        .slice(0, 10);
  }
  throw Error("Date must be YYYY-MM-DD or an Excel date");
}
export type Row = {
  line: number;
  holding?: Holding;
  status: "New" | "Updated" | "Unchanged" | "Ambiguous" | "Invalid";
  error?: string;
  matches?: Holding[];
};
export function preview(
  rows: string[][],
  mapping: number[],
  current: Holding[],
  cats: string[],
): Row[] {
  const ids = new Set<string>(),
    keys = new Set<string>();
  return rows
    .slice(1)
    .filter((r) => r.some((c) => c.trim()))
    .map((r, index) => {
      const get = (i: number) =>
        mapping[i] >= 0 ? (r[mapping[i]] || "").trim() : "";
      try {
        const id = get(0),
          category = get(1),
          q = get(10),
          p = get(11),
          v = get(6);
        if (id && ids.has(id)) throw Error("Duplicate Holding ID in file");
        if (id) ids.add(id);
        if (!cats.includes(category))
          throw Error("Unknown category: add it in Settings first");
        if (!v && (!q || !p))
          throw Error("Blank value: enter a value or quantity and unit price");
        if (!!q !== !!p)
          throw Error("Quantity and unit price must both be provided");
        const units = !!q && !!p;
        const value = v
          ? Math.round(amount(v) * 100) / 100
          : Math.round(amount(q) * amount(p) * 100) / 100;
        if (
          units &&
          v &&
          Math.round(amount(q) * amount(p) * 100) !== Math.round(value * 100)
        )
          throw Error("Manual value conflicts with quantity × unit price");
        const h: Holding = {
          id: id || crypto.randomUUID(),
          category,
          institution: get(2),
          name: get(3),
          owner: get(4),
          reference: get(5),
          value,
          date: date(get(7)),
          edited: new Date().toISOString(),
          liquidity:
            get(8) ||
            (category === "Bank" || category === "Cash"
              ? "Liquid"
              : liquidities[3]),
          exposure: get(9) || exposures[5],
          method: units ? "units" : "manual",
          quantity: units ? amount(q) : undefined,
          price: units ? amount(p) : undefined,
          maturity: get(12) ? date(get(12)) : undefined,
          notes: get(13),
          custodian: get(14) || undefined,
          equity: get(15) ? amount(get(15)) : undefined,
          premature: get(16) ? get(16).toLowerCase() === "true" : undefined,
          lock: get(17) || undefined,
        };
        if (get(16) && !["true", "false"].includes(get(16).toLowerCase()))
          throw Error("Premature Withdrawal must be true or false");
        validateHolding(h);
        const k = key(h);
        if (!id && keys.has(k))
          throw Error("Duplicate unidentified holding in file");
        keys.add(k);
        const matches = id
          ? current.filter((c) => c.id === id)
          : current.filter((c) => key(c) === k);
        if (matches.length > 1)
          return { line: index + 2, holding: h, status: "Ambiguous", matches };
        if (matches.length === 1) {
          h.id = matches[0].id;
          const old = matches[0];
          const unchanged = columns.every(
            (_, i) =>
              i === 0 ||
              JSON.stringify(exportRow(old)[i]) ===
                JSON.stringify(exportRow(h)[i]),
          );
          return {
            line: index + 2,
            holding: unchanged ? old : { ...old, ...h },
            status: unchanged ? "Unchanged" : "Updated",
          };
        }
        return { line: index + 2, holding: h, status: "New" };
      } catch (e) {
        return {
          line: index + 2,
          status: "Invalid",
          error: (e as Error).message,
        };
      }
    });
}
export function applyImport(
  current: Holding[],
  rows: Row[],
  mode: string,
  scope: string,
) {
  if (
    rows.some(
      (r) => r.status === "Invalid" || r.status === "Ambiguous" || !r.holding,
    )
  )
    throw Error("Resolve every row before importing");
  const selected = rows.map((r) => r.holding!);
  if (new Set(selected.map((h) => h.id)).size !== selected.length)
    throw Error("Multiple rows resolve to the same Holding ID");
  if (
    mode === "replace" &&
    scope !== "All" &&
    selected.some((h) => h.category !== scope)
  )
    throw Error("File contains holdings outside the selected category");
  let result =
    mode === "replace"
      ? current.filter((h) => scope !== "All" && h.category !== scope)
      : [...current];
  for (const h of selected) {
    const i = result.findIndex((x) => x.id === h.id);
    if (i < 0) {
      if (
        mode === "replace" &&
        current.some(
          (x) => x.id === h.id && scope !== "All" && x.category !== scope,
        )
      )
        throw Error("Holding ID belongs to another scope");
      result.push(h);
    } else if (mode !== "add") result[i] = h;
  }
  return result;
}
export const safe = (s: string) => (/^[\s]*[=+\-@\t\r]/.test(s) ? `'${s}` : s);
export function exportRow(h: Holding) {
  return [
    h.id,
    h.category,
    h.institution,
    h.name,
    h.owner,
    h.reference,
    h.value,
    h.date,
    h.liquidity,
    h.exposure,
    h.method === "units" ? (h.quantity ?? "") : "",
    h.method === "units" ? (h.price ?? "") : "",
    h.maturity ?? "",
    h.notes,
    h.custodian ?? "",
    h.equity ?? "",
    h.premature === undefined ? "" : String(h.premature),
    h.lock ?? "",
  ].map((v) => (typeof v === "string" ? safe(v) : v));
}
export function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export async function workbook(data?: Data) {
  const { default: ExcelJS } = await import("exceljs");
  const w = new ExcelJS.Workbook(),
    s = w.addWorksheet("Holdings");
  s.addRow(columns);
  if (data) data.holdings.forEach((h) => s.addRow(exportRow(h)));
  else
    s.addRow([
      "",
      "Bank",
      "Example Bank",
      "Savings account",
      "",
      "",
      200000,
      today(),
      "Liquid",
      "Cash / Deposit",
      "",
      "",
      "",
      "Illustrative example; remove before import",
    ]);
  s.getRow(1).font = { bold: true };
  s.columns.forEach((c) => (c.width = 23));
  s.views = [{ state: "frozen", ySplit: 1 }];
  const instructions = w.addWorksheet("Read me");
  [
    "Required: Category, Institution, Holding Name, and Value INR (or Quantity + Unit Price).",
    "Use stable Holding IDs to rename or update records. Blank IDs use the five-field matching key.",
    "Dates: YYYY-MM-DD or Excel date values. Blank valuation dates use import date.",
    "Liquidity: " + liquidities.join(" | "),
    "Exposure: " + exposures.join(" | "),
    "Unknown categories must be added in Settings. Negative values and blank amounts are rejected.",
    "Manual value and quantity × price must agree when both are supplied.",
    "Optional fields may be blank. Imports do not monitor files on your computer.",
  ].forEach((t) => instructions.addRow([t]));
  instructions.getColumn(1).width = 120;
  if (data) {
    const hist = w.addWorksheet("Saved balances");
    hist.addRow([
      "Snapshot ID",
      "Date",
      "Created",
      "Note",
      "Total INR",
      ...data.categories,
    ]);
    data.snapshots.forEach((s) =>
      hist.addRow([
        s.id,
        s.date,
        s.created,
        safe(s.note),
        sum(s.holdings),
        ...data.categories.map((c) =>
          sum(s.holdings.filter((h) => h.category === c)),
        ),
      ]),
    );
    data.snapshots.forEach((snapshot, i) => {
      const sheet = w.addWorksheet(`Snapshot ${i + 1}`);
      sheet.addRow(columns);
      snapshot.holdings.forEach((h) => sheet.addRow(exportRow(h)));
    });
  }
  return new Blob([await w.xlsx.writeBuffer()], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
