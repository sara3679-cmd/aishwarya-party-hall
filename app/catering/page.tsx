"use client";

import { FormEvent, useState } from "react";
import "./catering.css";
import "./menu-packages.css";

const PHONE = "+919884806618";
const menuIdeas = [
  ["South Indian Breakfast", "Idli, pongal, medhu vadai, poori, chutneys, sambar and coffee."],
  ["Traditional Veg Lunch", "Sweet, payasam, vadai, poriyal, kootu, rice, sambar, rasam and accompaniments."],
  ["Reception Dinner", "Starters, biryani, breads, gravies, rice, dessert, ice cream and refreshments."],
  ["Birthday Biryani Menu", "Welcome drink, chicken biryani, brinjal pachadi, onion raita and ice cream."],
  ["Veg Biryani Celebration", "Vegetable biryani with raita, gravy, starter, sweet and dessert."],
  ["Institutional Meal Service", "Planned breakfast, lunch, snacks and dinner menus for organisations."],
];

const samplePackages = [
  { tag: "VEGETARIAN", title: "South Indian Breakfast", price: "₹___ / person", dishes: ["Kesari", "Idli & pongal", "Medhu vadai", "Sambar & two chutneys", "Poori & potato masala", "Coffee"] },
  { tag: "TRADITIONAL", title: "Vegetarian Lunch", price: "₹___ / person", dishes: ["Sweet & payasam", "White rice", "Kadamba sambar", "Vatha kuzhambu & rasam", "Poriyal & potato masala", "Vadai, appalam & buttermilk"] },
  { tag: "NON-VEGETARIAN", title: "Chicken Biryani Menu", price: "₹___ / person", dishes: ["Welcome drink", "Bread halwa", "Chicken biryani", "Chicken 65", "Onion raita & brinjal curry", "Ice cream"] },
  { tag: "PREMIUM", title: "Mutton Biryani Menu", price: "Custom quotation", dishes: ["Welcome drink", "Sweet", "Mutton biryani", "Chicken 65", "Veg biryani & Gobi 65", "Raita, brinjal curry & dessert"] },
];

