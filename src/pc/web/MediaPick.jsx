import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { PC } from "../../theme";
import { Loading } from "../pcUI";
import { Modal, inpStyle } from "./webUI";

// Chọn ảnh từ Thư viện ảnh (bảng web_media)
export function MediaPick({ onClose, onPick }) {
  const [rows, setRows] = useState(null); const [q, setQ] = useState("");
  useEffect(() => { supabase.from("web_media").select("path,url,alt,name,width,height").order("created_at", { ascending: false }).limit(300).then(({ data }) => setRows(data || [])); }, []);
  const list = (rows || []).filter((r) => !q || `${r.name} ${r.alt || ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title="Chọn ảnh từ thư viện" onClose={onClose} width={760} testid="web-media-pick">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, mô tả…" className="pc-input" style={{ ...inpStyle(34), marginBottom: 12 }} />
      {!rows ? <Loading /> : !list.length ? <span style={{ fontSize: 12.5, color: PC.t3 }}>Chưa có ảnh nào — tải ảnh ở Thư viện ảnh hoặc bấm “Tải ảnh mới”.</span> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, maxHeight: 460, overflowY: "auto" }}>
          {list.map((r) => <button key={r.path} type="button" onClick={() => onPick(r)} title={r.alt || r.name} style={{ aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", border: 0, padding: 0, cursor: "pointer", boxShadow: PC.shadow, background: "#FFF" }}><img src={r.url} alt={r.alt || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /></button>)}
        </div>
      )}
    </Modal>
  );
}
