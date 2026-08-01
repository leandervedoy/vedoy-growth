import "./globals.css";

export const metadata = { title: "Vedøy Growth — digital oversikt for bedrifter", description: "Personlig digital oppfølging, enkel oversikt og praktiske forbedringer for små og mellomstore bedrifter." };

export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="nb"><body>{children}</body></html>; }
