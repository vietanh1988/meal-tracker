import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { calcMacro, defaultProfile } from "./calcMacro";
import { fmtDate } from "./fmtDate";
import { C, card, lbl, inp, redBtn } from "./theme";
import { AdminTab } from "./adminTabs/AdminTab";
import { AiTab } from "./adminTabs/AiTab";
import { TemplatesTab } from "./adminTabs/TemplatesTab";
import { WeightTab } from "./adminTabs/WeightTab";
import { AccountTab } from "./adminTabs/AccountTab";
import { Pill } from "./Pill";
import { UserAvatar } from "./UserAvatar";
import { SlidingTabs } from "./SlidingTabs";
import { MacroRing } from "./MacroRing";
import { MealCard } from "./MealCard";
import { WeightBarChart } from "./WeightBarChart";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG, mealsData } from "./mealConstants";
import { AICoachPanel } from "./AICoachPanel";
import { ReportView } from "./ReportView";
import { Dashboard } from "./Dashboard";
import { WeightRow } from "./WeightRow";
import { LoginScreen } from "./LoginScreen";
import { OnboardingWizard } from "./OnboardingWizard";
import { AboutPage } from "./AboutPage";
import { NotiBell } from "./NotiBell";
import { useIsMobile } from "./hooks/useIsMobile";
import { useAuth } from "./hooks/useAuth";
import { useProfile } from "./hooks/useProfile";
import { useWeightLog } from "./hooks/useWeightLog";
import { useUserData } from "./hooks/useUserData";
import { useAppSettings } from "./hooks/useAppSettings";
import { searchUSDA, calcFromUSDA, translateFood, estimateGram } from "./lib/usdaService";
import { lookupLocalFood } from "./lib/localFoodDB";




// App Logo — uses pinned icon image instead of emoji
const AppLogo=({size=48,radius,bg})=><img src="/icon-192.png" alt="Fipilot AI" style={{width:size,height:size,borderRadius:radius!=null?radius:size*0.22,objectFit:"cover",flexShrink:0,background:bg||"transparent"}}/>;

// User Avatar — emoji based on gender

// All 7 meals with icons and display names



// Weight Bar Chart with goal-based color logic

// Smart weight suggestion based on trend analysis + AI

