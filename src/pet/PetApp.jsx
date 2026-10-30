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
import { ITEMS, catalog, setPiSkin } from "./PetAvatar";
import { sfx } from "../lib/sfx";
import { isPink } from "../pi/piCatalog";
import { EV, VOICE } from "./lines";
import { GROUPS, piName, pickLine, lineById, remember, greetGroup, EVENT_GROUP, insultLevel, insultMuc, isSadSelf, isSelfHarm, SULK_MS } from "../pi/piBank";
import { parseTagged } from "../pi/piLipsync.js";
import { voiceUrl, playNow, VOICE_IDS } from "../pi/piVoice.js";
import { pi } from "../pi/piExpr";
import PERSONA from "../pi/persona.md?raw";
import { roomTime } from "./PetRoom";
import { PetHomeScreen, PetShopScreen, PetClosetScreen, PetTodayCard, PIc } from "./PetScreens";
import { buildPiContext } from "../pi/chatContext.js";
import { journeyPct } from "../pi/khoe.js";
import { PetSocialScreen } from "./PetSocialScreen";
// 30/10: Pi ĐÃ có hồ sơ + nhật ký 30 ngày ở trên → tư vấn thẳng bằng số đó, không bảo người dùng gửi nhật ký
const ADVICE = "Dữ liệu trên là hồ sơ và nhật ký thật của người dùng trong app; Pi xem được, KHÔNG được nói là không truy cập được lịch sử hay bảo người dùng gửi nhật ký. Khi người dùng hỏi nhận xét / tư vấn chế độ ăn: trả lời tối đa 4 câu ngắn (khoảng 80 từ), nêu 1–2 số thật cụ thể (ví dụ trung bình calo, đạm, món ăn nhiều), rồi 1–2 điều chỉnh làm được ngay bằng món quen của họ. Ngày không có trong nhật ký là chưa ghi, đừng đoán. Không nói về hình dáng cơ thể; vòng bụng chỉ nói theo số đo nếu có.";
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
const readSS = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
const writeSS = (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* */ } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } };

const PROMPT = {
  nam: "Bạn là Pi nam, thú cưng giọt nước trong app Fipilot AI, là bạn tập cùng của khách: hăng hái, lém lỉnh, hay rủ rê, hay dùng chữ \"chiến\", \"ngon\".",
  nu: "Bạn là Pi nữ, thú cưng giọt nước trong app Fipilot AI, là bạn thân của khách: dịu dàng, quan tâm, hay dặn dò, hay dùng chữ \"nè\", \"nha\".",
};
const RULES = "Xưng \"Pi\", gọi khách là \"bạn\". Trả lời tiếng Việt, tối đa 3 câu ngắn, không emoji, không markdown. Dùng số thật bên dưới khi có. Không chê, không dọa, không trách, không bàn béo gầy. Chuyện ngoài ăn uống tập luyện thì trả lời vui một câu rồi kéo về ăn tập. Hỏi về bệnh hoặc thuốc thì khuyên hỏi bác sĩ.";

