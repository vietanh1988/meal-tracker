import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";

export function AICoachPanel({profile,macro,weightLog,todayData,mob,onClose,appSettings,isAdmin,getMeals,getWeeklyTemplate,foodCache,userId}){
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [historyLoaded,setHistoryLoaded]=useState(false);

  // Load chat history from Supabase (fallback localStorage)
  useEffect(()=>{
    if(!userId){setHistoryLoaded(true);return;}
    (async()=>{
      try{
        // Auto delete messages older than 30 days
        const cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
        await supabase.from("ai_chat_history").delete().eq("user_id",userId).lt("created_at",cutoff.toISOString());

        // Load last 100 messages
        const {data,error}=await supabase.from("ai_chat_history").select("id,role,content,created_at").eq("user_id",userId).order("created_at",{ascending:true}).limit(100);
        if(error){console.warn("AI Chat load error:",error);throw error;}
        if(data&&data.length>0){
          setMessages(data.map(d=>({role:d.role,content:d.content})));
          localStorage.setItem("aicoach_backup",JSON.stringify(data.map(d=>({role:d.role,content:d.content}))));
        }
        setHistoryLoaded(true);
      }catch(e){
        // Fallback: load from localStorage
        try{const backup=JSON.parse(localStorage.getItem("aicoach_backup")||"[]");if(backup.length>0)setMessages(backup);}catch(e2){}
        setHistoryLoaded(true);
      }
    })();
  },[userId]);

  // Save message to Supabase + localStorage backup
  const saveMsg=async(role,content)=>{
    // Always backup to localStorage
    const updated=[...messages,{role,content}].slice(-20);
    localStorage.setItem("aicoach_backup",JSON.stringify(updated));
    if(!userId)return;
    try{
      const {error}=await supabase.from("ai_chat_history").insert({user_id:userId,role,content});
      if(error)console.warn("AI Chat save error:",error);
    }catch(e){console.warn("AI Chat save failed:",e);}
  };
  const [dailyCount,setDailyCount]=useState(()=>{try{const d=JSON.parse(localStorage.getItem("aicoach_usage")||"{}");return d.date===new Date().toDateString()?d.count:0;}catch(e){return 0;}});
  const chatRef=useRef(null);
  const MAX_DAILY=20;
  const aiModel=appSettings?.ai_model||"claude-sonnet-4-20250514";

  const saveDailyCount=(c)=>{setDailyCount(c);localStorage.setItem("aicoach_usage",JSON.stringify({date:new Date().toDateString(),count:c}));};

  // Context engine
  const buildContext=()=>{
    const p=profile||{};const m=macro||{};const t=todayData||{};
    const wl=weightLog||[];const curW=wl.length>0?wl[wl.length-1].kg:p.kg;
    const startW=wl.length>0?wl[0].kg:p.kg;
    const trend=wl.length>=2?((wl[wl.length-1].kg-wl[0].kg)/wl.length).toFixed(1):"chưa đủ data";
    const age=p.birthYear?new Date().getFullYear()-p.birthYear:"?";
    const freqLabel={occasional:"Thỉnh thoảng (1-2 buổi/tuần)",regular:"Đều đặn (3-4 buổi/tuần)",frequent:"Rất thường xuyên (5-6 buổi/tuần)",daily:"Gần như mỗi ngày"}[p.frequency||"regular"]||"Đều đặn";
    const exLabel={gym:"Gym",gym_cardio:"Gym + Cardio",cardio:"Cardio",none:"Không tập"}[p.exerciseType||"gym"]||"Gym";
    const goalLabel={bulk:"Tăng cơ (+250 cal)",cut:"Giảm mỡ (-350 cal)",maintain:"Duy trì"}[p.goalType||"bulk"]||"Tăng cơ";
    const dietLabel=p.goalType==="cut"?{balanced:"Cân bằng",low_carb:"Low-carb (≤100g carb)",keto:"Keto (≤50g carb)"}[p.dietStrategy||"balanced"]||"Cân bằng":"Cân bằng (mặc định)";
    const calMode=(p.calorieMode||"standard")==="asian"?"Việt Nam (-10%)":"Quốc tế";
    const isRest=t.dayType==="rest";
    const todayTarget=isRest?(m.calRest||m.calTarget):m.calTarget;
    const todayCarb=isRest?(m.carbRest||m.carb):m.carb;
    const eaten=t.cal||0;
    const deficit=todayTarget-eaten;
    const calStatus=eaten===0?"Chưa ăn gì":deficit>0?`Còn thiếu ${deficit} cal`:deficit<0?`Dư ${Math.abs(deficit)} cal`:"Vừa đủ calo";
    // Today's meal details
    let mealDetails="";
    if(getMeals){
      try{
        const mc=(()=>{try{return appSettings?.meal_config?JSON.parse(appSettings.meal_config):{train:["breakfast","lunch","snack","dinner"],rest:["breakfast","lunch","snack","dinner"]};}catch(e){return{train:["breakfast","lunch","snack","dinner"],rest:["breakfast","lunch","snack","dinner"]};}})();
        const ids=mc[isRest?"rest":"train"]||mc.train;
        const ms=getMeals(isRest?"rest":"train").filter(m2=>ids.includes(m2.id));
        const mealNames={breakfast:"Bữa sáng",lunch:"Bữa trưa",snack:"Bữa phụ",dinner:"Bữa tối"};
        const details=ms.filter(m2=>m2.items.length>0).map(m2=>{
          const cal=Math.round(m2.items.reduce((s,i)=>s+(i.cal||0),0));
          const items=m2.items.map(i=>`${i.name} (${Math.round(i.cal||0)} cal)`).join(", ");
          return `  ${mealNames[m2.id]||m2.id}: ${items} → ${cal} cal`;
        });
        if(details.length>0) mealDetails="\n- Chi tiết:\n"+details.join("\n");
      }catch(e){}
    }

    // Tomorrow planned meals
    let tmrPlan="";
    if(getWeeklyTemplate){
      try{
        const days=["cn","t2","t3","t4","t5","t6","t7"];
        const tmrKey=days[tmrIdx];
        const tpl=getWeeklyTemplate(tmrKey);
        if(tpl&&tpl.meals){
          const mealNames={breakfast:"Sáng",lunch:"Trưa",snack:"Phụ",dinner:"Tối"};
          const planned=Object.entries(tpl.meals).filter(([,v])=>v&&v.items&&v.items.length>0).map(([k,v])=>{
            const cal=Math.round(v.items.reduce((s,i)=>s+(i.cal||0),0));
            return `  ${mealNames[k]||k}: ${v.items.map(i=>i.name).join(", ")} → ${cal} cal`;
          });
          if(planned.length>0) tmrPlan="\n- Đã lên kế hoạch:\n"+planned.join("\n");
        }
      }catch(e){}
    }
    const tmr=new Date();tmr.setDate(tmr.getDate()+1);
    const tmrIdx=tmr.getDay();
    const tmrMapped=tmrIdx===0?6:tmrIdx-1;
    const tmrIsRest=!(p.gymDays||[]).includes(tmrMapped);
    const tmrTarget=tmrIsRest?(m.calRest||m.calTarget):m.calTarget;
    const tmrCarb=tmrIsRest?(m.carbRest||m.carb):m.carb;
    const tmrDayLabel=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"][tmrIdx];
    // Food database from cache
    let foodDB="";
    if(foodCache&&Object.keys(foodCache).length>0){
      const foods=Object.entries(foodCache).slice(0,30).map(([name,v])=>`  ${name}: ${v.cal}cal/${v.gram||100}${v.unit||"g"} (P:${v.p}g C:${v.c}g F:${v.f}g)`);
      foodDB=`\n\nKHO MÓN ĂN CỦA USER (${Object.keys(foodCache).length} món, ưu tiên gợi ý từ đây):\n${foods.join("\n")}`;
    }

    return `THÔNG TIN USER:
- Giới tính: ${p.gender==="male"?"Nam":"Nữ"}, ${age} tuổi, ${p.kg}kg, ${p.cm}cm
- BMI: ${m.bmi} | Tập: ${exLabel}, ${freqLabel}
- Mục tiêu: ${goalLabel} | Chế độ ăn: ${dietLabel} | Calo: ${calMode}

MACRO MỤC TIÊU (${isRest?"ngày nghỉ":"ngày tập"}):
- Calo: ${todayTarget} cal | P: ${m.protein}g | C: ${todayCarb}g | F: ${m.fat}g

HÔM NAY (${isRest?"nghỉ":"tập"}):
- Đã ăn: ${eaten} cal (P:${t.p||0}g C:${t.c||0}g F:${t.f||0}g)
- ${calStatus}${mealDetails}
${eaten>0?`
ĐÁNH GIÁ TỰ ĐỘNG (app đã tính sẵn, dùng để tư vấn):
- Calo: ${eaten}/${todayTarget} (${eaten>=todayTarget?"dư":"thiếu"} ${Math.abs(todayTarget-eaten)} cal, ${Math.round(Math.abs(todayTarget-eaten)/todayTarget*100)}%)${Math.abs(todayTarget-eaten)/todayTarget<=0.1?" → OK":""}${Math.abs(todayTarget-eaten)/todayTarget>0.1&&Math.abs(todayTarget-eaten)/todayTarget<=0.2?" → hơi lệch":""}${Math.abs(todayTarget-eaten)/todayTarget>0.2?" → lệch nhiều":""}
- Protein: ${t.p||0}/${m.protein}g (${(t.p||0)>=m.protein?"dư":"thiếu"} ${Math.abs(m.protein-(t.p||0))}g, ${Math.round(Math.abs(m.protein-(t.p||0))/m.protein*100)}%)${Math.abs(m.protein-(t.p||0))/m.protein<=0.1?" → OK":""}${Math.abs(m.protein-(t.p||0))/m.protein>0.1&&Math.abs(m.protein-(t.p||0))/m.protein<=0.2?" → hơi lệch":""}${Math.abs(m.protein-(t.p||0))/m.protein>0.2?" → lệch nhiều":""}
- Carb: ${t.c||0}/${todayCarb}g (${(t.c||0)>=todayCarb?"dư":"thiếu"} ${Math.abs(todayCarb-(t.c||0))}g, ${Math.round(Math.abs(todayCarb-(t.c||0))/todayCarb*100)}%)${Math.abs(todayCarb-(t.c||0))/todayCarb<=0.1?" → OK":""}${Math.abs(todayCarb-(t.c||0))/todayCarb>0.1&&Math.abs(todayCarb-(t.c||0))/todayCarb<=0.2?" → hơi lệch":""}${Math.abs(todayCarb-(t.c||0))/todayCarb>0.2?" → lệch nhiều":""}
- Fat: ${t.f||0}/${m.fat}g (${(t.f||0)>=m.fat?"dư":"thiếu"} ${Math.abs(m.fat-(t.f||0))}g, ${Math.round(Math.abs(m.fat-(t.f||0))/m.fat*100)}%)${Math.abs(m.fat-(t.f||0))/m.fat<=0.1?" → OK":""}${Math.abs(m.fat-(t.f||0))/m.fat>0.1&&Math.abs(m.fat-(t.f||0))/m.fat<=0.2?" → hơi lệch":""}${Math.abs(m.fat-(t.f||0))/m.fat>0.2?" → lệch nhiều":""}
`:""}

NGÀY MAI (${tmrDayLabel}, ${tmrIsRest?"nghỉ":"tập"}):
- Calo mục tiêu: ${tmrTarget} cal | P: ${m.protein}g | C: ${tmrCarb}g | F: ${m.fat}g${tmrPlan}

CÂN NẶNG:
- ${startW}kg → ${curW}kg → mục tiêu ${p.goalKg}kg
- Trend: ${trend} kg/tuần (${wl.length} tuần)${foodDB}

LƯU Ý QUAN TRỌNG:
- Chỉ tư vấn dựa trên MACRO MỤC TIÊU ở trên, KHÔNG tự suy diễn chế độ ăn khác
- Nếu chế độ là "Cân bằng" thì gợi ý ăn bình thường (có cơm, tinh bột đầy đủ)
- Nếu chế độ là "Low-carb" thì carb ≤100g, nếu "Keto" thì carb ≤50g
- Khi user hỏi "ngày mai ăn gì", dùng MACRO NGÀY MAI để gợi ý

QUY TẮC GỢI Ý MÓN ĂN (BẮT BUỘC):
1. LUÔN gợi ý từ KHO MÓN ĂN CỦA USER trước — dùng ĐÚNG số calo/macro trong kho, KHÔNG tự tính lại
2. Khi gợi ý, ghi rõ: "Theo kho của anh, [món] = [X] cal/[Y]g"
3. Chỉ gợi ý món NGOÀI kho khi: user hỏi món cụ thể không có trong kho, hoặc kho không đủ đa dạng
4. Khi gợi ý món ngoài kho, ghi rõ: "Món này chưa có trong kho, calo ước tính ~[X] cal"
5. KHÔNG BAO GIỜ tự bịa số calo — nếu không chắc, nói "mình không chắc calo chính xác, anh nên kiểm tra lại"`;
  };

  const systemPrompt=`Bạn là Fipilot AI — trợ lý dinh dưỡng & tập luyện tích hợp trong app Fipilot.

NGUYÊN TẮC QUAN TRỌNG NHẤT:
1. BẮT BUỘC đọc toàn bộ CONTEXT bên dưới trước khi trả lời
2. Chỉ dùng số liệu calo/macro từ KHO MÓN ĂN hoặc MACRO MỤC TIÊU trong context
3. KHÔNG BAO GIỜ tự ước lượng calo — nếu món không có trong kho, nói rõ "món này chưa có trong kho, calo ước tính khoảng X"
4. Khi gợi ý thực đơn: ƯU TIÊN chọn từ KHO MÓN ĂN CỦA USER (đã có calo chính xác)
5. Khi đánh giá: đọc CHI TIẾT BỮA ĂN HÔM NAY và so với MACRO MỤC TIÊU
6. Khi hỏi "ngày mai": đọc NGÀY MAI (tập/nghỉ + target + kế hoạch nếu có)

PHONG CÁCH:
- Xưng "mình", gọi user "anh/chị"
- Ngắn gọn 3-4 câu, thân thiện, dễ hiểu
- Gợi ý thực phẩm Việt Nam phổ biến
- Khi gợi ý món, LUÔN kèm gram + calo chính xác từ kho
- Dùng emoji vừa phải

ĐƯỢC PHÉP:
🍽️ Dinh dưỡng: gợi ý thực phẩm từ kho user, đánh giá thực đơn, tư vấn calo/macro, low-carb/keto, ăn trước/sau tập
🏋️ Tập luyện: bài tập gym, lịch tập, cardio, warm up/cool down, set/rep

KHÔNG ĐƯỢC PHÉP (từ chối lịch sự, khuyên gặp bác sĩ):
🚫 Bệnh lý (viêm gan, tiểu đường, gout, tim mạch, thận...)
🚫 Kê đơn thuốc, thực phẩm chức năng liều cao
🚫 Chẩn đoán triệu chứng, đau nhức
🚫 Phụ nữ mang thai, cho con bú, trẻ em dưới 16
🚫 Tập khi chấn thương, phục hồi chấn thương

KHI TỪ CHỐI: "Với vấn đề [X], anh/chị nên gặp bác sĩ/chuyên gia để được tư vấn. Mình chỉ tư vấn dinh dưỡng và tập luyện cho người khỏe mạnh."

VÍ DỤ TRẢ LỜI ĐÚNG:
- User hỏi "Bổ sung gì?": Đọc HÔM NAY thiếu bao nhiêu cal → chọn từ KHO MÓN ĂN → "Anh thêm 200g ức gà luộc (330 cal, P:62g) + 1 quả chuối (89 cal) là đủ!"
- User hỏi "Mai ăn gì?": Đọc NGÀY MAI tập/nghỉ + target → lên thực đơn từ KHO → tính tổng cal khớp target
- User hỏi "Đánh giá thực đơn": Đọc CHI TIẾT BỮA ĂN → so MACRO MỤC TIÊU → chỉ ra thiếu/dư gì

QUY TẮC ĐÁNH GIÁ MACRO (BẮT BUỘC):
- App đã tính sẵn % chênh lệch trong ĐÁNH GIÁ TỰ ĐỘNG — LUÔN dùng kết quả này
- KHÔNG tự tính lại, KHÔNG đánh giá khác với kết quả app
- Nếu app ghi "lệch nhiều" → phải cảnh báo, KHÔNG được nói "tốt" hay "chấp nhận được"
- Nếu app ghi "hơi lệch" → nhắc nhẹ, gợi ý điều chỉnh
- Nếu app ghi "OK" → khen
- Trả lời tự nhiên, thân thiện — không cần bảng, không liệt kê máy móc
- Tập trung vào 1-2 vấn đề quan trọng nhất + gợi ý cụ thể từ kho món ăn

CONTEXT:
${buildContext()}`;

  const sendMessage=async(text)=>{
    if(!text.trim()||loading)return;
    if(!isAdmin&&dailyCount>=MAX_DAILY){setMessages(prev=>[...prev,{role:"user",content:text},{role:"assistant",content:"Bạn đã hết 20 lượt hỏi hôm nay. Quay lại ngày mai nhé! 😊"}]);return;}
    const newMsgs=[...messages,{role:"user",content:text}];
    setMessages(newMsgs);setInput("");setLoading(true);
    saveMsg("user",text);
    try{
      const chatHistory=newMsgs.slice(-10).map(m=>`${m.role==="user"?"User":"Fipilot AI"}: ${m.content}`).join("\n");
      const fullPrompt=`${systemPrompt}\n\n--- LỊCH SỬ CHAT ---\n${chatHistory}\n\n--- TRẢ LỜI ---\nFipilot AI:`;
      const res=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({foodDesc:fullPrompt,provider:"claude",model:aiModel})
      });
      const data=await res.json();
      if(data.error)throw new Error(data.error);
      const reply=(data.text||"").trim()||"Xin lỗi, mình không thể trả lời lúc này.";
      const cleanReply=reply.replace(/^Fipilot AI:\s*/,"");
      setMessages(prev=>[...prev,{role:"assistant",content:cleanReply}]);
      saveMsg("assistant",cleanReply);
      saveDailyCount(dailyCount+1);
    }catch(e){setMessages(prev=>[...prev,{role:"assistant",content:"⚠️ Lỗi kết nối. Thử lại sau nhé!"}]);}
    setLoading(false);
  };

  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages,loading]);

  // Welcome message — only if no history from Supabase
  useEffect(()=>{
    if(!historyLoaded)return;
    if(messages.length===0){
      const t=todayData||{};const m=macro||{};
      const isRest=t.dayType==="rest";
      const target=isRest?(m.calRest||m.calTarget):m.calTarget;
      const deficit=target-(t.cal||0);
      const welcome=(t.cal||0)>0
        ?(deficit>0?`Chào anh! Hôm nay (${isRest?"nghỉ":"tập"}) còn thiếu ${deficit} cal. Mình có thể gợi ý bữa ăn phù hợp! 💪`:`Chào anh! Hôm nay ăn đủ calo rồi. Cần mình tư vấn gì thêm không? 😊`)
        :"Chào anh! Mình là Fipilot AI. Hỏi mình về dinh dưỡng hoặc tập luyện nhé! 💪";
      setMessages([{role:"assistant",content:welcome}]);
      saveMsg("assistant",welcome);
    }
  },[historyLoaded]);

  const quickPrompts=(()=>{
    const t=todayData||{};const m=macro||{};
    const isR=t.dayType==="rest";
    const tgt=isR?(m.calRest||m.calTarget):m.calTarget;
    if((t.cal||0)===0)return["Gợi ý thực đơn hôm nay","Bữa sáng nên ăn gì?","Bài tập gym hôm nay","TDEE là gì?"];
    if((t.cal||0)<tgt*0.95)return["Hôm nay ăn gì thêm?","Gợi ý bữa phụ","Đánh giá thực đơn","Bài tập hôm nay"];
    return["Đánh giá thực đơn","Ngày mai ăn gì?","Lịch tập tuần này","Làm sao giảm mỡ nhanh?"];
  })();

  const C2={primary:"#007AFF",bg:"#F0F2F5",surface:"#fff",border:"#E2E8F0",t1:"#1a1a2e",t2:"#64748B",t3:"#94A3B8"};

  // Panel style
  const panelStyle=mob?{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:999,background:C2.surface,display:"flex",flexDirection:"column",paddingTop:"env(safe-area-inset-top, 0px)"}
    :{position:"fixed",top:0,right:0,width:400,bottom:0,zIndex:999,background:C2.surface,boxShadow:"-4px 0 20px rgba(0,0,0,0.1)",display:"flex",flexDirection:"column"};

  return <div>
    {/* Backdrop (PC only) */}
    {!mob&&<div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.2)",zIndex:998}}/>}

    <div style={panelStyle}>
      {/* Header */}
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${C2.border}`,display:"flex",alignItems:"center",gap:10}}>
        {mob&&<span onClick={onClose} style={{fontSize:20,color:C2.primary,cursor:"pointer"}}>←</span>}
        <span style={{fontSize:18}}>✨</span>
        <span style={{fontSize:17,fontWeight:800,color:C2.t1,flex:1}}>Fipilot AI <span style={{fontSize:12,fontWeight:500,color:C2.t3}}>(Hỏi gì cũng được)</span></span>
        <span style={{fontSize:11,color:"#22C55E",display:"flex",alignItems:"center",gap:4}}>● Online</span>
        {!mob&&<span onClick={onClose} style={{fontSize:18,color:C2.t3,cursor:"pointer"}}>✕</span>}
      </div>

      {/* Context bar */}
      <div style={{padding:"8px 18px",background:"rgba(0,122,255,0.04)",display:"flex",flexWrap:"wrap",gap:4,alignItems:"center",borderBottom:`1px solid ${C2.border}`}}>
        <span style={{fontSize:11,color:C2.primary,fontWeight:600}}>🧠</span>
        {[`${profile?.kg||65}kg`,{gym:"Gym",gym_cardio:"Gym+Cardio",cardio:"Cardio",none:"Nghỉ"}[profile?.exerciseType||"gym"],
          {bulk:"💪 Tăng cơ",cut:"🔥 Giảm mỡ",maintain:"⚖️ Duy trì"}[profile?.goalType||"bulk"],
          ...(profile?.goalType==="cut"&&(profile?.dietStrategy||"balanced")!=="balanced"?[{low_carb:"🥗 Low-carb",keto:"🥗 Keto"}[profile?.dietStrategy]]:[]),
          todayData?.dayType==="train"?"🏋️ Ngày tập":"😴 Ngày nghỉ",
          ...((profile?.calorieMode||"standard")==="asian"?["🇻🇳 VN"]:[]),
          `${(()=>{const isR=(todayData?.dayType)==="rest";const tgt=isR?(macro?.calRest||macro?.calTarget):macro?.calTarget;const eaten=todayData?.cal||0;const deficit=tgt-eaten;return eaten===0?"chưa ăn":deficit>0?`-${deficit}`:deficit<0?`+${Math.abs(deficit)}`:"✓";})()} cal`
        ].map((tag,i)=>{const isCalTag=tag.endsWith("cal");const calColor=isCalTag?(tag.includes("chưa")?"#F59E0B":tag.startsWith("-")?"#EF4444":tag.startsWith("+")?"#EF4444":"#22C55E"):"";return <span key={i} style={{fontSize:10,padding:"2px 6px",background:isCalTag&&calColor?`${calColor}15`:C2.surface,borderRadius:4,color:isCalTag&&calColor?calColor:C2.t2,fontWeight:600}}>{tag}</span>})}
      </div>

      {/* Chat body */}
      <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"12px 18px",display:"flex",flexDirection:"column",gap:10}}>
        {messages.map((m,i)=><div key={i} style={{
          maxWidth:"85%",padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap",
          ...(m.role==="user"
            ?{alignSelf:"flex-end",background:C2.primary,color:"#fff",borderBottomRightRadius:4}
            :{alignSelf:"flex-start",background:C2.bg,color:C2.t1,borderTopLeftRadius:4})
        }}>
          {m.role==="assistant"&&<div style={{fontSize:11,fontWeight:700,color:C2.primary,marginBottom:4}}>✨ Fipilot AI</div>}
          {m.content}
        </div>)}
        {loading&&<div style={{alignSelf:"flex-start",background:C2.bg,padding:"10px 14px",borderRadius:12,borderTopLeftRadius:4,fontSize:13,color:C2.t3}}>
          <div style={{fontSize:11,fontWeight:700,color:C2.primary,marginBottom:4}}>✨ Fipilot AI</div>
          Đang suy nghĩ...
        </div>}
      </div>

      {/* Quick prompts */}
      <div style={{display:"flex",gap:6,padding:"8px 18px",overflowX:"auto",borderTop:`1px solid ${C2.border}`,flexShrink:0}}>
        {quickPrompts.map((q,i)=><div key={i} onClick={()=>sendMessage(q)} style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${C2.border}`,fontSize:11,fontWeight:600,color:C2.primary,background:"rgba(0,122,255,0.04)",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{q}</div>)}
      </div>

      {/* Input */}
      <div style={{display:"flex",gap:8,padding:"12px 18px",borderTop:`1px solid ${C2.border}`,flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage(input);}}}
          placeholder="Hỏi Fipilot AI..." style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${C2.border}`,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
        <button onClick={()=>sendMessage(input)} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:10,background:C2.primary,color:"#fff",border:"none",cursor:loading?"default":"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",opacity:loading||!input.trim()?0.5:1}}>↑</button>
      </div>

      {/* Disclaimer */}
      <div style={{padding:"8px 18px 12px",fontSize:12,color:"#B45309",textAlign:"center",flexShrink:0,background:"#FFFBEB",borderTop:`1px solid #FDE68A`,fontWeight:600}}>⚠️ Fipilot AI tư vấn dinh dưỡng & tập luyện cho người khỏe mạnh. Không thay thế bác sĩ hoặc HLV cá nhân. {isAdmin?"(Admin ∞)":(`(${MAX_DAILY-dailyCount}/${MAX_DAILY} lượt)`)}</div>
    </div>
  </div>;
}
