export type BlogPost = { id: string; title: string; excerpt: string; body: string; category: string; publishedAt: string; status: "published" | "draft" };
export const seedPosts: BlogPost[] = [
  { id: "digital-oversikt", title: "Hvorfor små bedrifter trenger bedre digital oversikt", excerpt: "Du trenger ikke flere systemer. Du trenger å se hva som faktisk skjer.", body: "En god digital arbeidsflate gjør det enklere å prioritere, følge opp kunder og se hvor virksomheten kan forbedres.", category: "Innsikt", publishedAt: "2026-08-01", status: "published" },
  { id: "forste-steg", title: "Tre små steg mot en enklere arbeidshverdag", excerpt: "Start med det viktigste, rydd bort resten og bygg videre etter behov.", body: "Begynn med én tydelig arbeidsflyt. Mål det som betyr noe. Lag deretter faste rutiner.", category: "Praktisk", publishedAt: "2026-07-28", status: "published" },
];
