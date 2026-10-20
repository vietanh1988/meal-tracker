// Fipilot Pet — dữ liệu Pi của khách (20/10). Mọi điểm / mua / mặc đều qua hàm máy chủ (supabase/migrations/20261020150000_pet.sql):
//   pet_claim()  → quét việc HÔM NAY, cộng Hạt việc đủ điều kiện chưa nhận, trả trạng thái
//   pet_buy(id)  → mua · pet_equip(slot, id|null) → mặc / tháo · pet_save(tên, nơ, cài đặt)
// App KHÔNG gửi số điểm. Mặc hiện ngay trên máy, lưu sau; lỗi thì tự trả lại như cũ (luật hiệu ứng mặc đồ 20/10).
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { ITEMS } from "../pet/PetAvatar";
import { EVENTS } from "../pet/lines";

// Quản trị sửa tên / giá / độ hiếm / cấp / bản / ẩn ở bảng pet_items → đè lên catalog.json (ảnh + điểm đặt vẫn từ catalog)
export function applyItemRows(rows) {
  for (const r of rows || []) {
    const it = ITEMS[r.id];
    if (!it) continue;
    Object.assign(it, { name: r.name, rarity: r.rarity, price: r.price, level: r.level, hidden: !!r.hidden, achievement: !!r.achievement });
    const vs = (r.variants || []).filter((v) => it.anchor?.[v] || it.body?.[v]);
    if (vs.length) it.variants = vs;
  }
}

// Câu Pi nói: bảng pet_lines (Quản trị sửa) → { event: { nam: [...], nu: [...] } }; chưa có thì dùng src/pet/lines.js
export function linesFrom(rows) {
  const out = {};
  for (const e of EVENTS) out[e.key] = { nam: [...e.nam], nu: [...e.nu] };
  if (rows && rows.length) {
    for (const e of EVENTS) out[e.key] = { nam: [], nu: [] };
    for (const r of [...rows].sort((a, b) => a.sort - b.sort)) (out[r.event] ||= { nam: [], nu: [] })[r.variant]?.push(r.text);
  }
  return out;
}

const errText = (e) => (e?.message || "").replace(/^.*?:\s*/, "") || "Chưa lưu được, thử lại";

export function usePet(userId, enabled) {
  const [state, setState] = useState(null);
  const [lines, setLines] = useState(null);
  const [itemsReady, setItemsReady] = useState(false);
  const [error, setError] = useState(null);
  const busy = useRef(false);
  const again = useRef(false); // 20/10: đang tính mà có thao tác mới → tính thêm 1 lần sau (trước đây bị bỏ hẳn)
  const stateRef = useRef(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  const claim = useCallback(async () => {
    if (!userId) return null;
    if (busy.current) { again.current = true; return null; }
    busy.current = true;
    let out = null;
    try {
      const { data, error: e } = await supabase.rpc("pet_claim");
      if (e) { setError(errText(e)); return null; }
      setError(null);
      setState((prev) => ({ ...data, prevLevel: prev?.level ?? data.level }));
      out = data;
    } finally {
      busy.current = false;
      if (again.current) { again.current = false; setTimeout(() => claim(), 300); }
    }
    return out;
  }, [userId]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let off = false;
    (async () => {
      const [it, ln] = await Promise.all([
        supabase.from("pet_items").select("id,name,rarity,price,level,variants,achievement,hidden"),
        supabase.from("pet_lines").select("event,variant,text,sort"),
      ]);
      if (off) return;
      if (!it.error) applyItemRows(it.data);
      setItemsReady(true);
      setLines(linesFrom(ln.error ? null : ln.data));
      claim();
    })();
    return () => { off = true; };
  }, [enabled, userId, claim]);

  const buy = useCallback(async (id) => {
    const { data, error: e } = await supabase.rpc("pet_buy", { p_item: id });
    if (e) return { ok: false, error: errText(e) };
    setState((s) => ({ ...s, ...data }));
    return { ok: true };
  }, []);

  const equip = useCallback(async (slot, id) => {
    const before = stateRef.current; // 20/10: lấy bản trước khi đổi (gán trong setState có thể chạy muộn → lỗi thì màn trống)
    setState((s) => { const eq = { ...(s?.equipped || {}) }; if (id) { for (const k of Object.keys(eq)) if (eq[k] === id) delete eq[k]; eq[slot] = id; } else delete eq[slot]; return { ...s, equipped: eq }; });
    const { data, error: e } = await supabase.rpc("pet_equip", { p_slot: slot, p_item: id || null });
    if (e) { if (before) setState(before); else claim(); return { ok: false, error: errText(e) }; }
    setState((s) => ({ ...s, ...data }));
    return { ok: true };
  }, [claim]);

  const save = useCallback(async ({ name, bow, settings } = {}) => {
    const { data, error: e } = await supabase.rpc("pet_save", { p_name: name ?? null, p_bow: bow ?? null, p_settings: settings ?? null });
    if (e) return { ok: false, error: errText(e) };
    setState((s) => ({ ...s, ...data }));
    return { ok: true };
  }, []);

  return { state, lines, itemsReady, error, claim, buy, equip, save };
}
