// CHỈ CHẠY KHI DEV (main.jsx: import.meta.env.DEV && đường dẫn /__pet) — trang xem bản vẽ Fipilot Pet,
// dựng từ component thật của app với dữ liệu giả. Không vào bản build prod.
// ?s=home|shop|tryon|closet|entryA|entryB  &v=nam|nu  &mood=vui|ngu|hoi|gian|mung
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { MOBILE_CSS, FONT, BottomNav, NAV_SPACE } from "../mobile/ui";
import { DK, DK_CSS, LT } from "../theme";
import { TodayScreen } from "../mobile/TodayScreen";
import { MeScreen } from "../mobile/MeScreen";
import { mealRows } from "../lib/mobileView";
import { PET_CSS } from "./PetAvatar";
import { PetHomeScreen, PetShopScreen, PetClosetScreen, PetTodayCard, PetMeRow, PIc } from "./PetScreens";
import { AppIcon } from "../mobile/icons";
import { ITEMS } from "./PetAvatar";

const q = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
const S = q.get("s") || "home";
const V = q.get("v") === "nu" ? "nu" : "nam";

function mockPet() {
  const nam = V === "nam";
  const owned = nam
    ? ["doi-dau-01", "doi-dau-02", "kinh-tai-nghe-01", "kinh-tai-nghe-02", "ao-roi-01", "ao-roi-02", "phu-kien-03", "phu-kien-06", "hieu-ung-02", "ao-roi-07", "hieu-ung-01", "phu-kien-15"]
    : ["doi-dau-09", "doi-dau-07", "kinh-tai-nghe-07", "kinh-tai-nghe-08", "ao-roi-08", "ao-roi-09", "phu-kien-12", "phu-kien-10", "hieu-ung-11", "phu-kien-13", "hieu-ung-01", "phu-kien-15"];
  const equipped = nam ? { dau: "doi-dau-01", ao: "ao-roi-01", cam_tay: "phu-kien-03" } : { ao: "ao-roi-08", cam_tay: "phu-kien-12", hieu_ung: "hieu-ung-11" };
  return {
    name: "Pi", variant: V, mood: q.get("mood") || "vui", bow: true, premium: q.get("premium") === "1",
    seeds: 1240, xp: 1620, today: 55, tasksLeft: 3, todayLeft: 45,
    level: { n: 4, from: 1350, to: 2100, nextUnlock: 5 },
    owned, equipped,
    achievementIds: ["doi-dau-11", "hieu-ung-06"],
    achievements: [
      { key: "s7", label: "Chuỗi 7 ngày ghi bữa", item: ITEMS["hieu-ung-05"], done: true },
      { key: "s30", label: "Chuỗi 30 ngày", item: ITEMS["hieu-ung-06"], cur: 12, max: 30 },
      { key: "goal", label: "Đạt cân mục tiêu, giữ 2 tuần", item: ITEMS["doi-dau-11"], cur: 4, max: 9 },
    ],
  };
}
const ic = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const TASKS = [
  { key: "sang", meal: "sang", label: "Ăn bữa sáng", sub: "Đã ăn · 420 kcal", pts: 10, done: true },
  { key: "trua", meal: "trua", label: "Ăn bữa trưa", sub: "Đã ăn · 610 kcal", pts: 10, done: true },
  { key: "toi", meal: "toi", label: "Ăn bữa tối", sub: "Chưa ghi", pts: 10, done: false },
  { key: "photo", label: "Chụp món", sub: "Đã chụp bữa trưa", pts: 5, done: true, color: "#EA580C", icon: PIc.camera(18) },
  { key: "water", label: "Uống đủ nước", sub: "1,6 / 2,1 lít", pts: 15, done: false, color: "#0891B2", icon: ic(<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />) },
  { key: "full", label: "Ghi đủ mọi bữa", sub: "2 / 3 bữa", pts: 20, done: false, color: "#007AFF", icon: PIc.list(18) },
  { key: "streak", label: "Chuỗi 5 ngày", sub: "Từ ngày thứ 3 được thêm", pts: 10, done: true, color: "#F97316", icon: PIc.flame(18) },
  { key: "weigh", label: "Cân tuần này", sub: "Đã cân thứ Hai", pts: 20, done: true, color: "#64748B", icon: ic(<><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2" /></>) },
];

function Shell({ dark, tab, children }) {
  return (
    <div className="fpm" style={{ fontFamily: FONT, background: dark ? DK.base : LT.base, color: "#0F172A", minHeight: "100vh" }}>
      <style>{MOBILE_CSS + DK_CSS + PET_CSS}</style>
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, background: dark ? DK.bg : LT.bg }} />
      <main className={dark ? "fpd" : undefined} style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", paddingBottom: NAV_SPACE, color: dark ? DK.t1 : undefined }}>{children}</main>
      {tab && <BottomNav dark={dark} tab={tab} onTab={() => {}} onAdd={() => {}} />}
    </div>
  );
}

