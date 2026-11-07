// 08/11 (chủ dự án duyệt bản vẽ "Mời bật nhắc"): lần đầu mở app TỪ MÀN HÌNH CHÍNH (đã cài) mà chưa bật thông báo → hỏi 1 lần.
// Trên iPhone chỉ app đã thêm ra màn hình chính mới nhận được thông báo, nên đây là lúc hỏi dễ được đồng ý nhất.
// Không hỏi cùng lúc với hộp hỏi của Pi (cờ window.__fpPushAsk). Không hỏi khi: không phải app đã cài · máy không hỗ trợ · đã bật / đã chặn · đã trả lời hộp này hoặc hộp "3 ngày làm quen" (fp_onb_push).
import { useEffect, useState } from "react";
import { OnboardPushSheet } from "../pet/OnboardPush";
import { isPushSupported, getPushStatus, enablePushNotifications } from "../pushNotifications";

const KEY = "fp_pwa_push";
const seen = () => { try { return !!(localStorage.getItem(KEY) || localStorage.getItem("fp_onb_push")); } catch (e) { return true; } };
const mark = () => { try { localStorage.setItem(KEY, "1"); localStorage.setItem("fp_onb_push", "1"); } catch (e) { /* */ } };
export const isInstalledApp = () => { try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch (e) { return false; } };

export default function InstalledPushAsk({ ready, variant = "nam", showToast }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready || open || seen() || !isInstalledApp() || !isPushSupported()) return undefined;
    let alive = true;
    const t = setTimeout(() => { getPushStatus().then((s) => { if (alive && s === "default" && !seen() && !window.__fpPushAsk) { window.__fpPushAsk = 1; setOpen(true); } }).catch(() => {}); }, 1500);
    return () => { alive = false; clearTimeout(t); };
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;
  const close = () => { mark(); setOpen(false); };
  const on = async () => {
    try { await enablePushNotifications(); showToast?.({ text: "Đã bật nhắc giờ ăn" }); }
    catch (e) { showToast?.({ text: e?.message || "Chưa bật được thông báo" }); }
    close();
  };
  return <OnboardPushSheet installed variant={variant} onLater={close} onOn={on} />;
}
