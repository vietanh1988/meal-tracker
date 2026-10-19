// Tách mã <head> tuỳ ý thành thẻ React thật (in thẳng vào HTML)
// Mã <head> tuỳ ý (Cài đặt SEO › Mã theo dõi): tách thành thẻ thật để in thẳng vào HTML (bot / Google Tag Assistant thấy được).
// Chỉ nhận <script>, <meta>, <link>, <noscript>; bỏ mã GA4 trùng với ô Google Analytics 4.
const ATTR = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
const PROP = { class: "className", charset: "charSet", "http-equiv": "httpEquiv", crossorigin: "crossOrigin", referrerpolicy: "referrerPolicy", nomodule: "noModule", fetchpriority: "fetchPriority" };
function attrs(str) {
  const o = {};
  for (const m of String(str || "").matchAll(ATTR)) { const k = m[1].toLowerCase(); if (k.startsWith("on")) continue; const v = m[2] ?? m[3] ?? m[4]; o[PROP[k] || k] = v === undefined ? true : v; }
  return o;
}
export function headTags(html, ga4) {
  const src = String(html || "").replace(/<!--[\s\S]*?-->/g, "");
  if (!src.trim()) return null;
  const out = []; const re = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>|<(meta|link)\b([^>]*?)\/?>|<noscript\b[^>]*>([\s\S]*?)<\/noscript\s*>/gi; let m, i = 0;
  while ((m = re.exec(src))) {
    if (m[1] !== undefined) {
      const a = attrs(m[1]); const body = m[2] || "";
      if (ga4 && ((a.src && a.src.includes(`id=${ga4}`)) || (body.includes(ga4) && /gtag\(/.test(body)))) continue; // đã có ở ô GA4
      out.push(a.src ? <script key={i++} {...a} /> : <script key={i++} {...a} dangerouslySetInnerHTML={{ __html: body }} />);
    } else if (m[3]) out.push(m[3].toLowerCase() === "meta" ? <meta key={i++} {...attrs(m[4])} /> : <link key={i++} {...attrs(m[4])} />);
    else if (m[5] !== undefined) out.push(<noscript key={i++} dangerouslySetInnerHTML={{ __html: m[5] }} />);
  }
  return out;
}
