import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useWeightLog } from "./hooks/useWeightLog";
import { useUserData } from "./hooks/useUserData";
import { useAppSettings } from "./hooks/useAppSettings";
import { calcMacroAIDirect } from "./lib/aiService";
import { searchUSDA, calcFromUSDA, translateFood, estimateGram } from "./lib/usdaService";

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
const inp={width:"100%",boxSizing:"border-box",padding:"10px 12px",fontSize:16,fontWeight:600,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.t1,outline:"none",fontFamily:"inherit",height:44};
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
  const map={sang:"sunrise",phu_sang:"coffee",trua:"sun",phu_chieu:"coffee",pre:"zap",post:"zap",toi:"moon"};
  const color={sang:"#EAB308",phu_sang:"#78716C",trua:"#F59E0B",phu_chieu:"#78716C",pre:"#DC2626",post:"#16A34A",toi:"#6366F1"};
  return <Icon d={Icons[map[id]||"sun"]} color={color[id]||"#666"} size={size}/>;
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
  const mob=useIsMobile();
  const [open,setOpen]=useState(false);
  const t=meal.items.reduce((a,i)=>({p:a.p+(i.p||0),c:a.c+(i.c||0),f:a.f+(i.f||0),fiber:a.fiber+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});
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
        <span style={{color:C.red}}>Tổng</span><span/>
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

  // Compute chart height based on data range
  const data0=weightLog.map(w=>w.kg);
  const allVals0=[...data0,goalKg,startKg];
  const yRange0=Math.ceil(Math.max(...allVals0))+1-(Math.floor(Math.min(...allVals0))-1);
  const chartH=mob?(yRange0>6?220:190):(yRange0>6?280:240);

  useEffect(()=>{
    if(!canvasRef.current||weightLog.length<2||!window.ChartJS)return;
    if(chartRef.current)chartRef.current.destroy();

    const data=weightLog.map(w=>w.kg);
    const labels=weightLog.map(w=>"T"+w.week);
    const goalData=weightLog.map(()=>goalKg);

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
  },[weightLog,goalKg,goalType,startKg,mob]);

  return <div>
    <div style={{position:"relative",width:"100%",height:chartH}}>
      <canvas ref={canvasRef}/>
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:mob?8:14,justifyContent:"center",marginTop:6,fontSize:mob?9:11,color:"#888"}}>
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
- Chiều cao: ${profile.cm}cm, Cân nặng: ${curKg}kg, Tuổi: ${profile.age}
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
        <span style={{fontSize:14,fontWeight:800,color:ui.color}}>{ui.title}</span>
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

