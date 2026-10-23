// 23/10: mục "Nguồn tham khảo" cuối bài phải khớp nguồn được TRÍCH trong thân bài.
// Trước đây bộ viết bài gắn danh sách link đã tra web (FDA, CDC…) dù thân bài trích tổ chức khác (Mayo Clinic, WHO…).
// Dùng chung: web (lúc hiện bài, bản chép web/lib/app/sources.js) và bộ viết bài (supabase/functions/web-writer/sources.js, bản chép y hệt).
// Khi hiện bài / khi lưu bài: (1) bỏ dòng nguồn mà tổ chức của nó không được nhắc trong thân bài; (2) thêm tổ chức được trích trong thân bài
// mà danh sách chưa có (link trang chính thức của tổ chức). Không đụng dữ liệu gốc.

// Tổ chức hay được trích → tên hiện, trang chính thức, tên miền nhận diện, cách viết trong bài
// cs = so đúng hoa thường (viết tắt tiếng Anh: WHO ≠ "who")
export const ORGS = [
  { key: "vdd", name: "Viện Dinh dưỡng – Bộ Y tế", url: "https://viendinhduong.vn", dom: ["viendinhduong.vn", "nin.gov.vn"], re: /viện dinh dưỡng/i },
  { key: "byt", name: "Bộ Y tế Việt Nam", url: "https://moh.gov.vn", dom: ["moh.gov.vn", "kcb.vn"], re: /bộ y tế(?! ?[–-] ?viện)/i },
  { key: "who", name: "Tổ chức Y tế Thế giới (WHO)", url: "https://www.who.int", dom: ["who.int"], re: /\bWHO\b|tổ chức y tế thế giới/ },
  { key: "mayo", name: "Mayo Clinic", url: "https://www.mayoclinic.org", dom: ["mayoclinic.org"], re: /mayo clinic/i },
  { key: "cleveland", name: "Cleveland Clinic", url: "https://my.clevelandclinic.org", dom: ["clevelandclinic.org"], re: /cleveland clinic/i },
  { key: "hopkins", name: "Johns Hopkins Medicine", url: "https://www.hopkinsmedicine.org", dom: ["hopkinsmedicine.org", "jhu.edu"], re: /johns hopkins/i },
  { key: "harvard", name: "Harvard T.H. Chan School of Public Health – The Nutrition Source", url: "https://nutritionsource.hsph.harvard.edu", dom: ["harvard.edu"], re: /harvard/i },
  { key: "nhsinform", name: "NHS inform (Scotland)", url: "https://www.nhsinform.scot", dom: ["nhsinform.scot"], re: /NHS Scotland|NHS inform/i },
  { key: "nhs", name: "NHS (Anh)", url: "https://www.nhs.uk", dom: ["nhs.uk"], re: /\bNHS\b(?! ?(Scotland|inform))/ },
  { key: "nice", name: "NICE (Anh)", url: "https://www.nice.org.uk", dom: ["nice.org.uk"], re: /\bNICE\b/ },
  { key: "cdc", name: "CDC (Trung tâm Kiểm soát và Phòng ngừa Dịch bệnh Hoa Kỳ)", url: "https://www.cdc.gov", dom: ["cdc.gov"], re: /\bCDC\b/ },
  { key: "fda", name: "FDA (Cục Quản lý Thực phẩm và Dược phẩm Hoa Kỳ)", url: "https://www.fda.gov", dom: ["fda.gov"], re: /\bFDA\b/ },
  { key: "nhlbi", name: "NHLBI – Viện Tim, Phổi và Huyết học Hoa Kỳ", url: "https://www.nhlbi.nih.gov", dom: ["nhlbi.nih.gov"], re: /\bNHLBI\b/ },
  { key: "niddk", name: "NIDDK – Viện Đái tháo đường, Tiêu hoá và Bệnh thận Hoa Kỳ", url: "https://www.niddk.nih.gov", dom: ["niddk.nih.gov"], re: /\bNIDDK\b/ },
  { key: "ods", name: "NIH Office of Dietary Supplements", url: "https://ods.od.nih.gov", dom: ["ods.od.nih.gov"], re: /Office of Dietary Supplements|\bODS\b/ },
  { key: "nih", name: "NIH (Viện Y tế Quốc gia Hoa Kỳ)", url: "https://www.nih.gov", dom: ["nih.gov", "ncbi.nlm.nih.gov", "medlineplus.gov"], re: /\bNIH\b(?!\s*Office)/ },
  { key: "usda", name: "USDA FoodData Central", url: "https://fdc.nal.usda.gov", dom: ["usda.gov"], re: /\bUSDA\b/ },
  { key: "dga", name: "Dietary Guidelines for Americans", url: "https://www.dietaryguidelines.gov", dom: ["dietaryguidelines.gov"], re: /Dietary Guidelines/i },
  { key: "aha", name: "Hiệp hội Tim mạch Hoa Kỳ (AHA)", url: "https://www.heart.org", dom: ["heart.org"], re: /\bAHA\b|American Heart Association|Hiệp hội Tim mạch Hoa Kỳ/ },
  { key: "ada", name: "Hiệp hội Đái tháo đường Hoa Kỳ (ADA)", url: "https://diabetes.org", dom: ["diabetes.org"], re: /American Diabetes Association|Hiệp hội Đái tháo đường Hoa Kỳ|\bADA\b/ },
  { key: "acog", name: "ACOG (Hội Sản phụ khoa Hoa Kỳ)", url: "https://www.acog.org", dom: ["acog.org"], re: /\bACOG\b/ },
  { key: "acsm", name: "ACSM (Hội Y học Thể thao Hoa Kỳ)", url: "https://www.acsm.org", dom: ["acsm.org"], re: /\bACSM\b/ },
  { key: "and", name: "Academy of Nutrition and Dietetics", url: "https://www.eatright.org", dom: ["eatright.org"], re: /Academy of Nutrition and Dietetics/i },
  { key: "efsa", name: "EFSA (Cơ quan An toàn Thực phẩm châu Âu)", url: "https://www.efsa.europa.eu", dom: ["efsa.europa.eu"], re: /\bEFSA\b/ },
  { key: "jama", name: "JAMA Network", url: "https://jamanetwork.com", dom: ["jamanetwork.com"], re: /\bJAMA\b/ },
  { key: "lancet", name: "The Lancet", url: "https://www.thelancet.com", dom: ["thelancet.com"], re: /\bLancet\b/i },
  { key: "bmj", name: "The BMJ", url: "https://www.bmj.com", dom: ["bmj.com"], re: /\bBMJ\b|British Medical Journal/ },
  { key: "nejm", name: "New England Journal of Medicine", url: "https://www.nejm.org", dom: ["nejm.org"], re: /\bNEJM\b|New England Journal/i },
  { key: "fao", name: "FAO (Tổ chức Lương thực và Nông nghiệp Liên Hợp Quốc)", url: "https://www.fao.org", dom: ["fao.org"], re: /\bFAO\b/ },
  { key: "unicef", name: "UNICEF", url: "https://www.unicef.org", dom: ["unicef.org"], re: /\bUNICEF\b/i },
  { key: "vncdc", name: "Viện Vệ sinh Dịch tễ Trung ương", url: "https://vncdc.gov.vn", dom: ["vncdc.gov.vn"], re: /Viện Vệ sinh Dịch tễ/i },
  { key: "sydney", name: "Đại học Sydney – Glycemic Index Database", url: "https://glycemicindex.com", dom: ["glycemicindex.com", "sydney.edu.au"], re: /Đại học Sydney|University of Sydney/i },
];

