import { useState, useEffect, useRef } from "react";
import { C, card } from "./theme";

export function NotiBell({appSettings,dark}){
  const [show,setShow]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    if(!show)return;
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setShow(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[show]);
  const list=(()=>{try{return appSettings.notifications?JSON.parse(appSettings.notifications):[];}catch(e){return[];}})();
  const hasNew=list.some(n=>n.isNew);
  return <div style={{position:"relative"}} ref={ref}>
    <div onClick={()=>setShow(!show)} style={{width:dark?36:40,height:dark?36:40,borderRadius:"50%",background:dark?"rgba(255,255,255,0.1)":C.card,border:dark?"1px solid rgba(255,255,255,0.2)":`1.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:dark?16:18,cursor:"pointer",boxShadow:dark?"none":"0 1px 4px rgba(0,0,0,0.06)"}}>🔔</div>
    {hasNew&&<div style={{position:"absolute",top:0,right:0,width:10,height:10,borderRadius:"50%",background:"#EF4444",border:dark?"2px solid #111":"2px solid #fff"}}/>}
    {show&&<div style={{position:"absolute",top:dark?44:48,right:0,width:320,background:C.card,border:`1.5px solid ${C.border}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:50,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1.5px solid ${C.border}`,fontSize:13,fontWeight:700,color:C.t1}}>🔔 Thông báo</div>
      {list.map(n=><div key={n.id} onClick={()=>{
        caches.keys().then(names=>Promise.all(names.map(k=>caches.delete(k)))).then(()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
          window.location.reload(true);
        });
      }} style={{padding:"10px 14px",cursor:"pointer",borderBottom:`0.5px solid ${C.border}`,background:n.isNew?"rgba(220,38,38,0.04)":"transparent"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {n.isNew&&<div style={{width:6,height:6,borderRadius:"50%",background:"#EF4444",flexShrink:0}}/>}
          <div style={{fontSize:12,fontWeight:n.isNew?700:600,color:C.t1,lineHeight:1.4}}>{n.text}</div>
        </div>
        <div style={{fontSize:10,color:C.t3,marginTop:3}}>{n.date} • Nhấn để cập nhật</div>
      </div>)}
      {list.length===0&&<div style={{padding:"16px",textAlign:"center",fontSize:12,color:C.t3}}>Không có thông báo mới</div>}
    </div>}
  </div>;
}
