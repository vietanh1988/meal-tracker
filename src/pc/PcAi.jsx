// Quản trị PC › Kết nối AI. Cùng logic với src/mobile/admin/AiScreen.jsx (nạp / lưu / quyền giữ nguyên):
//  - aiProvider: localStorage "aiProvider" → appSettings.ai_provider → "claude"; mô hình: ai_model / gemini_model / gpt_model
//  - khoá gemini / gpt: CHỈ GHI qua RPC (src/lib/aiKeys.js), không tải về; usda: appSettings → localStorage
//  - luôn ghi localStorage aiProvider; admin ghi thêm khoá USDA vào localStorage
//  - Chọn nhà cung cấp / mô hình / AI xử lý ảnh lưu ngay key đó; "Lưu" ghi đủ 8 key.
//  - "Kiểm tra kết nối" gọi ai-proxy feature "ping_test" CHỈ khi người dùng bấm (không tự gọi khi mở trang).
//  - Admin thường: chỉ xem (dải vàng), không chọn / sửa được, không có nút Lưu, vẫn Kiểm tra kết nối được.
import { PROVIDERS, MODEL_KEY, DEFAULT_MODEL, modelsFor } from "../lib/aiModels";
import { useEffect, useState } from "react";
import { authFetch } from "../lib/authFetch";
import { useAiKeys } from "../lib/aiKeys";
import { keyPlaceholder } from "../lib/aiKeysView";
import { pickAiModel } from "../lib/aiProvider";
import { PC } from "../theme";
import { Btn, Pill, Card, secLbl } from "./pcUI";

const VISION = [{ v: "auto", label: "Theo AI menu" }, { v: "claude", label: "Claude" }, { v: "gemini", label: "Gemini" }, { v: "gpt", label: "GPT" }];
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } };

