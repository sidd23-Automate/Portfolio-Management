export const categories = [
  "Bank",
  "Cash",
  "FD",
  "Shares",
  "Mutual Fund",
  "Gold",
  "NPS",
  "PPF",
  "Others",
];
export const liquidities = [
  "Liquid",
  "Redeemable with conditions",
  "Locked-in",
  "Other / Unclassified",
];
export const exposures = [
  "Cash / Deposit",
  "Equity",
  "Debt",
  "Gold",
  "Mixed",
  "Other / Unclassified",
];
export type Holding = {
  id: string;
  category: string;
  institution: string;
  name: string;
  owner: string;
  reference: string;
  value: number;
  date: string;
  edited: string;
  liquidity: string;
  exposure: string;
  method: "manual" | "units";
  manualValue?: number;
  quantity?: number;
  price?: number;
  equity?: number;
  custodian?: string;
  maturity?: string;
  premature?: boolean;
  lock?: string;
  notes: string;
};
export type Snapshot = {
  id: string;
  date: string;
  created: string;
  note: string;
  holdings: Holding[];
};
export type Data = {
  version: 1;
  holdings: Holding[];
  snapshots: Snapshot[];
  categories: string[];
  compact: boolean;
};
export const empty = (): Data => ({
  version: 1,
  holdings: [],
  snapshots: [],
  categories: [...categories],
  compact: false,
});
export const today = () => new Date().toISOString().slice(0, 10);
export const money = (n: number, compact = false) =>
  compact
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n)
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n);
export const sum = (hs: Holding[]) =>
  hs.reduce((s, h) => s + Math.round(h.value * 100), 0) / 100;
export const norm = (s: string) =>
  s.trim().toLocaleLowerCase().replace(/\s+/g, " ");
export const key = (h: Holding) =>
  [h.category, h.institution, h.name, h.owner, h.reference].map(norm).join("|");
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export const percent = (a: number, b: number) =>
  b ? `${((a / b) * 100).toFixed(2)}%` : "N/A";
export const ratio = (a: number, b: number) =>
  b ? `${(a / b).toFixed(2)} : 1` : "N/A";
export function groups(
  hs: Holding[],
  field: "category" | "institution" | "liquidity",
) {
  const m = new Map<string, { name: string; value: number }>();
  hs.forEach((h) => {
    const name = h[field] || "Unspecified";
    const k = field === "institution" ? norm(name) : name;
    const x = m.get(k) || { name, value: 0 };
    x.value += Math.round(h.value * 100);
    m.set(k, x);
  });
  return [...m.values()]
    .map((x) => ({ ...x, value: x.value / 100 }))
    .sort((a, b) => b.value - a.value);
}
export function metrics(hs: Holding[]) {
  const total = sum(hs),
    cat = (c: string) => sum(hs.filter((h) => h.category === c)),
    top = [...hs].sort((a, b) => b.value - a.value);
  const equity = sum(
    hs.map((h) => ({
      ...h,
      value:
        h.exposure === "Equity"
          ? h.value
          : h.exposure === "Mixed" && h.equity !== undefined
            ? (h.value * h.equity) / 100
            : 0,
    })),
  );
  return [
    [
      "Direct Shares to Bank Ratio",
      ratio(cat("Shares"), cat("Bank")),
      "Shares ÷ Bank",
    ],
    [
      "Direct Shares to Cash and Bank Ratio",
      ratio(cat("Shares"), cat("Bank") + cat("Cash")),
      "Shares ÷ (Cash + Bank)",
    ],
    [
      "Cash and Bank Allocation",
      percent(cat("Cash") + cat("Bank"), total),
      "(Cash + Bank) ÷ Total × 100",
    ],
    [
      "Liquid Holdings Allocation",
      percent(sum(hs.filter((h) => h.liquidity === "Liquid")), total),
      "Liquid holdings ÷ Total × 100",
    ],
    ...["FD", "Gold"].map((c) => [
      `${c} Allocation`,
      percent(cat(c), total),
      `${c} ÷ Total × 100`,
    ]),
    [
      "Retirement Account Allocation",
      percent(cat("NPS") + cat("PPF"), total),
      "(NPS + PPF) ÷ Total × 100",
    ],
    [
      "Locked-in Allocation",
      percent(sum(hs.filter((h) => h.liquidity === "Locked-in")), total),
      "Locked-in holdings ÷ Total × 100",
    ],
    [
      "Largest Holding Concentration",
      percent(top[0]?.value || 0, total),
      "Largest holding ÷ Total × 100",
    ],
    [
      "Top Five Holdings Concentration",
      percent(sum(top.slice(0, 5)), total),
      "Top five holdings ÷ Total × 100",
    ],
    [
      "Largest Institution Concentration",
      percent(groups(hs, "institution")[0]?.value || 0, total),
      "Normalised institution total ÷ Total; recorded holdings grouping, not underlying issuer risk",
    ],
    [
      "Estimated Equity Exposure",
      percent(equity, total),
      "Direct equity plus explicitly entered mixed equity percentages",
    ],
    [
      "Unknown Exposure",
      percent(
        sum(
          hs.filter(
            (h) =>
              h.exposure === "Other / Unclassified" ||
              (h.exposure === "Mixed" && h.equity === undefined),
          ),
        ),
        total,
      ),
      "Unclassified holdings and mixed holdings without equity percentages",
    ],
  ];
}
export const ordered = (ss: Snapshot[]) =>
  [...ss].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.created.localeCompare(b.created) ||
      a.id.localeCompare(b.id),
  );
