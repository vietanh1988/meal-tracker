import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useWeightLog } from "./hooks/useWeightLog";
import { useUserData } from "./hooks/useUserData";
import { useAppSettings } from "./hooks/useAppSettings";
import { calcMacroAIDirect } from "./lib/aiService";
import { searchUSDA, calcFromUSDA, translateFood, estimateGram } from "./lib/usdaService";
import { lookupLocalFood } from "./lib/localFoodDB";

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
  protein:"#007AFF", carb:"#5AC8FA", fat:"#8E8E93", fiber:"#34C759",
  red:"#EF4444", gold:"#FACC15", green:"#00C896", blue:"#007AFF",
  primary:"#007AFF", secondary:"#36A3FF", deepBlue:"#0057FF", accent:"#7C3AED",
  mint:"#00C896", violet:"#7C3AED",
  bg:"#F8FAFC", card:"#FFF", surface:"#F1F5F9",
  border:"#E2E8F0",
  t1:"#0F172A", t2:"#64748B", t3:"#7A8A9B",
  redBg:"rgba(239,68,68,0.07)", goldBg:"rgba(250,204,21,0.1)", greenBg:"rgba(0,200,150,0.08)", blueBg:"rgba(0,122,255,0.06)",
  primaryBg:"rgba(0,122,255,0.08)", accentBg:"rgba(124,58,237,0.06)",
};
const card={background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"};
const lbl={fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase"};
const inp={width:"100%",boxSizing:"border-box",padding:"8px 12px",fontSize:14,fontWeight:600,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.t1,outline:"none",fontFamily:"inherit",height:40};
const redBtn={padding:"12px",fontSize:14,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",color:"#fff",cursor:"pointer",fontFamily:"inherit",width:"100%"};

function Pill({active,color=C.primary,children,onClick}){
  return <button onClick={onClick} style={{
    padding:"7px 16px",fontSize:13,fontWeight:active?800:600,border:"none",borderRadius:20,
    cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
    background:active?C.primaryBg:C.surface,
    color:active?C.primary:C.t2,outline:active?`2px solid ${C.primary}`:`1.5px solid ${C.border}`,
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
const MealIcon=({id,size=28})=>{
  const s=size;
  const icons={
    sang:()=><svg viewBox="0 0 96 96" width={s} height={s}><defs><linearGradient id="mi1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#D97706"/></linearGradient></defs><path d="M10 62 A38 38 0 0 1 86 62 Z" fill="url(#mi1)"/><circle cx="48" cy="62" r="20" fill="url(#mi1)"/><rect x="45" y="4" width="6" height="16" rx="3" fill="url(#mi1)"/><rect x="45" y="4" width="6" height="14" rx="3" fill="url(#mi1)" transform="rotate(45 48 62)"/><rect x="45" y="4" width="6" height="14" rx="3" fill="url(#mi1)" transform="rotate(-45 48 62)"/><rect x="4" y="58" width="14" height="6" rx="3" fill="url(#mi1)"/><rect x="78" y="58" width="14" height="6" rx="3" fill="url(#mi1)"/><rect x="4" y="72" width="88" height="7" rx="3.5" fill="url(#mi1)"/></svg>,
    phu_sang:()=><svg viewBox="0 0 96 96" width={s} height={s}><defs><linearGradient id="mi2" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#C2410C"/></linearGradient></defs><path d="M28 16 Q24 8 28 2 Q32 8 28 16" fill="none" stroke="url(#mi2)" strokeWidth="5" strokeLinecap="round"/><path d="M48 16 Q44 8 48 2 Q52 8 48 16" fill="none" stroke="url(#mi2)" strokeWidth="5" strokeLinecap="round"/><path d="M14 24 L20 78 Q20 84 28 84 L64 84 Q72 84 72 78 L78 24 Z" fill="url(#mi2)"/><path d="M78 38 Q94 38 94 56 Q94 74 78 74" fill="none" stroke="url(#mi2)" strokeWidth="8" strokeLinecap="round"/><rect x="6" y="86" width="76" height="8" rx="4" fill="url(#mi2)"/></svg>,
    trua:()=><svg viewBox="0 0 96 96" width={s} height={s}><defs><linearGradient id="mi3" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#B45309"/></linearGradient></defs><circle cx="48" cy="48" r="24" fill="url(#mi3)"/><rect x="45" y="4" width="6" height="14" rx="3" fill="url(#mi3)"/><rect x="45" y="78" width="6" height="14" rx="3" fill="url(#mi3)"/><rect x="4" y="45" width="14" height="6" rx="3" fill="url(#mi3)"/><rect x="78" y="45" width="14" height="6" rx="3" fill="url(#mi3)"/><rect x="45" y="4" width="6" height="14" rx="3" fill="url(#mi3)" transform="rotate(45 48 48)"/><rect x="45" y="4" width="6" height="14" rx="3" fill="url(#mi3)" transform="rotate(135 48 48)"/><rect x="45" y="78" width="6" height="14" rx="3" fill="url(#mi3)" transform="rotate(45 48 48)"/><rect x="45" y="78" width="6" height="14" rx="3" fill="url(#mi3)" transform="rotate(-45 48 48)"/></svg>,
    phu_chieu:()=><svg viewBox="0 0 96 96" width={s} height={s}><defs><linearGradient id="mi4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#166534"/></linearGradient></defs><rect x="18" y="20" width="60" height="8" rx="4" fill="url(#mi4)"/><path d="M20 28 L26 88 Q26 94 34 94 L62 94 Q70 94 70 88 L76 28 Z" fill="url(#mi4)"/><rect x="52" y="2" width="8" height="56" rx="4" fill="url(#mi4)" transform="rotate(-18 56 30)"/></svg>,
    pre:()=><svg viewBox="0 0 96 96" width={s} height={s}><defs><linearGradient id="mi5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#991B1B"/></linearGradient></defs><polygon points="54,4 22,50 44,50 42,92 74,46 50,46" fill="url(#mi5)"/></svg>,
    post:()=><svg viewBox="0 0 96 96" width={s} height={s}><defs><linearGradient id="mi6" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#115E59"/></linearGradient></defs><path d="M28 40 L34 90 Q34 96 42 96 L54 96 Q62 96 62 90 L68 40 Z" fill="url(#mi6)"/><rect x="24" y="26" width="48" height="16" rx="6" fill="url(#mi6)"/><rect x="32" y="10" width="32" height="18" rx="6" fill="url(#mi6)"/><rect x="40" y="4" width="16" height="10" rx="4" fill="url(#mi6)"/></svg>,
    toi:()=><svg viewBox="0 0 100 100" width={s} height={s}><defs><linearGradient id="mi7" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="50%" stopColor="#0055FF"/><stop offset="100%" stopColor="#3730A3"/></linearGradient><mask id="mim"><rect width="100" height="100" fill="white"/><circle cx="62" cy="34" r="28" fill="black"/></mask></defs><circle cx="42" cy="52" r="34" fill="url(#mi7)" mask="url(#mim)"/><path d="M78 12 L81 22 L91 25 L81 28 L78 38 L75 28 L65 25 L75 22 Z" fill="url(#mi7)"/></svg>,
  };
  const render=icons[id]||icons.trua;
  return render();
};

// App Logo — uses pinned icon image instead of emoji
const AppLogo=({size=48,radius,bg})=><img src="/icon-192.png" alt="Fipilot AI" style={{width:size,height:size,borderRadius:radius!=null?radius:size*0.22,objectFit:"cover",flexShrink:0,background:bg||"transparent"}}/>;

// User Avatar — emoji based on gender
const UserAvatar=({gender,size=40})=>{
  const isMale=(gender||"male")==="male";
  return <div style={{width:size,height:size,borderRadius:"50%",background:isMale?"#DBEAFE":"#FCE7F3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*0.55),flexShrink:0,lineHeight:1}}>{isMale?"🧔":"👩"}</div>;
};
const SlidingTabs=({tabs,active,onChange,style:extraStyle})=>{
  const idx=tabs.findIndex(t=>t.id===active);
  const count=tabs.length;
  const m=window.innerWidth<700;
  return <div style={{position:"relative",display:"flex",background:"rgba(0,0,0,0.04)",borderRadius:12,padding:3,...(extraStyle||{})}}>
    <div style={{position:"absolute",top:3,left:3,width:`calc(${100/count}% - ${count>2?2:3}px)`,height:"calc(100% - 6px)",background:"rgba(255,255,255,0.9)",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",zIndex:0,transform:`translateX(${idx*100}%)`}}/>
    {tabs.map(t=><div key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:m?"8px 6px":"9px 12px",fontSize:m?12:13,fontWeight:active===t.id?700:600,cursor:"pointer",textAlign:"center",color:active===t.id?"#003D99":"#6B7280",transition:"color 0.2s",position:"relative",zIndex:1,whiteSpace:"nowrap"}}>{t.icon?t.icon+" ":""}{t.label}</div>)}
  </div>;
};

// All 7 meals with icons and display names
const ALL_MEALS=[
  {id:"sang",icon:"🍳",name:"Bữa sáng",short:"Sáng"},
  {id:"phu_sang",icon:"🍌",name:"Bữa phụ sáng",short:"Phụ sáng"},
  {id:"trua",icon:"☀️",name:"Bữa trưa",short:"Trưa"},
  {id:"phu_chieu",icon:"🥤",name:"Bữa phụ chiều",short:"Phụ chiều"},
  {id:"pre",icon:"💪",name:"Pre-workout",short:"Pre"},
  {id:"post",icon:"🥛",name:"Post-workout",short:"Post"},
  {id:"toi",icon:"🌙",name:"Bữa tối",short:"Tối"},
];
// Default visible meals per day type
const DEFAULT_MEAL_CONFIG={
  train:["sang","trua","pre","post","toi"],
  rest:["sang","trua","toi"],
};
const mealsData={
  train:ALL_MEALS.map(m=>({id:m.id,name:m.name,items:[]})),
  rest:ALL_MEALS.map(m=>({id:m.id,name:m.name,items:[]})),
};
const getMealsDefault=(type)=>mealsData[type];
const wColors=["#EF4444","#B45309","#CA8A04","#15803D","#1D4ED8","#7C3AED","#DB2777","#0891B2","#0E7490","#4338CA","#BE123C","#047857"];
function fmtDate(d){const dd=String(d.getDate()).padStart(2,"0"),mm=String(d.getMonth()+1).padStart(2,"0"),yy=d.getFullYear();return `${dd}/${mm}/${yy}`;}

function MacroRing({l,v,max,color,color2,track,tc,sub,unit,size}){
  const sz=size||72;const pct=Math.min((v/max)*100,100),r=sz*0.39,sw=sz*0.083,circ=2*Math.PI*r;const cx=sz/2;
  const gradId=`ring-${l.replace(/\s/g,"")}`;
  const c2=color2||color;
  return <div style={{textAlign:"center"}}>
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{display:"block",margin:"0 auto"}}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={track||"#E2E8F0"} strokeWidth={sw}/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeDasharray={`${(Math.min(pct,100)/100)*circ} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} style={{transition:"stroke-dasharray 0.5s"}}/>
      <text x={cx} y={sub?cx*0.88:cx} textAnchor="middle" dominantBaseline="central" fill={tc||C.t1} fontSize={sz*0.22} fontWeight={900}>{Math.round(v)}</text>
      {sub&&<text x={cx} y={cx*1.32} textAnchor="middle" dominantBaseline="central" fill={tc?"rgba(255,255,255,0.8)":"#666"} fontSize={sz*0.14} fontWeight={700}>{sub}</text>}
      {!sub&&<text x={cx} y={cx*1.32} textAnchor="middle" dominantBaseline="central" fill={tc?"rgba(255,255,255,0.6)":C.t3} fontSize={sz*0.14} fontWeight={700}>{unit||"g"}</text>}
    </svg>
    <div style={{fontSize:sz>80?14:12,fontWeight:700,color:tc?"rgba(255,255,255,0.85)":C.t2,marginTop:4}}>{l}</div>
  </div>;
}

function MealCard({meal}){
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
        <span style={{color:C.t1,fontWeight:700}}>{item.food}</span>
        <span style={{color:C.t3,textAlign:"right"}}>{item.qty_display?item.qty_display:item.gram?(item.gram+(item.unit==="ml"?"ml":"g")):""}</span>
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

// Weight Bar Chart with goal-based color logic
function WeightBarChart({weightLog,goalKg,goalType,startKg,mob}){
  const canvasRef=useRef(null);
  const chartRef=useRef(null);
  const [chartPage,setChartPage]=useState(0);
  const PAGE_SIZE=7;

  // Paginate: show 7 entries at a time, most recent last
  const totalPages=Math.max(1,Math.ceil(weightLog.length/PAGE_SIZE));
  const currentPage=Math.min(chartPage,totalPages-1);
  const startIdx=Math.max(0,weightLog.length-PAGE_SIZE*(currentPage+1));
  const endIdx=weightLog.length-PAGE_SIZE*currentPage;
  const visibleLog=weightLog.slice(startIdx,endIdx);

  // Compute chart height based on data range
  const data0=visibleLog.map(w=>w.kg);
  const allVals0=[...data0,goalKg,startKg];
  const yRange0=data0.length>0?Math.ceil(Math.max(...allVals0))+1-(Math.floor(Math.min(...allVals0))-1):4;
  const chartH=mob?(yRange0>6?220:190):(yRange0>6?280:240);

  useEffect(()=>{
    if(!canvasRef.current||visibleLog.length<2||!window.ChartJS)return;
    if(chartRef.current)chartRef.current.destroy();

    const data=visibleLog.map(w=>w.kg);
    const labels=visibleLog.map(w=>"T"+w.week);
    const goalData=visibleLog.map(()=>goalKg);

    // Color logic based on goalType
    function getBarType(diff){
      if(Math.abs(diff)<0.01)return"neutral";
      if(goalType==="bulk")return diff>0?"good":"bad";
      if(goalType==="cut")return diff<0?"good":"bad";
      return Math.abs(diff)<=0.2?"good":"bad";
    }

    const types=data.map((v,i)=>i===0?"neutral":getBarType(v-data[i-1]));

    // Flat colors (no gradient — reliable cross-browser)
    const colorMap={good:"#34A853",bad:"#E53935",neutral:"#F4B400"};
    const actualColors=types.map(t=>colorMap[t]);
    const lblColors={good:"#34A853",bad:"#E53935",neutral:"#F4B400"};

    // Dynamic Y axis
    const allVals=[...data,goalKg,startKg];
    const yMin=Math.floor(Math.min(...allVals))-1;
    const yMax=Math.ceil(Math.max(...allVals))+1;
    const yRange=yMax-yMin;
    const stepSize=yRange>6?2:1;
    // Dynamic chart height based on range
    const chartH=mob?(yRange>6?220:190):(yRange>6?280:240);

    // Dynamic bar sizing
    const n=data.length;
    const catPct=n<=3?0.35:n<=5?0.45:0.55;
    const maxBT=n<=4?36:n<=6?32:undefined;

    const drawLbl={id:"dl",afterDatasetsDraw(chart){
      const c=chart.ctx;
      const hideGoalLbl=mob&&n>4;
      const hideDiffLbl=mob&&n>5;
      // Goal labels
      if(!hideGoalLbl){
        chart.getDatasetMeta(1).data.forEach(bar=>{
          c.save();c.font="500 "+(mob?"8":"10")+"px sans-serif";c.fillStyle="#4285F4";
          c.textAlign="center";c.fillText(goalKg,bar.x,bar.y-4);c.restore();
        });
      }
      // Actual labels
      chart.getDatasetMeta(0).data.forEach((bar,i)=>{
        const v=data[i];const txt=v%1===0?v.toFixed(0):v.toFixed(1);
        c.save();c.textAlign="center";
        if(i>0&&!hideDiffLbl){
          const diff=v-data[i-1];
          const dtxt=Math.abs(diff)<0.01?"=":(diff>0?"+":"")+diff.toFixed(1);
          c.font="500 "+(mob?"9":"12")+"px sans-serif";
          c.fillStyle="#333";
          c.fillText(txt,bar.x,bar.y-20);
          c.font="500 "+(mob?"7":"10")+"px sans-serif";
          c.fillStyle=lblColors[types[i]];
          c.fillText(dtxt,bar.x,bar.y-9);
        }else{
          c.font="500 "+(mob?"9":"12")+"px sans-serif";
          c.fillStyle="#333";
          c.fillText(txt,bar.x,bar.y-6);
        }
        c.restore();
      });
    }};

    chartRef.current=new window.ChartJS(canvasRef.current,{
      type:"bar",
      data:{labels,datasets:[
        {data,backgroundColor:actualColors,borderWidth:0,borderRadius:3,borderSkipped:false,barPercentage:0.82,categoryPercentage:catPct,order:2,maxBarThickness:maxBT},
        {data:goalData,backgroundColor:"#4285F4",borderWidth:0,borderRadius:3,borderSkipped:false,barPercentage:0.82,categoryPercentage:catPct,order:1,maxBarThickness:maxBT},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        layout:{padding:{top:mob?28:32,right:8}},
        plugins:{legend:{display:false},tooltip:{
          backgroundColor:"#fff",titleColor:"#111",bodyColor:"#555",
          borderColor:"#e0e0e0",borderWidth:1,cornerRadius:8,padding:10,displayColors:true,
          callbacks:{label(ctx2){
            if(ctx2.datasetIndex===0){
              const v=ctx2.parsed.y,i=ctx2.dataIndex;
              let l="Thực tế: "+v.toFixed(1)+" kg";
              if(i>0){const d=v-data[i-1];l+=" ("+(d>=0?"+":"")+d.toFixed(1)+")";}
              return l;
            }
            return "Mục tiêu: "+goalKg+" kg";
          }}
        }},
        scales:{
          y:{min:yMin,max:yMax,grid:{color:"rgba(0,0,0,0.06)",drawBorder:false},border:{display:false},
            ticks:{color:"rgba(0,0,0,0.35)",font:{size:mob?9:11},callback:v=>v+" kg",stepSize,padding:4}},
          x:{grid:{display:false},border:{display:false},ticks:{color:"rgba(0,0,0,0.35)",font:{size:mob?9:11},padding:4}}
        }
      },
      plugins:[drawLbl]
    });

    return()=>{if(chartRef.current)chartRef.current.destroy();};
  },[weightLog,goalKg,goalType,startKg,mob,chartPage]);

  return <div>
    <div style={{position:"relative",width:"100%",height:chartH}}>
      <canvas ref={canvasRef}/>
    </div>
    {weightLog.length>PAGE_SIZE&&<div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:8}}>
      <button onClick={()=>setChartPage(Math.min(currentPage+1,totalPages-1))} disabled={currentPage>=totalPages-1} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${currentPage>=totalPages-1?"#E2E8F0":"#007AFF"}`,background:currentPage>=totalPages-1?"#F8FAFC":"#EFF6FF",color:currentPage>=totalPages-1?"#CBD5E1":"#007AFF",fontSize:12,fontWeight:600,cursor:currentPage>=totalPages-1?"default":"pointer"}}>◀ Trước</button>
      <span style={{fontSize:11,color:"#94A3B8",fontWeight:600}}>T{visibleLog[0]?.week||1}–T{visibleLog[visibleLog.length-1]?.week||1}</span>
      <button onClick={()=>setChartPage(Math.max(currentPage-1,0))} disabled={currentPage<=0} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${currentPage<=0?"#E2E8F0":"#007AFF"}`,background:currentPage<=0?"#F8FAFC":"#EFF6FF",color:currentPage<=0?"#CBD5E1":"#007AFF",fontSize:12,fontWeight:600,cursor:currentPage<=0?"default":"pointer"}}>Sau ▶</button>
    </div>}
    <div style={{display:"flex",flexWrap:"wrap",gap:mob?8:14,justifyContent:"center",marginTop:6,fontSize:mob?11:13,fontWeight:700,color:C.t1}}>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#34A853"}}/>Đúng hướng</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#E53935"}}/>Ngược hướng</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#F4B400"}}/>Giữ nguyên</span>
      <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:10,height:10,borderRadius:3,background:"#4285F4"}}/>Mục tiêu</span>
    </div>
  </div>;
}

// Smart weight suggestion based on trend analysis + AI
function WeightSuggestion({weightLog,goalKg,goalType,startKg,curKg,profile,macro,getMeals,appSettings}){
  const [aiResponse,setAiResponse]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);

  if(!profile||!macro||weightLog.length<2)return <div style={{marginTop:10,padding:"10px 14px",background:"#FFF8E1",borderRadius:10,border:"1.5px solid #CA8A04"}}>
    <span style={{fontSize:13,fontWeight:700,color:"#78350F"}}>⚡ Chưa đủ dữ liệu. Cân thêm ít nhất 1 tuần nữa để xem phân tích.</span>
  </div>;

  const data=weightLog.map(w=>w.kg);
  const totalWeeks=weightLog.length;
  const recentN=Math.min(4,data.length-1);
  const recentData=data.slice(-recentN-1);
  const recentRate=recentN>0?(recentData[recentData.length-1]-recentData[0])/recentN:0;
  const rateRound=Math.round(recentRate*100)/100;
  const remaining=Math.abs(goalKg-curKg);
  const weeksLeft=Math.abs(recentRate)>0.01?Math.ceil(remaining/Math.abs(recentRate)):"?";
  const goalLabel=goalType==="bulk"?"tăng cân":goalType==="cut"?"giảm cân":"giữ cân";
  const overMonth=totalWeeks>=4;

  // Detect situation
  let situation="";
  if(goalType==="bulk"){
    if(rateRound>0.5)situation="bulk_too_fast";
    else if(rateRound>=0.05)situation="bulk_on_track";
    else if(rateRound>=-0.05)situation="bulk_stall";
    else situation="bulk_wrong";
  }else if(goalType==="cut"){
    if(rateRound<-0.75)situation="cut_too_fast";
    else if(rateRound<=-0.05)situation="cut_on_track";
    else if(rateRound<=0.05)situation="cut_stall";
    else situation="cut_wrong";
  }else{
    if(Math.abs(rateRound)<=0.15)situation="maintain_stable";
    else situation="maintain_unstable";
  }

  // Build meal details string
  function getMealDetails(){
    const trainMeals=getMeals("train");
    let details="";
    trainMeals.forEach(m=>{
      if(m.items&&m.items.length>0){
        const items=m.items.map(it=>`${it.food||it.name} ${it.gram}g`).join(", ");
        const cal=m.items.reduce((s,it)=>s+(it.cal||0),0);
        details+=`${m.name}: ${items} (${Math.round(cal)} kcal)\n`;
      }
    });
    return details||"Chưa có dữ liệu bữa ăn";
  }

  // Build weight history string
  function getWeightHistory(){
    return weightLog.map((w,i)=>{
      const delta=i>0?((w.kg-weightLog[i-1].kg)>=0?"+":"")+(w.kg-weightLog[i-1].kg).toFixed(1):"bắt đầu";
      return `Tuần ${w.week} (${w.date}): ${w.kg}kg (${delta})`;
    }).join("\n");
  }

  // Situation-specific prompt
  function buildPrompt(){
    const base=`Bạn là huấn luyện viên cá nhân kiêm chuyên gia dinh dưỡng Việt Nam.

HỒ SƠ:
- Chiều cao: ${profile.cm}cm, Cân nặng: ${curKg}kg, Tuổi: ${profile.birthYear?new Date().getFullYear()-profile.birthYear:(profile.age||25)}
- Mục tiêu: ${goalLabel} từ ${startKg}kg lên ${goalKg}kg trong ${profile.months} tháng
- Tập gym: ${profile.gym} buổi/tuần

LỊCH SỬ CÂN NẶNG:
${getWeightHistory()}
- Tốc độ gần đây (4 tuần): ${rateRound>=0?"+":""}${rateRound} kg/tuần

MACRO TARGET: ${macro.calTarget} kcal, P:${macro.protein}g, C:${macro.carb}g, F:${macro.fat}g
THỰC TẾ ĐANG ĂN:
${getMealDetails()}
`;

    const situations={
      bulk_too_fast:`TÌNH TRẠNG: Đang tăng ${rateRound}kg/tuần — QUÁ NHANH, dễ tích mỡ bụng.
→ Phân tích: đang surplus bao nhiêu kcal so với target? Món nào gây surplus?
→ Gợi ý CỤ THỂ: cắt giảm món nào, bao nhiêu gram, để surplus về 300-500kcal/ngày.`,

      bulk_on_track:`TÌNH TRẠNG: Tốc độ ${rateRound}kg/tuần — LÝ TƯỞNG cho tăng cơ.
→ Phân tích: protein đã đủ 1.6-2g/kg chưa? Timing ăn có hợp lý?
→ Gợi ý: tối ưu thêm gì để tăng cơ tối đa, giảm mỡ thừa.`,

      bulk_stall:`TÌNH TRẠNG: CHỮNG CÂN — ${totalWeeks} tuần mà rate chỉ ${rateRound}kg/tuần.
→ Phân tích: thiếu bao nhiêu kcal surplus? Protein có đủ?
→ Gợi ý CỤ THỂ: thêm món gì vào bữa nào, bao nhiêu gram = bao nhiêu kcal. VD: "thêm 50g yến mạch vào sáng = +180kcal".`,

      bulk_wrong:`TÌNH TRẠNG: NGƯỢC HƯỚNG — mục tiêu tăng cân nhưng đang GIẢM ${Math.abs(rateRound)}kg/tuần. Thiếu calo nghiêm trọng.
→ Phân tích: đang thiếu bao nhiêu kcal/ngày? Bữa nào ăn quá ít?
→ Gợi ý CỤ THỂ: thêm bữa phụ gì, tăng portion bữa nào, meal plan gợi ý.`,

      cut_too_fast:`TÌNH TRẠNG: Giảm ${Math.abs(rateRound)}kg/tuần — QUÁ NHANH, đang mất cơ.
→ Phân tích: protein hiện tại bao nhiêu g/kg? Cần tối thiểu 1.8g/kg khi cut.
→ Gợi ý CỤ THỂ: tăng protein lên bao nhiêu g, giảm deficit còn 500kcal/ngày bằng cách thêm gì.`,

      cut_on_track:`TÌNH TRẠNG: Giảm ${Math.abs(rateRound)}kg/tuần — TỐC ĐỘ AN TOÀN.
→ Phân tích: protein đủ giữ cơ chưa? Có dấu hiệu mệt mỏi/giảm sức mạnh?
→ Gợi ý: duy trì, focus giữ cơ, có nên thêm protein không.`,

      cut_stall:`TÌNH TRẠNG: PLATEAU GIẢM CÂN sau ${totalWeeks} tuần. Rate: ${rateRound}kg/tuần.
→ Phân tích: cơ thể đã adapt metabolic. Calo hiện tại đã deficit chưa?
→ Gợi ý CỤ THỂ: có nên refeed 1-2 ngày? Tăng cardio bao nhiêu phút? Hay giảm thêm calo — cắt món gì?`,

      cut_wrong:`TÌNH TRẠNG: NGƯỢC HƯỚNG — mục tiêu giảm cân nhưng đang TĂNG ${rateRound}kg/tuần.
→ Phân tích: đang surplus ở đâu? Bữa nào ăn quá nhiều?
→ Gợi ý CỤ THỂ: cắt giảm bữa/món nào, bao nhiêu gram.`,

      maintain_stable:`TÌNH TRẠNG: Cân nặng ỔN ĐỊNH — giữ cân tốt.
→ Gợi ý: có nên chuyển sang recomp (giảm mỡ tăng cơ cùng lúc)? Tối ưu body composition thế nào?`,

      maintain_unstable:`TÌNH TRẠNG: Cân DAO ĐỘNG bất thường — rate ${rateRound}kg/tuần.
→ Phân tích: ngày nào ăn lệch? Có bữa nào inconsistent?
→ Gợi ý CỤ THỂ: review consistency, cố định bữa ăn nào.`,
    };

    return base+"\n"+(situations[situation]||"")+`

TRẢ LỜI bằng tiếng Việt, 3-5 dòng ngắn gọn.
Gợi ý CỤ THỂ: tên món + gram + kcal thay đổi. KHÔNG nói chung chung.`;
  }

  // Call AI
  async function callAI(){
    setAiLoading(true);setAiResponse(null);
    try{
      const provider=appSettings.ai_provider||"gpt";
      const keys={claude:appSettings.claude_key,gemini:appSettings.gemini_key,gpt:appSettings.gpt_key};
      const prompt=buildPrompt();
      let text="";

      if(provider==="claude"){
        const res=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({foodDesc:prompt,provider:"claude",model:appSettings.ai_model||"claude-sonnet-4-20250514",apiKey:keys.claude})});
        const d=await res.json();
        if(d.error)throw new Error(d.error);
        text=d.text||"";
      }else if(provider==="gemini"){
        const model=appSettings.gemini_model||"gemini-2.0-flash";
        const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
          {method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
        const d=await res.json();
        if(d.error)throw new Error(d.error.message);
        text=d.candidates?.[0]?.content?.parts?.[0]?.text||"";
      }else{
        const model=appSettings.gpt_model||"gpt-4o-mini";
        const res=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",
          headers:{"Content-Type":"application/json","Authorization":`Bearer ${keys.gpt}`},
          body:JSON.stringify({model,messages:[{role:"user",content:prompt}],max_tokens:500})});
        const d=await res.json();
        if(d.error)throw new Error(d.error.message);
        text=d.choices?.[0]?.message?.content||"";
      }
      setAiResponse(text.trim());
    }catch(e){
      setAiResponse("❌ Lỗi: "+e.message);
    }
    setAiLoading(false);
  }

  // UI labels per situation
  const uiMap={
    bulk_too_fast:{icon:"⚠️",title:"Tăng quá nhanh!",color:"#F4B400",bg:"#FFF8E1",border:"#F4B400",
      desc:`Tốc độ ${rateRound}kg/tuần — dễ tích mỡ. Nên 0.2-0.5kg/tuần.`,btnText:"AI gợi ý giảm surplus"},
    bulk_on_track:{icon:"✅",title:"Đang đi đúng hướng!",color:"#1B5E20",bg:"#E8F5E9",border:"#34A853",
      desc:`Tốc độ ${rateRound}kg/tuần — lý tưởng.${typeof weeksLeft==="number"?` Dự kiến đạt ${goalKg}kg sau ${weeksLeft} tuần.`:""} Tiếp tục duy trì!`,btnText:"AI gợi ý tối ưu"},
    bulk_stall:{icon:"⚠️",title:"Cân nặng đang chững",color:"#7C6600",bg:"#FFF8E1",border:"#F4B400",
      desc:`Sau ${totalWeeks} tuần, rate chỉ ${rateRound}kg/tuần. Cần tăng calo.`,btnText:"AI gợi ý tăng calo"},
    bulk_wrong:{icon:"🔴",title:"Đang đi ngược hướng!",color:"#B71C1C",bg:"#FFEBEE",border:"#E53935",
      desc:`Mục tiêu tăng cân nhưng đang giảm ${Math.abs(rateRound)}kg/tuần. Cần điều chỉnh ngay.`,btnText:"AI gợi ý khẩn cấp"},
    cut_too_fast:{icon:"⚠️",title:"Giảm quá nhanh!",color:"#7C6600",bg:"#FFF8E1",border:"#F4B400",
      desc:`Giảm ${Math.abs(rateRound)}kg/tuần — dễ mất cơ. Nên 0.3-0.75kg/tuần.`,btnText:"AI gợi ý giữ cơ"},
    cut_on_track:{icon:"✅",title:"Đang đi đúng hướng!",color:"#1B5E20",bg:"#E8F5E9",border:"#34A853",
      desc:`Giảm ${Math.abs(rateRound)}kg/tuần — an toàn.${typeof weeksLeft==="number"?` Dự kiến đạt ${goalKg}kg sau ${weeksLeft} tuần.`:""} Tiếp tục!`,btnText:"AI gợi ý tối ưu"},
    cut_stall:{icon:"⚠️",title:"Plateau giảm cân",color:"#7C6600",bg:"#FFF8E1",border:"#F4B400",
      desc:`Sau ${totalWeeks} tuần, cân không giảm thêm. Cơ thể đã adapt.`,btnText:"AI gợi ý phá plateau"},
    cut_wrong:{icon:"🔴",title:"Đang đi ngược hướng!",color:"#B71C1C",bg:"#FFEBEE",border:"#E53935",
      desc:`Mục tiêu giảm cân nhưng đang tăng ${rateRound}kg/tuần.`,btnText:"AI gợi ý cắt calo"},
    maintain_stable:{icon:"✅",title:"Giữ cân ổn định!",color:"#1B5E20",bg:"#E8F5E9",border:"#34A853",
      desc:"Cân nặng ổn định — tốt lắm!",btnText:"AI gợi ý recomp"},
    maintain_unstable:{icon:"⚠️",title:"Cân dao động bất thường",color:"#7C6600",bg:"#FFF8E1",border:"#F4B400",
      desc:`Cân dao động ${Math.abs(rateRound)}kg/tuần — cần ổn định lại.`,btnText:"AI gợi ý ổn định"},
  };

  const ui=uiMap[situation]||uiMap.bulk_on_track;
  const showPT=overMonth&&(situation.includes("stall")||situation.includes("wrong"));

  return <div style={{marginTop:10}}>
    <div style={{padding:"14px",background:ui.bg,borderRadius:10,border:`1.5px solid ${ui.border}`,marginBottom:showPT?10:0}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:16}}>{ui.icon}</span>
        <span style={{fontSize:14,fontWeight:700,color:ui.color}}>{ui.title}</span>
      </div>
      <div style={{fontSize:13,color:ui.color,lineHeight:1.6,marginBottom:10}}>{ui.desc}</div>

      <button onClick={callAI} disabled={aiLoading} style={{fontSize:13,fontWeight:700,padding:"8px 14px",borderRadius:8,border:`1.5px solid ${ui.border}`,background:aiLoading?"#eee":ui.bg,color:aiLoading?"#999":ui.color,cursor:aiLoading?"wait":"pointer"}}>
        {aiLoading?"⏳ Đang phân tích...":"✨ "+ui.btnText}
      </button>

      {aiResponse&&<div style={{marginTop:10,padding:"12px",background:"#fff",borderRadius:8,border:"1px solid #E0E0E0",fontSize:13,lineHeight:1.7,color:"#333",whiteSpace:"pre-wrap"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontWeight:800,color:"#1E40AF"}}>🤖 Gợi ý từ AI</span>
          <button onClick={()=>setAiResponse(null)} style={{fontSize:11,color:"#999",background:"none",border:"none",cursor:"pointer"}}>✕ Đóng</button>
        </div>
        {aiResponse}
      </div>}
    </div>

    {showPT&&<div style={{padding:"16px",background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)",borderRadius:12,border:"2px solid #818CF8"}}>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
        <span style={{fontSize:18}}>🏆</span>
        <span style={{fontSize:15,fontWeight:800,color:"#3730A3"}}>Đã đến lúc thuê PT?</span>
      </div>
      <div style={{fontSize:13,color:"#4338CA",lineHeight:1.6,marginBottom:10}}>
        Sau 1 tháng tự tập, kết quả chưa như mong đợi. Personal Trainer sẽ giúp:
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12,fontSize:13,color:"#4338CA"}}>
        {["Thiết kế giáo án phù hợp thể trạng","Điều chỉnh form tập, tránh chấn thương","Tư vấn dinh dưỡng chuyên sâu","Đột phá plateau nhanh hơn"].map((t,i)=>
          <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:"#34A853",fontWeight:900}}>✓</span>{t}
          </div>
        )}
      </div>
      <button onClick={()=>{
        const msg=`Tôi đang ${goalLabel}, ${curKg}kg muốn ${goalKg}kg, tập gym ${profile.gym} buổi/tuần ở Hà Nội. Gợi ý cách chọn PT phù hợp, budget hợp lý.`;
        setAiResponse(null);setAiLoading(true);
        (async()=>{try{
          const provider=appSettings.ai_provider||"gpt";
          const keys={gpt:appSettings.gpt_key,claude:appSettings.claude_key,gemini:appSettings.gemini_key};
          let text="";
          if(provider==="gpt"){
            const res=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",
              headers:{"Content-Type":"application/json","Authorization":`Bearer ${keys.gpt}`},
              body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:msg}],max_tokens:500})});
            const d=await res.json();text=d.choices?.[0]?.message?.content||"";
          }else if(provider==="claude"){
            const res=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{method:"POST",
              headers:{"Content-Type":"application/json"},
              body:JSON.stringify({foodDesc:msg,provider:"claude",model:"claude-sonnet-4-20250514",apiKey:keys.claude})});
            const d=await res.json();text=d.text||"";
          }else{
            const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keys.gemini}`,
              {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:msg}]}]})});
            const d=await res.json();text=d.candidates?.[0]?.content?.parts?.[0]?.text||"";
          }
          setAiResponse(text.trim());
        }catch(e){setAiResponse("❌ Lỗi: "+e.message);}setAiLoading(false);})();
      }} style={{fontSize:13,fontWeight:700,padding:"10px 16px",borderRadius:8,border:"none",background:"#6366F1",color:"#fff",cursor:"pointer"}}>
        🔍 Tìm PT phù hợp
      </button>
    </div>}
  </div>;
}

