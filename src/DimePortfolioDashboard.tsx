import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

/* =========================
   Types
========================= */
type FundKey = "IVV" | "VOO" | "QQQ";
type PersonRow = { id: string; name: string };
type FundRow = { id: string; symbol: FundKey };
type SummaryPerson = { person: string; IVV: number; VOO: number; QQQ: number };
type TxnView = { id: string; person: string; fund: FundKey; delta: number; note?: string; at: string };

/* =========================
   Small UI helpers
========================= */
function KPI({ title, value, subtitle }: { title: string; value: React.ReactNode; subtitle?: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-bold whitespace-pre-line">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl border ${active ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"}`}
    >
      {label}
    </button>
  );
}

/* =========================
   Inline Auth bar (Magic Link)
========================= */
function AuthBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setEmail(sess?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn() {
    const input = prompt("ใส่อีเมลสำหรับรับ Magic Link:");
    if (!input) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: input,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) alert(error.message);
    else alert("ส่งลิงก์เข้าอีเมลแล้ว ✅");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex items-center gap-3">
      {email ? (
        <>
          <span className="text-xs sm:text-sm text-gray-600">Signed in as {email}</span>
          <button onClick={signOut} className="px-3 py-1 rounded border hover:bg-gray-50">
            ออกจากระบบ
          </button>
        </>
      ) : (
        <button onClick={signIn} className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">
          เข้าสู่ระบบ
        </button>
      )}
    </div>
  );
}

/* =========================
   🔁 Card: สลับมุมมอง Stacked (พร้อมปุ่ม)
========================= */
function StackedSwitcher({
  summary,
  nf,
  title = "กราฟสลับมุมมอง",
  height = 320,
}: {
  summary: SummaryPerson[];
  nf: Intl.NumberFormat;
  title?: string;
  height?: number;
}) {
  const [mode, setMode] = useState<"byPerson" | "byFund">("byPerson");
  const COLORS = ["#6366F1", "#22C55E", "#EF4444", "#F59E0B", "#06B6D4", "#8B5CF6", "#10B981", "#F97316"];

  // โหมด 1: X = คน | ซ้อน = กองทุน
  const dataByPerson = useMemo(
    () =>
      summary.map((p) => ({
        person: p.person,
        IVV: p.IVV || 0,
        QQQ: p.QQQ || 0,
        VOO: p.VOO || 0,
      })),
    [summary]
  );

  // โหมด 2: X = กองทุน | ซ้อน = คน
  const personNames = useMemo(() => summary.map((p) => p.person), [summary]);
  const dataByFund = useMemo(() => {
    const funds: FundKey[] = ["IVV", "QQQ", "VOO"]; // เรียงเพื่อ legend อ่านง่าย
    return funds.map((f) => {
      const row: any = { fund: f };
      summary.forEach((p) => (row[p.person] = p[f] || 0));
      return row;
    });
  }, [summary]);

  const hasAnyData =
    mode === "byPerson"
      ? dataByPerson.some((r) => (r.IVV || 0) + (r.QQQ || 0) + (r.VOO || 0) > 0)
      : dataByFund.some((r) => personNames.some((n) => (r as any)[n] > 0));

  return (
    <Card title={`${title} — ${mode === "byPerson" ? "ตามคน" : "ตามกองทุน"}`}>
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setMode("byPerson")}
          className={`px-3 py-1 rounded border ${mode === "byPerson" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"}`}
          aria-pressed={mode === "byPerson"}
        >
          ตามคน
        </button>
        <button
          onClick={() => setMode("byFund")}
          className={`px-3 py-1 rounded border ${mode === "byFund" ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"}`}
          aria-pressed={mode === "byFund"}
        >
          ตามกองทุน
        </button>
      </div>

      {hasAnyData ? (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer>
            <BarChart data={mode === "byPerson" ? dataByPerson : dataByFund}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={mode === "byPerson" ? "person" : "fund"} />
              <YAxis tickFormatter={(v) => nf.format(Number(v))} />
              <Tooltip formatter={(v: any) => nf.format(Number(v))} />
              <Legend />
              {mode === "byPerson" ? (
                <>
                  <Bar dataKey="IVV" stackId="a" fill="#6366F1" />
                  <Bar dataKey="QQQ" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="VOO" stackId="a" fill="#22C55E" />
                </>
              ) : (
                <>
                  {personNames.map((name, idx) => (
                    <Bar key={name} dataKey={name} stackId="a" fill={COLORS[idx % COLORS.length]} />
                  ))}
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-sm text-gray-500">— ยังไม่มีข้อมูล —</div>
      )}
    </Card>
  );
}

/* =========================
   Main Component
========================= */
function DimePortfolioDashboard() {
  // Tabs
  const [tab, setTab] = useState<"overview" | "transactions" | "history">("overview");

  // Meta & data
  const [peopleRows, setPeopleRows] = useState<PersonRow[]>([]);
  const [fundRows, setFundRows] = useState<FundRow[]>([]);
  const [summary, setSummary] = useState<SummaryPerson[]>([]);
  const [txns, setTxns] = useState<TxnView[]>([]);
  const [loading, setLoading] = useState(false);

  // id mapping + pending inputs
  const [metaIds, setMetaIds] = useState<{ people: Record<string, string>; funds: Record<FundKey, string> }>({
    people: {},
    funds: { IVV: "", VOO: "", QQQ: "" },
  });
  const [pending, setPending] = useState<Record<string, Record<FundKey, { delta: string; note: string }>>>({});

  const nf = useMemo(
    () => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }),
    []
  );

  /* ---------- Loaders ---------- */
  async function loadMeta() {
    const [pRes, fRes] = await Promise.all([
      supabase.from("people").select("id, name").order("name"),
      supabase.from("funds").select("id, symbol").order("symbol"),
    ]);
    if (pRes.error) throw pRes.error;
    if (fRes.error) throw pRes.error;

    const peopleMap: Record<string, string> = {};
    (pRes.data || []).forEach((r: any) => (peopleMap[r.name] = r.id));

    const fundMap: Record<FundKey, string> = { IVV: "", VOO: "", QQQ: "" };
    (fRes.data || []).forEach((r: any) => {
      if (r.symbol === "IVV" || r.symbol === "VOO" || r.symbol === "QQQ") (fundMap as any)[r.symbol] = r.id;
    });

    setMetaIds({ people: peopleMap, funds: fundMap });
    setPeopleRows((pRes.data || []) as PersonRow[]);
    setFundRows((fRes.data || []) as FundRow[]);

    // Prepare pending inputs
    setPending((prev) => {
      const next = { ...prev };
      (pRes.data || []).forEach((p: PersonRow) => {
        next[p.name] = next[p.name] || { IVV: { delta: "", note: "" }, VOO: { delta: "", note: "" }, QQQ: { delta: "", note: "" } };
        (fRes.data || []).forEach((f: FundRow) => {
          if (!next[p.name][f.symbol]) next[p.name][f.symbol] = { delta: "", note: "" } as any;
        });
      });
      return next;
    });
  }

  async function fetchSummaryFromDB() {
    const { data: rows, error } = await supabase
      .from("v_current_positions")
      .select("person_id, fund_id, amount");
    if (error) throw error;

    const peopleById: Record<string, string> = {};
    peopleRows.forEach((r) => (peopleById[r.id] = r.name));
    const fundById: Record<string, FundKey> = {};
    fundRows.forEach((r) => (fundById[r.id] = r.symbol));

    const map: Record<string, any> = {};
    (rows || []).forEach((r: any) => {
      const person = peopleById[r.person_id];
      const fund = fundById[r.fund_id];
      if (!person || !fund) return;
      map[person] ??= { person, IVV: 0, VOO: 0, QQQ: 0 };
      map[person][fund] = Number(r.amount);
    });

    peopleRows.forEach((p) => {
      map[p.name] ??= { person: p.name, IVV: 0, VOO: 0, QQQ: 0 };
    });

    setSummary(Object.values(map) as SummaryPerson[]);
  }

  async function fetchRecentTxns(limit = 20) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, person_id, fund_id, amount_delta, note, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const peopleById: Record<string, string> = {};
    peopleRows.forEach((r) => (peopleById[r.id] = r.name));
    const fundById: Record<string, FundKey> = {};
    fundRows.forEach((r) => (fundById[r.id] = r.symbol));

    setTxns(
      (data || []).map((t: any) => ({
        id: t.id,
        person: peopleById[t.person_id],
        fund: fundById[t.fund_id],
        delta: Number(t.amount_delta),
        note: t.note ?? undefined,
        at: new Date(t.created_at).toLocaleString("th-TH"),
      }))
    );
  }

  /* ---------- Actions ---------- */
  async function commitTransaction(person: string, fund: FundKey) {
    const entry = pending[person]?.[fund];
    if (!entry) return;

    const deltaNum = Number(entry.delta);
    if (!deltaNum || isNaN(deltaNum)) return alert("กรุณาใส่จำนวนที่ถูกต้อง");

    const person_id = metaIds.people[person];
    const fund_id = metaIds.funds[fund];
    if (!person_id || !fund_id) return alert("ยังโหลดรหัส person/fund ไม่ครบ");

    const { error } = await supabase.from("transactions").insert({
      person_id,
      fund_id,
      amount_delta: deltaNum,
      note: entry.note?.trim() || null,
    });
    if (error) {
      console.error(error);
      return alert("บันทึกล้มเหลว: " + error.message);
    }

    await Promise.all([fetchSummaryFromDB(), fetchRecentTxns(20)]);

    setPending((prev) => ({
      ...prev,
      [person]: { ...prev[person], [fund]: { delta: "", note: "" } },
    }));
  }

  /* ---------- Effects ---------- */
  // 1) โหลด meta เท่านั้น (แก้ race)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadMeta();
      } catch (e: any) {
        console.error(e);
        alert("โหลดข้อมูลไม่สำเร็จ: " + (e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) เมื่อ meta พร้อมแล้ว ค่อยดึง summary + history
  useEffect(() => {
    if (!peopleRows.length || !fundRows.length) return;
    (async () => {
      try {
        await fetchSummaryFromDB();
        await fetchRecentTxns(20);
      } catch (e: any) {
        console.error(e);
        alert("โหลดข้อมูลไม่สำเร็จ: " + (e?.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleRows, fundRows]);

  // 3) Realtime: อัปเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลงใน transactions
  useEffect(() => {
    if (!peopleRows.length || !fundRows.length) return;
    const channel = supabase
      .channel("txns-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, async () => {
        await fetchSummaryFromDB();
        await fetchRecentTxns(20);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peopleRows, fundRows]);

  /* ---------- Derived ---------- */
  const fundTotals = useMemo(() => {
    const totals: Record<FundKey, number> = { IVV: 0, VOO: 0, QQQ: 0 };
    summary.forEach((p) => {
      (Object.keys(totals) as FundKey[]).forEach((f) => (totals[f] += p[f] || 0));
    });
    return totals;
  }, [summary]);

  const portfolioTotal = useMemo(() => {
    return summary.reduce((sum, p) => sum + p.IVV + p.VOO + p.QQQ, 0);
  }, [summary]);

  // ✅ % ต่อคน (Pie ขวา + กล่อง KPI)
  const peoplePieData = useMemo(() => {
    const total = portfolioTotal;
    return summary.map((p) => {
      const v = (p.IVV || 0) + (p.VOO || 0) + (p.QQQ || 0);
      const pct = total > 0 ? (v / total) * 100 : 0;
      return { name: p.person, value: pct };
    });
  }, [summary, portfolioTotal]);

  const peoplePercentSorted = useMemo(
    () => [...peoplePieData].sort((a, b) => b.value - a.value),
    [peoplePieData]
  );

  // ✅ % ตามกองทุน (Pie ซ้าย)
  const fundPercentData = useMemo(() => {
    const order: FundKey[] = ["IVV", "QQQ", "VOO"]; // ให้ legend ตามภาพ: IVV, QQQ, VOO
    return order.map((f) => ({
      name: f,
      value: portfolioTotal > 0 ? (fundTotals[f] / portfolioTotal) * 100 : 0,
    }));
  }, [fundTotals, portfolioTotal]);

  const COLORS = ["#6366F1", "#22C55E", "#EF4444", "#F59E0B", "#06B6D4", "#8B5CF6", "#10B981", "#F97316"];
  const FUND_COLORS = ["#6366F1", "#F59E0B", "#22C55E"]; // IVV, QQQ, VOO

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dime Portfolio Dashboard</h1>
            <p className="text-gray-500 text-sm">Supabase + RLS · 3 Funds (IVV / VOO / QQQ)</p>
          </div>

          {/* สถานะโหลดเล็กๆ ใต้ AuthBar */}
          <div className="flex flex-col items-start sm:items-end gap-1">
            <AuthBar />
            <div className="text-[11px] text-gray-500">
              สถานะโหลด:{" "}
              <span className={loading ? "text-orange-600" : "text-emerald-600"}>
                {loading ? "กำลังโหลด..." : "พร้อมใช้งาน"}
              </span>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <KPI title="มูลค่ารวมพอร์ต" value={nf.format(portfolioTotal)} subtitle="รวมทุกคน · ทุกกองทุน" />

          <KPI
            title="รวมต่อกองทุน"
            value={
              <div className="flex flex-col">
                {(["IVV", "VOO", "QQQ"] as FundKey[]).map((f) => (
                  <span key={f}>
                    {f}: {nf.format(fundTotals[f])}
                  </span>
                ))}
              </div>
            }
          />

          {/* สัดส่วนต่อคน (ธีมเดียวกับ KPI ช่องข้างๆ) */}
          <KPI
            title="สัดส่วนต่อคน"
            value={
              <div className="flex flex-col">
                {peoplePercentSorted.map((p) => (
                  <span key={p.name}>
                    {p.name}: {p.value.toFixed(2)}%
                  </span>
                ))}
              </div>
            }
            subtitle="เปอร์เซ็นต์จากพอร์ตทั้งหมด"
          />
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2">
          <TabButton label="ภาพรวม" active={tab === "overview"} onClick={() => setTab("overview")} />
          <TabButton label="บันทึกเพิ่ม" active={tab === "transactions"} onClick={() => setTab("transactions")} />
          <TabButton label="ประวัติล่าสุด" active={tab === "history"} onClick={() => setTab("history")} />
        </div>

        {tab === "overview" && (
          <div className="mt-8 grid gap-6">
            <Card title="สรุปตามบุคคล (แยกกองทุน)" className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2">ชื่อ</th>
                    <th className="py-2">IVV</th>
                    <th className="py-2">VOO</th>
                    <th className="py-2">QQQ</th>
                    <th className="py-2">รวม</th>
                    <th className="py-2">สัดส่วน % ต่อพอร์ต</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((p) => {
                    const total = (p.IVV || 0) + (p.VOO || 0) + (p.QQQ || 0);
                    const pct = portfolioTotal > 0 ? (total / portfolioTotal) * 100 : 0;
                    return (
                      <tr key={p.person} className="border-b">
                        <td className="py-2 font-medium">{p.person}</td>
                        <td className="py-2">{nf.format(p.IVV || 0)}</td>
                        <td className="py-2">{nf.format(p.VOO || 0)}</td>
                        <td className="py-2">{nf.format(p.QQQ || 0)}</td>
                        <td className="py-2 font-semibold">{nf.format(total)}</td>
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-40 bg-gray-200 rounded">
                              <div className="h-2 bg-indigo-500 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* ✅ แผนภูมิ: ซ้าย = % ตามกองทุน / ขวา = % ตามบุคคล */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="สัดส่วนตามกองทุน (ทั้งพอร์ต)">
                {fundPercentData.some((d) => d.value > 0) ? (
                  <div className="h-72">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie dataKey="value" data={fundPercentData} nameKey="name" innerRadius={0} outerRadius={120}>
                          {fundPercentData.map((_, idx) => (
                            <Cell key={idx} fill={FUND_COLORS[idx % FUND_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">— ยังไม่มีข้อมูล —</div>
                )}
              </Card>

              <Card title="สัดส่วนตามบุคคล (คิดเป็น % จากทั้งพอร์ต)">
                {peoplePieData.some((d) => d.value > 0) ? (
                  <div className="h-72">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie dataKey="value" data={peoplePieData} nameKey="name" innerRadius={0} outerRadius={120}>
                          {peoplePieData.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${Number(v).toFixed(2)}%`} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">— ยังไม่มีข้อมูล —</div>
                )}
              </Card>
            </div>

            {/* สวิตช์กราฟ Stacked (ยังคงไว้) */}
            <StackedSwitcher summary={summary} nf={nf} title="Stack" height={288} />
          </div>
        )}

        {tab === "transactions" && (
          <div className="mt-8 grid gap-6">
            <Card title="บันทึกเพิ่ม (transactions)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm align-top">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">ชื่อ</th>
                      {fundRows.map((f) => (
                        <th key={f.id} className="py-2 w-[320px]">
                          {f.symbol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {peopleRows.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-2 font-medium whitespace-nowrap">{p.name}</td>
                        {fundRows.map((f) => {
                          const val = pending[p.name]?.[f.symbol] || { delta: "", note: "" };
                          return (
                            <td key={f.id} className="py-2">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <input
                                  type="number"
                                  placeholder="จำนวน (+/−)"
                                  className="w-36 border rounded px-2 py-1"
                                  value={val.delta}
                                  onChange={(e) =>
                                    setPending((prev) => ({
                                      ...prev,
                                      [p.name]: {
                                        ...(prev[p.name] || {}),
                                        [f.symbol]: { ...(prev[p.name]?.[f.symbol] || { note: "" }), delta: e.target.value },
                                      },
                                    }))
                                  }
                                />
                                <input
                                  type="text"
                                  placeholder="หมายเหตุ"
                                  className="flex-1 border rounded px-2 py-1 min-w-40"
                                  value={val.note}
                                  onChange={(e) =>
                                    setPending((prev) => ({
                                      ...prev,
                                      [p.name]: {
                                        ...(prev[p.name] || {}),
                                        [f.symbol]: { ...(prev[p.name]?.[f.symbol] || { delta: "" }), note: e.target.value },
                                      },
                                    }))
                                  }
                                />
                                <button
                                  className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                                  onClick={() => commitTransaction(p.name, f.symbol)}
                                >
                                  บันทึกเพิ่ม
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {tab === "history" && (
          <div className="mt-8 grid gap-6">
            <Card title="ประวัติรายการล่าสุด">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2">เวลา</th>
                      <th className="py-2">ชื่อ</th>
                      <th className="py-2">กองทุน</th>
                      <th className="py-2">จำนวน (Δ)</th>
                      <th className="py-2">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 whitespace-nowrap">{t.at}</td>
                        <td className="py-2">{t.person}</td>
                        <td className="py-2">{t.fund}</td>
                        <td className={`py-2 ${t.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {t.delta >= 0 ? "+" : ""}
                          {nf.format(Math.abs(t.delta))}
                        </td>
                        <td className="py-2">{t.note || "—"}</td>
                      </tr>
                    ))}
                    {!txns.length && (
                      <tr>
                        <td className="py-6 text-center text-gray-500" colSpan={5}>
                          — ยังไม่มีรายการ —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        <footer className="mt-10 text-xs text-gray-400">
          ต้องล็อกอินก่อนเพื่อใช้งาน (Supabase Auth) · View <code>v_current_positions</code> ต้องเปิด{" "}
          <code>security_invoker</code> และตั้ง RLS ตามตัวอย่างที่ให้ไว้
        </footer>
      </div>
    </div>
  );
}

export default DimePortfolioDashboard;
