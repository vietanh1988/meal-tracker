export const C = {
  protein:"#007AFF", carb:"#5AC8FA", fat:"#8E8E93", fiber:"#34C759",
  red:"#EF4444", gold:"#FACC15", green:"#00C896", blue:"#007AFF",
  primary:"#007AFF", secondary:"#36A3FF", deepBlue:"#0057FF", accent:"#7C3AED",
  mint:"#00C896", violet:"#7C3AED",
  bg:"#F8FAFC", card:"#FFF", surface:"#F1F5F9",
  border:"#E2E8F0",
  t1:"#0F172A", t2:"#475569", t3:"#64748B",
  redBg:"rgba(239,68,68,0.07)", goldBg:"rgba(250,204,21,0.1)", greenBg:"rgba(0,200,150,0.08)", blueBg:"rgba(0,122,255,0.06)",
  primaryBg:"rgba(0,122,255,0.08)", accentBg:"rgba(124,58,237,0.06)",
};

export const card={background:C.card,border:`1.5px solid ${C.border}`,borderRadius:14,padding:"16px 18px",marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"};
export const lbl={fontSize:11,fontWeight:700,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase"};
export const inp={width:"100%",boxSizing:"border-box",padding:"8px 12px",fontSize:14,fontWeight:600,background:C.surface,border:`1.5px solid ${C.border}`,borderRadius:10,color:C.t1,outline:"none",fontFamily:"inherit",height:40};
export const redBtn={padding:"12px",fontSize:14,fontWeight:900,border:"none",borderRadius:10,background:"linear-gradient(135deg,#36A3FF,#007AFF,#0057FF)",color:"#fff",cursor:"pointer",fontFamily:"inherit",width:"100%"};
