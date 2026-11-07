// 07/11 (chủ dự án: "vẽ thử 40 món, đồng bộ cả app lẫn web"): ảnh món lấy từ web_calo_pages.image_url — cùng nguồn với
// /bang-calo và /calo/<món> trên web, đổi ảnh ở web là app đổi theo. Hiện ngay bản đã lưu trên máy, mỗi lần mở app tải lại ngầm 1 lần
// (07/11: bản giữ 1 ngày làm máy đã lưu 40 món không thấy 197 món vẽ thêm).
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { buildMap } from "./foodImgMap";
export { thumbOf, normKey, buildMap } from "./foodImgMap";

const KEY = "fp_food_img2"; // đổi khoá để bỏ bản cũ đã lưu (chỉ 40 món)
let mem = null; // { t, m: { [food_key]: url } }
let loading = null;
let fresh = false; // đã tải trong lần mở app này
const subs = new Set();

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.m && typeof v.m === "object" ? v : null; } catch (e) { return null; } };
try { localStorage.removeItem("fp_food_img"); } catch (e) { /* bản cũ */ }
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* */ } };

async function load() {
  if (loading) return loading;
  loading = (async () => {
    const { data, error } = await supabase.from("web_calo_pages").select("food_key,image_url,enabled").not("image_url", "is", null);
    if (error || !Array.isArray(data)) return;
    fresh = true;
    mem = { t: Date.now(), m: buildMap(data) };
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
