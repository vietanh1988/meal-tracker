// web-writer: chạy hàng chờ "AI viết bài" (Quản trị › WEB · NỘI DUNG › AI viết bài). Lõi ở writer.js (test bằng bun).
// - "tick": pg_cron gọi mỗi phút (mã bí mật trong vault) → chạy 1 bước ngắn của ĐÚNG 1 bài cũ nhất chưa xong.
// - "test" / "redraw": admin thử khoá, vẽ lại 1 ảnh trong trình soạn.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { makeWriter } from "./writer.js";
import encodeWebp from "https://esm.sh/@jsquash/webp@1.4.0/encode";

const w = makeWriter({
  db: () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } }),
  Image,
  envClaude: Deno.env.get("CLAUDE_API_KEY") || "",
  // 23/10: ảnh lưu WebP (libwebp wasm); lỗi thì writer tự lưu JPEG
  webp: (rgba: Uint8Array, width: number, height: number, quality: number) => encodeWebp({ data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height, colorSpace: "srgb" } as ImageData, { quality }),
});
Deno.serve((req: Request) => w.handle(req));
