// Quản trị › Phiên bản & thông báo (bản vẽ 104, chốt 16/10) — thay tab cũ adminTabs/AdminTab.jsx.
//  - Khối phiên bản lên đầu: bản đang phát hành, ô phiên bản mới, "Có gì mới" (mỗi dòng 1 ý),
//    "Phát hành bản mới" hỏi xác nhận bằng hộp thoại trong app (bản cũ bấm là phát hành ngay).
//    Ghi giống bản cũ: saveSetting("app_version") rồi saveSetting("update_notes").
//  - Thông báo chuông cho mọi user: appSettings.notifications (JSON, tối đa 10, tin mới nhất isNew + chấm đỏ),
//    × xoá có hỏi trước.
//  - Admin thường: dòng chỉ xem, ô nhập khoá, không có nút.
import { useEffect, useState } from "react";
import { DK } from "../../theme";
import { todayVN, fmtVN } from "../../lib/dateVN";
import { SubPage, DkIcon, Icon } from "../ui";
import { Sec, Card, Btn, ReadOnly, Field, inp, area, Empty, useConfirm } from "./adminUI";

const versionIcon = <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H4z" /><path d="M8 20h8M12 16v4M8 9l2 2-2 2M12 13h4" /></svg>;

const parseNotis = (s) => { try { const a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; } catch (e) { return []; } };
const withV = (v) => (v ? (/^v/i.test(v) ? v : `v${v}`) : "chưa đặt");

export function VersionScreen({ onBack, isAdmin, isSuperAdmin, appSettings = {}, saveSetting, showToast }) {
  const can = !!isSuperAdmin;
  const [confirm, dialog] = useConfirm();
  const [ver, setVer] = useState(appSettings.app_version || "");
  const [notes, setNotes] = useState(appSettings.update_notes || "");
  const [noti, setNoti] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = (text) => showToast?.({ text }, 3000);

  // appSettings tải xong sau (bất đồng bộ) → đổ giá trị đã lưu vào ô
  useEffect(() => { setVer(appSettings.app_version || ""); }, [appSettings.app_version]);
  useEffect(() => { setNotes(appSettings.update_notes || ""); }, [appSettings.update_notes]);

  const list = parseNotis(appSettings.notifications);

  const release = async () => {
    const v = ver.trim();
    if (!v) { toast("Nhập phiên bản mới trước khi phát hành."); return; }
    const lines = notes.split("\n").map((x) => x.trim()).filter(Boolean);
    const ok = await confirm({
      title: `Phát hành ${withV(v)}?`,
      text: `Mọi user mở app sẽ thấy hộp "Có bản mới" → cập nhật, xoá bộ nhớ đệm.${lines.length ? `\n\nCó gì mới:\n• ${lines.join("\n• ")}` : ""}`,
      ok: "Phát hành",
    });
    if (!ok) return;
    setBusy(true);
    await saveSetting("app_version", v);
    await saveSetting("update_notes", notes.trim());
    setBusy(false);
    toast(`Đã phát hành ${withV(v)}`);
  };

  const addNoti = async () => {
    const text = noti.trim();
    if (!text) return;
    const n = { id: "v" + Date.now(), text, date: fmtVN(todayVN(), true), isNew: true };
    const updated = [n, ...parseNotis(appSettings.notifications).map((x) => ({ ...x, isNew: false }))].slice(0, 10);
    setBusy(true);
    await saveSetting("notifications", JSON.stringify(updated));
    setBusy(false);
    setNoti("");
    toast("Đã thêm thông báo");
  };

  const delNoti = async (n) => {
    const ok = await confirm({ title: "Xoá thông báo này?", text: n.text, ok: "Xoá", danger: true });
    if (!ok) return;
    const updated = parseNotis(appSettings.notifications).filter((x) => x.id !== n.id);
    await saveSetting("notifications", JSON.stringify(updated));
    toast("Đã xoá thông báo");
  };

  if (!isAdmin) return (
    <SubPage dark title="Phiên bản & thông báo" onBack={onBack}>
      <Empty>Chỉ Admin mới xem được trang này.</Empty>
    </SubPage>
  );

  const dis = !can || busy;
  return (
    <SubPage dark title="Phiên bản & thông báo" onBack={onBack}>
      <div data-testid="adm-version" style={{ paddingBottom: 32 }}>
        {!can && <ReadOnly />}

        <Sec>Phiên bản app</Sec>
        <Card pad="14px">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <DkIcon color="#0891B2" size={40}>{versionIcon}</DkIcon>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 12, color: DK.t2 }}>Đang phát hành</span>
                <span data-testid="adm-version-current" style={{ fontSize: 22, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{withV(appSettings.app_version)}</span>
              </span>
            </div>
            <Field label="Phiên bản mới">
              <input data-testid="adm-version-input" type="text" value={ver} onChange={(e) => setVer(e.target.value)} disabled={!can} placeholder="VD: 4.0"
                style={{ ...inp, opacity: can ? 1 : 0.6 }} />
            </Field>
            <Field label="Có gì mới (mỗi dòng 1 ý)">
              <textarea data-testid="adm-version-notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!can} rows={4}
                placeholder={"VD: Gợi ý món theo calo còn lại\nVuốt xuống để đóng bảng"} style={{ ...area, minHeight: 110, opacity: can ? 1 : 0.6 }} />
            </Field>
            {can && <Btn kind="blue" h={48} testid="adm-version-release" disabled={dis} onClick={release}>Phát hành bản mới</Btn>}
            <span style={{ fontSize: 11, color: DK.t3, lineHeight: 1.5 }}>Mở app sẽ hiện hộp "Có bản mới" → cập nhật, xoá bộ nhớ đệm.</span>
          </div>
        </Card>

        <Sec>Thông báo chuông · cho tất cả user</Sec>
        <Card pad="14px 14px 4px 14px">
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>
            <textarea data-testid="adm-notice-input" aria-label="Nội dung thông báo" value={noti} onChange={(e) => setNoti(e.target.value)} disabled={!can} rows={3}
              placeholder="VD: Bản cập nhật mới có gợi ý món..." style={{ ...area, opacity: can ? 1 : 0.6 }} />
            {can && <Btn kind="ghost" h={44} testid="adm-notice-add" disabled={dis || !noti.trim()} onClick={addNoti}>+ Thêm thông báo</Btn>}
          </div>
          {list.length === 0
            ? <div style={{ borderTop: `1px solid ${DK.line}`, padding: "14px 0", fontSize: 13, color: DK.t3, textAlign: "center" }}>Chưa có thông báo nào.</div>
            : list.map((n, i) => (
              <div key={n.id || i} data-testid="adm-notice" style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0", borderTop: `1px solid ${DK.line}` }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0, background: n.isNew ? "#EF4444" : "transparent" }} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: n.isNew ? 700 : 600, lineHeight: 1.4, overflowWrap: "anywhere", whiteSpace: "pre-line" }}>{n.text}</span>
                  <span style={{ fontSize: 11, color: DK.t3 }}>{n.date}</span>
                </span>
                {can && (
                  <button data-testid="adm-notice-del" onClick={() => delNoti(n)} aria-label="Xoá thông báo" style={{ width: 32, height: 32, marginTop: -4, borderRadius: 16, border: "none", background: "transparent", color: DK.t2, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>{Icon.close(16)}</button>
                )}
              </div>
            ))}
        </Card>
      </div>
      {dialog}
    </SubPage>
  );
}
