import "../app/catering/menu-page.css";

export type MenuOption = {
  name: string;
  price: number;
  subtitle: string;
  items: string[];
  featured?: boolean;
};

type Props = {
  meal: string;
  intro: string;
  image: string;
  imageAlt: string;
  veg: MenuOption[];
  nonVeg: MenuOption[];
};

export default function CateringMenuPage({ meal, intro, image, imageAlt, veg, nonVeg }: Props) {
  return <main className="menuPage">
    <header className="menuHeader">
      <a href="/" className="menuHallBrand"><img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall"/></a>
      <nav aria-label="Catering menu navigation"><a href="/">Home</a><a href="/catering">SS FOODS</a><a className={meal==="Breakfast"?"active":""} href="/catering/breakfast">Breakfast</a><a className={meal==="Lunch"?"active":""} href="/catering/lunch">Lunch</a><a className={meal==="Dinner"?"active":""} href="/catering/dinner">Dinner</a></nav>
      <a className="menuQuote" href="/catering#enquiry">Get quotation →</a>
    </header>

    <section className="menuHero">
      <img src={image} alt={imageAlt}/><div className="menuHeroShade"/>
      <div className="menuHeroCopy"><img src="/images/brand/ssfoods-logo.jpg" alt="SS Foods Catering Service"/><p>SS FOODS · {meal} menus</p><h1>Three ways to make<br/><em>{meal.toLowerCase()} memorable.</em></h1><span>{intro}</span></div>
      <div className="menuHeroFacts"><span><b>6</b> menu choices</span><span><b>Veg</b> &amp; non-veg</span><span><b>100+</b> guest pricing</span></div>
    </section>

    <section className="menuIntro"><p>Choose your style</p><div><h2>Simple to compare.<br/>Easy to customize.</h2><span>Every option is a starting menu. Dishes can be exchanged, added or removed after discussing your function, guest count and service requirements.</span></div></section>

    <MenuGroup title="Vegetarian menus" kicker="Fresh · Traditional · Flexible" options={veg}/>
    <MenuGroup title="Non-vegetarian menus" kicker="Generous · Flavourful · Celebration-ready" options={nonVeg} dark/>

    <section className="menuTerms">
      <div><p>Pricing notes</p><h2>Clear starting prices,<br/>personal final quotations.</h2></div>
      <ul><li>Displayed prices are starting rates for 100 or more guests.</li><li>Menus for 50–99 guests may cost ₹20–₹40 more per person.</li><li>Orders below 50 guests receive a custom quotation.</li><li>Outdoor transport, live counters and special equipment are quoted separately.</li><li>Premium sweets, fish and special mutton selections may change the final price.</li></ul>
    </section>

    <section className="menuCta"><p>Like a menu?</p><h2>We’ll tailor it to your celebration.</h2><div><a href="/catering#enquiry">Build your enquiry →</a><a href="tel:+919884806618">Call +91 98848 06618</a></div></section>
    <footer className="menuFooter"><a href="/catering">← All SS FOODS catering</a><span>Aishwarya Party Hall · Padi &amp; Korattur</span></footer>
  </main>;
}

function MenuGroup({ title, kicker, options, dark=false }: { title:string; kicker:string; options:MenuOption[]; dark?:boolean }) {
  return <section className={`menuGroup ${dark?"dark":""}`}><div className="menuGroupHead"><div><p>{kicker}</p><h2>{title}</h2></div><span>Option 1 is concise, Option 2 adds celebration favourites, and Option 3 delivers the fullest experience.</span></div><div className="menuOptionGrid">{options.map((option,index)=><article className={option.featured?"featured":""} key={option.name}><div className="menuOptionTop"><span>OPTION 0{index+1}</span>{option.featured&&<b>MOST POPULAR</b>}</div><h3>{option.name}</h3><p>{option.subtitle}</p><div className="menuPrice"><small>STARTING FROM</small><strong>₹{option.price}</strong><span>/ person</span></div><ul>{option.items.map(item=><li key={item}>{item}</li>)}</ul><a href="/catering#enquiry">Customize this menu →</a></article>)}</div></section>;
}
