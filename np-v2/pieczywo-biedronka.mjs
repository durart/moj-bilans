/**
 * Mój Bilans — oficjalne dane pieczywa sprzedawanego w Biedronce.
 * Wartości na 100 g gotowego produktu. Stan weryfikacji strony: 2026-11-12.
 * Źródło: https://www.biedronka.pl/pl/pieczywo?page=skladniki
 * Uwaga: starsze dokumenty i poszczególne partie mogą mieć inną recepturę.
 * Nie podajemy numerów EAN, jeśli nie zostały zweryfikowane.
 */
const SOURCE_URL = 'https://www.biedronka.pl/pl/pieczywo?page=skladniki';
const entry = (slug, name, packGrams, kcal, protein, fat, carbs, fiber, aliases = []) => Object.freeze({
  id: 'bakery:biedronka:' + slug,
  name, brand: 'Biedronka', packGrams, kcal, protein, fat, carbs,
  ...(Number.isFinite(fiber) ? { fiber } : {}),
  aliases: Object.freeze([...aliases, name + ' biedronka', 'biedronka ' + name]),
  category: 'bakery', unit: 'g',
  source: 'Baza podstawowa',
  sourceName: 'Biedronka — oficjalna strona pieczywa',
  sourceUrl: SOURCE_URL, verifiedAt: '2026-11-12',
  verification: 'retailer-website',
  storeKeys: Object.freeze(['biedronka']),
  isEstimate: false,
});

