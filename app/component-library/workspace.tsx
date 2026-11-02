"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./workspace.css";
type Block = { id:string; name:string; category:string; desc:string; icon:string; featured?:boolean };
const blocks: Block[] = [
 { id:"hero-split",name:"Hero · delt",category:"Header",desc:"Stor overskrift, bilde og tydelig handling.",icon:"◫",featured:true },
 { id:"hero-centered",name:"Hero · sentrert",category:"Header",desc:"Minimal intro for bedrifter og produkter.",icon:"▣" },
 { id:"navigation",name:"Navigasjon",category:"Header",desc:"Responsiv meny med primærknapp.",icon:"☰" },
 { id:"product-grid",name:"Produktkatalog",category:"Handel",desc:"Produktkort, filtrering og pris.",icon:"▦",featured:true },
 { id:"pricing",name:"Pristabell",category:"Handel",desc:"Sammenlign tjenester og abonnementer.",icon:"▤" },
 { id:"booking",name:"Booking",category:"Tjenester",desc:"Timebestilling og tilgjengelighet.",icon:"▧" },
 { id:"contact",name:"Kontaktskjema",category:"Tjenester",desc:"Kontaktskjema med tydelige felt.",icon:"✉" },
 { id:"testimonials",name:"Kundeomtaler",category:"Innhold",desc:"Sosiale bevis og sitater.",icon:"❞" },
 { id:"gallery",name:"Bildegalleri",category:"Innhold",desc:"Responsivt bildegitter.",icon:"▥" },
 { id:"faq",name:"Spørsmål og svar",category:"Innhold",desc:"Tilgjengelige trekkspillseksjoner.",icon:"?" },
 { id:"footer",name:"Footer",category:"Navigasjon",desc:"Kontakt, lenker og juridisk info.",icon:"▰" },
 { id:"newsletter",name:"Nyhetsbrev",category:"Markedsføring",desc:"Påmelding og samtykketekst.",icon:"✉" },
];
const preset = ["Alle komponenter","Favoritter","Header","Handel","Tjenester","Innhold","Navigasjon","Markedsføring"];
const storageKey="vedoy-growth-component-folders-v1";
type Folder = { id:string; name:string; ids:string[] };
const templates: Folder[] = [{id:"f-start",name:"Mine favorittseksjoner",ids:[]}];
export function ComponentLibrary(){
 const [folders,setFolders]=useState<Folder[]>(templates);
 const [favorites,setFavorites]=useState<string[]>([]);
 const [active,setActive]=useState("Alle komponenter");
 const [term,setTerm]=useState("");
 const [selectedFolder,setSelectedFolder]=useState("");
 const [folderName,setFolderName]=useState("");
 const [ready,setReady]=useState(false);
 useEffect(()=>{ try { const saved=JSON.parse(localStorage.getItem(storageKey)||"null"); if(saved && Array.isArray(saved.folders) && Array.isArray(saved.favorites)) {setFolders(saved.folders);setFavorites(saved.favorites);} } catch {} setReady(true); },[]);
 useEffect(()=>{if(ready)localStorage.setItem(storageKey,JSON.stringify({folders,favorites}));},[folders,favorites,ready]);
 const visible=useMemo(()=>blocks.filter(b=>{
  const match=active==="Alle komponenter" || (active==="Favoritter"?favorites.includes(b.id):active===selectedFolder?folders.find(f=>f.id===selectedFolder)?.ids.includes(b.id):b.category===active);
  return match && (b.name+" "+b.desc+" "+b.category).toLowerCase().includes(term.trim().toLowerCase());
 }),[active,term,favorites,folders,selectedFolder]);
 function createFolder(){const name=folderName.trim().slice(0,48);if(!name)return; const id="folder-"+Date.now().toString(36);setFolders(p=>[...p,{id,name,ids:[]}]);setSelectedFolder(id);setActive(id);setFolderName("");}
 function toggleFolder(id:string){if(!selectedFolder)return;setFolders(p=>p.map(f=>f.id===selectedFolder?{...f,ids:f.ids.includes(id)?f.ids.filter(x=>x!==id):[...f.ids,id]}:f));}
 return <main className="vc-shell"><header className="vc-top"><Link href="/">← Growth</Link><span>VEDOY / COMPONENTS</span><Link href="/marketplace">Tjenestemarked ↗</Link></header>
 <div className="vc-hero"><span className="vc-eyebrow">DESIGN SYSTEM / CANVAS</span><h1>Bygg smartere.<br/><em>Bruk det igjen.</em></h1><p>Finn ferdige seksjoner til nettsiden. Organiser favorittene dine i mapper, og bygg ditt eget bibliotek.</p></div>
 <div className="vc-layout"><aside className="vc-sidebar"><h2>Bibliotek</h2>{preset.map(x=><button key={x} aria-pressed={active===x} onClick={()=>setActive(x)}>{x}</button>)}<div className="vc-sidebar-heading">MINE MAPPER <span>{folders.length}</span></div>{folders.map(f=><button key={f.id} aria-pressed={active===f.id} onClick={()=>{setSelectedFolder(f.id);setActive(f.id);}}>📁 {f.name} <small>{f.ids.length}</small></button>)}
 <form onSubmit={e=>{e.preventDefault();createFolder();}}><label htmlFor="newFolder">Ny mappe</label><input id="newFolder" maxLength={48} value={folderName} onChange={e=>setFolderName(e.target.value)} placeholder="F.eks. Restaurant"/><button className="vc-add" type="submit">+ Opprett mappe</button></form>
 <Link className="vc-market" href="/marketplace">✦ Finn tjenester og eksperter →</Link></aside>
 <section className="vc-main"><div className="vc-toolbar"><div><h2>{folders.find(f=>f.id===active)?.name||active}</h2><p>{visible.length} komponenter</p></div><label className="vc-search"><span className="sr-only">Søk komponenter</span><input placeholder="Søk etter seksjoner..." value={term} onChange={e=>setTerm(e.target.value)}/></label></div>
 <div className="vc-grid">{visible.map(b=><article key={b.id} className="vc-card"><div className="vc-preview"><span className="vc-preview-icon" aria-hidden="true">{b.icon}</span><span className="vc-preview-lines"><i/><i/><i/></span></div><div className="vc-card-content"><small>{b.category}{b.featured?" · ANBEFALT":""}</small><h3>{b.name}</h3><p>{b.desc}</p><div className="vc-actions"><button aria-label={favorites.includes(b.id)?"Fjern favoritt":"Legg til favoritt"} onClick={()=>setFavorites(p=>p.includes(b.id)?p.filter(x=>x!==b.id):[...p,b.id])}>{favorites.includes(b.id)?"♥ Lagret":"♡ Favoritt"}</button><button disabled={!selectedFolder} onClick={()=>toggleFolder(b.id)} title={!selectedFolder?"Velg en mappe i sidemenyen":undefined}>{folders.find(f=>f.id===selectedFolder)?.ids.includes(b.id)?"✓ I mappe":"+ Mappe"}</button></div></div></article>)}</div>
 {!visible.length&&<div className="vc-empty">Ingen komponenter funnet. Prøv et annet søk eller en annen mappe.</div>}
 <p className="vc-note">Mapper og favoritter lagres foreløpig bare i denne nettleseren. Komponentene er katalogoppføringer; faktisk innsetting i Canvas og publisering er neste integrasjonssteg.</p></section></div></main>;
}
