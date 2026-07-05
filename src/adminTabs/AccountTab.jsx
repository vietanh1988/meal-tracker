import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { C, card, redBtn } from "../theme";
import { UserAvatar } from "../UserAvatar";
import { MySubscription } from "./MySubscription";
import { isPushSupported, getPushStatus, enablePushNotifications, disablePushNotifications } from "../pushNotifications";
import { parseFeatureFlags } from "./FeatureFlagsTab";

export function AccountTab({user, signOut, isAdmin, profile, mob, appSettings}){
  const pushFeatureEnabled = parseFeatureFlags(appSettings).push;
  const [pushState,setPushState]=useState("checking"); // checking | unsupported | default | granted | denied
  const [pushLoading,setPushLoading]=useState(false);
  const [pushError,setPushError]=useState("");
  const [showDeleteModal,setShowDeleteModal]=useState(false);
  const [deletePassword,setDeletePassword]=useState("");
  const [deleteConfirmText,setDeleteConfirmText]=useState("");
  const [deleting,setDeleting]=useState(false);
  const [deleteError,setDeleteError]=useState("");

  useEffect(()=>{
    if(!isPushSupported()){setPushState("unsupported");return;}
    getPushStatus().then(setPushState);
  },[]);

  const handleEnablePush=async()=>{
    setPushLoading(true);setPushError("");
    try{
      await enablePushNotifications();
      setPushState("granted");
    }catch(e){
      setPushError(e.message||"Không bật được thông báo");
      setPushState(await getPushStatus());
    }
    setPushLoading(false);
  };

  const handleDisablePush=async()=>{
    setPushLoading(true);
    try{ await disablePushNotifications(); }catch(e){ console.error(e); }
    setPushState(await getPushStatus());
    setPushLoading(false);
  };

  const handleDeleteAccount=async()=>{
    setDeleteError("");
    if(!deletePassword.trim()){setDeleteError("Vui lòng nhập mật khẩu để xác nhận");return;}
    if(deleteConfirmText.trim().toUpperCase()!=="XOA"){setDeleteError('Vui lòng gõ đúng chữ "XOA" để xác nhận');return;}
    setDeleting(true);
    try{
      // Xác thực lại mật khẩu trước khi xoá (re-auth) — đảm bảo đúng người, không phải ai đó
      // mượn máy đã đăng nhập sẵn bấm nhầm
      const {error: reAuthErr}=await supabase.auth.signInWithPassword({email:user.email,password:deletePassword});
      if(reAuthErr){setDeleteError("Sai mật khẩu, vui lòng thử lại");setDeleting(false);return;}

      const {data:sessionData}=await supabase.auth.getSession();
      const token=sessionData?.session?.access_token;
      if(!token){setDeleteError("Không lấy được phiên đăng nhập, vui lòng tải lại trang");setDeleting(false);return;}

      const res=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/delete-account",{
        method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      });
      const result=await res.json();
      if(result.error){setDeleteError(result.error);setDeleting(false);return;}

      alert("Tài khoản đã được xoá vĩnh viễn. Cảm ơn bạn đã sử dụng Fipilot AI!");
      if(signOut)await signOut();
      window.location.reload();
    }catch(e){console.error(e);setDeleteError("Có lỗi xảy ra, vui lòng thử lại");}
    setDeleting(false);
  };

  return (
<div style={{...card, maxWidth: mob?undefined:720, margin: mob?undefined:"0 auto"}}>
      <MySubscription userId={user?.id} mob={mob} isAdmin={isAdmin} appSettings={appSettings}/>
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
      {pushFeatureEnabled&&<div style={{background:C.surface,borderRadius:10,padding:"16px",marginBottom:16,border:`1.5px solid ${C.border}`}}>
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
      </div>}
      <div style={!mob?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}:{}}>
      <button onClick={()=>{if(signOut)signOut();}} style={{...redBtn,background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"#fff",border:"none"}}>🚪 Đăng xuất</button>
      <button onClick={()=>{
        caches.keys().then(names=>Promise.all(names.map(k=>caches.delete(k)))).then(()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
          window.location.reload(true);
        });
      }} style={{...redBtn,marginTop:mob?8:0,background:"linear-gradient(135deg,#6B7280,#4B5563)"}}>🗑️ Xóa cache & cập nhật</button>
      </div>

      <div style={{marginTop:20,paddingTop:16,borderTop:`1.5px dashed ${C.red}`}}>
        <div style={{fontSize:12,fontWeight:800,color:C.red,marginBottom:8,letterSpacing:"0.05em",textTransform:"uppercase"}}>⚠️ Vùng nguy hiểm</div>
        <button onClick={()=>{setShowDeleteModal(true);setDeletePassword("");setDeleteConfirmText("");setDeleteError("");}} style={{width:"100%",padding:"10px",borderRadius:8,border:`1.5px solid ${C.red}`,background:"#fff",color:C.red,fontSize:13,fontWeight:700,cursor:"pointer"}}>🗑️ Xoá tài khoản vĩnh viễn</button>
        <div style={{fontSize:11,color:C.t3,marginTop:6,lineHeight:1.5}}>Xoá toàn bộ dữ liệu cá nhân (hồ sơ, cân nặng, bữa ăn, lịch sử chat AI...) — không thể khôi phục.</div>
      </div>

      {showDeleteModal&&(
        <div onClick={()=>!deleting&&setShowDeleteModal(false)} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:300}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,maxWidth:420,width:"100%",padding:"24px 22px"}}>
            <div style={{fontSize:36,textAlign:"center",marginBottom:10}}>⚠️</div>
            <div style={{fontSize:17,fontWeight:800,color:C.t1,textAlign:"center",marginBottom:8}}>Xoá tài khoản vĩnh viễn?</div>
            <div style={{fontSize:13,color:C.t2,textAlign:"center",lineHeight:1.6,marginBottom:18}}>Toàn bộ hồ sơ, cân nặng, bữa ăn, lịch sử chat AI sẽ bị xoá <b>vĩnh viễn, không thể khôi phục</b>. Hành động này không thể hoàn tác.</div>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Nhập mật khẩu để xác nhận</div>
              <input type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} placeholder="Mật khẩu hiện tại" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>Gõ "XOA" để xác nhận</div>
              <input value={deleteConfirmText} onChange={e=>setDeleteConfirmText(e.target.value)} placeholder="XOA" style={{width:"100%",padding:"10px 12px",borderRadius:8,border:`1.5px solid ${C.border}`,fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>

            {deleteError&&<div style={{marginBottom:14,padding:"8px 12px",background:C.redBg,borderRadius:8,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {deleteError}</div>}

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowDeleteModal(false)} disabled={deleting} style={{flex:1,padding:"11px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",color:C.t2,fontSize:13,fontWeight:700,cursor:deleting?"default":"pointer"}}>Huỷ</button>
              <button onClick={handleDeleteAccount} disabled={deleting} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"#fff",fontSize:13,fontWeight:700,cursor:deleting?"default":"pointer",opacity:deleting?0.6:1}}>{deleting?"Đang xoá...":"Xoá vĩnh viễn"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
