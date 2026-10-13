import { useState } from "react";
import { C } from "./theme";
import { wColors } from "./mealConstants";
import { parseKg } from "./lib/weightMath";

export function WeightRow({w,i,weightLog,setWeightLog,setProfile,profile,deleteWeight,updateWeight}){
  const [editing,setEditing]=useState(false);
  const [editVal,setEditVal]=useState(String(w.kg));
  const [busy,setBusy]=useState(false);
  return <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.1fr 0.7fr 0.5fr 0.8fr",gap:4,padding:"8px 0",fontSize:13,borderBottom:i<weightLog.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
    <span style={{fontWeight:800,color:wColors[i%wColors.length]}}>T{w.week}</span>
    <span style={{fontWeight:600,color:C.t2,fontSize:11}}>{w.date}</span>
    {editing
      ?<input type="text" inputMode="decimal" value={editVal} onChange={e=>setEditVal(e.target.value.replace(",",".").replace(/[^0-9.]/g,""))} style={{padding:"4px 6px",fontSize:16,textAlign:"right",border:`1.5px solid ${C.border}`,borderRadius:6,background:C.surface,color:C.t1,outline:"none",width:"100%",boxSizing:"border-box"}}/>
      :<span style={{color:C.t1,fontWeight:900,textAlign:"right"}}>{w.kg}</span>
    }
    <span style={{color:w.delta?w.delta>0?C.green:C.red:C.t3,fontWeight:700,fontSize:12,textAlign:"right"}}>{w.delta?`${w.delta>0?"+":""}${w.delta}`:"-"}</span>
    <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
      {editing
        ?<button disabled={busy} onClick={async()=>{
            const kg=parseKg(editVal);
            if(!kg){alert("Cân nặng không hợp lệ (30–250 kg)");return;}
            if(!w.id||!updateWeight){setEditing(false);return;}
            setBusy(true);
            const ok=await updateWeight(w.id,kg);
            setBusy(false);
            if(!ok){alert("Lưu không được, thử lại sau.");return;}
            if(i===weightLog.length-1)setProfile({...profile,kg});
            setEditing(false);
          }} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.greenBg,color:C.green,border:`1px solid ${C.green}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
        :<button onClick={()=>setEditing(true)} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.goldBg,color:C.gold,border:`1px solid ${C.gold}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✎</button>
      }
      <button onClick={()=>{
        if(!w.id)return;
        if(!confirm(`Xoá lần cân ${w.kg} kg ngày ${w.date}?`))return;
        deleteWeight(w.id);
        if(i===weightLog.length-1&&weightLog.length>1)setProfile({...profile,kg:weightLog[weightLog.length-2].kg});
      }} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.redBg,color:C.secondary,border:`1px solid ${C.secondary}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
    </div>
  </div>;
}
