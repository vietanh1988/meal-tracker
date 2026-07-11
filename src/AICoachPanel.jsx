import { useState, useRef, useEffect } from "react";
import { supabase } from "./lib/supabase";
import { checkAndConsumeAiQuota } from "./lib/aiQuota";
import AIMenuGenerator from "./AIMenuGenerator";
import { getAIMenuAccess, generateMenuAI, sumTemplate, resolveMealIds, getRecentPatternNames, dayTarget, formatFoodPortion, capitalizeFirst, saveAIMenu, loadAIMenu, clearAIMenu } from "./lib/aiMenuService";
import { getFoodRole } from "./lib/localFoodDB";
import { ALL_MEALS } from "./mealConstants";
import { MEAL_TIMES } from "./mealPatterns";

// Render markdown NHẸ cho câu trả lời AI — chỉ những gì AI thật sự hay dùng:
// **đậm**, gạch đầu dòng (-, •, *), danh sách số (1. 2. ...). Không thêm thư
// viện markdown (nặng, thừa), không dangerouslySetInnerHTML (an toàn XSS vì
// chỉ build React elements từ text). Dòng thường giữ nguyên.
function boldParts(text, keyPrefix) {
const parts = text.split(/\*\*([^*]+)\*\*/g);
return parts.map((p, i) => i % 2 === 1 ? <b key={keyPrefix + "-" + i}>{p}</b> : p);
}
function renderMarkdownLite(content) {
const lines = String(content || "").split("\n");
return lines.map((line, li) => {
const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
if (bullet) {
return <div key={li} style={{display:"flex",gap:6,paddingLeft:2,margin:"2px 0"}}>
<span style={{flexShrink:0}}>•</span><span>{boldParts(bullet[1], li)}</span>
</div>;
}
if (numbered) {
return <div key={li} style={{display:"flex",gap:6,paddingLeft:2,margin:"2px 0"}}>
<span style={{flexShrink:0,fontWeight:600}}>{numbered[1]}.</span><span>{boldParts(numbered[2], li)}</span>
</div>;
}
if (line.trim() === "") return <div key={li} style={{height:6}}/>;
return <div key={li}>{boldParts(line, li)}</div>;
});
}

const REFUSAL_MESSAGE = "Mình không thể đưa ra tư vấn dành riêng cho các bệnh lý như tiểu đường, tăng huyết áp, bệnh thận... Nếu bạn đang điều trị hoặc có bệnh nền, hãy tham khảo bác sĩ hoặc chuyên gia dinh dưỡng nhé. Mình vẫn có thể hỗ trợ theo dõi calo, protein, carb, fat và xây dựng thói quen ăn uống lành mạnh! 💪";

// Lớp chặn CỨNG bằng từ khoá — chạy TRƯỚC khi gọi AI, không phụ thuộc AI tự phán đoán.
// Đây là lưới an toàn đầu tiên; systemPrompt gửi cho AI vẫn giữ nguyên làm lưới thứ 2
// cho các cách hỏi không trúng đúng từ khoá (viết tắt, nói vòng...).
const HEALTH_KEYWORDS = [
"tiểu đường","đái tháo đường","cao huyết áp","huyết áp cao","tăng huyết áp",
"bệnh gan","gan nhiễm mỡ","viêm gan","xơ gan",
"bệnh thận","suy thận","sỏi thận",
"ung thư","khối u",
"bệnh tim","tim mạch","nhồi máu cơ tim","suy tim",
"gout","gút","axit uric",
"cholesterol","mỡ máu","máu nhiễm mỡ",
"mang thai","có bầu","cho con bú","thai kỳ",
"trẻ em","trẻ sơ sinh","trẻ nhỏ",
"chấn thương","phục hồi chấn thương","đau khớp","thoát vị đĩa đệm",
];

function containsHealthKeyword(text) {
const normalized = (text || "").toLowerCase();
return HEALTH_KEYWORDS.some(k => normalized.includes(k));
}

