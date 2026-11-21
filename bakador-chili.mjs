/**
 * EAN 5900571906099 and packaging size/flavour verified against user's packaging photos (2026-11-21).
 * The nutrition figures are NOT legible on those photos. They are approximate values from comparable
 * BakaD'Or coated peanuts (not a claimed transcription of this exact chilli recipe).
 * Source for approximate 100g kcal/B/F/C: https://www.fatsecret.pl/kalorie-warto%C5%9Bci%C2%A0od%C5%BCywcze/bakador/orzeszki-ziemne-w-skorupce/100g
 */
export const BAKADOR_CHILI = Object.freeze([
  Object.freeze({
    id: 'pack:bakador-chili-coated-peanuts-240g-5900571906099',
    code: '5900571906099',
    ean: '5900571906099',
    name: "BakaD'Or Orzeszki ziemne w skorupce Chili 240 g",
    brand: "BakaD'Or",
    aliases: Object.freeze([
      'bakador chili', "baka d'or chili", 'baka dor chili', 'orzeszki chili',
      'orzeszki ziemne chili', 'orzeszki ziemne w skorupce chili',
      'chili flavoured', 'chilli flavoured', 'orzeszki w chrupiącej skorupce',
      'orzeszki chili 240g', '5900571906099'
    ]),
    kcal: 515,
    protein: 15,
    fat: 30,
    carbs: 44,
    unit: 'g',
    category: 'snack',
    source: 'Baza podstawowa',
    sourceName: "Zdjęcie opakowania BakaD'Or (EAN i wariant); orientacyjne makro porównywalnych orzeszków BakaD'Or",
    sourceUrl: 'https://www.fatsecret.pl/kalorie-warto%C5%9Bci%C2%A0od%C5%BCywcze/bakador/orzeszki-ziemne-w-skorupce/100g',
    verification: 'ean-photo-macro-estimate',
    isEstimate: true,
    note: 'Wartości orientacyjne na 100 g, NIE odczytane z etykiety tego wariantu Chili. Zdjęcie potwierdza EAN 5900571906099 i masę netto 240 g. Sprawdź makro na czytelnej etykiecie.',
    storeKeys: Object.freeze(['biedronka'])
  })
]);
