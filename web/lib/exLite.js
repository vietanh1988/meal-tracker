// dữ liệu nhẹ cho lưới thư viện (client): không kèm các bước tập
import { EXERCISES, exUrl, photoUrls, MUSCLE_NAME, MUSCLE_TONE, EQUIPS, LEVEL_NAME, searchKey } from "./workout.js";
export const exLite = (list = EXERCISES) => list.map((e) => ({
  id: e.id, vi: e.vi, en: e.en, equip: e.equip, url: exUrl(e.id), ph: photoUrls(e.id, true), k: searchKey(e),
  mn: MUSCLE_NAME[e.muscle] || "Bài tập", tone: MUSCLE_TONE[e.muscle] || ["#F1F5F9", "#475569"],
  tg: [MUSCLE_NAME[e.muscle], EQUIPS[e.equip], LEVEL_NAME[e.level]].filter(Boolean).join(" · "),
}));
