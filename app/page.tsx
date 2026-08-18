"use client";

import { useEffect, useState } from "react";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

const MAPS = {
  Padi: "https://www.google.com/maps/place/Aishwarya+Party+Hall/@13.0909466,80.1824878,19z/data=!4m6!3m5!1s0x3a5263e92c061e4b:0x96234b1534536fc2!8m2!3d13.0906947!4d80.1852484!16s%2Fg%2F11p60x2gxq",
  Korattur: "https://www.google.com/maps/place/Aishwarya+Party+Hall/@13.1030544,80.1794985,17z/data=!4m6!3m5!1s0x3a52631f9c251aa9:0x61af5733823caf1b!8m2!3d13.1030544!4d80.1794985!16s%2Fg%2F11m6ymr344",
};

const galleries = {
  Padi: [
    ["/images/padi/hero.jpg", "Birthday stage at Aishwarya Party Hall Padi"],
    ["/images/padi/exterior.jpg", "Padi hall exterior"],
    ["/images/padi/event-hall-1.jpg", "Padi hall celebration seating"],
    ["/images/padi/event-hall-2.jpg", "Decorated birthday event"],
    ["/images/padi/hall-1.jpg", "Spacious Padi party hall"],
    ["/images/padi/hall-3.jpg", "Padi hall stage and interiors"],
    ["/images/padi/decor-stage-1.jpg", "Floral celebration stage"],
    ["/images/padi/decor-stage-2.jpg", "First birthday stage decor"],
    ["/images/padi/decor-stage-3.jpg", "Birthday event setup"],
    ["/images/padi/birthday-entrance.jpg", "Decorated party entrance"],
    ["/images/padi/mini-hall-entrance-2.jpg", "Sri Annai Mini Hall entrance"],
    ["/images/padi/seating-2.jpg", "Formal guest seating"],
    ["/images/padi/dining-2.jpg", "Dining hall"],
    ["/images/padi/dining-3.jpg", "Traditional banana leaf dining"],
  ],
  Korattur: [
    ["/images/korattur/exterior-1.jpg", "Aishwarya Party Hall Korattur exterior"],
    ["/images/korattur/entrance.jpg", "Korattur hall entrance"],
    ["/images/korattur/exterior-2.jpg", "Korattur venue building"],
    ["/images/korattur/hall-stage.jpg", "Korattur main hall and stage"],
    ["/images/korattur/hall-1.jpg", "Spacious Korattur party hall"],
    ["/images/korattur/hall-2.jpg", "Korattur hall interior"],
    ["/images/korattur/hall-3.jpg", "Air-conditioned Korattur hall"],
    ["/images/korattur/dining-1.jpg", "Korattur dining hall"],
    ["/images/korattur/parking-1.jpg", "Covered parking facility"],
    ["/images/korattur/wash-area.jpg", "Hand wash area"],
  ],
};

