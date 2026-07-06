import { useState } from "react";
import { C, card, inp, redBtn } from "../theme";
import { estimateGram } from "../lib/usdaService";
import { getFoodRole } from "../lib/localFoodDB";

export function TemplatesTab({isAdmin, mob, macro, defaultTemplates, saveDefaultTemplate, deleteDefaultTemplate, mealNames, mealsData, callAI, allFoodItems, setAllFoodItems, aiResult, setAiResult, aiLoading, aiError, setAiError, setDayType, setFoodItems, setUserHasEdited, savePendingFoodCache, aiProvider}){
const [expandedId,setExpandedId]=useState(null);
const [editingId,setEditingId]=useState(null);
const [tplGoal,setTplGoal]=useState("tang_co");
const [tplDiet,setTplDiet]=useState("balance");
return (
<div style={{...card,padding:mob?"12px 10px":"16px 18px"}}>
<div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>📚</span><span style={{fontWeight:800,color:C.t1}}>Quản lý Template mẫu</span></div>
<div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:16}}>Tạo template bữa ăn mẫu cho tất cả users xem trong tab Kho mẫu</div>

<div style={{display:"grid",gridTemplateColumns:mob?"1fr":"7fr 3fr",gap:mob?0:20,alignItems:"start"}}>
<div>

{/* Template name + type */}
<div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
<input id="tpl-name" type="text" placeholder="VD: Ngày tập A — Ngực/Vai" style={{...inp,flex:1,minWidth:mob?120:200,fontSize:13,height:38}}/>
<select id="tpl-type" style={{...inp,width:mob?120:140,fontSize:13,height:38,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:"28px"}} onChange={e=>{setDayType(e.target.value);}}>
<option value="train">💪 Ngày tập</option>
<option value="rest">😴 Ngày nghỉ</option>
</select>
<select id="tpl-goal" value={tplGoal} onChange={e=>setTplGoal(e.target.value)} style={{...inp,width:mob?120:130,fontSize:13,height:38,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:"28px"}}>
<option value="tang_co">🏋️ Tăng cơ</option>
<option value="giam_mo">🔥 Giảm mỡ</option>
<option value="duy_tri">⚖️ Duy trì</option>
</select>
{tplGoal==="giam_mo"&&<select id="tpl-diet" value={tplDiet} onChange={e=>setTplDiet(e.target.value)} style={{...inp,width:mob?120:130,fontSize:13,height:38,WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",paddingRight:"28px"}}>
<option value="balance">Cân bằng</option>
<option value="low_carb">Low-carb</option>
<option value="keto">Keto</option>
</select>}
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
<option value="g">g</option><option value="ml">ml</option><option value="quả">quả</option><option value="hộp">hộp</option><option value="lát">lát</option><option value="bát">bát</option><option value="scoop">Scoop</option>
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
return mealNames.map(meal=>{
const mealFoods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
if(mealFoods.length===0)return null;
const mealItems=items.filter(it=>it._mealId===meal.id);
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
const mealsData=[];
mealNames.forEach(meal=>{
const mealItems=items.filter(it=>it._mealId===meal.id);
if(mealItems.length===0)return;
const saveItems=mealItems.map(ai=>({food:ai.name||"",gram:ai.gram||0,unit:ai.unit||"g",qty:ai.qty||1,p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0}));
if(saveItems.length>0)mealsData.push({meal_id:meal.id,meal_name:meal.l,items:saveItems});
});
if(mealsData.length===0){alert("Không có dữ liệu bữa ăn");return;}
// Validate: mỗi bữa phải có đủ ít nhất 1 món đạm + 1 món carb + 1 món béo,
// nếu không Meal Engine không thể tính đúng gram khi user áp dụng mẫu này.
for(const m of mealsData){
const roles=new Set((m.items||[]).map(it=>getFoodRole(it.food)));
const missing=[];
if(!roles.has("protein"))missing.push("đạm");
if(!roles.has("carb"))missing.push("carb");
if(!roles.has("fat"))missing.push("béo");
if(missing.length>0){alert(`${m.meal_name||m.meal_id} đang thiếu món vai trò: ${missing.join(", ")} — thêm món trước khi lưu.`);return;}
}
const totalCal=mealsData.reduce((s,m)=>s+(m.items||[]).reduce((a,it)=>a+(it.cal||0),0),0);
if(saveDefaultTemplate) await saveDefaultTemplate(name,tplType,mealsData,Math.round(totalCal),editingId,tplGoal,tplGoal==="giam_mo"?tplDiet:null);
if(aiResult._cacheEntries&&savePendingFoodCache) savePendingFoodCache(aiResult._cacheEntries,aiProvider);
document.getElementById("tpl-name").value="";
setEditingId(null);
setAiResult(null);
setTplGoal("tang_co");
setTplDiet("balance");
// Reset all food items
const init={};mealNames.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);
const el=document.getElementById("tpl-created");
if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
}} style={{...redBtn,marginTop:12,background:"linear-gradient(135deg,#7C3AED,#6D28D9)"}}>{editingId?"💾 Cập nhật Template":"📚 Lưu thành Template mẫu"}</button>
{editingId&&<button onClick={()=>{
setEditingId(null);
document.getElementById("tpl-name").value="";
setAiResult(null);
const init={};mealNames.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);
}} style={{...inp,marginTop:8,textAlign:"center",cursor:"pointer",fontWeight:700,color:C.t2}}>Hủy sửa</button>}
<div id="tpl-created" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:8}}>
<span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>{editingId?"✓ Đã cập nhật template!":"✓ Template mẫu đã tạo! Users sẽ thấy trong Kho mẫu."}</span>
</div>
</div>}

