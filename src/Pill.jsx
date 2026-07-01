import { C } from "./theme";

export function Pill({active,color=C.primary,children,onClick}){
  return <button onClick={onClick} style={{
    padding:"7px 16px",fontSize:13,fontWeight:active?800:600,border:"none",borderRadius:20,
    cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
    background:active?C.primaryBg:C.surface,
    color:active?C.primary:C.t2,outline:active?`2px solid ${C.primary}`:`1.5px solid ${C.border}`,
  }}>{children}</button>;
}
