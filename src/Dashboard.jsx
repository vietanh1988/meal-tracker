import { useState, useEffect, useRef } from "react";
import { C, card, inp, redBtn } from "./theme";
import { DEFAULT_MEAL_CONFIG } from "./mealConstants";
import { useIsMobile } from "./hooks/useIsMobile";
import { MacroRing } from "./MacroRing";
import { MealCard } from "./MealCard";
import { WeightBarChart } from "./WeightBarChart";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";
import { WeightSuggestion } from "./WeightSuggestion";
import AIMenuGenerator from "./AIMenuGenerator";
import { getAIMenuAccess } from "./lib/aiMenuService";

export function Dashboard({weightLog,addWeight,profile,setProfile,macro,getMeals,getTodayMeals,hasMealsToday,appSettings,setTab,user,getWeeklyTemplate,applyTemplate,saveWeeklyTemplate,getMealHistory,userDataLoaded,macroBanner}){if(!profile||!macro)return null;
  const mob=useIsMobile();
  const [showAIMenu,setShowAIMenu]=useState(false);
  const aiAccess=getAIMenuAccess(profile,appSettings);
  const [showWeightInput,setShowWeightInput]=useState(false);
  const weightInputRef=useRef(null);
  const [weightSaved,setWeightSaved]=useState(false);
  // Dashboard date nav
  const [dashDate,setDashDate]=useState(new Date());
  const isToday=dashDate.toDateString()===new Date().toDateString();
  // Auto-detect dayType from gymDays + today
  const gymDays=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
  const todayDayIdx=new Date().getDay();// 0=CN,1=T2...
  const todayIsGym=gymDays.includes(todayDayIdx===0?6:todayDayIdx-1);// gymDays: 0=T2,1=T3...6=CN
  const [dayType,setDayType]=useState(todayIsGym?"train":"rest");
  // Sync dayType when appSettings.gymDays loads (may load after initial render)
  useEffect(()=>{
    const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):null;}catch(e){return null;}})();
    if(!gd)return;// not loaded yet, keep default
    const idx=new Date().getDay();
    const mapped=idx===0?6:idx-1;
    const isGym=gd.includes(mapped);
    setDayType(isGym?"train":"rest");
  },[appSettings.gymDays]);
  // Auto-apply weekly template only if NO meals saved for today — không
  // dùng cờ localStorage "1 lần/ngày" nữa (từng gây kẹt), luôn check tươi
  // mỗi lần tải trang; `hasMeals` bên dưới đã tự đủ để không ghi đè dữ
  // liệu user đã có.
  useEffect(()=>{
    if(!getWeeklyTemplate||!applyTemplate||!hasMealsToday||!userDataLoaded)return;
    // Check CẢ HAI bucket train + rest: nếu BẤT KỲ bucket nào đã có bữa
    // hôm nay thì KHÔNG auto-apply (tránh ghi đè khi user vừa tạo menu AI
    // cho loại ngày KHÁC với auto-detect từ gymDays).
    if(hasMealsToday("train")||hasMealsToday("rest"))return;
    const dayKeys=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
    const todayKey=dayKeys[new Date().getDay()];
    const tpl=getWeeklyTemplate(todayKey);
    if(tpl&&tpl.meals&&tpl.meals.length>0){
      applyTemplate(tpl);
      setDayType(tpl.day_type||"train");
      console.log("✅ Auto-applied weekly template:",todayKey,tpl.day_type);
    }
  },[getWeeklyTemplate,applyTemplate,hasMealsToday,userDataLoaded]);

  // Áp dụng thực đơn AI vừa tạo: lưu thành Lịch tuần cho hôm nay (để mai
  // vẫn còn), apply vào meal_logs/daily_logs hôm nay, rồi đồng bộ dayType
  // hiển thị theo đúng template (tránh trường hợp user tạo "Ngày nghỉ"
  // trong lúc Dashboard đang ở tab "Ngày tập" — số liệu nằm đúng chỗ
  // nhưng không ai nhìn thấy ngay).
  const handleApplyAIMenu=async(tpl)=>{
    try{
      const dayKeys=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
      const todayKey=dayKeys[new Date().getDay()];
      const tplDayType=tpl.day_type||"train";
      const tplMeals=(tpl.meals||[]).map(m=>({meal_id:m.meal_id,meal_name:m.meal_name||m.meal_id,items:m.items||[],composite:!!m.composite,pattern:m.pattern||null}));
      const tplCal=Math.round((tpl.meals||[]).reduce((s,m)=>(m.items||[]).reduce((a,i)=>a+(i.cal||0),s),0));
      if(saveWeeklyTemplate)await saveWeeklyTemplate(todayKey,tplDayType,tplMeals,tplCal);
      if(applyTemplate)await applyTemplate(tpl);
      setDayType(tplDayType);
    }catch(e){console.error("Apply AI menu error:",e);}
    setShowAIMenu(false);
  };

  // Auto version check — force clear cache when admin updates app_version
  const APP_VERSION="2.6";
  useEffect(()=>{
    const serverVersion=appSettings.app_version;
    if(serverVersion){
      const localVersion=localStorage.getItem("fipilot_version");
      if(localVersion&&localVersion!==serverVersion){
        localStorage.setItem("fipilot_version",serverVersion);
        caches.keys().then(names=>Promise.all(names.map(k=>caches.delete(k)))).then(()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
          window.location.reload(true);
        });
      }else if(!localVersion){
        localStorage.setItem("fipilot_version",serverVersion);
      }
    }
  },[appSettings.app_version]);
  // Parse meal config
  const mealConfig=(()=>{if(profile.mealConfig)return profile.mealConfig;try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
  const visibleIds=mealConfig[dayType]||DEFAULT_MEAL_CONFIG[dayType];
  const allMeals=getTodayMeals(dayType);
  const meals=allMeals.filter(m=>visibleIds.includes(m.id));
  const totals=meals.reduce((acc,m)=>{const mt=m.items.reduce((a,i)=>({p:a.p+(i.p||0),c:a.c+(i.c||0),f:a.f+(i.f||0),fiber:a.fiber+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});return{p:acc.p+mt.p,c:acc.c+mt.c,f:acc.f+mt.f,fiber:acc.fiber+mt.fiber,cal:acc.cal+mt.cal};},{p:0,c:0,f:0,fiber:0,cal:0});
  const heroP=macro.protein, heroF=macro.fat, heroFiber=macro.fiber;
  const heroC=dayType==="train"?macro.carb:macro.carbRest;
  const heroCal=dayType==="train"?macro.calTarget:macro.calRest;
  const target=macro.calTarget,calPct=Math.min((heroCal/target)*100,100),goalKg=profile.goalKg,startKg=weightLog.length>0?weightLog[0].kg:profile.kg,curKg=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg,wPct=goalKg!==startKg?((curKg-startKg)/(goalKg-startKg))*100:0;
  const actualCal=Math.round(totals.cal), actualP=Math.round(totals.p), actualC=Math.round(totals.c), actualF=Math.round(totals.f), actualFiber=Math.round(totals.fiber);
  const calDiff=actualCal-heroCal, calStatus=actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"✅":actualCal<heroCal*0.95?"⚠️":"🔴";
  const calRemain=heroCal-actualCal;
  // Exercise type helpers
  const exType=profile.exerciseType||"gym";
  const exLabel=exType==="gym"?"Gym":exType==="gym_cardio"?"Gym+Cardio":exType==="cardio"?"Cardio":exType==="none"?"Nghỉ ngơi":"Tập luyện";
  const exIcon=exType==="gym"?"🏋️":exType==="gym_cardio"?"🏋️":exType==="cardio"?"🏃":exType==="none"?"😴":"🏃";
  // Greeting
  const displayName=user?.user_metadata?.username||user?.email?.split("@")[0]||"bạn";

  return <div>
    {/* Greeting Header — mobile only */}
    {mob&&<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <UserAvatar gender={profile.gender} size={48}/>
      <div style={{flex:1}}>
        <div style={{fontSize:mob?16:18,fontWeight:800,color:C.t1}}>Chào {displayName}! 👋</div>
        <div style={{fontSize:mob?13:13,fontWeight:600,color:C.t2}}>
          {dayType==="train"?"Ngày tập":"Ngày nghỉ"} • {new Date().toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})}
        </div>
      </div>
      <NotificationBell appSettings={appSettings} userId={user?.id}/>
    </div>}

    {/* Hero — White card */}
    <div style={{...card,padding:mob?"16px":"24px",border:`1.5px solid ${C.border}`}}>
      {macroBanner&&<div style={{background:"#DCFCE7",border:"1.5px solid #86EFAC",borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>🔄</span>
        <span style={{fontSize:12,fontWeight:700,color:"#14532D"}}>Macro cập nhật: {macroBanner.prev.toLocaleString()} → {macroBanner.now.toLocaleString()} cal ({macroBanner.diff>0?"+":""}{macroBanner.diff})</span>
      </div>}
      <div style={{fontSize:mob?17:18,fontWeight:600,color:C.t1,marginBottom:4}}>{dayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
        <div style={{fontSize:mob?36:44,fontWeight:900,color:C.primary,letterSpacing:"-0.03em",lineHeight:1.1}}>
          {actualCal.toLocaleString()}
        </div>
        <div style={{fontSize:mob?14:16,fontWeight:700,color:C.t3}}>/ {heroCal.toLocaleString()} kcal</div>
      </div>
      {((profile.calorieMode||"standard")==="asian"||(profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"))&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6,alignItems:"center"}}>{(profile.calorieMode||"standard")==="asian"&&<span style={{fontSize:11,fontWeight:700,color:"#007AFF",padding:"4px 10px",background:"rgba(0,122,255,0.08)",borderRadius:6,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🇻🇳 Calo chuẩn Việt Nam</span>}{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:11,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),padding:"4px 10px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)"),borderRadius:6,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}</div>}
      <div style={{marginTop:6}}>
        <span style={{fontSize:13,fontWeight:700,color:(()=>{const pp=heroCal>0?Math.round(actualCal/heroCal*100):0;return pp<95?"#B45309":pp<=105?"#16A34A":"#DC2626";})()}}>{(()=>{const pp=heroCal>0?Math.round(actualCal/heroCal*100):0;return pp<95?`⚠️ Còn thiếu ${calRemain} kcal`:pp<=105?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${Math.abs(calRemain)} kcal`;})()}</span>
      </div>
      {/* Progress bar */}
      <div style={{height:8,width:"100%",background:"#F3F4F6",borderRadius:4,marginTop:10,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(heroCal>0?(actualCal/heroCal)*100:0,120)}%`,background:"linear-gradient(90deg,#36A3FF,#007AFF,#0057FF)",borderRadius:4,transition:"width 0.4s"}}/>
      </div>
      {/* Macro rings */}
      <div style={{display:"flex",gap:mob?6:14,justifyContent:"space-around",marginTop:16}}>
        <MacroRing l="Protein" v={actualP} max={heroP} color="#007AFF" color2="#007AFF" sub={`/${heroP}g`} unit="g"/>
        <MacroRing l="Carb" v={actualC} max={heroC} color="#5AC8FA" color2="#5AC8FA" sub={`/${heroC}g`} unit="g"/>
        <MacroRing l="Fat" v={actualF} max={heroF} color="#8E8E93" color2="#8E8E93" sub={`/${heroF}g`} unit="g"/>
        <MacroRing l="Chất xơ" v={actualFiber} max={heroFiber} color="#34C759" color2="#34C759" sub={`/${heroFiber}g`} unit="g"/>
      </div>
    </div>

    {/* Stats — Clean white cards with SVG icons */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
      {[
        {l:"Chiều cao",v:profile.cm,u:"cm",icon:"stat_height"},
        {l:"Cân nặng",v:curKg,u:"kg",icon:"stat_weight"},
        {l:"BMI",v:macro.bmi,u:macro.bmi<18.5?"Gầy":macro.bmi<25?"OK":"Thừa",icon:"stat_bmi"},
        {l:exLabel,v:exType==="none"?"—":({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất chăm",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn",u:"",icon:exType==="gym"?"stat_gym":exType==="gym_cardio"?"ex_gym_cardio":exType==="cardio"?"ex_cardio":"ex_none"},
      ].map((s,i)=>(
        <div key={i} style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:11,background:"rgba(0,122,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <img src={`/icons/${s.icon}.png`} alt="" style={{width:34,height:34,objectFit:"contain"}}/>
          </div>
          <div>
            <div style={{fontSize:mob?13:12,fontWeight:700,color:C.t2}}>{s.l}</div>
            <div style={{fontSize:mob?18:18,fontWeight:800,color:C.t1}}>{s.v} <span style={{fontSize:mob?11:11,fontWeight:700,color:C.t2}}>{s.u}</span></div>
          </div>
        </div>
      ))}
    </div>

    {/* Section label: Dynamic meal label + Date Nav */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{fontSize:mob?18:24}}>{dayType==="train"?"💪":"😴"}</span>
      <span style={{fontSize:mob?18:18,fontWeight:800,color:C.t1,letterSpacing:"0.06em"}}>{dayType==="train"?"Thực đơn ngày tập":"Thực đơn ngày nghỉ"}</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)"}}/>
      <span style={{fontSize:13,fontWeight:700,color:C.secondary}}>{String(new Date().getDate()).padStart(2,"0")}/{String(new Date().getMonth()+1).padStart(2,"0")}/{new Date().getFullYear()}</span>
    </div>

    {meals.filter(m=>m.items&&m.items.length>0).map(m=><MealCard key={m.id} meal={m}/>)}

    {/* Empty state CTA — no meals logged */}
    {meals.every(m=>!m.items||m.items.length===0)&&<div style={{...card,border:"2px dashed #CDCDCD",background:"transparent",textAlign:"center",padding:"24px 16px"}}>
      <div style={{fontSize:28,marginBottom:6}}>🍽️</div>
      <div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>Chưa có bữa ăn nào hôm nay</div>
      <div style={{fontSize:12,fontWeight:600,color:C.t3,marginBottom:16}}>Nhập thức ăn để theo dõi macro hàng ngày</div>
      <button onClick={()=>setTab&&setTab("meals")} style={{...redBtn,width:"100%",maxWidth:280,margin:"0 auto",display:"block",padding:"12px",fontSize:14}}>📝 Tự nhập bữa ăn →</button>
      {aiAccess.enabled&&<>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px auto",maxWidth:280}}>
          <div style={{flex:1,height:1,background:C.border}}/>
          <span style={{fontSize:11,fontWeight:700,color:C.t3}}>HOẶC</span>
          <div style={{flex:1,height:1,background:C.border}}/>
        </div>
        {aiAccess.usable?<>
          <div style={{fontSize:12,fontWeight:600,color:C.t3,marginBottom:8}}>Chưa biết ăn gì hôm nay?</div>
          <button onClick={()=>setShowAIMenu(true)} style={{...redBtn,width:"100%",maxWidth:280,margin:"0 auto",display:"block",padding:"12px",fontSize:14,background:"linear-gradient(135deg,#7C3AED,#5B21B6)"}}>✨ Để AI tạo thực đơn cho tôi</button>
        </>:<button onClick={()=>setTab&&setTab("settings")} title="Nâng cấp Trial/Premium để mở khoá" style={{width:"100%",maxWidth:280,margin:"0 auto",display:"block",padding:"12px",fontSize:14,borderRadius:10,border:`1.5px solid ${C.border}`,background:C.surface,color:C.t2,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔒 AI tạo thực đơn — Nâng cấp để mở khoá</button>}
      </>}
    </div>}

    {/* AI Menu Generator — bottom sheet trên mobile, modal căn giữa trên PC.
        Chỉ render khi thật sự usable — chốt chặn UI thứ 2 dù nút locked
        phía trên không mở được overlay này. */}
    {showAIMenu&&aiAccess.usable&&<div onClick={()=>setShowAIMenu(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",padding:mob?0:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:mob?"100%":520,maxHeight:mob?"92vh":"88vh",overflowY:"auto",background:C.bg,borderRadius:mob?"16px 16px 0 0":16,padding:mob?"16px 12px":20}}>
        <AIMenuGenerator macro={macro} profile={profile} user={user} appSettings={appSettings} initialDayType={dayType} getMealHistory={getMealHistory} onApply={handleApplyAIMenu} onClose={()=>setShowAIMenu(false)}/>
      </div>
    </div>}

    {/* Evaluation card — same style as PC */}
    {actualCal>0&&(()=>{
      // Điểm từng chỉ số: phạt CẢ 2 chiều (thiếu lẫn dư), không đứng yên ở 85 bất kể lệch bao nhiêu như trước
      const scoreSym=(actual,target,tol=0.10)=>{if(!target||target<=0)return actual===0?0:100;if(actual<=0)return 0;const diff=Math.abs(actual/target-1);if(diff<=tol)return 100;return Math.max(0,Math.round(100-(diff-tol)*200));};
      const cs=scoreSym(actualCal,heroCal,0.10);
      const ps=scoreSym(actualP,heroP,0.10);
      const cas=scoreSym(actualC,heroC,0.15);
      const fas=scoreSym(actualF,heroF,0.15);
      const ms=actualCal===0?0:Math.round((cs+ps+cas+fas)/4);
      const msl=ms>=90?"Rất phù hợp với mục tiêu":ms>=75?"Khá tốt, cần bổ sung thêm":"Cần điều chỉnh thêm";
      const cr=heroCal-actualCal;
      // Liệt kê CỤ THỂ macro nào đang lệch nhiều, không chỉ nói mỗi calo như trước
      const macroWarnings=[];
      if(heroP>0){const r=actualP/heroP;if(r<0.85)macroWarnings.push(`thiếu đạm (${actualP}/${heroP}g)`);else if(r>1.5)macroWarnings.push(`dư khá nhiều đạm (${actualP}/${heroP}g)`);}
      if(heroC>0){const r=actualC/heroC;if(r>1.2)macroWarnings.push(`dư tinh bột (${actualC}/${heroC}g)`);else if(r<0.8)macroWarnings.push(`thiếu tinh bột (${actualC}/${heroC}g)`);}
      if(heroF>0){const r=actualF/heroF;if(r>1.2)macroWarnings.push(`dư chất béo (${actualF}/${heroF}g)`);else if(r<0.8)macroWarnings.push(`thiếu chất béo (${actualF}/${heroF}g)`);}
      return <div style={{...card,padding:"14px 16px",marginTop:6,background:"rgba(52,199,89,0.04)",border:"1.5px solid rgba(52,199,89,0.15)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div><div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><span style={{fontSize:12}}>🎯</span><span style={{fontSize:11,color:"#059669",fontWeight:600}}>Đánh giá dinh dưỡng</span></div><div style={{fontSize:28,fontWeight:900,color:"#059669",lineHeight:1}}>{ms}<span style={{fontSize:13,color:"#64748B",fontWeight:600}}> /100</span></div></div>
          <div style={{flex:1,borderLeft:"1.5px solid rgba(52,199,89,0.15)",paddingLeft:14}}><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{msl}</div><div style={{fontSize:12,color:C.t2,marginTop:3,lineHeight:1.5}}>{(cr>0?`Thiếu ${cr} cal. Thêm sữa tươi không đường (+120 cal) hoặc 30g hạt điều (+175 cal).`:cr<0?`Dư ${Math.abs(cr)} cal. Giảm bớt cơm hoặc tinh bột để cân bằng.`:"Cân đối dinh dưỡng, đủ năng lượng cho buổi tập hiệu quả.")+(macroWarnings.length>0?" Ngoài ra đang "+macroWarnings.join(", ")+".":"")}</div></div>
        </div>
      </div>;
    })()}

    {/* Weight Chart */}
    <div style={{...card,marginTop:24,borderTop:"3px solid",borderImage:"linear-gradient(90deg,#36A3FF,#007AFF,#0057FF) 1"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>📈</span><span style={{fontSize:mob?19:17,fontWeight:800,color:C.t1}}>Theo dõi cân nặng</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:C.t2}}>🎯 <span style={{color:C.secondary,fontWeight:900}}>{goalKg} kg</span></div>
          <button onClick={()=>setShowWeightInput(!showWeightInput)} style={{width:24,height:24,borderRadius:6,background:"transparent",color:C.secondary,border:`1px solid ${C.secondary}`,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>{showWeightInput?"✕":"+"}</button>
        </div>
      </div>

      {/* Quick weight input */}
      {showWeightInput&&<div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1.5px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>⚡ Nhập nhanh cân nặng</div>
            <input ref={weightInputRef} type="text" inputMode="decimal" placeholder={`VD: ${(curKg+0.3).toFixed(1)}`} style={{...inp,height:40,fontSize:15}}/>
          </div>
          <button onClick={async()=>{
            const val=parseFloat((weightInputRef.current?.value||"").replace(",","."));
            if(!val||val<30||val>200)return;
            await addWeight(val);
            setProfile({...profile,kg:val});
            if(weightInputRef.current)weightInputRef.current.value="";
            setShowWeightInput(false);
            setWeightSaved(true);setTimeout(()=>setWeightSaved(false),3000);
          }} style={{padding:"10px 16px",fontSize:13,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#15803D,#166534)",color:"#fff",cursor:"pointer",fontFamily:"inherit",height:40,marginTop:18}}>💾 Lưu</button>
        </div>
      </div>}
      {weightSaved&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:800,color:"#14532D"}}>✓ Đã lưu cân nặng!</span>
      </div>}

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"Xuất phát",v:startKg,c:C.t1},
          {l:"Hiện tại",v:curKg,c:"#4285F4"},
          {l:"Mục tiêu",v:goalKg,c:"#34A853"},
          {l:"Tiến độ",v:Math.max(0,Math.min(100,Math.round(wPct)))+"%",c:"#F4B400"},
        ].map((s,i)=><div key={i} style={{background:C.card,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:mob?11:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.t1,marginBottom:2}}>{s.l}</div>
          <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
          <div style={{fontSize:mob?12:13,fontWeight:700,color:C.t1}}>{i<3?"kg":("còn "+Math.abs(goalKg-curKg).toFixed(1)+" kg")}</div>
        </div>)}
      </div>

      {/* Bar chart */}
      {weightLog.length>=2&&<WeightBarChart weightLog={weightLog} goalKg={goalKg} goalType={profile.goalType} startKg={startKg} mob={mob}/>}
    </div>

    {/* Smart suggestions — outside chart card */}
    <WeightSuggestion weightLog={weightLog} goalKg={goalKg} goalType={profile.goalType} startKg={startKg} curKg={curKg} profile={profile} macro={macro} getMeals={getMeals} appSettings={appSettings}/>
  </div>;
}
