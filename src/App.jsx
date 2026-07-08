import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { calcMacro, defaultProfile } from "./calcMacro";
import { fmtDate } from "./fmtDate";
import { C, card, lbl, inp, redBtn } from "./theme";
import { parseFeatureFlags } from "./adminTabs/FeatureFlagsTab";
import { AdminPanel } from "./AdminPanel";
import { UserAvatar } from "./UserAvatar";
import { MacroRing } from "./MacroRing";
import { MealCard } from "./MealCard";
import { WeightBarChart } from "./WeightBarChart";
import { DEFAULT_MEAL_CONFIG } from "./mealConstants";
import { AICoachPanel } from "./AICoachPanel";
import { ReportView } from "./ReportView";
import { Dashboard } from "./Dashboard";
import { LoginScreen } from "./LoginScreen";
import { OnboardingWizard } from "./OnboardingWizard";
import { AboutPage } from "./AboutPage";
import { TermsPage } from "./TermsPage";
import { NotificationBell } from "./NotificationBell";
import { useIsMobile } from "./hooks/useIsMobile";
import { useAuth } from "./hooks/useAuth";
import { ResetPasswordScreen } from "./ResetPasswordScreen";
import { useProfile } from "./hooks/useProfile";
import { useWeightLog } from "./hooks/useWeightLog";
import { useUserData } from "./hooks/useUserData";
import { useAppSettings } from "./hooks/useAppSettings";




// App Logo — uses pinned icon image instead of emoji
const AppLogo=({size=48,radius,bg})=><img src="/icon-192.png" alt="Fipilot AI" style={{width:size,height:size,borderRadius:radius!=null?radius:size*0.22,objectFit:"cover",flexShrink:0,background:bg||"transparent"}}/>;

// User Avatar — emoji based on gender

// All 7 meals with icons and display names



// Weight Bar Chart with goal-based color logic

// Smart weight suggestion based on trend analysis + AI

// AI Coach Panel