// LỚP GỢI Ý MỞ CÔNG CỤ TẠO THỰC ĐƠN — cùng kiểu quét từ khoá TRƯỚC khi gọi
// AI như containsHealthKeyword ở trên, nhưng thay vì từ chối thì mở thẳng
// AIMenuGenerator (đã có sẵn, đã test, khớp đúng calo/macro qua mealEngine)
// thay vì để Claude tự bịa gợi ý bằng văn xuôi tự do — vốn không đảm bảo
// khớp target và không có nút "thêm vào thực đơn hôm nay".
const MENU_GEN_KEYWORDS = [
"gợi ý thực đơn", "lên thực đơn", "tạo thực đơn", "tạo menu", "lên menu",
"cho tôi thực đơn", "cho tôi menu", "cho mình thực đơn", "cho mình menu",
"thực đơn hôm nay", "menu hôm nay", "thực đơn ngày mai", "menu ngày mai",
"ăn gì hôm nay", "hôm nay ăn gì", "nên ăn gì", "ăn gì bây giờ",
"chưa biết ăn gì", "không biết ăn gì", "chưa biết nấu gì", "không biết nấu gì",
"lên món", "tự động tạo thực đơn", "ai tạo thực đơn",
];
function containsMenuGenIntent(text) {
const normalized = (text || "").toLowerCase();
return MENU_GEN_KEYWORDS.some(k => normalized.includes(k));
}

export function AICoachPanel({profile,macro,weightLog,todayData,mob,onClose,appSettings,isAdmin,getMeals,getWeeklyTemplate,foodCache,userId,applyTemplate,saveWeeklyTemplate,getMealHistory}){
const [messages,setMessages]=useState([]);
const [showAIMenuFromChat,setShowAIMenuFromChat]=useState(false);
// Variety tầng SESSION — nhớ pattern đã hiện ra trong CHÍNH phiên chat này
// (kể cả khi user CHƯA bấm "Thêm vào thực đơn hôm nay" để lưu thật). Trước
// đây Variety chỉ đọc lịch sử ĐÃ LƯU (meal_logs) — nếu user gõ lại nhiều
// lần liên tiếp mà không lưu lần nào, AI không có gì để tránh lặp, dễ ra
// lại y hệt (bug thật: "Bún thịt" lặp lại nhiều lần trong 1 phiên test).
// useRef (không phải useState) vì chỉ cần đọc/ghi, không cần re-render.
const shownPatternsRef=useRef(new Set());
const [input,setInput]=useState("");
const [loading,setLoading]=useState(false);
// Mobile: bàn phím ảo đã chiếm nửa màn hình, disclaimer 2 dòng ăn thêm chỗ
// hiển thị chat — ẩn tạm khi user đang focus ô nhập, rời ô thì hiện lại.
const [inputFocused,setInputFocused]=useState(false);
// Nhập bằng giọng nói (Web Speech API — có sẵn trong trình duyệt, miễn phí,
// không tốn quota AI). Chỉ hiện nút mic khi trình duyệt hỗ trợ; text nhận
// dạng đổ vào ô input để user XEM LẠI rồi tự bấm gửi, không tự gửi.
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const [listening,setListening]=useState(false);
const recRef=useRef(null);
const toggleMic=()=>{
if(!SR)return;
if(listening){try{recRef.current&&recRef.current.stop();}catch(e){}setListening(false);return;}
const rec=new SR();
rec.lang="vi-VN";rec.interimResults=true;rec.continuous=false;
const base=input; // giữ phần đã gõ sẵn, nói thêm thì nối vào sau
rec.onresult=(ev)=>{let t="";for(let i=0;i<ev.results.length;i++){t+=ev.results[i][0].transcript;}setInput((base?base+" ":"")+t);};
rec.onerror=()=>setListening(false);
rec.onend=()=>setListening(false);
recRef.current=rec;setListening(true);
try{rec.start();}catch(e){setListening(false);}
};
useEffect(()=>()=>{try{recRef.current&&recRef.current.stop();}catch(e){}},[]);
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
const chatRef=useRef(null);
const aiModel=appSettings?.ai_model||"claude-sonnet-5";

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
// ids thật trong meal_logs/mealConstants là sang/phu_sang/trua/... —
// fallback cũ (breakfast/lunch/...) không khớp id nào, làm filter ra
// RỖNG mỗi khi chưa có meal_config → AI mất sạch chi tiết bữa ăn.
const defaultIds=["sang","phu_sang","trua","phu_chieu","pre","post","toi"];
const mc=(()=>{try{return appSettings?.meal_config?JSON.parse(appSettings.meal_config):{train:defaultIds,rest:defaultIds};}catch(e){return{train:defaultIds,rest:defaultIds};}})();
const ids=mc[isRest?"rest":"train"]||mc.train;
const ms=getMeals(isRest?"rest":"train").filter(m2=>ids.includes(m2.id));
const mealNames={sang:"Bữa sáng",phu_sang:"Phụ sáng",trua:"Bữa trưa",phu_chieu:"Phụ chiều",pre:"Pre-workout",post:"Post-workout",toi:"Bữa tối",breakfast:"Bữa sáng",lunch:"Bữa trưa",snack:"Bữa phụ",dinner:"Bữa tối"};
const details=ms.filter(m2=>m2.items.length>0).map(m2=>{
const cal=Math.round(m2.items.reduce((s,i)=>s+(i.cal||0),0));
// items trong meal_logs lưu key `food` (không phải `name`) — đọc sai
// key từng làm AI nhận "undefined (xxx cal)" cho mọi món.
const items=m2.items.map(i=>`${i.food||i.name} (${Math.round(i.cal||0)} cal)`).join(", ");
return ` ${mealNames[m2.id]||m2.id}: ${items} → ${cal} cal`;
});
if(details.length>0) mealDetails="\n- Chi tiết:\n"+details.join("\n");
}catch(e){}
}

