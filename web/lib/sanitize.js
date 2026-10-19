// Lọc HTML do admin nhập (khối đoạn văn / HTML): chỉ giữ thẻ an toàn, bỏ script, on*=, javascript:
const ALLOWED = new Set(["b", "strong", "i", "em", "u", "s", "a", "br", "span", "mark", "sup", "sub", "code", "small", "p", "ul", "ol", "li", "h2", "h3", "h4", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "img", "figure", "figcaption", "div", "hr"]);
// Chỉ cho link an toàn: http(s), mailto, tel, đường dẫn trong web, #… — giải mã &#..; và bỏ ký tự điều khiển trước khi kiểm (chặn "&#106;avascript:", "java\tscript:")
const ENT = { amp: "&", colon: ":", tab: "\t", newline: "\n", lt: "<", gt: ">", quot: '"', apos: "'" };
export function safeUrl(u, fb = "#") {
  const raw = String(u ?? "").trim();
  if (!raw) return fb;
  const d = raw.replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/&#(\d+);?/g, (_, n) => String.fromCharCode(+n)).replace(/&([a-z]+);/gi, (m, k) => ENT[k.toLowerCase()] ?? m)
    .replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase();
  const m = d.match(/^([a-z][a-z0-9+.-]*):/);
  if (m && !["http", "https", "mailto", "tel"].includes(m[1])) return fb;
  if (/^\/\/|^\\/.test(d) && !/^https?:/.test(d)) return raw.startsWith("//") ? "https:" + raw : fb;
  return raw;
}
export function clean(html) {
  let s = String(html || "");
  // bỏ cả nội dung bên trong script/style/iframe…, rồi bỏ thẻ lẻ còn sót
  s = s.replace(/<\s*(script|style|iframe|object|embed|textarea|select|button|title)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\s*\/?\s*(script|style|iframe|object|embed|form|input|button|textarea|select|link|meta|base|title)\b[^>]*>/gi, "");
  s = s.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (m, tag, attrs) => {
    const t = tag.toLowerCase();
    if (!ALLOWED.has(t)) return "";
    if (m.startsWith("</")) return `</${t}>`;
    const keep = [];
    attrs.replace(/([a-z-]+)\s*=\s*("([^"]*)"|'([^']*)')/gi, (_, k, __, v1, v2) => {
      const key = k.toLowerCase(); const v = (v1 ?? v2 ?? "").replace(/"/g, "&quot;");
      if (key.startsWith("on")) return;
      if (["href", "src"].includes(key) && safeUrl(v, null) == null) return;
      if (["href", "src", "alt", "title", "target", "rel", "class", "id", "width", "height", "loading", "colspan", "rowspan"].includes(key)) keep.push(`${key}="${v}"`);
    });
    if (t === "a" && keep.some((k) => k.startsWith('target="_blank"')) && !keep.some((k) => k.startsWith("rel="))) keep.push('rel="noopener"');
    return `<${t}${keep.length ? " " + keep.join(" ") : ""}${t === "br" || t === "img" || t === "hr" ? " /" : ""}>`;
  });
  return s;
}
export const textOf = (html) => String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
