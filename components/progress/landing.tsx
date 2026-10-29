import Link from "next/link";
import { launchConfig } from "@/lib/progress/auth";
import type { ReactNode } from "react";
import { lessons, type LessonTheme, type ProgressLesson } from "@/lib/progress/lessons";
import styles from "./progress.module.css";

type CurrentPage = "home" | "learn" | "none";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={styles.arrow}><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h15m-6-6 6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function TopicIcon({ theme }: { theme: LessonTheme }) {
  const paths: Record<LessonTheme, ReactNode> = {
    direction: <><circle cx="12" cy="12" r="8.5" /><path d="m15.8 8.2-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z" /></>,
    economy: <><path d="M4 20h16M6 16v-4m6 4V8m6 8V4" /><path d="m4 8 5-4 5 1 5-3" /></>,
    people: <><circle cx="9" cy="7" r="3" /><path d="M3 20v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v3" /></>,
    environment: <><path d="M19.5 4.5c-8-1-14 2.5-14 8a6 6 0 0 0 6 6c5.5 0 9-6 8-14Z" /><path d="M4 21 15 10m-7 7v-5m0 5h5" /></>,
    cooperation: <><rect x="8" y="3" width="8" height="5" rx="1.5" /><rect x="2" y="16" width="8" height="5" rx="1.5" /><rect x="14" y="16" width="8" height="5" rx="1.5" /><path d="M12 8v4m-6 4v-4h12v4" /></>,
    learning: <><path d="M7 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect x="7" y="2" width="10" height="5" rx="2" /><path d="m7 14 3 3 7-7" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[theme]}</svg>;
}

function Brand() {
  return <Link className={styles.brand} href="/" aria-label="Vedøy Growth – hjem"><span className={styles.brandMark} aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M7 8 16 24 25 8M16 24V12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="m16 12 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg></span><span>Vedøy <span className={styles.brandLight}>Growth</span></span></Link>;
}

export function ProgressHeader({ current = "none" }: { current?: CurrentPage }) {
  return <>
    <a className={styles.skipLink} href="#innhold">Gå til innholdet</a>
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Brand />
        <nav className={styles.navigation} aria-label="Hovedmeny">
          <Link href="/" aria-current={current === "home" ? "page" : undefined}>Hjem</Link>
          <Link href="/laer" aria-current={current === "learn" ? "page" : undefined}>Lær</Link>
          <Link href="/#slik-fungerer-det">Slik fungerer det</Link>
          <Link href="/#prinsipper">Prinsipper</Link>
        </nav>
        <div className={styles.accountLinks}><Link className={styles.loginLink} href="/login">Logg inn</Link><Link className={styles.headerCta} href="/register">Opprett konto <Arrow diagonal /></Link></div>
      </div>
    </header>
  </>;
}

export function ProgressFooter() {
  return <footer className={styles.footer}><div className={styles.footerTop}><div><Brand /><p>Små steg. Flere hensyn. Varig fremgang.</p></div><nav aria-label="Bunnmeny"><Link href="/laer">Lær noe nytt</Link><Link href="/under-utvikling">Dette bygger vi</Link><Link href="/personvern">Personvern</Link><Link href="/register">Opprett konto</Link><a href="https://vedoystudio.no">Mer fra Vedøy <span aria-hidden="true">↗</span></a></nav></div><div className={styles.footerBottom}><span>© 2026 Vedøy</span><span>For bedrifter og organisasjoner med noe godt å få til.</span></div></footer>;
}

export function ProgressShell({ children, current = "none" }: { children: ReactNode; current?: CurrentPage }) {
  return <div className={styles.page}><ProgressHeader current={current} /><main id="innhold" tabIndex={-1}>{children}</main><ProgressFooter /></div>;
}

export function LessonCard({ lesson, index }: { lesson: ProgressLesson; index: number }) {
  return <Link href={`/laer/${lesson.slug}`} className={styles.lessonCard} data-theme={lesson.theme} aria-labelledby={`lesson-${lesson.slug}`}>
    <div className={styles.lessonCardTop}><span className={styles.topicIcon}><TopicIcon theme={lesson.theme} /></span><span className={styles.lessonNumber}>{String(index + 1).padStart(2, "0")}</span></div>
    <p className={styles.lessonCategory}>{lesson.category}</p>
    <h3 id={`lesson-${lesson.slug}`}>{lesson.title}</h3>
    <p className={styles.lessonSummary}>{lesson.summary}</p>
    <span className={styles.cardAction}>Les leksjonen <Arrow /></span>
  </Link>;
}

export default function ProgressLanding() {
  const registrationReady = Boolean(launchConfig());
  return <ProgressShell current="home">
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.heroCopy}>
        <Link href="/under-utvikling" className={styles.statusBadge}><span aria-hidden="true" />Verktøyet er under utvikling <Arrow /></Link>
        <h1 id="hero-title">Fremgang som<br /><em>flere får del i.</em></h1>
        <p className={styles.heroLead}>Praktisk kunnskap for bedrifter og organisasjoner som vil få økonomi, mennesker og miljø til å spille bedre sammen.</p>
        <div className={styles.heroActions}><Link className={styles.primaryButton} href="/laer">Finn ditt første steg <Arrow /></Link><Link className={styles.textLink} href="/under-utvikling">Se hva vi bygger <Arrow diagonal /></Link></div>
        <p className={styles.heroNote}>Leksjonene er åpne. Begynn der du er.</p>
      </div>
      <aside className={styles.heroExercise} aria-labelledby="exercise-title">
        <div className={styles.exerciseBackdrop} aria-hidden="true"><span /><span /><span /></div>
        <div className={styles.exerciseCard}>
          <div className={styles.exerciseTop}><span>Et lite sted å begynne</span><span className={styles.exerciseLeaf}><TopicIcon theme="environment" /></span></div>
          <p className={styles.exerciseLabel}>PRØV DETTE I DAG</p>
          <h2 id="exercise-title">Gjør én gjentatt oppgave litt enklere.</h2>
          <ol className={styles.exerciseSteps}><li><span aria-hidden="true">1</span>Finn hvor det stopper opp.</li><li><span aria-hidden="true">2</span>Spør den som gjør jobben.</li><li><span aria-hidden="true">3</span>Prøv én liten forbedring.</li></ol>
          <div className={styles.exerciseFoot}><span>Mer rom for det som betyr noe.</span><Link href={`/laer/${lessons[0].slug}`} aria-label="Les leksjonen Finn det viktigste først"><Arrow diagonal /></Link></div>
        </div>
        <p className={styles.exerciseCaption}>Fremgang begynner ofte i det små.</p>
      </aside>
    </section>

    <section className={styles.audience} aria-label="Hvem Vedøy Growth er for"><p>For deg som bygger noe.<br /><strong>Og dere som får det til sammen.</strong></p><ul><li>Enkeltpersonforetak</li><li>Små bedrifter</li><li>Foreninger</li><li>Ideelle organisasjoner</li></ul></section>

    <section className={styles.methodSection} id="slik-fungerer-det" aria-labelledby="method-title">
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>FRA KUNNSKAP TIL HVERDAG</p><h2 className={styles.sectionTitle} id="method-title">Litt innsikt.<br />Ett nyttig steg.</h2></div><p>Du trenger ikke en stor plan for å begynne. Prøv noe lite, lytt til dem det berører, og lær av det som skjer.</p></div>
      <ol className={styles.methodGrid}>
        <li><span className={styles.stepNumber}>01</span><h3>Lær noe du kan bruke</h3><p>Velg et emne som treffer en utfordring i hverdagen. Korte leksjoner gjør det lett å komme i gang.</p><span className={styles.stepLine} aria-hidden="true" /></li>
        <li><span className={styles.stepNumber}>02</span><h3>Velg ett lite tiltak</h3><p>Prøv et konkret grep med ressursene du har. Gjør det sammen med noen når det passer.</p><span className={styles.stepLine} aria-hidden="true" /></li>
        <li><span className={styles.stepNumber}>03</span><h3>Se hva som endrer seg</h3><p>Hva ble bedre? Hvem fikk nytte av det? Hva kostet det i tid, penger og ressurser?</p></li>
      </ol>
    </section>

    <section className={styles.learningSection} aria-labelledby="learning-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>KUNNSKAP SOM KAN BLI TIL HANDLING</p><h2 className={styles.sectionTitle} id="learning-title">Hvor vil du begynne?</h2></div><Link href="/laer" className={styles.textLink}>Utforsk alle leksjonene <Arrow /></Link></div><div className={styles.lessonGrid}>{lessons.map((lesson, index) => <LessonCard key={lesson.slug} lesson={lesson} index={index} />)}</div></section>

    <section className={styles.balanceSection} aria-labelledby="balance-title"><div className={styles.balanceIntro}><p className={styles.eyebrow}>ET BREDERE BLIKK PÅ FREMGANG</p><h2 id="balance-title">Bra for driften.<br />Godt for flere.</h2><p>Et godt tiltak tåler flere spørsmål enn «lønner det seg?». Vi vil gjøre det lettere å se hensynene i sammenheng.</p></div><div className={styles.balanceList}><div><span aria-hidden="true">↗</span><h3>En økonomi som holder</h3><p>Oversikt over det som kommer inn, det som går ut og arbeidet som ligger bak.</p></div><div><span aria-hidden="true">↗</span><h3>Mennesker som blir hørt</h3><p>Plass til dem som gjør jobben, bruker tilbudet og blir berørt av valgene.</p></div><div><span aria-hidden="true">↗</span><h3>Ressurser som varer</h3><p>Bruke, ta vare på og dele mer av det vi allerede har. Være tydelige på hva vi vet.</p></div></div></section>

    <section className={styles.principlesSection} id="prinsipper" aria-labelledby="principles-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>DET VI BYGGER ETTER</p><h2 className={styles.sectionTitle} id="principles-title">Dine mål.<br />Felles hensyn.</h2></div><p>Vedøy Growth utvikles med disse prinsippene som retning. De skal være synlige i valgene vi tar.</p></div><div className={styles.principleGrid}><article><span>01 / EIERSKAP</span><h3>Du bestemmer retningen</h3><p>Dine mål og vurderinger skal styre. Vi vil gi kunnskap og handlingsrom, med tydelige valg og enkel tilgang til egne opplysninger.</p></article><article><span>02 / ÅPENHET</span><h3>Si hva som er klart</h3><p>Vi skiller mellom det du kan bruke nå, og det vi fortsatt utvikler. Usikkerhet og begrensninger skal forklares i vanlig språk.</p></article><article><span>03 / PERSONVERN</span><h3>Opplysninger er et ansvar</h3><p>Ingen salg av personopplysninger er et prinsipp for utviklingen. Vi skal be om det som trengs, og forklare hva det brukes til.</p></article></div></section>

    <section className={styles.invitation} aria-labelledby="invitation-title"><div><p className={styles.eyebrow}>BEGYNN MED DET SOM ER KLART</p><h2 id="invitation-title">Kunnskapen er åpen.<br />Verktøyet er på vei.</h2><p>{registrationReady ? "Les leksjonene allerede nå. Opprett konto og velg om du vil ha beskjed når arbeidsflaten åpner." : "Les leksjonene allerede nå. Kontoregistreringen åpner snart, mens vi bygger videre på arbeidsflaten for bedrifter og organisasjoner."}</p></div><div className={styles.invitationActions}><Link className={styles.primaryButton} href="/register">{registrationReady ? "Opprett konto" : "Se registreringen"} <Arrow /></Link><Link className={styles.textLink} href="/under-utvikling">Hva betyr «under utvikling»? <Arrow diagonal /></Link></div></section>
  </ProgressShell>;
}
