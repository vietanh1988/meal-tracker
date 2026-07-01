export const ALL_MEALS=[
  {id:"sang",icon:"🍳",name:"Bữa sáng",short:"Sáng"},
  {id:"phu_sang",icon:"🍌",name:"Bữa phụ sáng",short:"Phụ sáng"},
  {id:"trua",icon:"☀️",name:"Bữa trưa",short:"Trưa"},
  {id:"phu_chieu",icon:"🥤",name:"Bữa phụ chiều",short:"Phụ chiều"},
  {id:"pre",icon:"💪",name:"Pre-workout",short:"Pre"},
  {id:"post",icon:"🥛",name:"Post-workout",short:"Post"},
  {id:"toi",icon:"🌙",name:"Bữa tối",short:"Tối"},
];
// Default visible meals per day type
export const DEFAULT_MEAL_CONFIG={
  train:["sang","trua","pre","post","toi"],
  rest:["sang","trua","toi"],
};
export const mealsData={
  train:ALL_MEALS.map(m=>({id:m.id,name:m.name,items:[]})),
  rest:ALL_MEALS.map(m=>({id:m.id,name:m.name,items:[]})),
};
export const getMealsDefault=(type)=>mealsData[type];
export const wColors=["#EF4444","#B45309","#CA8A04","#15803D","#1D4ED8","#7C3AED","#DB2777","#0891B2","#0E7490","#4338CA","#BE123C","#047857"];
