import { C, card, lbl, redBtn } from "../theme";

export function ScheduleTab({appSettings, saveSetting, profile, setProfile, mob}){
      const days=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
      const toggleDay=(idx)=>{
        const nd=days.includes(idx)?days.filter(d=>d!==idx):[...days,idx].sort();
        setProfile({...profile,gymDays:nd,gym:nd.length});
        if(saveSetting) saveSetting("gymDays",JSON.stringify(nd));
      };
      return <div style={card}>
        <div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:16}}>Lịch tập gym</div>
        <div><div style={{...lbl,marginBottom:6}}>Số buổi/tuần</div>
          <div style={{fontSize:24,fontWeight:800,color:C.t1}}>{days.length} <span style={{fontSize:13,fontWeight:600,color:C.t3}}>buổi</span></div>
        </div>
        <div style={{marginTop:16}}>
          <div style={{...lbl,marginBottom:8}}>Bấm chọn / bỏ chọn ngày tập</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {["T2","T3","T4","T5","T6","T7","CN"].map((d,i)=>{
              const a=days.includes(i);
              return <div key={i} onClick={()=>toggleDay(i)} style={{width:46,height:46,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:a?800:600,cursor:"pointer",background:a?C.redBg:C.surface,color:a?C.red:C.t3,border:a?`2px solid ${C.red}`:`1.5px solid ${C.border}`,transition:"all 0.15s"}}>{d}</div>;
            })}
          </div>
        </div>
        <button onClick={()=>{
          if(saveSetting) saveSetting("gymDays",JSON.stringify(days));
          const el=document.getElementById("schedule-saved");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},2500);}
        }} style={{...redBtn,marginTop:20}}>💾 Lưu lịch tập</button>
        <div id="schedule-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:10}}>
          <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã lưu! Tập {days.length} buổi/tuần — {days.map(d=>["T2","T3","T4","T5","T6","T7","CN"][d]).join(", ")}</span>
        </div>
      </div>;
}
