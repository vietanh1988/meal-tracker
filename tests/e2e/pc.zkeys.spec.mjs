import { test, expect } from "@playwright/test";
import { rest, S } from "./helpers.mjs";

// 18/10: khoá AI CHỈ GHI — kể cả Super Admin cũng không đọc lại được nguyên khoá qua app (chỉ thấy 4 ký tự cuối);
// khách thường không ghi / xem tình trạng được. Khoá USDA admin vẫn đọc (trang mẫu thực đơn dùng).
test("khoá AI chỉ ghi: không đọc được nguyên khoá, ghi qua RPC Super Admin", async () => {
  const s = S();
  const tokenOf = async () => (await fetch(`${s.url}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: s.anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: s.email, password: s.password }),
  }).then((r) => r.json())).access_token;
  const call = (tok, path, body) => fetch(`${s.url}/rest/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { apikey: s.anon, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const fake = "sk-e2e-khoa-gia-0000000000000000wxyz";

  // Khách thường
  let tok = await tokenOf();
  expect((await call(tok, "rpc/admin_set_ai_key", { p_name: "gpt_key", p_value: fake })).ok).toBe(false);
  expect((await call(tok, "rpc/admin_ai_key_status", {})).ok).toBe(false);

  const [prof] = await rest(`profiles?id=eq.${s.uid}&select=is_admin,admin_role`);
  await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: true, admin_role: "super" }) });
  try {
    tok = await tokenOf();
    const r = await call(tok, "rpc/admin_set_ai_key", { p_name: "gpt_key", p_value: fake });
    expect(r.ok).toBe(true);
    expect(await r.json()).toBe("wxyz");
    expect((await call(tok, "rpc/admin_set_ai_key", { p_name: "usda_key", p_value: fake })).ok).toBe(false);
    expect((await call(tok, "rpc/admin_set_ai_key", { p_name: "gpt_key", p_value: "ngan" })).ok).toBe(false);
    const st = await (await call(tok, "rpc/admin_ai_key_status", {})).json();
    const g = st.find((x) => x.name === "gpt_key");
    expect(g.is_set).toBe(true);
    expect(g.last4).toBe("wxyz");
    expect(JSON.stringify(st)).not.toContain(fake);
    const rows = await (await call(tok, "app_settings?key=in.(gpt_key,claude_key,gemini_key)&select=key,value")).json();
    expect(rows).toEqual([]);
  } finally {
    await rest(`profiles?id=eq.${s.uid}`, { method: "PATCH", body: JSON.stringify({ is_admin: prof?.is_admin ?? false, admin_role: prof?.admin_role ?? null }) });
    await rest("app_settings?key=eq.gpt_key", { method: "DELETE" });
  }
});
