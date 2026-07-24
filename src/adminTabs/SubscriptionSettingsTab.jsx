import { useState, useEffect } from "react";
import { ReadOnlyBanner } from "./ReadOnlyBanner";
import { appAlert, appConfirm } from "../lib/dialog";
import { supabase } from "../lib/supabase";
import { C, card, inp, redBtn, numFix } from "../theme";

export function SubscriptionSettingsTab({ isAdmin, isSuperAdmin }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("subscription_settings").select("*").eq("id", 1).single();
        if (error) { console.error("Load subscription_settings error:", error); }
        setForm(data || {
          free_ai_macro_limit: 100, free_ai_chat_limit: 20, free_ai_menu_limit: 5, free_ai_photo_limit: 30,
          trial_ai_macro_limit: 500, trial_ai_chat_limit: 100, trial_ai_menu_limit: 30, trial_ai_photo_limit: 100,
          premium_ai_macro_limit: 1000, premium_ai_chat_limit: 150, premium_ai_menu_limit: 50, premium_ai_photo_limit: 300,
          trial_days: 90, grace_period_days: 3,
          price_3m: null, price_6m: null, price_12m: null,
          bank_name: "", bank_account: "", bank_account_name: "",
        });
      } catch (e) { console.error("Load subscription_settings error:", e); }
      setLoading(false);
    })();
  }, []);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!isAdmin) { appAlert("Chỉ Admin mới sửa được cài đặt này"); return; }
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
        price_3m: form.price_3m ? Number(form.price_3m) : null,
        price_6m: form.price_6m ? Number(form.price_6m) : null,
        price_12m: form.price_12m ? Number(form.price_12m) : null,
        bank_name: form.bank_name || "",
        bank_account: form.bank_account || "",
        bank_account_name: form.bank_account_name || "",
        updated_at: new Date().toISOString(),
      });
      if (error) { console.error("Save subscription_settings error:", error); appAlert("Lưu thất bại: " + error.message); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error("Save subscription_settings error:", e); }
    setSaving(false);
  };

  if (loading || !form) return <div style={card}>
      {!isSuperAdmin && <ReadOnlyBanner />}Đang tải...</div>;

  return (
    <div style={{ ...card, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, marginBottom: 4 }}>Cài đặt gói cước</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2, marginBottom: 20 }}>Áp dụng chung cho tất cả user cùng gói</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, marginBottom: 20 }}>

        <div style={{ background: C.surface, borderRadius: 14, border: `1.5px solid ${C.border}`, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 4 }}>🆓 Giới hạn gói Free</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>Áp dụng cho user chưa nâng cấp</div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl_style(C)}>AI tính macro / tháng</div>
            <input type="number" {...numFix} value={form.free_ai_macro_limit ?? ""} onChange={e => set("free_ai_macro_limit", e.target.value)} style={inp} />
          </div>
          <div>
            <div style={lbl_style(C)}>AI Chat / ngày</div>
            <input type="number" {...numFix} value={form.free_ai_chat_limit ?? ""} onChange={e => set("free_ai_chat_limit", e.target.value)} style={inp} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={lbl_style(C)}>📸 AI chụp ảnh / tháng</div>
            <input type="number" {...numFix} value={form.free_ai_photo_limit ?? ""} onChange={e => set("free_ai_photo_limit", e.target.value)} style={inp} />
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 12, fontStyle: "italic" }}>🍽️ AI tạo thực đơn: khoá hẳn với Free — chỉ Trial/Premium (xem card bên)</div>
        </div>

        <div style={{ background: C.surface, borderRadius: 14, border: `1.5px solid #F59E0B`, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 4 }}>⏳ Gói Dùng thử (Trial)</div>
          <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>Full quyền Premium trong thời gian này</div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl_style(C)}>Thời gian dùng thử (ngày)</div>
            <input type="number" {...numFix} value={form.trial_days ?? ""} onChange={e => set("trial_days", e.target.value)} style={inp} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl_style(C)}>Grace period sau hết hạn (ngày)</div>
            <input type="number" {...numFix} value={form.grace_period_days ?? ""} onChange={e => set("grace_period_days", e.target.value)} style={inp} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", margin: "12px 0 8px", textTransform: "uppercase" }}>Trần chống lạm dụng (không hiển thị như giới hạn)</div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl_style(C)}>AI tính macro / tháng</div>
            <input type="number" {...numFix} value={form.trial_ai_macro_limit ?? ""} onChange={e => set("trial_ai_macro_limit", e.target.value)} style={inp} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={lbl_style(C)}>🍽️ AI tạo thực đơn / ngày</div>
            <input type="number" {...numFix} value={form.trial_ai_menu_limit ?? ""} onChange={e => set("trial_ai_menu_limit", e.target.value)} style={inp} />
          </div>
          <div>
            <div style={lbl_style(C)}>AI Chat / ngày</div>
            <input type="number" {...numFix} value={form.trial_ai_chat_limit ?? ""} onChange={e => set("trial_ai_chat_limit", e.target.value)} style={inp} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={lbl_style(C)}>📸 AI chụp ảnh / tháng</div>
            <input type="number" {...numFix} value={form.trial_ai_photo_limit ?? ""} onChange={e => set("trial_ai_photo_limit", e.target.value)} style={inp} />
          </div>
        </div>

      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1.5px solid #10B981`, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 4 }}>⭐ Trần chống lạm dụng — Premium</div>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>User trả phí không giới hạn thương mại, nhưng vẫn cần trần cao để chặn bug loop/lạm dụng — không hiện cảnh báo trừ khi thật sự chạm trần</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          <div>
            <div style={lbl_style(C)}>AI tính macro / tháng</div>
            <input type="number" {...numFix} value={form.premium_ai_macro_limit ?? ""} onChange={e => set("premium_ai_macro_limit", e.target.value)} style={inp} />
          </div>
          <div>
            <div style={lbl_style(C)}>🍽️ AI tạo thực đơn / ngày</div>
            <input type="number" {...numFix} value={form.premium_ai_menu_limit ?? ""} onChange={e => set("premium_ai_menu_limit", e.target.value)} style={inp} />
          </div>
          <div>
            <div style={lbl_style(C)}>AI Chat / ngày</div>
            <input type="number" {...numFix} value={form.premium_ai_chat_limit ?? ""} onChange={e => set("premium_ai_chat_limit", e.target.value)} style={inp} />
          </div>
          <div>
            <div style={lbl_style(C)}>📸 AI chụp ảnh / tháng</div>
            <input type="number" {...numFix} value={form.premium_ai_photo_limit ?? ""} onChange={e => set("premium_ai_photo_limit", e.target.value)} style={inp} />
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 14, border: `1.5px solid ${C.border}`, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, marginBottom: 4 }}>⭐ Giá gói Premium</div>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>User tự chọn khi nâng cấp / gia hạn</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Gói 3 tháng</div>
            <div style={lbl_style(C)}>Tổng tiền (VNĐ)</div>
            <input type="number" {...numFix} placeholder="VD: 297000" value={form.price_3m ?? ""} onChange={e => set("price_3m", e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Gói 6 tháng</div>
            <div style={lbl_style(C)}>Tổng tiền (VNĐ)</div>
            <input type="number" {...numFix} placeholder="VD: 474000" value={form.price_6m ?? ""} onChange={e => set("price_6m", e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
          <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Gói 12 tháng</div>
            <div style={lbl_style(C)}>Tổng tiền (VNĐ)</div>
            <input type="number" {...numFix} placeholder="VD: 708000" value={form.price_12m ?? ""} onChange={e => set("price_12m", e.target.value)} style={{ ...inp, marginTop: 4 }} />
          </div>
        </div>

        <div style={lbl_style(C)}>Thông tin chuyển khoản (hiện cho user)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 4 }}>
          <input placeholder="Ngân hàng" value={form.bank_name ?? ""} onChange={e => set("bank_name", e.target.value)} style={inp} />
          <input placeholder="Số tài khoản" value={form.bank_account ?? ""} onChange={e => set("bank_account", e.target.value)} style={inp} />
          <input placeholder="Chủ tài khoản" value={form.bank_account_name ?? ""} onChange={e => set("bank_account_name", e.target.value)} style={inp} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving||!isSuperAdmin} style={{ ...redBtn, marginTop: 20, background: "linear-gradient(135deg,#0EA5E9,#0284C7)", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Đang lưu..." : "💾 Lưu cài đặt"}
      </button>
      {saved && <div style={{ marginTop: 10, padding: "10px 14px", background: C.greenBg, borderRadius: 10, border: `1.5px solid ${C.green}`, fontSize: 13, fontWeight: 700, color: "#14532D" }}>✓ Đã lưu cài đặt gói cước</div>}
    </div>
  );
}

function lbl_style(C) {
  return { fontSize: 12, fontWeight: 600, color: C.t2, marginBottom: 4 };
}
