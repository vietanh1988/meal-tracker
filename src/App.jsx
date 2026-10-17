import { useState, useCallback, useEffect, useRef } from "react";
import { AppDialogHost } from "./lib/dialog";
import { supabase } from "./lib/supabase";
import { calcMacro, defaultProfile } from "./calcMacro";
import { C, card, redBtn } from "./theme";
import { MobileApp } from "./mobile/MobileApp";
import { LoginScreen } from "./LoginScreen";
import { OnboardingWizard } from "./OnboardingWizard";
import { useIsMobile } from "./hooks/useIsMobile";
import { useAuth } from "./hooks/useAuth";
import { ResetPasswordScreen } from "./ResetPasswordScreen";
import { useProfile } from "./hooks/useProfile";
import { useWeightLog } from "./hooks/useWeightLog";
import { useUserData } from "./hooks/useUserData";
import { useAppSettings } from "./hooks/useAppSettings";
import { PcPhoneFrame } from "./pc/PcPhoneFrame";
import { PcAdminShell } from "./pc/PcAdminShell";
import { todayVN, isGymDate, templateKeyOf } from "./lib/dateVN";

// PC (bản vẽ 117–120, 16/10): bỏ giao diện người dùng riêng cho máy tính (Tổng quan/Bữa ăn/Cân nặng/Nhật ký/Hồ sơ cũ).
// Máy tính: MỌI người thấy CHÍNH app điện thoại (MobileApp) trong khung 400 px giữa màn; admin có nút "Vào Quản trị"
// sang khung Quản trị PC (PcAdminShell). Lựa chọn nhớ trên máy (localStorage fp_pc_mode).
const PC_MODE_KEY="fp_pc_mode";
const readPcMode=()=>{try{return localStorage.getItem(PC_MODE_KEY)==="admin"?"admin":"app";}catch(e){return "app";}};