function ReportView({weightLog,profile,macro,getMealHistory,getDailyLogs,appSettings,mob}){
  const [period,setPeriod]=useState("month"); // "week" or "month"
  const [offset,setOffset]=useState(0); // 0=current, -1=prev, etc
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);

  // Calculate date range
  const getDateRange=useCallback(()=>{
    const now=new Date();
    if(period==="week"){
      const d=new Date(now);d.setDate(d.getDate()+offset*7);
      const day=d.getDay();const mon=new Date(d);mon.setDate(d.getDate()-(day===0?6:day-1));
      const sun=new Date(mon);sun.setDate(mon.getDate()+6);
      return{start:mon.toISOString().slice(0,10),end:sun.toISOString().slice(0,10),label:`${mon.getDate()}/${mon.getMonth()+1} - ${sun.getDate()}/${sun.getMonth()+1}`};
    }else{
      const d=new Date(now.getFullYear(),now.getMonth()+offset,1);
      const last=new Date(d.getFullYear(),d.getMonth()+1,0);
      const months=["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
      return{start:d.toISOString().slice(0,10),end:last.toISOString().slice(0,10),label:`${months[d.getMonth()]}, ${d.getFullYear()}`};
    }
  },[period,offset]);

  // Load data — try daily_logs first, fallback to meal_logs
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const range=getDateRange();
      const byDate={};

      // === Source 1: daily_logs (new, preferred) ===
      if(getDailyLogs){
        const dailyLogs=await getDailyLogs(range.start,range.end);
        if(dailyLogs&&dailyLogs.length>0){
          dailyLogs.forEach(d=>{
            byDate[d.log_date]={
              cal:d.total_cal||0,
              p:Number(d.total_protein)||0,
              c:Number(d.total_carb)||0,
              f:Number(d.total_fat)||0,
              fiber:Number(d.total_fiber)||0,
              items:(d.meals||[]).flatMap(m=>(m.items||[])),
              meals:(d.meals||[]).map(m=>m.meal_id),
            };
          });
        }
      }

      // === Source 2: meal_logs fallback (old data) ===
      if(Object.keys(byDate).length===0&&getMealHistory){
        const logs=await getMealHistory(range.start,range.end);
        logs.forEach(l=>{
          if(!byDate[l.log_date])byDate[l.log_date]={cal:0,p:0,c:0,f:0,fiber:0,items:[],meals:[]};
          byDate[l.log_date].cal+=(l.total_cal||0);
          byDate[l.log_date].p+=(l.total_protein||0);
          byDate[l.log_date].c+=(l.total_carb||0);
          byDate[l.log_date].f+=(l.total_fat||0);
          byDate[l.log_date].meals.push(l.meal_id);
          (l.items||[]).forEach(it=>byDate[l.log_date].items.push(it));
        });
      }
      const dates=Object.keys(byDate).sort();
      const daysLogged=dates.length;
      const totalDays=Math.ceil((new Date(range.end)-new Date(range.start))/(86400000))+1;
      const avgCal=daysLogged>0?Math.round(dates.reduce((s,d)=>s+byDate[d].cal,0)/daysLogged):0;
      const avgP=daysLogged>0?Math.round(dates.reduce((s,d)=>s+byDate[d].p,0)/daysLogged*10)/10:0;
      const avgC=daysLogged>0?Math.round(dates.reduce((s,d)=>s+byDate[d].c,0)/daysLogged*10)/10:0;
      const avgF=daysLogged>0?Math.round(dates.reduce((s,d)=>s+byDate[d].f,0)/daysLogged*10)/10:0;
      // Adherence: days within ±10% of target
      const target=macro.calTarget||2000;
      const adhereDays=dates.filter(d=>byDate[d].cal>=target*0.9&&byDate[d].cal<=target*1.1).length;
      // Streak
      const today=new Date().toISOString().slice(0,10);
      let streak=0;const checkDate=new Date();
      for(let i=0;i<60;i++){const ds=checkDate.toISOString().slice(0,10);if(byDate[ds])streak++;else if(i>0)break;checkDate.setDate(checkDate.getDate()-1);}
      // Top foods
      const foodCount={};const foodProtein={};
      dates.forEach(d=>byDate[d].items.forEach(it=>{
        const name=(it.food||it.name||"").toLowerCase().trim();if(!name)return;
        foodCount[name]=(foodCount[name]||0)+1;
        foodProtein[name]=(foodProtein[name]||0)+(it.p||it.protein||0);
      }));
      const topFoods=Object.entries(foodCount).sort((a,b)=>b[1]-a[1]).slice(0,5);
      const topProtein=Object.entries(foodProtein).sort((a,b)=>b[1]-a[1]).slice(0,5);
      // Chart aggregation: WEEK → 7 daily bars, MONTH → weekly bars
      const weeks=[];
      if(period==="week"){
        // 7 bars = 7 ngày trong tuần
        const dayNames=["CN","T2","T3","T4","T5","T6","T7"];
        const startD=new Date(range.start);
        for(let i=0;i<7;i++){
          const d=new Date(startD);d.setDate(startD.getDate()+i);
          const ds=d.toISOString().slice(0,10);
          const dayIdx=d.getDay(); // 0=CN,1=T2...
          weeks.push({label:dayNames[dayIdx],cal:byDate[ds]?byDate[ds].cal:0,days:byDate[ds]?1:0,date:ds});
        }
      }else{
        // Gộp theo tuần khi xem tháng
        let weekStart=new Date(range.start);
        while(weekStart<=new Date(range.end)){
          const we=new Date(weekStart);we.setDate(we.getDate()+6);
          const wDates=dates.filter(d=>d>=weekStart.toISOString().slice(0,10)&&d<=we.toISOString().slice(0,10));
          const wCal=wDates.length>0?Math.round(wDates.reduce((s,d)=>s+byDate[d].cal,0)/wDates.length):0;
          weeks.push({label:`T${weeks.length+1}`,cal:wCal,days:wDates.length});
          weekStart.setDate(weekStart.getDate()+7);
        }
      }
      // Weight data
      const startKg=weightLog.length>0?weightLog[0].kg:profile.kg;
      const curKg=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg;
      const goalKg=profile.goalKg||startKg;
      const wPct=goalKg!==startKg?Math.round(((curKg-startKg)/(goalKg-startKg))*100):0;

      setData({range,byDate,dates,daysLogged,totalDays,avgCal,avgP,avgC,avgF,adhereDays,streak,topFoods,topProtein,weeks,target,startKg,curKg,goalKg,wPct});
      setLoading(false);
    })();
  },[getMealHistory,getDailyLogs,getDateRange,weightLog,profile,macro]);

  const range=getDateRange();

  if(loading)return <div style={{textAlign:"center",padding:40,color:C.t3}}>Đang tải báo cáo...</div>;
  if(!data||data.daysLogged===0)return <div>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",background:"#F3F4F6",borderRadius:8,overflow:"hidden",padding:2}}>
        <div onClick={()=>{setPeriod("week");setOffset(0);}} style={{padding:"6px 12px",fontSize:12,fontWeight:700,color:period==="week"?"#007AFF":"#9CA3AF",background:period==="week"?"#fff":"transparent",borderRadius:6,cursor:"pointer"}}>Tuần</div>
        <div onClick={()=>{setPeriod("month");setOffset(0);}} style={{padding:"6px 12px",fontSize:12,fontWeight:700,color:period==="month"?"#007AFF":"#9CA3AF",background:period==="month"?"#fff":"transparent",borderRadius:6,cursor:"pointer"}}>Tháng</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div onClick={()=>setOffset(o=>o-1)} style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:"#fff",border:"1px solid #E5E7EB",cursor:"pointer",fontSize:12}}>◀</div>
        <span style={{fontSize:14,fontWeight:700,color:C.t1,minWidth:mob?100:140,textAlign:"center"}}>{range.label}</span>
        <div onClick={()=>setOffset(o=>Math.min(o+1,0))} style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:"#fff",border:"1px solid #E5E7EB",cursor:"pointer",fontSize:12,opacity:offset>=0?0.3:1}}>▶</div>
      </div>
    </div>
    <div style={{textAlign:"center",padding:40}}>
      <div style={{fontSize:40,marginBottom:8}}>📭</div>
      <div style={{fontSize:15,fontWeight:700,color:C.t2}}>Chưa có dữ liệu cho {range.label}</div>
      <div style={{fontSize:13,color:C.t3,marginTop:4}}>Dùng nút ◀ ▶ để xem kỳ khác.</div>
    </div>
  </div>;

  const maxWeekCal=Math.max(...data.weeks.map(w=>w.cal),data.target);

  return <div>
    {/* Period toggle + nav */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",background:"#F3F4F6",borderRadius:8,overflow:"hidden",padding:2}}>
        <div onClick={()=>{setPeriod("week");setOffset(0);}} style={{padding:"6px 12px",fontSize:12,fontWeight:700,color:period==="week"?"#007AFF":"#9CA3AF",background:period==="week"?"#fff":"transparent",borderRadius:6,cursor:"pointer"}}>Tuần</div>
        <div onClick={()=>{setPeriod("month");setOffset(0);}} style={{padding:"6px 12px",fontSize:12,fontWeight:700,color:period==="month"?"#007AFF":"#9CA3AF",background:period==="month"?"#fff":"transparent",borderRadius:6,cursor:"pointer"}}>Tháng</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <div onClick={()=>setOffset(o=>o-1)} style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:"#fff",border:"1px solid #E5E7EB",cursor:"pointer",fontSize:12}}>◀</div>
        <span style={{fontSize:14,fontWeight:700,color:C.t1,minWidth:mob?100:140,textAlign:"center"}}>{range.label}</span>
        <div onClick={()=>setOffset(o=>Math.min(o+1,0))} style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:"#fff",border:"1px solid #E5E7EB",cursor:"pointer",fontSize:12,opacity:offset>=0?0.3:1}}>▶</div>
      </div>
    </div>

    {/* Streak */}
    {data.streak>0&&<div style={{background:"#FEF3C7",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:8,border:"1px solid #FDE68A"}}>
      <span style={{fontSize:22}}>🔥</span>
      <div><div style={{fontSize:15,fontWeight:700,color:"#92400E"}}>{data.streak} ngày liên tiếp</div></div>
    </div>}

    {/* 4 Metrics */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>TB Calo/ngày</div><div style={{fontSize:22,fontWeight:700}}>{data.avgCal.toLocaleString()}</div><div style={{fontSize:11,marginTop:2,color:data.avgCal<data.target*0.95?"#B45309":data.avgCal<=data.target*1.05?"#16A34A":"#DC2626"}}>{data.avgCal<data.target*0.95?`⚠️ Thiếu ${data.target-data.avgCal} cal`:data.avgCal<=data.target*1.05?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${data.avgCal-data.target} cal`}</div></div>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>TB Protein</div><div style={{fontSize:22,fontWeight:700}}>{data.avgP}g</div><div style={{fontSize:11,marginTop:2,color:data.avgP>=macro.protein*0.9?"#22C55E":"#EF4444"}}>{data.avgP>=macro.protein*0.9?`✓ ${Math.round(data.avgP/macro.protein*100)}%`:`Thiếu ${Math.round(macro.protein-data.avgP)}g`}</div></div>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>Cân nặng</div><div style={{fontSize:22,fontWeight:700}}>{data.curKg} <span style={{fontSize:13,color:C.t3}}>kg</span></div><div style={{fontSize:11,marginTop:2,color:data.curKg>data.startKg?"#22C55E":"#EF4444"}}>{data.curKg>data.startKg?"+":"" }{Math.round((data.curKg-data.startKg)*10)/10} kg từ đầu</div></div>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>Tỷ lệ đạt</div><div style={{fontSize:22,fontWeight:700}}>{data.daysLogged>0?Math.round(data.adhereDays/data.daysLogged*100):0}%</div><div style={{fontSize:11,marginTop:2,color:C.t3}}>{data.adhereDays}/{data.daysLogged} ngày đạt (±10%)</div></div>
    </div>

    {/* Goal ETA */}
    <div style={{...card,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>🎯 Mục tiêu cân nặng</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,height:8,background:"#F3F4F6",borderRadius:4,overflow:"hidden"}}><div style={{width:`${Math.max(0,Math.min(data.wPct,100))}%`,height:"100%",background:"linear-gradient(90deg,#36A3FF,#007AFF,#0057FF)",borderRadius:4}}/></div>
        <span style={{fontSize:13,fontWeight:700,color:"#007AFF"}}>{Math.round(data.wPct)}%</span>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:4}}>{data.startKg} → {data.goalKg} kg · Hiện tại: {data.curKg} kg</div>
    </div>

    {/* Calo chart */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:20}}>
      <span style={{fontSize:mob?16:18}}>📊</span>
      <span style={{fontSize:mob?17:17,fontWeight:800,color:C.t1,letterSpacing:"0.06em"}}>{period==="week"?"Calo theo ngày":"Calo theo tuần"}</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)"}}/>
    </div>
    <div style={{...card}}>
      {(()=>{
        const colors=["#007AFF","#36A3FF","#007AFF","#36A3FF","#007AFF"];
        const allVals=data.weeks.map(w=>w.cal).filter(v=>v>0);
        const maxVal=Math.max(...allVals,data.target)*1.1;
        const minVal=0;
        const chartH=120;
        const goalPct=((data.target-minVal)/(maxVal-minVal))*100;
        // Y axis labels
        const ySteps=[0,Math.round(maxVal*0.33),Math.round(maxVal*0.66),Math.round(maxVal)];
        return <div style={{position:"relative"}}>
          <div style={{display:"flex",gap:0}}>
            {/* Bars */}
            <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:mob?3:6,height:chartH,borderBottom:`1px solid ${C.border}`,paddingLeft:4}}>
              {data.weeks.map((w,i)=>{const c=colors[i%colors.length];const pct=maxVal>0?w.cal/maxVal:0;return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
                <div style={{fontSize:10,color:C.t2,fontWeight:700,marginBottom:2}}>{w.cal>0?w.cal.toLocaleString():""}</div>
                <div style={{width:"70%",background:w.days>0?`linear-gradient(180deg,${c},${c}99)`:"#F3F4F6",borderRadius:"4px 4px 0 0",height:`${Math.max(2,pct*100)}%`,opacity:w.days>0?0.9:0.15,boxShadow:w.days>0?`0 -2px 8px ${c}33`:"none",transition:"height 0.3s"}}/>
              </div>})}
            </div>
          </div>
          {/* X labels */}
          <div style={{display:"flex",gap:mob?3:6}}>
            {data.weeks.map((w,i)=><div key={i} style={{flex:1,textAlign:"center",fontSize:11,fontWeight:700,color:C.t2,paddingTop:4}}>{w.label}</div>)}
          </div>
          <div style={{textAlign:"center",fontSize:13,color:C.t3,marginTop:8}}>🎯 Mục tiêu: <span style={{fontWeight:800,color:"#0F172A",fontSize:14}}>{data.target.toLocaleString()} cal/ngày</span></div>
        </div>;
      })()}
    </div>

    {/* Macro donut */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:20}}>
      <span style={{fontSize:mob?16:18}}>🍵</span>
      <span style={{fontSize:mob?17:17,fontWeight:800,color:C.t1,letterSpacing:"0.06em"}}>Macro TB/ngày</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)"}}/>
    </div>
    <div style={{...card}}>
      <div style={{display:"flex",gap:mob?12:16,alignItems:"center"}}>
        <div style={{width:mob?80:90,height:mob?80:90,borderRadius:"50%",background:`conic-gradient(#007AFF 0% ${data.avgP/((data.avgP+data.avgC+data.avgF)||1)*100}%, #5AC8FA ${data.avgP/((data.avgP+data.avgC+data.avgF)||1)*100}% ${(data.avgP+data.avgC)/((data.avgP+data.avgC+data.avgF)||1)*100}%, #8E8E93 ${(data.avgP+data.avgC)/((data.avgP+data.avgC+data.avgF)||1)*100}% 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:mob?50:56,height:mob?50:56,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?13:14,fontWeight:700}}>{data.avgCal}</div>
        </div>
        <div style={{flex:1,fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#007AFF"}}/> Protein</span><span style={{fontWeight:700}}>{data.avgP}g</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#5AC8FA"}}/> Carb</span><span style={{fontWeight:700}}>{data.avgC}g</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#8E8E93"}}/> Fat</span><span style={{fontWeight:700}}>{data.avgF}g</span></div>
        </div>
      </div>
    </div>

    {/* Top foods */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:20}}>
      <span style={{fontSize:mob?16:18}}>🏆</span>
      <span style={{fontSize:mob?17:17,fontWeight:800,color:C.t1,letterSpacing:"0.06em"}}>Top thực phẩm</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)"}}/>
    </div>
    <div style={{...card}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:mob?8:16}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#007AFF",marginBottom:8}}>🥩 Top nguồn Protein</div>
          {data.topProtein.map(([name,p],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,borderBottom:"0.5px solid #F3F4F6"}}><span>{i+1}. {name}</span><span style={{color:C.t3}}>{Math.round(p)}g P</span></div>)}
          {data.topProtein.length===0&&<div style={{fontSize:12,color:C.t3}}>Chưa có dữ liệu</div>}
        </div>
        <div style={{width:1,background:"#E5E7EB"}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#5AC8FA",marginBottom:8}}>⭐ Ăn nhiều nhất</div>
          {data.topFoods.map(([name,count],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,borderBottom:"0.5px solid #F3F4F6"}}><span>{i+1}. {name}</span><span style={{color:C.t3}}>{count} lần</span></div>)}
          {data.topFoods.length===0&&<div style={{fontSize:12,color:C.t3}}>Chưa có dữ liệu</div>}
        </div>
      </div>
    </div>
  </div>;
}

function Dashboard({weightLog,addWeight,profile,setProfile,macro,getMeals,appSettings,setTab,user,getWeeklyTemplate,applyTemplate,userDataLoaded,macroBanner}){if(!profile||!macro)return null;
  const mob=useIsMobile();
  const [showWeightInput,setShowWeightInput]=useState(false);
  const weightInputRef=useRef(null);
  const [weightSaved,setWeightSaved]=useState(false);
  // Dashboard date nav
  const [dashDate,setDashDate]=useState(new Date());
  const isToday=dashDate.toDateString()===new Date().toDateString();
  // Auto-detect dayType from gymDays + today
  const gymDays=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
  const todayDayIdx=new Date().getDay();// 0=CN,1=T2...
  const todayIsGym=gymDays.includes(todayDayIdx===0?6:todayDayIdx-1);// gymDays: 0=T2,1=T3...6=CN
  const [dayType,setDayType]=useState(todayIsGym?"train":"rest");
  // Sync dayType when appSettings.gymDays loads (may load after initial render)
  useEffect(()=>{
    const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):null;}catch(e){return null;}})();
    if(!gd)return;// not loaded yet, keep default
    const idx=new Date().getDay();
    const mapped=idx===0?6:idx-1;
    const isGym=gd.includes(mapped);
    setDayType(isGym?"train":"rest");
  },[appSettings.gymDays]);
  // Auto-apply weekly template only if NO meals saved for today
  useEffect(()=>{
    if(!getWeeklyTemplate||!applyTemplate||!getMeals||!userDataLoaded)return;
    const today=new Date().toISOString().slice(0,10);
    const appliedKey="fitpilot_tpl_applied";
    try{if(localStorage.getItem(appliedKey)===today)return;}catch(e){}
    // Check if user already has meals today → don't overwrite
    const currentMeals=getMeals(todayIsGym?"train":"rest");
    const hasMeals=currentMeals.some(m=>m.items&&m.items.length>0);
    if(hasMeals){
      try{localStorage.setItem(appliedKey,today);}catch(e){}
      return;// already has meals, skip template
    }
    const dayKeys=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
    const todayKey=dayKeys[new Date().getDay()];
    const tpl=getWeeklyTemplate(todayKey);
    if(tpl&&tpl.meals&&tpl.meals.length>0){
      try{localStorage.setItem(appliedKey,today);}catch(e){}
      applyTemplate(tpl);
      setDayType(tpl.day_type||"train");
      console.log("✅ Auto-applied weekly template:",todayKey,tpl.day_type);
    }
  },[getWeeklyTemplate,applyTemplate,getMeals,userDataLoaded]);

  // Auto version check — force clear cache when admin updates app_version
  const APP_VERSION="2.6";
  useEffect(()=>{
    const serverVersion=appSettings.app_version;
    if(serverVersion){
      const localVersion=localStorage.getItem("fipilot_version");
      if(localVersion&&localVersion!==serverVersion){
        localStorage.setItem("fipilot_version",serverVersion);
        caches.keys().then(names=>Promise.all(names.map(k=>caches.delete(k)))).then(()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
          window.location.reload(true);
        });
      }else if(!localVersion){
        localStorage.setItem("fipilot_version",serverVersion);
      }
    }
  },[appSettings.app_version]);
  // Parse meal config
  const mealConfig=(()=>{try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
  const visibleIds=mealConfig[dayType]||DEFAULT_MEAL_CONFIG[dayType];
  const allMeals=getMeals(dayType);
  const meals=allMeals.filter(m=>visibleIds.includes(m.id));
  const totals=meals.reduce((acc,m)=>{const mt=m.items.reduce((a,i)=>({p:a.p+(i.p||0),c:a.c+(i.c||0),f:a.f+(i.f||0),fiber:a.fiber+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});return{p:acc.p+mt.p,c:acc.c+mt.c,f:acc.f+mt.f,fiber:acc.fiber+mt.fiber,cal:acc.cal+mt.cal};},{p:0,c:0,f:0,fiber:0,cal:0});
  const heroP=macro.protein, heroF=macro.fat, heroFiber=macro.fiber;
  const heroC=dayType==="train"?macro.carb:macro.carbRest;
  const heroCal=dayType==="train"?macro.calTarget:macro.calRest;
  const target=macro.calTarget,calPct=Math.min((heroCal/target)*100,100),goalKg=profile.goalKg,startKg=weightLog.length>0?weightLog[0].kg:profile.kg,curKg=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg,wPct=goalKg!==startKg?((curKg-startKg)/(goalKg-startKg))*100:0;
  const actualCal=Math.round(totals.cal), actualP=Math.round(totals.p), actualC=Math.round(totals.c), actualF=Math.round(totals.f), actualFiber=Math.round(totals.fiber);
  const calDiff=actualCal-heroCal, calStatus=actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"✅":actualCal<heroCal*0.95?"⚠️":"🔴";
  const calRemain=heroCal-actualCal;
  // Exercise type helpers
  const exType=profile.exerciseType||"gym";
  const exLabel=exType==="gym"?"Gym":exType==="gym_cardio"?"Gym+Cardio":exType==="cardio"?"Cardio":exType==="none"?"Nghỉ ngơi":"Tập luyện";
  const exIcon=exType==="gym"?"🏋️":exType==="gym_cardio"?"🏋️":exType==="cardio"?"🏃":exType==="none"?"😴":"🏃";
  // Greeting
  const displayName=user?.user_metadata?.username||user?.email?.split("@")[0]||"bạn";

  return <div>
    {/* Greeting Header — mobile only */}
    {mob&&<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <UserAvatar gender={profile.gender} size={48}/>
      <div style={{flex:1}}>
        <div style={{fontSize:mob?16:18,fontWeight:800,color:C.t1}}>Chào {displayName}! 👋</div>
        <div style={{fontSize:mob?13:13,fontWeight:600,color:C.t2}}>
          {dayType==="train"?"Ngày tập":"Ngày nghỉ"} • {new Date().toLocaleDateString("vi-VN",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric"})}
        </div>
      </div>
      <NotiBell appSettings={appSettings}/>
    </div>}

    {/* Hero — White card */}
    <div style={{...card,padding:mob?"16px":"24px",border:`1.5px solid ${C.border}`}}>
      {macroBanner&&<div style={{background:"#DCFCE7",border:"1.5px solid #86EFAC",borderRadius:10,padding:"8px 12px",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:14}}>🔄</span>
        <span style={{fontSize:12,fontWeight:700,color:"#14532D"}}>Macro cập nhật: {macroBanner.prev.toLocaleString()} → {macroBanner.now.toLocaleString()} cal ({macroBanner.diff>0?"+":""}{macroBanner.diff})</span>
      </div>}
      <div style={{fontSize:mob?17:18,fontWeight:600,color:C.t1,marginBottom:4}}>{dayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
        <div style={{fontSize:mob?36:44,fontWeight:900,color:C.primary,letterSpacing:"-0.03em",lineHeight:1.1}}>
          {actualCal>0?actualCal.toLocaleString():heroCal.toLocaleString()}
        </div>
        <div style={{fontSize:mob?14:16,fontWeight:700,color:C.t3}}>/ {heroCal.toLocaleString()} kcal</div>
      </div>
      {((profile.calorieMode||"standard")==="asian"||(profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"))&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6,alignItems:"center"}}>{(profile.calorieMode||"standard")==="asian"&&<span style={{fontSize:11,fontWeight:700,color:"#007AFF",padding:"4px 10px",background:"rgba(0,122,255,0.08)",borderRadius:6,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🇻🇳 Calo chuẩn Việt Nam</span>}{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:11,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),padding:"4px 10px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)"),borderRadius:6,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}</div>}
      {actualCal>0&&<div style={{marginTop:6}}>
        <span style={{fontSize:13,fontWeight:700,color:(()=>{const pp=heroCal>0?Math.round(actualCal/heroCal*100):0;return pp<95?"#B45309":pp<=105?"#16A34A":"#DC2626";})()}}>{(()=>{const pp=heroCal>0?Math.round(actualCal/heroCal*100):0;return pp<95?`⚠️ Còn thiếu ${calRemain} kcal`:pp<=105?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${Math.abs(calRemain)} kcal`;})()}</span>
      </div>}
      {/* Progress bar */}
      <div style={{height:8,width:"100%",background:"#F3F4F6",borderRadius:4,marginTop:10,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(actualCal>0?(actualCal/heroCal)*100:0,120)}%`,background:"linear-gradient(90deg,#36A3FF,#007AFF,#0057FF)",borderRadius:4,transition:"width 0.4s"}}/>
      </div>
      {/* Macro rings */}
      <div style={{display:"flex",gap:mob?6:14,justifyContent:"space-around",marginTop:16}}>
        <MacroRing l="Protein" v={actualP>0?actualP:heroP} max={heroP} color="#007AFF" color2="#007AFF" sub={actualP>0?`/${heroP}g`:null} unit="g"/>
        <MacroRing l="Carb" v={actualC>0?actualC:heroC} max={heroC} color="#5AC8FA" color2="#5AC8FA" sub={actualC>0?`/${heroC}g`:null} unit="g"/>
        <MacroRing l="Fat" v={actualF>0?actualF:heroF} max={heroF} color="#8E8E93" color2="#8E8E93" sub={actualF>0?`/${heroF}g`:null} unit="g"/>
        <MacroRing l="Xơ" v={actualFiber>0?actualFiber:heroFiber} max={heroFiber} color="#34C759" color2="#34C759" sub={actualFiber>0?`/${heroFiber}g`:null} unit="g"/>
      </div>
    </div>

    {/* Stats — Clean white cards with SVG icons */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
      {[
        {l:"Chiều cao",v:profile.cm,u:"cm",icon:"stat_height"},
        {l:"Cân nặng",v:curKg,u:"kg",icon:"stat_weight"},
        {l:"BMI",v:macro.bmi,u:macro.bmi<18.5?"Gầy":macro.bmi<25?"OK":"Thừa",icon:"stat_bmi"},
        {l:exLabel,v:exType==="none"?"—":({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất chăm",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn",u:"",icon:exType==="gym"?"stat_gym":exType==="gym_cardio"?"ex_gym_cardio":exType==="cardio"?"ex_cardio":"ex_none"},
      ].map((s,i)=>(
        <div key={i} style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:44,height:44,borderRadius:11,background:"rgba(0,122,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <img src={`/icons/${s.icon}.png`} alt="" style={{width:34,height:34,objectFit:"contain"}}/>
          </div>
          <div>
            <div style={{fontSize:mob?13:12,fontWeight:700,color:C.t2}}>{s.l}</div>
            <div style={{fontSize:mob?18:18,fontWeight:800,color:C.t1}}>{s.v} <span style={{fontSize:mob?11:11,fontWeight:700,color:C.t2}}>{s.u}</span></div>
          </div>
        </div>
      ))}
    </div>

    {/* Section label: Dynamic meal label + Date Nav */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{fontSize:mob?18:24}}>{dayType==="train"?"💪":"😴"}</span>
      <span style={{fontSize:mob?18:18,fontWeight:800,color:C.t1,letterSpacing:"0.06em"}}>{dayType==="train"?"Thực đơn ngày tập":"Thực đơn ngày nghỉ"}</span>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)"}}/>
      <span style={{fontSize:13,fontWeight:700,color:C.secondary}}>{String(new Date().getDate()).padStart(2,"0")}/{String(new Date().getMonth()+1).padStart(2,"0")}/{new Date().getFullYear()}</span>
    </div>

    {meals.map(m=><MealCard key={m.id} meal={m}/>)}

    {/* Empty state CTA — no meals logged */}
    {meals.every(m=>!m.items||m.items.length===0)&&<div style={{...card,border:"2px dashed #CDCDCD",background:"transparent",textAlign:"center",padding:"20px 16px"}}>
      <div style={{fontSize:28,marginBottom:6}}>🍽️</div>
      <div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>Chưa có bữa ăn nào</div>
      <div style={{fontSize:12,fontWeight:600,color:C.t3,marginBottom:12}}>Nhập thức ăn để theo dõi macro hàng ngày</div>
      <button onClick={()=>setTab&&setTab("meals")} style={{...redBtn,width:"auto",display:"inline-block",padding:"10px 24px",fontSize:13}}>🍽️ Nhập bữa ăn đầu tiên →</button>
    </div>}

    {/* Compact evaluation */}
    {actualCal>0&&<div style={{...card,padding:"12px 16px",marginTop:6,
      background:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"rgba(52,199,89,0.06)":"rgba(245,158,11,0.06)",
      border:`1.5px solid ${actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"#34C759":"#F59E0B"}`,
    }}>
      <div style={{fontSize:13,fontWeight:700,lineHeight:1.6,
        color:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?"#059669":"#B45309",
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

    {heroCal<target&&<div style={{...card,background:"rgba(0,122,255,0.04)",border:`1.5px solid ${C.primary}`}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{fontSize:16,fontWeight:900,color:C.primary}}>✨</span>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:C.primary,marginBottom:2}}>Gợi ý AI</div>
          <div style={{fontSize:14,fontWeight:600,color:C.t1,lineHeight:1.5}}>Thiếu {target-heroCal} cal. Thêm sữa tươi không đường (+120 cal) hoặc 30g hạt điều (+175 cal).</div>
        </div>
      </div>
    </div>}

    {/* Weight Chart */}
    <div style={{...card,marginTop:24,borderTop:"3px solid",borderImage:"linear-gradient(90deg,#36A3FF,#007AFF,#0057FF) 1"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>📈</span><span style={{fontSize:mob?19:17,fontWeight:800,color:C.t1}}>Theo dõi cân nặng</span></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontSize:13,fontWeight:700,color:C.t2}}>🎯 <span style={{color:C.secondary,fontWeight:900}}>{goalKg} kg</span></div>
          <button onClick={()=>setShowWeightInput(!showWeightInput)} style={{width:24,height:24,borderRadius:6,background:"transparent",color:C.secondary,border:`1px solid ${C.secondary}`,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>{showWeightInput?"✕":"+"}</button>
        </div>
      </div>

      {/* Quick weight input */}
      {showWeightInput&&<div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1.5px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>⚡ Nhập nhanh cân nặng</div>
            <input ref={weightInputRef} type="text" inputMode="decimal" placeholder={`VD: ${(curKg+0.3).toFixed(1)}`} style={{...inp,height:40,fontSize:15}}/>
          </div>
          <button onClick={async()=>{
            const val=parseFloat((weightInputRef.current?.value||"").replace(",","."));
            if(!val||val<30||val>200)return;
            await addWeight(val);
            setProfile({...profile,kg:val});
            if(weightInputRef.current)weightInputRef.current.value="";
            setShowWeightInput(false);
            setWeightSaved(true);setTimeout(()=>setWeightSaved(false),3000);
          }} style={{padding:"10px 16px",fontSize:13,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#15803D,#166534)",color:"#fff",cursor:"pointer",fontFamily:"inherit",height:40,marginTop:18}}>💾 Lưu</button>
        </div>
      </div>}
      {weightSaved&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:800,color:"#14532D"}}>✓ Đã lưu cân nặng!</span>
      </div>}

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"Xuất phát",v:startKg,c:C.t1},
          {l:"Hiện tại",v:curKg,c:"#4285F4"},
          {l:"Mục tiêu",v:goalKg,c:"#34A853"},
          {l:"Tiến độ",v:Math.max(0,Math.min(100,Math.round(wPct)))+"%",c:"#F4B400"},
        ].map((s,i)=><div key={i} style={{background:C.card,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:mob?11:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.t1,marginBottom:2}}>{s.l}</div>
          <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
          <div style={{fontSize:mob?12:13,fontWeight:700,color:C.t1}}>{i<3?"kg":("còn "+Math.abs(goalKg-curKg).toFixed(1)+" kg")}</div>
        </div>)}
      </div>

      {/* Bar chart */}
      {weightLog.length>=2&&<WeightBarChart weightLog={weightLog} goalKg={goalKg} goalType={profile.goalType} startKg={startKg} mob={mob}/>}
    </div>

    {/* Smart suggestions — outside chart card */}
    <WeightSuggestion weightLog={weightLog} goalKg={goalKg} goalType={profile.goalType} startKg={startKg} curKg={curKg} profile={profile} macro={macro} getMeals={getMeals} appSettings={appSettings}/>
  </div>;
}

function WeightRow({w,i,weightLog,setWeightLog,setProfile,profile,deleteWeight}){
  const [editing,setEditing]=useState(false);
  const [editVal,setEditVal]=useState(w.kg);
  return <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.1fr 0.7fr 0.5fr 0.8fr",gap:4,padding:"8px 0",fontSize:13,borderBottom:i<weightLog.length-1?`1px solid ${C.border}`:"none",alignItems:"center"}}>
    <span style={{fontWeight:800,color:wColors[i%wColors.length]}}>T{w.week}</span>
    <span style={{fontWeight:600,color:C.t2,fontSize:11}}>{w.date}</span>
    {editing
      ?<input type="text" inputMode="decimal" value={editVal} onChange={e=>{const v=e.target.value.replace(",",".").replace(/[^0-9.]/g,"");setEditVal(v===""?0:Number(v));}} style={{padding:"4px 6px",fontSize:16,textAlign:"right",border:`1.5px solid ${C.border}`,borderRadius:6,background:C.surface,color:C.t1,outline:"none",width:"100%",boxSizing:"border-box"}}/>
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
      }} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.redBg,color:C.secondary,border:`1px solid ${C.secondary}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
    </div>
  </div>;
}

function AdminPanel({weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile,macro,saveMealToCloud,saveFoodCache,deleteFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting,forcedSection,signOut,user,weeklyTemplates,saveWeeklyTemplate,getWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,applyTemplate,refreshDefaultTemplates,initialSection,hidePills}){if(!profile||!macro)return null;
  const mob=useIsMobile();
  const [section,setSection]=useState(initialSection||(forcedSection==="settings"?"profile":(forcedSection==="profile"?"profile":(forcedSection||"meals"))));
  useEffect(()=>{
    if(initialSection){setSection(initialSection);return;}
    if(forcedSection==="profile")setSection("profile");
    else if(forcedSection==="meals")setSection("meals");
    else if(forcedSection==="settings")setSection("profile");
    else if(forcedSection)setSection(forcedSection);
  },[forcedSection,isAdmin,initialSection]);
  const [profileAcc,setProfileAcc]=useState("info");
  const [dayType,setDayType]=useState(()=>{
    try{const saved=localStorage.getItem("fitpilot_dayType");if(saved==="train"||saved==="rest")return saved;}catch(e){}
    const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
    const todayIdx=new Date().getDay();// 0=CN,1=T2...
    const mappedIdx=todayIdx===0?6:todayIdx-1;// gymDays: 0=T2...6=CN
    return gd.includes(mappedIdx)?"train":"rest";
  });
  useEffect(()=>{try{localStorage.setItem("fitpilot_dayType",dayType);}catch(e){}},[dayType]);
  const [selectedMeal,setSelectedMeal]=useState("sang");
  const [mealMode,setMealMode]=useState(()=>{try{const s=localStorage.getItem("fitpilot_mealMode");if(s==="tu_nhap"||s==="lich_tuan"||s==="kho_mau")return s;}catch(e){}return "tu_nhap";}); // tu_nhap | lich_tuan | kho_mau
  useEffect(()=>{try{localStorage.setItem("fitpilot_mealMode",mealMode);}catch(e){}},[mealMode]);
  const [tplFilter,setTplFilter]=useState("all"); // template filter: all | train | rest
  const [expandedTpl,setExpandedTpl]=useState(null); // expanded template ID for detail view
  const [showSaveTpl,setShowSaveTpl]=useState(false); // popup save to weekly template
  const [showAssignDays,setShowAssignDays]=useState(null); // kho mau: which template showing day picker
  const [assignSelectedDays,setAssignSelectedDays]=useState([]); // selected days for assign
  // Unified food items per meal (for all-in-one input)
  const [allFoodItems,setAllFoodItems]=useState({});
  const [mealConfig,setMealConfig]=useState(()=>{
    try{const saved=appSettings.meal_config?JSON.parse(appSettings.meal_config):null;return saved||{...DEFAULT_MEAL_CONFIG};}
    catch(e){return {...DEFAULT_MEAL_CONFIG};}
  });
  // Load existing meals into allFoodItems on mount/dayType change (only for tu_nhap, not admin templates)
  const [userHasEdited,setUserHasEdited]=useState(false);
  useEffect(()=>{setUserHasEdited(false);},[dayType,section]);
  useEffect(()=>{
    const reset=()=>{if(document.visibilityState==="visible")setUserHasEdited(false);};
    document.addEventListener("visibilitychange",reset);
    return()=>{document.removeEventListener("visibilitychange",reset);};
  },[]);
  useEffect(()=>{
    if(!getMeals)return;
    if(userHasEdited)return;
    if(aiResult)return;
    // Admin templates section → always start empty
    if(section==="templates"){
      const init={};
      (mealConfig[dayType]||[]).forEach(mid=>{init[mid]=[{name:"",gram:"",unit:"g",qty:1}];});
      setAllFoodItems(init);
      return;
    }
    // tu_nhap → load existing meals
    const currentMeals=getMeals(dayType);
    const hasData=currentMeals.some(m=>m.items&&m.items.length>0);
    if(!hasData)return;
    const init={};
    const visibleIds=mealConfig[dayType]||[];
    visibleIds.forEach(mid=>{
      const meal=currentMeals.find(m=>m.id===mid);
      if(meal&&meal.items&&meal.items.length>0){
        init[mid]=meal.items.map(it=>({name:it.food||it.name||"",gram:it.gram||"",unit:it.unit||"g",qty:it.qty||1}));
      }else{
        init[mid]=[{name:"",gram:"",unit:"g",qty:1}];
      }
    });
    setAllFoodItems(init);
  },[dayType,getMeals,mealConfig,section,userHasEdited]);
  const [showMealSettings,setShowMealSettings]=useState(false);
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
  const [geminiModel,setGeminiModel]=useState(()=>appSettings.gemini_model||"gemini-2.5-flash");
  const [gptModel,setGptModel]=useState(()=>appSettings.gpt_model||"gpt-4o-mini");
  const [aiConnected,setAiConnected]=useState(true);
  // Shared keys: appSettings > localStorage
  const [claudeKey,setClaudeKey]=useState(()=>appSettings.claude_key||localStorage.getItem("claudeKey")||"");
  const [geminiKey,setGeminiKey]=useState(()=>appSettings.gemini_key||localStorage.getItem("geminiKey")||"");
  const [gptKey,setGptKey]=useState(()=>appSettings.gpt_key||localStorage.getItem("gptKey")||"");
  const [usdaKey,setUsdaKey]=useState(()=>appSettings.usda_key||localStorage.getItem("usdaKey")||"");

  // Sync appSettings when they load (async) — cloud always wins
  useEffect(()=>{
    if(appSettings.ai_provider)setAiProvider(appSettings.ai_provider);
    if(appSettings.claude_key)setClaudeKey(appSettings.claude_key);
    if(appSettings.gemini_key)setGeminiKey(appSettings.gemini_key);
    if(appSettings.gpt_key)setGptKey(appSettings.gpt_key);
    if(appSettings.usda_key)setUsdaKey(appSettings.usda_key);
    if(appSettings.gpt_model)setGptModel(appSettings.gpt_model);
    if(appSettings.gemini_model)setGeminiModel(appSettings.gemini_model);
    if(appSettings.ai_model)setAiModel(appSettings.ai_model);
    if(appSettings.meal_config){try{setMealConfig(JSON.parse(appSettings.meal_config));}catch(e){}}
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

  // Food items for AI calculation (set by tu_nhap before calling callAI)

  const prompt=`Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Lưu ý: đồ uống (sữa, nước ép, sinh tố) tính theo ml chứ không phải g. 1ml nước/sữa ≈ 1g.
Trả lời CHÍNH XÁC bằng JSON, không markdown, không giải thích:
{"items":[{"name":"tên","gram":số,"protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym"}`;

  const callAI=useCallback(async(forceRefresh=false,overrideFoods=null)=>{
    const itemsToCalc=overrideFoods||foodItems;
    if(itemsToCalc.length===0||itemsToCalc.every(f=>!f.name.trim()))return;
    setAiLoading(true);setAiError(null);setAiResult(null);
    const fc=forceRefresh?{}:(foodCache||{});
    const validItems=itemsToCalc.filter(f=>f.name.trim());

    // === STEP 1: LocalDB (192 món verified, ưu tiên cao nhất) ===
    const localResolved=[];const nonLocal=[];
    validItems.forEach(f=>{
      const unit=f.unit||"g";const isWeight=unit==="g"||unit==="ml";
      const gram=isWeight?(f.gram||100):estimateGram(f.name,unit,f.qty||1);
      const localResult=lookupLocalFood(f.name,gram||(isWeight?f.gram:100));
      if(localResult){
        localResolved.push({...localResult,name:f.name,unit,qty:f.qty||1,qty_display:isWeight?null:`${f.qty||1} ${unit}`,source:"localDB"});
      }else{nonLocal.push(f);}
    });

    // All from localDB → done
    if(nonLocal.length===0){
      setAiResult({items:localResolved,tip:`📦 ${localResolved.length} món từ kho dữ liệu nội bộ`});
      setAiLoading(false);return;
    }

    // === STEP 2: Cache (chỉ cho món ngoài localDB) ===
    const cached=[];const uncached=[];
    nonLocal.forEach(f=>{
      const unit=f.unit||"g";const isWeight=unit==="g"||unit==="ml";
      const k=f.name.toLowerCase().trim();
      if(fc[k]){
        const qty=f.qty||1;
        if(isWeight){
          const r=f.gram/(fc[k].gram||100);
          cached.push({name:f.name,gram:f.gram,unit,qty,qty_display:null,protein:Math.round(fc[k].p*r*10)/10,carb:Math.round(fc[k].c*r*10)/10,fat:Math.round(fc[k].f*r*10)/10,fiber:Math.round((fc[k].fiber||0)*r*10)/10,cal:Math.round(fc[k].cal*r),source:"cache"});
        }else{
          cached.push({name:f.name,gram:Math.round((fc[k].gram||0)*qty),unit,qty,qty_display:`${qty} ${unit}`,protein:Math.round(fc[k].p*qty*10)/10,carb:Math.round(fc[k].c*qty*10)/10,fat:Math.round(fc[k].f*qty*10)/10,fiber:Math.round((fc[k].fiber||0)*qty*10)/10,cal:Math.round(fc[k].cal*qty),source:"cache"});
        }
      }else{uncached.push(f);}
    });

    // LocalDB + cache cover all → done
    if(uncached.length===0){
      const allItems=[...localResolved,...cached];
      const sources=[...new Set(allItems.map(i=>i.source))];
      setAiResult({items:allItems,tip:sources.map(s=>s==="localDB"?"📦 Kho nội bộ":"💾 Cache").join(" + ")+" — không gọi API!"});
      setAiLoading(false);return;
    }

    // === STEP 3: USDA (chỉ search tên nguyên liệu raw, không search cách chế biến) ===
    const usdaResolved=[];const stillUncached=[];
    if(usdaKey){
      for(const f of uncached){
        try{
          const translated=translateFood(f.name);
          if(!translated){stillUncached.push(f);continue;}
          // Chỉ search foodEN (raw), KHÔNG gửi cookEN cho USDA
          const searchQuery=translated.foodEN;
          console.log("🔍 USDA search:",f.name,"→",searchQuery,"(raw only)");
          const result=await searchUSDA(searchQuery,usdaKey);
          if(result){
            const unit=f.unit||"g";const isWeight=unit==="g"||unit==="ml";
            const gram=f.gram||(isWeight?100:estimateGram(f.name,unit,f.qty));
            const macro=calcFromUSDA(result,gram);
            usdaResolved.push({name:f.name,gram,unit,qty:f.qty,qty_display:isWeight?null:`${f.qty} ${unit}`,...macro,source:"USDA"});
          }else{stillUncached.push(f);}
        }catch(e){console.error("USDA error:",e);stillUncached.push(f);}
      }
    }else{stillUncached.push(...uncached);}

    const allResolved=[...localResolved,...cached,...usdaResolved];

    // LocalDB + cache + USDA cover all → done, cache USDA items
    if(stillUncached.length===0){
      const newCacheEntries={};
      usdaResolved.forEach(it=>{
        const k=(it.name||"").toLowerCase().trim();
        const inputItem=uncached.find(f=>f.name.toLowerCase().trim()===k);
        const unit=inputItem?.unit||"g";const isWeight=unit==="g"||unit==="ml";
        const qty=inputItem?.qty||1;
        if(k){
          if(isWeight){
            const gram=inputItem?.gram||100;const r=100/gram;
            newCacheEntries[k]={p:Math.round((it.protein||0)*r*10)/10,c:Math.round((it.carb||0)*r*10)/10,f:Math.round((it.fat||0)*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round((it.cal||0)*r),gram:100};
          }else{
            newCacheEntries[k]={p:Math.round((it.protein||0)/qty*10)/10,c:Math.round((it.carb||0)/qty*10)/10,f:Math.round((it.fat||0)/qty*10)/10,fiber:Math.round((it.fiber||0)/qty*10)/10,cal:Math.round((it.cal||0)/qty),gram:Math.round((it.gram||0)/qty)};
          }
        }
      });
      const sources=[...new Set(allResolved.map(i=>i.source))];
      setAiResult({items:allResolved,tip:sources.map(s=>s==="localDB"?"📦 Kho nội bộ":s==="USDA"?"🔍 USDA":s==="cache"?"💾 Cache":"").filter(Boolean).join(" + "),...(Object.keys(newCacheEntries).length>0?{_cacheEntries:newCacheEntries}:{})});
      setAiLoading(false);return;
    }

    // === STEP 4: AI fallback (món lạ) ===
    const foodDesc=stillUncached.map(f=>{
      const unit=f.unit||"g";
      if(unit==="g"||unit==="ml") return `${f.qty>1?f.qty+" ":""}${f.name} ${f.gram}${unit}`;
      return `${f.qty} ${unit} ${f.name}`;
    }).join(", ");
    try{
      let text="";
      if(aiProvider==="claude"){
        const res=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{
          method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({foodDesc:`${prompt}\nThức ăn: ${foodDesc}`,provider:"claude",model:aiModel,apiKey:claudeKey})
        });
        const data=await res.json();
        if(data.error)throw new Error(data.error);
        text=data.text||"";
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
          body:JSON.stringify({model:gptModel,messages:[{role:"system",content:prompt},{role:"user",content:`Thức ăn cần phân tích:\n${foodDesc}`}],...(gptModel==="gpt-4o-mini"?{max_tokens:1000}:{max_completion_tokens:1000})})
        });
        const data=await res.json();
        if(data.error)throw new Error(data.error.message);
        text=data.choices?.[0]?.message?.content||"";
      }
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      const aiSourceLabel=aiProvider==="gpt"?"GPT":aiProvider==="claude"?"Claude":"Gemini";
      const aiItemsWithSource=(parsed.items||[]).map(it=>({...it,source:aiSourceLabel}));
      const newItems=[...allResolved,...aiItemsWithSource];
      // Cache AI results (only non-localDB items)
      const newCacheEntries={};
      [...usdaResolved,...(parsed.items||[])].forEach(it=>{
        const k=(it.name||"").toLowerCase().trim();
        const inputItem=uncached.find(f=>f.name.toLowerCase().trim()===k);
        const unit=inputItem?.unit||it.unit||"g";const isWeight=unit==="g"||unit==="ml";
        const qty=inputItem?.qty||1;
        if(k&&!fc[k]){
          if(isWeight){
            const gram=it.gram||inputItem?.gram||100;const r=100/gram;
            newCacheEntries[k]={p:Math.round((it.protein||0)*r*10)/10,c:Math.round((it.carb||0)*r*10)/10,f:Math.round((it.fat||0)*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round((it.cal||0)*r),gram:100};
          }else{
            newCacheEntries[k]={p:Math.round((it.protein||0)/qty*10)/10,c:Math.round((it.carb||0)/qty*10)/10,f:Math.round((it.fat||0)/qty*10)/10,fiber:Math.round((it.fiber||0)/qty*10)/10,cal:Math.round((it.cal||0)/qty),gram:Math.round((it.gram||0)/qty)};
          }
        }
      });
      setAiResult({items:newItems,tip:parsed.tip||"",_cacheEntries:newCacheEntries});
    }catch(err){setAiError(err.message||"Lỗi kết nối AI");console.error(err);}
    finally{setAiLoading(false);}
  },[foodItems,aiModel,aiProvider,claudeKey,geminiKey,gptKey,geminiModel,gptModel,foodCache,usdaKey]);

  const mealNames=ALL_MEALS.filter(m=>mealConfig[dayType]?.includes(m.id)).map(m=>({id:m.id,l:`${m.icon} ${m.name}`}));

  const providerName=aiProvider==="claude"?"Claude":aiProvider==="gemini"?"Gemini":"GPT";

  return <div>
    {!hidePills&&!forcedSection&&<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{id:"meals",l:"🍽️ Bữa ăn"},{id:"ai",l:"🤖 Kết nối AI"},...(isAdmin?[{id:"admin",l:"🔧 Quản trị"},{id:"templates",l:"📚 Mẫu"}]:[]),{id:"profile",l:"👤 Hồ sơ"},{id:"weight",l:"⚖️ Cân nặng"}].map(s=>
        <Pill key={s.id} active={section===s.id} onClick={()=>{setSection(s.id);if(s.id==="templates"){const init={};(mealConfig[dayType]||[]).forEach(mid=>{init[mid]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);setAiResult(null);}}}>{s.l}</Pill>
      )}
    </div>}
    {!hidePills&&forcedSection==="settings"&&<div style={{display:"flex",borderBottom:`2px solid ${C.border}`,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
      {[{id:"profile",t:"Hồ sơ",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pp1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="30" r="24" fill="url(#pp1)"/><path d="M4 96 C4 60 92 60 92 96 Z" fill="url(#pp1)"/></svg>},
        {id:"account",t:"Tài khoản",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="4" y="16" width="88" height="64" rx="12" fill="url(#pi5)"/><circle cx="28" cy="42" r="16" fill="white" opacity="0.95"/><circle cx="28" cy="37" r="7" fill="url(#pi5)"/><path d="M14 54 C14 46 42 46 42 54" fill="url(#pi5)"/><rect x="52" y="34" width="32" height="7" rx="3.5" fill="white" opacity="0.9"/><rect x="52" y="46" width="24" height="6" rx="3" fill="white" opacity="0.5"/></svg>},
        {id:"about",t:"Giới thiệu",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#pi4)"/><rect x="44" y="42" width="8" height="28" rx="4" fill="white"/><circle cx="48" cy="30" r="6" fill="white"/></svg>},
        ...(isAdmin?[{id:"admin",t:"Quản trị",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pq1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="4" y="10" width="88" height="76" rx="14" fill="url(#pq1)"/><rect x="4" y="10" width="88" height="24" rx="14" fill="white" opacity="0.12"/><circle cx="22" cy="22" r="5" fill="white" opacity="0.6"/><circle cx="36" cy="22" r="5" fill="white" opacity="0.4"/><polyline points="18,52 32,62 18,72" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><rect x="38" y="67" width="40" height="7" rx="3.5" fill="white" opacity="0.65"/></svg>}]:[]),
        ...(isAdmin?[{id:"templates",t:"Mẫu",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pq2" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="12" y="70" width="72" height="16" rx="8" fill="url(#pq2)" opacity="0.45"/><rect x="16" y="52" width="64" height="16" rx="8" fill="url(#pq2)" opacity="0.7"/><rect x="20" y="34" width="56" height="16" rx="8" fill="url(#pq2)"/><polygon points="48,6 51,18 64,18 54,25 58,37 48,30 38,37 42,25 32,18 45,18" fill="url(#pq2)"/></svg>},
          {id:"ai",t:"AI",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="28" y="28" width="40" height="40" rx="8" fill="url(#pi1)"/><rect x="36" y="36" width="24" height="24" rx="4" fill="white" opacity="0.2"/><rect x="14" y="36" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="14" y="46" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="14" y="56" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="68" y="36" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="68" y="46" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="68" y="56" width="14" height="5" rx="2.5" fill="url(#pi1)"/></svg>}]:[])
      ].map(s=>
        <button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"10px 14px",fontSize:13,fontWeight:section===s.id?800:600,border:"none",background:"transparent",cursor:"pointer",color:section===s.id?C.primary:C.t2,borderBottom:section===s.id?`3px solid ${C.primary}`:"3px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:4}}>{s.svg} {s.t}</button>
      )}
    </div>}
    {!hidePills&&forcedSection==="profile"&&<div style={{display:"flex",borderBottom:`2px solid ${C.border}`,marginBottom:16}}>
      {[{id:"profile",t:"Hồ sơ",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pp1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="30" r="24" fill="url(#pp1)"/><path d="M4 96 C4 60 92 60 92 96 Z" fill="url(#pp1)"/></svg>}
      ].map(s=>
        <button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"10px 14px",fontSize:13,fontWeight:section===s.id?800:600,border:"none",background:"transparent",cursor:"pointer",color:section===s.id?C.primary:C.t2,borderBottom:section===s.id?`3px solid ${C.primary}`:"3px solid transparent",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>{s.svg} {s.t}</button>
      )}
    </div>}

    {/* AI CONNECTION */}
    {section==="ai"&&<div style={card}>
      {/* Status bar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:16}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:aiConnected?C.green:C.red}}/>
        <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{providerName} · {aiProvider==="claude"?aiModel.replace("claude-","").split("-2025")[0]:aiProvider==="gemini"?(geminiModel||"").replace("gemini-",""):(gptModel||"")}</span>
        <span style={{marginLeft:"auto",fontSize:11,fontWeight:600,color:aiConnected?"#34C759":"#EF4444"}}>{aiConnected?"Đã kết nối":"Chưa kết nối"}</span>
      </div>

      {/* Provider */}
      <div style={{fontSize:11,fontWeight:700,color:C.t2,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Provider</div>
      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {[
          {id:"claude",name:"Claude",desc:"Anthropic",bg:"#D97706",logo:"C",fs:15},
          {id:"gemini",name:"Gemini",desc:"Google",bg:"#4285F4",logo:"G",fs:16},
          {id:"gpt",name:"GPT",desc:"OpenAI",bg:"#10A37F",logo:"GPT",fs:10},
        ].map(p=><div key={p.id} onClick={()=>{setAiProvider(p.id);if(p.id==="claude")setAiModel("claude-sonnet-4-20250514");if(isAdmin)saveSetting("ai_provider",p.id);}} style={{
          flex:1,padding:"14px 8px",borderRadius:12,cursor:"pointer",textAlign:"center",
          background:"#fff",border:aiProvider===p.id?`1.5px solid ${C.primary}`:`0.5px solid ${C.border}`,transition:"all 0.15s",
        }}>
          <div style={{width:36,height:36,borderRadius:10,background:p.bg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",fontSize:p.fs,fontWeight:700,color:"#fff",fontFamily:"serif"}}>{p.logo}</div>
          <div style={{fontSize:12,fontWeight:700,color:C.t1}}>{p.name}</div>
          <div style={{fontSize:11,fontWeight:600,color:C.t2}}>{p.desc}</div>
          {aiProvider===p.id&&<div style={{width:14,height:14,borderRadius:"50%",background:"transparent",color:C.primary,border:`1.5px solid ${C.primary}`,fontSize:8,margin:"4px auto 0",lineHeight:"14px",textAlign:"center"}}>✓</div>}
        </div>)}
      </div>

      {/* Model */}
      <div style={{fontSize:11,fontWeight:700,color:C.t2,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>Model</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>
        {(aiProvider==="claude"?[
          {id:"claude-sonnet-4-20250514",name:"Sonnet 4",desc:"Nhanh, chính xác",badge:"Khuyên dùng",bc:"#FEF3C7",btc:"#92400E"},
          {id:"claude-haiku-4-5-20251001",name:"Haiku 4.5",desc:"Siêu nhanh, tiết kiệm",badge:"Tiết kiệm",bc:"#DCFCE7",btc:"#14532D"},
          {id:"claude-opus-4-6",name:"Opus 4.6",desc:"Mạnh nhất",badge:"Cao cấp",bc:"#F3F4F6",btc:"#666"},
        ]:aiProvider==="gemini"?[
          {id:"gemini-2.5-flash",name:"Gemini 2.5 Flash",desc:"Nhanh, rẻ, thinking model",badge:"Tiết kiệm",bc:"#DCFCE7",btc:"#14532D"},
          {id:"gemini-3.5-flash",name:"Gemini 3.5 Flash",desc:"Mới nhất, agentic + coding",badge:"Khuyên dùng",bc:"#FEF3C7",btc:"#92400E"},
          {id:"gemini-3.1-pro",name:"Gemini 3.1 Pro",desc:"Reasoning mạnh nhất",badge:"Cao cấp",bc:"#F3F4F6",btc:"#666"},
        ]:[
          {id:"gpt-4o-mini",name:"GPT-4o Mini",desc:"Nhanh, rẻ nhất",badge:"Tiết kiệm",bc:"#DCFCE7",btc:"#14532D"},
          {id:"chat-latest",name:"GPT-5.5 Instant",desc:"Mặc định ChatGPT",badge:"Khuyên dùng",bc:"#FEF3C7",btc:"#92400E"},
          {id:"gpt-5.5",name:"GPT-5.5 Thinking",desc:"Mạnh nhất",badge:"Cao cấp",bc:"#F3F4F6",btc:"#666"},
        ]).map(m=>{
          const curModel=aiProvider==="claude"?aiModel:aiProvider==="gemini"?geminiModel:gptModel;
          const setModel=aiProvider==="claude"?setAiModel:aiProvider==="gemini"?setGeminiModel:setGptModel;
          const modelKey=aiProvider==="claude"?"ai_model":aiProvider==="gemini"?"gemini_model":"gpt_model";
          const isActive=curModel===m.id;
          return <div key={m.id} onClick={()=>{setModel(m.id);if(isAdmin)saveSetting(modelKey,m.id);}} style={{
            display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",borderRadius:10,cursor:"pointer",
            background:"#fff",border:isActive?`1.5px solid ${C.primary}`:`0.5px solid ${C.border}`,transition:"all 0.15s",
          }}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{m.name}</div>
              <div style={{fontSize:11,fontWeight:600,color:C.t2,marginTop:2}}>{m.desc}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,background:m.bc,color:m.btc}}>{m.badge}</span>
              <div style={{width:18,height:18,borderRadius:"50%",border:isActive?`none`:`1.5px solid #ddd`,background:isActive?C.primary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff"}}>{isActive?"✓":""}</div>
            </div>
          </div>;
        })}
      </div>

      {/* API Keys */}
      {isAdmin&&<>
        <div style={{fontSize:11,fontWeight:700,color:C.t2,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8}}>API Keys</div>
        {aiProvider==="claude"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>Claude</span>
          <input type="password" value={claudeKey} onChange={e=>setClaudeKey(e.target.value)} placeholder="sk-ant-api03-..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:claudeKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>}
        {aiProvider==="gemini"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>Gemini</span>
          <input type="password" value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:geminiKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>}
        {aiProvider==="gpt"&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>OpenAI</span>
          <input type="password" value={gptKey} onChange={e=>setGptKey(e.target.value)} placeholder="sk-..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:gptKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fff",border:`0.5px solid ${C.border}`,borderRadius:10,marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600,color:C.t1,width:48,flexShrink:0}}>USDA</span>
          <input type="password" value={usdaKey} onChange={e=>setUsdaKey(e.target.value)} placeholder="USDA key..." style={{flex:1,padding:"6px 10px",border:`0.5px solid ${C.border}`,borderRadius:6,fontSize:11,background:"#F9F9F9",fontFamily:"inherit"}}/>
          <div style={{width:6,height:6,borderRadius:"50%",background:usdaKey?"#34C759":"#ddd",flexShrink:0}}/>
        </div>
      </>}

      {/* Test button */}
      <button onClick={async()=>{
        setAiConnected(false);
        try{
          if(aiProvider==="claude"){
            const r=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({foodDesc:"OK",provider:"claude",model:aiModel,apiKey:claudeKey})});
            const d=await r.json();setAiConnected(!d.error);
          }else if(aiProvider==="gemini"){
            if(!geminiKey){setAiConnected(false);return;}
            const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"OK"}]}]})});
            const d=await r.json();setAiConnected(!d.error);
          }else{
            if(!gptKey){setAiConnected(false);return;}
            const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${gptKey}`},body:JSON.stringify({model:gptModel,messages:[{role:"user",content:"OK"}],...(gptModel==="gpt-4o-mini"?{max_tokens:10}:{max_completion_tokens:10})})});
            const d=await r.json();setAiConnected(!d.error);
          }
        }catch{setAiConnected(false);}
      }} style={{...redBtn,marginTop:10}}>Test kết nối</button>

      {isAdmin&&<button onClick={async()=>{
        await saveSetting("ai_provider",aiProvider);
        await saveSetting("claude_key",claudeKey);
        await saveSetting("gemini_key",geminiKey);
        await saveSetting("gpt_key",gptKey);
        await saveSetting("usda_key",usdaKey);
        await saveSetting("ai_model",aiModel);
        await saveSetting("gpt_model",gptModel);
        await saveSetting("gemini_model",geminiModel);
        const el=document.getElementById("cloud-keys-saved");
        if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
      }} style={{...redBtn,marginTop:8,background:"linear-gradient(135deg,#0F172A,#1E293B)"}}>☁️ Lưu lên Cloud</button>}
      {isAdmin&&<div id="cloud-keys-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
        <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✅ Đã lưu!</span>
      </div>}

      {!isAdmin&&(claudeKey||geminiKey||gptKey)&&<div style={{marginTop:12,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1px solid ${C.green}`}}>
        <span style={{fontSize:12,fontWeight:600,color:"#14532D"}}>✅ API đã được admin cấu hình sẵn</span>
      </div>}
    </div>}

    {/* ADMIN PANEL */}
    {section==="admin"&&isAdmin&&<div style={card}>
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
    </div>}

    {/* TEMPLATES (admin only — separate pill) */}
    {section==="templates"&&isAdmin&&<div style={{...card,padding:mob?"12px 10px":"16px 18px"}}>
      <div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>📚</span><span style={{fontWeight:800,color:C.t1}}>Quản lý Template mẫu</span></div>
      <div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:16}}>Tạo template bữa ăn mẫu cho tất cả users xem trong tab Kho mẫu</div>

      {/* Template name + type */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input id="tpl-name" type="text" placeholder="VD: Ngày tập A — Ngực/Vai" style={{...inp,flex:1,minWidth:mob?120:200,fontSize:13,height:38}}/>
        <select id="tpl-type" style={{...inp,width:mob?120:140,fontSize:13,height:38,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:"28px"}} onChange={e=>{setDayType(e.target.value);}}>
          <option value="train">💪 Ngày tập</option>
          <option value="rest">😴 Ngày nghỉ</option>
        </select>
      </div>

      <div style={{height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)",marginBottom:14}}/>

      {/* Inline meal input — same as Tự nhập */}
      {mealNames.map(meal=>{
        const foods=allFoodItems[meal.id]||[{name:"",gram:"",unit:"g",qty:1}];
        const mealColors={"sang":"#007AFF","phu_sang":"#007AFF","trua":"#007AFF","phu_chieu":"#007AFF","pre":"#007AFF","post":"#007AFF","toi":"#007AFF"};
        const mealTextColors={"sang":C.t1,"phu_sang":C.t1,"trua":C.t1,"phu_chieu":C.t1,"pre":C.t1,"post":C.t1,"toi":C.t1};
        return <div key={meal.id} style={{background:C.card,border:`1.5px solid ${C.border}`,borderLeft:`3px solid ${mealColors[meal.id]||C.border}`,borderRadius:12,padding:mob?10:16,marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"18px 1fr 44px 36px 50px 20px":"28px 2fr 56px 52px 72px 28px",gap:mob?6:8,alignItems:"center",marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
            <span style={{gridColumn:"1/3",fontSize:14,fontWeight:700,color:mealTextColors[meal.id]||C.t1}}>{meal.l}</span>
            <span style={{fontSize:10,fontWeight:700,color:C.t3,textAlign:"center"}}>ĐV</span>
            <span style={{fontSize:10,fontWeight:700,color:C.t3,textAlign:"center"}}>SL</span>
            <span style={{fontSize:10,fontWeight:700,color:C.t3,textAlign:"center"}}>TL</span>
            <span/>
          </div>

          {foods.map((item,i)=>{
            const isWeight=!item.unit||item.unit==="g"||item.unit==="ml";
            return <div key={i} style={{display:"grid",gridTemplateColumns:mob?"18px 1fr 44px 36px 50px 20px":"28px 2fr 56px 52px 72px 28px",gap:mob?6:8,alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:mob?11:13,fontWeight:800,color:C.t3,textAlign:"center"}}>{i+1}.</span>
              <input value={item.name} onChange={e=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],name:e.target.value};u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} placeholder="VD: Cá kho" style={{...inp,fontSize:mob?13:14,height:mob?38:40,padding:mob?"8px 10px":"8px 12px"}}/>
              <select value={item.unit||"g"} onChange={e=>{const v=e.target.value;const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],unit:v};if(v!=="g"&&v!=="ml"){a[i].gram=estimateGram(item.name,v,item.qty||1);}u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",textAlignLast:"center",padding:"0 2px",fontSize:mob?12:14,height:mob?38:40}}>
                <option value="g">g</option><option value="ml">ml</option><option value="quả">quả</option><option value="hộp">hộp</option><option value="lát">lát</option><option value="bát">bát</option>
              </select>
              <input type="number" inputMode="numeric" value={item.qty||""} onChange={e=>{const q=Math.max(0,Number(e.target.value)||0);const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],qty:q};if(!isWeight&&q>0){a[i].gram=estimateGram(item.name,item.unit,q);}u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",fontSize:mob?12:14,height:mob?38:40}} placeholder="SL"/>
              <input type="number" inputMode="numeric" value={item.gram||""} onChange={e=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],gram:Math.max(0,Number(e.target.value)||0)};u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",fontSize:mob?12:14,height:mob?38:40,opacity:isWeight?1:0.7}} placeholder={isWeight?"Gram":"~Gram"}/>
              <button onClick={()=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a.splice(i,1);if(a.length===0)a.push({name:"",gram:"",unit:"g",qty:1});u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{padding:0,width:mob?24:32,height:mob?24:32,background:C.redBg,color:C.red,borderRadius:8,fontSize:mob?14:16,fontWeight:900,border:"none",cursor:"pointer"}}>×</button>
            </div>;
          })}
          <button onClick={()=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a.push({name:"",gram:"",unit:"g",qty:1});u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{padding:"6px",fontSize:12,fontWeight:700,background:C.surface,color:C.t3,border:`1.5px dashed ${C.border}`,borderRadius:8,width:"100%",cursor:"pointer",fontFamily:"inherit",marginTop:4}}>+ Thêm món</button>
        </div>;
      })}

      {/* Tính macro + Lưu template */}
      <button onClick={()=>{
        const combined=[];
        mealNames.forEach(meal=>{
          const foods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
          foods.forEach(f=>combined.push({...f,_mealId:meal.id}));
        });
        if(combined.length===0){setAiError("Chưa nhập thức ăn nào");return;}
        setFoodItems(combined);
        callAI(false,combined);
      }} disabled={aiLoading} style={{...redBtn,marginTop:8,opacity:aiLoading?0.7:1}}>
        {aiLoading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{width:16,height:16,border:"2.5px solid #fcc",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>
          <span>Đang tính...</span>
        </span>:"Tính macro tất cả"}
      </button>
      {aiError&&<div style={{marginTop:12,padding:"12px 16px",background:C.redBg,borderRadius:10,border:`2px solid ${C.red}`}}>
        <span style={{fontSize:13,fontWeight:700,color:"#7F1D1D"}}>❌ {aiError}</span>
      </div>}

      {/* Kết quả + Lưu template mẫu */}
      {aiResult&&<div style={{marginTop:16,background:C.primaryBg,borderRadius:12,padding:16,border:`2px solid ${C.primary}`}}>
        <div style={{fontSize:14,fontWeight:900,color:C.primary,marginBottom:12}}>✓ Kết quả macro</div>
        {(()=>{
          const items=aiResult.items||[];
          let idx=0;
          return mealNames.map(meal=>{
            const mealFoods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
            if(mealFoods.length===0)return null;
            const mealItems=items.slice(idx,idx+mealFoods.length);
            idx+=mealFoods.length;
            const mCal=mealItems.reduce((s,it)=>s+(it.cal||0),0);
            return <div key={meal.id} style={{marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
                <span>{meal.l}</span><span style={{color:C.t1}}>{Math.round(mCal)} cal</span>
              </div>
              {mealItems.map((item,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,padding:"3px 0",color:C.t2}}>
                <span>{item.name} {item.gram}g</span>
                <span style={{color:C.t3}}>P:{item.protein} C:{item.carb} F:{item.fat} = {item.cal}cal</span>
              </div>)}
            </div>;
          }).filter(Boolean);
        })()}
        {aiResult.items&&aiResult.items.length>1&&(()=>{
          const s=aiResult.items.reduce((a,i)=>({p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,cal:0});
          return <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:900,borderTop:`2px solid ${C.red}`,paddingTop:8,marginTop:4}}>
            <span style={{color:C.primary}}>TỔNG</span>
            <span>P:{Math.round(s.p)} C:{Math.round(s.c)} F:{Math.round(s.f)} = <span style={{color:C.t1}}>{Math.round(s.cal)} cal</span></span>
          </div>;
        })()}
        <button onClick={async()=>{
          const name=document.getElementById("tpl-name")?.value?.trim();
          const tplType=document.getElementById("tpl-type")?.value||"train";
          if(!name){alert("Nhập tên template ở ô trên!");return;}
          const items=aiResult.items||[];
          let idx=0;
          const mealsData=[];
          mealNames.forEach(meal=>{
            const mealFoods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
            if(mealFoods.length===0)return;
            const mealItems=items.slice(idx,idx+mealFoods.length);
            idx+=mealFoods.length;
            const saveItems=mealItems.map(ai=>({food:ai.name||"",gram:ai.gram||0,unit:ai.unit||"g",qty:ai.qty||1,p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0}));
            if(saveItems.length>0)mealsData.push({meal_id:meal.id,meal_name:meal.l,items:saveItems});
          });
          if(mealsData.length===0){alert("Không có dữ liệu bữa ăn");return;}
          const totalCal=mealsData.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
          if(saveDefaultTemplate) await saveDefaultTemplate(name,tplType,mealsData,Math.round(totalCal));
          document.getElementById("tpl-name").value="";
          setAiResult(null);
          // Reset all food items
          const init={};mealNames.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);
          const el=document.getElementById("tpl-created");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
        }} style={{...redBtn,marginTop:12,background:"linear-gradient(135deg,#7C3AED,#6D28D9)"}}>📚 Lưu thành Template mẫu</button>
        <div id="tpl-created" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Template mẫu đã tạo! Users sẽ thấy trong Kho mẫu.</span>
        </div>
      </div>}

      {/* Existing templates list */}
      {(defaultTemplates||[]).length>0&&<div style={{marginTop:20,borderTop:`2px solid ${C.border}`,paddingTop:16}}>
        <div style={{fontSize:15,fontWeight:800,color:C.t1,marginBottom:8}}>Templates đã tạo ({(defaultTemplates||[]).length})</div>
        {(defaultTemplates||[]).map(t=>{
          const mealCount=(t.meals||[]).length;
          return <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:C.surface,borderRadius:8,marginBottom:4,border:`1px solid ${C.border}`}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{t.name||"Template"} <span style={{fontSize:11,fontWeight:600,padding:"2px 6px",borderRadius:8,background:t.day_type==="train"?C.primaryBg:"#DBEAFE",color:t.day_type==="train"?"#003D99":"#1E40AF"}}>{t.day_type==="train"?"Tập":"Nghỉ"}</span></div>
              <div style={{fontSize:11,color:C.t3,marginTop:2}}>{mealCount} bữa • {t.total_cal||0} kcal</div>
            </div>
            <button onClick={async()=>{
              if(!confirm("Xóa template \""+t.name+"\"?"))return;
              if(deleteDefaultTemplate) await deleteDefaultTemplate(t.id);
            }} style={{fontSize:11,color:C.red,background:"none",border:"none",cursor:"pointer",fontWeight:700,padding:"4px 8px"}}>✕ Xóa</button>
          </div>;
        })}
      </div>}
    </div>}

    {/* MEALS */}
    {section==="meals"&&<div style={{...card,padding:mob?"12px 10px":"16px 18px"}}>
      {!mob?<div style={{display:"grid",gridTemplateColumns:"63% 35%",gap:20,marginBottom:14,alignItems:"center"}}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:C.t1}}>{mealMode==="tu_nhap"?"Nhập bữa ăn":mealMode==="lich_tuan"?"Lịch tuần":"Kho mẫu"}</div>
          <div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:2}}>{mealMode==="tu_nhap"?"Nhập thức ăn → nhấn \"Tính macro\" → trả kết quả → Lưu bữa ăn":mealMode==="lich_tuan"?"Xem & chỉnh thực đơn theo từng ngày trong tuần":`Chọn template mẫu do admin tạo sẵn${(defaultTemplates||[]).length>0?` (${(defaultTemplates||[]).length} mẫu)`:""}`}</div>
        </div>
        <div style={{display:"flex",gap:4,background:C.surface,borderRadius:12,padding:4}}>
          {[{id:"tu_nhap",icon:"✏️",label:"Tự nhập"},{id:"lich_tuan",icon:"📅",label:"Lịch tuần"},{id:"kho_mau",icon:"📚",label:"Kho mẫu"}].map(t=><div key={t.id} onClick={()=>{setMealMode(t.id);if(t.id==="kho_mau"&&refreshDefaultTemplates)refreshDefaultTemplates();}} style={{flex:1,padding:"10px 0",borderRadius:10,fontSize:14,fontWeight:mealMode===t.id?700:500,color:mealMode===t.id?C.primary:C.t2,background:mealMode===t.id?"#fff":"none",cursor:"pointer",boxShadow:mealMode===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none",textAlign:"center"}}>{t.icon} {t.label}</div>)}
        </div>
      </div>:<>
        <div style={{fontSize:19,fontWeight:800,color:C.t1}}>{mealMode==="tu_nhap"?"Nhập bữa ăn":mealMode==="lich_tuan"?"Lịch tuần":"Kho mẫu"}</div>
        <div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:2,marginBottom:12}}>{mealMode==="tu_nhap"?"Nhập thức ăn → nhấn \"Tính macro\" → trả kết quả → Lưu bữa ăn":mealMode==="lich_tuan"?"Xem & chỉnh thực đơn theo từng ngày trong tuần":`Chọn template mẫu do admin tạo sẵn${(defaultTemplates||[]).length>0?` (${(defaultTemplates||[]).length} mẫu)`:""}`}</div>
        <SlidingTabs tabs={[{id:"tu_nhap",icon:"✏️",label:"Tự nhập"},{id:"lich_tuan",icon:"📅",label:"Lịch tuần"},{id:"kho_mau",icon:"📚",label:"Kho mẫu"}]} active={mealMode} onChange={id=>{setMealMode(id);if(id==="kho_mau"&&refreshDefaultTemplates)refreshDefaultTemplates();}} style={{marginBottom:16}}/>
      </>}

      {/* === MODE: Tự nhập — all meals in one flow === */}
      {mealMode==="tu_nhap"&&<div style={!mob?{display:"grid",gridTemplateColumns:"63% 35%",gap:20,alignItems:"start"}:{}}><div>
      <div style={{height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)",marginBottom:14}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <SlidingTabs tabs={[{id:"train",icon:"💪",label:"Ngày tập"},{id:"rest",icon:"😴",label:"Ngày nghỉ"}]} active={dayType} onChange={dt=>{setDayType(dt);setAiResult(null);}}/>
        <div onClick={()=>setShowMealSettings(!showMealSettings)} style={{padding:"5px 10px",borderRadius:16,fontSize:11,fontWeight:700,background:"#FEF3C7",color:"#92400E",border:"1.5px solid #FCD34D",cursor:"pointer"}}>⚙️ Quản lý</div>
      </div>
      {showMealSettings&&<div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,padding:mob?12:14,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:10}}>⚙️ Tuỳ chỉnh bữa ăn — {dayType==="train"?"Ngày tập":"Ngày nghỉ"}</div>
        {ALL_MEALS.map(m=>{
          const isOn=mealConfig[dayType]?.includes(m.id);
          const isTrainOnly=(m.id==="pre"||m.id==="post")&&dayType==="rest";
          return <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:`0.5px solid ${C.border}`,opacity:isTrainOnly?0.35:isOn?1:0.45}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:15}}>{m.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:C.t1}}>{m.name}</span>
              {isTrainOnly&&<span style={{fontSize:10,padding:"2px 6px",background:"#FEF3C7",color:"#92400E",borderRadius:4}}>Chỉ ngày tập</span>}
            </div>
            <div onClick={()=>{
              if(isTrainOnly)return;
              const cfg={...mealConfig};const arr=[...(cfg[dayType]||[])];
              if(isOn)cfg[dayType]=arr.filter(id=>id!==m.id);
              else{const allIds=ALL_MEALS.map(x=>x.id);arr.push(m.id);arr.sort((a,b)=>allIds.indexOf(a)-allIds.indexOf(b));cfg[dayType]=arr;}
              setMealConfig(cfg);if(isAdmin)saveSetting("meal_config",JSON.stringify(cfg));
            }} style={{width:36,height:20,background:isOn?"#3B6D11":"#E2E8F0",borderRadius:10,position:"relative",cursor:isTrainOnly?"not-allowed":"pointer",transition:"background 0.2s"}}>
              <div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:2,left:isOn?18:2,transition:"left 0.2s",boxShadow:"0 1px 2px rgba(0,0,0,0.15)"}}/>
            </div>
          </div>;
        })}
        <div style={{marginTop:8,fontSize:13,fontWeight:700,color:"#B91C1C"}}>⚠ Bữa tắt sẽ không hiện trên Dashboard.</div>
      </div>}
      {/* All meals — each as labeled card */}
      {mealNames.map(meal=>{
        const foods=allFoodItems[meal.id]||[{name:"",gram:"",unit:"g",qty:1}];
        const mealColors={"sang":"#007AFF","phu_sang":"#007AFF","trua":"#007AFF","phu_chieu":"#007AFF","pre":"#007AFF","post":"#007AFF","toi":"#007AFF"};
        const mealTextColors={"sang":C.t1,"phu_sang":C.t1,"trua":C.t1,"phu_chieu":C.t1,"pre":C.t1,"post":C.t1,"toi":C.t1};
        return <div key={meal.id} style={{background:C.card,border:`1.5px solid ${C.border}`,borderLeft:`3px solid ${mealColors[meal.id]||C.border}`,borderRadius:12,padding:mob?10:16,marginBottom:10}}>
          <div style={{display:"grid",gridTemplateColumns:mob?"18px 1fr 44px 36px 50px 20px":"28px 2fr 56px 52px 72px 28px",gap:mob?6:8,alignItems:"center",marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
            <span style={{gridColumn:"1/3",fontSize:14,fontWeight:700,color:mealTextColors[meal.id]||C.t1}}>{meal.l}</span>
            <span style={{fontSize:10,fontWeight:700,color:C.t3,textAlign:"center"}}>ĐV</span>
            <span style={{fontSize:10,fontWeight:700,color:C.t3,textAlign:"center"}}>SL</span>
            <span style={{fontSize:10,fontWeight:700,color:C.t3,textAlign:"center"}}>TL</span>
            <span/>
          </div>

          {foods.map((item,i)=>{
            const isWeight=!item.unit||item.unit==="g"||item.unit==="ml";
            return <div key={i} style={{display:"grid",gridTemplateColumns:mob?"18px 1fr 44px 36px 50px 20px":"28px 2fr 56px 52px 72px 28px",gap:mob?6:8,alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:mob?11:13,fontWeight:800,color:C.t3,textAlign:"center"}}>{i+1}.</span>
              <input value={item.name} onChange={e=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],name:e.target.value};u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} placeholder="VD: Cá kho" style={{...inp,fontSize:mob?13:14,height:mob?38:40,padding:mob?"8px 10px":"10px 12px"}}/>
              <select value={item.unit||"g"} onChange={e=>{const v=e.target.value;const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],unit:v};if(v!=="g"&&v!=="ml"){a[i].gram=estimateGram(item.name,v,item.qty||1);}u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",textAlignLast:"center",padding:"0 2px",fontSize:mob?12:14,height:mob?38:40,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 4px center",paddingRight:"14px"}}>
                <option value="g">g</option><option value="ml">ml</option><option value="quả">quả</option><option value="hộp">hộp</option><option value="lát">lát</option><option value="bát">bát</option>
              </select>
              <input type="number" inputMode="numeric" value={item.qty||""} onChange={e=>{const q=Math.max(0,Number(e.target.value)||0);const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],qty:q};if(!isWeight&&q>0){a[i].gram=estimateGram(item.name,item.unit,q);}u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",fontSize:mob?12:14,height:mob?38:40,padding:mob?"8px 6px":"10px 12px"}} placeholder="SL"/>
              <input type="number" inputMode="numeric" value={item.gram||""} onChange={e=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],gram:Math.max(0,Number(e.target.value)||0)};u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",fontSize:mob?12:14,height:mob?38:40,padding:mob?"8px 6px":"10px 12px",opacity:isWeight?1:0.7}} placeholder={isWeight?"Gram":"~Gram"}/>
              <button onClick={()=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a.splice(i,1);if(a.length===0)a.push({name:"",gram:"",unit:"g",qty:1});u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{padding:0,width:mob?24:32,height:mob?24:32,background:C.redBg,color:C.red,borderRadius:8,fontSize:mob?14:16,fontWeight:900,border:"none",cursor:"pointer"}}>×</button>
            </div>;
          })}
          <button onClick={()=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a.push({name:"",gram:"",unit:"g",qty:1});u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{padding:"6px",fontSize:12,fontWeight:700,background:C.surface,color:C.t3,border:`1.5px dashed ${C.border}`,borderRadius:8,width:"100%",cursor:"pointer",fontFamily:"inherit",marginTop:4}}>+ Thêm món</button>
          {!mob&&aiResult&&(()=>{const items=aiResult.items||[];let idx2=0;for(const m2 of mealNames){const cnt=(allFoodItems[m2.id]||[]).filter(f=>f.name&&f.name.trim()).length;if(m2.id===meal.id){const sl=items.slice(idx2,idx2+cnt);const ms=sl.reduce((a,x)=>({p:a.p+(x.protein||0),c:a.c+(x.carb||0),f:a.f+(x.fat||0),fi:a.fi+(x.fiber||0),cal:a.cal+(x.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});if(sl.length>0)return <div style={{display:"flex",gap:14,marginTop:10,paddingTop:8,borderTop:`1px solid ${C.surface}`,flexWrap:"wrap"}}><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.protein}}/> Protein: <b style={{color:C.t1}}>{Math.round(ms.p)}g</b></div><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.carb}}/> Carb: <b style={{color:C.t1}}>{Math.round(ms.c)}g</b></div><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.fat}}/> Fat: <b style={{color:C.t1}}>{Math.round(ms.f)}g</b></div><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.fiber}}/> Chất xơ: <b style={{color:C.t1}}>{Math.round(ms.fi)}g</b></div><div style={{fontSize:12,fontWeight:700,color:C.t1,marginLeft:"auto"}}>{Math.round(ms.cal)} kcal</div></div>;return null;}idx2+=cnt;}return null;})()}
        </div>;
      })}
      <button onClick={()=>{
        // Combine all foods from all meals into one list for AI
        const combined=[];
        mealNames.forEach(meal=>{
          const foods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
          foods.forEach(f=>combined.push({...f,_mealId:meal.id}));
        });
        if(combined.length===0){setAiError("Chưa nhập thức ăn nào");return;}
        setFoodItems(combined);
        callAI(false,combined);
      }} disabled={aiLoading} style={{...redBtn,marginTop:8,opacity:aiLoading?0.7:1}}>
        {aiLoading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{width:16,height:16,border:"2.5px solid #fcc",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>
          <span>Đang tính...</span>
        </span>:"Tính macro tất cả"}
      </button>
      {aiError&&<div style={{marginTop:12,padding:"12px 16px",background:C.redBg,borderRadius:10,border:`2px solid ${C.red}`}}>
        <span style={{fontSize:13,fontWeight:700,color:"#7F1D1D"}}>❌ {aiError}</span>
      </div>}
      {mob&&aiResult&&<div style={{marginTop:16,background:C.primaryBg,borderRadius:12,padding:16,border:`2px solid ${C.primary}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:900}}>✓</span>
          <span style={{fontSize:14,fontWeight:900,color:C.primary}}>Kết quả</span>
          <button onClick={async()=>{
            const allNames=Object.values(allFoodItems).flat().map(f=>(f.name||"").toLowerCase().trim()).filter(Boolean);
            if(allNames.length>0) await deleteFoodCache(allNames);
            setAiResult(null);
            const combined=[];mealNames.forEach(meal=>{const foods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());foods.forEach(f=>combined.push({...f,_mealId:meal.id}));});
            setFoodItems(combined);callAI(true,combined);
          }} style={{marginLeft:"auto",padding:"4px 10px",fontSize:12,fontWeight:700,background:C.surface,color:C.t2,border:`1.5px solid ${C.border}`,borderRadius:7,cursor:"pointer",fontFamily:"inherit"}}>🔄 Tính lại</button>
        </div>
        {/* Group results by meal */}
        {(()=>{
          const items=aiResult.items||[];
          let idx=0;
          return mealNames.map(meal=>{
            const mealFoods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
            if(mealFoods.length===0)return null;
            const mealItems=items.slice(idx,idx+mealFoods.length);
            idx+=mealFoods.length;
            const mCal=mealItems.reduce((s,it)=>s+(it.cal||0),0);
            return <div key={meal.id} style={{marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:6,display:"flex",justifyContent:"space-between"}}>
                <span>{meal.l}</span><span style={{color:C.t1}}>{Math.round(mCal)} cal</span>
              </div>
              {mealItems.map((item,i)=><div key={i} style={{display:"grid",gridTemplateColumns:mob?"1.4fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr":"2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:12,fontWeight:600,padding:"4px 0",borderBottom:i<mealItems.length-1?`1px solid ${C.border}`:"none"}}>
                <span style={{color:C.t1,fontWeight:700}}>{item.name} {item.source&&<span style={{fontSize:9,padding:"1px 4px",borderRadius:3,fontWeight:700,background:item.source==="localDB"?"#DCFCE7":item.source==="USDA"?"#EFF6FF":item.source==="cache"?"#F3F4F6":"#FEF3C7",color:item.source==="localDB"?"#007AFF":item.source==="USDA"?"#1E40AF":item.source==="cache"?"#666":"#92400E"}}>{item.source==="localDB"?"DB":item.source==="USDA"?"USDA":item.source==="cache"?"Cache":item.source}</span>}</span>
                <span style={{textAlign:"right",color:C.t3}}>{item.gram}</span>
                <span style={{textAlign:"right",color:C.protein}}>{item.protein}</span>
                <span style={{textAlign:"right",color:C.carb}}>{item.carb}</span>
                <span style={{textAlign:"right",color:C.t1}}>{item.fat}</span>
                <span style={{textAlign:"right",color:C.fiber}}>{item.fiber}</span>
                <span style={{textAlign:"right",color:C.t1,fontWeight:800}}>{item.cal}</span>
              </div>)}
              <div style={{height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)",marginTop:8}}/>
            </div>;
          }).filter(Boolean);
        })()}
        {aiResult.items&&aiResult.items.length>1&&(()=>{
          const s=aiResult.items.reduce((a,i)=>({p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),fi:a.fi+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});
          return <div style={{display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:900,borderTop:`2px solid ${C.red}`,paddingTop:8,marginTop:4}}>
            <span style={{color:C.primary}}>TỔNG CẢ NGÀY</span>
            <span>P:{Math.round(s.p)} C:{Math.round(s.c)} F:{Math.round(s.f)} = <span style={{color:C.t1}}>{Math.round(s.cal)} cal</span></span>
          </div>;
        })()}
        <button onClick={()=>{
            const items=aiResult.items||[];
            const saveByMeal={};
            foodItems.forEach((f,i)=>{const mid=f._mealId;if(!mid||!items[i])return;if(!saveByMeal[mid])saveByMeal[mid]=[];const ai=items[i];const unit=ai.unit||"g";const isW=unit==="g"||unit==="ml";saveByMeal[mid].push({food:ai.name||"",gram:ai.gram||0,unit,qty:ai.qty||1,qty_display:ai.qty_display||(isW?null:`${ai.qty||1} ${unit}`),p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0});});
            Object.entries(saveByMeal).forEach(([mid,saveItems])=>{if(saveItems.length>0)saveMealToCloud(mid,dayType,saveItems);});
            if(aiResult._cacheEntries)saveFoodCache(aiResult._cacheEntries,aiProvider);
            const el=document.getElementById("meal-saved");
            if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
            setTimeout(()=>{setShowSaveTpl(true);},500);
        }} style={{...redBtn,marginTop:12,background:"linear-gradient(135deg,#15803D,#166534)"}}>💾 Lưu tất cả bữa</button>
        <div id="meal-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã lưu thành công!</span>
        </div>
        {showSaveTpl&&(()=>{
          const dayKeys2=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
          const dayLabels2=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
          const todayIdx2=new Date().getDay();
          const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
          const totalCal2=(aiResult.items||[]).reduce((s,it)=>s+(it.cal||0),0);
          return <div style={{marginTop:12,padding:"16px",background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)",borderRadius:12,border:"2px solid #818CF8"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#3730A3",marginBottom:8}}>📅 Lưu vào lịch tuần?</div>
            <select id="save-tpl-day" defaultValue={dayKeys2[todayIdx2]} style={{...inp,marginBottom:12}}>
              {dayLabels2.map((l,i2)=>{const mi2=i2===0?6:i2-1;const ig=gd.includes(mi2);return <option key={i2} value={dayKeys2[i2]}>{l} — {ig?"Ngày tập":"Ngày nghỉ"}</option>;})}
            </select>
            <div style={{display:"flex",gap:8}}>
              <button onClick={async()=>{
                const sd=document.getElementById("save-tpl-day")?.value||dayKeys2[todayIdx2];
                const amd=mealNames.map(meal=>{const it=(getMeals(dayType).find(m=>m.id===meal.id)||{}).items||[];return it.length>0?{meal_id:meal.id,meal_name:meal.l,items:it}:null;}).filter(Boolean);
                const tc=amd.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
                if(saveWeeklyTemplate)await saveWeeklyTemplate(sd,dayType,amd,Math.round(tc));
                setShowSaveTpl(false);
                const el2=document.getElementById("tpl-week-saved");if(el2){el2.style.display="flex";setTimeout(()=>{el2.style.display="none";},3000);}
              }} style={{flex:1,padding:"10px",fontSize:13,fontWeight:700,border:"none",borderRadius:10,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>📅 Lưu</button>
              <button onClick={()=>setShowSaveTpl(false)} style={{padding:"10px 16px",fontSize:13,fontWeight:700,border:`1.5px solid ${C.border}`,borderRadius:10,background:C.card,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>Không</button>
            </div>
          </div>;
        })()}
        <div id="tpl-week-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
          <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã lưu mẫu tuần!</span>
        </div>
      </div>}
      </div>
      {!mob&&<div>
        <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}>
          <div style={{fontSize:14,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{display:"flex",alignItems:"center",gap:8}}>📊 Tổng hôm nay</span><span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:12,background:dayType==="train"?"rgba(0,122,255,0.1)":"rgba(249,115,22,0.1)",color:dayType==="train"?C.primary:"#D97706"}}>{dayType==="train"?"💪 Ngày tập":"😴 Ngày nghỉ"}</span></div>
          {aiResult&&aiResult.items?(()=>{const s=aiResult.items.reduce((a,i)=>({p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),fi:a.fi+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});const heroCal=dayType==="train"?(macro.calTarget||0):(macro.calRest||macro.calTarget||0);const heroP=macro.protein||0;const heroC=dayType==="train"?(macro.carb||0):(macro.carbRest||macro.carb||0);const heroF=macro.fat||0;const heroFi=macro.fiber||0;const pct=heroCal>0?Math.min(Math.round(s.cal/heroCal*100),120):0;return <><div style={{textAlign:"center",marginBottom:18,paddingBottom:16,borderBottom:`1px solid ${C.surface}`}}><div style={{fontSize:36,fontWeight:800,color:C.primary}}>{Math.round(s.cal).toLocaleString()}</div><div style={{fontSize:14,color:C.t2}}>/ <b style={{color:C.t1}}>{heroCal}</b> kcal mục tiêu</div><div style={{height:8,background:C.surface,borderRadius:4,overflow:"hidden",marginTop:10}}><div style={{height:"100%",borderRadius:4,width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${pct<95?"#F59E0B":pct<=105?"#16A34A":"#DC2626"},${pct<95?"#B45309":pct<=105?"#34C759":"#EF4444"})`}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:pct<95?"#B45309":pct<=105?"#16A34A":"#DC2626"}}>{pct<95?`⚠️ Còn thiếu ${heroCal-Math.round(s.cal)} kcal`:pct<=105?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${Math.round(s.cal)-heroCal} kcal`}</span><span style={{fontSize:11,color:C.t2}}>{pct}%</span></div></div>{[{l:"Protein",v:Math.round(s.p),t:heroP,c:C.protein},{l:"Carb",v:Math.round(s.c),t:heroC,c:C.carb},{l:"Fat",v:Math.round(s.f),t:heroF,c:C.fat},{l:"Chất xơ",v:Math.round(s.fi),t:heroFi,c:C.fiber}].map(r=><div key={r.l} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{fontSize:13,fontWeight:600,width:70,display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:"50%",background:r.c,flexShrink:0}}/>{r.l}</div><div style={{flex:1,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${Math.min(r.t>0?r.v/r.t*100:0,100)}%`,background:r.c}}/></div><div style={{fontSize:12,fontWeight:700,width:80,textAlign:"right"}}>{r.v}g <span style={{fontWeight:400,color:C.t2}}>/ {r.t}g</span></div></div>)}</>;})():<div style={{textAlign:"center",padding:"40px 20px",color:C.t3}}><div style={{fontSize:36,marginBottom:8}}>📊</div><div style={{fontSize:14,fontWeight:600,color:C.t2}}>Chưa có dữ liệu</div><div style={{fontSize:12,color:C.t3,marginTop:4}}>Nhấn "Tính macro tất cả" để xem kết quả</div></div>}
        </div>
        {aiResult&&aiResult.items&&(()=>{const s=aiResult.items.reduce((a,i)=>({p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),fi:a.fi+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});const heroCal=dayType==="train"?(macro.calTarget||0):(macro.calRest||macro.calTarget||0);const heroP=macro.protein||0;const heroC=dayType==="train"?(macro.carb||0):(macro.carbRest||macro.carb||0);const heroF=macro.fat||0;const heroFi=macro.fiber||0;const scores=[];if(heroCal>0){const r2=s.cal/heroCal;scores.push(r2>=0.95&&r2<=1.1?100:r2>1.1?Math.max(0,100-Math.round((r2-1.1)*200)):Math.max(0,Math.round(r2/0.95*100)));}if(heroP>0)scores.push(Math.min(100,Math.round(s.p/heroP*100)));if(heroC>0){const r2=s.c/heroC;scores.push(r2>=0.9&&r2<=1.1?100:Math.max(0,100-Math.round(Math.abs(1-r2)*100)));}if(heroF>0){const r2=s.f/heroF;scores.push(r2>=0.85&&r2<=1.15?100:Math.max(0,100-Math.round(Math.abs(1-r2)*100)));}const avg=scores.length>0?Math.round(scores.reduce((a2,b)=>a2+b,0)/scores.length):0;return <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:14,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>📊 Đánh giá dinh dưỡng</div><div style={{fontSize:22,fontWeight:800,color:avg>=90?"#059669":avg>=70?C.primary:"#D97706"}}>{avg}<span style={{fontSize:13,fontWeight:500,color:C.t2}}>/100</span></div></div>{[{l:"Calo",v:s.cal,t:heroCal},{l:"Protein",v:s.p,t:heroP},{l:"Carb",v:s.c,t:heroC},{l:"Fat",v:s.f,t:heroF},{l:"Chất xơ",v:s.fi,t:heroFi}].map(r2=>{const pct2=r2.t>0?Math.round(r2.v/r2.t*100):0;const ok=pct2>=90&&pct2<=115;return <div key={r2.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,padding:"6px 10px",background:C.surface,borderRadius:8,marginBottom:4}}><span style={{color:C.t2}}>{r2.l}</span><span style={{fontWeight:700,color:ok?"#059669":"#D97706"}}>{ok?"✓":"⚠"} {pct2}%</span></div>;})}</div>;})()}
        {aiResult&&aiResult.items&&<>
          <button onClick={async()=>{const allNames=Object.values(allFoodItems).flat().map(f=>(f.name||"").toLowerCase().trim()).filter(Boolean);if(allNames.length>0&&deleteFoodCache)await deleteFoodCache(allNames);setAiResult(null);const c2=[];mealNames.forEach(meal=>{const foods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());foods.forEach(f=>c2.push({...f,_mealId:meal.id}));});setFoodItems(c2);callAI(true,c2);}} style={{padding:"8px",fontSize:12,fontWeight:700,background:C.surface,color:C.t2,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",width:"100%",marginBottom:8}}>🔄 Tính lại</button>
          <button onClick={()=>{const items=aiResult.items||[];const saveByMeal={};foodItems.forEach((f,i)=>{const mid=f._mealId;if(!mid||!items[i])return;if(!saveByMeal[mid])saveByMeal[mid]=[];const ai=items[i];const unit=ai.unit||"g";const isW=unit==="g"||unit==="ml";saveByMeal[mid].push({food:ai.name||"",gram:ai.gram||0,unit,qty:ai.qty||1,qty_display:ai.qty_display||(isW?null:`${ai.qty||1} ${unit}`),p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0});});Object.entries(saveByMeal).forEach(([mid,saveItems])=>{if(saveItems.length>0)saveMealToCloud(mid,dayType,saveItems);});if(aiResult._cacheEntries)saveFoodCache(aiResult._cacheEntries,aiProvider);const el=document.getElementById("meal-saved-pc");if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}}} style={{...redBtn,marginTop:0,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",width:"100%"}}>💾 Lưu bữa ăn hôm nay</button>
          <button onClick={()=>setShowSaveTpl(!showSaveTpl)} style={{...redBtn,marginTop:8,background:C.card,color:C.t2,border:`1.5px solid ${C.border}`,width:"100%"}}>📅 Gán vào lịch tuần</button>
          {showSaveTpl&&(()=>{
            const dayKeys2=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
            const dayLabels2=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
            const todayIdx2=new Date().getDay();
            const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
            return <div style={{marginTop:12,padding:"16px",background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)",borderRadius:12,border:"2px solid #818CF8"}}>
              <div style={{fontSize:15,fontWeight:800,color:"#3730A3",marginBottom:8}}>📅 Lưu vào lịch tuần?</div>
              <select id="save-tpl-day-pc" defaultValue={dayKeys2[todayIdx2]} style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",marginBottom:12}}>
                {dayLabels2.map((l,i2)=>{const mi2=i2===0?6:i2-1;const ig=gd.includes(mi2);return <option key={i2} value={dayKeys2[i2]}>{l} — {ig?"Ngày tập":"Ngày nghỉ"}</option>;})}
              </select>
              <div style={{display:"flex",gap:8}}>
                <button onClick={async()=>{
                  const sd=document.getElementById("save-tpl-day-pc")?.value||dayKeys2[todayIdx2];
                  const amd=mealNames.map(meal=>{const it=(getMeals(dayType).find(m=>m.id===meal.id)||{}).items||[];return it.length>0?{meal_id:meal.id,meal_name:meal.l,items:it}:null;}).filter(Boolean);
                  const tc=amd.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
                  if(saveWeeklyTemplate)await saveWeeklyTemplate(sd,dayType,amd,Math.round(tc));
                  setShowSaveTpl(false);
                  const el2=document.getElementById("meal-saved-pc");if(el2){el2.style.display="flex";setTimeout(()=>{el2.style.display="none";},3000);}
                }} style={{flex:1,padding:"10px",fontSize:13,fontWeight:700,border:"none",borderRadius:10,background:"linear-gradient(135deg,#6366F1,#4F46E5)",color:"#fff",cursor:"pointer",fontFamily:"inherit"}}>📅 Lưu</button>
                <button onClick={()=>setShowSaveTpl(false)} style={{padding:"10px 16px",fontSize:13,fontWeight:700,border:`1.5px solid ${C.border}`,borderRadius:10,background:C.card,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>Không</button>
              </div>
            </div>;
          })()}
          <div id="meal-saved-pc" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}><span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã lưu thành công!</span></div>
        </>}
      </div>}
      </div>}

      {/* === MODE: Lịch tuần === */}
      {mealMode==="lich_tuan"&&(()=>{
        const dayLabels=["T2","T3","T4","T5","T6","T7","CN"];
        const dayKeys=["thu_2","thu_3","thu_4","thu_5","thu_6","thu_7","cn"];
        const gymDays=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
        const mealNameMap={"sang":"Sáng","phu_sang":"Phụ sáng","trua":"Trưa","phu_chieu":"Phụ chiều","pre":"Pre","post":"Post","toi":"Tối"};
        const savedCount=dayKeys.filter(dk=>{const t=getWeeklyTemplate?getWeeklyTemplate(dk):null;return t&&t.meals&&t.meals.length>0;}).length;
        return <div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {dayLabels.map((d,i)=>{
              const isGym=gymDays.includes(i);
              const dt=isGym?"train":"rest";
              const tpl=getWeeklyTemplate?getWeeklyTemplate(dayKeys[i]):null;
              const hasTpl=tpl&&tpl.meals&&tpl.meals.length>0;
              const totalCal=tpl?tpl.total_cal||0:0;
              const mealCount=(tpl?.meals||[]).length;
              const mealList=(tpl?.meals||[]).map(m=>mealNameMap[m.meal_id]||m.meal_name||m.meal_id).join(", ");
              const isSelected=expandedTpl===dayKeys[i];
              return <div key={i}>
                <div style={{...card,cursor:"pointer",border:isSelected?`2px solid ${C.red}`:`1.5px solid ${C.border}`,padding:0,display:"flex",alignItems:"stretch",overflow:"hidden"}} onClick={()=>{
                  if(hasTpl){
                    setExpandedTpl(isSelected?null:dayKeys[i]);
                  }else{
                    const currentMeals=getMeals(dt);
                    const filled=currentMeals.filter(m=>m.items&&m.items.length>0);
                    if(filled.length===0){setMealMode("tu_nhap");setDayType(dt);return;}
                    const dayLabel2={"thu_2":"Thứ 2","thu_3":"Thứ 3","thu_4":"Thứ 4","thu_5":"Thứ 5","thu_6":"Thứ 6","thu_7":"Thứ 7","cn":"Chủ nhật"}[dayKeys[i]];
                    if(confirm(`Gán ${filled.length} bữa ${dt==="train"?"ngày tập":"ngày nghỉ"} hiện tại vào ${dayLabel2}?`)){
                      const mealsData=filled.map(m=>({meal_id:m.id,meal_name:m.name,items:m.items}));
                      const tc=filled.reduce((s,m)=>s+m.items.reduce((a,it)=>a+(it.cal||0),0),0);
                      if(saveWeeklyTemplate) saveWeeklyTemplate(dayKeys[i],dt,mealsData,Math.round(tc));
                    }else{setMealMode("tu_nhap");setDayType(dt);}
                  }
                }}>
                    <div style={{width:48,background:"#007AFF",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0,borderRadius:"12px 0 0 12px"}}>
                      <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>{d}</div>
                      <div style={{fontSize:10,fontWeight:600,color:isGym?"#FCA5A5":"#93C5FD"}}>{isGym?"Tập":"Nghỉ"}</div>
                    </div>
                    <div style={{flex:1,padding:"12px 14px",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1}}>
                        {hasTpl?<>
                          <div style={{fontSize:14}}><span style={{fontWeight:800,color:C.t1}}>{totalCal} kcal</span> <span style={{fontSize:12,fontWeight:600,color:C.t3}}>{mealCount} bữa</span></div>
                          <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:2}}>{mealList}</div>
                        </>:<div style={{fontSize:13,fontWeight:600,color:C.t3}}>Chưa có dữ liệu</div>}
                      </div>
                      {hasTpl?<div style={{padding:"4px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:"#DCFCE7",color:"#007AFF",border:"1px solid #86EFAC",whiteSpace:"nowrap"}}>✓ Đã lưu</div>
                      :<div style={{padding:"4px 10px",borderRadius:12,fontSize:11,fontWeight:700,background:C.surface,color:C.t3,border:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>+ Gán</div>}
                    </div>
                </div>
                {/* Expanded detail */}
                {isSelected&&hasTpl&&<div style={{...card,marginTop:-4,borderTop:`1.5px solid ${C.border}`,borderTopLeftRadius:0,borderTopRightRadius:0,border:`2px solid ${C.red}`,borderTop:`1.5px solid ${C.border}`}}>
                  {(tpl.meals||[]).map((m,mi)=>{
                    const mItems=m.items||[];
                    const mCal=mItems.reduce((s,it)=>s+(it.cal||0),0);
                    return <div key={mi} style={{marginBottom:mi<(tpl.meals||[]).length-1?12:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{mealNameMap[m.meal_id]||m.meal_name||m.meal_id}</span>
                        <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{Math.round(mCal)} cal</span>
                      </div>
                      {mItems.map((it,ii)=><div key={ii} style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,padding:"3px 0",color:C.t2}}>
                        <span>{it.food||it.name} {it.gram?`${it.gram}g`:""}</span>
                        <span style={{color:C.t3}}>P:{it.p||0} C:{it.c||0} F:{it.f||0}</span>
                      </div>)}
                      {mi<(tpl.meals||[]).length-1&&<div style={{height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)",marginTop:8}}/>}
                    </div>;
                  })}
                  <div style={{display:"flex",gap:8,marginTop:14}}>
                    <button onClick={(e)=>{e.stopPropagation();setDayType(tpl.day_type);setMealMode("tu_nhap");setExpandedTpl(null);}} style={{flex:1,padding:"10px",fontSize:12,fontWeight:800,border:`1.5px solid ${C.border}`,borderRadius:10,background:C.card,color:C.t2,cursor:"pointer",fontFamily:"inherit"}}>✏️ Sửa</button>
                    <button onClick={async(e)=>{e.stopPropagation();if(window.confirm(`Xóa lịch tuần ${dayLabels[i]}?`)){if(deleteWeeklyTemplate)await deleteWeeklyTemplate(dk);setExpandedTpl(null);}}} style={{padding:"10px 16px",fontSize:12,fontWeight:700,border:"1.5px solid #FCA5A5",borderRadius:10,background:"#FEF2F2",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>🗑️ Xóa</button>
                    <button onClick={(e)=>{e.stopPropagation();setExpandedTpl(null);}} style={{padding:"10px 16px",fontSize:12,fontWeight:700,border:`1.5px solid ${C.border}`,borderRadius:10,background:C.card,color:C.t3,cursor:"pointer",fontFamily:"inherit"}}>Đóng</button>
                  </div>
                </div>}
              </div>;
            })}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:10,fontSize:12,fontWeight:600,color:C.t3}}>
            <span>{savedCount}/7 ngày</span>
          </div>
        </div>;
      })()}

      {/* === MODE: Kho mẫu === */}
      {mealMode==="kho_mau"&&(()=>{
        const filtered=tplFilter==="all"?(defaultTemplates||[]):(defaultTemplates||[]).filter(t=>t.day_type===tplFilter);
        const allCount=(defaultTemplates||[]).length;
        const trainCount=(defaultTemplates||[]).filter(t=>t.day_type==="train").length;
        const restCount=(defaultTemplates||[]).filter(t=>t.day_type==="rest").length;
        return <div>
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            {[{id:"all",l:`Tất cả (${allCount})`},{id:"train",l:`💪 Ngày tập (${trainCount})`},{id:"rest",l:`😴 Ngày nghỉ (${restCount})`}].map(f=>
              <div key={f.id} onClick={()=>setTplFilter(f.id)} style={{padding:"6px 14px",borderRadius:18,fontSize:12,fontWeight:tplFilter===f.id?700:600,background:tplFilter===f.id?C.primaryBg:"#F9FAFB",color:tplFilter===f.id?C.primary:"#6B7280",border:`1.5px solid ${tplFilter===f.id?C.primary:"#E5E7EB"}`,cursor:"pointer"}}>{f.l}</div>
            )}
          </div>
          {filtered.length>0?<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(t=>{
              const isExpanded=expandedTpl===t.id;
              const tplMeals=t.meals||[];
              const mealNameMap={"sang":"Bữa sáng","phu_sang":"Phụ sáng","trua":"Bữa trưa","phu_chieu":"Phụ chiều","pre":"Pre-workout","post":"Post-workout","toi":"Bữa tối"};
              return <div key={t.id} style={{background:C.card,border:`1.5px solid ${isExpanded?C.red:C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:mob?"12px":"14px 16px",cursor:"pointer"}} onClick={()=>setExpandedTpl(isExpanded?null:t.id)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:12,background:t.day_type==="train"?C.primaryBg:"#DBEAFE",color:t.day_type==="train"?"#003D99":"#1E40AF"}}>{t.day_type==="train"?"💪 Tập":"😴 Nghỉ"}</span>
                    <span style={{fontSize:mob?13:14,fontWeight:800,color:C.t1}}>{t.name||"Template"}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:16,fontWeight:900,color:C.t1}}>{t.total_cal||0}</span>
                    <span style={{fontSize:12,color:C.t3}}>{isExpanded?"▲":"▼"}</span>
                  </div>
                </div>
                <div style={{fontSize:12,fontWeight:600,color:C.t3,marginTop:4}}>{tplMeals.length} bữa • {t.total_cal||0} kcal</div>
              </div>
              {isExpanded&&<div style={{borderTop:`1.5px solid ${C.border}`,padding:mob?"12px":"14px 16px"}}>
                {tplMeals.map((m,mi)=>{
                  const mItems=m.items||[];
                  const mCal=mItems.reduce((s,it)=>s+(it.cal||0),0);
                  return <div key={mi} style={{marginBottom:mi<tplMeals.length-1?12:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{mealNameMap[m.meal_id]||m.meal_name||m.meal_id}</span>
                      <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{Math.round(mCal)} cal</span>
                    </div>
                    {mItems.map((it,ii)=><div key={ii} style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600,padding:"3px 0",color:C.t2}}>
                      <span>{it.food||it.name} {it.gram?`${it.gram}g`:""}</span>
                      <span style={{color:C.t3}}>P:{it.p||0} C:{it.c||0} F:{it.f||0} = {it.cal||0}cal</span>
                    </div>)}
                  </div>;
                })}
                <div style={{display:"flex",gap:8,marginTop:12}}>
                <button onClick={async(e)=>{
                  e.stopPropagation();
                  if(applyTemplate){
                    await applyTemplate(t);
                    setExpandedTpl(null);
                    setMealMode("tu_nhap");
                    setDayType(t.day_type);
                    const el=document.getElementById("tpl-applied");
                    if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
                  }
                }} style={{...redBtn,flex:1,marginTop:0,background:"linear-gradient(135deg,#15803D,#166534)"}}>📥 Hôm nay</button>
                <button onClick={(e)=>{e.stopPropagation();setShowAssignDays(showAssignDays===t.id?null:t.id);}} style={{...redBtn,flex:1,marginTop:0,background:"linear-gradient(135deg,#6366F1,#4F46E5)"}}>📅 Gán lịch tuần</button>
                </div>
                {showAssignDays===t.id&&(()=>{
                  const dayKeys2=["thu_2","thu_3","thu_4","thu_5","thu_6","thu_7","cn"];
                  const dayLabels2=["T2","T3","T4","T5","T6","T7","CN"];
                  const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
                  return <div style={{marginTop:10,padding:12,background:"#EEF2FF",borderRadius:10,border:"1.5px solid #818CF8"}} onClick={e=>e.stopPropagation()}>
                    <div style={{fontSize:13,fontWeight:700,color:"#3730A3",marginBottom:8}}>Gán vào ngày nào?</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {dayLabels2.map((dl,di)=>{
                        const isGym=gd.includes(di);
                        const dt=isGym?"train":"rest";
                        const sameType=dt===t.day_type;
                        const isSelected=(assignSelectedDays||[]).includes(dayKeys2[di]);
                        return <div key={di} onClick={()=>{
                          if(!sameType)return;
                          const cur=[...(assignSelectedDays||[])];
                          if(isSelected) setAssignSelectedDays(cur.filter(d=>d!==dayKeys2[di]));
                          else setAssignSelectedDays([...cur,dayKeys2[di]]);
                        }} style={{padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:isSelected?700:600,
                          background:isSelected?"#6366F1":sameType?"#EEF2FF":"#F3F4F6",
                          color:isSelected?"#fff":sameType?"#3730A3":"#9CA3AF",
                          border:`1.5px solid ${isSelected?"#4F46E5":sameType?"#818CF8":"#E5E7EB"}`,
                          cursor:sameType?"pointer":"not-allowed",opacity:sameType?1:0.5,
                        }}>{dl} ({isGym?"Tập":"Nghỉ"})</div>;
                      })}
                    </div>
                    <div style={{fontSize:11,color:"#4338CA",marginBottom:8}}>Chọn ngày cùng loại ({t.day_type==="train"?"Tập":"Nghỉ"}). {(assignSelectedDays||[]).length} ngày đã chọn.</div>
                    <button onClick={async()=>{
                      const days=assignSelectedDays||[];
                      if(days.length===0){alert("Chọn ít nhất 1 ngày");return;}
                      const mealsData=t.meals||[];
                      const totalCal=t.total_cal||0;
                      for(const dayKey of days){
                        if(saveWeeklyTemplate) await saveWeeklyTemplate(dayKey,t.day_type,mealsData,totalCal);
                      }
                      setShowAssignDays(null);
                      setAssignSelectedDays([]);
                      const el=document.getElementById("tpl-applied");
                      if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
                    }} disabled={(assignSelectedDays||[]).length===0} style={{...redBtn,marginTop:0,background:(assignSelectedDays||[]).length>0?"linear-gradient(135deg,#6366F1,#4F46E5)":"#E2E8F0",opacity:(assignSelectedDays||[]).length>0?1:0.6}}>📅 Gán cho {(assignSelectedDays||[]).length} ngày</button>
                  </div>;
                })()}
              </div>}
            </div>;})}
            <div id="tpl-applied" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:4}}>
              <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã áp dụng thành công!</span>
            </div>
          </div>:<div style={{textAlign:"center",padding:"30px 16px"}}>
            <div style={{fontSize:32,marginBottom:8}}>📚</div>
            <div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>Chưa có mẫu nào</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t3,lineHeight:1.5}}>{isAdmin?"Vào Admin → Mẫu để tạo template cho users.":"Admin chưa tạo template mẫu. Vui lòng chờ hoặc dùng tab Tự nhập."}</div>
          </div>}
        </div>;
      })()}
    </div>}

    {/* PROFILE */}
    {section==="profile"&&<div style={card}>
      <div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>👤</span><span style={{fontWeight:800,color:C.t1}}>Hồ sơ cá nhân</span></div>
      <div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:16}}>⚡ Nhập thông số → Macro (dinh dưỡng) tự tính theo công thức Mifflin-St Jeor</div>

      {/* Section 1: Thông tin cơ bản */}
      <div style={{background:"#fff",border:`1px solid ${mob&&profileAcc==="info"?C.primary:C.border}`,borderRadius:14,padding:0,marginBottom:16,overflow:"hidden"}}>
        <div onClick={()=>mob&&setProfileAcc(profileAcc==="info"?null:"info")} style={{display:"flex",alignItems:"center",gap:8,padding:mob?"14px 14px":"16px 20px",cursor:mob?"pointer":"default",userSelect:"none",paddingBottom:12,borderBottom:"1.5px solid #F3F4F6"}}>
          <span style={{fontSize:16}}>📋</span>
          <span style={{fontSize:mob?16:17,fontWeight:800,color:C.t1,flex:1}}>Thông tin cơ bản</span>
          {mob&&<span style={{fontSize:12,color:C.t3,marginRight:4}}>{profile.cm}cm · {profile.kg}kg</span>}
          {mob&&<span style={{fontSize:14,color:C.t3,transition:"transform 0.2s",transform:profileAcc==="info"?"rotate(180deg)":"rotate(0deg)"}}>▼</span>}
        </div>
        <div style={{maxHeight:mob?(profileAcc==="info"?1000:0):"none",overflow:"hidden",transition:mob?"max-height 0.3s ease":"none"}}>
        <div style={{padding:mob?"12px 14px 14px":"12px 20px 20px"}}>

        {/* Gender */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?8:10,marginBottom:14,maxWidth:mob?"100%":"50%"}}>
          {[{id:"male",icon:"👨",name:"Nam"},{id:"female",icon:"👩",name:"Nữ"}].map(g=><div key={g.id} onClick={()=>setProfile({...profile,gender:g.id})} style={{
            padding:mob?"10px 12px":"12px 14px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
            background:(profile.gender||"male")===g.id?"#EFF6FF":C.surface,
            border:`1.5px solid ${(profile.gender||"male")===g.id?"#60A5FA":C.border}`,
          }}>
            <span style={{fontSize:mob?20:24}}>{g.icon}</span>
            <span style={{fontSize:mob?13:14,fontWeight:700,color:C.t1}}>{g.name}</span>
            <div style={{marginLeft:"auto",width:20,height:20,borderRadius:"50%",border:`2px solid ${(profile.gender||"male")===g.id?"#007AFF":"#E2E8F0"}`,background:(profile.gender||"male")===g.id?"#007AFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{(profile.gender||"male")===g.id?"✓":""}</div>
          </div>)}
        </div>

        {/* 3 inputs */}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr",gap:mob?8:10}}>
          {[
            {key:"cm",label:"Chiều cao",icon:"📏",unit:"cm",mode:"numeric"},
            {key:"kg",label:"Cân nặng",icon:"⚖️",unit:"kg",mode:"decimal"},
            {key:"birthYear",label:"Năm sinh",icon:"🎂",unit:profile.birthYear?`${new Date().getFullYear()-profile.birthYear} tuổi`:"",mode:"numeric"},
          ].map(f=><div key={f.key}>
            <div style={{fontSize:mob?11:13,fontWeight:mob?600:700,color:C.t2,marginBottom:4,display:"flex",alignItems:"center",gap:6}}>{f.icon} {f.label}{f.key==="kg"&&weightLog&&weightLog.length>0&&<span style={{fontSize:10,fontWeight:700,color:"#16A34A",background:"#DCFCE7",padding:"1px 6px",borderRadius:8}}>{mob?"🔄 Auto":"🔄 Update cân nặng mới nhất"}</span>}</div>
            <div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <input type="text" inputMode={f.mode} value={f.key==="kg"?profile.kg:profile[f.key]} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;setProfile({...profile,[f.key]:Number(v)});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
              <span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
            </div>
          </div>)}
        </div>
      </div></div></div>

      {/* Section 2: Hoạt động */}
      <div style={{background:"#fff",border:`1px solid ${mob&&profileAcc==="activity"?C.primary:C.border}`,borderRadius:14,padding:0,marginBottom:16,overflow:"hidden"}}>
        <div onClick={()=>mob&&setProfileAcc(profileAcc==="activity"?null:"activity")} style={{display:"flex",alignItems:"center",gap:8,padding:mob?"14px 14px":"16px 20px",cursor:mob?"pointer":"default",userSelect:"none",paddingBottom:12,borderBottom:"1.5px solid #F3F4F6"}}>
          <span style={{fontSize:16}}>🏃</span>
          <span style={{fontSize:mob?16:17,fontWeight:800,color:C.t1,flex:1}}>Hoạt động của bạn</span>
          {mob&&<span style={{fontSize:12,color:C.t3,marginRight:4}}>{({gym:"Gym",gym_cardio:"Gym+Cardio",cardio:"Cardio",none:"Không tập"})[profile.exerciseType||"gym"]} · {({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất chăm",daily:"Mỗi ngày"})[profile.frequency||"regular"]||""}</span>}
          {mob&&<span style={{fontSize:14,color:C.t3,transition:"transform 0.2s",transform:profileAcc==="activity"?"rotate(180deg)":"rotate(0deg)"}}>▼</span>}
        </div>
        <div style={{maxHeight:mob?(profileAcc==="activity"?2000:0):"none",overflow:"hidden",transition:mob?"max-height 0.3s ease":"none"}}>
        <div style={{padding:mob?"12px 14px 14px":"12px 20px 20px"}}>

        {/* Câu 1: Bạn thường tập gì? */}
        <div style={{fontSize:mob?13:14,fontWeight:800,color:C.t2,marginBottom:8}}>Bạn thường tập gì?</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:mob?6:8,marginBottom:16}}>
          {[
            {id:"gym",icon:"ex_gym",name:"Gym"},
            {id:"gym_cardio",icon:"ex_gym_cardio",name:"Gym + Cardio"},
            {id:"cardio",icon:"ex_cardio",name:"Cardio"},
            {id:"none",icon:"ex_none",name:"Không tập"},
          ].map(e=><div key={e.id} onClick={()=>{
            const updated={...profile,exerciseType:e.id};
            if(e.id==="none"){updated.goalType=profile.goalType==="bulk"?"maintain":profile.goalType;updated.frequency=undefined;}
            setProfile(updated);
          }} style={{
            padding:mob?"10px 6px":"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
            background:(profile.exerciseType||"gym")===e.id?C.primaryBg:C.surface,
            border:(profile.exerciseType||"gym")===e.id?`2px solid #F87171`:`1.5px solid ${C.border}`,
          }}>
            <img src={`/icons/${e.icon}.png`} alt="" style={{width:mob?34:38,height:"auto",maxHeight:mob?34:38}}/>
            <div style={{fontSize:mob?11:12,fontWeight:800,color:C.t1,marginTop:4}}>{e.name}</div>
          </div>)}
        </div>

        {/* Câu 2: Tần suất (ẩn khi Không tập) */}
        {(profile.exerciseType||"gym")!=="none"&&<>
          <div style={{fontSize:mob?13:14,fontWeight:800,color:C.t2,marginBottom:10,marginTop:6}}>Bạn tập thường xuyên đến mức nào?</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:8,marginBottom:22}}>
            {[
              {id:"occasional",name:"Thỉnh thoảng",desc:"1-2 buổi/tuần"},
              {id:"regular",name:"Đều đặn",desc:"3-4 buổi/tuần"},
              {id:"frequent",name:"Rất thường xuyên",desc:"5-6 buổi/tuần"},
              {id:"daily",name:"Gần như mỗi ngày",desc:"6-7 buổi/tuần"},
            ].map(f=><div key={f.id} onClick={()=>setProfile({...profile,frequency:f.id})} style={{
              display:"flex",alignItems:"center",gap:12,padding:mob?"11px 14px":"13px 16px",borderRadius:10,cursor:"pointer",
              background:(profile.frequency||"regular")===f.id?"#EFF6FF":C.surface,
              border:(profile.frequency||"regular")===f.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
            }}>
              <div style={{width:18,height:18,borderRadius:"50%",border:(profile.frequency||"regular")===f.id?`2.5px solid #3B82F6`:`2.5px solid ${C.border}`,background:(profile.frequency||"regular")===f.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {(profile.frequency||"regular")===f.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
              </div>
              <div><span style={{fontSize:mob?13:14,fontWeight:600,color:(profile.frequency||"regular")===f.id?"#2563EB":C.t1}}>{f.name}</span><span style={{fontSize:mob?11:12,fontWeight:500,color:C.t3,marginLeft:6}}>{f.desc}</span></div>
            </div>)}
          </div>

          {/* Lịch tập hàng tuần */}
          <div style={{borderTop:`1.5px solid #F3F4F6`,paddingTop:20,marginTop:4}}>
            <div style={{fontSize:mob?13:14,fontWeight:800,color:C.t2,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>📅 Lịch tập hàng tuần</div>
            {(()=>{
              const days=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
              const dayLabels=["T2","T3","T4","T5","T6","T7","CN"];
              const dayMap=[0,1,2,3,4,5,6];
              return <div>
                <div style={{display:"flex",gap:mob?5:8,flexWrap:"wrap",marginBottom:12}}>
                  {dayLabels.map((d,i)=>{const idx=dayMap[i];const on=days.includes(idx);return <div key={i} onClick={()=>{
                    const nd=on?days.filter(x=>x!==idx):[...days,idx].sort();
                    setProfile({...profile,gymDays:nd});
                    saveSetting("gymDays",JSON.stringify(nd));
                  }} style={{
                    width:mob?42:48,height:mob?42:48,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:mob?13:14,fontWeight:on?600:400,cursor:"pointer",
                    color:on?"#DC2626":"#94A3B8",background:on?"#FEF2F2":"#F8FAFC",
                    border:on?`1.5px solid #FECACA`:`1.5px solid ${C.border}`,
                  }}>{d}</div>;})}
                </div>
                <div style={{fontSize:13,fontWeight:600,color:C.t2,display:"flex",alignItems:"center",gap:6}}>ℹ️ Dùng để app biết hôm nay bạn tập hay nghỉ</div>
              </div>;
            })()}
          </div>
        </>}

        {/* Note Không tập */}
        {(profile.exerciseType||"gym")==="none"&&<div style={{padding:"10px 14px",borderRadius:10,background:"#FEF3C7",border:"1px solid #FDE68A",fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>⚠️ App sẽ tự tính macro cho người không tập lực</div>}
      </div></div></div>

      {/* Section 3: Mục tiêu */}
      <div style={{background:"#fff",border:`1px solid ${mob&&profileAcc==="goal"?C.primary:C.border}`,borderRadius:14,padding:0,marginBottom:16,overflow:"hidden"}}>
        <div onClick={()=>mob&&setProfileAcc(profileAcc==="goal"?null:"goal")} style={{display:"flex",alignItems:"center",gap:8,padding:mob?"14px 14px":"16px 20px",cursor:mob?"pointer":"default",userSelect:"none",paddingBottom:12,borderBottom:"1.5px solid #F3F4F6"}}>
          <span style={{fontSize:16}}>🎯</span>
          <span style={{fontSize:mob?16:17,fontWeight:800,color:C.t1,flex:1}}>Mục tiêu</span>
          {mob&&<span style={{fontSize:12,color:C.t3,marginRight:4}}>{({bulk:"Tăng cơ",cut:"Giảm mỡ",maintain:"Duy trì"})[profile.goalType||"bulk"]} → {profile.goalKg}kg</span>}
          {mob&&<span style={{fontSize:14,color:C.t3,transition:"transform 0.2s",transform:profileAcc==="goal"?"rotate(180deg)":"rotate(0deg)"}}>▼</span>}
        </div>
        <div style={{maxHeight:mob?(profileAcc==="goal"?1500:0):"none",overflow:"hidden",transition:mob?"max-height 0.3s ease":"none"}}>
        <div style={{padding:mob?"12px 14px 14px":"12px 20px 20px"}}>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:mob?6:8,marginBottom:16,maxWidth:mob?"100%":540}}>
          {[
            {id:"bulk",icon:"💪",name:"Tăng cơ",c:"#16A34A",bg:"#DCFCE7",bc:"#00C896"},
            {id:"cut",icon:"🔥",name:"Giảm mỡ",c:"#EF4444",bg:"#FEE2E2",bc:"#F87171"},
            {id:"maintain",icon:"⚖️",name:"Duy trì",c:"#007AFF",bg:"#EFF6FF",bc:"#60A5FA"},
          ].map(g=>{
            const disabled=(profile.exerciseType||"gym")==="none"&&g.id==="bulk";
            return <div key={g.id} onClick={()=>{if(!disabled)setProfile({...profile,goalType:g.id});}} style={{
              padding:mob?"10px 6px":"14px 10px",borderRadius:12,cursor:disabled?"not-allowed":"pointer",textAlign:"center",
              background:profile.goalType===g.id?g.bg:C.surface,
              border:profile.goalType===g.id?`2px solid ${g.bc}`:`1.5px solid ${C.border}`,
              opacity:disabled?0.3:1,position:"relative",
            }}>
              <div style={{fontSize:mob?20:22}}>{g.icon}</div>
              <div style={{fontSize:mob?12:13,fontWeight:800,color:C.t1,marginTop:4}}>{g.name}</div>
              {disabled&&<div style={{position:"absolute",top:-6,right:-6,background:"#EF4444",color:"#fff",fontSize:10,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</div>}
            </div>;
          })}
        </div>
        {(profile.exerciseType||"gym")==="none"&&profile.goalType==="bulk"&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:"#FEE2E2",border:"1px solid #FCA5A5",fontSize:12,color:"#003D99",display:"flex",alignItems:"center",gap:6}}>⚠️ Không thể tăng cơ khi không tập luyện.</div>}

        {/* Chế độ ăn (chỉ khi Giảm mỡ) */}
        {profile.goalType==="cut"&&<div style={{marginBottom:14,paddingTop:12,borderTop:`1.5px solid #F3F4F6`}}>
          <div style={{fontSize:mob?13:14,fontWeight:800,color:C.t2,marginBottom:8}}>🍽️ Chế độ ăn giảm mỡ</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:6}}>
            {[
              {id:"balanced",name:"Cân bằng"},
              {id:"low_carb",name:"Low-carb (≤ 100g)"},
              {id:"keto",name:"Keto (≤ 50g)"},
            ].map(d=><div key={d.id} onClick={()=>setProfile({...profile,dietStrategy:d.id})} style={{
              display:"flex",alignItems:"center",gap:12,padding:mob?"11px 14px":"13px 16px",borderRadius:10,cursor:"pointer",
              background:(profile.dietStrategy||"balanced")===d.id?"#EFF6FF":C.surface,
              border:(profile.dietStrategy||"balanced")===d.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
            }}>
              <div style={{width:18,height:18,borderRadius:"50%",border:(profile.dietStrategy||"balanced")===d.id?`2.5px solid #3B82F6`:`2.5px solid ${C.border}`,background:(profile.dietStrategy||"balanced")===d.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {(profile.dietStrategy||"balanced")===d.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
              </div>
              <span style={{fontSize:mob?13:14,fontWeight:600,color:(profile.dietStrategy||"balanced")===d.id?"#2563EB":C.t1}}>{d.name}</span>
            </div>)}
          </div>
        </div>}

        {/* Goal weight + duration */}
        {profile.goalType!=="maintain"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?8:10,maxWidth:mob?"100%":540}}>
          {[
            {key:"goalKg",label:"Cân nặng mục tiêu",icon:"⚖️",unit:"kg",mode:"decimal"},
            {key:"months",label:"Thời gian mong muốn",icon:"📅",unit:"tháng",mode:"numeric"},
          ].map(f=><div key={f.key}>
            <div style={{fontSize:mob?11:13,fontWeight:mob?600:700,color:C.t2,marginBottom:4}}>{f.icon} {f.label}</div>
            <div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <input type="text" inputMode={f.mode} value={profile[f.key]} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;setProfile({...profile,[f.key]:f.key==="months"?Math.max(1,Number(v)):Number(v)});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
              <span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
            </div>
          </div>)}
        </div>}
      </div></div></div>

      {/* Timeline plan */}
      {profile.goalType!=="maintain"&&Math.abs(macro.diff)>0&&<div style={{marginTop:16,background:C.primaryBg,borderRadius:12,padding:"14px 16px",border:`2px solid ${C.primary}`}}>
        <div style={{fontSize:14,fontWeight:900,color:C.primary,marginBottom:10}}>
          📋 Kế hoạch {profile.goalType==="bulk"?"tăng cân":"giảm cân"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,}}>{"TỔNG "+(profile.goalType==="bulk"?"TĂNG":"GIẢM")}</div>
            <div style={{fontSize:20,fontWeight:800,color:C.t1}}>{Math.abs(macro.diff)} kg</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,}}>MỖI THÁNG</div>
            <div style={{fontSize:20,fontWeight:900,color:C.primary}}>{macro.perMonth} kg</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,}}>MỖI TUẦN</div>
            <div style={{fontSize:20,fontWeight:900,color:C.primary}}>{macro.perWeek} kg</div>
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
              <div style={{fontSize:14,fontWeight:700,color:C.t1}}>{capped}</div>
              <div style={{fontSize:10,fontWeight:600,color:C.primary}}>kg</div>
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
        <div style={{fontSize:13,fontWeight:700,color:"#B91C1C",marginBottom:12,display:"flex",alignItems:"center",gap:4}}>
          <span>✓ Tự động lưu</span>
        </div>
        <div style={{borderTop:`2px solid ${C.red}`,paddingTop:16}}>
        <div style={{fontSize:15,fontWeight:900,color:C.primary,marginBottom:12}}>⚡ Macro (dinh dưỡng) tự động tính</div>
        <div style={{display:"flex",alignItems:"center",gap:4,padding:"6px 8px",background:C.surface,borderRadius:10,border:`1.5px solid ${C.border}`,marginBottom:12,width:"fit-content"}}>
          {[{id:"standard",label:"Quốc tế"},{id:"asian",label:"Việt Nam (-10%)"}].map(m=><div key={m.id} onClick={()=>setProfile({...profile,calorieMode:m.id})} style={{
            padding:"6px 14px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,
            background:(profile.calorieMode||"standard")===m.id?C.primary:"transparent",
            color:(profile.calorieMode||"standard")===m.id?"#fff":C.t2,
            transition:"all 0.15s",
          }}>{m.label}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:8}}>
          {[
            {l:"TDEE",v:`${macro.tdee} cal`,desc:"Calo duy trì",c:C.t1},
            {l:"BMI (chỉ số cơ thể)",v:macro.bmi,desc:macro.bmi<18.5?"Thiếu cân":macro.bmi<25?"Bình thường":"Thừa cân",c:C.gold},
            {l:"Calo mục tiêu",v:`${macro.calTarget} cal`,desc:profile.goalType==="bulk"?"Tăng cơ +250":profile.goalType==="cut"?"Giảm mỡ -350":"Duy trì",c:C.red},
            {l:"Calo ngày nghỉ",v:`${macro.calRest} cal`,desc:"Giảm carb, giữ P/F",c:C.blue},
          ].map((r,i)=><div key={i} style={{background:C.surface,borderRadius:10,padding:"10px 14px",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.05em"}}>{r.l}</div>
            <div style={{fontSize:20,fontWeight:900,color:r.c,marginTop:2}}>{r.v}</div>
            <div style={{fontSize:11,fontWeight:600,color:C.t3,marginTop:2}}>{r.desc}</div>
          </div>)}
        </div>

        <div style={{marginTop:14,padding:14,borderRadius:12,border:`1.5px solid rgba(0,122,255,0.2)`,background:"rgba(0,122,255,0.02)"}}>
        <div style={{fontSize:14,fontWeight:800,color:C.primary,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>💪 Macro ngày tập</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8}}>
          {[
            {l:"Protein",v:`${macro.protein}g`,sub:`${macro.protein*4} cal · ${macro.pRatio}`,c:C.red},
            {l:"Carb (tinh bột)",v:`${macro.carb}g`,sub:`${macro.carb*4} cal · ${macro.cRatio}`,c:C.gold},
            {l:"Fat (chất béo)",v:`${macro.fat}g`,sub:`${macro.fat*9} cal · ${macro.fRatio}`,c:C.t1},
            {l:"Chất xơ",v:`${macro.fiber}g`,sub:"Khuyến nghị",c:C.green},
          ].map((r,i)=><div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase"}}>{r.l}</div>
            <div style={{fontSize:18,fontWeight:900,color:r.c,marginTop:2}}>{r.v}</div>
            <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:2}}>{r.sub}</div>
          </div>)}
        </div>
        </div>

        <div style={{marginTop:10,padding:14,borderRadius:12,border:`1.5px solid rgba(249,115,22,0.2)`,background:"rgba(249,115,22,0.02)"}}>
        <div style={{fontSize:14,fontWeight:800,color:"#D97706",marginBottom:10,display:"flex",alignItems:"center",gap:6}}>😴 Macro ngày nghỉ</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8}}>
          {[
            {l:"Protein",v:`${macro.protein}g`,sub:`${macro.protein*4} cal · ${macro.pRatio}`,c:C.red},
            {l:"Carb (tinh bột)",v:`${macro.carbRest}g`,sub:`${macro.carbRest*4} cal · ×0.75`,c:C.gold},
            {l:"Fat (chất béo)",v:`${macro.fat}g`,sub:`${macro.fat*9} cal · ${macro.fRatio}`,c:C.t1},
            {l:"Chất xơ",v:`${Math.round(macro.calRest/1000*14)}g`,sub:"Khuyến nghị",c:C.green},
          ].map((r,i)=><div key={i} style={{background:"#fff",borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase"}}>{r.l}</div>
            <div style={{fontSize:18,fontWeight:900,color:r.c,marginTop:2}}>{r.v}</div>
            <div style={{fontSize:10,fontWeight:600,color:C.t3,marginTop:2}}>{r.sub}</div>
          </div>)}
        </div>
        </div>

        {(profile.calorieMode||"standard")==="asian"&&<div style={{marginTop:10,padding:"10px 14px",borderRadius:10,background:"#EFF6FF",border:"1px solid #BFDBFE",display:"flex",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:14,flexShrink:0}}>🇻🇳</span>
          <span style={{fontSize:12,fontWeight:600,color:"#1E40AF",lineHeight:1.6}}>Đang dùng công thức Việt Nam (BMR ×0.9). Phù hợp hơn cho người Việt Nam và Đông Nam Á.</span>
        </div>}

        <div style={{marginTop:12,background:C.goldBg,borderRadius:10,padding:"10px 14px",border:"1.5px solid #CA8A04"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#78350F",lineHeight:1.6}}>
            💡 BMR = {macro.bmr}{(profile.calorieMode||"standard")==="asian"?" (×0.9 Việt Nam)":""} → ×{macro.actMul} = TDEE {macro.tdee} cal.
            {macro.goal==="bulk"?"Tăng cơ":macro.goal==="cut"?"Giảm mỡ":"Duy trì"}: P = {profile.kg}×{macro.pRatio.replace("g/kg","")} = {macro.protein}g, C = {profile.kg}×{macro.cRatio.replace("g/kg","")} = {macro.carb}g, F = {profile.kg}×{macro.fRatio.replace("g/kg","")} = {macro.fat}g.
            Ngày nghỉ: C giảm → {macro.carbRest}g. Tổng: {macro.calTarget} cal (tập) / {macro.calRest} cal (nghỉ).
          </span>
        </div>
      </div>
      </div>
    </div>}

    {/* SCHEDULE */}
    {section==="schedule"&&(()=>{
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
    })()}

    {/* WEIGHT */}
    {section==="weight"&&(()=>{
      const nextWeek=weightLog.length+1;
      const today=fmtDate(new Date());
      return <div style={card}>
        {mob&&<div style={{fontSize:19,fontWeight:800,color:C.t1,marginBottom:16}}>Nhập cân nặng</div>}
        <div style={!mob&&weightLog.length>=2?{display:"grid",gridTemplateColumns:"40% 58%",gap:20,marginBottom:16}:{marginBottom:16}}>
        <div style={!mob?{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20}:{}}>
        {!mob&&<div style={{fontSize:17,fontWeight:800,color:C.t1,marginBottom:20,display:"flex",alignItems:"center",gap:8}}>⚖️ Nhập cân nặng</div>}
        <div style={{background:C.surface,borderRadius:10,padding:"12px 16px",marginBottom:20,border:`1.5px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Tuần {nextWeek}</span>
            <span style={{fontSize:13,fontWeight:700,color:C.t2}}>{today}</span>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:C.t3}}>Ngày tự động lấy từ hệ thống</div>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Cân nặng (kg)</div>
          <input id="weightInput" type="text" inputMode="decimal" placeholder="VD: 64.3" style={inp}/>
        </div>
        <button onClick={async()=>{
          const val=parseFloat(document.getElementById("weightInput").value.replace(",","."));
          if(!val||val<30||val>200)return;
          await addWeight(val);
          setProfile({...profile,kg:val});
          document.getElementById("weightInput").value="";
          const el=document.getElementById("weight-saved");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
        }} style={{...redBtn,marginTop:12}}>⚡ Lưu cân nặng</button>
        <div id="weight-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:10}}>
          <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã lưu & cập nhật macro theo cân nặng mới!</span>
        </div>
        </div>
        {!mob&&weightLog.length>=2&&<div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20}}>
          <div style={{fontSize:17,fontWeight:800,marginBottom:20,display:"flex",alignItems:"center",gap:8,color:C.t1}}>📈 Biểu đồ cân nặng</div>
          <WeightBarChart weightLog={weightLog} goalKg={profile.goalKg||(weightLog.length>0?weightLog[0].kg:profile.kg)} goalType={profile.goalType} startKg={weightLog.length>0?weightLog[0].kg:profile.kg} mob={false}/>
        </div>}
        </div>
        <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:14,marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{...lbl,fontSize:14,fontWeight:800}}>📋 Lịch sử theo dõi cân nặng</div>
            <button onClick={()=>{
              if(window.confirm("Xóa toàn bộ lịch sử cân nặng?")){
                resetWeights();
              }
            }} style={{fontSize:11,fontWeight:700,padding:"4px 10px",background:C.redBg,color:C.secondary,border:`1px solid ${C.secondary}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
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
              <span style={{fontSize:16,fontWeight:900,color:"#F59E0B"}}>⚡</span>
              <span style={{fontSize:13,fontWeight:700,color:"#78350F",lineHeight:1.5}}>
                Tổng: {totalDelta>0?"+":""}{totalDelta} kg trong {weightLog.length-1} tuần. Trung bình {avgPerWeek>0?"+":""}{avgPerWeek} kg/tuần.
                {avgPerWeek>0&&avgPerWeek<=0.5?" Tốc độ lý tưởng tăng cơ!":avgPerWeek>0.5?" Hơi nhanh, cẩn thận tích mỡ.":avgPerWeek<0?" Đang giảm — kiểm tra lại chế độ ăn.":" Giữ ổn định."}
              </span>
            </div>
          </div>;
        })()}
      </div>;
    })()}
    {/* ABOUT */}
    {section==="about"&&<AboutPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={mob}/>}

    {/* ACCOUNT */}
    {section==="account"&&<div style={card}>
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
      <div style={!mob?{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}:{}}>
      <button onClick={()=>{if(signOut)signOut();}} style={{...redBtn,background:"linear-gradient(135deg,#EF4444,#DC2626)",color:"#fff",border:"none"}}>🚪 Đăng xuất</button>
      <button onClick={()=>{
        caches.keys().then(names=>Promise.all(names.map(k=>caches.delete(k)))).then(()=>{
          if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
          window.location.reload(true);
        });
      }} style={{...redBtn,marginTop:mob?8:0,background:"linear-gradient(135deg,#6B7280,#4B5563)"}}>🗑️ Xóa cache & cập nhật</button>
      </div>
    </div>}

    <style>{`@keyframes spin{to{transform:rotate(360deg);}} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;} input[type=number]{-moz-appearance:textfield;}`}</style>
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
    if(mode==="login"){
      if(!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
    }else{
      if(!user.trim()||!email.trim()||!pass.trim()){setErr("Vui lòng nhập đầy đủ");return;}
      if(!email.includes("@")){setErr("Vui lòng nhập email hợp lệ");return;}
    }
    if(pass.length<6){setErr("Mật khẩu tối thiểu 6 ký tự");return;}
    try{
      if(mode==="register"){
        await signUp(email,pass,user.trim());
        setSuccess(`✅ Đăng ký thành công! Tài khoản "${user.trim()}" đã được kích hoạt.`);
        setTimeout(()=>onLogin(user.trim()),1500);
      }else{
        await signIn(email,pass);
        onLogin(email);
      }
    }catch(e){setErr(e.message||"Lỗi xác thực");}
  };

  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo.png" alt="Fipilot AI" style={{width:80,height:80,borderRadius:17,objectFit:"cover"}}/>
        <div style={{fontSize:24,fontWeight:900,color:C.t1,marginTop:12,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
        <div style={{fontSize:13,fontWeight:700,color:C.secondary,marginTop:2}}>AI Nutrition Coach</div>
      </div>
      <div style={{...card,padding:"24px 28px"}}>
        <div style={{display:"flex",marginBottom:20,borderBottom:`2px solid ${C.border}`}}>
          {["login","register"].map(m=><button key={m} onClick={()=>{setMode(m);setErr("");setSuccess("");}} style={{
            flex:1,padding:"10px",fontSize:14,fontWeight:mode===m?900:600,border:"none",background:"transparent",cursor:"pointer",
            color:mode===m?C.t1:C.t3,borderBottom:mode===m?"3px solid #007AFF":"3px solid transparent",fontFamily:"inherit",
          }}>{m==="login"?"Đăng nhập":"Đăng ký"}</button>)}
        </div>
        {mode==="register"&&<div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Tên hiển thị</div>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="VD: gymboy63" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>}
        <div style={{marginBottom:12}}>
          <div style={{...lbl,marginBottom:6}}>Email</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{...lbl,marginBottom:6}}>Mật khẩu</div>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••" style={inp} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>
        {err&&<div style={{marginBottom:12,padding:"8px 12px",background:C.redBg,borderRadius:8,border:`1.5px solid ${C.red}`,fontSize:12,fontWeight:700,color:"#7F1D1D"}}>❌ {err}</div>}
        {success&&<div style={{marginBottom:12,padding:"10px 14px",background:C.greenBg,borderRadius:8,border:`1.5px solid ${C.green}`,fontSize:13,fontWeight:700,color:"#14532D"}}>{success}</div>}
        <button onClick={handleSubmit} disabled={!!success} style={{...redBtn,opacity:success?0.6:1}}>{mode==="login"?"Đăng nhập":"Đăng ký & Kích hoạt"}</button>
        {mode==="login"&&<div style={{textAlign:"center",marginTop:12,fontSize:12,fontWeight:600,color:C.t3}}>Chưa có tài khoản? <span onClick={()=>setMode("register")} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>Đăng ký ngay</span></div>}
        {mode==="register"&&<div style={{textAlign:"center",marginTop:12,fontSize:11,fontWeight:600,color:C.t3}}>Tài khoản sẽ được kích hoạt tự động ngay sau khi đăng ký</div>}
      </div>
    </div>
  </div>;
}

function OnboardingWizard({profile,setProfile,onComplete}){
  const mob=useIsMobile();
  const [step,setStep]=useState(1);
  const p=profile||defaultProfile;
  const macro=calcMacro(p);
  const totalSteps=4;

  const stepDots=<div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
    {[1,2,3,4].map(s=><div key={s} style={{width:s===step?24:8,height:8,borderRadius:4,background:s<step?"#007AFF":s===step?"#36A3FF":"#CDCDCD",transition:"all 0.3s"}}/>)}
  </div>;

  const nextBtn=(label,disabled,color)=><button onClick={()=>setStep(step+1)} disabled={disabled} style={{...redBtn,marginTop:16,opacity:disabled?0.5:1,background:color||"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)"}}>{label} →</button>;
  const backBtn=<button onClick={()=>setStep(step-1)} style={{...redBtn,marginTop:8,background:"transparent",color:C.t3,fontWeight:700,fontSize:13}}>← Quay lại</button>;

  const fieldBox=(children)=><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:mob?14:20,marginBottom:16}}>{children}</div>;

  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:mob?16:20}}>
    <div style={{width:"100%",maxWidth:480}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <img src="/logo.png" alt="Fipilot AI" style={{width:72,height:72,borderRadius:15,objectFit:"cover"}}/>
        <div style={{fontSize:20,fontWeight:900,color:C.t1,marginTop:10,letterSpacing:"-0.02em"}}>FIPILOT AI</div>
        <div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:2}}>Thiết lập hồ sơ của bạn</div>
      </div>

      <div style={{...card,padding:mob?"20px 16px":"24px 28px"}}>
        {stepDots}

        {/* STEP 1: Thông tin cơ bản */}
        {step===1&&<div>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:20}}>📋</div>
            <div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Thông tin cơ bản</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t3}}>Bước 1/{totalSteps}</div>
          </div>

          {/* Gender */}
          <div style={{...lbl,marginBottom:8}}>Giới tính</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {[{id:"male",icon:"👨",name:"Nam"},{id:"female",icon:"👩",name:"Nữ"}].map(g=><div key={g.id} onClick={()=>setProfile({...p,gender:g.id})} style={{
              padding:"12px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
              background:(p.gender||"male")===g.id?"#EFF6FF":C.surface,
              border:`1.5px solid ${(p.gender||"male")===g.id?"#60A5FA":C.border}`,
            }}>
              <span style={{fontSize:22}}>{g.icon}</span>
              <span style={{fontSize:14,fontWeight:700,color:C.t1}}>{g.name}</span>
              <div style={{marginLeft:"auto",width:20,height:20,borderRadius:"50%",border:`2px solid ${(p.gender||"male")===g.id?"#007AFF":"#E2E8F0"}`,background:(p.gender||"male")===g.id?"#007AFF":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{(p.gender||"male")===g.id?"✓":""}</div>
            </div>)}
          </div>

          {/* 4 inputs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {key:"cm",label:"Chiều cao",icon:"📏",unit:"cm",mode:"numeric"},
              {key:"kg",label:"Cân nặng",icon:"⚖️",unit:"kg",mode:"decimal"},
              {key:"birthYear",label:"Năm sinh",icon:"🎂",unit:p.birthYear?`${new Date().getFullYear()-p.birthYear} tuổi`:"",mode:"numeric"},
            ].map(f=><div key={f.key}>
              <div style={{fontSize:mob?11:13,fontWeight:mob?600:700,color:C.t2,marginBottom:4}}>{f.icon} {f.label}</div>
              <div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                <input type="text" inputMode={f.mode} value={f.key==="kg"?p.kg:p[f.key]} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;setProfile({...p,[f.key]:Number(v)});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
                <span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
              </div>
            </div>)}
          </div>

          {nextBtn("Tiếp theo",!p.cm||!p.kg||!p.birthYear)}
        </div>}

        {/* STEP 2: Hoạt động */}
        {step===2&&<div>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:20}}>🏃</div>
            <div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Hoạt động của bạn</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t3}}>Bước 2/{totalSteps}</div>
          </div>

          {/* Câu 1: Bạn tập gì? */}
          <div style={{...lbl,marginBottom:8}}>Bạn thường tập gì?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?6:8,marginBottom:16}}>
            {[
              {id:"gym",icon:"ex_gym",name:"Gym"},
              {id:"gym_cardio",icon:"ex_gym_cardio",name:"Gym + Cardio"},
              {id:"cardio",icon:"ex_cardio",name:"Cardio"},
              {id:"none",icon:"ex_none",name:"Không tập"},
            ].map(e=><div key={e.id} onClick={()=>{
              const updated={...p,exerciseType:e.id};
              if(e.id==="none"){updated.goalType=p.goalType==="bulk"?"maintain":p.goalType;updated.frequency=undefined;}
              setProfile(updated);
            }} style={{
              padding:mob?"10px 6px":"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
              background:(p.exerciseType||"gym")===e.id?C.primaryBg:C.surface,
              border:(p.exerciseType||"gym")===e.id?`2px solid #F87171`:`1.5px solid ${C.border}`,
            }}>
              <img src={`/icons/${e.icon}.png`} alt="" style={{width:mob?34:38,height:"auto",maxHeight:mob?34:38}}/>
              <div style={{fontSize:mob?11:12,fontWeight:800,color:C.t1,marginTop:4}}>{e.name}</div>
            </div>)}
          </div>

          {/* Câu 2: Tần suất */}
          {(p.exerciseType||"gym")!=="none"&&<>
            <div style={{...lbl,marginBottom:8}}>Bạn tập thường xuyên đến mức nào?</div>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {[
                {id:"occasional",name:"Thỉnh thoảng",desc:"1-2 buổi/tuần"},
                {id:"regular",name:"Đều đặn",desc:"3-4 buổi/tuần"},
                {id:"frequent",name:"Rất thường xuyên",desc:"5-6 buổi/tuần"},
                {id:"daily",name:"Gần như mỗi ngày",desc:"6-7 buổi/tuần"},
              ].map(f=><div key={f.id} onClick={()=>setProfile({...p,frequency:f.id})} style={{
                display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",
                background:(p.frequency||"regular")===f.id?"#EFF6FF":C.surface,
                border:(p.frequency||"regular")===f.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
              }}>
                <div style={{width:18,height:18,borderRadius:"50%",border:(p.frequency||"regular")===f.id?`2.5px solid #3B82F6`:`2.5px solid ${C.border}`,background:(p.frequency||"regular")===f.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {(p.frequency||"regular")===f.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <div><span style={{fontSize:13,fontWeight:600,color:(p.frequency||"regular")===f.id?"#2563EB":C.t1}}>{f.name}</span><span style={{fontSize:11,fontWeight:500,color:C.t3,marginLeft:6}}>{f.desc}</span></div>
              </div>)}
            </div>
          </>}

          {(p.exerciseType||"gym")==="none"&&<div style={{padding:"10px 14px",borderRadius:10,background:"#FEF3C7",border:"1px solid #FDE68A",fontSize:12,color:"#92400E",display:"flex",alignItems:"center",gap:6}}>⚠️ App sẽ tự tính macro cho người không tập lực</div>}

          {nextBtn("Tiếp theo")}
          {backBtn}
        </div>}

        {/* STEP 3: Mục tiêu */}
        {step===3&&<div>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:20}}>🎯</div>
            <div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Mục tiêu</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t3}}>Bước 3/{totalSteps}</div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:mob?6:8,marginBottom:16}}>
            {[
              {id:"bulk",icon:"💪",name:"Tăng cơ",c:"#16A34A",bg:"#DCFCE7",bc:"#00C896"},
              {id:"cut",icon:"🔥",name:"Giảm mỡ",c:"#EF4444",bg:"#FEE2E2",bc:"#F87171"},
              {id:"maintain",icon:"⚖️",name:"Duy trì",c:"#007AFF",bg:"#EFF6FF",bc:"#60A5FA"},
            ].map(g=>{
              const disabled=(p.exerciseType||"gym")==="none"&&g.id==="bulk";
              return <div key={g.id} onClick={()=>{if(!disabled)setProfile({...p,goalType:g.id});}} style={{
                padding:mob?"10px 6px":"14px 10px",borderRadius:12,cursor:disabled?"not-allowed":"pointer",textAlign:"center",
                background:p.goalType===g.id?g.bg:C.surface,
                border:p.goalType===g.id?`2px solid ${g.bc}`:`1.5px solid ${C.border}`,
                opacity:disabled?0.3:1,
              }}>
                <div style={{fontSize:mob?20:22}}>{g.icon}</div>
                <div style={{fontSize:mob?12:13,fontWeight:800,color:C.t1,marginTop:4}}>{g.name}</div>
              </div>;
            })}
          </div>

          {/* Chế độ ăn (chỉ khi Giảm mỡ) */}
          {p.goalType==="cut"&&<div style={{marginBottom:14,paddingTop:12,borderTop:`1.5px solid #F3F4F6`}}>
            <div style={{fontSize:mob?13:14,fontWeight:800,color:C.t2,marginBottom:8}}>🍽️ Chế độ ăn giảm mỡ</div>
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr 1fr",gap:6}}>
              {[
                {id:"balanced",name:"Cân bằng"},
                {id:"low_carb",name:"Low-carb (≤ 100g)"},
                {id:"keto",name:"Keto (≤ 50g)"},
              ].map(d=><div key={d.id} onClick={()=>setProfile({...p,dietStrategy:d.id})} style={{
                display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:10,cursor:"pointer",
                background:(p.dietStrategy||"balanced")===d.id?"#EFF6FF":C.surface,
                border:(p.dietStrategy||"balanced")===d.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
              }}>
                <div style={{width:18,height:18,borderRadius:"50%",border:(p.dietStrategy||"balanced")===d.id?`2.5px solid #3B82F6`:`2.5px solid ${C.border}`,background:(p.dietStrategy||"balanced")===d.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {(p.dietStrategy||"balanced")===d.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
                </div>
                <span style={{fontSize:13,fontWeight:600,color:(p.dietStrategy||"balanced")===d.id?"#2563EB":C.t1}}>{d.name}</span>
              </div>)}
            </div>
          </div>}

          {/* Goal weight + duration */}
          {p.goalType!=="maintain"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {key:"goalKg",label:"Cân nặng mục tiêu",icon:"⚖️",unit:"kg",mode:"decimal"},
              {key:"months",label:"Thời gian mong muốn",icon:"📅",unit:"tháng",mode:"numeric"},
            ].map(f=><div key={f.key}>
              <div style={{fontSize:mob?11:13,fontWeight:mob?600:700,color:C.t2,marginBottom:4}}>{f.icon} {f.label}</div>
              <div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                <input type="text" inputMode={f.mode} value={p[f.key]||""} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;if(v===""){setProfile({...p,[f.key]:""});return;}setProfile({...p,[f.key]:Number(v)});}} onBlur={e=>{if(f.key==="months"&&(!p[f.key]||p[f.key]<1))setProfile({...p,months:1});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
                <span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
              </div>
            </div>)}
          </div>}

          {/* Safety check */}
          {p.goalType!=="maintain"&&macro.perWeek>0&&<div style={{marginTop:12,padding:"8px 12px",background:macro.safe?C.greenBg:C.redBg,borderRadius:8,border:`1.5px solid ${macro.safe?C.green:C.red}`}}>
            <span style={{fontSize:12,fontWeight:700,color:macro.safe?"#14532D":"#7F1D1D"}}>
              {macro.safe
                ?`✓ Tốc độ ${macro.perWeek} kg/tuần — an toàn!`
                :`⚠ Tốc độ ${macro.perWeek} kg/tuần — quá nhanh! Nên kéo dài thời gian.`
              }
            </span>
          </div>}

          {nextBtn("Tiếp theo")}
          {backBtn}
        </div>}

        {/* STEP 4: Hoàn tất — Preview macro */}
        {step===4&&<div>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:20}}>✨</div>
            <div style={{fontSize:17,fontWeight:900,color:C.t1,marginTop:4}}>Hoàn tất!</div>
            <div style={{fontSize:12,fontWeight:600,color:C.t3}}>Macro đã tính xong</div>
          </div>

          {/* Macro hero preview */}
          <div style={{background:"linear-gradient(135deg,#0A1628 0%,#162544 100%)",border:"2.5px solid #007AFF",borderRadius:14,padding:16,marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:"0.08em"}}>CALO MỤC TIÊU NGÀY TẬP</div>
            <div style={{fontSize:32,fontWeight:900,color:"#FFF",letterSpacing:"-0.03em",marginTop:4}}>{macro.calTarget} <span style={{fontSize:14,fontWeight:700,color:"rgba(255,255,255,0.5)"}}>kcal</span>{(profile.calorieMode||"standard")==="asian"&&<span style={{fontSize:11,fontWeight:700,color:"#5AC8FA",marginLeft:8,padding:"2px 8px",background:"rgba(90,200,250,0.15)",borderRadius:6}}>🇻🇳 Calo chuẩn Việt Nam</span>}{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:11,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),marginLeft:6,padding:"2px 8px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.15)":"rgba(251,191,36,0.15)"),borderRadius:6}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}</div>
            <div style={{display:"flex",gap:14,marginTop:12}}>
              <MacroRing l="Protein" v={macro.protein} max={macro.protein} color="#007AFF" color2="#007AFF" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
              <MacroRing l="Carb" v={macro.carb} max={macro.carb} color="#5AC8FA" color2="#5AC8FA" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
              <MacroRing l="Fat" v={macro.fat} max={macro.fat} color="#8E8E93" color2="#8E8E93" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
              <MacroRing l="Xơ" v={macro.fiber} max={macro.fiber} color="#34C759" color2="#34C759" track="rgba(255,255,255,0.18)" tc="#FFF" unit="g"/>
            </div>
          </div>

          {/* Breakdown */}
          <div style={{background:C.surface,borderRadius:10,padding:"10px 14px",marginBottom:12,border:`1.5px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.t3}}>BMR</span><span style={{fontWeight:800,color:C.t1}}>{macro.bmr} cal</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.t3}}>TDEE (×{macro.actMul})</span><span style={{fontWeight:800,color:C.t1}}>{macro.tdee} cal</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{color:C.t3}}>Calo ngày nghỉ</span><span style={{fontWeight:800,color:C.blue}}>{macro.calRest} cal</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,padding:"4px 0"}}>
              <span style={{color:C.t3}}>{macro.goal==="bulk"?"Surplus":macro.goal==="cut"?"Deficit":"Điều chỉnh"}</span>
              <span style={{fontWeight:800,color:macro.goal==="bulk"?C.green:macro.goal==="cut"?C.red:C.t1}}>
                {macro.goal==="bulk"?"+250":macro.goal==="cut"?"-350":"0"} cal
              </span>
            </div>
          </div>

          <div style={{padding:"8px 12px",background:C.goldBg,borderRadius:8,border:"1.5px solid #CA8A04",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:"#78350F"}}>💡 Bạn có thể thay đổi bất cứ lúc nào trong tab Hồ sơ</span>
          </div>

          <button onClick={()=>{
            setProfile({...p,onboardingDone:true});
            onComplete();
          }} style={{...redBtn,marginTop:16,background:"linear-gradient(135deg,#15803D,#166534)"}}>💾 Lưu & Vào Dashboard</button>
          {backBtn}
        </div>}
      </div>
    </div>
  </div>;
}

function AboutPage({appSettings,isAdmin,saveSetting,mob}){
  const about=(()=>{try{return appSettings.about_page?JSON.parse(appSettings.about_page):{}}catch(e){return{};}})();
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({
    appName:about.appName||"Fipilot AI",
    tagline:about.tagline||"Theo dõi dinh dưỡng thông minh cho người tập gym",
    version:about.version||"2.6",
    description:about.description||"Ứng dụng theo dõi bữa ăn và macro dinh dưỡng. Tính calo tự động từ kho 192 thực phẩm Việt Nam, hỗ trợ USDA API và AI (Claude, Gemini, GPT). Tính macro theo công thức Mifflin-St Jeor chuẩn ISSN.",
    devName:about.devName||"Việt Anh Seoer",
    devRole:about.devRole||"Founder & Developer",
    devBio:about.devBio||"Đam mê fitness và công nghệ. Xây dựng Fipilot AI để giúp cộng đồng gym Việt Nam theo dõi dinh dưỡng dễ dàng hơn.",
    devAvatar:about.devAvatar||"",
    contact:about.contact||"",
    facebook:about.facebook||"",
    hotline:about.hotline||"",
    zalo:about.zalo||"",
    features:about.features||"192 món VN verified|3 AI tích hợp|USDA database|Công thức ISSN",
  });

  const saveAbout=async()=>{
    await saveSetting("about_page",JSON.stringify(form));
    setEditing(false);
  };

  const features=(form.features||"").split("|").filter(Boolean);

  return <div>
    {/* Hero — White card giống Dashboard */}
    <div style={{...card,textAlign:"center",padding:mob?"20px 16px":"28px 24px",border:`1.5px solid ${C.border}`}}>
      <img src="/logo.png" alt="Fipilot AI" style={{width:96,height:96,borderRadius:20,objectFit:"cover"}}/>
      <div style={{fontSize:24,fontWeight:900,color:C.t1,marginTop:10,letterSpacing:"-0.02em"}}>{form.appName}</div>
      <div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:4}}>v{form.version}</div>
      <div style={{fontSize:14,fontWeight:600,color:C.t2,marginTop:6}}>{form.tagline}</div>
      {features.length>0&&<div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginTop:14}}>
        {features.map((f,i)=><span key={i} style={{fontSize:11,padding:"4px 12px",borderRadius:20,background:i%4===0?C.primaryBg:i%4===1?"#DCFCE7":i%4===2?"#EFF6FF":"#FEF3C7",color:i%4===0?"#007AFF":i%4===1?"#00C896":i%4===2?"#1E40AF":"#92400E",fontWeight:700}}>{f}</span>)}
      </div>}
    </div>

    {/* Mô tả */}
    <div style={{...card,marginTop:12}}>
      <div style={{fontSize:15,fontWeight:900,color:C.blue,marginBottom:8}}>📖 Về ứng dụng</div>
      <div style={{fontSize:13,fontWeight:500,color:C.t2,lineHeight:1.7}}>{form.description}</div>
    </div>

    {/* Developer */}
    <div style={{...card,marginTop:12}}>
      <div style={{fontSize:15,fontWeight:900,color:C.blue,marginBottom:12}}>👨‍💻 Đội ngũ phát triển</div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        {form.devAvatar?
          <img src={form.devAvatar} alt={form.devName} style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.primary}`,flexShrink:0}}/>:
          <div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:"2px solid #fff",boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>{form.devName?form.devName.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"VA"}</div>
        }
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:C.t1}}>{form.devName}</div>
          <div style={{fontSize:12,fontWeight:700,color:C.secondary,marginTop:2}}>{form.devRole}</div>
        </div>
      </div>
      <div style={{fontSize:13,fontWeight:600,color:C.t3,marginTop:10,lineHeight:1.6,padding:"10px 0",borderTop:`1px solid ${C.border}`}}>{form.devBio}</div>
      {(form.contact||form.facebook||form.hotline||form.zalo)&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {form.contact&&<a href={`mailto:${form.contact}`} target="_blank" rel="noopener" style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#EFF6FF",color:"#007AFF",textDecoration:"none",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Email</a>}
        {form.facebook&&<a href={form.facebook} target="_blank" rel="noopener" style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#EFF6FF",color:"#1877F2",textDecoration:"none",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook</a>}
        {form.hotline&&<a href={`tel:${form.hotline}`} style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#DCFCE7",color:"#007AFF",textDecoration:"none",border:"1px solid #BBF7D0",display:"flex",alignItems:"center",gap:4}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          {form.hotline}</a>}
        {form.zalo&&<a href={`https://zalo.me/${form.zalo.replace(/\s/g,"")}`} target="_blank" rel="noopener" style={{fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,background:"#EBF5FF",color:"#0068FF",textDecoration:"none",border:"1px solid #B3D9FF",display:"flex",alignItems:"center",gap:4}}>
          <svg width="16" height="16" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#0068FF"/><text x="24" y="26" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="18" fontWeight="900" fontFamily="Arial,sans-serif">Z</text></svg>
          Zalo</a>}
      </div>}
    </div>

    {/* Admin: Edit */}
    {isAdmin&&<div style={{...card,marginTop:12,border:`2px solid ${C.red}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:15,fontWeight:900,color:C.secondary}}>✏️ Chỉnh sửa trang giới thiệu</div>
        <button onClick={()=>setEditing(!editing)} style={{padding:"5px 12px",fontSize:12,fontWeight:700,borderRadius:8,border:`1.5px solid ${C.red}`,background:editing?C.red:"transparent",color:editing?"#fff":C.red,cursor:"pointer",fontFamily:"inherit"}}>{editing?"✕ Đóng":"✏️ Sửa"}</button>
      </div>
      {editing&&<div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div>
            <div style={{...lbl,marginBottom:4}}>Tên ứng dụng</div>
            <input value={form.appName} onChange={e=>setForm({...form,appName:e.target.value})} style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Version</div>
            <input value={form.version} onChange={e=>setForm({...form,version:e.target.value})} style={inp}/>
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Tagline</div>
          <input value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})} style={inp}/>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Mô tả</div>
          <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} style={{...inp,resize:"vertical"}}/>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Tính năng (ngăn cách bằng |)</div>
          <input value={form.features} onChange={e=>setForm({...form,features:e.target.value})} placeholder="192 món VN|3 AI|USDA" style={inp}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div>
            <div style={{...lbl,marginBottom:4}}>Tên developer</div>
            <input value={form.devName} onChange={e=>setForm({...form,devName:e.target.value})} style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Vai trò</div>
            <input value={form.devRole} onChange={e=>setForm({...form,devRole:e.target.value})} style={inp}/>
          </div>
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Avatar URL (link ảnh)</div>
          <input value={form.devAvatar} onChange={e=>setForm({...form,devAvatar:e.target.value})} placeholder="https://example.com/avatar.jpg" style={inp}/>
          {form.devAvatar&&<div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
            <img src={form.devAvatar} alt="Preview" style={{width:40,height:40,borderRadius:"50%",objectFit:"cover",border:`1.5px solid ${C.border}`}}/>
            <span style={{fontSize:11,color:C.t3}}>Preview</span>
          </div>}
        </div>
        <div style={{marginBottom:8}}>
          <div style={{...lbl,marginBottom:4}}>Bio</div>
          <textarea value={form.devBio} onChange={e=>setForm({...form,devBio:e.target.value})} rows={2} style={{...inp,resize:"vertical"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
          <div>
            <div style={{...lbl,marginBottom:4}}>Email</div>
            <input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="email@example.com" style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Facebook URL</div>
            <input value={form.facebook} onChange={e=>setForm({...form,facebook:e.target.value})} placeholder="https://fb.com/..." style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Hotline</div>
            <input value={form.hotline} onChange={e=>setForm({...form,hotline:e.target.value})} placeholder="0909 123 456" style={inp}/>
          </div>
          <div>
            <div style={{...lbl,marginBottom:4}}>Zalo (SĐT)</div>
            <input value={form.zalo} onChange={e=>setForm({...form,zalo:e.target.value})} placeholder="0909123456" style={inp}/>
          </div>
        </div>
        <button onClick={saveAbout} style={{...redBtn,background:"linear-gradient(135deg,#15803D,#166534)"}}>💾 Lưu thay đổi</button>
      </div>}
    </div>}
  </div>;
}

// === Notification Bell — shared by PC header + Mobile greeting ===
function NotiBell({appSettings,dark}){
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

function calcMacro(p){if(!p)p={cm:170,kg:65,birthYear:2001,goalKg:70,goalType:"bulk",months:6,gender:"male",exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard"};
  const gender=p.gender||"male";
  const exerciseType=p.exerciseType||"gym";
  const age=p.birthYear?new Date().getFullYear()-p.birthYear:(p.age||25);
  // BMR: Mifflin-St Jeor (khác theo giới tính)
  const bmrRaw=10*p.kg+6.25*p.cm-5*age+(gender==="male"?5:-161);
  // Châu Á: -10% (nghiên cứu cho thấy Mifflin-St Jeor cao hơn ~10% cho người châu Á)
  const asianFactor=(p.calorieMode||"standard")==="asian"?0.9:1;
  const bmr=Math.round(bmrRaw*asianFactor);
  // Activity multiplier — chuẩn quốc tế, 1 giá trị duy nhất
  const freqMap={occasional:1.375,regular:1.55,frequent:1.725,daily:1.9};
  // Migration: map activity cũ sang frequency mới
  const freqFromActivity=p.activity==="sedentary"?"occasional":p.activity==="moderate"?"regular":p.activity==="heavy"?"frequent":null;
  const freq=p.frequency||freqFromActivity||"regular";
  const actMul=exerciseType==="none"?1.2:(freqMap[freq]||1.55);
  const tdee=Math.round(bmr*actMul);
  const diff=Math.round((p.goalKg-p.kg)*10)/10;
  const goal=p.goalType||"bulk";
  // Block: none + bulk
  const effectiveGoal=(exerciseType==="none"&&goal==="bulk")?"maintain":goal;
  // === TRƯỜNG PHÁI 1.5 ===
  // P: giống nhau nam nữ (phụ thuộc mục tiêu, không phụ thuộc giới tính)
  // F: khác nhau nam nữ (nữ cần fat cao hơn cho hormone)
  // C: phần calo còn lại sau P và F
  const pTable={bulk:2.0,cut:2.2,maintain:1.8};
  const fTable={male:{bulk:1.1,cut:0.9,maintain:1.0},female:{bulk:1.2,cut:1.0,maintain:1.1}};
  // Surplus/deficit cố định theo mục tiêu (ISSN lean bulk)
  const calAdjustTable={bulk:250,cut:-350,maintain:0};
  const pRatioVal=pTable[effectiveGoal]||1.8;
  const fRatioVal=fTable[gender]?.[effectiveGoal]||0.9;
  let protein=Math.round(p.kg*pRatioVal);
  let fat=Math.round(p.kg*fRatioVal);
  // Fat floor: không dưới 0.7g/kg
  if(fat<Math.round(p.kg*0.7))fat=Math.round(p.kg*0.7);
  // Surplus/deficit
  const months=p.months||4;
  const totalDiff=Math.abs(diff);
  const perMonth=months>0?Math.round(totalDiff/months*10)/10:0;
  const perWeek=months>0?Math.round(totalDiff/(months*4.33)*10)/10:0;
  const calAdjust=calAdjustTable[effectiveGoal]||0;
  const calTarget=tdee+calAdjust;
  // C = phần calo còn lại (chế độ Cân bằng)
  const dietStrategy=(effectiveGoal==="cut")?(p.dietStrategy||"balanced"):"balanced";
  let carbBalanced=Math.round((calTarget-protein*4-fat*9)/4);
  if(carbBalanced<0)carbBalanced=0;
  // Carb floor: tối thiểu 2g/kg (cần cho tập luyện)
  const carbFloor=Math.round(p.kg*2);
  if(carbBalanced<carbFloor)carbBalanced=carbFloor;
  let carb=carbBalanced;
  // Diet strategy: low-carb / keto cap carb, fat = phần còn lại
  if(dietStrategy==="low_carb"){carb=Math.min(100,carbBalanced);fat=Math.round((calTarget-protein*4-carb*4)/9);}
  else if(dietStrategy==="keto"){carb=Math.min(50,carbBalanced);fat=Math.round((calTarget-protein*4-carb*4)/9);}
  // Fat floor sau diet adjustment
  if(fat<Math.round(p.kg*0.7))fat=Math.round(p.kg*0.7);
  // Ngày nghỉ: carb giảm 25%, fat giữ nguyên (option A)
  const carbRest=dietStrategy==="keto"?carb:Math.round(carb*0.75);
  const calFinal=protein*4+carb*4+fat*9;
  const calRest=protein*4+carbRest*4+fat*9;
  const fiber=Math.round(calFinal/1000*14);
  const bmi=Math.round((p.kg/(p.cm/100)**2)*10)/10;
  const safe=effectiveGoal==="bulk"?perWeek<=0.5:effectiveGoal==="cut"?perWeek<=0.75:true;
  const pRatio=pRatioVal+"g/kg";
  const cRatio=Math.round(carb/p.kg*10)/10+"g/kg";
  const fRatio=fRatioVal+"g/kg";
  return{tdee,calTarget:calFinal,calTargetRaw:calTarget,protein,fat,fiber,carb,carbRest,calRest,bmi,diff,perMonth,perWeek,months,safe,goal:effectiveGoal,fatPct:Math.round(fat*9/calFinal*100),actMul,bmr:Math.round(bmr),pRatio,cRatio,fRatio,dietStrategy};
}

const defaultProfile={cm:170,kg:65,birthYear:2001,goalKg:70,goalType:"bulk",months:6,gender:"male",exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard"};

export default function App(){
  const {user,loading,signOut}=useAuth();
  const [tab,setTab]=useState(()=>{try{return localStorage.getItem("fitpilot_tab")||"dashboard";}catch(e){return "dashboard";}});
  useEffect(()=>{try{localStorage.setItem("fitpilot_tab",tab);}catch(e){}},[tab]);
  const [pcShowWeightInput,setPcShowWeightInput]=useState(false);
  const pcWeightInputRef=useRef(null);
  const [pcWeightSaved,setPcWeightSaved]=useState(false);
  const [pcDayManual,setPcDayManual]=useState(null);
  const {profile,setProfile,loading:profileLoading}=useProfile(user?.id);
  const {weightLog,addWeight,deleteWeight,resetWeights,setWeightLog,loading:weightLoading}=useWeightLog(user?.id);
  const {loaded:userDataLoaded,meals:cloudMeals,getMeals,getMealHistory,foodCache,saveMealToCloud,saveFoodCache,deleteFoodCache,weeklyTemplates,saveWeeklyTemplate,deleteWeeklyTemplate,getWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,refreshDefaultTemplates,applyTemplate,saveDailyLog,getDailyLogs,getDailyLog}=useUserData(user?.id);
  const {settings:appSettings,isAdmin,saveSetting}=useAppSettings(user?.id);
  const macro=calcMacro(profile||defaultProfile);
  const [macroBanner,setMacroBanner]=useState(null);
  const prevCalRef=useRef(null);
  const [profileUserEdited,setProfileUserEdited]=useState(false);
  const origSetProfile=setProfile;
  const wrappedSetProfile=useCallback((p)=>{setProfileUserEdited(true);origSetProfile(p);},[origSetProfile]);
  useEffect(()=>{
    if(!macro||!macro.calTarget)return;
    if(prevCalRef.current!==null&&profileUserEdited&&Math.abs(macro.calTarget-prevCalRef.current)>10){
      setMacroBanner({prev:prevCalRef.current,now:macro.calTarget,diff:macro.calTarget-prevCalRef.current});
      setProfileUserEdited(false);
      setTimeout(()=>setMacroBanner(null),5000);
    }
    prevCalRef.current=macro.calTarget;
  },[macro?.calTarget,profileUserEdited]);
  const mob=useIsMobile();
  // Auto-detect PC day type from gym schedule (computed, not state)
  const pcDayAuto=(()=>{
    if(!appSettings||!profile)return"train";
    const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
    const todayIdx=new Date().getDay();
    const mappedIdx=todayIdx===0?6:todayIdx-1;
    return gd.includes(mappedIdx)?"train":"rest";
  })();
  const pcDayType=pcDayManual||pcDayAuto;

  if(loading||profileLoading||!profile) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Inter,sans-serif",fontSize:16,color:"#666"}}>⏳ Đang tải...</div>;
  if(!user) return <LoginScreen onLogin={()=>window.location.reload()}/>;

  // Onboarding: chỉ hiện cho user mới chưa có data thật (chờ data load xong)
  const needsOnboarding=userDataLoaded && !profileLoading && !profile.onboardingDone && (!weightLog || weightLog.length===0);
  if(needsOnboarding) return <OnboardingWizard profile={profile} setProfile={wrappedSetProfile} onComplete={()=>setTab("dashboard")}/>;

  // === PC DATA COMPUTATION ===
  const pcMC=(()=>{try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
  const pcVis=pcMC[pcDayType]||DEFAULT_MEAL_CONFIG[pcDayType];
  const pcMeals=getMeals(pcDayType).filter(m=>pcVis.includes(m.id));
  const pcTot=pcMeals.reduce((a,m)=>{const t=m.items.reduce((s,i)=>({p:s.p+(i.p||0),c:s.c+(i.c||0),f:s.f+(i.f||0),fiber:s.fiber+(i.fiber||0),cal:s.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});return{p:a.p+t.p,c:a.c+t.c,f:a.f+t.f,fiber:a.fiber+t.fiber,cal:a.cal+t.cal};},{p:0,c:0,f:0,fiber:0,cal:0});
  const pcHP=macro.protein,pcHF=macro.fat,pcHFib=macro.fiber,pcHC=pcDayType==="train"?macro.carb:macro.carbRest,pcHCal=pcDayType==="train"?macro.calTarget:macro.calRest;
  const pcGK=profile.goalKg,pcSK=weightLog.length>0?weightLog[0].kg:profile.kg,pcCK=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg;
  const pcWP=pcGK!==pcSK?((pcCK-pcSK)/(pcGK-pcSK))*100:0;
  const pcAC=Math.round(pcTot.cal),pcAP=Math.round(pcTot.p),pcACb=Math.round(pcTot.c),pcAF=Math.round(pcTot.f),pcAFib=Math.round(pcTot.fiber);
  const pcCR=pcHCal-pcAC,pcDN=user?.user_metadata?.username||user?.email?.split("@")[0]||"bạn";
  const pcET=profile.exerciseType||"gym",pcEL=pcET==="gym"?"Gym":pcET==="gym_cardio"?"Gym+Cardio":pcET==="cardio"?"Cardio":"Nghỉ ngơi";
  const pcCS=pcAC===0?0:pcAC>=pcHCal*0.95&&pcAC<=pcHCal*1.1?100:pcAC>=pcHCal*0.85?85:70;
  const pcPS=pcAP===0?0:pcAP>=pcHP*0.9?100:pcAP>=pcHP*0.8?85:70;
  const pcMS=pcAC===0?0:Math.round((pcCS+pcPS+85+85)/4);
  const pcMSL=pcMS>=90?"Rất phù hợp với mục tiêu":pcMS>=75?"Khá tốt, cần bổ sung thêm":"Cần điều chỉnh thêm";
  const pcNavI=(id,a)=>{const c=a?"#007AFF":"#64748B";return{dashboard:<svg viewBox="0 0 96 96" width={20} height={20}><rect x="6" y="6" width="38" height="38" rx="10" fill={c}/><rect x="52" y="6" width="38" height="38" rx="10" fill={c}/><rect x="6" y="50" width="38" height="32" rx="10" fill={c}/><rect x="52" y="50" width="38" height="32" rx="10" fill={c}/><rect x="6" y="86" width="84" height="8" rx="4" fill={c}/></svg>,profile:<svg viewBox="0 0 96 96" width={20} height={20}><circle cx="48" cy="30" r="24" fill={c}/><path d="M4 96 C4 60 92 60 92 96 Z" fill={c}/></svg>,meals:<svg viewBox="0 0 96 96" width={20} height={20}><rect x="6" y="6" width="84" height="84" rx="14" fill={c}/><circle cx="22" cy="30" r="6" fill="white" opacity="0.9"/><rect x="36" y="25" width="46" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="52" r="6" fill="white" opacity="0.9"/><rect x="36" y="47" width="36" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="74" r="6" fill="white" opacity="0.9"/><rect x="36" y="69" width="40" height="10" rx="5" fill="white" opacity="0.9"/></svg>,report:<svg viewBox="0 0 96 96" width={20} height={20}><rect x="8" y="56" width="22" height="32" rx="5" fill={c}/><rect x="37" y="36" width="22" height="52" rx="5" fill={c}/><rect x="66" y="16" width="22" height="72" rx="5" fill={c}/><rect x="4" y="90" width="88" height="6" rx="3" fill={c}/></svg>,weight:<svg viewBox="0 0 96 96" width={20} height={20}><rect x="8" y="78" width="80" height="10" rx="5" fill={c}/><rect x="44" y="28" width="8" height="52" rx="4" fill={c}/><rect x="12" y="24" width="72" height="8" rx="4" fill={c}/><rect x="22" y="24" width="4" height="18" rx="2" fill={c}/><rect x="70" y="24" width="4" height="18" rx="2" fill={c}/><rect x="10" y="40" width="28" height="8" rx="4" fill={c}/><rect x="58" y="40" width="28" height="8" rx="4" fill={c}/><circle cx="48" cy="16" r="8" fill={c}/></svg>,settings:<svg viewBox="0 0 96 96" width={20} height={20}><path d="M44 4 L52 4 L54 14 C57 15 60 17 63 19 L72 14 L78 20 L73 29 C75 32 77 35 78 38 L88 40 L88 48 L78 50 C77 53 75 56 73 59 L78 68 L72 74 L63 69 C60 71 57 73 54 74 L52 84 L44 84 L42 74 C39 73 36 71 33 69 L24 74 L18 68 L23 59 C21 56 19 53 18 50 L8 48 L8 40 L18 38 C19 35 21 32 23 29 L18 20 L24 14 L33 19 C36 17 39 15 42 14 Z" fill={c}/><circle cx="48" cy="44" r="15" fill="white" opacity="0.92"/><circle cx="48" cy="44" r="8" fill={c}/></svg>}[id]||null;};
  const pcDt=new Date(),pcDS=`${["CN","T2","T3","T4","T5","T6","T7"][pcDt.getDay()]}, ${String(pcDt.getDate()).padStart(2,"0")}/${String(pcDt.getMonth()+1).padStart(2,"0")}/${pcDt.getFullYear()}`;
  const adminP={weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile:wrappedSetProfile,macro,saveMealToCloud,saveFoodCache,deleteFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting,weeklyTemplates,saveWeeklyTemplate,getWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,applyTemplate,refreshDefaultTemplates};

  // ========== MOBILE ==========
  if(mob) return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",padding:"0 10px 10px 10px",maxWidth:700,margin:"0 auto",overflowX:"hidden",width:"100%",boxSizing:"border-box"}}>
    <div style={{paddingTop:"calc(env(safe-area-inset-top, 8px) + 8px)",paddingBottom:100}}>
    {tab==="dashboard"&&<Dashboard weightLog={weightLog} addWeight={addWeight} profile={profile} setProfile={wrappedSetProfile} macro={macro} getMeals={getMeals} appSettings={appSettings} setTab={setTab} user={user} getWeeklyTemplate={getWeeklyTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates} userDataLoaded={userDataLoaded} macroBanner={macroBanner}/>}
    {tab==="weight"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings" initialSection="weight" weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates}/>}
    {tab==="meals"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="meals" weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates}/>}
    {tab==="report"&&<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={mob}/>}
    {tab==="settings"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings" signOut={signOut} user={user} weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates}/>}
    <svg width="0" height="0" style={{position:"absolute"}}><defs><linearGradient id="navG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs></svg>
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:99,background:"rgba(255,255,255,0.97)",borderTop:"0.5px solid rgba(0,0,0,0.12)",display:"flex",paddingTop:6,paddingBottom:"max(18px, env(safe-area-inset-bottom, 18px))"}}>
      {[{id:"dashboard",label:"Tổng quan",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="6" y="6" width="38" height="38" rx="10" fill={c}/><rect x="52" y="6" width="38" height="38" rx="10" fill={c}/><rect x="6" y="50" width="38" height="32" rx="10" fill={c}/><rect x="52" y="50" width="38" height="32" rx="10" fill={c}/><rect x="6" y="86" width="84" height="8" rx="4" fill={c}/></svg>},{id:"meals",label:"Bữa ăn",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="6" y="6" width="84" height="84" rx="14" fill={c}/><circle cx="22" cy="30" r="6" fill="white" opacity="0.9"/><rect x="36" y="25" width="46" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="52" r="6" fill="white" opacity="0.9"/><rect x="36" y="47" width="36" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="74" r="6" fill="white" opacity="0.9"/><rect x="36" y="69" width="40" height="10" rx="5" fill="white" opacity="0.9"/></svg>},{id:"weight",label:"Cân nặng",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="8" y="78" width="80" height="10" rx="5" fill={c}/><rect x="44" y="28" width="8" height="52" rx="4" fill={c}/><rect x="12" y="24" width="72" height="8" rx="4" fill={c}/><rect x="22" y="24" width="4" height="18" rx="2" fill={c}/><rect x="70" y="24" width="4" height="18" rx="2" fill={c}/><rect x="10" y="40" width="28" height="8" rx="4" fill={c}/><rect x="58" y="40" width="28" height="8" rx="4" fill={c}/><circle cx="48" cy="16" r="8" fill={c}/></svg>},{id:"report",label:"Báo cáo",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="8" y="56" width="22" height="32" rx="5" fill={c}/><rect x="37" y="36" width="22" height="52" rx="5" fill={c}/><rect x="66" y="16" width="22" height="72" rx="5" fill={c}/><rect x="4" y="90" width="88" height="6" rx="3" fill={c}/></svg>},{id:"settings",label:"Cài đặt",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><path d="M44 4 L52 4 L54 14 C57 15 60 17 63 19 L72 14 L78 20 L73 29 C75 32 77 35 78 38 L88 40 L88 48 L78 50 C77 53 75 56 73 59 L78 68 L72 74 L63 69 C60 71 57 73 54 74 L52 84 L44 84 L42 74 C39 73 36 71 33 69 L24 74 L18 68 L23 59 C21 56 19 53 18 50 L8 48 L8 40 L18 38 C19 35 21 32 23 29 L18 20 L24 14 L33 19 C36 17 39 15 42 14 Z" fill={c}/><circle cx="48" cy="44" r="15" fill="white" opacity="0.92"/><circle cx="48" cy="44" r="8" fill={c}/></svg>}].map(t=>{const a=tab===t.id;return <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"6px 0"}}>{t.svg(a?"url(#navG)":"#A0A0A0")}<span style={{fontSize:10,fontWeight:a?700:500,color:a?"#007AFF":"#8E8E93"}}>{t.label}</span></div>;})}
    </div>
    </div>
  </div>;

  // ========== PC LAYOUT ==========
  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",display:"flex",minHeight:"100vh",background:C.bg,color:C.t1}}>
    {/* SIDEBAR */}
    <nav style={{width:220,background:"#fff",borderRight:`1px solid ${C.border}`,position:"fixed",top:0,left:0,bottom:0,zIndex:10,display:"flex",flexDirection:"column",padding:"20px 0",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 20px",marginBottom:24}}><AppLogo size={40} radius={12}/><div><div style={{fontWeight:800,fontSize:15,color:C.t1}}>FitPilotAI</div><div style={{fontSize:10,color:C.primary,fontWeight:600,letterSpacing:"0.3px",marginTop:1}}>AI Nutrition Coach</div></div></div>
      <div style={{fontSize:10,fontWeight:700,color:"#64748B",padding:"0 20px",margin:"16px 0 6px",letterSpacing:"0.8px"}}>MENU</div>
      {[{id:"dashboard",l:"Tổng quan",ic:"dashboard"},{id:"meals",l:"Bữa ăn",ic:"meals"},{id:"weight",l:"Cân nặng",ic:"weight"},{id:"report",l:"Báo cáo",ic:"report"}].map(s=><div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:tab===s.id?700:500,color:tab===s.id?C.primary:C.t2,background:tab===s.id?"rgba(0,122,255,0.06)":"transparent",borderLeft:tab===s.id?`3px solid ${C.primary}`:"3px solid transparent"}}>{pcNavI(s.ic,tab===s.id)} {s.l}</div>)}
      <div style={{fontSize:10,fontWeight:700,color:"#64748B",padding:"0 20px",margin:"16px 0 6px",letterSpacing:"0.8px"}}>CÀI ĐẶT</div>
      {[{id:"profile_s",l:"Hồ sơ",svg:(a)=><svg viewBox="0 0 96 96" width={20} height={20}><defs><linearGradient id="sip" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><circle cx="48" cy="30" r="22" fill="url(#sip)"/><path d="M8 90 C8 62 88 62 88 90 Z" fill="url(#sip)"/></svg>},
        {id:"ai",l:"Kết nối AI",svg:(a)=><svg viewBox="0 0 96 96" width={20} height={20}><defs><linearGradient id="si1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><rect x="28" y="28" width="40" height="40" rx="8" fill="url(#si1)"/><rect x="36" y="36" width="24" height="24" rx="4" fill="white" opacity="0.2"/><rect x="14" y="36" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="14" y="46" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="14" y="56" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="68" y="36" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="68" y="46" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="68" y="56" width="14" height="5" rx="2.5" fill="url(#si1)"/><rect x="36" y="14" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="46" y="14" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="56" y="14" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="36" y="68" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="46" y="68" width="5" height="14" rx="2.5" fill="url(#si1)"/><rect x="56" y="68" width="5" height="14" rx="2.5" fill="url(#si1)"/></svg>},
        {id:"about",l:"Giới thiệu",svg:(a)=><svg viewBox="0 0 96 96" width={20} height={20}><defs><linearGradient id="si4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#si4)"/><rect x="44" y="42" width="8" height="28" rx="4" fill="white"/><circle cx="48" cy="30" r="6" fill="white"/></svg>},
        {id:"account",l:"Tài khoản",svg:(a)=><svg viewBox="0 0 96 96" width={20} height={20}><defs><linearGradient id="si5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="100%" stopColor={a?"#0050FF":"#64748B"}/></linearGradient></defs><rect x="4" y="16" width="88" height="64" rx="12" fill="url(#si5)"/><circle cx="28" cy="42" r="16" fill="white" opacity="0.95"/><circle cx="28" cy="37" r="7" fill="url(#si5)"/><path d="M14 54 C14 46 42 46 42 54" fill="url(#si5)"/><rect x="52" y="34" width="32" height="7" rx="3.5" fill="white" opacity="0.9"/><rect x="52" y="46" width="24" height="6" rx="3" fill="white" opacity="0.5"/><rect x="52" y="57" width="18" height="5" rx="2.5" fill="white" opacity="0.3"/></svg>}
      ].map(s=>{const a=tab===s.id;return <div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:a?700:500,color:a?C.primary:C.t2,background:a?"rgba(0,122,255,0.06)":"transparent",borderLeft:a?`3px solid ${C.primary}`:"3px solid transparent"}}>{s.svg(a)} {s.l}</div>;})}
      {isAdmin&&<><div style={{fontSize:10,fontWeight:700,color:"#EF4444",padding:"0 20px",margin:"16px 0 6px",letterSpacing:"0.8px"}}>QUẢN TRỊ</div>{[
        {id:"admin_s",l:"Quản trị",svg:(a)=><svg viewBox="0 0 96 96" width={20} height={20}><defs><linearGradient id="qi1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="4" y="10" width="88" height="76" rx="14" fill="url(#qi1)"/><rect x="4" y="10" width="88" height="24" rx="14" fill="white" opacity="0.12"/><circle cx="22" cy="22" r="5" fill="white" opacity="0.6"/><circle cx="36" cy="22" r="5" fill="white" opacity="0.4"/><circle cx="50" cy="22" r="5" fill="white" opacity="0.25"/><polyline points="18,52 32,62 18,72" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><rect x="38" y="67" width="40" height="7" rx="3.5" fill="white" opacity="0.65"/></svg>},
        {id:"templates_s",l:"Kho mẫu",svg:(a)=><svg viewBox="0 0 96 96" width={20} height={20}><defs><linearGradient id="qi2" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor={a?"#40C8FF":"#64748B"}/><stop offset="55%" stopColor={a?"#0050FF":"#64748B"}/><stop offset="100%" stopColor={a?"#DC2626":"#64748B"}/></linearGradient></defs><rect x="12" y="70" width="72" height="16" rx="8" fill="url(#qi2)" opacity="0.45"/><rect x="16" y="52" width="64" height="16" rx="8" fill="url(#qi2)" opacity="0.7"/><rect x="20" y="34" width="56" height="16" rx="8" fill="url(#qi2)"/><rect x="28" y="34" width="6" height="16" rx="3" fill="white" opacity="0.3"/><rect x="32" y="52" width="6" height="16" rx="3" fill="white" opacity="0.3"/><polygon points="48,6 51,18 64,18 54,25 58,37 48,30 38,37 42,25 32,18 45,18" fill="url(#qi2)"/></svg>}
      ].map(s=>{const a=tab===s.id;return <div key={s.id} onClick={()=>setTab(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",cursor:"pointer",fontSize:14,fontWeight:a?700:500,color:a?C.primary:C.t2,background:a?"rgba(0,122,255,0.06)":"transparent",borderLeft:a?`3px solid ${C.primary}`:"3px solid transparent"}}>{s.svg(a)} {s.l}</div>;})}
</>}
      <div style={{marginTop:"auto",padding:"0 20px",borderTop:`1px solid ${C.border}`,paddingTop:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><UserAvatar gender={profile?.gender} size={36}/><div><div style={{fontSize:13,fontWeight:700,color:C.t1}}>{user.user_metadata?.username||user.email}</div><div style={{fontSize:10,color:C.t2}}>{pcEL} · {({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất thường xuyên",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn"}</div></div></div>
        <div onClick={signOut} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#EF4444",fontWeight:600,marginTop:12,cursor:"pointer",padding:"8px 4px",borderTop:`1px solid ${C.border}`}}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#EF4444" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Đăng xuất
        </div>
      </div>
    </nav>
    {/* MAIN AREA */}
    <div style={{marginLeft:220,flex:1,display:"flex",flexDirection:"column"}}>
      <header style={{height:68,display:"flex",alignItems:"center",padding:"0 28px",background:"#fff",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:5}}>
        <div style={{flex:1}}><div style={{fontSize:20,fontWeight:800,color:C.t1}}>Xin chào, {pcDN} 👋</div><div style={{fontSize:12,color:C.t2,marginTop:2}}>{pcDS}</div></div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {tab!=="meals"&&<div style={{display:"flex",borderRadius:10,overflow:"hidden",border:`1.5px solid ${C.border}`}}><div onClick={()=>setPcDayManual("train")} style={{padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",background:pcDayType==="train"?C.primary:"#fff",color:pcDayType==="train"?"#fff":C.t2}}>🏋️ Ngày tập</div><div onClick={()=>setPcDayManual("rest")} style={{padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer",background:pcDayType==="rest"?C.primary:"#fff",color:pcDayType==="rest"?"#fff":C.t2}}>😴 Ngày nghỉ</div></div>}
          <NotiBell appSettings={appSettings}/>
          <button style={{padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>✨ AI Coach</button>
        </div>
      </header>
      <main style={{padding:tab==="account"?"24px 100px":24,flex:1}}>
        {tab==="dashboard"&&<div>
          {/* HERO */}
          <div style={{...card,padding:"28px 32px",borderRadius:20,display:"flex",alignItems:"center",marginBottom:24,border:`1.5px solid ${C.border}`,flexWrap:"wrap"}}>
            {macroBanner&&<div style={{width:"100%",background:"#DCFCE7",border:"1.5px solid #86EFAC",borderRadius:10,padding:"8px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>🔄</span>
              <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>Macro đã cập nhật: {macroBanner.prev.toLocaleString()} → {macroBanner.now.toLocaleString()} cal ({macroBanner.diff>0?"+":""}{macroBanner.diff} cal)</span>
            </div>}
            <div style={{flex:"0 0 40%"}}><div style={{fontSize:12,fontWeight:700,color:"#64748B",letterSpacing:"0.5px",textTransform:"uppercase",marginBottom:8}}>{pcDayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div><div style={{fontSize:48,fontWeight:900,color:C.t1,letterSpacing:"-2px",lineHeight:1}}>{pcAC>0?pcAC.toLocaleString():pcHCal.toLocaleString()} <span style={{fontSize:17,fontWeight:600,color:"#64748B"}}> / {pcHCal.toLocaleString()} kcal</span></div>{((profile.calorieMode||"standard")==="asian"||((profile.goalType==="cut")&&(profile.dietStrategy||"balanced")!=="balanced"))&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8,alignItems:"center"}}>{(profile.calorieMode||"standard")==="asian"&&<span style={{fontSize:13,fontWeight:700,color:"#007AFF",padding:"4px 12px",background:"rgba(0,122,255,0.08)",borderRadius:8,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🇻🇳 Calo chuẩn Việt Nam</span>}{profile.goalType==="cut"&&(profile.dietStrategy||"balanced")!=="balanced"&&<span style={{fontSize:13,fontWeight:700,color:(profile.dietStrategy==="keto"?"#991B1B":"#92400E"),padding:"4px 12px",background:(profile.dietStrategy==="keto"?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)"),borderRadius:8,display:"inline-flex",alignItems:"center",gap:4,lineHeight:1}}>🥗 {profile.dietStrategy==="keto"?"Keto":"Low-carb"}</span>}</div>}{pcAC>0&&<div style={{marginTop:10,fontSize:14,fontWeight:700,color:(()=>{const pp=pcHCal>0?Math.round(pcAC/pcHCal*100):0;return pp<95?"#B45309":pp<=105?"#16A34A":"#DC2626";})()}}>{(()=>{const pp=pcHCal>0?Math.round(pcAC/pcHCal*100):0;return pp<95?`⚠️ Còn thiếu ${pcCR} kcal`:pp<=105?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${Math.abs(pcCR)} kcal`;})()}</div>}<div style={{display:"flex",alignItems:"center",gap:10,marginTop:14,maxWidth:320}}><div style={{flex:1,height:10,background:C.border,borderRadius:5}}><div style={{height:10,background:"linear-gradient(90deg,#36A3FF,#007AFF)",borderRadius:5,width:`${Math.min(pcAC>0?(pcAC/pcHCal)*100:0,120)}%`,transition:"width 0.4s"}}/></div></div></div>
            <div style={{flex:"0 0 60%",display:"flex",justifyContent:"center",gap:24}}><MacroRing size={110} l="Protein" v={pcAP>0?pcAP:pcHP} max={pcHP} color="#007AFF" color2="#007AFF" sub={pcAP>0?`/${pcHP}g`:null} unit="g"/><MacroRing size={110} l="Carb" v={pcACb>0?pcACb:pcHC} max={pcHC} color="#5AC8FA" color2="#5AC8FA" sub={pcACb>0?`/${pcHC}g`:null} unit="g"/><MacroRing size={110} l="Fat" v={pcAF>0?pcAF:pcHF} max={pcHF} color="#8E8E93" color2="#8E8E93" sub={pcAF>0?`/${pcHF}g`:null} unit="g"/><MacroRing size={110} l="Xơ" v={pcAFib>0?pcAFib:pcHFib} max={pcHFib} color="#34C759" color2="#34C759" sub={pcAFib>0?`/${pcHFib}g`:null} unit="g"/></div>
          </div>
          {/* STATS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>{[{l:"Chiều cao",v:profile.cm,u:"cm",icon:"stat_height"},{l:"Cân nặng",v:pcCK,u:"kg",icon:"stat_weight",d:pcCK!==pcSK?`${pcCK>pcSK?"+":""}${Math.round((pcCK-pcSK)*10)/10} kg`:null},{l:"BMI",v:macro.bmi,u:macro.bmi<18.5?"Gầy":macro.bmi<25?"Bình thường":"Thừa cân",icon:"stat_bmi"},{l:pcEL,v:pcET==="none"?"—":({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất chăm",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn",u:"",icon:pcET==="gym"?"stat_gym":pcET==="gym_cardio"?"ex_gym_cardio":pcET==="cardio"?"ex_cardio":"ex_none"}].map((s,i)=><div key={i} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:16,display:"flex",alignItems:"center",gap:12,height:100}}><div style={{width:44,height:44,borderRadius:12,background:"rgba(0,122,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><img src={`/icons/${s.icon}.png`} alt="" style={{width:34,height:34,objectFit:"contain"}}/></div><div><div style={{fontSize:13,color:C.t2,fontWeight:600}}>{s.l}</div><div style={{fontSize:22,fontWeight:800,color:C.t1}}>{s.v} <span style={{fontSize:13,color:C.t2}}>{s.u}</span></div>{s.d&&<div style={{fontSize:12,fontWeight:700,color:C.primary,marginTop:1}}>{s.d}</div>}</div></div>)}</div>
          {/* 2 COLUMNS */}
          <div style={{display:"grid",gridTemplateColumns:"55fr 45fr",gap:24}}>
            <div style={{...card,padding:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:15,fontWeight:800,color:C.t1}}>Danh sách thực đơn</span><span onClick={()=>setTab("meals")} style={{fontSize:12,color:C.primary,fontWeight:700,cursor:"pointer"}}>Xem tất cả →</span></div>
              {pcMeals.map(m=><MealCard key={m.id} meal={m}/>)}
              {pcMeals.every(m=>!m.items||m.items.length===0)&&<div style={{textAlign:"center",padding:20,color:C.t3,fontSize:13}}>🍽️ Chưa có bữa ăn — <span onClick={()=>setTab("meals")} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>Nhập bữa ăn</span></div>}
              {pcAC>0&&<div style={{background:"rgba(52,199,89,0.04)",border:"1.5px solid rgba(52,199,89,0.15)",borderRadius:12,padding:"16px 18px",marginTop:12,display:"flex",alignItems:"center",gap:16}}>
                <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:14}}>🎯</span><span style={{fontSize:12,color:"#059669",fontWeight:600}}>Đánh giá dinh dưỡng</span></div><div style={{fontSize:34,fontWeight:900,color:"#059669",lineHeight:1}}>{pcMS}<span style={{fontSize:15,color:"#64748B",fontWeight:600}}> /100</span></div></div>
                <div style={{flex:1,borderLeft:"1.5px solid rgba(52,199,89,0.15)",paddingLeft:16}}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>{pcMSL}</div><div style={{fontSize:12,color:C.t2,marginTop:3,lineHeight:1.5}}>{pcMS>=90?"Cân đối dinh dưỡng, đủ năng lượng cho buổi tập hiệu quả.":pcMS>=75?`Bổ sung thêm ${pcCR>0?pcCR+" kcal":"protein"} để đạt mục tiêu.`:"Điều chỉnh thực đơn để phù hợp mục tiêu."}</div></div>
              </div>}
            </div>
            <div>
              <div style={{...card,padding:20,marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><span style={{fontSize:16,fontWeight:800,color:C.t1}}>Theo dõi cân nặng</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13,color:C.t2,fontWeight:600}}>🎯 {pcGK} kg</span><button onClick={()=>setPcShowWeightInput(!pcShowWeightInput)} style={{width:24,height:24,borderRadius:6,background:"transparent",color:C.secondary,border:`1px solid ${C.secondary}`,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>{pcShowWeightInput?"✕":"+"}</button></div></div>
                {pcShowWeightInput&&<div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1.5px solid ${C.border}`}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:4}}>⚡ Nhập nhanh cân nặng</div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input ref={pcWeightInputRef} type="text" inputMode="decimal" placeholder={`VD: ${(pcCK+0.3).toFixed(1)}`} style={{flex:1,height:40,fontSize:15,padding:"8px 12px",border:`1.5px solid ${C.border}`,borderRadius:10,fontFamily:"inherit",outline:"none"}}/>
                    <button onClick={async()=>{const val=parseFloat((pcWeightInputRef.current?.value||"").replace(",","."));if(!val||val<30||val>200)return;await addWeight(val);setProfile({...profile,kg:val});if(pcWeightInputRef.current)pcWeightInputRef.current.value="";setPcShowWeightInput(false);setPcWeightSaved(true);setTimeout(()=>setPcWeightSaved(false),3000);}} style={{padding:"10px 16px",fontSize:13,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#15803D,#166534)",color:"#fff",cursor:"pointer",fontFamily:"inherit",height:40}}>💾 Lưu</button>
                  </div>
                </div>}
                {pcWeightSaved&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginBottom:10}}><span style={{fontSize:12,fontWeight:800,color:"#14532D"}}>✓ Đã lưu cân nặng!</span></div>}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>{[{l:"Xuất phát",v:pcSK,c:C.t1},{l:"Hiện tại",v:pcCK,c:C.primary},{l:"Mục tiêu",v:pcGK,c:C.t1},{l:"Tiến độ",v:Math.round(Math.max(0,Math.min(pcWP,100)))+"%",c:C.primary}].map((w,i)=><div key={i} style={{textAlign:"center",padding:"10px 6px",background:C.surface,borderRadius:10}}><div style={{fontSize:11,color:C.t2,fontWeight:600}}>{w.l}</div><div style={{fontSize:22,fontWeight:800,color:w.c}}>{w.v}</div>{typeof w.v==="number"&&<div style={{fontSize:11,color:C.t2}}>kg</div>}</div>)}</div>
                <div style={{fontSize:13,fontWeight:700,display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{color:C.t1}}>Đã {pcCK>=pcSK?"tăng":"giảm"} {Math.abs(Math.round((pcCK-pcSK)*10)/10)} kg</span><span style={{color:C.primary,fontWeight:800}}>{Math.round(Math.max(0,Math.min(pcWP,100)))}%</span></div>
                <div style={{height:8,background:C.surface,borderRadius:4}}><div style={{height:8,borderRadius:4,background:"linear-gradient(90deg,#36A3FF,#007AFF)",width:`${Math.max(0,Math.min(pcWP,100))}%`}}/></div>
                {weightLog.length>=2&&<div style={{marginTop:12}}><WeightBarChart weightLog={weightLog} goalKg={pcGK} goalType={profile.goalType} startKg={pcSK} mob={false}/></div>}
              </div>
              <div style={{...card,padding:18,maxHeight:360,overflowY:"auto"}}><ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={false}/></div>
            </div>
          </div>
          {pcAC>0&&pcCR>0&&<div style={{...card,padding:"18px 24px",marginTop:20,display:"flex",alignItems:"center",gap:16}}>
            <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#1E3A5F,#2D5A8E)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:24}}>🤖</div>
            <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>AI Coach gợi ý cho bạn</div><div style={{fontSize:12,color:C.t2,marginTop:3}}>Hôm nay bạn đang thiếu <b style={{color:"#D97706"}}>{Math.round(Math.max(0,pcHC-pcACb))}g Carb</b> để đạt mục tiêu.</div></div>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{fontSize:12,color:C.t2,fontWeight:600,lineHeight:1.3}}>Gợi ý<br/>bổ sung:</div>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"10px 14px",background:C.surface,borderRadius:12}}><span style={{fontSize:22,marginRight:4}}>🍌</span><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>1 quả chuối</div><div style={{fontSize:10,color:C.t2}}>~ 27g Carb · 105 kcal</div></div></div>
              <span style={{color:"#CBD5E1",fontSize:16,fontWeight:300}}>+</span>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"10px 14px",background:C.surface,borderRadius:12}}><span style={{fontSize:22,marginRight:4}}>🍠</span><div><div style={{fontSize:12,fontWeight:700,color:C.t1}}>150g khoai lang</div><div style={{fontSize:10,color:C.t2}}>~ 28g Carb · 129 kcal</div></div></div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}><button onClick={()=>setTab("meals")} style={{padding:"10px 22px",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",whiteSpace:"nowrap"}}>Áp dụng gợi ý</button><button onClick={()=>setTab("meals")} style={{padding:"6px 16px",borderRadius:8,background:"#fff",border:`1px solid ${C.border}`,fontSize:11,color:C.t2,cursor:"pointer",whiteSpace:"nowrap"}}>Xem thêm gợi ý khác</button></div>
            </div>
          </div>}
        </div>}
        {tab==="profile_s"&&<AdminPanel {...adminP} forcedSection="profile" hidePills/>}
        {tab==="meals"&&<AdminPanel {...adminP} forcedSection="meals" hidePills/>}
        {tab==="report"&&<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={false}/>}
        {tab==="settings"&&<AdminPanel {...adminP} forcedSection="settings" signOut={signOut} user={user}/>}
        {tab==="about"&&<AboutPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={false}/>}
        {tab==="ai"&&<AdminPanel key="ai" {...adminP} forcedSection="settings" initialSection="ai" hidePills/>}
        {tab==="schedule"&&<AdminPanel key="sch" {...adminP} forcedSection="profile" initialSection="schedule" hidePills/>}
        {tab==="weight"&&<AdminPanel key="wt" {...adminP} forcedSection="settings" initialSection="weight" hidePills/>}
        {tab==="account"&&<AdminPanel key="acc" {...adminP} forcedSection="settings" initialSection="account" signOut={signOut} user={user} hidePills/>}
        {tab==="admin_s"&&<AdminPanel key="adm" {...adminP} forcedSection="settings" initialSection="admin" hidePills/>}
        {tab==="templates_s"&&<AdminPanel key="tpl" {...adminP} forcedSection="settings" initialSection="templates" hidePills/>}
      </main>
    </div>
  </div>;

}
