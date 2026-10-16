// Món không ăn / dị ứng / ăn chay → danh sách món bị chặn cứng khỏi thực đơn AI (hàm thuần, có test).
// Khớp theo TỪ (không khớp chuỗi con): "các loại hạt" không bị hiểu nhầm là "cá"; "bỏ" không phải "bò".
// Chặn cả theo nhóm món (cat) lẫn theo tên món có chứa từ đó (VD "phở bò" khi kiêng bò, dù cat là món nước).

const CAT_WORDS = {
  seafood: ["hải sản", "cá", "tôm", "mực", "cua", "ghẹ", "sò", "hến", "ốc", "hàu", "nghêu", "ngao", "bạch tuộc", "chả cá", "cá hồi", "cá ngừ", "lươn", "tép"],
  beef: ["bò"],
  pork: ["heo", "lợn", "ba chỉ", "sườn", "giò", "chả lụa", "xá xíu", "lạp xưởng", "dăm bông", "giăm bông", "jambon", "xúc xích", "thịt nguội", "patê", "pate", "bacon", "thịt xông khói", "thịt nạc", "ba rọi", "thịt kho", "thịt rang", "nem"],
  poultry: ["gà", "vịt", "ngan", "ngỗng", "chim", "cút"],
  egg: ["trứng"],
  dairy: ["sữa", "phô mai", "whey", "casein", "yaourt", "sữa chua", "kem"],
  nuts: ["lạc", "đậu phộng", "hạt", "óc chó", "hạnh nhân", "hạt điều", "mè", "vừng", "bơ đậu phộng"],
};

// Từ người dùng gõ → các nhóm bị chặn. cat=true: chặn cả theo nhóm món trong kho (từ bao quát như "hải sản", "chay");
// cat=false: chỉ chặn theo tên món (từ cụ thể như "bò" — không kéo theo thịt dê cùng nhóm "thịt đỏ"; "hạt" — không kéo theo đậu).
const KEYWORDS = [
  ["hải sản", ["seafood"], true], ["seafood", ["seafood"], true], ["tôm cá", ["seafood"], true],
  ["cá", ["seafood"], false], ["tôm", ["seafood"], false], ["mực", ["seafood"], false], ["cua", ["seafood"], false], ["sò", ["seafood"], false], ["ốc", ["seafood"], false],
  ["thịt đỏ", ["beef", "pork"], true], ["thịt bò", ["beef"], false], ["bò", ["beef"], false], ["thịt heo", ["pork"], false], ["thịt lợn", ["pork"], false], ["heo", ["pork"], false], ["lợn", ["pork"], false],
  ["thịt gà", ["poultry"], false], ["gà", ["poultry"], false], ["vịt", ["poultry"], false], ["gia cầm", ["poultry"], true],
  ["trứng sữa", ["egg", "dairy"], false], ["trứng", ["egg"], false], ["sữa", ["dairy"], false], ["dairy", ["dairy"], false], ["lactose", ["dairy"], false],
  ["đậu phộng", ["nuts"], false], ["lạc", ["nuts"], false], ["hạt", ["nuts"], false], ["nuts", ["nuts"], false],
  ["ăn chay", ["seafood", "beef", "pork", "poultry"], true], ["chay", ["seafood", "beef", "pork", "poultry"], true],
  ["thuần chay", ["seafood", "beef", "pork", "poultry", "egg", "dairy"], true], ["vegan", ["seafood", "beef", "pork", "poultry", "egg", "dairy"], true],
];
// cat trong kho món → nhóm
const CAT_MAP = { seafood: ["seafood"], beef: ["beef"], pork: ["pork"], poultry: ["poultry"], egg_dairy: ["egg", "dairy"], nuts: ["nuts"] };

