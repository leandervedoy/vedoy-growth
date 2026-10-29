import "./globals.css";

export const metadata = { title: { default: "Vedøy Growth — fremgang som flere får del i", template: "%s | Vedøy Growth" }, description: "Praktisk kunnskap for bedrifter og organisasjoner. Lær, prøv ett tiltak og skap fremgang med hensyn til økonomi, mennesker og miljø." };

export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="nb"><body>{children}</body></html>; }
