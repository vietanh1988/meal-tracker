import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "./lib/supabase";
import { authFetch } from "./lib/authFetch";
import { pickAiModel } from "./lib/aiProvider";
import { C, card } from "./theme";
import { AdminTab } from "./adminTabs/AdminTab";
import { AiTab } from "./adminTabs/AiTab";
import { TemplatesTab } from "./adminTabs/TemplatesTab";
import { WeeklyBundlesTab } from "./adminTabs/WeeklyBundlesTab";
import { ProfileTab } from "./adminTabs/ProfileTab";
import { SubscriptionSettingsTab } from "./adminTabs/SubscriptionSettingsTab";
import { UsersTab } from "./adminTabs/UsersTab";
import { OrdersTab } from "./adminTabs/OrdersTab";
import { MealsTab } from "./adminTabs/MealsTab";
import { BusinessReportTab } from "./adminTabs/BusinessReportTab";
import { ErrorLogsTab } from "./adminTabs/ErrorLogsTab";
import { AuditLogTab } from "./adminTabs/AuditLogTab";
import { NotifyTab } from "./adminTabs/NotifyTab";
import { FeatureFlagsTab, parseFeatureFlags } from "./adminTabs/FeatureFlagsTab";
import { SystemHealthTab } from "./adminTabs/SystemHealthTab";
import { AiCostTab } from "./adminTabs/AiCostTab";
import { WeightTab } from "./adminTabs/WeightTab";
import { AccountTab } from "./adminTabs/AccountTab";
import FeedbackTab from "./adminTabs/FeedbackTab";
import { Pill } from "./Pill";
import { UserAvatar } from "./UserAvatar";
import { ALL_MEALS, DEFAULT_MEAL_CONFIG, mealsData } from "./mealConstants";
import { AboutPage } from "./AboutPage";
import { TermsPage } from "./TermsPage";
import { useIsMobile } from "./hooks/useIsMobile";
import { searchUSDA, calcFromUSDA, translateFood, estimateGram, adjustCookingOil } from "./lib/usdaService";
// Quota check chuyển hẳn sang server (edge function)
import { lookupLocalFood } from "./lib/localFoodDB";
import { usePendingFoodCache } from "./hooks/usePendingFoodCache";
import { FoodCachePendingTab } from "./adminTabs/FoodCachePendingTab";

