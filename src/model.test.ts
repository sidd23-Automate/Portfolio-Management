import { describe, it, expect } from "vitest";
import {
  demo,
  sum,
  metrics,
  compare,
  validateData,
  groups,
  ordered,
  empty,
  validDate,
  percent,
  ratio,
} from "./model";
import {
  preview,
  detect,
  columns,
  applyImport,
  exportRow,
  workbook,
  amount,
  safe,
} from "./transfer";
import ExcelJS from "exceljs";
const d = demo(),
  h = d.holdings[0];
const file = (records: unknown[][]) => [
  columns,
  ...records.map((r) => r.map(String)),
];
describe("portfolio calculations and history", () => {
  it("matches the specified demo calculations", () => {
    expect(sum(d.holdings)).toBe(1920000);
    expect(
      metrics(d.holdings).find(
        (m) => m[0] === "Direct Shares to Bank Ratio",
      )?.[1],
    ).toBe("2.00 : 1");
    expect(
      metrics(d.holdings).find((m) => m[0] === "Cash and Bank Allocation")?.[1],
    ).toBe("11.46%");
  });
  it("groups institutions across categories with normalised names", () =>
    expect(
      groups(
        [
          ...d.holdings,
          { ...h, id: "other", institution: " hdfc  bank ", value: 100 },
        ],
        "institution",
      ).find((g) => g.name === "HDFC Bank")?.value,
    ).toBe(500100));
  it("keeps multiple accounts distinct", () =>
    expect(
      validateData({
        ...d,
        holdings: [h, { ...h, id: "second", name: "Another account" }],
      }).holdings,
    ).toHaveLength(2));
  it("snapshot clones survive editing and deleting current data", () => {
    const snapshot = structuredClone(d.holdings);
    const working = structuredClone(d.holdings);
    working[0].value = 1;
    working.splice(1, 1);
    expect(snapshot[0].value).toBe(200000);
    expect(snapshot).toHaveLength(8);
  });
  it("identifies added removed and renamed IDs", () => {
    const c = compare(
      [h, d.holdings[1]],
      [
        { ...h, name: "Renamed" },
        { ...h, id: "new" },
      ],
    );
    expect(c.map((r) => r.status)).toEqual(["Renamed", "Removed", "Added"]);
  });
  it("orders backdated and same-day snapshots deterministically", () => {
    const s = (id: string, date: string, created: string) => ({
      id,
      date,
      created,
      note: "",
      holdings: [],
    });
    expect(
      ordered([
        s("2", "2025-02-01", "2025-03-01"),
        s("1", "2025-01-01", "2025-04-01"),
        s("3", "2025-02-01", "2025-02-01"),
      ]).map((s) => s.id),
    ).toEqual(["1", "3", "2"]);
  });
  it("returns N/A for zero denominators", () => {
    expect(percent(1, 0)).toBe("N/A");
    expect(ratio(1, 0)).toBe("N/A");
    expect(metrics([]).every((m) => m[1] === "N/A")).toBe(true);
  });
  it("uses the same selected holdings for metrics and totals", () => {
    const bank = d.holdings.filter((h) => h.category === "Bank");
    expect(sum(bank)).toBe(200000);
    expect(
      metrics(bank).find((m) => m[0] === "Cash and Bank Allocation")?.[1],
    ).toBe("100.00%");
  });
  it("validates dates including leap days", () => {
    expect(validDate("2025-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
  });
  it("backup roundtrip preserves IDs settings and snapshots", () => {
    const x = {
      ...d,
      compact: true,
      snapshots: [
        {
          id: "s",
          date: "2025-01-01",
          created: new Date().toISOString(),
          note: "test",
          holdings: structuredClone(d.holdings),
        },
      ],
    };
    expect(validateData(JSON.parse(JSON.stringify(x)))).toEqual(x);
  });
  it("rejects unsupported backups and duplicate IDs", () => {
    expect(() => validateData({ ...d, version: 99 })).toThrow();
    expect(() => validateData({ ...d, holdings: [h, h] })).toThrow();
  });
});
describe("import and export", () => {
  it("reimporting exported rows is idempotent", () => {
    const rows = preview(
      file(d.holdings.map(exportRow)),
      detect(columns),
      d.holdings,
      d.categories,
    );
    expect(rows.every((r) => r.status === "Unchanged")).toBe(true);
    expect(applyImport(d.holdings, rows, "update", "All")).toHaveLength(8);
  });
  it("updates names and balances by stable ID", () => {
    const rows = preview(
      file([exportRow({ ...h, name: "New name", value: 250000 })]),
      detect(columns),
      d.holdings,
      d.categories,
    );
    const result = applyImport(d.holdings, rows, "update", "All");
    expect(result[0].name).toBe("New name");
    expect(result[0].value).toBe(250000);
    expect(result).toHaveLength(8);
  });
  it("matches records without IDs using the full key", () => {
    const row = exportRow(h);
    row[0] = "";
    expect(
      preview(file([row]), detect(columns), [h], d.categories)[0].holding?.id,
    ).toBe(h.id);
  });
  it("requires ambiguous matches to be resolved", () => {
    const row = exportRow(h);
    row[0] = "";
    const rows = preview(
      file([row]),
      detect(columns),
      [h, { ...h, id: "second" }],
      d.categories,
    );
    expect(rows[0].status).toBe("Ambiguous");
    expect(() => applyImport([h], rows, "update", "All")).toThrow();
  });
  it("rejects blank values, invalid dates, negative amounts and duplicate IDs", () => {
    for (const [index, value] of [
      [6, ""],
      [6, "-1"],
      [7, "2025-02-31"],
    ] as const) {
      const r = exportRow(h);
      r[index] = value;
      expect(
        preview(file([r]), detect(columns), [], d.categories)[0].status,
      ).toBe("Invalid");
    }
    expect(
      preview(
        file([exportRow(h), exportRow(h)]),
        detect(columns),
        [],
        d.categories,
      )[1].status,
    ).toBe("Invalid");
  });
  it("parses Indian numbers and currency symbols", () =>
    expect(amount("₹ 1,25,000.50")).toBe(125000.5));
  it("rejects conflicting manual and unit valuations", () => {
    const r = exportRow(h);
    r[10] = 2;
    r[11] = 10;
    expect(
      preview(file([r]), detect(columns), [], d.categories)[0].status,
    ).toBe("Invalid");
  });
  it("add-only leaves existing records untouched", () => {
    const rows = preview(
      file([exportRow({ ...h, value: 1 })]),
      detect(columns),
      [h],
      d.categories,
    );
    expect(applyImport([h], rows, "add", "All")[0].value).toBe(h.value);
  });
  it("normal updates preserve missing records", () => {
    const rows = preview(
      file([exportRow(h)]),
      detect(columns),
      d.holdings,
      d.categories,
    );
    expect(applyImport(d.holdings, rows, "update", "All")).toHaveLength(8);
  });
  it("scoped replacement preserves other categories", () => {
    const rows = preview(
      file([exportRow({ ...h, id: "new" })]),
      detect(columns),
      d.holdings,
      d.categories,
    );
    const result = applyImport(d.holdings, rows, "replace", "Bank");
    expect(result.find((x) => x.id === h.id)).toBeUndefined();
    expect(result.filter((x) => x.category !== "Bank")).toEqual(
      d.holdings.filter((x) => x.category !== "Bank"),
    );
    expect(() => applyImport(d.holdings, rows, "replace", "Cash")).toThrow();
  });
  it("prevents spreadsheet formula injection", () => {
    expect(safe('=HYPERLINK("x")')).toBe('\'=HYPERLINK("x")');
    expect(exportRow({ ...h, name: "@SUM(1)" })[3]).toBe("'@SUM(1)");
  });
  it("writes a real Excel template and exports complete snapshot worksheets", async () => {
    const blob = await workbook({
      ...d,
      snapshots: [
        {
          id: "s",
          date: "2025-01-01",
          created: new Date().toISOString(),
          note: "snapshot",
          holdings: d.holdings,
        },
      ],
    });
    const w = new ExcelJS.Workbook();
    await w.xlsx.load(await blob.arrayBuffer());
    expect(w.getWorksheet("Holdings")?.rowCount).toBe(9);
    expect(w.getWorksheet("Snapshot 1")?.rowCount).toBe(9);
    expect(w.getWorksheet("Saved balances")?.getRow(2).getCell(5).value).toBe(
      1920000,
    );
  });
});
