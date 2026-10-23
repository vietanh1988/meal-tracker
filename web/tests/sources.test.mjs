import { test } from "node:test";
import assert from "node:assert/strict";
import { fixSources } from "../lib/sources.js";

test("23/10 Nguồn tham khảo khớp nguồn trích trong bài", () => {
  const blocks = [
    { type: "p", html: "Theo Mayo Clinic, người trên 40 tuổi mất cơ dần. NHS Scotland khuyên tập kháng lực. WHO 2020 khuyến nghị 150 phút vận động." },
    { type: "h", level: 2, text: "Nguồn tham khảo" },
    { type: "list", items: ['<a href="https://www.fda.gov/media/112972/download">Estimated Daily Calorie Needs, FDA</a>', '<a href="https://stacks.cdc.gov/x.pdf">tài liệu CDC</a>'] },
  ];
  const out = fixSources(blocks);
  const items = out.find((b) => b.type === "list").items.join(" ");
  assert.ok(!/fda\.gov|cdc\.gov/.test(items), "bỏ FDA, CDC không có trong bài");
  assert.ok(/mayoclinic\.org/.test(items) && /nhsinform\.scot/.test(items) && /who\.int/.test(items), items);
  assert.ok(!/nhs\.uk/.test(items), "NHS Scotland không tính là NHS Anh");
});

test("23/10 giữ nguồn có link cụ thể khi tổ chức được trích; Viện Dinh dưỡng, Bộ Y tế = 1 nguồn", () => {
  const blocks = [
    { type: "p", html: "Theo Viện Dinh dưỡng, Bộ Y tế, nữ 20-29 tuổi cần 1.760 kcal. NHLBI/NIH nêu mức 0,45-0,9 kg mỗi tuần." },
    { type: "h", level: 2, text: "Nguồn tham khảo" },
    { type: "list", items: ['<a href="https://www.nhlbi.nih.gov/health/educational/lose_wt/index.htm">Aim for a Healthy Weight, NHLBI</a>', '<a href="https://my.clevelandclinic.org/x">Cleveland Clinic</a>'] },
  ];
  const items = fixSources(blocks).find((b) => b.type === "list").items;
  assert.ok(items[0].includes("lose_wt"), "giữ link NHLBI cụ thể");
  assert.ok(!items.join(" ").includes("clevelandclinic"));
  assert.ok(items.join(" ").includes("viendinhduong.vn"));
  assert.ok(!items.join(" ").includes("moh.gov.vn"));
});
