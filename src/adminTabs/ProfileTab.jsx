import { useState } from "react";
import { C, card, inp } from "../theme";

export function ProfileTab({profile, setProfile, macro, appSettings, saveSetting, weightLog, mob}){
  const [profileAcc,setProfileAcc]=useState("info");
  return (
<div style={card}>
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
    </div>
  );
}
