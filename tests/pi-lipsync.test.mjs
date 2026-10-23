// 24/10 — khẩu hình Pi (src/pi/piLipsync.js) theo bảng pi_lipsync_map.json của Muse
import { test } from "node:test";
import assert from "node:assert/strict";
import { syllableVisemes, syllables, timeline, visemeAt, onsetsFromRms, audioOnsets, visemeFromRms, intensity, restMouth, parseTagged, MIN_HOLD } from "../src/pi/piLipsync.js";

test("âm tiết → khuôn miệng đúng ví dụ trong bảng", () => {
  assert.deepEqual(syllableVisemes("Chào"), ["he", "to", "o"]);
  assert.deepEqual(syllableVisemes("buổi"), ["ngam", "o", "he"]);
  assert.deepEqual(syllableVisemes("sáng"), ["he", "to"]);          // -ng giữ khuôn
  assert.deepEqual(syllableVisemes("Mình"), ["ngam", "he"]);
  assert.deepEqual(syllableVisemes("giảm"), ["he", "vua", "ngam"]);  // a ngắn, -m ngậm
  assert.deepEqual(syllableVisemes("được"), ["he", "o", "vua", "he"]);
  assert.deepEqual(syllableVisemes("hai"), ["vua", "to", "he"]);
  assert.deepEqual(syllableVisemes("năm"), ["he", "vua", "ngam"]);
  assert.deepEqual(syllableVisemes("quá"), ["o", "to"]);
  assert.deepEqual(syllableVisemes("ăn"), ["vua"]);
});

test("tách câu: số đọc từng chữ số, dấu câu thành chỗ nghỉ", () => {
  const s = syllables("Mình giảm được 2,5 kg rồi!");
  assert.deepEqual(s.map((x) => x.w), ["Mình", "giảm", "được", "hai", "năm", "kg", "rồi"]);
  assert.ok(s[3].pause >= 200 && s[6].pause >= 400);
});

test("dòng thời gian: tăng dần, mỗi khuôn ≥ 60 ms, không dùng meu / ngu khi nói, kết thúc ngậm", () => {
  for (const g of [undefined, "hao_hung", "diu_dang", "an_ui", "tu_hao"]) {
    const tl = timeline("Chào buổi sáng! Hôm nay mình uống đủ nước chưa?", { giong: g });
    assert.ok(tl.length > 8);
    for (let i = 1; i < tl.length; i++) { assert.ok(tl[i].t >= tl[i - 1].t + MIN_HOLD, `${g} ${i}`); assert.notEqual(tl[i].v, tl[i - 1].v); }
    assert.ok(tl.every((x) => !["meu", "ngu"].includes(x.v)));
    assert.equal(tl[tl.length - 1].v, "ngam");
    if (g === "an_ui") assert.ok(!tl.some((x) => x.v === "to"));
  }
  const tl = timeline("Mình");
  assert.equal(visemeAt(tl, 0), "ngam"); assert.equal(visemeAt(tl, 100), "he"); // m: ngậm trước rồi mới hé
});

test("có audio: mốc âm tiết theo biên độ, khoảng lặng > 120 ms là ngắt về ngậm", () => {
  const hop = 10, rms = [];
  const burst = (ms) => { for (let i = 0; i < ms / hop; i++) rms.push(0.3 + 0.2 * Math.sin(i)); };
  const quiet = (ms) => { for (let i = 0; i < ms / hop; i++) rms.push(0.001); };
  quiet(100); burst(600); quiet(300); burst(400); quiet(100);
  const text = "Chào bạn. Uống nước";
  const { onsets, end, segs } = audioOnsets(text, rms, hop); // 2 cụm "Chào bạn." | "Uống nước" ↔ 2 vùng có tiếng
  assert.equal(onsets.length, 4); assert.equal(segs.length, 2);
  assert.ok(onsets[0] >= 90 && onsets[0] < 200 && end <= 1500);
  for (let i = 1; i < 4; i++) assert.ok(onsets[i] > onsets[i - 1]);
  assert.ok(onsets[2] >= 950, "âm tiết thứ 3 nằm ở vùng tiếng sau");
  const tl = timeline(text, { onsets, end, segs });
  const gap = tl.find((x) => x.v === "ngam" && x.t >= 690 && x.t < 1000);
  assert.ok(gap, "về ngậm trong khoảng lặng");
});

test("biên độ, cường độ theo giọng, miệng nghỉ, thẻ [biểu cảm] của AI", () => {
  assert.equal(visemeFromRms(0.01, 1), "ngam"); assert.equal(visemeFromRms(0.9, 1), "to");
  assert.equal(intensity("vua", "hao_hung"), "to"); assert.equal(intensity("o", "hao_hung"), "o"); assert.equal(intensity("to", "diu_dang"), "vua");
  assert.equal(restMouth("buon"), "meu"); assert.equal(restMouth("ngu"), "ngu"); assert.equal(restMouth("vui"), "ngam");
  assert.deepEqual(parseTagged("[haohung] Oa, giỏi quá!"), { expr: "haohung", giong: null, text: "Oa, giỏi quá!" });
  assert.deepEqual(parseTagged("[yeu] [an_ui] Pi ở đây nè."), { expr: "yeu", giong: "an_ui", text: "Pi ở đây nè." });
  assert.equal(parseTagged("Không có thẻ").expr, null);
});