function ReportView({weightLog,profile,macro,getMealHistory,appSettings,mob}){
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

  // Load data
  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const range=getDateRange();
      const logs=await getMealHistory(range.start,range.end);
      // Group by date
      const byDate={};
      logs.forEach(l=>{
        if(!byDate[l.log_date])byDate[l.log_date]={cal:0,p:0,c:0,f:0,fiber:0,items:[],meals:[]};
        byDate[l.log_date].cal+=(l.total_cal||0);
        byDate[l.log_date].p+=(l.total_protein||0);
        byDate[l.log_date].c+=(l.total_carb||0);
        byDate[l.log_date].f+=(l.total_fat||0);
        byDate[l.log_date].meals.push(l.meal_id);
        (l.items||[]).forEach(it=>byDate[l.log_date].items.push(it));
      });
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
      // Weekly aggregation for charts
      const weeks=[];let weekStart=new Date(range.start);
      while(weekStart<=new Date(range.end)){
        const we=new Date(weekStart);we.setDate(we.getDate()+6);
        const wDates=dates.filter(d=>d>=weekStart.toISOString().slice(0,10)&&d<=we.toISOString().slice(0,10));
        const wCal=wDates.length>0?Math.round(wDates.reduce((s,d)=>s+byDate[d].cal,0)/wDates.length):0;
        weeks.push({label:`T${weeks.length+1}`,cal:wCal,days:wDates.length});
        weekStart.setDate(weekStart.getDate()+7);
      }
      // Weight data
      const startKg=weightLog.length>0?weightLog[0].kg:profile.kg;
      const curKg=weightLog.length>0?weightLog[weightLog.length-1].kg:profile.kg;
      const goalKg=profile.goalKg||startKg;
      const wPct=goalKg!==startKg?Math.round(((curKg-startKg)/(goalKg-startKg))*100):0;

      setData({range,byDate,dates,daysLogged,totalDays,avgCal,avgP,avgC,avgF,adhereDays,streak,topFoods,topProtein,weeks,target,startKg,curKg,goalKg,wPct});
      setLoading(false);
    })();
  },[getMealHistory,getDateRange,weightLog,profile,macro]);

  const range=getDateRange();

  if(loading)return <div style={{textAlign:"center",padding:40,color:C.t3}}>Đang tải báo cáo...</div>;
  if(!data||data.daysLogged===0)return <div style={{textAlign:"center",padding:40}}>
    <div style={{fontSize:40,marginBottom:8}}>📭</div>
    <div style={{fontSize:15,fontWeight:700,color:C.t2}}>Chưa có dữ liệu</div>
    <div style={{fontSize:13,color:C.t3,marginTop:4}}>Hãy nhập bữa ăn trong Admin để xem báo cáo.</div>
  </div>;

  const maxWeekCal=Math.max(...data.weeks.map(w=>w.cal),data.target);

  return <div>
    {/* Period toggle + nav */}
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <div style={{display:"flex",background:"#F3F4F6",borderRadius:8,overflow:"hidden",padding:2}}>
        <div onClick={()=>{setPeriod("week");setOffset(0);}} style={{padding:"6px 12px",fontSize:12,fontWeight:700,color:period==="week"?"#DC2626":"#9CA3AF",background:period==="week"?"#fff":"transparent",borderRadius:6,cursor:"pointer"}}>Tuần</div>
        <div onClick={()=>{setPeriod("month");setOffset(0);}} style={{padding:"6px 12px",fontSize:12,fontWeight:700,color:period==="month"?"#DC2626":"#9CA3AF",background:period==="month"?"#fff":"transparent",borderRadius:6,cursor:"pointer"}}>Tháng</div>
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
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>TB Calo/ngày</div><div style={{fontSize:22,fontWeight:700}}>{data.avgCal.toLocaleString()}</div><div style={{fontSize:11,marginTop:2,color:data.avgCal<data.target*0.9?"#DC2626":"#16A34A"}}>{data.avgCal<data.target*0.9?`Thiếu ${data.target-data.avgCal} cal`:"✓ Đạt mục tiêu"}</div></div>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>TB Protein</div><div style={{fontSize:22,fontWeight:700}}>{data.avgP}g</div><div style={{fontSize:11,marginTop:2,color:data.avgP>=macro.protein*0.9?"#16A34A":"#DC2626"}}>{data.avgP>=macro.protein*0.9?`✓ ${Math.round(data.avgP/macro.protein*100)}%`:`Thiếu ${Math.round(macro.protein-data.avgP)}g`}</div></div>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>Cân nặng</div><div style={{fontSize:22,fontWeight:700}}>{data.curKg} <span style={{fontSize:13,color:C.t3}}>kg</span></div><div style={{fontSize:11,marginTop:2,color:data.curKg>data.startKg?"#16A34A":"#DC2626"}}>{data.curKg>data.startKg?"+":"" }{Math.round((data.curKg-data.startKg)*10)/10} kg từ đầu</div></div>
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>Tỷ lệ đạt</div><div style={{fontSize:22,fontWeight:700}}>{data.daysLogged>0?Math.round(data.adhereDays/data.daysLogged*100):0}%</div><div style={{fontSize:11,marginTop:2,color:C.t3}}>{data.adhereDays}/{data.daysLogged} ngày đạt (±10%)</div></div>
    </div>

    {/* Goal ETA */}
    <div style={{...card,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:6}}>🎯 Mục tiêu cân nặng</div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1,height:8,background:"#F3F4F6",borderRadius:4,overflow:"hidden"}}><div style={{width:`${Math.max(0,Math.min(data.wPct,100))}%`,height:"100%",background:"linear-gradient(90deg,#DC2626,#F59E0B)",borderRadius:4}}/></div>
        <span style={{fontSize:13,fontWeight:700,color:"#DC2626"}}>{Math.round(data.wPct)}%</span>
      </div>
      <div style={{fontSize:11,color:C.t3,marginTop:4}}>{data.startKg} → {data.goalKg} kg · Hiện tại: {data.curKg} kg</div>
    </div>

    {/* Calo chart */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:20}}>
      <span style={{fontSize:mob?16:18}}>📊</span>
      <span style={{fontSize:mob?15:17,fontWeight:800,background:"linear-gradient(90deg,#DC2626,#F59E0B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.06em"}}>Calo theo tuần</span>
      <div style={{flex:1,height:1.5,background:"linear-gradient(90deg,#FECACA,#FDE68A,transparent)"}}/>
    </div>
    <div style={{...card}}>
      {(()=>{
        const colors=["#DC2626","#F59E0B","#3B82F6","#16A34A","#8B5CF6"];
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
          <div style={{textAlign:"center",fontSize:13,color:C.t3,marginTop:8}}>🎯 Mục tiêu: <span style={{fontWeight:800,color:"#DC2626",fontSize:14}}>{data.target.toLocaleString()} cal/ngày</span></div>
        </div>;
      })()}
    </div>

    {/* Macro donut */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:20}}>
      <span style={{fontSize:mob?16:18}}>🍵</span>
      <span style={{fontSize:mob?15:17,fontWeight:800,background:"linear-gradient(90deg,#DC2626,#F59E0B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.06em"}}>Macro TB/ngày</span>
      <div style={{flex:1,height:1.5,background:"linear-gradient(90deg,#FECACA,#FDE68A,transparent)"}}/>
    </div>
    <div style={{...card}}>
      <div style={{display:"flex",gap:mob?12:16,alignItems:"center"}}>
        <div style={{width:mob?80:90,height:mob?80:90,borderRadius:"50%",background:`conic-gradient(#DC2626 0% ${data.avgP/((data.avgP+data.avgC+data.avgF)||1)*100}%, #F59E0B ${data.avgP/((data.avgP+data.avgC+data.avgF)||1)*100}% ${(data.avgP+data.avgC)/((data.avgP+data.avgC+data.avgF)||1)*100}%, #3B82F6 ${(data.avgP+data.avgC)/((data.avgP+data.avgC+data.avgF)||1)*100}% 100%)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:mob?50:56,height:mob?50:56,borderRadius:"50%",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?13:14,fontWeight:700}}>{data.avgCal}</div>
        </div>
        <div style={{flex:1,fontSize:13}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#DC2626"}}/> Protein</span><span style={{fontWeight:700}}>{data.avgP}g</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#F59E0B"}}/> Carb</span><span style={{fontWeight:700}}>{data.avgC}g</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#3B82F6"}}/> Fat</span><span style={{fontWeight:700}}>{data.avgF}g</span></div>
        </div>
      </div>
    </div>

    {/* Top foods */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,marginTop:20}}>
      <span style={{fontSize:mob?16:18}}>🏆</span>
      <span style={{fontSize:mob?15:17,fontWeight:800,background:"linear-gradient(90deg,#DC2626,#F59E0B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.06em"}}>Top thực phẩm</span>
      <div style={{flex:1,height:1.5,background:"linear-gradient(90deg,#FECACA,#FDE68A,transparent)"}}/>
    </div>
    <div style={{...card}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:mob?8:16}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#DC2626",marginBottom:8}}>🥩 Top nguồn Protein</div>
          {data.topProtein.map(([name,p],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,borderBottom:"0.5px solid #F3F4F6"}}><span>{i+1}. {name}</span><span style={{color:C.t3}}>{Math.round(p)}g P</span></div>)}
          {data.topProtein.length===0&&<div style={{fontSize:12,color:C.t3}}>Chưa có dữ liệu</div>}
        </div>
        <div style={{width:1,background:"#E5E7EB"}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#F59E0B",marginBottom:8}}>⭐ Ăn nhiều nhất</div>
          {data.topFoods.map(([name,count],i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,borderBottom:"0.5px solid #F3F4F6"}}><span>{i+1}. {name}</span><span style={{color:C.t3}}>{count} lần</span></div>)}
          {data.topFoods.length===0&&<div style={{fontSize:12,color:C.t3}}>Chưa có dữ liệu</div>}
        </div>
      </div>
    </div>
  </div>;
}

function Dashboard({weightLog,profile,macro,getMeals,appSettings}){if(!profile||!macro)return null;
  const [dayType,setDayType]=useState("train");
  const mob=useIsMobile();
  // Parse meal config
  const mealConfig=(()=>{try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
  const visibleIds=mealConfig[dayType]||DEFAULT_MEAL_CONFIG[dayType];
  const allMeals=getMeals(dayType);
  const meals=allMeals.filter(m=>visibleIds.includes(m.id));
  const totals=meals.reduce((acc,m)=>{const mt=m.items.reduce((a,i)=>({p:a.p+(i.p||0),c:a.c+(i.c||0),f:a.f+(i.f||0),fiber:a.fiber+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fiber:0,cal:0});return{p:acc.p+mt.p,c:acc.c+mt.c,f:acc.f+mt.f,fiber:acc.fiber+mt.fiber,cal:acc.cal+mt.cal};},{p:0,c:0,f:0,fiber:0,cal:0});
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
          <div style={{fontSize:mob?15:15,fontWeight:900,letterSpacing:"0.12em",color:"#F9FAFB"}}>{dayType==="train"?"Tổng calo ngày tập":"Tổng calo ngày nghỉ"}</div>
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
    <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:24}}>
      {[{l:"Chiều cao",v:profile.cm,u:"cm",c:C.blue},{l:"Cân nặng",v:curKg,u:"kg",c:C.red},{l:"BMI",v:macro.bmi,u:"",c:C.gold},{l:"Gym",v:profile.gym,u:"/tuần",c:C.green}].map((s,i)=>(
        <div key={i} style={{...card,padding:"10px 14px",marginBottom:0,borderLeft:`4px solid ${s.c}`}}>
          <div style={{...lbl,color:s.c}}>{s.l}</div>
          <div style={{fontSize:20,fontWeight:900,color:C.t1,marginTop:2}}>{s.v}<span style={{fontSize:11,fontWeight:700,color:C.t3}}>{s.u}</span></div>
        </div>
      ))}
    </div>

    {/* Section label: Danh sách thực đơn */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{fontSize:mob?18:24}}>🍽️</span>
      <span style={{fontSize:mob?16:18,fontWeight:800,background:"linear-gradient(90deg,#DC2626,#F59E0B)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"0.06em"}}>Danh sách thực đơn</span>
      <div style={{flex:1,height:1.5,background:"linear-gradient(90deg,#FECACA,#FDE68A,transparent)"}}/>
    </div>

    <div style={{display:"flex",gap:6,marginBottom:12}}>
      <div style={{display:"flex",background:"#fff",borderRadius:10,overflow:"hidden",border:"1.5px solid #F87171",boxShadow:"0 1px 4px rgba(220,38,38,0.1)"}}>
        <div onClick={()=>setDayType("train")} style={{padding:mob?"10px 18px":"10px 18px",fontSize:mob?14:14,fontWeight:dayType==="train"?800:700,background:dayType==="train"?"#FEE2E2":"transparent",color:dayType==="train"?"#991B1B":"#9CA3AF",cursor:"pointer"}}>💪 Ngày tập</div>
        <div onClick={()=>setDayType("rest")} style={{padding:mob?"10px 18px":"10px 18px",fontSize:mob?14:14,fontWeight:dayType==="rest"?800:700,background:dayType==="rest"?"#DBEAFE":"transparent",color:dayType==="rest"?"#1E40AF":"#9CA3AF",cursor:"pointer"}}>😴 Ngày nghỉ</div>
      </div>
    </div>

    {meals.map(m=><MealCard key={m.id} meal={m}/>)}

    {/* Compact evaluation */}
    {actualCal>0&&<div style={{...card,padding:"12px 16px",marginTop:6,
      background:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?C.greenBg:C.redBg,
      border:`2px solid ${actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?C.green:C.red}`,
    }}>
      <div style={{fontSize:13,fontWeight:800,lineHeight:1.6,
        color:actualCal>=heroCal*0.95&&actualCal<=heroCal*1.1?C.green:C.red,
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

    {/* Weight Chart */}
    <div style={{...card,marginTop:24,borderTop:"3px solid",borderImage:"linear-gradient(90deg,#DC2626,#EAB308) 1"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:17,fontWeight:900,color:C.blue}}>📈 Theo dõi cân nặng</div>
        <div style={{fontSize:13,fontWeight:700,color:C.t2}}>🎯 <span style={{color:C.red,fontWeight:900}}>{goalKg} kg</span></div>
      </div>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:14}}>
        {[
          {l:"Xuất phát",v:startKg,c:C.t1},
          {l:"Hiện tại",v:curKg,c:"#4285F4"},
          {l:"Mục tiêu",v:goalKg,c:"#34A853"},
          {l:"Tiến độ",v:Math.max(0,Math.min(100,Math.round(wPct)))+"%",c:"#F4B400"},
        ].map((s,i)=><div key={i} style={{background:C.card,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.t3,marginBottom:2}}>{s.l}</div>
          <div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div>
          <div style={{fontSize:10,color:C.t3}}>{i<3?"kg":("còn "+Math.abs(goalKg-curKg).toFixed(1)+" kg")}</div>
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
      }} style={{fontSize:11,fontWeight:700,padding:"3px 8px",background:C.redBg,color:C.red,border:`1px solid ${C.red}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
    </div>
  </div>;
}

function AdminPanel({weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile,macro,saveMealToCloud,saveFoodCache,deleteFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting,forcedSection}){if(!profile||!macro)return null;
  const mob=useIsMobile();
  const [section,setSection]=useState(forcedSection==="settings"?"schedule":(forcedSection||"meals"));
  useEffect(()=>{if(forcedSection&&forcedSection!=="settings")setSection(forcedSection);if(forcedSection==="settings")setSection("schedule");},[forcedSection]);
  const [dayType,setDayType]=useState("train");
  const [selectedMeal,setSelectedMeal]=useState("sang");
  const [mealConfig,setMealConfig]=useState(()=>{
    try{const saved=appSettings.meal_config?JSON.parse(appSettings.meal_config):null;return saved||{...DEFAULT_MEAL_CONFIG};}
    catch(e){return {...DEFAULT_MEAL_CONFIG};}
  });
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

  const addFood=()=>setFoodItems([...foodItems,{name:"",qty:1,gram:100,unit:"g"}]);
  const removeFood=(idx)=>setFoodItems(foodItems.filter((_,i)=>i!==idx));
  const updateFood=(idx,field,val)=>{const u=[...foodItems];u[idx]={...u[idx],[field]:val};setFoodItems(u);};

  const prompt=`Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Trả lời CHÍNH XÁC bằng JSON, không markdown:
{"items":[{"name":"tên","gram":số,"protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym tăng cơ"}`;

  const callAI=useCallback(async(forceRefresh=false)=>{
    if(foodItems.length===0||foodItems.every(f=>!f.name.trim()))return;
    setAiLoading(true);setAiError(null);setAiResult(null);
    const fc=forceRefresh?{}:(foodCache||{});
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
          cached.push({name:f.name,gram:f.gram,unit,qty,qty_display:null,protein:Math.round(fc[k].p*r*10)/10,carb:Math.round(fc[k].c*r*10)/10,fat:Math.round(fc[k].f*r*10)/10,fiber:Math.round((fc[k].fiber||0)*r*10)/10,cal:Math.round(fc[k].cal*r),source:"cache"});
        }else{
          // Scale from per-1-unit by qty
          cached.push({name:f.name,gram:Math.round((fc[k].gram||0)*qty),unit,qty,qty_display:`${qty} ${unit}`,protein:Math.round(fc[k].p*qty*10)/10,carb:Math.round(fc[k].c*qty*10)/10,fat:Math.round(fc[k].f*qty*10)/10,fiber:Math.round((fc[k].fiber||0)*qty*10)/10,cal:Math.round(fc[k].cal*qty),source:"cache"});
        }
      }else{uncached.push(f);}
    });
    if(uncached.length===0){setAiResult({items:cached,tip:"📦 Tất cả từ cache — không gọi API!"});setAiLoading(false);return;}

    // Try USDA first for uncached items (with VN→EN translation)
    const usdaResolved=[];const stillUncached=[];
    if(usdaKey){
      for(const f of uncached){
        try{
          // Translate Vietnamese → English for USDA
          const translated=translateFood(f.name);
          const searchQuery=translated?translated.query:f.name;
          console.log("🔍 USDA search:",f.name,"→",searchQuery);
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
      const aiItemsWithSource=(parsed.items||[]).map(it=>({...it,source:aiProvider==="gpt"?"GPT":aiProvider==="claude"?"Claude":"Gemini"}));
      const newItems=[...allResolved,...aiItemsWithSource];
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

  const mealNames=ALL_MEALS.filter(m=>mealConfig[dayType]?.includes(m.id)).map(m=>({id:m.id,l:`${m.icon} ${mob?m.short:m.name}`}));

  const providerName=aiProvider==="claude"?"Claude":aiProvider==="gemini"?"Gemini":"GPT";

  return <div>
    {!forcedSection&&<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{id:"meals",l:"🍽️ Bữa ăn"},{id:"ai",l:"🤖 Kết nối AI"},{id:"profile",l:"👤 Hồ sơ"},{id:"schedule",l:"📅 Lịch tập"},{id:"weight",l:"⚖️ Cân nặng"}].map(s=>
        <Pill key={s.id} active={section===s.id} color={C.red} onClick={()=>setSection(s.id)}>{s.l}</Pill>
      )}
    </div>}
    {forcedSection==="settings"&&<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[...(isAdmin?[{id:"ai",l:"🤖 Kết nối AI"}]:[]),{id:"schedule",l:"📅 Lịch tập"},{id:"weight",l:"⚖️ Cân nặng"}].map(s=>
        <Pill key={s.id} active={section===s.id} color={C.red} onClick={()=>setSection(s.id)}>{s.l}</Pill>
      )}
    </div>}

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
          return <div key={p.id} onClick={()=>{setAiProvider(p.id);if(p.id==="claude")setAiModel("claude-sonnet-4-20250514");if(isAdmin)saveSetting("ai_provider",p.id);}} style={{
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
          ].map(m=><div key={m.id} onClick={()=>{setAiModel(m.id);if(isAdmin)saveSetting("ai_model",m.id);}} style={{
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
          ].map(m=><div key={m.id} onClick={()=>{setGeminiModel(m.id);if(isAdmin)saveSetting("gemini_model",m.id);}} style={{
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
            {id:"chat-latest",name:"GPT-5.5 Instant",desc:"Mặc định ChatGPT, ít hallucinate",badge:"Khuyên dùng",bc:C.goldBg,btc:"#92400E"},
            {id:"gpt-5.5",name:"GPT-5.5 Thinking",desc:"Mạnh nhất, agentic + coding",badge:"Cao cấp",bc:C.redBg,btc:"#7F1D1D"},
          ].map(m=><div key={m.id} onClick={()=>{setGptModel(m.id);if(isAdmin)saveSetting("gpt_model",m.id);}} style={{
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
      }} style={redBtn}>🔌 Test kết nối {providerName}</button>

      <div style={{marginTop:16,padding:"12px 16px",background:C.goldBg,borderRadius:10,border:"1.5px solid #CA8A04"}}>
        <span style={{fontSize:13,fontWeight:700,color:"#78350F",lineHeight:1.6}}>💡 Kết quả AI được cache — cùng 1 món không cần gọi lần 2. {!isAdmin&&"API keys được admin cấu hình sẵn."}</span>
      </div>

      {isAdmin&&<button onClick={async()=>{
        console.log("🔑 Saving keys:", {aiProvider, gptModel, geminiModel, aiModel, claudeKey: claudeKey?.length, geminiKey: geminiKey?.length, gptKey: gptKey?.length, usdaKey: usdaKey?.length});
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
        Nhập thức ăn → nhấn "Tính macro" → trả kết quả → Lưu bữa ăn
      </div>
      {/* Day type + meals - PC: 1 row, Mobile: 2 rows */}
      {mob?<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",background:C.surface,borderRadius:18,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
            <div onClick={()=>{setDayType("train");setSelectedMeal(mealConfig.train?.[0]||"sang");setAiResult(null);}} style={{padding:"6px 10px",fontSize:11,fontWeight:700,background:dayType==="train"?"#FEE2E2":"transparent",color:dayType==="train"?"#991B1B":"#9CA3AF",cursor:"pointer"}}>💪 Ngày tập</div>
            <div onClick={()=>{setDayType("rest");setSelectedMeal(mealConfig.rest?.[0]||"sang");setAiResult(null);}} style={{padding:"6px 10px",fontSize:11,fontWeight:700,background:dayType==="rest"?"#DBEAFE":"transparent",color:dayType==="rest"?"#1E40AF":"#9CA3AF",cursor:"pointer"}}>😴 Ngày nghỉ</div>
          </div>
          <div onClick={()=>setShowMealSettings(!showMealSettings)} style={{padding:"5px 10px",borderRadius:16,fontSize:11,fontWeight:700,background:showMealSettings?"#FEF3C7":"#FEF3C7",color:"#92400E",border:"1.5px solid #FCD34D",cursor:"pointer",display:"flex",alignItems:"center",gap:3}}>⚙️ Quản lý</div>
        </div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
          {mealNames.map(m=><div key={m.id} onClick={()=>{setSelectedMeal(m.id);setAiResult(null);}} style={{padding:"5px 10px",borderRadius:16,fontSize:11,fontWeight:selectedMeal===m.id?700:600,background:selectedMeal===m.id?"#FEE2E2":"#F9FAFB",color:selectedMeal===m.id?"#991B1B":"#6B7280",border:`1.5px solid ${selectedMeal===m.id?"#F87171":"#E5E7EB"}`,cursor:"pointer"}}>{m.l}</div>)}
        </div>
      </>:<>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:14}}>
          <div style={{display:"flex",background:C.surface,borderRadius:20,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
            <div onClick={()=>{setDayType("train");setSelectedMeal(mealConfig.train?.[0]||"sang");setAiResult(null);}} style={{padding:"7px 14px",fontSize:13,fontWeight:700,background:dayType==="train"?"#FEE2E2":"transparent",color:dayType==="train"?"#991B1B":"#9CA3AF",cursor:"pointer"}}>💪 Ngày tập</div>
            <div onClick={()=>{setDayType("rest");setSelectedMeal(mealConfig.rest?.[0]||"sang");setAiResult(null);}} style={{padding:"7px 14px",fontSize:13,fontWeight:700,background:dayType==="rest"?"#DBEAFE":"transparent",color:dayType==="rest"?"#1E40AF":"#9CA3AF",cursor:"pointer"}}>😴 Ngày nghỉ</div>
          </div>
          <span style={{color:"#E5E7EB"}}>|</span>
          {mealNames.map(m=><div key={m.id} onClick={()=>{setSelectedMeal(m.id);setAiResult(null);}} style={{padding:"6px 12px",borderRadius:18,fontSize:12,fontWeight:selectedMeal===m.id?700:600,background:selectedMeal===m.id?"#FEE2E2":"#F9FAFB",color:selectedMeal===m.id?"#991B1B":"#6B7280",border:`1.5px solid ${selectedMeal===m.id?"#F87171":"#E5E7EB"}`,cursor:"pointer"}}>{m.l}</div>)}
          <div onClick={()=>setShowMealSettings(!showMealSettings)} style={{padding:"6px 14px",borderRadius:18,fontSize:12,fontWeight:700,background:showMealSettings?"#FDE68A":"#FEF3C7",color:"#92400E",border:"1.5px solid #FCD34D",cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>⚙️ Tuỳ chỉnh</div>
        </div>
      </>}
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
              const cfg={...mealConfig};
              const arr=[...(cfg[dayType]||[])];
              if(isOn)cfg[dayType]=arr.filter(id=>id!==m.id);
              else{
                // Insert in correct order
                const allIds=ALL_MEALS.map(x=>x.id);
                arr.push(m.id);
                arr.sort((a,b)=>allIds.indexOf(a)-allIds.indexOf(b));
                cfg[dayType]=arr;
              }
              setMealConfig(cfg);
              if(isAdmin)saveSetting("meal_config",JSON.stringify(cfg));
              // If selected meal was turned off, switch to first visible
              if(isOn&&selectedMeal===m.id){const first=cfg[dayType]?.[0]||"sang";setSelectedMeal(first);}
            }} style={{width:36,height:20,background:isOn?"#3B6D11":"#D1D5DB",borderRadius:10,position:"relative",cursor:isTrainOnly?"not-allowed":"pointer",transition:"background 0.2s"}}>
              <div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:2,left:isOn?18:2,transition:"left 0.2s",boxShadow:"0 1px 2px rgba(0,0,0,0.15)"}}/>
            </div>
          </div>;
        })}
        <div style={{marginTop:8,fontSize:10,color:C.t3,lineHeight:"1.4"}}>Bữa tắt sẽ không hiện trên Dashboard và không tính vào tổng.</div>
      </div>}
      <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:14}}>
        <div style={{display:"grid",gridTemplateColumns:mob?"24px 1fr 50px 36px 56px 24px":"32px 2fr 60px 70px 80px 32px",gap:mob?4:8,marginBottom:8,alignItems:"center"}}>
          <span style={{...lbl,textAlign:"center"}}>#</span><span style={lbl}>Tên thức ăn</span><span style={{...lbl,textAlign:"center"}}>ĐV</span><span style={{...lbl,textAlign:"center"}}>SL</span><span style={{...lbl,textAlign:"center"}}>Gram</span><span/>
        </div>
        {foodItems.map((item,i)=>{
          const onUnitChange=(e)=>{const u=e.target.value;const updated=[...foodItems];updated[i]={...updated[i],unit:u};if(u!=="g"&&u!=="ml"){const est=estimateGram(item.name,u,item.qty||1);updated[i].gram=est;}setFoodItems(updated);};
          const isWeight=!item.unit||item.unit==="g"||item.unit==="ml";
          return <div key={i} style={{display:"grid",gridTemplateColumns:mob?"24px 1fr 50px 36px 56px 24px":"32px 2fr 60px 70px 80px 32px",gap:mob?4:8,alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:mob?11:13,fontWeight:800,color:C.t3,textAlign:"center",minWidth:mob?24:32}}>{i+1}.</span>
          <input value={item.name} onChange={e=>updateFood(i,"name",e.target.value)} placeholder="VD: Cá kho" style={{...inp,fontSize:mob?14:16,height:mob?38:44,padding:mob?"8px 10px":"10px 12px"}}/>
          <select value={item.unit||"g"} onChange={onUnitChange} style={{...inp,textAlign:"center",textAlignLast:"center",padding:"0 2px",fontSize:mob?13:16,height:mob?38:44,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 4px center",paddingRight:"14px"}}>
            <option value="g">g</option><option value="ml">ml</option><option value="quả">quả</option><option value="hộp">hộp</option><option value="lát">lát</option><option value="bát">bát</option>
          </select>
          <input type="number" inputMode="numeric" value={item.qty||""} onChange={e=>{const q=Math.max(0,Number(e.target.value)||0);const updated=[...foodItems];updated[i]={...updated[i],qty:q};if(!isWeight&&q>0){const est=estimateGram(item.name,item.unit,q);updated[i].gram=est;}setFoodItems(updated);}} style={{...inp,textAlign:"center",fontSize:mob?13:16,height:mob?38:44,padding:mob?"8px 6px":"10px 12px"}} placeholder="SL"/>
          <input type="number" inputMode="numeric" value={item.gram||""} onChange={e=>updateFood(i,"gram",Math.max(0,Number(e.target.value)||0))} style={{...inp,textAlign:"center",fontSize:mob?13:16,height:mob?38:44,padding:mob?"8px 6px":"10px 12px",opacity:isWeight?1:0.7}} placeholder={isWeight?"Gram":"~Gram"}/>
          <button onClick={()=>removeFood(i)} style={{padding:0,width:mob?24:32,height:mob?24:32,background:C.redBg,color:C.red,borderRadius:8,fontSize:mob?14:16,fontWeight:900,border:"none",cursor:"pointer"}}>×</button>
        </div>;})}
        <button onClick={addFood} style={{padding:"10px",fontSize:13,fontWeight:700,background:C.surface,color:C.t2,border:`2px dashed ${C.border}`,borderRadius:10,width:"100%",cursor:"pointer",fontFamily:"inherit"}}>+ Thêm món</button>
      </div>
      <button onClick={callAI} disabled={aiLoading} style={{...redBtn,marginTop:16,opacity:aiLoading?0.7:1}}>
        {aiLoading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <span style={{width:16,height:16,border:"2.5px solid #fcc",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>
          <span>Đang tính...</span>
        </span>:"Tính macro"}
      </button>
      {aiError&&<div style={{marginTop:12,padding:"12px 16px",background:C.redBg,borderRadius:10,border:`2px solid ${C.red}`}}>
        <span style={{fontSize:13,fontWeight:800,color:"#7F1D1D"}}>❌ {aiError}</span>
      </div>}
      {aiResult&&<div style={{marginTop:16,background:C.redBg,borderRadius:12,padding:16,border:`2px solid ${C.red}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:900}}>✓</span>
          <span style={{fontSize:14,fontWeight:900,color:C.red}}>Kết quả {(()=>{const sources=[...new Set((aiResult.items||[]).map(i=>i.source).filter(Boolean))];return sources.join(" + ");})()}</span>
          <button onClick={async()=>{
            // Xóa cache các món hiện tại rồi recalc
            const keysToDelete=foodItems.map(f=>(f.name||"").toLowerCase().trim()).filter(Boolean);
            if(keysToDelete.length>0) await deleteFoodCache(keysToDelete);
            setAiResult(null);
            callAI(true);
          }} style={{marginLeft:"auto",padding:"4px 10px",fontSize:12,fontWeight:700,background:C.surface,color:C.t2,border:`1.5px solid ${C.border}`,borderRadius:7,cursor:"pointer",fontFamily:"inherit"}}>🔄 Tính lại</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1.4fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr":"2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:11,fontWeight:800,borderBottom:`1.5px solid ${C.border}`,paddingBottom:6,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>
          <span style={{color:C.t3}}>Thức ăn</span><span style={{color:C.t3,textAlign:"right"}}>g</span>
          <span style={{color:C.protein,textAlign:"right"}}>P</span><span style={{color:C.carb,textAlign:"right"}}>C</span>
          <span style={{color:C.t2,textAlign:"right"}}>F</span><span style={{color:C.fiber,textAlign:"right"}}>Xơ</span>
          <span style={{color:C.t2,textAlign:"right"}}>Cal</span>
        </div>
        {(aiResult.items||[]).map((item,i)=><div key={i} style={{display:"grid",gridTemplateColumns:mob?"1.4fr 0.5fr 0.5fr 0.5fr 0.5fr 0.5fr 0.6fr":"2fr 0.6fr 0.6fr 0.6fr 0.6fr 0.6fr 0.7fr",gap:4,fontSize:13,fontWeight:700,padding:"7px 0",borderBottom:i<aiResult.items.length-1?`1px solid ${C.border}`:"none"}}>
          <span style={{color:C.t1,fontWeight:800}}>{item.name} {item.source&&<span style={{fontSize:11,marginLeft:3}}>{item.source==="cache"?"📦":item.source==="USDA"?"🏛️":"🤖"}</span>}</span>
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
            // Save AI result items directly — no re-matching needed
            const aiItems=aiResult.items||[];
            const items=aiItems.map(ai=>{
              const unit=ai.unit||"g";
              const isWeight=unit==="g"||unit==="ml";
              return {
                food:ai.name||"",
                gram:ai.gram||0,
                unit,
                qty:ai.qty||1,
                qty_display:ai.qty_display||(isWeight?null:`${ai.qty||1} ${unit}`),
                p:ai.protein||0, c:ai.carb||0, f:ai.fat||0,
                fiber:ai.fiber||0, cal:ai.cal||0,
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
      <div style={{fontSize:17,fontWeight:900,color:C.blue,marginBottom:4}}>👤 Hồ sơ cá nhân</div>
      <div style={{fontSize:13,fontWeight:600,color:C.t2,marginBottom:16}}>Nhập thông số → macro tự tính theo công thức Mifflin-St Jeor</div>

      {/* Section 1: Thông tin cơ bản */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:mob?14:20,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:`1.5px solid #F3F4F6`}}>
          <span style={{fontSize:16}}>📋</span>
          <span style={{fontSize:mob?14:15,fontWeight:800,color:C.t1}}>Thông tin cơ bản</span>
        </div>

        {/* Gender */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?8:10,marginBottom:14}}>
          {[{id:"male",icon:"👨",name:"Nam"},{id:"female",icon:"👩",name:"Nữ"}].map(g=><div key={g.id} onClick={()=>setProfile({...profile,gender:g.id})} style={{
            padding:mob?"10px 12px":"12px 14px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:8,
            background:(profile.gender||"male")===g.id?"#EFF6FF":C.surface,
            border:`1.5px solid ${(profile.gender||"male")===g.id?"#60A5FA":C.border}`,
          }}>
            <span style={{fontSize:mob?20:24}}>{g.icon}</span>
            <span style={{fontSize:mob?13:14,fontWeight:700,color:C.t1}}>{g.name}</span>
            <div style={{marginLeft:"auto",width:20,height:20,borderRadius:"50%",border:`2px solid ${(profile.gender||"male")===g.id?"#3B82F6":"#D1D5DB"}`,background:(profile.gender||"male")===g.id?"#3B82F6":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff"}}>{(profile.gender||"male")===g.id?"✓":""}</div>
          </div>)}
        </div>

        {/* 4 inputs */}
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:mob?8:10}}>
          {[
            {key:"cm",label:"Chiều cao",icon:"📏",unit:"cm",mode:"numeric"},
            {key:"kg",label:"Cân nặng",icon:"⚖️",unit:"kg",mode:"decimal"},
            {key:"age",label:"Tuổi",icon:"🎂",unit:"tuổi",mode:"numeric"},
            {key:"gym",label:"Số buổi tập",icon:"🏋️",unit:"buổi",mode:"numeric"},
          ].map(f=><div key={f.key}>
            <div style={{fontSize:11,fontWeight:600,color:C.t3,marginBottom:4}}>{f.icon} {f.label}</div>
            <div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <input type="text" inputMode={f.mode} value={f.key==="kg"?profile.kg:profile[f.key]} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;setProfile({...profile,[f.key]:Number(v)});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
              <span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
            </div>
          </div>)}
        </div>
      </div>

      {/* Section 2: Vận động */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:mob?14:20,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:`1.5px solid #F3F4F6`}}>
          <span style={{fontSize:16}}>🏃</span>
          <span style={{fontSize:mob?14:15,fontWeight:800,color:C.t1}}>Vận động</span>
        </div>

        {/* Activity level */}
        <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:8}}>💼 Mức vận động công việc</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:mob?6:8,marginBottom:18}}>
          {[
            {id:"sedentary",icon:"🖥️",name:"Ít vận động",desc:"Ngồi văn phòng"},
            {id:"moderate",icon:"🚶",name:"Vận động vừa",desc:"Đi lại nhiều"},
            {id:"active",icon:"🏗️",name:"Vận động nặng",desc:"Lao động chân tay"},
          ].map(a=><div key={a.id} onClick={()=>setProfile({...profile,activity:a.id})} style={{
            padding:mob?"10px 6px":"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
            background:profile.activity===a.id?"#EFF6FF":C.surface,
            border:profile.activity===a.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
          }}>
            <div style={{fontSize:mob?20:24}}>{a.icon}</div>
            <div style={{fontSize:mob?11:13,fontWeight:800,color:C.t1,marginTop:4}}>{a.name}</div>
            <div style={{fontSize:mob?9:10,color:C.t3}}>{a.desc}</div>
          </div>)}
        </div>

        {/* Exercise type */}
        <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:8}}>🏅 Hình thức tập luyện</div>
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:mob?6:8,marginBottom:((profile.exerciseType||"gym")==="gym_cardio"||(profile.exerciseType||"gym")==="cardio")?18:0}}>
          {[
            {id:"gym",icon:"🏋️",name:"Gym",desc:"Tập tạ thuần"},
            {id:"gym_cardio",icon:"🏋️🏃",name:"Gym + Cardio",desc:"Tạ kết hợp cardio"},
            {id:"cardio",icon:"🏃",name:"Cardio",desc:"Chạy, bơi, xe đạp"},
            {id:"none",icon:"😴",name:"Không tập",desc:"Không vận động"},
          ].map(e=><div key={e.id} onClick={()=>{
            const updated={...profile,exerciseType:e.id};
            if(e.id==="none"&&profile.goalType==="bulk")updated.goalType="maintain";
            if(e.id==="gym")updated.cardioIntensity=undefined;
            setProfile(updated);
          }} style={{
            padding:mob?"10px 6px":"12px 10px",borderRadius:12,cursor:"pointer",textAlign:"center",
            background:(profile.exerciseType||"gym")===e.id?"#FEE2E2":C.surface,
            border:(profile.exerciseType||"gym")===e.id?`2px solid #F87171`:`1.5px solid ${C.border}`,
          }}>
            <div style={{fontSize:mob?20:24}}>{e.icon}</div>
            <div style={{fontSize:mob?11:12,fontWeight:800,color:C.t1,marginTop:4}}>{e.name}</div>
            <div style={{fontSize:mob?9:10,color:C.t3}}>{e.desc}</div>
          </div>)}
        </div>

        {/* Cardio intensity */}
        {((profile.exerciseType||"gym")==="gym_cardio"||(profile.exerciseType||"gym")==="cardio")&&<>
          <div style={{fontSize:11,fontWeight:700,color:C.t3,marginBottom:8}}>⚡ Cường độ Cardio</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:mob?6:8}}>
            {[
              {id:"light",icon:"🚶",name:"Nhẹ",desc:"Đi bộ 30-40p"},
              {id:"moderate",icon:"🏃",name:"Vừa",desc:"Chạy nhẹ 30-45p"},
              {id:"intense",icon:"⚡",name:"Nặng",desc:"HIIT, bơi 45-60p"},
            ].map(ci=><div key={ci.id} onClick={()=>setProfile({...profile,cardioIntensity:ci.id})} style={{
              padding:mob?"8px 6px":"12px",borderRadius:10,cursor:"pointer",textAlign:"center",
              background:(profile.cardioIntensity||"moderate")===ci.id?"#EFF6FF":C.surface,
              border:(profile.cardioIntensity||"moderate")===ci.id?`2px solid #60A5FA`:`1.5px solid ${C.border}`,
            }}>
              <div style={{fontSize:mob?16:20}}>{ci.icon}</div>
              <div style={{fontSize:mob?11:13,fontWeight:700,color:C.t1,marginTop:2}}>{ci.name}</div>
              <div style={{fontSize:mob?9:10,color:C.t3}}>{ci.desc}</div>
            </div>)}
          </div>
        </>}
      </div>

      {/* Section 3: Mục tiêu */}
      <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:14,padding:mob?14:20,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,paddingBottom:10,borderBottom:`1.5px solid #F3F4F6`}}>
          <span style={{fontSize:16}}>🎯</span>
          <span style={{fontSize:mob?14:15,fontWeight:800,color:C.t1}}>Mục tiêu</span>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:mob?6:8,marginBottom:16}}>
          {[
            {id:"bulk",icon:"💪",name:"Tăng cơ",c:"#16A34A",bg:"#DCFCE7",bc:"#4ADE80"},
            {id:"cut",icon:"🔥",name:"Giảm mỡ",c:"#DC2626",bg:"#FEE2E2",bc:"#F87171"},
            {id:"maintain",icon:"⚖️",name:"Duy trì",c:"#3B82F6",bg:"#EFF6FF",bc:"#60A5FA"},
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
              {disabled&&<div style={{position:"absolute",top:-6,right:-6,background:"#DC2626",color:"#fff",fontSize:10,width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</div>}
            </div>;
          })}
        </div>
        {(profile.exerciseType||"gym")==="none"&&profile.goalType==="bulk"&&<div style={{marginBottom:12,padding:"10px 14px",borderRadius:8,background:"#FEE2E2",border:"1px solid #FCA5A5",fontSize:12,color:"#991B1B",display:"flex",alignItems:"center",gap:6}}>⚠️ Không thể tăng cơ khi không tập luyện.</div>}

        {/* Goal weight + duration */}
        {profile.goalType!=="maintain"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:mob?8:10}}>
          {[
            {key:"goalKg",label:"Cân nặng mục tiêu",icon:"⚖️",unit:"kg",mode:"decimal"},
            {key:"months",label:"Thời gian",icon:"📅",unit:"tháng",mode:"numeric"},
          ].map(f=><div key={f.key}>
            <div style={{fontSize:11,fontWeight:600,color:C.t3,marginBottom:4}}>{f.icon} {f.label}</div>
            <div style={{display:"flex",alignItems:"center",background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
              <input type="text" inputMode={f.mode} value={profile[f.key]} onChange={e=>{const v=f.mode==="decimal"?e.target.value.replace(",","."):e.target.value;setProfile({...profile,[f.key]:f.key==="months"?Math.max(1,Number(v)):Number(v)});}} style={{...inp,border:"none",borderRadius:0,flex:1}}/>
              <span style={{padding:"0 10px",fontSize:12,fontWeight:600,color:C.t3,background:"#F3F4F6",height:"100%",display:"flex",alignItems:"center",borderLeft:`1px solid ${C.border}`}}>{f.unit}</span>
            </div>
          </div>)}
        </div>}
      </div>

      {/* Timeline plan */}
      {profile.goalType!=="maintain"&&Math.abs(macro.diff)>0&&<div style={{marginTop:16,background:profile.goalType==="bulk"?C.redBg:C.goldBg,borderRadius:12,padding:"14px 16px",border:`2px solid ${profile.goalType==="bulk"?C.red:"#B45309"}`}}>
        <div style={{fontSize:14,fontWeight:900,color:profile.goalType==="bulk"?C.red:"#B45309",marginBottom:10}}>
          📋 Kế hoạch {profile.goalType==="bulk"?"tăng cân":"giảm cân"}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,}}>{"TỔNG "+(profile.goalType==="bulk"?"TĂNG":"GIẢM")}</div>
            <div style={{fontSize:20,fontWeight:900,color:C.t1}}>{Math.abs(macro.diff)} kg</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,}}>MỖI THÁNG</div>
            <div style={{fontSize:20,fontWeight:900,color:C.gold}}>{macro.perMonth} kg</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:"10px",textAlign:"center",border:`1.5px solid ${C.border}`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.t3,}}>MỖI TUẦN</div>
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
          const val=parseFloat(document.getElementById("weightInput").value.replace(",","."));
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

