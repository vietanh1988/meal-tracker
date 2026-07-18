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
  let protein=Math.round(p.kg*pRatioVal);
  let fat=Math.round(p.kg*fRatioVal);
  // Fat floor: không dưới 0.7g/kg
  if(fat<Math.round(p.kg*0.7))fat=Math.round(p.kg*0.7);
  // Surplus/deficit
  const months=p.months||4;
  const totalDiff=Math.abs(diff);
  const perMonth=months>0?Math.round(totalDiff/months*10)/10:0;
  const perWeek=months>0?Math.round(totalDiff/(months*4.33)*10)/10:0;
  const calAdjust=calAdjustTable[effectiveGoal]||0;
  const calTarget=tdee+calAdjust;
  // C = phần calo còn lại (chế độ Cân bằng)
  const dietStrategy=(effectiveGoal==="cut")?(p.dietStrategy||"balanced"):"balanced";
  let carbBalanced=Math.round((calTarget-protein*4-fat*9)/4);
  if(carbBalanced<0)carbBalanced=0;
  // Carb floor: tối thiểu 2g/kg (cần cho tập luyện)
  const carbFloor=Math.round(p.kg*2);
  if(carbBalanced<carbFloor)carbBalanced=carbFloor;
  let carb=carbBalanced;
  // Diet strategy: low-carb / keto cap carb, fat = phần còn lại
  if(dietStrategy==="low_carb"){carb=Math.min(100,carbBalanced);fat=Math.round((calTarget-protein*4-carb*4)/9);}
  else if(dietStrategy==="keto"){carb=Math.min(50,carbBalanced);fat=Math.round((calTarget-protein*4-carb*4)/9);}
  // Fat floor sau diet adjustment
  if(fat<Math.round(p.kg*0.7))fat=Math.round(p.kg*0.7);
  // Ngày nghỉ: carb giảm 25%, fat giữ nguyên (option A)
  // Khi exerciseType=none: chỉ 1 set macro duy nhất (không phân biệt train/rest)
  const carbRest=exerciseType==="none"?carb:(dietStrategy==="keto"?carb:Math.round(carb*0.75));
  const calFinal=protein*4+carb*4+fat*9;
  const calRest=exerciseType==="none"?calFinal:(protein*4+carbRest*4+fat*9);
  const fiber=Math.round(calFinal/1000*14);
  const bmi=Math.round((p.kg/(p.cm/100)**2)*10)/10;
  const safe=directionMismatch?false:(effectiveGoal==="bulk"?perWeek<=0.5:effectiveGoal==="cut"?perWeek<=0.75:true);
  const pRatio=pRatioVal+"g/kg";
  const cRatio=Math.round(carb/p.kg*10)/10+"g/kg";
  const fRatio=fRatioVal+"g/kg";
  return{tdee,calTarget:calFinal,calTargetRaw:calTarget,protein,fat,fiber,carb,carbRest,calRest,bmi,diff,perMonth,perWeek,months,safe,directionMismatch,goal:effectiveGoal,fatPct:Math.round(fat*9/calFinal*100),actMul,bmr:Math.round(bmr),pRatio,cRatio,fRatio,dietStrategy};
}

export const defaultProfile={cm:170,kg:65,birthYear:2001,goalKg:70,goalType:"bulk",months:6,gender:"male",exerciseType:"gym",frequency:"regular",dietStrategy:"balanced",calorieMode:"standard"};
