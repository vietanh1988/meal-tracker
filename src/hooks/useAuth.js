import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      const oldUid = user?.id;
      const newUid = newUser?.id;
      // Clear localStorage when user changes to prevent data leaking between accounts
      if (oldUid !== newUid) {
        localStorage.removeItem("meals_train");
        localStorage.removeItem("meals_rest");
        localStorage.removeItem("weightLog");
        localStorage.removeItem("foodCache");
      }
      setUser(newUser);
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