export function compare(a: Holding[], b: Holding[]) {
  return [...new Set([...a, ...b].map((h) => h.id))].map((id) => {
    const before = a.find((h) => h.id === id),
      after = b.find((h) => h.id === id);
    return {
      id,
      before,
      after,
      status: !before
        ? "Added"
        : !after
          ? "Removed"
          : before.name !== after.name
            ? "Renamed"
            : JSON.stringify(before) === JSON.stringify(after)
              ? "Unchanged"
              : "Updated",
      change: (after?.value || 0) - (before?.value || 0),
    };
  });
}
export function validateHolding(h: Holding) {
  if (!h.id || !h.category || !h.name || !h.institution)
    throw Error("ID, category, institution and holding name are required");
  if (!Number.isFinite(h.value) || h.value < 0)
    throw Error("Value must be a non-negative number");
  if (!validDate(h.date)) throw Error("Use a valid YYYY-MM-DD valuation date");
  if (!liquidities.includes(h.liquidity) || !exposures.includes(h.exposure))
    throw Error("Unknown classification");
  if (!["manual", "units"].includes(h.method))
    throw Error("Unknown valuation method");
  if (
    h.method === "units" &&
    (!Number.isFinite(h.quantity) ||
      !Number.isFinite(h.price) ||
      h.quantity! < 0 ||
      h.price! < 0 ||
      Math.round(h.quantity! * h.price! * 100) !== Math.round(h.value * 100))
  )
    throw Error("Invalid quantity valuation");
  if (
    h.equity !== undefined &&
    (!Number.isFinite(h.equity) || h.equity < 0 || h.equity > 100)
  )
    throw Error("Equity percentage must be 0–100");
  if (h.maturity && !validDate(h.maturity))
    throw Error("Invalid maturity date");
  for (const f of [
    "id",
    "category",
    "institution",
    "name",
    "owner",
    "reference",
    "date",
    "edited",
    "liquidity",
    "exposure",
    "notes",
  ] as const)
    if (typeof h[f] !== "string") throw Error(`Invalid ${f}`);
}
export function validateData(d: unknown): Data {
  const x = d as Data;
  if (
    !x ||
    x.version !== 1 ||
    !Array.isArray(x.holdings) ||
    !Array.isArray(x.snapshots) ||
    !Array.isArray(x.categories) ||
    typeof x.compact !== "boolean" ||
    x.categories.some((c) => typeof c !== "string" || !c.trim()) ||
    new Set(x.categories).size !== x.categories.length
  )
    throw Error("Unsupported or invalid backup schema");
  const check = (hs: Holding[]) => {
    hs.forEach(validateHolding);
    if (new Set(hs.map((h) => h.id)).size !== hs.length)
      throw Error("Duplicate holding IDs");
  };
  check(x.holdings);
  if (x.holdings.some((h) => !x.categories.includes(h.category)))
    throw Error("Missing category");
  if (new Set(x.snapshots.map((s) => s.id)).size !== x.snapshots.length)
    throw Error("Duplicate snapshot IDs");
  x.snapshots.forEach((s) => {
    if (
      !s.id ||
      !validDate(s.date) ||
      typeof s.note !== "string" ||
      !Number.isFinite(Date.parse(s.created)) ||
      !Array.isArray(s.holdings)
    )
      throw Error("Invalid snapshot");
    check(s.holdings);
  });
  return x;
}
export function demo(): Data {
  const d = empty();
  d.holdings = categories.slice(0, 8).map((c, i) => ({
    id: `demo-${i}`,
    category: c,
    institution: [
      "HDFC Bank",
      "Cash at home",
      "HDFC Bank",
      "Example company",
      "Example AMC",
      "Physical gold",
      "NPS account",
      "Post office",
    ][i],
    name: `${c} holding`,
    owner: "",
    reference: "",
    value: [200000, 20000, 300000, 400000, 500000, 100000, 150000, 250000][i],
    date: today(),
    edited: new Date().toISOString(),
    liquidity:
      i < 2 ? "Liquid" : i > 5 ? "Locked-in" : "Redeemable with conditions",
    exposure:
      i < 3
        ? "Cash / Deposit"
        : i === 3
          ? "Equity"
          : i === 5
            ? "Gold"
            : i === 7
              ? "Debt"
              : "Other / Unclassified",
    method: "manual",
    notes: "Illustrative demo data",
  }));
  return d;
}
