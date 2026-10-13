// Popup "Có bản cập nhật mới" — tách nguyên từ Dashboard.jsx (giữ logic app_version cũ).
import { useState, useEffect } from "react";

export function UpdatePopup({ appSettings }) {
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [pendingVersion, setPendingVersion] = useState(null);
  useEffect(()=>{
    const serverVersion=appSettings.app_version;
    if(serverVersion){
      const localVersion=localStorage.getItem("fipilot_version");
      if(localVersion&&localVersion!==serverVersion){
        const dismissed=sessionStorage.getItem("fipilot_update_dismissed");
        if(dismissed===serverVersion) return;
        setPendingVersion(serverVersion);
        setShowUpdatePopup(true);
      }else if(!localVersion){
        localStorage.setItem("fipilot_version",serverVersion);
      }
    }
  },[appSettings.app_version]);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStage, setUpdateStage] = useState("confirm"); // confirm → running → done
  const doUpdate=()=>{
    setUpdateStage("running");
    setUpdateProgress(0);
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 6 + 2;
      if (p >= 90) p = 90;
      setUpdateProgress(p);
    }, 120);
    const cleanupDone = caches.keys()
      .then(names => Promise.all(names.map(k => caches.delete(k))))
      .then(() => { if (navigator.serviceWorker) return navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); })
      .catch(e => console.error("[Update] error:", e));
    const minWait = new Promise(r => setTimeout(r, 3000));
    Promise.all([cleanupDone, minWait]).then(() => {
      clearInterval(tick);
      setUpdateProgress(100);
      setUpdateStage("done");
      if(pendingVersion) localStorage.setItem("fipilot_version", pendingVersion);
    });
  };
  const dismissUpdate=()=>{
    if(pendingVersion) sessionStorage.setItem("fipilot_update_dismissed",pendingVersion);
    setShowUpdatePopup(false);
  };
  if (!showUpdatePopup) return null;
  return <>
    <div style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,maxWidth:340,width:"100%",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1.5px solid #E2E8F0"}}>
          <div style={{fontSize:16,fontWeight:800,color:"#0F172A"}}>🚀 Có bản cập nhật mới!</div>
          {updateStage==="confirm"&&<span onClick={dismissUpdate} style={{cursor:"pointer",fontSize:18,color:"#94A3B8"}}>✕</span>}
        </div>
        <div style={{padding:"20px"}}>
          {updateStage==="confirm"&&<>
            <div style={{fontSize:13,color:"#64748B",lineHeight:1.6,marginBottom:16}}>Phiên bản <b>{pendingVersion}</b> đã sẵn sàng với nhiều cải tiến và sửa lỗi. Nhấn nâng cấp để cập nhật ứng dụng.</div>
          </>}
          {updateStage==="running"&&<div>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36,marginBottom:8}}>⚙️</div>
              <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>Đang nâng cấp...</div>
              <div style={{fontSize:11,color:"#94A3B8",marginTop:4}}>Vui lòng không đóng ứng dụng</div>
            </div>
            <div style={{height:10,borderRadius:5,background:"#F1F5F9",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(updateProgress,100)}%`,background:"linear-gradient(90deg,#36A3FF,#007AFF)",borderRadius:5,transition:"width 0.15s ease"}}/>
            </div>
            <div style={{fontSize:12,color:"#007AFF",marginTop:8,textAlign:"center",fontWeight:700}}>{Math.round(Math.min(updateProgress,100))}%</div>
          </div>}
          {updateStage==="done"&&<div style={{textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>🎉</div>
            <div style={{fontSize:16,fontWeight:800,color:"#16A34A",marginBottom:4}}>Nâng cấp thành công!</div>
            <div style={{fontSize:13,color:"#0F172A",fontWeight:600}}>Phiên bản {pendingVersion}</div>
            <div style={{fontSize:11,color:"#94A3B8",marginTop:6,lineHeight:1.5}}>Ứng dụng đã được cập nhật. Nhấn nút bên dưới để tải lại.</div>
          </div>}
        </div>
        {updateStage==="confirm"&&<div style={{padding:"12px 20px",borderTop:"1.5px solid #E2E8F0",display:"flex",gap:8}}>
          <button onClick={dismissUpdate} style={{flex:1,padding:"12px",fontSize:13,fontWeight:700,border:"1.5px solid #E2E8F0",borderRadius:10,background:"#fff",color:"#64748B",cursor:"pointer",fontFamily:"inherit"}}>Để sau</button>
          <button onClick={doUpdate} style={{flex:2,padding:"12px",fontSize:14,fontWeight:800,border:"none",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>🚀 Nâng cấp ngay</button>
        </div>}
        {updateStage==="done"&&<div style={{padding:"12px 20px",borderTop:"1.5px solid #E2E8F0"}}>
          <button onClick={()=>window.location.reload(true)} style={{width:"100%",padding:"12px",fontSize:14,fontWeight:800,border:"none",borderRadius:10,background:"linear-gradient(135deg,#16A34A,#15803D)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>🔄 Tải lại ứng dụng</button>
        </div>}
      </div>
    </div>
  </>;
}
