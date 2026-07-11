import { useState } from "react";
import { C, card } from "./theme";
import { useIsMobile } from "./hooks/useIsMobile";
import { MealIcon } from "./MealIcon";
import { formatFoodPortion } from "./lib/aiMenuService";

export function MealCard({meal}){
  const mob=useIsMobile();
  const [open,setOpen]=useState(false);
  const t=meal.items.reduce((a,i)=>({p:a.p+(i.p||0),c:a.c+(i.c||0),f:a.f+(i.f||0),fiber:a.fiber+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});
  const total=t.p+t.c+t.f+t.fiber||1;
  const iconBg={sang:"#FEF3C7",phu_sang:"#FEE0CC",trua:"#FEF3C7",phu_chieu:"#D1FAE5",pre:"#FEE2E2",post:"#CCFBF1",toi:"#EDE9FE"};
  return <div style={{...card,cursor:"pointer"}} onClick={()=>setOpen(!open)}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,flex:"1 1 auto",minWidth:0}}>
        <div style={{width:44,height:44,borderRadius:11,background:iconBg[meal.id]||C.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <MealIcon id={meal.id} size={22}/>
        </div>
        <span style={{fontSize:15,fontWeight:800,color:C.t1}}>{meal.name}</span>
        <span style={{fontSize:12,fontWeight:600,color:C.t2}}>{meal.items.length} món</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18,fontWeight:900,color:"#0F172A"}}>{Math.round(t.cal)}</span>
        <span style={{fontSize:12,fontWeight:700,color:C.t2}}>cal</span>
        <span style={{fontSize:14,fontWeight:700,color:C.t3,transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0)"}}>▾</span>
      </div>
    </div>
    <div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden",gap:1,marginTop:8}}>
      <div style={{width:`${(t.p/total)*100}%`,background:C.protein,borderRadius:3}}/>
      <div style={{width:`${(t.c/total)*100}%`,background:C.carb,borderRadius:3}}/>
      <div style={{width:`${(t.f/total)*100}%`,background:C.fat,borderRadius:3}}/>
      <div style={{width:`${(t.fiber/total)*100}%`,background:C.fiber,borderRadius:3}}/>
    </div>
    {open&&<div style={{marginTop:12,borderTop:`1.5px solid ${C.border}`,paddingTop:10}}>
      <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:11,fontWeight:700,paddingBottom:6,marginBottom:4,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.05em"}}>
        <span style={{color:C.t3}}>Thức ăn</span><span style={{color:C.t3,textAlign:"right"}}>Lượng</span>
        <span style={{color:C.protein,textAlign:"right"}}>P</span><span style={{color:C.carb,textAlign:"right"}}>C</span>
        <span style={{color:C.t2,textAlign:"right"}}>F</span><span style={{color:C.fiber,textAlign:"right"}}>Xơ</span><span style={{color:C.t2,textAlign:"right"}}>Cal</span>
      </div>
      {meal.items.map((item,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:600,padding:"6px 0",borderBottom:i<meal.items.length-1?`1px solid ${C.border}`:"none"}}>
        <span style={{color:C.t1,fontWeight:700}}>{(item.display||item.food||"").charAt(0).toUpperCase()+(item.display||item.food||"").slice(1)}</span>
        <span style={{color:C.t3,textAlign:"right"}}>{item.qty_display?item.qty_display:formatFoodPortion(item.food,item.gram)}</span>
        <span style={{color:C.protein,textAlign:"right",fontSize:mob?11:13}}>{item.p}</span>
        <span style={{color:C.carb,textAlign:"right",fontSize:mob?11:13}}>{item.c}</span>
        <span style={{color:C.t1,textAlign:"right",fontSize:mob?11:13}}>{item.f}</span>
        <span style={{color:C.fiber,textAlign:"right",fontSize:mob?11:13}}>{item.fiber||0}</span>
        <span style={{color:C.t1,textAlign:"right",fontWeight:800,fontSize:mob?11:13}}>{item.cal}</span>
      </div>)}
      <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:900,paddingTop:8,marginTop:4,borderTop:`2px solid ${C.red}`}}>
        <span style={{color:C.primary}}>Tổng</span><span/>
        <span style={{color:C.protein,textAlign:"right"}}>{Math.round(t.p*10)/10}</span>
        <span style={{color:C.carb,textAlign:"right"}}>{Math.round(t.c*10)/10}</span>
        <span style={{color:C.t1,textAlign:"right"}}>{Math.round(t.f*10)/10}</span>
        <span style={{color:C.fiber,textAlign:"right"}}>{Math.round(t.fiber*10)/10}</span>
        <span style={{color:C.t1,textAlign:"right"}}>{Math.round(t.cal)}</span>
      </div>
    </div>}
  </div>;
}