export default function App(){
  const {user,loading,signOut,isPasswordRecovery}=useAuth();
  useEffect(()=>{
    if(!user?.id)return;
    const ping=async()=>{try{await supabase.rpc("record_user_activity");}catch(e){console.error("record_user_activity error:",e);}};
    ping(); // gọi ngay lúc mount/đăng nhập
    const interval=setInterval(ping,5*60*1000); // rồi lặp lại mỗi 5 phút khi app còn mở
    return ()=>clearInterval(interval);
  },[user?.id]);
  const [pcMode,setPcModeState]=useState(readPcMode);
  const setPcMode=(m)=>{setPcModeState(m);try{localStorage.setItem(PC_MODE_KEY,m);}catch(e){/* */}};
  const [isOffline,setIsOffline]=useState(!navigator.onLine);
  useEffect(()=>{
    const on=()=>setIsOffline(false);
    const off=()=>setIsOffline(true);
    window.addEventListener("online",on);
    window.addEventListener("offline",off);
    return ()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);
  const {profile,setProfile,loading:profileLoading}=useProfile(user?.id,loading);
  const {weightLog,addWeight,updateWeight,deleteWeight,resetWeights,setWeightLog,loading:weightLoading}=useWeightLog(user?.id,loading);
  const ud=useUserData(user?.id);
  const {loaded:userDataLoaded,getMeals,hasMealsToday,getMealHistory,getDailyLogs,foodCache,saveMealToCloud,saveFoodCache,deleteFoodCache,weeklyTemplates,saveWeeklyTemplate,deleteWeeklyTemplate,getWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,refreshDefaultTemplates,weeklyBundles,saveWeeklyBundle,deleteWeeklyBundle,refreshWeeklyBundles,applyTemplate,todayLog,removeDayMeal,moveDayMeal}=ud;
  const {settings:appSettings,isAdmin,saveSetting}=useAppSettings(user?.id);
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

  // Auto-apply Lịch tuần — DUY NHẤT ở đây (MobileApp không tự làm), tối đa
  // 1 lần / ngày / phiên, chỉ khi nhật ký hôm nay (giờ VN) chưa có bữa nào.
  // Không dùng cờ localStorage "chỉ check 1 lần/ngày" (từng gây kẹt khi lần check đầu chưa có Lịch tuần).
  const autoAppliedRef=useRef(null);
  useEffect(()=>{
    if(!getWeeklyTemplate||!applyTemplate||!hasMealsToday||!userDataLoaded)return;
    const today=todayVN();
    if(autoAppliedRef.current===today)return;
    if(!todayLog||todayLog.log_date!==today)return;
    if(hasMealsToday())return;
    // Chỉ áp khi ĐÃ TẢI XONG nhật ký hôm nay từ DB và CHƯA có dòng nào (exists===false).
    // exists===undefined = chưa tải xong (trước đây Lịch tuần về trước nhật ký → áp nhầm
    // đè lên dữ liệu thật); exists===true = đã có nhật ký (kể cả user tự xoá hết bữa) → không áp lại.
    if(todayLog.exists!==false)return;
    const todayKey=templateKeyOf(today);
    const tpl=getWeeklyTemplate(todayKey);
    if(tpl&&tpl.meals&&tpl.meals.length>0){
      autoAppliedRef.current=today;
      const isNone=profile?.exerciseType==="none";
      const actualDayType=isNone?"rest":(isGymDate(profile?.gymDays||[0,2,4,5],today)?"train":"rest");
      applyTemplate({...tpl,day_type:actualDayType});
      console.log("✅ Auto-applied weekly template:",todayKey,"→",actualDayType);
    }
  },[getWeeklyTemplate,applyTemplate,hasMealsToday,userDataLoaded,todayLog]);

  // Màn chờ khi mở app (16/10): nền Blue Dark như header, logo + vòng quay mảnh — thay "⏳ Đang tải..." trên nền trắng
  const splash=<div data-testid="app-splash" role="status" aria-label="Đang tải" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18,minHeight:"100vh",background:"linear-gradient(180deg,#0050E6 0%,#01346A 60%,#001C38 100%)",fontFamily:"Inter,Roboto,-apple-system,sans-serif",color:"#FFFFFF"}}>
    <style>{"@keyframes fpSpin{to{transform:rotate(360deg)}}"}</style>
    <img src="/logo.png" alt="" style={{width:72,height:72,borderRadius:20,objectFit:"cover",boxShadow:"0 12px 30px rgba(0,0,0,0.3)"}}/>
    <span style={{fontSize:18,fontWeight:900,letterSpacing:"0.02em"}}>Fipilot AI</span>
    <span aria-hidden="true" style={{width:26,height:26,borderRadius:13,border:"3px solid rgba(255,255,255,0.25)",borderTopColor:"#FFFFFF",animation:"fpSpin 0.9s linear infinite"}}/>
  </div>;
  if(loading||profileLoading||!profile) return splash;
  // PC (bản vẽ 120): đăng nhập / đặt lại mật khẩu / onboarding nằm trong cùng khung điện thoại giữa màn
  const inFrame=(el)=>mob?el:<PcPhoneFrame>{el}</PcPhoneFrame>;
  if(isPasswordRecovery) return inFrame(<ResetPasswordScreen/>);
  if(!user) return inFrame(<LoginScreen onLogin={()=>window.location.reload()} appSettings={appSettings}/>);
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
  // 16/10: chỉ hiện onboarding khi hồ sơ ĐỌC ĐƯỢC từ DB (hoặc user mới thật) mà chưa xong — không hiện khi hồ sơ là mặc định tạm do lỗi phiên/mạng
  const needsOnboarding=userDataLoaded && !profileLoading && !weightLoading && !!profile?._loaded && !profile.onboardingDone && (!weightLog || weightLog.length===0);
  // 17/10: user mới (hồ sơ chưa xong onboarding) mà dữ liệu ngày / cân còn đang tải → giữ màn chờ, không nháy app chính rồi mới sang onboarding
  if(!!profile?._loaded && !profile.onboardingDone && (!userDataLoaded || weightLoading)) return splash;
  if(needsOnboarding) return inFrame(<OnboardingWizard profile={profile} setProfile={wrappedSetProfile} onComplete={()=>{try{localStorage.setItem("fp_mtab","today");}catch(e){/* */}}} appSettings={appSettings} user={user} saveWeeklyTemplate={saveWeeklyTemplate} applyTemplate={applyTemplate} getMealHistory={getMealHistory}/>);

  const mobileApp=<MobileApp user={user} profile={profile} setProfile={wrappedSetProfile} macro={macro} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} signOut={signOut} isOffline={isOffline} macroBanner={macroBanner}
    weightLog={weightLog} addWeight={addWeight} updateWeight={updateWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} setWeightLog={setWeightLog} ud={ud}/>;

  // ========== MOBILE (giao diện app — src/mobile) ==========
  if(mob) return mobileApp;

  // ========== PC LAYOUT ==========
  // Admin đang ở khung Quản trị PC (chỉ admin; user thường không bao giờ thấy, kể cả khi localStorage ghi "admin")
  if(isAdmin&&pcMode==="admin"){
    const adminP={todayLog,updateWeight,removeDayMeal,moveDayMeal,weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile:wrappedSetProfile,macro,saveMealToCloud,saveFoodCache,deleteFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting,weeklyTemplates,saveWeeklyTemplate,getWeeklyTemplate,deleteWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,applyTemplate,refreshDefaultTemplates,weeklyBundles,saveWeeklyBundle,deleteWeeklyBundle,refreshWeeklyBundles,user,signOut,getMealHistory,getDailyLogs};
    return <>
      <AppDialogHost/>
      <PcAdminShell adminP={adminP} user={user} profile={profile} appSettings={appSettings} saveSetting={saveSetting} onOpenApp={()=>setPcMode("app")}/>
    </>;
  }
  // Khách (và admin chưa vào Quản trị): app điện thoại trong khung giữa màn (MobileApp tự gắn AppDialogHost)
  return <PcPhoneFrame isAdmin={isAdmin} onOpenAdmin={()=>setPcMode("admin")}>{mobileApp}</PcPhoneFrame>;
}
