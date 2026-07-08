import { useState } from "react";
import { C, card, inp, redBtn } from "../theme";
import { ALL_MEALS } from "../mealConstants";
import { SlidingTabs } from "../SlidingTabs";
import { estimateGram } from "../lib/usdaService";
import { applyMealEngineToTemplate } from "../mealEngine";

export function MealsTab({
mob, profile, setProfile, macro, appSettings, isAdmin, saveSetting,
mealMode, setMealMode, dayType, setDayType,
showMealSettings, setShowMealSettings, mealConfig, setMealConfig,
allFoodItems, setAllFoodItems, userHasEdited, setUserHasEdited,
foodItems, setFoodItems, aiResult, setAiResult, aiLoading, aiError, setAiError,
aiProvider, callAI, mealNames,
saveMealToCloud, saveFoodCache, savePendingFoodCache, deleteFoodCache, getMeals,
weeklyTemplates, saveWeeklyTemplate, getWeeklyTemplate, deleteWeeklyTemplate,
defaultTemplates, refreshDefaultTemplates, applyTemplate,
showSaveTpl, setShowSaveTpl, expandedTpl, setExpandedTpl,
tplFilter, setTplFilter, showAssignDays, setShowAssignDays,
assignSelectedDays, setAssignSelectedDays, weeklyBundles,
}) {
const [dietTab, setDietTab] = useState(profile.dietStrategy === "low_carb" ? "low_carb" : profile.dietStrategy === "keto" ? "keto" : "balance");
const [appliedTemplate, setAppliedTemplate] = useState(null);
const [expandedBundle, setExpandedBundle] = useState(null);
const [kmMode, setKmMode] = useState("template"); // template | bundle — chỉ dùng trong Kho mẫu
const MODE_TITLE={tu_nhap:"Nhập bữa ăn",lich_tuan:"Lịch tuần",kho_mau:"Kho mẫu"};
const MODE_DESC={tu_nhap:"Nhập thức ăn → nhấn \"Tính macro\" → trả kết quả → Lưu bữa ăn → Lưu vào lịch tuần (nếu muốn)",lich_tuan:"Xem & chỉnh thực đơn theo từng ngày trong tuần",kho_mau:`Chọn template mẫu do admin tạo sẵn${(defaultTemplates||[]).length>0?` (${(defaultTemplates||[]).length} mẫu)`:""}`};
// dayType là state DÙNG CHUNG toàn bộ MealsTab (Tự nhập/Lịch tuần/Kho mẫu đều
// đọc chung 1 biến) — nếu vừa thao tác ở chỗ khác để lại dayType sai, mở Kho
// mẫu lên sẽ vẫn giữ nguyên trạng thái cũ, dễ áp nhầm mẫu Tập/Nghỉ. Nên mỗi
// lần bấm vào tab Kho mẫu, luôn ép về ĐÚNG loại ngày thật hôm nay trước.
const todayRealDayType=()=>{
try{const s=appSettings.gymDays;const gd=s?JSON.parse(s):profile.gymDays||[0,2,4,5];const idx=new Date().getDay();const mapped=idx===0?6:idx-1;return gd.includes(mapped)?"train":"rest";}catch(e){return "train";}
};
return (
<div style={{...card,padding:mob?"12px 10px":"16px 18px"}}>
{!mob?<div style={{display:"grid",gridTemplateColumns:"63% 35%",gap:20,marginBottom:14,alignItems:"center"}}>
<div>
<div style={{fontSize:17,fontWeight:800,color:C.t1}}>{MODE_TITLE[mealMode]}</div>
<div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:2}}>{MODE_DESC[mealMode]}</div>
</div>
<div style={{display:"flex",gap:4,background:C.surface,borderRadius:12,padding:4}}>
{[{id:"tu_nhap",icon:"✏️",label:"Tự nhập"},{id:"lich_tuan",icon:"📅",label:"Lịch tuần"},{id:"kho_mau",icon:"📚",label:"Kho mẫu"}].map(t=><div key={t.id} onClick={()=>{setMealMode(t.id);if(t.id==="kho_mau"){if(refreshDefaultTemplates)refreshDefaultTemplates();setDayType(todayRealDayType());}}} style={{flex:1,padding:"10px 0",borderRadius:10,fontSize:14,fontWeight:mealMode===t.id?700:500,color:mealMode===t.id?C.primary:C.t2,background:mealMode===t.id?"#fff":"none",cursor:"pointer",boxShadow:mealMode===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none",textAlign:"center"}}>{t.icon} {t.label}</div>)}
</div>
</div>:<>
<div style={{fontSize:19,fontWeight:800,color:C.t1}}>{MODE_TITLE[mealMode]}</div>
<div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:2,marginBottom:12}}>{MODE_DESC[mealMode]}</div>
<SlidingTabs tabs={[{id:"tu_nhap",icon:"✏️",label:"Tự nhập"},{id:"lich_tuan",icon:"📅",label:"Lịch tuần"},{id:"kho_mau",icon:"📚",label:"Kho mẫu"}]} active={mealMode} onChange={id=>{setMealMode(id);if(id==="kho_mau"){if(refreshDefaultTemplates)refreshDefaultTemplates();setDayType(todayRealDayType());}}} style={{marginBottom:16}}/>
</>}

{/* === MODE: Tự nhập — all meals in one flow === */}
{mealMode==="tu_nhap"&&<div style={!mob?{display:"grid",gridTemplateColumns:"63% 35%",gap:20,alignItems:"start"}:{}}><div>
<div style={{height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)",marginBottom:14}}/>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
<SlidingTabs tabs={[{id:"train",icon:"💪",label:"Ngày tập"},{id:"rest",icon:"😴",label:"Ngày nghỉ"}]} active={dayType} onChange={dt=>{setDayType(dt);setAiResult(null);}}/>
{!appliedTemplate&&<div onClick={()=>setShowMealSettings(!showMealSettings)} style={{padding:"5px 10px",borderRadius:16,fontSize:11,fontWeight:700,background:"#FEF3C7",color:"#92400E",border:"1.5px solid #FCD34D",cursor:"pointer"}}>⚙️ Quản lý</div>}
</div>
{appliedTemplate&&<div style={{padding:"8px 12px",background:"#EFF6FF",border:"1.5px solid #BFDBFE",borderRadius:10,marginBottom:14,fontSize:12}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<span style={{color:"#1D4ED8",fontWeight:600}}>📋 Đang dùng mẫu: <b>{appliedTemplate.name}</b> — gram tự tính, khoá sửa</span>
<div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0,marginLeft:10}}>
<div onClick={()=>setShowAssignDays(showAssignDays==="applied"?null:"applied")} style={{color:"#1D4ED8",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>📅 Lưu vào lịch tuần</div>
<div onClick={()=>setAppliedTemplate(null)} style={{color:"#71717A",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Huỷ áp dụng</div>
</div>
</div>
{showAssignDays==="applied"&&(()=>{
// Lưu ĐÚNG dữ liệu gram/macro đã tính sẵn (đã lưu vào meal_logs lúc bấm
// "Dùng cho hôm nay") vào Lịch tuần — không tính lại lần nữa.
const dayKeys3=["thu_2","thu_3","thu_4","thu_5","thu_6","thu_7","cn"];
const dayLabels3=["T2","T3","T4","T5","T6","T7","CN"];
const gd3=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
return <div style={{marginTop:10,paddingTop:10,borderTop:"1.5px solid #BFDBFE"}}>
<div style={{fontSize:12,fontWeight:700,color:"#1D4ED8",marginBottom:8}}>Gán vào ngày nào? (chỉ chọn được ngày cùng loại {dayType==="train"?"Ngày tập":"Ngày nghỉ"})</div>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
{dayLabels3.map((dl,di)=>{
const isGym=gd3.includes(di);
const dt3=isGym?"train":"rest";
const sameType=dt3===dayType;
const isSelected=(assignSelectedDays||[]).includes(dayKeys3[di]);
return <div key={di} onClick={()=>{
if(!sameType)return;
const cur=[...(assignSelectedDays||[])];
if(isSelected) setAssignSelectedDays(cur.filter(d=>d!==dayKeys3[di]));
else setAssignSelectedDays([...cur,dayKeys3[di]]);
}} style={{padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:isSelected?700:600,
background:isSelected?"#1D4ED8":sameType?"#fff":"#F3F4F6",
color:isSelected?"#fff":sameType?"#1D4ED8":"#9CA3AF",
border:`1.5px solid ${isSelected?"#1D4ED8":sameType?"#93C5FD":"#E5E7EB"}`,
cursor:sameType?"pointer":"not-allowed",opacity:sameType?1:0.5,
}}>{dl} ({isGym?"Tập":"Nghỉ"})</div>;
})}
</div>
<button onClick={async()=>{
const days=assignSelectedDays||[];
if(days.length===0){alert("Chọn ít nhất 1 ngày");return;}
const savedMeals=(getMeals?getMeals(dayType):[]).filter(m=>m.items&&m.items.length>0);
if(savedMeals.length===0){alert("Không tìm thấy dữ liệu đã lưu cho hôm nay");return;}
const mealsData=savedMeals.map(m=>({meal_id:m.id,meal_name:m.name,items:m.items}));
const totalCal=savedMeals.reduce((s,m)=>s+m.items.reduce((a,it)=>a+(it.cal||0),0),0);
for(const dayKey of days){
if(saveWeeklyTemplate) await saveWeeklyTemplate(dayKey,dayType,mealsData,Math.round(totalCal));
}
setShowAssignDays(null);
setAssignSelectedDays([]);
const el=document.getElementById("tpl-applied-week-saved");
if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
}} style={{...redBtn,marginTop:0,background:"linear-gradient(135deg,#1D4ED8,#1E40AF)"}}>Lưu</button>
<div id="tpl-applied-week-saved" style={{display:"none",alignItems:"center",gap:8,padding:"8px 12px",background:C.greenBg,borderRadius:8,border:`1.5px solid ${C.green}`,marginTop:8}}>
<span style={{fontSize:12,fontWeight:700,color:"#14532D"}}>✓ Đã lưu vào Lịch tuần!</span>
</div>
</div>;
})()}
</div>}
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
setMealConfig(cfg);if(isAdmin)saveSetting("meal_config",JSON.stringify(cfg));else if(setProfile)setProfile({...profile,mealConfig:cfg});
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
<input value={item.name} readOnly={!!appliedTemplate} onChange={e=>{if(appliedTemplate)return;const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],name:e.target.value};u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} placeholder="VD: Cá kho" style={{...inp,fontSize:mob?13:14,height:mob?38:40,padding:mob?"8px 10px":"10px 12px",opacity:appliedTemplate?0.6:1}}/>
<select value={item.unit||"g"} disabled={!!appliedTemplate} onChange={e=>{const v=e.target.value;const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],unit:v};if(v!=="g"&&v!=="ml"){a[i].gram=estimateGram(item.name,v,item.qty||1);}u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",textAlignLast:"center",padding:"0 2px",fontSize:mob?12:14,height:mob?38:40,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 4px center",paddingRight:"14px",opacity:appliedTemplate?0.6:1}}>
<option value="g">g</option><option value="ml">ml</option><option value="quả">quả</option><option value="hộp">hộp</option><option value="lát">lát</option><option value="bát">bát</option><option value="scoop">Scoop</option>
</select>
<input type="number" inputMode="numeric" value={item.qty||""} readOnly={!!appliedTemplate} onChange={e=>{if(appliedTemplate)return;const q=Math.max(0,Number(e.target.value)||0);const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],qty:q};if(!isWeight&&q>0){a[i].gram=estimateGram(item.name,item.unit,q);}u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",fontSize:mob?12:14,height:mob?38:40,padding:mob?"8px 6px":"10px 12px",opacity:appliedTemplate?0.6:1}} placeholder="SL"/>
<input type="number" inputMode="numeric" value={item.gram===0?0:(item.gram||"")} readOnly={!!appliedTemplate} onChange={e=>{if(appliedTemplate)return;const u={...allFoodItems};const a=[...(u[meal.id]||[])];a[i]={...a[i],gram:Math.max(0,Number(e.target.value)||0)};u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{...inp,textAlign:"center",fontSize:mob?12:14,height:mob?38:40,padding:mob?"8px 6px":"10px 12px",opacity:appliedTemplate?0.5:(isWeight?1:0.7)}} placeholder={isWeight?"Gram":"~Gram"}/>
<button disabled={!!appliedTemplate} onClick={()=>{if(appliedTemplate)return;const u={...allFoodItems};const a=[...(u[meal.id]||[])];a.splice(i,1);if(a.length===0)a.push({name:"",gram:"",unit:"g",qty:1});u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{padding:0,width:mob?24:32,height:mob?24:32,background:C.redBg,color:C.red,borderRadius:8,fontSize:mob?14:16,fontWeight:900,border:"none",cursor:appliedTemplate?"not-allowed":"pointer",opacity:appliedTemplate?0.4:1}}>×</button>
</div>;
})}
{!appliedTemplate&&<button onClick={()=>{const u={...allFoodItems};const a=[...(u[meal.id]||[])];a.push({name:"",gram:"",unit:"g",qty:1});u[meal.id]=a;setAllFoodItems(u);setUserHasEdited(true);}} style={{padding:"6px",fontSize:12,fontWeight:700,background:C.surface,color:C.t3,border:`1.5px dashed ${C.border}`,borderRadius:8,width:"100%",cursor:"pointer",fontFamily:"inherit",marginTop:4}}>+ Thêm món</button>}
{!mob&&aiResult&&(()=>{const items=aiResult.items||[];const sl=items.filter(x=>x._mealId===meal.id);if(sl.length===0)return null;const ms=sl.reduce((a,x)=>({p:a.p+(x.protein||0),c:a.c+(x.carb||0),f:a.f+(x.fat||0),fi:a.fi+(x.fiber||0),cal:a.cal+(x.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});return <div style={{display:"flex",gap:14,marginTop:10,paddingTop:8,borderTop:`1px solid ${C.surface}`,flexWrap:"wrap"}}><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.protein}}/> Protein: <b style={{color:C.t1}}>{Math.round(ms.p)}g</b></div><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.carb}}/> Carb: <b style={{color:C.t1}}>{Math.round(ms.c)}g</b></div><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.fat}}/> Fat: <b style={{color:C.t1}}>{Math.round(ms.f)}g</b></div><div style={{fontSize:12,color:C.t2,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:C.fiber}}/> Chất xơ: <b style={{color:C.t1}}>{Math.round(ms.fi)}g</b></div><div style={{fontSize:12,fontWeight:700,color:C.t1,marginLeft:"auto"}}>{Math.round(ms.cal)} kcal</div></div>;})()}
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
return mealNames.map(meal=>{
const mealFoods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
if(mealFoods.length===0)return null;
const mealItems=items.filter(it=>it._mealId===meal.id);
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
items.forEach(ai=>{const mid=ai._mealId;if(!mid)return;if(!saveByMeal[mid])saveByMeal[mid]=[];const unit=ai.unit||"g";const isW=unit==="g"||unit==="ml";saveByMeal[mid].push({food:ai.name||"",gram:ai.gram||0,unit,qty:ai.qty||1,qty_display:ai.qty_display||(isW?null:`${ai.qty||1} ${unit}`),p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0});});
Object.entries(saveByMeal).forEach(([mid,saveItems])=>{if(saveItems.length>0)saveMealToCloud(mid,dayType,saveItems,dayType!==todayRealDayType());});
if(aiResult._cacheEntries)savePendingFoodCache(aiResult._cacheEntries,aiProvider);
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
const todayMi=todayIdx2===0?6:todayIdx2-1;
const todayMatchesType=(gd.includes(todayMi)?"train":"rest")===dayType;
const defaultDayKey=todayMatchesType?dayKeys2[todayIdx2]:(dayKeys2.find((_,i2)=>{const mi2=i2===0?6:i2-1;return (gd.includes(mi2)?"train":"rest")===dayType;})||dayKeys2[todayIdx2]);
return <div style={{marginTop:12,padding:"16px",background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)",borderRadius:12,border:"2px solid #818CF8"}}>
<div style={{fontSize:15,fontWeight:800,color:"#3730A3",marginBottom:8}}>📅 Lưu vào lịch tuần?</div>
<select id="save-tpl-day" defaultValue={defaultDayKey} style={{...inp,marginBottom:12}}>
{dayLabels2.map((l,i2)=>{const mi2=i2===0?6:i2-1;const ig=gd.includes(mi2);const sameType=(ig?"train":"rest")===dayType;return <option key={i2} value={dayKeys2[i2]} disabled={!sameType}>{l} — {ig?"Ngày tập":"Ngày nghỉ"}{!sameType?" (khác loại, không chọn được)":""}</option>;})}
</select>
<div style={{fontSize:11,color:"#4338CA",marginBottom:8}}>Chỉ lưu được vào ngày cùng loại ({dayType==="train"?"Ngày tập":"Ngày nghỉ"}) — tránh lệch dữ liệu.</div>
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
{(()=>{
// Ưu tiên aiResult (vừa bấm "Tính macro tất cả") — nếu chưa có, dùng luôn
// dữ liệu ĐÃ LƯU (vd vừa áp mẫu qua Kho mẫu/Gói tuần, Engine đã tính sẵn
// và ghi vào meal_logs rồi) — không bắt user bấm lại để thấy tổng, tránh
// 2 đường tính độc lập cho ra 2 số hơi khác nhau gây hoang mang.
const savedItems=(getMeals?getMeals(dayType):[]).flatMap(m=>(m.items||[]).map(it=>({protein:it.p||0,carb:it.c||0,fat:it.f||0,fiber:it.fiber||0,cal:it.cal||0})));
const summaryItems=(aiResult&&aiResult.items&&aiResult.items.length>0)?aiResult.items:(savedItems.length>0?savedItems:null);
return summaryItems?(()=>{const s=summaryItems.reduce((a,i)=>({p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),fi:a.fi+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});const heroCal=dayType==="train"?(macro.calTarget||0):(macro.calRest||macro.calTarget||0);const heroP=macro.protein||0;const heroC=dayType==="train"?(macro.carb||0):(macro.carbRest||macro.carb||0);const heroF=macro.fat||0;const heroFi=macro.fiber||0;const pct=heroCal>0?Math.min(Math.round(s.cal/heroCal*100),120):0;return <><div style={{textAlign:"center",marginBottom:18,paddingBottom:16,borderBottom:`1px solid ${C.surface}`}}><div style={{fontSize:36,fontWeight:800,color:C.primary}}>{Math.round(s.cal).toLocaleString()}</div><div style={{fontSize:14,color:C.t2}}>/ <b style={{color:C.t1}}>{heroCal}</b> kcal mục tiêu</div><div style={{height:8,background:C.surface,borderRadius:4,overflow:"hidden",marginTop:10}}><div style={{height:"100%",borderRadius:4,width:`${Math.min(pct,100)}%`,background:`linear-gradient(90deg,${pct<95?"#F59E0B":pct<=105?"#16A34A":"#DC2626"},${pct<95?"#B45309":pct<=105?"#34C759":"#EF4444"})`}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,fontWeight:700,color:pct<95?"#B45309":pct<=105?"#16A34A":"#DC2626"}}>{pct<95?`⚠️ Còn thiếu ${heroCal-Math.round(s.cal)} kcal`:pct<=105?"✅ Ổn rồi, giữ nhé!":`🔴 Dư ${Math.round(s.cal)-heroCal} kcal`}</span><span style={{fontSize:11,color:C.t2}}>{pct}%</span></div></div>{[{l:"Protein",v:Math.round(s.p),t:heroP,c:C.protein},{l:"Carb",v:Math.round(s.c),t:heroC,c:C.carb},{l:"Fat",v:Math.round(s.f),t:heroF,c:C.fat},{l:"Chất xơ",v:Math.round(s.fi),t:heroFi,c:C.fiber}].map(r=><div key={r.l} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><div style={{fontSize:13,fontWeight:600,width:70,display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:"50%",background:r.c,flexShrink:0}}/>{r.l}</div><div style={{flex:1,height:6,background:C.surface,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",borderRadius:3,width:`${Math.min(r.t>0?r.v/r.t*100:0,100)}%`,background:r.c}}/></div><div style={{fontSize:12,fontWeight:700,width:80,textAlign:"right"}}>{r.v}g <span style={{fontWeight:400,color:C.t2}}>/ {r.t}g</span></div></div>)}</>;})():<div style={{textAlign:"center",padding:"40px 20px",color:C.t3}}><div style={{fontSize:36,marginBottom:8}}>📊</div><div style={{fontSize:14,fontWeight:600,color:C.t2}}>Chưa có dữ liệu</div><div style={{fontSize:12,color:C.t3,marginTop:4}}>Nhấn "Tính macro tất cả" để xem kết quả</div></div>;
})()}
</div>
{(()=>{
const savedItems2=(getMeals?getMeals(dayType):[]).flatMap(m=>(m.items||[]).map(it=>({protein:it.p||0,carb:it.c||0,fat:it.f||0,fiber:it.fiber||0,cal:it.cal||0})));
const summaryItems2=(aiResult&&aiResult.items&&aiResult.items.length>0)?aiResult.items:(savedItems2.length>0?savedItems2:null);
if(!summaryItems2)return null;
const s=summaryItems2.reduce((a,i)=>({p:a.p+(i.protein||0),c:a.c+(i.carb||0),f:a.f+(i.fat||0),fi:a.fi+(i.fiber||0),cal:a.cal+(i.cal||0)}),{p:0,c:0,f:0,fi:0,cal:0});
const heroCal=dayType==="train"?(macro.calTarget||0):(macro.calRest||macro.calTarget||0);
const heroP=macro.protein||0;
const heroC=dayType==="train"?(macro.carb||0):(macro.carbRest||macro.carb||0);
const heroF=macro.fat||0;
const heroFi=macro.fiber||0;
// FIX: dùng chung công thức phạt CẢ 2 CHIỀU (thiếu lẫn dư) với Dashboard.jsx —
// trước đây Protein chỉ cap ở 100 (Math.min), KHÔNG BAO GIỜ bị trừ điểm dù dư
// rất nhiều, khác với Calo/Carb/Fat. Giờ đồng bộ đúng yêu cầu: dư đạm nhiều
// cũng phải bị trừ điểm như các macro khác.
const scoreSym=(actual,target,tol)=>{if(!target||target<=0)return 0;if(actual<=0)return 0;const diff=Math.abs(actual/target-1);if(diff<=tol)return 100;return Math.max(0,Math.round(100-(diff-tol)*200));};
const scores=[];
if(heroCal>0)scores.push(scoreSym(s.cal,heroCal,0.10));
if(heroP>0)scores.push(scoreSym(s.p,heroP,0.10));
if(heroC>0)scores.push(scoreSym(s.c,heroC,0.15));
if(heroF>0)scores.push(scoreSym(s.f,heroF,0.15));
const avg=scores.length>0?Math.round(scores.reduce((a2,b)=>a2+b,0)/scores.length):0;
return <div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div style={{fontSize:14,fontWeight:800,display:"flex",alignItems:"center",gap:8}}>📊 Đánh giá dinh dưỡng</div><div style={{fontSize:22,fontWeight:800,color:avg>=90?"#059669":avg>=70?C.primary:"#D97706"}}>{avg}<span style={{fontSize:13,fontWeight:500,color:C.t2}}>/100</span></div></div>{[{l:"Calo",v:s.cal,t:heroCal},{l:"Protein",v:s.p,t:heroP},{l:"Carb",v:s.c,t:heroC},{l:"Fat",v:s.f,t:heroF},{l:"Chất xơ",v:s.fi,t:heroFi}].map(r2=>{const pct2=r2.t>0?Math.round(r2.v/r2.t*100):0;const ok=pct2>=90&&pct2<=115;return <div key={r2.l} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,padding:"6px 10px",background:C.surface,borderRadius:8,marginBottom:4}}><span style={{color:C.t2}}>{r2.l}</span><span style={{fontWeight:700,color:ok?"#059669":"#D97706"}}>{ok?"✓":"⚠"} {pct2}%</span></div>;})}</div>;})()}
{aiResult&&aiResult.items&&<>
<button onClick={async()=>{const allNames=Object.values(allFoodItems).flat().map(f=>(f.name||"").toLowerCase().trim()).filter(Boolean);if(allNames.length>0&&deleteFoodCache)await deleteFoodCache(allNames);setAiResult(null);const c2=[];mealNames.forEach(meal=>{const foods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());foods.forEach(f=>c2.push({...f,_mealId:meal.id}));});setFoodItems(c2);callAI(true,c2);}} style={{padding:"8px",fontSize:12,fontWeight:700,background:C.surface,color:C.t2,border:`1.5px solid ${C.border}`,borderRadius:10,cursor:"pointer",fontFamily:"inherit",width:"100%",marginBottom:8}}>🔄 Tính lại (bỏ qua cache)</button>
<button onClick={()=>{const items=aiResult.items||[];const saveByMeal={};items.forEach(ai=>{const mid=ai._mealId;if(!mid)return;if(!saveByMeal[mid])saveByMeal[mid]=[];const unit=ai.unit||"g";const isW=unit==="g"||unit==="ml";saveByMeal[mid].push({food:ai.name||"",gram:ai.gram||0,unit,qty:ai.qty||1,qty_display:ai.qty_display||(isW?null:`${ai.qty||1} ${unit}`),p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0});});Object.entries(saveByMeal).forEach(([mid,saveItems])=>{if(saveItems.length>0)saveMealToCloud(mid,dayType,saveItems,dayType!==todayRealDayType());});if(aiResult._cacheEntries)savePendingFoodCache(aiResult._cacheEntries,aiProvider);const el=document.getElementById("meal-saved-pc");if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}}} style={{...redBtn,marginTop:0,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",width:"100%"}}>💾 Lưu bữa ăn hôm nay</button>
<button onClick={()=>setShowSaveTpl(!showSaveTpl)} style={{...redBtn,marginTop:8,background:C.card,color:C.t2,border:`1.5px solid ${C.border}`,width:"100%"}}>📅 Gán vào lịch tuần</button>
{showSaveTpl&&(()=>{
const dayKeys2=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
const dayLabels2=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"];
const todayIdx2=new Date().getDay();
const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
const todayMi=todayIdx2===0?6:todayIdx2-1;
const todayMatchesType=(gd.includes(todayMi)?"train":"rest")===dayType;
const defaultDayKey=todayMatchesType?dayKeys2[todayIdx2]:(dayKeys2.find((_,i2)=>{const mi2=i2===0?6:i2-1;return (gd.includes(mi2)?"train":"rest")===dayType;})||dayKeys2[todayIdx2]);
return <div style={{marginTop:12,padding:"16px",background:"linear-gradient(135deg,#EEF2FF,#E0E7FF)",borderRadius:12,border:"2px solid #818CF8"}}>
<div style={{fontSize:15,fontWeight:800,color:"#3730A3",marginBottom:8}}>📅 Lưu vào lịch tuần?</div>
<select id="save-tpl-day-pc" defaultValue={defaultDayKey} style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontFamily:"inherit",marginBottom:12}}>
{dayLabels2.map((l,i2)=>{const mi2=i2===0?6:i2-1;const ig=gd.includes(mi2);const sameType=(ig?"train":"rest")===dayType;return <option key={i2} value={dayKeys2[i2]} disabled={!sameType}>{l} — {ig?"Ngày tập":"Ngày nghỉ"}{!sameType?" (khác loại ngày, không chọn được)":""}</option>;})}
</select>
<div style={{fontSize:11,color:"#4338CA",marginBottom:8}}>Chỉ lưu được vào ngày cùng loại ({dayType==="train"?"Ngày tập":"Ngày nghỉ"}) — tránh lệch dữ liệu.</div>
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
{isSelected&&hasTpl&&<div style={{...card,marginTop:-4,borderTopLeftRadius:0,borderTopRightRadius:0,border:`2px solid ${C.red}`,borderTop:`1.5px solid ${C.border}`}}>
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
<button onClick={(e)=>{
e.stopPropagation();
setDayType(tpl.day_type);
// Nạp ĐÚNG món ăn đã lưu của ngày này vào form — trước đây chỉ đổi tab,
// không nạp gì cả, khiến "Sửa" hiện dữ liệu sai/trống, dễ gây nhầm lẫn.
const init={};
ALL_MEALS.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});
(tpl.meals||[]).forEach(m=>{
const items=(m.items||[]).map(it=>({name:it.food||it.name||"",gram:it.gram===0?0:(it.gram||""),unit:it.unit||"g",qty:it.qty||1}));
if(items.length>0)init[m.meal_id]=items;
});
setAllFoodItems(init);
setUserHasEdited(true);
setMealMode("tu_nhap");
setExpandedTpl(null);
}} style={{flex:1,padding:"10px",fontSize:12,fontWeight:800,border:`1.5px solid ${C.border}`,borderRadius:10,background:C.card,color:C.t2,cursor:"pointer",fontFamily:"inherit"}}>✏️ Sửa</button>
<button onClick={async(e)=>{e.stopPropagation();if(window.confirm(`Xóa lịch tuần ${dayLabels[i]}?`)){if(deleteWeeklyTemplate)await deleteWeeklyTemplate(dayKeys[i]);setExpandedTpl(null);}}} style={{padding:"10px 16px",fontSize:12,fontWeight:700,border:"1.5px solid #FCA5A5",borderRadius:10,background:"#FEF2F2",color:"#DC2626",cursor:"pointer",fontFamily:"inherit"}}>🗑️ Xóa</button>
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
const goalMap={bulk:"tang_co",cut:"giam_mo",maintain:"duy_tri"};
const userGoal=goalMap[macro.goal]||"duy_tri";
const isGiamMo=userGoal==="giam_mo";
const goalLabel={tang_co:"🏋️ Tăng cơ",giam_mo:"🔥 Giảm mỡ",duy_tri:"⚖️ Duy trì"}[userGoal];
const dietLabel={balance:"Cân bằng",low_carb:"Low-carb",keto:"Keto"};

let filtered=(defaultTemplates||[]).filter(t=>t.goal_type===userGoal&&t.day_type===dayType);
if(isGiamMo) filtered=filtered.filter(t=>(t.diet_strategy||"balance")===dietTab);

return <div>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
<div style={{fontSize:13,fontWeight:700,color:C.t2}}>{goalLabel}</div>
<div style={{display:"flex",gap:4,background:C.surface,borderRadius:10,padding:3}}>
{[{id:"train",icon:"💪",label:"Ngày tập"},{id:"rest",icon:"😴",label:"Ngày nghỉ"}].map(d=>
<div key={d.id} onClick={()=>{setKmMode("template");setDayType(d.id);}} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:(kmMode==="template"&&dayType===d.id)?700:500,color:(kmMode==="template"&&dayType===d.id)?C.primary:C.t2,background:(kmMode==="template"&&dayType===d.id)?"#fff":"none",cursor:"pointer",boxShadow:(kmMode==="template"&&dayType===d.id)?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>{d.icon} {d.label}</div>
)}
<div onClick={()=>setKmMode("bundle")} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:kmMode==="bundle"?700:500,color:kmMode==="bundle"?C.primary:C.t2,background:kmMode==="bundle"?"#fff":"none",cursor:"pointer",boxShadow:kmMode==="bundle"?"0 1px 3px rgba(0,0,0,0.08)":"none"}}>🗓️ Gói tuần</div>
</div>
</div>
{kmMode==="bundle"?(()=>{
const dayKeys=["thu_2","thu_3","thu_4","thu_5","thu_6","thu_7","cn"];
const dayLabels=["Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7","Chủ nhật"];
const filteredBundles=(weeklyBundles||[]).filter(b=>b.goal_type===userGoal);
return <div>
{filteredBundles.length>0?<div style={{display:"flex",flexDirection:"column",gap:8}}>
{filteredBundles.map(b=>{
const isOpen=expandedBundle===b.id;
const filledDays=dayKeys.filter(dk=>b.days&&b.days[dk]);
return <div key={b.id} style={{background:C.card,border:`1.5px solid ${isOpen?C.red:C.border}`,borderRadius:12,overflow:"hidden"}}>
<div style={{padding:mob?"12px":"14px 16px",cursor:"pointer"}} onClick={()=>setExpandedBundle(isOpen?null:b.id)}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<span style={{fontSize:mob?13:14,fontWeight:800,color:C.t1}}>🗓️ {b.name}</span>
<span style={{fontSize:12,color:C.t3}}>{isOpen?"▲":"▼"}</span>
</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3,marginTop:4}}>{filledDays.length}/7 ngày đã gán</div>
</div>
{isOpen&&<div style={{borderTop:`1.5px solid ${C.border}`,padding:mob?"12px":"14px 16px"}}>
<div style={{fontSize:12,color:C.t2,marginBottom:10}}>Xem trước — mỗi ngày tự tính gram theo đúng target của bạn</div>
{dayKeys.map((dk,i)=>{
const tplId=b.days&&b.days[dk];
const tpl=(defaultTemplates||[]).find(t=>t.id===tplId);
return <div key={dk} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:C.surface,borderRadius:8,marginBottom:6,fontSize:12}}>
<span style={{color:C.t1,fontWeight:600}}>{dayLabels[i]} {tpl?(tpl.day_type==="train"?"· 💪 tập":"· 😴 nghỉ"):""}</span>
<span style={{color:C.t3}}>{tpl?tpl.name:"— chưa gán —"}</span>
</div>;
})}
<button onClick={async()=>{
if(!confirm(`Áp dụng "${b.name}" cho cả 7 ngày? Ngày nào đã có dữ liệu Lịch tuần sẽ bị ghi đè.`))return;
for(const dk of dayKeys){
const tplId=b.days&&b.days[dk];
if(!tplId)continue;
const tpl=(defaultTemplates||[]).find(t=>t.id===tplId);
if(!tpl)continue;
const dailyTarget={
cal:tpl.day_type==="train"?(macro.calTarget||0):(macro.calRest||macro.calTarget||0),
p:macro.protein||0,
c:tpl.day_type==="train"?(macro.carb||0):(macro.carbRest||macro.carb||0),
f:macro.fat||0,
};
const engineTpl=applyMealEngineToTemplate(tpl,dailyTarget);
const mealsData=engineTpl.meals||[];
const totalCal=mealsData.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
if(saveWeeklyTemplate) await saveWeeklyTemplate(dk,tpl.day_type,mealsData,Math.round(totalCal));
}
setExpandedBundle(null);
const el=document.getElementById("bundle-applied");
if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
}} style={{...redBtn,marginTop:8,background:"linear-gradient(135deg,#6366F1,#4F46E5)"}}>Áp dụng cả tuần</button>
</div>}
</div>;
})}
<div id="bundle-applied" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:4}}>
<span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã áp dụng cả tuần! Vào tab Lịch tuần để xem.</span>
</div>
</div>:<div style={{textAlign:"center",padding:"30px 16px"}}>
<div style={{fontSize:32,marginBottom:8}}>🗓️</div>
<div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>Chưa có Gói tuần cho {goalLabel}</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3,lineHeight:1.5}}>{isAdmin?"Vào Admin → Gói tuần để tạo.":"Admin chưa tạo gói tuần cho mục tiêu này."}</div>
</div>}
</div>;
})():<>
{isGiamMo&&<div style={{display:"flex",gap:6,marginBottom:14}}>
{["balance","low_carb","keto"].map(d=>
<div key={d} onClick={()=>setDietTab(d)} style={{padding:"6px 14px",borderRadius:18,fontSize:12,fontWeight:dietTab===d?700:600,background:dietTab===d?C.primaryBg:"#F9FAFB",color:dietTab===d?C.primary:"#6B7280",border:`1.5px solid ${dietTab===d?C.primary:"#E5E7EB"}`,cursor:"pointer"}}>{dietLabel[d]}</div>
)}
</div>}
{filtered.length>0?<div style={{display:"flex",flexDirection:"column",gap:8}}>
{filtered.map(t=>{
const isExpanded=expandedTpl===t.id;
const mealNameMap={"sang":"Bữa sáng","phu_sang":"Phụ sáng","trua":"Bữa trưa","phu_chieu":"Phụ chiều","pre":"Pre-workout","post":"Post-workout","toi":"Bữa tối"};
// Tính sẵn theo đúng target riêng của user NGAY TỪ LÚC XEM — không phải đợi
// bấm "Dùng cho hôm nay" mới tính. Đây chỉ là phép toán JS thuần (không
// gọi mạng/AI gì), macro/100g từng món đã có sẵn trong mẫu — nên tính
// trước cho preview không tốn thêm gì cả.
const dailyTarget={
cal:t.day_type==="train"?(macro.calTarget||0):(macro.calRest||macro.calTarget||0),
p:macro.protein||0,
c:t.day_type==="train"?(macro.carb||0):(macro.carbRest||macro.carb||0),
f:macro.fat||0,
};
const engineTpl=applyMealEngineToTemplate(t,dailyTarget);
const tplMeals=engineTpl.meals||[];
const personalizedTotalCal=tplMeals.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
// Mẫu đang xem có thể khác loại ngày thật hôm nay (user bấm pill Tập/Nghỉ
// trong Kho mẫu chỉ để xem trước) — không cho "Dùng cho hôm nay" trong
// trường hợp đó, tránh ghi nhầm day_type cho đúng ngày hôm nay ở cả
// meal_logs lẫn daily_logs (ảnh hưởng luôn số liệu Báo cáo của ngày đó).
const isTodayType=t.day_type===todayRealDayType();
return <div key={t.id} style={{background:C.card,border:`1.5px solid ${isExpanded?C.red:C.border}`,borderRadius:12,overflow:"hidden"}}>
<div style={{padding:mob?"12px":"14px 16px",cursor:"pointer"}} onClick={()=>setExpandedTpl(isExpanded?null:t.id)}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<span style={{fontSize:12,fontWeight:700,padding:"2px 8px",borderRadius:12,background:t.day_type==="train"?C.primaryBg:"#DBEAFE",color:t.day_type==="train"?"#003D99":"#1E40AF"}}>{t.day_type==="train"?"💪 Tập":"😴 Nghỉ"}</span>
<span style={{fontSize:mob?13:14,fontWeight:800,color:C.t1}}>{t.name||"Template"}</span>
</div>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<span style={{fontSize:16,fontWeight:900,color:C.t1}}>{Math.round(personalizedTotalCal)}</span>
<span style={{fontSize:12,color:C.t3}}>{isExpanded?"▲":"▼"}</span>
</div>
</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3,marginTop:4}}>{tplMeals.length} bữa • {Math.round(personalizedTotalCal)} kcal <span style={{color:C.primary}}>· đã tính riêng cho bạn</span></div>
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
<span>{it.food||it.name} {it.gram!=null?`${it.gram}g`:""}</span>
<span style={{color:C.t3}}>P:{it.p||0} C:{it.c||0} F:{it.f||0} = {it.cal||0}cal</span>
</div>)}
</div>;
})}
<div style={{display:"flex",gap:8,marginTop:12}}>
<button disabled={!isTodayType} onClick={async(e)=>{
e.stopPropagation();
if(!isTodayType)return;
if(applyTemplate){
await applyTemplate(engineTpl);
setAppliedTemplate({id:t.id,name:t.name});
setExpandedTpl(null);
setMealMode("tu_nhap");
setDayType(t.day_type);
const el=document.getElementById("tpl-applied");
if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
}
}} style={{...redBtn,flex:1,marginTop:0,background:isTodayType?"linear-gradient(135deg,#15803D,#166534)":"#E2E8F0",color:isTodayType?"#fff":"#9CA3AF",cursor:isTodayType?"pointer":"not-allowed",opacity:isTodayType?1:0.7}}>📥 Dùng cho hôm nay</button>
<button onClick={(e)=>{e.stopPropagation();setShowAssignDays(showAssignDays===t.id?null:t.id);}} style={{...redBtn,flex:1,marginTop:0,background:"linear-gradient(135deg,#6366F1,#4F46E5)"}}>📅 Lưu vào lịch tuần</button>
</div>
{!isTodayType&&<div style={{fontSize:11,color:"#B45309",fontWeight:600,marginTop:6}}>⚠️ Mẫu này là {t.day_type==="train"?"Ngày tập":"Ngày nghỉ"}, khác với hôm nay ({todayRealDayType()==="train"?"Ngày tập":"Ngày nghỉ"}) — chỉ lưu được vào Lịch tuần cho đúng ngày đó, không áp trực tiếp cho hôm nay.</div>}
{showAssignDays===t.id&&(()=>{
const dayKeys2=["thu_2","thu_3","thu_4","thu_5","thu_6","thu_7","cn"];
const dayLabels2=["T2","T3","T4","T5","T6","T7","CN"];
const gd=(()=>{try{const s=appSettings.gymDays;return s?JSON.parse(s):profile.gymDays||[0,2,4,5];}catch(e){return profile.gymDays||[0,2,4,5];}})();
return <div style={{marginTop:10,padding:12,background:"#EEF2FF",borderRadius:10,border:"1.5px solid #818CF8"}} onClick={e=>e.stopPropagation()}>
{/* dùng lại đúng engineTpl đã tính sẵn, KHÔNG tính lại lần nữa */}
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
const mealsData=engineTpl.meals||[];
const totalCal=mealsData.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
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
<div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>Chưa có mẫu cho {goalLabel}{isGiamMo?` (${dietLabel[dietTab]})`:""}</div>
<div style={{fontSize:12,fontWeight:600,color:C.t3,lineHeight:1.5,marginBottom:12}}>{isAdmin?"Vào Admin → Mẫu để tạo template cho nhóm này.":"Admin chưa tạo mẫu cho mục tiêu này, dùng Tự nhập nhé."}</div>
{!isAdmin&&<div onClick={()=>setMealMode("tu_nhap")} style={{display:"inline-block",padding:"8px 20px",borderRadius:10,fontSize:13,fontWeight:700,color:"#fff",background:C.primary,cursor:"pointer"}}>✏️ Dùng Tự nhập</div>}
</div>}
</>}
</div>;
})()}
</div>
);
}