const strip = (h) => String(h || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const textOfBlock = (b) => {
  if (!b) return "";
  if (b.type === "list") return (b.items || []).map(strip).join(" ");
  if (b.type === "table") return [...(b.head || []), ...(b.rows || []).flat()].map(strip).join(" ");
  if (b.type === "faq") return (b.items || []).map((x) => `${strip(x.q)} ${strip(x.a)}`).join(" ");
  return strip(b.html || b.text || b.caption || "");
};
const hrefOf = (item) => (String(item).match(/href="([^"]+)"/) || [])[1] || "";
const domOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
function orgOfItem(item) {
  const d = domOf(hrefOf(item));
  const txt = strip(item);
  return ORGS.find((o) => (d && o.dom.some((x) => d === x || d.endsWith(`.${x}`))) || o.re.test(txt)) || null;
}

const isSourcesHead = (b) => b?.type === "h" && /^nguồn tham khảo$/i.test(strip(b.text).trim());

export function fixSources(blocks) {
  if (!Array.isArray(blocks)) return blocks;
  const hi = blocks.findIndex(isSourcesHead);
  const bodyBlocks = hi >= 0 ? blocks.slice(0, hi) : blocks;
  // "Viện Dinh dưỡng, Bộ Y tế" là 1 nguồn (Viện thuộc Bộ), không tính thêm Bộ Y tế
  const body = bodyBlocks.map(textOfBlock).join(" ").replace(/viện dinh dưỡng[\s,(–-]*(thuộc\s*|quốc gia[\s,–-]*)?bộ y tế\)?/gi, "Viện Dinh dưỡng");
  const cited = ORGS.filter((o) => o.re.test(body));
  // nhóm NIH: đã có NHLBI / NIDDK / ODS thì không thêm NIH chung
  const citedKeys = new Set(cited.map((o) => o.key));
  if (["nhlbi", "niddk", "ods"].some((k) => citedKeys.has(k)) && !/\bNIH\b/.test(body.replace(/NHLBI\/NIH|NIH\/NHLBI/g, ""))) citedKeys.delete("nih");
  if (!citedKeys.size && hi < 0) return blocks;
  const li = hi >= 0 && blocks[hi + 1]?.type === "list" ? hi + 1 : -1;
  const old = li >= 0 ? blocks[li].items || [] : [];
  const kept = [], have = new Set();
  for (const it of old) {
    const o = orgOfItem(it);
    if (o && citedKeys.has(o.key)) { kept.push(it); have.add(o.key); }
    else if (!o && body.toLowerCase().includes(strip(it).trim().toLowerCase().slice(0, 30))) kept.push(it); // nguồn lạ nhưng tên có trong bài
  }
  for (const o of ORGS) if (citedKeys.has(o.key) && !have.has(o.key)) kept.push(`<a href="${o.url}" target="_blank" rel="noopener">${o.name}</a>`);
  const out = blocks.slice();
  if (!kept.length) { // không còn nguồn nào được trích → bỏ hẳn mục
    if (hi >= 0) out.splice(hi, li >= 0 ? 2 : 1);
    return out;
  }
  const list = { type: "list", ordered: false, items: kept };
  if (hi >= 0) { if (li >= 0) out[li] = list; else out.splice(hi + 1, 0, list); }
  else out.push({ type: "h", level: 2, text: "Nguồn tham khảo" }, list);
  return out;
}
