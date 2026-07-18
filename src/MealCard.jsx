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
        <div style={{display:"flex",gap:mob?8:12,marginTop:4}}>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.protein,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>🥩</span>P {Math.round(t.p)}g</span>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.carb,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>🌾</span>C {Math.round(t.c)}g</span>
          <span style={{fontSize:mob?10:12,fontWeight:700,color:C.fat,display:"inline-flex",alignItems:"center",gap:2}}><span style={{fontSize:mob?10:13}}>💧</span>F {Math.round(t.f)}g</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
        <span style={{fontSize:17,fontWeight:900,color:"#0F172A"}}>{Math.round(t.cal)}</span>
        <span style={{fontSize:11,fontWeight:700,color:C.t2}}>cal</span>
        <span style={{fontSize:13,fontWeight:700,color:C.t3,transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0)",marginLeft:2}}>▾</span>
      </div>
    </div>
    {open&&<div style={{marginTop:12,borderTop:`1.5px solid ${C.border}`,paddingTop:10}}>
      {/* Composite (tô/bát): vẫn hiện tên món nhưng xổ bảng macro chi tiết */}
      {showCompact ? (
        <>
          <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:11,fontWeight:700,paddingBottom:6,marginBottom:4,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            <span style={{color:C.t3}}>Thức ăn</span><span style={{color:C.t3,textAlign:"right"}}>Lượng</span>
            <span style={{color:C.protein,textAlign:"right"}}>P</span><span style={{color:C.carb,textAlign:"right"}}>C</span>
            <span style={{color:C.t2,textAlign:"right"}}>F</span><span style={{color:C.fiber,textAlign:"right"}}>Xơ</span><span style={{color:C.t2,textAlign:"right"}}>Cal</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:600,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}>
            <span style={{color:C.t1,fontWeight:700}}>{patternName}</span>
            <span style={{color:C.t3,textAlign:"right",fontSize:12}}>{totalGram>0?`${totalGram}g`:""}</span>
            <span style={{color:C.protein,textAlign:"right"}}>{Math.round(t.p*10)/10}</span>
            <span style={{color:C.carb,textAlign:"right"}}>{Math.round(t.c*10)/10}</span>
            <span style={{color:C.t2,textAlign:"right"}}>{Math.round(t.f*10)/10}</span>
            <span style={{color:C.fiber,textAlign:"right"}}>{Math.round((t.fiber||0)*10)/10}</span>
            <span style={{color:C.t2,textAlign:"right",fontWeight:700}}>{Math.round(t.cal)}</span>
          </div>
        </>
      ) : (
        <>
          <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:11,fontWeight:700,paddingBottom:6,marginBottom:4,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            <span style={{color:C.t3}}>Thức ăn</span><span style={{color:C.t3,textAlign:"right"}}>Lượng</span>
            <span style={{color:C.protein,textAlign:"right"}}>P</span><span style={{color:C.carb,textAlign:"right"}}>C</span>
            <span style={{color:C.t2,textAlign:"right"}}>F</span><span style={{color:C.fiber,textAlign:"right"}}>Xơ</span><span style={{color:C.t2,textAlign:"right"}}>Cal</span>
          </div>
          {meal.items.filter(item=>!isHiddenFiller(item)).map((item,i,arr)=><div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:600,padding:"6px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{color:C.t1,fontWeight:700}}>{item.display||getFoodDisplay(item.food)}</span>
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
        </>
      )}
    </div>}
  </div>;
}
