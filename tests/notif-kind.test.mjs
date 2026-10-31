import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { notifKind } from "../src/lib/notifKind.js";

test("loại thông báo theo url", () => {
  assert.deepEqual(notifKind({ url: "/?pi=social&from=push&req=meo-mun" }), { kind: "req", nick: "meo-mun" });
  assert.deepEqual(notifKind({ url: "/?pi=social&from=push&heart=banh-bao" }), { kind: "heart", nick: "banh-bao" });
  assert.deepEqual(notifKind({ url: "/?pi=social&friend=pi-ab12" }), { kind: "friend", nick: "pi-ab12" });
  assert.equal(notifKind({ url: "/?pi=social&from=push", title: "Lan nhắn cho Pi" }).kind, "note");
  assert.equal(notifKind({ url: "/", title: "Đơn hàng đã duyệt" }).kind, "other");
  assert.equal(notifKind({ url: "/?pi=social&req=<script>" }).kind, "social"); // biệt danh lạ → không có nút trả lời
});
test("SQL tim / kết bạn: giới hạn, chuông, công tắc", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261031220000_pi_tim_ket_ban.sql", import.meta.url), "utf8");
  assert.match(sql, /insert into public\.notifications \(user_id, title, body, url\)/);
  assert.match(sql, />= 20 then\s+return jsonb_build_object\('ok', false, 'why', 'limit'\)/);
  assert.match(sql, />= 10 then\s+return jsonb_build_object\('ok', false, 'why', 'limit'\)/);
  assert.match(sql, /interval '7 days'/);
  assert.match(sql, /stranger_req boolean not null default true/);
  assert.match(sql, /if v_n > 5 then return; end if;/); // trần đẩy về máy giữ nguyên
});