// Tomorrow planned meals
// Tính ngày mai TRƯỚC khi dùng — bản cũ dùng tmrIdx ở đây nhưng khai báo
// `const` ở SAU (TDZ) → ReferenceError bị catch nuốt im lặng, cả block
// chết 100%. Kèm 3 lỗi nữa: day key sai (t2/t3... trong khi DB lưu
// thu_2/thu_3...), tpl.meals là ARRAY nhưng xử lý như object map, và
// đọc i.name trong khi meal_logs lưu key `food`.
const tmr=new Date();tmr.setDate(tmr.getDate()+1);
const tmrIdx=tmr.getDay();
const tmrMapped=tmrIdx===0?6:tmrIdx-1;
let tmrPlan="";
if(getWeeklyTemplate){
try{
const days=["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"];
const tmrKey=days[tmrIdx];
const tpl=getWeeklyTemplate(tmrKey);
if(tpl&&tpl.meals){
const mealNames={sang:"Sáng",phu_sang:"Phụ sáng",trua:"Trưa",phu_chieu:"Phụ chiều",pre:"Pre",post:"Post",toi:"Tối"};
const planned=(tpl.meals||[]).filter(mv=>mv&&mv.items&&mv.items.length>0).map(mv=>{
const cal=Math.round(mv.items.reduce((s,i)=>s+(i.cal||0),0));
return ` ${mealNames[mv.meal_id]||mv.meal_name||mv.meal_id}: ${mv.items.map(i=>i.food||i.name).join(", ")} → ${cal} cal`;
});
if(planned.length>0) tmrPlan="\n- Đã lên kế hoạch:\n"+planned.join("\n");
}
}catch(e){}
}
const tmrGd=(()=>{try{const s=appSettings?.gymDays;return s?JSON.parse(s):(p.gymDays||[0,2,4,5]);}catch(e){return p.gymDays||[0,2,4,5];}})();
const tmrIsRest=!tmrGd.includes(tmrMapped);
const tmrTarget=tmrIsRest?(m.calRest||m.calTarget):m.calTarget;
const tmrCarb=tmrIsRest?(m.carbRest||m.carb):m.carb;
const tmrDayLabel=["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"][tmrIdx];
// Food database from cache
let foodDB="";
if(foodCache&&Object.keys(foodCache).length>0){
const foods=Object.entries(foodCache).slice(0,30).map(([name,v])=>` ${name}: ${v.cal}cal/${v.gram||100}${v.unit||"g"} (P:${v.p}g C:${v.c}g F:${v.f}g)`);
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
- Xưng "mình", gọi user là "${(profile||{}).gender==="male"?"anh":"chị"}" (theo giới tính trong hồ sơ hiện tại — kể cả khi các tin nhắn cũ trong lịch sử xưng hô khác, LUÔN dùng theo hồ sơ)
- Thân thiện, dễ hiểu. Câu hỏi đơn giản: trả lời gọn. Câu hỏi cần giải thích/lên kế hoạch/liệt kê món: trả lời đầy đủ, dùng gạch đầu dòng cho dễ đọc. LUÔN kết thúc trọn vẹn ý, không bỏ lửng giữa câu
- Gợi ý thực phẩm Việt Nam phổ biến
- Khi gợi ý món, LUÔN kèm gram + calo chính xác từ kho
- Dùng emoji vừa phải

ĐƯỢC PHÉP:
🍽️ Dinh dưỡng: gợi ý thực phẩm từ kho user, đánh giá thực đơn, tư vấn calo/macro, low-carb/keto, ăn trước/sau tập
🏋️ Tập luyện: bài tập gym, lịch tập, cardio, warm up/cool down, set/rep

KHÔNG ĐƯỢC PHÉP (từ chối lịch sự, khuyên gặp bác sĩ):
🚫 Bệnh lý bất kỳ, kể cả không có trong danh sách này: tiểu đường, cao huyết áp/tăng huyết áp, bệnh gan/gan nhiễm mỡ/viêm gan, bệnh thận/suy thận, ung thư, tim mạch/bệnh tim, gout/gút, cholesterol/mỡ máu cao, và mọi bệnh mãn tính khác
🚫 Kê đơn thuốc, thực phẩm chức năng liều cao
🚫 Chẩn đoán triệu chứng, đau nhức
🚫 Phụ nữ mang thai, cho con bú, trẻ em dưới 16
🚫 Tập khi chấn thương, phục hồi chấn thương

KHI TỪ CHỐI, dùng đúng câu này: "${REFUSAL_MESSAGE}"

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

// LỚP CHẶN CỨNG — quét từ khoá TRƯỚC khi gọi AI, không tốn quota, không phụ thuộc AI phán đoán
if(containsHealthKeyword(text)){
setMessages(prev=>[...prev,{role:"user",content:text},{role:"assistant",content:REFUSAL_MESSAGE}]);
setInput("");
saveMsg("user",text);
saveMsg("assistant",REFUSAL_MESSAGE);
return;
}

// Chỉ chặn khi user THỰC SỰ dùng được (trial/premium + cờ ai_menu_gen
// bật) — free tier hoặc cờ tắt thì rơi xuống chat bình thường như cũ,
// không bị gián đoạn bởi 1 tính năng họ chưa có quyền dùng.
//
// Sinh THẲNG trong chat (không bắt user rời sang form riêng) — dùng
// Menu intent → mở popup AIMenuGenerator để user chọn phong cách/dị ứng
// trước, KHÔNG sinh thẳng với default. Kết quả từ popup hiện lại trong chat.
const aiMenuAccess=getAIMenuAccess(profile,appSettings);
if(aiMenuAccess.usable&&containsMenuGenIntent(text)){
setMessages(prev=>[...prev,{role:"user",content:text}]);
setInput("");
saveMsg("user",text);
setShowAIMenuFromChat(true);
return;
}

if(!isAdmin){
const quota=await checkAndConsumeAiQuota(userId,"chat");
if(!quota.allowed){setMessages(prev=>[...prev,{role:"user",content:text},{role:"assistant",content:quota.message}]);return;}
}
const newMsgs=[...messages,{role:"user",content:text}];
setMessages(newMsgs);setInput("");setLoading(true);
saveMsg("user",text);
try{
// Gửi messages array role chuẩn + system riêng thay vì nhồi cả hội thoại
// thành 1 chuỗi "User:.../Fipilot AI:..." — kiểu transcript cũ làm model
// sinh artifact: tự thấy "đến lượt User" là ngắt sớm, bỏ lửng giữa câu.
const chatMessages=newMsgs.slice(-10).map(m=>({role:m.role==="user"?"user":"assistant",content:m.content}));
const res=await fetch("https://veodsvojxjmjhtrlaieq.supabase.co/functions/v1/ai-proxy",{
method:"POST",headers:{"Content-Type":"application/json"},
body:JSON.stringify({provider:"claude",model:aiModel,system:systemPrompt,messages:chatMessages,maxTokens:1500})
});
const data=await res.json();
if(data.error)throw new Error(data.error);
const reply=(data.text||"").trim()||"Xin lỗi, mình không thể trả lời lúc này.";
const cleanReply=reply.replace(/^Fipilot AI:\s*/,"");
setMessages(prev=>[...prev,{role:"assistant",content:cleanReply}]);
saveMsg("assistant",cleanReply);
}catch(e){setMessages(prev=>[...prev,{role:"assistant",content:"⚠️ Lỗi kết nối. Thử lại sau nhé!"}]);}
setLoading(false);
};

useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[messages,loading]);

// Áp dụng thực đơn AI vừa tạo (mở từ nút trong chat) — lưu thành Lịch
// tuần hôm nay + apply vào meal_logs/daily_logs, rồi báo lại NGAY trong
// chính cuộc chat để user không phải rời panel mà vẫn biết đã xong.
const dayKeyToday=()=>["cn","thu_2","thu_3","thu_4","thu_5","thu_6","thu_7"][new Date().getDay()];
const handleApplyAIMenuChat=async(tpl)=>{
try{
if(saveWeeklyTemplate)await saveWeeklyTemplate(dayKeyToday(),tpl);
if(applyTemplate)await applyTemplate(tpl);
await saveAIMenu(tpl,userId);
// Hiện menu preview ngay trong chat để user thấy đã áp dụng gì
const summary=`Đây là thực đơn AI gợi ý cho bạn hôm nay, phù hợp với mục tiêu ${macro?.goal==="bulk"?"tăng cơ":macro?.goal==="cut"?"giảm mỡ":"duy trì"}.`;
const menuMsg={role:"assistant",content:summary,action:"menu_preview",template:tpl};
const doneMsg={role:"assistant",content:"✅ Đã thêm thực đơn vào hôm nay! Quay lại tab Tổng quan để xem chi tiết nhé."};
setMessages(prev=>[...prev,menuMsg,doneMsg]);
saveMsg("assistant",summary);
saveMsg("assistant",doneMsg.content);
tpl.meals.forEach(m=>{if(m.pattern)shownPatternsRef.current.add(m.pattern);});
}catch(e){console.error("Apply AI menu (chat) error:",e);}
setShowAIMenuFromChat(false);
};

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

