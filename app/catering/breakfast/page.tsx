import type { Metadata } from "next";
import CateringMenuPage, { MenuOption } from "../../../components/CateringMenuPage";

export const metadata: Metadata = { title:"Breakfast Catering Menus | SS FOODS", description:"Three vegetarian and non-vegetarian breakfast catering options from SS FOODS in Chennai." };

const veg: MenuOption[] = [
  {name:"Classic Start",price:130,subtitle:"A familiar South Indian breakfast for simple functions.",items:["Kesari","Idli","Pongal","Medhu vadai","Sambar","Coconut & kara chutney","Coffee"]},
  {name:"Celebration Breakfast",price:170,subtitle:"More choice for family ceremonies and special mornings.",featured:true,items:["Pineapple kesari","Idli","Ghee pongal or kichadi","Medhu vadai","Poori & potato masala","Sambar & two chutneys","Coffee","Water bottle"]},
  {name:"Grand Morning Feast",price:220,subtitle:"A generous multi-item breakfast for weddings and receptions.",items:["Premium sweet","Idli & ghee pongal","Medhu vadai","Masala dosa or uthappam","Idiyappam & white kurma","Poori & potato masala","Sambar & three chutneys","Coffee","Water bottle"]},
];
const nonVeg: MenuOption[] = [
  {name:"Classic Egg Breakfast",price:160,subtitle:"Classic breakfast with a satisfying egg addition.",items:["Kesari","Idli & pongal","Medhu vadai","Sambar & two chutneys","Boiled egg or omelette","Coffee"]},
  {name:"Celebration Egg Menu",price:210,subtitle:"A fuller breakfast with your preferred egg preparation.",featured:true,items:["Pineapple kesari","Idli & ghee pongal","Medhu vadai","Poori & potato masala","Omelette or egg pepper fry","Sambar & chutneys","Coffee","Water bottle"]},
  {name:"Chicken Kurma Breakfast",price:270,subtitle:"A premium South Indian menu with a non-veg centrepiece.",items:["Premium sweet","Idli, dosa & idiyappam","Ghee pongal & medhu vadai","Chicken kurma","Poori & potato masala","Sambar & three chutneys","Omelette","Coffee","Water bottle"]},
];
export default function Page(){return <CateringMenuPage meal="Breakfast" intro="Traditional South Indian favourites, served hot and planned for the pace of your morning function." image="/images/catering/ai/breakfast-spread.jpg" imageAlt="AI-generated South Indian breakfast spread" veg={veg} nonVeg={nonVeg}/>}
