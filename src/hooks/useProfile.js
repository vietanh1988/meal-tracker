import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

// Các số đo lấy mặc định khi hồ sơ thiếu — đánh dấu để KHÔNG ghi ngược số giả vào DB và để màn Mục tiêu nhắc nhập.
export const BODY_FIELDS = ["cm", "kg", "birthYear", "goalKg"];
const DEFAULT = {cm:172,kg:63,birthYear:1987,goalKg:68,goalType:"bulk",months:4,exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard",gymDays:[0,2,4,5]};

export function useProfile(userId, authLoading) {
  const [profile, setProfileState] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(Date.now());
  // Hàng đợi lưu (14/10): chỉ 1 lệnh lưu chạy cùng lúc, lần bấm sau cùng luôn thắng; lỗi thì giữ lại để thử lại
  const pendingRef = useRef(null);
  const busyRef = useRef(false);

  const fetchProfile = useCallback(async (silent = false) => {
    if (authLoading) return; // auth chưa xác thực xong, chờ - không set state gì cả
    if (!userId) { setProfileState(DEFAULT); setLoading(false); return; }
    // Đang có thay đổi chưa lưu xong → không tải đè (tránh màn nhảy về số cũ)
    if (silent && (pendingRef.current || busyRef.current)) return;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data && !error) {
        const defaulted = [];
        if (!data.cm) defaulted.push("cm");
        if (!Number(data.kg)) defaulted.push("kg");
        // Chưa có năm sinh thật (cột age chỉ là mặc định DB khi tạo tài khoản) → coi là chưa nhập (onboarding để trống ô năm sinh)
        if (!data.birth_year) defaulted.push("birthYear");
        if (!Number(data.goal_kg)) defaulted.push("goalKg");
        const p = {
          cm: data.cm || DEFAULT.cm,
          kg: Number(data.kg) || DEFAULT.kg,
          birthYear: data.birth_year || (data.age ? new Date().getFullYear() - data.age : DEFAULT.birthYear),
          goalKg: Number(data.goal_kg) || DEFAULT.goalKg,
          gym: data.gym || 4,
          goalType: data.goal_type || DEFAULT.goalType,
          months: data.months || DEFAULT.months,
          activity: data.activity || "sedentary",
          gymDays: data.gym_days || DEFAULT.gymDays,
        };
        if(data.gender) p.gender = data.gender;
        if(data.exercise_type) p.exerciseType = data.exercise_type;
        if(data.cardio_intensity) p.cardioIntensity = data.cardio_intensity;
        if(data.onboarding_done) p.onboardingDone = data.onboarding_done;
        if(data.frequency) p.frequency = data.frequency;
        if(data.diet_strategy) p.dietStrategy = data.diet_strategy;
        if(data.calorie_mode) p.calorieMode = data.calorie_mode;
        p.usesSupplements = data.uses_supplements === true;
        // Cấu hình bật/tắt bữa RIÊNG của user (override cá nhân, khác với cấu hình
        // mặc định chung do admin đặt trong appSettings.meal_config). Nếu user chưa
        // từng tự chỉnh thì cột này null, app sẽ dùng mặc định chung của admin.
        if(data.meal_config) p.mealConfig = data.meal_config;
        if(data.meal_times) p.mealTimes = data.meal_times;
        if(data.water_goal_ml) p.waterGoalMl = data.water_goal_ml;
        if(data.reminder_settings) p.reminderSettings = data.reminder_settings;
        if(data.banner_dismissed_date) p.bannerDismissedDate = data.banner_dismissed_date;
        if(data.admin_role) p.adminRole = data.admin_role;
        // Chỉ ĐỌC — tier đổi qua admin (UsersTab) hoặc luồng thanh toán, không
        // qua setProfile() của user. Mặc định "free" nếu cột trống (an toàn:
        // chưa xác định được tier thì coi như free, không tự cấp quyền).
        p.tier = data.tier || "free";
        p.isLocked = !!data.is_locked;
        p.push_dismissed_date = data.push_dismissed_date || null;
        p.push_enabled_clicked = !!data.push_enabled_clicked;
        p.push_prompted_after_eaten = !!data.push_prompted_after_eaten;
        if (defaulted.length) p._defaulted = defaulted;
        p._loaded = true; // hồ sơ đọc được từ DB (dùng để quyết định có hiện onboarding hay không)
        setProfileState(p);
        if (!silent) console.log("✅ Profile loaded from cloud");
      } else if (error && error.code !== "PGRST116") {
        // Lỗi mạng / lỗi tạm thời: KHÔNG ghi đè hồ sơ thật bằng mặc định.
        // Giữ hồ sơ đang có (nếu đã tải trước đó), thử lại ở lần focus sau.
        console.error("Profile load error (giữ nguyên dữ liệu, thử lại sau 3s):", error);
        setTimeout(() => fetchProfile(true), 3000);
        return; // giữ loading/profile như cũ — không hiện hồ sơ mặc định giả
      } else {
        // Không thấy dòng profile. 16/10: có thể là phiên đăng nhập vừa hết hạn (iPhone mở lại app, mạng chập chờn)
        // → RLS trả 0 dòng. KHÔNG coi là user mới khi đã có hồ sơ / phiên không hợp lệ: trước đây app hiện lại
        // onboarding cho tài khoản đang dùng và có thể ghi đè hồ sơ thật bằng số mặc định.
        const { data: au } = await supabase.auth.getUser();
        if (silent || au?.user?.id !== userId) {
          console.warn("Profile trống nhưng phiên chưa chắc chắn — giữ nguyên, thử lại sau 3s");
          setTimeout(() => fetchProfile(true), 3000);
          return;
        }
        // User mới thật → tạo dòng mặc định (chỉ chèn, KHÔNG bao giờ ghi đè dòng đã có)
        setProfileState({ ...DEFAULT, _loaded: true });
        await supabase.from("profiles").upsert({
          id: userId, cm: DEFAULT.cm, kg: DEFAULT.kg,
          birth_year: DEFAULT.birthYear,
          goal_kg: DEFAULT.goalKg, goal_type: DEFAULT.goalType,
          months: DEFAULT.months, exercise_type: DEFAULT.exerciseType,
          frequency: DEFAULT.frequency, diet_strategy: DEFAULT.dietStrategy,
          calorie_mode: DEFAULT.calorieMode,
          gym_days: DEFAULT.gymDays,
        }, { onConflict: "id", ignoreDuplicates: true });
      }
    } catch (e) {
      console.error("Profile load error (thử lại sau 3s):", e);
      setTimeout(() => fetchProfile(true), 3000);
      return;
    }
    setLoading(false);
    lastFetchRef.current = Date.now();
  }, [userId, authLoading]);

  useEffect(() => { fetchProfile(false); }, [fetchProfile]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        if (Date.now() - lastFetchRef.current > 30000) {
          fetchProfile(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchProfile, userId]);

  const flush = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      while (pendingRef.current) {
        const payload = pendingRef.current;
        pendingRef.current = null;
        let error = null;
        try { ({ error } = await supabase.from("profiles").upsert(payload)); } catch (e) { error = e; }
        if (error) {
          console.error("Profile sync error:", error);
          if (!pendingRef.current) pendingRef.current = payload; // giữ bản mới nhất để thử lại
          busyRef.current = false;
          try { window.dispatchEvent(new CustomEvent("fp:profile-save-error", { detail: { retry: () => flush() } })); } catch (e) { /* */ }
          return;
        }
      }
      try { window.dispatchEvent(new CustomEvent("fp:profile-saved")); } catch (e) { /* */ }
    } finally { busyRef.current = false; }
  }, []);

  useEffect(() => { pendingRef.current = null; }, [userId]);

  const setProfile = useCallback(async (p) => {
    const merged = { ...DEFAULT, ...p };
    setProfileState(merged);
    lastFetchRef.current = Date.now();
    if (!userId) return;
    // số mặc định (hồ sơ thiếu) mà user chưa sửa → không ghi vào DB
    const skip = new Set((merged._defaulted || []).filter((f) => merged[f] === DEFAULT[f]));
    const body = { cm: merged.cm, kg: merged.kg, birth_year: merged.birthYear, goal_kg: merged.goalKg };
    const bodyKey = { cm: "cm", kg: "kg", birth_year: "birthYear", goal_kg: "goalKg" };
    const payload = { id: userId, goal_type: merged.goalType, months: merged.months, gym_days: merged.gymDays };
    Object.keys(body).forEach((k) => { if (!skip.has(bodyKey[k])) payload[k] = body[k]; });
    if(merged.gender) payload.gender = merged.gender;
    if(merged.exerciseType) payload.exercise_type = merged.exerciseType;
    if(merged.onboardingDone !== undefined) payload.onboarding_done = merged.onboardingDone;
    if(merged.frequency) payload.frequency = merged.frequency;
    if(merged.dietStrategy) payload.diet_strategy = merged.dietStrategy;
    if(merged.calorieMode) payload.calorie_mode = merged.calorieMode;
    if(merged.usesSupplements !== undefined) payload.uses_supplements = merged.usesSupplements === true;
    if(merged.mealConfig) payload.meal_config = merged.mealConfig;
    if(merged.mealTimes !== undefined) payload.meal_times = merged.mealTimes || null;
    if(merged.waterGoalMl !== undefined) payload.water_goal_ml = merged.waterGoalMl || null;
    if(merged.reminderSettings !== undefined) payload.reminder_settings = merged.reminderSettings || {};
    if(merged.bannerDismissedDate) payload.banner_dismissed_date = merged.bannerDismissedDate;
    // Legacy fields
    if(merged.gym) payload.gym = merged.gym;
    if(merged.activity) payload.activity = merged.activity;
    pendingRef.current = payload; // ghi đè bản chờ cũ → chỉ gửi bản mới nhất
    await flush();
  }, [userId, flush]);

  return { profile, setProfile, loading };
}
