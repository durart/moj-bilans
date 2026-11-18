/**
 * Orientacyjne przykłady BALERONU według kart dwóch różnych producentów.
 * To NIE jest etykieta produktu użytkownika: baleron może mieć bardzo
 * różną zawartość tłuszczu i kalorii. Sprawdź opakowanie swojej wędliny.
 * Węglowodany Sokołów opisuje jako <0,5 g; do bilansu przyjęto 0 g.
 */
export const BALERON_REFERENCE = Object.freeze([
  Object.freeze({
    id: 'baleron:wedzony-orientacyjnie',
    name: 'Baleron wędzony (orientacyjnie)',
    brand: '',
    aliases: Object.freeze(['baleron', 'baleron wedzony', 'baleron parzony wędzony',
      'wędlina baleron', 'karkówka wędzona', 'karczek wędzony']),
    kcal: 246,
    protein: 14.8,
    fat: 20,
    carbs: 1.1,
    unit: 'g',
    category: 'coldcuts',
    source: 'Baza podstawowa',
    sourceName: 'Przykład: karta baleronu producenta Wędliny Mandat',
    sourceUrl: 'https://wedliny-mandat.pl/produkt/barelon/',
    verification: 'manufacturer-example',
    isEstimate: true,
    note: 'Orientacyjny przykład baleronu wędzonego, nie etykieta Twojego produktu. Kaloryczność zależy od producenta i udziału tłuszczu.'
  }),
  Object.freeze({
    id: 'baleron:gotowany-orientacyjnie',
    name: 'Baleron gotowany (orientacyjnie)',
    brand: '',
    aliases: Object.freeze(['baleron', 'baleron gotowany', 'baleron gotowany wedzony',
      'baleron parzony', 'baleron gotowany w plastrach', 'wędlina baleron gotowany']),
    kcal: 166,
    protein: 14,
    fat: 12,
    carbs: 0,
    unit: 'g',
    category: 'coldcuts',
    source: 'Baza podstawowa',
    sourceName: 'Przykład: karta Baleron gotowany producenta Sokołów',
    sourceUrl: 'https://sokolow.pl/produkty/baleron-gotowany',
    verification: 'manufacturer-example',
    isEstimate: true,
    note: 'Orientacyjny przykład baleronu gotowanego. Sokołów podaje <0,5 g węglowodanów na 100 g; w bilansie zaokrąglono do 0 g. Sprawdź etykietę swojego produktu.'
  })
]);
