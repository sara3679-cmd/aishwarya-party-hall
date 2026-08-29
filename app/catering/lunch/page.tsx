import type { Metadata } from "next";
import CateringMenuPage, { MenuOption } from "../../../components/CateringMenuPage";
export const metadata: Metadata = { title:"Lunch Catering Menus | SS FOODS", description:"Three vegetarian and non-vegetarian lunch catering options from SS FOODS in Chennai." };
const veg: MenuOption[]=[
  {name:"Traditional Meals",price:180,subtitle:"A complete banana-leaf lunch for intimate celebrations.",items:["Sweet","White rice","Sambar & vatha kuzhambu","Rasam","Poriyal","Buttermilk","Appalam & pickle","Banana leaf & water"]},
  {name:"Celebration Lunch",price:240,subtitle:"A festive vegetarian spread with biryani and dessert.",featured:true,items:["Sweet & payasam","Masala vadai","Vegetable biryani & raita","White rice","Sambar, vatha kuzhambu & rasam","Two vegetable sides","Buttermilk & appalam","Ice cream"]},
  {name:"Premium Veg Feast",price:330,subtitle:"A generous wedding-style menu with premium additions.",items:["Welcome drink","Two sweets & starter","Chapati & paneer butter masala","Mushroom or vegetable biryani","White rice trio","Two vegetable sides","Payasam & ice cream","Beeda, leaf & water"]},
];
const nonVeg: MenuOption[]=[
  {name:"Classic Chicken Lunch",price:280,subtitle:"A crowd-friendly chicken biryani celebration menu.",items:["Sweet","Chicken biryani","Chicken gravy","Onion raita & brinjal curry","White rice & rasam","Banana leaf & water"]},
  {name:"Chicken Celebration",price:360,subtitle:"Our popular biryani menu with starters and dessert.",featured:true,items:["Welcome drink","Bread halwa","Chicken biryani","Chicken 65","Veg biryani & Gobi 65","Raita & brinjal curry","Ice cream","Service, leaf & water"]},
  {name:"Mutton Premium Lunch",price:480,subtitle:"A full non-vegetarian feast for milestone functions.",items:["Welcome drink","Premium sweet","Mutton biryani","Chicken 65","Chicken gravy or fish fry","Veg biryani & Gobi 65","Raita & brinjal curry","Dessert, beeda & service"]},
];
export default function Page(){return <CateringMenuPage meal="Lunch" intro="Banana-leaf classics, festive biryani menus and generous family-style service for your afternoon celebration." image="/images/catering/ai/vegetarian-lunch.jpg" imageAlt="AI-generated vegetarian banana-leaf lunch" veg={veg} nonVeg={nonVeg}/>}