function calcMacro(p){if(!p)p={cm:170,kg:65,age:25,goalKg:70,gym:3,goalType:"bulk",months:6,activity:"sedentary",gender:"male",exerciseType:"gym",cardioIntensity:"moderate"};
  const gender=p.gender||"male";
  const exerciseType=p.exerciseType||"gym";
  const cardioIntensity=p.cardioIntensity||"moderate";
  // BMR: Mifflin-St Jeor
  const bmr=10*p.kg+6.25*p.cm-5*p.age+(gender==="male"?5:-161);
  // Activity multiplier
  const jobBase=p.activity==="sedentary"?1.2:p.activity==="moderate"?1.5:1.75;
  // Gym bonus
  const hasGym=exerciseType==="gym"||exerciseType==="gym_cardio";
  const gymBonus=hasGym?(p.gym<=2?0.1:p.gym<=4?0.2:0.3):0;
  // Cardio bonus
  const hasCardio=exerciseType==="cardio"||exerciseType==="gym_cardio";
  const cardioTable={light:{2:0.03,4:0.05,6:0.08},moderate:{2:0.05,4:0.10,6:0.15},intense:{2:0.08,4:0.15,6:0.25}};
  const ciKey=cardioIntensity||"moderate";
  const gymCount=p.gym||3;
  const cardioBonus=hasCardio?(gymCount<=2?cardioTable[ciKey][2]:gymCount<=4?cardioTable[ciKey][4]:cardioTable[ciKey][6]):0;
  const actMul=Math.round((jobBase+gymBonus+cardioBonus)*100)/100;
  const tdee=Math.round(bmr*actMul);
  const diff=p.goalKg-p.kg;
  const goal=p.goalType||"bulk";
  // Block: none + bulk
  const effectiveGoal=(exerciseType==="none"&&goal==="bulk")?"maintain":goal;
  // Macro lookup: gender × exerciseType × goal
  const macroTable={
    male:{
      gym:{bulk:{p:2,c:4,f:0.8},cut:{p:2.3,c:2.5,f:0.8},maintain:{p:1.8,c:3.5,f:0.8}},
      gym_cardio:{bulk:{p:1.8,c:3.8,f:0.8},cut:{p:2.0,c:2.3,f:0.8},maintain:{p:1.6,c:3.2,f:0.8}},
      cardio:{bulk:{p:1.6,c:3.5,f:0.8},cut:{p:1.8,c:2.0,f:0.8},maintain:{p:1.5,c:3.0,f:0.8}},
      none:{bulk:{p:1.2,c:2.5,f:0.7},cut:{p:1.5,c:2.0,f:0.7},maintain:{p:1.2,c:2.5,f:0.7}},
    },
    female:{
      gym:{bulk:{p:1.8,c:3.5,f:1.0},cut:{p:2.0,c:2.2,f:0.9},maintain:{p:1.6,c:3.0,f:1.0}},
      gym_cardio:{bulk:{p:1.6,c:3.2,f:1.0},cut:{p:1.8,c:2.0,f:0.9},maintain:{p:1.5,c:2.8,f:1.0}},
      cardio:{bulk:{p:1.5,c:3.0,f:0.9},cut:{p:1.6,c:2.0,f:0.9},maintain:{p:1.4,c:2.8,f:0.9}},
      none:{bulk:{p:1.0,c:2.5,f:0.8},cut:{p:1.3,c:2.0,f:0.8},maintain:{p:1.0,c:2.5,f:0.8}},
    },
  };
  const ratios=macroTable[gender]?.[exerciseType]?.[effectiveGoal]||macroTable.male.gym.maintain;
  let protein=Math.round(p.kg*ratios.p);
  let carb=Math.round(p.kg*ratios.c);
  let fat=Math.round(p.kg*ratios.f);
  if(fat<Math.round(p.kg*0.7))fat=Math.round(p.kg*0.7);
  // Surplus/deficit based on timeline
  const months=p.months||4;
  const totalDiff=Math.abs(diff);
  const perMonth=months>0?Math.round(totalDiff/months*10)/10:0;
  const perWeek=months>0?Math.round(totalDiff/(months*4.33)*10)/10:0;
  let calAdjust=0;
  if(effectiveGoal==="bulk"){calAdjust=perWeek<=0.25?200:perWeek<=0.5?350:500;}
  else if(effectiveGoal==="cut"){calAdjust=perWeek<=0.25?-200:perWeek<=0.5?-400:-600;}
  const calTarget=tdee+calAdjust;
  const calActual=protein*4+carb*4+fat*9;
  // Adjust carb to match calTarget
  const carbAdj=Math.round((calTarget-protein*4-fat*9)/4);
  if(carbAdj>0)carb=carbAdj;
  const carbRest=Math.round(carb*0.75);
  const calRest=protein*4+carbRest*4+fat*9;
  const fiber=25;
  const bmi=Math.round((p.kg/(p.cm/100)**2)*10)/10;
  const safe=effectiveGoal==="bulk"?perWeek<=0.5:effectiveGoal==="cut"?perWeek<=0.75:true;
  const pRatio=ratios.p+"g/kg";
  const cRatio=ratios.c+"g/kg";
  const fRatio=ratios.f+"g/kg";
  const calFinal=protein*4+carb*4+fat*9;
  return{tdee,calTarget:calFinal,protein,fat,fiber,carb,carbRest,calRest,bmi,diff,perMonth,perWeek,months,safe,goal:effectiveGoal,fatPct:Math.round(fat*9/calFinal*100),actMul,bmr:Math.round(bmr),pRatio,cRatio,fRatio};
}