function Radio({ on }) {
  return on
    ? <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 9, background: "#FFFFFF", boxShadow: "inset 0 0 0 5px #0062F0", flexShrink: 0 }} />
    : <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${PC.field}`, flexShrink: 0 }} />;
}

const cardHead = (title, sub) => (
  <div style={{ padding: "14px 16px 10px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
    <span style={{ fontSize: 14, fontWeight: 900 }}>{title}</span>
    {sub && <span style={{ fontSize: 12, color: PC.t3 }}>{sub}</span>}
  </div>
);

export function PcAi({ top, isAdmin = true, isSuperAdmin, appSettings = {}, saveSetting, showToast }) {
  const readOnly = !isSuperAdmin;
  const [aiProvider, setAiProvider] = useState(() => lsGet("aiProvider") || appSettings.ai_provider || "claude");
  const [aiModel, setAiModel] = useState(() => appSettings.ai_model || DEFAULT_MODEL.claude);
  const [geminiModel, setGeminiModel] = useState(() => appSettings.gemini_model || DEFAULT_MODEL.gemini);
  const [gptModel, setGptModel] = useState(() => appSettings.gpt_model || DEFAULT_MODEL.gpt);
  // Khoá AI chỉ ghi: ô luôn trống, hiện "Đã cài ••••1234"; dán khoá mới + Lưu mới thay
  const [claudeKey, setClaudeKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [gptKey, setGptKey] = useState("");
  const { status: keySt, saveKeys } = useAiKeys(!!isAdmin);
  const [usdaKey, setUsdaKey] = useState(() => appSettings.usda_key || lsGet("usdaKey") || "");
  const [aiConnected, setAiConnected] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vision, setVision] = useState(() => appSettings.photo_vision_provider || "auto");

  // appSettings tải sau (bất đồng bộ) — cloud luôn thắng
  useEffect(() => {
    if (appSettings.ai_provider) setAiProvider(appSettings.ai_provider);
    if (appSettings.usda_key) setUsdaKey(appSettings.usda_key);
    if (appSettings.gpt_model) setGptModel(appSettings.gpt_model);
    if (appSettings.gemini_model) setGeminiModel(appSettings.gemini_model);
    if (appSettings.ai_model) setAiModel(appSettings.ai_model);
  }, [appSettings]);
  useEffect(() => { setVision(appSettings.photo_vision_provider || "auto"); }, [appSettings.photo_vision_provider]);

  useEffect(() => {
    lsSet("aiProvider", aiProvider);
    if (isAdmin) lsSet("usdaKey", usdaKey);
  }, [aiProvider, usdaKey, isAdmin]);

  if (!isAdmin) return <>{top(null)}<div data-testid="pc-ai" style={{ padding: 20, textAlign: "center", color: PC.t3, fontSize: 13 }}>Chỉ Admin mới xem được trang này.</div></>;

  const prov = PROVIDERS.find((p) => p.id === aiProvider) || PROVIDERS[0];
  const curModel = aiProvider === "claude" ? aiModel : aiProvider === "gemini" ? geminiModel : gptModel;
  const setModel = aiProvider === "claude" ? setAiModel : aiProvider === "gemini" ? setGeminiModel : setGptModel;
  const models = modelsFor(prov.id, curModel);
  const modelName = (models.find((m) => m.id === curModel) || {}).name || curModel || "";

  const pickProvider = (id) => {
    if (readOnly || id === aiProvider) return;
    setAiProvider(id);
    if (id === "claude") setAiModel(DEFAULT_MODEL.claude);
    saveSetting("ai_provider", id);
  };
  const pickModel = (id) => {
    if (readOnly) return;
    setModel(id);
    saveSetting(MODEL_KEY[prov.id], id);
  };
  const pickVision = async (v) => {
    if (readOnly || v === vision) return;
    setVision(v);
    await saveSetting("photo_vision_provider", v);
    showToast?.({ text: "Đã lưu AI xử lý ảnh" }, 2500);
  };

  // Gọi AI thật (ping_test, tốn rất ít phí) — chỉ khi người dùng bấm
  const test = async () => {
    setTesting(true);
    setAiConnected(false);
    let ok = false;
    try {
      const d = await authFetch("ai-proxy", { foodDesc: "OK", provider: aiProvider, model: pickAiModel(aiProvider, { claudeModel: aiModel, geminiModel, gptModel }), feature: "ping_test" });
      ok = !d.error;
    } catch { ok = false; }
    setAiConnected(ok);
    setTesting(false);
    showToast?.({ text: ok ? `Đã kết nối ${prov.name}` : `Chưa kết nối được ${prov.name} — kiểm tra khoá / mô hình.` }, 3500);
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    await saveSetting("ai_provider", aiProvider);
    const k = await saveKeys({ claude_key: claudeKey, gemini_key: geminiKey, gpt_key: gptKey });
    if (!k.ok) { setSaving(false); showToast?.({ text: k.error }, 3500); return; }
    setClaudeKey(""); setGeminiKey(""); setGptKey("");
    await saveSetting("usda_key", usdaKey);
    await saveSetting("ai_model", aiModel);
    await saveSetting("gpt_model", gptModel);
    await saveSetting("gemini_model", geminiModel);
    setSaving(false);
    showToast?.({ text: "Đã lưu kết nối AI" }, 2500);
  };

  const tone = testing ? "amber" : aiConnected ? "green" : "red";
  const dot = testing ? "#F59E0B" : aiConnected ? "#22C55E" : "#EF4444";

  const keyRow = (label, value, set, ph, testid, last, st) => (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "center", padding: "10px 16px", borderBottom: last ? "none" : `1px solid ${PC.rowLine}` }}>
      <label htmlFor={testid} style={{ fontSize: 12, fontWeight: 800, color: PC.t3, display: "flex", flexDirection: "column", gap: 2 }}>
        <span>{label}</span>
        {st !== undefined && <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: st?.set ? "#15803D" : PC.t3 }}><span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 4, background: st?.set ? "#22C55E" : "#CBD5E1" }} />{st?.set ? `Đã cài · ••••${st.last4}` : "Chưa cài"}</span>}
      </label>
      <input id={testid} data-testid={testid} className="pc-input" type="password" autoComplete="off" value={value} onChange={(e) => !readOnly && set(e.target.value)} disabled={readOnly} placeholder={ph}
        style={{ width: "100%", minWidth: 0, boxSizing: "border-box", height: 36, borderRadius: 10, border: `1px solid ${PC.field}`, background: readOnly ? "#F8FAFC" : "#FFFFFF", padding: "0 12px", fontSize: 13, fontWeight: 600, color: PC.t1, fontFamily: "inherit", opacity: readOnly ? 0.7 : 1 }} />
    </div>
  );

  return (
    <>
      {top(
        <span style={{ display: "flex", gap: 8 }}>
          <Btn kind="soft" onClick={test} disabled={testing} testid="pc-ai-test" title="Gửi 1 câu ngắn tới AI (tốn rất ít phí)">{testing ? "Đang kiểm tra…" : "Kiểm tra kết nối"}</Btn>
          {!readOnly && <Btn kind="blue" onClick={save} disabled={saving} testid="pc-ai-save">{saving ? "Đang lưu…" : "Lưu"}</Btn>}
        </span>
      )}
      <div data-testid="pc-ai" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {readOnly && <div data-testid="pc-readonly" style={{ fontSize: 12, color: "#92400E", background: "#FEF3C7", borderRadius: 10, padding: "8px 12px" }}>Admin thường chỉ xem — Super Admin mới đổi được nhà cung cấp, mô hình, khoá.</div>}

        <Card testid="pc-ai-status">
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, background: dot, boxShadow: `0 0 0 4px ${dot}33` }} />
            <span style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ ...secLbl }}>ĐANG DÙNG</span>
              <b style={{ fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={`${prov.name} · ${modelName}`}>{prov.name} · {modelName}</b>
            </span>
            <Pill tone={tone} testid="pc-ai-status-pill">{testing ? "Đang kiểm tra…" : aiConnected ? "Đã kết nối" : "Chưa kết nối"}</Pill>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <Card testid="pc-ai-providers">
              {cardHead("Nhà cung cấp", "Chọn là lưu ngay")}
              <div role="group" aria-label="Nhà cung cấp AI" style={{ display: "flex", gap: 8, padding: "0 16px 16px 16px" }}>
                {PROVIDERS.map((p) => {
                  const on = p.id === aiProvider;
                  return (
                    <button key={p.id} type="button" data-testid={`pc-ai-prov-${p.id}`} aria-pressed={on} disabled={readOnly && !on} onClick={() => pickProvider(p.id)} className="pc-btn"
                      style={{ flex: 1, minWidth: 0, height: 92, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, fontFamily: "inherit", cursor: readOnly ? "default" : "pointer",
                        border: `1.5px solid ${on ? "#1A7CFF" : PC.field}`, background: on ? PC.soft : "#FFFFFF", color: on ? PC.softFg : PC.t1 }}>
                      <img src={p.logo} alt="" aria-hidden="true" style={{ width: 30, height: 30, objectFit: "contain", marginBottom: 4 }} />
                        <span style={{ fontSize: 14, fontWeight: 900 }}>{p.name}</span>
                      <span style={{ fontSize: 11, color: on ? PC.softFg : PC.t3 }}>{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card testid="pc-ai-keys">
              {cardHead("Khoá API", "Bấm Lưu để ghi khoá")}
              <div style={{ borderTop: `1px solid ${PC.headLine}` }}>
                {keyRow("Claude", claudeKey, setClaudeKey, keyPlaceholder(keySt.claude_key, "sk-ant-..."), "pc-ai-key-claude", false, keySt.claude_key || null)}
                {keyRow("OpenAI (GPT)", gptKey, setGptKey, keyPlaceholder(keySt.gpt_key, "sk-..."), "pc-ai-key-gpt", false, keySt.gpt_key || null)}
                {keyRow("Gemini", geminiKey, setGeminiKey, keyPlaceholder(keySt.gemini_key, "AIzaSy..."), "pc-ai-key-gemini", false, keySt.gemini_key || null)}
                {keyRow("USDA (tra macro)", usdaKey, setUsdaKey, "USDA key...", "pc-ai-key-usda", true)}
              </div>
              <div style={{ padding: "4px 16px 14px 16px", fontSize: 12, color: PC.t3 }}>Dán khoá mới vào ô rồi bấm Lưu để thay; để trống = giữ khoá cũ. Khoá chỉ ghi — đã lưu thì không ai xem lại được nguyên khoá, kể cả admin.</div>
            </Card>

          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <Card testid="pc-ai-models">
              {cardHead(`Mô hình ${prov.name}`, "Chọn là lưu ngay")}
              <div role="radiogroup" aria-label="Mô hình" style={{ borderTop: `1px solid ${PC.headLine}` }}>
                {models.map((m, i) => {
                  const on = curModel === m.id;
                  const last = i === models.length - 1;
                  return (
                    <button key={m.id} type="button" role="radio" aria-checked={on} data-testid={`pc-ai-model-${m.id}`} disabled={readOnly && !on} onClick={() => pickModel(m.id)} className={readOnly ? "pc-row" : "pc-row pc-click"}
                      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", minHeight: 52, padding: "0 16px", border: "none", borderBottom: last ? "none" : `1px solid ${PC.rowLine}`, borderRadius: last ? "0 0 14px 14px" : 0,
                        background: on ? PC.rowSel : "transparent", fontFamily: "inherit", textAlign: "left", color: PC.t1, cursor: readOnly ? "default" : "pointer", opacity: readOnly && !on ? 0.6 : 1 }}>
                      <Radio on={on} />
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                        <span style={{ fontSize: 12, color: PC.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.desc}</span>
                      </span>
                      <Pill tone={m.badge === "Khuyên dùng" ? "green" : m.legacy ? "amber" : "gray"}>{m.badge}</Pill>
                    </button>
                  );
                })}
              </div>
            </Card>
            <Card testid="pc-ai-vision">
              {cardHead("Chụp ảnh món · AI xử lý ảnh", "Chọn là lưu ngay")}
              <div style={{ padding: "0 16px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span role="radiogroup" aria-label="AI xử lý ảnh chụp món" style={{ display: "flex", gap: 4, padding: 3, borderRadius: 12, background: "#FFFFFF", border: `1px solid ${PC.field}` }}>
                  {VISION.map((o) => {
                    const on = vision === o.v;
                    return (
                      <button key={o.v} type="button" role="radio" aria-checked={on} data-testid={`pc-ai-vision-${o.v}`} disabled={readOnly && !on} onClick={() => pickVision(o.v)} className="pc-btn"
                        style={{ flex: 1, minWidth: 0, height: 30, borderRadius: 9, border: "none", fontSize: 13, fontWeight: 800, fontFamily: "inherit", whiteSpace: "nowrap", cursor: readOnly ? "default" : "pointer", background: on ? PC.soft : "transparent", color: on ? PC.softFg : PC.t2 }}>
                        {o.label}
                      </button>
                    );
                  })}
                </span>
                <span style={{ fontSize: 12, color: PC.t3 }}>"Theo AI menu" = dùng chung nhà cung cấp đang chọn ({prov.name}).</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
