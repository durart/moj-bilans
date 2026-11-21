/**
 * Mój Bilans: sery żółte dostępne offline w bazie podstawowej.
 * Wartości podane na 100 g, na podstawie kart produktów.
 * Źródła i producenci są zapisani osobno dla każdego produktu;
 * wybierając ser innej marki, porównaj etykietę (makro może być inne).
 * Weryfikacja publicznych kart produktów: 2026-11-14.
 */
const entry = (slug,name,brand,kcal,protein,fat,carbs,sourceUrl,verification,aliases) =>
  Object.freeze({
    id: 'cheese:' + slug, name, brand, kcal, protein, fat, carbs,
    aliases: Object.freeze(aliases), unit: 'g', category: 'cheese',
    source: 'Baza podstawowa',
    sourceName: verification === 'manufacturer-website'
      ? brand + ' — karta produktu producenta'
      : brand + ' — karta produktu sprzedawcy',
    sourceUrl, verification, verifiedAt: '2026-11-14',
    isEstimate: false
  });

export const YELLOW_CHEESES = Object.freeze([
  [
    "sierpc-krolewski",
    "Ser Królewski — Sierpc",
    "Sierpc",
    352,
    26,
    27,
    1.2,
    "https://zakupy.intermarche.pl/157-zdunska-wola/nabial/sery/ser-krolewski-2497650000000.html",
    "retailer-website",
    [
      "ser królewski",
      "ser krolewski",
      "królewski",
      "krolewski",
      "ser żółty królewski",
      "ser zolty krolewski",
      "sierpc królewski",
      "sierpc krolewski",
      "ser żółty"
    ]
  ],
  [
    "sierpc-krolewski-light",
    "Ser Królewski Light — Sierpc",
    "Sierpc",
    301,
    31,
    19,
    1.6,
    "https://leclerc.com.pl/sierpc-ser-krolewski-light/1",
    "retailer-website",
    [
      "ser królewski light",
      "ser krolewski light",
      "królewski light",
      "sierpc light",
      "ser żółty light",
      "ser zolty light"
    ]
  ],
  [
    "mlekovita-gouda",
    "Ser Gouda — Mlekovita",
    "Mlekovita",
    334,
    25,
    26,
    0,
    "https://mlekovita.com.pl/produkt/ser-gouda-kawalki-350-g-65",
    "manufacturer-website",
    [
      "gouda",
      "ser gouda",
      "ser żółty gouda",
      "ser zolty gouda",
      "ser żółty",
      "ser zolty"
    ]
  ],
  [
    "mlekovita-edamski",
    "Ser Edamski — Mlekovita",
    "Mlekovita",
    334,
    25,
    26,
    0,
    "https://mlekovita.com.pl/produkt/ser-edamski-plastry-150-g-otworz-zamknij-202",
    "manufacturer-website",
    [
      "edamski",
      "ser edamski",
      "ser żółty edamski",
      "ser zolty edamski",
      "ser żółty",
      "ser zolty"
    ]
  ],
  [
    "mlekovita-cheddar",
    "Ser Cheddar — Mlekovita",
    "Mlekovita",
    379,
    25,
    31,
    0,
    "https://mlekovita.com.pl/produkt/ser-cheddar-plastry-150-g-otworz-zamknij-239",
    "manufacturer-website",
    [
      "cheddar",
      "ser cheddar",
      "ser żółty cheddar",
      "ser zolty cheddar",
      "ser żółty",
      "ser zolty"
    ]
  ],
  [
    "mlekovita-tylzycki",
    "Ser Tylżycki — Mlekovita",
    "Mlekovita",
    312,
    24,
    24,
    0,
    "https://mlekovita.com.pl/produkt/ser-tylzycki-plastry-150-g-otworz-zamknij-201",
    "manufacturer-website",
    [
      "tylżycki",
      "tylzycki",
      "ser tylżycki",
      "ser tylzycki",
      "ser żółty tylżycki",
      "ser zolty tylzycki",
      "ser żółty",
      "ser zolty"
    ]
  ]
].map(args => entry(...args)));
