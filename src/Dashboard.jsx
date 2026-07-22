import { useState, useEffect, useRef } from "react";
import { C, card, inp, redBtn } from "./theme";
import { DEFAULT_MEAL_CONFIG } from "./mealConstants";
import { useIsMobile } from "./hooks/useIsMobile";
import { MacroBar } from "./MacroBar";
import { MealCard } from "./MealCard";
import { WeightBarChart } from "./WeightBarChart";
import { UserAvatar } from "./UserAvatar";
import { NotificationBell } from "./NotificationBell";
import { WeightSuggestion } from "./WeightSuggestion";
import AIMenuGenerator from "./AIMenuGenerator";
import { getAIMenuAccess } from "./lib/aiMenuService";

export function Dashboard({weightLog,addWeight,profile,setProfile,macro,getMeals,getTodayMeals,hasMealsToday,appSettings,setTab,user,getWeeklyTemplate,applyTemplate,saveWeeklyTemplate,getMealHistory,getDailyLogs,userDataLoaded,macroBanner}){if(!profile||!macro)return null;
  const mob=useIsMobile();
  const [showAIMenu,setShowAIMenu]=useState(false);
  const aiAccess=getAIMenuAccess(profile,appSettings);
  const [showWeightInput,setShowWeightInput]=useState(false);
  const weightInputRef=useRef(null);
  const [weightSaved,setWeightSaved]=useState(false);
  // Dashboard date nav
  const [dashDate,setDashDate]=useState(new Date());
  const isToday=dashDate.toDateString()===new Date().toDateString();
  // exerciseType=none → 1 dayType cố định, không phân biệt train/rest
  const isNoneExercise=(profile.exerciseType||"gym")==="none";
  // Auto-detect dayType from gymDays + today
  const gymDays=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
  const todayDayIdx=new Date().getDay();// 0=CN,1=T2...
  const todayIsGym=gymDays.includes(todayDayIdx===0?6:todayDayIdx-1);// gymDays: 0=T2,1=T3...6=CN
  const [dayType,setDayType]=useState(isNoneExercise?"rest":(todayIsGym?"train":"rest"));
  // Sync dayType when appSettings.gymDays loads (may load after initial render)
  useEffect(()=>{
    if(isNoneExercise){setDayType("rest");return;}
    const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):null;}catch(e){return null;}})();
    if(!gd)return;// not loaded yet, keep default
    const idx=new Date().getDay();
    const mapped=idx===0?6:idx-1;
    const isGym=gd.includes(mapped);
    setDayType(isGym?"train":"rest");
  },[appSettings.gymDays,isNoneExercise]);
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
  const APP_VERSION="2.7";
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
  const visibleIds=(()=>{let ids=mealConfig[dayType]||DEFAULT_MEAL_CONFIG[dayType];if(isNoneExercise)ids=ids.filter(id=>id!=="pre"&&id!=="post");return ids;})();
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
    {/* Loading skeleton — hiện shimmer khi data chưa load */}
    {!userDataLoaded&&!actualCal&&mob&&<div style={{padding:16}}>
      <style>{`@keyframes fpShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{height:80,borderRadius:14,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",marginBottom:12}}/>
      <div style={{height:120,borderRadius:14,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"0.15s",marginBottom:12}}/>
      <div style={{display:"flex",gap:8,marginBottom:12}}>
        <div style={{flex:1,height:60,borderRadius:10,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"0.3s"}}/>
        <div style={{flex:1,height:60,borderRadius:10,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"0.45s"}}/>
        <div style={{flex:1,height:60,borderRadius:10,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"0.6s"}}/>
        <div style={{flex:1,height:60,borderRadius:10,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"0.75s"}}/>
      </div>
      <div style={{height:16,width:"40%",borderRadius:6,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"0.9s",marginBottom:10}}/>
      <div style={{height:80,borderRadius:14,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"1s",marginBottom:8}}/>
      <div style={{height:80,borderRadius:14,background:"linear-gradient(90deg,#E2E8F0 25%,#F1F5F9 50%,#E2E8F0 75%)",backgroundSize:"200%",animation:"fpShimmer 1.5s infinite",animationDelay:"1.1s"}}/>
    </div>}
    {/* Greeting Header — mobile only. Gradient thương hiệu + bo góc dưới,
        đồng bộ với nút CTA (redBtn) và logo dùng cùng gradient này.
        2 hiệu ứng nhẹ, CHỈ chạy 1 lần khi mount — không lặp gây rối mắt. */}
    {mob&&<>
      <style>{`
        @keyframes hdrSlideFadeIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hdrAvatarPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.6)}50%{box-shadow:0 0 0 6px rgba(255,255,255,0)}}
        .fp-hdr{animation:hdrSlideFadeIn 0.5s ease-out}
        .fp-hdr-avt{animation:hdrAvatarPulse 1.2s ease-out 2}
      `}</style>
      <div className="fp-hdr" style={{display:"flex",alignItems:"center",gap:12,margin:"-8px -10px -40px",padding:"18px 16px 50px",backgroundImage:"url('/header-bg.webp'), linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",backgroundSize:"cover, cover",backgroundPosition:"center, center",borderRadius:0}}>
        <div className="fp-hdr-avt" style={{borderRadius:"50%"}}><UserAvatar gender={profile.gender} size={48} bg="rgba(255,255,255,0.3)" border="2px solid rgba(255,255,255,0.75)"/></div>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Chào {displayName}! 👋</div>
          <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.85)"}}>
            {isNoneExercise?"Hôm nay":dayType==="train"?"Ngày tập":"Ngày nghỉ"} • {new Date().toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div onClick={()=>setTab("settings")} style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,0.2)",border:"1.5px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </div>
          <NotificationBell appSettings={appSettings} userId={user?.id} dark/>
        </div>
      </div>
    </>}

    {/* Hero — White card. Không full-bleed — giữ nguyên padding tự nhiên
        10px của container cha ở 2 bên, giống thiết kế tham khảo (thẻ nổi
        gọn, có khoảng cách đều với mép màn hình, không tràn sát viền).
        Chỉ margin-top âm để đè lớp lên phần bo góc dưới của header. */}
    <div style={{background:C.card,borderRadius:14,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",padding:"16px 18px",margin:"-40px 0 18px",border:`1.5px solid ${C.border}`}}>
      {macroBanner&&<div style={{background:"#DCFCE7",border:"1.5px solid #86EFAC",borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>🔄</span>
        <span style={{fontSize:12,fontWeight:700,color:"#14532D"}}>Macro cập nhật: {macroBanner.prev.toLocaleString()} → {macroBanner.now.toLocaleString()} cal ({macroBanner.diff>0?"+":""}{macroBanner.diff})</span>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,paddingRight:8}}>
          <div style={{fontSize:15,fontWeight:600,color:C.t1}}>{isNoneExercise?"Tổng calo hôm nay":dayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div>
          <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:4}}>
            <div style={{fontSize:30,fontWeight:900,color:C.primary,letterSpacing:"-0.03em",lineHeight:1.1}}>{actualCal.toLocaleString()}</div>
            <div style={{fontSize:12,fontWeight:700,color:C.t3}}>/ {heroCal.toLocaleString()} kcal</div>
          </div>
          {/* Trạng thái dynamic — chuyển lên đây thế chỗ dòng cũ */}
          <div style={{marginTop:8}}>
            {(()=>{const pp=heroCal>0?Math.round(actualCal/heroCal*100):0;
              if(pp<95)return <span style={{fontSize:11,fontWeight:700,color:"#B45309",padding:"4px 9px",background:"#FEF3C7",borderRadius:6}}>⚠️ Còn thiếu {calRemain} kcal</span>;
              if(pp<=105)return <span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,color:"#16A34A",padding:"4px 9px 4px 6px",background:"#F0FDF4",borderRadius:6}}>
                <svg width={14} height={14} viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#22C55E"/><path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Ổn rồi, giữ nhé!
              </span>;
              return <span style={{fontSize:11,fontWeight:700,color:"#DC2626",padding:"4px 9px",background:"#FEE2E2",borderRadius:6}}>🔴 Dư {Math.abs(calRemain)} kcal</span>;
            })()}
          </div>
          {/* Badges VN + diet — gộp vào cột trái để không tạo khoảng trắng dưới ring */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10,alignItems:"center"}}>
            {((profile.calorieMode||"standard")==="asian")&&<span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,color:"#2563EB",padding:"4px 9px 4px 6px",background:"#EFF6FF",borderRadius:6}}>
              <svg width={16} height={11} viewBox="0 0 30 20"><rect width="30" height="20" fill="#DA251D"/><polygon points="15,4 16.76,9.35 22.39,9.35 17.82,12.65 19.58,18 15,14.7 10.42,18 12.18,12.65 7.61,9.35 13.24,9.35" fill="#FFCD00"/></svg>
              Calo chuẩn Việt Nam
            </span>}
            {profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:11,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),padding:"4px 10px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)"),borderRadius:6,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}
          </div>
        </div>
        {/* Vòng tròn % mục tiêu calo — thay illustration clipboard+lửa */}
        {(()=>{const calPct=heroCal>0?Math.min(Math.round(actualCal/heroCal*100),150):0;
          const r=38,circ=2*Math.PI*r,offset=circ-(calPct/100)*circ;
          const ringColor=calPct>115?"#F59E0B":calPct>140?"#DC2626":"#007AFF";
          return <div style={{width:130,height:130,position:"relative",flexShrink:0}}>
            <svg width={130} height={130} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="#E8EDF2" strokeWidth="6"/>
              <circle cx="50" cy="50" r={r} fill="none" stroke={ringColor} strokeWidth="6"
                strokeDasharray={circ} strokeDashoffset={Math.max(offset,0)}
                strokeLinecap="round" transform="rotate(-90 50 50)"
                style={{transition:"stroke-dashoffset 0.6s ease, stroke 0.3s"}}/>
            </svg>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <span style={{fontSize:20,lineHeight:1}}>🔥</span>
              <span style={{fontSize:18,fontWeight:600,color:ringColor,lineHeight:1,marginTop:2}}>{calPct}%</span>
              <span style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:1}}>mục tiêu</span>
            </div>
          </div>;
        })()}
      </div>
      {/* Line phân cách badges ↔ macro */}
      <div style={{height:1,background:"#F1F5F9",margin:"10px 0 0"}}/>
      {/* 4 macro — MacroBar mới (icon+số+thanh ngang), nhãn Việt hoá */}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:14}}>
        <MacroBar label="Đạm" v={actualP} max={heroP} barColor="#2563EB" icon="🥩" size={0.85}/>
        <MacroBar label="Tinh bột" v={actualC} max={heroC} barColor="#38BDF8" icon="🌾" size={0.85}/>
        <MacroBar label="Chất béo" v={actualF} max={heroF} barColor="#F59E0B" icon="💧" size={0.85}/>
        <MacroBar label="Chất xơ" v={actualFiber} max={heroFiber} barColor="#22C55E" icon="🍃" size={0.85}/>
      </div>
    </div>


    {/* Section label: Dynamic meal label + Date Nav */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,marginTop:8}}>
      <span style={{fontSize:mob?18:24}}>{isNoneExercise?"🍽️":dayType==="train"?"💪":"😴"}</span>
      <span style={{fontSize:mob?18:18,fontWeight:800,color:C.t1,letterSpacing:"0.06em"}}>{isNoneExercise?"Thực đơn hôm nay":dayType==="train"?"Thực đơn ngày tập":"Thực đơn ngày nghỉ"}</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)"}}/>
      <span style={{fontSize:13,fontWeight:700,color:C.secondary}}>{String(new Date().getDate()).padStart(2,"0")}/{String(new Date().getMonth()+1).padStart(2,"0")}/{new Date().getFullYear()}</span>
    </div>

    {meals.filter(m=>m.items&&m.items.length>0).map(m=><MealCard key={m.id} meal={m}/>)}

    {/* Empty state CTA — no meals logged */}
    {meals.every(m=>!m.items||m.items.length===0)&&<div style={{...card,border:"2px dashed #CDCDCD",background:"transparent",textAlign:"center",padding:"24px 16px"}}>
      <div style={{fontSize:28,marginBottom:6}}>🍽️</div>
      <div style={{fontSize:16,fontWeight:700,color:C.t2,marginBottom:4}}>Chưa có bữa ăn nào hôm nay</div>
      <div style={{fontSize:14,fontWeight:600,color:C.t3,marginBottom:16}}>Nhập thức ăn để theo dõi macro hàng ngày</div>
      <button onClick={()=>setTab&&setTab("meals")} style={{...redBtn,width:"100%",maxWidth:300,margin:"0 auto",display:"block"}}>📝 Tự nhập bữa ăn →</button>
      {aiAccess.enabled&&<>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px auto",maxWidth:300}}>
          <div style={{flex:1,height:1,background:C.border}}/>
          <span style={{fontSize:11,fontWeight:700,color:C.t3}}>HOẶC</span>
          <div style={{flex:1,height:1,background:C.border}}/>
        </div>
        {aiAccess.usable?<>
          <div style={{fontSize:14,fontWeight:600,color:C.t3,marginBottom:8}}>Chưa biết ăn gì hôm nay?</div>
          <button onClick={()=>setShowAIMenu(true)} style={{...redBtn,width:"100%",maxWidth:300,margin:"0 auto",display:"block",background:"linear-gradient(135deg,#7C3AED,#5B21B6)"}}>✨ Để AI tạo thực đơn cho tôi</button>
        </>:<button onClick={()=>setTab&&setTab("settings")} title="Nâng cấp Trial/Premium để mở khoá" style={{width:"100%",maxWidth:300,margin:"0 auto",display:"block",padding:"14px 16px",fontSize:15,borderRadius:14,border:`1.5px solid ${C.border}`,background:C.surface,color:C.t2,fontWeight:700,cursor:"pointer",fontFamily:"inherit",minHeight:48}}>🔒 AI tạo thực đơn — Nâng cấp để mở khoá</button>}
      </>}
    </div>}

    {/* AI Menu Generator — bottom sheet trên mobile, modal căn giữa trên PC.
        Chỉ render khi thật sự usable — chốt chặn UI thứ 2 dù nút locked
        phía trên không mở được overlay này. */}
    {showAIMenu&&aiAccess.usable&&<div onClick={()=>setShowAIMenu(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:200,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",padding:mob?0:20}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:mob?"100%":520,maxHeight:mob?"92vh":"88vh",overflowY:"auto",background:C.bg,borderRadius:mob?"16px 16px 0 0":16,padding:mob?"16px 12px":20}}>
        <AIMenuGenerator macro={macro} profile={profile} user={user} appSettings={appSettings} initialDayType={dayType} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} onApply={handleApplyAIMenu} onClose={()=>setShowAIMenu(false)}/>
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
          <div style={{flex:1,borderLeft:"1.5px solid rgba(52,199,89,0.15)",paddingLeft:14}}><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{msl}</div><div style={{fontSize:12,color:C.t2,marginTop:3,lineHeight:1.5}}>{(cr>0?`Thiếu ${cr} cal. Thêm sữa tươi không đường (+120 cal) hoặc 25g lạc rang (+142 cal).`:cr<0?`Dư ${Math.abs(cr)} cal. Giảm bớt cơm hoặc tinh bột để cân bằng.`:(isNoneExercise?"Cân đối dinh dưỡng, đủ năng lượng cho cả ngày.":"Cân đối dinh dưỡng, đủ năng lượng cho buổi tập hiệu quả."))+(macroWarnings.length>0?" Ngoài ra đang "+macroWarnings.join(", ")+".":"")}</div></div>
        </div>
      </div>;
    })()}

    {/* Stats — Clean white cards with SVG icons — đặt liền trước Weight
        Chart để tạo 1 cụm "thông tin cơ thể" thay vì tách rời như trước */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:24,marginBottom:8}}>
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

    {/* Weight Chart */}
    <div style={{...card,marginTop:8,borderTop:"3px solid",borderImage:"linear-gradient(90deg,#36A3FF,#007AFF,#0057FF) 1"}}>
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
