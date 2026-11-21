/**
 * Produkty oznaczone na podstawie czytelnych zdjęć konkretnych etykiet.
 * Dane z opakowania Sante Musli owocowe 1 kg, EAN 5900617048066
 * (75% płatków zbożowych, 25% suszonych owoców).
 * Istnieją nowsze receptury marki o innych wartościach; ich nie łączymy.
 */
export const LABELED_PRODUCTS = Object.freeze([
  Object.freeze({
    id: 'label:sante-musli-owocowe-1kg-5900617048066',
    code: '5900617048066',
    ean: '5900617048066',
    name: 'Sante Musli owocowe 1 kg',
    brand: 'Sante',
    aliases: Object.freeze([
      'musli owocowe', 'owocowe musli', 'musli sante', 'sante musli',
      'sante musli owocowe', 'musli z owocami', 'płatki musli owocowe',
      'musli owocowe 1 kg', '5900617048066'
    ]),
    kcal: 385,
    protein: 9,
    fat: 7.4,
    carbs: 66,
    fiber: 9,
    unit: 'g',
    category: 'cereal',
    source: 'Baza podstawowa',
    sourceName: 'Etykieta fotografowanego opakowania Sante (wariant 75% zbóż / 25% owoców)',
    verification: 'label-photo',
    isEstimate: false,
    note: 'Wartości dla konkretnego opakowania 1 kg z kodem EAN 5900617048066. Inne warianty i receptury Sante mogą mieć odmienne makro.',
    storeKeys: Object.freeze([])
  })
]);