function EntryB({ pet }) {
  const today = "2026-10-20";
  const day = {
    meals: [
      { meal_id: "sang", meal_name: "Bữa sáng", items: [{ name: "Phở bò tái", gram: 450, cal: 420, protein: 24, carb: 55, fat: 10 }] },
      { meal_id: "trua", meal_name: "Bữa trưa", items: [{ name: "Cơm gạo trắng", gram: 200, cal: 260 }, { name: "Ức gà áp chảo", gram: 150, cal: 250 }, { name: "Rau muống xào", gram: 150, cal: 100 }] },
    ],
    eaten_meals: ["sang", "trua"], water_ml: 1600,
  };
  const rows = mealRows(day, ["sang", "trua", "toi"], null, 17 * 60 + 40, true, false);
  return (
    <TodayScreen date={today} today={today} onDate={() => {}} rows={rows} eaten={{ cal: 1030, p: 70, c: 120, f: 28, fiber: 9 }} targets={{ cal: 1800, p: 130, c: 190, f: 55, fiber: 25 }}
      dayType="train" nowMinutes={17 * 60 + 40} name="Việt Anh" dayLoaded weekDots={{ "2026-10-19": true, "2026-10-18": true }} weight={{ curKg: 72.4, goalKg: 68, last: null, startKg: 75 }}
      banner={<PetTodayCard pet={pet} />} waterMl={1600} addWater={() => {}} planLine="Lịch 4 buổi/tuần" busy={false}
      onLog={() => {}} onPhoto={() => {}} onEdit={() => {}} onToggleEaten={() => {}} suggestInfo={() => ({ n: 0, best: null })} onSuggest={() => {}} onWeight={() => {}} />
  );
}

function EntryA({ pet }) {
  const [slot, setSlot] = useState(null);
  useEffect(() => {
    const card = document.querySelector("[data-testid=me-profile-card]");
    if (!card) return;
    const el = document.createElement("div");
    card.after(el); setSlot(el);
    return () => el.remove();
  }, []);
  return (
    <>
      <MeScreen name="Việt Anh" profile={{ tier: "free", goalType: "cut", exerciseType: "gym", gymDays: [0, 2, 4, 5], reminderSettings: null }} macro={{ calTarget: 1800, goal: "cut", kgWeek: 0.35 }}
        weight={{ curKg: 72.4, goalKg: 68 }} isAdmin={false} appVersion="4.0" open={() => {}} openDiary={() => {}} openCoach={() => {}} salesEnabled signOut={() => {}} bell={null} />
      {slot && createPortal(<PetMeRow pet={pet} />, slot)}
    </>
  );
}

export default function PetPreview() {
  const pet = mockPet();
  let body;
  if (S === "entryB") body = <Shell tab="today"><EntryB pet={pet} /></Shell>;
  else if (S === "entryA") body = <Shell dark tab="me"><EntryA pet={pet} /></Shell>;
  else {
    const scr = S === "shop" || S === "tryon" ? <PetShopScreen pet={pet} preview={S === "tryon" ? (q.get("item") || (V === "nam" ? "doi-dau-04" : "doi-dau-08")) : null} />
      : S === "closet" ? <PetClosetScreen pet={pet} />
      : <PetHomeScreen pet={pet} tasks={TASKS} />;
    body = <Shell><EntryB pet={pet} />{scr}</Shell>;
  }
  return body;
}
export { AppIcon };