// AdminPanel — tách riêng khỏi App.jsx (component độc lập, xử lý toàn bộ
// các tab trong "Cài đặt" và "Quản trị": Hồ sơ, Tài khoản, Điều khoản, Kết nối AI,
// Quản lý User, Duyệt đơn hàng, Gói cước, Báo cáo kinh doanh, Lỗi hệ thống,
// Nhật ký hoạt động, Gửi thông báo, Quản lý tính năng, Tổng quan hệ thống,
// Quản lý version, Kho mẫu, Bữa ăn, Cân nặng...
export function AdminPanel({weightLog,setWeightLog,addWeight,deleteWeight,resetWeights,profile,setProfile,macro,saveMealToCloud,saveFoodCache,deleteFoodCache,getMeals,foodCache,appSettings,isAdmin,saveSetting,forcedSection,signOut,user,weeklyTemplates,saveWeeklyTemplate,getWeeklyTemplate,deleteWeeklyTemplate,defaultTemplates,saveDefaultTemplate,deleteDefaultTemplate,applyTemplate,refreshDefaultTemplates,weeklyBundles,saveWeeklyBundle,deleteWeeklyBundle,refreshWeeklyBundles,initialSection,hidePills}){if(!profile||!macro)return null;
  const flags=parseFeatureFlags(appSettings);
  const {myPending,allPending,pendingCount,approvedCount,savePendingFoodCache,approvePendingFood,rejectPendingFood}=usePendingFoodCache(user?.id,isAdmin);
  const mob=useIsMobile();
  const [section,setSection]=useState(initialSection||(forcedSection==="settings"?(mob?null:"profile"):(forcedSection==="profile"?"profile":(forcedSection||"meals"))));
  useEffect(()=>{
    if(initialSection){setSection(initialSection);return;}
    if(forcedSection==="profile")setSection("profile");
    else if(forcedSection==="meals")setSection("meals");
    else if(forcedSection==="settings")setSection(mob?null:"profile");
    else if(forcedSection)setSection(forcedSection);
  },[forcedSection,isAdmin,initialSection]);
  const isNoneExercise=(profile?.exerciseType||"gym")==="none";
  const [dayType,setDayType]=useState(()=>{
    // exerciseType=none → luôn "rest" (1 giá trị cố định)
    if((profile?.exerciseType||"gym")==="none") return "rest";
    // Luôn auto-detect theo gymDays hôm nay — KHÔNG đọc localStorage nữa
    // (localStorage giữ dayType từ phiên trước, dễ kẹt sai khi hôm nay đổi
    // loại ngày, VD hôm qua Tập → hôm nay Nghỉ mà toggle vẫn hiện Tập).
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
    // Ưu tiên cấu hình RIÊNG của user (profile.mealConfig, tự chỉnh trước đó) —
    // chỉ dùng mặc định chung của admin (appSettings.meal_config) khi user
    // chưa từng tự chỉnh.
    if(profile.mealConfig)return profile.mealConfig;
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
    // tu_nhap → load existing meals (luôn build lại, kể cả khi ngày mới chưa có
    // dữ liệu gì — trước đây return sớm ở đây khiến món ăn của ngày cũ còn sót
    // lại trên màn hình sau khi bấm đổi Ngày tập/Ngày nghỉ, nhìn như toggle không ăn)
    const currentMeals=getMeals(dayType);
    const init={};
    const visibleIds=mealConfig[dayType]||[];
    visibleIds.forEach(mid=>{
      const meal=currentMeals.find(m=>m.id===mid);
      if(meal&&meal.items&&meal.items.length>0){
        init[mid]=meal.items.map(it=>({name:it.display||it.food||it.name||"",gram:it.gram===0?0:(it.gram||""),unit:it.unit||"g",qty:it.qty||1,qty_display:it.qty_display||null,cal:it.cal||0}));
        // Giữ pattern (tên món) để MealsTab hiển thị — VD "Phở gà", "Bò xào hành tây"
        if(meal.pattern) init[mid]._pattern=meal.pattern;
        if(meal.composite) init[mid]._composite=true;
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
    if(meal&&meal.items&&meal.items.length>0) return meal.items.map(it=>({name:it.food||it.name||"",qty:1,gram:it.gram===0?0:(it.gram||100)}));
    return [{name:"",qty:1,gram:100}];
  });
  const [aiResult,setAiResult]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiError,setAiError]=useState(null);
  // Use shared keys from Supabase, fallback to localStorage for admin override
  const [aiProvider,setAiProvider]=useState(()=>localStorage.getItem("aiProvider")||appSettings.ai_provider||"claude");
  const [aiModel,setAiModel]=useState(()=>appSettings.ai_model||"claude-sonnet-5");
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
    // Chỉ áp mặc định chung của admin nếu user CHƯA từng tự chỉnh (không có
    // profile.mealConfig riêng) — tránh ghi đè mất cấu hình cá nhân mỗi khi
    // appSettings tải lại (VD khi quay lại tab sau 30s).
    if(appSettings.meal_config&&!profile.mealConfig){try{setMealConfig(JSON.parse(appSettings.meal_config));}catch(e){}}
  },[appSettings,profile.mealConfig]);

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
      setFoodItems(meal.items.map(it=>({name:it.food||it.name||"",qty:it.qty||1,gram:it.gram===0?0:(it.gram||100),unit:it.unit||"g"})));
    }else{
      setFoodItems([{name:"",qty:1,gram:100}]);
    }
    setAiResult(null);
  },[selectedMeal,dayType]);

  // Food items for AI calculation (set by tu_nhap before calling callAI)

  const prompt=`Bạn là chuyên gia dinh dưỡng. Phân tích dinh dưỡng cho thức ăn dưới đây.
Lưu ý: đồ uống (sữa, nước ép, sinh tố) tính theo ml chứ không phải g. 1ml nước/sữa ≈ 1g.
QUAN TRỌNG: mảng "items" trả về PHẢI có ĐÚNG số lượng và ĐÚNG THỨ TỰ như danh sách món được liệt kê (không gộp, không tách, không đổi thứ tự) — vì hệ thống ghép kết quả theo đúng vị trí đã gửi.
Trả lời CHÍNH XÁC bằng JSON, không markdown, không giải thích:
{"items":[{"name":"tên","gram":số,"protein":số,"carb":số,"fat":số,"fiber":số,"cal":số}],"tip":"1 câu gợi ý cho người gym"}`;

  const callAI=useCallback(async(forceRefresh=false,overrideFoods=null)=>{
    const itemsToCalc=overrideFoods||foodItems;
    if(itemsToCalc.length===0||itemsToCalc.every(f=>!f.name.trim()))return;
    setAiLoading(true);setAiError(null);setAiResult(null);
    // Món của chính user này đang chờ duyệt vẫn dùng được ngay (đỡ tốn thêm
    // lượt AI khi ăn lại), cache dùng chung (đã duyệt) được ưu tiên hơn nếu trùng
    const fc=forceRefresh?{}:({...(myPending||{}),...(foodCache||{})});
    const validItems=itemsToCalc.filter(f=>f.name.trim());

    // === STEP 1: LocalDB (192 món verified, ưu tiên cao nhất) ===
    const localResolved=[];const nonLocal=[];
    validItems.forEach(f=>{
      const unit=f.unit||"g";const isWeight=unit==="g"||unit==="ml";
      const gram=isWeight?(f.gram===0?0:(f.gram||100)):estimateGram(f.name,unit,f.qty||1);
      const localResult=lookupLocalFood(f.name,gram===0?0:(gram||(isWeight?f.gram:100)));
      if(localResult){
        localResolved.push({...localResult,name:f.name,unit,qty:f.qty||1,qty_display:isWeight?null:`${f.qty||1} ${unit}`,source:"localDB",_mealId:f._mealId});
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
          cached.push({name:f.name,gram:f.gram,unit,qty,qty_display:null,protein:Math.round(fc[k].p*r*10)/10,carb:Math.round(fc[k].c*r*10)/10,fat:Math.round(fc[k].f*r*10)/10,fiber:Math.round((fc[k].fiber||0)*r*10)/10,cal:Math.round(fc[k].cal*r),source:"cache",_mealId:f._mealId});
        }else{
          cached.push({name:f.name,gram:Math.round((fc[k].gram||0)*qty),unit,qty,qty_display:`${qty} ${unit}`,protein:Math.round(fc[k].p*qty*10)/10,carb:Math.round(fc[k].c*qty*10)/10,fat:Math.round(fc[k].f*qty*10)/10,fiber:Math.round((fc[k].fiber||0)*qty*10)/10,cal:Math.round(fc[k].cal*qty),source:"cache",_mealId:f._mealId});
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
            const rawMacro=calcFromUSDA(result,gram);
            // Cộng dầu theo cách chế biến (rán +5ml, xào +3ml...) —
            // USDA trả macro nguyên liệu raw, chưa tính dầu khi nấu.
            // Phải cộng TRƯỚC khi cache để cache lưu đúng giá trị cuối.
            const macro=adjustCookingOil(rawMacro,translated.cookEN);
            usdaResolved.push({name:f.name,gram,unit,qty:f.qty,qty_display:isWeight?null:`${f.qty} ${unit}`,...macro,source:"USDA",_mealId:f._mealId});
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
            const gram=inputItem?.gram;
            if(gram===0){/* 0g — không có gì để cache */}
            else{
              const r=100/(gram||100);
              newCacheEntries[k]={p:Math.round((it.protein||0)*r*10)/10,c:Math.round((it.carb||0)*r*10)/10,f:Math.round((it.fat||0)*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round((it.cal||0)*r),gram:100};
            }
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
    if(!flags.ai_macro){setAiError("Tính năng AI tính macro tự động đang tạm tắt. Món này chưa có trong Kho nội bộ/Cache/USDA, vui lòng nhập tay hoặc thử tên khác.");setAiLoading(false);return;}
    // Quota macro (theo THÁNG) giờ chặn Ở SERVER (edge function ai-proxy).
    const foodDesc=stillUncached.map(f=>{
      const unit=f.unit||"g";
      if(unit==="g"||unit==="ml") return `${f.qty>1?f.qty+" ":""}${f.name} ${f.gram}${unit}`;
      return `${f.qty} ${unit} ${f.name}`;
    }).join(", ");
    try{
      // Không bao giờ tự gọi thẳng Gemini/OpenAI từ client (buộc lộ key
      // thật ra trình duyệt của MỌI user, không chỉ admin — vì MealsTab
      // chạy cho mọi tier). Mọi provider đi qua ai-proxy, server tự đọc
      // đúng key từ app_settings (chỉ admin đọc được qua RLS) theo request.
      const data=await authFetch("ai-proxy",{foodDesc:`${prompt}\nThức ăn: ${foodDesc}`,provider:aiProvider,model:pickAiModel(aiProvider,{claudeModel:aiModel,geminiModel,gptModel}),feature:"macro_lookup"});
      if(data.error)throw new Error(data.error);
      const text=data.text||"";
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      const aiSourceLabel=aiProvider==="gpt"?"GPT":aiProvider==="claude"?"Claude":"Gemini";
      const aiItemsWithSource=(parsed.items||[]).map((it,idx)=>{
        // Khớp theo TÊN món trước (đáng tin hơn) — chỉ dùng vị trí trong mảng làm
        // phương án dự phòng cuối cùng, phòng khi AI trả về không đúng thứ tự tuyệt đối.
        const itName=(it.name||"").toLowerCase().trim();
        const matched=stillUncached.find(f=>f.name.toLowerCase().trim()===itName)||stillUncached[idx];
        return {...it,source:aiSourceLabel,_mealId:matched?._mealId};
      });
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
            const gram=it.gram===0?0:(it.gram||inputItem?.gram||100);
            if(gram===0){/* 0g — không có gì để cache */}
            else{
              const r=100/gram;
              newCacheEntries[k]={p:Math.round((it.protein||0)*r*10)/10,c:Math.round((it.carb||0)*r*10)/10,f:Math.round((it.fat||0)*r*10)/10,fiber:Math.round((it.fiber||0)*r*10)/10,cal:Math.round((it.cal||0)*r),gram:100};
            }
          }else{
            newCacheEntries[k]={p:Math.round((it.protein||0)/qty*10)/10,c:Math.round((it.carb||0)/qty*10)/10,f:Math.round((it.fat||0)/qty*10)/10,fiber:Math.round((it.fiber||0)/qty*10)/10,cal:Math.round((it.cal||0)/qty),gram:Math.round((it.gram||0)/qty)};
          }
        }
      });
      setAiResult({items:newItems,tip:parsed.tip||"",_cacheEntries:newCacheEntries});
    }catch(err){setAiError(err.message||"Lỗi kết nối AI");console.error(err);}
    finally{setAiLoading(false);}
  },[foodItems,aiModel,aiProvider,claudeKey,geminiKey,gptKey,geminiModel,gptModel,foodCache,myPending,usdaKey,user,flags.ai_macro]);

  const mealNames=ALL_MEALS.filter(m=>{if(isNoneExercise&&(m.id==="pre"||m.id==="post"))return false;return mealConfig[dayType]?.includes(m.id);}).map(m=>({id:m.id,l:`${m.icon} ${m.name}`}));

  return <div>
    {!hidePills&&!forcedSection&&<div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
      {[{id:"meals",l:"🍽️ Bữa ăn"},...(isAdmin?[{id:"ai",l:"🤖 Kết nối AI"},{id:"admin",l:"🔧 Quản lý version"},{id:"templates",l:"📚 Mẫu"},{id:"food_cache_pending",l:`🗂️ Kho món${pendingCount>0?` (${pendingCount})`:""}`}]:[]),{id:"profile",l:"👤 Hồ sơ"},{id:"weight",l:"⚖️ Cân nặng"}].map(s=>
        <Pill key={s.id} active={section===s.id} onClick={()=>{setSection(s.id);if(s.id==="templates"){const init={};(mealConfig[dayType]||[]).forEach(mid=>{init[mid]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);setAiResult(null);}}}>{s.l}</Pill>
      )}
    </div>}
    {!hidePills&&!mob&&forcedSection==="settings"&&<div style={{display:"flex",borderBottom:`2px solid ${C.border}`,marginBottom:16,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",msOverflowStyle:"none"}}>
      {[{id:"profile",t:"Hồ sơ",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pp1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="30" r="24" fill="url(#pp1)"/><path d="M4 96 C4 60 92 60 92 96 Z" fill="url(#pp1)"/></svg>},
        {id:"account",t:"Tài khoản",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="4" y="16" width="88" height="64" rx="12" fill="url(#pi5)"/><circle cx="28" cy="42" r="16" fill="white" opacity="0.95"/><circle cx="28" cy="37" r="7" fill="url(#pi5)"/><path d="M14 54 C14 46 42 46 42 54" fill="url(#pi5)"/><rect x="52" y="34" width="32" height="7" rx="3.5" fill="white" opacity="0.9"/><rect x="52" y="46" width="24" height="6" rx="3" fill="white" opacity="0.5"/></svg>},
        ...(!isAdmin?[{id:"feedback",t:"Góp ý & Phản hồi",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pifb" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="6" y="12" width="84" height="60" rx="14" fill="url(#pifb)"/><path d="M24 72 L24 84 L42 72" fill="url(#pifb)"/><circle cx="30" cy="42" r="6" fill="white" opacity="0.9"/><circle cx="48" cy="42" r="6" fill="white" opacity="0.9"/><circle cx="66" cy="42" r="6" fill="white" opacity="0.9"/></svg>}]:[]),
        {id:"about",t:"Giới thiệu",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#pi4)"/><rect x="44" y="42" width="8" height="28" rx="4" fill="white"/><circle cx="48" cy="30" r="6" fill="white"/></svg>},
        {id:"terms",t:"Điều khoản",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi6" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="18" y="6" width="60" height="84" rx="8" fill="url(#pi6)"/><rect x="30" y="24" width="36" height="6" rx="3" fill="white" opacity="0.85"/><rect x="30" y="40" width="36" height="6" rx="3" fill="white" opacity="0.6"/><rect x="30" y="56" width="24" height="6" rx="3" fill="white" opacity="0.4"/></svg>},
        ...(isAdmin?[{id:"admin",t:"Quản lý version",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pq1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="4" y="10" width="88" height="76" rx="14" fill="url(#pq1)"/><rect x="4" y="10" width="88" height="24" rx="14" fill="white" opacity="0.12"/><circle cx="22" cy="22" r="5" fill="white" opacity="0.6"/><circle cx="36" cy="22" r="5" fill="white" opacity="0.4"/><polyline points="18,52 32,62 18,72" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><rect x="38" y="67" width="40" height="7" rx="3.5" fill="white" opacity="0.65"/></svg>}]:[]),
        ...(isAdmin?[{id:"templates",t:"Mẫu",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pq2" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="12" y="70" width="72" height="16" rx="8" fill="url(#pq2)" opacity="0.45"/><rect x="16" y="52" width="64" height="16" rx="8" fill="url(#pq2)" opacity="0.7"/><rect x="20" y="34" width="56" height="16" rx="8" fill="url(#pq2)"/><polygon points="48,6 51,18 64,18 54,25 58,37 48,30 38,37 42,25 32,18 45,18" fill="url(#pq2)"/></svg>},
          {id:"ai",t:"AI",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pi1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="28" y="28" width="40" height="40" rx="8" fill="url(#pi1)"/><rect x="36" y="36" width="24" height="24" rx="4" fill="white" opacity="0.2"/><rect x="14" y="36" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="14" y="46" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="14" y="56" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="68" y="36" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="68" y="46" width="14" height="5" rx="2.5" fill="url(#pi1)"/><rect x="68" y="56" width="14" height="5" rx="2.5" fill="url(#pi1)"/></svg>}]:[])
      ].map(s=>
        <button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"10px 14px",fontSize:13,fontWeight:section===s.id?800:600,border:"none",background:"transparent",cursor:"pointer",color:section===s.id?C.primary:C.t2,borderBottom:section===s.id?`3px solid ${C.primary}`:"3px solid transparent",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:4}}>{s.svg} {s.t}</button>
      )}
    </div>}
    {!hidePills&&mob&&forcedSection==="settings"&&!initialSection&&section===null&&<div>
      <div style={{fontSize:22,fontWeight:800,color:C.t1,marginBottom:16}}>⚙️ Cài đặt</div>
      {(()=>{
        const exType=profile.exerciseType||"gym";
        const exLabel=exType==="gym"?"Gym":exType==="gym_cardio"?"Gym+Cardio":exType==="cardio"?"Cardio":"Nghỉ ngơi";
        const freqLabel=({occasional:"Thỉnh thoảng",regular:"Đều đặn",frequent:"Rất thường xuyên",daily:"Mỗi ngày"})[profile.frequency||"regular"]||"Đều đặn";
        return <div onClick={()=>setSection("profile")} style={{display:"flex",alignItems:"center",gap:12,padding:14,background:C.card,borderRadius:14,border:`1.5px solid ${C.border}`,marginBottom:20,cursor:"pointer"}}>
          <UserAvatar gender={profile?.gender} size={52}/>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:C.t1}}>{user.user_metadata?.username||user.email}</div>
            <div style={{fontSize:13,color:C.t2,marginTop:2}}>{exLabel} · {freqLabel}</div>
          </div>
          <span style={{fontSize:18,color:C.t3}}>›</span>
        </div>;
      })()}
      <div style={{fontSize:12,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.5px",margin:"0 4px 8px"}}>Cá nhân</div>
      <div style={{background:C.card,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden",marginBottom:20}}>
        {[
          {id:"profile",t:"Hồ sơ",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lp1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="30" r="24" fill="url(#lp1)"/><path d="M4 96 C4 60 92 60 92 96 Z" fill="url(#lp1)"/></svg>},
          {id:"account",t:"Tài khoản",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="li5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="4" y="16" width="88" height="64" rx="12" fill="url(#li5)"/><circle cx="28" cy="42" r="16" fill="white" opacity="0.95"/><circle cx="28" cy="37" r="7" fill="url(#li5)"/><path d="M14 54 C14 46 42 46 42 54" fill="url(#li5)"/><rect x="52" y="34" width="32" height="7" rx="3.5" fill="white" opacity="0.9"/><rect x="52" y="46" width="24" height="6" rx="3" fill="white" opacity="0.5"/></svg>},
          ...(!isAdmin?[{id:"feedback",t:"Góp ý & Phản hồi",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lifb" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="6" y="12" width="84" height="60" rx="14" fill="url(#lifb)"/><path d="M24 72 L24 84 L42 72" fill="url(#lifb)"/><circle cx="30" cy="42" r="6" fill="white" opacity="0.9"/><circle cx="48" cy="42" r="6" fill="white" opacity="0.9"/><circle cx="66" cy="42" r="6" fill="white" opacity="0.9"/></svg>}]:[]),
          {id:"about",t:"Giới thiệu",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="li4" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="48" r="42" fill="url(#li4)"/><rect x="44" y="42" width="8" height="28" rx="4" fill="white"/><circle cx="48" cy="30" r="6" fill="white"/></svg>},
          {id:"terms",t:"Điều khoản",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="li6" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="18" y="6" width="60" height="84" rx="8" fill="url(#li6)"/><rect x="30" y="24" width="36" height="6" rx="3" fill="white" opacity="0.85"/><rect x="30" y="40" width="36" height="6" rx="3" fill="white" opacity="0.6"/><rect x="30" y="56" width="24" height="6" rx="3" fill="white" opacity="0.4"/></svg>},
        ].map((s,i,arr)=>
          <div key={s.id} onClick={()=>setSection(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderBottom:i<arr.length-1?`1.5px solid ${C.border}`:"none",cursor:"pointer"}}>
            <div style={{width:34,height:34,borderRadius:9,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.svg}</div>
            <span style={{flex:1,fontSize:15,color:C.t1}}>{s.t}</span>
            <span style={{fontSize:18,color:C.t3}}>›</span>
          </div>
        )}
      </div>
      {isAdmin&&<>
      <div style={{fontSize:12,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.5px",margin:"0 4px 8px"}}>Quản trị</div>
      <div style={{background:C.card,borderRadius:14,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
        {[
          {id:"admin",t:"Quản lý version",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lq1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="4" y="10" width="88" height="76" rx="14" fill="url(#lq1)"/><rect x="4" y="10" width="88" height="24" rx="14" fill="white" opacity="0.12"/><circle cx="22" cy="22" r="5" fill="white" opacity="0.6"/><circle cx="36" cy="22" r="5" fill="white" opacity="0.4"/><polyline points="18,52 32,62 18,72" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><rect x="38" y="67" width="40" height="7" rx="3.5" fill="white" opacity="0.65"/></svg>},
          {id:"templates",t:"Kho mẫu",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lq2" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="12" y="70" width="72" height="16" rx="8" fill="url(#lq2)" opacity="0.45"/><rect x="16" y="52" width="64" height="16" rx="8" fill="url(#lq2)" opacity="0.7"/><rect x="20" y="34" width="56" height="16" rx="8" fill="url(#lq2)"/><polygon points="48,6 51,18 64,18 54,25 58,37 48,30 38,37 42,25 32,18 45,18" fill="url(#lq2)"/></svg>},
          {id:"ai",t:"Kết nối AI",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="li1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><rect x="28" y="28" width="40" height="40" rx="8" fill="url(#li1)"/><rect x="36" y="36" width="24" height="24" rx="4" fill="white" opacity="0.2"/><rect x="14" y="36" width="14" height="5" rx="2.5" fill="url(#li1)"/><rect x="14" y="46" width="14" height="5" rx="2.5" fill="url(#li1)"/><rect x="14" y="56" width="14" height="5" rx="2.5" fill="url(#li1)"/><rect x="68" y="36" width="14" height="5" rx="2.5" fill="url(#li1)"/><rect x="68" y="46" width="14" height="5" rx="2.5" fill="url(#li1)"/><rect x="68" y="56" width="14" height="5" rx="2.5" fill="url(#li1)"/></svg>},
          {id:"orders",t:"Duyệt đơn hàng",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lq5" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="18" y="10" width="60" height="76" rx="10" fill="url(#lq5)"/><rect x="28" y="26" width="40" height="6" rx="3" fill="white" opacity="0.8"/><rect x="28" y="40" width="40" height="6" rx="3" fill="white" opacity="0.5"/><circle cx="62" cy="66" r="16" fill="white"/><path d="M55 66 L60 71 L70 60" fill="none" stroke="url(#lq5)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>},
          {id:"report_biz",t:"Báo cáo kinh doanh",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lq6" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="10" y="10" width="76" height="76" rx="12" fill="url(#lq6)"/><rect x="24" y="52" width="10" height="24" rx="3" fill="white"/><rect x="43" y="38" width="10" height="38" rx="3" fill="white" opacity="0.85"/><rect x="62" y="26" width="10" height="50" rx="3" fill="white" opacity="0.7"/></svg>},
          {id:"feature_flags",t:"Quản lý tính năng",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lq7" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="14" y="14" width="68" height="20" rx="10" fill="url(#lq7)"/><circle cx="66" cy="24" r="7" fill="white"/><rect x="14" y="42" width="68" height="20" rx="10" fill="url(#lq7)" opacity="0.6"/><circle cx="30" cy="52" r="7" fill="white"/><rect x="14" y="70" width="68" height="20" rx="10" fill="url(#lq7)"/><circle cx="66" cy="80" r="7" fill="white"/></svg>},
          {id:"ai_cost",t:"Chi phí AI",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lq8" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><circle cx="48" cy="48" r="40" fill="url(#lq8)"/><path d="M62 34 C62 26 55 22 46 22 C37 22 30 27 30 33 C30 40 36 43 46 48 C56 53 62 56 62 63 C62 70 55 74 46 74 C37 74 30 70 30 62" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" opacity="0.9"/><line x1="46" y1="10" x2="46" y2="24" stroke="white" strokeWidth="7" strokeLinecap="round" opacity="0.9"/><line x1="46" y1="72" x2="46" y2="86" stroke="white" strokeWidth="7" strokeLinecap="round" opacity="0.9"/></svg>},
          {id:"feedback",t:"Phản hồi KH",svg:<svg viewBox="0 0 96 96" width={18} height={18}><defs><linearGradient id="lqfb" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="55%" stopColor="#0050FF"/><stop offset="100%" stopColor="#DC2626"/></linearGradient></defs><rect x="6" y="12" width="84" height="60" rx="14" fill="url(#lqfb)"/><path d="M24 72 L24 84 L42 72" fill="url(#lqfb)"/><circle cx="30" cy="42" r="6" fill="white" opacity="0.9"/><circle cx="48" cy="42" r="6" fill="white" opacity="0.9"/><circle cx="66" cy="42" r="6" fill="white" opacity="0.9"/></svg>},
        ].map((s,i,arr)=>
          <div key={s.id} onClick={()=>{setSection(s.id);if(s.id==="templates"){const init={};(mealConfig[dayType]||[]).forEach(mid=>{init[mid]=[{name:"",gram:"",unit:"g",qty:1}];});setAllFoodItems(init);setAiResult(null);}}} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",borderBottom:i<arr.length-1?`1.5px solid ${C.border}`:"none",cursor:"pointer"}}>
            <div style={{width:34,height:34,borderRadius:9,background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s.svg}</div>
            <span style={{flex:1,fontSize:15,color:C.t1}}>{s.t}</span>
            <span style={{fontSize:18,color:C.t3}}>›</span>
          </div>
        )}
      </div>
      </>}
    </div>}
    {!hidePills&&mob&&forcedSection==="settings"&&!initialSection&&section!==null&&<div onClick={()=>setSection(null)} style={{display:"flex",alignItems:"center",gap:4,marginBottom:14,cursor:"pointer",color:C.primary,fontSize:15,fontWeight:600}}>
      <span style={{fontSize:20}}>‹</span> Cài đặt
    </div>}
    {!hidePills&&forcedSection==="profile"&&<div style={{display:"flex",borderBottom:`2px solid ${C.border}`,marginBottom:16}}>
      {[{id:"profile",t:"Hồ sơ",svg:<svg viewBox="0 0 96 96" width={14} height={14}><defs><linearGradient id="pp1" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#40C8FF"/><stop offset="100%" stopColor="#0050FF"/></linearGradient></defs><circle cx="48" cy="30" r="24" fill="url(#pp1)"/><path d="M4 96 C4 60 92 60 92 96 Z" fill="url(#pp1)"/></svg>}
      ].map(s=>
        <button key={s.id} onClick={()=>setSection(s.id)} style={{padding:"10px 14px",fontSize:13,fontWeight:section===s.id?800:600,border:"none",background:"transparent",cursor:"pointer",color:section===s.id?C.primary:C.t2,borderBottom:section===s.id?`3px solid ${C.primary}`:"3px solid transparent",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>{s.svg} {s.t}</button>
      )}
    </div>}

    {/* AI CONNECTION */}
    {section==="ai"&&<AiTab isAdmin={isAdmin} saveSetting={saveSetting} aiProvider={aiProvider} setAiProvider={setAiProvider} aiModel={aiModel} setAiModel={setAiModel} geminiModel={geminiModel} setGeminiModel={setGeminiModel} gptModel={gptModel} setGptModel={setGptModel} aiConnected={aiConnected} setAiConnected={setAiConnected} claudeKey={claudeKey} setClaudeKey={setClaudeKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} gptKey={gptKey} setGptKey={setGptKey} usdaKey={usdaKey} setUsdaKey={setUsdaKey} appSettings={appSettings}/>}
    {section==="subscription_settings"&&isAdmin&&<SubscriptionSettingsTab isAdmin={isAdmin}/>}
    {section==="users"&&isAdmin&&<UsersTab isAdmin={isAdmin} currentUserId={user?.id}/>}
    {section==="orders"&&isAdmin&&<OrdersTab isAdmin={isAdmin} currentUserId={user?.id} appSettings={appSettings}/>}
    {section==="report_biz"&&isAdmin&&<BusinessReportTab isAdmin={isAdmin}/>}
    {section==="error_logs"&&isAdmin&&<ErrorLogsTab isAdmin={isAdmin}/>}
    {section==="audit_log"&&isAdmin&&<AuditLogTab isAdmin={isAdmin}/>}
    {section==="notify"&&isAdmin&&<NotifyTab isAdmin={isAdmin} currentUserId={user?.id} appSettings={appSettings}/>}
    {section==="feature_flags"&&isAdmin&&<FeatureFlagsTab appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting}/>}
    {section==="system_health"&&isAdmin&&<SystemHealthTab isAdmin={isAdmin} appSettings={appSettings}/>}
    {section==="ai_cost"&&isAdmin&&<AiCostTab isAdmin={isAdmin}/>}
    {/* ADMIN PANEL */}
    {section==="admin"&&isAdmin&&<AdminTab appSettings={appSettings} saveSetting={saveSetting} mob={mob}/>}

    {/* TEMPLATES (admin only — separate pill) */}
    {section==="templates"&&isAdmin&&<TemplatesTab isAdmin={isAdmin} mob={mob} macro={macro} defaultTemplates={defaultTemplates} saveDefaultTemplate={saveDefaultTemplate} deleteDefaultTemplate={deleteDefaultTemplate} mealNames={mealNames} mealsData={mealsData} callAI={callAI} allFoodItems={allFoodItems} setAllFoodItems={setAllFoodItems} aiResult={aiResult} setAiResult={setAiResult} aiLoading={aiLoading} aiError={aiError} setAiError={setAiError} setDayType={setDayType} setFoodItems={setFoodItems} setUserHasEdited={setUserHasEdited} savePendingFoodCache={savePendingFoodCache} aiProvider={aiProvider}/>}
    {section==="weekly_bundles"&&isAdmin&&<WeeklyBundlesTab mob={mob} defaultTemplates={defaultTemplates} weeklyBundles={weeklyBundles} saveWeeklyBundle={saveWeeklyBundle} deleteWeeklyBundle={deleteWeeklyBundle}/>}
    {section==="food_cache_pending"&&isAdmin&&<FoodCachePendingTab mob={mob} allPending={allPending} pendingCount={pendingCount} approvedCount={approvedCount} approvePendingFood={approvePendingFood} rejectPendingFood={rejectPendingFood}/>}
    {/* MEALS */}
    {section==="meals"&&<MealsTab mob={mob} profile={profile} setProfile={setProfile} macro={macro} appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mealMode={mealMode} setMealMode={setMealMode} dayType={dayType} setDayType={setDayType} showMealSettings={showMealSettings} setShowMealSettings={setShowMealSettings} mealConfig={mealConfig} setMealConfig={setMealConfig} allFoodItems={allFoodItems} setAllFoodItems={setAllFoodItems} userHasEdited={userHasEdited} setUserHasEdited={setUserHasEdited} foodItems={foodItems} setFoodItems={setFoodItems} aiResult={aiResult} setAiResult={setAiResult} aiLoading={aiLoading} aiError={aiError} setAiError={setAiError} aiProvider={aiProvider} callAI={callAI} mealNames={mealNames} saveMealToCloud={saveMealToCloud} saveFoodCache={saveFoodCache} savePendingFoodCache={savePendingFoodCache} deleteFoodCache={deleteFoodCache} getMeals={getMeals} weeklyTemplates={weeklyTemplates} saveWeeklyTemplate={saveWeeklyTemplate} getWeeklyTemplate={getWeeklyTemplate} deleteWeeklyTemplate={deleteWeeklyTemplate} defaultTemplates={defaultTemplates} refreshDefaultTemplates={refreshDefaultTemplates} applyTemplate={applyTemplate} showSaveTpl={showSaveTpl} setShowSaveTpl={setShowSaveTpl} expandedTpl={expandedTpl} setExpandedTpl={setExpandedTpl} tplFilter={tplFilter} setTplFilter={setTplFilter} showAssignDays={showAssignDays} setShowAssignDays={setShowAssignDays} assignSelectedDays={assignSelectedDays} setAssignSelectedDays={setAssignSelectedDays} weeklyBundles={weeklyBundles}/>}

    {/* PROFILE */}
    {section==="profile"&&<ProfileTab profile={profile} setProfile={setProfile} macro={macro} appSettings={appSettings} saveSetting={saveSetting} weightLog={weightLog} mob={mob}/>}

    {/* WEIGHT */}
    {section==="weight"&&<WeightTab weightLog={weightLog} addWeight={addWeight} deleteWeight={deleteWeight} setWeightLog={setWeightLog} profile={profile} setProfile={setProfile} mob={mob}/>}
    {/* ABOUT */}
    {section==="about"&&<AboutPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={mob}/>}
    {section==="terms"&&<TermsPage appSettings={appSettings} isAdmin={isAdmin} saveSetting={saveSetting} mob={mob}/>}

    {/* ACCOUNT */}
    {section==="account"&&<AccountTab user={user} signOut={signOut} isAdmin={isAdmin} profile={profile} mob={mob} appSettings={appSettings}/>}
    {section==="feedback"&&<FeedbackTab user={user} isAdmin={isAdmin}/>}

    <style>{`@keyframes spin{to{transform:rotate(360deg);}} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;} input[type=number]{-moz-appearance:textfield;}`}</style>
  </div>;
}
