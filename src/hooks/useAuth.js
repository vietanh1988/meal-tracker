import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentUid = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      currentUid = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUid = session?.user?.id ?? null;
      // Clear localStorage only when switching between different logged-in users
      if (currentUid && newUid && currentUid !== newUid) {
        localStorage.removeItem("meals_train");
        localStorage.removeItem("meals_rest");
        localStorage.removeItem("foodCache");
        console.log("🔄 Switched user, cleared local cache");
      }
      // Clear on explicit sign out
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("meals_train");
        localStorage.removeItem("meals_rest");
        localStorage.removeItem("foodCache");
        console.log("🔄 Signed out, cleared local cache");
      }
      currentUid = newUid;
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  };

  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { username } }
    });
    if (error) throw error;
    return data.user;
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return { user, loading, signIn, signUp, signOut };
}
