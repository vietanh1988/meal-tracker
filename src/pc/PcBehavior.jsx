// Quản trị PC › Hành vi khách (bản vẽ 135c–d, 18/10). Chỉ xem.
//  Dữ liệu: RPC admin_behavior_users (khách + lần mở cuối + bật thông báo) · app_events (Admin đọc được) · Realtime Presence (đang mở app).
//  Hàng 4 ô số · Phễu khách mới + Còn quay lại sau 1/7/14 ngày · Tính năng được dùng + Bỏ ngang ở onboarding · Bảng khách gần đây.
//  Bấm 1 khách → bảng thu gọn bên trái, dòng thời gian bên phải (135d).
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { todayVN, addDays, fmtVN } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Pill, Card, FilterSelect, SearchBox, ErrorBox, Loading, headRow, bodyRow, cell, vnInt } from "./pcUI";
import { behaviorStats, userStatus, timeline, agoText, modeOf, vnDay } from "../lib/behavior";
import { watchPresence } from "../lib/presence";

const PILL_TONE = { green: "green", amber: "amber", red: "red", gray: "gray" };
const head = (t, r) => <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 900 }}>{t}</span>{r && <span style={{ marginLeft: "auto", fontSize: 12, color: PC.t3 }}>{r}</span>}</span>;
export const Dot = ({ on }) => <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, display: "inline-block", background: on ? "#22C55E" : "#EF4444", boxShadow: on ? "0 0 0 3px rgba(34,197,94,0.22)" : "0 0 0 3px rgba(239,68,68,0.15)" }} />;

function Tile({ label, value, color, sub, testid }) {
  return (
    <Card testid={testid} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{label}</span>
        <span data-testid={testid ? `${testid}-value` : undefined} style={{ fontSize: 26, fontWeight: 900, color }}>{value}</span>
        <span style={{ fontSize: 12, color: PC.t4, minHeight: 16 }}>{sub || ""}</span>
      </div>
    </Card>
  );
}

const RANGE = [{ v: "7", label: "7 ngày" }, { v: "30", label: "30 ngày" }, { v: "all", label: "Từ đầu" }];
const MODES = [{ v: "all", label: "Tất cả" }, { v: "loss", label: "Giảm cân" }, { v: "gym", label: "Gym" }];
const UCOLS = "1.4fr 0.7fr 0.7fr 1fr 0.8fr 0.7fr 0.7fr 1.3fr";
const CCOLS = "1.3fr 1fr 1.3fr";

