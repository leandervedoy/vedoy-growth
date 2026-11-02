"use client";
import { useMemo,useState } from "react";
import Link from "next/link";
import "../component-library/workspace.css";
type Service={title:string;category:string;desc:string;price:string;label:string};
const services:Service[]=[
 {title:"Nettside – oppsett",category:"Nettsider",desc:"Hjelp til oppsett, struktur, responsivt design og publisering.",price:"Be om tilbud",label:"POPULÆR"},
 {title:"Nettbutikk og produkter",category:"Handel",desc:"Konfigurasjon av katalog, produktsider og handelsflyt.",price:"Be om tilbud",label:"SHOPIFY"},
 {title:"SEO og synlighet",category:"Markedsføring",desc:"Teknisk kontroll, søkeord, metadata og forbedringstiltak.",price:"Be om tilbud",label:"VEKST"},
 {title:"Merkevare og logo",category:"Design",desc:"Visuell profil, farger og grafiske ressurser.",price:"Be om tilbud",label:"DESIGN"},
 {title:"Booking og skjemaer",category:"Integrasjoner",desc:"Koble på timebestilling, kontaktskjema og varslinger.",price:"Be om tilbud",label:"AUTOMATISERING"},
 {title:"Hosting og vedlikehold",category:"Nettsider",desc:"Drift, sikkerhetsoppdateringer og teknisk oppfølging.",price:"Be om tilbud",label:"DRIFT"},
 {title:"Sosiale medier-pakke",category:"Markedsføring",desc:"Maler og oppsett for kampanjer og publisering.",price:"Be om tilbud",label:"INNHOLD"},
 {title:"Spesialutvikling",category:"Integrasjoner",desc:"Tilpassede komponenter, API-integrasjoner og arbeidsflyt.",price:"Be om tilbud",label:"UTVIKLING"}
];
export function Marketplace(){const [category,setCategory]=useState("Alle");const [q,setQ]=useState("");const categories=["Alle","Nettsider","Handel","Design","Markedsføring","Integrasjoner"];const list=useMemo(()=>services.filter(s=>(category==="Alle"||s.category===category)&&(s.title+" "+s.desc).toLowerCase().includes(q.toLowerCase())),[category,q]);return <main className="vm-shell"><header className="vm-top"><Link href="/">← Growth</Link><span>VEDOY / MARKETPLACE</span><Link href="/component-library">Komponentbibliotek ↗</Link></header><section className="vm-hero"><span className="vc-eyebrow">TJENESTER / VEKST</span><h1>Mer enn en nettside.<br/><em>Alt rundt den.</em></h1><p>Utforsk tjenester som hjelper deg å lansere, forbedre og drifte bedriftens digitale løsninger.</p></section><section className="vm-content"><div className="vm-controls"><label><span className="sr-only">Søk tjenester</span><input className="vm-search" placeholder="Søk tjenester..." value={q} onChange={e=>setQ(e.target.value)}/></label>{categories.map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="vm-grid">{list.map(s=><article key={s.title} className="vm-card"><small>{s.label} · {s.category}</small><h2>{s.title}</h2><p>{s.desc}</p><div className="vm-price">{s.price}</div><a href={`mailto:kontakt@vedoy.com?subject=${encodeURIComponent("Forespørsel om "+s.title)}`}>Kontakt Vedøy →</a></article>)}</div>{!list.length&&<p>Ingen tjenester funnet. Prøv et annet søk.</p>}<p className="vm-disclaimer">Tjenestemarkedet viser Vedøys eksempeltilbud. Eksterne selgere, bestilling, betaling, anmeldelser og provisjon er ikke implementert ennå.</p></section></main>;}
