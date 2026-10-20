// Quản trị PC — Thú cưng Pi (bản vẽ đợt "Pi nói chuyện + khen", chốt 20/10). Khung + bảng + nút dùng pcUI như các trang Pc* khác.
// 4 tab: Tổng quan · Kho đồ · Câu Pi nói · Cài đặt. Bản vẽ: số liệu truyền vào qua `data` (chưa có bảng DB pet_*).
// Luật đã chốt: kho đồ theo bản (Nam / Nữ / Chung); đồ thành tích không bán; Hiếm / Huyền thoại chỉ Premium; trần 120 Hạt/ngày;
// câu khen soạn sẵn không tốn AI; Hỏi Pi dùng lượt AI chat của gói; tổng kết tuần Chủ nhật (AI viết cho Premium).
import { useEffect, useState } from "react";
import { PC } from "../theme";
import { Btn, Pill, Card, SearchBox, FilterSelect, headRow, bodyRow, cell, vnInt, Loading, ErrorBox } from "./pcUI";
import { supabase } from "../lib/supabase";
import { applyItemRows, linesFrom } from "../hooks/usePet";
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
  const top = (d.topItems || []).map(([id, n]) => [ITEMS[id], n]).filter(([it]) => it);
  const cnt = (k) => { const l = d.lines?.[k]; return l ? l.nam.length + l.nu.length : 0; };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 16 }}>
        <Tile label="Khách có Pi" value={vnInt(d.pets)} sub={`Pi nam ${vnInt(d.petsNam)} · Pi nữ ${vnInt(d.petsNu)} (theo giới tính hồ sơ)`} color={PC.t1} />
        <Tile label="Hạt phát hôm nay" value={vnInt(d.seedsToday)} sub={`${vnInt(d.capHit)} khách chạm trần ${vnInt(d.cap || 120)}`} color="#16A34A" />
        <Tile label="Đồ bán hôm nay" value={`${vnInt(d.soldToday)} món`} sub={`${vnInt(d.soldPremium)} món Hiếm / Huyền thoại`} color="#0062F0" />
        <Tile label="Lượt hỏi Pi hôm nay" value={vnInt(d.askToday)} sub="Tính vào lượt AI chat của gói" color="#7C3AED" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <Card>
          <CardHead title="Món bán chạy 7 ngày" sub="Đếm lượt mua · không tính đồ thành tích" />
          <div style={headRow("1fr 70px 70px")}><span>MÓN</span><span>BẢN</span><span style={{ textAlign: "right" }}>ĐÃ BÁN</span></div>
          {top.length === 0 && <div style={{ padding: "14px 16px", fontSize: 13, color: PC.t3 }}>Chưa có lượt mua nào trong 7 ngày.</div>}
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
            <CardHead title="Câu Pi nói" sub="Câu soạn sẵn · 0 đồng AI · sửa ở tab Câu Pi nói" />
            <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              {EVENTS.map((e) => (
                <span key={e.key} style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px", alignItems: "center", gap: 10, fontSize: 12.5 }}>
                  <span style={cell}>{e.label}</span>
                  <span style={{ textAlign: "right", color: PC.t3 }}>{cnt(e.key)} câu</span>
                  <span style={{ justifySelf: "end" }}><Pill tone={(d.off || []).includes(e.key) ? "gray" : "green"}>{(d.off || []).includes(e.key) ? "Đang tắt" : "Đang bật"}</Pill></span>
                </span>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="Tổng kết tuần" sub="Hiện trong app ngày Chủ nhật · số máy tính + câu soạn sẵn cho mọi khách · Premium có thêm nhận xét AI" />
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============ Kho đồ ============
const ICOLS = "minmax(150px, 1fr) 52px 86px 36px 56px 54px 80px";
const canVar = (it, v) => !!(it.anchor?.[v] || it.body?.[v]);
function Items({ d, sel: sel0 = "ao-roi-10", varFilter: vf0 = "all", onSave }) {
  const [sel, setSel] = useState(sel0);
  const [vf, setVf] = useState(vf0);
  const [slotF, setSlotF] = useState("all");
  const [rar, setRar] = useState("all");
  const [qs, setQs] = useState("");
  const [n, setN] = useState(16);
  const list = catalog.items.filter((it) => (vf === "all" || (vf === "chung" ? it.variants.length === 2 : it.variants.length === 1 && it.variants[0] === vf))
    && (slotF === "all" || it.slot === slotF) && (rar === "all" || it.rarity === rar) && (!qs || it.name.toLowerCase().includes(qs.toLowerCase())));
  const it = ITEMS[sel] || list[0];
  const st = (x) => (x.achievement || d.achievement.includes(x.id) ? ["Thành tích", "amber"] : x.hidden || d.hidden.includes(x.id) ? ["Đang ẩn", "gray"] : ["Đang bán", "green"]);
  const [f, setF] = useState(null);
  useEffect(() => { if (it) setF({ name: it.name, rarity: it.rarity, level: it.level, price: it.price, variants: [...it.variants], hidden: !!it.hidden }); }, [it?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const save = async (patch) => { if (!onSave || !it) return; setBusy(true); await onSave(it.id, { ...f, ...patch }); setBusy(false); };
  const vKey = f ? (f.variants.length === 2 ? "chung" : f.variants[0]) : "nam";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 16, alignItems: "start" }}>
      <Card style={{ minWidth: 0 }}>
        <CardHead title={`${list.length} món`} sub={`Pi nam ${catalog.items.filter((x) => x.variants.join() === "nam").length} món riêng · Pi nữ ${catalog.items.filter((x) => x.variants.join() === "nu").length} món riêng · ${catalog.items.filter((x) => x.variants.length === 2).length} món chung (đồ thành tích là đồ chung)`} />
        <div style={{ padding: "0 16px 12px 16px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <SearchBox value={qs} onChange={setQs} placeholder="Tìm tên món…" width={200} testid="pc-pet-search" />
          <FilterSelect label="Bản" value={vf} onChange={setVf} testid="pc-pet-f-var" options={[{ v: "all", label: "Tất cả" }, { v: "nam", label: "Nam" }, { v: "nu", label: "Nữ" }, { v: "chung", label: "Chung" }]} />
          <FilterSelect label="Ô đeo" value={slotF} onChange={setSlotF} options={[{ v: "all", label: "Tất cả" }, ...Object.entries(catalog.slots).map(([v, label]) => ({ v, label }))]} />
          <FilterSelect label="Độ hiếm" value={rar} onChange={setRar} options={[{ v: "all", label: "Tất cả" }, { v: "common", label: "Phổ thông" }, { v: "rare", label: "Hiếm" }, { v: "legendary", label: "Huyền thoại" }]} />
        </div>
        <div style={headRow(ICOLS)}><span>MÓN</span><span>BẢN</span><span>ĐỘ HIẾM</span><span>CẤP</span><span style={{ textAlign: "right" }}>GIÁ</span><span style={{ textAlign: "right" }}>ĐÃ BÁN</span><span>BÁN</span></div>
        {list.slice(0, n).map((x) => (
          <button key={x.id} data-testid={`pc-pet-row-${x.id}`} onClick={() => setSel(x.id)} className="pc-row pc-click" style={bodyRow(ICOLS, x.id === it?.id)}>
            <span style={{ ...cell, display: "flex", alignItems: "center", gap: 10 }}><Thumb it={x} /><span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><b style={cell}>{x.name}</b><span style={{ fontSize: 11, color: PC.t4 }}>{catalog.slots[x.slot]} · {x.id}</span></span></span>
            <span><Pill tone={VAR(x)[1]}>{VAR(x)[0]}</Pill></span>
            <span><Pill tone={RAR[x.rarity][1]}>{RAR[x.rarity][0]}</Pill></span>
            <span style={cell}>{x.level}</span>
            <b style={{ ...cell, textAlign: "right" }}>{x.achievement ? "—" : vnInt(x.price)}</b>
            <span style={{ ...cell, textAlign: "right" }}>{x.achievement ? "—" : vnInt(d.sold[x.id] || 0)}</span>
            <span><Pill tone={st(x)[1]}>{st(x)[0]}</Pill></span>
          </button>
        ))}
        <div style={{ padding: "10px 16px", fontSize: 12, color: PC.t3, display: "flex", alignItems: "center", gap: 10 }}>Hiện {Math.min(n, list.length)} / {list.length} món{n < list.length && <Btn kind="soft" onClick={() => setN((k) => k + 30)}>Xem thêm</Btn>}</div>
      </Card>

      {/* Ngăn sửa món */}
      {it && f && (
      <Card testid="pc-pet-edit" style={{ position: "sticky", top: 84 }}>
        <CardHead title={it.name} sub={`${it.id} · ${catalog.slots[it.slot]}`} right={<Pill tone={st(it)[1]}>{st(it)[0]}</Pill>} />
        <div style={{ margin: "0 16px", borderRadius: 12, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EAF4FF 55%, #D6E8FF 100%)", height: 190, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 18, paddingBottom: 10 }}>
          {["nam", "nu"].map((v) => { const yes = f.variants.includes(v); return (
            <span key={v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: yes ? 1 : 0.35, filter: yes ? "none" : "grayscale(1)" }}>
              <PetAvatar variant={v} size={140} still equipped={yes && canVar(it, v) ? { [it.slot]: it.id } : {}} />
              <span style={{ fontSize: 11, fontWeight: 800, color: PC.t3 }}>{v === "nam" ? "Pi nam" : "Pi nữ"}{yes ? "" : " · không có"}</span>
            </span>); })}
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Tên hiển thị</span><input data-testid="pc-pet-name" className="pc-input" value={f.name} maxLength={40} onChange={(e) => setF({ ...f, name: e.target.value })} style={field} /></label>
          <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={lbl}>Dành cho</span>
            <span role="group" aria-label="Dành cho" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {[["nam", "Pi nam", ["nam"]], ["nu", "Pi nữ", ["nu"]], ["chung", "Cả hai", ["nam", "nu"]]].map(([k, l, vs]) => {
                const on = k === vKey; const can = vs.every((v) => canVar(it, v));
                return <button key={k} aria-pressed={on} disabled={!can} title={can ? undefined : "Chưa có ảnh / điểm đặt cho bản này"} onClick={() => setF({ ...f, variants: vs })} className="pc-btn" style={{ height: 34, borderRadius: 10, border: on ? "1px solid #BFD4FF" : `1px solid ${PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t1, fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: can ? "pointer" : "default" }}>{l}</button>;
              })}
            </span>
            {it.slot === "ao" && <span style={{ fontSize: 11, color: PC.t4 }}>Áo vẽ liền thân: chỉ mặc được ở bản đã có ảnh “thân mặc áo”.</span>}
          </span>
          <span style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Độ hiếm</span><select className="pc-input" value={f.rarity} onChange={(e) => setF({ ...f, rarity: e.target.value })} style={field}>{Object.entries(RAR).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Mở ở cấp</span><input className="pc-num" inputMode="numeric" value={f.level} onChange={(e) => setF({ ...f, level: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })} style={{ ...field, fontWeight: 800 }} /></label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Giá (Hạt)</span><input data-testid="pc-pet-price" className="pc-num" inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value.replace(/\D/g, "")) || 0 })} style={{ ...field, fontWeight: 800 }} /></label>
          </span>
          <span style={{ fontSize: 12, color: PC.t3, lineHeight: 1.45 }}>{f.rarity === "common" ? "Phổ thông: mọi khách mua được." : "Hiếm / Huyền thoại: chỉ khách Premium mua được."} Đã bán {vnInt(d.sold[it.id] || 0)} lần. Đổi giá không hoàn Hạt cho người đã mua.</span>
          <span style={{ display: "flex", gap: 8 }}>
            <Btn kind="blue" style={{ flex: 1 }} testid="pc-pet-save" disabled={busy || !onSave} onClick={() => save()}>{busy ? "Đang lưu…" : "Lưu món"}</Btn>
            <Btn kind="light" testid="pc-pet-hide" disabled={busy || !onSave || it.achievement} onClick={() => { setF({ ...f, hidden: !f.hidden }); save({ hidden: !f.hidden }); }}>{f.hidden ? "Mở bán lại" : "Ẩn khỏi cửa hàng"}</Btn>
          </span>
        </div>
      </Card>)}
    </div>
  );
}

// ============ Câu Pi nói ============
function Lines({ sel: sel0 = "streak", d, onSaveLines, onToggle }) {
  const [sel, setSel] = useState(sel0);
  const e = EVENTS.find((x) => x.key === sel);
  const src = d.lines?.[sel] || { nam: e.nam, nu: e.nu };
  const [draft, setDraft] = useState(src);
  useEffect(() => { setDraft(d.lines?.[sel] || { nam: e.nam, nu: e.nu }); }, [sel, d.lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const setLine = (v, i, t) => setDraft((x) => ({ ...x, [v]: x[v].map((y, j) => (j === i ? t : y)) }));
  const col = (v) => (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <CardHead title={VOICE[v].label} sub={`${VOICE[v].tag} · hay dùng: ${VOICE[v].words}`} right={<Btn kind="soft" testid={`pc-pet-add-${v}`} onClick={() => setDraft((x) => ({ ...x, [v]: [...x[v], ""] }))}>+ Thêm câu</Btn>} />
      <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {draft[v].length === 0 && <span style={{ fontSize: 12, color: PC.t3 }}>Chưa có câu: Pi sẽ im ở việc này.</span>}
        {draft[v].map((t, i) => {
          const n = words(t); const long = n > 15;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 12, borderRadius: 12, border: `1px solid ${PC.field}` }}>
              <input className="pc-input" value={t} maxLength={160} onChange={(ev) => setLine(v, i, ev.target.value)} aria-label={`Câu ${i + 1}`} placeholder="Ví dụ: {so} ngày liền đủ bữa, giỏi ghê!" style={{ ...field, fontWeight: 700 }} />
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#EEF4FF", borderRadius: "4px 12px 12px 12px", padding: "5px 10px", fontSize: 12, fontWeight: 700, color: PC.t1 }}>{t.replace("{so}", d.sample?.[sel] ?? "3") || "…"}</span>
                <span style={{ marginLeft: "auto" }}><Pill tone={long ? "amber" : "gray"}>{n} chữ{long ? " · dài" : ""}</Pill></span>
                <Btn kind="light" style={{ height: 28, padding: "0 10px", fontSize: 12 }} onClick={() => setDraft((x) => ({ ...x, [v]: x[v].filter((_, j) => j !== i) }))}>Xoá</Btn>
              </span>
            </div>
          );
        })}
        <span style={{ fontSize: 11, color: PC.t4 }}>Nhiều câu thì Pi đổi lần lượt, không lặp 1 câu 2 lần liền.</span>
      </div>
    </Card>
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(src);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
      <Card>
        <CardHead title="Việc làm Pi nói" sub="Số nhỏ nói trước khi trùng lúc" />
        {EVENTS.map((x) => (
          <div key={x.key} role="button" tabIndex={0} onClick={() => setSel(x.key)} onKeyDown={(ev) => { if (ev.key === "Enter") setSel(x.key); }} className="pc-row pc-click" style={{ ...bodyRow("26px 1fr 50px", x.key === sel), minHeight: 52 }}>
            <span style={{ width: 22, height: 22, borderRadius: 11, background: "#EEF2FA", fontSize: 11, fontWeight: 900, color: PC.t3, display: "flex", alignItems: "center", justifyContent: "center" }}>{x.prio}</span>
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><b style={cell}>{x.label}</b><span style={{ ...cell, fontSize: 11, color: PC.t4 }}>{(d.lines?.[x.key]?.nam || x.nam).length + (d.lines?.[x.key]?.nu || x.nu).length} câu · {x.when}</span></span>
            <span style={{ justifySelf: "end" }} onClick={(ev) => ev.stopPropagation()}><Switch on={!d.off.includes(x.key)} label={`Bật ${x.label}`} onClick={() => onToggle?.(x.key)} /></span>
          </div>
        ))}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 900 }}>{e.label}</span>
            <span style={{ fontSize: 12, color: PC.t3 }}>Khi nào nói: {e.when} · thứ tự ưu tiên {e.prio}</span>
          </div>
          <div style={{ padding: "0 16px 14px 16px", fontSize: 12, color: PC.t3, lineHeight: 1.5 }}>Chèn <b style={{ color: PC.t1 }}>{"{so}"}</b> để máy ghép số thật (số ngày, số ly, cấp). Luật giọng: xưng “Pi”, gọi “bạn”, tối đa khoảng 15 chữ, không emoji, không chê / dọa, không nói béo gầy.</div>
        </Card>
        <div style={{ display: "flex", gap: 16, alignItems: "start" }}>{col("nam")}{col("nu")}</div>
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn kind="light" disabled={!dirty} onClick={() => setDraft(src)}>Bỏ thay đổi</Btn>
          <Btn kind="blue" testid="pc-pet-lines-save" disabled={!dirty || busy || !onSaveLines} onClick={async () => { setBusy(true); await onSaveLines(sel, { nam: draft.nam.map((t) => t.trim()).filter(Boolean), nu: draft.nu.map((t) => t.trim()).filter(Boolean) }); setBusy(false); }}>{busy ? "Đang lưu…" : "Lưu câu"}</Btn>
        </span>
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
const Num = ({ v, unit, w = 110, onChange, testid }) => <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><input data-testid={testid} className="pc-num" inputMode="numeric" value={v} onChange={(e) => onChange?.(e.target.value.replace(/\D/g, ""))} readOnly={!onChange} style={{ ...field, width: w, fontWeight: 800 }} />{unit && <span style={{ fontSize: 12, color: PC.t3, fontWeight: 700 }}>{unit}</span>}</span>;
const PT_LABEL = [["meal", "Ghi mỗi bữa (≥ 100 kcal)"], ["photo", "Chụp món"], ["water", "Uống đủ nước (≥ 80% mục tiêu)"], ["full_day", "Ghi đủ mọi bữa (≥ 3 bữa)"], ["streak", "Chuỗi ngày (từ ngày thứ 3)"], ["weigh", "Cân tuần"]];
export const PET_CFG_DEFAULT = { points: { meal: 10, photo: 5, full_day: 20, water: 15, weigh: 20, streak: 10 }, cap: 120, perDay: 3, gapH: 24, quietFrom: "22:30", quietTo: "07:00", ask: true, weekAI: true, off: [], prompt: {} };
function Settings({ d, onSaveCfg }) {
  const [c, setC] = useState(() => ({ ...PET_CFG_DEFAULT, ...(d.cfg || {}), points: { ...PET_CFG_DEFAULT.points, ...(d.cfg?.points || {}) }, prompt: { nam: d.prompt?.nam || "", nu: d.prompt?.nu || "", ...(d.cfg?.prompt || {}) } }));
  const [busy, setBusy] = useState(false);
  const setP = (k, v) => setC((x) => ({ ...x, points: { ...x.points, [k]: Number(v) || 0 } }));
  const save = async () => { setBusy(true); await onSaveCfg?.(c); setBusy(false); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHead title="Hạt mỗi việc" sub="Chỉ tính việc làm trong ngày (giờ VN) · ghi bù ngày cũ không ra Hạt" />
          {PT_LABEL.map(([k, l], i) => <FormRow key={k} label={l} last={i === PT_LABEL.length - 1}><Num v={c.points[k]} unit="Hạt" onChange={(v) => setP(k, v)} testid={`pc-pet-pt-${k}`} /></FormRow>)}
        </Card>
        <Card>
          <CardHead title="Trần & giá" sub="Giá từng món sửa ở tab Kho đồ" />
          <FormRow label="Trần Hạt mỗi ngày" hint="Chặn cày điểm" last><Num v={c.cap} unit="Hạt / ngày" onChange={(v) => setC({ ...c, cap: Number(v) || 0 })} testid="pc-pet-cap" /></FormRow>
        </Card>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card>
          <CardHead title="Pi khen và nhắc" sub="Câu soạn sẵn · 0 đồng AI" />
          <FormRow label="Mặc định mỗi ngày" hint="Khách tự chọn 2 / 3 / 5 câu"><Num v={c.perDay} unit="câu" onChange={(v) => setC({ ...c, perDay: Number(v) || 0 })} /></FormRow>
          <FormRow label="Một việc không nói lại trong"><Num v={c.gapH} unit="giờ" onChange={(v) => setC({ ...c, gapH: Number(v) || 0 })} /></FormRow>
          <FormRow label="Giờ yên lặng mặc định" last><span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><input className="pc-num" value={c.quietFrom} onChange={(e) => setC({ ...c, quietFrom: e.target.value })} style={{ ...field, width: 90, fontWeight: 800 }} /><span style={{ color: PC.t3 }}>–</span><input className="pc-num" value={c.quietTo} onChange={(e) => setC({ ...c, quietTo: e.target.value })} style={{ ...field, width: 90, fontWeight: 800 }} /></span></FormRow>
        </Card>
        <Card>
          <CardHead title="Hỏi Pi (AI)" sub="Dùng chung lượt AI chat của gói · đổi số lượt ở Gói cước & giới hạn" />
          <FormRow label="Bật Hỏi Pi"><Switch on={c.ask} label="Bật Hỏi Pi" onClick={() => setC({ ...c, ask: !c.ask })} /></FormRow>
          <FormRow label="Trả lời tối đa" hint="Luật giọng Pi"><Pill tone="gray">3 câu</Pill></FormRow>
          <div style={{ padding: "10px 16px 14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {["nam", "nu"].map((v) => (
              <label key={v} style={{ display: "flex", flexDirection: "column", gap: 6 }}><span style={lbl}>Lời dặn giọng {VOICE[v].label}</span>
                <textarea className="pc-input" rows={5} value={c.prompt[v] || ""} placeholder={d.prompt?.[v] || ""} onChange={(e) => setC({ ...c, prompt: { ...c.prompt, [v]: e.target.value } })} style={{ ...field, height: "auto", minHeight: 118, padding: "8px 12px", lineHeight: 1.5, resize: "vertical", fontWeight: 500 }} /></label>
            ))}
          </div>
        </Card>
        <Card>
          <CardHead title="Tổng kết tuần" sub="Hiện trong app ngày Chủ nhật" />
          <FormRow label="Nhận xét AI cho Premium" hint="Tính vào chi phí AI · không trừ lượt khách" last><Switch on={c.weekAI} label="Nhận xét AI cho Premium" onClick={() => setC({ ...c, weekAI: !c.weekAI })} /></FormRow>
        </Card>
      </div>
    </div>
    <span style={{ display: "flex", justifyContent: "flex-end" }}><Btn kind="blue" testid="pc-pet-cfg-save" disabled={busy || !onSaveCfg} onClick={save}>{busy ? "Đang lưu…" : "Lưu cài đặt"}</Btn></span>
    </div>
  );
}

export function PcPet({ top, tab = "overview", data, sel, varFilter, onSaveItem, onSaveLines, onToggleLine, onSaveCfg }) {
  const [t, setT] = useState(tab);
  return (
    <div data-testid="pc-pet">
      {top(<Tabs value={t} onChange={setT} />, "Thú cưng Pi", "Kho đồ theo Pi nam / Pi nữ, câu Pi nói, Hạt và cấp")}
      <div style={{ padding: 24 }}>
        {t === "overview" && <Overview d={data} />}
        {t === "items" && <Items d={data} sel={sel} varFilter={varFilter} onSave={onSaveItem} />}
        {t === "lines" && <Lines d={data} sel={sel && EVENTS.some((e) => e.key === sel) ? sel : undefined} onSaveLines={onSaveLines} onToggle={onToggleLine} />}
        {t === "settings" && <Settings d={data} onSaveCfg={onSaveCfg} />}
      </div>
    </div>
  );
}

// ============ Trang thật trong Quản trị PC: đọc / ghi bảng pet_* + app_settings.pet_config ============
export function PcPetPage({ top, appSettings, saveSetting, showToast }) {
  const [ov, setOv] = useState(null);
  const [lines, setLines] = useState(null);
  const [nonce, setNonce] = useState(0);
  const cfg = (() => { try { return JSON.parse(appSettings?.pet_config || "{}"); } catch (e) { return {}; } })();
  useEffect(() => {
    let off = false;
    (async () => {
      const [o, it, ln] = await Promise.all([supabase.rpc("pet_admin_overview"), supabase.from("pet_items").select("*"), supabase.from("pet_lines").select("*")]);
      if (off) return;
      if (!it.error) applyItemRows(it.data);
      setLines(linesFrom(ln.error ? null : ln.data));
      setOv(o.error ? { error: o.error.message } : o.data);
    })();
    return () => { off = true; };
  }, [nonce]);
  if (!ov || !lines) return <div>{top(null, "Thú cưng Pi", "Đang tải…")}<div style={{ padding: 24 }}><Loading /></div></div>;
  if (ov.error) return <div>{top(null, "Thú cưng Pi")}<div style={{ padding: 24 }}><ErrorBox text={`Chưa đọc được dữ liệu Pi: ${ov.error}. Kiểm tra đã chạy migration 20261020150000_pet.sql chưa.`} onRetry={() => setNonce((n) => n + 1)} /></div></div>;
  const data = {
    pets: ov.pets || 0, petsNu: ov.petsNu || 0, petsNam: (ov.pets || 0) - (ov.petsNu || 0), seedsToday: ov.seedsToday || 0, capHit: ov.capHit || 0, cap: cfg.cap || 120,
    soldToday: ov.soldToday || 0, soldPremium: ov.soldPremium || 0, askToday: ov.askToday || 0,
    topItems: (ov.top7 || []).filter(([id]) => ITEMS[id]), sold: ov.sold || {}, achievement: [], hidden: [], off: cfg.off || [], lines, cfg, prompt: DEFAULT_PROMPT, sample: { streak: 7, level: 5, water: 2 },
  };
  const saveCfg = async (next) => { await saveSetting("pet_config", JSON.stringify(next)); showToast?.("Đã lưu cài đặt Pi"); };
  return (
    <PcPet top={top} data={data}
      onSaveItem={async (id, f) => {
        const { error } = await supabase.from("pet_items").update({ name: f.name.trim() || ITEMS[id].name, rarity: f.rarity, level: f.level, price: f.price, variants: f.variants, hidden: !!f.hidden, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) { showToast?.(`Chưa lưu được: ${error.message}`); return; }
        applyItemRows([{ id, ...f, achievement: ITEMS[id].achievement }]); showToast?.("Đã lưu món"); setNonce((n) => n + 1);
      }}
      onSaveLines={async (ev, v) => {
        const del = await supabase.from("pet_lines").delete().eq("event", ev);
        if (del.error) { showToast?.(`Chưa lưu được: ${del.error.message}`); return; }
        const rows = ["nam", "nu"].flatMap((g) => v[g].map((text, i) => ({ event: ev, variant: g, text, sort: i })));
        if (rows.length) { const ins = await supabase.from("pet_lines").insert(rows); if (ins.error) { showToast?.(`Chưa lưu được: ${ins.error.message}`); return; } }
        showToast?.("Đã lưu câu Pi nói"); setNonce((n) => n + 1);
      }}
      onToggleLine={(k) => { const off = cfg.off || []; saveCfg({ ...PET_CFG_DEFAULT, ...cfg, off: off.includes(k) ? off.filter((x) => x !== k) : [...off, k] }); }}
      onSaveCfg={saveCfg} />
  );
}
const DEFAULT_PROMPT = {
  nam: "Bạn là Pi nam, bạn tập cùng của khách: hăng hái, lém lỉnh, hay rủ rê.",
  nu: "Bạn là Pi nữ, bạn thân của khách: dịu dàng, quan tâm, hay dặn dò.",
};
