// 07/11 (chủ dự án: "vẽ thử 40 món, đồng bộ cả app lẫn web"): ảnh món lấy từ web_calo_pages.image_url — cùng nguồn với
// /bang-calo và /calo/<món> trên web, đổi ảnh ở web là app đổi theo. Giữ bản trên máy 1 ngày, tải lại ngầm khi cũ.
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { buildMap } from "./foodImgMap";
export { thumbOf, normKey, buildMap } from "./foodImgMap";

const KEY = "fp_food_img";
const TTL = 24 * 3600e3;
let mem = null; // { t, m: { [food_key]: url } }
let loading = null;
const subs = new Set();

const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.m && typeof v.m === "object" ? v : null; } catch (e) { return null; } };
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* */ } };

async function load() {
  if (loading) return loading;
  loading = (async () => {
    const { data, error } = await supabase.from("web_calo_pages").select("food_key,image_url,enabled").not("image_url", "is", null);
    if (error || !Array.isArray(data)) return;
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
    // danh sách rỗng (lưu lúc web chưa gắn ảnh) thì tải lại ngay, không đợi hết 1 ngày
    if (!mem || !Object.keys(mem.m).length || Date.now() - (mem.t || 0) > TTL) load();
    return () => { subs.delete(setM); };
  }, []);
  return m;
}
