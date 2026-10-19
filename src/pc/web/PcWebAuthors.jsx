// Quản trị PC › WEB & BÀI VIẾT › Tác giả (bản vẽ 138l, E-E-A-T): danh sách tác giả · hồ sơ (ảnh chân dung, tên, đường dẫn,
// chức danh, kinh nghiệm, giới thiệu, chứng chỉ, link hồ sơ nơi khác sameAs, hộp tác giả cuối bài, người kiểm duyệt)
// · xem trước hộp tác giả · schema Person tự tạo. Lưu → web_authors.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { appConfirm } from "../../lib/dialog";
import { Btn, Card, ErrorBox, Loading } from "../pcUI";
import { Tog, Field, Lnk, inpStyle, BLUE } from "./webUI";
import { slugify } from "./webLib";
import { Upload } from "./BlockEdit";

const WEB = "https://fipilotai.com";
const must = ({ data, error }) => { if (error) throw error; return data; };
const BLANK = { id: null, name: "", slug: "", job_title: "", experience: "", bio: "", avatar_url: "", credentials: [], same_as: [""], show_box: true, is_reviewer: false };
const H = ({ t, r }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PC.headLine}` }}><b style={{ fontSize: 13.5 }}>{t}</b><span style={{ marginLeft: "auto" }}>{r}</span></div>;
const ini = (n) => (n || "?").trim().split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase();
const Av = ({ a, s }) => (a.avatar_url ? <img src={a.avatar_url} alt="" style={{ width: s, height: s, borderRadius: s / 2, objectFit: "cover", flexShrink: 0 }} /> : <span style={{ width: s, height: s, borderRadius: s / 2, background: BLUE, color: "#FFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: s / 3, flexShrink: 0 }}>{ini(a.name)}</span>);

export function PcWebAuthors({ top, showToast, user, appSettings }) {
  const [list, setList] = useState(null);
  const [cnt, setCnt] = useState({});
  const [err, setErr] = useState("");
  const [f, setF] = useState(null);
  const [cred, setCred] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async (keepId) => {
    try {
      const [a, p] = await Promise.all([supabase.from("web_authors").select("*").order("created_at").then(must), supabase.from("web_posts").select("author_id").eq("kind", "post").neq("status", "trash").limit(5000).then(must)]);
      const c = {}; for (const r of p) if (r.author_id) c[r.author_id] = (c[r.author_id] || 0) + 1;
      setList(a); setCnt(c);
      const cur = a.find((x) => x.id === keepId) || a[0];
      if (cur) setF({ ...BLANK, ...cur, same_as: cur.same_as?.length ? cur.same_as : [""], credentials: cur.credentials || [] });
      else { let ab = {}; try { ab = JSON.parse(appSettings?.about_page || "{}"); } catch (e) { /* */ } setF({ ...BLANK, name: ab.devName || "", slug: slugify(ab.devName || ""), job_title: ab.devRole || "", bio: ab.devBio || "", avatar_url: ab.devAvatar || "", same_as: [ab.facebook || ""] }); }
      setDirty(false);
    } catch (e) { setErr("Chưa tải được tác giả. " + (e.message || "")); }
  }, [appSettings]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { window.__fpWebDirty = dirty; return () => { window.__fpWebDirty = false; }; }, [dirty]);
  const set = (patch) => { setF((x) => ({ ...x, ...patch })); setDirty(true); };
  const open = async (a) => { if (dirty && !(await appConfirm("Hồ sơ đang sửa chưa lưu. Bỏ thay đổi?", { danger: true }))) return; setF(a ? { ...BLANK, ...a, same_as: a.same_as?.length ? a.same_as : [""], credentials: a.credentials || [] } : { ...BLANK }); setDirty(false); };

  const save = async () => {
    const slug = slugify(f.slug || f.name);
    if (!f.name.trim() || !slug) return showToast?.("Nhập tên tác giả.");
    if (list.some((x) => x.slug === slug && x.id !== f.id)) return showToast?.(`Đường dẫn “${slug}” đã có tác giả khác dùng.`);
    const same = f.same_as.map((x) => x.trim()).filter(Boolean);
    if (same.some((u) => !/^https?:\/\//.test(u))) return showToast?.("Link hồ sơ phải bắt đầu bằng https://");
    setBusy(true);
    try {
      const row = { name: f.name.trim(), slug, job_title: f.job_title || null, experience: f.experience || null, bio: f.bio || null, avatar_url: f.avatar_url || null, credentials: f.credentials, same_as: same, show_box: !!f.show_box, is_reviewer: !!f.is_reviewer };
      const saved = f.id ? await supabase.from("web_authors").update(row).eq("id", f.id).select().single().then(must) : await supabase.from("web_authors").insert({ ...row, profile_id: list.length ? null : user?.id || null }).select().single().then(must);
      showToast?.("Đã lưu tác giả."); await load(saved.id);
    } catch (e) { showToast?.("Chưa lưu được: " + (e.message || "")); }
    setBusy(false);
  };
  const del = async () => {
    if (!f.id || !(await appConfirm(`Xoá tác giả “${f.name}”? Bài của tác giả này không bị xoá, chỉ bỏ tên tác giả.`, { danger: true }))) return;
    try { await supabase.from("web_authors").delete().eq("id", f.id).then(must); showToast?.("Đã xoá tác giả."); await load(); } catch (e) { showToast?.("Chưa xoá được: " + (e.message || "")); }
  };

  if (err) return <>{top(null)}<div style={{ padding: 24 }}><ErrorBox text={err} /></div></>;
  if (!list || !f) return <>{top(null)}<Loading /></>;
  const slug = slugify(f.slug || f.name);
  const person = JSON.stringify({ "@type": "Person", name: f.name || "…", url: `${WEB}/tac-gia/${slug}`, ...(f.job_title ? { jobTitle: f.job_title } : {}), ...(f.same_as.filter(Boolean).length ? { sameAs: f.same_as.filter(Boolean) } : {}), worksFor: { "@type": "Organization", name: "Fipilot AI" } }, null, 2);
  return (
    <>
      {top(<span style={{ display: "flex", gap: 8 }}><Btn kind="soft" onClick={() => open(null)} testid="web-au-new">+ Thêm tác giả</Btn><Btn kind="blue" onClick={save} disabled={busy} testid="web-au-save">{busy ? "Đang lưu…" : f.id ? "Lưu hồ sơ" : "Tạo tác giả"}</Btn></span>, "Tác giả", "Hồ sơ người viết — Google dùng để chấm độ tin cậy bài sức khoẻ, ăn uống")}
      <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "260px minmax(0,1fr) 360px", gap: 16, alignItems: "start" }}>
        <Card style={{ padding: 0 }}>
          <H t={`Tác giả (${list.length})`} />
          <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {list.map((a) => <button key={a.id} type="button" onClick={() => open(a)} data-testid="web-au-row" style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 10, background: f.id === a.id ? PC.rowSel : "none", border: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}><Av a={a} s={40} /><span style={{ display: "flex", flexDirection: "column", gap: 2 }}><b style={{ fontSize: 13.5 }}>{a.name}</b><span style={{ fontSize: 12, color: PC.t3 }}>{a.is_reviewer ? "Kiểm duyệt" : "Tác giả"} · {cnt[a.id] || 0} bài</span></span></button>)}
            {!list.length && <span style={{ padding: 10, fontSize: 12.5, color: PC.t3 }}>Chưa có tác giả — khung bên cạnh đã điền sẵn từ trang Giới thiệu của app, bấm “Tạo tác giả”.</span>}
            <div style={{ padding: 10, fontSize: 12, color: PC.t3, lineHeight: 1.5 }}>Mỗi tài khoản quản trị có thể là 1 tác giả. Thêm người kiểm duyệt (chuyên gia dinh dưỡng) để hiện dòng “Đã kiểm duyệt bởi”.</div>
          </div>
        </Card>
        <Card style={{ padding: 0 }}>
          <H t={`Hồ sơ · ${f.name || "Tác giả mới"}`} r={f.id ? <Lnk href={`${WEB}/tac-gia/${f.slug}`}>Xem trang tác giả ↗</Lnk> : null} />
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 14, alignItems: "center" }}><Av a={f} s={72} /><span style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={{ display: "flex", gap: 8 }}><Upload showToast={showToast} name={`tac-gia-${slug}`} label="Tải ảnh chân dung" onDone={(r) => set({ avatar_url: r.url })} />{f.avatar_url && <Btn kind="light" style={{ height: 28, fontSize: 12 }} onClick={() => set({ avatar_url: "" })}>Gỡ</Btn>}</span><span style={{ fontSize: 11.5, color: PC.t3 }}>Ảnh thật, mặt rõ — tăng độ tin cậy</span></span></div>
            <Field label="Tên hiển thị"><input value={f.name} onChange={(e) => set({ name: e.target.value, ...(f.id ? {} : { slug: slugify(e.target.value) }) })} data-testid="web-au-name" className="pc-input" style={inpStyle()} /></Field>
            <Field label="Đường dẫn"><input value={f.slug} onChange={(e) => set({ slug: slugify(e.target.value) })} className="pc-input" style={{ ...inpStyle(), fontFamily: "ui-monospace, Menlo, monospace" }} /></Field>
            <Field label="Chức danh"><input value={f.job_title || ""} onChange={(e) => set({ job_title: e.target.value })} placeholder="VD: Người sáng lập Fipilot AI" className="pc-input" style={inpStyle()} /></Field>
            <Field label="Kinh nghiệm"><input value={f.experience || ""} onChange={(e) => set({ experience: e.target.value })} placeholder="VD: 5 năm theo dõi ăn uống, tập gym" className="pc-input" style={inpStyle()} /></Field>
            <div style={{ gridColumn: "1/-1" }}><Field label="Giới thiệu ngắn" hint="2–4 câu, hiện cuối mỗi bài và trên trang tác giả"><textarea value={f.bio || ""} onChange={(e) => set({ bio: e.target.value })} placeholder="Viết vài câu về bạn: vì sao làm Fipilot AI, bạn đã giảm cân / tập luyện thế nào…" className="pc-input" style={{ ...inpStyle(84), height: 84, padding: "8px 12px", resize: "vertical", lineHeight: 1.55 }} /></Field></div>
            <div style={{ gridColumn: "1/-1" }}><Field label="Chứng chỉ / chuyên môn">
              <span style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", minHeight: 36, borderRadius: 10, border: `1px solid ${PC.field}`, padding: "4px 8px" }}>
                {f.credentials.map((x) => <span key={x} style={{ fontSize: 12, background: "#E8F1FF", color: BLUE, fontWeight: 700, borderRadius: 7, padding: "3px 8px", display: "inline-flex", gap: 4 }}>{x}<button type="button" aria-label="Bỏ" onClick={() => set({ credentials: f.credentials.filter((y) => y !== x) })} style={{ border: 0, background: "none", color: BLUE, cursor: "pointer", padding: 0 }}>×</button></span>)}
                <input value={cred} onChange={(e) => setCred(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && cred.trim()) { e.preventDefault(); set({ credentials: [...new Set([...f.credentials, cred.trim()])] }); setCred(""); } }} placeholder={f.credentials.length ? "" : "Gõ rồi Enter · VD: chứng chỉ PT, dinh dưỡng thể thao"} style={{ flex: 1, minWidth: 120, border: 0, outline: "none", fontSize: 12.5, fontFamily: "inherit" }} />
              </span></Field></div>
            <div style={{ gridColumn: "1/-1" }}><Field label="Link hồ sơ ở nơi khác (sameAs)"><span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {f.same_as.map((u, i) => <span key={i} style={{ display: "flex", gap: 6 }}><input value={u} onChange={(e) => set({ same_as: f.same_as.map((x, k) => (k === i ? e.target.value : x)) })} placeholder={i === 0 ? "https://facebook.com/…" : "https://linkedin.com/in/…"} className="pc-input" style={inpStyle(32)} />{f.same_as.length > 1 && <Btn kind="light" style={{ height: 32, fontSize: 12 }} onClick={() => set({ same_as: f.same_as.filter((_, k) => k !== i) })}>Bỏ</Btn>}</span>)}
              <span style={{ alignSelf: "flex-start" }}><Lnk onClick={() => set({ same_as: [...f.same_as, ""] })}>+ Thêm link</Lnk></span>
            </span></Field></div>
            <span style={{ gridColumn: "1/-1" }}><Tog on={f.show_box} onChange={(v) => set({ show_box: v })} label="Hiện hộp tác giả cuối bài" /></span>
            <span style={{ gridColumn: "1/-1" }}><Tog on={f.is_reviewer} onChange={(v) => set({ is_reviewer: v })} label="Là người kiểm duyệt nội dung (hiện “Đã kiểm duyệt bởi” trên bài được gán)" /></span>
            {f.id && <span style={{ gridColumn: "1/-1" }}><Lnk red onClick={del}>Xoá tác giả</Lnk></span>}
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 0 }}><H t="Xem trước hộp tác giả cuối bài" />
            <div style={{ padding: 16 }}>
              <div style={{ borderRadius: 16, border: "1px solid #E6ECF5", background: "#F8FBFF", padding: 16, display: "flex", gap: 12, opacity: f.show_box ? 1 : 0.45 }}>
                <Av a={f} s={52} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: ".06em" }}>VIẾT BỞI</span><b style={{ fontSize: 15 }}>{f.name || "Tên tác giả"}</b>{f.job_title && <span style={{ fontSize: 12.5, color: PC.t3 }}>{f.job_title}</span>}<span style={{ fontSize: 12.5, color: f.bio ? PC.t2 : PC.t4, lineHeight: 1.5 }}>{f.bio || "(Giới thiệu ngắn sẽ hiện ở đây)"}</span><span style={{ fontSize: 12, color: BLUE, fontWeight: 700 }}>Xem {cnt[f.id] || 0} bài của {f.name || "…"} →</span></span>
              </div>
              {!f.show_box && <span style={{ display: "block", marginTop: 8, fontSize: 11.5, color: PC.t3 }}>Đang tắt — bài chỉ hiện tên tác giả ở đầu bài.</span>}
            </div>
          </Card>
          <Card style={{ padding: 0 }}><H t="Schema tự tạo" />
            <div style={{ padding: 16 }}><pre style={{ margin: 0, borderRadius: 10, background: "#0F172A", color: "#E2E8F0", padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap" }}>{person}</pre></div>
          </Card>
        </div>
      </div>
    </>
  );
}
