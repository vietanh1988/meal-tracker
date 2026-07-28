import { useState } from "react";
import { C, card, inp, lbl, redBtn } from "./theme";
import { calcMacro } from "./calcMacro";
import { useIsMobile } from "./hooks/useIsMobile";
import AIMenuGenerator from "./AIMenuGenerator";
import { getAIMenuAccess, generateMenuAI, resolveMealIds } from "./lib/aiMenuService";

export function OnboardingWizard({profile,setProfile,onComplete,appSettings,user,saveWeeklyTemplate,applyTemplate}){
const mob=useIsMobile();
const [step,setStep]=useState(0);
const [showAIMenu,setShowAIMenu]=useState(false);
const [autoStyle,setAutoStyle]=useState("vn");
const [autoMenuLoading,setAutoMenuLoading]=useState(false);
const [autoMenuResult,setAutoMenuResult]=useState(null);

// Pin popup — hiện trước step 0
const isStandalone = typeof window !== "undefined" && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone);
const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
const [showPinGuide, setShowPinGuide] = useState(!isStandalone && isIOS);
const p=profile||defaultProfile;
const macro=calcMacro(p);
const totalSteps=5;
const aiAccess=getAIMenuAccess(p,appSettings);

const dayKeyToday=()=>["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"][new Date().getDay()];

const finishOnboarding=()=>{setProfile({...p,onboardingDone:true});onComplete();};

const handleApplyAIMenu=async(tpl)=>{
try{
const tplDayType=tpl.day_type||"train";
const tplMeals=(tpl.meals||[]).map(m=>({meal_id:m.meal_id,meal_name:m.meal_name||m.meal_id,items:m.items||[],composite:!!m.composite,pattern:m.pattern||null}));
const tplCal=Math.round((tpl.meals||[]).reduce((s,m)=>(m.items||[]).reduce((a,i)=>a+(i.cal||0),s),0));
if(saveWeeklyTemplate)await saveWeeklyTemplate(dayKeyToday(),tplDayType,tplMeals,tplCal);
if(applyTemplate)await applyTemplate(tpl);
}catch(e){console.error("Apply AI menu on onboarding error:",e);}
finishOnboarding();
};

const runAutoMenu=async()=>{
  setAutoMenuLoading(true);
  setAutoMenuResult(null);
  try{
    const dayType=(p.exerciseType||"gym")==="none"?"rest":"train";
    const mealIds=resolveMealIds(dayType,p,appSettings);
    const res=await generateMenuAI({macro,profile:p,dayType,mealIds,prefs:{style:autoStyle,avoid:""},avoidFoods:[],appSettings});
    if(res&&res.meals){setAutoMenuResult(res);}
    else{finishOnboarding();}
  }catch(e){
    console.error("Auto menu onboarding error:",e);
    finishOnboarding();
  }finally{setAutoMenuLoading(false);}
};

const stepDots=step===0?null:<div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
{[1,2,3,4,5].map(s=><div key={s} style={{width:s===step?24:8,height:8,borderRadius:4,background:s<step?"#007AFF":s===step?"#36A3FF":"#CDCDCD",transition:"all 0.3s"}}/>)}
</div>;

const nextBtn=(label,disabled,color)=><button onClick={()=>setStep(step+1)} disabled={disabled} style={{...redBtn,marginTop:16,opacity:disabled?0.5:1,background:color||"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)"}}>{label} →</button>;
const backBtn=<button onClick={()=>setStep(step-1)} style={{...redBtn,marginTop:8,background:"transparent",color:C.t3,fontWeight:700,fontSize:13}}>← Quay lại</button>;

const fieldBox=(children)=><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:mob?14:20,marginBottom:16}}>{children}</div>;

