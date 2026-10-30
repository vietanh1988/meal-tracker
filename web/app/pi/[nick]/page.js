// 30/10 (chủ dự án chốt bản vẽ "Khoe Pi" màn 4): trang Pi của 1 khách — bạn bè quét mã QR trên ảnh khoe, chưa cài app vẫn xem được.
// Chỉ khi chủ Pi đã bật (bấm Lưu / Chia sẻ ở Khoe Pi). Không có tên thật, email, cân nặng. Không cho Google lập chỉ mục.
// Ảnh Pi lấy từ app (app.fipilotai.com/pi/…), chồng lớp đúng như app (lib/app/piLayers.js chép từ src/pi).
import { rpc } from "@/lib/sb";
import { getSettings, ogBase } from "@/lib/site";
import man from "@/lib/app/piManifest.json";
import { piLayers, tfCss } from "@/lib/app/piLayers.js";
import { sceneOf } from "@/lib/app/petMath.js";
import { todayVN, nowVNParts } from "@/lib/app/dateVN.js";

// 30/10: trang 500 trên prod — rpc() gọi fetch "no-store", không chạy được trong trang ISR → để trang luôn dựng mới mỗi lần mở (ít khách, cần số mới)
export const dynamic = "force-dynamic";

const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://veodsvojxjmjhtrlaieq.supabase.co";
const appUrl = (s) => (s?.site?.app_url || "https://app.fipilotai.com").replace(/\/$/, "");
const getPi = async (nick) => (/^[a-z0-9][a-z0-9-]{1,23}$/.test(nick || "") ? rpc("web_pi", { p_nick: nick }) : null);

export async function generateMetadata({ params }) {
  const [s, p] = await Promise.all([getSettings(), getPi(params.nick)]);
  const name = p?.name || "Pi";
  const title = p ? `${name} · Pi cấp ${p.level} trên Fipilot AI` : "Pi này đang ẩn · Fipilot AI";
  const description = p ? `Xem Pi ${name}: ${p.streak >= 2 ? `${p.streak} ngày liền được chăm, ` : ""}${p.owned} món sưu tầm. Nuôi Pi miễn phí: ăn đúng bữa, Pi lớn mỗi ngày.` : "Nuôi Pi miễn phí trong app Fipilot AI.";
  const og = ogBase(s);
  if (p?.og) og.images = [{ url: `${SB}/storage/v1/object/public/pi-share/${p.og}`, width: 720, height: 1280 }];
  return { title, description, robots: { index: false, follow: false }, alternates: { canonical: `/pi/${params.nick}` }, openGraph: { ...og, title, description, url: `/pi/${params.nick}` }, twitter: { card: "summary_large_image", title, description } };
}

export default async function PiPage({ params }) {
  const [s, p] = await Promise.all([getSettings(), getPi(params.nick)]);
  const app = appUrl(s), base = `${app}/pi/`, v = man.ver ? `?v=${man.ver}` : "";
  if (!p) {
    return (
      <main className="wrap pi-wrap">
        <div className="card pi-hide">
          <b>Pi này đang ẩn</b>
          <p>Chủ của Pi chưa mở trang này hoặc đã tắt. Bạn vẫn nuôi được Pi của riêng mình, miễn phí.</p>
          <a className="btn b1 big" href={`${app}/?ref=pi`}>Nuôi Pi của bạn</a>
        </div>
      </main>
    );
  }
  const scene = sceneOf(todayVN());
  const h = nowVNParts().hour, t = h >= 5 && h < 11 ? "sang" : h >= 11 && h < 17 ? "trua" : "toi";
  const roomT = (man.rooms[scene] || []).includes(t) ? t : (man.rooms[scene] || ["trua"])[0];
  const face = p.face && p.face !== "auto" && man.faces.includes(p.face) ? p.face : "cuoilon";
  const layers = piLayers({ man, gender: p.variant, equipped: p.equipped || {}, face, tf: p.place || {} });
  const S = 300; // cạnh khung ảnh Pi (px)
  const items = (p.items || []).filter((id) => man.items.some((x) => x.id === id)).slice(0, 12);
  const join = `${app}/?m=${encodeURIComponent(p.code)}&ref=pi`;
  return (
    <main className="wrap pi-wrap">
      <section className="pi-room" style={{ backgroundImage: `url(${base}rooms/phong_${scene}_${roomT}.webp${v})` }}>
        <span className="pi-stack" style={{ width: S, height: S }} role="img" aria-label={`Pi ${p.name}`}>
          {layers.map((L) => <img key={L.key} src={base + L.src + v} alt="" width={S} height={S} style={tfCss(L.tf, L.c, S) || undefined} />)}
        </span>
      </section>
      <div className="pi-name"><h1>{p.name}</h1><span>Cấp {p.level} · {p.variant === "nu" ? "Pi nữ" : "Pi nam"}{p.streak >= 2 ? ` · ${p.streak} ngày liền chăm Pi` : ""}</span></div>
      <div className="pi-stats">
        <div><b>{p.meals}</b><span>bữa đã ăn tuần này</span></div>
        <div><b>{p.water}/7</b><span>ngày đủ nước</span></div>
        <div><b>{p.owned}</b><span>món sưu tầm</span></div>
      </div>
      {items.length > 0 && (
        <div className="card pi-closet">
          <b>Tủ đồ của {p.name}</b>
          <div>{items.map((id) => <img key={id} src={`${base}icon/${id}.webp${v}`} alt={man.items.find((x) => x.id === id)?.name || ""} width={96} height={96} loading="lazy" />)}</div>
        </div>
      )}
      <div className="pi-cta">
        <a className="btn b1 big" href={join}>Nuôi Pi của bạn · miễn phí</a>
        <small>Mã mời <b>{p.code}</b> đã điền sẵn · bạn có 3 ngày bấm Đã ăn là cả hai nhận 50 Hạt</small>
      </div>
    </main>
  );
}
