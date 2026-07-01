export const SlidingTabs=({tabs,active,onChange,style:extraStyle})=>{
  const idx=tabs.findIndex(t=>t.id===active);
  const count=tabs.length;
  const m=window.innerWidth<700;
  return <div style={{position:"relative",display:"flex",background:"rgba(0,0,0,0.04)",borderRadius:12,padding:3,...(extraStyle||{})}}>
    <div style={{position:"absolute",top:3,left:3,width:`calc(${100/count}% - ${count>2?2:3}px)`,height:"calc(100% - 6px)",background:"rgba(255,255,255,0.9)",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,0.08)",transition:"transform 0.3s cubic-bezier(0.4,0,0.2,1)",zIndex:0,transform:`translateX(${idx*100}%)`}}/>
    {tabs.map(t=><div key={t.id} onClick={()=>onChange(t.id)} style={{flex:1,padding:m?"8px 6px":"9px 12px",fontSize:m?12:13,fontWeight:active===t.id?700:600,cursor:"pointer",textAlign:"center",color:active===t.id?"#003D99":"#6B7280",transition:"color 0.2s",position:"relative",zIndex:1,whiteSpace:"nowrap"}}>{t.icon?t.icon+" ":""}{t.label}</div>)}
  </div>;
};
