import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressShell, TopicIcon } from "@/components/progress/landing";
import { getProgressLesson, lessons } from "@/lib/progress/lessons";
import styles from "@/components/progress/progress.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getProgressLesson(slug);
  return { title: lesson ? lesson.title : "Leksjon ikke funnet", description: lesson?.summary };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getProgressLesson(slug);
  if (!lesson) notFound();
  const index = lessons.findIndex((item) => item.slug === lesson.slug);
  const next = lessons[(index + 1) % lessons.length];

  return <ProgressShell current="learn">
    <article className={styles.lessonArticle}>
      <Link className={styles.backLink} href="/laer"><span aria-hidden="true">←</span> Alle leksjoner</Link>
      <header className={styles.lessonHeader}>
        <div className={styles.lessonTag}><span className={styles.topicIcon}><TopicIcon theme={lesson.theme} /></span><span>{lesson.category}</span><span>En praktisk leksjon</span></div>
        <h1>{lesson.title}</h1>
        <p>{lesson.introduction}</p>
      </header>
      <div className={styles.lessonLayout}>
        <aside className={styles.lessonContents} aria-label="Innhold i leksjonen"><p>I denne leksjonen</p><nav aria-label="Hopp til en del av leksjonen"><a href="#tiltak">Prøv dette</a><a href="#eksempel">Et eksempel</a><a href="#folg-opp">Følg opp</a><a href="#refleksjon">Tenk videre</a></nav></aside>
        <div className={styles.lessonBody}>
          <section id="tiltak" aria-labelledby="action-title"><p className={styles.eyebrow}>ETT KONKRET TILTAK</p><h2 id="action-title">{lesson.actionTitle}</h2><p>{lesson.actionIntro}</p><ol className={styles.actionSteps}>{lesson.steps.map((step) => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol></section>
          <aside className={styles.example} id="eksempel" aria-labelledby="example-title"><p className={styles.eyebrow}>ET TENKT EKSEMPEL</p><h3 id="example-title">{lesson.exampleTitle}</h3><p>{lesson.example}</p></aside>
          <section id="folg-opp" aria-labelledby="follow-up-title"><h2 id="follow-up-title">Se hva som endrer seg</h2><p>{lesson.followUp}</p></section>
          <section className={styles.reflection} id="refleksjon" aria-labelledby="reflection-title"><p id="reflection-title" className={styles.eyebrow}>ET SPØRSMÅL Å TA MED VIDERE</p><p className={styles.reflectionQuestion}>{lesson.reflection}</p><small>Ta gjerne en prat om spørsmålet, eller skriv svaret i dine egne notater.</small></section>
          <div className={styles.takeaway}><h3>Ditt neste lille steg</h3><p>{lesson.takeaway}</p></div>
        </div>
      </div>
    </article>
    <section className={styles.nextLesson} aria-label="Fortsett å lære"><div><p>{index === lessons.length - 1 ? "VELG ET NYTT UTGANGSPUNKT" : "FORTSETT NÅR DET PASSER"}</p><h2>{next.title}</h2></div><Link href={`/laer/${next.slug}`} className={styles.primaryButton}>Les leksjonen <span aria-hidden="true">→</span></Link></section>
  </ProgressShell>;
}