return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:mob?16:20}}>
<div style={{width:"100%",maxWidth:480}}>
<div style={{textAlign:"center",marginBottom:24}}>
<img src="/logo.png" alt="Fipilot AI" style={{width:72,height:72,borderRadius:15,objectFit:"cover"}}/>
<div style={{fontSize:20,fontWeight:900,color:C.t1,marginTop:10,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
<div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:2}}>Thiết lập hồ sơ của bạn</div>
</div>

{/* PIN GUIDE POPUP — hiện trước step 0 cho iOS Safari */}
{showPinGuide&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,zIndex:200}}>
  <div style={{background:"#fff",borderRadius:24,padding:"24px 20px 20px",width:"100%",maxWidth:340,position:"relative",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
    <div onClick={()=>setShowPinGuide(false)} style={{position:"absolute",top:12,right:14,fontSize:14,color:"#94A3B8",cursor:"pointer",width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"#F1F5F9"}}>✕</div>
    
    <div style={{textAlign:"center",marginBottom:16}}>
      <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#36A3FF,#007AFF)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px"}}>
        <span style={{fontSize:28}}>📲</span>
      </div>
      <div style={{fontSize:18,fontWeight:900,color:"#0F172A"}}>Cài Fipilot AI</div>
      <div style={{fontSize:12,color:"#64748B",marginTop:4}}>Dùng như app — không cần App Store</div>
    </div>

    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>1</div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>Nhấn nút <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{verticalAlign:"middle",margin:"0 2px"}}><rect x="3" y="7" width="18" height="14" rx="2" stroke="#007AFF" strokeWidth="2"/><path d="M12 3v12M8 7l4-4 4 4" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> Chia sẻ ở thanh dưới</div>
        <div style={{fontSize:12,color:"#64748B",marginTop:2}}>Vuốt lên nhẹ nếu không thấy thanh công cụ</div>
      </div>
    </div>

    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:14}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>2</div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>Cuộn xuống, chọn "Thêm vào MH chính"</div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#FEF3C7",borderRadius:8,border:"1.5px solid #F59E0B",marginTop:6}}>
          <span style={{fontSize:16}}>➕</span>
          <span style={{fontSize:13,fontWeight:700,color:"#0F172A"}}>Thêm vào Màn hình chính</span>
        </div>
      </div>
    </div>

    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>3</div>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>Nhấn "Thêm" — xong!</div>
        <div style={{fontSize:12,color:"#64748B",marginTop:2}}>Icon Fipilot AI sẽ xuất hiện trên màn hình chính</div>
      </div>
    </div>

    <div style={{textAlign:"center",fontSize:20,marginBottom:8}}>👇</div>
    <div style={{background:"#F2F2F7",borderRadius:14,padding:"8px 4px",display:"flex",alignItems:"center",justifyContent:"space-around",border:"1.5px solid #D1D5DB"}}>
      <span style={{fontSize:16,color:"#999"}}>◀</span>
      <span style={{fontSize:16,color:"#999"}}>▶</span>
      <div style={{position:"relative",padding:4}}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="7" width="18" height="14" rx="2" stroke="#007AFF" strokeWidth="2"/><path d="M12 3v12M8 7l4-4 4 4" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <div style={{position:"absolute",top:-6,left:-6,right:-6,bottom:-6,border:"2px solid #FF3B30",borderRadius:8}}/>
      </div>
      <span style={{fontSize:16,color:"#999"}}>📖</span>
      <span style={{fontSize:16,color:"#999"}}>⧉</span>
    </div>

    <div onClick={()=>setShowPinGuide(false)} style={{textAlign:"center",marginTop:12,fontSize:12,color:"#007AFF",fontWeight:600,cursor:"pointer",padding:"6px 0"}}>Đã hiểu, để sau</div>
  </div>
</div>}

