import { C, card, redBtn } from "../theme";

export function AiTab({isAdmin, saveSetting, aiProvider, setAiProvider, aiModel, setAiModel, geminiModel, setGeminiModel, gptModel, setGptModel, aiConnected, setAiConnected, claudeKey, setClaudeKey, geminiKey, setGeminiKey, gptKey, setGptKey, usdaKey, setUsdaKey}){
  if(!isAdmin) return <div style={card}>Chỉ Admin mới xem được trang này.</div>;
  const providerName=aiProvider==="claude"?"Claude":aiProvider==="gemini"?"Gemini":"GPT";
  return (
<div style={{...card,maxWidth:720,margin:"0 auto"}}>
      {/* Status bar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:16}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:aiConnected?C.green:C.red}}/>
        <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{providerName} · {aiProvider==="claude"?aiModel.replace("claude-","").split("-2025")[0]:aiProvider==="gemini"?(geminiModel||"").replace("gemini-",""):(gptModel||"")}</span>
        <span style={{marginLeft:"auto",fontSize:11,fontWeight:600,color:aiConnected?"#34C759":"#EF4444"}}>{aiConnected?"Đã kết nối":"Chưa kết nối"}</span>
      </div>

      {/* Provider */}
      <div style={{fontSize:11,fontWeight:700,color:C.t2,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Provider</div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[
          {id:"claude",name:"Claude",desc:"Anthropic",logo:"/icons/claude-logo.svg"},
          {id:"gemini",name:"Gemini",desc:"Google",logo:"/icons/gemini-logo.svg"},
          {id:"gpt",name:"GPT",desc:"OpenAI",logo:"/icons/gpt-logo.svg"},
        ].map(p=><div key={p.id} onClick={()=>{setAiProvider(p.id);if(p.id==="claude")setAiModel("claude-sonnet-5");if(isAdmin)saveSetting("ai_provider",p.id);}} style={{
          flex:1,padding:"14px 8px",borderRadius:12,cursor:"pointer",textAlign:"center",position:"relative",
          background:aiProvider===p.id?"rgba(0,122,255,0.04)":"#fff",border:aiProvider===p.id?`2px solid ${C.primary}`:`1px solid ${C.border}`,transition:"all 0.15s",
        }}>
          <img src={p.logo} alt={p.name} style={{width:36,height:36,margin:"0 auto 6px",display:"block",objectFit:"contain"}}/>
          <div style={{fontSize:12,fontWeight:700,color:C.t1}}>{p.name}</div>
          <div style={{fontSize:11,fontWeight:600,color:C.t2}}>{p.desc}</div>
          {aiProvider===p.id&&<div style={{position:"absolute",top:8,right:8,width:20,height:20,borderRadius:"50%",background:C.primary,color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>✓</div>}
        </div>)}
      </div>

      {/* Model */}
      <div style={{fontSize:11,fontWeight:700,color:C.t2,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Model</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>
        {(aiProvider==="claude"?[
          {id:"claude-sonnet-4-6",name:"Sonnet 4.6",desc:"Nhanh, chính xác",badge:"Ổn định",bc:"#F3F4F6",btc:"#666"},
          {id:"claude-sonnet-5",name:"Sonnet 5",desc:"Agentic mạnh, gần Opus",badge:"Khuyên dùng",bc:"#FEF3C7",btc:"#92400E"},
          {id:"claude-opus-4-6",name:"Opus 4.6",desc:"Mạnh nhất",badge:"Cao cấp",bc:"#EFF6FF",btc:"#1E40AF"},
        ]:aiProvider==="gemini"?[
          {id:"gemini-2.5-flash",name:"Gemini 2.5 Flash",desc:"Nhanh, rẻ, thinking model",badge:"Tiết kiệm",bc:"#DCFCE7",btc:"#14532D"},
          {id:"gemini-3.5-flash",name:"Gemini 3.5 Flash",desc:"Mới nhất, agentic + coding",badge:"Khuyên dùng",bc:"#FEF3C7",btc:"#92400E"},
          {id:"gemini-3.1-pro",name:"Gemini 3.1 Pro",desc:"Reasoning mạnh nhất",badge:"Cao cấp",bc:"#F3F4F6",btc:"#666"},
        ]:[
          {id:"gpt-4o-mini",name:"GPT-4o Mini",desc:"Nhanh, rẻ nhất",badge:"Tiết kiệm",bc:"#DCFCE7",btc:"#14532D"},
          {id:"chat-latest",name:"GPT-5.5 Instant",desc:"Mặc định ChatGPT",badge:"Khuyên dùng",bc:"#FEF3C7",btc:"#92400E"},
          {id:"gpt-5.5",name:"GPT-5.5 Thinking",desc:"Mạnh nhất",badge:"Cao cấp",bc:"#F3F4F6",btc:"#666"},
        ]).map(m=>{
          const curModel=aiProvider==="claude"?aiModel:aiProvider==="gemini"?geminiModel:gptModel;
          const setModel=aiProvider==="claude"?setAiModel:aiProvider==="gemini"?setGeminiModel:setGptModel;
          const modelKey=aiProvider==="claude"?"ai_model":aiProvider==="gemini"?"gemini_model":"gpt_model";
          const isActive=curModel===m.id;
          return <div key={m.id} onClick={()=>{setModel(m.id);if(isAdmin)saveSetting(modelKey,m.id);}} style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:10,cursor:"pointer",
            background:"#fff",border:isActive?`1.5px solid ${C.primary}`:`0.5px solid ${C.border}`,transition:"all 0.15s",
          }}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{m.name}</div>
              <div style={{fontSize:11,fontWeight:600,color:C.t2,marginTop:2}}>{m.desc}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,background:m.bc,color:m.btc}}>{m.badge}</span>
              <div style={{width:18,height:18,borderRadius:"50%",border:isActive?`none`:`1.5px solid #ddd`,background:isActive?C.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>{isActive?"✓":""}</div>
            </div>
          </div>;
        })}
      </div>

      {/* API Keys */}
      {isAdmin&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.t2,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>API Keys</div>
        {aiProvider==="claude"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg||"#F0FDF4",border:`0.5px solid ${C.green||"#34C759"}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:14}}>🔒</span>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t1}}>Claude — đã cấu hình trên server</div>
            <div style={{fontSize:10,fontWeight:500,color:C.t2,marginTop:1}}>Key được bảo mật, không lưu ở trình duyệt</div>
          </div>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#34C759",flexShrink:0}}/>
        </div>}
        {aiProvider==="gemini"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>Gemini</span>
          <input type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:geminiKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>}
        {aiProvider==="gpt"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>OpenAI</span>
          <input type="password" value={gptKey} onChange={e=>setGptKey(e.target.value)} placeholder="sk-..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:gptKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>USDA</span>
          <input type="password" value={usdaKey} onChange={e=>setUsdaKey(e.target.value)} placeholder="USDA key..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:usdaKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>
      </>}

      {/* Test + Save — 1 hàng cho gọn */}
      <div style={{display:"flex",gap:8,marginTop:10}}>
      <button onClick={async()=>{
        setAiConnected(false);
        try{
          if(aiProvider==="claude"){
            const r=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({foodDesc:"OK",provider:"claude",model:aiModel})});
            const d=await r.json();setAiConnected(!d.error);
          }else if(aiProvider==="gemini"){
            if(!geminiKey){setAiConnected(false);return;}
            const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"OK"}]}]})});
            const d=await r.json();setAiConnected(!d.error);
          }else{
            if(!gptKey){setAiConnected(false);return;}
            const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${gptKey}`},body:JSON.stringify({model:gptModel,messages:[{role:"user",content:"OK"}],...(gptModel==="gpt-4o-mini"?{max_tokens:10}:{max_completion_tokens:10})})});
            const d=await r.json();setAiConnected(!d.error);
          }
        }catch{setAiConnected(false);}
      }} style={{...redBtn,marginTop:0,flex:1}}>Test kết nối</button>

      {isAdmin&&<button onClick={async()=>{
        await saveSetting("ai_provider",aiProvider);
        await saveSetting("claude_key",claudeKey);
        await saveSetting("gemini_key",geminiKey);
        await saveSetting("gpt_key",gptKey);
        await saveSetting("usda_key",usdaKey);
        await saveSetting("ai_model",aiModel);
        await saveSetting("gpt_model",gptModel);
        await saveSetting("gemini_model",geminiModel);
        const el=document.getElementById("cloud-keys-saved");
        if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
      }} style={{...redBtn,marginTop:0,flex:1,background:"linear-gradient(135deg,#0F172A,#1E293B)"}}>☁️ Lưu lên Cloud</button>}
      </div>
      {isAdmin&&<div id="cloud-keys-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
        <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✅ Đã lưu!</span>
      </div>}

      {!isAdmin&&(claudeKey||geminiKey||gptKey)&&<div style={{marginTop:12,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1px solid ${C.green}`}}>
        <span style={{fontSize:12,fontWeight:600,color:"#14532D"}}>✅ API đã được admin cấu hình sẵn</span>
      </div>}
    </div>
  );
}
