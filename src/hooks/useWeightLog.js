import { useState } from "react";

const INIT = [{week:1,date:"22/05/2026",kg:63.0,delta:null},{week:2,date:"29/05/2026",kg:63.3,delta:0.3},{week:3,date:"05/06/2026",kg:63.5,delta:0.2},{week:4,date:"12/06/2026",kg:64.0,delta:0.5}];

export function useWeightLog(userId) {
  const saved = localStorage.getItem('weightLog');
  const [weightLog, setWeightLog] = useState(saved ? JSON.parse(saved) : INIT);

  const addWeight = (kg) => {
    const prev = weightLog.length > 0 ? weightLog[weightLog.length-1].kg : kg;
    const delta = Math.round((kg-prev)*10)/10;
    const entry = {week:weightLog.length+1,date:new Date().toLocaleDateString('vi-VN'),kg,delta:delta===0?null:delta};
    const updated = [...weightLog, entry];
    setWeightLog(updated);
    localStorage.setItem('weightLog', JSON.stringify(updated));
    return entry;
  };

  return { weightLog, addWeight, setWeightLog, loading: false };
}