const events = ["Birthday Party", "Betrothal", "Baby Shower", "Naming Ceremony", "Get Together", "Seminars & Training"];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState<"Padi" | "Korattur">("Padi");
  const [gallery, setGallery] = useState<"Padi" | "Korattur">("Padi");
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const [occasion, setOccasion] = useState("Birthday Party");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
      if (activeImage !== null && event.key === "ArrowRight") setActiveImage((activeImage + 1) % galleries[gallery].length);
      if (activeImage !== null && event.key === "ArrowLeft") setActiveImage((activeImage - 1 + galleries[gallery].length) % galleries[gallery].length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeImage, gallery]);

  const chooseOccasion = (name: string) => {
    setOccasion(name);
    document.getElementById("enquiry")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main>
      <header className="siteHeader">
        <a className="brand" href="#home" aria-label="Aishwarya Party Hall home">
          <img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall" />
        </a>
        <nav className={menuOpen ? "open" : ""} aria-label="Main navigation">
          <a href="#about" onClick={() => setMenuOpen(false)}>About Us</a>
          <a href="#locations" onClick={() => setMenuOpen(false)}>Locations</a>
          <a href="#gallery" onClick={() => setMenuOpen(false)}>Gallery</a>
          <a href="#catering" onClick={() => setMenuOpen(false)}>Catering</a>
          <a href="#facilities" onClick={() => setMenuOpen(false)}>Facilities</a>
        </nav>
        <a className="headerCta" href="#enquiry">Book a visit <span>→</span></a>
        <button className="menuButton" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button>
      </header>

      <section className="hero" id="home">
        <img src="/images/padi/hero.jpg" alt="A decorated celebration at Aishwarya Party Hall" />
        <div className="heroShade" />
        <div className="heroContent">
          <p className="kicker">Two venues · One warm welcome</p>
          <h1>Celebrate life’s<br/><em>beautiful moments.</em></h1>
          <p>Air-conditioned party halls in Padi and Korattur for birthdays, family functions, engagements and memorable gatherings.</p>
          <div className="heroActions"><a className="goldButton" href="#locations">Explore our halls</a><a className="ghostButton" href="#enquiry">Check availability</a></div>
        </div>
        <div className="heroLocations"><span>01 <b>Padi</b></span><span>02 <b>Korattur</b></span></div>
      </section>

      <section className="intro sectionPad" id="about">
        <p className="kicker">About Aishwarya Party Hall</p>
        <div className="introGrid"><h2>A growing home<br/>for <em>beautiful celebrations.</em></h2><div><p>Aishwarya Party Hall began its journey in Padi in March 2021. With the continued support of our customers, we expanded to our second location in Korattur in March 2025. Our welcoming, air-conditioned venues are designed for birthdays, baby showers, engagements, family functions, corporate gatherings and other special occasions.</p><p>We also provide complete vegetarian and non-vegetarian catering through SS Foods Catering Service, combining delicious food with warm, dependable hospitality.</p><div className="quickFacts"><span><b>Mar 2021</b> Padi opened</span><span><b>Mar 2025</b> Korattur opened</span><span><b>Veg & Non-Veg</b> Catering</span></div></div></div>
      </section>

      <section className="locations sectionPad" id="locations">
        <div className="sectionTitle"><div><p className="kicker light">Our locations</p><h2>Find your perfect<br/><em>celebration space.</em></h2></div><p>Both venues are ready for intimate functions, family celebrations and professional gatherings.</p></div>
        <div className="locationCards">
          <article className="locationCard"><div className="locationPhoto"><img src="/images/padi/exterior.jpg" alt="Aishwarya Party Hall Padi exterior"/><span>PADI</span></div><div className="locationBody"><p className="cardLabel">Aishwarya Party Hall · Padi</p><h3>A warm, intimate hall<br/>for meaningful occasions.</h3><ul><li>Air-conditioned hall</li><li>Stage & separate dining</li><li>Music system & power backup</li><li>Sri Annai Mini Hall</li></ul><div className="contactButtons"><a href="tel:+919884806618">Call 98848 06618</a><a href={MAPS.Padi} target="_blank" rel="noreferrer">Get directions ↗</a></div><p className="secondPhone">Alternate: <a href="tel:+919884806629">98848 06629</a></p></div></article>
          <article className="locationCard"><div className="locationPhoto"><img src="/images/korattur/exterior-1.jpg" alt="Aishwarya Party Hall Korattur exterior"/><span>KORATTUR</span></div><div className="locationBody"><p className="cardLabel">Aishwarya Party Hall · Korattur</p><h3>A spacious modern venue<br/>with convenient facilities.</h3><ul><li>Air-conditioned main hall</li><li>Lift facility</li><li>Stage & dining area</li><li>Covered parking</li></ul><div className="contactButtons"><a href="tel:+919884806618">Call 98848 06618</a><a href={MAPS.Korattur} target="_blank" rel="noreferrer">Get directions ↗</a></div><p className="secondPhone">Alternate: <a href="tel:+919884806608">98848 06608</a></p></div></article>
        </div>
      </section>

      <section className="occasions sectionPad" id="occasions">
        <div className="sectionTitle darkTitle"><div><p className="kicker">Made for every milestone</p><h2>Bring your people.<br/><em>We’ll set the scene.</em></h2></div><p>Flexible spaces for the celebrations and gatherings that matter most.</p></div>
        <div className="occasionGrid">{events.map((item, index) => <button key={item} onClick={() => chooseOccasion(item)}><span>0{index + 1}</span><b>{item}</b><i>↗</i></button>)}</div>
      </section>

      <section className="gallery sectionPad" id="gallery">
        <div className="galleryHead"><div><p className="kicker">Take a closer look</p><h2>Inside our halls.</h2></div><div className="tabs" role="tablist" aria-label="Choose hall gallery"><button className={gallery === "Padi" ? "active" : ""} onClick={() => setGallery("Padi")}>Padi</button><button className={gallery === "Korattur" ? "active" : ""} onClick={() => setGallery("Korattur")}>Korattur</button></div></div>
        <div className="photoGrid">{galleries[gallery].map(([src, alt], index) => <button key={src} className={index === 0 ? "featurePhoto" : ""} onClick={() => setActiveImage(index)} aria-label={`Open ${alt}`}><img src={src} alt={alt} loading={index > 3 ? "lazy" : "eager"}/><span>View</span></button>)}</div>
      </section>

      <section className="catering sectionPad" id="catering">
        <div className="cateringVisual"><img src="/images/brand/ssfoods-logo.jpg" alt="SS Foods Catering Service logo"/><div className="plate plateOne"/><div className="plate plateTwo"/></div>
        <div className="cateringCopy"><p className="kicker">Our catering partner</p><h2>Good food.<br/><em>Great memories.</em></h2><p>SS Foods Catering Service brings generous hospitality to your table with freshly prepared vegetarian and non-vegetarian menus for every kind of celebration.</p><div className="foodTypes"><span><b>VEG</b>Traditional favourites & custom menus</span><span><b>NON-VEG</b>Flavourful dishes made for your occasion</span></div><a className="maroonButton" href="tel:+919884806618">Plan your menu <span>→</span></a></div>
      </section>

      <section className="facilities sectionPad" id="facilities">
        <div className="facilitiesIntro"><p className="kicker light">Comfort, covered</p><h2>Everything you need<br/>for an easy celebration.</h2></div>
        <div className="facilityGrid">{[["❄","Air-conditioned halls"],["▣","Stage & dressing room"],["♫","Music system"],["↟","Lift facility at Korattur"],["P","Parking facilities"],["↯","Power backup"],["♨","Separate dining areas"],["✦","Flexible decorations"]].map(([icon,label]) => <div key={label}><i>{icon}</i><span>{label}</span></div>)}</div>
      </section>

      <section className="enquiry sectionPad" id="enquiry">
        <div className="enquiryCopy"><p className="kicker">Live availability</p><h2>Find an open<br/><em>celebration date.</em></h2><p>Choose Padi or Korattur and select a date. Confirmed bookings and their occupied times are shown instantly.</p><div className="directCall"><span>To reserve an available date</span><a href="tel:+919884806618">+91 98848 06618</a></div><p className="bookingNotice">Availability can change. Please call our team for final confirmation and pricing.</p></div>
        <AvailabilityCalendar />
      </section>

      <footer><div className="footerTop"><a className="brand footerBrand" href="#home"><img src="/images/brand/aishwarya-party-hall-logo.jpg" alt="Aishwarya Party Hall" /></a><p>Beautiful halls. Delicious food.<br/>Warm celebrations.</p></div><div className="footerLinks"><div><b>Padi</b><a href="tel:+919884806618">98848 06618</a><a href="tel:+919884806629">98848 06629</a><a href={MAPS.Padi} target="_blank" rel="noreferrer">Google Maps ↗</a></div><div><b>Korattur</b><a href="tel:+919884806618">98848 06618</a><a href="tel:+919884806608">98848 06608</a><a href={MAPS.Korattur} target="_blank" rel="noreferrer">Google Maps ↗</a></div><div><b>Explore & Follow</b><a href="#gallery">Gallery</a><a href="#catering">SS Foods Catering</a><a href="https://www.facebook.com/people/Aishwarya-Party-Hall/61551992819852/" target="_blank" rel="noreferrer">Facebook ↗</a><a href="https://www.instagram.com/aishwarya_party_hall/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="#enquiry">Availability calendar</a><a href="/admin">Admin login</a></div></div><div className="footerBottom"><small>© 2026 Aishwarya Party Hall. All rights reserved.</small><small>Padi · Korattur · Chennai</small></div></footer>

      {activeImage !== null && <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setActiveImage(null)}><button className="lightboxClose" onClick={() => setActiveImage(null)} aria-label="Close photo">×</button><button className="lightboxPrev" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage - 1 + galleries[gallery].length) % galleries[gallery].length); }} aria-label="Previous photo">‹</button><img src={galleries[gallery][activeImage][0]} alt={galleries[gallery][activeImage][1]} onClick={event => event.stopPropagation()}/><button className="lightboxNext" onClick={(event) => { event.stopPropagation(); setActiveImage((activeImage + 1) % galleries[gallery].length); }} aria-label="Next photo">›</button><p>{gallery} · {activeImage + 1} / {galleries[gallery].length}</p></div>}
    </main>
  );
}
