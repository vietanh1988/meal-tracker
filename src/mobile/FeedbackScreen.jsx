// Màn Tôi › Góp ý & báo lỗi (bản vẽ GopY):
//  - Góp ý / Báo lỗi (chọn chỗ lỗi), mô tả, đính kèm 1 ảnh chụp màn hình (nén JPEG, lưu vào user_feedback.image_url)
//  - Danh sách đã gửi + trả lời của admin
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtVN, toVNDate } from "../lib/dateVN";
import { GRAD_BLUE, Seg } from "./ui";
import { DK, dkCard } from "../theme";

const BUG_CATS = [["ai_menu", "AI thực đơn"], ["photo", "Chụp ảnh"], ["ai_chat", "AI Chat"], ["ui", "Giao diện"], ["other", "Khác"]];
const CAT_NAME = { suggestion: "Góp ý", bug: "Báo lỗi", ...Object.fromEntries(BUG_CATS.map(([k, v]) => [k, `Lỗi · ${v}`])) };
const MAX_LEN = 1000;
// Nền tối (bản vẽ 48)
const lbl = { fontSize: 11, fontWeight: 700, color: DK.t3, letterSpacing: "0.08em" };

// Nén ảnh: cạnh dài ≤ 1000px, JPEG; quá ~350 KB thì nén thêm
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const draw = (max, q) => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        return c.toDataURL("image/jpeg", q);
      };
      let out = draw(1000, 0.7);
      if (out.length > 350_000) out = draw(720, 0.6);
      URL.revokeObjectURL(url);
      out.length > 500_000 ? reject(new Error("Ảnh quá lớn")) : resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Không đọc được ảnh")); };
    img.src = url;
  });
}

