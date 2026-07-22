import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { applyOverrides } from "../lib/localFoodDB";

export function useAppSettings(userId) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const lastFetchRef = useRef(Date.now());
  const overridesLoadedRef = useRef(false);

  const fetchSettings = useCallback(async (silent = false) => {
    try {
      const { data, error } = await supabase.from("app_settings").select("*");
      if (error) { console.error("Load app_settings error:", error); }
      if (data) {
        const s = {};
        data.forEach(d => { s[d.key] = d.value; });
        setSettings(s);
        // Chỉ log SỐ LƯỢNG key, không log toàn bộ object — tránh in nhầm
        // các giá trị nhạy cảm (API key...) ra Console cho ai cũng đọc được.
        if (!silent) console.log("✅ Loaded app settings:", Object.keys(s).length, "keys");
      }

      // Load food overrides — chỉ 1 lần, patch LOCAL_FOODS trong memory
      if (!overridesLoadedRef.current) {
        overridesLoadedRef.current = true;
        try {
          const { data: ov } = await supabase.from("food_overrides").select("*");
          if (ov && ov.length > 0) {
            const count = applyOverrides(ov);
            if (!silent) console.log("✅ Food overrides:", count, "items patched");
          }
        } catch (e) { console.warn("Food overrides skip:", e.message); }
      }

      // Đọc quyền Admin từ database (thay vì hardcode ID)
      if (userId) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles").select("is_admin").eq("id", userId).single();
        if (profileError) { console.error("Load is_admin error:", profileError); }
        setIsAdmin(!!profileData?.is_admin);
      } else {
        setIsAdmin(false);
      }
    } catch (e) { console.error("AppSettings error:", e); }
    setLoading(false);
    lastFetchRef.current = Date.now();
  }, [userId]);

  // Load on mount + khi userId đổi
  useEffect(() => { fetchSettings(false); }, [fetchSettings]);

  // Re-sync on visibility change (30s debounce)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (Date.now() - lastFetchRef.current > 30000) {
          fetchSettings(true);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchSettings]);

  const saveSetting = useCallback(async (key, value) => {
    if (!isAdmin) { console.warn("Not admin, skip save"); return; }
    console.log("💾 Saving setting:", key, "=", value ? value.substring(0, 10) + "..." : "(empty)");
    setSettings(prev => ({ ...prev, [key]: value }));
    lastFetchRef.current = Date.now(); // block re-sync after save
    try {
      const { data: existing } = await supabase.from("app_settings")
        .select("key").eq("key", key).maybeSingle();
      
      let error;
      if (existing) {
        const res = await supabase.from("app_settings")
          .update({ value, updated_at: new Date().toISOString() })
          .eq("key", key);
        error = res.error;
      } else {
        const res = await supabase.from("app_settings")
          .insert({ key, value, updated_at: new Date().toISOString() });
        error = res.error;
      }
      
      if (error) console.error("❌ Save setting error:", key, error);
      else console.log("✅ Setting saved:", key);
    } catch (e) { console.error("Save setting error:", e); }
  }, [isAdmin]);

  return { settings, loading, isAdmin, saveSetting };
}
