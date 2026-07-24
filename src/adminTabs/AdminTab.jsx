import { C, card, inp } from "../theme";
import { ReadOnlyBanner } from "./ReadOnlyBanner";

export function AdminTab({appSettings, saveSetting, mob, isSuperAdmin}){
  return (
<div style={card}>      {!isSuperAdmin && <ReadOnlyBanner />}
      <div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>🔧</span><span style={{fontWeight:800,color:C.t1}}>Quản trị</span></div>
      <div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:20}}>Quản lý thông báo và cập nhật cho tất cả users</div>

      <div style={{marginBottom:20}}>
        <div style={{fontSize:15,fontWeight:800,color:C.t1,marginBottom:12}}>📢 Quản lý thông báo</div>
        <div style={{fontSize:12,fontWeight:600,color:C.t3,marginBottom:12}}>Thêm thông báo hiện trong chuông 🔔 cho tất cả users</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input id="noti-text" type="text" placeholder="VD: 🎉 Phiên bản 2.6 — Kho 192 thực phẩm" style={{...inp,flex:1}}/>
          <button onClick={async()=>{
            const text=document.getElementById("noti-text")?.value?.trim();
            if(!text)return;
            const existing=(()=>{try{return appSettings.notifications?JSON.parse(appSettings.notifications):[];}catch(e){return[];}})();
            const newNoti={id:"v"+Date.now(),text,date:new Date().toLocaleDateString("vi-VN"),isNew:true};
            const updated=[newNoti,...existing.map(n=>({...n,isNew:false}))].slice(0,10);
            await saveSetting("notifications",JSON.stringify(updated));
            document.getElementById("noti-text").value="";
            const el=document.getElementById("noti-added");
            if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
          }} style={{padding:"8px 16px",fontSize:13,fontWeight:700,border:"none",borderRadius:8,background:"linear-gradient(135deg,#15803D,#166534)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>+ Thêm</button>
        </div>
        <div id="noti-added" style={{display:"none",alignItems:"center",gap:8,padding:"8px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginBottom:10}}>
          <span style={{fontSize:12,fontWeight:800,color:"#14532D"}}>✓ Đã thêm thông báo!</span>
        </div>
        {(()=>{try{return appSettings.notifications?JSON.parse(appSettings.notifications):[];}catch(e){return[];}})().map((n,i)=>
          <div key={n.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:C.surface,borderRadius:8,marginBottom:4,border:`1px solid ${C.border}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:n.isNew?700:600,color:C.t1}}>{n.isNew&&<span style={{width:6,height:6,borderRadius:"50%",background:"#EF4444",display:"inline-block",marginRight:6}}/>}{n.text}</div>
              <div style={{fontSize:10,color:C.t3}}>{n.date}</div>
            </div>
            <button onClick={async()=>{
              const existing=(()=>{try{return appSettings.notifications?JSON.parse(appSettings.notifications):[];}catch(e){return[];}})();
              const updated=existing.filter(x=>x.id!==n.id);
              await saveSetting("notifications",JSON.stringify(updated));
            }} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:"4px 8px"}}>✕</button>
          </div>
        )}
      </div>

      <div style={{borderTop:`2px solid ${C.border}`,paddingTop:16}}>
        <div style={{fontSize:15,fontWeight:800,color:C.t1,marginBottom:12}}>🔄 Force Update All Users</div>
        <div style={{fontSize:12,fontWeight:600,color:C.t3,marginBottom:8}}>Đổi version → tất cả users sẽ tự xóa cache + reload khi mở app</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{fontSize:13,fontWeight:700,color:C.t2}}>Version hiện tại: <span style={{color:C.secondary,fontWeight:900}}>{appSettings.app_version||"chưa set"}</span></div>
          <input id="new-version" type="text" placeholder="VD: 2.7" defaultValue={appSettings.app_version||""} style={{...inp,width:80}}/>
          <button onClick={async()=>{
            const ver=document.getElementById("new-version")?.value?.trim();
            if(!ver)return;
            await saveSetting("app_version",ver);
            const el=document.getElementById("version-saved");
            if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
          }} style={{padding:"8px 16px",fontSize:13,fontWeight:700,border:"none",borderRadius:8,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>🚀 Deploy</button>
        </div>
        <div id="version-saved" style={{display:"none",alignItems:"center",gap:8,padding:"8px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
          <span style={{fontSize:12,fontWeight:800,color:"#14532D"}}>✓ Version updated! Users sẽ tự reload.</span>
        </div>
      </div>
    </div>
  );
}
