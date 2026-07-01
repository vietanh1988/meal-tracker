import { useState } from "react";
import { C, card, inp, lbl, redBtn } from "./theme";
import { calcMacro } from "./calcMacro";
import { MacroRing } from "./MacroRing";
import { useIsMobile } from "./hooks/useIsMobile";

export function OnboardingWizard({profile,setProfile,onComplete}){
  const mob=useIsMobile();
  const [step,setStep]=useState(1);
  const p=profile||defaultProfile;
  const macro=calcMacro(p);
  const totalSteps=4;

  const stepDots=<div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
    {[1,2,3,4].map(s=><div key={s} style={{width:s===step?24:8,height:8,borderRadius:4,background:s<step?"#007AFF":s===step?"#36A3FF":"#CDCDCD",transition:"all 0.3s"}}/>)}
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

      <div style={{...card,padding:mob?"20px 16px":"24px 28px"}}>
        {stepDots}

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

          {/* Macro hero preview */}
          <div style={{background:"linear-gradient(135deg,#0A1628 0%,#162544 100%)",border:"2.5px solid #007AFF",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:"0.08em"}}>CALO MỤC TIÊU NGÀY TẬP</div>
            <div style={{fontSize:32,fontWeight:900,color:"#FFF",letterSpacing:"-0.03em",marginTop:4}}>{macro.calTarget} <span style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.5)"}}>kcal</span>{(profile.calorieMode||"standard")==="asian"&&<span style={{fontSize:11,fontWeight:700,color:"#5AC8FA",marginLeft:8,padding:"2px 8px",background:"rgba(90,200,250,0.15)",borderRadius:6}}>🇻🇳 Calo chuẩn Việt Nam</span>}{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:11,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),marginLeft:6,padding:"2px 8px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.15)":"rgba(251,191,36,0.15)"),borderRadius:6}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}</div>
            <div style={{display:"flex",gap:14,marginTop:12}}>
              <MacroRing l="Protein" v={macro.protein} max={macro.protein} color="#007AFF" color2="#007AFF" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
              <MacroRing l="Carb" v={macro.carb} max={macro.carb} color="#5AC8FA" color2="#5AC8FA" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
              <MacroRing l="Fat" v={macro.fat} max={macro.fat} color="#8E8E93" color2="#8E8E93" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
              <MacroRing l="Chất xơ" v={macro.fiber} max={macro.fiber} color="#34C759" color2="#34C759" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
            </div>
          </div>

          {/* Breakdown */}
          <div style={{background:C.surface,borderRadius:10,padding:"10px 14px",marginBottom:12,border:`1.5px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.t3}}>BMR</span><span style={{fontWeight:800,color:C.t1}}>{macro.bmr} cal</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.t3}}>TDEE (×{macro.actMul})</span><span style={{fontWeight:800,color:C.t1}}>{macro.tdee} cal</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.t3}}>Calo ngày nghỉ</span><span style={{fontWeight:800,color:C.blue}}>{macro.calRest} cal</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
              <span style={{color:C.t3}}>{macro.goal==="bulk"?"Surplus":macro.goal==="cut"?"Deficit":"Điều chỉnh"}</span>
              <span style={{fontWeight:800,color:macro.goal==="bulk"?C.green:macro.goal==="cut"?C.red:C.t1}}>
                {macro.goal==="bulk"?"+250":macro.goal==="cut"?"-350":"0"} cal
              </span>
            </div>
          </div>

          <div style={{padding:"8px 12px",background:C.goldBg,borderRadius:8,border:"1.5px solid #CA8A04",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:"#78350F"}}>💡 Bạn có thể thay đổi bất cứ lúc nào trong tab Hồ sơ</span>
          </div>

          <button onClick={()=>{
            setProfile({...p,onboardingDone:true});
            onComplete();
          }} style={{...redBtn,marginTop:16,background:"linear-gradient(135deg,#15803D,#166534)"}}>💾 Lưu & Vào Dashboard</button>
          {backBtn}
        </div>}
      </div>
    </div>
  </div>;
}