// AI Coach Panel




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
          body:JSON.stringify({foodDesc:`${prompt}\nThức ăn: ${foodDesc}`,provider:"claude",model:aiModel})
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
    {section==="ai"&&<AiTab isAdmin={isAdmin} saveSetting={saveSetting} aiProvider={aiProvider} setAiProvider={setAiProvider} aiModel={aiModel} setAiModel={setAiModel} geminiModel={geminiModel} setGeminiModel={setGeminiModel} gptModel={gptModel} setGptModel={setGptModel} aiConnected={aiConnected} setAiConnected={setAiConnected} claudeKey={claudeKey} setClaudeKey={setClaudeKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} gptKey={gptKey} setGptKey={setGptKey} usdaKey={usdaKey} setUsdaKey={setUsdaKey}/>}
    {/* ADMIN PANEL */}
    {section==="admin"&&isAdmin&&<AdminTab appSettings={appSettings} saveSetting={saveSetting} mob={mob}/>}

    {/* TEMPLATES (admin only — separate pill) */}
    {section==="templates"&&isAdmin&&<TemplatesTab isAdmin={isAdmin} mob={mob} macro={macro} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} mealNames={mealNames} mealsData={mealsData} callAI={callAI} allFoodItems={allFoodItems} setAllFoodItems={setAllFoodItems} aiResult={aiResult} setAiResult={setAiResult} aiLoading={aiLoading} aiError={aiError} setAiError={setAiError} setDayType={setDayType} setFoodItems={setFoodItems} setUserHasEdited={setUserHasEdited}/>}
    {/* MEALS */}
    {section==="meals"&&<div style={{...card,padding:mob?"12px 10px":"16px 18px"}}>
      {!mob?<div style={{display:"grid",gridTemplateColumns:"63% 35%",gap:20,marginBottom:14,alignItems:"center"}}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:C.t1}}>{mealMode==="tu_nhap"?"Nhập bữa ăn":mealMode==="lich_tuan"?"Lịch tuần":"Kho mẫu"}</div>
          <div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:2}}>{mealMode==="tu_nhap"?"Nhập thức ăn → nhấn \"Tính macro\" → trả kết quả → Lưu bữa ăn → Lưu vào lịch tuần (nếu muốn)":mealMode==="lich_tuan"?"Xem & chỉnh thực đơn theo từng ngày trong tuần":`Chọn template mẫu do admin tạo sẵn${(defaultTemplates||[]).length>0?` (${(defaultTemplates||[]).length} mẫu)`:""}`}</div>
        </div>
        <div style={{display:"flex",gap:4,background:C.surface,borderRadius:12,padding:4}}>
          {[{id:"tu_nhap",icon:"✏️",label:"Tự nhập"},{id:"lich_tuan",icon:"📅",label:"Lịch tuần"},{id:"kho_mau",icon:"📚",label:"Kho mẫu"}].map(t=><div key={t.id} onClick={()=>{setMealMode(t.id);if(t.id==="kho_mau"&&refreshDefaultTemplates)refreshDefaultTemplates();}} style={{flex:1,padding:"10px 0",borderRadius:10,fontSize:14,fontWeight:mealMode===t.id?700:500,color:mealMode===t.id?C.primary:C.t2,background:mealMode===t.id?"#fff":"none",cursor:"pointer",boxShadow:mealMode===t.id?"0 1px 3px rgba(0,0,0,0.08)":"none",textAlign:"center"}}>{t.icon} {t.label}</div>)}
        </div>
      </div>:<>
        <div style={{fontSize:19,fontWeight:800,color:C.t1}}>{mealMode==="tu_nhap"?"Nhập bữa ăn":mealMode==="lich_tuan"?"Lịch tuần":"Kho mẫu"}</div>
        <div style={{fontSize:13,fontWeight:500,color:C.t2,marginTop:2,marginBottom:12}}>{mealMode==="tu_nhap"?"Nhập thức ăn → nhấn \"Tính macro\" → trả kết quả → Lưu bữa ăn → Lưu vào lịch tuần (nếu muốn)":mealMode==="lich_tuan"?"Xem & chỉnh thực đơn theo từng ngày trong tuần":`Chọn template mẫu do admin tạo sẵn${(defaultTemplates||[]).length>0?` (${(defaultTemplates||[]).length} mẫu)`:""}`}</div>
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
            return <div key={g.id} onClick={()=>{if(!disabled){const up={...profile,goalType:g.id};if(g.id!=="cut")up.dietStrategy="balanced";setProfile(up);}}} style={{
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

    {/* WEIGHT */}
    {section==="weight"&&<WeightTab weightLog={weightLog} addWeight={addWeight} deleteWeight={deleteWeight} setWeightLog={setWeightLog} profile={profile} setProfile={setProfile} mob={mob}/>}
    {/* ABOUT */}
    {section==="about"&&<AboutPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={mob}/>}

    {/* ACCOUNT */}
    {section==="account"&&<AccountTab user={user} signOut={signOut} isAdmin={isAdmin} profile={profile} mob={mob}/>}

    <style>{`@keyframes spin{to{transform:rotate(360deg);}} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;} input[type=number]{-moz-appearance:textfield;}`}</style>
  </div>;
}




// === Notification Bell — shared by PC header + Mobile greeting ===


export default function App(){
  const {user,loading,signOut}=useAuth();
  const [tab,setTab]=useState(()=>{try{return localStorage.getItem("fitpilot_tab")||"dashboard";}catch(e){return "dashboard";}});
  useEffect(()=>{try{localStorage.setItem("fitpilot_tab",tab);}catch(e){}},[tab]);
  const [pcShowWeightInput,setPcShowWeightInput]=useState(false);
  const pcWeightInputRef=useRef(null);
  const [pcWeightSaved,setPcWeightSaved]=useState(false);
  const [pcDayManual,setPcDayManual]=useState(null);
  const [showAICoach,setShowAICoach]=useState(false);
  const {profile,setProfile,loading:profileLoading}=useProfile(user?.id,loading);
  const {weightLog,addWeight,deleteWeight,resetWeights,setWeightLog,loading:weightLoading}=useWeightLog(user?.id,loading);
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
  const needsOnboarding=userDataLoaded && !profileLoading && !weightLoading && !profile.onboardingDone && (!weightLog || weightLog.length===0);
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

  // Mobile today data for AI Coach (same logic as Dashboard)
  const mobTodayDayIdx=new Date().getDay();
  const mobGymDayIdx=mobTodayDayIdx===0?6:mobTodayDayIdx-1;
  const mobDayType=(profile?.gymDays||[]).includes(mobGymDayIdx)?"train":"rest";
  const mobTodayData=(()=>{
    if(!getMeals)return{cal:0,p:0,c:0,f:0,dayType:mobDayType};
    try{
      const mc=(()=>{try{return appSettings.meal_config?JSON.parse(appSettings.meal_config):DEFAULT_MEAL_CONFIG;}catch(e){return DEFAULT_MEAL_CONFIG;}})();
      const ids=mc[mobDayType]||DEFAULT_MEAL_CONFIG[mobDayType];
      const ms=getMeals(mobDayType).filter(m=>ids.includes(m.id));
      const t=ms.reduce((a,m)=>{const mt=m.items.reduce((a2,i)=>({p:a2.p+(i.p||0),c:a2.c+(i.c||0),f:a2.f+(i.f||0),cal:a2.cal+(i.cal||0)}),{p:0,c:0,f:0,cal:0});return{p:a.p+mt.p,c:a.c+mt.c,f:a.f+mt.f,cal:a.cal+mt.cal};},{p:0,c:0,f:0,cal:0});
      return{cal:Math.round(t.cal),p:Math.round(t.p),c:Math.round(t.c),f:Math.round(t.f),dayType:mobDayType};
    }catch(e){return{cal:0,p:0,c:0,f:0,dayType:mobDayType};}
  })();

  // ========== MOBILE ==========
  if(mob) return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",background:C.bg,color:C.t1,minHeight:"100vh",padding:"0 10px 10px 10px",maxWidth:700,margin:"0 auto",overflowX:"hidden",width:"100%",boxSizing:"border-box"}}>
    <div style={{paddingTop:"calc(env(safe-area-inset-top, 8px) + 8px)",paddingBottom:100}}>
    {tab==="dashboard"&&<Dashboard weightLog={weightLog} addWeight={addWeight} profile={profile} setProfile={wrappedSetProfile} macro={macro} getMeals={getMeals} appSettings={appSettings} setTab={setTab} user={user} getWeeklyTemplate={getWeeklyTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates} userDataLoaded={userDataLoaded} macroBanner={macroBanner}/>}
    {tab==="weight"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings" initialSection="weight" weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates}/>}
    {tab==="meals"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="meals" weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates}/>}
    {tab==="report"&&<ReportView weightLog={weightLog} profile={profile} macro={macro} getMealHistory={getMealHistory} getDailyLogs={getDailyLogs} appSettings={appSettings} mob={mob}/>}
    {tab==="settings"&&<AdminPanel weightLog={weightLog} setWeightLog={setWeightLog} addWeight={addWeight} deleteWeight={deleteWeight} resetWeights={resetWeights} profile={profile} setProfile={wrappedSetProfile} macro={macro} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} foodCache={foodCache} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} forcedSection="settings" signOut={signOut} user={user} weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} applyTemplate={applyTemplate} refreshDefaultTemplates={refreshDefaultTemplates}/>}
    <svg width="0" height="0" style={{position:"absolute"}}><defs><linearGradient id="navG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs></svg>
    {/* AI Coach FAB — only on dashboard */}
    {!showAICoach&&<div onClick={()=>setShowAICoach(true)} style={{position:"fixed",bottom:100,right:14,width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#36A3FF,#007AFF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",boxShadow:"0 4px 14px rgba(0,122,255,0.4)",zIndex:98,cursor:"pointer"}}><span style={{fontSize:20}}>✨</span><span style={{fontSize:7,fontWeight:800,letterSpacing:"0.3px",opacity:0.9,marginTop:1}}>Fipilot AI</span></div>}
    {showAICoach&&<AICoachPanel profile={profile} macro={macro} weightLog={weightLog} todayData={mobTodayData} mob={true} onClose={()=>setShowAICoach(false)} appSettings={appSettings} isAdmin={isAdmin} getMeals={getMeals} getWeeklyTemplate={getWeeklyTemplate} foodCache={foodCache} userId={user?.id}/>}
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:99,background:"rgba(255,255,255,0.97)",borderTop:"0.5px solid rgba(0,0,0,0.12)",display:"flex",paddingTop:6,paddingBottom:"max(18px, env(safe-area-inset-bottom, 18px))"}}>
      {[{id:"dashboard",label:"Tổng quan",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="6" y="6" width="38" height="38" rx="10" fill={c}/><rect x="52" y="6" width="38" height="38" rx="10" fill={c}/><rect x="6" y="50" width="38" height="32" rx="10" fill={c}/><rect x="52" y="50" width="38" height="32" rx="10" fill={c}/><rect x="6" y="86" width="84" height="8" rx="4" fill={c}/></svg>},{id:"meals",label:"Bữa ăn",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="6" y="6" width="84" height="84" rx="14" fill={c}/><circle cx="22" cy="30" r="6" fill="white" opacity="0.9"/><rect x="36" y="25" width="46" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="52" r="6" fill="white" opacity="0.9"/><rect x="36" y="47" width="36" height="10" rx="5" fill="white" opacity="0.9"/><circle cx="22" cy="74" r="6" fill="white" opacity="0.9"/><rect x="36" y="69" width="40" height="10" rx="5" fill="white" opacity="0.9"/></svg>},{id:"weight",label:"Cân nặng",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="8" y="78" width="80" height="10" rx="5" fill={c}/><rect x="44" y="28" width="8" height="52" rx="4" fill={c}/><rect x="12" y="24" width="72" height="8" rx="4" fill={c}/><rect x="22" y="24" width="4" height="18" rx="2" fill={c}/><rect x="70" y="24" width="4" height="18" rx="2" fill={c}/><rect x="10" y="40" width="28" height="8" rx="4" fill={c}/><rect x="58" y="40" width="28" height="8" rx="4" fill={c}/><circle cx="48" cy="16" r="8" fill={c}/></svg>},{id:"report",label:"Báo cáo",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><rect x="8" y="56" width="22" height="32" rx="5" fill={c}/><rect x="37" y="36" width="22" height="52" rx="5" fill={c}/><rect x="66" y="16" width="22" height="72" rx="5" fill={c}/><rect x="4" y="90" width="88" height="6" rx="3" fill={c}/></svg>},{id:"settings",label:"Cài đặt",svg:(c)=><svg viewBox="0 0 96 96" width={28} height={28}><path d="M44 4 L52 4 L54 14 C57 15 60 17 63 19 L72 14 L78 20 L73 29 C75 32 77 35 78 38 L88 40 L88 48 L78 50 C77 53 75 56 73 59 L78 68 L72 74 L63 69 C60 71 57 73 54 74 L52 84 L44 84 L42 74 C39 73 36 71 33 69 L24 74 L18 68 L23 59 C21 56 19 53 18 50 L8 48 L8 40 L18 38 C19 35 21 32 23 29 L18 20 L24 14 L33 19 C36 17 39 15 42 14 Z" fill={c}/><circle cx="48" cy="44" r="15" fill="white" opacity="0.92"/><circle cx="48" cy="44" r="8" fill={c}/></svg>}].map(t=>{const a=tab===t.id;return <div key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",padding:"6px 0"}}>{t.svg(a?"url(#navG)":"#A0A0A0")}<span style={{fontSize:10,fontWeight:a?700:500,color:a?"#007AFF":"#8E8E93"}}>{t.label}</span></div>;})}
    </div>
    </div>
  </div>;

  // ========== PC LAYOUT ==========
  return <div style={{fontFamily:"'Inter',Roboto,-apple-system,'Segoe UI',sans-serif",display:"flex",minHeight:"100vh",background:C.bg,color:C.t1}}>
    {/* SIDEBAR */}
    <nav style={{width:220,background:"#fff",borderRight:`1px solid ${C.border}`,position:"fixed",top:0,left:0,bottom:0,zIndex:10,display:"flex",flexDirection:"column",padding:"20px 0",overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"0 20px",marginBottom:24}}><AppLogo size={40} radius={12}/><div><div style={{fontWeight:800,fontSize:15,color:C.t1}}>FipilotAI</div><div style={{fontSize:10,color:C.primary,fontWeight:600,letterSpacing:"0.3px",marginTop:1}}>AI Nutrition Coach</div></div></div>
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
          <button onClick={()=>setShowAICoach(true)} style={{padding:"7px 16px",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF)",color:"#fff",fontSize:12,fontWeight:700,border:"none",cursor:"pointer"}}>✨ Fipilot AI</button>
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
            <div style={{flex:"0 0 60%",display:"flex",justifyContent:"center",gap:24}}><MacroRing size={110} l="Protein" v={pcAP>0?pcAP:pcHP} max={pcHP} color="#007AFF" color2="#007AFF" sub={pcAP>0?`/${pcHP}g`:null} unit="g"/><MacroRing size={110} l="Carb" v={pcACb>0?pcACb:pcHC} max={pcHC} color="#5AC8FA" color2="#5AC8FA" sub={pcACb>0?`/${pcHC}g`:null} unit="g"/><MacroRing size={110} l="Fat" v={pcAF>0?pcAF:pcHF} max={pcHF} color="#8E8E93" color2="#8E8E93" sub={pcAF>0?`/${pcHF}g`:null} unit="g"/><MacroRing size={110} l="Chất xơ" v={pcAFib>0?pcAFib:pcHFib} max={pcHFib} color="#34C759" color2="#34C759" sub={pcAFib>0?`/${pcHFib}g`:null} unit="g"/></div>
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
                <div style={{flex:1,borderLeft:"1.5px solid rgba(52,199,89,0.15)",paddingLeft:16}}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>{pcMSL}</div><div style={{fontSize:12,color:C.t2,marginTop:3,lineHeight:1.5}}>{pcCR>0?`Thiếu ${pcCR} cal. Thêm sữa tươi không đường (+120 cal) hoặc 30g hạt điều (+175 cal).`:pcCR<0?`Dư ${Math.abs(pcCR)} cal. Giảm bớt cơm hoặc tinh bột để cân bằng.`:"Cân đối dinh dưỡng, đủ năng lượng cho buổi tập hiệu quả."}</div></div>
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
            <div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.t1}}>Fipilot AI gợi ý cho bạn</div><div style={{fontSize:12,color:C.t2,marginTop:3}}>Hôm nay bạn đang thiếu <b style={{color:"#D97706"}}>{Math.round(Math.max(0,pcHC-pcACb))}g Carb</b> để đạt mục tiêu.</div></div>
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
        {tab==="weight"&&<AdminPanel key="wt" {...adminP} forcedSection="settings" initialSection="weight" hidePills/>}
        {tab==="account"&&<AdminPanel key="acc" {...adminP} forcedSection="settings" initialSection="account" signOut={signOut} user={user} hidePills/>}
        {tab==="admin_s"&&<AdminPanel key="adm" {...adminP} forcedSection="settings" initialSection="admin" hidePills/>}
        {tab==="templates_s"&&<AdminPanel key="tpl" {...adminP} forcedSection="settings" initialSection="templates" hidePills/>}
      </main>
    </div>
    {!showAICoach&&<div onClick={()=>setShowAICoach(true)} style={{position:"fixed",bottom:28,right:28,width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#36A3FF,#007AFF)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#fff",boxShadow:"0 4px 16px rgba(0,122,255,0.35)",zIndex:98,cursor:"pointer"}}><span style={{fontSize:20}}>✨</span><span style={{fontSize:7,fontWeight:800,letterSpacing:"0.3px",opacity:0.9,marginTop:1}}>Fipilot AI</span></div>}
    {showAICoach&&<AICoachPanel profile={profile} macro={macro} weightLog={weightLog} todayData={{cal:pcAC,p:pcAP,c:pcACb,f:pcAF,dayType:pcDayType}} mob={false} onClose={()=>setShowAICoach(false)} appSettings={appSettings} isAdmin={isAdmin} getMeals={getMeals} getWeeklyTemplate={getWeeklyTemplate} foodCache={foodCache} userId={user?.id}/>}
  </div>;

}