// Restore saved AI menu from Supabase on mount (mọi thiết bị đều thấy)
useEffect(()=>{
if(!historyLoaded||!userId)return;
(async()=>{
const saved=await loadAIMenu(userId);
if(saved&&saved.meals&&saved.meals.length>0){
const summary="Đây là thực đơn AI đã gợi ý cho bạn hôm nay (khôi phục từ phiên trước):";
const alreadyHasMenu=messages.some(mm=>mm.action==="menu_preview");
if(!alreadyHasMenu){
setMessages(prev=>[...prev,{role:"assistant",content:summary,action:"menu_preview",template:saved}]);
}
}
})();
},[historyLoaded,userId]);

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
<style>{`@keyframes aicoachSpin{to{transform:rotate(360deg);}}`}</style>
{/* Backdrop (PC only) */}
{!mob&&<div onClick={onClose} style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.2)",zIndex:998}}/>}

<div style={panelStyle}>
{/* Header */}
<div style={{padding:"14px 18px",borderBottom:`1px solid ${C2.border}`,display:"flex",alignItems:"center",gap:10}}>
{mob&&<span onClick={onClose} style={{fontSize:20,color:C2.primary,cursor:"pointer"}}>←</span>}
<span style={{fontSize:18}}>✨</span>
<span style={{fontSize:17,fontWeight:800,color:C2.t1,flex:1}}>Fipilot AI <span style={{fontSize:12,fontWeight:500,color:C2.t3}}>(Dinh dưỡng & tập luyện)</span></span>
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
{/* Formatter nhẹ cho câu trả lời AI: AI hay trả markdown (**đậm**, gạch
đầu dòng, danh sách số) — trước đây hiện thô "**2374 cal**" rất xấu.
Tự parse ~95% trường hợp thật, không cần thêm thư viện markdown,
không dùng dangerouslySetInnerHTML (build React elements, an toàn). */}
<div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"12px 18px",display:"flex",flexDirection:"column",gap:10}}>
{messages.map((m,i)=><div key={i} style={{
maxWidth:m.action==="menu_preview"?"100%":"85%",padding:m.action==="menu_preview"?"4px 0":"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.6,
...(m.role==="user"
?{alignSelf:"flex-end",background:C2.primary,color:"#fff",borderBottomRightRadius:4,whiteSpace:"pre-wrap",maxWidth:"85%",padding:"10px 14px"}
:{alignSelf:"flex-start",background:m.action==="menu_preview"?"transparent":C2.bg,color:C2.t1,borderTopLeftRadius:4})
}}>
{m.role==="assistant"&&<div style={{fontSize:11,fontWeight:700,color:C2.primary,marginBottom:4}}>✨ Fipilot AI</div>}
{m.loading
?<span style={{display:"flex",alignItems:"center",gap:8,color:C2.t3}}>
<span style={{width:13,height:13,border:"2px solid #ddd",borderTopColor:C2.primary,borderRadius:"50%",display:"inline-block",animation:"aicoachSpin 0.6s linear infinite"}}/>
{m.content}
</span>
:(m.role==="assistant"?renderMarkdownLite(m.content):m.content)}
{m.action==="open_ai_menu"&&<button onClick={()=>setShowAIMenuFromChat(true)} style={{marginTop:8,width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7C3AED,#5B21B6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✨ Mở AI tạo thực đơn</button>}
{m.action==="menu_preview"&&m.template&&(()=>{
const total=sumTemplate(m.template);
const target=dayTarget(macro,m.template.day_type||"train");
const pct=(v,t)=>t?Math.round(v/t*100):0;
const pctBar=(v,t)=>Math.min(100,pct(v,t));
const macroColor=(v,t)=>{const r=pct(v,t);return r>110?"#EF4444":r>=90?"#22C55E":"#3B82F6";};
return <div style={{marginTop:8,background:"#fff",borderRadius:12,border:`1px solid ${C2.border}`,overflow:"hidden",maxWidth:"100%",width:"100%"}}>

{/* Macro summary */}
<div style={{padding:"16px 18px",borderBottom:`1px solid ${C2.border}`}}>
<div style={{display:"flex",gap:12,marginBottom:12}}>
{[["Tổng năng lượng",total.cal,target.cal,"#3B82F6",true],["Protein",total.p,target.p,"#8B5CF6",false],["Carb",total.c,target.c,"#F59E0B",false],["Fat",total.f,target.f,"#22C55E",false]].map(([label,v,t,color,isCal])=>
<div key={label} style={{flex:1,minWidth:0}}>
<div style={{fontSize:10,color:C2.t3,fontWeight:500,marginBottom:3}}>{label}</div>
<div style={{fontSize:isCal?20:17,fontWeight:700,color:isCal?C2.t1:macroColor(v,t)}}>{isCal?v.toLocaleString():v+"g"}</div>
<div style={{fontSize:10,color:C2.t3,marginTop:1}}>/ {isCal?t.toLocaleString()+" kcal":t+"g"} ({pct(v,t)}%)</div>
</div>)}
</div>
<div style={{height:5,borderRadius:3,background:"#E2E8F0",display:"flex",overflow:"hidden",gap:1}}>
<div style={{width:pctBar(total.p,target.p)*0.25+"%",background:"#8B5CF6",borderRadius:3}}/>
<div style={{width:pctBar(total.c,target.c)*0.5+"%",background:"#F59E0B",borderRadius:3}}/>
<div style={{width:pctBar(total.f,target.f)*0.25+"%",background:"#22C55E",borderRadius:3}}/>
</div>
{profile&&<div style={{fontSize:10,color:C2.t3,marginTop:10,textAlign:"center"}}>Gợi ý được cá nhân hóa dựa trên: {profile.kg||65}kg • {profile.cm||170}cm • Tập {profile.trainDays||5} buổi/tuần</div>}
</div>

{/* Meal cards — spacious */}
{(m.template.meals||[]).map(mm=>{
const meta=ALL_MEALS.find(x=>x.id===mm.meal_id);
const cal=Math.round((mm.items||[]).reduce((s,it)=>s+(it.cal||0),0));
const time=MEAL_TIMES[mm.meal_id]||"";
const visibleItems=(mm.items||[]).filter(it=>it.display!==null&&it.gram>0&&!(getFoodRole(it.food)==="fat"&&it.gram<30));
return <div key={mm.meal_id} style={{padding:"14px 18px",borderBottom:`1px solid ${C2.border}`}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4}}>
<span><span style={{fontSize:14,fontWeight:700,color:"#3B82F6"}}>{meta?.name||mm.meal_id}</span>{time&&<span style={{fontSize:12,color:C2.t3,marginLeft:8}}>{time}</span>}</span>
<span style={{fontSize:14,fontWeight:700,color:"#3B82F6"}}>{cal} kcal</span>
</div>
{visibleItems.map(it=>{
const dn=it.display||capitalizeFirst(it.food);
const portion=formatFoodPortion(it.food,it.gram);
const ic=Math.round(it.cal||0);
return <div key={it.food+dn} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"6px 0 6px 10px"}}>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:600,color:C2.t1}}>{capitalizeFirst(dn)}</div>
<div style={{fontSize:11,color:C2.t3,marginTop:1}}>{portion}</div>
</div>
<div style={{fontSize:12,color:C2.t3,flexShrink:0,marginLeft:12,paddingTop:2}}>{ic} kcal</div>
</div>;})}
</div>;
})}

{/* 3 buttons: Đổi | Tính lại | Thêm */}
<div style={{display:"flex",gap:0}}>
<button onClick={()=>setShowAIMenuFromChat(true)} style={{flex:1,padding:"12px",border:"none",borderRight:`1px solid ${C2.border}`,background:"#fff",color:C2.t2,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Đổi thực đơn khác</button>
<button onClick={()=>sendMessage("Gợi ý thực đơn hôm nay")} style={{flex:1,padding:"12px",border:"none",borderRight:`1px solid ${C2.border}`,background:"#fff",color:"#F59E0B",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🔄 Tính lại</button>
<button onClick={()=>handleApplyAIMenuChat(m.template)} style={{flex:1.2,padding:"12px",border:"none",background:"#3B82F6",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",borderRadius:"0 0 12px 0"}}>Thêm vào hôm nay</button>
</div>
</div>;
})()}
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
<input value={input} onChange={e=>setInput(e.target.value)} onFocus={()=>setInputFocused(true)} onBlur={()=>setInputFocused(false)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();if(listening)toggleMic();sendMessage(input);}}}
placeholder={listening?"Đang nghe... nói đi bạn 🎤":"Hỏi Fipilot AI..."} style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${listening?"#EF4444":C2.border}`,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
{SR&&<button onClick={toggleMic} title={listening?"Dừng ghi âm":"Nói để nhập"} style={{width:40,height:40,borderRadius:10,border:`1.5px solid ${listening?"#EF4444":C2.border}`,background:listening?"#FEE2E2":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0}}>
{listening
?<svg width="16" height="16" viewBox="0 0 24 24" fill="#B91C1C" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C2.t2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>}
</button>}
<button onClick={()=>{if(listening)toggleMic();sendMessage(input);}} disabled={loading||!input.trim()} style={{width:40,height:40,borderRadius:10,background:C2.primary,color:"#fff",border:"none",cursor:loading?"default":"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",opacity:loading||!input.trim()?0.5:1}}>↑</button>
</div>

{/* Disclaimer — mobile ẩn khi đang gõ để nhường chỗ cho khung chat */}
{!(mob&&inputFocused)&&<div style={{padding:"8px 18px 12px",fontSize:12,color:"#B45309",textAlign:"center",flexShrink:0,background:"#FFFBEB",borderTop:`1px solid #FDE68A`,fontWeight:600}}>⚠️ Fipilot AI chỉ tư vấn dinh dưỡng & cách tập luyện. Không thay thế bác sĩ hoặc HLV cá nhân.</div>}
</div>
{/* AI Menu Generator — mở từ nút trong chat, đè lên trên toàn bộ panel.
Tái dùng nguyên component đã test (39 test case), không viết logic
sinh thực đơn riêng cho chat — tránh 2 nơi cùng làm 1 việc rồi lệch nhau. */}
{showAIMenuFromChat&&<div onClick={()=>setShowAIMenuFromChat(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1000,display:"flex",alignItems:mob?"flex-end":"center",justifyContent:"center",padding:mob?0:20}}>
<div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:mob?"100%":480,maxHeight:mob?"92vh":"88vh",overflowY:"auto",background:"#fff",borderRadius:mob?"16px 16px 0 0":16,padding:mob?"16px 12px":20}}>
<AIMenuGenerator macro={macro} profile={profile} user={{id:userId}} appSettings={appSettings} initialDayType={todayData?.dayType==="rest"?"rest":"train"} getMealHistory={getMealHistory} onApply={handleApplyAIMenuChat} onClose={()=>setShowAIMenuFromChat(false)}/>
</div>
</div>}
</div>;
}
