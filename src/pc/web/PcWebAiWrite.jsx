// Quản trị › Bài viết › "Viết bằng AI": nhập từ khoá + chuyên mục → AI viết theo bộ quy tắc nội dung v2.4.5 → lưu BẢN NHÁP rồi mở trình soạn để sửa / chọn ảnh / đăng.
// Gọi qua ai-proxy (feature "web_article", chỉ admin; khoá API nằm ở server, chi phí ghi vào Chi phí AI).
import { useState } from "react";
import { PC } from "../../theme";
import { Btn } from "../pcUI";
import { Modal, Field, inpStyle } from "./webUI";
import { authFetch } from "../../lib/authFetch";
import { pickAiModelFromSettings } from "../../lib/aiProvider";
import { WRITER_SYSTEM, buildUserPrompt, parseArticle, articleToPost, articleIssues } from "./aiWrite";
import { savePost, freeSlug, ensureAuthor } from "./webApi";

const LENS = [[1000, "Ngắn (~1.000 từ)"], [1600, "Vừa (~1.600 từ)"], [2200, "Dài (~2.200 từ)"]];
const PROV = [["claude", "Claude"], ["gemini", "Gemini"], ["gpt", "ChatGPT"]];

export function PcWebAiWrite({ cats, titles = [], appSettings, user, showToast, onClose, onDone }) {
  const [kw, setKw] = useState("");
  const [cat, setCat] = useState(cats[0]?.id || "");
  const [len, setLen] = useState(1600);
  const [notes, setNotes] = useState("");
  const [prov, setProv] = useState(appSettings?.ai_provider || "claude");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    if (!kw.trim() || busy) return;
    setBusy(true); setErr("");
    try {
      const catName = cats.find((c) => c.id === cat)?.name || "";
      const d = await authFetch("ai-proxy", {
        provider: prov, model: pickAiModelFromSettings(appSettings, prov), feature: "web_article",
        system: WRITER_SYSTEM, messages: [{ role: "user", content: buildUserPrompt({ keyword: kw, category: catName, notes, words: len, related: titles }) }],
        maxTokens: Math.round(len * 4.5) + 1500,
      });
      if (d?.error) throw new Error(d.error);
      const text = d?.text ?? d?.result ?? d?.content ?? "";
      const a = parseArticle(typeof text === "string" ? text : JSON.stringify(text));
      if (!a.md || a.md.length < 400) throw new Error("AI trả về bài quá ngắn hoặc sai định dạng — bấm viết lại.");
      const authors = await ensureAuthor(appSettings, user?.id);
      const post = articleToPost(a, { keyword: kw, termId: cat || null, authorId: authors?.[0]?.id || null });
      post.slug = await freeSlug(post.slug || "bai-viet-ai");
      const saved = await savePost(post, { reason: "ai", uid: user?.id });
      const warn = articleIssues(a, post.blocks);
      showToast?.(warn.length ? `Đã lưu nháp. Nên xem lại: ${warn.join(" · ")}` : "Đã viết xong, lưu thành bản nháp.");
      onDone?.(saved.id);
    } catch (e) { setErr(e.message || "Có lỗi khi gọi AI."); }
    setBusy(false);
  };

  return (
    <Modal title="Viết bài bằng AI" onClose={() => !busy && onClose()} width={600} testid="web-ai-modal"
      foot={<><Btn kind="light" onClick={onClose} disabled={busy}>Huỷ</Btn><Btn kind="blue" testid="web-ai-go" disabled={!kw.trim() || busy} onClick={run}>{busy ? "AI đang viết… (1–3 phút)" : "Viết bài"}</Btn></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Từ khoá chính" hint="Ví dụ: thực đơn giảm cân 7 ngày. AI tự lên dàn ý, tiêu đề, mô tả, đường dẫn.">
          <input data-testid="web-ai-kw" value={kw} onChange={(e) => setKw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} style={inpStyle()} placeholder="Nhập từ khoá…" disabled={busy} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Field label="Chuyên mục"><select data-testid="web-ai-cat" value={cat} onChange={(e) => setCat(e.target.value)} style={inpStyle()} disabled={busy}><option value="">Không chọn</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Độ dài"><select value={len} onChange={(e) => setLen(+e.target.value)} style={inpStyle()} disabled={busy}>{LENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          <Field label="AI viết"><select value={prov} onChange={(e) => setProv(e.target.value)} style={inpStyle()} disabled={busy}>{PROV.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        </div>
        <Field label="Dặn thêm (không bắt buộc)" hint="Ví dụ: nhắm người 40 tuổi, có bảng thực đơn 3 bữa, nhắc món miền Nam.">
          <textarea data-testid="web-ai-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inpStyle(80), padding: 10, resize: "vertical" }} disabled={busy} />
        </Field>
        <div style={{ fontSize: 12, color: PC.t3, lineHeight: 1.5 }}>Bài viết theo bộ quy tắc nội dung (sapo trả lời ngay, H2 rõ việc, bảng, 3–4 chỗ chèn ảnh, không gạch dài). Lưu thành <b>bản nháp</b> — anh xem, chọn ảnh vào các ô ảnh trống rồi mới đăng. Mỗi bài tốn phí API (xem ở Chi phí AI).</div>
        {err && <div role="alert" style={{ fontSize: 13, color: "#B91C1C", fontWeight: 700 }}>{err}</div>}
      </div>
    </Modal>
  );
}
