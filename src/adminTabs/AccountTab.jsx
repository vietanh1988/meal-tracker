import { useState, useEffect } from "react";
import { C, card, redBtn } from "../theme";
import { UserAvatar } from "../UserAvatar";
import { MySubscription } from "./MySubscription";
import { isPushSupported, getPushPermission, enablePushNotifications, disablePushNotifications } from "../pushNotifications";

export function AccountTab({user, signOut, isAdmin, profile, mob}){
  const [pushState,setPushState]=useState("checking"); // checking | unsupported | default | granted | denied
  const [pushLoading,setPushLoading]=useState(false);
  const [pushError,setPushError]=useState("");

  useEffect(()=>{
    if(!isPushSupported()){setPushState("unsupported");return;}
    setPushState(getPushPermission());
  },[]);

  const handleEnablePush=async()=>{
    setPushLoading(true);setPushError("");
    try{
      await enablePushNotifications();
      setPushState("granted");
    }catch(e){
      setPushError(e.message||"Không bật được thông báo");
      setPushState(getPushPermission());
    }
    setPushLoading(false);
  };

  const handleDisablePush=async()=>{
    setPushLoading(true);
    try{ await disablePushNotifications(); }catch(e){ console.error(e); }
    setPushState(getPushPermission());
    setPushLoading(false);
  };

  return (
<div style={{...card, maxWidth: mob?undefined:720, margin: mob?undefined:"0 auto"}}>
      <MySubscription userId={user?.id} mob={mob} isAdmin={isAdmin}/>
      <div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:16,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>👤</span><span style={{fontWeight:800,color:C.t1}}>Tài khoản</span></div>
      <div style={{background:C.surface,borderRadius:10,padding:"16px",marginBottom:16,border:`1.5px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <UserAvatar gender={profile.gender} size={48}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:C.t1}}>{user?.user_metadata?.username||"User"}</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t3}}>Thành viên Fipilot AI</div>
          </div>
        </div>
        <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:12,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>👤</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Tên hiển thị</div>
              <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{user?.user_metadata?.username||"Chưa đặt"}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.goldBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>📧</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Email</div>
              <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{user?.email||"Chưa có"}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.greenBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🛡️</div>
            <div style={{flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Vai trò</div>
              <div style={{fontSize:14,fontWeight:700,color:isAdmin?C.red:C.t1}}>{isAdmin?"Admin":"Thành viên"}</div>
            </div>
          </div>
        </div>
      </div>
      <div style={{background:C.surface,borderRadius:10,padding:"16px",marginBottom:16,border:`1.5px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:pushState==="unsupported"?0:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.blueBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🔔</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:800,color:C.t1}}>Thông báo đẩy</div>
            <div style={{fontSize:11,color:C.t3}}>Nhắc ghi bữa ăn, đơn hàng, gói cước sắp hết hạn...</div>
          </div>
          {pushState==="granted"&&<span style={{fontSize:11,fontWeight:700,color:C.green,background:C.greenBg,padding:"3px 9px",borderRadius:8}}>Đang bật</span>}
        </div>
        {pushState==="unsupported"&&<div style={{fontSize:12,color:C.t3,marginTop:8}}>Trình duyệt này không hỗ trợ thông báo đẩy.</div>}
        {pushState==="denied"&&<div style={{fontSize:12,color:C.red,marginTop:4}}>Bạn đã chặn thông báo cho trang này. Vào cài đặt trình duyệt để bật lại.</div>}
        {(pushState==="default")&&<button disabled={pushLoading} onClick={handleEnablePush} style={{width:"100%",padding:"9px",borderRadius:8,border:"none",background:C.primary,color:"#fff",fontSize:13,fontWeight:700,cursor:pushLoading?"default":"pointer",opacity:pushLoading?0.6:1}}>{pushLoading?"Đang bật...":"🔔 Bật thông báo đẩy"}</button>}
        {pushState==="granted"&&<button disabled={pushLoading} onClick={handleDisablePush} style={{width:"100%",padding:"9px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",color:C.t2,fontSize:13,fontWeight:700,cursor:pushLoading?"default":"pointer",opacity:pushLoading?0.6:1}}>{pushLoading?"Đang tắt...":"Tắt thông báo đẩy"}</button>}
        {pushError&&<div style={{fontSize:12,color:C.red,marginTop:6}}>{pushError}</div>}
      </div>
      <div style={!mob?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}:{}}>
      <button onClick={()=>{if(signOut)signOut();}} style={{...redBtn,background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"#fff",border:"none"}}>🚪 Đăng xuất</button>
      <button onClick={()=>{
        caches.keys().then(names=>Promise.all(names.map(k=>caches.delete(k)))).then(()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
          window.location.reload(true);
        });
      }} style={{...redBtn,marginTop:mob?8:0,background:"linear-gradient(135deg,#6B7280,#4B5563)"}}>🗑️ Xóa cache & cập nhật</button>
      </div>
    </div>
  );
}