{showAIMenu ? (
<AIMenuGenerator macro={macro} profile={p} user={user} appSettings={appSettings} onApply={handleApplyAIMenu} onClose={()=>setShowAIMenu(false)} />
) : (
<div style={{...card,padding:mob?"20px 16px":"24px 28px"}}>
{stepDots}

{/* STEP 0: Popup chào */}
{step===0&&<div style={{textAlign:"center"}}>
<div style={{fontSize:40,marginBottom:8}}>🍽️</div>
<div style={{fontSize:19,fontWeight:900,color:C.t1,lineHeight:1.3}}>Chào mừng bạn đến với<br/>FipilotAI! 🎉</div>
<div style={{fontSize:13,color:C.t2,lineHeight:1.6,marginTop:12}}>Để app tính <b>chính xác</b> calo mục tiêu & gợi ý bữa ăn phù hợp, bạn cần điền đầy đủ thông tin ở các bước tiếp theo nhé!</div>
<div style={{display:"flex",flexDirection:"column",gap:8,margin:"18px 0",textAlign:"left"}}>
{[
  {icon:"🎯",bg:"#EFF6FF",title:"Calo chính xác",desc:"tính theo cơ thể & mục tiêu của bạn"},
  {icon:"🤖",bg:"#FEF3C7",title:"AI gợi ý bữa ăn",desc:"thực đơn phù hợp dinh dưỡng"},
  {icon:"📊",bg:"#DCFCE7",title:"Theo dõi tiến trình",desc:"biết mình đang ở đâu"}
].map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.surface||"#F8FAFC",borderRadius:10,border:`1px solid ${C.border}`}}>
  <div style={{width:36,height:36,borderRadius:10,background:f.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{f.icon}</div>
  <div style={{fontSize:12,color:C.t2,fontWeight:600,lineHeight:1.4}}><b style={{color:C.t1,fontWeight:800}}>{f.title}</b> — {f.desc}</div>
</div>)}
</div>
<div style={{fontSize:11,color:"#F97316",fontWeight:700,marginBottom:14,display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>⚠️ Điền bừa = kết quả sai — hãy điền đúng nhé!</div>
<button onClick={()=>setStep(1)} style={{...redBtn,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)"}}>Bắt đầu thiết lập →</button>
</div>}

{/* STEP 1: Thông tin cơ bản */}
{step===1&&<div>
<div style={{textAlign:"center",marginBottom:16}}>
<div style={{fontSize:20}}>📋</div>
<div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Thông tin cơ bản</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3}}>Bước 1/{totalSteps}</div>
</div>

{/* Gender */}
<div style={{...lbl,marginBottom:8}}>Giới tính</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
{[{id:"male",icon:"👨",name:"Nam"},{id:"female",icon:"👩",name:"Nữ"}].map(g=><div key={g.id} onClick={()=>setProfile({...p,gender:g.id})} style={{
padding:"12px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
background:(p.gender||"male")===g.id?"#EFF6FF":C.surface,
border:`1.5px solid ${(p.gender||"male")===g.id?"#60A5FA":C.border}`,
}}>
<span style={{fontSize:22}}>{g.icon}</span>
<span style={{fontSize:14,fontWeight:700,color:C.t1}}>{g.name}</span>
<div style={{marginLeft:"auto",width:20,height:20,borderRadius:"50%",border:`2px solid ${(p.gender||"male")===g.id?"#007AFF":"#E2E8F0"}`,background:(p.gender||"male")===g.id?"#007AFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{(p.gender||"male")===g.id?"✓":""}</div>
</div>)}
</div>

{/* 4 inputs */}
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
{[
{key:"cm",label:"Chiều cao",icon:"📏",unit:"cm",mode:"numeric"},
{key:"kg",label:"Cân nặng",icon:"⚖️",unit:"kg",mode:"decimal"},
{key:"birthYear",label:"Năm sinh",icon:"🎂",unit:p.birthYear?`${new Date().getFullYear()-p.birthYear} tuổi`:"",mode:"numeric"},
].map(f=><div key={f.key}>
<div style={{fontSize:mob?11:13,fontWeight:mob?600:700,color:C.t2,marginBottom:4}}>{f.icon} {f.label}</div>
<div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
<input type="text" inputMode={f.mode} value={f.key==="kg"?p.kg:p[f.key]} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;setProfile({...p,[f.key]:Number(v)});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
<span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
</div>
</div>)}
</div>

{nextBtn("Tiếp theo",!p.cm||!p.kg||!p.birthYear)}
</div>}

{/* STEP 2: Hoạt động */}
{step===2&&<div>
<div style={{textAlign:"center",marginBottom:16}}>
<div style={{fontSize:20}}>🏃</div>
<div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Hoạt động của bạn</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3}}>Bước 2/{totalSteps}</div>
</div>

{/* Câu 1: Bạn tập gì? */}
<div style={{...lbl,marginBottom:8}}>Bạn thường tập gì?</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?6:8,marginBottom:16}}>
{[
{id:"gym",icon:"ex_gym",name:"Gym"},
{id:"gym_cardio",icon:"ex_gym_cardio",name:"Gym + Cardio"},
{id:"cardio",icon:"ex_cardio",name:"Cardio"},
{id:"none",icon:"ex_none",name:"Không tập"},
].map(e=><div key={e.id} onClick={()=>{
const updated={...p,exerciseType:e.id};
if(e.id==="none"){updated.goalType=p.goalType==="bulk"?"maintain":p.goalType;updated.frequency=undefined;}
setProfile(updated);
}} style={{
padding:mob?"10px 6px":"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
background:(p.exerciseType||"gym")===e.id?C.primaryBg:C.surface,
border:(p.exerciseType||"gym")===e.id?`2px solid #F87171`:`1.5px solid ${C.border}`,
}}>
<img src={`/icons/${e.icon}.png`} alt="" style={{width:mob?34:38,height:"auto",maxHeight:mob?34:38}}/>
<div style={{fontSize:mob?11:12,fontWeight:800,color:C.t1,marginTop:4}}>{e.name}</div>
</div>)}
</div>

{/* Câu 2: Tần suất */}
{(p.exerciseType||"gym")!=="none"&&<>
<div style={{...lbl,marginBottom:8}}>Bạn tập thường xuyên đến mức nào?</div>
<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
{[
{id:"occasional",name:"Thỉnh thoảng",desc:"1-2 buổi/tuần"},
{id:"regular",name:"Đều đặn",desc:"3-4 buổi/tuần"},
{id:"frequent",name:"Rất thường xuyên",desc:"5-6 buổi/tuần"},
{id:"daily",name:"Gần như mỗi ngày",desc:"6-7 buổi/tuần"},
].map(f=><div key={f.id} onClick={()=>setProfile({...p,frequency:f.id})} style={{
display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",
background:(p.frequency||"regular")===f.id?"#EFF6FF":C.surface,
border:(p.frequency||"regular")===f.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
}}>
<div style={{width:18,height:18,borderRadius:"50%",border:(p.frequency||"regular")===f.id?`2.5px solid #3B82F6`:`2.5px solid ${C.border}`,background:(p.frequency||"regular")===f.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
{(p.frequency||"regular")===f.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
</div>
<div><span style={{fontSize:13,fontWeight:600,color:(p.frequency||"regular")===f.id?"#2563EB":C.t1}}>{f.name}</span><span style={{fontSize:11,fontWeight:500,color:C.t3,marginLeft:6}}>{f.desc}</span></div>
</div>)}
</div>
</>}

{(p.exerciseType||"gym")==="none"&&<div style={{padding:"10px 14px",borderRadius:10,background:"#FEF3C7",border:"1px solid #FDE68A",fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>⚠️ App sẽ tự tính macro cho người không tập lực</div>}

{nextBtn("Tiếp theo")}
{backBtn}
</div>}

{/* STEP 3: Mục tiêu */}
{step===3&&<div>
<div style={{textAlign:"center",marginBottom:16}}>
<div style={{fontSize:20}}>🎯</div>
<div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Mục tiêu</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3}}>Bước 3/{totalSteps}</div>
</div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:mob?6:8,marginBottom:16}}>
{[
{id:"bulk",icon:"💪",name:"Tăng cơ",c:"#16A34A",bg:"#DCFCE7",bc:"#00C896"},
{id:"cut",icon:"🔥",name:"Giảm mỡ",c:"#EF4444",bg:"#FEE2E2",bc:"#F87171"},
{id:"maintain",icon:"⚖️",name:"Duy trì",c:"#007AFF",bg:"#EFF6FF",bc:"#60A5FA"},
].map(g=>{
const disabled=(p.exerciseType||"gym")==="none"&&g.id==="bulk";
return <div key={g.id} onClick={()=>{if(!disabled){const up={...p,goalType:g.id};if(g.id!=="cut")up.dietStrategy="balanced";setProfile(up);}}} style={{
padding:mob?"10px 6px":"14px 10px",borderRadius:12,cursor:disabled?"not-allowed":"pointer",textAlign:"center",
background:p.goalType===g.id?g.bg:C.surface,
border:p.goalType===g.id?`2px solid ${g.bc}`:`1.5px solid ${C.border}`,
opacity:disabled?0.3:1,
}}>
<div style={{fontSize:mob?20:22}}>{g.icon}</div>
<div style={{fontSize:mob?12:13,fontWeight:800,color:C.t1,marginTop:4}}>{g.name}</div>
</div>;
})}
</div>

{/* Chế độ ăn (chỉ khi Giảm mỡ) */}
{p.goalType==="cut"&&<div style={{marginBottom:14,paddingTop:12,borderTop:`1.5px solid #F3F4F6`}}>
<div style={{fontSize:mob?13:14,fontWeight:800,color:C.t2,marginBottom:8}}>🍽️ Chế độ ăn giảm mỡ</div>
<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:6}}>
{[
{id:"balanced",name:"Cân bằng"},
{id:"low_carb",name:"Low-carb (≤ 100g)"},
{id:"keto",name:"Keto (≤ 50g)"},
].map(d=><div key={d.id} onClick={()=>setProfile({...p,dietStrategy:d.id})} style={{
display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",
background:(p.dietStrategy||"balanced")===d.id?"#EFF6FF":C.surface,
border:(p.dietStrategy||"balanced")===d.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
}}>
<div style={{width:18,height:18,borderRadius:"50%",border:(p.dietStrategy||"balanced")===d.id?`2.5px solid #3B82F6`:`2.5px solid ${C.border}`,background:(p.dietStrategy||"balanced")===d.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
{(p.dietStrategy||"balanced")===d.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
</div>
<span style={{fontSize:13,fontWeight:600,color:(p.dietStrategy||"balanced")===d.id?"#2563EB":C.t1}}>{d.name}</span>
</div>)}
</div>
</div>}

{/* Goal weight + duration */}
{p.goalType!=="maintain"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
{[
{key:"goalKg",label:"Cân nặng mục tiêu",icon:"⚖️",unit:"kg",mode:"decimal"},
{key:"months",label:"Thời gian mong muốn",icon:"📅",unit:"tháng",mode:"numeric"},
].map(f=><div key={f.key}>
<div style={{fontSize:mob?11:13,fontWeight:mob?600:700,color:C.t2,marginBottom:4}}>{f.icon} {f.label}</div>
<div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
<input type="text" inputMode={f.mode} value={p[f.key]||""} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;if(v===""){setProfile({...p,[f.key]:""});return;}setProfile({...p,[f.key]:Number(v)});}} onBlur={e=>{if(f.key==="months"&&(!p[f.key]||p[f.key]<1))setProfile({...p,months:1});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
<span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
</div>
</div>)}
</div>}

{/* Safety check */}
{p.goalType!=="maintain"&&macro.perWeek>0&&<div style={{marginTop:12,padding:"8px 12px",background:macro.safe?C.greenBg:C.redBg,borderRadius:8,border:`1.5px solid ${macro.safe?C.green:C.red}`}}>
<span style={{fontSize:12,fontWeight:700,color:macro.safe?"#14532D":"#7F1D1D"}}>
{macro.safe
?`✓ Tốc độ ${macro.perWeek} kg/tuần — an toàn!`
:`⚠ Tốc độ ${macro.perWeek} kg/tuần — quá nhanh! Nên kéo dài thời gian.`
}
</span>
</div>}

{nextBtn("Tiếp theo")}
{backBtn}
</div>}

{/* STEP 4: Hoàn tất — Preview macro */}
{step===4&&<div>
<div style={{textAlign:"center",marginBottom:16}}>
<div style={{fontSize:20}}>✨</div>
<div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Hoàn tất!</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3}}>Macro đã tính xong</div>
</div>

{/* Macro hero preview — nền sáng + bars */}
<div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",border:"1.5px solid #93C5FD",borderRadius:14,padding:20,marginBottom:12,textAlign:"center"}}>
<div style={{fontSize:11,fontWeight:700,color:"#64748B",letterSpacing:"0.08em"}}>{(profile.exerciseType||"gym")==="none"?"CALO MỤC TIÊU":"CALO MỤC TIÊU NGÀY TẬP"}</div>
<div style={{fontSize:36,fontWeight:900,color:"#0F172A",marginTop:6}}>
{macro.calTarget} <span style={{fontSize:14,fontWeight:700,color:"#94A3B8"}}>kcal</span>
</div>
{(profile.calorieMode||"standard")==="asian"&&<span style={{display:"inline-block",fontSize:11,fontWeight:700,color:"#1D4ED8",padding:"2px 8px",background:"rgba(59,130,246,0.1)",borderRadius:6,marginTop:4}}>🇻🇳 Calo chuẩn Việt Nam</span>}
{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{display:"inline-block",fontSize:11,fontWeight:700,color:"#92400E",padding:"2px 8px",background:"rgba(251,191,36,0.2)",borderRadius:6,marginTop:4,marginLeft:4}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}

<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:16}}>
{[
{name:"Đạm",val:macro.protein,pct:Math.min(100,Math.round(macro.protein/macro.calTarget*400)),color:"#007AFF"},
{name:"Tinh bột",val:macro.carb,pct:Math.min(100,Math.round(macro.carb/macro.calTarget*400)),color:"#5AC8FA"},
{name:"Chất béo",val:macro.fat,pct:Math.min(100,Math.round(macro.fat/macro.calTarget*900)),color:"#8E8E93"},
{name:"Chất xơ",val:macro.fiber,pct:Math.min(100,Math.round(macro.fiber/50*100)),color:"#34C759"},
].map(m=><div key={m.name} style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{fontSize:12,fontWeight:700,color:"#475569",width:55,textAlign:"right"}}>{m.name}</div>
<div style={{flex:1,height:10,background:"rgba(0,0,0,0.06)",borderRadius:5,overflow:"hidden"}}>
<div style={{height:"100%",borderRadius:5,background:m.color,width:`${m.pct}%`,transition:"width 0.5s ease"}}/>
</div>
<div style={{fontSize:13,fontWeight:800,color:"#0F172A",width:40}}>{m.val}g</div>
</div>)}
</div>
</div>

