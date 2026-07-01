import { useRef, useState, useEffect } from "react";
import { C } from "./theme";

export function WeightBarChart({weightLog,goalKg,goalType,startKg,mob}){
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
