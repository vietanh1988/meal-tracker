import { useState } from "react";

const DEFAULT = {cm:172,kg:63,age:25,goalKg:68,gym:4,goalType:"bulk",months:4,activity:"sedentary",gymDays:[0,2,4,5]};

export function useProfile(userId) {
  const saved = localStorage.getItem('profile');
  const init = saved ? {...DEFAULT, ...JSON.parse(saved)} : DEFAULT;
  const [profile, setProfileState] = useState(init);

  const saveProfile = (p) => {
    const merged = {...DEFAULT, ...p};
    setProfileState(merged);
    localStorage.setItem('profile', JSON.stringify(merged));
  };

  return { profile, setProfile: saveProfile, loading: false };
}
