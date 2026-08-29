import type { Metadata } from "next";
import CateringMenuPage, { MenuOption } from "../../../components/CateringMenuPage";
export const metadata: Metadata = { title:"Dinner Catering Menus | SS FOODS", description:"Three vegetarian and non-vegetarian dinner catering options from SS FOODS in Chennai." };
const veg: MenuOption[]=[
  {name:"Classic Dinner",price:200,subtitle:"A relaxed and satisfying evening menu.",items:["Sweet","Idli or uthappam","Sambar & two chutneys","Chapati & vegetable kurma","Vegetable biryani & raita","Ice cream","Water bottle"]},
  {name:"Celebration Dinner",price:270,subtitle:"A varied menu for birthdays, betrothals and receptions.",featured:true,items:["Welcome drink","Dry gulab jamun","Chapati & channa masala","Idiyappam & white kurma","Vegetable biryani & Gobi 65","Curd rice & pickle","Ice cream & beeda"]},
  {name:"Grand Reception Dinner",price:370,subtitle:"A premium multi-course vegetarian evening feast.",items:["Welcome drink or soup","Two sweets & premium starter","Idli and dosa varieties","Idiyappam & white kurma","Rumali roti & paneer butter masala","Mushroom biryani & Gobi 65","Bisibele bath & curd rice","Fruit salad, ice cream & beeda"]},
];
const nonVeg: MenuOption[]=[
  {name:"Classic Chicken Dinner",price:300,subtitle:"A focused biryani dinner with essential accompaniments.",items:["Sweet","Chicken biryani","Chicken gravy or Chicken 65","Onion raita & brinjal curry","Ice cream","Leaf, water & service"]},
  {name:"Chicken Celebration",price:390,subtitle:"A fuller evening menu with veg choices for mixed groups.",featured:true,items:["Welcome drink","Bread halwa","Chicken biryani & Chicken 65","Chapati & chicken gravy","Veg biryani & Gobi 65","Raita & brinjal curry","Ice cream","Leaf, water & service"]},
  {name:"Premium Non-Veg Reception",price:520,subtitle:"Our most generous dinner for major celebrations.",items:["Welcome drink or soup","Two sweets","Chicken or fish starter","Mutton biryani & Chicken 65","Rumali roti & chicken gravy","Veg biryani & Gobi 65","Raita & brinjal curry","Fruit salad, ice cream & beeda"]},
];
export default function Page(){return <CateringMenuPage meal="Dinner" intro="Layered evening menus—from comforting classics to grand reception feasts—with attentive SS FOODS service." image="/images/catering/ai/biryani-dinner.jpg" imageAlt="AI-generated South Indian biryani dinner feast" veg={veg} nonVeg={nonVeg}/>}