const defaultProfile={cm:170,kg:65,age:25,goalKg:70,gym:3,goalType:"bulk",months:6,activity:"sedentary",gender:"male",exerciseType:"gym",cardioIntensity:"moderate"};

export default function App(){
  const {user,loading,signOut}=useAuth();
  const [tab,setTab]=useState("dashboard");
  const {profile,setProfile,loading:profileLoading}=useProfile(user?.id);
  const {weightLog,addWeight,deleteWeight,resetWeights,setWeightLog,loading:weightLoading}=useWeightLog(user?.id);
  const {loaded:userDataLoaded,meals:cloudMeals,getMeals,getMealHistory,foodCache,saveMealToCloud,saveFoodCache,deleteFoodCache}=useUserData(user?.id);
  const {settings:appSettings,isAdmin,saveSetting}=useAppSettings(user?.id);
  const macro=calcMacro(profile||defaultProfile);
  const mob=useIsMobile();

  if(loading||profileLoading||!profile) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",fontFamily:"Inter,sans-serif",fontSize:16,color:"#666"}}>⏳ Đang tải...</div>;
  if(!user) return <LoginScreen onLogin={()=>window.location.reload()}/>;
  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",padding:mob?"0 10px 10px 10px":"16px 20px",maxWidth:700,margin:"0 auto",overflowX:"hidden",width:"100%",boxSizing:"border-box"}}>
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:99,background:"#111",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,paddingTop:"calc(env(safe-area-inset-top, 8px) + 8px)",paddingBottom:mob?12:10,paddingLeft:"max(12px, env(safe-area-inset-left, 12px))",paddingRight:"max(12px, env(safe-area-inset-right, 12px))",maxWidth:700,margin:"0 auto",boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,flex:"1 1 auto",minWidth:0}}>
        <div onClick={()=>{
          if(confirm("Xóa cache và cập nhật phiên bản mới?")){
            caches.keys().then(names=>Promise.all(names.map(n=>caches.delete(n)))).then(()=>{
              if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));}
              window.location.reload(true);
            });
          }
        }} style={{width:mob?32:42,height:mob?32:42,background:"linear-gradient(135deg,#DC2626,#F59E0B)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:mob?18:22,flexShrink:0,cursor:"pointer"}}>🏋️</div>
        <div>
          <div style={{fontSize:mob?14:20,fontWeight:900,letterSpacing:"-0.02em",color:"#fff"}}>MEAL TRACKER</div>
          <div style={{fontSize:mob?9:12,fontWeight:700,color:"#F87171"}}>Phát triển bởi Việt Anh Seoer</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"row",alignItems:"center",gap:8}}>
        <div style={{fontSize:mob?11:13,fontWeight:700,color:"#ccc"}}>👤 {user.user_metadata?.username||user.email}</div>
        <button onClick={signOut} style={{padding:"5px 14px",fontSize:11,fontWeight:700,background:"rgba(220,38,38,0.15)",color:"#F87171",border:"1px solid #F87171",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>Đăng xuất</button>
      </div>
    </div>
    <div style={{paddingTop:"calc(env(safe-area-inset-top, 8px) + 72px)",paddingBottom:mob?100:0}}>
    {mob?<>
      {/* MOBILE: separate views per tab */}
      {tab==="dashboard"&&<Dashboard weightLog={weightLog} profile={profile} macro={macro} getMeals={getMeals} appSettings={appSettings}/>}
      {tab==="profile"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={setProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="profile"/>}
      {tab==="meals"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={setProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="meals"/>}
      {tab==="report"&&<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} appSettings={appSettings} mob={mob}/>}
      {tab==="settings"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={setProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings"/>}

      {/* Bottom nav — iOS style */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:99,background:"rgba(255,255,255,0.97)",borderTop:"0.5px solid rgba(0,0,0,0.12)",display:"flex",paddingTop:6,paddingBottom:"max(18px, env(safe-area-inset-bottom, 18px))"}}>
        {[
          {id:"dashboard",icon:"📊",label:"Tổng quan"},
          {id:"profile",icon:"👤",label:"Hồ sơ"},
          {id:"meals",icon:"🍽️",label:"Bữa ăn"},
          {id:"report",icon:"📈",label:"Báo cáo"},
          {id:"settings",icon:"⚙️",label:"Cài đặt"},
        ].map(t=>{const a=tab===t.id;return <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"4px 0"}}>
          <span style={{fontSize:22}}>{t.icon}</span>
          <span style={{fontSize:10,fontWeight:a?600:400,color:a?"#DC2626":"#8E8E93"}}>{t.label}</span>
        </div>;})}
      </div>
    </>:<>
      {/* PC: header tabs + existing layout */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`2.5px solid ${C.border}`}}>
        {[{id:"dashboard",l:"📊 Dashboard"},{id:"report",l:"📈 Báo cáo"},{id:"admin",l:"⚙️ Admin"}].map(t=>
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"10px 18px",fontSize:14,fontWeight:tab===t.id?900:600,border:"none",background:"transparent",cursor:"pointer",
            color:tab===t.id?"#111":C.t3,borderBottom:tab===t.id?"3px solid #DC2626":"3px solid transparent",fontFamily:"inherit",
          }}>{t.l}</button>
        )}
      </div>
      {tab==="dashboard"?<Dashboard weightLog={weightLog} profile={profile} macro={macro} getMeals={getMeals} appSettings={appSettings}/>:tab==="report"?<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} appSettings={appSettings} mob={mob}/>:<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={setProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting}/>}
    </>}
    </div>
  </div>;
}
