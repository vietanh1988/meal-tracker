import { appLink } from "@/lib/site";
// 23/10: after = chỗ có nút "Dùng thử" sẵn (VD ".h-btn" ở banner trang chủ) → thanh đáy ẩn lúc đầu, cuộn qua chỗ đó mới trượt lên
// (script nhỏ chạy ngay, không cần tải JS; không có chỗ đó / máy cũ thì hiện luôn)
export default function Sticky({ s, ref_ = "sticky", after }) {
  return <>
    <div className={`sticky-cta${after ? " stk-hide" : ""}`} data-testid="web-sticky"><a className="btn b1" href={appLink(s, ref_)} style={{ width: "100%", height: 48, fontSize: 15 }}>Dùng thử miễn phí</a></div>
    {after && <script dangerouslySetInnerHTML={{ __html: `(function(){var s=document.currentScript.previousElementSibling,b=document.querySelector(${JSON.stringify(after)});if(!b||!window.IntersectionObserver){s.classList.remove("stk-hide");return}new IntersectionObserver(function(e){s.classList.toggle("stk-hide",e[0].isIntersecting||e[0].boundingClientRect.top>0)}).observe(b)})()` }} />}
  </>;
}