</div>

<div>
{/* Existing templates list */}
<div style={{marginTop:mob?20:0,borderTop:mob?`2px solid ${C.border}`:"none",paddingTop:mob?16:0}}>
<div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>🗂️</span><span>Templates đã tạo ({(defaultTemplates||[]).length})</span></div>
<div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:16}}>Danh sách mẫu hiện có</div>
{(defaultTemplates||[]).length===0&&<div style={{padding:"20px 14px",textAlign:"center",fontSize:12,color:C.t3,background:C.surface,borderRadius:10}}>Chưa có template nào</div>}
<div style={{display:"grid",gridTemplateColumns:"1fr",gap:10}}>
{(defaultTemplates||[]).map(t=>{
const mealCount=(t.meals||[]).length;
const isTrain=t.day_type==="train";
const isOpen=expandedId===t.id;
return <div key={t.id} style={{...card,padding:"12px 14px",position:"relative",marginBottom:0,cursor:"pointer"}} onClick={()=>setExpandedId(isOpen?null:t.id)}>
<div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
<button onClick={(e)=>{
e.stopPropagation();
const el=document.getElementById("tpl-name");
const selType=document.getElementById("tpl-type");
if(el)el.value=t.name||"";
if(selType)selType.value=t.day_type||"train";
setDayType(t.day_type||"train");
setTplGoal(t.goal_type||"tang_co");
setTplDiet(t.diet_strategy||"balance");
const init={};
mealNames.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});
(t.meals||[]).forEach(m=>{
const items=(m.items||[]).map(it=>({name:it.food||"",gram:it.gram||"",unit:it.unit||"g",qty:it.qty||1}));
if(items.length>0)init[m.meal_id]=items;
});
setAllFoodItems(init);
setAiResult(null);
setEditingId(t.id);
setExpandedId(null);
document.getElementById("tpl-name")?.scrollIntoView({behavior:"smooth",block:"center"});
}} style={{width:22,height:22,borderRadius:6,fontSize:11,color:C.primary,background:C.surface,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
<button onClick={async(e)=>{
e.stopPropagation();
if(!confirm("Xóa template \""+t.name+"\"?"))return;
if(deleteDefaultTemplate) await deleteDefaultTemplate(t.id);
}} style={{width:22,height:22,borderRadius:6,fontSize:11,color:C.t3,background:C.surface,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
</div>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:40,height:40,borderRadius:10,background:isTrain?C.primaryBg:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>
{isTrain?"🏋️":"😴"}
</div>
<div style={{flex:1,minWidth:0,paddingRight:52}}>
<div style={{fontSize:13,fontWeight:800,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name||"Template"}</div>
<div style={{fontSize:11,fontWeight:600,color:isTrain?"#003D99":"#1E40AF",marginTop:1}}>{isTrain?"Ngày tập":"Ngày nghỉ"}{t.goal_type&&` · ${({tang_co:"Tăng cơ",giam_mo:"Giảm mỡ",duy_tri:"Duy trì"})[t.goal_type]||t.goal_type}`}{t.diet_strategy&&t.diet_strategy!=="balance"&&` (${t.diet_strategy==="low_carb"?"Low-carb":"Keto"})`}</div>
</div>
</div>
<div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
<span style={{fontSize:17,fontWeight:900,color:C.t1}}>{t.total_cal||0}</span>
<span style={{fontSize:11,fontWeight:700,color:C.t3}}>cal</span>
<span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{mealCount} bữa</span>
<span style={{fontSize:11,color:C.t3,transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0)"}}>▾</span>
</div>
{isOpen&&<div onClick={e=>e.stopPropagation()} style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`,cursor:"default"}}>
{(t.meals||[]).map((m,mi)=>(
<div key={mi} style={{marginBottom:8}}>
<div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:3}}>{m.meal_name||m.meal_id}</div>
{(m.items||[]).map((it,ii)=>(
<div key={ii} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t3,padding:"2px 0"}}>
<span>{it.food} {it.gram}g</span>
<span>{Math.round(it.cal||0)} cal</span>
</div>
))}
</div>
))}
</div>}
</div>;
})}
</div>
</div>
</div>
</div>
</div>
);
}
