import { useState, useEffect } from "react";
import { C, card, inp, redBtn } from "../theme";
import { estimateGram } from "../lib/usdaService";
import { getFoodRole } from "../lib/localFoodDB";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG } from "../mealConstants";

export function TemplatesTab({isAdmin, mob, macro, defaultTemplates, saveDefaultTemplate, deleteDefaultTemplate, mealNames, mealsData, callAI, allFoodItems, setAllFoodItems, aiResult, setAiResult, aiLoading, aiError, setAiError, setDayType, setFoodItems, setUserHasEdited, savePendingFoodCache, aiProvider}){
const [expandedId,setExpandedId]=useState(null);
const [editingId,setEditingId]=useState(null);
const [tplGoal,setTplGoal]=useState("tang_co");
const [tplDiet,setTplDiet]=useState("balance");
const [selectedMeals,setSelectedMeals]=useState(DEFAULT_MEAL_CONFIG.train);
// === Import CSV (chỉ PC) ===
const [importOpen,setImportOpen]=useState(false);
const [importParsed,setImportParsed]=useState(null); // [{name,dayType,goalType,dietStrategy,meals:{mealId:[{food,pct}]}}]
const [importReport,setImportReport]=useState(null); // kết quả cuối cùng sau khi tra macro
const [importBusy,setImportBusy]=useState(false);
const [importErr,setImportErr]=useState(null);

// --- Parse 1 dòng CSV (hỗ trợ dấu phẩy trong ngoặc kép) ---
function parseCsvLine(line){
const out=[];let cur="";let inQ=false;
for(let i=0;i<line.length;i++){
const ch=line[i];
if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else{inQ=!inQ;}}
else if(ch===","&&!inQ){out.push(cur);cur="";}
else cur+=ch;
}
out.push(cur);
return out.map(s=>s.trim());
}

