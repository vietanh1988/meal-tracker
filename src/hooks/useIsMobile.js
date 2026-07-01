import { useState, useEffect } from "react";

export function useIsMobile(breakpoint=600){
  const [m,setM]=useState(typeof window!=="undefined"?window.innerWidth<=breakpoint:false);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<=breakpoint);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[breakpoint]);
  return m;
}
