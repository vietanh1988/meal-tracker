// Trang tác giả (139m/n) + schema ProfilePage/Person
import { notFound } from "next/navigation";
import Crumb from "@/components/Crumb";
import SecHead from "@/components/SecHead";
import JsonLd from "@/components/JsonLd";
import { PostList } from "@/components/PostCard";
import { getSettings, siteUrl, alt, withOg } from "@/lib/site";
import { getAuthor, latestPosts } from "@/lib/content";
import { breadcrumb, ld, schemaOn, orgGraph } from "@/lib/schema";
import { appAuthor } from "@/lib/appdata";
// Chưa tạo tác giả riêng cho web → dùng thông tin anh ở trang Giới thiệu của app
const findAuthor = async (slug) => (await getAuthor(slug)) || (await appAuthor().then((a) => (a && a.slug === slug ? a : null)));

export const revalidate = 60;
// Nút mạng xã hội như bản vẽ 139m: ô màu + tên
const SOC = [[/facebook\.com|fb\.com/, "Facebook", "f", "#1877F2"], [/zalo\.me|zalo\./, "Zalo", "Z", "#0068FF"], [/youtube\.com|youtu\.be/, "YouTube", "▶", "#FF0000"], [/tiktok\.com/, "TikTok", "♪", "#0F172A"], [/instagram\.com/, "Instagram", "◎", "#E1306C"], [/linkedin\.com/, "LinkedIn", "in", "#0A66C2"], [/x\.com|twitter\.com/, "X", "X", "#0F172A"]];
const social = (u) => { const m = SOC.find(([re]) => re.test(u)); if (m) return { n: m[1], i: m[2], c: m[3] }; let h = u; try { h = new URL(u).hostname.replace("www.", ""); } catch (e) {} return { n: h, i: h[0]?.toUpperCase() || "•", c: "#64748B" }; };
export async function generateMetadata({ params }) {
  const a = await findAuthor(params.slug);
  if (!a) return {};
  return withOg({ title: a.name, description: a.bio?.slice(0, 158) || `Các bài viết của ${a.name} trên Fipilot AI`, alternates: alt(`/tac-gia/${a.slug}`) }, typeof s !== "undefined" ? s : undefined);
}
export default async function Author({ params }) {
  const a = await findAuthor(params.slug);
  if (!a) notFound();
  const s = await getSettings();
  const posts = a.id ? await latestPosts({ authorId: a.id, limit: 24 }) : [];
  const path = `/tac-gia/${a.slug}`;
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: a.name, path }];
  const person = { "@type": "Person", name: a.name, url: siteUrl(s, path), jobTitle: a.job_title || undefined, description: a.bio || undefined, image: a.avatar_url || undefined, sameAs: (a.same_as || []).length ? a.same_as : undefined, worksFor: { "@id": siteUrl(s, "/#org") } };
  const ini = (a.name || "?").split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase();
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), schemaOn(s, "author") && { "@type": "ProfilePage", mainEntity: person }, schemaOn(s, "author") && /#org/.test(JSON.stringify(person)) ? orgGraph(s) : null)} />
      <section className="phead ahd">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Crumb items={crumbs} />
          <div className="ahead" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {a.avatar_url ? <img className="aav" src={a.avatar_url} alt={a.name} width={128} height={128} style={{ width: 128, height: 128, borderRadius: 64, objectFit: "cover", boxShadow: "0 0 0 6px #fff", flexShrink: 0 }} /> : <span className="aav" style={{ width: 128, height: 128, borderRadius: 64, background: "#0062F0", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 42, boxShadow: "0 0 0 6px #fff", flexShrink: 0 }}>{ini}</span>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
              <span className="eye">Tác giả</span><h1 className="h1" style={{ lineHeight: "normal" }}>{a.name}</h1>
              {a.job_title && <span style={{ fontSize: 16, color: "#475569" }}>{a.job_title}</span>}
              {a.bio && <p className="abio" style={{ fontSize: 17, lineHeight: 1.7, color: "#334155" }}>{a.bio}</p>}
              {(a.same_as || []).length > 0 && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{a.same_as.map((u) => { const so = social(u); return <a key={u} href={u} rel="noopener me" target="_blank" style={{ height: 40, padding: "0 14px", borderRadius: 12, background: "#fff", border: "1px solid #E6ECF5", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}><span style={{ width: 22, height: 22, borderRadius: 6, background: so.c, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900 }}>{so.i}</span>{so.n}</a>; })}</div>}
            </div>
          </div>
        </div>
      </section>
      {posts.length > 0 && <div className="wrap apw" style={{ paddingTop: 56 }}>
        <SecHead eye="Bài viết" title={`${posts.length} bài của ${a.name}`} />
        <PostList posts={posts} variant="list" mCard={false} />
      </div>}
      <style dangerouslySetInnerHTML={{ __html: `.ahd{padding:56px 0 48px!important}@media(max-width:720px){.ahd{padding:28px 0 32px!important}.ahead{flex-direction:column;align-items:flex-start!important;gap:16px!important}.aav{width:96px!important;height:96px!important;border-radius:48px!important;font-size:32px!important}.abio{font-size:16px!important}.apw{padding-top:32px!important}}` }} />
    </main>
  );
}