export function PcBehavior({ top }) {
  const [range, setRange] = useState("7");
  const [mode, setMode] = useState("all");
  const [q, setQ] = useState("");
  const [users, setUsers] = useState(null);
  const [events, setEvents] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(null);
  const [online, setOnline] = useState(() => new Set());
  const today = todayVN();
  const days = range === "all" ? null : Number(range);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      // Lấy tối thiểu 60 ngày sự kiện để tính "quay lại sau 14 ngày" của các tuần trước, dù đang xem 7 ngày
      const since = range === "all" ? null : addDays(today, -Math.max(60, Number(range)));
      let qe = supabase.from("app_events").select("id,user_id,at,name,mode,meta,screen").order("at", { ascending: false }).limit(20000);
      if (since) qe = qe.gte("at", `${since}T00:00:00+07:00`);
      const [u, e] = await Promise.all([supabase.rpc("admin_behavior_users"), qe]);
      if (u.error) throw u.error;
      if (e.error) throw e.error;
      setUsers(u.data || []); setEvents(e.data || []);
    } catch (e) { console.error("PcBehavior load error:", e); setErr(e?.message || "Lỗi tải"); setUsers((x) => x || []); }
    setLoading(false);
  }, [range, today]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => watchPresence(setOnline), []);

  const st = useMemo(() => behaviorStats({ users: users || [], events, today, days, mode }), [users, events, today, days, mode]);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (users || []).filter((u) => (mode === "all" || modeOf(u) === mode) && (!k || `${u.username || ""} ${u.email || ""}`.toLowerCase().includes(k)))
      .sort((a, b) => (online.has(b.id) - online.has(a.id)) || String(b.last_at || "").localeCompare(String(a.last_at || "")) || String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 50);
  }, [users, mode, q, online]);
  const selUser = sel ? (users || []).find((u) => u.id === sel) : null;
  const tl = useMemo(() => (sel ? timeline(events, sel) : []), [events, sel]);
  const t = st.tiles;
  const F0 = st.funnel[0]?.n || 0;
  const maxFeat = Math.max(1, ...st.features.map((f) => f.n));
  const rangeLbl = RANGE.find((r) => r.v === range)?.label || "";

  const right = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <FilterSelect label="Thời gian" value={range} onChange={setRange} options={RANGE} testid="pc-behavior-range" />
      <FilterSelect label="Nhóm khách" value={mode} onChange={setMode} options={MODES} testid="pc-behavior-mode" />
      <Btn kind="soft" onClick={load} disabled={loading} testid="pc-behavior-reload">{loading ? "Đang tải…" : "Làm mới"}</Btn>
    </div>
  );

  const usersTable = (compact) => (
    <Card testid="pc-behavior-users">
      <div style={{ padding: "14px 16px 10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        {head("Khách gần đây", null)}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#15803D" }}><Dot on />{online.size} đang dùng app</span>
        <span style={{ marginLeft: "auto" }}><SearchBox value={q} onChange={setQ} placeholder="Tìm tên / email" testid="pc-behavior-search" /></span>
      </div>
      {compact
        ? <div style={headRow(CCOLS)}><span>KHÁCH</span><span>MỞ GẦN NHẤT</span><span>TÌNH TRẠNG</span></div>
        : <div style={headRow(UCOLS)}><span>KHÁCH</span><span>NHÓM</span><span>ĐĂNG KÝ</span><span>MỞ GẦN NHẤT</span><span>NGÀY CÓ MỞ (30N)</span><span>BỮA GHI ({rangeLbl.toUpperCase()})</span><span>THÔNG BÁO</span><span>TÌNH TRẠNG</span></div>}
      {list.length === 0 && <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chưa có khách phù hợp</div>}
      {list.map((u, i) => {
        const s = userStatus(u, events, today);
        const on = online.has(u.id);
        const meals = events.filter((e) => e.user_id === u.id && (e.name === "meal_eaten" || e.name === "meal_log") && (!days || vnDay(e.at) >= addDays(today, -(days - 1)))).length;
        const name = u.username || (u.email || "").split("@")[0] || "—";
        const last = i === list.length - 1;
        const rowSt = { ...bodyRow(compact ? CCOLS : UCOLS, sel === u.id), background: sel === u.id ? PC.rowSel : undefined, borderBottom: last ? "none" : bodyRow(UCOLS).borderBottom, width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer" };
        return (
          <button key={u.id} type="button" data-testid="pc-behavior-row" className="pc-row pc-click" onClick={() => setSel(sel === u.id ? null : u.id)} style={rowSt}>
            <span style={{ ...cell, display: "flex", alignItems: "center", gap: 8 }} title={u.email || ""}>
              <Dot on={on} />
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <b style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{name}</b>
                {compact && <span style={{ fontSize: 11.5, color: PC.t3 }}>{modeOf(u) === "loss" ? "Giảm cân" : "Gym"} · đăng ký {fmtVN(vnDay(u.created_at))}</span>}
              </span>
            </span>
            {!compact && <span style={cell}>{modeOf(u) === "loss" ? "Giảm cân" : "Gym"}</span>}
            {!compact && <span style={cell}>{fmtVN(vnDay(u.created_at))}</span>}
            <span style={cell}>{on ? <b style={{ color: "#15803D" }}>Đang dùng</b> : agoText(u.last_at)}</span>
            {!compact && <span style={cell}>{u.active_days_30 || 0}</span>}
            {!compact && <span style={cell}>{meals}</span>}
            {!compact && <span style={cell}>{u.has_push ? "Bật" : "Tắt"}</span>}
            <span><Pill tone={PILL_TONE[s.tone]}>{s.text}</Pill></span>
          </button>
        );
      })}
    </Card>
  );

  return (
    <>
      {top(right)}
      <div data-testid="pc-behavior" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {err && <ErrorBox text={`Chưa tải được số liệu: ${err}`} onRetry={load} />}
        {users === null ? <Card><Loading /></Card> : sel ? (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>{usersTable(true)}</div>
            <Card testid="pc-behavior-user" style={{ width: 380, flexShrink: 0 }}>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}><Dot on={online.has(sel)} />{selUser?.username || selUser?.email || "Khách"}</span>
                    <span style={{ fontSize: 12, color: PC.t3 }}>{modeOf(selUser) === "loss" ? "Giảm cân" : "Gym"} · đăng ký {fmtVN(vnDay(selUser?.created_at))} · {selUser?.email || ""}</span>
                  </span>
                  <Btn kind="light" onClick={() => setSel(null)} testid="pc-behavior-close">Đóng</Btn>
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {[[`${selUser?.active_days_30 || 0}`, "Ngày có mở (30n)"], [`${events.filter((e) => e.user_id === sel && (e.name === "meal_eaten" || e.name === "meal_log")).length}`, "Lần ghi bữa"], [selUser?.has_push ? "Bật" : "Tắt", "Thông báo"]].map(([v, l]) => (
                    <span key={l} style={{ flex: 1, borderRadius: 10, background: "#F6F8FC", padding: "8px 10px", display: "flex", flexDirection: "column" }}><b style={{ fontSize: 18 }}>{v}</b><span style={{ fontSize: 11, color: PC.t3 }}>{l}</span></span>
                  ))}
                </div>
                {tl.length === 0 && <span style={{ fontSize: 13, color: PC.t3, padding: "8px 0" }}>Chưa có hoạt động nào được ghi (ghi từ 18/10/2026).</span>}
                {tl.slice(0, 14).map((g) => (
                  <div key={g.day} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3, letterSpacing: ".04em", padding: "4px 0" }}>{g.day === today ? "HÔM NAY" : g.day === addDays(today, -1) ? `HÔM QUA · ${fmtVN(g.day)}` : fmtVN(g.day, true)}</span>
                    {g.items.map((it, j) => (
                      <div key={j} data-testid="pc-behavior-event" style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 8, alignItems: "center", minHeight: 34, borderBottom: `1px solid ${PC.rowLine}`, fontSize: 12.5 }}>
                        <b style={{ color: PC.t3 }}>{it.time}</b><span>{it.label}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14 }}>
              <Tile testid="pc-behavior-today" label="Mở app hôm nay" value={vnInt(t.openToday)} color="#16A34A" sub={`${rangeLbl}: ${vnInt(t.openRange)} người`} />
              <Tile testid="pc-behavior-meals" label={`Ghi bữa (${rangeLbl})`} value={vnInt(t.mealUsers)} color="#1D4ED8" sub={`${vnInt(t.mealCount)} lần ghi`} />
              <Tile testid="pc-behavior-new" label={`Khách mới (${rangeLbl})`} value={vnInt(t.newUsers)} color={PC.t1} sub={`${t.newLoss} chọn Giảm cân · ${t.newUsers - t.newLoss} Gym`} />
              <Tile testid="pc-behavior-push" label="Bật thông báo" value={t.total ? `${Math.round((t.push / t.total) * 100)}%` : "–"} color="#B45309" sub={`${t.push} / ${t.total} người`} />
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
              <Card testid="pc-behavior-funnel" style={{ flex: 1.3, minWidth: 0 }}>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {head("Phễu khách mới", `khách đăng ký trong ${rangeLbl.toLowerCase()}`)}
                  {st.funnel.map((f, i) => {
                    const pct = F0 ? Math.round((f.n / F0) * 100) : 0, drop = i ? st.funnel[i - 1].n - f.n : 0;
                    return (
                      <div key={f.label} style={{ display: "grid", gridTemplateColumns: "170px 1fr 120px", gap: 12, alignItems: "center", fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>{i + 1}. {f.label}</span>
                        <span style={{ height: 22, borderRadius: 6, background: "#F1F5F9", overflow: "hidden" }}><span style={{ display: "block", width: `${pct}%`, height: 22, background: i === st.funnel.length - 1 ? "#22C55E" : "#93C5FD" }} /></span>
                        <span style={{ textAlign: "right" }}><b>{f.n}</b> · {pct}%{drop > 0 && <span style={{ color: "#DC2626", fontWeight: 700 }}> (−{drop})</span>}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card testid="pc-behavior-cohorts" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {head("Còn quay lại sau", "% khách mở lại app")}
                  <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr", gap: 6, fontSize: 11, fontWeight: 800, color: PC.t3 }}><span>TUẦN ĐĂNG KÝ</span><span style={{ textAlign: "center" }}>NGÀY 1</span><span style={{ textAlign: "center" }}>NGÀY 7</span><span style={{ textAlign: "center" }}>NGÀY 14</span></div>
                  {st.cohorts.length === 0 && <span style={{ fontSize: 13, color: PC.t3, padding: "8px 0" }}>Chưa có khách đăng ký 4 tuần gần đây</span>}
                  {st.cohorts.map((c) => (
                    <div key={c.label} style={{ display: "grid", gridTemplateColumns: "110px 1fr 1fr 1fr", gap: 6, alignItems: "center" }}>
                      <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span><span style={{ fontSize: 11, color: PC.t3 }}>{c.n} người</span></span>
                      {[c.d1, c.d7, c.d14].map((x, i) => x == null
                        ? <span key={i} style={{ textAlign: "center", color: PC.t4, fontSize: 12 }}>chưa tới</span>
                        : <span key={i} style={{ height: 32, borderRadius: 8, background: `rgba(34,197,94,${Math.min(0.85, 0.1 + x / 110)})`, color: x > 45 ? "#FFFFFF" : PC.t1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{x}%</span>)}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
              <Card testid="pc-behavior-features" style={{ flex: 1.3, minWidth: 0 }}>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {head("Tính năng được dùng", `số người dùng trong ${rangeLbl.toLowerCase()}`)}
                  {st.features.map((f) => (
                    <div key={f.key} style={{ display: "grid", gridTemplateColumns: "170px 1fr 70px", gap: 12, alignItems: "center", fontSize: 13 }}>
                      <span>{f.label}</span>
                      <span style={{ height: 8, borderRadius: 4, background: "#F1F5F9" }}><span style={{ display: "block", width: `${Math.max(1, (f.n / maxFeat) * 100)}%`, height: 8, borderRadius: 4, background: f.n ? "#3B82F6" : "#CBD5E1" }} /></span>
                      <b style={{ textAlign: "right", color: f.n ? PC.t1 : "#DC2626" }}>{f.n} người</b>
                    </div>
                  ))}
                </div>
              </Card>
              <Card testid="pc-behavior-onb" style={{ flex: 1, minWidth: 0 }}>
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column" }}>
                  {head("Bỏ ngang ở onboarding", "khách chưa vào được app")}
                  {st.onboardingDrop.length === 0 && <span style={{ fontSize: 13, color: PC.t3, padding: "10px 0" }}>Không có khách nào kẹt ở onboarding</span>}
                  {st.onboardingDrop.map((d, i, a) => (
                    <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10, height: 44, borderBottom: i === a.length - 1 ? "none" : `1px solid ${PC.rowLine}`, fontSize: 13 }}>
                      <span style={{ flex: 1 }}>{d.label}</span><Pill tone={d.n >= 3 ? "red" : "amber"}>{d.n} người</Pill>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
            {usersTable(false)}
            <span style={{ fontSize: 12, color: PC.t4 }}>Ghi hành vi bắt đầu từ 18/10/2026 — số liệu trước ngày này chưa có. Tài khoản Admin không bị ghi.</span>
          </>
        )}
      </div>
    </>
  );
}
