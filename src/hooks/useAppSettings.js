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
          console.log("✅ Loaded app settings:", Object.keys(s).length, "keys");
        }
      } catch (e) { console.error("AppSettings error:", e); }
      setLoading(false);
    })();
  }, []);

  // Only admin can save
  const saveSetting = useCallback(async (key, value) => {
    if (!isAdmin) return;
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      const { error } = await supabase.from("app_settings").upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) console.error("Save setting error:", key, error);
      else console.log("✅ Setting saved:", key);
    } catch (e) { console.error("Save setting error:", e); }
  }, [isAdmin]);

  return { settings, loading, isAdmin, saveSetting };
}
