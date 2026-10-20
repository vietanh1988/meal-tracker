// Fipilot Pet — nối dữ liệu thật vào các màn Pi (20/10). MobileApp gọi usePetApp(...) → { on, card, page(sec) }.
// Bật khi cờ tính năng "pet" bật, hoặc khách là admin (để thử trước khi mở cho mọi người).
// Điểm do máy chủ tính (pet_claim); ở đây chỉ dựng view-model hiển thị + gọi mua / mặc / lưu.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePet } from "../hooks/usePet";
import { levelOf, moodOf, eventsFor, pickEvent, DAILY_CAP, POINTS, collectionStatus, COL_DEFAULT, isoWeek } from "../lib/petMath";
import { nowVNParts, weekdayVN, weekRange, addDays, diffDays } from "../lib/dateVN";
import { waterGoalMl } from "../lib/dayPlan";
import { authFetch } from "../lib/authFetch";
import { supabase } from "../lib/supabase";
import { aiQuota } from "../lib/aiQuota";
import { pickAiProvider, pickAiModelFromSettings } from "../lib/aiProvider";
import { ITEMS, catalog } from "./PetAvatar";
import { EV, VOICE } from "./lines";
import { roomTime } from "./PetRoom";
import { PetHomeScreen, PetShopScreen, PetClosetScreen, PetTodayCard, PIc } from "./PetScreens";
import { PetChatScreen, PetWeekScreen, PetSettingsScreen, petVariant } from "./PetTalk";

const ACH = [
  { key: "s7", label: "7 ngày liền đã ăn", item: "hieu-ung-05", max: 7, of: "streak" },
  { key: "s30", label: "30 ngày liền đã ăn", item: "hieu-ung-06", max: 30, of: "streak" },
  { key: "s100", label: "100 ngày liền đã ăn", item: "hieu-ung-17", max: 100, of: "streak" },
  { key: "w4", label: "Cân đủ 4 tuần liền", item: "hieu-ung-02", max: 4, of: "weeks" },
  { key: "water30", label: "Đủ nước 30 ngày", item: "hieu-ung-04", max: 30, of: "water" },
  { key: "goal", label: "Đạt cân mục tiêu, giữ 2 tuần", item: "doi-dau-11", max: 14, of: "goal" },
];
const MEAL_LABEL = { sang: "Ăn bữa sáng", phu_sang: "Ăn bữa phụ sáng", trua: "Ăn bữa trưa", phu_chieu: "Ăn bữa phụ chiều", pre: "Ăn trước tập", post: "Ăn sau tập", toi: "Ăn bữa tối" };
const toMin = (t) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const ic = (d) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const fill = (t, so) => String(t || "").replace("{so}", so ?? "");
const readLS = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (e) { return d; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } };

const PROMPT = {
  nam: "Bạn là Pi nam, thú cưng giọt nước trong app Fipilot AI, là bạn tập cùng của khách: hăng hái, lém lỉnh, hay rủ rê, hay dùng chữ \"chiến\", \"ngon\".",
  nu: "Bạn là Pi nữ, thú cưng giọt nước trong app Fipilot AI, là bạn thân của khách: dịu dàng, quan tâm, hay dặn dò, hay dùng chữ \"nè\", \"nha\".",
};
const RULES = "Xưng \"Pi\", gọi khách là \"bạn\". Trả lời tiếng Việt, tối đa 3 câu ngắn, không emoji, không markdown. Dùng số thật bên dưới khi có. Không chê, không dọa, không trách, không bàn béo gầy. Chuyện ngoài ăn uống tập luyện thì trả lời vui một câu rồi kéo về ăn tập. Hỏi về bệnh hoặc thuốc thì khuyên hỏi bác sĩ.";

