import { ProgressShell } from "@/components/progress/landing";
import { RegistrationForm } from "@/components/progress/account-forms";
import { launchConfig } from "@/lib/progress/auth";
import styles from "@/components/progress/page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "En konto. Dine valg.", robots: { index: false, follow: true } };
export default function Page() { return <ProgressShell><section className={styles.accountSection}><p className={styles.eyebrow}>VEDØY GROWTH / KONTO</p><h1 className={styles.title}>En konto. Dine valg.</h1><p className={styles.lead}>For bedrifter, foreninger og organisasjoner. Velg selv om du vil få beskjed når verktøyet åpner.</p><RegistrationForm configured={Boolean(launchConfig())} /></section></ProgressShell>; }