{/* Breakdown */}
<div style={{background:C.surface,borderRadius:10,padding:"10px 14px",marginBottom:12,border:`1.5px solid ${C.border}`}}>
<div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
<span style={{color:C.t3}}>BMR</span><span style={{fontWeight:800,color:C.t1}}>{macro.bmr} cal</span>
</div>
<div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
<span style={{color:C.t3}}>TDEE (×{macro.actMul})</span><span style={{fontWeight:800,color:C.t1}}>{macro.tdee} cal</span>
</div>
{(profile.exerciseType||"gym")!=="none"&&<div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
<span style={{color:C.t3}}>Calo ngày nghỉ</span><span style={{fontWeight:800,color:C.blue}}>{macro.calRest} cal</span>
</div>}
<div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"6px 0"}}>
<span style={{color:C.t3}}>{macro.goal==="bulk"?"Surplus":macro.goal==="cut"?"Deficit":"Điều chỉnh"}</span>
<span style={{fontWeight:800,color:macro.goal==="bulk"?C.green:macro.goal==="cut"?C.red:C.t1}}>
{macro.goal==="bulk"?"+250":macro.goal==="cut"?"-350":"0"} cal
</span>
</div>
</div>

<div style={{padding:"8px 12px",background:C.goldBg,borderRadius:8,border:"1.5px solid #CA8A04",marginBottom:4}}>
<span style={{fontSize:12,fontWeight:700,color:"#78350F"}}>💡 Bạn có thể thay đổi bất cứ lúc nào trong tab Hồ sơ</span>
</div>

