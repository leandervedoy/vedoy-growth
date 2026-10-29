import type { Metadata } from "next";
import Link from "next/link";
import { LessonCard, ProgressShell } from "@/components/progress/landing";
import { lessons } from "@/lib/progress/lessons";
import styles from "@/components/progress/progress.module.css";

export const metadata: Metadata = {
  title: "Lær – små steg mot rettferdig fremgang",
  description: "Åpne, praktiske leksjoner for bedrifter, foreninger og ideelle organisasjoner. Velg et lite tiltak for økonomi, mennesker eller miljø.",
};

export default function LearningPage() {
  return <ProgressShell current="learn">
    <header className={styles.learnIntro}>
      <p className={styles.eyebrow}>VEDØY KUNNSKAPSASSISTENT</p>
      <h1>Et godt sted<br />å ta neste steg.</h1>
      <p>Velg en leksjon som passer hverdagen din. Hver av dem gir deg et konkret tiltak, et eksempel og et spørsmål å tenke videre på.</p>
      <div className={styles.libraryNote}><span aria-hidden="true" />Leksjonene er åpne for alle. Du trenger ingen konto for å lese.</div>
    </header>
    <section className={styles.learningLibrary} aria-label="Alle leksjoner">
      <div className={styles.lessonGrid}>{lessons.map((lesson, index) => <LessonCard key={lesson.slug} lesson={lesson} index={index} />)}</div>
      <div className={styles.libraryEnd}><p>Usikker på hvor du skal begynne? «Finn det viktigste først» hjelper deg å velge.</p><Link className={styles.textLink} href={`/laer/${lessons[0].slug}`}>Start med første leksjon <span aria-hidden="true">→</span></Link></div>
    </section>
  </ProgressShell>;
}
