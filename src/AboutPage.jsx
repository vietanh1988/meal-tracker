import { useState, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { C, card, inp } from "./theme";

// Inline editable field — nhấn vào sửa ngay tại chỗ
function Editable({ value, onChange, editing, multiline, style, placeholder }) {
  if (!editing) return <span style={style}>{value || placeholder}</span>;
  const eStyle = { ...style, border: `1.5px dashed ${C.primary}`, borderRadius: 6, background: "rgba(0,122,255,0.03)", outline: "none", padding: "2px 6px", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
  if (multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...eStyle, resize: "vertical", display: "block", lineHeight: 1.7 }} />;
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...eStyle, display: "inline-block" }} />;
}

export function AboutPage({ appSettings, isAdmin, saveSetting, mob }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ appName: "Fipilot AI", tagline: "", version: "3.0", description: "", devName: "", devRole: "", devBio: "", devAvatar: "", contact: "", facebook: "", hotline: "", zalo: "", features: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const backupRef = useRef(null);

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Ảnh tối đa 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `dev-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      setForm(f => ({ ...f, devAvatar: publicUrl }));
    } catch (err) { alert("Upload lỗi: " + err.message); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  useEffect(() => {
    try {
      const about = appSettings.about_page ? JSON.parse(appSettings.about_page) : {};
      if (about.appName || about.tagline || about.features) {
        setForm({
          appName: about.appName || "Fipilot AI",
          tagline: about.tagline || "Theo dõi dinh dưỡng thông minh cho người tập gym",
          version: about.version || "3.0",
          description: about.description || "",
          devName: about.devName || "Việt Anh Seoer",
          devRole: about.devRole || "Founder & Developer",
          devBio: about.devBio || "",
          devAvatar: about.devAvatar || "",
          contact: about.contact || "",
          facebook: about.facebook || "",
          hotline: about.hotline || "",
          zalo: about.zalo || "",
          features: about.features || "192 món VN verified|3 AI tích hợp|USDA database|Công thức ISSN",
        });
      }
    } catch (e) {}
  }, [appSettings.about_page]);

  const startEdit = () => { backupRef.current = { ...form }; setEditing(true); };
  const cancelEdit = () => { if (backupRef.current) setForm(backupRef.current); setEditing(false); };
  const saveAbout = async () => {
    setSaving(true);
    await saveSetting("about_page", JSON.stringify(form));
    setEditing(false);
    setSaving(false);
  };

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));
  const features = (form.features || "").split("|").filter(Boolean);
  const displayVersion = appSettings.app_version || form.version;

  return <div>
    {/* Admin toolbar */}
    {isAdmin && editing && <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px", background: "rgba(0,122,255,0.06)", borderRadius: 12, border: `1.5px solid ${C.primary}`, marginBottom: 12 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.primary }}>✏️ Nhấn vào chữ để sửa</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={cancelEdit} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer", fontFamily: "inherit" }}>Hủy</button>
        <button onClick={saveAbout} disabled={saving} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, border: "none", background: C.primary, color: "#fff", cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>{saving ? "Đang lưu..." : "💾 Lưu"}</button>
      </div>
    </div>}

    {/* Hero */}
    <div style={{ ...card, textAlign: "center", padding: mob ? "20px 16px" : "28px 24px", border: `1.5px solid ${editing ? C.primary : C.border}` }}>
      <img src="/logo.png" alt="Fipilot AI" style={{ width: 96, height: 96, borderRadius: 20, objectFit: "cover" }} />
      <div style={{ marginTop: 10 }}>
        <Editable value={form.appName} onChange={set("appName")} editing={editing} style={{ fontSize: 24, fontWeight: 900, color: C.t1, letterSpacing: "-0.02em" }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.secondary, marginTop: 4 }}>v{displayVersion}</div>
      <div style={{ marginTop: 6 }}>
        <Editable value={form.tagline} onChange={set("tagline")} editing={editing} style={{ fontSize: 14, fontWeight: 600, color: C.t2 }} />
      </div>
      {editing && <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t3, marginBottom: 4 }}>Tính năng (ngăn cách bằng |)</div>
        <input value={form.features} onChange={e => set("features")(e.target.value)} style={{ ...inp, fontSize: 12, textAlign: "center" }} />
      </div>}
      {!editing && features.length > 0 && <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
        {features.map((f, i) => <span key={i} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: i % 4 === 0 ? C.primaryBg : i % 4 === 1 ? "#DCFCE7" : i % 4 === 2 ? "#EFF6FF" : "#FEF3C7", color: i % 4 === 0 ? "#007AFF" : i % 4 === 1 ? "#00C896" : i % 4 === 2 ? "#1E40AF" : "#92400E", fontWeight: 700 }}>{f}</span>)}
      </div>}
    </div>

    {/* Mô tả */}
    <div style={{ ...card, marginTop: 12, border: editing ? `1.5px solid ${C.primary}` : undefined }}>
      <div style={{ fontSize: 15, fontWeight: 900, color: C.blue, marginBottom: 8 }}>📖 Về ứng dụng</div>
      <Editable value={form.description} onChange={set("description")} editing={editing} multiline style={{ fontSize: 13, fontWeight: 500, color: C.t2, lineHeight: 1.7, whiteSpace: "pre-wrap" }} />
    </div>

    {/* Developer */}
    <div style={{ ...card, marginTop: 12, border: editing ? `1.5px solid ${C.primary}` : undefined }}>
      <div style={{ fontSize: 15, fontWeight: 900, color: C.blue, marginBottom: 12 }}>👨‍💻 Đội ngũ phát triển</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          {form.devAvatar
            ? <img src={form.devAvatar} alt={form.devName} style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${C.primary}` }} />
            : <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "2px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", color: "#fff" }}>{form.devName ? form.devName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "VA"}</div>}
          {editing && <>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadAvatar} style={{ display: "none" }} />
            <div onClick={() => fileRef.current?.click()} style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid #fff" }}>
              <span style={{ fontSize: 11, color: "#fff" }}>{uploading ? "⏳" : "📷"}</span>
            </div>
          </>}
        </div>
        <div style={{ flex: 1 }}>
          <Editable value={form.devName} onChange={set("devName")} editing={editing} style={{ fontSize: 16, fontWeight: 800, color: C.t1, display: "block" }} />
          <Editable value={form.devRole} onChange={set("devRole")} editing={editing} style={{ fontSize: 12, fontWeight: 700, color: C.secondary, marginTop: 2, display: "block" }} />
        </div>
      </div>
      <div style={{ marginTop: 10, padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
        <Editable value={form.devBio} onChange={set("devBio")} editing={editing} multiline style={{ fontSize: 13, fontWeight: 600, color: C.t3, lineHeight: 1.6, whiteSpace: "pre-wrap" }} />
      </div>

      {/* Contact links — inline edit */}
      {editing ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        {[["contact", "Email", "email@example.com"], ["facebook", "Facebook URL", "https://fb.com/..."], ["hotline", "Hotline", "0909 123 456"], ["zalo", "Zalo (SĐT)", "0909123456"]].map(([key, label, ph]) =>
          <div key={key}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, marginBottom: 2 }}>{label}</div>
            <input value={form[key]} onChange={e => set(key)(e.target.value)} placeholder={ph} style={{ ...inp, fontSize: 12 }} />
          </div>
        )}
      </div> : (form.contact || form.facebook || form.hotline || form.zalo) && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {form.contact && <a href={`mailto:${form.contact}`} target="_blank" rel="noopener" style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "#EFF6FF", color: "#007AFF", textDecoration: "none", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
          Email</a>}
        {form.facebook && <a href={form.facebook} target="_blank" rel="noopener" style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "#EFF6FF", color: "#1877F2", textDecoration: "none", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
          Facebook</a>}
        {form.hotline && <a href={`tel:${form.hotline}`} style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "#DCFCE7", color: "#007AFF", textDecoration: "none", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
          {form.hotline}</a>}
        {form.zalo && <a href={`https://zalo.me/${form.zalo.replace(/\s/g, "")}`} target="_blank" rel="noopener" style={{ fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8, background: "#EBF5FF", color: "#0068FF", textDecoration: "none", border: "1px solid #B3D9FF", display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="16" height="16" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#0068FF" /><text x="24" y="26" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="18" fontWeight="900" fontFamily="Arial,sans-serif">Z</text></svg>
          Zalo</a>}
      </div>}
    </div>

    {/* Admin: toggle edit */}
    {isAdmin && !editing && <div style={{ textAlign: "center", marginTop: 16, marginBottom: 16 }}>
      <button onClick={startEdit} style={{ padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.t2, cursor: "pointer", fontFamily: "inherit" }}>✏️ Chỉnh sửa trang giới thiệu</button>
    </div>}
  </div>;
}