function downloadTemplateCSV(){
const rows=[
["Tên mẫu","Ngày","Mục tiêu","Diet","Bữa","Món ăn","%"],
["Ức gà cơm rau - Tăng cơ","Tập","Tăng cơ","","Sáng","Trứng gà luộc",""],
["Ức gà cơm rau - Tăng cơ","Tập","Tăng cơ","","Sáng","Bánh mì",""],
["Ức gà cơm rau - Tăng cơ","Tập","Tăng cơ","","Trưa","Ức gà luộc","60"],
["Ức gà cơm rau - Tăng cơ","Tập","Tăng cơ","","Trưa","Thịt lợn nạc luộc","40"],
["Ức gà cơm rau - Tăng cơ","Tập","Tăng cơ","","Trưa","Cơm",""],
];
const csv=rows.map(r=>r.map(v=>/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join(",")).join("\n");
const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
const url=URL.createObjectURL(blob);
const a=document.createElement("a");a.href=url;a.download="mau_thuc_don_fipilot.csv";a.click();
URL.revokeObjectURL(url);
}

const GOAL_MAP={"tăng cơ":"tang_co","giảm mỡ":"giam_mo","duy trì":"duy_tri"};
const DIET_MAP={"low-carb":"low_carb","low carb":"low_carb","keto":"keto","cân bằng":"balance"};

function matchMealId(raw){
const k=(raw||"").toLowerCase().trim();
const found=ALL_MEALS.find(m=>m.id===k||m.name.toLowerCase()===k||m.short.toLowerCase()===k);
return found?found.id:null;
}

async function handleImportFile(file){
setImportErr(null);setImportReport(null);setImportParsed(null);
try{
const text=await file.text();
const lines=text.split(/\r?\n/).filter(l=>l.trim().length>0);
if(lines.length<2){setImportErr("File rỗng hoặc thiếu dữ liệu.");return;}
const header=parseCsvLine(lines[0]).map(h=>h.toLowerCase());
const idx={name:header.indexOf("tên mẫu"),day:header.indexOf("ngày"),goal:header.indexOf("mục tiêu"),diet:header.indexOf("diet"),meal:header.indexOf("bữa"),food:header.indexOf("món ăn"),pct:header.indexOf("%")};
if(idx.name<0||idx.meal<0||idx.food<0){setImportErr('File thiếu cột bắt buộc: "Tên mẫu", "Bữa", "Món ăn".');return;}

let last={name:"",day:"",goal:"",diet:""};
const rows=[];
for(let i=1;i<lines.length;i++){
const c=parseCsvLine(lines[i]);
const name=c[idx.name]||last.name;
const day=c[idx.day]||last.day;
const goal=c[idx.goal]||last.goal;
const diet=idx.diet>=0?(c[idx.diet]||last.diet):"";
const mealRaw=c[idx.meal];
const food=c[idx.food];
const pct=idx.pct>=0?c[idx.pct]:"";
if(!name||!mealRaw||!food)continue;
last={name,day,goal,diet};
const mealId=matchMealId(mealRaw);
if(!mealId){setImportErr(`Dòng ${i+1}: "${mealRaw}" không phải tên bữa hợp lệ (VD: Sáng, Trưa, Phụ chiều, Pre, Post, Tối).`);return;}
rows.push({name,day,goal,diet,mealId,food:food.trim(),pct:pct?Number(pct):null});
}
if(rows.length===0){setImportErr("Không có dòng dữ liệu hợp lệ nào.");return;}

// Gộp theo Tên mẫu → Bữa
const tplMap={};
rows.forEach(r=>{
if(!tplMap[r.name])tplMap[r.name]={name:r.name,dayType:(r.day||"").toLowerCase().includes("nghỉ")?"rest":"train",goalType:GOAL_MAP[(r.goal||"").toLowerCase().trim()]||"tang_co",dietStrategy:DIET_MAP[(r.diet||"").toLowerCase().trim()]||"balance",meals:{}};
if(!tplMap[r.name].meals[r.mealId])tplMap[r.name].meals[r.mealId]=[];
tplMap[r.name].meals[r.mealId].push({food:r.food,pct:r.pct});
});
const parsed=Object.values(tplMap);
setImportParsed(parsed);

// Tra macro/100g cho từng món (không trùng lặp), tận dụng đúng luồng DB→USDA→AI có sẵn
const uniqueNames=[...new Set(rows.map(r=>r.food.toLowerCase().trim()))];
const flatFoods=uniqueNames.map(n=>{
const orig=rows.find(r=>r.food.toLowerCase().trim()===n).food;
return {name:orig,gram:100,unit:"g",qty:1,_mealId:n};
});
setImportBusy(true);
if(callAI)await callAI(false,flatFoods);
}catch(e){setImportErr("Lỗi đọc file: "+e.message);setImportBusy(false);}
}

// Khi callAI xong (aiResult đổi) VÀ đang trong luồng import → build báo cáo cuối
useEffect(()=>{
if(!importBusy||!importParsed)return;
if(aiError){setImportErr("Lỗi tra macro: "+aiError);setImportBusy(false);return;}
if(!aiResult)return;
const macroMap={};
(aiResult.items||[]).forEach(it=>{
const k=(it.name||"").toLowerCase().trim();
const g=it.gram||100;const r=100/g;
macroMap[k]={p:(it.protein||0)*r,c:(it.carb||0)*r,f:(it.fat||0)*r,fiber:(it.fiber||0)*r,cal:(it.cal||0)*r,source:it.source};
});

const DEFAULT_REF={protein:150,carb:150,fat:10,fixed:100};
const report=importParsed.map(tpl=>{
let hasError=false;const errors=[];const sources=new Set();
const mealsData=[];
Object.entries(tpl.meals).forEach(([mealId,items])=>{
const resolved=items.map(it=>{
const k=it.food.toLowerCase().trim();
const m=macroMap[k];
if(!m){hasError=true;errors.push(`Không tra được món "${it.food}"`);return null;}
sources.add(m.source);
return {...it,macro100:m,role:getFoodRole(it.food)};
}).filter(Boolean);
if(resolved.length===0)return;
// nhóm theo vai trò, % làm gram tham chiếu tương đối (chỉ cần đúng tỉ lệ)
const byRole={};
resolved.forEach(it=>{(byRole[it.role]=byRole[it.role]||[]).push(it);});
Object.values(byRole).forEach(group=>{
group.forEach(it=>{it.refGram=it.pct!=null?Math.max(5,Number(it.pct)):(DEFAULT_REF[it.role]||100);});
});
const mealItems=resolved.map(it=>{
const g=it.refGram;const s=g/100;
return {food:it.food,gram:g,p:Math.round(it.macro100.p*s*10)/10,c:Math.round(it.macro100.c*s*10)/10,f:Math.round(it.macro100.f*s*10)/10,fiber:Math.round(it.macro100.fiber*s*10)/10,cal:Math.round(it.macro100.cal*s)};
});
const meal=ALL_MEALS.find(m=>m.id===mealId);
mealsData.push({meal_id:mealId,meal_name:meal?meal.name:mealId,items:mealItems});
});
const totalCal=mealsData.reduce((s,m)=>s+m.items.reduce((a,it)=>a+it.cal,0),0);
return {name:tpl.name,dayType:tpl.dayType,goalType:tpl.goalType,dietStrategy:tpl.dietStrategy,mealsData,totalCal:Math.round(totalCal),hasError:hasError||mealsData.length===0,errors,sources:[...sources]};
});
setImportReport(report);
setImportBusy(false);
},[aiResult,aiError]);

async function confirmImportCreate(){
if(!importReport)return;
const valid=importReport.filter(r=>!r.hasError);
for(const r of valid){
if(saveDefaultTemplate)await saveDefaultTemplate(r.name,r.dayType,r.mealsData,r.totalCal,null,r.goalType,r.goalType==="giam_mo"?r.dietStrategy:null);
}
setImportOpen(false);setImportParsed(null);setImportReport(null);
alert(`Đã tạo ${valid.length} mẫu thành công${importReport.length>valid.length?`, bỏ qua ${importReport.length-valid.length} mẫu lỗi`:""}.`);
}
return (
<div style={{...card,padding:mob?"12px 10px":"16px 18px"}}>
<div style={{fontSize:mob?19:17,fontWeight:800,color:C.t1,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:17}}>📚</span><span style={{fontWeight:800,color:C.t1}}>Quản lý Template mẫu</span></div>
<div style={{fontSize:13,fontWeight:500,color:C.t2,marginBottom:mob?16:8}}>Tạo template bữa ăn mẫu cho tất cả users xem trong tab Kho mẫu</div>

{!mob&&<div style={{display:"flex",gap:8,marginBottom:16}}>
<button onClick={downloadTemplateCSV} style={{padding:"8px 14px",fontSize:12,fontWeight:700,border:`1px solid ${C.border}`,borderRadius:8,background:C.surface,color:C.t2,cursor:"pointer"}}>⬇️ Tải file mẫu</button>
<button onClick={()=>{setImportOpen(true);setImportParsed(null);setImportReport(null);setImportErr(null);}} style={{padding:"8px 14px",fontSize:12,fontWeight:700,border:"none",borderRadius:8,background:C.primary,color:"#fff",cursor:"pointer"}}>⬆️ Import từ CSV</button>
</div>}

{!mob&&importOpen&&<div style={{background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
<span style={{fontSize:14,fontWeight:800,color:C.t1}}>Import hàng loạt từ CSV</span>
<span onClick={()=>setImportOpen(false)} style={{cursor:"pointer",color:C.t3,fontSize:14}}>✕</span>
</div>

{!importParsed&&!importBusy&&<div>
<input type="file" accept=".csv" onChange={e=>{const f=e.target.files[0];if(f)handleImportFile(f);}} style={{...inp,fontSize:12}}/>
<div style={{fontSize:11,color:C.t3,marginTop:6}}>Cột bắt buộc: Tên mẫu, Bữa, Món ăn. Cột % để trống nếu là món phụ tự tính (cơm, dầu ăn...).</div>
</div>}

{importErr&&<div style={{padding:"10px 12px",background:"#FEF2F2",borderRadius:8,fontSize:12,color:"#991B1B",marginTop:8}}>⚠️ {importErr}</div>}

{importBusy&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 0"}}>
<span style={{fontSize:13,fontWeight:700,color:C.t2}}>⏳ Đang tra macro từng món (DB → USDA → AI)...</span>
</div>}

{importReport&&<div>
<div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:8}}>Kết quả kiểm tra ({importReport.filter(r=>!r.hasError).length}/{importReport.length} mẫu hợp lệ):</div>
{importReport.map((r,i)=>(
<div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"9px 10px",background:r.hasError?"#FEF2F2":"#F0FDF4",borderRadius:8,marginBottom:6}}>
<span style={{fontSize:14,color:r.hasError?"#DC2626":"#16A34A"}}>{r.hasError?"✕":"✓"}</span>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:700,color:r.hasError?"#991B1B":"#166534"}}>{r.name}</div>
{r.hasError?<div style={{fontSize:11,color:"#DC2626",marginTop:2}}>{r.errors.join("; ")}</div>
:<div style={{fontSize:11,color:"#4ADE80",marginTop:2}}>{r.mealsData.length} bữa, {r.totalCal}kcal — nguồn: {r.sources.map(s=>s==="localDB"?"📦 Kho gốc":s==="USDA"?"🔍 USDA":s==="cache"?"💾 Cache":"🤖 AI").join(", ")}</div>}
</div>
</div>
))}
<button onClick={confirmImportCreate} disabled={importReport.every(r=>r.hasError)} style={{...redBtn,marginTop:8,background:"#16A34A"}}>Tạo {importReport.filter(r=>!r.hasError).length} mẫu hợp lệ{importReport.some(r=>r.hasError)?` (bỏ qua ${importReport.filter(r=>r.hasError).length} mẫu lỗi)`:""}</button>
</div>}
</div>}

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

