import { useState } from "react";
import { C, card } from "./theme";
import { useIsMobile } from "./hooks/useIsMobile";
import { formatFoodPortion } from "./lib/aiMenuService";
import { getFoodRole, getFoodDisplay } from "./lib/localFoodDB";

// Filler béo (mè, lạc, đậu phộng) có display=null — ẩn khỏi danh sách
// nhưng VẪN tính trong tổng macro (t.p/c/f/cal ở trên đã gồm rồi).
const isHiddenFiller = (item) => item.display === null && getFoodRole(item.food) === "fat";

export function MealCard({meal}){
  const mob=useIsMobile();
  const [open,setOpen]=useState(false);
  const t=meal.items.reduce((a,i)=>({p:a.p+(i.p||0),c:a.c+(i.c||0),f:a.f+(i.f||0),fiber:a.fiber+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});
  const borderColor={sang:"#D97706",phu_sang:"#F59E0B",trua:"#EA580C",phu_chieu:"#16A34A",pre:"#F59E0B",post:"#0EA5E9",toi:"#7C3AED"};

  // Chỉ món TÔ (composite) hiện gọn — đĩa cơm vẫn liệt kê từng món
  const patternName = meal.pattern || null;
  const showCompact = !!meal.composite;
  const totalGram = Math.round(meal.items.reduce((s, it) => s + (it.gram || 0), 0));

  return <div style={{...card,cursor:"pointer",borderLeft:`3.5px solid ${borderColor[meal.id]||C.primary}`,borderRadius:"0 12px 12px 0"}} onClick={()=>setOpen(!open)}>
    <div style={{display:"flex",alignItems:"center"}}>
      <div style={{flex:"1 1 auto",minWidth:0}}>
        <div>
          <span style={{fontSize:14,fontWeight:800,color:C.t1}}>{meal.name}</span>
          {patternName && <span style={{fontSize:11,fontWeight:600,color:C.t3,marginLeft:5}}>· {patternName}</span>}
          {!patternName && <span style={{fontSize:11,fontWeight:600,color:C.t2,marginLeft:5}}>{meal.items.filter(it=>!isHiddenFiller(it)).length} món</span>}
        </div>
        <div style={{display:"flex",gap:mob?8:12,marginTop:4,flexWrap:"wrap"}}>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.protein,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>🥩</span>P {Math.round(t.p)}g</span>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.carb,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>🌾</span>C {Math.round(t.c)}g</span>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.fat,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>💧</span>F {Math.round(t.f)}g</span>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.fiber,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>🍃</span>Xơ {Math.round(t.fiber)}g</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
        <span style={{fontSize:17,fontWeight:900,color:"#0F172A"}}>{Math.round(t.cal)}</span>
        <span style={{fontSize:11,fontWeight:700,color:C.t2}}>cal</span>
        <span style={{fontSize:13,fontWeight:700,color:C.t3,transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0)",marginLeft:2}}>▾</span>
      </div>
    </div>
    {open&&<div style={{marginTop:10,borderTop:`1.5px solid ${C.border}`,paddingTop:8}}>
      {showCompact ? (
        <div style={{padding:"6px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{patternName}</span>
            <span style={{fontSize:12,fontWeight:600,color:C.t3}}>{totalGram>0?`${totalGram}g`:""}</span>
          </div>
          <div style={{display:"flex",gap:8,marginTop:3}}>
            <span style={{fontSize:10,fontWeight:600,color:C.protein}}>P {Math.round(t.p*10)/10}</span>
            <span style={{fontSize:10,fontWeight:600,color:C.carb}}>C {Math.round(t.c*10)/10}</span>
            <span style={{fontSize:10,fontWeight:600,color:C.fat}}>F {Math.round(t.f*10)/10}</span>
            <span style={{fontSize:10,fontWeight:800,color:C.t1}}>{Math.round(t.cal)} cal</span>
          </div>
        </div>
      ) : (
        meal.items.filter(item=>!isHiddenFiller(item)).map((item,i,arr)=><div key={i} style={{padding:"7px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{item.display||getFoodDisplay(item.food)}</span>
            <span style={{fontSize:12,fontWeight:600,color:C.t3}}>{item.qty_display?item.qty_display:formatFoodPortion(item.food,item.gram)}</span>
          </div>
          <div style={{display:"flex",gap:8,marginTop:3}}>
            <span style={{fontSize:10,fontWeight:600,color:C.protein}}>P {item.p}</span>
            <span style={{fontSize:10,fontWeight:600,color:C.carb}}>C {item.c}</span>
            <span style={{fontSize:10,fontWeight:600,color:C.fat}}>F {item.f}</span>
            <span style={{fontSize:10,fontWeight:800,color:C.t1}}>{item.cal} cal</span>
          </div>
        </div>)
      )}
    </div>}
  </div>;
}
