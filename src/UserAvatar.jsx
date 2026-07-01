export const UserAvatar=({gender,size=40})=>{
  const isMale=(gender||"male")==="male";
  return <div style={{width:size,height:size,borderRadius:"50%",background:isMale?"#DBEAFE":"#FCE7F3",display:"flex",alignItems:"center",justifyContent:"center",fontSize:Math.round(size*0.55),flexShrink:0,lineHeight:1}}>{isMale?"🧔":"👩"}</div>;
};
