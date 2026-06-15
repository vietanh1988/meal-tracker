import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useWeightLog } from "./hooks/useWeightLog";
import { useUserData } from "./hooks/useUserData";
import { useAppSettings } from "./hooks/useAppSettings";
import { calcMacroAIDirect } from "./lib/aiService";
import { searchUSDA, calcFromUSDA } from "./lib/usdaService";

function useIsMobile(breakpoint=600){
  const [m,setM]=useState(typeof window!=="undefined"?window.innerWidth<=breakpoint:false);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<=breakpoint);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[breakpoint]);
  return m;
}

const C = {
  protein:"#DC2626", carb:"#B45309", fat:"#111", fiber:"#15803D",
  red:"#DC2626", gold:"#CA8A04", green:"#15803D", blue:"#1D4ED8",
  bg:"#FAFAF9", card:"#FFF", surface:"#F3F3F2",
  border:"#CDCDCD",
  t1:"#111", t2:"#3A3A3A", t3:"#666",
  redBg:"rgba(220,38,38,0.07)", goldBg:"rgba(202,138,4,0.1)", greenBg:"rgba(21,128,61,0.08)", blueBg:"rgba(29,78,216,0.06)",
};
const card={background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"};
const lbl={fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase"};
const inp={width:"100%",boxSizing:"border-box",padding:"10px 12px",fontSize:16,fontWeight:600,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.t1,outline:"none",fontFamily:"inherit"};
const redBtn={padding:"12px",fontSize:14,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#DC2626,#B91C1C)",color:"#fff",cursor:"pointer",fontFamily:"inherit",width:"100%"};

function Pill({active,color=C.red,children,onClick}){
  return <button onClick={onClick} style={{
    padding:"7px 16px",fontSize:13,fontWeight:active?800:600,border:"none",borderRadius:20,
    cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
    background:active?(color===C.red?C.redBg:color===C.green?C.greenBg:color===C.gold?C.goldBg:color===C.blue?C.blueBg:C.surface):C.surface,
    color:active?color:C.t3,outline:active?`2px solid ${color}`:`1.5px solid ${C.border}`,
  }}>{children}</button>;
}

// SVG icons for cross-platform consistency (no emoji dependency)
const Icon=({d,color="#666",size=20})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const Icons={
  sunrise:"M17 18a5 5 0 0 0-10 0 M12 2v7 M4.22 10.22l1.42 1.42 M1 18h2 M21 18h2 M18.36 11.64l1.42-1.42 M23 22H1 M8 6l4-4 4 4",
  sun:"M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42",
  coffee:"M18 8h1a4 4 0 0 1 0 8h-1 M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z M6 1v3 M10 1v3 M14 1v3",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  moon:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  dumbbell:"M6.5 6.5h11 M6.5 17.5h11 M6.5 6.5v11 M17.5 6.5v11 M2 9v6 M22 9v6 M2 9h4.5 M17.5 9H22 M2 15h4.5 M17.5 15H22",
  scale:"M12 3v17 M1 10l11 4 11-4 M1 10l11-4 11 4",
  chart:"M18 20V10 M12 20V4 M6 20v-6",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  calendar:"M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M16 2v4 M8 2v4 M3 10h18",
  weight:"M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M2 21h20 M5 21l3-9 M19 21l-3-9",
  settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71",
  save:"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8",
};
const MealIcon=({id,size=20})=>{
  const map={sang:"sunrise",trua:"sun",phu1:"coffee",phu2:"zap",toi:"moon"};
  const color={sang:"#EAB308",trua:"#F59E0B",phu1:"#78716C",phu2:"#DC2626",toi:"#6366F1"};
  return <Icon d={Icons[map[id]||"sun"]} color={color[id]||"#666"} size={size}/>;
};

const mealsData={
  train:[
    {id:"sang",name:"Sáng",items:[]},
    {id:"trua",name:"Trưa",items:[]},
    {id:"phu1",name:"Phụ 1 (VP)",items:[]},
    {id:"phu2",name:"Phụ 2 (pre-workout)",items:[]},
    {id:"toi",name:"Tối",items:[]},
  ],
  rest:[
    {id:"sang",name:"Sáng",items:[]},
    {id:"trua",name:"Trưa",items:[]},
    {id:"phu1",name:"Phụ 1 (VP)",items:[]},
    {id:"toi",name:"Tối",items:[]},
  ],
};
const getMealsDefault=(type)=>mealsData[type];
const wColors=["#DC2626","#B45309","#CA8A04","#15803D","#1D4ED8","#7C3AED","#DB2777","#0891B2","#0E7490","#4338CA","#BE123C","#047857"];
function fmtDate(d){const dd=String(d.getDate()).padStart(2,"0"),mm=String(d.getMonth()+1).padStart(2,"0"),yy=d.getFullYear();return `${dd}/${mm}/${yy}`;}

function MacroRing({l,v,max,color,color2,track,tc,sub,unit}){
  const pct=Math.min((v/max)*100,100),r=28,sw=6,circ=2*Math.PI*r;
  const gradId=`ring-${l.replace(/\s/g,"")}`;
  const c2=color2||color;
  return <div style={{textAlign:"center"}}>
    <svg width={72} height={72} viewBox="0 0 72 72" style={{display:"block",margin:"0 auto"}}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <circle cx={36} cy={36} r={r} fill="none" stroke={track||"#E0E0E0"} strokeWidth={sw}/>
      <circle cx={36} cy={36} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeDasharray={`${(Math.min(pct,100)/100)*circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 36 36)" style={{transition:"stroke-dasharray 0.5s"}}/>
      <text x={36} y={sub?32:36} textAnchor="middle" dominantBaseline="central" fill={tc||C.t1} fontSize={sub?14:16} fontWeight={900}>{Math.round(v)}</text>
      {sub&&<text x={36} y={48} textAnchor="middle" dominantBaseline="central" fill={tc?"rgba(255,255,255,0.8)":"#666"} fontSize={10} fontWeight={700}>{sub}</text>}
      {!sub&&<text x={36} y={48} textAnchor="middle" dominantBaseline="central" fill={tc?"rgba(255,255,255,0.6)":C.t3} fontSize={10} fontWeight={700}>{unit||"g"}</text>}
    </svg>
    <div style={{fontSize:12,fontWeight:700,color:tc?"rgba(255,255,255,0.85)":C.t2,marginTop:4}}>{l}</div>
  </div>;
}

function MealCard({meal}){
  const [open,setOpen]=useState(false);
  const t=meal.items.reduce((a,i)=>({p:a.p+i.p,c:a.c+i.c,f:a.f+i.f,fiber:a.fiber+i.fiber,cal:a.cal+i.cal}),{p:0,c:0,f:0,fiber:0,cal:0});
  const total=t.p+t.c+t.f+t.fiber||1;
  return <div style={{...card,cursor:"pointer"}} onClick={()=>setOpen(!open)}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flex:"1 1 auto",minWidth:0}}>
        <MealIcon id={meal.id} size={20}/>
        <span style={{fontSize:15,fontWeight:800,color:C.t1}}>{meal.name}</span>
        <span style={{fontSize:12,fontWeight:600,color:C.t3}}>{meal.items.length} món</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:18,fontWeight:900,color:C.red}}>{Math.round(t.cal)}</span>
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
      <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr",gap:4,fontSize:11,fontWeight:700,paddingBottom:6,marginBottom:4,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.05em"}}>
        <span style={{color:C.t3}}>Thức ăn</span><span style={{color:C.t3,textAlign:"right"}}>Lượng</span>
        <span style={{color:C.protein,textAlign:"right"}}>P</span><span style={{color:C.carb,textAlign:"right"}}>C</span>
        <span style={{color:C.t2,textAlign:"right"}}>F</span><span style={{color:C.t2,textAlign:"right"}}>Cal</span>
      </div>
      {meal.items.map((item,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr",gap:4,fontSize:13,fontWeight:600,padding:"6px 0",borderBottom:i<meal.items.length-1?`1px solid ${C.border}`:"none"}}>
        <span style={{color:C.t1,fontWeight:700}}>{item.food}</span>
        <span style={{color:C.t3,textAlign:"right"}}>{item.qty_display?item.qty_display:item.gram?(item.gram+(item.unit==="ml"?"ml":"g")):""}</span>
        <span style={{color:C.protein,textAlign:"right"}}>{item.p}</span>
        <span style={{color:C.carb,textAlign:"right"}}>{item.c}</span>
        <span style={{color:C.t1,textAlign:"right"}}>{item.f}</span>
        <span style={{color:C.t1,textAlign:"right",fontWeight:800}}>{item.cal}</span>
      </div>)}
      <div style={{display:"grid",gridTemplateColumns:"2fr 0.7fr 0.7fr 0.7fr 0.7fr 0.8fr",gap:4,fontSize:13,fontWeight:900,paddingTop:8,marginTop:4,borderTop:`2px solid ${C.red}`}}>
        <span style={{color:C.red}}>Tổng</span><span/>
        <span style={{color:C.protein,textAlign:"right"}}>{Math.round(t.p*10)/10}</span>
        <span style={{color:C.carb,textAlign:"right"}}>{Math.round(t.c*10)/10}</span>
        <span style={{color:C.t1,textAlign:"right"}}>{Math.round(t.f*10)/10}</span>
        <span style={{color:C.t1,textAlign:"right"}}>{Math.round(t.cal)}</span>
      </div>
    </div>}
  </div>;
}

function Dashboard({weightLog,profile,macro,getMeals}){if(!profile||!macro)return null;
  const [dayType,setDayType]=useState("train");
  const mob=useIsMobile();
  const meals=getMeals(dayType);
  const totals=meals.reduce((acc,m)=>{const mt=m.items.reduce((a,i)=>({p:a.p+i.p,c:a.c+i.c,f:a.f+i.f,fiber:a.fiber+i.fiber,cal:a.cal+i.cal}),{p:0,c:0,f:0,fiber:0,cal:0});return{p:acc.p+mt.p,c:acc.c+mt.c,f:acc.f+mt.f,fiber:acc.fiber+mt.fiber,cal:acc.cal+mt.cal};},{p:0,c:0,f:0,fiber:0,cal:0});
  // Macro từ công thức: P/F/Xơ cố định, Carb thay đổi theo ngày
  const heroP=macro.protein, heroF=macro.fat, heroFiber=macro.fiber;
  const heroC=dayType==="train"?macro.carb:macro.carbRest;
  const heroCal=dayType==="train"?macro.calTarget:macro.calRest;
  const target=macro.calTarget,calPct=Math.min((heroCal/target)*100,100),goalKg=profile.goalKg,startKg=weightLog.length>0?weightLog[0].kg:profile.kg,curKg=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg,wPct=goalKg!==startKg?((curKg-startKg)/(goalKg-startKg))*100:0;
  const actualCal=Math.round(totals.cal), actualP=Math.round(totals.p), actualC=Math.round(totals.c), actualF=Math.round(totals.f), actualFiber=Math.round(totals.fiber);
  const calDiff=actualCal-heroCal, calStatus=actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"✅":actualCal<heroCal*0.95?"⚠️":"🔴";
  return <div>
    {/* Hero */}
    <div style={{...card,padding:mob?"16px":"24px",background:"linear-gradient(135deg,#111 0%,#2A0E0E 100%)",border:"2.5px solid #DC2626",boxShadow:"0 4px 24px rgba(220,38,38,0.15)"}}>
      <div style={{display:"flex",flexDirection:mob?"column":"row",justifyContent:"space-between",alignItems:mob?"stretch":"flex-start",gap:mob?14:0}}>
        <div>
          <div style={{fontSize:mob?11:13,fontWeight:900,color:"#EAB308",letterSpacing:"0.12em",textTransform:"uppercase"}}>{dayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div>
          <div style={{fontSize:mob?32:44,fontWeight:900,color:"#FFF",letterSpacing:"-0.03em",lineHeight:1.1,marginTop:8}}>
            {actualCal>0?actualCal:heroCal} <span style={{fontSize:mob?14:20,fontWeight:700,color:"rgba(255,255,255,0.7)"}}>/ {heroCal}</span>
          </div>
          {actualCal>0&&<div style={{fontSize:12,fontWeight:700,marginTop:4,color:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"#4ADE80":actualCal<heroCal*0.95?"#EAB308":"#EF4444"}}>
            {calStatus} {calDiff>0?`+${calDiff}`:`${calDiff}`} kcal ({Math.round(actualCal/heroCal*100)}%)
          </div>}
          <div style={{height:mob?8:10,width:mob?"100%":180,background:"rgba(255,255,255,0.18)",borderRadius:5,marginTop:mob?8:10,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(actualCal>0?(actualCal/heroCal)*100:calPct,120)}%`,background:actualCal>heroCal*1.1?"#EF4444":"linear-gradient(90deg,#DC2626,#EAB308)",borderRadius:5,transition:"width 0.4s"}}/>
          </div>
        </div>
        <div style={{display:"flex",gap:mob?8:14,justifyContent:mob?"space-around":"flex-end"}}>
          <MacroRing l="Protein" v={actualP>0?actualP:heroP} max={heroP} color="#EF4444" color2="#F97316" track="rgba(255,255,255,0.18)" tc="#FFF" sub={actualP>0?`/${heroP}g`:null} unit="g"/>
          <MacroRing l="Carb" v={actualC>0?actualC:heroC} max={heroC} color="#EAB308" color2="#F59E0B" track="rgba(255,255,255,0.18)" tc="#FFF" sub={actualC>0?`/${heroC}g`:null} unit="g"/>
          <MacroRing l="Fat" v={actualF>0?actualF:heroF} max={heroF} color="#8B5CF6" color2="#A78BFA" track="rgba(255,255,255,0.18)" tc="#FFF" sub={actualF>0?`/${heroF}g`:null} unit="g"/>
          <MacroRing l="Xơ" v={actualFiber>0?actualFiber:heroFiber} max={heroFiber} color="#22C55E" color2="#4ADE80" track="rgba(255,255,255,0.18)" tc="#FFF" sub={actualFiber>0?`/${heroFiber}g`:null} unit="g"/>
        </div>
      </div>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:12}}>
      {[{l:"Chiều cao",v:profile.cm,u:"cm",c:C.blue},{l:"Cân nặng",v:curKg,u:"kg",c:C.red},{l:"BMI",v:macro.bmi,u:"",c:C.gold},{l:"Gym",v:profile.gym,u:"/tuần",c:C.green}].map((s,i)=>(
        <div key={i} style={{...card,padding:"10px 14px",marginBottom:0,borderLeft:`4px solid ${s.c}`}}>
          <div style={{...lbl,color:s.c}}>{s.l}</div>
          <div style={{fontSize:20,fontWeight:900,color:C.t1,marginTop:2}}>{s.v}<span style={{fontSize:11,fontWeight:700,color:C.t3}}>{s.u}</span></div>
        </div>
      ))}
    </div>

    <div style={{display:"flex",gap:6,marginBottom:12}}>
      <Pill active={dayType==="train"} color={C.red} onClick={()=>setDayType("train")}>💪 Ngày tập</Pill>
      <Pill active={dayType==="rest"} color={C.green} onClick={()=>setDayType("rest")}>😴 Ngày nghỉ</Pill>
    </div>

    {meals.map(m=><MealCard key={m.id} meal={m}/>)}

    {/* Compact evaluation */}
    {actualCal>0&&<div style={{...card,padding:"12px 16px",marginTop:6,
      background:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?C.greenBg:actualCal<heroCal*0.95?C.goldBg:C.redBg,
      border:`2px solid ${actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?C.green:actualCal<heroCal*0.95?C.gold:C.red}`,
    }}>
      <div style={{fontSize:13,fontWeight:800,lineHeight:1.6,
        color:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?C.green:actualCal<heroCal*0.95?"#92400E":C.red,
      }}>
        {actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1
          ?"✓ Thực đơn phù hợp với mục tiêu!"
          :actualCal<heroCal*0.95
          ?`⚠ Thiếu ${heroCal-actualCal} kcal (${100-Math.round(actualCal/heroCal*100)}%). Bổ sung thêm thức ăn.`
          :`🔴 Thừa ${actualCal-heroCal} kcal (+${Math.round(actualCal/heroCal*100)-100}%). Giảm bớt khẩu phần.`
        }
        {actualP<heroP*0.9&&` | Protein thiếu ${heroP-actualP}g.`}
      </div>
    </div>}

    {heroCal<target&&<div style={{...card,background:C.goldBg,border:"2px solid #CA8A04"}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:16,fontWeight:900,color:"#EAB308"}}>⚡</span>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:"#92400E",marginBottom:2}}>Gợi ý AI</div>
          <div style={{fontSize:14,fontWeight:600,color:"#78350F",lineHeight:1.5}}>Thiếu {target-heroCal} cal. Thêm sữa tươi không đường (+120 cal) hoặc 30g hạt điều (+175 cal).</div>
        </div>
      </div>
    </div>}

    {/* Weight */}
    <div style={{...card,marginTop:6,borderTop:"3px solid",borderImage:"linear-gradient(90deg,#DC2626,#EAB308) 1"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:17,fontWeight:900,color:C.blue}}>📈 Theo dõi cân nặng</div>
        <div style={{fontSize:13,fontWeight:700,color:C.t2}}>🎯 <span style={{color:C.red,fontWeight:900}}>{goalKg} kg</span></div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",flexWrap:mob?"wrap":"nowrap"}}>
        {weightLog.slice(-4).map((w,i)=>{const ci=weightLog.indexOf(w);return(
          <div key={ci} style={{flex:mob?"1 1 calc(50% - 4px)":"1",minWidth:mob?0:70,borderRadius:12,padding:"12px 8px",textAlign:"center",background:C.card,border:`2px solid ${wColors[ci%wColors.length]}`,boxShadow:`0 2px 8px ${wColors[ci%wColors.length]}22`}}>
            <div style={{fontSize:11,fontWeight:900,color:wColors[ci%wColors.length],textTransform:"uppercase"}}>Tuần {w.week}</div>
            <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:2}}>{w.date}</div>
            <div style={{fontSize:20,fontWeight:900,color:C.t1,marginTop:4}}>{w.kg}</div>
            {w.delta?<div style={{fontSize:12,fontWeight:800,color:w.delta>0?C.green:C.red,marginTop:2}}>{w.delta>0?"+":""}{w.delta} kg</div>:<div style={{fontSize:12,fontWeight:600,color:C.t3,marginTop:2}}>Bắt đầu</div>}
          </div>
        );})}
      </div>
      <div style={{height:8,background:"#E0E0E0",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.max(0,Math.min(Math.round(wPct),100))}%`,background:"linear-gradient(90deg,#DC2626,#EAB308)",borderRadius:4,transition:"width 0.4s"}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:800,color:C.t3,marginTop:4}}>
        <span>{startKg} kg</span><span>{goalKg} kg</span>
      </div>
      <div style={{...card,background:C.goldBg,border:"1.5px solid #CA8A04",marginTop:10,marginBottom:0,padding:"10px 14px"}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{fontSize:16,fontWeight:900,color:"#EAB308"}}>⚡</span>
          <span style={{fontSize:13,fontWeight:700,color:"#78350F",lineHeight:1.5}}>{weightLog.length>=2?(()=>{
            const last=weightLog[weightLog.length-1],prev=weightLog[weightLog.length-2];
            const d=Math.round((last.kg-prev.kg)*10)/10;
            return d>0&&d<=0.5?`+${d}kg tuần này — tốc độ lý tưởng tăng cơ. Giữ nguyên chế độ!`:d>0.5?`+${d}kg tuần này — hơi nhanh, cẩn thận tích mỡ bụng.`:d<0?`${d}kg tuần này — đang giảm, kiểm tra lại calo.`:"Giữ nguyên cân nặng tuần này.";
          })():"Chưa đủ dữ liệu để phân tích."}</span>
        </div>
      </div>
    </div>
  </div>;
}

function WeightRow({w,i,weightLog,setWeightLog,setProfile,profile,deleteWeight}){
  const [editing,setEditing]=useState(false);
  const [editVal,setEditVal]=useState(w.kg);
  return <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.1fr 0.7fr 0.5fr 0.8fr",gap:4,padding:"8px 0",fontSize:13,borderBottom:i<weightLog.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
    <span style={{fontWeight:800,color:wColors[i%wColors.length]}}>T{w.week}</span>
    <span style={{fontWeight:600,color:C.t2,fontSize:11}}>{w.date}</span>
    {editing
      ?<input type="text" inputMode="decimal" value={editVal} onChange={e=>{const v=e.target.value.replace(/[^0-9.]/g,"");setEditVal(v===""?0:Number(v));}} style={{padding:"4px 6px",fontSize:16,textAlign:"right",border:`1.5px solid ${C.border}`,borderRadius:6,background:C.surface,color:C.t1,outline:"none",width:"100%",boxSizing:"border-box"}}/>
      :<span style={{color:C.t1,fontWeight:900,textAlign:"right"}}>{w.kg}</span>
    }
    <span style={{color:w.delta?w.delta>0?C.green:C.red:C.t3,fontWeight:700,fontSize:12,textAlign:"right"}}>{w.delta?`${w.delta>0?"+":""}${w.delta}`:"-"}</span>
    <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
      {editing
        ?<button onClick={()=>{
            const updated=weightLog.map((x,j)=>{
              if(j!==i)return x;
              const prevKg=j>0?weightLog[j-1].kg:editVal;
              return {...x,kg:editVal,delta:Math.round((editVal-prevKg)*10)/10||null};
            });
            setWeightLog(updated);
            setProfile({...profile,kg:updated[updated.length-1].kg});
            setEditing(false);
          }} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.greenBg,color:C.green,border:`1px solid ${C.green}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
        :<button onClick={()=>setEditing(true)} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.goldBg,color:C.gold,border:`1px solid ${C.gold}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✎</button>
      }
      <button onClick={()=>{
        if(w.id){deleteWeight(w.id);}
        else{const updated=weightLog.filter((_,j)=>j!==i).map((x,j)=>({...x,week:j+1}));setWeightLog(updated);}
        if(weightLog.length>1)setProfile({...profile,kg:weightLog[weightLog.length-2].kg});
      }} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.redBg,color:C.red,border:`1px solid ${C.red}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
    </div>
  </div>;
}