export function FeedbackScreen({ user, showToast }) {
  const userId = user?.id;
  const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "";
  const [mode, setMode] = useState("bug");
  const [cat, setCat] = useState("ai_menu");
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [list, setList] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase.from("user_feedback").select("id,category,content,image_url,status,admin_reply,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    setList(data || []);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr("");
    try { setImage(await compressImage(f)); } catch (x) { setErr(x.message); }
  };

  const send = async () => {
    const content = text.trim();
    if (!content || busy || !userId) return;
    setBusy(true); setErr("");
    const { error } = await supabase.from("user_feedback").insert({ user_id: userId, username, category: mode === "bug" ? cat : "suggestion", content, image_url: image || null });
    setBusy(false);
    if (error) { setErr("Gửi chưa được: " + error.message); return; }
    setText(""); setImage(null);
    showToast?.({ text: mode === "bug" ? "Đã gửi báo lỗi. Cảm ơn bạn!" : "Đã gửi góp ý. Cảm ơn bạn!" }, 2500);
    load();
  };

  const chip = (on) => ({ height: 36, padding: "0 12px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: on ? 800 : 600, border: `1.5px solid ${on ? "#FFFFFF" : DK.chipLine}`, background: on ? "#FFFFFF" : DK.chip, color: on ? "#0040E0" : DK.t2 });
  const can = !!text.trim() && !busy;

  return (
    <div style={{ paddingBottom: 32 }}>
      <Seg dark mode="tab" style={{ margin: "12px 12px 0 12px" }} value={mode} onChange={setMode} opts={[{ value: "suggestion", label: "Góp ý", testid: "fb-mode-suggestion" }, { value: "bug", label: "Báo lỗi", testid: "fb-mode-bug" }]} />

      <div style={{ ...dkCard, margin: "12px 12px 0 12px", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "bug" && (
          <>
            <span style={lbl}>LỖI Ở ĐÂU?</span>
            <div role="group" aria-label="Lỗi ở đâu" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {BUG_CATS.map(([k, v]) => <button key={k} data-testid={`fb-cat-${k}`} aria-pressed={cat === k} onClick={() => setCat(k)} style={chip(cat === k)}>{v}</button>)}
            </div>
          </>
        )}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={lbl}>{mode === "bug" ? "MÔ TẢ" : "NỘI DUNG"}</span>
          <textarea data-testid="fb-text" value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
            placeholder={mode === "bug" ? "Bạn đang làm gì thì gặp lỗi? Lỗi hiện ra thế nào?" : "Bạn muốn app có thêm gì, hay sửa chỗ nào?"}
            style={{ height: 120, padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${DK.fieldLine}`, background: DK.field, fontFamily: "inherit", fontSize: 16, color: DK.t1, resize: "none", boxSizing: "border-box" }} />
          <span style={{ fontSize: 11, color: DK.t3, textAlign: "right" }}>{text.length} / {MAX_LEN}</span>
        </label>
        <input ref={fileRef} data-testid="fb-file" type="file" accept="image/*" onChange={pick} style={{ display: "none" }} />
        {image ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img data-testid="fb-preview" src={image} alt="Ảnh đính kèm" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: "1px solid #E2E8F0" }} />
            <span style={{ flex: 1, fontSize: 13, color: DK.t2 }}>Đã đính kèm 1 ảnh</span>
            <button data-testid="fb-image-remove" onClick={() => setImage(null)} style={{ height: 36, padding: "0 10px", border: "none", background: "transparent", color: DK.red, fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>Bỏ ảnh</button>
          </div>
        ) : (
          <button data-testid="fb-attach" onClick={() => fileRef.current?.click()} style={{ height: 48, borderRadius: 12, border: "1.5px dashed rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.06)", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: DK.t1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M21 16l-5-5-8 8" /></svg>
            Đính kèm ảnh chụp màn hình
          </button>
        )}
        {err && <span style={{ fontSize: 13, color: DK.red }}>{err}</span>}
        <button data-testid="fb-send" disabled={!can} onClick={send} style={{ height: 50, borderRadius: 14, border: "none", background: can ? GRAD_BLUE : "rgba(255,255,255,0.18)", color: "#FFFFFF", fontFamily: "inherit", fontSize: 15, fontWeight: 900 }}>
          {busy ? "Đang gửi…" : mode === "bug" ? "Gửi báo lỗi" : "Gửi góp ý"}
        </button>
      </div>

      <span style={{ display: "block", padding: "18px 16px 6px 16px", ...lbl }}>ĐÃ GỬI</span>
      {list && list.length === 0 && (
        <div style={{ ...dkCard, margin: "0 12px", borderRadius: 16, padding: 16, fontSize: 13, color: DK.t2, textAlign: "center" }}>Bạn chưa gửi góp ý nào. Admin trả lời sẽ hiện ở đây và trong Thông báo.</div>
      )}
      {list && list.length > 0 && (
        <div data-testid="fb-list" style={{ margin: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((f) => (
            <div key={f.id} style={{ ...dkCard, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: DK.link }}>{CAT_NAME[f.category] || f.category}</span>
                <span style={{ flex: 1, fontSize: 12, color: DK.t3 }}>{f.created_at ? fmtVN(toVNDate(new Date(f.created_at)), true) : ""}</span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, color: f.admin_reply ? DK.green : DK.amber, background: f.admin_reply ? "rgba(0,200,150,0.18)" : "rgba(245,158,11,0.18)" }}>{f.admin_reply ? "Đã trả lời" : "Đang xem"}</span>
              </div>
              <span style={{ fontSize: 14, color: DK.t1, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{f.content}</span>
              {f.image_url && /^data:image\//.test(f.image_url) && <img src={f.image_url} alt="Ảnh đính kèm" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid #E2E8F0" }} />}
              {f.admin_reply && (
                <div style={{ marginTop: 2, padding: "10px 12px", borderRadius: 12, background: "rgba(0,200,150,0.14)", borderLeft: "3px solid #4ADE9B" }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: DK.green, marginBottom: 2 }}>Fipilot trả lời</span>
                  <span style={{ fontSize: 13, color: DK.t2, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{f.admin_reply}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
