// Tên gọi khác / vùng miền của món ăn (23/10) — dùng chung cho tìm món, tính calo, ghép tên món gõ tay.
// canonFood(tên) → chuỗi chuẩn không dấu: 2 tên cùng món (Bắc / Nam / cách viết khác) ra cùng 1 chuỗi.
// Áp cho CẢ tên trong kho và chữ khách gõ, nên chỉ cần 1 chiều (tên khác → tên chuẩn).
// Thứ tự quan trọng: cụm dài / ngoại lệ đứng trước (VD "bí ngô" → "bí đỏ" trước khi "ngô" → "bắp").
// Không dùng regex lookbehind (Safari < 16.4 — check-logic chặn).

// [tên khác, tên chuẩn] — viết thường, có dấu, so theo nguyên từ
const PHRASES = [
  // món
  ["nem rán hà nội", "chả giò hà nội"], ["nem rán", "chả giò"], ["chả giò rế", "chả giò rế"],
  ["nem cuốn", "gỏi cuốn"], ["bánh đa nem", "bánh tráng"], ["bánh tráng cuốn", "bánh tráng cuốn"],
  ["cơm rang", "cơm chiên"], ["giò lụa", "chả lụa"], ["chà bông", "ruốc"],
  ["tàu hũ nước đường", "tào phớ"], ["tàu phớ", "tào phớ"], ["đậu hũ nước đường", "tào phớ"],
  ["hủ tíu", "hủ tiếu"], ["phở cuốn", "phở cuốn"],
  ["bánh mỳ", "bánh mì"], ["mỳ", "mì"], ["mì tôm", "mì gói"], ["mì ăn liền", "mì gói"],
  ["cà phê sữa đá", "cà phê sữa"], ["cafe", "cà phê"], ["cà fê", "cà phê"], ["cf", "cà phê"],
  ["sinh tố", "sinh tố"], ["smoothie", "sinh tố"],
  ["bún tươi", "bún"], ["bún rối", "bún"], ["cháo lòng lợn", "cháo lòng heo"], ["bún cá rô đồng", "bún cá rô"],
  ["bánh giầy", "bánh dày"], ["bánh giày", "bánh dày"],
  ["sốt cà chua", "sốt cà"], ["xốt cà chua", "sốt cà"], ["xốt", "sốt"], ["bê thui", "bê thui"], ["thịt bê thui", "bê thui"],
  ["cơm tấm sườn nướng", "cơm tấm sườn"], ["miến lươn xào", "miến lươn"],
  ["da ua", "sữa chua"], ["dau ua", "sữa chua"], ["yaourt", "sữa chua"], ["yogurt", "sữa chua"], ["yoghurt", "sữa chua"],
  // thịt
  ["thịt lợn", "thịt heo"], ["lợn", "heo"], ["thịt ba rọi", "ba chỉ"], ["thịt ba chỉ", "ba chỉ"], ["ba rọi", "ba chỉ"],
  ["thịt băm", "thịt heo xay"], ["thịt bằm", "thịt heo xay"], ["thịt xay", "thịt heo xay"], ["băm", "xay"], ["bằm", "xay"],
  ["lườn gà", "ức gà"], ["thịt ức gà", "ức gà"], ["thịt thăn", "thăn"],
  ["hột vịt lộn", "trứng vịt lộn"], ["hột vịt", "trứng vịt"], ["hột gà", "trứng gà"], ["hột cút", "trứng cút"],
  ["cá quả", "cá lóc"], ["cá chuối", "cá lóc"], ["cá mè", "cá mè"],
  ["nghêu", "ngao"], ["ốc bươu", "ốc bươu"],
  // rau củ quả, hạt
  ["bí ngô", "bí đỏ"], ["bí rợ", "bí đỏ"], ["ngô", "bắp"],
  ["sắn dây", "sắn dây"], ["củ sắn", "củ sắn"], ["sắn", "khoai mì"],
  ["khổ qua", "mướp đắng"], ["dứa", "thơm"], ["khóm", "thơm"], ["vừng", "mè"],
  ["đỗ tương", "đậu nành"], ["đậu tương", "đậu nành"], ["vịt xiêm", "ngan"], ["mùng tơi", "mồng tơi"], ["rau mồng tơi", "mồng tơi"], ["bí đao", "bí xanh"], ["chuối già", "chuối tiêu"], ["nước lèo", "nước dùng"],
  ["đậu phộng", "lạc"], ["đậu hũ", "đậu phụ"], ["tàu hũ chiên", "đậu phụ chiên"], ["tàu hũ non", "đậu phụ non"], ["đậu khuôn", "đậu phụ"],
  ["súp lơ xanh", "bông cải xanh"], ["súp lơ trắng", "bông cải trắng"], ["súp lơ", "bông cải trắng"], ["bông cải", "bông cải"],
  ["giá đỗ", "giá đậu"], ["đỗ", "đậu"], ["đậu que", "đậu cô ve"],
  ["rau diếp", "xà lách"], ["xà lách xoong", "cải xoong"],
  ["ngò rí", "rau mùi"], ["mùi tàu", "ngò gai"], ["thì là", "thìa là"],
  ["việt quất", "việt quất"], ["quất", "tắc"], ["na", "mãng cầu"], ["mãng cầu ta", "mãng cầu"],
  ["hồng xiêm", "sapoche"], ["xa pô chê", "sapoche"], ["sa bô chê", "sapoche"], ["sapôchê", "sapoche"],
  ["trái cây", "hoa quả"], ["trái", "quả"], ["bơ quả", "quả bơ"],
  ["dưa chuột", "dưa leo"], ["mướp hương", "mướp"], ["củ cải trắng", "củ cải"],
  ["khoai sọ", "khoai môn"], ["khoai từ", "khoai mỡ"],
  ["xì dầu", "nước tương"], ["mì chính", "bột ngọt"],
  // cách chế biến
  ["rán", "chiên"], ["chiên giòn", "chiên giòn"],
];