export default function App(){
  const {user,loading,signOut,isPasswordRecovery}=useAuth();
  useEffect(()=>{
    if(!user?.id)return;
    const ping=async()=>{try{await supabase.rpc("record_user_activity");}catch(e){console.error("record_user_activity error:",e);}};
    ping(); // gọi ngay lúc mount/đăng nhập
    const interval=setInterval(ping,5*60*1000); // rồi lặp lại mỗi 5 phút khi app còn mở
    return ()=>clearInterval(interval);
  },[user?.id]);
  const [tab,setTab]=useState(()=>{try{return localStorage.getItem("fitpilot_tab")||"dashboard";}catch(e){return "dashboard";}});
  const [adminGrpOpen,setAdminGrpOpen]=useState({all:false});
  const [settingsGrpOpen,setSettingsGrpOpen]=useState(false);
  useEffect(()=>{try{localStorage.setItem("fitpilot_tab",tab);}catch(e){}},[tab]);
  const [pcShowWeightInput,setPcShowWeightInput]=useState(false);
  const pcWeightInputRef=useRef(null);
  const [pcWeightSaved,setPcWeightSaved]=useState(false);
  const [pcDayManual,setPcDayManual]=useState(null);
  const [showAICoach,setShowAICoach]=useState(false);
  const [aiFabHidden,setAiFabHidden]=useState(false);
  const scrollHideTimerRef=useRef(null);
  useEffect(()=>{
    const handleScroll=()=>{
      setAiFabHidden(true);
      if(scrollHideTimerRef.current)clearTimeout(scrollHideTimerRef.current);
      scrollHideTimerRef.current=setTimeout(()=>setAiFabHidden(false),400);
    };
    window.addEventListener("scroll",handleScroll,{passive:true});
    return()=>{window.removeEventListener("scroll",handleScroll);if(scrollHideTimerRef.current)clearTimeout(scrollHideTimerRef.current);};
  },[]);
  const {profile,setProfile,loading:profileLoading}=useProfile(user?.id,loading);
  const {weightLog,addWeight,deleteWeight,resetWeights,setWeightLog,loading:weightLoading}=useWeightLog(user?.id,loading);
  const {loaded:userDataLoaded,meals:cloudMeals,getMeals,getMealHistory,foodCache,saveMealToCloud,saveFoodCache,deleteFoodCache,weeklyTemplates,saveWeeklyTemplate,deleteWeeklyTemplate,getWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,refreshDefaultTemplates,weeklyBundles,saveWeeklyBundle,deleteWeeklyBundle,refreshWeeklyBundles,applyTemplate,saveDailyLog,getDailyLogs,getDailyLog}=useUserData(user?.id);
  const {settings:appSettings,isAdmin,saveSetting}=useAppSettings(user?.id);
  const flags=parseFeatureFlags(appSettings);
  const macro=calcMacro(profile||defaultProfile);
  const [macroBanner,setMacroBanner]=useState(null);
  const prevCalRef=useRef(null);
  const [profileUserEdited,setProfileUserEdited]=useState(false);
  const origSetProfile=setProfile;
  const wrappedSetProfile=useCallback((p)=>{setProfileUserEdited(true);origSetProfile(p);},[origSetProfile]);
  useEffect(()=>{
    if(!macro||!macro.calTarget)return;
    if(prevCalRef.current!==null&&profileUserEdited&&Math.abs(macro.calTarget-prevCalRef.current)>10){
      setMacroBanner({prev:prevCalRef.current,now:macro.calTarget,diff:macro.calTarget-prevCalRef.current});
      setProfileUserEdited(false);
      setTimeout(()=>setMacroBanner(null),5000);
    }
    prevCalRef.current=macro.calTarget;
  },[macro?.calTarget,profileUserEdited]);
  const mob=useIsMobile();
  // Auto-detect PC day type from gym schedule (computed, not state)
  const pcDayAuto=(()=>{
    if(!appSettings||!profile)return"train";
    const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
    const todayIdx=new Date().getDay();
    const mappedIdx=todayIdx===0?6:todayIdx-1;
    return gd.includes(mappedIdx)?"train":"rest";
  })();
  const pcDayType=pcDayManual||pcDayAuto;

  // Auto-apply Lịch tuần cho PC — Dashboard.jsx đã có sẵn bản này nhưng CHỈ
  // chạy khi mob===true (PC dùng layout JSX riêng bên dưới, không qua
  // <Dashboard>) nên PC chưa bao giờ có tính năng này. Thêm bản riêng ở đây.
  //
  // KHÔNG dùng cờ localStorage "chỉ check 1 lần/ngày" nữa — cờ đó từng gây
  // kẹt: nếu lần check ĐẦU TIÊN trong ngày chưa có Lịch tuần (chưa kịp tạo),
  // cờ vẫn bị set, khiến các lần tải trang SAU ĐÓ trong cùng ngày (dù data
  // đã có) không bao giờ check lại. `hasMeals` bên dưới đã tự đủ để tránh
  // ghi đè dữ liệu user đã có — không cần thêm lớp cache nào khác, luôn
  // check tươi mỗi lần tải trang cho chắc ăn.
  useEffect(()=>{
    if(!getWeeklyTemplate||!applyTemplate||!getMeals||!userDataLoaded)return;
    const currentMeals=getMeals(pcDayType);
    const hasMeals=currentMeals.some(m=>m.items&&m.items.length>0);
    if(hasMeals)return;
    const dayKeys=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
    const todayKey=dayKeys[new Date().getDay()];
    const tpl=getWeeklyTemplate(todayKey);
    if(tpl&&tpl.meals&&tpl.meals.length>0){
      applyTemplate(tpl);
      setPcDayManual(tpl.day_type||"train");
      console.log("✅ Auto-applied weekly template (PC):",todayKey,tpl.day_type);
    }
  },[getWeeklyTemplate,applyTemplate,getMeals,userDataLoaded]);

  if(loading||profileLoading||!profile) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Inter,sans-serif",fontSize:16,color:"#666"}}>⏳ Đang tải...</div>;
  if(isPasswordRecovery) return <ResetPasswordScreen/>;
  if(!user) return <LoginScreen onLogin={()=>window.location.reload()} appSettings={appSettings}/>;
  if(profile.isLocked) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Inter,sans-serif",padding:20}}>
    <div style={{width:"100%",maxWidth:380}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <img src="/logo.png" alt="Fipilot AI" style={{width:64,height:64,borderRadius:14,objectFit:"cover"}}/>
        <div style={{fontSize:20,fontWeight:900,color:C.t1,marginTop:10,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
        <div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:2}}>AI Nutrition Coach</div>
      </div>
      <div style={{...card,textAlign:"center",padding:"32px 24px"}}>
        <div style={{fontSize:40,marginBottom:12}}>🔒</div>
        <div style={{fontSize:18,fontWeight:800,color:C.t1,marginBottom:8}}>Tài khoản đã bị khóa</div>
        <div style={{fontSize:14,color:C.t2,marginBottom:20,lineHeight:1.5}}>Tài khoản của bạn đã bị Admin tạm khóa. Liên hệ hỗ trợ nếu bạn cho rằng đây là nhầm lẫn.</div>
        <button onClick={signOut} style={redBtn}>Đăng xuất</button>
      </div>
    </div>
  </div>;

  // Onboarding: chỉ hiện cho user mới chưa có data thật (chờ data load xong)
  const needsOnboarding=userDataLoaded && !profileLoading && !weightLoading && !profile.onboardingDone && (!weightLog || weightLog.length===0);
  if(needsOnboarding) return <OnboardingWizard profile={profile} setProfile={wrappedSetProfile} onComplete={()=>setTab("dashboard")}/>;

  // === PC DATA COMPUTATION ===
  const pcMC=(()=>{if(profile.mealConfig)return profile.mealConfig;try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
  const pcVis=pcMC[pcDayType]||DEFAULT_MEAL_CONFIG[pcDayType];
  const pcMeals=getMeals(pcDayType).filter(m=>pcVis.includes(m.id));
  const pcTot=pcMeals.reduce((a,m)=>{const t=m.items.reduce((s,i)=>({p:s.p+(i.p||0),c:s.c+(i.c||0),f:s.f+(i.f||0),fiber:s.fiber+(i.fiber||0),cal:s.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});return{p:a.p+t.p,c:a.c+t.c,f:a.f+t.f,fiber:a.fiber+t.fiber,cal:a.cal+t.cal};},{p:0,c:0,f:0,fiber:0,cal:0});
  const pcHP=macro.protein,pcHF=macro.fat,pcHFib=macro.fiber,pcHC=pcDayType==="train"?macro.carb:macro.carbRest,pcHCal=pcDayType==="train"?macro.calTarget:macro.calRest;
  const pcGK=profile.goalKg,pcSK=weightLog.length>0?weightLog[0].kg:profile.kg,pcCK=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg;
  const pcWP=pcGK!==pcSK?((pcCK-pcSK)/(pcGK-pcSK))*100:0;
  const pcAC=Math.round(pcTot.cal),pcAP=Math.round(pcTot.p),pcACb=Math.round(pcTot.c),pcAF=Math.round(pcTot.f),pcAFib=Math.round(pcTot.fiber);
  const pcCR=pcHCal-pcAC,pcDN=user?.user_metadata?.username||user?.email?.split("@")[0]||"bạn";
  const pcET=profile.exerciseType||"gym",pcEL=pcET==="gym"?"Gym":pcET==="gym_cardio"?"Gym+Cardio":pcET==="cardio"?"Cardio":"Nghỉ ngơi";
  // Điểm từng chỉ số: phạt CẢ 2 chiều (thiếu lẫn dư), không đứng yên ở 85 bất kể lệch bao nhiêu như trước
  const pcScoreSym=(actual,target,tol=0.10)=>{if(!target||target<=0)return actual===0?0:100;if(actual<=0)return 0;const diff=Math.abs(actual/target-1);if(diff<=tol)return 100;return Math.max(0,Math.round(100-(diff-tol)*200));};
  const pcCS=pcScoreSym(pcAC,pcHCal,0.10);
  const pcPS=pcScoreSym(pcAP,pcHP,0.10);
  const pcCaS=pcScoreSym(pcACb,pcHC,0.15);
  const pcFaS=pcScoreSym(pcAF,pcHF,0.15);
  const pcMS=pcAC===0?0:Math.round((pcCS+pcPS+pcCaS+pcFaS)/4);
  const pcMSL=pcMS>=90?"Rất phù hợp với mục tiêu":pcMS>=75?"Khá tốt, cần bổ sung thêm":"Cần điều chỉnh thêm";
  // Liệt kê CỤ THỂ macro nào đang lệch nhiều, không chỉ nói mỗi calo như trước
  const pcMacroWarnings=(()=>{
    const w=[];
    if(pcHP>0){const r=pcAP/pcHP;if(r<0.85)w.push(`thiếu đạm (${pcAP}/${pcHP}g)`);else if(r>1.5)w.push(`dư khá nhiều đạm (${pcAP}/${pcHP}g)`);}
    if(pcHC>0){const r=pcACb/pcHC;if(r>1.2)w.push(`dư tinh bột (${pcACb}/${pcHC}g)`);else if(r<0.8)w.push(`thiếu tinh bột (${pcACb}/${pcHC}g)`);}
    if(pcHF>0){const r=pcAF/pcHF;if(r>1.2)w.push(`dư chất béo (${pcAF}/${pcHF}g)`);else if(r<0.8)w.push(`thiếu chất béo (${pcAF}/${pcHF}g)`);}
    return w;
  })();
  const pcNavI=(id,a,sz)=>{const c=a?"#007AFF":"#64748B";const size=sz||20;return{dashboard:<svg viewBox="0 0 96 96" width={size} height={size}><rect x="6" y="6" width="38" height="38" rx="10" fill={c}/><rect x="52" y="6" width="38" height="38" rx="10" fill={c}/><rect x="6" y="50" width="38" height="32" rx="10" fill={c}/><rect x="52" y="50" width="38" height="32" rx="10" fill={c}/><rect x="6" y="86" width="84" height="8" rx="4" fill={c}/></svg>,profile:<svg viewBox="0 0 96 96" width={size} height={size}><circle cx="48" cy="30" r="24" fill={c}/><path d="M4 96 C4 60 92 60 92 96 Z" fill={c}/></svg>,meals:<svg viewBox="0 0 96 96" width={size} height={size}><rect x="6" y="6" width="84" height="84" rx="14" fill={c}/><circle cx="22" cy="30" r="6" fill="white" opacity="0.9"/><rect x="36" y="25" width="46" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="52" r="6" fill="white" opacity="0.9"/><rect x="36" y="47" width="36" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="74" r="6" fill="white" opacity="0.9"/><rect x="36" y="69" width="40" height="10" rx="5" fill="white" opacity="0.9"/></svg>,report:<svg viewBox="0 0 96 96" width={size} height={size}><rect x="8" y="56" width="22" height="32" rx="5" fill={c}/><rect x="37" y="36" width="22" height="52" rx="5" fill={c}/><rect x="66" y="16" width="22" height="72" rx="5" fill={c}/><rect x="4" y="90" width="88" height="6" rx="3" fill={c}/></svg>,weight:<svg viewBox="0 0 96 96" width={size} height={size}><rect x="8" y="78" width="80" height="10" rx="5" fill={c}/><rect x="44" y="28" width="8" height="52" rx="4" fill={c}/><rect x="12" y="24" width="72" height="8" rx="4" fill={c}/><rect x="22" y="24" width="4" height="18" rx="2" fill={c}/><rect x="70" y="24" width="4" height="18" rx="2" fill={c}/><rect x="10" y="40" width="28" height="8" rx="4" fill={c}/><rect x="58" y="40" width="28" height="8" rx="4" fill={c}/><circle cx="48" cy="16" r="8" fill={c}/></svg>,settings:<svg viewBox="0 0 96 96" width={size} height={size}><path d="M44 4 L52 4 L54 14 C57 15 60 17 63 19 L72 14 L78 20 L73 29 C75 32 77 35 78 38 L88 40 L88 48 L78 50 C77 53 75 56 73 59 L78 68 L72 74 L63 69 C60 71 57 73 54 74 L52 84 L44 84 L42 74 C39 73 36 71 33 69 L24 74 L18 68 L23 59 C21 56 19 53 18 50 L8 48 L8 40 L18 38 C19 35 21 32 23 29 L18 20 L24 14 L33 19 C36 17 39 15 42 14 Z" fill={c}/><circle cx="48" cy="44" r="15" fill="white" opacity="0.92"/><circle cx="48" cy="44" r="8" fill={c}/></svg>}[id]||null;};
  const pcDt=new Date(),pcDS=`${["CN","T2","T3","T4","T5","T6","T7"][pcDt.getDay()]}, ${String(pcDt.getDate()).padStart(2,"0")}/${String(pcDt.getMonth()+1).padStart(2,"0")}/${pcDt.getFullYear()}`;
  const adminP={weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile:wrappedSetProfile,macro,saveMealToCloud,saveFoodCache,deleteFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting,weeklyTemplates,saveWeeklyTemplate,getWeeklyTemplate,deleteWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,applyTemplate,refreshDefaultTemplates,weeklyBundles,saveWeeklyBundle,deleteWeeklyBundle,refreshWeeklyBundles,user};

  // Mobile today data for AI Coach (same logic as Dashboard)
  const mobTodayDayIdx=new Date().getDay();
  const mobGymDayIdx=mobTodayDayIdx===0?6:mobTodayDayIdx-1;
  const mobDayType=(profile?.gymDays||[]).includes(mobGymDayIdx)?"train":"rest";
  const mobTodayData=(()=>{
    if(!getMeals)return{cal:0,p:0,c:0,f:0,dayType:mobDayType};
    try{
      const mc=(()=>{try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
      const ids=mc[mobDayType]||DEFAULT_MEAL_CONFIG[mobDayType];
      const ms=getMeals(mobDayType).filter(m=>ids.includes(m.id));
      const t=ms.reduce((a,m)=>{const mt=m.items.reduce((a2,i)=>({p:a2.p+(i.p||0),c:a2.c+(i.c||0),f:a2.f+(i.f||0),cal:a2.cal+(i.cal||0)}),{p:0,c:0,f:0,cal:0});return{p:a.p+mt.p,c:a.c+mt.c,f:a.f+mt.f,cal:a.cal+mt.cal};},{p:0,c:0,f:0,cal:0});
      return{cal:Math.round(t.cal),p:Math.round(t.p),c:Math.round(t.c),f:Math.round(t.f),dayType:mobDayType};
    }catch(e){return{cal:0,p:0,c:0,f:0,dayType:mobDayType};}
  })();

  // ========== MOBILE ==========
  if(mob) return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",padding:"0 10px 10px 10px",maxWidth:700,margin:"0 auto",overflowX:"hidden",width:"100%",boxSizing:"border-box"}}>
    <div style={{paddingTop:"calc(env(safe-area-inset-top, 8px) + 8px)",paddingBottom:100}}>
    {tab==="dashboard"&&<Dashboard weightLog={weightLog} addWeight={addWeight} profile={profile} setProfile={wrappedSetProfile} macro={macro} getMeals={getMeals} appSettings={appSettings} setTab={setTab} user={user} getWeeklyTemplate={getWeeklyTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates} userDataLoaded={userDataLoaded} macroBanner={macroBanner}/>}
    {tab==="weight"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings" initialSection="weight" weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates} weeklyBundles={weeklyBundles} saveWeeklyBundle={saveWeeklyBundle} deleteWeeklyBundle={deleteWeeklyBundle} refreshWeeklyBundles={refreshWeeklyBundles}/>}
    {tab==="meals"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="meals" user={user} weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} deleteWeeklyTemplate={deleteWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates} weeklyBundles={weeklyBundles} saveWeeklyBundle={saveWeeklyBundle} deleteWeeklyBundle={deleteWeeklyBundle} refreshWeeklyBundles={refreshWeeklyBundles}/>}
    {tab==="report"&&<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={mob}/>}
    {tab==="settings"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings" signOut={signOut} user={user} weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates} weeklyBundles={weeklyBundles} saveWeeklyBundle={saveWeeklyBundle} deleteWeeklyBundle={deleteWeeklyBundle} refreshWeeklyBundles={refreshWeeklyBundles}/>}
    <svg width="0" height="0" style={{position:"absolute"}}><defs><linearGradient id="navG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs></svg>
    {/* AI Coach FAB — only on dashboard */}
    <style>{`@keyframes fabRedGlow{0%,100%{box-shadow:0 4px 14px rgba(0,122,255,0.4),0 0 0 0 rgba(239,68,68,0.35);}50%{box-shadow:0 4px 14px rgba(0,122,255,0.4),0 0 0 8px rgba(239,68,68,0);}}`}</style>
    {flags.ai_chat&&!showAICoach&&<div onClick={()=>setShowAICoach(true)} style={{position:"fixed",bottom:100,right:14,width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#36A3FF,#007AFF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",zIndex:98,cursor:"pointer",transition:"opacity 0.25s ease, transform 0.25s ease",opacity:aiFabHidden?0:1,transform:aiFabHidden?"translateY(20px) scale(0.85)":"translateY(0) scale(1)",pointerEvents:aiFabHidden?"none":"auto",animation:aiFabHidden?"none":"fabRedGlow 2s ease-in-out infinite"}}><span style={{fontSize:20}}>✨</span><span style={{fontSize:7,fontWeight:800,letterSpacing:"0.3px",opacity:0.9,marginTop:1}}>Fipilot AI</span></div>}
    {flags.ai_chat&&showAICoach&&<AICoachPanel profile={profile} macro={macro} weightLog={weightLog} todayData={mobTodayData} mob={true} onClose={()=>setShowAICoach(false)} appSettings={appSettings} isAdmin={isAdmin} getMeals={getMeals} getWeeklyTemplate={getWeeklyTemplate} foodCache={foodCache} userId={user?.id}/>}
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:99,background:"rgba(255,255,255,0.97)",borderTop:"0.5px solid rgba(0,0,0,0.12)",display:"flex",paddingTop:6,paddingBottom:"max(18px, env(safe-area-inset-bottom, 18px))"}}>
      {[{id:"dashboard",label:"Tổng quan",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="6" y="6" width="38" height="38" rx="10" fill={c}/><rect x="52" y="6" width="38" height="38" rx="10" fill={c}/><rect x="6" y="50" width="38" height="32" rx="10" fill={c}/><rect x="52" y="50" width="38" height="32" rx="10" fill={c}/><rect x="6" y="86" width="84" height="8" rx="4" fill={c}/></svg>},{id:"meals",label:"Bữa ăn",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="6" y="6" width="84" height="84" rx="14" fill={c}/><circle cx="22" cy="30" r="6" fill="white" opacity="0.9"/><rect x="36" y="25" width="46" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="52" r="6" fill="white" opacity="0.9"/><rect x="36" y="47" width="36" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="74" r="6" fill="white" opacity="0.9"/><rect x="36" y="69" width="40" height="10" rx="5" fill="white" opacity="0.9"/></svg>},{id:"weight",label:"Cân nặng",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="8" y="78" width="80" height="10" rx="5" fill={c}/><rect x="44" y="28" width="8" height="52" rx="4" fill={c}/><rect x="12" y="24" width="72" height="8" rx="4" fill={c}/><rect x="22" y="24" width="4" height="18" rx="2" fill={c}/><rect x="70" y="24" width="4" height="18" rx="2" fill={c}/><rect x="10" y="40" width="28" height="8" rx="4" fill={c}/><rect x="58" y="40" width="28" height="8" rx="4" fill={c}/><circle cx="48" cy="16" r="8" fill={c}/></svg>},{id:"report",label:"Báo cáo",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="8" y="56" width="22" height="32" rx="5" fill={c}/><rect x="37" y="36" width="22" height="52" rx="5" fill={c}/><rect x="66" y="16" width="22" height="72" rx="5" fill={c}/><rect x="4" y="90" width="88" height="6" rx="3" fill={c}/></svg>},{id:"settings",label:"Cài đặt",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><path d="M44 4 L52 4 L54 14 C57 15 60 17 63 19 L72 14 L78 20 L73 29 C75 32 77 35 78 38 L88 40 L88 48 L78 50 C77 53 75 56 73 59 L78 68 L72 74 L63 69 C60 71 57 73 54 74 L52 84 L44 84 L42 74 C39 73 36 71 33 69 L24 74 L18 68 L23 59 C21 56 19 53 18 50 L8 48 L8 40 L18 38 C19 35 21 32 23 29 L18 20 L24 14 L33 19 C36 17 39 15 42 14 Z" fill={c}/><circle cx="48" cy="44" r="15" fill="white" opacity="0.92"/><circle cx="48" cy="44" r="8" fill={c}/></svg>}].map(t=>{const a=tab===t.id;return <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"6px 0"}}>{t.svg(a?"url(#navG)":"#A0A0A0")}<span style={{fontSize:10,fontWeight:a?700:500,color:a?"#007AFF":"#8E8E93"}}>{t.label}</span></div>;})}
    </div>
    </div>
  </div>;

  // ========== PC LAYOUT ==========
  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",display:"flex",minHeight:"100vh",background:C.bg,color:C.t1}}>
    {/* SIDEBAR */}
    <nav style={{width:220,background:"#fff",borderRight:`1px solid ${C.border}`,position:"fixed",top:0,left:0,bottom:0,zIndex:10,display:"flex",flexDirection:"column",padding:"20px 0",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 20px",marginBottom:24}}><AppLogo size={40} radius={12}/><div><div style={{fontWeight:800,fontSize:15,color:C.t1}}>FipilotAI</div><div style={{fontSize:10,color:C.primary,fontWeight:600,letterSpacing:"0.3px",marginTop:1}}>AI Nutrition Coach</div></div></div>
      <div style={{fontSize:12,fontWeight:800,color:"#64748B",padding:"0 20px",margin:"16px 0 6px",letterSpacing:"0.8px"}}>MENU</div>
      {[{id:"dashboard",l:"Tổng quan",ic:"dashboard"},{id:"meals",l:"Bữa ăn",ic:"meals"},{id:"weight",l:"Cân nặng",ic:"weight"},{id:"report",l:"Báo cáo",ic:"report"}].map(s=><div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:tab===s.id?700:500,color:tab===s.id?C.primary:C.t2,background:tab===s.id?"rgba(0,122,255,0.06)":"transparent",borderLeft:tab===s.id?`3px solid ${C.primary}`:"3px solid transparent"}}>{pcNavI(s.ic,tab===s.id,19)} {s.l}</div>)}
      {(()=>{
        const items=[
          {id:"profile_s",l:"Hồ sơ",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="sip" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><circle cx="48" cy="30" r="22" fill="url(#sip)"/><path d="M8 90 C8 62 88 62 88 90 Z" fill="url(#sip)"/></svg>},
          ...(isAdmin?[{id:"ai",l:"Kết nối AI",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="si1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><rect x="28" y="28" width="40" height="40" rx="8" fill="url(#si1)"/><rect x="36" y="36" width="24" height="24" rx="4" fill="white" opacity="0.2"/><rect x="14" y="36" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="14" y="46" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="14" y="56" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="68" y="36" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="68" y="46" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="68" y="56" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="36" y="14" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="46" y="14" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="56" y="14" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="36" y="68" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="46" y="68" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="56" y="68" width="5" height="14" rx="2.5" fill="url(#si1)"/></svg>}]:[]),
          {id:"about",l:"Giới thiệu",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="si4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#si4)"/><rect x="44" y="42" width="8" height="28" rx="4" fill="white"/><circle cx="48" cy="30" r="6" fill="white"/></svg>},
          {id:"terms",l:"Điều khoản",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="si6" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><rect x="18" y="6" width="60" height="84" rx="8" fill="url(#si6)"/><rect x="30" y="24" width="36" height="6" rx="3" fill="white" opacity="0.85"/><rect x="30" y="40" width="36" height="6" rx="3" fill="white" opacity="0.6"/><rect x="30" y="56" width="24" height="6" rx="3" fill="white" opacity="0.4"/></svg>},
          {id:"account",l:"Tài khoản",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="si5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><rect x="4" y="16" width="88" height="64" rx="12" fill="url(#si5)"/><circle cx="28" cy="42" r="16" fill="white" opacity="0.95"/><circle cx="28" cy="37" r="7" fill="url(#si5)"/><path d="M14 54 C14 46 42 46 42 54" fill="url(#si5)"/><rect x="52" y="34" width="32" height="7" rx="3.5" fill="white" opacity="0.9"/><rect x="52" y="46" width="24" height="6" rx="3" fill="white" opacity="0.5"/><rect x="52" y="57" width="18" height="5" rx="2.5" fill="white" opacity="0.3"/></svg>},
        ];

        // User thường: luôn hiện mở, không thu gọn (giữ y hệt hành vi cũ)
        if(!isAdmin){
          return <>
            <div style={{fontSize:12,fontWeight:800,color:"#64748B",padding:"0 20px",margin:"16px 0 6px",letterSpacing:"0.8px"}}>CÀI ĐẶT</div>
            {items.map(s=>{const a=tab===s.id;return <div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 20px",cursor:"pointer",fontSize:14,fontWeight:a?700:500,color:a?C.primary:C.t2,background:a?"rgba(0,122,255,0.06)":"transparent",borderLeft:a?`3px solid ${C.primary}`:"3px solid transparent"}}>{s.svg(a)} {s.l}</div>;})}
          </>;
        }

        // Admin: thu gọn giống nhóm QUẢN TRỊ
        const open=settingsGrpOpen;
        return <div style={{marginTop:16}}>
          <div onClick={()=>setSettingsGrpOpen(v=>!v)} style={{display:"flex",alignItems:"center",gap:8,padding:"0 20px 6px",cursor:"pointer",userSelect:"none"}}>
            <svg width={14} height={14} viewBox="0 0 24 24" style={{flexShrink:0}}><path d="M4 20 L4 6 C4 4.9 4.9 4 6 4 L10 4 L12 7 L18 7 C19.1 7 20 7.9 20 9 L20 18 C20 19.1 19.1 20 18 20 Z" fill="none" stroke="#64748B" strokeWidth={2}/></svg>
            <span style={{fontSize:12,fontWeight:800,color:"#64748B",letterSpacing:"0.8px",flex:1}}>CÀI ĐẶT</span>
            <svg width={12} height={12} viewBox="0 0 24 24" style={{transform:open?"rotate(0deg)":"rotate(-90deg)",transition:"transform .15s"}}><path d="M6 9l6 6 6-6" stroke="#64748B" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          {open&&items.map(s=>{const a=tab===s.id;return <div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 20px 8px 34px",cursor:"pointer",fontSize:13,fontWeight:a?700:500,color:a?C.primary:C.t2,background:a?"rgba(0,122,255,0.06)":"transparent",borderLeft:a?`3px solid ${C.primary}`:"3px solid transparent"}}>{s.svg(a)} {s.l}</div>;})}
        </div>;
      })()}
      {isAdmin&&(()=>{
        const items=[
          {id:"admin_s",l:"Quản lý version",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="4" y="10" width="88" height="76" rx="14" fill="url(#qi1)"/><rect x="4" y="10" width="88" height="24" rx="14" fill="white" opacity="0.12"/><circle cx="22" cy="22" r="5" fill="white" opacity="0.6"/><circle cx="36" cy="22" r="5" fill="white" opacity="0.4"/><circle cx="50" cy="22" r="5" fill="white" opacity="0.25"/><polyline points="18,52 32,62 18,72" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><rect x="38" y="67" width="40" height="7" rx="3.5" fill="white" opacity="0.65"/></svg>},
          {id:"templates_s",l:"Kho mẫu",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi2" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="12" y="70" width="72" height="16" rx="8" fill="url(#qi2)" opacity="0.45"/><rect x="16" y="52" width="64" height="16" rx="8" fill="url(#qi2)" opacity="0.7"/><rect x="20" y="34" width="56" height="16" rx="8" fill="url(#qi2)"/><rect x="28" y="34" width="6" height="16" rx="3" fill="white" opacity="0.3"/><rect x="32" y="52" width="6" height="16" rx="3" fill="white" opacity="0.3"/><polygon points="48,6 51,18 64,18 54,25 58,37 48,30 38,37 42,25 32,18 45,18" fill="url(#qi2)"/></svg>},
          {id:"weekly_bundles_s",l:"Gói tuần",svg:(a)=><span style={{fontSize:17}}>🗓️</span>},
          {id:"users_s",l:"Quản lý User",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><circle cx="34" cy="34" r="18" fill="url(#qi4)"/><path d="M8 88 C8 58 60 58 60 88 Z" fill="url(#qi4)"/><circle cx="70" cy="40" r="13" fill="url(#qi4)" opacity="0.6"/><path d="M52 88 C52 66 88 66 88 88 Z" fill="url(#qi4)" opacity="0.6"/></svg>},
          {id:"orders_s",l:"Duyệt đơn hàng",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="18" y="10" width="60" height="76" rx="10" fill="url(#qi5)"/><rect x="28" y="26" width="40" height="6" rx="3" fill="white" opacity="0.8"/><rect x="28" y="40" width="40" height="6" rx="3" fill="white" opacity="0.5"/><circle cx="62" cy="66" r="16" fill="white"/><path d="M55 66 L60 71 L70 60" fill="none" stroke="url(#qi5)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {id:"food_cache_pending_s",l:"Kho món",svg:(a)=><span style={{fontSize:17}}>🗂️</span>},
          {id:"subscription_settings_s",l:"Gói cước",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi3" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#qi3)"/><path d="M48 22 L54 42 L74 42 L58 54 L64 74 L48 62 L32 74 L38 54 L22 42 L42 42 Z" fill="white" opacity="0.9"/></svg>},
          {id:"report_biz_s",l:"Báo cáo kinh doanh",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi6" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="10" y="10" width="76" height="76" rx="12" fill="url(#qi6)"/><rect x="24" y="52" width="10" height="24" rx="3" fill="white"/><rect x="43" y="38" width="10" height="38" rx="3" fill="white" opacity="0.85"/><rect x="62" y="26" width="10" height="50" rx="3" fill="white" opacity="0.7"/></svg>},
          {id:"error_logs_s",l:"Lỗi hệ thống",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi7" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#qi7)"/><rect x="43" y="26" width="10" height="34" rx="5" fill="white"/><circle cx="48" cy="70" r="6" fill="white"/></svg>},
          {id:"audit_log_s",l:"Nhật ký hoạt động",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi8" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="14" y="8" width="68" height="80" rx="10" fill="url(#qi8)"/><rect x="26" y="26" width="44" height="6" rx="3" fill="white" opacity="0.85"/><rect x="26" y="42" width="44" height="6" rx="3" fill="white" opacity="0.6"/><rect x="26" y="58" width="30" height="6" rx="3" fill="white" opacity="0.4"/></svg>},
          {id:"notify_s",l:"Gửi thông báo",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi9" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><path d="M48 8 C56 8 62 15 62 24 L62 44 L70 56 L26 56 L34 44 L34 24 C34 15 40 8 48 8 Z" fill="url(#qi9)"/><circle cx="48" cy="70" r="8" fill="url(#qi9)"/></svg>},
          {id:"feature_flags_s",l:"Quản lý tính năng",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi10" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="14" y="14" width="68" height="20" rx="10" fill="url(#qi10)"/><circle cx="66" cy="24" r="7" fill="white"/><rect x="14" y="42" width="68" height="20" rx="10" fill="url(#qi10)" opacity="0.6"/><circle cx="30" cy="52" r="7" fill="white"/><rect x="14" y="70" width="68" height="20" rx="10" fill="url(#qi10)"/><circle cx="66" cy="80" r="7" fill="white"/></svg>},
          {id:"system_health_s",l:"Tổng quan hệ thống",svg:(a)=><svg viewBox="0 0 96 96" width={17} height={17}><defs><linearGradient id="qi11" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#qi11)"/><path d="M28 50 L38 50 L44 34 L54 62 L60 50 L70 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></svg>},
        ];
        const open=adminGrpOpen.all;
        return <div style={{marginTop:16}}>
          <div onClick={()=>setAdminGrpOpen(p=>({...p,all:!p.all}))} style={{display:"flex",alignItems:"center",gap:8,padding:"0 20px 6px",cursor:"pointer",userSelect:"none"}}>
            <svg width={15} height={15} viewBox="0 0 24 24" style={{flexShrink:0}}><path d="M4 20 L4 6 C4 4.9 4.9 4 6 4 L10 4 L12 7 L18 7 C19.1 7 20 7.9 20 9 L20 18 C20 19.1 19.1 20 18 20 Z" fill="none" stroke="#EF4444" strokeWidth={2}/></svg>
            <span style={{fontSize:12,fontWeight:800,color:"#EF4444",letterSpacing:"0.8px",flex:1}}>QUẢN TRỊ</span>
            <svg width={12} height={12} viewBox="0 0 24 24" style={{transform:open?"rotate(0deg)":"rotate(-90deg)",transition:"transform .15s"}}><path d="M6 9l6 6 6-6" stroke="#EF4444" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          {open&&items.map(s=>{const a=tab===s.id;return <div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 20px 8px 34px",cursor:"pointer",fontSize:13,fontWeight:a?700:500,color:a?C.primary:C.t2,background:a?"rgba(0,122,255,0.06)":"transparent",borderLeft:a?`3px solid ${C.primary}`:"3px solid transparent"}}>{s.svg(a)} {s.l}</div>;})}
        </div>;
      })()}
      <div style={{marginTop:"auto",padding:"0 20px",borderTop:`1px solid ${C.border}`,paddingTop:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><UserAvatar gender={profile?.gender} size={36}/><div><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{user.user_metadata?.username||user.email}</div><div style={{fontSize:10,color:C.t2}}>{pcEL} · {({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất thường xuyên",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn"}</div></div></div>
        <div onClick={signOut} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#EF4444",fontWeight:600,marginTop:12,cursor:"pointer",padding:"8px 4px",borderTop:`1px solid ${C.border}`}}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#EF4444" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Đăng xuất
        </div>
      </div>
    </nav>
    {/* MAIN AREA */}
    <div style={{marginLeft:220,flex:1,display:"flex",flexDirection:"column"}}>
      <header style={{height:68,display:"flex",alignItems:"center",padding:"0 28px",background:"#fff",borderBottom:`1px solid ${C.border}`,position:"fixed",top:0,left:220,right:0,zIndex:20}}>
        <div style={{flex:1}}><div style={{fontSize:20,fontWeight:800,color:C.t1}}>Xin chào, {pcDN} 👋</div><div style={{fontSize:12,color:C.t2,marginTop:2}}>{pcDS}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {tab!=="meals"&&<div style={{display:"flex",borderRadius:10,overflow:"hidden",border:`1.5px solid ${C.border}`}}><div onClick={()=>setPcDayManual("train")} style={{padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",background:pcDayType==="train"?C.primary:"#fff",color:pcDayType==="train"?"#fff":C.t2}}>🏋️ Ngày tập</div><div onClick={()=>setPcDayManual("rest")} style={{padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",background:pcDayType==="rest"?C.primary:"#fff",color:pcDayType==="rest"?"#fff":C.t2}}>😴 Ngày nghỉ</div></div>}
          <div style={{width:1,height:24,background:C.border}}/>
          <style>{`@keyframes fipilotRedGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.35);}50%{box-shadow:0 0 0 8px rgba(239,68,68,0);}}@keyframes fipilotShake{0%,91%,100%{transform:translateX(0);}92%{transform:translateX(-2px);}93%{transform:translateX(2px);}94%{transform:translateX(-2px);}95%{transform:translateX(2px);}96%{transform:translateX(-1px);}97%{transform:translateX(1px);}98%,99%{transform:translateX(0);}}`}</style>
          {flags.ai_chat&&<button onClick={()=>setShowAICoach(true)} style={{padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",animation:"fipilotRedGlow 2s ease-in-out infinite, fipilotShake 4s ease-in-out infinite"}}>✨ Fipilot AI</button>}
          <NotificationBell appSettings={appSettings} userId={user?.id}/>
        </div>
      </header>
      <main style={{padding:tab==="account"?"92px 100px 24px":"92px 24px 24px",flex:1}}>
        {tab==="dashboard"&&<div>
          {/* HERO */}
          <div style={{...card,padding:"28px 32px",borderRadius:20,display:"flex",alignItems:"center",marginBottom:24,border:`1.5px solid ${C.border}`,flexWrap:"wrap"}}>
            {macroBanner&&<div style={{width:"100%",background:"#DCFCE7",border:"1.5px solid #86EFAC",borderRadius:10,padding:"8px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>🔄</span>
              <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>Macro đã cập nhật: {macroBanner.prev.toLocaleString()} → {macroBanner.now.toLocaleString()} cal ({macroBanner.diff>0?"+":""}{macroBanner.diff} cal)</span>
            </div>}
            <div style={{flex:"0 0 40%"}}><div style={{fontSize:12,fontWeight:700,color:"#64748B",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>{pcDayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div><div style={{fontSize:48,fontWeight:900,color:C.t1,letterSpacing:"-2px",lineHeight:1}}>{pcAC.toLocaleString()} <span style={{fontSize:17,fontWeight:600,color:"#64748B"}}> / {pcHCal.toLocaleString()} kcal</span></div>{((profile.calorieMode||"standard")==="asian"||((profile.goalType==="cut")&&(profile.dietStrategy||"balanced")!=="balanced"))&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,alignItems:"center"}}>{(profile.calorieMode||"standard")==="asian"&&<span style={{fontSize:13,fontWeight:700,color:"#007AFF",padding:"4px 12px",background:"rgba(0,122,255,0.08)",borderRadius:8,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🇻🇳 Calo chuẩn Việt Nam</span>}{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:13,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),padding:"4px 12px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)"),borderRadius:8,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}</div>}<div style={{marginTop:10,fontSize:14,fontWeight:700,color:(()=>{const pp=pcHCal>0?Math.round(pcAC/pcHCal*100):0;return pp<95?"#B45309":pp<=105?"#16A34A":"#DC2626";})()}}>{(()=>{const pp=pcHCal>0?Math.round(pcAC/pcHCal*100):0;return pp<95?`⚠️ Còn thiếu ${pcCR} kcal`:pp<=105?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${Math.abs(pcCR)} kcal`;})()}</div><div style={{display:"flex",alignItems:"center",gap:10,marginTop:14,maxWidth:320}}><div style={{flex:1,height:10,background:C.border,borderRadius:5}}><div style={{height:10,background:"linear-gradient(90deg,#36A3FF,#007AFF)",borderRadius:5,width:`${Math.min(pcHCal>0?(pcAC/pcHCal)*100:0,120)}%`,transition:"width 0.4s"}}/></div></div></div>
            <div style={{flex:"0 0 60%",display:"flex",justifyContent:"center",gap:24}}><MacroRing size={110} l="Protein" v={pcAP} max={pcHP} color="#007AFF" color2="#007AFF" sub={`/${pcHP}g`} unit="g"/><MacroRing size={110} l="Carb" v={pcACb} max={pcHC} color="#5AC8FA" color2="#5AC8FA" sub={`/${pcHC}g`} unit="g"/><MacroRing size={110} l="Fat" v={pcAF} max={pcHF} color="#8E8E93" color2="#8E8E93" sub={`/${pcHF}g`} unit="g"/><MacroRing size={110} l="Chất xơ" v={pcAFib} max={pcHFib} color="#34C759" color2="#34C759" sub={`/${pcHFib}g`} unit="g"/></div>
          </div>
          {/* STATS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>{[{l:"Chiều cao",v:profile.cm,u:"cm",icon:"stat_height"},{l:"Cân nặng",v:pcCK,u:"kg",icon:"stat_weight",d:pcCK!==pcSK?`${pcCK>pcSK?"+":""}${Math.round((pcCK-pcSK)*10)/10} kg`:null},{l:"BMI",v:macro.bmi,u:macro.bmi<18.5?"Gầy":macro.bmi<25?"Bình thường":"Thừa cân",icon:"stat_bmi"},{l:pcEL,v:pcET==="none"?"—":({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất chăm",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn",u:"",icon:pcET==="gym"?"stat_gym":pcET==="gym_cardio"?"ex_gym_cardio":pcET==="cardio"?"ex_cardio":"ex_none"}].map((s,i)=><div key={i} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:16,display:"flex",alignItems:"center",gap:12,height:100}}><div style={{width:44,height:44,borderRadius:12,background:"rgba(0,122,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><img src={`/icons/${s.icon}.png`} alt="" style={{width:34,height:34,objectFit:"contain"}}/></div><div><div style={{fontSize:13,color:C.t2,fontWeight:600}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:C.t1}}>{s.v} <span style={{fontSize:13,color:C.t2}}>{s.u}</span></div>{s.d&&<div style={{fontSize:12,fontWeight:700,color:C.primary,marginTop:1}}>{s.d}</div>}</div></div>)}</div>
          {/* 2 COLUMNS */}
          <div style={{display:"grid",gridTemplateColumns:"55fr 45fr",gap:24}}>
            <div style={{...card,padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:15,fontWeight:800,color:C.t1}}>Danh sách thực đơn</span><span onClick={()=>setTab("meals")} style={{fontSize:12,color:C.primary,fontWeight:700,cursor:"pointer"}}>Xem tất cả →</span></div>
              {pcMeals.filter(m=>m.items&&m.items.length>0).map(m=><MealCard key={m.id} meal={m}/>)}
              {pcMeals.every(m=>!m.items||m.items.length===0)&&<div style={{textAlign:"center",padding:20,color:C.t3,fontSize:13}}>🍽️ Chưa có bữa ăn — <span onClick={()=>setTab("meals")} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>Nhập bữa ăn</span></div>}
              {pcAC>0&&<div style={{background:"rgba(52,199,89,0.04)",border:"1.5px solid rgba(52,199,89,0.15)",borderRadius:12,padding:"16px 18px",marginTop:12,display:"flex",alignItems:"center",gap:16}}>
                <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:14}}>🎯</span><span style={{fontSize:12,color:"#059669",fontWeight:600}}>Đánh giá dinh dưỡng</span></div><div style={{fontSize:34,fontWeight:900,color:"#059669",lineHeight:1}}>{pcMS}<span style={{fontSize:15,color:"#64748B",fontWeight:600}}> /100</span></div></div>
                <div style={{flex:1,borderLeft:"1.5px solid rgba(52,199,89,0.15)",paddingLeft:16}}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>{pcMSL}</div><div style={{fontSize:12,color:C.t2,marginTop:3,lineHeight:1.5}}>{(pcCR>0?`Thiếu ${pcCR} cal. Thêm sữa tươi không đường (+120 cal) hoặc 30g hạt điều (+175 cal).`:pcCR<0?`Dư ${Math.abs(pcCR)} cal. Giảm bớt cơm hoặc tinh bột để cân bằng.`:"Cân đối dinh dưỡng, đủ năng lượng cho buổi tập hiệu quả.")+(pcMacroWarnings.length>0?" Ngoài ra đang "+pcMacroWarnings.join(", ")+".":"")}</div></div>
              </div>}
            </div>
            <div>
              <div style={{...card,padding:20,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:16,fontWeight:800,color:C.t1}}>Theo dõi cân nặng</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,color:C.t2,fontWeight:600}}>🎯 {pcGK} kg</span><button onClick={()=>setPcShowWeightInput(!pcShowWeightInput)} style={{width:24,height:24,borderRadius:6,background:"transparent",color:C.secondary,border:`1px solid ${C.secondary}`,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>{pcShowWeightInput?"✕":"+"}</button></div></div>
                {pcShowWeightInput&&<div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1.5px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>⚡ Nhập nhanh cân nặng</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input ref={pcWeightInputRef} type="text" inputMode="decimal" placeholder={`VD: ${(pcCK+0.3).toFixed(1)}`} style={{flex:1,height:40,fontSize:15,padding:"8px 12px",border:`1.5px solid ${C.border}`,borderRadius:10,fontFamily:"inherit",outline:"none"}}/>
                    <button onClick={async()=>{const val=parseFloat((pcWeightInputRef.current?.value||"").replace(",","."));if(!val||val<30||val>200)return;await addWeight(val);setProfile({...profile,kg:val});if(pcWeightInputRef.current)pcWeightInputRef.current.value="";setPcShowWeightInput(false);setPcWeightSaved(true);setTimeout(()=>setPcWeightSaved(false),3000);}} style={{padding:"10px 16px",fontSize:13,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#15803D,#166534)",color:"#fff",cursor:"pointer",fontFamily:"inherit",height:40}}>💾 Lưu</button>
                  </div>
                </div>}
                {pcWeightSaved&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:"#14532D"}}>✓ Đã lưu cân nặng!</span></div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>{[{l:"Xuất phát",v:pcSK,c:C.t1},{l:"Hiện tại",v:pcCK,c:C.primary},{l:"Mục tiêu",v:pcGK,c:C.t1},{l:"Tiến độ",v:Math.round(Math.max(0,Math.min(pcWP,100)))+"%",c:C.primary}].map((w,i)=><div key={i} style={{textAlign:"center",padding:"10px 6px",background:C.surface,borderRadius:10}}><div style={{fontSize:11,color:C.t2,fontWeight:600}}>{w.l}</div><div style={{fontSize:22,fontWeight:800,color:w.c}}>{w.v}</div>{typeof w.v==="number"&&<div style={{fontSize:11,color:C.t2}}>kg</div>}</div>)}</div>
                <div style={{fontSize:13,fontWeight:700,display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.t1}}>Đã {pcCK>=pcSK?"tăng":"giảm"} {Math.abs(Math.round((pcCK-pcSK)*10)/10)} kg</span><span style={{color:C.primary,fontWeight:800}}>{Math.round(Math.max(0,Math.min(pcWP,100)))}%</span></div>
                <div style={{height:8,background:C.surface,borderRadius:4}}><div style={{height:8,borderRadius:4,background:"linear-gradient(90deg,#36A3FF,#007AFF)",width:`${Math.max(0,Math.min(pcWP,100))}%`}}/></div>
                {weightLog.length>=2&&<div style={{marginTop:12}}><WeightBarChart weightLog={weightLog} goalKg={pcGK} goalType={profile.goalType} startKg={pcSK} mob={false}/></div>}
              </div>
              <div style={{...card,padding:18,maxHeight:360,overflowY:"auto"}}><ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={false}/></div>
            </div>
          </div>
          {pcAC>0&&pcCR>0&&<div style={{...card,padding:"18px 24px",marginTop:20,display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#1E3A5F,#2D5A8E)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:24}}>🤖</div>
            <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>Fipilot AI gợi ý cho bạn</div><div style={{fontSize:12,color:C.t2,marginTop:3}}>Hôm nay bạn đang thiếu <b style={{color:"#D97706"}}>{Math.round(Math.max(0,pcHC-pcACb))}g Carb</b> để đạt mục tiêu.</div></div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{fontSize:12,color:C.t2,fontWeight:600,lineHeight:1.3}}>Gợi ý<br/>bổ sung:</div>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"10px 14px",background:C.surface,borderRadius:12}}><span style={{fontSize:22,marginRight:4}}>🍌</span><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>1 quả chuối</div><div style={{fontSize:10,color:C.t2}}>~ 27g Carb · 105 kcal</div></div></div>
              <span style={{color:"#CBD5E1",fontSize:16,fontWeight:300}}>+</span>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"10px 14px",background:C.surface,borderRadius:12}}><span style={{fontSize:22,marginRight:4}}>🍠</span><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>150g khoai lang</div><div style={{fontSize:10,color:C.t2}}>~ 28g Carb · 129 kcal</div></div></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}><button onClick={()=>setTab("meals")} style={{padding:"10px 22px",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>Áp dụng gợi ý</button><button onClick={()=>setTab("meals")} style={{padding:"6px 16px",borderRadius:8,background:"#fff",border:`1px solid ${C.border}`,fontSize:11,color:C.t2,cursor:"pointer",whiteSpace:"nowrap"}}>Xem thêm gợi ý khác</button></div>
            </div>
          </div>}
        </div>}
        {tab==="profile_s"&&<AdminPanel {...adminP} forcedSection="profile" hidePills/>}
        {tab==="meals"&&<AdminPanel {...adminP} forcedSection="meals" hidePills/>}
        {tab==="report"&&<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={false}/>}
        {tab==="settings"&&<AdminPanel {...adminP} forcedSection="settings" signOut={signOut} user={user}/>}
        {tab==="about"&&<AboutPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={false}/>}
        {tab==="terms"&&<TermsPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={false}/>}
        {tab==="ai"&&<AdminPanel key="ai" {...adminP} forcedSection="settings" initialSection="ai" hidePills/>}
        {tab==="weight"&&<AdminPanel key="wt" {...adminP} forcedSection="settings" initialSection="weight" hidePills/>}
        {tab==="account"&&<AdminPanel key="acc" {...adminP} forcedSection="settings" initialSection="account" signOut={signOut} user={user} hidePills/>}
        {tab==="admin_s"&&<AdminPanel key="adm" {...adminP} forcedSection="settings" initialSection="admin" hidePills/>}
        {tab==="templates_s"&&<AdminPanel key="tpl" {...adminP} forcedSection="settings" initialSection="templates" hidePills/>}
        {tab==="weekly_bundles_s"&&<AdminPanel key="wb" {...adminP} forcedSection="settings" initialSection="weekly_bundles" hidePills/>}
        {tab==="food_cache_pending_s"&&<AdminPanel key="fcp" {...adminP} forcedSection="settings" initialSection="food_cache_pending" hidePills/>}
        {tab==="subscription_settings_s"&&<AdminPanel key="subs" {...adminP} forcedSection="settings" initialSection="subscription_settings" hidePills/>}
        {tab==="users_s"&&<AdminPanel key="users" {...adminP} forcedSection="settings" initialSection="users" signOut={signOut} user={user} hidePills/>}
        {tab==="orders_s"&&<AdminPanel key="orders" {...adminP} forcedSection="settings" initialSection="orders" signOut={signOut} user={user} hidePills/>}
        {tab==="report_biz_s"&&<AdminPanel key="report_biz" {...adminP} forcedSection="settings" initialSection="report_biz" signOut={signOut} user={user} hidePills/>}
        {tab==="error_logs_s"&&<AdminPanel key="error_logs" {...adminP} forcedSection="settings" initialSection="error_logs" hidePills/>}
        {tab==="audit_log_s"&&<AdminPanel key="audit_log" {...adminP} forcedSection="settings" initialSection="audit_log" hidePills/>}
        {tab==="notify_s"&&<AdminPanel key="notify" {...adminP} forcedSection="settings" initialSection="notify" signOut={signOut} user={user} hidePills/>}
        {tab==="feature_flags_s"&&<AdminPanel key="feature_flags" {...adminP} forcedSection="settings" initialSection="feature_flags" hidePills/>}
        {tab==="system_health_s"&&<AdminPanel key="system_health" {...adminP} forcedSection="settings" initialSection="system_health" hidePills/>}
      </main>
    </div>
    {flags.ai_chat&&showAICoach&&<AICoachPanel profile={profile} macro={macro} weightLog={weightLog} todayData={{cal:pcAC,p:pcAP,c:pcACb,f:pcAF,dayType:pcDayType}} mob={false} onClose={()=>setShowAICoach(false)} appSettings={appSettings} isAdmin={isAdmin} getMeals={getMeals} getWeeklyTemplate={getWeeklyTemplate} foodCache={foodCache} userId={user?.id}/>}
  </div>;

}
