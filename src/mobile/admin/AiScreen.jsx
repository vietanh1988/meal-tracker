// Quản trị › Kết nối AI (bản vẽ 106, chốt 16/10) — thay tab cũ adminTabs/AiTab.jsx.
// State trước đây nằm ở AdminPanel.jsx, chép nguyên cách nạp/lưu vào đây:
//  - aiProvider: localStorage "aiProvider" → appSettings.ai_provider → "claude"
//  - ai_model / gemini_model / gpt_model: appSettings → mặc định claude-sonnet-5 / gemini-2.5-flash / gpt-4o-mini
//  - khoá gemini / gpt: CHỈ GHI qua RPC (src/lib/aiKeys.js), không tải về; usda: appSettings → localStorage
//  - luôn ghi localStorage aiProvider; admin ghi thêm khoá USDA vào localStorage
// Hành vi giữ như cũ: chọn nhà cung cấp / mô hình lưu ngay key đó; "Lưu" ghi đủ 8 key; "Thử kết nối" gọi ai-proxy
// feature "ping_test" (tốn rất ít tiền — không bấm khi test tự động).
// Sửa lỗi: ô "AI xử lý ảnh" đọc appSettings.photo_vision_provider (bản cũ không được truyền appSettings nên luôn hiện "auto").
// Admin thường: chỉ xem (ô nhập khoá, không chọn được), vẫn Thử kết nối, không có nút Lưu.
import { PROVIDERS, MODEL_KEY, DEFAULT_MODEL, modelsFor } from "../../lib/aiModels";
import { useEffect, useState } from "react";
import { DK } from "../../theme";
import { authFetch } from "../../lib/authFetch";
import { useAiKeys } from "../../lib/aiKeys";
import { keyPlaceholder } from "../../lib/aiKeysView";
import { pickAiModel } from "../../lib/aiProvider";
import { SubPage, Seg } from "../ui";
import { Sec, Card, Row, Pill, Btn, BtnRow, ReadOnly, Field, inp, Empty } from "./adminUI";

const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } };
const wifi = <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" /></svg>;

function Radio({ on }) {
  return on
    ? <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, background: "#FFFFFF", boxShadow: "inset 0 0 0 6px #0062F0", flexShrink: 0 }} />
    : <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 11, border: "2px solid rgba(255,255,255,0.35)", boxSizing: "border-box", flexShrink: 0 }} />;
}

