// ============================================================
// dialog.jsx — thay alert()/confirm() native bằng modal đồng bộ giao diện.
//
// Dùng: import { appAlert, appConfirm } from "./lib/dialog";
//   appAlert("Lưu thất bại");                    // fire-and-forget được
//   if (!(await appConfirm("Xoá mẫu?"))) return; // chờ user chọn
//   await appConfirm("Xoá?", { danger: true, confirmText: "Xoá" });
//
// <AppDialogHost/> mount 1 lần trong App. Module-level queue nên gọi được
// từ bất kỳ đâu (kể cả ngoài React), nhiều dialog xếp hàng lần lượt.
// ============================================================
import { useState, useEffect } from "react";
import { C } from "../theme";

let pushDialog = null; // host đăng ký setter ở đây
const queue = []; // dialog gọi trước khi host mount → xếp hàng

function enqueue(dialog) {
  if (pushDialog) pushDialog(dialog);
  else queue.push(dialog);
}

export function appAlert(message, opts = {}) {
  return new Promise(resolve => {
    enqueue({ type: "alert", message, title: opts.title || "Thông báo", resolve });
  });
}

export function appConfirm(message, opts = {}) {
  return new Promise(resolve => {
    enqueue({
      type: "confirm", message,
      title: opts.title || "Xác nhận",
      confirmText: opts.confirmText || "Đồng ý",
      cancelText: opts.cancelText || "Huỷ",
      danger: !!opts.danger,
      resolve,
    });
  });
}

export function AppDialogHost() {
  const [current, setCurrent] = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    pushDialog = (d) => setPending(prev => [...prev, d]);
    // flush queue tích trước khi mount
    if (queue.length) { setPending(prev => [...prev, ...queue.splice(0)]); }
    return () => { pushDialog = null; };
  }, []);

  useEffect(() => {
    if (!current && pending.length > 0) {
      setCurrent(pending[0]);
      setPending(prev => prev.slice(1));
    }
  }, [current, pending]);

  if (!current) return null;

  const close = (result) => {
    current.resolve(result);
    setCurrent(null);
  };

  const isConfirm = current.type === "confirm";
  const dangerColor = "#DC2626";

  return (
    <div onClick={() => close(isConfirm ? false : undefined)}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 360, padding: "20px 18px 14px", boxShadow: "0 20px 50px rgba(0,0,0,0.25)", fontFamily: "inherit", textAlign: "center" }}>
        {/* Bản vẽ 65: tiêu đề + nội dung canh giữa, 2 nút chia đều cao 46 (cũ 36, khó bấm), nút nguy hiểm màu đỏ */}
        <div style={{ fontSize: 17, fontWeight: 900, color: C.t1, marginBottom: 8 }}>
          {current.title}
        </div>
        <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.5, whiteSpace: "pre-wrap", marginBottom: 16 }}>
          {current.message}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isConfirm && (
            <button autoFocus onClick={() => close(false)}
              style={{ flex: 1, height: 46, borderRadius: 12, border: "none", background: "#F1F5F9", color: C.t1, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              {current.cancelText}
            </button>
          )}
          <button autoFocus={!isConfirm} onClick={() => close(isConfirm ? true : undefined)}
            style={{ flex: 1, height: 46, borderRadius: 12, border: "none", background: isConfirm && current.danger ? dangerColor : C.primary, color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
            {isConfirm ? current.confirmText : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
