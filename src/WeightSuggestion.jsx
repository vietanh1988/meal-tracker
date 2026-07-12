import { useState } from "react";
import { supabase } from "./lib/supabase";
import { authFetch } from "./lib/authFetch";

export function WeightSuggestion({weightLog,goalKg,goalType,startKg,curKg,profile,macro,getMeals,appSettings}){
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
- Tập: ${({gym:"Gym",gym_cardio:"Gym+Cardio",cardio:"Cardio",none:"Không tập"})[profile.exerciseType||"gym"]}, ${({occasional:"1-2",regular:"3-4",frequent:"5-6",daily:"6-7"})[profile.frequency||"regular"]} buổi/tuần

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
        const d=await authFetch("ai-proxy",{foodDesc:prompt,provider:"claude",model:appSettings.ai_model||"claude-sonnet-5"});
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
        const msg=`Tôi đang ${goalLabel}, ${curKg}kg muốn ${goalKg}kg, tập ${({gym:"Gym",gym_cardio:"Gym+Cardio",cardio:"Cardio",none:"không"})[profile.exerciseType||"gym"]} ${({occasional:"1-2",regular:"3-4",frequent:"5-6",daily:"6-7"})[profile.frequency||"regular"]} buổi/tuần ở Hà Nội. Gợi ý cách chọn PT phù hợp, budget hợp lý.`;
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
            const d=await authFetch("ai-proxy",{foodDesc:msg,provider:"claude",model:"claude-sonnet-5"});
            text=d.text||"";
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
