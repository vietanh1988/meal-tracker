import { C, card, inp, lbl, redBtn } from "../theme";
import { fmtDate } from "../fmtDate";
import { WeightRow } from "../WeightRow";
import { WeightBarChart } from "../WeightBarChart";

export function WeightTab({weightLog, addWeight, deleteWeight, setWeightLog, profile, setProfile, mob}){
      const nextWeek=weightLog.length+1;
      const today=fmtDate(new Date());
      return <div style={card}>
        {mob&&<div style={{fontSize:19,fontWeight:800,color:C.t1,marginBottom:16}}>Nhập cân nặng</div>}
        <div style={!mob&&weightLog.length>=2?{display:"grid",gridTemplateColumns:"40% 58%",gap:20,marginBottom:16}:{marginBottom:16}}>
        <div style={!mob?{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20}:{}}>
        {!mob&&<div style={{fontSize:17,fontWeight:800,color:C.t1,marginBottom:20,display:"flex",alignItems:"center",gap:8}}>⚖️ Nhập cân nặng</div>}
        <div style={{background:C.surface,borderRadius:10,padding:"12px 16px",marginBottom:20,border:`1.5px solid ${C.border}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:700,color:C.t1}}>Tuần {nextWeek}</span>
            <span style={{fontSize:13,fontWeight:700,color:C.t2}}>{today}</span>
          </div>
          <div style={{fontSize:11,fontWeight:600,color:C.t3}}>Ngày tự động lấy từ hệ thống</div>
        </div>
        <div>
          <div style={{...lbl,marginBottom:6}}>Cân nặng (kg)</div>
          <input id="weightInput" type="text" inputMode="decimal" placeholder="VD: 64.3" style={inp}/>
        </div>
        <button onClick={async()=>{
          const val=parseFloat(document.getElementById("weightInput").value.replace(",","."));
          if(!val||val<30||val>200)return;
          await addWeight(val);
          setProfile({...profile,kg:val});
          document.getElementById("weightInput").value="";
          const el=document.getElementById("weight-saved");
          if(el){el.style.display="flex";setTimeout(()=>{el.style.display="none";},3000);}
        }} style={{...redBtn,marginTop:12}}>⚡ Lưu cân nặng</button>
        <div id="weight-saved" style={{display:"none",alignItems:"center",gap:8,padding:"10px 14px",background:C.greenBg,borderRadius:10,border:`1.5px solid ${C.green}`,marginTop:10}}>
          <span style={{fontSize:13,fontWeight:700,color:"#14532D"}}>✓ Đã lưu & cập nhật macro theo cân nặng mới!</span>
        </div>
        </div>
        {!mob&&weightLog.length>=2&&<div style={{background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:20}}>
          <div style={{fontSize:17,fontWeight:800,marginBottom:20,display:"flex",alignItems:"center",gap:8,color:C.t1}}>📈 Biểu đồ cân nặng</div>
          <WeightBarChart weightLog={weightLog} goalKg={profile.goalKg||(weightLog.length>0?weightLog[0].kg:profile.kg)} goalType={profile.goalType} startKg={weightLog.length>0?weightLog[0].kg:profile.kg} mob={false}/>
        </div>}
        </div>
        <div style={{borderTop:`1.5px solid ${C.border}`,paddingTop:14,marginTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{...lbl,fontSize:14,fontWeight:800}}>📋 Lịch sử theo dõi cân nặng</div>
            <button onClick={()=>{
              if(window.confirm("Xóa toàn bộ lịch sử cân nặng?")){
                resetWeights();
              }
            }} style={{fontSize:11,fontWeight:700,padding:"4px 10px",background:C.redBg,color:C.secondary,border:`1px solid ${C.secondary}`,borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
              Reset hết
            </button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"0.7fr 1.1fr 0.7fr 0.5fr 0.8fr",gap:4,fontSize:11,fontWeight:700,color:C.t3,paddingBottom:6,marginBottom:4,borderBottom:`1px solid ${C.border}`,textTransform:"uppercase",letterSpacing:"0.05em"}}>
            <span>Tuần</span><span>Ngày</span><span style={{textAlign:"right"}}>Kg</span><span style={{textAlign:"right"}}>Δ</span><span style={{textAlign:"right"}}>Thao tác</span>
          </div>
          {weightLog.map((w,i)=>(
            <WeightRow key={w.id||i} w={w} i={i} weightLog={weightLog} setWeightLog={setWeightLog} setProfile={setProfile} profile={profile} deleteWeight={deleteWeight}/>
          ))}
        </div>
        {weightLog.length>=2&&(()=>{
          const totalDelta=Math.round((weightLog[weightLog.length-1].kg-weightLog[0].kg)*10)/10;
          const avgPerWeek=Math.round((totalDelta/(weightLog.length-1))*100)/100;
          return <div style={{marginTop:12,padding:"12px 16px",background:C.goldBg,borderRadius:10,border:"1.5px solid #CA8A04"}}>
            <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16,fontWeight:900,color:"#F59E0B"}}>⚡</span>
              <span style={{fontSize:13,fontWeight:700,color:"#78350F",lineHeight:1.5}}>
                Tổng: {totalDelta>0?"+":""}{totalDelta} kg trong {weightLog.length-1} tuần. Trung bình {avgPerWeek>0?"+":""}{avgPerWeek} kg/tuần.
                {avgPerWeek>0&&avgPerWeek<=0.5?" Tốc độ lý tưởng tăng cơ!":avgPerWeek>0.5?" Hơi nhanh, cẩn thận tích mỡ.":avgPerWeek<0?" Đang giảm — kiểm tra lại chế độ ăn.":" Giữ ổn định."}
              </span>
            </div>
          </div>;
        })()}
      </div>;
}