<button onClick={()=>setStep(5)} style={{...redBtn,marginTop:16,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)"}}>Tiếp theo — AI tạo thực đơn →</button>
{backBtn}
</div>}

{/* STEP 5: AI tạo menu ngày đầu tiên */}
{step===5&&<div>
<div style={{textAlign:"center",marginBottom:16}}>
<div style={{fontSize:28}}>🍽️</div>
<div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Bước cuối — Chọn phong cách ăn</div>
<div style={{fontSize:12,color:C.t3,marginTop:4}}>AI sẽ tạo thực đơn ngày đầu tiên cho bạn</div>
</div>

{!autoMenuLoading&&!autoMenuResult&&<>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{[
  {id:"vn",icon:"🇻🇳",name:"Cơm nhà Việt Nam",desc:"Thịt kho, cá chiên, canh rau, cơm trắng..."},
  {id:"clean",icon:"🥗",name:"Eat Clean",desc:"Ức gà, cá hấp, rau luộc, gạo lứt..."},
  {id:"easy",icon:"⚡",name:"Tiện lợi",desc:"Mua nhanh, nấu nhanh, dân văn phòng"},
].map(s=><div key={s.id} onClick={()=>setAutoStyle(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,border:autoStyle===s.id?"2px solid #007AFF":"1.5px solid "+C.border,background:autoStyle===s.id?"#EFF6FF":C.surface,cursor:"pointer"}}>
  <span style={{fontSize:24}}>{s.icon}</span>
  <div style={{flex:1}}>
    <div style={{fontSize:14,fontWeight:800,color:C.t1}}>{s.name}</div>
    <div style={{fontSize:11,color:C.t3,marginTop:1}}>{s.desc}</div>
  </div>
  <div style={{width:20,height:20,borderRadius:10,border:autoStyle===s.id?"none":"2px solid "+C.border,background:autoStyle===s.id?"#007AFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
    {autoStyle===s.id&&<div style={{width:8,height:8,borderRadius:4,background:"#fff"}}/>}
  </div>
</div>)}
</div>
<button onClick={runAutoMenu} style={{...redBtn,marginTop:14,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)"}}>AI tạo thực đơn cho tôi →</button>
<div style={{textAlign:"center",marginTop:6,fontSize:11,color:C.t3,fontWeight:600}}>Bạn có thể đổi phong cách bất kỳ lúc nào</div>
</>}

{autoMenuLoading&&<div style={{textAlign:"center",padding:"40px 0"}}>
<div style={{width:48,height:48,border:"4px solid "+C.border,borderTopColor:"#007AFF",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 14px"}}/>
<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
<div style={{fontSize:15,fontWeight:800,color:C.t1}}>AI đang tạo thực đơn...</div>
<div style={{fontSize:12,color:C.t3,marginTop:4}}>Chọn món từ kho 1,270+ món Việt</div>
<div style={{display:"flex",gap:4,justifyContent:"center",marginTop:14}}>
{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:3,background:"#007AFF",animation:"pulse 1.2s infinite "+i*0.2+"s"}}/>)}
</div>
<style>{`@keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
</div>}

{autoMenuResult&&<div>
<div style={{textAlign:"center",marginBottom:10}}>
<span style={{fontSize:11,fontWeight:700,color:"#007AFF",padding:"3px 10px",background:"#EFF6FF",borderRadius:6}}>
{{vn:"Cơm nhà VN",clean:"Eat Clean",easy:"Tiện lợi"}[autoStyle]} · {{cut:"Giảm mỡ",bulk:"Tăng cơ",maintain:"Duy trì"}[p.goalType||"cut"]}
</span>
</div>
{(autoMenuResult.meals||[]).map((m,i)=>{
  const mealCal=Math.round((m.items||[]).reduce((s,it)=>s+(it.cal||0),0));
  const icons=["🌅","☀️","🌙","🍎"];
  return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<(autoMenuResult.meals||[]).length-1?"1px solid "+C.surface:"none"}}>
    <span style={{fontSize:18}}>{icons[i]||"🍽️"}</span>
    <div style={{flex:1}}>
      <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{m.meal_name||m.meal_id}</div>
      <div style={{fontSize:11,color:C.t3,marginTop:1}}>{(m.items||[]).map(it=>it.display||it.food).join(" · ")}</div>
    </div>
    <div style={{fontSize:14,fontWeight:800,color:"#007AFF"}}>{mealCal} <span style={{fontSize:10,color:C.t3,fontWeight:600}}>cal</span></div>
  </div>;
})}
<div style={{display:"flex",gap:6,marginTop:10,padding:10,background:"#F0F7FF",borderRadius:10}}>
{[
  {label:"kcal",val:Math.round((autoMenuResult.meals||[]).reduce((s,m)=>(m.items||[]).reduce((a,i)=>a+(i.cal||0),s),0)),color:"#007AFF"},
  {label:"Đạm",val:Math.round((autoMenuResult.meals||[]).reduce((s,m)=>(m.items||[]).reduce((a,i)=>a+(i.p||0),s),0))+"g",color:"#007AFF"},
  {label:"Tinh bột",val:Math.round((autoMenuResult.meals||[]).reduce((s,m)=>(m.items||[]).reduce((a,i)=>a+(i.c||0),s),0))+"g",color:"#5AC8FA"},
  {label:"Chất béo",val:Math.round((autoMenuResult.meals||[]).reduce((s,m)=>(m.items||[]).reduce((a,i)=>a+(i.f||0),s),0))+"g",color:"#F59E0B"},
].map((x,i)=><div key={i} style={{flex:1,textAlign:"center"}}>
  <div style={{fontSize:15,fontWeight:800,color:x.color}}>{x.val}</div>
  <div style={{fontSize:9,color:C.t3,fontWeight:600}}>{x.label}</div>
</div>)}
</div>
<button onClick={()=>handleApplyAIMenu(autoMenuResult)} style={{...redBtn,marginTop:14,background:"linear-gradient(135deg,#00C896,#059669)"}}>Áp dụng thực đơn này ✓</button>
<button onClick={()=>{setAutoMenuResult(null);runAutoMenu();}} style={{...redBtn,marginTop:6,background:"transparent",color:C.t3,fontWeight:700,fontSize:13}}>🔄 Tạo lại menu khác</button>
</div>}

<button onClick={()=>finishOnboarding()} style={{...redBtn,marginTop:8,background:"transparent",color:C.t3,fontWeight:700,fontSize:13}}>Bỏ qua — tôi tự nhập sau</button>
<button onClick={()=>setStep(4)} style={{...redBtn,marginTop:4,background:"transparent",color:C.t3,fontWeight:700,fontSize:13}}>← Quay lại</button>
</div>}
</div>
)}
</div>
</div>;
}
