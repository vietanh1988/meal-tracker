// Quản trị PC › Gói cước & giới hạn. Cùng dữ liệu & ghi DB với tab cũ src/adminTabs/SubscriptionSettingsTab.jsx:
//  bảng subscription_settings (1 dòng id = 1), Lưu = upsert đủ các cột như tab cũ.
//  - Thẻ "Lượt AI theo gói": bảng 4 dòng (macro / tháng, chat / ngày, thực đơn / ngày, chụp ảnh / tháng) × 3 cột Free · Trial · Premium.
//    Free không có ô "thực đơn" (khoá hẳn với Free, như tab cũ — giá trị cũ vẫn giữ khi lưu). Trial/Premium = trần chống lạm dụng.
//  - Thẻ "Dùng thử": số ngày dùng thử, số ngày ân hạn sau hết hạn.
//  - Thẻ "Giá gói Premium": 1 / 3 / 6 / 12 tháng (bỏ trống = null) · thẻ "Thông tin chuyển khoản" (hiện cho user).
//  - Chỉ Super Admin lưu được; admin thường chỉ xem (dải vàng, ô khoá).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { appAlert } from "../lib/dialog";
import { PC } from "../theme";
import { Btn, Card, ErrorBox, Loading, headRow, bodyRow, cell, vnd } from "./pcUI";

const DEFAULTS = {
  free_ai_macro_limit: 100, free_ai_chat_limit: 20, free_ai_menu_limit: 5, free_ai_photo_limit: 30,
  trial_ai_macro_limit: 500, trial_ai_chat_limit: 100, trial_ai_menu_limit: 30, trial_ai_photo_limit: 100,
  premium_ai_macro_limit: 1000, premium_ai_chat_limit: 150, premium_ai_menu_limit: 50, premium_ai_photo_limit: 300,
  trial_days: 90, grace_period_days: 3,
  price_1m: null, price_3m: null, price_6m: null, price_12m: null,
  bank_name: "", bank_account: "", bank_account_name: "",
};
const LIMITS = [
  { k: "macro", label: "AI tính macro", per: "/ tháng" },
  { k: "chat", label: "AI Chat", per: "/ ngày" },
  { k: "menu", label: "AI tạo thực đơn", per: "/ ngày", freeLocked: true },
  { k: "photo", label: "AI chụp ảnh", per: "/ tháng" },
];
const TIERS = [
  { k: "free", label: "FREE", note: "User chưa nâng cấp" },
  { k: "trial", label: "TRIAL", note: "Trần chống lạm dụng" },
  { k: "premium", label: "PREMIUM", note: "Trần chống lạm dụng" },
];
const PRICES = [{ k: "price_1m", label: "Gói 1 tháng", m: 1, ph: "VD: 69000" }, { k: "price_3m", label: "Gói 3 tháng", m: 3, ph: "VD: 297000" }, { k: "price_6m", label: "Gói 6 tháng", m: 6, ph: "VD: 474000" }, { k: "price_12m", label: "Gói 12 tháng", m: 12, ph: "VD: 708000" }];
const LIM_COLS = "1.3fr 1fr 1fr 1fr";
const lbl = { fontSize: 12, fontWeight: 800, color: PC.t3 };

function Field({ value, onChange, readOnly, testid, placeholder, numeric = true, label, width = "100%" }) {
  return (
    <input data-testid={testid} className="pc-num" aria-label={label} value={value ?? ""} placeholder={placeholder} readOnly={readOnly}
      inputMode={numeric ? "numeric" : undefined}
      onFocus={numeric && !readOnly ? (e) => e.target.select() : undefined}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/[^\d]/g, "") : e.target.value)}
      style={{ width, minWidth: 0, height: 36, borderRadius: 10, background: readOnly ? "#F8FAFC" : "#FFFFFF", border: `1px solid ${PC.field}`, padding: "0 12px", fontSize: 13, fontWeight: numeric ? 800 : 600, fontFamily: "inherit", color: PC.t1, cursor: readOnly ? "default" : "text" }} />
  );
}

function CardHead({ title, sub }) {
  return (
    <div style={{ padding: "14px 16px 12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 14, fontWeight: 900 }}>{title}</span>
      {sub && <span style={{ fontSize: 12, color: PC.t3 }}>{sub}</span>}
    </div>
  );
}

// Dòng form 2 cột: nhãn trái 12/800 #64748B, ô nhập phải
function FormRow({ label, hint, children, last }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "center", padding: "10px 16px", borderBottom: last ? "none" : `1px solid ${PC.rowLine}` }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={lbl}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: PC.t4 }}>{hint}</span>}
      </span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

