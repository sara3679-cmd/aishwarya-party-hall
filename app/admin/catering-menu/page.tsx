"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { menuImageLinks } from "../../catering/menu-images";

type MenuItem = { id: string | number; name: string; type: "Veg" | "Non-Veg" | "Veg / Non-Veg" | "Both"; meal: string; category: string; rate: string; sides: string; photoPath?: string };
const starter: MenuItem[] = [
  { id: 1, name: "Idli with sambar and coconut chutney", type: "Veg", meal: "Breakfast", category: "Main Course", rate: "", sides: "Vada, Pongal, Kesari" },
  { id: 2, name: "Masala dosa", type: "Veg", meal: "Breakfast", category: "Main Course", rate: "", sides: "Sambar, Coconut chutney" },
  { id: 3, name: "Ven pongal", type: "Veg", meal: "Breakfast", category: "Main Course", rate: "", sides: "Sambar, Coconut chutney, Medu vada" },
  { id: 4, name: "Poori with potato masala", type: "Veg", meal: "Breakfast", category: "Main Course", rate: "", sides: "Channa masala, Kesari" },
  { id: 5, name: "Chettinad vegetable biryani", type: "Veg", meal: "Lunch / Dinner", category: "Rice Items", rate: "", sides: "Onion raita, Brinjal curry" },
  { id: 6, name: "Chettinad chicken biryani", type: "Non-Veg", meal: "Lunch / Dinner", category: "Rice Items", rate: "", sides: "Onion raita, Brinjal curry, Boiled egg" },
  { id: 7, name: "Chicken 65", type: "Non-Veg", meal: "Lunch / Dinner", category: "Starters", rate: "", sides: "" },
  { id: 8, name: "Nattu kozhi kuzhambu", type: "Non-Veg", meal: "Lunch / Dinner", category: "Side Dish", rate: "", sides: "Rice, idiyappam, parotta" },
  { id: 9, name: "Meen kuzhambu", type: "Non-Veg", meal: "Lunch / Dinner", category: "Side Dish", rate: "", sides: "Steamed rice, appalam" },
  { id: 10, name: "Vatha kuzhambu", type: "Veg", meal: "Lunch", category: "Side Dish", rate: "", sides: "Steamed rice, appalam" },
  { id: 11, name: "Paruppu payasam", type: "Veg", meal: "Lunch / Dinner", category: "Desserts", rate: "", sides: "" },
];
const blank = (category = "Main Course"): MenuItem => ({ id: Date.now(), name: "", type: "Veg", meal: "Breakfast", category, rate: "", sides: "", photoPath: "" });

