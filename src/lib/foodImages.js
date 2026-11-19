// 07/11 (chủ dự án: "vẽ thử 40 món, đồng bộ cả app lẫn web"): ảnh món lấy từ web_calo_pages.image_url — cùng nguồn với
// /bang-calo và /calo/<món> trên web, đổi ảnh ở web là app đổi theo. Hiện ngay bản đã lưu trên máy, mỗi lần mở app tải lại ngầm 1 lần
// (07/11: bản giữ 1 ngày làm máy đã lưu 40 món không thấy 197 món vẽ thêm).
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { buildMap, withAliases } from "./foodImgMap";
import { LOCAL_FOODS } from "./localFoodDB";
export { thumbOf, normKey, buildMap, withAliases, imgFor } from "./foodImgMap";

const KEY = "fp_food_img3"; // 19/11: đổi khoá — bản đã lưu trước chỉ có 1.000 món đầu
let mem = null; // { t, m: { [food_key]: url } }
let loading = null;
let fresh = false; // đã tải trong lần mở app này
const subs = new Set();

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.m && typeof v.m === "object" ? v : null; } catch (e) { return null; } };
try { localStorage.removeItem("fp_food_img"); localStorage.removeItem("fp_food_img2"); } catch (e) { /* bản cũ */ }
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* */ } };

async function load() {
  if (loading) return loading;
  loading = (async () => {
    // 19/11 (chủ dự án: "vẫn còn 1 số món không có ảnh"): Supabase trả tối đa 1.000 dòng / lần, bảng đã 1.364 món có ảnh → đọc theo trang
    const data = [];
    for (let off = 0; off < 20000; off += 1000) {
      const { data: rows, error } = await supabase.from("web_calo_pages").select("food_key,image_url,enabled").not("image_url", "is", null).order("food_key").range(off, off + 999);
      if (error || !Array.isArray(rows)) { if (!data.length) return; break; }
      data.push(...rows);
      if (rows.length < 1000) break;
    }
    fresh = true;
    mem = { t: Date.now(), m: withAliases(buildMap(data), Object.keys(LOCAL_FOODS)) }; // món đồng nghĩa mượn ảnh (07/11)
    write(mem);
    subs.forEach((f) => f(mem.m));
  })().catch(() => {}).finally(() => { loading = null; });
  return loading;
}

export function foodImageMap() {
  if (!mem) mem = read();
  return mem ? mem.m : {};
}

export function useFoodImages() {
  const [m, setM] = useState(foodImageMap);
  useEffect(() => {
    subs.add(setM);
    if (!fresh) load();
    return () => { subs.delete(setM); };
  }, []);
  return m;
}