const norm = (s) => ` ${String(s || "").toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
const hasWord = (text, word) => text.includes(` ${word} `);

// Từ cụ thể → các từ tên món bị chặn (từ bao quát dùng cả nhóm CAT_WORDS)
const SPECIFIC_WORDS = {
  "cá": ["cá", "chả cá"], "tôm": ["tôm", "tép"], "mực": ["mực", "bạch tuộc"], "cua": ["cua", "ghẹ"], "sò": ["sò", "hến", "hàu", "nghêu", "ngao"], "ốc": ["ốc"],
  "thịt bò": ["bò"], "bò": ["bò"], "thịt heo": CAT_WORDS.pork, "thịt lợn": CAT_WORDS.pork, "heo": CAT_WORDS.pork, "lợn": CAT_WORDS.pork,
  "thịt gà": ["gà"], "gà": ["gà"], "vịt": ["vịt", "ngan"],
  "trứng sữa": [...CAT_WORDS.egg, ...CAT_WORDS.dairy], "trứng": CAT_WORDS.egg, "sữa": CAT_WORDS.dairy, "dairy": CAT_WORDS.dairy, "lactose": CAT_WORDS.dairy,
  "đậu phộng": ["lạc", "đậu phộng", "bơ đậu phộng"], "lạc": ["lạc", "đậu phộng", "bơ đậu phộng"], "hạt": CAT_WORDS.nuts, "nuts": CAT_WORDS.nuts,
};

function parse(avoidText) {
  const t = norm(avoidText);
  const groups = new Set(), catGroups = new Set(), words = new Set();
  if (!t.trim()) return { groups, catGroups, words };
  // "thuần chay" chứa "chay" — gom hết, Set tự bỏ trùng
  for (const [kw, gs, viaCat] of KEYWORDS) {
    if (!hasWord(t, kw)) continue;
    gs.forEach((g) => { groups.add(g); if (viaCat) { catGroups.add(g); (CAT_WORDS[g] || []).forEach((w) => words.add(w)); } });
    if (!viaCat) (SPECIFIC_WORDS[kw] || [kw]).forEach((w) => words.add(w));
  }
  // Ăn chay: mọi món tên có "thịt" (thịt bằm, thịt nguội…), chả, ruốc đều là đồ mặn (rà 16/10: "cháo thịt bằm" lọt)
  if (hasWord(t, "chay") || hasWord(t, "vegan")) ["thịt", "chả", "ruốc", "mắm"].forEach((w) => words.add(w));
  return { groups, catGroups, words };
}
export const avoidGroups = (avoidText) => parse(avoidText).groups;

// foods: { [key]: { cat } } — trả Set các key món bị chặn
export function exclusionKeys(avoidText, foods) {
  const out = new Set();
  const t = norm(avoidText);
  if (!t.trim()) return out;
  const { catGroups, words: wordSet } = parse(avoidText);
  const words = [...wordSet];
  for (const [key, item] of Object.entries(foods || {})) {
    // "trứng gà/vịt/cút" là trứng, không phải thịt gia cầm
    const k = norm(key).replace(/ trứng (gà|vịt|cút|ngỗng|chim)/g, " trứng ");
    const byCat = (CAT_MAP[item?.cat] || []).some((g) => catGroups.has(g) && !(g === "poultry" && /^ trứng /.test(k)));
    const byName = words.some((w) => hasWord(k, w));
    const literal = key.length >= 3 && hasWord(t, key.toLowerCase()); // gõ đúng tên món
    if (byCat || byName || literal) out.add(key);
  }
  return out;
}

// Kiểm 1 tên món bất kỳ (kể cả món tự gõ / AI tính, không có trong kho) có dính món không ăn không
export function avoidMatcher(avoidText) {
  const t = norm(avoidText);
  if (!t.trim()) return () => false;
  const words = [...parse(avoidText).words];
  return (name) => {
    const k = norm(name).replace(/ trứng (gà|vịt|cút|ngỗng|chim)/g, " trứng ");
    return words.some((w) => hasWord(k, w));
  };
}