export function AiScreen({ onBack, isAdmin, isSuperAdmin, appSettings = {}, saveSetting, showToast }) {
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

  // appSettings tải sau (bất đồng bộ) — cloud luôn thắng (như AdminPanel)
  useEffect(() => {
    if (appSettings.ai_provider) setAiProvider(appSettings.ai_provider);
    if (appSettings.usda_key) setUsdaKey(appSettings.usda_key);
    if (appSettings.gpt_model) setGptModel(appSettings.gpt_model);
    if (appSettings.gemini_model) setGeminiModel(appSettings.gemini_model);
    if (appSettings.ai_model) setAiModel(appSettings.ai_model);
  }, [appSettings]);
  useEffect(() => { setVision(appSettings.photo_vision_provider || "auto"); }, [appSettings.photo_vision_provider]);

  // Ghi localStorage như AdminPanel
  useEffect(() => {
    lsSet("aiProvider", aiProvider);
    if (isAdmin) lsSet("usdaKey", usdaKey);
  }, [aiProvider, usdaKey, isAdmin]);

  const title = "Kết nối AI";
  if (!isAdmin) return (
    <SubPage dark title={title} onBack={onBack}>
      <Empty>Chỉ Admin mới xem được trang này.</Empty>
    </SubPage>
  );

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
    if (readOnly) return;
    setVision(v);
    await saveSetting("photo_vision_provider", v);
    showToast?.({ text: "Đã lưu AI xử lý ảnh" }, 2500);
  };

  // Gọi AI thật (ping_test) — chỉ khi người dùng bấm
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

  const keyField = (label, value, set, ph, testid) => (
    <Field label={label}>
      <input data-testid={testid} type="password" autoComplete="off" value={value} onChange={(e) => !readOnly && set(e.target.value)} disabled={readOnly} placeholder={ph}
        style={{ ...inp, fontWeight: 600, opacity: readOnly ? 0.6 : 1 }} />
    </Field>
  );

  return (
    <SubPage dark title={title} onBack={onBack}>
      <div data-testid="adm-ai" style={{ paddingBottom: 32 }}>
        {readOnly && <ReadOnly />}

        <Card pad="12px 14px" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }} testid="adm-ai-status">
          <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, background: testing ? DK.amber : aiConnected ? DK.green : "#EF4444", boxShadow: `0 0 0 4px ${testing ? "rgba(252,211,77,0.2)" : aiConnected ? "rgba(74,222,155,0.2)" : "rgba(239,68,68,0.2)"}` }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prov.name} · {modelName}</span>
          <Pill tone={testing ? "amber" : aiConnected ? "green" : "red"} h={26}>{testing ? "Đang thử…" : aiConnected ? "Đã kết nối" : "Chưa kết nối"}</Pill>
        </Card>

        <Sec>Nhà cung cấp</Sec>
        <div role="group" aria-label="Nhà cung cấp AI" style={{ display: "flex", gap: 8, margin: "0 12px" }}>
          {PROVIDERS.map((p) => {
            const on = p.id === aiProvider;
            return (
              <button key={p.id} data-testid={`adm-ai-prov-${p.id}`} aria-pressed={on} disabled={readOnly && !on} onClick={() => pickProvider(p.id)} className="tap"
                style={{ flex: 1, minWidth: 0, borderRadius: 14, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", fontFamily: "inherit",
                  background: on ? "#FFFFFF" : "rgba(255,255,255,0.08)", color: on ? "#0040E0" : "#FFFFFF", boxShadow: on ? "0 4px 14px rgba(0,0,0,0.18)" : "none", opacity: readOnly && !on ? 0.55 : 1 }}>
                <img src={p.logo} alt="" aria-hidden="true" style={{ width: 26, height: 26, objectFit: "contain" }} />
                <span style={{ fontSize: 15, fontWeight: 900 }}>{p.name}</span>
                <span style={{ fontSize: 10, opacity: 0.75 }}>{p.desc}</span>
              </button>
            );
          })}
        </div>

        <Sec>Mô hình</Sec>
        <Card>
          {models.map((m, i) => {
            const on = curModel === m.id;
            const inner = (
              <>
                <Radio on={on} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "8px 0" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                  <span style={{ fontSize: 12, color: DK.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.desc}</span>
                </span>
                <Pill tone={m.badge === "Khuyên dùng" ? "green" : m.legacy ? "amber" : "grey"} h={22}>{m.badge}</Pill>
              </>
            );
            return readOnly
              ? <Row key={m.id} last={i === models.length - 1} style={{ minHeight: 56, opacity: on ? 1 : 0.7 }} testid={`adm-ai-model-${m.id}`}>{inner}</Row>
              : <Row key={m.id} last={i === models.length - 1} style={{ minHeight: 56 }} onClick={() => pickModel(m.id)} testid={`adm-ai-model-${m.id}`}>{inner}</Row>;
          })}
        </Card>

        <Sec>Khoá API</Sec>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
            {keyField(`Claude · ${keySt.claude_key?.set ? "Đã cài" : "Chưa cài"}`, claudeKey, setClaudeKey, keyPlaceholder(keySt.claude_key, "sk-ant-..."), "adm-ai-key-claude")}
            {keyField(`OpenAI (GPT) · ${keySt.gpt_key?.set ? "Đã cài" : "Chưa cài"}`, gptKey, setGptKey, keyPlaceholder(keySt.gpt_key, "sk-..."), "adm-ai-key-gpt")}
            {keyField(`Gemini · ${keySt.gemini_key?.set ? "Đã cài" : "Chưa cài"}`, geminiKey, setGeminiKey, keyPlaceholder(keySt.gemini_key, "AIzaSy..."), "adm-ai-key-gemini")}
            {keyField("USDA (tra macro)", usdaKey, setUsdaKey, "USDA key...", "adm-ai-key-usda")}
            <span style={{ fontSize: 11, color: DK.t3, lineHeight: 1.5 }}>Dán khoá mới rồi bấm Lưu để thay; để trống = giữ khoá cũ. Khoá chỉ ghi — không ai xem lại được nguyên khoá.</span>
          </div>
        </Card>

        <Sec>Chụp ảnh món · AI xử lý ảnh</Sec>
        <Card pad="12px 14px">
          <Seg dark size="sm" ariaLabel="AI xử lý ảnh chụp món" value={vision} onChange={pickVision}
            opts={[
              { value: "auto", label: "Theo AI menu", testid: "adm-ai-vision-auto", disabled: readOnly && vision !== "auto" },
              { value: "claude", label: "Claude", testid: "adm-ai-vision-claude", disabled: readOnly && vision !== "claude" },
              { value: "gemini", label: "Gemini", testid: "adm-ai-vision-gemini", disabled: readOnly && vision !== "gemini" },
              { value: "gpt", label: "GPT", testid: "adm-ai-vision-gpt", disabled: readOnly && vision !== "gpt" },
            ]} />
          <span style={{ display: "block", marginTop: 8, fontSize: 11, color: DK.t3, lineHeight: 1.5 }}>"Theo AI menu" = dùng chung nhà cung cấp đang chọn ({prov.name}).</span>
        </Card>

        <BtnRow style={{ margin: "14px 12px 0 12px" }}>
          <Btn kind="ghost" h={50} testid="adm-ai-test" disabled={testing} onClick={test}>{wifi}{testing ? "Đang thử…" : "Thử kết nối"}</Btn>
          {!readOnly && <Btn kind="blue" h={50} testid="adm-ai-save" disabled={saving} onClick={save}>{saving ? "Đang lưu…" : "Lưu"}</Btn>}
        </BtnRow>
      </div>
    </SubPage>
  );
}
