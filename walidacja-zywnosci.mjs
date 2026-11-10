/** Walidacja spójności na 100 g / 100 ml. Nie zastępuje weryfikacji etykiety. */
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
export function assessNutrition({kcal, protein, fat, carbs} = {}) {
  if (![kcal,protein,fat,carbs].every(numeric)) {
    return {level:'incomplete', message:'Brak pełnych danych o kaloriach lub makroskładnikach.'};
  }
  if (kcal > 900 || [protein,fat,carbs].some(v => v > 100.5) || protein + fat + carbs > 105) {
    return {level:'invalid', message:'Wartości przekraczają ilość składników możliwą w 100 g/ml.'};
  }
  // 4-4-9 jest jedynie szacunkiem; alkohol, błonnik i poliole mogą powodować różnice.
  const estimated = protein * 4 + carbs * 4 + fat * 9;
  const difference = estimated - kcal;
  if ((difference > Math.max(25, kcal * 0.30)) || (-difference > Math.max(55, kcal * 0.40))) {
    return {level:'suspicious', message:'Kalorie nie zgadzają się z B/T/W. Możliwe zamienienie tłuszczów i węglowodanów lub szczególny skład produktu.', estimatedKcal:Math.round(estimated)};
  }
  return {level:'ok', message:'Bez oczywistych sprzeczności liczbowych. Porównaj z etykietą.'};
}