<div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:8}}>Chọn bữa cho mẫu này</div>
<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
{ALL_MEALS.map(m=>{
const on=selectedMeals.includes(m.id);
return <div key={m.id} onClick={()=>{setSelectedMeals(on?selectedMeals.filter(id=>id!==m.id):[...selectedMeals,m.id]);}} style={{padding:"7px 12px",borderRadius:18,fontSize:12,fontWeight:on?700:500,background:on?C.primaryBg:C.surface,color:on?C.primary:C.t3,border:`1.5px solid ${on?C.primary:C.border}`,cursor:"pointer"}}>{m.icon} {m.short}</div>;
})}
</div>

<div style={{height:1,background:"linear-gradient(90deg,transparent,#E2E8F0,transparent)",marginBottom:14}}/>

{/* Inline meal input — same as Tự nhập */}
{ALL_MEALS.filter(m=>selectedMeals.includes(m.id)).map(meal=>{
const foods=allFoodItems[meal.id]||[{name:"",gram:"",unit:"g",qty:1}];
const mealColors={"sang":"#007AFF","phu_sang":"#007AFF","trua":"#007AFF","phu_chieu":"#007AFF","pre":"#007AFF","post":"#007AFF","toi":"#007AFF"};
const mealTextColors={"sang":C.t1,"phu_sang":C.t1,"trua":C.t1,"phu_chieu":C.t1,"pre":C.t1,"post":C.t1,"toi":C.t1};
return <div key={meal.id} style={{background:C.card,border:`1.5px solid ${C.border}`,borderLeft:`3px solid ${mealColors[meal.id]||C.border}`,borderRadius:12,padding:mob?10:16,marginBottom:10}}>
<div style={{display:"grid",gridTemplateColumns:mob?"18px 1fr 44px 36px 50px 20px":"28px 2fr 56px 52px 72px 28px",gap:mob?6:8,alignItems:"center",marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
<span style={{gridColumn:"1/3",fontSize:14,fontWeight:700,color:mealTextColors[meal.id]||C.t1}}>{meal.icon} {meal.short}</span>
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
ALL_MEALS.filter(m=>selectedMeals.includes(m.id)).forEach(meal=>{
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
return ALL_MEALS.filter(m=>selectedMeals.includes(m.id)).map(meal=>{
const mealFoods=(allFoodItems[meal.id]||[]).filter(f=>f.name&&f.name.trim());
if(mealFoods.length===0)return null;
const mealItems=items.filter(it=>it._mealId===meal.id);
const mCal=mealItems.reduce((s,it)=>s+(it.cal||0),0);
return <div key={meal.id} style={{marginBottom:10}}>
<div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:4,display:"flex",justifyContent:"space-between"}}>
<span>{meal.icon} {meal.short}</span><span style={{color:C.t1}}>{Math.round(mCal)} cal</span>
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
ALL_MEALS.filter(m=>selectedMeals.includes(m.id)).forEach(meal=>{
const mealItems=items.filter(it=>it._mealId===meal.id);
if(mealItems.length===0)return;
const saveItems=mealItems.map(ai=>({food:ai.name||"",gram:ai.gram||0,unit:ai.unit||"g",qty:ai.qty||1,p:ai.protein||0,c:ai.carb||0,f:ai.fat||0,fiber:ai.fiber||0,cal:ai.cal||0}));
if(saveItems.length>0)mealsData.push({meal_id:meal.id,meal_name:meal.name,items:saveItems});
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
setSelectedMeals(DEFAULT_MEAL_CONFIG.train);
// Reset all food items
const init={};ALL_MEALS.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);
const el=document.getElementById("tpl-created");
if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
}} style={{...redBtn,marginTop:12,background:"linear-gradient(135deg,#7C3AED,#6D28D9)"}}>{editingId?"💾 Cập nhật Template":"📚 Lưu thành Template mẫu"}</button>
{editingId&&<button onClick={()=>{
setEditingId(null);
document.getElementById("tpl-name").value="";
setAiResult(null);
setSelectedMeals(DEFAULT_MEAL_CONFIG.train);
const init={};ALL_MEALS.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);
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
<div style={{display:"flex",flexDirection:"column"}}>
{(defaultTemplates||[]).map(t=>{
const mealCount=(t.meals||[]).length;
const isTrain=t.day_type==="train";
const isOpen=expandedId===t.id;
const goalLabel={tang_co:"Tăng cơ",giam_mo:"Giảm mỡ",duy_tri:"Duy trì"}[t.goal_type]||"";
return <div key={t.id} style={{borderBottom:`0.5px solid ${C.border}`}}>
<div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 4px",cursor:"pointer"}} onClick={()=>setExpandedId(isOpen?null:t.id)}>
<span style={{fontSize:15,flexShrink:0}}>{isTrain?"🏋️":"😴"}</span>
<div style={{flex:1,minWidth:0}}>
<div style={{fontSize:12,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name||"Template"}</div>
<div style={{fontSize:10,color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{isTrain?"💪Tập":"😴Nghỉ"} · {goalLabel}{t.diet_strategy&&t.diet_strategy!=="balance"&&`(${t.diet_strategy==="low_carb"?"Low-carb":"Keto"})`}</div>
</div>
<div style={{textAlign:"right",flexShrink:0}}>
<div style={{fontSize:12,fontWeight:700,color:C.t1}}>{t.total_cal||0}</div>
<div style={{fontSize:10,color:C.t3}}>{mealCount} bữa</div>
</div>
<button onClick={(e)=>{
e.stopPropagation();
const el=document.getElementById("tpl-name");
const selType=document.getElementById("tpl-type");
if(el)el.value=t.name||"";
if(selType)selType.value=t.day_type||"train";
setDayType(t.day_type||"train");
setTplGoal(t.goal_type||"tang_co");
setTplDiet(t.diet_strategy||"balance");
const loadedMealIds=(t.meals||[]).map(m=>m.meal_id);
setSelectedMeals(loadedMealIds.length>0?loadedMealIds:DEFAULT_MEAL_CONFIG[t.day_type||"train"]);
const init={};
ALL_MEALS.forEach(m=>{init[m.id]=[{name:"",gram:"",unit:"g",qty:1}];});
(t.meals||[]).forEach(m=>{
const items=(m.items||[]).map(it=>({name:it.food||"",gram:it.gram||"",unit:it.unit||"g",qty:it.qty||1}));
if(items.length>0)init[m.meal_id]=items;
});
setAllFoodItems(init);
setAiResult(null);
setEditingId(t.id);
setExpandedId(null);
document.getElementById("tpl-name")?.scrollIntoView({behavior:"smooth",block:"center"});
}} style={{width:20,height:20,padding:0,borderRadius:6,fontSize:11,color:C.primary,background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✎</button>
<button onClick={async(e)=>{
e.stopPropagation();
if(!confirm("Xóa template \""+t.name+"\"?"))return;
if(deleteDefaultTemplate) await deleteDefaultTemplate(t.id);
}} style={{width:20,height:20,padding:0,borderRadius:6,fontSize:11,color:C.t3,background:"none",border:"none",cursor:"pointer",flexShrink:0}}>✕</button>
</div>
{isOpen&&<div onClick={e=>e.stopPropagation()} style={{padding:"0 4px 10px 27px",cursor:"default"}}>
{(t.meals||[]).map((m,mi)=>(
<div key={mi} style={{marginBottom:6}}>
<div style={{fontSize:11,fontWeight:700,color:C.t2,marginBottom:2}}>{m.meal_name||m.meal_id}</div>
{(m.items||[]).map((it,ii)=>(
<div key={ii} style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.t3,padding:"1px 0"}}>
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
