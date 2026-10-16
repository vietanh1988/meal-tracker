// Món tự nhập của khách (16/10). Trước chỉ ở localStorage (fp_my_foods) → đổi máy / xoá trình duyệt là mất.
// Giờ: bảng user_foods trên Supabase là nguồn chính, localStorage là bản đệm (mở app nhanh + khi mất mạng).
//  - Mở app: hiện ngay bản trên máy, rồi tải từ server và GỘP (server thắng nếu trùng tên).
//    Món chỉ có trên máy (dữ liệu cũ trước khi có bảng, hoặc lưu lúc mất mạng) → đẩy lên server.
//  - Lưu món: ghi máy ngay + upsert server; lỗi mạng thì giữ trên máy, lần mở sau tự đẩy lại.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { readUser, writeUser } from "../lib/userStore";
import { mergeMyFoods } from "../lib/myFoods";

const KEY = "fp_my_foods";

export function useMyFoods(uid) {
  const [myFoods, setMyFoods] = useState(() => readUser(KEY, uid, {}) || {});
  const ref = useRef(myFoods);
  ref.current = myFoods;

  const push = useCallback(async (entries) => {
    if (!uid) return false;
    const rows = Object.entries(entries || {}).filter(([k, v]) => k && v).map(([food_name, data]) => ({ user_id: uid, food_name: String(food_name).slice(0, 120), data, updated_at: new Date().toISOString() }));
    if (!rows.length) return true;
    const { error } = await supabase.from("user_foods").upsert(rows, { onConflict: "user_id,food_name" });
    if (error) { console.warn("[user_foods] chưa lưu lên máy chủ:", error.message); return false; }
    return true;
  }, [uid]);

  useEffect(() => {
    let dead = false;
    const local = readUser(KEY, uid, {}) || {};
    setMyFoods(local);
    if (!uid) return undefined;
    (async () => {
      const { data, error } = await supabase.from("user_foods").select("food_name,data").eq("user_id", uid);
      if (dead || error) return;
      const { merged, localOnly } = mergeMyFoods(ref.current, data || []);
      // Không đổi gì thì giữ nguyên object cũ: đổi object làm kho món (calcFoodCache) tính lại → ô đang gõ trong
      // sheet Ghi bữa bị đặt lại (E2E 17/10 bắt được khi máy chủ trả chậm)
      if (JSON.stringify(merged) !== JSON.stringify(ref.current)) { setMyFoods(merged); writeUser(KEY, uid, merged); }
      if (Object.keys(localOnly).length) push(localOnly);
    })();
    return () => { dead = true; };
  }, [uid, push]);

  const saveMyFoods = useCallback((entries) => {
    if (!entries || !Object.keys(entries).length) return;
    setMyFoods((prev) => { const next = { ...prev, ...entries }; writeUser(KEY, uid, next); return next; });
    push(entries);
  }, [uid, push]);

  return { myFoods, saveMyFoods };
}
