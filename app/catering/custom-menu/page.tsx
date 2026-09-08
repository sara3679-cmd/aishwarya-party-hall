"use client";

import { useMemo, useState } from "react";
import "./menu-builder.css";

type Meal = "Breakfast" | "Lunch" | "Dinner";
type FoodType = "Veg" | "Non-Veg";
type Item = { id: string; name: string; category: string; meal: Meal[]; type: FoodType; sideDishes?: string[] };

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

const categories = ["Welcome Drink", "Sweet", "Starters", "Main Course", "Rice Items", "Side Dish", "Desserts", "Others"];

export default function CustomCateringMenuPage() {
  const [meal, setMeal] = useState<Meal>("Breakfast");
  const [foodType, setFoodType] = useState<FoodType>("Veg");
  const [guests, setGuests] = useState(50);
  const [selected, setSelected] = useState<string[]>([]);
  const [sideDishes, setSideDishes] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const items = useMemo(() => menu.filter(item => item.meal.includes(meal) && item.type === foodType), [meal, foodType]);
  const chosen = useMemo(() => menu.filter(item => selected.includes(item.id)), [selected]);

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
      <label>Meal<select value={meal} onChange={event => { setMeal(event.target.value as Meal); setSelected([]); setSideDishes({}); }}><option>Breakfast</option><option>Lunch</option><option>Dinner</option></select></label>
      <fieldset><legend>Food type</legend><button className={foodType === "Veg" ? "veg active" : "veg"} onClick={() => { setFoodType("Veg"); setSelected([]); setSideDishes({}); }}>Veg</button><button className={foodType === "Non-Veg" ? "nonveg active" : "nonveg"} onClick={() => { setFoodType("Non-Veg"); setSelected([]); setSideDishes({}); }}>Non-Veg</button></fieldset>
      <label>Guest quantity<input type="number" min="50" value={guests} onChange={event => setGuests(Math.max(0, Number(event.target.value)))} /></label>
    </section>
    <section className="menuContent"><div className="menuItems"><div className="menuHeading"><p>{meal} · {foodType}</p><h2>Choose your items</h2><span>{foodType === "Veg" ? "Green items are vegetarian." : "Red items are non-vegetarian."}</span></div>{categories.map(category => { const rows = items.filter(item => item.category === category); return rows.length ? <section className="menuCategory" key={category}><h3>{category}</h3><div>{rows.map(item => <article className={item.type === "Veg" ? "vegItem" : "nonvegItem"} key={item.id}><label><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item)} /><span><b>{item.name}</b><small>{item.type} · Rate on request</small></span></label>{selected.includes(item.id) && item.sideDishes && <div className="sideDishes"><strong>Choose side dishes</strong>{item.sideDishes.map(dish => <label key={dish}><input type="checkbox" checked={sideDishes[item.id]?.includes(dish) ?? false} onChange={() => toggleSideDish(item.id, dish)} />{dish}</label>)}</div>}</article>)}</div></section> : null; })}</div>
      <aside className="menuSummary"><p>Your selection</p><h2>{guests || 0} guests</h2><span>{meal} · {foodType}</span><hr/>{chosen.length ? <ul>{chosen.map(item => <li key={item.id}><b>{item.name}</b>{sideDishes[item.id]?.length ? <small>{sideDishes[item.id].join(", ")}</small> : null}</li>)}</ul> : <p className="empty">Choose items from the menu to see them here.</p>}<button onClick={prepareEnquiry}>Prepare menu enquiry →</button>{message && <pre role="status">{message}</pre>}<small>Final rates and availability are confirmed by SS FOODS.</small></aside>
    </section>
  </main>;
}