const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/\s+/g, " ").trim();
export const hasDiacritics = (s) => strip(s) !== String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

const RULES = PHRASES.map(([from, to]) => ({ from: ` ${from} `, to: ` ${to} ` })).sort((a, b) => b.from.length - a.from.length);
// Bản không dấu: chỉ luật mà bỏ dấu vẫn không trùng nghĩa ("thit lon" → "thit heo"; KHÔNG áp "lon" đứng một mình vì trùng "lon bia")
const PLAIN_RULES = PHRASES.filter(([from]) => from.includes(" ") || ["sắn", "mỳ", "rán", "bằm", "khổ qua", "đậu phộng", "xì dầu"].includes(from))
  .map(([from, to]) => ({ from: ` ${strip(from)} `, to: ` ${strip(to)} ` })).sort((a, b) => b.from.length - a.from.length);

function applyRules(text, rules) {
  let s = ` ${text} `;
  for (const r of rules) if (s.includes(r.from)) s = s.split(r.from).join(r.to.replace(/ /g, " \u0001").replace(/^ \u0001/, " "));
  return s.replace(/\u0001/g, "").replace(/\s+/g, " ").trim();
}
const clean = (name) => String(name || "").toLowerCase().normalize("NFC").replace(/[,.;:()/+\-–]+/g, " ").replace(/\s+/g, " ").trim();

const _m1 = new Map(), _m2 = new Map();
// Tên chuẩn CÓ DẤU — dùng làm "cùng món" (bỏ dấu thì "bò khô" trùng "bò kho", "mè" trùng "me" nên không dùng bản không dấu để gộp)
export function canonFood(name) {
  const k = String(name || "");
  if (!_m1.has(k)) { if (_m1.size > 5000) _m1.clear(); _m1.set(k, applyRules(clean(k), RULES)); }
  return _m1.get(k);
}
// Bản không dấu — chỉ để khớp chữ khách gõ không dấu ("thit heo rim")
export function canonPlain(name) {
  const k = String(name || "");
  if (!_m2.has(k)) { if (_m2.size > 5000) _m2.clear(); _m2.set(k, applyRules(strip(canonFood(k)), PLAIN_RULES)); }
  return _m2.get(k);
}
// Chuỗi so khớp cho chữ khách gõ: có dấu → so bản có dấu, không dấu → so bản không dấu
export function queryForm(q) { return hasDiacritics(q) ? { text: canonFood(q), plain: false } : { text: canonPlain(q), plain: true }; }

// query (khách gõ) và key (tên trong kho) có phải cùng món không
export function foodEq(query, key) { const q = queryForm(query); return q.text === (q.plain ? canonPlain(key) : canonFood(key)); }
export function keyForm(key, plain) { return plain ? canonPlain(key) : canonFood(key); }

export const FOOD_SYNONYM_COUNT = PHRASES.length;