export const BIEDRONKA_BAKERY = Object.freeze([

  [
    "chleb-slowianski",
    "Chleb słowiański, 380 g",
    380,
    264,
    11,
    1.4,
    51,
    2.9,
    [
      "chleb slowianski",
      "chleb słowiański",
      "slowianski",
      "słowiański",
      "chleb slowianski biedronka"
    ]
  ],
  [
    "chleb-rodzinny",
    "Chleb rodzinny, 410 g",
    410,
    250,
    8.5,
    1,
    50,
    3.3,
    [
      "chleb rodzinny"
    ]
  ],
  [
    "chleb-slonecznikowy",
    "Chleb słonecznikowy, 480 g",
    480,
    292,
    8.5,
    8.5,
    43,
    5,
    [
      "chleb słonecznikowy",
      "chleb slonecznikowy"
    ]
  ],
  [
    "chleb-fitness",
    "Chleb fitness, 410 g",
    410,
    290,
    12,
    6.4,
    44,
    4.1,
    [
      "chleb fitness"
    ]
  ],
  [
    "chleb-nowodworski",
    "Chleb Nowodworski z makiem, 410 g",
    410,
    257,
    9,
    1.8,
    49,
    3.7,
    [
      "chleb nowodworski",
      "chleb z makiem"
    ]
  ],
  [
    "chleb-cale-ziarno",
    "Chleb całe ziarno, 300 g",
    300,
    322,
    12,
    15,
    29,
    9.7,
    [
      "chleb całe ziarno",
      "chleb cale ziarno"
    ]
  ],
  [
    "chleb-zytni-100",
    "Chleb żytni 100% bez drożdży, 450 g",
    450,
    210,
    4.2,
    1.2,
    43,
    4.9,
    [
      "chleb zytni 100 procent",
      "chleb żytni bez drożdży"
    ]
  ],
  [
    "chleb-wloski",
    "Chleb w stylu włoskim, 500 g",
    500,
    257,
    9,
    1.4,
    51,
    2.4,
    [
      "chleb włoski",
      "chleb wloski"
    ]
  ],
  [
    "chleb-multi-ziarno",
    "Chleb multi-ziarno, 335 g",
    335,
    300,
    10,
    7.3,
    46,
    5,
    [
      "chleb multi ziarno",
      "chleb wieloziarnisty biedronka"
    ]
  ],
  [
    "chleb-sniadaniowy",
    "Chleb śniadaniowy, 500 g (Oskroba)",
    500,
    242,
    7,
    1,
    50,
    null,
    [
      "chleb śniadaniowy",
      "chleb sniadaniowy"
    ]
  ],
  [
    "chleb-z-koszyczka",
    "Chleb z koszyczka, 550 g",
    550,
    256,
    8.2,
    1.3,
    51,
    null,
    [
      "chleb z koszyczka"
    ]
  ],
  [
    "chleb-z-pomidorami",
    "Chleb z suszonymi pomidorami i oliwkami, 350 g",
    350,
    245,
    8.7,
    3.2,
    44,
    2.9,
    [
      "chleb z pomidorami",
      "chleb z oliwkami"
    ]
  ],
  [
    "bulka-codzienna",
    "Bułka codzienna, 100 g",
    100,
    272,
    9,
    1.9,
    53,
    2.7,
    [
      "bułka codzienna",
      "bulka codzienna",
      "bułka zwykła biedronka"
    ]
  ],
  [
    "bulka-grahamka-aryzta",
    "Bułka grahamka, 70 g (Aryzta)",
    70,
    234,
    11,
    1.8,
    41,
    6.1,
    [
      "bułka grahamka",
      "bulka grahamka",
      "grahamka biedronka"
    ]
  ],
  [
    "bulka-fala-ziarna",
    "Bułka fala ciemna z ziarnami, 110 g",
    110,
    283,
    10,
    5.6,
    46,
    3.7,
    [
      "bułka fala",
      "bulka fala",
      "bułka ciemna z ziarnami"
    ]
  ],
  [
    "bulka-pestki-dyni",
    "Bułka z pestkami dyni, 70 g",
    70,
    299,
    11,
    5.8,
    49,
    3.2,
    [
      "bułka dyniowa",
      "bułka z dynią"
    ]
  ],
  [
    "bulka-pasterska",
    "Bułka pasterska, 90 g",
    90,
    265,
    9.3,
    1.5,
    52,
    2.6,
    [
      "bułka pasterska",
      "bulka pasterska"
    ]
  ],
  [
    "bulka-wysokobialkowa",
    "Bułka wysokobiałkowa, 80 g",
    80,
    282,
    18,
    6.4,
    35,
    6.2,
    [
      "bułka proteinowa",
      "bulka wysokobialkowa"
    ]
  ],
  [
    "bulka-razowa-zytnia",
    "Bułka razowa z mąki żytniej, 80 g",
    80,
    240,
    13,
    4.5,
    33,
    7.5,
    [
      "bułka razowa",
      "bulka razowa"
    ]
  ],
  [
    "bulka-zytnia-100",
    "Bułka 100% z mąki żytniej, 55 g",
    55,
    302,
    9.6,
    2.9,
    57,
    5,
    [
      "bułka żytnia",
      "bulka zytnia"
    ]
  ],
  [
    "bagietka-duza",
    "Bagietka duża, 405 g",
    405,
    272,
    9.1,
    2.1,
    53,
    2.5,
    [
      "bagietka",
      "bagietka duża"
    ]
  ],
  [
    "polbagietka-pelnoziarnista",
    "Półbagietka pełnoziarnista, 100 g",
    100,
    253,
    11,
    1.4,
    46,
    6.6,
    [
      "półbagietka pełnoziarnista",
      "polbagietka pelnoziarnista"
    ]
  ],
  [
    "bajgiel-ziarna",
    "Bajgiel z ziarnami, 100 g",
    100,
    332,
    9.8,
    10,
    49,
    3.6,
    [
      "bajgiel",
      "bajgiel z ziarnami"
    ]
  ],
  [
    "bulka-paryska",
    "Bułka paryska, 240 g",
    240,
    276,
    9.8,
    2.8,
    52,
    2.4,
    [
      "bułka paryska",
      "bulka paryska"
    ]
  ]
] .map(args => entry(...args)));
