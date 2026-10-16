// Quản trị › Duyệt món AI tính (bản vẽ 100, nền tối). Logic giống src/hooks/usePendingFoodCache.js + FoodCachePendingTab.jsx:
// food_cache_pending (món lạ AI/USDA tự tính) → admin duyệt = upsert food_cache (food_name,gram) rồi xoá khỏi hàng chờ;
// từ chối = xoá khỏi hàng chờ. 3 tab: Chờ duyệt / Đã duyệt (food_cache) / Kho gốc (LOCAL_FOODS trong code).
// Khác bản cũ: duyệt có trạng thái đang lưu + thông báo; lỗi lưu báo bằng thông báo nhỏ (trước im lặng).
// Quyền giữ như cũ: mọi Admin duyệt được (tab cũ không chặn theo Super Admin).
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { DK } from "../../theme";
import { SubPage, Seg, Icon } from "../ui";
import { Card, Row, Tile, Tiles, Pill, Btn, BtnRow, Search, Loading, ErrorBox, Empty, useConfirm } from "./adminUI";
import { getAllFoods, getFoodCount } from "../../lib/localFoodDB";

const LIST_MAX = 200;
const nf = (v) => (Number(v) || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const PROVIDER = { gpt: "GPT", openai: "GPT", gemini: "Gemini", claude: "Claude", anthropic: "Claude", usda: "USDA", grok: "Grok", deepseek: "DeepSeek" };
const provLabel = (p) => { const k = String(p || "").toLowerCase(); return PROVIDER[k] || (p ? String(p) : "?"); };
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();

function FoodList({ rows, loading, err, onRetry, q, setQ, empty, testid }) {
  const nq = norm(q);
  const hits = useMemo(() => (nq ? rows.filter((r) => r._k.includes(nq)) : rows), [rows, nq]);
  return (
    <>
      <Search value={q} onChange={setQ} placeholder="Tìm món" testid={`${testid}-search`} />
      {loading ? <Loading rows={3} /> : err ? <ErrorBox onRetry={onRetry} /> : hits.length === 0 ? <Empty>{q ? "Không tìm thấy món nào" : empty}</Empty> : (
        <>
          <Card testid={testid} style={{ margin: "12px 12px 0 12px" }}>
            {hits.slice(0, LIST_MAX).map((r, i, arr) => (
              <Row key={r.key} last={i === arr.length - 1} style={{ minHeight: 46 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", flexShrink: 0 }}>{nf(r.gram)} g · <b style={{ color: DK.t1 }}>{Math.round(Number(r.cal) || 0)}</b> kcal</span>
              </Row>
            ))}
          </Card>
          {hits.length > LIST_MAX && <span style={{ display: "block", margin: "8px 16px 0 16px", fontSize: 12, color: DK.t3 }}>Đang hiện {LIST_MAX} / {hits.length} món — gõ tên để tìm nhanh hơn</span>}
        </>
      )}
    </>
  );
}

export function PendingFoodsScreen({ onBack, isAdmin, showToast }) {
  const [confirm, dialog] = useConfirm();
  const [tab, setTab] = useState("pending");
  const [pending, setPending] = useState([]);
  const [pLoading, setPLoading] = useState(true);
  const [pErr, setPErr] = useState(false);
  const [approvedCount, setApprovedCount] = useState(null);
  const [approved, setApproved] = useState(null); // null = chưa tải
  const [aLoading, setALoading] = useState(false);
  const [aErr, setAErr] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [qA, setQA] = useState("");
  const [qL, setQL] = useState("");
  const localCount = getFoodCount();

  const toast = (text) => (showToast ? showToast({ text }) : confirm({ title: text, alert: true, ok: "Đóng" }));

  const loadPending = useCallback(async () => {
    if (!isAdmin) { setPLoading(false); return; }
    setPLoading(true); setPErr(false);
    const { data, error } = await supabase.from("food_cache_pending").select("*").order("created_at", { ascending: false });
    if (error) { console.error("Load all pending food error:", error); setPErr(true); }
    else setPending(data || []);
    setPLoading(false);
  }, [isAdmin]);

  const loadApprovedCount = useCallback(async () => {
    if (!isAdmin) return;
    const { count, error } = await supabase.from("food_cache").select("*", { count: "exact", head: true });
    if (error) { console.error("Count food_cache error:", error); return; }
    setApprovedCount(count || 0);
  }, [isAdmin]);

  const loadApproved = useCallback(async () => {
    if (!isAdmin) return;
    setALoading(true); setAErr(false);
    const { data, error } = await supabase.from("food_cache").select("*").order("food_name");
    if (error) { console.error("Load food_cache list error:", error); setAErr(true); }
    else setApproved(data || []);
    setALoading(false);
  }, [isAdmin]);

  useEffect(() => { loadPending(); loadApprovedCount(); }, [loadPending, loadApprovedCount]);
  useEffect(() => { if (tab === "approved" && approved === null && !aLoading && !aErr) loadApproved(); }, [tab, approved, aLoading, aErr, loadApproved]);

  const approve = async (row) => {
    setBusyId(row.id);
    try {
      const { error: upErr } = await supabase.from("food_cache").upsert({
        food_name: row.food_name, gram: row.gram || 100,
        protein: row.protein || 0, carb: row.carb || 0, fat: row.fat || 0,
        fiber: row.fiber || 0, cal: row.cal || 0, ai_provider: row.ai_provider || "unknown",
      }, { onConflict: "food_name,gram" });
      if (upErr) { console.error("Approve → food_cache error:", upErr); toast("Duyệt không được, kiểm tra mạng rồi thử lại."); setBusyId(null); return; }
      const { error: delErr } = await supabase.from("food_cache_pending").delete().eq("id", row.id);
      if (delErr) console.error("Approve delete pending error:", delErr);
      setPending((prev) => prev.filter((p) => p.id !== row.id));
      setApprovedCount((n) => (n == null ? n : n + 1));
      setApproved(null); // tải lại danh sách đã duyệt khi mở tab
      toast(delErr ? `Đã duyệt “${row.food_name}” (chưa xoá được khỏi hàng chờ)` : `Đã duyệt “${row.food_name}”`);
    } catch (e) { console.error("Approve pending food error:", e); toast("Duyệt không được, kiểm tra mạng rồi thử lại."); }
    setBusyId(null);
  };

  const reject = async (row) => {
    const ok = await confirm({ title: `Từ chối “${row.food_name}”?`, text: "Món bị xoá khỏi hàng chờ, không đưa vào kho chung.", ok: "Từ chối", danger: true });
    if (!ok) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase.from("food_cache_pending").delete().eq("id", row.id);
      if (error) { console.error("Reject pending food error:", error); toast("Từ chối không được, kiểm tra mạng rồi thử lại."); setBusyId(null); return; }
      setPending((prev) => prev.filter((p) => p.id !== row.id));
      toast(`Đã từ chối “${row.food_name}”`);
    } catch (e) { console.error("Reject pending food error:", e); toast("Từ chối không được, kiểm tra mạng rồi thử lại."); }
    setBusyId(null);
  };

  const approvedRows = useMemo(() => (approved || []).map((f, i) => ({ key: f.id || `${f.food_name}-${f.gram}-${i}`, name: f.food_name, gram: f.gram, cal: f.cal, _k: norm(f.food_name) })), [approved]);
  const localRows = useMemo(() => (tab === "local" ? getAllFoods().sort((a, b) => a.name.localeCompare(b.name, "vi")).map((f) => ({ key: f.name, name: f.name, gram: 100, cal: f.cal, _k: norm(f.name) })) : []), [tab]);

  const pendingN = pLoading && pending.length === 0 ? null : pending.length;
  const segOpts = [
    { value: "pending", label: pendingN != null ? `Chờ duyệt · ${pendingN}` : "Chờ duyệt", testid: "adm-pending-tab-pending" },
    { value: "approved", label: "Đã duyệt", testid: "adm-pending-tab-approved" },
    { value: "local", label: "Kho gốc", testid: "adm-pending-tab-local" },
  ];

  return (
    <SubPage dark title="Duyệt món AI tính" subtitle="Món lạ user nhập — duyệt trước khi dùng chung" onBack={onBack}>
      <div data-testid="adm-pending">
        {!isAdmin ? <Empty>Chỉ Admin mới xem được trang này.</Empty> : (
          <>
            <Tiles>
              <Tile n={pendingN} label="Chờ duyệt" color={DK.amber} testid="adm-pending-n" />
              <Tile n={approvedCount == null ? null : approvedCount.toLocaleString("vi-VN")} label="Đã duyệt" color={DK.green} />
              <Tile n={localCount.toLocaleString("vi-VN")} label="Kho gốc" color={DK.t2} />
            </Tiles>
            <div style={{ margin: "14px 12px 0 12px" }}>
              <Seg dark size="sm" mode="tab" ariaLabel="Danh sách món" opts={segOpts} value={tab} onChange={setTab} />
            </div>

            {tab === "pending" && (
              pLoading && pending.length === 0 ? <Loading rows={2} /> : pErr ? <ErrorBox onRetry={loadPending} /> : pending.length === 0 ? <Empty testid="adm-pending-empty">Không có món nào đang chờ duyệt</Empty> : (
                <div style={{ margin: "12px 12px 0 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {pending.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <Card key={row.id} testid="adm-pending-item" pad="14px" style={{ margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, overflowWrap: "anywhere" }}>{row.food_name}</span>
                            <span style={{ fontSize: 12, color: DK.t3 }}>{provLabel(row.ai_provider)} · {nf(row.gram)} g</span>
                          </span>
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                            <span style={{ fontSize: 20, fontWeight: 900 }}>{Math.round(Number(row.cal) || 0)}</span>
                            <span style={{ fontSize: 11, color: DK.t3 }}>kcal</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <Pill>Đ {nf(row.protein)} g</Pill>
                          <Pill>TB {nf(row.carb)} g</Pill>
                          <Pill>B {nf(row.fat)} g</Pill>
                          <Pill>Xơ {nf(row.fiber)} g</Pill>
                        </div>
                        <BtnRow>
                          <Btn kind="red" flex={1} disabled={busy} onClick={() => reject(row)} testid="adm-pending-reject">Từ chối</Btn>
                          <Btn kind="green" flex={2} disabled={busy} onClick={() => approve(row)} testid="adm-pending-approve">
                            {busy ? "Đang lưu..." : <>{Icon.check(16, 2.6)}Duyệt vào kho chung</>}
                          </Btn>
                        </BtnRow>
                      </Card>
                    );
                  })}
                </div>
              )
            )}

            {tab === "approved" && (
              <FoodList rows={approvedRows} loading={aLoading || (approved === null && !aErr)} err={aErr} onRetry={loadApproved}
                q={qA} setQ={setQA} empty="Chưa có món nào được duyệt" testid="adm-pending-approved" />
            )}
            {tab === "local" && (
              <FoodList rows={localRows} loading={false} err={false} q={qL} setQ={setQL} empty="Kho gốc trống" testid="adm-pending-local" />
            )}
          </>
        )}
        <div style={{ height: 24 }} />
      </div>
      {dialog}
    </SubPage>
  );
}