function AdminPanel({weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile,macro,saveMealToCloud,saveFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting}){if(!profile||!macro)return null;
  const mob=useIsMobile();
  const [section,setSection]=useState("meals");
  const [dayType,setDayType]=useState("train");
  const [selectedMeal,setSelectedMeal]=useState("sang");
  const [foodItems,setFoodItems]=useState(()=>{
    const meals=getMeals("train");
    const meal=meals.find(m=>m.id==="sang");
    if(meal&&meal.items&&meal.items.length>0) return meal.items.map(it=>({name:it.food||it.name||"",qty:1,gram:it.gram||100}));
    return [{name:"",qty:1,gram:100}];
  });
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState(null);
  // Use shared keys from Supabase, fallback to localStorage for admin override
  const [aiProvider,setAiProvider]=useState(()=>localStorage.getItem("aiProvider")||appSettings.ai_provider||"claude");
  const [aiModel,setAiModel]=useState(()=>appSettings.ai_model||"claude-sonnet-4-20250514");
  const [geminiModel,setGeminiModel]=useState("gemini-3.5-flash");
  const [gptModel,setGptModel]=useState("gpt-4o-mini");
  const [aiConnected,setAiConnected]=useState(true);
  // Shared keys: appSettings > localStorage
  const [claudeKey,setClaudeKey]=useState(()=>appSettings.claude_key||localStorage.getItem("claudeKey")||"");
  const [geminiKey,setGeminiKey]=useState(()=>appSettings.gemini_key||localStorage.getItem("geminiKey")||"");
  const [gptKey,setGptKey]=useState(()=>appSettings.gpt_key||localStorage.getItem("gptKey")||"");
  const [usdaKey,setUsdaKey]=useState(()=>appSettings.usda_key||localStorage.getItem("usdaKey")||"");

  // Sync appSettings when they load (async)
  useEffect(()=>{
    if(appSettings.ai_provider&&!localStorage.getItem("aiProvider"))setAiProvider(appSettings.ai_provider);
    if(appSettings.claude_key&&!claudeKey)setClaudeKey(appSettings.claude_key);
    if(appSettings.gemini_key&&!geminiKey)setGeminiKey(appSettings.gemini_key);
    if(appSettings.gpt_key&&!gptKey)setGptKey(appSettings.gpt_key);
    if(appSettings.usda_key&&!usdaKey)setUsdaKey(appSettings.usda_key);
  },[appSettings]);

  // Admin: save to both localStorage and Supabase
  useEffect(()=>{
    localStorage.setItem("aiProvider",aiProvider);
    if(isAdmin){
      localStorage.setItem("claudeKey",claudeKey);localStorage.setItem("geminiKey",geminiKey);localStorage.setItem("gptKey",gptKey);localStorage.setItem("usdaKey",usdaKey);
    }
  },[aiProvider,claudeKey,geminiKey,gptKey,usdaKey,isAdmin]);

  // Stable ref to getMeals to avoid unnecessary effect reruns
  const getMealsRef=useRef(getMeals);
  getMealsRef.current=getMeals;

  // Only reload food items when user switches meal or dayType
  useEffect(()=>{
    const meals=getMealsRef.current(dayType);
    const meal=meals.find(m=>m.id===selectedMeal);
    if(meal&&meal.items&&meal.items.length>0){
      setFoodItems(meal.items.map(it=>({name:it.food||it.name||"",qty:it.qty||1,gram:it.gram||100,unit:it.unit||"g"})));
    }else{
      setFoodItems([{name:"",qty:1,gram:100}]);
    }
    setAiResult(null);
  },[selectedMeal,dayType]);

  const addFood=()=>setFoodItems([...foodItems,{name:"",qty:1,gram:100,unit:"g"}]);
  const removeFood=(idx)=>setFoodItems(foodItems.filter((_,i)=>i!==idx));
  const updateFood=(idx,field,val)=>{const u=[...foodItems];u[idx]={...u[idx],[field]:val};setFoodItems(u);};

  const prompt=`Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Trả lời CHÍNH XÁC bằng JSON, không markdown:
{"items":[{"name":"tên","gram":số,"protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym tăng cơ"}`;

  const callAI=useCallback(async()=>{
    if(foodItems.length===0||foodItems.every(f=>!f.name.trim()))return;
    setAiLoading(true);setAiError(null);setAiResult(null);
    const fc=foodCache||{};
    const validItems=foodItems.filter(f=>f.name.trim());
    const cached=[];const uncached=[];
    validItems.forEach(f=>{
      const unit=f.unit||"g";const isWeight=unit==="g"||unit==="ml";
      // Bug 3 fix: cache always stores per-unit (1 quả) or per-100g. Key = food name only.
      const k=f.name.toLowerCase().trim();
      if(fc[k]){
        const qty=f.qty||1;
        if(isWeight){
          // Scale from per-100g
          const r=f.gram/(fc[k].gram||100);
          cached.push({name:f.name,gram:f.gram,unit,qty,qty_display:null,protein:Math.round(fc[k].p*r*10)/10,carb:Math.round(fc[k].c*r*10)/10,fat:Math.round(fc[k].f*r*10)/10,fiber:Math.round((fc[k].fiber||0)*r*10)/10,cal:Math.round(fc[k].cal*r)});
        }else{
          // Scale from per-1-unit by qty
          cached.push({name:f.name,gram:Math.round((fc[k].gram||0)*qty),unit,qty,qty_display:`${qty} ${unit}`,protein:Math.round(fc[k].p*qty*10)/10,carb:Math.round(fc[k].c*qty*10)/10,fat:Math.round(fc[k].f*qty*10)/10,fiber:Math.round((fc[k].fiber||0)*qty*10)/10,cal:Math.round(fc[k].cal*qty)});
        }
      }else{uncached.push(f);}
    });
    if(uncached.length===0){setAiResult({items:cached,tip:"📦 Tất cả từ cache — không gọi API!"});setAiLoading(false);return;}

    // Try USDA first for uncached items
    const usdaResolved=[];const stillUncached=[];
    if(usdaKey){
      for(const f of uncached){
        try{
          const result=await searchUSDA(f.name,usdaKey);
          if(result){
            const unit=f.unit||"g";const isWeight=unit==="g"||unit==="ml";
            const macro=calcFromUSDA(result,f.gram,f.qty,unit);
            usdaResolved.push({name:f.name,gram:isWeight?f.gram:0,unit,qty:f.qty,qty_display:isWeight?null:`${f.qty} ${unit}`,...macro,source:"USDA"});
          }else{stillUncached.push(f);}
        }catch(e){console.error("USDA error:",e);stillUncached.push(f);}
      }
    }else{stillUncached.push(...uncached);}

    const allResolved=[...cached,...usdaResolved];
    if(stillUncached.length===0){
      // Build normalized cache entries for USDA items
      const usdaCacheEntries={};
      usdaResolved.forEach(it=>{
        const k=(it.name||"").toLowerCase().trim();
        const inputItem=uncached.find(f=>f.name.toLowerCase().trim()===k);
        const unit=inputItem?.unit||"g";const isWeight=unit==="g"||unit==="ml";
        const qty=inputItem?.qty||1;
        if(k){
          if(isWeight){
            const gram=inputItem?.gram||100;const r=100/gram;
            usdaCacheEntries[k]={p:Math.round((it.protein||0)*r*10)/10,c:Math.round((it.carb||0)*r*10)/10,f:Math.round((it.fat||0)*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round((it.cal||0)*r),gram:100};
          }else{
            usdaCacheEntries[k]={p:Math.round((it.protein||0)/qty*10)/10,c:Math.round((it.carb||0)/qty*10)/10,f:Math.round((it.fat||0)/qty*10)/10,fiber:Math.round((it.fiber||0)/qty*10)/10,cal:Math.round((it.cal||0)/qty),gram:Math.round((it.gram||0)/qty)};
          }
        }
      });
      setAiResult({items:allResolved,tip:usdaResolved.length>0?`🏛️ ${usdaResolved.length} món từ USDA${cached.length>0?`, ${cached.length} từ cache`:""}`:"",...(Object.keys(usdaCacheEntries).length>0?{_cacheEntries:usdaCacheEntries}:{})});
      setAiLoading(false);return;
    }

    const foodDesc=stillUncached.map(f=>{
      const unit=f.unit||"g";
      if(unit==="g"||unit==="ml") return `${f.qty>1?f.qty+" ":""}${f.name} ${f.gram}${unit}`;
      return `${f.qty} ${unit} ${f.name}`;
    }).join(", ");
    try{
      let text="";
      if(aiProvider==="claude"){
        const headers={"Content-Type":"application/json","anthropic-version":"2023-06-01"};
        if(claudeKey)headers["x-api-key"]=claudeKey;
        const res=await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",headers,
          body:JSON.stringify({model:aiModel,max_tokens:1000,messages:[{role:"user",content:`${prompt}\nThức ăn: ${foodDesc}`}]})
        });
        const data=await res.json();
        if(data.error)throw new Error(data.error.message);
        text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
      } else if(aiProvider==="gemini"){
        if(!geminiKey)throw new Error("Chưa nhập Gemini API Key");
        const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({contents:[{parts:[{text:`${prompt}\nThức ăn: ${foodDesc}`}]}]})
        });
        const data=await res.json();
        if(data.error)throw new Error(data.error.message);
        text=data.candidates?.[0]?.content?.parts?.[0]?.text||"";
      } else if(aiProvider==="gpt"){
        if(!gptKey)throw new Error("Chưa nhập OpenAI API Key");
        const res=await fetch("https://api.openai.com/v1/chat/completions",{
          method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${gptKey}`},
          body:JSON.stringify({model:gptModel,messages:[{role:"user",content:`${prompt}\nThức ăn: ${foodDesc}`}],max_completion_tokens:1000})
        });
        const data=await res.json();
        if(data.error)throw new Error(data.error.message);
        text=data.choices?.[0]?.message?.content||"";
      }
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      const newItems=[...allResolved,...(parsed.items||[])];
      const newCacheEntries={};
      parsed.items.forEach(it=>{
        const k=(it.name||"").toLowerCase().trim();
        // Find matching input to get unit info
        const inputItem=uncached.find(f=>f.name.toLowerCase().trim()===k);
        const unit=inputItem?.unit||it.unit||"g";const isWeight=unit==="g"||unit==="ml";
        const qty=inputItem?.qty||1;
        if(k){
          if(isWeight){
            // Store as-is (AI returns for the requested gram amount, normalize to per-100g)
            const gram=it.gram||inputItem?.gram||100;
            const r=100/gram;
            const entry={p:Math.round(it.protein*r*10)/10,c:Math.round(it.carb*r*10)/10,f:Math.round(it.fat*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round(it.cal*r),gram:100};
            fc[k]=entry; newCacheEntries[k]=entry;
          }else{
            // Store per-1-unit (divide by qty)
            const entry={p:Math.round(it.protein/qty*10)/10,c:Math.round(it.carb/qty*10)/10,f:Math.round(it.fat/qty*10)/10,fiber:Math.round((it.fiber||0)/qty*10)/10,cal:Math.round(it.cal/qty),gram:Math.round((it.gram||0)/qty)};
            fc[k]=entry; newCacheEntries[k]=entry;
          }
        }
      });
      // Also cache USDA-resolved items
      usdaResolved.forEach(it=>{
        const k=(it.name||"").toLowerCase().trim();
        const inputItem=uncached.find(f=>f.name.toLowerCase().trim()===k);
        const unit=inputItem?.unit||"g";const isWeight=unit==="g"||unit==="ml";
        const qty=inputItem?.qty||1;
        if(k&&!fc[k]){
          if(isWeight){
            const gram=inputItem?.gram||100;const r=100/gram;
            const entry={p:Math.round((it.protein||0)*r*10)/10,c:Math.round((it.carb||0)*r*10)/10,f:Math.round((it.fat||0)*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round((it.cal||0)*r),gram:100};
            fc[k]=entry; newCacheEntries[k]=entry;
          }else{
            const entry={p:Math.round((it.protein||0)/qty*10)/10,c:Math.round((it.carb||0)/qty*10)/10,f:Math.round((it.fat||0)/qty*10)/10,fiber:Math.round((it.fiber||0)/qty*10)/10,cal:Math.round((it.cal||0)/qty),gram:Math.round((it.gram||0)/qty)};
            fc[k]=entry; newCacheEntries[k]=entry;
          }
        }
      });
      setAiResult({items:newItems,tip:parsed.tip||(cached.length>0?`📦 ${cached.length} món từ cache`:""),_cacheEntries:newCacheEntries});
    }catch(err){setAiError(err.message||"Lỗi kết nối AI");console.error(err);}
    finally{setAiLoading(false);}
  },[foodItems,aiModel,aiProvider,claudeKey,geminiKey,gptKey,geminiModel,gptModel,foodCache,usdaKey]);

  const mealNames=dayType==="train"
    ?[{id:"sang",l:"🌅 Sáng"},{id:"trua",l:"☀️ Trưa"},{id:"phu1",l:"☕ Phụ 1"},{id:"phu2",l:"💪 Phụ 2"},{id:"toi",l:"🌙 Tối"}]
    :[{id:"sang",l:"🌅 Sáng"},{id:"trua",l:"☀️ Trưa"},{id:"phu1",l:"☕ Phụ 1"},{id:"toi",l:"🌙 Tối"}];

  const providerName=aiProvider==="claude"?"Claude":aiProvider==="gemini"?"Gemini":"GPT";

  return <div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{id:"meals",l:"🍽️ Bữa ăn"},{id:"ai",l:"🤖 Kết nối AI"},{id:"profile",l:"👤 Hồ sơ"},{id:"schedule",l:"📅 Lịch tập"},{id:"weight",l:"⚖️ Cân nặng"}].map(s=>
        <Pill key={s.id} active={section===s.id} color={C.red} onClick={()=>setSection(s.id)}>{s.l}</Pill>
      )}
    </div>

    {/* AI CONNECTION */}
    {section==="ai"&&<div style={card}>
      <div style={{fontSize:17,fontWeight:900,color:C.blue,marginBottom:4}}>🤖 Kết nối AI</div>
      <div style={{fontSize:13,fontWeight:600,color:C.t2,marginBottom:20}}>Chọn AI provider và model để tính macro</div>

      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"12px 16px",background:aiConnected?C.greenBg:C.redBg,borderRadius:10,border:`1.5px solid ${aiConnected?C.green:C.red}`}}>
        <div style={{width:12,height:12,borderRadius:"50%",background:aiConnected?C.green:C.red}}/>
        <span style={{fontSize:14,fontWeight:800,color:aiConnected?"#14532D":"#7F1D1D"}}>{aiConnected?"Đã kết nối":"Chưa kết nối"} — {providerName}</span>
      </div>

      {/* Provider */}
      <div style={{...lbl,marginBottom:8}}>Chọn AI Provider</div>
      <div style={{display:"flex",flexDirection:mob?"column":"row",gap:8,marginBottom:20}}>
        {[
          {id:"claude",name:"Claude",desc:"Anthropic"},
          {id:"gemini",name:"Gemini",desc:"Google"},
          {id:"gpt",name:"GPT",desc:"OpenAI"},
        ].map(p=>{
          const logos={
            claude:<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#D97706"/><text x="14" y="15" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="16" fontWeight="900" fontFamily="serif">C</text></svg>,
            gemini:<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#4285F4"/><path d="M14 4 C20 10, 20 18, 14 24 C8 18, 8 10, 14 4Z" fill="#fff" opacity="0.9"/></svg>,
            gpt:<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#10A37F"/><text x="14" y="15" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="11" fontWeight="900">GPT</text></svg>,
          };
          return <div key={p.id} onClick={()=>{setAiProvider(p.id);if(p.id==="claude")setAiModel("claude-sonnet-4-20250514");}} style={{
          flex:1,padding:"14px 12px",borderRadius:12,cursor:"pointer",textAlign:"center",
          background:aiProvider===p.id?C.redBg:C.surface,
          border:aiProvider===p.id?`2.5px solid ${C.red}`:`1.5px solid ${C.border}`,
        }}>
          <div style={{display:"flex",justifyContent:"center"}}>{logos[p.id]}</div>
          <div style={{fontSize:14,fontWeight:900,color:C.t1,marginTop:4}}>{p.name}</div>
          <div style={{fontSize:11,fontWeight:600,color:C.t3}}>{p.desc}</div>
        </div>;})}
      </div>

      {/* Model select for Claude */}
      {aiProvider==="claude"&&<>
        <div style={{...lbl,marginBottom:8}}>Chọn model Claude</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {[
            {id:"claude-sonnet-4-20250514",name:"Claude Sonnet 4",desc:"Nhanh, chính xác",badge:"Khuyên dùng",bc:C.goldBg,btc:"#92400E"},
            {id:"claude-haiku-4-5-20251001",name:"Claude Haiku 4.5",desc:"Siêu nhanh, tiết kiệm",badge:"Tiết kiệm",bc:C.greenBg,btc:"#14532D"},
            {id:"claude-opus-4-6",name:"Claude Opus 4.6",desc:"Mạnh nhất",badge:"Cao cấp",bc:C.redBg,btc:"#7F1D1D"},
          ].map(m=><div key={m.id} onClick={()=>setAiModel(m.id)} style={{
            padding:"14px 16px",borderRadius:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
            background:aiModel===m.id?C.redBg:C.surface,border:aiModel===m.id?`2px solid ${C.red}`:`1.5px solid ${C.border}`,
          }}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.t1}}>{m.name}</div>
              <div style={{fontSize:12,fontWeight:600,color:C.t2,marginTop:2}}>{m.desc}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:m.bc,color:m.btc}}>{m.badge}</span>
              {aiModel===m.id&&<div style={{width:22,height:22,borderRadius:"50%",background:C.red,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:900}}>✓</div>}
            </div>
          </div>)}
        </div>
        {isAdmin&&<div style={{marginBottom:16}}>
          <div style={{...lbl,marginBottom:6}}>Claude API Key</div>
          <input type="password" value={claudeKey} onChange={e=>setClaudeKey(e.target.value)} placeholder="sk-ant-api03-..." style={inp}/>
          <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:4}}>Lấy key tại <span style={{color:C.blue,fontWeight:700}}>console.anthropic.com</span> — Để trống nếu chạy trong Claude.ai</div>
        </div>}
      </>}

      {/* Gemini */}
      {aiProvider==="gemini"&&<>
        <div style={{...lbl,marginBottom:8}}>Chọn model Gemini</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {[
            {id:"gemini-2.5-flash",name:"Gemini 2.5 Flash",desc:"Nhanh, rẻ, thinking model",badge:"Tiết kiệm",bc:C.greenBg,btc:"#14532D"},
            {id:"gemini-3.5-flash",name:"Gemini 3.5 Flash",desc:"Mới nhất, agentic + coding",badge:"Khuyên dùng",bc:C.goldBg,btc:"#92400E"},
            {id:"gemini-3.1-pro",name:"Gemini 3.1 Pro",desc:"Reasoning mạnh nhất",badge:"Cao cấp",bc:C.redBg,btc:"#7F1D1D"},
          ].map(m=><div key={m.id} onClick={()=>setGeminiModel(m.id)} style={{
            padding:"14px 16px",borderRadius:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
            background:geminiModel===m.id?C.blueBg:C.surface,border:geminiModel===m.id?`2px solid ${C.blue}`:`1.5px solid ${C.border}`,
          }}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.t1}}>{m.name}</div>
              <div style={{fontSize:12,fontWeight:600,color:C.t2,marginTop:2}}>{m.desc}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:m.bc,color:m.btc}}>{m.badge}</span>
              {geminiModel===m.id&&<div style={{width:22,height:22,borderRadius:"50%",background:C.blue,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:900}}>✓</div>}
            </div>
          </div>)}
        </div>
        {isAdmin&&<div style={{marginBottom:16}}>
          <div style={{...lbl,marginBottom:6}}>Gemini API Key</div>
          <input type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={inp}/>
          <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:4}}>Lấy key tại <span style={{color:C.blue,fontWeight:700}}>aistudio.google.com</span></div>
        </div>}
      </>}

      {/* GPT */}
      {aiProvider==="gpt"&&<>
        <div style={{...lbl,marginBottom:8}}>Chọn model OpenAI</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {[
            {id:"gpt-4o-mini",name:"GPT-4o Mini",desc:"Nhanh, rẻ nhất",badge:"Tiết kiệm",bc:C.greenBg,btc:"#14532D"},
            {id:"gpt-5.5-instant",name:"GPT-5.5 Instant",desc:"Mặc định ChatGPT, ít hallucinate",badge:"Khuyên dùng",bc:C.goldBg,btc:"#92400E"},
            {id:"gpt-5.5",name:"GPT-5.5",desc:"Mạnh nhất, agentic + coding",badge:"Cao cấp",bc:C.redBg,btc:"#7F1D1D"},
          ].map(m=><div key={m.id} onClick={()=>setGptModel(m.id)} style={{
            padding:"14px 16px",borderRadius:12,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",
            background:gptModel===m.id?C.greenBg:C.surface,border:gptModel===m.id?`2px solid ${C.green}`:`1.5px solid ${C.border}`,
          }}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.t1}}>{m.name}</div>
              <div style={{fontSize:12,fontWeight:600,color:C.t2,marginTop:2}}>{m.desc}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:m.bc,color:m.btc}}>{m.badge}</span>
              {gptModel===m.id&&<div style={{width:22,height:22,borderRadius:"50%",background:C.green,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:900}}>✓</div>}
            </div>
          </div>)}
        </div>
        {isAdmin&&<div style={{marginBottom:16}}>
          <div style={{...lbl,marginBottom:6}}>OpenAI API Key</div>
          <input type="password" value={gptKey} onChange={e=>setGptKey(e.target.value)} placeholder="sk-..." style={inp}/>
          <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:4}}>Lấy key tại <span style={{color:C.blue,fontWeight:700}}>platform.openai.com</span></div>
        </div>}
      </>}

      {/* USDA */}
      <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:16,marginTop:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:900,color:"#92400E",marginBottom:8}}>🏛️ USDA FoodData Central (Ưu tiên)</div>
        <div style={{fontSize:12,fontWeight:600,color:C.t3,marginBottom:8}}>Dữ liệu macro chuẩn từ Bộ Nông nghiệp Mỹ. Tra USDA trước, không có thì fallback AI.</div>
        {isAdmin&&<><div style={{...lbl,marginBottom:6}}>USDA API Key</div>
        <input type="password" value={usdaKey} onChange={e=>setUsdaKey(e.target.value)} placeholder="Nhập USDA key..." style={inp}/>
        <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:4}}>Đăng ký miễn phí tại <span style={{color:C.blue,fontWeight:700}}>fdc.nal.usda.gov/api-key-signup</span></div></>}
        {usdaKey&&<div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,padding:"8px 12px",background:C.greenBg,borderRadius:8,border:`1px solid ${C.green}`}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:C.green}}/>
          <span style={{fontSize:12,fontWeight:700,color:"#14532D"}}>USDA đã kết nối — ưu tiên tra cứu trước AI</span>
        </div>}
      </div>

      <button onClick={async()=>{
        setAiConnected(false);
        try{
          if(aiProvider==="claude"){
            const headers={"Content-Type":"application/json","anthropic-version":"2023-06-01"};
            if(claudeKey)headers["x-api-key"]=claudeKey;
            const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers,body:JSON.stringify({model:aiModel,max_tokens:50,messages:[{role:"user",content:"OK"}]})});
            const d=await r.json();setAiConnected(!d.error);
          }else if(aiProvider==="gemini"){
            if(!geminiKey){setAiConnected(false);return;}
            const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"OK"}]}]})});
            const d=await r.json();setAiConnected(!d.error);
          }else{
            if(!gptKey){setAiConnected(false);return;}
            const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${gptKey}`},body:JSON.stringify({model:gptModel,messages:[{role:"user",content:"OK"}],max_tokens:10})});
            const d=await r.json();setAiConnected(!d.error);
          }
        }catch{setAiConnected(false);}
      }} style={redBtn}>🔌 Test kết nối {providerName}</button>

      <div style={{marginTop:16,padding:"12px 16px",background:C.goldBg,borderRadius:10,border:"1.5px solid #CA8A04"}}>
        <span style={{fontSize:13,fontWeight:700,color:"#78350F",lineHeight:1.6}}>💡 Kết quả AI được cache — cùng 1 món không cần gọi lần 2. {!isAdmin&&"API keys được admin cấu hình sẵn."}</span>
      </div>

      {isAdmin&&<button onClick={async()=>{
        await saveSetting("ai_provider",aiProvider);
        await saveSetting("claude_key",claudeKey);
        await saveSetting("gemini_key",geminiKey);
        await saveSetting("gpt_key",gptKey);
        await saveSetting("usda_key",usdaKey);
        await saveSetting("ai_model",aiModel);
        const el=document.getElementById("cloud-keys-saved");
        if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
      }} style={{...redBtn,marginTop:12,background:"linear-gradient(135deg,#1D4ED8,#3B82F6)"}}>☁️ Lưu API Keys lên Cloud (cho tất cả users)</button>}
      {isAdmin&&<div id="cloud-keys-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
        <span style={{fontSize:13,fontWeight:800,color:"#14532D"}}>✅ API Keys đã lưu lên cloud! Tất cả users sẽ dùng keys này.</span>
      </div>}

      {!isAdmin&&(claudeKey||geminiKey||gptKey)&&<div style={{marginTop:12,padding:"12px 16px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`}}>
        <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✅ API đã được admin cấu hình sẵn — bạn có thể dùng ngay!</span>
      </div>}
    </div>}

    {/* MEALS */}
    {section==="meals"&&<div style={card}>
      <div style={{fontSize:17,fontWeight:900,color:C.blue}}>Nhập bữa ăn</div>
      <div style={{fontSize:13,fontWeight:600,color:C.t2,marginTop:2,marginBottom:16}}>
        Nhập thức ăn → nhấn "Tính macro" → <span style={{fontWeight:800,color:aiProvider==="claude"?"#DC2626":aiProvider==="gemini"?"#1D4ED8":"#15803D"}}>{providerName}</span> trả kết quả
      </div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        <Pill active={dayType==="train"} color={C.red} onClick={()=>{setDayType("train");setAiResult(null);}}>💪 Ngày tập</Pill>
        <Pill active={dayType==="rest"} color={C.green} onClick={()=>{setDayType("rest");setAiResult(null);}}>😴 Ngày nghỉ</Pill>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {mealNames.map(m=><Pill key={m.id} active={selectedMeal===m.id} color={C.gold} onClick={()=>{setSelectedMeal(m.id);setAiResult(null);}}>{m.l}</Pill>)}
      </div>
      <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"auto 1fr 50px 50px 70px 28px":"auto 2fr 60px 70px 80px 32px",gap:mob?4:8,marginBottom:8,alignItems:"center"}}>
          <span style={{...lbl,textAlign:"center"}}>#</span><span style={lbl}>Tên thức ăn</span><span style={{...lbl,textAlign:"center"}}>ĐV</span><span style={{...lbl,textAlign:"center"}}>SL</span><span style={{...lbl,textAlign:"center"}}>Gram</span><span/>
        </div>
        {foodItems.map((item,i)=>{
          const onUnitChange=(e)=>{const u=e.target.value;const updated=[...foodItems];updated[i]={...updated[i],unit:u};if(u!=="g"&&u!=="ml")updated[i].gram=0;setFoodItems(updated);};
          const isWeight=!item.unit||item.unit==="g"||item.unit==="ml";
          return <div key={i} style={{display:"grid",gridTemplateColumns:mob?"auto 1fr 50px 50px 70px 28px":"auto 2fr 60px 70px 80px 32px",gap:mob?4:8,alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:800,color:C.t3,textAlign:"center"}}>{i+1}.</span>
          <input value={item.name} onChange={e=>updateFood(i,"name",e.target.value)} placeholder="VD: Cá kho" style={{...inp,fontSize:mob?14:16}}/>
          <select value={item.unit||"g"} onChange={onUnitChange} style={{...inp,textAlign:"center",padding:mob?"8px 2px":"10px 4px",fontSize:mob?12:13}}>
            <option value="g">g</option><option value="ml">ml</option><option value="quả">quả</option><option value="hộp">hộp</option><option value="lát">lát</option><option value="bát">bát</option>
          </select>
          <input type="number" value={item.qty} onChange={e=>updateFood(i,"qty",Math.max(0,Number(e.target.value)))} style={{...inp,textAlign:"center",fontSize:mob?14:16}} placeholder="SL"/>
          <input type="number" value={item.gram} onChange={e=>{if(isWeight)updateFood(i,"gram",Math.max(0,Number(e.target.value)));}} readOnly={!isWeight} style={{...inp,textAlign:"center",fontSize:mob?14:16,opacity:isWeight?1:0.35}} placeholder={isWeight?"Gram":"—"}/>
          <button onClick={()=>removeFood(i)} style={{padding:0,width:mob?28:32,height:mob?28:32,background:C.redBg,color:C.red,borderRadius:8,fontSize:mob?14:16,fontWeight:900,border:"none",cursor:"pointer"}}>×</button>
        </div>;})}
        <button onClick={addFood} style={{padding:"10px",fontSize:13,fontWeight:700,background:C.surface,color:C.t2,border:`2px dashed ${C.border}`,borderRadius:10,width:"100%",cursor:"pointer",fontFamily:"inherit"}}>+ Thêm món</button>
      </div>
      <button onClick={callAI} disabled={aiLoading} style={{...redBtn,marginTop:16,opacity:aiLoading?0.7:1}}>
        {aiLoading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{width:16,height:16,border:"2.5px solid #fcc",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>
          <span>Đang tính...</span>
        </span>:`Tính macro (${providerName})`}
      </button>
      {aiError&&<div style={{marginTop:12,padding:"12px 16px",background:C.redBg,borderRadius:10,border:`2px solid ${C.red}`}}>
        <span style={{fontSize:13,fontWeight:800,color:"#7F1D1D"}}>❌ {aiError}</span>
      </div>}
      {aiResult&&<div style={{marginTop:16,background:C.redBg,borderRadius:12,padding:16,border:`2px solid ${C.red}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:900}}>✓</span>
          <span style={{fontSize:14,fontWeight:900,color:C.red}}>Kết quả {aiResult.items?.some(i=>i.source==="USDA")?"USDA + ":""}{ providerName}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1.4fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr":"2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:11,fontWeight:800,borderBottom:`1.5px solid ${C.border}`,paddingBottom:6,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>
          <span style={{color:C.t3}}>Thức ăn</span><span style={{color:C.t3,textAlign:"right"}}>g</span>
          <span style={{color:C.protein,textAlign:"right"}}>P</span><span style={{color:C.carb,textAlign:"right"}}>C</span>
          <span style={{color:C.t2,textAlign:"right"}}>F</span><span style={{color:C.fiber,textAlign:"right"}}>Xơ</span>
          <span style={{color:C.t2,textAlign:"right"}}>Cal</span>
        </div>
        {(aiResult.items||[]).map((item,i)=><div key={i} style={{display:"grid",gridTemplateColumns:mob?"1.4fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr":"2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:700,padding:"7px 0",borderBottom:i<aiResult.items.length-1?`1px solid ${C.border}`:"none"}}>
          <span style={{color:C.t1,fontWeight:800}}>{item.name}</span>
          <span style={{textAlign:"right",color:C.t3}}>{item.gram}</span>
          <span style={{textAlign:"right",color:C.protein}}>{item.protein}</span>
          <span style={{textAlign:"right",color:C.carb}}>{item.carb}</span>
          <span style={{textAlign:"right",color:C.t1}}>{item.fat}</span>
          <span style={{textAlign:"right",color:C.fiber}}>{item.fiber}</span>
          <span style={{textAlign:"right",color:C.t1,fontWeight:900}}>{item.cal}</span>
        </div>)}
        {aiResult.items&&aiResult.items.length>1&&(()=>{
          const s=aiResult.items.reduce((a,i)=>({g:a.g+(i.gram||0),p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),fi:a.fi+(i.fiber||0),cal:a.cal+(i.cal||0)}),{g:0,p:0,c:0,f:0,fi:0,cal:0});
          return <div style={{display:"grid",gridTemplateColumns:mob?"1.4fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr":"2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:900,borderTop:`2px solid ${C.red}`,paddingTop:8,marginTop:6}}>
            <span style={{color:C.red}}>TỔNG</span><span style={{textAlign:"right",color:C.t3}}>{Math.round(s.g)}</span>
            <span style={{textAlign:"right",color:C.protein}}>{Math.round(s.p*10)/10}</span><span style={{textAlign:"right",color:C.carb}}>{Math.round(s.c*10)/10}</span>
            <span style={{textAlign:"right",color:C.t1}}>{Math.round(s.f*10)/10}</span><span style={{textAlign:"right",color:C.fiber}}>{Math.round(s.fi*10)/10}</span>
            <span style={{textAlign:"right",color:C.t1}}>{Math.round(s.cal)}</span>
          </div>;
        })()}
        {aiResult.tip&&<div style={{marginTop:10,padding:"10px 14px",background:C.goldBg,borderRadius:8,border:"1.5px solid #CA8A04"}}>
          <span style={{fontSize:13,fontWeight:700,color:"#78350F"}}>💡 {aiResult.tip}</span>
        </div>}
        <button onClick={()=>{
            // Bug 1 fix: merge FORM data (name, qty, unit, gram) with AI MACRO output (p, c, f, fiber, cal)
            const aiItems=aiResult.items||[];
            const items=foodItems.filter(f=>f.name.trim()).map((formItem,i)=>{
              // Match by index first, then by name
              const aiMatch=aiItems[i]||aiItems.find(ai=>(ai.name||"").toLowerCase().trim()===(formItem.name||"").toLowerCase().trim())||{};
              const unit=formItem.unit||"g";
              const isWeight=unit==="g"||unit==="ml";
              return {
                food:formItem.name,
                gram:isWeight?formItem.gram:(aiMatch.gram||0),
                unit,
                qty:formItem.qty||1,
                qty_display:isWeight?null:`${formItem.qty} ${unit}`,
                p:aiMatch.protein||0, c:aiMatch.carb||0, f:aiMatch.fat||0,
                fiber:aiMatch.fiber||0, cal:aiMatch.cal||0,
              };
            });
            saveMealToCloud(selectedMeal,dayType,items);
            // Pass normalized cache entries (per-100g or per-1-unit)
            if(aiResult._cacheEntries) saveFoodCache(aiResult._cacheEntries,aiProvider);
            // DOM approach — immune to React re-render (same as profile-saved)
            const el=document.getElementById("meal-saved");
            if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
        }} style={{...redBtn,marginTop:12,background:"linear-gradient(135deg,#15803D,#166534)"}}>💾 Lưu vào bữa {mealNames.find(m=>m.id===selectedMeal)?.l||selectedMeal}</button>
        <div id="meal-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
          <span style={{fontSize:13,fontWeight:800,color:"#14532D"}}>✓ Đã lưu thành công!</span>
        </div>
      </div>}
    </div>}

    {/* PROFILE */}
    {section==="profile"&&<div style={card}>
      <div style={{fontSize:17,fontWeight:900,color:C.blue,marginBottom:4}}>Hồ sơ cá nhân</div>
      <div style={{fontSize:13,fontWeight:600,color:C.t2,marginBottom:16}}>Nhập thông số → macro tự tính theo công thức Mifflin-St Jeor</div>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
        <div>
          <div style={{...lbl,marginBottom:6}}>Chiều cao (cm)</div>
          <input type="text" inputMode="numeric" value={profile.cm} onChange={e=>setProfile({...profile,cm:Number(e.target.value)})} style={inp}/>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Cân nặng hiện tại (kg)</div>
          <input type="text" inputMode="decimal" value={profile.kg} onChange={e=>setProfile({...profile,kg:Number(e.target.value)})} style={inp}/>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Tuổi</div>
          <input type="text" inputMode="numeric" value={profile.age} onChange={e=>setProfile({...profile,age:Number(e.target.value)})} style={inp}/>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Số buổi gym/tuần</div>
          <input type="text" inputMode="numeric" value={profile.gym} onChange={e=>setProfile({...profile,gym:Number(e.target.value)})} style={inp}/>
        </div>
      </div>

      {/* Activity level */}
      <div style={{marginTop:16}}>
        <div style={{...lbl,marginBottom:8}}>Mức vận động công việc</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            {id:"sedentary",icon:"🖥️",name:"Ít vận động",desc:"Ngồi văn phòng, ít đi lại",mul:"1.2"},
            {id:"moderate",icon:"🚶",name:"Vận động vừa",desc:"Đi lại nhiều, công việc nhẹ",mul:"1.5"},
            {id:"active",icon:"🏗️",name:"Vận động nặng",desc:"Lao động chân tay, bốc vác",mul:"1.75"},
          ].map(a=><div key={a.id} onClick={()=>setProfile({...profile,activity:a.id})} style={{
            flex:1,minWidth:mob?90:0,padding:"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
            background:profile.activity===a.id?C.blueBg:C.surface,
            border:profile.activity===a.id?`2.5px solid ${C.blue}`:`1.5px solid ${C.border}`,
          }}>
            <div style={{fontSize:22}}>{a.icon}</div>
            <div style={{fontSize:13,fontWeight:900,color:C.t1,marginTop:4}}>{a.name}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.t3}}>{a.desc}</div>
            <div style={{fontSize:10,fontWeight:700,color:C.blue,marginTop:4}}>Hệ số: {a.mul}</div>
          </div>)}
        </div>
      </div>

      {/* Goal type */}
      <div style={{marginTop:16}}>
        <div style={{...lbl,marginBottom:8}}>Mục tiêu</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {[
            {id:"bulk",icon:"💪",name:"Tăng cơ",desc:"P 2g · C 4g · F 0.8g/kg",c:C.red},
            {id:"cut",icon:"▼",name:"Giảm mỡ",desc:"P 2.3g · C 2.5g · F 0.8g/kg",c:"#B45309"},
            {id:"maintain",icon:"⚖️",name:"Duy trì",desc:"P 1.8g · C 3.5g · F 0.8g/kg",c:C.green},
          ].map(g=><div key={g.id} onClick={()=>setProfile({...profile,goalType:g.id})} style={{
            flex:1,minWidth:mob?90:0,padding:"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
            background:profile.goalType===g.id?`${g.c}11`:C.surface,
            border:profile.goalType===g.id?`2.5px solid ${g.c}`:`1.5px solid ${C.border}`,
          }}>
            <div style={{fontSize:22}}>{g.icon}</div>
            <div style={{fontSize:13,fontWeight:900,color:C.t1,marginTop:4}}>{g.name}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.t3}}>{g.desc}</div>
          </div>)}
        </div>
      </div>

      {/* Goal weight + duration */}
      {profile.goalType!=="maintain"&&<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginTop:16}}>
        <div>
          <div style={{...lbl,marginBottom:6}}>Cân nặng mục tiêu (kg)</div>
          <input type="text" inputMode="decimal" value={profile.goalKg} onChange={e=>setProfile({...profile,goalKg:Number(e.target.value)})} style={inp}/>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Thời gian (tháng)</div>
          <input type="text" inputMode="numeric" value={profile.months} onChange={e=>setProfile({...profile,months:Math.max(1,Number(e.target.value))})} style={inp}/>
        </div>
      </div>}

      {/* Timeline plan */}
      {profile.goalType!=="maintain"&&Math.abs(macro.diff)>0&&<div style={{marginTop:16,background:profile.goalType==="bulk"?C.redBg:C.goldBg,borderRadius:12,padding:"14px 16px",border:`2px solid ${profile.goalType==="bulk"?C.red:"#B45309"}`}}>
        <div style={{fontSize:14,fontWeight:900,color:profile.goalType==="bulk"?C.red:"#B45309",marginBottom:10}}>
          📋 Kế hoạch {profile.goalType==="bulk"?"tăng cân":"giảm cân"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase"}}>Tổng {profile.goalType==="bulk"?"tăng":"giảm"}</div>
            <div style={{fontSize:20,fontWeight:900,color:C.t1}}>{Math.abs(macro.diff)} kg</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase"}}>Mỗi tháng</div>
            <div style={{fontSize:20,fontWeight:900,color:C.gold}}>{macro.perMonth} kg</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase"}}>Mỗi tuần</div>
            <div style={{fontSize:20,fontWeight:900,color:macro.safe?C.green:C.red}}>{macro.perWeek} kg</div>
          </div>
        </div>
        {/* Monthly breakdown */}
        <div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:6}}>Lộ trình từng tháng:</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {Array.from({length:macro.months},(_,i)=>{
            const kgAtMonth=profile.goalType==="bulk"
              ?Math.round((profile.kg+macro.perMonth*(i+1))*10)/10
              :Math.round((profile.kg-macro.perMonth*(i+1))*10)/10;
            const capped=profile.goalType==="bulk"?Math.min(kgAtMonth,profile.goalKg):Math.max(kgAtMonth,profile.goalKg);
            return <div key={i} style={{background:C.card,borderRadius:8,padding:"6px 10px",textAlign:"center",border:`1.5px solid ${C.border}`,minWidth:mob?60:70}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t3}}>T{i+1}</div>
              <div style={{fontSize:14,fontWeight:900,color:C.t1}}>{capped}</div>
              <div style={{fontSize:10,fontWeight:600,color:C.green}}>kg</div>
            </div>;
          })}
        </div>
        <div style={{marginTop:10,padding:"8px 12px",background:macro.safe?C.greenBg:C.redBg,borderRadius:8,border:`1.5px solid ${macro.safe?C.green:C.red}`}}>
          <span style={{fontSize:12,fontWeight:700,color:macro.safe?"#14532D":"#7F1D1D"}}>
            {macro.safe
              ?`✓ An toàn! ${macro.perWeek} kg/tuần ${profile.goalType==="bulk"?"≤ 0.5 — chủ yếu tăng cơ, ít tích mỡ":"≤ 0.75 — giữ cơ, giảm mỡ hiệu quả"}`
              :`⚠ Quá nhanh! ${macro.perWeek} kg/tuần ${profile.goalType==="bulk"?"> 0.5 — dễ tích mỡ bụng. Nên kéo dài thời gian":"> 0.75 — dễ mất cơ. Nên kéo dài thời gian"}`
            }
          </span>
        </div>
      </div>}

      {/* Auto-calc results */}
      <div style={{marginTop:20}}>
        <button onClick={()=>{
          const el=document.getElementById("profile-saved");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},2500);}
        }} style={{...redBtn,marginBottom:12}}> 💾 Lưu hồ sơ & Tính macro</button>
        <div id="profile-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:800,color:"#14532D"}}>✓ Đã lưu hồ sơ! Dashboard đã cập nhật macro mới.</span>
        </div>
        <div style={{borderTop:`2px solid ${C.red}`,paddingTop:16}}>
        <div style={{fontSize:15,fontWeight:900,color:C.red,marginBottom:12}}>⚡ Macro tự động tính</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:8}}>
          {[
            {l:"TDEE",v:`${macro.tdee} cal`,desc:"Calo duy trì",c:C.t1},
            {l:"BMI",v:macro.bmi,desc:macro.bmi<18.5?"Thiếu cân":macro.bmi<25?"Bình thường":"Thừa cân",c:C.gold},
            {l:"Calo mục tiêu",v:`${macro.calTarget} cal`,desc:profile.goalType==="bulk"?"Tăng cơ +200":profile.goalType==="cut"?"Giảm mỡ -300":"Duy trì",c:C.red},
            {l:"Calo ngày nghỉ",v:`${macro.calRest} cal`,desc:"Giảm carb, giữ P/F",c:C.blue},
          ].map((r,i)=><div key={i} style={{background:C.surface,borderRadius:10,padding:"10px 14px",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{r.l}</div>
            <div style={{fontSize:20,fontWeight:900,color:r.c,marginTop:2}}>{r.v}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:2}}>{r.desc}</div>
          </div>)}
        </div>

        <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginTop:12}}>
          {[
            {l:"Protein",v:`${macro.protein}g`,sub:`${macro.protein*4} cal · ${macro.pRatio}`,c:C.red},
            {l:"Carb (tập)",v:`${macro.carb}g`,sub:`${macro.carb*4} cal · ${macro.cRatio}`,c:C.gold},
            {l:"Fat",v:`${macro.fat}g`,sub:`${macro.fat*9} cal · ${macro.fRatio}`,c:C.t1},
            {l:"Xơ",v:`${macro.fiber}g`,sub:"Khuyến nghị",c:C.green},
          ].map((r,i)=><div key={i} style={{background:C.surface,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase"}}>{r.l}</div>
            <div style={{fontSize:18,fontWeight:900,color:r.c,marginTop:2}}>{r.v}</div>
            <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:2}}>{r.sub}</div>
          </div>)}
        </div>

        <div style={{marginTop:12,background:C.goldBg,borderRadius:10,padding:"10px 14px",border:"1.5px solid #CA8A04"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#78350F",lineHeight:1.6}}>
            💡 BMR = {macro.bmr} → ×{macro.actMul} = TDEE {macro.tdee} cal.
            {macro.goal==="bulk"?"Tăng cơ":"Giảm mỡ"}: P = {profile.kg}×{macro.pRatio.replace("g/kg","")} = {macro.protein}g, C = {profile.kg}×{macro.cRatio.replace("g/kg","")} = {macro.carb}g, F = {profile.kg}×{macro.fRatio.replace("g/kg","")} = {macro.fat}g.
            Ngày nghỉ: C giảm → {macro.carbRest}g. Tổng: {macro.calTarget} cal (tập) / {macro.calRest} cal (nghỉ).
          </span>
        </div>
      </div>
      </div>
    </div>}

    {/* SCHEDULE */}
    {section==="schedule"&&(()=>{
      const days=profile.gymDays||[0,2,4,5];
      const toggleDay=(idx)=>{
        const nd=days.includes(idx)?days.filter(d=>d!==idx):[...days,idx].sort();
        setProfile({...profile,gymDays:nd,gym:nd.length});
      };
      return <div style={card}>
        <div style={{fontSize:17,fontWeight:900,color:C.blue,marginBottom:16}}>Lịch tập gym</div>
        <div><div style={{...lbl,marginBottom:6}}>Số buổi/tuần</div>
          <div style={{fontSize:24,fontWeight:900,color:C.t1}}>{days.length} <span style={{fontSize:13,fontWeight:600,color:C.t3}}>buổi</span></div>
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
          const el=document.getElementById("schedule-saved");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},2500);}
        }} style={{...redBtn,marginTop:20}}>💾 Lưu lịch tập</button>
        <div id="schedule-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:10}}>
          <span style={{fontSize:13,fontWeight:800,color:"#14532D"}}>✓ Đã lưu! Tập {days.length} buổi/tuần — {days.map(d=>["T2","T3","T4","T5","T6","T7","CN"][d]).join(", ")}</span>
        </div>
      </div>;
    })()}

    {/* WEIGHT */}
    {section==="weight"&&(()=>{
      const nextWeek=weightLog.length+1;
      const today=fmtDate(new Date());
      return <div style={card}>
        <div style={{fontSize:17,fontWeight:900,color:C.blue,marginBottom:16}}>Nhập cân nặng</div>
        <div style={{background:C.surface,borderRadius:10,padding:"12px 16px",marginBottom:16,border:`1.5px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:800,color:C.t1}}>Tuần {nextWeek}</span>
            <span style={{fontSize:13,fontWeight:700,color:C.t2}}>{today}</span>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:C.t3}}>Ngày tự động lấy từ hệ thống</div>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Cân nặng (kg)</div>
          <input id="weightInput" type="text" inputMode="decimal" placeholder="VD: 64.3" style={inp}/>
        </div>
        <button onClick={async()=>{
          const val=parseFloat(document.getElementById("weightInput").value);
          if(!val||val<30||val>200)return;
          await addWeight(val);
          setProfile({...profile,kg:val});
          document.getElementById("weightInput").value="";
          const el=document.getElementById("weight-saved");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
        }} style={{...redBtn,marginTop:16}}>⚡ Lưu cân nặng</button>
        <div id="weight-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:10}}>
          <span style={{fontSize:13,fontWeight:800,color:"#14532D"}}>✓ Đã lưu & cập nhật macro theo cân nặng mới!</span>
        </div>
        <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:14,marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={lbl}>Lịch sử theo dõi cân nặng</div>
            <button onClick={()=>{
              if(window.confirm("Xóa toàn bộ lịch sử cân nặng?")){
                resetWeights();
              }
            }} style={{fontSize:11,fontWeight:700,padding:"4px 10px",background:C.redBg,color:C.red,border:`1px solid ${C.red}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
              Reset hết
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.1fr 0.7fr 0.5fr 0.8fr",gap:4,fontSize:11,fontWeight:700,color:C.t3,paddingBottom:6,marginBottom:4,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            <span>Tuần</span><span>Ngày</span><span style={{textAlign:"right"}}>Kg</span><span style={{textAlign:"right"}}>Δ</span><span style={{textAlign:"right"}}>Thao tác</span>
          </div>
          {weightLog.map((w,i)=>(
            <WeightRow key={w.id||i} w={w} i={i} weightLog={weightLog} setWeightLog={setWeightLog} setProfile={setProfile} profile={profile} deleteWeight={deleteWeight}/>
          ))}
        </div>
        {weightLog.length>=2&&(()=>{
          const totalDelta=Math.round((weightLog[weightLog.length-1].kg-weightLog[0].kg)*10)/10;
          const avgPerWeek=Math.round((totalDelta/(weightLog.length-1))*100)/100;
          return <div style={{marginTop:12,padding:"12px 16px",background:C.goldBg,borderRadius:10,border:"1.5px solid #CA8A04"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16,fontWeight:900,color:"#EAB308"}}>⚡</span>
              <span style={{fontSize:13,fontWeight:700,color:"#78350F",lineHeight:1.5}}>
                Tổng: {totalDelta>0?"+":""}{totalDelta} kg trong {weightLog.length-1} tuần. Trung bình {avgPerWeek>0?"+":""}{avgPerWeek} kg/tuần.
                {avgPerWeek>0&&avgPerWeek<=0.5?" Tốc độ lý tưởng tăng cơ!":avgPerWeek>0.5?" Hơi nhanh, cẩn thận tích mỡ.":avgPerWeek<0?" Đang giảm — kiểm tra lại chế độ ăn.":" Giữ ổn định."}
              </span>
            </div>
          </div>;
        })()}
      </div>;
    })()}
    <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
  </div>;
}

function LoginScreen({onLogin}){
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const [email,setEmail]=useState("");
  const [err,setErr]=useState("");
  const [mode,setMode]=useState("login");
  const [success,setSuccess]=useState("");
  const {signIn,signUp}=useAuth();

  const handleSubmit=async()=>{
    setErr("");setSuccess("");
    if(!user.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
    if(pass.length<6){setErr("Mật khẩu tối thiểu 6 ký tự");return;}
    try{
      if(mode==="register"){
        if(!email.trim()||!email.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
        await signUp(email,pass,user.trim());
        setSuccess(`✅ Đăng ký thành công! Tài khoản "${user.trim()}" đã được kích hoạt.`);
        setTimeout(()=>onLogin(user.trim()),1500);
      }else{
        await signIn(email||user,pass);
        onLogin(user.trim());
      }
    }catch(e){setErr(e.message||"Lỗi xác thực");}
  };

  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{width:64,height:64,background:"linear-gradient(135deg,#DC2626,#F59E0B)",borderRadius:16,boxShadow:"0 4px 14px rgba(220,38,38,0.3)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:32}}>🏋️</div>
        <div style={{fontSize:24,fontWeight:900,color:"#111",marginTop:12,letterSpacing:"-0.02em"}}>MEAL TRACKER</div>
        <div style={{fontSize:13,fontWeight:700,color:C.red,marginTop:2}}>Phát triển bởi Việt Anh Seoer</div>
      </div>
      <div style={{...card,padding:"24px 28px"}}>
        <div style={{display:"flex",marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
          {["login","register"].map(m=><button key={m} onClick={()=>{setMode(m);setErr("");setSuccess("");}} style={{
            flex:1,padding:"10px",fontSize:14,fontWeight:mode===m?900:600,border:"none",background:"transparent",cursor:"pointer",
            color:mode===m?C.t1:C.t3,borderBottom:mode===m?"3px solid #DC2626":"3px solid transparent",fontFamily:"inherit",
          }}>{m==="login"?"Đăng nhập":"Đăng ký"}</button>)}
        </div>
        <div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Tên đăng nhập</div>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="VD: gymboy63" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>
        {mode==="register"&&<div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>}
        <div style={{marginBottom:16}}>
          <div style={{...lbl,marginBottom:6}}>Mật khẩu</div>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>
        {err&&<div style={{marginBottom:12,padding:"8px 12px",background:C.redBg,borderRadius:8,border:`1.5px solid ${C.red}`,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {err}</div>}
        {success&&<div style={{marginBottom:12,padding:"10px 14px",background:C.greenBg,borderRadius:8,border:`1.5px solid ${C.green}`,fontSize:13,fontWeight:700,color:"#14532D"}}>{success}</div>}
        <button onClick={handleSubmit} disabled={!!success} style={{...redBtn,opacity:success?0.6:1}}>{mode==="login"?"Đăng nhập":"Đăng ký & Kích hoạt"}</button>
        {mode==="login"&&<div style={{textAlign:"center",marginTop:12,fontSize:12,fontWeight:600,color:C.t3}}>Chưa có tài khoản? <span onClick={()=>setMode("register")} style={{color:C.red,fontWeight:700,cursor:"pointer"}}>Đăng ký ngay</span></div>}
        {mode==="register"&&<div style={{textAlign:"center",marginTop:12,fontSize:11,fontWeight:600,color:C.t3}}>Tài khoản sẽ được kích hoạt tự động ngay sau khi đăng ký</div>}
      </div>
    </div>
  </div>;
}

function calcMacro(p){if(!p)p={cm:170,kg:65,age:25,goalKg:70,gym:3,goalType:"bulk",months:6,activity:"sedentary"};
  const bmr=10*p.kg+6.25*p.cm-5*p.age+5;
  const jobBase=p.activity==="sedentary"?1.2:p.activity==="moderate"?1.5:1.75;
  const gymBonus=p.gym<=2?0.1:p.gym<=4?0.2:0.3;
  const actMul=Math.round((jobBase+gymBonus)*100)/100;
  const tdee=Math.round(bmr*actMul);
  const diff=p.goalKg-p.kg;
  const goal=p.goalType||"bulk";
  // Macro theo g/kg chuẩn cho người châu Á tập gym
  // Bulk: P=2g/kg, C=4g/kg, F=0.9g/kg, +200cal
  // Cut: P=2.3g/kg (tăng giữ cơ), C=2.5g/kg (giảm mạnh), F=0.8g/kg (tối thiểu), -300cal
  // Maintain: P=1.8g/kg, C=3.5g/kg, F=0.9g/kg
  let protein,carb,carbRest,fat;
  if(goal==="bulk"){
    protein=Math.round(p.kg*2);
    carb=Math.round(p.kg*4);
    carbRest=Math.round(p.kg*3);
    fat=Math.max(Math.round(p.kg*0.8),Math.round((tdee+200-protein*4-carb*4)/9));
  }else if(goal==="cut"){
    protein=Math.round(p.kg*2.3);
    carb=Math.round(p.kg*2.5);
    carbRest=Math.round(p.kg*2);
    fat=Math.max(Math.round(p.kg*0.8),Math.round((tdee-300-protein*4-carb*4)/9));
  }else{
    protein=Math.round(p.kg*1.8);
    carb=Math.round(p.kg*3.5);
    carbRest=Math.round(p.kg*3);
    fat=Math.max(Math.round(p.kg*0.8),Math.round((tdee-protein*4-carb*4)/9));
  }
  if(fat<Math.round(p.kg*0.8))fat=Math.round(p.kg*0.8); // tối thiểu 0.8g/kg
  const fiber=25;
  const calActual=protein*4+carb*4+fat*9;
  const calRest=protein*4+carbRest*4+fat*9;
  const bmi=Math.round((p.kg/(p.cm/100)**2)*10)/10;
  const months=p.months||4;
  const totalDiff=Math.abs(diff);
  const perMonth=months>0?Math.round(totalDiff/months*10)/10:0;
  const perWeek=months>0?Math.round(totalDiff/(months*4.33)*10)/10:0;
  const safe=goal==="bulk"?perWeek<=0.5:goal==="cut"?perWeek<=0.75:true;
  const pRatio=goal==="bulk"?"2g/kg":goal==="cut"?"2.3g/kg":"1.8g/kg";
  const cRatio=goal==="bulk"?"4g/kg":goal==="cut"?"2.5g/kg":"3.5g/kg";
  const fRatio="0.8g/kg";
  return{tdee,calTarget:calActual,protein,fat,fiber,carb,carbRest,calRest,bmi,diff,perMonth,perWeek,months,safe,goal,fatPct:Math.round(fat*9/calActual*100),actMul,bmr:Math.round(bmr),pRatio,cRatio,fRatio};
}

const defaultProfile={cm:170,kg:65,age:25,goalKg:70,gym:3,goalType:"bulk",months:6,activity:"sedentary"};

export default function App(){
  const {user,loading,signOut}=useAuth();
  const [tab,setTab]=useState("dashboard");
  const {profile,setProfile,loading:profileLoading}=useProfile(user?.id);
  const {weightLog,addWeight,deleteWeight,resetWeights,setWeightLog,loading:weightLoading}=useWeightLog(user?.id);
  const {loaded:userDataLoaded,meals:cloudMeals,getMeals,foodCache,saveMealToCloud,saveFoodCache}=useUserData(user?.id);
  const {settings:appSettings,isAdmin,saveSetting}=useAppSettings(user?.id);
  const macro=calcMacro(profile||{cm:170,kg:65,age:25,goalKg:70,gym:3,goalType:"bulk",months:6,activity:"sedentary"});
  const mob=useIsMobile();

  if(loading||profileLoading||!profile) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Inter,sans-serif",fontSize:16,color:"#666"}}>⏳ Đang tải...</div>;
  if(!user) return <LoginScreen onLogin={()=>window.location.reload()}/>;
  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",padding:mob?"0 10px 10px 10px":"16px 20px",maxWidth:700,margin:"0 auto",overflowX:"hidden",width:"100%",boxSizing:"border-box"}}>
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99,background:C.bg,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8,paddingTop:"calc(env(safe-area-inset-top, 8px) + 4px)",paddingBottom:8,paddingLeft:"max(10px, env(safe-area-inset-left, 10px))",paddingRight:"max(10px, env(safe-area-inset-right, 10px))",maxWidth:700,margin:"0 auto",boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flex:"1 1 auto",minWidth:0}}>
        <div style={{width:mob?28:42,height:mob?28:42,background:"linear-gradient(135deg,#DC2626,#F59E0B)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?16:22,flexShrink:0}}>🏋️</div>
        <div>
          <div style={{fontSize:mob?13:20,fontWeight:900,letterSpacing:"-0.02em",color:"#111"}}>MEAL TRACKER</div>
          <div style={{fontSize:mob?8:12,fontWeight:700,color:C.red}}>Phát triển bởi Việt Anh Seoer</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"row",alignItems:"center",gap:8}}>
        <div style={{fontSize:mob?11:13,fontWeight:700,color:C.t1}}>👤 {user.user_metadata?.username||user.email}</div>
        <button onClick={signOut} style={{padding:"5px 14px",fontSize:11,fontWeight:700,background:C.redBg,color:C.red,border:`1.5px solid ${C.red}`,borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>Đăng xuất</button>
      </div>
    </div>
    <div style={{paddingTop:"calc(env(safe-area-inset-top, 8px) + 66px)",display:"flex",gap:0,marginBottom:20,borderBottom:`2.5px solid ${C.border}`}}>
      {[{id:"dashboard",l:"📊 Dashboard"},{id:"admin",l:"⚙️ Admin"}].map(t=>
        <button key={t.id} onClick={()=>setTab(t.id)} style={{
          padding:"10px 18px",fontSize:14,fontWeight:tab===t.id?900:600,border:"none",background:"transparent",cursor:"pointer",
          color:tab===t.id?"#111":C.t3,borderBottom:tab===t.id?"3px solid #DC2626":"3px solid transparent",fontFamily:"inherit",
        }}>{t.l}</button>
      )}
    </div>
    {tab==="dashboard"?<Dashboard weightLog={weightLog} profile={profile} macro={macro} getMeals={getMeals}/>:<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={setProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting}/>}
  </div>;
}
