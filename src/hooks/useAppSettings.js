import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const ADMIN_ID = "e2e39900-6390-4d0d-a387-cc707f0a2645";

export function useAppSettings(userId) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const isAdmin = userId === ADMIN_ID;

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("app_settings").select("*");
        if (error) { console.error("Load app_settings error:", error); }
        if (data) {
          const s = {};
          data.forEach(d => { s[d.key] = d.value; });
          setSettings(s);
          console.log("✅ Loaded app settings:", Object.keys(s).length, "keys", s);
        }
      } catch (e) { console.error("AppSettings error:", e); }
      setLoading(false);
    })();
  }, []);

  const saveSetting = useCallback(async (key, value) => {
    if (!isAdmin) { console.warn("Not admin, skip save"); return; }
    console.log("💾 Saving setting:", key, "=", value ? value.substring(0, 10) + "..." : "(empty)");
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      // Try update first
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
