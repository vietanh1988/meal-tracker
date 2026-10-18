// Trang tác giả (139m/n) + schema ProfilePage/Person
import { notFound } from "next/navigation";
import Crumb from "@/components/Crumb";
import SecHead from "@/components/SecHead";
import JsonLd from "@/components/JsonLd";
import { PostList } from "@/components/PostCard";
import { getSettings, siteUrl, alt } from "@/lib/site";
import { getAuthor, latestPosts } from "@/lib/content";
import { breadcrumb, ld } from "@/lib/schema";

export const revalidate = 60;
export async function generateMetadata({ params }) {
  const a = await getAuthor(params.slug);
  if (!a) return {};
  return { title: a.name, description: a.bio?.slice(0, 158) || `Các bài viết của ${a.name} trên Fipilot AI`, alternates: alt(`/tac-gia/${a.slug}`) };
}
export default async function Author({ params }) {
  const a = await getAuthor(params.slug);
  if (!a) notFound();
  const s = await getSettings();
  const posts = await latestPosts({ authorId: a.id, limit: 24 });
  const path = `/tac-gia/${a.slug}`;
  const crumbs = [{ name: "Trang chủ", path: "/" }, { name: "Tác giả", path }, { name: a.name, path }];
  const person = { "@type": "Person", name: a.name, url: siteUrl(s, path), jobTitle: a.job_title || undefined, description: a.bio || undefined, image: a.avatar_url || undefined, sameAs: (a.same_as || []).length ? a.same_as : undefined, worksFor: { "@id": siteUrl(s, "/#org") } };
  const ini = (a.name || "?").split(/\s+/).map((w) => w[0]).slice(-2).join("").toUpperCase();
  return (
    <main>
      <JsonLd data={ld(breadcrumb(s, crumbs), { "@type": "ProfilePage", mainEntity: person })} />
      <section className="phead">
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Crumb items={crumbs} />
          <div className="ahead" style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {a.avatar_url ? <img src={a.avatar_url} alt={a.name} width={128} height={128} style={{ width: 128, height: 128, borderRadius: 64, objectFit: "cover", boxShadow: "0 0 0 6px #fff" }} /> : <span style={{ width: 128, height: 128, borderRadius: 64, background: "#0062F0", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 42, boxShadow: "0 0 0 6px #fff", flexShrink: 0 }}>{ini}</span>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
              <span className="eye">Tác giả</span><h1 className="h1">{a.name}</h1>
              {a.job_title && <span style={{ fontSize: 16, color: "#475569" }}>{a.job_title}</span>}
              {a.bio && <p style={{ fontSize: 17, lineHeight: 1.7, color: "#334155" }}>{a.bio}</p>}
              {(a.same_as || []).length > 0 && <div className="chips">{a.same_as.map((u) => <a key={u} className="chip" href={u} rel="noopener me" target="_blank">{new URL(u).hostname.replace("www.", "")}</a>)}</div>}
            </div>
          </div>
        </div>
      </section>
      <div className="wrap" style={{ paddingTop: 56 }}>
        <SecHead eye="Bài viết" title={`${posts.length} bài của ${a.name}`} />
        <PostList posts={posts} />
      </div>
      <style>{`@media(max-width:720px){.ahead{flex-direction:column;align-items:flex-start!important;gap:16px!important}}`}</style>
    </main>
  );
}