export default function CateringPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [requirements, setRequirements] = useState("");

  const chooseMenu = (name: string) => {
    setRequirements(`Interested in the ${name} sample menu. `);
    document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSummary(`Enquiry prepared — copy and send to SS FOODS\n\nService: ${data.get("service")}\nDate: ${data.get("date")}\nFunction: ${data.get("function")}\nMeal: ${data.get("meal")}\nPreference: ${data.get("preference")}\nGuests: ${data.get("guests")}\nVenue: ${data.get("venue")}\nRequirements: ${data.get("requirements") || "Not specified"}\nName: ${data.get("name")}\nMobile: ${data.get("mobile")}\n\nThis offline form has not sent your information.`);
    setTimeout(() => document.getElementById("form-result")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  return <main className="ssPage">
    <header className="ssHeader">
      <a className="ssBrand" href="/" aria-label="Aishwarya Party Hall home"><img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall" /></a>
      <nav className={menuOpen ? "open" : ""} aria-label="Main navigation">
        <a href="/">Home</a><a href="/#locations">Padi Hall</a><a href="/#locations">Korattur Hall</a><a className="active" href="/catering">Catering – SS FOODS</a><a href="/#gallery">Gallery</a><a href="/#enquiry">Check Availability</a><a href="#contact">Contact</a>
      </nav>
      <a className="ssHeaderCta" href="#enquiry">Get quotation <span>→</span></a>
      <button className="ssMenuButton" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button>
    </header>

    <section className="ssHero">
      <div className="ssHeroCopy"><p className="ssKicker">SS FOODS · Catering Service</p><h1>Food that feels like <em>home,</em><br/>served like an occasion.</h1><p>Thoughtful vegetarian and non-vegetarian catering for weddings, birthdays, family functions and corporate gatherings—at our halls or your chosen venue.</p><div className="ssActions"><a className="ssPrimary" href="#enquiry">Request a quotation <span>→</span></a><a className="ssSecondary" href={`tel:${PHONE}`}>Call 98848 06618</a></div></div>
      <div className="ssHeroVisual"><img className="ssHeroLogo" src="/images/brand/ssfoods-logo.jpg" alt="SS Foods Catering Service"/><img className="ssHeroFood" src="/images/catering/ai/hero-feast.jpg" alt="AI-generated South Indian SS Foods celebration feast"/><div className="ssHeroBadge"><b>Veg &amp; Non-Veg</b><span>Freshly prepared · Warmly served</span></div></div>
    </section>

    <section className="ssSection ssAbout" id="about"><p className="ssSectionLabel">01 / About us</p><div className="ssTwoCol"><h2>Good celebrations begin around a generous table.</h2><div><p>SS FOODS brings attentive catering to intimate family gatherings and large celebrations. Our official records document food-service experience from 2008, including industrial canteens, educational institutions and special events.</p><p>We plan breakfast, lunch, snacks, refreshments and dinner around your occasion, service style and preferences. Book catering at <b>Aishwarya Party Hall, Padi or Korattur</b>, or invite our team to serve at your outside venue.</p></div></div><div className="ssStats"><div><b>Since 2008</b><span>Documented food-service experience</span></div><div><b>Veg + Non-Veg</b><span>Flexible menu choices</span></div><div><b>Events + Institutions</b><span>Celebrations and organised meal service</span></div></div></section>

    <section className="ssSection ssWarm" id="functions"><div className="ssSectionHead"><div><p className="ssKicker">Made for your moment</p><h2>Functions we cater</h2></div><p>From the first welcome drink to the last sweet, we shape service around the rhythm of your day.</p></div><div className="ssOccasions">{[["Weddings & Receptions","Breakfast, muhurtham lunch and reception dinners."],["Betrothals","Traditional menus for joyful family beginnings."],["Birthdays","Friendly favourites for children, families and friends."],["Family Ceremonies","Baby showers, naming, ear-piercing and puberty functions."],["Corporate Catering","Organised breakfast, lunch, snacks and dinner for teams."],["Institutional Catering","Planned canteen and meal service for educational institutions."]].map(([title,copy],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>

    <section className="ssSection" id="packages"><div className="ssSectionHead"><div><p className="ssKicker">Based on genuine SS FOODS orders</p><h2>Sample catering menus</h2></div><p>These are practical starting points from recent menu patterns. Items, quantities and service are customized for every event.</p></div><div className="ssPackages">{samplePackages.map((pkg,i)=><article className={i===2?"featured":""} key={pkg.title}><small>{pkg.tag}</small><h3>{pkg.title}</h3><p>Starting from <b>{pkg.price}</b></p><ul>{pkg.dishes.map(dish=><li key={dish}>{dish}</li>)}</ul><a href="#enquiry" onClick={()=>setRequirements(`Interested in the ${pkg.title} sample menu. `)}>Customize this menu →</a></article>)}</div><p className="ssNote">Prices remain intentionally blank because historic order rates are not current quotations. Contact SS FOODS for today’s rate based on guest count and requirements.</p></section>

    <section className="fullMenuLinks" aria-label="Explore full SS Foods menus"><div><p className="ssKicker">Explore every option</p><h2>Separate menus for every meal.</h2></div><nav><a href="/catering/breakfast"><span>01</span><b>Breakfast</b><small>3 Veg + 3 Non-Veg menus</small><i>→</i></a><a href="/catering/lunch"><span>02</span><b>Lunch</b><small>3 Veg + 3 Non-Veg menus</small><i>→</i></a><a href="/catering/dinner"><span>03</span><b>Dinner</b><small>3 Veg + 3 Non-Veg menus</small><i>→</i></a></nav></section>

    <section className="ssSection ssDark" id="menus"><div className="ssSectionHead"><div><p className="ssKicker">From the SS FOODS menu archive</p><h2>One menu, many possibilities</h2></div><p>These sample combinations are drawn from genuine SS FOODS menu records. Every current menu remains customizable.</p></div><div className="ssCategories">{["Welcome Drinks","Sweets & Payasam","Veg & Non-Veg Starters","South Indian Breakfast","Traditional Meals","Biryani","Gravies & Kurma","Variety Rice","Desserts","Ice Cream","Refreshments","Service"].map(item=><span key={item}>{item}</span>)}</div><h3 className="ssPopularTitle">Authentic menu starting points</h3><div className="ssMenuCards">{menuIdeas.map(([title,copy],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{copy}</p><button onClick={()=>chooseMenu(title)}>Choose this idea</button></article>)}</div></section>

    <section className="ssSection" id="gallery"><div className="ssSectionHead"><div><p className="ssKicker">A taste of the experience</p><h2>Made for memorable tables.</h2></div><p>A visual preview of SS FOODS breakfast, lunch, biryani and catered buffet experiences.</p></div><div className="ssGallery"><figure className="tall"><img src="/images/catering/ai/breakfast-spread.jpg" alt="AI-generated South Indian breakfast spread"/><figcaption>South Indian breakfast</figcaption></figure><figure><img src="/images/catering/ai/vegetarian-lunch.jpg" alt="AI-generated vegetarian banana-leaf lunch"/><figcaption>Traditional vegetarian lunch</figcaption></figure><figure><img src="/images/catering/ai/biryani-dinner.jpg" alt="AI-generated biryani dinner feast"/><figcaption>Biryani celebration dinner</figcaption></figure><figure className="wide"><img src="/images/catering/ai/catering-buffet.jpg" alt="AI-generated South Indian catering buffet"/><figcaption>Celebration buffet service</figcaption></figure></div><p className="ssNote">Food images on this page are AI-generated visual representations. Final presentation and menu items vary by event.</p></section>

    <section className="ssSection ssWarm"><p className="ssSectionLabel">02 / Why SS FOODS</p><div className="ssWhy"><h2>Thoughtful food.<br/>Dependable service.</h2><div>{[["Menus made personal","Choose dishes around your event, preferences and budget."],["Veg & non-veg expertise","Flexible menu options for varied tastes and occasions."],["Hall or outside venue","One trusted team wherever you choose to celebrate."],["Clear planning","A practical quotation shaped by your real requirements."]].map(([title,copy],i)=><article key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</div></div></section>

    <section className="ssSection ssChoice"><div><p className="ssKicker">Choose your setting</p><h2>Catering only—or pair it with our hall.</h2></div><div className="ssChoiceCards"><article><small>OPTION A</small><h3>Catering Only</h3><p>Your home, office or chosen venue</p><a href="#enquiry">Enquire →</a></article><article><small>OPTION B</small><h3>Hall + Catering</h3><p>Aishwarya Party Hall, Padi or Korattur</p><a href="#enquiry">Check availability →</a></article></div></section>

    <section className="ssSection ssEnquiry" id="enquiry">
      <div><p className="ssKicker">Build your own menu</p><h2>Tell us about your celebration.</h2><p>Share what you know today. SS FOODS can help you refine the rest and prepare a tailored quotation.</p></div>
      <form onSubmit={submit}>
        <fieldset><legend>What are you planning?</legend>
          <div className="ssRadioRow"><label><input type="radio" name="service" value="Catering only" defaultChecked/><span><b>Catering only</b><small>At your chosen venue</small></span></label><label><input type="radio" name="service" value="Hall + catering"/><span><b>Hall + catering</b><small>Padi or Korattur</small></span></label></div>
          <div className="ssFields">
            <label>Function date<input type="date" name="date" required/></label>
            <label>Function type<select name="function" required defaultValue=""><option value="" disabled>Select function</option><option>Wedding</option><option>Reception</option><option>Betrothal</option><option>Birthday</option><option>Baby Shower</option><option>Naming Ceremony</option><option>Ear-piercing Ceremony</option><option>Puberty Function</option><option>Housewarming</option><option>Corporate Event</option><option>Institutional Catering</option><option>Family Function</option><option>Other</option></select></label>
            <label>Meal<select name="meal" required defaultValue=""><option value="" disabled>Select meal</option><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snacks &amp; refreshments</option><option>Multiple meals</option></select></label>
            <label>Food preference<select name="preference" required defaultValue=""><option value="" disabled>Select preference</option><option>Vegetarian</option><option>Chicken menu</option><option>Mutton menu</option><option>Vegetarian &amp; non-vegetarian</option></select></label>
            <label>Guest count<input type="number" name="guests" min="1" placeholder="Approximate number" required/></label>
            <label>Venue<input type="text" name="venue" placeholder="Area / venue name" required/></label>
          </div>
          <label>Dishes or special requirements<textarea name="requirements" rows={5} value={requirements} onChange={e=>setRequirements(e.target.value)} placeholder="Preferred dishes, dietary needs or serving style..."/></label>
        </fieldset>
        <fieldset><legend>How can we reach you?</legend><div className="ssFields"><label>Your name<input type="text" name="name" autoComplete="name" required/></label><label>Mobile number<input type="tel" name="mobile" autoComplete="tel" placeholder="10-digit mobile number" required/></label></div></fieldset>
        <button className="ssSubmit" type="submit">Prepare my enquiry <span>→</span></button>
        <p className="ssFormNote">Offline mode: this prepares a copyable summary and does not send any personal information.</p>
        {summary&&<div id="form-result" className="ssResult" role="status">{summary}</div>}
      </form>
    </section>

    <section className="ssSection ssContact" id="contact"><p className="ssKicker">Let’s plan the menu</p><h2>Your celebration deserves a table everyone remembers.</h2><div><span>CALL SS FOODS</span><a href={`tel:${PHONE}`}>+91 98848 06618</a><small>Padi · Korattur · Outside venues</small></div></section>
    <footer className="ssFooter"><a href="/"><img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall"/></a><p>SS FOODS Catering Service · Padi &amp; Korattur</p><p>© 2026 Aishwarya Party Hall</p></footer>
  </main>;
}
