// Quản trị PC › Phiên bản & thông báo. Cùng logic & ghi DB với src/mobile/admin/VersionScreen.jsx (thay tab cũ adminTabs/AdminTab.jsx):
//  - Thẻ trái "Phiên bản app": bản đang phát hành + ô Phiên bản mới + "Có gì mới" (mỗi dòng 1 ý);
//    "Phát hành bản mới" hỏi bằng hộp thoại app rồi saveSetting("app_version") → saveSetting("update_notes").
//  - Thẻ phải "Thông báo chuông": appSettings.notifications (JSON, tối đa 10, tin mới nhất isNew + chấm đỏ); thêm / xoá (xoá có hỏi).
//  - Admin thường: dải chỉ xem, ô nhập khoá, không có nút ghi.
import { useEffect, useState } from "react";
import { appConfirm } from "../lib/dialog";
import { todayVN, fmtVN } from "../lib/dateVN";
import { PC } from "../theme";
import { Btn, Pill, Card, headRow, bodyRow, cell, vnInt } from "./pcUI";

const parseNotis = (s) => { try { const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const withV = (v) => (v ? (/^v/i.test(v) ? v : `v${v}`) : "chưa đặt");
const MAX_NOTI = 10;
const N_COLS = "16px 1fr 96px 64px";

const lbl = { fontSize: 12, fontWeight: 800, color: PC.t3, paddingTop: 9 };
const fieldStyle = (can) => ({ width: "100%", minWidth: 0, borderRadius: 10, background: can ? "#FFFFFF" : "#F8FAFC", border: `1px solid ${PC.field}`, padding: "0 12px", fontSize: 13, color: PC.t1, fontFamily: "inherit", opacity: can ? 1 : 0.7 });
const areaStyle = (can, h) => ({ ...fieldStyle(can), padding: "9px 12px", minHeight: h, lineHeight: 1.5, resize: "vertical", display: "block" });

function FormRow({ label, children, htmlFor }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "start" }}>
      <label htmlFor={htmlFor} style={lbl}>{label}</label>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function PcVersion({ top, isSuperAdmin, appSettings = {}, saveSetting, showToast }) {
  const can = !!isSuperAdmin;
  const [ver, setVer] = useState(appSettings.app_version || "");
  const [notes, setNotes] = useState(appSettings.update_notes || "");
  const [noti, setNoti] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = (text) => showToast?.({ text }, 3000);

  // appSettings tải xong sau (bất đồng bộ) → đổ giá trị đã lưu vào ô
  useEffect(() => { setVer(appSettings.app_version || ""); }, [appSettings.app_version]);
  useEffect(() => { setNotes(appSettings.update_notes || ""); }, [appSettings.update_notes]);

  const list = parseNotis(appSettings.notifications);
  const noteLines = notes.split("\n").map((x) => x.trim()).filter(Boolean);
  const changed = ver.trim() !== (appSettings.app_version || "") || notes.trim() !== (appSettings.update_notes || "").trim();

  const release = async () => {
    if (!can) return;
    const v = ver.trim();
    if (!v) { toast("Nhập phiên bản mới trước khi phát hành."); return; }
    const ok = await appConfirm(
      `Mọi user mở app sẽ thấy hộp "Có bản mới" → cập nhật, xoá bộ nhớ đệm.${noteLines.length ? `\n\nCó gì mới:\n• ${noteLines.join("\n• ")}` : ""}`,
      { title: `Phát hành ${withV(v)}?`, confirmText: "Phát hành" },
    );
    if (!ok) return;
    setBusy(true);
    try {
      await saveSetting("app_version", v);
      await saveSetting("update_notes", notes.trim());
      toast(`Đã phát hành ${withV(v)}`);
    } catch (e) { toast("Lưu không được: " + (e?.message || "lỗi mạng")); }
    setBusy(false);
  };

  const addNoti = async () => {
    if (!can) return;
    const text = noti.trim();
    if (!text) return;
    const n = { id: "v" + Date.now(), text, date: fmtVN(todayVN(), true), isNew: true };
    const updated = [n, ...parseNotis(appSettings.notifications).map((x) => ({ ...x, isNew: false }))].slice(0, MAX_NOTI);
    setBusy(true);
    try {
      await saveSetting("notifications", JSON.stringify(updated));
      setNoti("");
      toast("Đã thêm thông báo");
    } catch (e) { toast("Lưu không được: " + (e?.message || "lỗi mạng")); }
    setBusy(false);
  };

  const delNoti = async (n) => {
    if (!can) return;
    if (!await appConfirm(n.text, { title: "Xoá thông báo này?", confirmText: "Xoá", danger: true })) return;
    const updated = parseNotis(appSettings.notifications).filter((x) => x.id !== n.id);
    setBusy(true);
    try {
      await saveSetting("notifications", JSON.stringify(updated));
      toast("Đã xoá thông báo");
    } catch (e) { toast("Lưu không được: " + (e?.message || "lỗi mạng")); }
    setBusy(false);
  };

  const dis = !can || busy;
  return (
    <>
      {top(can ? <Btn kind="blue" onClick={release} disabled={dis || !ver.trim()} testid="pc-admin-release">{busy ? "Đang lưu…" : "Phát hành bản mới"}</Btn> : null)}
      <div data-testid="pc-version" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {!can && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới phát hành bản mới và sửa thông báo.</div>}

        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          {/* Phiên bản */}
          <Card testid="pc-admin-version" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900, flex: 1 }}>Phiên bản app</span>
                {can && changed && <Pill tone="amber">chưa phát hành</Pill>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "12px 14px", borderRadius: 12, background: PC.headBg, border: `1px solid ${PC.headLine}` }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: PC.t3 }}>Đang phát hành</span>
                <span data-testid="pc-admin-current" style={{ fontSize: 26, fontWeight: 900, color: PC.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{withV(appSettings.app_version)}</span>
              </div>
              <FormRow label="Phiên bản mới" htmlFor="pc-admin-ver">
                <input id="pc-admin-ver" data-testid="pc-admin-input" className="pc-input" type="text" value={ver} onChange={(e) => setVer(e.target.value)} disabled={!can} placeholder="VD: 4.0"
                  onKeyDown={(e) => { if (e.key === "Enter") release(); }} style={{ ...fieldStyle(can), height: 36, maxWidth: 180 }} />
              </FormRow>
              <FormRow label="Có gì mới" htmlFor="pc-admin-notes">
                <textarea id="pc-admin-notes" data-testid="pc-admin-notes" className="pc-input" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!can} rows={5}
                  placeholder={"Mỗi dòng 1 ý, hiện trong hộp cập nhật\nVD: Gợi ý món theo calo còn lại"} style={areaStyle(can, 128)} />
                <span style={{ display: "block", marginTop: 6, fontSize: 12, color: PC.t4 }}>{noteLines.length ? `${vnInt(noteLines.length)} ý` : "Chưa có ý nào"} · mở app sẽ hiện hộp "Có bản mới" → cập nhật, xoá bộ nhớ đệm.</span>
              </FormRow>
            </div>
          </Card>

          {/* Thông báo chuông */}
          <Card testid="pc-admin-notices" style={{ flex: 1.15, minWidth: 0 }}>
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 900, flex: 1 }}>Thông báo chuông · cho tất cả user</span>
                <span data-testid="pc-admin-notice-count" style={{ fontSize: 12, color: PC.t3 }}>{vnInt(list.length)}/{MAX_NOTI}</span>
              </div>
              <textarea data-testid="pc-admin-notice-input" className="pc-input" aria-label="Nội dung thông báo" value={noti} onChange={(e) => setNoti(e.target.value)} disabled={!can} rows={3}
                placeholder="VD: Bản cập nhật mới có gợi ý món…" style={areaStyle(can, 76)} />
              {can && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12, color: PC.t4 }}>Tin mới nhất có chấm đỏ; giữ tối đa {MAX_NOTI} tin, tin cũ nhất tự rơi.</span>
                  <Btn kind="soft" onClick={addNoti} disabled={dis || !noti.trim()} testid="pc-admin-notice-add">+ Thêm thông báo</Btn>
                </div>
              )}
            </div>
            <div style={{ ...headRow(N_COLS), borderRadius: 0, borderTop: `1px solid ${PC.headLine}` }}><span /><span>NỘI DUNG</span><span>NGÀY</span><span /></div>
            {list.length === 0 && <div data-testid="pc-admin-notice-empty" style={{ padding: 20, textAlign: "center", fontSize: 13, color: PC.t3 }}>Chưa có thông báo nào.</div>}
            {list.map((n, i) => {
              const last = i === list.length - 1;
              return (
                <div key={n.id || i} data-testid="pc-admin-notice" className="pc-row" style={{ ...bodyRow(N_COLS), alignItems: "start", padding: "12px 16px", borderBottom: last ? "none" : bodyRow(N_COLS).borderBottom, borderRadius: last ? "0 0 14px 14px" : 0 }}>
                  <span aria-label={n.isNew ? "Tin mới nhất" : undefined} style={{ width: 8, height: 8, borderRadius: 4, marginTop: 5, background: n.isNew ? "#EF4444" : "transparent" }} />
                  <span style={{ minWidth: 0, fontSize: 13, fontWeight: n.isNew ? 700 : 500, lineHeight: 1.45, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{n.text}</span>
                  <span style={{ ...cell, color: PC.t3 }}>{n.date || "—"}</span>
                  <span style={{ display: "flex", justifyContent: "flex-end" }}>
                    {can && <Btn kind="danger" style={{ height: 28, padding: "0 10px", fontSize: 12 }} onClick={() => delNoti(n)} disabled={busy} testid="pc-admin-notice-del" title="Xoá thông báo">Xoá</Btn>}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </>
  );
}
