import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
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

  // Gửi email chứa link đặt lại mật khẩu. Supabase sẽ đưa user quay lại app
  // (redirectTo) kèm 1 session tạm — onAuthStateChange bắt sự kiện
  // "PASSWORD_RECOVERY" ở trên và bật isPasswordRecovery=true.
  const sendPasswordReset = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  // Gọi khi user đã ở màn "đặt mật khẩu mới" (sau khi bấm link email)
  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    setIsPasswordRecovery(false);
  };

  return { user, loading, signIn, signUp, signOut, isPasswordRecovery, sendPasswordReset, updatePassword };
}