export function usePetApp({ flagOn, isAdmin, user, profile, ud, today, minutes, mealIds = [], mealTimes = {}, eaten = {}, targets = {}, recentRows = [], weightLog = [], appSettings, showToast, openPage, closeLayer, openPremium }) {
  const on = !!(flagOn || isAdmin) && !!user?.id;
  const pet = usePet(user?.id, on);
  const st = pet.state;
  const variant = petVariant(profile);
  const premium = !!profile?.tier && profile.tier !== "free";
  // 20/10: sau 0:00 khi app đang mở, todayLog có thể còn là của hôm qua → chỉ dùng khi đúng ngày
  const log = ud?.todayLog && (!ud.todayLog.log_date || ud.todayLog.log_date === today) ? ud.todayLog : {};
  const cfg = useMemo(() => { try { return JSON.parse(appSettings?.pet_config || "{}") || {}; } catch (e) { return {}; } }, [appSettings?.pet_config]);

  // hôm nay đổi (ghi bữa / tick / nước / cân) → nhờ máy chủ tính lại Hạt (chậm 1,2 giây để gom nhiều thao tác)
  // 20/10: sig gồm kcal + món ảnh từng bữa (thêm món vào bữa đã có cũng tính lại); lần đầu chỉ bỏ qua KHI đã có st
  const sig = `${(log.eaten_meals || []).join(",")}|${(log.meals || []).map((m) => `${m.meal_id}:${Math.round((m.items || []).reduce((a, i) => a + (Number(i.cal) || 0), 0))}:${(m.items || []).some((i) => i.source === "photo") ? 1 : 0}`).join(",")}|${log.water_ml || 0}|${(weightLog || []).length}`;
  const first = useRef(true);
  useEffect(() => {
    if (!on || !st) return;
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => pet.claim(), 1200);
    return () => clearTimeout(t);
  }, [sig, on, !!st]); // eslint-disable-line react-hooks/exhaustive-deps

  const vm = useMemo(() => {
    if (!st) return null;
    const keys = new Set(st.keys || []);
    const pd = st.day || today; // ngày của Pi do máy chủ trả (trước 4:00 sáng = hôm trước) — khoá Hạt theo ngày này
    const P = { ...POINTS, ...(cfg.points || {}) };
    const lv = levelOf(st.xp);
    const nextUnlock = catalog.items.filter((it) => it.variants.includes(variant) && !it.achievement && !it.hidden && it.level === lv.n + 1).length;
    const newNow = catalog.items.filter((it) => it.variants.includes(variant) && !it.achievement && !it.hidden && it.level === lv.n).length;
    const owned = st.owned || [];
    const ids = (mealIds.length ? mealIds : ["sang", "trua", "toi"]).slice(0, 5); // máy chủ cấp Hạt tối đa 5 bữa
    const eatenIds = log.eaten_meals || [];
    const kcalOf = (id) => ((log.meals || []).find((m) => m.meal_id === id)?.items || []).reduce((a, i) => a + (Number(i.cal) || 0), 0);
    const tasks = ids.map((id) => {
      const done = keys.has(`meal:${pd}:${id}`);
      const k = kcalOf(id);
      return { key: id, meal: id, label: MEAL_LABEL[id] || "Ăn 1 bữa", sub: done ? `Đã ăn · ${Math.round(k)} kcal` : eatenIds.includes(id) && k < 100 ? "Bữa dưới 100 kcal chưa tính" : "Chưa ăn", pts: P.meal, done };
    });
    const waterGoal = waterGoalMl(profile?.kg, log.day_type === "train", profile?.waterGoalMl);
    const fmtL = (ml) => String(Math.round(ml / 100) / 10).replace(".", ",");
    const wk = weekRange(today);
    const wkKey = `weigh:${isoWeek(pd)}`;
    const weighedWeek = keys.has(wkKey) || (weightLog || []).some((w) => w.logged_date >= wk.start && w.logged_date <= today);
    const meals100 = eatenIds.filter((id) => kcalOf(id) >= 100).length;
    tasks.push(
      { key: "photo", label: "Chụp món", sub: keys.has(`photo:${pd}`) ? "Đã chụp hôm nay" : "Chụp ảnh 1 bữa đã ăn", pts: P.photo, done: keys.has(`photo:${pd}`), color: "#EA580C", icon: PIc.camera(18) },
      { key: "water", label: "Uống đủ nước", sub: `${fmtL(log.water_ml || 0)} / ${fmtL(waterGoal)} lít`, pts: P.water, done: keys.has(`water:${pd}`), color: "#0891B2", icon: ic(<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />) },
      { key: "full", label: "Ăn từ 3 bữa trở lên", sub: `${meals100} bữa đã ăn hôm nay (từ 100 kcal)`, pts: P.full_day, done: keys.has(`full:${pd}`), color: "#007AFF", icon: PIc.list(18) },
      // chuỗi: chỉ là việc khi đã có ít nhất 2 ngày liền (hôm nay ăn là thành ngày thứ 3) — dưới đó không tính vào "còn lại"
      ...((st.streak || 0) >= 2 || keys.has(`streak:${pd}`) ? [{ key: "streak", label: `Chuỗi ${st.streak || 0} ngày`, sub: keys.has(`streak:${pd}`) ? "Đã giữ chuỗi hôm nay" : "Ăn hôm nay để giữ chuỗi", pts: P.streak, done: keys.has(`streak:${pd}`), color: "#F97316", icon: PIc.flame(18) }] : []),
      { key: "weigh", label: "Cân tuần này", sub: keys.has(wkKey) ? "Đã cân tuần này" : weighedWeek ? "Đã cân, chưa tính Hạt" : "Cân 1 lần trong tuần", pts: P.weigh, done: keys.has(wkKey), color: "#64748B", icon: ic(<><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2" /></>) },
    );
    const left = tasks.filter((t) => !t.done);
    const cap = cfg.cap === undefined || cfg.cap === "" ? DAILY_CAP : Number(cfg.cap);
    const todayLeft = Math.max(0, Math.min(cap - (st.today || 0), left.reduce((a, t) => a + t.pts, 0)));
    // tâm trạng
    const times = ids.map((id) => toMin(mealTimes[id])).filter((x) => x != null);
    const lastLogged = [...(recentRows || [])].filter((r) => (r.eaten_meals || []).length && r.log_date < today).map((r) => r.log_date).sort().pop();
    const daysAway = lastLogged ? diffDays(lastLogged, today) - 1 : 0;
    const logged = eatenIds.length;
    const mood = moodOf({ minutes, mealTimes: times, logged, daysAway });
    const ach = ACH.map((a) => {
      const done = owned.includes(a.item);
      const cur = { streak: st.streak, weeks: st.weeks, water: st.waterDays, goal: st.goalDays }[a.of] || 0;
      return { key: a.key, label: a.label, item: ITEMS[a.item], done, cur: Math.min(cur, a.max), max: a.max };
    }).filter((a) => a.item);
    return {
      name: st.name || "Pi", variant, mood, bow: st.bow !== false, premium, seeds: st.balance || 0, xp: st.xp || 0, today: st.today || 0, cap,
      tasksLeft: left.length, todayLeft, level: { ...lv, nextUnlock }, owned, equipped: st.equipped || {},
      achievementIds: ACH.map((a) => a.item), achievements: ach, tasks, streak: st.streak || 0,
      trophies: owned.filter((id) => ITEMS[id]?.achievement || ACH.some((a) => a.item === id)),
      time: roomTime(Math.floor(minutes / 60)), shopLine: newNow ? `${newNow} món ở cấp ${lv.n}` : "Đồ mới theo cấp",
      levelUp: (st.prevLevel || lv.n) < lv.n, waterGoal, waterMl: log.water_ml || 0, daysAway, logged, mealsOn: ids.length, times,
      week: weekdayVN() === 0 && cfg.week !== false ? { range: `${wk.start.slice(8)}/${wk.start.slice(5, 7)} – ${wk.end.slice(8)}/${wk.end.slice(5, 7)}`, meals: 0, waterDays: 0 } : null,
      // 20/10 (chủ dự án): khách không chỉnh — Pi nói / số câu / giờ yên lặng / tổng kết tuần do Quản trị quyết (pet_config)
      settings: { talk: cfg.talk !== false, perDay: cfg.perDay || 3, quietFrom: cfg.quietFrom || "22:30", quietTo: cfg.quietTo || "07:00", week: cfg.week !== false, weekAt: "19:00", off: cfg.off || [] },
      cols: Object.fromEntries(Object.keys(COL_DEFAULT).map((k) => [k, collectionStatus(k, cfg, today)])),
    };
  }, [st, variant, premium, log, mealIds, mealTimes, minutes, today, recentRows, weightLog, profile?.kg, profile?.waterGoalMl, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- câu Pi nói lúc này (kho câu soạn sẵn, 0 đồng) ----
  const saidKey = `fp_pet_said_${user?.id}`;
  const [sayNow, setSayNow] = useState(null);
  useEffect(() => {
    if (!vm || !pet.lines || vm.settings.talk === false) { setSayNow(null); return; }
    const ls = readLS(saidKey, {});
    const said = ls.said || {};
    const saidToday = ls.day === today ? ls.n || 0 : 0;
    const evs = eventsFor({ minutes, logged: vm.logged, mealsOn: vm.mealsOn, mealTimes: vm.times, daysAway: vm.daysAway, streak: vm.streak, levelUp: vm.levelUp, level: vm.level.n, waterMl: vm.waterMl, waterGoal: vm.waterGoal, gymDay: log.day_type === "train" });
    // câu đã chọn hôm nay cho việc còn đúng thì giữ nguyên (không đổi câu mỗi lần vẽ lại)
    const quiet0 = [toMin(vm.settings.quietFrom) ?? 1350, toMin(vm.settings.quietTo) ?? 420];
    const inQuiet = quiet0[0] > quiet0[1] ? minutes >= quiet0[0] || minutes < quiet0[1] : minutes >= quiet0[0] && minutes < quiet0[1];
    if (ls.cur && ls.day === today && evs.some((e) => e.key === ls.cur.key) && !(vm.settings.off || []).includes(ls.cur.key) && !inQuiet) { setSayNow(ls.cur.text); return; }
    const prio = Object.fromEntries(Object.values(EV).map((e) => [e.key, e.prio]));
    const quiet = [toMin(vm.settings.quietFrom) ?? 1350, toMin(vm.settings.quietTo) ?? 420];
    const e = pickEvent(evs, { prio, said, nowMs: Date.now(), saidToday, perDay: vm.settings.perDay || 3, gapH: cfg.gapH || 24, minutes, quiet, off: vm.settings.off || [] });
    if (!e) { setSayNow(null); return; }
    const arr = pet.lines[e.key]?.[variant] || [];
    if (!arr.length) { setSayNow(null); return; }
    const text = fill(arr[(ls.rot?.[e.key] || 0) % arr.length], e.so);
    writeLS(saidKey, { said: { ...said, [e.key]: Date.now() }, day: today, n: saidToday + 1, cur: { key: e.key, text }, rot: { ...(ls.rot || {}), [e.key]: (ls.rot?.[e.key] || 0) + 1 } });
    setSayNow(text);
  }, [vm?.logged, vm?.streak, vm?.level?.n, vm?.waterMl, vm?.settings?.talk, pet.lines, today, Math.floor(minutes / 30), appSettings?.pet_config]); // eslint-disable-line react-hooks/exhaustive-deps

  const view0 = vm ? { ...vm, say: sayNow } : null;

  // ---- hành động ----
  const toastErr = (r) => { if (r && !r.ok) showToast?.({ text: r.error || "Chưa lưu được, thử lại" }); return r; };
  const buy = useCallback(async (it) => pet.buy(it.id), [pet]);
  const equip = useCallback(async (slot, id) => toastErr(await pet.equip(slot, id)), [pet]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Hỏi Pi ----
  const [chat, setChat] = useState([]);
  const [chatState, setChatState] = useState("idle");
  const [quota, setQuota] = useState({ left: null, max: null });
  const numbers = () => {
    const t = targets || {}, e = eaten || {};
    const rest = (a, b) => Math.max(0, Math.round((Number(a) || 0) - (Number(b) || 0)));
    return `Số thật hôm nay (${today}): đã ăn ${Math.round(e.cal || 0)}/${Math.round(t.cal || 0)} kcal, đạm ${Math.round(e.p || 0)}/${Math.round(t.p || 0)} g (còn thiếu ${rest(t.p, e.p)} g), tinh bột ${Math.round(e.c || 0)}/${Math.round(t.c || 0)} g, béo ${Math.round(e.f || 0)}/${Math.round(t.f || 0)} g; nước ${(view0?.waterMl || 0)}/${view0?.waterGoal || 0} ml; đã ăn ${view0?.logged || 0}/${view0?.mealsOn || 0} bữa; chuỗi ${view0?.streak || 0} ngày; ${log.day_type === "train" ? "hôm nay là ngày tập" : "hôm nay là ngày nghỉ"}.`;
  };
  const openChat = () => {
    if (!chat.length && view0) {
      const miss = Math.max(0, Math.round((targets?.p || 0) - (eaten?.p || 0)));
      const greet = variant === "nu" ? (miss ? `Bạn ơi, hôm nay còn thiếu ${miss} g đạm nè. Hỏi Pi gì nha?` : "Bạn ơi, hôm nay bạn muốn hỏi Pi gì nè?") : (miss ? `Ê bạn! Hôm nay còn thiếu ${miss} g đạm đó. Hỏi Pi gì nè?` : "Ê bạn! Hôm nay muốn hỏi Pi gì nè?");
      setChat([{ role: "pi", text: greet }]);
    }
    // lượt hỏi còn lại = lượt AI chat của gói (cùng cách đếm máy chủ)
    Promise.all([
      supabase.from("profiles").select("tier,ai_chat_count_today,ai_chat_count_reset_at").eq("id", user.id).maybeSingle(),
      supabase.from("subscription_settings").select("*").eq("id", 1).maybeSingle(),
    ]).then(([a, b]) => { const q = aiQuota(a.data, b.data).find((x) => x.key === "chat"); if (q) setQuota({ left: isAdmin ? q.limit : Math.max(0, q.limit - q.used), max: q.limit }); }).catch(() => {});
    openPage("pet_chat");
  };
  const send = async (text) => {
    const next = [...chat, { role: "user", text }];
    setChat(next); setChatState("thinking");
    const provider = pickAiProvider(appSettings);
    const model = pickAiModelFromSettings(appSettings, provider);
    const system = `${cfg.prompt?.[variant] || PROMPT[variant]} ${RULES}\n${numbers()}\nTên của bạn là ${view0?.name || "Pi"}.`;
    const messages = next.filter((m) => m.ai || m.role === "user").slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
    let data;
    try { data = await authFetch("ai-proxy", { provider, model, system, messages, maxTokens: 400, feature: "pet_chat" }); } catch (e) { data = { error: "Mạng chập chờn, thử lại nhé." }; }
    if (data?.quotaExceeded) { setQuota((q) => ({ ...q, left: 0 })); setChat((c) => [...c, { role: "pi", text: variant === "nu" ? "Hôm nay hết lượt hỏi rồi nè, mai mình nói tiếp nha." : "Hết lượt hỏi hôm nay rồi, mai chiến tiếp nha!" }]); setChatState("idle"); return; }
    const reply = String(data?.text || "").trim();
    if (!reply) { setChat((c) => [...c, { role: "pi", text: data?.error || "Pi chưa nghe rõ, bạn hỏi lại nhé." }]); setChatState("idle"); return; }
    setChat((c) => [...c, { role: "pi", ai: true, text: reply }]);
    setQuota((q) => (q.left != null ? { ...q, left: Math.max(0, q.left - 1) } : q));
    setChatState("talking");
    setTimeout(() => setChatState((s) => (s === "talking" ? "idle" : s)), Math.min(4000, 800 + reply.length * 35));
  };

  // ---- Tổng kết tuần ----
  const [weekAI, setWeekAI] = useState(() => readLS(`fp_pet_week_${user?.id}`, null));
  const [weekBusy, setWeekBusy] = useState(false);
  const weekData = useMemo(() => {
    if (!view0) return null;
    const wk = weekRange(today);
    const rows = [...(recentRows || []), log].filter((r) => r && r.log_date >= wk.start && r.log_date <= wk.end);
    const byDay = new Map(rows.map((r) => [r.log_date, r]));
    const meals = [...byDay.values()].reduce((a, r) => a + (r.eaten_meals || []).length, 0);
    const days = Math.max(1, diffDays(wk.start, today) + 1);
    const waterDays = [...byDay.values()].filter((r) => (r.water_ml || 0) >= view0.waterGoal * 0.8).length;
    const ws = (weightLog || []).filter((w) => w.logged_date).sort((a, b) => a.logged_date.localeCompare(b.logged_date));
    const thisW = ws.filter((w) => w.logged_date >= wk.start).pop();
    const prevW = ws.filter((w) => w.logged_date < wk.start && w.logged_date >= addDays(wk.start, -7)).pop();
    const down = thisW && prevW ? Math.round((prevW.kg - thisW.kg) * 10) / 10 : 0;
    const v = variant;
    const next = [];
    if (meals < days * view0.mealsOn) next.push("Ăn tối xong bấm Đã ăn trước 21:00");
    if (waterDays < days) next.push(`Uống đủ nước thêm ${Math.min(7, days - waterDays)} ngày`);
    next.push(`Giữ chuỗi qua ${view0.streak >= 7 ? 14 : 7} ngày`);
    return {
      range: `${wk.start.slice(8)}/${wk.start.slice(5, 7)} – ${wk.end.slice(8)}/${wk.end.slice(5, 7)}`, meals, mealsMax: 7 * view0.mealsOn, waterDays, streak: view0.streak, seeds: st?.week || 0,
      kg: thisW ? String(thisW.kg).replace(".", ",") : "—", kgDown: down > 0 ? String(down).replace(".", ",") : null,
      line: fill((pet.lines?.[down > 0 ? "weight" : "full"]?.[v] || [])[0] || (v === "nu" ? "Tuần này bạn cố gắng lắm nè!" : "Tuần này chiến tốt đó!")),
      ai: weekAI?.week === wk.start ? weekAI.text : null, next: next.slice(0, 3), start: wk.start,
    };
  }, [view0, recentRows, log, weightLog, today, weekAI, pet.lines, st?.week]); // eslint-disable-line react-hooks/exhaustive-deps
  const view = view0 ? { ...view0, week: view0.week && weekData ? { range: weekData.range, meals: weekData.meals, waterDays: weekData.waterDays } : null } : null;
  const writeWeek = async () => {
    if (!weekData) return;
    setWeekBusy(true);
    const provider = pickAiProvider(appSettings);
    const model = pickAiModelFromSettings(appSettings, provider);
    const sys = `${PROMPT[variant]} ${RULES.replace("tối đa 3 câu ngắn", "3–4 câu")}`;
    const msg = `Viết nhận xét tuần ${weekData.range} cho khách: ghi ${weekData.meals}/${weekData.mealsMax} bữa, đủ nước ${weekData.waterDays}/7 ngày, chuỗi ${weekData.streak} ngày${weekData.kgDown ? `, cân giảm ${weekData.kgDown} kg` : ""}. Nêu 1 điểm tốt, 1 chỗ nên chỉnh tuần tới (cụ thể, dễ làm).`;
    let data;
    try { data = await authFetch("ai-proxy", { provider, model, system: sys, messages: [{ role: "user", content: msg }], maxTokens: 400, feature: "pet_week" }); } catch (e) { data = null; }
    setWeekBusy(false);
    const text = String(data?.text || "").trim();
    if (!text) { showToast?.({ text: data?.error || "Pi chưa viết được, thử lại sau" }); return; }
    const v = { week: weekData.start, text };
    setWeekAI(v); writeLS(`fp_pet_week_${user?.id}`, v);
  };

  const rename = async (n) => toastErr(await pet.save({ name: String(n).trim().slice(0, 12) || "Pi" }));

  const card = on && view ? <PetTodayCard pet={view} onOpen={() => openPage("pet")} /> : null;
  const page = (sec) => {
    if (!view) return null;
    if (sec === "pet") return <PetHomeScreen pet={view} tasks={view.tasks} onBack={closeLayer} onShop={() => openPage("pet_shop")} onCloset={() => openPage("pet_closet")} onChat={cfg.ask === false ? undefined : openChat} onSettings={() => openPage("pet_settings")} onWeek={() => openPage("pet_week")} />;
    if (sec === "pet_shop") return <PetShopScreen pet={view} onBack={closeLayer} onBuy={buy} onEquip={equip} onPremium={openPremium} />;
    if (sec === "pet_closet") return <PetClosetScreen pet={view} onBack={closeLayer} onEquip={equip} onBow={(b) => pet.save({ bow: b }).then(toastErr)} />;
    if (sec === "pet_chat") return <PetChatScreen pet={view} msgs={chat.length ? chat : [{ role: "pi", text: VOICE[variant].label }]} left={quota.left ?? 1} max={quota.max} state={chatState} onSend={send} onBack={closeLayer} onPremium={openPremium} />;
    if (sec === "pet_week") return weekData ? <PetWeekScreen pet={view} w={weekData} onBack={closeLayer} onAI={cfg.weekAI === false ? undefined : writeWeek} aiBusy={weekBusy} onPremium={openPremium} /> : null;
    if (sec === "pet_settings") return <PetSettingsScreen pet={view} onBack={closeLayer} onRename={rename} />;
    return null;
  };
  return { on, card, page, view, error: pet.error };
}
