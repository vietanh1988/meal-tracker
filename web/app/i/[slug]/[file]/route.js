// 23/10: ảnh infographic /i/<slug>/<n>.png — máy vẽ từ bảng số liệu trong bài (lib/infographic.js), màu thương hiệu, chữ Việt chuẩn.
// Không gọi AI. Cache 1 ngày ở CDN; bài sửa bảng thì ảnh đổi theo sau khi hết cache.
import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";
import { prepare } from "@/lib/blocks";
import { infoSpecs, infoHeight, fmtV, fmtN } from "@/lib/infographic";

const mid = (v) => (v.lo + v.hi) / 2;

export const revalidate = 86400;

// Màu theo logo / app (src/theme.js)
const C = { blue: "#007AFF", deep: "#0057FF", sky: "#5AC8FA", mint: "#00C896", violet: "#7C3AED", gray: "#8E8E93", ink: "#0F172A", t2: "#475569", t3: "#64748B", line: "#E2E8F0", bg: "#F8FAFC", soft: "#EEF4FF" };
const MAC = [["Đạm", C.blue], ["Tinh bột", C.sky], ["Béo", C.gray]];

async function font(weight) {
  // Google Fonts trả TTF khi không gửi User-Agent trình duyệt (satori không đọc woff2)
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&display=swap`, { next: { revalidate: 604800 } })).text();
  const url = (css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/) || [])[1];
  if (!url) throw new Error("font");
  return (await fetch(url, { next: { revalidate: 604800 } })).arrayBuffer();
}

const Row = ({ children, style }) => <div style={{ display: "flex", ...style }}>{children}</div>;
const Col = ({ children, style }) => <div style={{ display: "flex", flexDirection: "column", ...style }}>{children}</div>;
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s));

function Bars({ sp }) {
  const max = Math.max(...sp.rows.map((x) => x.kcal.hi)) || 1;
  return (
    <Col style={{ gap: sp.macro ? 18 : 14 }}>
      {sp.macro && <Row style={{ gap: 22, fontSize: 20, color: C.t2, marginBottom: 4 }}>{MAC.map(([n, c]) => <Row key={n} style={{ alignItems: "center", gap: 8 }}><div style={{ width: 16, height: 16, borderRadius: 4, background: c }} />{`${n} (% calo)`}</Row>)}</Row>}
      {sp.rows.map((x, i) => {
        const w = Math.max(4, (x.kcal.hi / max) * 100);
        const e = sp.macro ? [mid(x.p) * 4, mid(x.c) * 4, mid(x.f) * 9] : null;
        const tot = e ? e[0] + e[1] + e[2] || 1 : 1;
        return (
          <Row key={i} style={{ alignItems: "center", gap: 20 }}>
            <Col style={{ width: 330 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{clip(x.name, 26)}</div>
              {x.sub && <div style={{ fontSize: 19, color: C.t3 }}>{clip(x.sub, 34)}</div>}
            </Col>
            <Col style={{ flex: 1, gap: 6 }}>
              <Row style={{ height: 30, width: `${w}%`, borderRadius: 15, background: `linear-gradient(90deg, ${C.blue}, ${C.deep})` }} />
              {e && <Row style={{ height: 10, width: `${w}%`, borderRadius: 5, overflow: "hidden" }}>{e.map((v, k) => <div key={k} style={{ width: `${(v / tot) * 100}%`, height: 10, background: MAC[k][1] }} />)}</Row>}
            </Col>
            <div style={{ width: 150, justifyContent: "flex-end", display: "flex", fontSize: 28, fontWeight: 800, color: C.ink }}>{fmtV(x.kcal)}</div>
          </Row>
        );
      })}
    </Col>
  );
}

function Menu({ sp }) {
  return (
    <Col style={{ gap: 12 }}>
      {sp.rows.map((x, i) => (
        <Row key={i} style={{ alignItems: "center", gap: 18, background: i % 2 ? "#FFFFFF" : C.soft, borderRadius: 16, padding: "12px 20px" }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: [C.blue, C.mint, C.violet, C.sky][i % 4] }} />
          <Col style={{ flex: 1 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: C.ink }}>{clip(x.name, 30)}</div>
            {x.sub && <div style={{ fontSize: 19, color: C.t2 }}>{clip(x.sub, 62)}</div>}
          </Col>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.deep }}>{`${fmtV(x.kcal)} kcal`}</div>
        </Row>
      ))}
      <Row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "14px 20px", borderRadius: 16, background: C.ink, color: "#FFFFFF" }}>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Cộng các bữa trong bảng</div>
        <div style={{ fontSize: 30, fontWeight: 800 }}>{`≈ ${fmtV(sp.total)} kcal`}</div>
      </Row>
    </Col>
  );
}

function Pair({ sp }) {
  const max = Math.max(...sp.rows.flatMap((x) => [x.a.hi, x.b.hi])) || 1;
  const col = [C.gray, C.mint];
  return (
    <Col style={{ gap: 16 }}>
      <Row style={{ gap: 26, fontSize: 20, color: C.t2 }}>{sp.legend.map((n, k) => <Row key={k} style={{ alignItems: "center", gap: 8 }}><div style={{ width: 16, height: 16, borderRadius: 4, background: col[k] }} />{clip(n, 40)}</Row>)}</Row>
      {sp.rows.map((x, i) => (
        <Row key={i} style={{ alignItems: "center", gap: 20 }}>
          <div style={{ width: 200, fontSize: 26, fontWeight: 700, color: C.ink }}>{clip(x.name, 14)}</div>
          <Col style={{ flex: 1, gap: 6 }}>
            {[x.a, x.b].map((v, k) => (
              <Row key={k} style={{ alignItems: "center", gap: 12 }}>
                <div style={{ height: 24, width: `${Math.max(4, (v.hi / max) * 82)}%`, borderRadius: 12, background: col[k] }} />
                <div style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{fmtV(v)}</div>
              </Row>
            ))}
          </Col>
        </Row>
      ))}
      {sp.total && (
        <Row style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "14px 20px", borderRadius: 16, background: C.ink, color: "#FFFFFF", fontSize: 24, fontWeight: 700 }}>
          <div>Cả ngày</div>
          <div>{`${fmtV(sp.total.a)} → ${fmtV(sp.total.b)} kcal (bớt ≈ ${fmtN((sp.total.a.lo + sp.total.a.hi) / 2 - (sp.total.b.lo + sp.total.b.hi) / 2)})`}</div>
        </Row>
      )}
    </Col>
  );
}

export async function GET(req, { params }) {
  const n = Number(String(params.file || "").replace(/\.png$/i, ""));
  const p = await getPostBySlug(params.slug);
  if (!p || !Number.isInteger(n)) return new Response("Không có", { status: 404 });
  const it = infoSpecs(await prepare(p.blocks), p).find((x) => x.n === n);
  if (!it) return new Response("Không có", { status: 404 });
  const sp = it.spec;
  const origin = new URL(req.url).origin;
  const [f6, f8] = await Promise.all([font(600), font(800)]);
  const H = infoHeight(sp);
  return new ImageResponse(
    (
      <Col style={{ width: 1200, height: H, background: "#FFFFFF", fontFamily: "BVP", padding: "44px 56px 30px", borderTop: `14px solid ${C.blue}` }}>
        <Col style={{ gap: 6, marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.blue, letterSpacing: 1 }}>{sp.kind === "menu" ? "THỰC ĐƠN MẪU" : sp.kind === "pair" ? "SO SÁNH" : `CALO · ${sp.unit.toUpperCase()}`}</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.ink, lineHeight: 1.15 }}>{clip(sp.title || p.title, 70)}</div>
        </Col>
        <Col style={{ flex: 1 }}>{sp.kind === "menu" ? <Menu sp={sp} /> : sp.kind === "pair" ? <Pair sp={sp} /> : <Bars sp={sp} />}</Col>
        <Row style={{ justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${C.line}`, paddingTop: 16, marginTop: 20 }}>
          <Row style={{ alignItems: "center", gap: 12 }}>
            <img src={`${origin}/logo-512.png`} width={40} height={40} style={{ borderRadius: 9 }} />
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Fipilot AI</div>
          </Row>
          <div style={{ fontSize: 19, color: C.t3 }}>{`fipilotai.com/${clip(p.slug, 40)} · số ước tính theo bài`}</div>
        </Row>
      </Col>
    ),
    { width: 1200, height: H, fonts: [{ name: "BVP", data: f6, weight: 600 }, { name: "BVP", data: f8, weight: 800 }], headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400" } }
  );
}
