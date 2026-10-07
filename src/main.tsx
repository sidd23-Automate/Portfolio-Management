import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  empty,
  norm,
  demo,
  today,
  money,
  sum,
  groups,
  metrics,
  percent,
  ordered,
  compare,
  validateHolding,
  validateData,
  liquidities,
  exposures,
  type Data,
  type Holding,
} from "./model";
import { load, save } from "./storage";
import {
  readFile,
  detect,
  preview,
  applyImport,
  download,
  workbook,
  columns,
  type Sheet,
  type Row,
} from "./transfer";
import "./style.css";
const colours = [
  "#35796e",
  "#a0b9ac",
  "#d5a34c",
  "#6d7ea8",
  "#9477a8",
  "#dfbd66",
  "#718c66",
  "#bd8271",
  "#879390",
];
function App() {
  const [data, setData] = useState<Data>(empty()),
    [ready, setReady] = useState(false),
    [view, setView] = useState("Overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [saved, setSaved] = useState("Loading…"),
    [category, setCategory] = useState("All"),
    [owner, setOwner] = useState("All"),
    [institution, setInstitution] = useState("All"),
    [liquidity, setLiquidity] = useState("All"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("value"),
    [editing, setEditing] = useState<Holding | null>(null),
    [snapshot, setSnapshot] = useState(false),
    [snapDate, setSnapDate] = useState(today()),
    [snapNote, setSnapNote] = useState(""),
    [a, setA] = useState(""),
    [b, setB] = useState("");
  useEffect(() => {
    load()
      .then((d) => {
        setData(d);
        setReady(true);
        setSaved("Saved on this browser");
      })
      .catch((e) => setError("Storage unavailable: " + e.message));
  }, []);
  useEffect(() => {
    if (!editing && !snapshot) return;
    const previous = document.activeElement as HTMLElement;
    const modal = document.querySelector(".modal");
    const nodes = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button,input,select,textarea,[tabindex]",
        ) || [],
      ).filter((x) => !x.hasAttribute("disabled"));
    nodes()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(null);
        setSnapshot(false);
      }
      if (e.key === "Tab") {
        const list = nodes(),
          first = list[0],
          last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [!!editing, snapshot]);
  async function commit(d: Data) {
    try {
      setSaved("Saving…");
      await save(d);
      setData(d);
      setSaved("Saved on this browser");
      setError("");
    } catch (e) {
      setError(
        "Could not save. Export a backup before closing. " +
          (e as Error).message,
      );
      setSaved("Not saved");
      throw e;
    }
  }
  const select = (hs: Holding[]) =>
    hs.filter(
      (h) =>
        (category === "All" || h.category === category) &&
        (owner === "All" || h.owner === owner) &&
        (institution === "All" || h.institution === institution) &&
        (liquidity === "All" || h.liquidity === liquidity) &&
        (!query ||
          [h.name, h.institution, h.category, h.owner, h.reference]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
  const hs = select(data.holdings),
    total = sum(hs),
    ss = ordered(data.snapshots),
    latest = ss.at(-1),
    previous = latest ? sum(select(latest.holdings)) : 0,
    dirty =
      !latest ||
      JSON.stringify(data.holdings) !== JSON.stringify(latest.holdings),
    cats = groups(hs, "category"),
    filterLabel =
      category !== "All" ||
      owner !== "All" ||
      institution !== "All" ||
      liquidity !== "All" ||
      query
        ? "Filtered portfolio"
        : "Entire portfolio";
  const A = ss.find((s) => s.id === a) || ss.at(-2),
    B = ss.find((s) => s.id === b) || latest;
  const newHolding = (c = category === "All" ? "Bank" : category): Holding => ({
    id: crypto.randomUUID(),
    category: c,
    institution: "",
    name: "",
    owner: "",
    reference: "",
    value: 0,
    date: today(),
    edited: new Date().toISOString(),
    liquidity: ["Bank", "Cash"].includes(c) ? "Liquid" : liquidities[3],
    exposure: ["Bank", "Cash", "FD"].includes(c)
      ? "Cash / Deposit"
      : c === "Shares"
        ? "Equity"
        : c === "Gold"
          ? "Gold"
          : exposures[5],
    method: "manual",
    notes: "",
  });
  const fmt = (n: number) => money(n, data.compact);
  function filterCard(c: string) {
    setCategory(c);
    setView("Holdings");
  }
  const chart = (children: React.ReactElement) => (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
  if (!ready)
    return (
      <main>
        <h1>Holdings</h1>
        <p>{error || "Loading your private portfolio…"}</p>
      </main>
    );
  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("Overview");
          }}
        >
          <span className="brandmark">◒</span> holdings
          <span className="brand-sub">PERSONAL PORTFOLIO</span>
        </a>
        <nav>
          {[
            "Overview",
            "Holdings",
            "History",
            "Import / Export",
            "Settings",
          ].map((v, i) => (
            <button
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
              key={v}
            >
              <span aria-hidden="true">{["◫", "▤", "◷", "⇄", "⚙"][i]}</span>
              {v}
            </button>
          ))}
        </nav>
        <div className="aside-note">
          <span className="dot" /> Browser-only storage
          <p>Your balances stay on this device. Export regular backups.</p>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <span className="eyebrow">YOUR FINANCIAL PICTURE, AT A GLANCE</span>
          <span className="status">{saved}</span>
        </header>
        <main>
          <div className="page-head">
            <div>
              <h1>{view}</h1>
              <p>
                {view === "Overview"
                  ? "A clear view of what you hold, and where."
                  : "Manage your holding balances with confidence."}
              </p>
            </div>
            <div className="actions">
              <button onClick={() => setEditing(newHolding())}>
                + Add Holding
              </button>
              <button
                className="primary"
                onClick={() => {
                  setSnapDate(today());
                  setSnapNote("");
                  setSnapshot(true);
                }}
              >
                Save Portfolio Snapshot
              </button>
            </div>
          </div>
          {error && (
            <div className="alert" role="alert">
              {error}
              <button onClick={() => setError("")}>Dismiss</button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice("")}>Dismiss</button>
            </div>
          )}
          {["Overview", "Holdings", "History"].includes(view) && (
            <div className="filters">
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>All</option>
                  {data.categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Owner
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  <option>All</option>
                  {[...new Set(data.holdings.map((h) => h.owner))].map((o) => (
                    <option key={o} value={o}>
                      {o || "Unspecified"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Institution
                <select
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                >
                  <option>All</option>
                  {[...new Set(data.holdings.map((h) => h.institution))].map(
                    (o) => (
                      <option key={o}>{o}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Liquidity
                <select
                  value={liquidity}
                  onChange={(e) => setLiquidity(e.target.value)}
                >
                  <option>All</option>
                  {liquidities.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label>
                Search
                <input
                  placeholder="Find a holding…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <button
                onClick={() => {
                  setCategory("All");
                  setOwner("All");
                  setInstitution("All");
                  setLiquidity("All");
                  setQuery("");
                }}
              >
                Clear
              </button>
            </div>
          )}
          {view === "Overview" && (
            <>
              <div className="section-label">
                {filterLabel} <span>{hs.length} holdings · INR</span>
              </div>
              <div className="stats">
                <div className="stat feature">
                  <span>Total holding value</span>
                  <strong>{fmt(total)}</strong>
                  <small>
                    {dirty
                      ? "● Working holdings differ from latest snapshot"
                      : "✓ Matches latest snapshot"}
                  </small>
                </div>
                <div className="stat">
                  <span>Previous saved value</span>
                  <strong>{latest ? fmt(previous) : "—"}</strong>
                  <small>
                    {latest
                      ? `Latest snapshot: ${latest.date}`
                      : "No saved snapshots yet"}
                  </small>
                </div>
                <div className="stat">
                  <span>Change in holding value</span>
                  <strong>{latest ? fmt(total - previous) : "—"}</strong>
                  <small>
                    {latest
                      ? percent(total - previous, previous)
                      : "Save a snapshot to compare"}{" "}
                    · contributions and valuations included
                  </small>
                </div>
                <div className="stat">
                  <span>Liquid holdings</span>
                  <strong>
                    {fmt(sum(hs.filter((h) => h.liquidity === "Liquid")))}
                  </strong>
                  <small>
                    {percent(
                      sum(hs.filter((h) => h.liquidity === "Liquid")),
                      total,
                    )}{" "}
                    of selected holdings
                  </small>
                </div>
              </div>
              <div className="section-label">
                BY ASSET CATEGORY{" "}
                <span>Select a category to explore its holdings</span>
              </div>
              <div className="category-grid">
                {data.categories.map((c, i) => {
                  const n = sum(hs.filter((h) => h.category === c)),
                    old = latest
                      ? sum(
                          select(latest.holdings).filter(
                            (h) => h.category === c,
                          ),
                        )
                      : 0;
                  return (
                    <button
                      className="category-card"
                      key={c}
                      onClick={() => filterCard(c)}
                      style={{ borderTopColor: colours[i % colours.length] }}
                    >
                      <span>
                        {c}
                        <small>{percent(n, total)}</small>
                      </span>
                      <strong>{fmt(n)}</strong>
                      <small>
                        {latest
                          ? `${fmt(n - old)} vs saved`
                          : "No comparison yet"}
                      </small>
                    </button>
                  );
                })}
              </div>
              <div className="chart-grid">
                <section className="panel">
                  <h2>Asset allocation</h2>
                  <p>{filterLabel}</p>
                  {total ? (
                    chart(
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={cats}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                          outerRadius={100}
                          onClick={(d) => filterCard(String(d.name))}
                        >
                          {cats.map((c) => (
                            <Cell
                              key={c.name}
                              fill={
                                colours[
                                  data.categories.indexOf(c.name) %
                                    colours.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Legend />
                      </PieChart>,
                    )
                  ) : (
                    <Empty />
                  )}
                </section>
                <section className="panel">
                  <h2>Category balances</h2>
                  <p>{filterLabel}</p>
                  {total ? (
                    chart(
                      <BarChart
                        layout="vertical"
                        data={cats}
                        margin={{ left: 20, right: 20 }}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={(v) => money(v, true)}
                        />
                        <YAxis type="category" dataKey="name" width={85} />
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Bar
                          isAnimationActive={false}
                          dataKey="value"
                          fill="#35796e"
                          onClick={(d) => filterCard(String(d.name))}
                        />
                      </BarChart>,
                    )
                  ) : (
                    <Empty />
                  )}
                </section>
                <section className="panel">
                  <h2>Liquidity composition</h2>
                  <p>{filterLabel}</p>
                  {total ? (
                    chart(
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={groups(hs, "liquidity")}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={65}
                        >
                          {groups(hs, "liquidity").map((x, i) => (
                            <Cell key={x.name} fill={colours[i]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Legend />
                      </PieChart>,
                    )
                  ) : (
                    <Empty />
                  )}
                </section>
                <section className="panel">
                  <h2>Largest holdings</h2>
                  <p>{filterLabel} · top five</p>
                  {total ? (
                    chart(
                      <BarChart
                        layout="vertical"
                        data={[...hs]
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 5)}
                      >
                        <XAxis
                          type="number"
                          tickFormatter={(v) => money(v, true)}
                        />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Bar
                          isAnimationActive={false}
                          dataKey="value"
                          fill="#d5a34c"
                        />
                      </BarChart>,
                    )
                  ) : (
                    <Empty />
                  )}
                </section>
              </div>
              <section className="panel">
                <h2>Allocation & concentration</h2>
                <p>
                  Hover or focus on a metric for its formula. N/A means the
                  denominator is zero.
                </p>
                <div className="metrics">
                  {metrics(hs).map(([name, value, formula]) => (
                    <div key={name} title={formula} tabIndex={0}>
                      <span>
                        {name}
                        <small>{formula}</small>
                      </span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {view === "Holdings" && (
            <>
              <div className="section-label">
                {filterLabel} · {fmt(total)}
                <label>
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="value">Value / allocation</option>
                    <option value="date">Valuation date</option>
                    <option value="name">Name</option>
                  </select>
                </label>
              </div>
              {!hs.length ? (
                <Empty />
              ) : (
                data.categories
                  .filter((c) => hs.some((h) => h.category === c))
                  .map((c) => (
                    <details className="panel category-section" open key={c}>
                      <summary>
                        {c}
                        <strong>
                          {fmt(sum(hs.filter((h) => h.category === c)))}
                        </strong>
                      </summary>
                      {groups(
                        hs.filter((h) => h.category === c),
                        "institution",
                      ).map((g) => (
                        <div key={g.name}>
                          <div className="institution">
                            <strong>{g.name}</strong>
                            <span>{fmt(g.value)}</span>
                          </div>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Holding</th>
                                  <th>Value / weight</th>
                                  <th>Valuation</th>
                                  <th>Classification</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {hs
                                  .filter(
                                    (h) =>
                                      h.category === c &&
                                      norm(h.institution) === norm(g.name),
                                  )
                                  .sort((a, b) =>
                                    sort === "date"
                                      ? a.date.localeCompare(b.date)
                                      : sort === "name"
                                        ? a.name.localeCompare(b.name)
                                        : b.value - a.value,
                                  )
                                  .map((h) => (
                                    <tr key={h.id}>
                                      <td>
                                        <strong>{h.name}</strong>
                                        <small>
                                          {h.owner || "No owner specified"}
                                          {h.reference
                                            ? " · " + h.reference
                                            : ""}
                                        </small>
                                        <small>
                                          {h.method === "units"
                                            ? `${h.quantity} × ${money(h.price || 0)}`
                                            : "Manual valuation"}
                                          {h.custodian
                                            ? " · " + h.custodian
                                            : ""}
                                        </small>
                                      </td>
                                      <td>
                                        <strong>{fmt(h.value)}</strong>
                                        <small>{percent(h.value, total)}</small>
                                      </td>
                                      <td>
                                        {h.date}
                                        <small>
                                          {Date.now() - Date.parse(h.date) >
                                          30 * 86400000
                                            ? "Stale: over 30 days old"
                                            : ""}
                                        </small>
                                        <small>
                                          Edited{" "}
                                          {new Date(
                                            h.edited,
                                          ).toLocaleDateString()}
                                        </small>
                                      </td>
                                      <td>
                                        {h.liquidity}
                                        <small>{h.exposure}</small>
                                      </td>
                                      <td>
                                        <div className="row-actions">
                                          <button
                                            onClick={() => setEditing({ ...h })}
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() =>
                                              setEditing({
                                                ...h,
                                                id: crypto.randomUUID(),
                                                name: h.name + " (copy)",
                                              })
                                            }
                                          >
                                            Duplicate
                                          </button>
                                          <button
                                            className="danger"
                                            onClick={() => {
                                              if (
                                                confirm(
                                                  `Delete ${h.name}? Earlier snapshots stay unchanged.`,
                                                )
                                              )
                                                void commit({
                                                  ...data,
                                                  holdings:
                                                    data.holdings.filter(
                                                      (x) => x.id !== h.id,
                                                    ),
                                                });
                                            }}
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          setEditing({
                            ...newHolding(c),
                            category: c,
                            liquidity:
                              c === "Bank" || c === "Cash"
                                ? "Liquid"
                                : liquidities[3],
                          })
                        }
                      >
                        + Add {c} holding
                      </button>
                    </details>
                  ))
              )}
              <section className="panel">
                <h2>Institution totals across categories</h2>
                {groups(hs, "institution").map((g) => (
                  <div className="institution" key={g.name}>
                    <span>{g.name}</span>
                    <strong>{fmt(g.value)}</strong>
                  </div>
                ))}
                <p>
                  Institutions are grouped by trimmed, case-insensitive names.
                  This is recorded holdings concentration, not underlying issuer
                  risk.
                </p>
              </section>
            </>
          )}
          {view === "History" && (
            <>
              <p className="notice">
                Snapshots preserve recorded valuations, which may have different
                valuation dates. Changes include contributions, withdrawals,
                transfers and valuation updates.
              </p>
              {!ss.length ? (
                <Empty text="Save your first portfolio snapshot to begin a balance history." />
              ) : (
                <>
                  <section className="panel">
                    <h2>Historical portfolio balance</h2>
                    <p>{filterLabel}</p>
                    {chart(
                      <LineChart
                        data={ss.map((s, i) => ({
                          name: `${s.date} #${i + 1}`,
                          value: sum(select(s.holdings)),
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => money(v, true)} />
                        <Tooltip formatter={(v) => fmt(Number(v))} />
                        <Line
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="value"
                          stroke="#35796e"
                          strokeWidth={3}
                        />
                      </LineChart>,
                    )}
                  </section>
                  <section className="panel">
                    <h2>Compare saved snapshots</h2>
                    <div className="filters">
                      <label>
                        From
                        <select
                          value={A?.id || ""}
                          onChange={(e) => setA(e.target.value)}
                        >
                          {ss.map((s, i) => (
                            <option value={s.id} key={s.id}>
                              {s.date} #{i + 1} · {s.note || "No note"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        To
                        <select
                          value={B?.id || ""}
                          onChange={(e) => setB(e.target.value)}
                        >
                          {ss.map((s, i) => (
                            <option value={s.id} key={s.id}>
                              {s.date} #{i + 1} · {s.note || "No note"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {A && B ? (
                      <>
                        <h3>
                          Change in holding value:{" "}
                          {fmt(
                            sum(select(B.holdings)) - sum(select(A.holdings)),
                          )}{" "}
                          ·{" "}
                          {percent(
                            sum(select(B.holdings)) - sum(select(A.holdings)),
                            sum(select(A.holdings)),
                          )}
                        </h3>
                        {chart(
                          <BarChart
                            data={[
                              ...new Set([
                                ...data.categories,
                                ...A.holdings.map((h) => h.category),
                                ...B.holdings.map((h) => h.category),
                              ]),
                            ].map((c) => ({
                              name: c,
                              From: sum(
                                select(A.holdings).filter(
                                  (h) => h.category === c,
                                ),
                              ),
                              To: sum(
                                select(B.holdings).filter(
                                  (h) => h.category === c,
                                ),
                              ),
                            }))}
                          >
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(v) => money(v, true)} />
                            <Tooltip formatter={(v) => fmt(Number(v))} />
                            <Legend />
                            <Bar
                              isAnimationActive={false}
                              dataKey="From"
                              fill="#a0b9ac"
                            />
                            <Bar
                              isAnimationActive={false}
                              dataKey="To"
                              fill="#35796e"
                            />
                          </BarChart>,
                        )}
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Holding</th>
                                <th>Status</th>
                                <th>Before → After</th>
                                <th>Change in holding value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {compare(select(A.holdings), select(B.holdings))
                                .filter((r) =>
                                  [r.before, r.after].some(
                                    (h) => h && select([h]).length,
                                  ),
                                )
                                .map((r) => (
                                  <tr key={r.id}>
                                    <td>
                                      {r.before?.name || "—"} →{" "}
                                      {r.after?.name || "—"}
                                      <small>{r.id}</small>
                                    </td>
                                    <td>{r.status}</td>
                                    <td>
                                      {fmt(r.before?.value || 0)} →{" "}
                                      {fmt(r.after?.value || 0)}
                                    </td>
                                    <td>{fmt(r.change)}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p>Save a second snapshot to compare balances.</p>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Saved balances</h2>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Date / sequence</th>
                            <th>Total</th>
                            <th>Change in holding value</th>
                            <th>Categories</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ss.map((s, i) => {
                            const t = sum(select(s.holdings)),
                              prev = i ? sum(select(ss[i - 1].holdings)) : 0;
                            return (
                              <tr key={s.id}>
                                <td>
                                  {s.date} #{i + 1}
                                  <small>
                                    Created{" "}
                                    {new Date(s.created).toLocaleString()}
                                  </small>
                                </td>
                                <td>{fmt(t)}</td>
                                <td>
                                  {i ? fmt(t - prev) : "—"}
                                  <small>
                                    {i
                                      ? percent(t - prev, prev)
                                      : "First snapshot"}
                                  </small>
                                </td>
                                <td>
                                  {groups(select(s.holdings), "category").map(
                                    (g) => (
                                      <small key={g.name}>
                                        {g.name}: {fmt(g.value)}
                                      </small>
                                    ),
                                  )}
                                </td>
                                <td>{s.note}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
          {view === "Import / Export" && (
            <Transfer
              data={data}
              commit={commit}
              onError={setError}
              onImported={() => {
                setNotice(
                  "Import saved. You can now save a portfolio snapshot.",
                );
                setSnapshot(true);
              }}
            />
          )}
          {view === "Settings" && (
            <>
              <section className="panel">
                <h2>Display</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={data.compact}
                    onChange={(e) =>
                      void commit({ ...data, compact: e.target.checked })
                    }
                  />{" "}
                  Compact lakh / crore amounts
                </label>
              </section>
              <section className="panel">
                <h2>Categories</h2>
                <p>
                  Renaming updates working holdings. Historical snapshots retain
                  original category names.
                </p>
                {data.categories.map((c) => (
                  <div className="institution" key={c}>
                    <span>{c}</span>
                    <div>
                      <button
                        onClick={() => {
                          const n = prompt("New category name", c)?.trim();
                          if (n && n !== c) {
                            if (
                              data.categories.some(
                                (x) => x.toLowerCase() === n.toLowerCase(),
                              )
                            )
                              return setError("Category already exists");
                            void commit({
                              ...data,
                              categories: data.categories.map((x) =>
                                x === c ? n : x,
                              ),
                              holdings: data.holdings.map((h) =>
                                h.category === c
                                  ? {
                                      ...h,
                                      category: n,
                                      edited: new Date().toISOString(),
                                    }
                                  : h,
                              ),
                            });
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        disabled={data.holdings.some((h) => h.category === c)}
                        onClick={() => {
                          if (confirm(`Delete empty category ${c}?`))
                            void commit({
                              ...data,
                              categories: data.categories.filter(
                                (x) => x !== c,
                              ),
                            });
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const n = prompt("Category name")?.trim();
                    if (
                      n &&
                      !data.categories.some(
                        (c) => c.toLowerCase() === n.toLowerCase(),
                      )
                    )
                      void commit({
                        ...data,
                        categories: [...data.categories, n],
                      });
                  }}
                >
                  + Add category
                </button>
              </section>
              <section className="panel">
                <h2>Your data stays with you</h2>
                <p>
                  IndexedDB storage is specific to this browser and device. It
                  is not a backup and may be lost when browser data is cleared.
                  No cross-device sync or password protection is provided. There
                  are no analytics or financial-data uploads.
                </p>
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Replace all current data and snapshots with illustrative demo data? Export a backup first.",
                      )
                    )
                      void commit(demo());
                  }}
                >
                  Load demo portfolio
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (
                      confirm(
                        "Permanently clear all holdings, snapshots and settings on this browser?",
                      )
                    )
                      void commit(empty());
                  }}
                >
                  Reset all browser data
                </button>
              </section>
            </>
          )}
          <footer>
            Holding balances only · Browser storage is not a backup.{" "}
            <button onClick={() => setView("Import / Export")}>
              Export a backup
            </button>
          </footer>
        </main>
      </div>
      {editing && (
        <HoldingEditor
          holding={editing}
          categories={data.categories}
          onClose={() => setEditing(null)}
          onSave={async (h) => {
            try {
              validateHolding(h);
              await commit({
                ...data,
                holdings: data.holdings.some((x) => x.id === h.id)
                  ? data.holdings.map((x) => (x.id === h.id ? h : x))
                  : [...data.holdings, h],
              });
              setEditing(null);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
      {snapshot && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="snapshot-title"
          >
            <h2 id="snapshot-title">Save Portfolio Snapshot</h2>
            <p>
              Preserve all {data.holdings.length} holdings:{" "}
              <strong>{fmt(sum(data.holdings))}</strong>
            </p>
            <p>
              Valuation dates remain unchanged; a snapshot does not revalue
              holdings.
            </p>
            <label>
              Snapshot date
              <input
                type="date"
                required
                value={snapDate}
                onChange={(e) => setSnapDate(e.target.value)}
              />
            </label>
            <label>
              Note
              <textarea
                value={snapNote}
                onChange={(e) => setSnapNote(e.target.value)}
              />
            </label>
            <div className="actions">
              <button onClick={() => setSnapshot(false)}>Cancel</button>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    const next = {
                      ...data,
                      snapshots: [
                        ...data.snapshots,
                        {
                          id: crypto.randomUUID(),
                          date: snapDate,
                          created: new Date().toISOString(),
                          note: snapNote,
                          holdings: structuredClone(data.holdings),
                        },
                      ],
                    };
                    validateData(next);
                    await commit(next);
                    setSnapshot(false);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Save snapshot
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({
  text = "No holdings to show. Add a holding or load the illustrative demo in Settings.",
}) {
  return (
    <div className="empty">
      <span>◌</span>
      <p>{text}</p>
    </div>
  );
}
function HoldingEditor({
  holding,
  categories,
  onClose,
  onSave,
}: {
  holding: Holding;
  categories: string[];
  onClose: () => void;
  onSave: (h: Holding) => void;
}) {
  const [h, setH] = useState(holding),
    [err, setErr] = useState("");
  const field = (k: keyof Holding, v: unknown) => setH({ ...h, [k]: v });
  return (
    <div className="overlay">
      <form
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="holding-title"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const next = {
              ...h,
              value:
                h.method === "units"
                  ? Math.round((h.quantity ?? NaN) * (h.price ?? NaN) * 100) /
                    100
                  : Math.round(h.value * 100) / 100,
              edited: new Date().toISOString(),
            };
            validateHolding(next);
            onSave(next);
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
      >
        <div className="page-head">
          <h2 id="holding-title">Holding details</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close holding editor"
          >
            ✕
          </button>
        </div>
        {err && (
          <p role="alert" className="alert">
            {err}
          </p>
        )}
        <div className="form-grid">
          <label>
            Category
            <select
              value={h.category}
              onChange={(e) =>
                setH({
                  ...h,
                  category: e.target.value,
                  liquidity: ["Bank", "Cash"].includes(e.target.value)
                    ? "Liquid"
                    : liquidities[3],
                  exposure: ["Bank", "Cash", "FD"].includes(e.target.value)
                    ? exposures[0]
                    : e.target.value === "Shares"
                      ? "Equity"
                      : e.target.value === "Gold"
                        ? "Gold"
                        : exposures[5],
                })
              }
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Institution / holding party
            <input
              required
              value={h.institution}
              onChange={(e) => field("institution", e.target.value)}
            />
          </label>
          <label>
            Holding nickname
            <input
              required
              value={h.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <label>
            Valuation date
            <input
              type="date"
              required
              value={h.date}
              onChange={(e) => field("date", e.target.value)}
            />
          </label>
          <label>
            Valuation method
            <select
              value={h.method}
              onChange={(e) =>
                setH({
                  ...h,
                  method: e.target.value as "manual" | "units",
                  manualValue: h.method === "manual" ? h.value : h.manualValue,
                  value:
                    e.target.value === "manual"
                      ? (h.manualValue ?? h.value)
                      : h.value,
                })
              }
            >
              <option value="manual">Direct manual value</option>
              <option value="units">Quantity × manual price / NAV</option>
            </select>
          </label>
          {h.method === "manual" ? (
            <label>
              Value INR
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={h.value}
                onChange={(e) =>
                  field(
                    "value",
                    e.target.value === "" ? NaN : Number(e.target.value),
                  )
                }
              />
            </label>
          ) : (
            <>
              <label>
                Quantity
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={h.quantity ?? ""}
                  onChange={(e) => field("quantity", Number(e.target.value))}
                />
              </label>
              <label>
                Price / NAV INR
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={h.price ?? ""}
                  onChange={(e) => field("price", Number(e.target.value))}
                />
              </label>
              <p>
                Calculated value: {money((h.quantity || 0) * (h.price || 0))}.
                Your manual value is retained when switching methods.
              </p>
            </>
          )}
          <label>
            Liquidity
            <select
              value={h.liquidity}
              onChange={(e) => field("liquidity", e.target.value)}
            >
              {liquidities.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Exposure
            <select
              value={h.exposure}
              onChange={(e) => field("exposure", e.target.value)}
            >
              {exposures.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          {h.exposure === "Mixed" && (
            <label>
              Equity allocation %, optional
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={h.equity ?? ""}
                onChange={(e) =>
                  field(
                    "equity",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </label>
          )}
        </div>
        <details>
          <summary>Optional owner, account & asset details</summary>
          <div className="form-grid">
            {[
              ["owner", "Owner"],
              ["reference", "Account reference / last four digits"],
              ["custodian", "Custodian / platform"],
              ["lock", "Lock-in details"],
            ].map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  value={String(h[k as keyof Holding] ?? "")}
                  onChange={(e) => field(k as keyof Holding, e.target.value)}
                />
              </label>
            ))}
            <label>
              Maturity date
              <input
                type="date"
                value={h.maturity || ""}
                onChange={(e) => field("maturity", e.target.value)}
              />
            </label>
            <label>
              Premature withdrawal
              <select
                value={h.premature === undefined ? "" : String(h.premature)}
                onChange={(e) =>
                  field(
                    "premature",
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                  )
                }
              >
                <option value="">Unspecified</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
            </label>
          </div>
        </details>
        <label>
          Notes
          <textarea
            value={h.notes}
            onChange={(e) => field("notes", e.target.value)}
          />
        </label>
        <small>Stable ID: {h.id}</small>
        <div className="actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Save holding
          </button>
        </div>
      </form>
    </div>
  );
}
function Transfer({
  data,
  commit,
  onError,
  onImported,
}: {
  data: Data;
  commit: (d: Data) => Promise<void>;
  onError: (s: string) => void;
  onImported: () => void;
}) {
  const [sheets, setSheets] = useState<Sheet[]>([]),
    [sheet, setSheet] = useState(0),
    [mapping, setMapping] = useState<number[]>([]),
    [rows, setRows] = useState<Row[] | null>(null),
    [mode, setMode] = useState("update"),
    [scope, setScope] = useState("All"),
    [busy, setBusy] = useState(false);
  const heads = sheets[sheet]?.rows[0] || [];
  async function guarded(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel">
        <h2>Import holdings</h2>
        <p>
          Upload a file, map columns, review every row, then confirm. Files stay
          in this browser; the app does not monitor your computer.
        </p>
        <button
          disabled={busy}
          onClick={() =>
            void guarded(async () =>
              download(await workbook(), "Holdings-template.xlsx"),
            )
          }
        >
          Download Excel template
        </button>
        <label>
          Excel or CSV file
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void guarded(async () => {
                  const s = await readFile(f);
                  if (!s.length) throw Error("No worksheets found");
                  setSheets(s);
                  setSheet(0);
                  setMapping(detect(s[0].rows[0] || []));
                  setRows(null);
                });
            }}
          />
        </label>
        {sheets.length > 0 && (
          <>
            <label>
              Worksheet
              <select
                value={sheet}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSheet(n);
                  setMapping(detect(sheets[n].rows[0] || []));
                  setRows(null);
                }}
              >
                {sheets.map((s, i) => (
                  <option value={i} key={i}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <h3>Map columns</h3>
            <p>
              The first non-empty row must contain headings. Dates use
              YYYY-MM-DD or Excel dates. Blank dates use today.
            </p>
            <div className="form-grid">
              {columns.map((c, i) => (
                <label key={c}>
                  {c}
                  <select
                    value={mapping[i] ?? -1}
                    onChange={(e) => {
                      setMapping(
                        mapping.map((v, j) =>
                          j === i ? Number(e.target.value) : v,
                        ),
                      );
                      setRows(null);
                    }}
                  >
                    <option value={-1}>Not provided</option>
                    {heads.map((h, j) => (
                      <option value={j} key={j}>
                        {h || `Column ${j + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button
              onClick={() =>
                setRows(
                  preview(
                    sheets[sheet].rows,
                    mapping,
                    data.holdings,
                    data.categories,
                  ),
                )
              }
            >
              Preview records
            </button>
          </>
        )}
        {rows && (
          <>
            <h3>Review {rows.length} records</h3>
            <p>
              {["New", "Updated", "Unchanged", "Ambiguous", "Invalid"]
                .map(
                  (s) =>
                    `${rows.filter((r) => r.status === s).length} ${s.toLowerCase()}`,
                )
                .join(" · ")}
            </p>
            <p>
              For a renamed holding without an ID, select its existing record
              below. Never assume a name change is a new account.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Holding</th>
                    <th>Value</th>
                    <th>Status / issue</th>
                    <th>Match resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.line}</td>
                      <td>{r.holding?.name || "—"}</td>
                      <td>{r.holding ? money(r.holding.value) : "—"}</td>
                      <td>
                        {r.status}
                        <small>{r.error}</small>
                      </td>
                      <td>
                        {r.holding && (
                          <select
                            aria-label={`Match row ${r.line}`}
                            value={
                              r.status === "New"
                                ? "new"
                                : r.status === "Ambiguous"
                                  ? ""
                                  : r.holding.id
                            }
                            onChange={(e) => {
                              const id = e.target.value;
                              if (!id) return;
                              setRows(
                                rows.map((x, j) =>
                                  j !== i
                                    ? x
                                    : {
                                        ...x,
                                        holding: {
                                          ...x.holding!,
                                          id:
                                            id === "new"
                                              ? crypto.randomUUID()
                                              : id,
                                        },
                                        status:
                                          id === "new" ? "New" : "Updated",
                                      },
                                ),
                              );
                            }}
                          >
                            <option value="">Choose resolution</option>
                            <option value="new">
                              Create a distinct holding
                            </option>
                            {data.holdings.map((h) => (
                              <option value={h.id} key={h.id}>
                                {h.category} · {h.institution} · {h.name} ·{" "}
                                {h.reference} · {h.id.slice(0, 8)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="filters">
              <label>
                Import mode
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="add">Add only</option>
                  <option value="update">Update and add</option>
                  <option value="replace">Replace selected scope</option>
                </select>
              </label>
              {mode === "replace" && (
                <label>
                  Replacement scope
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                  >
                    <option>All</option>
                    {data.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <p>
              {mode === "replace"
                ? `Replace ${scope === "All" ? "the entire working portfolio" : scope}: remove ${data.holdings.filter((h) => scope === "All" || h.category === scope).length} existing scope records and insert the ${rows.length} reviewed records. Earlier snapshots stay unchanged.`
                : mode === "add"
                  ? `Add ${rows.filter((r) => r.status === "New").length} new records; existing matches stay unchanged.`
                  : `Add ${rows.filter((r) => r.status === "New").length}, update ${rows.filter((r) => r.status === "Updated").length}; missing records stay unchanged.`}
            </p>
            <button
              className="primary"
              disabled={
                busy ||
                !rows.length ||
                rows.some(
                  (r) => r.status === "Invalid" || r.status === "Ambiguous",
                )
              }
              onClick={() =>
                void guarded(async () => {
                  const holdings = applyImport(
                    data.holdings,
                    rows,
                    mode,
                    scope,
                  );
                  if (
                    confirm(
                      "Apply the reviewed import changes? " +
                        (mode === "replace"
                          ? "This replaces the selected scope."
                          : "Missing holdings will not be deleted."),
                    )
                  ) {
                    await commit({ ...data, holdings });
                    setRows(null);
                    setSheets([]);
                    onImported();
                  }
                })
              }
            >
              Confirm and apply import
            </button>
            <p>
              Invalid rows must be corrected and re-uploaded. No partial imports
              are applied.
            </p>
          </>
        )}
      </section>
      <section className="panel">
        <h2>Exports & backups</h2>
        <p>
          JSON preserves IDs, snapshots and all settings. Excel includes current
          holdings, history totals and a worksheet for every snapshot. Exported
          text is protected against spreadsheet formula injection.
        </p>
        <div className="actions">
          <button
            onClick={() =>
              download(
                new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                }),
                "Holdings-backup.json",
              )
            }
          >
            Download complete JSON backup
          </button>
          <button
            disabled={busy}
            onClick={() =>
              void guarded(async () =>
                download(await workbook(data), "Holdings-export.xlsx"),
              )
            }
          >
            Export Excel workbook
          </button>
        </div>
        <label>
          Restore JSON backup
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void guarded(async () => {
                  const d = validateData(JSON.parse(await f.text()));
                  if (
                    confirm(
                      `Replace all browser data with ${d.holdings.length} holdings and ${d.snapshots.length} snapshots?`,
                    )
                  )
                    await commit(d);
                });
            }}
          />
        </label>
      </section>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
