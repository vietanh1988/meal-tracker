import { C } from "./theme";

export function MacroRing({l,v,max,color,color2,track,tc,sub,unit,size}){
  const sz=size||72;
  const ratio=max>0?v/max:0;
  // Vượt mức đáng kể thì đổi màu cảnh báo — trước đây vòng tròn cứ đầy 100% là
  // nhìn y hệt nhau dù thật ra đang dư 20% hay dư 150%, dễ gây hiểu lầm "vẫn ổn".
  const isSevereOver=ratio>1.4; // dư hơn 40%
  const isOver=ratio>1.15; // dư hơn 15%
  const ringColor=isSevereOver?"#DC2626":isOver?"#F59E0B":color;
  const ringColor2=isSevereOver?"#991B1B":isOver?"#B45309":(color2||color);
  const pct=Math.min(ratio*100,100),r=sz*0.39,sw=sz*0.083,circ=2*Math.PI*r;const cx=sz/2;
  const gradId=`ring-${l.replace(/\s/g,"")}`;
  const c2=ringColor2;
  return <div style={{textAlign:"center"}}>
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{display:"block",margin:"0 auto"}}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ringColor}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={track||"#E2E8F0"} strokeWidth={sw}/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${gradId})`} strokeWidth={sw} strokeDasharray={`${(Math.min(pct,100)/100)*circ} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} style={{transition:"stroke-dasharray 0.5s, stroke 0.3s"}}/>
      <text x={cx} y={sub?cx*0.88:cx} textAnchor="middle" dominantBaseline="central" fill={tc||(isOver?ringColor:C.t1)} fontSize={sz*0.22} fontWeight={900}>{Math.round(v)}{isOver?"⚠":""}</text>
      {sub&&<text x={cx} y={cx*1.32} textAnchor="middle" dominantBaseline="central" fill={tc?"rgba(255,255,255,0.8)":(isOver?ringColor:"#666")} fontSize={sz*0.14} fontWeight={700}>{sub}</text>}
      {!sub&&<text x={cx} y={cx*1.32} textAnchor="middle" dominantBaseline="central" fill={tc?"rgba(255,255,255,0.6)":(isOver?ringColor:C.t3)} fontSize={sz*0.14} fontWeight={700}>{unit||"g"}</text>}
    </svg>
    <div style={{fontSize:sz>80?14:12,fontWeight:700,color:tc?"rgba(255,255,255,0.85)":(isOver?ringColor:C.t2),marginTop:4}}>{l}</div>
  </div>;
}
