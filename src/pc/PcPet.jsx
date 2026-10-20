// Quản trị PC — Thú cưng Pi (bản vẽ đợt "Pi nói chuyện + khen", chốt 20/10). Khung + bảng + nút dùng pcUI như các trang Pc* khác.
// 4 tab: Tổng quan · Kho đồ · Câu Pi nói · Cài đặt. Bản vẽ: số liệu truyền vào qua `data` (chưa có bảng DB pet_*).
// Luật đã chốt: kho đồ theo bản (Nam / Nữ / Chung); đồ thành tích không bán; Hiếm / Huyền thoại chỉ Premium; trần 120 Hạt/ngày;
// câu khen soạn sẵn không tốn AI; Hỏi Pi dùng lượt AI chat của gói; tổng kết tuần Chủ nhật (AI viết cho Premium).
import { useState } from "react";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, FilterSelect, headRow, bodyRow, cell, vnInt } from "./pcUI";
import { Switch } from "./PcFlags";
import { PetAvatar, ITEMS, catalog } from "../pet/PetAvatar";
import { EVENTS, VOICE } from "../pet/lines";

const RAR = { common: ["Phổ thông", "gray"], rare: ["Hiếm", "blue"], legendary: ["Huyền thoại", "amber"] };
const VAR = (it) => (it.variants.length === 2 ? ["Chung", "gray"] : it.variants[0] === "nam" ? ["Nam", "blue"] : ["Nữ", "violet"]);
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const lbl = { fontSize: 12, fontWeight: 800, color: PC.t3 };
const field = { width: "100%", height: 36, borderRadius: 10, background: "#FFFFFF", border: `1px solid ${PC.field}`, padding: "0 12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: PC.t1, boxSizing: "border-box" };

function Tabs({ value, onChange }) {
  const T = [["overview", "Tổng quan"], ["items", "Kho đồ"], ["lines", "Câu Pi nói"], ["settings", "Cài đặt"]];
  return (
    <div role="tablist" aria-label="Thú cưng Pi" style={{ display: "flex", gap: 6, padding: 4, borderRadius: 12, background: "#E9EEF7" }}>
      {T.map(([k, l]) => {
        const on = value === k;
        return <button key={k} role="tab" aria-selected={on} data-testid={`pc-pet-tab-${k}`} onClick={() => onChange?.(k)} className="pc-btn"
          style={{ height: 32, padding: "0 16px", borderRadius: 9, border: "none", background: on ? "#FFFFFF" : "transparent", color: on ? PC.t1 : PC.t3, fontSize: 13, fontWeight: on ? 900 : 700, fontFamily: "inherit", cursor: "pointer", boxShadow: on ? "0 1px 2px rgba(15,23,42,0.08)" : "none" }}>{l}</button>;
      })}
    </div>
  );
}
function Tile({ label, value, sub, color }) {
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 26, fontWeight: 900, color, whiteSpace: "nowrap" }}>{value}</span>
        <span style={{ fontSize: 12, color: PC.t4 }}>{sub}</span>
      </div>
    </Card>
  );
}
function CardHead({ title, sub, right }) {
  return (
    <div style={{ padding: "14px 16px 12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 900 }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: PC.t3 }}>{sub}</span>}
      </span>
      {right}
    </div>
  );
}
const Thumb = ({ it, s = 30 }) => <span style={{ width: s + 6, height: s + 6, borderRadius: 9, background: "#F4F7FC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><img src={`/pet/${it.file}`} alt="" style={{ maxWidth: s, maxHeight: s, objectFit: "contain" }} /></span>;

// ============ Tổng quan ============
function Overview({ d }) {
  const top = d.topItems.map(([id, n]) => [ITEMS[id], n]);
  const ev = d.said;
  const maxEv = Math.max(...ev.map((e) => e[1]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <Tile label="Khách có Pi" value={vnInt(d.pets)} sub={`Pi nam ${vnInt(d.petsNam)} · Pi nữ ${vnInt(d.petsNu)}`} color={PC.t1} />
        <Tile label="Hạt phát hôm nay" value={vnInt(d.seedsToday)} sub={`${vnInt(d.capHit)} khách chạm trần 120`} color="#16A34A" />
        <Tile label="Đồ bán hôm nay" value={`${vnInt(d.soldToday)} món`} sub={`${vnInt(d.soldPremium)} món Hiếm / Huyền thoại`} color="#0062F0" />
        <Tile label="Lượt hỏi Pi hôm nay" value={vnInt(d.askToday)} sub={`${d.askShare}% lượt AI chat của app`} color="#7C3AED" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <Card>
          <CardHead title="Món bán chạy 7 ngày" sub="Đếm lượt mua · không tính đồ thành tích" />
          <div style={headRow("1fr 70px 70px")}><span>MÓN</span><span>BẢN</span><span style={{ textAlign: "right" }}>ĐÃ BÁN</span></div>
          {top.map(([it, n]) => (
            <div key={it.id} style={bodyRow("1fr 70px 70px")}>
              <span style={{ ...cell, display: "flex", alignItems: "center", gap: 10 }}><Thumb it={it} s={26} /><span style={cell}>{it.name}</span></span>
              <span><Pill tone={VAR(it)[1]}>{VAR(it)[0]}</Pill></span>
              <b style={{ textAlign: "right" }}>{vnInt(n)}</b>
            </div>
          ))}
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <CardHead title="Pi đã khen / nhắc hôm nay" sub="Câu soạn sẵn · 0 đồng AI" />
            <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {ev.map(([k, n]) => (
                <span key={k} style={{ display: "grid", gridTemplateColumns: "190px 1fr 56px", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <span style={cell}>{EVENTS.find((e) => e.key === k).label}</span>
                  <span aria-hidden="true" style={{ height: 8, borderRadius: 4, background: "#EEF2FA", overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${(n / maxEv) * 100}%`, background: "#0EA5E9", borderRadius: 4 }} /></span>
                  <b style={{ textAlign: "right" }}>{vnInt(n)}</b>
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="Tổng kết tuần gần nhất" sub={d.week.when} />
            <div style={{ padding: "0 16px 14px 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[["Đã gửi", vnInt(d.week.sent)], ["Mở xem", `${d.week.opened}%`], ["AI viết (Premium)", vnInt(d.week.ai)]].map(([l, v]) => (
                <span key={l} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 10, background: "#F8FAFC" }}><span style={{ fontSize: 11, fontWeight: 700, color: PC.t3 }}>{l}</span><b style={{ fontSize: 18 }}>{v}</b></span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============ Kho đồ ============
const ICOLS = "minmax(150px, 1fr) 52px 86px 36px 56px 54px 80px";
function Items({ d, sel = "ao-roi-10", varFilter = "all" }) {
  const list = catalog.items.filter((it) => varFilter === "all" || (varFilter === "chung" ? it.variants.length === 2 : it.variants.length === 1 && it.variants[0] === varFilter));
  const it = ITEMS[sel];
  const st = (x) => (d.achievement.includes(x.id) ? ["Thành tích", "amber"] : d.hidden.includes(x.id) ? ["Đang ẩn", "gray"] : ["Đang bán", "green"]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16, alignItems: "start" }}>
      <Card style={{ minWidth: 0 }}>
        <CardHead title={`${list.length} món`} sub={`Pi nam ${catalog.items.filter((x) => x.variants.join() === "nam").length} món riêng · Pi nữ ${catalog.items.filter((x) => x.variants.join() === "nu").length} món riêng · ${catalog.items.filter((x) => x.variants.length === 2).length} món chung (đồ thành tích là đồ chung)`} right={<Btn kind="blue" testid="pc-pet-add">+ Thêm món</Btn>} />
        <div style={{ padding: "0 16px 12px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <SearchBox value="" onChange={() => {}} placeholder="Tìm tên món…" width={200} />
          <FilterSelect label="Bản" value={varFilter} onChange={() => {}} options={[{ v: "all", label: "Tất cả" }, { v: "nam", label: "Nam" }, { v: "nu", label: "Nữ" }, { v: "chung", label: "Chung" }]} />
          <FilterSelect label="Ô đeo" value="all" onChange={() => {}} options={[{ v: "all", label: "Tất cả" }, ...Object.entries(catalog.slots).map(([v, label]) => ({ v, label }))]} />
          <FilterSelect label="Độ hiếm" value="all" onChange={() => {}} options={[{ v: "all", label: "Tất cả" }, { v: "common", label: "Phổ thông" }, { v: "rare", label: "Hiếm" }, { v: "legendary", label: "Huyền thoại" }]} />
        </div>
        <div style={headRow(ICOLS)}><span>MÓN</span><span>BẢN</span><span>ĐỘ HIẾM</span><span>CẤP</span><span style={{ textAlign: "right" }}>GIÁ</span><span style={{ textAlign: "right" }}>ĐÃ BÁN</span><span>BÁN</span></div>
        {list.slice(0, 16).map((x) => (
          <button key={x.id} className="pc-row pc-click" style={bodyRow(ICOLS, x.id === sel)}>
            <span style={{ ...cell, display: "flex", alignItems: "center", gap: 10 }}><Thumb it={x} /><span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><b style={cell}>{x.name}</b><span style={{ fontSize: 11, color: PC.t4 }}>{catalog.slots[x.slot]} · {x.id}</span></span></span>
            <span><Pill tone={VAR(x)[1]}>{VAR(x)[0]}</Pill></span>
            <span><Pill tone={RAR[x.rarity][1]}>{RAR[x.rarity][0]}</Pill></span>
            <span style={cell}>{x.level}</span>
            <b style={{ ...cell, textAlign: "right" }}>{d.achievement.includes(x.id) ? "—" : vnInt(x.price)}</b>
            <span style={{ ...cell, textAlign: "right" }}>{d.achievement.includes(x.id) ? "—" : vnInt(d.sold[x.id] || 0)}</span>
            <span><Pill tone={st(x)[1]}>{st(x)[0]}</Pill></span>
          </button>
        ))}
        <div style={{ padding: "10px 16px", fontSize: 12, color: PC.t3 }}>Hiện 16 / {list.length} món · cuộn để xem tiếp</div>
      </Card>

      {/* Ngăn sửa món */}
      <Card testid="pc-pet-edit" style={{ position: "sticky", top: 84 }}>
        <CardHead title={it.name} sub={`${it.id} · ${catalog.slots[it.slot]}`} right={<Pill tone={st(it)[1]}>{st(it)[0]}</Pill>} />
        <div style={{ margin: "0 16px", borderRadius: 12, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EAF4FF 55%, #D6E8FF 100%)", height: 190, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 18, paddingBottom: 10 }}>
          {["nam", "nu"].map((v) => (
            <span key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: it.variants.includes(v) ? 1 : 0.35, filter: it.variants.includes(v) ? "none" : "grayscale(1)" }}>
              <PetAvatar variant={v} size={140} still equipped={it.variants.includes(v) ? { [it.slot]: it.id } : {}} />
              <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3 }}>{v === "nam" ? "Pi nam" : "Pi nữ"}{it.variants.includes(v) ? "" : " · không có"}</span>
            </span>
          ))}
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Tên hiển thị</span><input className="pc-input" defaultValue={it.name} style={field} /></label>
          <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={lbl}>Dành cho</span>
            <span role="group" aria-label="Dành cho" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[["nam", "Pi nam"], ["nu", "Pi nữ"], ["chung", "Cả hai"]].map(([k, l]) => {
                const on = k === (it.variants.length === 2 ? "chung" : it.variants[0]);
                return <button key={k} aria-pressed={on} className="pc-btn" style={{ height: 34, borderRadius: 10, border: on ? "1px solid #BFD4FF" : `1px solid ${PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t1, fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>{l}</button>;
              })}
            </span>
            {it.slot === "ao" && <span style={{ fontSize: 11, color: PC.t4 }}>Áo vẽ liền thân: cần ảnh “thân mặc áo” cho từng bản được chọn.</span>}
          </span>
          <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Độ hiếm</span><select className="pc-input" defaultValue={it.rarity} style={field}>{Object.entries(RAR).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Mở ở cấp</span><input className="pc-num" defaultValue={it.level} style={{ ...field, fontWeight: 800 }} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Giá (Hạt)</span><input className="pc-num" defaultValue={it.price} style={{ ...field, fontWeight: 800 }} /></label>
          </span>
          <span style={{ fontSize: 12, color: PC.t3, lineHeight: 1.45 }}>{it.rarity === "common" ? "Phổ thông: mọi khách mua được." : "Hiếm / Huyền thoại: chỉ khách Premium mua được."} Đã bán {vnInt(d.sold[it.id] || 0)} lần · đang mặc {vnInt(Math.round((d.sold[it.id] || 0) * 0.62))} khách.</span>
          <span style={{ display: "flex", gap: 8 }}>
            <Btn kind="blue" style={{ flex: 1 }} testid="pc-pet-save">Lưu món</Btn>
            <Btn kind="light" testid="pc-pet-hide">Ẩn khỏi cửa hàng</Btn>
          </span>
        </div>
      </Card>
    </div>
  );
}

// ============ Câu Pi nói ============
function Lines({ sel = "streak", d }) {
  const e = EVENTS.find((x) => x.key === sel);
  const col = (v) => (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <CardHead title={VOICE[v].label} sub={`${VOICE[v].tag} · hay dùng: ${VOICE[v].words}`} right={<Btn kind="soft">+ Thêm câu</Btn>} />
      <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {e[v].map((t, i) => {
          const n = words(t); const long = n > 15;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12, borderRadius: 12, border: `1px solid ${PC.field}` }}>
              <input className="pc-input" defaultValue={t} aria-label={`Câu ${i + 1}`} style={{ ...field, fontWeight: 700 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#EEF4FF", borderRadius: "4px 12px 12px 12px", padding: "5px 10px", fontSize: 12, fontWeight: 700, color: PC.t1 }}>{t.replace("{so}", d.sample[sel] ?? "3")}</span>
                <span style={{ marginLeft: "auto" }}><Pill tone={long ? "amber" : "gray"}>{n} chữ{long ? " · dài" : ""}</Pill></span>
                <Btn kind="light" style={{ height: 28, padding: "0 10px", fontSize: 12 }}>Xoá</Btn>
              </span>
            </div>
          );
        })}
        <span style={{ fontSize: 11, color: PC.t4 }}>Nhiều câu thì Pi đổi lần lượt, không lặp 1 câu 2 lần liền.</span>
      </div>
    </Card>
  );
  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
      <Card>
        <CardHead title="Việc làm Pi nói" sub="Số nhỏ nói trước khi trùng lúc" />
        {EVENTS.map((x) => (
          <button key={x.key} className="pc-row pc-click" style={{ ...bodyRow("26px 1fr 50px", x.key === sel), minHeight: 52 }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, background: "#EEF2FA", fontSize: 11, fontWeight: 900, color: PC.t3, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.prio}</span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><b style={cell}>{x.label}</b><span style={{ ...cell, fontSize: 11, color: PC.t4 }}>{x.nam.length + x.nu.length} câu · {x.when}</span></span>
            <span style={{ justifySelf: "end" }}><Switch on={!d.off.includes(x.key)} label={`Bật ${x.label}`} /></span>
          </button>
        ))}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14, alignItems: "end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Tên việc</span><input className="pc-input" defaultValue={e.label} style={field} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Khi nào nói</span><input className="pc-input" defaultValue={e.when} style={field} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Thứ tự ưu tiên</span><input className="pc-num" defaultValue={e.prio} style={{ ...field, fontWeight: 800 }} /></label>
          </div>
          <div style={{ padding: "0 16px 14px 16px", fontSize: 12, color: PC.t3, lineHeight: 1.5 }}>Chèn <b style={{ color: PC.t1 }}>{"{so}"}</b> để máy ghép số thật (số ngày, số ly, cấp). Luật giọng: xưng “Pi”, gọi “bạn”, tối đa khoảng 15 chữ, không emoji, không chê / dọa, không nói béo gầy.</div>
        </Card>
        <div style={{ display: "flex", gap: 16, alignItems: "start" }}>{col("nam")}{col("nu")}</div>
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><Btn kind="light">Bỏ thay đổi</Btn><Btn kind="blue" testid="pc-pet-lines-save">Lưu câu</Btn></span>
      </div>
    </div>
  );
}

// ============ Cài đặt ============
function FormRow({ label, hint, children, last }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "center", padding: "10px 16px", borderBottom: last ? "none" : `1px solid ${PC.rowLine}` }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}><span style={lbl}>{label}</span>{hint && <span style={{ fontSize: 11, color: PC.t4 }}>{hint}</span>}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}
const Num = ({ v, unit, w = 110 }) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><input className="pc-num" defaultValue={v} style={{ ...field, width: w, fontWeight: 800 }} />{unit && <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{unit}</span>}</span>;
function Settings({ d }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHead title="Hạt mỗi việc" sub="Chỉ tính việc làm trong ngày (giờ VN) · ghi bù ngày cũ không ra Hạt" />
          {d.points.map(([l, v], i) => <FormRow key={l} label={l} last={i === d.points.length - 1}><Num v={v} unit="Hạt" /></FormRow>)}
        </Card>
        <Card>
          <CardHead title="Trần & giá" />
          <FormRow label="Trần Hạt mỗi ngày" hint="Chặn cày điểm"><Num v={120} unit="Hạt / ngày" /></FormRow>
          <FormRow label="Giá Phổ thông" hint="Mọi khách mua được"><Num v="100 – 200" unit="Hạt" w={130} /></FormRow>
          <FormRow label="Giá Hiếm" hint="Chỉ Premium"><Num v={400} unit="Hạt" /></FormRow>
          <FormRow label="Giá Huyền thoại" hint="Chỉ Premium" last><Num v={1000} unit="Hạt" /></FormRow>
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHead title="Pi khen và nhắc" sub="Câu soạn sẵn · 0 đồng AI" />
          <FormRow label="Mặc định mỗi ngày" hint="Khách tự chọn 2 / 3 / 5 câu"><Num v={3} unit="câu" /></FormRow>
          <FormRow label="Một việc không nói lại trong"><Num v={24} unit="giờ" /></FormRow>
          <FormRow label="Giờ yên lặng mặc định"><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Num v="22:30" w={90} /><span style={{ color: PC.t3 }}>–</span><Num v="07:00" w={90} /></span></FormRow>
          <FormRow label="Báo trên điện thoại" hint="Mặc định cho khách mới" last><Switch on={false} label="Báo trên điện thoại" /></FormRow>
        </Card>
        <Card>
          <CardHead title="Hỏi Pi (AI)" sub="Dùng chung lượt AI chat của gói · đổi số lượt ở Gói cước & giới hạn" />
          <FormRow label="Bật Hỏi Pi"><Switch on label="Bật Hỏi Pi" /></FormRow>
          <FormRow label="Lượt hỏi / ngày" hint="Theo gói, chỉ xem"><span style={{ display: "flex", gap: 8 }}><Pill tone="gray">Miễn phí 5</Pill><Pill tone="violet">Premium 40</Pill></span></FormRow>
          <FormRow label="Trả lời tối đa"><Num v={3} unit="câu" /></FormRow>
          <div style={{ padding: "10px 16px 14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {["nam", "nu"].map((v) => (
              <label key={v} style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Giọng {VOICE[v].label}</span>
                <textarea className="pc-input" rows={5} defaultValue={d.prompt[v]} style={{ ...field, height: "auto", minHeight: 118, padding: "8px 12px", lineHeight: 1.5, resize: "vertical", fontWeight: 500 }} /></label>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead title="Tổng kết tuần" />
          <FormRow label="Gửi lúc"><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Pill tone="blue">Chủ nhật</Pill><Num v="19:00" w={90} /></span></FormRow>
          <FormRow label="Nhận xét AI cho Premium" hint="Tính vào chi phí AI · không trừ lượt khách" last><Switch on label="Nhận xét AI cho Premium" /></FormRow>
        </Card>
      </div>
    </div>
  );
}

export function PcPet({ top, tab = "overview", data, sel, varFilter }) {
  const [t, setT] = useState(tab);
  return (
    <div data-testid="pc-pet">
      {top(<Tabs value={t} onChange={setT} />, "Thú cưng Pi", "Kho đồ theo Pi nam / Pi nữ, câu Pi nói, Hạt và cấp")}
      <div style={{ padding: 24 }}>
        {t === "overview" && <Overview d={data} />}
        {t === "items" && <Items d={data} sel={sel} varFilter={varFilter} />}
        {t === "lines" && <Lines d={data} sel={sel} />}
        {t === "settings" && <Settings d={data} />}
      </div>
    </div>
  );
}