export default function CateringMenuAdminPage() {
  const [items, setItems] = useState<MenuItem[]>(starter);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch(`/api/catering-menu?refresh=${Date.now()}`, { cache: "no-store" }).then(response => response.ok ? response.json() : []).then(rows => { if (Array.isArray(rows)) setItems(rows.map(row => ({ ...row, meal: Array.isArray(row.meal) ? row.meal.join(" / ") : row.meal, sides: Array.isArray(row.sideDishes) ? row.sideDishes.join(", ") : row.sides || "" }))); }).catch(() => undefined); }, []);
  async function save(next: MenuItem[]) {
    setMessage("Saving menu item...");
    const response = await fetch("/api/catering-menu", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next) });
    if (!response.ok) throw new Error("Could not save the menu.");
    setItems(next);
    localStorage.setItem("ss-foods-menu-admin", JSON.stringify(next));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing?.name.trim()) return;
    try {
      const next = items.some(item => item.id === editing.id) ? items.map(item => item.id === editing.id ? editing : item) : [...items, editing];
      await save(next);
      setEditing(null);
      setMessage("Menu item saved.");
    } catch { setMessage("Menu item was not saved. Please try again."); }
  }
  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const source = URL.createObjectURL(file);
    try {
      const photoPath = await new Promise<string>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const size = 480;
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const context = canvas.getContext("2d");
          if (!context) return reject(new Error("Image could not be prepared."));
          const crop = Math.min(image.naturalWidth, image.naturalHeight);
          const left = (image.naturalWidth - crop) / 2;
          const top = (image.naturalHeight - crop) / 2;
          context.drawImage(image, left, top, crop, crop, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.onerror = () => reject(new Error("Image could not be opened."));
        image.src = source;
      });
      setEditing(current => ({ ...(current ?? blank()), photoPath }));
      setMessage("Image selected. Select Save item to keep it.");
    } catch { setMessage("That image could not be used. Please choose another image."); }
    finally { URL.revokeObjectURL(source); event.target.value = ""; }
  }
  function startEdit(item: MenuItem) {
    setEditing(item);
    setMessage("Edit the item above, then select Save item.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function removeItem(item: MenuItem) {
    try {
      await save(items.filter(row => row.id !== item.id));
      setMessage(`${item.name} deleted.`);
    } catch { setMessage("Item was not deleted. Please try again."); }
  }
  const categoryOrder = ["Welcome Drink", "Welcome Drinks", "Sweet", "Starters", "Main Course", "Gravy", "Rice Item", "Rice Items", "Side Dish", "Desserts", "Others"];
  const groupedItems = categoryOrder.map(category => ({ category, rows: items.filter(item => item.category === category).sort((a, b) => a.name.localeCompare(b.name)) })).filter(group => group.rows.length);
  const remainingItems = items.filter(item => !categoryOrder.includes(item.category)).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  if (remainingItems.length) groupedItems.push({ category: "Other items", rows: remainingItems });
  return <main className="adminPage"><header className="adminHeader"><div><p className="kicker">SS FOODS · Private administration</p><h1>Tamil Nadu Menu Manager</h1><p>Add side-dish choices and their rates first, then reuse them on any main dish.</p></div><div className="adminHeaderActions"><a href="/admin">Admin Home</a><a href="/catering/custom-menu">View Customer Menu</a></div></header><section className="adminForm"><h2>{editing?.category === "Side Dish" ? "Add side-dish choice and rate" : editing && items.some(item => item.id === editing.id) ? "Edit menu item" : "Add menu item"}</h2><form onSubmit={submit}><div className="formRow"><label>Item name<input required value={editing?.name ?? ""} onChange={e => setEditing({ ...(editing ?? blank()), name: e.target.value })}/></label><label>Rate per item (₹)<input type="number" min="0" value={editing?.rate ?? ""} onChange={e => setEditing({ ...(editing ?? blank()), rate: e.target.value })} placeholder="Enter your rate"/></label></div><div className="formRow"><label>Food type<select value={editing?.type ?? "Veg"} onChange={e => setEditing({ ...(editing ?? blank()), type: e.target.value as MenuItem["type"] })}><option>Veg</option><option>Non-Veg</option><option>Veg / Non-Veg</option></select></label><label>Meal<select value={editing?.meal ?? "Breakfast"} onChange={e => setEditing({ ...(editing ?? blank()), meal: e.target.value })}><option>Breakfast / Lunch / Dinner</option><option>Breakfast / Lunch</option><option>Breakfast / Dinner</option><option>Breakfast</option><option>Lunch</option><option>Lunch / Dinner</option><option>Dinner</option></select></label><label>Category<select value={editing?.category ?? "Main Course"} onChange={e => setEditing({ ...(editing ?? blank()), category: e.target.value })}>{["Welcome Drinks","Sweet","Starters","Main Course","Gravy","Rice Item","Side Dish","Desserts","Others"].map(value => <option key={value}>{value}</option>)}</select></label></div><label className="menuImagePicker">Item image<input type="file" accept="image/*" onChange={chooseImage}/><small>Choose an image from your computer. It will be resized for the customer menu.</small>{editing?.photoPath && <img src={editing.photoPath} alt="Selected menu item"/>}</label><button>{editing?.category === "Side Dish" ? "Save side dish and rate" : editing ? "Save item" : "Start adding item"}</button>{editing && <button type="button" className="cancelEdit" onClick={() => setEditing(null)}>Cancel</button>}</form>{message && <p className="adminMessage">{message}</p>}</section><section className="bookingReport"><div className="reportHead"><div><p className="kicker">Tamil Nadu customer catalogue</p><h2>{items.length} menu items</h2></div><button type="button" onClick={() => { setEditing(blank()); setMessage("Enter the new menu-item details above, then save it."); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Add Menu Item</button></div><div className="reportTableWrap"><table><thead><tr><th>S.No</th><th>Item</th><th>Type</th><th>Meal</th><th>Category</th><th>Rate</th><th>Actions</th></tr></thead><tbody>{groupedItems.map((group, groupIndex) => <><tr className="categoryGroup" key={`${group.category}-heading`}><td colSpan={7}>{group.category} <span>({group.rows.length})</span></td></tr>{group.rows.map((item, rowIndex) => <tr key={item.id}><td>{groupedItems.slice(0, groupIndex).reduce((total, previous) => total + previous.rows.length, 0) + rowIndex + 1}</td><td><span className="catalogueItem"><img src={item.photoPath || menuImageLinks[item.name.trim().toLowerCase()] || (item.category === "Sweet" ? "/images/catering/menu/south-indian-sweets.png" : "/images/catering/menu/tamil-veg-feast.png")} alt=""/><b>{item.name}</b></span></td><td><b style={{ color: item.type === "Veg" ? "#176b46" : item.type === "Non-Veg" ? "#a72c2c" : "#7a5c00" }}>{item.type}</b></td><td>{item.meal}</td><td>{item.category}</td><td>{item.rate ? `₹${item.rate}` : "Not set"}</td><td><button type="button" onClick={() => startEdit(item)}>Edit</button> <button type="button" className="deleteButton" onClick={() => removeItem(item)}>Delete</button></td></tr>)}</>)}</tbody></table></div></section></main>;
}
