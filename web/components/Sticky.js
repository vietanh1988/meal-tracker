import { appLink } from "@/lib/site";
export default function Sticky({ s, ref_ = "sticky" }) {
  return <div className="sticky-cta"><a className="btn b1" href={appLink(s, ref_)} style={{ width: "100%", height: 48, fontSize: 15 }}>Dùng thử miễn phí</a></div>;
}