export function PcSubscription({ top, isAdmin = true, isSuperAdmin, showToast }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ro = !isSuperAdmin;

  const load = useCallback(async () => {
    setLoading(true); setLoadErr(null);
    try {
      const { data, error } = await supabase.from("subscription_settings").select("*").eq("id", 1).single();
      // Chưa có dòng id = 1 (PGRST116) → dùng số mặc định như tab cũ; lỗi khác → báo lỗi, không cho lưu đè bằng số mặc định
      if (error && error.code !== "PGRST116") { console.error("Load subscription_settings error:", error); setLoadErr(error.message || "Lỗi tải"); setForm(null); }
      else setForm(data || { ...DEFAULTS });
    } catch (e) { console.error("Load subscription_settings error:", e); setLoadErr(e.message || "Lỗi tải"); setForm(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (key, value) => { setSaved(false); setForm((prev) => ({ ...prev, [key]: value })); };

  const handleSave = async () => {
    if (!isAdmin || !isSuperAdmin) { appAlert("Chỉ Super Admin mới sửa được cài đặt này"); return; }
    if (!form) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("subscription_settings").upsert({
        id: 1,
        free_ai_macro_limit: Number(form.free_ai_macro_limit) || 0,
        free_ai_chat_limit: Number(form.free_ai_chat_limit) || 0,
        free_ai_menu_limit: Number(form.free_ai_menu_limit) || 0,
        free_ai_photo_limit: Number(form.free_ai_photo_limit) || 0,
        trial_ai_macro_limit: Number(form.trial_ai_macro_limit) || 0,
        trial_ai_chat_limit: Number(form.trial_ai_chat_limit) || 0,
        trial_ai_menu_limit: Number(form.trial_ai_menu_limit) || 0,
        trial_ai_photo_limit: Number(form.trial_ai_photo_limit) || 0,
        premium_ai_macro_limit: Number(form.premium_ai_macro_limit) || 0,
        premium_ai_chat_limit: Number(form.premium_ai_chat_limit) || 0,
        premium_ai_menu_limit: Number(form.premium_ai_menu_limit) || 0,
        premium_ai_photo_limit: Number(form.premium_ai_photo_limit) || 0,
        trial_days: Number(form.trial_days) || 0,
        grace_period_days: Number(form.grace_period_days) || 0,
        price_1m: form.price_1m ? Number(form.price_1m) : null,
        price_3m: form.price_3m ? Number(form.price_3m) : null,
        price_6m: form.price_6m ? Number(form.price_6m) : null,
        price_12m: form.price_12m ? Number(form.price_12m) : null,
        bank_name: form.bank_name || "",
        bank_account: form.bank_account || "",
        bank_account_name: form.bank_account_name || "",
        updated_at: new Date().toISOString(),
      });
      if (error) { console.error("Save subscription_settings error:", error); appAlert("Lưu thất bại: " + error.message); }
      else { setSaved(true); if (showToast) showToast({ text: "Đã lưu cài đặt gói cước" }); }
    } catch (e) { console.error("Save subscription_settings error:", e); appAlert("Lưu thất bại: " + (e.message || e)); }
    setSaving(false);
  };

  const saveBtn = <Btn kind="blue" onClick={handleSave} disabled={saving || ro || !form} testid="pc-subscription_settings-save" title={ro ? "Chỉ Super Admin mới lưu được" : undefined}>{saving ? "Đang lưu…" : "Lưu cài đặt"}</Btn>;

  return (
    <>
      {top(saveBtn)}
      <div data-testid="pc-subscription_settings" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {ro && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới sửa được giá gói và giới hạn.</div>}
        {saved && <div data-testid="pc-subscription_settings-saved" role="status" style={{ fontSize: 12, fontWeight: 700, color: "#166534", background: "#DCFCE7", borderRadius: 10, padding: "8px 12px" }}>Đã lưu cài đặt gói cước — áp dụng chung cho mọi user cùng gói.</div>}
        {loadErr ? <ErrorBox text={`Chưa tải được cài đặt gói cước: ${loadErr}`} onRetry={load} />
          : loading || !form ? <Card><Loading /></Card>
          : <>
            <Card testid="pc-sub-limits">
              <CardHead title="Lượt AI theo gói" sub="Áp dụng chung cho tất cả user cùng gói. Trial / Premium là trần cao để chặn lỗi lặp hoặc lạm dụng — chỉ báo khi thật sự chạm trần." />
              <div style={{ ...headRow(LIM_COLS), borderRadius: 0, height: "auto", minHeight: 38, padding: "6px 16px" }}>
                <span>TÍNH NĂNG</span>
                {TIERS.map((t) => <span key={t.k} style={{ display: "flex", flexDirection: "column" }}><span>{t.label}</span><span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0, color: PC.t4 }}>{t.note}</span></span>)}
              </div>
              {LIMITS.map((l, i) => {
                const last = i === LIMITS.length - 1;
                return (
                  <div key={l.k} data-testid={`pc-sub-limit-${l.k}`} style={{ ...bodyRow(LIM_COLS), minHeight: 52, borderBottom: last ? "none" : bodyRow(LIM_COLS).borderBottom }}>
                    <span style={{ ...cell, fontWeight: 700, fontSize: 13 }}>{l.label} <span style={{ fontWeight: 600, color: PC.t3 }}>{l.per}</span></span>
                    {TIERS.map((t) => {
                      const key = `${t.k}_ai_${l.k}_limit`;
                      if (t.k === "free" && l.freeLocked) return <span key={key} data-testid="pc-sub-free-menu-locked" style={{ ...cell, fontSize: 12, color: PC.t3 }} title="AI tạo thực đơn khoá hẳn với Free — chỉ Trial / Premium">Khoá với Free</span>;
                      return <span key={key} style={{ minWidth: 0 }}><Field testid={`pc-sub-${key}`} label={`${t.label} · ${l.label} ${l.per}`} value={form[key]} onChange={(v) => set(key, v)} readOnly={ro} /></span>;
                    })}
                  </div>
                );
              })}
              <div style={{ height: 6 }} />
            </Card>

            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <Card testid="pc-sub-trial" style={{ flex: 1, minWidth: 0 }}>
                <CardHead title="Gói dùng thử (Trial)" sub="Đủ quyền Premium trong thời gian này" />
                <div style={{ borderTop: `1px solid ${PC.rowLine}` }}>
                  <FormRow label="Thời gian dùng thử (ngày)">
                    <Field testid="pc-sub-trial_days" label="Thời gian dùng thử (ngày)" value={form.trial_days} onChange={(v) => set("trial_days", v)} readOnly={ro} width={160} />
                  </FormRow>
                  <FormRow label="Ân hạn sau hết hạn (ngày)" hint="Số ngày còn dùng tiếp sau khi gói hết hạn" last>
                    <Field testid="pc-sub-grace_period_days" label="Ân hạn sau hết hạn (ngày)" value={form.grace_period_days} onChange={(v) => set("grace_period_days", v)} readOnly={ro} width={160} />
                  </FormRow>
                </div>
              </Card>

              <Card testid="pc-sub-bank" style={{ flex: 1, minWidth: 0 }}>
                <CardHead title="Thông tin chuyển khoản" sub="Hiện cho user khi nâng cấp / gia hạn" />
                <div style={{ borderTop: `1px solid ${PC.rowLine}` }}>
                  <FormRow label="Ngân hàng"><Field numeric={false} testid="pc-sub-bank_name" label="Ngân hàng" placeholder="Ngân hàng" value={form.bank_name} onChange={(v) => set("bank_name", v)} readOnly={ro} /></FormRow>
                  <FormRow label="Số tài khoản"><Field numeric={false} testid="pc-sub-bank_account" label="Số tài khoản" placeholder="Số tài khoản" value={form.bank_account} onChange={(v) => set("bank_account", v)} readOnly={ro} /></FormRow>
                  <FormRow label="Chủ tài khoản" last><Field numeric={false} testid="pc-sub-bank_account_name" label="Chủ tài khoản" placeholder="Chủ tài khoản" value={form.bank_account_name} onChange={(v) => set("bank_account_name", v)} readOnly={ro} /></FormRow>
                </div>
              </Card>
            </div>

            <Card testid="pc-sub-prices">
              <CardHead title="Giá gói Premium" sub="User tự chọn khi nâng cấp / gia hạn" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, padding: "0 16px 16px 16px" }}>
                {PRICES.map((p) => {
                  const n = Number(form[p.k]) || 0;
                  return (
                    <div key={p.k} style={{ border: `1px solid ${PC.field}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800 }}>{p.label}</span>
                      <span style={lbl}>Tổng tiền (VNĐ)</span>
                      <Field testid={`pc-sub-${p.k}`} label={`${p.label} · tổng tiền (VNĐ)`} placeholder={p.ph} value={form[p.k]} onChange={(v) => set(p.k, v)} readOnly={ro} />
                      <span style={{ fontSize: 12, color: PC.t3, minHeight: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n > 0 ? `${vnd(n)}${p.m > 1 ? ` · ≈ ${vnd(n / p.m)} / tháng` : ""}` : "Chưa đặt giá"}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>}
      </div>
    </>
  );
}