export function usePetApp({ flagOn, isAdmin, user, profile, ud, today, minutes, mealIds = [], mealTimes = {}, eaten = {}, targets = {}, recentRows = [], weightLog = [], measures = [], appSettings, showToast, openPage, closeLayer, openPremium }) {
  const on = !!(flagOn || isAdmin) && !!user?.id;
  const pet = usePet(user?.id, on);
  // 30/10 mã mời: báo khách đã nhận mã / đã được 50 Hạt
  useEffect(() => {
    const n = pet.inviteNote;
    if (!n) return;
    showToast?.({ text: n.kind === "joined" ? `Đã nhận lời mời của ${n.name || "bạn bè"}: có 3 ngày bấm Đã ăn là cả hai được 50 Hạt` : "Bạn được 50 Hạt quà mời bạn bè" }, 4500);
    pet.clearInviteNote();
  }, [pet.inviteNote]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = pet.state;
  const variant = petVariant(profile);
  const userName = piName(user?.user_metadata?.full_name, user?.user_metadata?.name, user?.user_metadata?.username); // {ten} trong câu thoại Pi — tên tài khoản kiểu "abc123" → "bạn" (30/10)
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
      time: roomTime(Math.floor(minutes / 60)), hour: Math.floor(minutes / 60), face: st.settings?.face || "auto", color: st.settings?.color === "xanh" ? "xanh" : null, // 23/10: biểu cảm khách chọn ở Tủ đồ; 24/10 chưa chọn = "auto" (theo giờ) shopLine: newNow ? `${newNow} món ở cấp ${lv.n}` : "Đồ mới theo cấp",
      levelUp: (st.prevLevel || lv.n) < lv.n, waterGoal, waterMl: log.water_ml || 0, daysAway, logged, mealsOn: ids.length, times,
      week: weekdayVN() === 0 && cfg.week !== false ? { range: `${wk.start.slice(8)}/${wk.start.slice(5, 7)} – ${wk.end.slice(8)}/${wk.end.slice(5, 7)}`, meals: 0, waterDays: 0 } : null,
      // 20/10 (chủ dự án): khách không chỉnh — Pi nói / số câu / giờ yên lặng / tổng kết tuần do Quản trị quyết (pet_config)
      settings: { talk: cfg.talk !== false, perDay: cfg.perDay || 3, quietFrom: cfg.quietFrom || "22:30", quietTo: cfg.quietTo || "07:00", week: cfg.week !== false, weekAt: "19:00", off: cfg.off || [] },
      floorY: cfg.floorY || {}, // 24/10: tâm thảm từng phòng (Quản trị chỉnh), PetRoom đặt chân Pi tại đó
      cols: Object.fromEntries(Object.keys(COL_DEFAULT).map((k) => [k, collectionStatus(k, cfg, today)])),
      // 30/10 Khoe Pi: sổ Hạt 7 ngày (đếm bữa / nước tuần này), ngày của Pi, % chặng đường cân (không có số kg)
      keys: st.keys || [], day: st.day || today, journey: journeyPct({ weights: weightLog, goalType: profile?.goalType, goalKg: profile?.goalKg, today }),
    };
  }, [st, variant, premium, log, mealIds, mealTimes, minutes, today, recentRows, weightLog, profile?.kg, profile?.waterGoalMl, profile?.goalType, profile?.goalKg, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (ls.cur && ls.day === today && (evs.some((e) => e.key === ls.cur.key) || ls.cur.key === "greet") && !(vm.settings.off || []).includes(ls.cur.key) && !inQuiet && !readSS("fp_pi_soft")) { setSayNow(ls.cur); return; }
    // 24/10 pi_full mục 5: đang trong phiên Pi an ủi (khách vừa chán nản / chê bản thân) → tắt đùa + tắt nhắc
    if (readSS("fp_pi_soft")) { setSayNow(null); return; }
    const g0 = greetGroup(Math.floor(minutes / 60));
    if (g0) evs.push({ key: "greet" }); // chào theo giờ mở app (ưu tiên thấp nhất)
    const prio = { ...Object.fromEntries(Object.values(EV).map((e) => [e.key, e.prio])), greet: 20 };
    const quiet = [toMin(vm.settings.quietFrom) ?? 1350, toMin(vm.settings.quietTo) ?? 420];
    const e = pickEvent(evs, { prio, said, nowMs: Date.now(), saidToday, perDay: vm.settings.perDay || 3, gapH: cfg.gapH || 24, minutes, quiet, off: vm.settings.off || [] });
    if (!e) { setSayNow(null); return; }
    // câu: bộ câu Muse (src/pi/chatLines.json) theo nhóm của việc, không lặp câu trong 7 ngày; việc không có nhóm thì dùng câu Quản trị (pet_lines)
    const grp = e.key === "greet" ? g0 : EVENT_GROUP[e.key];
    const now = Date.now();
    const glasses = Math.ceil(Math.max(0, (vm.waterGoal || 0) - (vm.waterMl || 0)) / 250);
    const vars = { ten: userName, so_ngay: vm.streak || null, cap: vm.level?.n, ml: vm.waterGoal ? Math.max(0, vm.waterGoal - vm.waterMl) || null : null, so_nhiem_vu: vm.tasksLeft || null,
      kcal_con_lai: targets?.cal ? Math.max(0, Math.round((targets.cal || 0) - (eaten?.cal || 0))) : null, x: vm.tasks ? vm.tasks.filter((t) => t.done).length : null, y: vm.tasks?.length || null };
    let line = grp ? pickLine(grp, { vars, history: ls.hist || {}, now, g: variant }) : null;
    if (!line) {
      const arr = pet.lines[e.key]?.[variant] || [];
      if (!arr.length) { setSayNow(null); return; }
      line = { text: fill(arr[(ls.rot?.[e.key] || 0) % arr.length], e.so ?? (e.key === "water" ? glasses : undefined)) };
    }
    writeLS(saidKey, { said: { ...said, [e.key]: now }, day: today, n: saidToday + 1, cur: { key: e.key, ...line }, rot: { ...(ls.rot || {}), [e.key]: (ls.rot?.[e.key] || 0) + 1 }, hist: remember(ls.hist || {}, line.id, now) });
    setSayNow(line);
  }, [vm?.logged, vm?.streak, vm?.level?.n, vm?.waterMl, vm?.settings?.talk, pet.lines, today, Math.floor(minutes / 30), appSettings?.pet_config]); // eslint-disable-line react-hooks/exhaustive-deps

  // 24/10: không có câu theo việc → 1 câu "idle" có giọng thu sẵn (đổi theo ngày) để bấm vào Pi nói thành tiếng
  const idleLine = useMemo(() => {
    const ids = (GROUPS.idle?.cau || []).filter((c) => VOICE_IDS.includes(c.id) && !/\{/.test(c.text));
    if (!ids.length) return null;
    const c = ids[Number(today.replace(/-/g, "")) % ids.length];
    return { id: c.id, text: c.text, mat: c.mat, giong: c.giong };
  }, [today]);
  const line0 = sayNow || (vm && vm.mood === "vui" ? idleLine : null);
  const view0 = vm ? { ...vm, say: line0?.text || null, sayLine: line0 ? { ...line0, audio: voiceUrl(line0.id, variant) } : null } : null;

  // ---- hành động ----
  const toastErr = (r) => { if (r && !r.ok) showToast?.({ text: r.error || "Chưa lưu được, thử lại" }); return r; };
  // 31/10: mua xong "leng keng", mặc đồ "lấp lánh" (src/lib/sfx.js)
  const buy = useCallback(async (it) => { const r = await pet.buy(it.id); if (!r || r.ok !== false) sfx("coin"); return r; }, [pet]);
  const equip = useCallback(async (slot, id) => { const r = toastErr(await pet.equip(slot, id)); if (id && (!r || r.ok !== false)) sfx("sparkle"); return r; }, [pet]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // 24/10 pi_full mục 4–5: Pi trả lời — chửi / chán nản xử lý bằng câu soạn sẵn (không gọi AI, không tính lượt), còn lại AI theo prompt nhân vật của Muse
  const sess = useRef({ n: 0, heavy: 0 });
  const histKey = saidKey;
  const lineHist = () => readLS(histKey, {}).hist || {};
  const keepHist = (id) => { const ls = readLS(histKey, {}); writeLS(histKey, { ...ls, hist: remember(ls.hist || {}, id, Date.now()) }); };
  const replyLine = (l, extra = {}) => {
    if (!l) return false;
    keepHist(l.id);
    const audio = voiceUrl(l.id, variant);
    const el = playNow(audio); // phát ngay trong lúc khách bấm Gửi (iPhone chặn phát tiếng sau đó)
    setChat((c) => [...c, { role: "pi", text: l.text, expr: l.mat, giong: l.giong, audio, el, key: Date.now(), ...extra }]);
    setChatState(extra.sleep ? "sleep" : "talking");
    return true;
  };
  const send = async (text) => {
    if (chatState === "sleep") return;
    const next = [...chat, { role: "user", text }];
    setChat(next);
    const now = Date.now(), vars = { ten: userName };
    if (isSadSelf(text)) { // ưu tiên cao nhất: dịu dàng, tắt đùa + tắt nhắc nhiệm vụ trong phiên
      writeSS("fp_pi_soft", "1");
      const l = isSelfHarm(text) ? lineById("BUON-03", vars, variant) : pickLine("buon_ban_than", { vars, history: lineHist(), now, g: variant });
      replyLine(l || pickLine("buon_ban_than", { vars, now, g: variant }));
      return;
    }
    const lvl = insultLevel(text);
    if (lvl) { // bị chửi: không chửi lại; mức theo số lần trong phiên, mức 3 → Pi ngủ, im 90 s
      sess.current.n += 1; if (lvl === 2) sess.current.heavy += 1;
      const muc = insultMuc(sess.current.n, sess.current.heavy);
      const l = pickLine("bi_chui", { vars, history: lineHist(), now, muc, g: variant });
      if (muc === 3) { replyLine(l, { sleep: true }); setTimeout(() => { setChatState((s) => (s === "sleep" ? "idle" : s)); sess.current = { n: 0, heavy: 0 }; }, SULK_MS); return; }
      replyLine(l); return;
    }
    setChatState("thinking");
    const provider = pickAiProvider(appSettings);
    const model = pickAiModelFromSettings(appSettings, provider);
    const persona = cfg.prompt?.[variant] || `${PERSONA}\nBạn đang là Pi ${variant === "nu" ? "nữ (giọng bé gái ngọt ngào)" : "nam (giọng bé trai tinh nghịch)"}.`;
    const system = `${persona}\n${userName === "bạn" ? "Gọi người dùng là \"bạn\" (chưa biết tên thật)." : `Tên người dùng ({ten}): ${userName}.`} Tên Pi: ${view0?.name || "Pi"}. Không dùng emoji, không markdown. Tiền tệ trong app là Hạt (không phải điểm).\n${numbers()}\n${buildPiContext({ profile, rows: recentRows, weightLog, measures, today, target: targets })}\n${ADVICE}`;
    const messages = next.filter((m) => m.ai || m.role === "user").slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.role === "user" ? m.text : `[${m.expr || "vui"}] ${m.text}` }));
    let data;
    try { data = await authFetch("ai-proxy", { provider, model, system, messages, maxTokens: 400, feature: "pet_chat" }); } catch (e) { data = { error: "Mạng chập chờn, thử lại nhé." }; }
    if (data?.quotaExceeded) { setQuota((q) => ({ ...q, left: 0 })); setChat((c) => [...c, { role: "pi", text: variant === "nu" ? "Hôm nay hết lượt hỏi rồi nè, mai mình nói tiếp nha." : "Hết lượt hỏi hôm nay rồi, mai chiến tiếp nha!" }]); setChatState("idle"); return; }
    const tag = parseTagged(String(data?.text || "").trim()); // "[haohung] Oa giỏi quá" → mặt + câu
    if (!tag.text) { setChat((c) => [...c, { role: "pi", text: data?.error || "Pi chưa nghe rõ, bạn hỏi lại nhé." }]); setChatState("idle"); return; }
    setChat((c) => [...c, { role: "pi", ai: true, text: tag.text, expr: tag.expr, giong: tag.giong, key: Date.now() }]);
    setQuota((q) => (q.left != null ? { ...q, left: Math.max(0, q.left - 1) } : q));
    setChatState("talking");
  };
  const spoken = () => setChatState((s) => (s === "talking" ? "idle" : s));

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
  setPiSkin(!!view && isPink(view.variant, view.color)); // 30/10: icon món ở Cửa hàng / Tủ đồ theo màu Pi của khách
  // 31/10: được thêm Hạt (máy chủ cộng sau khi bấm Đã ăn, uống đủ nước…) → "leng keng"; lên cấp → kèn (lần đầu tải trang không kêu)
  const lastSeen = useRef(null);
  useEffect(() => {
    if (!vm) return;
    const cur = { seeds: vm.seeds, lv: vm.level?.n || 1 }, prev = lastSeen.current;
    lastSeen.current = cur;
    if (!prev) return;
    if (cur.lv > prev.lv) sfx("levelup");
    else if (cur.seeds > prev.seeds) sfx("coin", { vibrate: false });
  }, [vm?.seeds, vm?.level?.n]); // eslint-disable-line react-hooks/exhaustive-deps
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
    if (sec === "pet") return <PetHomeScreen pet={view} tasks={view.tasks} onBack={closeLayer} onShop={() => openPage("pet_shop")} onCloset={() => openPage("pet_closet")} onChat={cfg.ask === false ? undefined : openChat} onSettings={() => openPage("pet_settings")} onWeek={() => openPage("pet_week")} onSocial={() => openPage("pet_social")} userId={user?.id} showToast={showToast} />;
    if (sec === "pet_shop") return <PetShopScreen pet={view} onBack={closeLayer} onBuy={buy} onEquip={equip} onPremium={openPremium} />;
    if (sec === "pet_closet") return <PetClosetScreen pet={view} onBack={closeLayer} onEquip={equip} onFace={(f) => pet.save({ settings: { face: f } }).then(toastErr)} onColor={(c) => pet.save({ settings: { color: c } }).then(toastErr)} />;
    if (sec === "pet_chat") return <PetChatScreen pet={view} msgs={chat.length ? chat : [{ role: "pi", text: VOICE[variant].label }]} left={quota.left ?? 1} max={quota.max} state={chatState} onSend={send} onSpoken={spoken} onBack={closeLayer} onPremium={openPremium} />;
    if (sec === "pet_week") return weekData ? <PetWeekScreen pet={view} w={weekData} onBack={closeLayer} onAI={cfg.weekAI === false ? undefined : writeWeek} aiBusy={weekBusy} onPremium={openPremium} /> : null;
    if (sec === "pet_social") return <PetSocialScreen pet={view} userId={user?.id} onBack={closeLayer} showToast={showToast} />;
    if (sec === "pet_settings") return <PetSettingsScreen pet={view} onBack={closeLayer} onRename={rename} />;
    return null;
  };
  return { on, card, page, view, error: pet.error };
}
