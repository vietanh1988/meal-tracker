import { useState, useEffect, useCallback } from "react";
import { C, card } from "./theme";
import { todayVN, addDays, weekRange, monthRange, dateList, weekdayShort, fmtVN, diffDays } from "./lib/dateVN";
import { eatenTotals } from "./lib/mealMath";

export function ReportView({weightLog,profile,macro,getMealHistory,getDailyLogs,appSettings,mob}){
  const [period,setPeriod]=useState("month"); // "week" or "month"
  const [offset,setOffset]=useState(0); // 0=current, -1=prev, etc
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);

  // Calculate date range
  const getDateRange=useCallback(()=>{
    const today=todayVN();
    if(period==="week"){
      const {start,end}=weekRange(addDays(today,offset*7));
      return{start,end,label:`${fmtVN(start)} - ${fmtVN(end)}`};
    }else{
      const [y,m]=today.split("-").map(Number);
      const dt=new Date(Date.UTC(y,m-1+offset,1));
      const ref=dt.toISOString().slice(0,10);
      const {start,end}=monthRange(ref);
      return{start,end,label:`Tháng ${dt.getUTCMonth()+1}, ${dt.getUTCFullYear()}`};
    }
  },[period,offset]);

  // Chỉ dùng giá trị NGUYÊN THUỶ (number/string) làm dependency, KHÔNG dùng thẳng
  // object weightLog/profile/macro — vì App.jsx tạo object mới mỗi lần render dù
  // dữ liệu bên trong không đổi, khiến useEffect bị hiểu nhầm là "có thay đổi"
  // và chạy lại liên tục (gây nhấp nháy "Đang tải báo cáo..." không dừng).
  const weightLen=weightLog?.length||0;
  const firstKg=weightLog?.length>0?weightLog[0].kg:null;
  const lastKg=weightLog?.length>0?weightLog[weightLog.length-1].kg:null;
  const profileKg=profile?.kg;
  const profileGoalKg=profile?.goalKg;
  const macroCalTarget=macro?.calTarget;
  const macroProtein=macro?.protein;

  const macroCalRest=macro?.calRest;
  // Báo cáo CHỈ tính các bữa ĐÃ ĂN (đã tick / ghi từ ảnh) — không cộng thực đơn chưa ăn.
  // Ngày được tính là "có ghi" khi có ít nhất 1 bữa đã ăn.
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      const range=getDateRange();
      const byDate={};
      const dailyLogs=getDailyLogs?await getDailyLogs(range.start,range.end):[];
      if(cancelled)return;
      (dailyLogs||[]).forEach(d=>{
        const meals=Array.isArray(d.meals)?d.meals:[];
        const eaten=Array.isArray(d.eaten_meals)?d.eaten_meals:[];
        const eatenMealsArr=meals.filter(m=>eaten.includes(m.meal_id||m.id));
        if(eatenMealsArr.length===0)return;
        const t=eatenTotals(meals,eaten);
        byDate[d.log_date]={
          cal:Math.round(t.cal),p:t.p,c:t.c,f:t.f,fiber:t.fiber,
          dayType:d.day_type==="rest"?"rest":"train",
          items:eatenMealsArr.flatMap(m=>(m.items||[])),
          meals:eatenMealsArr.map(m=>m.meal_id||m.id),
        };
      });
      const today=todayVN();
      const dates=Object.keys(byDate).sort();
      const daysLogged=dates.length;
      // Số ngày tính đến hôm nay (tuần/tháng hiện tại chưa hết)
      const lastDay=range.end>today?today:range.end;
      const totalDays=Math.max(0,diffDays(range.start,lastDay)+1);
      const avg=(k,dp=1)=>daysLogged>0?Math.round(dates.reduce((s,d)=>s+byDate[d][k],0)/daysLogged*dp)/dp:0;
      const avgCal=avg("cal",1),avgP=avg("p",10),avgC=avg("c",10),avgF=avg("f",10);
      // Mục tiêu theo loại ngày
      const targetOf=(d)=>(byDate[d].dayType==="rest"?(macroCalRest||macroCalTarget):macroCalTarget)||2000;
      const target=macroCalTarget||2000;
      const adhereDays=dates.filter(d=>{const tg=targetOf(d);return byDate[d].cal>=tg*0.9&&byDate[d].cal<=tg*1.1;}).length;
      // Streak tính tới hôm nay
      let streak=0;
      for(let i=0,ds=today;i<60;i++,ds=addDays(ds,-1)){if(byDate[ds])streak++;else if(i>0)break;}
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
        dateList(range.start,range.end).forEach(ds=>{
          weeks.push({label:weekdayShort(ds),cal:byDate[ds]?byDate[ds].cal:0,days:byDate[ds]?1:0,date:ds});
        });
      }else{
        for(let ws=range.start;ws<=range.end;ws=addDays(ws,7)){
          const we=addDays(ws,6);
          const wDates=dates.filter(d=>d>=ws&&d<=we);
          const wCal=wDates.length>0?Math.round(wDates.reduce((s,d)=>s+byDate[d].cal,0)/wDates.length):0;
          weeks.push({label:`T${weeks.length+1}`,cal:wCal,days:wDates.length});
        }
      }
      // Weight data
      const startKg=firstKg!==null?firstKg:profileKg;
      const curKg=lastKg!==null?lastKg:profileKg;
      const goalKg=profileGoalKg||startKg;
      const wPct=goalKg!==startKg?Math.round(((curKg-startKg)/(goalKg-startKg))*100):0;

      if(cancelled)return;
      setData({range,byDate,dates,daysLogged,totalDays,avgCal,avgP,avgC,avgF,adhereDays,streak,topFoods,topProtein,weeks,target,startKg,curKg,goalKg,wPct});
      setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[getDailyLogs,getDateRange,weightLen,firstKg,lastKg,profileKg,profileGoalKg,macroCalTarget,macroCalRest,macroProtein]);

  const range=getDateRange();

  if(loading)return <div style={{textAlign:"center",padding:40,color:C.t3}}>Đang tải báo cáo...</div>;
  if(!data||data.daysLogged===0)return <div>
    {mob&&<div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:18,fontWeight:900,color:C.t1}}>Báo cáo</div>
        <div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:3}}>Thống kê calo & macro theo tuần hoặc tháng</div>
      </div>
      <span style={{fontSize:28,flexShrink:0,marginLeft:12}}>📊</span>
    </div>}
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
    {mob&&<div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
      <div>
        <div style={{fontSize:18,fontWeight:900,color:C.t1}}>Báo cáo</div>
        <div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:3}}>Thống kê calo & macro theo tuần hoặc tháng</div>
      </div>
      <span style={{fontSize:28,flexShrink:0,marginLeft:12}}>📊</span>
    </div>}
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
      <div style={{...card,padding:12,marginBottom:0}}><div style={{fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.04em"}}>TB Đạm</div><div style={{fontSize:22,fontWeight:700}}>{data.avgP}g</div><div style={{fontSize:11,marginTop:2,color:data.avgP>=macro.protein*0.9?"#22C55E":"#EF4444"}}>{data.avgP>=macro.protein*0.9?`✓ ${Math.round(data.avgP/macro.protein*100)}%`:`Thiếu ${Math.round(macro.protein-data.avgP)}g`}</div></div>
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
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#007AFF"}}/> Đạm</span><span style={{fontWeight:700}}>{data.avgP}g</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F3F4F6"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#5AC8FA"}}/> Tinh bột</span><span style={{fontWeight:700}}>{data.avgC}g</span></div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}><span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:10,height:10,borderRadius:3,background:"#8E8E93"}}/> Chất béo</span><span style={{fontWeight:700}}>{data.avgF}g</span></div>
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
          <div style={{fontSize:13,fontWeight:700,color:"#007AFF",marginBottom:8}}>🥩 Top nguồn Đạm</div>
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
