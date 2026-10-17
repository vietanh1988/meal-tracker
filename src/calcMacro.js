// Tốc độ giảm mỡ: % cân nặng mỗi tuần (bản vẽ 126)
export const PACE_PCT={slow:0.0025,mid:0.005,fast:0.0075};

export function calcMacro(p){if(!p)p={cm:170,kg:65,birthYear:2001,goalKg:70,goalType:"bulk",months:6,gender:"male",exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard"};
  const gender=p.gender||"male";
  const exerciseType=p.exerciseType||"gym";
  const age=p.birthYear?new Date().getFullYear()-p.birthYear:(p.age||25);
  // BMR: Mifflin-St Jeor (khác theo giới tính)
  const bmrRaw=10*p.kg+6.25*p.cm-5*age+(gender==="male"?5:-161);
  // Châu Á: -10% (nghiên cứu cho thấy Mifflin-St Jeor cao hơn ~10% cho người châu Á)
  const asianFactor=(p.calorieMode||"standard")==="asian"?0.9:1;
  const bmr=Math.round(bmrRaw*asianFactor);
  // Activity multiplier — chuẩn quốc tế, 1 giá trị duy nhất
  const freqMap={occasional:1.375,regular:1.55,frequent:1.725,daily:1.9};
  // Migration: map activity cũ sang frequency mới
  
  const freq=p.frequency||"regular";
  const actMul=exerciseType==="none"?1.2:(freqMap[freq]||1.55);
  const tdee=Math.round(bmr*actMul);
  const diff=Math.round((p.goalKg-p.kg)*10)/10;
  const goal=p.goalType||"bulk";
  // Block: none + bulk
  const effectiveGoal=(exerciseType==="none"&&goal==="bulk")?"maintain":goal;
  // Phát hiện mục tiêu ngược hướng: chọn Tăng cơ nhưng đặt cân mục tiêu thấp hơn (hoặc ngược lại với Giảm mỡ)
  const directionMismatch=effectiveGoal==="bulk"?diff<0:effectiveGoal==="cut"?diff>0:false;
  // === TRƯỜNG PHÁI 1.5 ===
  // P: giống nhau nam nữ (phụ thuộc mục tiêu, không phụ thuộc giới tính)
  // F: khác nhau nam nữ (nữ cần fat cao hơn cho hormone)
  // C: phần calo còn lại sau P và F
  const pTable={bulk:2.0,cut:2.2,maintain:1.8};
  const fTable={male:{bulk:1.1,cut:0.9,maintain:1.0},female:{bulk:1.2,cut:1.0,maintain:1.1}};
  // Surplus/deficit cố định theo mục tiêu (ISSN lean bulk)
  const calAdjustTable={bulk:250,cut:-350,maintain:0};
  const pRatioVal=pTable[effectiveGoal]||1.8;
  const fRatioVal=fTable[gender]?.[effectiveGoal]||0.9;
  // 17/10: người BMI > 27 → đạm / béo / tinh bột tối thiểu tính theo cân nặng ở mức BMI 27 (refKg), không theo tổng cân
  // (trước: 120 kg giảm mỡ bị bắt 264 g đạm + tinh bột tối thiểu 240 g → tổng calo cao hơn cả TDEE, không thể giảm)
  const hM=(p.cm||170)/100;
  const refKg=(p.kg/(hM*hM))>27?Math.round(27*hM*hM*10)/10:p.kg;
  let protein=Math.round(refKg*pRatioVal);
  let fat=Math.round(refKg*fRatioVal);
  // Fat floor: không dưới 0.7g/kg
  if(fat<Math.round(refKg*0.7))fat=Math.round(refKg*0.7);
  // Surplus/deficit
  const months=p.months||4;
  const totalDiff=Math.abs(diff);
  const perMonth=months>0?Math.round(totalDiff/months*10)/10:0;
  const perWeek=months>0?Math.round(totalDiff/(months*4.33)*10)/10:0;
  // 17/10 (bản vẽ 126): giảm mỡ theo TỐC ĐỘ (% cân nặng / tuần) thay cho −350 cố định.
  // Calo bớt = kg/tuần × 7.700 / 7, tối đa 25% TDEE; cộng điều chỉnh từ thẻ Kiểm tra tuần (calOffset, −300…+300).
  let calAdjust=calAdjustTable[effectiveGoal]||0;
  const pace=PACE_PCT[p.cutPace]?p.cutPace:"mid";
  let kgWeek=null,deficit=0,etaWeeks=null;
  const calOffset=effectiveGoal==="cut"?Math.max(-300,Math.min(300,Math.round(Number(p.calOffset)||0))):0;
  if(effectiveGoal==="cut"){
    kgWeek=Math.round(p.kg*PACE_PCT[pace]*100)/100;
    deficit=Math.min(Math.round(kgWeek*1100/10)*10,Math.round(tdee*0.25/10)*10);
    calAdjust=-deficit+calOffset;
    etaWeeks=diff<0&&kgWeek>0?Math.ceil(Math.abs(diff)/kgWeek):null;
  }
  const calTarget=tdee+calAdjust;
  // C = phần calo còn lại (chế độ Cân bằng)
  const dietStrategy=(effectiveGoal==="cut")?(p.dietStrategy||"balanced"):"balanced";
  let carbBalanced=Math.round((calTarget-protein*4-fat*9)/4);
  if(carbBalanced<0)carbBalanced=0;
  // Carb floor: tối thiểu 2g/kg (cần cho tập luyện).
  // 17/10: giảm mỡ hạ sàn còn 1,5 g/kg (không tập: 1 g/kg) và nhường béo xuống sàn 0,7 g/kg trước —
  // trước đây sàn tinh bột đội calo lên nên người to / không tập chọn tốc độ nào cũng ra cùng 1 số.
  const carbFloor=Math.round(refKg*(effectiveGoal==="cut"?(exerciseType==="none"?1:1.5):2));
  if(carbBalanced<carbFloor&&effectiveGoal==="cut"){
    const give=Math.min(fat-Math.round(refKg*0.7),Math.ceil((carbFloor-carbBalanced)*4/9));
    if(give>0){fat-=give;carbBalanced=Math.max(0,Math.round((calTarget-protein*4-fat*9)/4));}
  }
  if(carbBalanced<carbFloor)carbBalanced=carbFloor;
  let carb=carbBalanced;
  // Diet strategy: low-carb / keto cap carb, fat = phần còn lại
  if(dietStrategy==="low_carb"){carb=Math.min(100,carbBalanced);fat=Math.round((calTarget-protein*4-carb*4)/9);}
  else if(dietStrategy==="keto"){carb=Math.min(50,carbBalanced);fat=Math.round((calTarget-protein*4-carb*4)/9);}
  // Fat floor sau diet adjustment
  if(fat<Math.round(refKg*0.7))fat=Math.round(refKg*0.7);
  // Ngày nghỉ: carb giảm 25%, fat giữ nguyên (option A)
  // Khi exerciseType=none: chỉ 1 set macro duy nhất (không phân biệt train/rest)
  // 17/10: chia lại để TRUNG BÌNH CẢ TUẦN = mục tiêu (TDEE đã là mức trung bình tuần). Trước: ngày tập = mục tiêu,
  // ngày nghỉ còn bớt 25% tinh bột → cả tuần ăn ít hơn mục tiêu (tăng cơ 65 kg, 4 buổi: dư +250 chỉ còn ≈ +90/ngày).
  // nTrain = số ngày tập trong tuần (gymDays), C_tập·n + 0,75·C_tập·(7−n) = 7·C  →  C_tập = 7C / (n + 0,75(7−n)).
  let carbRest=carb;
  if(exerciseType!=="none"&&dietStrategy!=="keto"){
    const nDefault={occasional:3,regular:4,frequent:5,daily:6}[freq]||4;
    const nTrain=Array.isArray(p.gymDays)&&p.gymDays.length>0?Math.min(7,new Set(p.gymDays).size):nDefault;
    if(nTrain>=7){carbRest=Math.round(carb*0.75);}
    else{const avg=carb;carb=Math.round(avg*7/(nTrain+0.75*(7-nTrain)));carbRest=Math.round(carb*0.75);}
  }
  // Sàn calo an toàn khi giảm mỡ: nữ 1.200, nam 1.500 kcal/ngày (cả ngày tập lẫn ngày nghỉ).
  // Thiếu thì bù tinh bột; low-carb/keto bù chất béo để giữ đúng kiểu ăn.
  const calFloor=gender==="female"?1200:1500;
  let floorApplied=false;
  if(effectiveGoal==="cut"){
    const lack=(c)=>calFloor-(protein*4+c*4+fat*9);
    if(dietStrategy==="balanced"){
      if(lack(carb)>0){carb+=Math.ceil(lack(carb)/4);floorApplied=true;}
      if(lack(carbRest)>0){carbRest+=Math.ceil(lack(carbRest)/4);floorApplied=true;}
    }else{
      const need=Math.max(lack(carb),lack(carbRest));
      if(need>0){fat+=Math.ceil(need/9);floorApplied=true;}
    }
    if(exerciseType==="none")carbRest=carb;
  }
  const calFinal=protein*4+carb*4+fat*9;
  const calRest=exerciseType==="none"?calFinal:(protein*4+carbRest*4+fat*9);
  const fiber=Math.round(calFinal/1000*14);
  const bmi=Math.round((p.kg/(p.cm/100)**2)*10)/10;
  const safe=directionMismatch?false:(effectiveGoal==="bulk"?perWeek<=0.5:true);
  const pRatio=pRatioVal+"g/kg";
  const cRatio=Math.round(carb/p.kg*10)/10+"g/kg";
  const fRatio=fRatioVal+"g/kg";
  return{pace:effectiveGoal==="cut"?pace:null,kgWeek,deficit,etaWeeks,calOffset,refKg,floorApplied,calFloor,tdee,calTarget:calFinal,calTargetRaw:calTarget,protein,fat,fiber,carb,carbRest,calRest,bmi,diff,perMonth,perWeek,months,safe,directionMismatch,goal:effectiveGoal,fatPct:Math.round(fat*9/calFinal*100),actMul,bmr:Math.round(bmr),pRatio,cRatio,fRatio,dietStrategy};
}

export const defaultProfile={cm:170,kg:65,birthYear:2001,goalKg:70,goalType:"bulk",months:6,gender:"male",exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard"};
