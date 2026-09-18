"use client";

import { useEffect, useMemo, useState } from "react";
import { menuImageLinks } from "../menu-images";
import "./menu-builder.css";

type Meal = "Breakfast" | "Lunch" | "Dinner";
type FoodType = "Veg" | "Non-Veg";
type Item = { id: string; name: string; category: string; meal: Meal[]; type: FoodType | "Veg / Non-Veg" | "Both"; rate?: string; sideDishes?: string[]; photoPath?: string };

const menu: Item[] = [
  { id: "idli", name: "Idli with sambar and coconut chutney", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Vada", "Pongal", "Kesari"] },
  { id: "vada", name: "Medu vada", category: "Starters", meal: ["Breakfast"], type: "Veg" },
  { id: "masala-dosa", name: "Masala dosa", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Sambar", "Coconut chutney", "Tomato chutney"] },
  { id: "plain-dosa", name: "Plain dosa", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Sambar", "Coconut chutney", "Tomato chutney"] },
  { id: "pongal", name: "Pongal with chutney and sambar", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Medu vada", "Kesari", "Filter coffee"] },
  { id: "poori", name: "Poori with potato masala", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Channa masala", "Kesari", "Coffee"] },
  { id: "upma", name: "Upma", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Coconut chutney", "Sambar", "Kesari"] },
  { id: "coffee", name: "Filter coffee", category: "Others", meal: ["Breakfast", "Dinner"], type: "Veg" },
  { id: "tea", name: "Tea", category: "Others", meal: ["Breakfast"], type: "Veg" },
  { id: "juice", name: "Fresh fruit juice", category: "Welcome Drink", meal: ["Breakfast", "Lunch", "Dinner"], type: "Veg" },
  { id: "rice", name: "Steamed rice", category: "Rice Items", meal: ["Lunch"], type: "Veg", sideDishes: ["Sambar", "Rasam", "Vatha kuzhambu", "Curd"] },
  { id: "sambar", name: "Sambar", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "rasam", name: "Rasam", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "poriyal", name: "Vegetable poriyal", category: "Side Dish", meal: ["Lunch"], type: "Veg" },
  { id: "avial", name: "Avial", category: "Side Dish", meal: ["Lunch"], type: "Veg" },
  { id: "kootu", name: "Kootu", category: "Side Dish", meal: ["Lunch"], type: "Veg" },
  { id: "potato-fry", name: "Potato fry", category: "Side Dish", meal: ["Lunch"], type: "Veg" },
  { id: "payasam", name: "Payasam", category: "Sweet", meal: ["Lunch"], type: "Veg" },
  { id: "banana", name: "Banana", category: "Desserts", meal: ["Lunch"], type: "Veg" },
  { id: "buttermilk", name: "Buttermilk", category: "Others", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "chapati", name: "Chapati / phulka", category: "Main Course", meal: ["Dinner"], type: "Veg", sideDishes: ["Vegetable kurma", "Paneer butter masala", "Mixed vegetable curry"] },
  { id: "veg-pulao", name: "Veg pulao or ghee rice", category: "Rice Items", meal: ["Dinner"], type: "Veg", sideDishes: ["Paneer butter masala", "Vegetable kurma", "Raita"] },
  { id: "paneer", name: "Paneer butter masala", category: "Side Dish", meal: ["Dinner"], type: "Veg" },
  { id: "veg-curry", name: "Mixed vegetable curry", category: "Side Dish", meal: ["Dinner"], type: "Veg" },
  { id: "gulab", name: "Gulab jamun", category: "Sweet", meal: ["Dinner"], type: "Veg" },
  { id: "kesari", name: "Kesari / rava sheera", category: "Sweet", meal: ["Breakfast", "Dinner"], type: "Veg" },
  { id: "veg-starter", name: "Gobi 65", category: "Starters", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "chicken65", name: "Chicken 65", category: "Starters", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "chicken-biryani", name: "Chicken biryani", category: "Rice Items", meal: ["Lunch", "Dinner"], type: "Non-Veg", sideDishes: ["Onion raita", "Brinjal curry", "Boiled egg"] },
  { id: "mutton-biryani", name: "Mutton biryani", category: "Rice Items", meal: ["Lunch", "Dinner"], type: "Non-Veg", sideDishes: ["Onion raita", "Brinjal curry", "Chicken 65"] },
  { id: "chicken-gravy", name: "Chettinad chicken gravy", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "lemonade", name: "Lemon mint cooler", category: "Welcome Drink", meal: ["Breakfast", "Lunch", "Dinner"], type: "Veg" },
  { id: "rose-milk", name: "Rose milk", category: "Welcome Drink", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "tender-coconut", name: "Tender coconut cooler", category: "Welcome Drink", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "bajji", name: "Mixed vegetable bajji", category: "Starters", meal: ["Breakfast", "Lunch", "Dinner"], type: "Veg" },
  { id: "mushroom65", name: "Mushroom 65", category: "Starters", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "paneer-tikka", name: "Paneer tikka", category: "Starters", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "veg-cutlet", name: "Vegetable cutlet", category: "Starters", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "idiyappam", name: "Idiyappam with coconut milk", category: "Main Course", meal: ["Breakfast"], type: "Veg", sideDishes: ["Vegetable kurma", "Coconut milk", "Kesari"] },
  { id: "appam", name: "Appam", category: "Main Course", meal: ["Breakfast", "Dinner"], type: "Veg", sideDishes: ["Vegetable stew", "Vegetable kurma", "Coconut milk"] },
  { id: "veg-biryani", name: "Vegetable dum biryani", category: "Rice Items", meal: ["Lunch", "Dinner"], type: "Veg", sideDishes: ["Onion raita", "Vegetable gravy", "Gobi 65"] },
  { id: "lemon-rice", name: "Lemon rice", category: "Rice Items", meal: ["Lunch", "Dinner"], type: "Veg", sideDishes: ["Potato fry", "Appalam", "Pickle"] },
  { id: "tamarind-rice", name: "Tamarind rice", category: "Rice Items", meal: ["Lunch", "Dinner"], type: "Veg", sideDishes: ["Potato fry", "Appalam", "Curd"] },
  { id: "malai-kofta", name: "Malai kofta", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "dal-fry", name: "Dal fry", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "veg-kurma", name: "Vegetable kurma", category: "Side Dish", meal: ["Breakfast", "Lunch", "Dinner"], type: "Veg" },
  { id: "mysore-pak", name: "Mysore pak", category: "Sweet", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "laddu", name: "Boondi laddu", category: "Sweet", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "ice-cream", name: "Ice cream", category: "Desserts", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "fruit-salad", name: "Fresh fruit salad", category: "Desserts", meal: ["Lunch", "Dinner"], type: "Veg" },
  { id: "chicken-lollipop", name: "Chicken lollipop", category: "Starters", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "pepper-chicken", name: "Pepper chicken dry", category: "Starters", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "fish-fry", name: "Fish fry", category: "Starters", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "prawn-fry", name: "Prawn fry", category: "Starters", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "chicken-pulao", name: "Chicken pulao", category: "Rice Items", meal: ["Lunch", "Dinner"], type: "Non-Veg", sideDishes: ["Onion raita", "Chicken gravy", "Boiled egg"] },
  { id: "fish-curry", name: "South Indian fish curry", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "mutton-kuzhambu", name: "Mutton kuzhambu", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
  { id: "egg-curry", name: "Egg curry", category: "Side Dish", meal: ["Lunch", "Dinner"], type: "Non-Veg" },
];

const categories = ["Welcome Drinks", "Sweet", "Starters", "Main Course", "Gravy", "Rice Items", "Side Dish", "Desserts", "Others"];
const categoryMatches = (itemCategory: string, category: string) => itemCategory === category || (category === "Welcome Drinks" && itemCategory === "Welcome Drink") || (category === "Rice Items" && itemCategory === "Rice Item");

function menuImage(item: Item) {
  if (item.photoPath) return item.photoPath;
  const knownImage = menuImageLinks[item.name.trim().toLowerCase()];
  if (knownImage) return knownImage;
  if (item.category === "Sweet") return "/images/catering/menu/south-indian-sweets.png";
  const dish = item.name.toLowerCase().replace(/[^a-z0-9]+/g, ",").replace(/^,|,$/g, "");
  const lock = [...item.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return `https://loremflickr.com/480/480/${dish},south-indian-food?lock=${lock}`;
}

export default function CustomCateringMenuPage() {
  const [meal, setMeal] = useState<Meal>("Breakfast");
  const [foodType, setFoodType] = useState<FoodType>("Veg");
  const [guests, setGuests] = useState(50);
  const [selected, setSelected] = useState<string[]>([]);
  const [sideDishes, setSideDishes] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [databaseMenu, setDatabaseMenu] = useState<Item[]>(menu);
  const [preferencesReady, setPreferencesReady] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("ss-foods-customer-menu-preferences");
    if (saved) try {
      const preferences = JSON.parse(saved);
      if (["Breakfast", "Lunch", "Dinner"].includes(preferences.meal)) setMeal(preferences.meal);
      if (["Veg", "Non-Veg"].includes(preferences.foodType)) setFoodType(preferences.foodType);
      if (Number(preferences.guests) >= 50) setGuests(Number(preferences.guests));
    } catch { /* Start with the default menu controls. */ }
    setPreferencesReady(true);
  }, []);
  useEffect(() => { if (preferencesReady) localStorage.setItem("ss-foods-customer-menu-preferences", JSON.stringify({ meal, foodType, guests })); }, [preferencesReady, meal, foodType, guests]);
  useEffect(() => { fetch(`/api/catering-menu?refresh=${Date.now()}`, { cache: "no-store" }).then(response => response.ok ? response.json() : []).then(rows => { if (Array.isArray(rows)) setDatabaseMenu(rows); }).catch(() => setDatabaseMenu(menu)); }, []);
  const items = useMemo(() => databaseMenu.filter(item => item.meal.includes(meal) && (item.type === foodType || item.type === "Veg / Non-Veg" || item.type === "Both")), [databaseMenu, meal, foodType]);
  const chosen = useMemo(() => { const order = ["Welcome Drinks", "Welcome Drink", "Sweet", "Starters", "Main Course", "Gravy", "Rice Item", "Rice Items", "Side Dish", "Desserts", "Others"]; return databaseMenu.filter(item => selected.includes(item.id)).sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name)); }, [databaseMenu, selected]);
  const totalAmount = useMemo(() => chosen.reduce((total, item) => total + (Number(item.rate) || 0), 0), [chosen]);


  function toggle(item: Item) {
    setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id]);
  }
  function toggleSideDish(main: string, dish: string) {
    setSideDishes(current => ({ ...current, [main]: current[main]?.includes(dish) ? current[main].filter(value => value !== dish) : [...(current[main] ?? []), dish] }));
  }
  function prepareEnquiry() {
    if (guests < 50) { setMessage("Please choose a minimum of 50 guests."); return; }
    if (!chosen.length) { setMessage("Choose at least one menu item to prepare your enquiry."); return; }
    const details = chosen.map(item => `• ${item.name}${sideDishes[item.id]?.length ? ` — side dishes: ${sideDishes[item.id].join(", ")}` : ""}`).join("\n");
    setMessage(`Your menu enquiry is ready.\n\n${meal} · ${foodType} · ${guests} guests\n\n${details}\n\nRates will be shared by SS FOODS after reviewing your menu.`);
  }

  return <main className="menuBuilder">
    <header><a href="/catering">← SS FOODS Catering</a><p>Customer menu builder</p><h1>Choose your <em>catering menu.</em></h1><span>Minimum order: 50 guests · Prices are shared after SS FOODS confirms your menu.</span></header>
    <section className="menuControls" aria-label="Menu filters">
      <label>Meal<select value={meal} onChange={event => setMeal(event.target.value as Meal)}><option>Breakfast</option><option>Lunch</option><option>Dinner</option></select></label>
      <fieldset><legend>Food type</legend><button className={foodType === "Veg" ? "veg active" : "veg"} onClick={() => setFoodType("Veg")}>Veg</button><button className={foodType === "Non-Veg" ? "nonveg active" : "nonveg"} onClick={() => setFoodType("Non-Veg")}>Non-Veg</button></fieldset>
      <label>Guest quantity<input type="number" min="50" value={guests} onChange={event => setGuests(Math.max(0, Number(event.target.value)))} /></label>
    </section>
    <section className="menuContent"><div className="menuItems"><div className="menuHeading"><p>{meal} · {foodType}</p><h2>Choose your items</h2><span>{foodType === "Veg" ? "Green items are vegetarian." : "Red items are non-vegetarian."}</span></div>{categories.map(category => { const rows = items.filter(item => categoryMatches(item.category, category)); return rows.length ? <section className={category === "Main Course" ? "menuCategory mainCourse" : "menuCategory"} key={category}><h3>{category}</h3><div>{rows.map(item => <article className={item.type === "Veg" ? "vegItem" : "nonvegItem"} key={item.id}><img className="menuItemPhoto" src={menuImage(item)} alt={item.name} /><label><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item)} /><span><b>{item.name}</b><small>{item.rate ? `₹${item.rate} / person` : "Rate on request"}</small></span></label></article>)}</div></section> : null; })}</div>
      <aside className="menuSummary"><p>Your selection</p><h2>{guests || 0} guests</h2><span>{meal} · {foodType}</span><strong className="selectionTotal">Total items: {chosen.length}</strong><div className="selectionAmount"><strong>Total amount (1 person): {totalAmount ? `₹${totalAmount.toLocaleString("en-IN")}` : "Rate on request"}</strong></div><hr/>{chosen.length ? <ul>{chosen.map((item, index) => <li key={item.id}><b>{index + 1}. {item.name}</b><button type="button" className="removeSelection" onClick={() => toggle(item)} aria-label={`Remove ${item.name}`}>×</button>{sideDishes[item.id]?.length ? <small>{sideDishes[item.id].join(", ")}</small> : null}</li>)}</ul> : <p className="empty">Choose items from the menu to see them here.</p>}<button onClick={prepareEnquiry}>Prepare menu enquiry →</button>{message && <pre role="status">{message}</pre>}<small>Final rates and availability are confirmed by SS FOODS.</small></aside>
    </section>
  </main>;
}
