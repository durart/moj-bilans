/**
 * Cebularz, kilka wariantów o RÓŻNEJ wartości energetycznej.
 * Profile z kart piekarni/sprzedawców są powiązane z konkretnym dostawcą,
 * nie są pomiarami każdego cebularza dostępnego w sklepach.
 * Wpis ogólny to SZACUNEK recepturowy, nie etykieta.
 */
export const CEBULARZE = Object.freeze([
  Object.freeze({
    id:'cebularz:lubelski-orientacyjny',
    name:'Cebularz lubelski (orientacyjnie)',
    aliases:Object.freeze(['cebularz','cebularz lubelski','cebularze','placek cebulowy','placek z cebulą','placek z cebula','pieczywo z cebulą i makiem']),
    kcal:256,protein:7,fat:3.5,carbs:49,unit:'g',category:'bakery',
    source:'Baza podstawowa',sourceName:'Szacunek dla typowej receptury cebularza lubelskiego',
    sourceUrl:'https://cebularzlublin.pl/blog/ile-kalorii-ma-cebularz/',
    verification:'estimated-generic',isEstimate:true,
    note:'Orientacyjna wartość na 100 g; receptura i ilość oleju mogą zmienić makro.'
  }),
  Object.freeze({
    id:'cebularz:putka',
    name:'Cebularz Putka',
    brand:'Putka',
    aliases:Object.freeze(['cebularz','cebularz putka','placek z cebulą putka','cebulak putka']),
    kcal:222,protein:5.8,fat:4.6,carbs:38,fiber:2,unit:'g',category:'bakery',
    source:'Baza podstawowa',sourceName:'Karta produktu Piekarnie Cukiernie Putka — 100 g',
    sourceUrl:'https://www.putka.pl/produkt/cebularz-100-g/',
    verification:'bakery-card',isEstimate:false,
    note:'Wartości z karty cebularza Putka, nie z etykiety innej piekarni.'
  }),
  Object.freeze({
    id:'cebularz:auchan',
    name:'Cebularz Piekarnia Auchan',
    brand:'Piekarnia Auchan',
    aliases:Object.freeze(['cebularz','cebularz auchan','cebularz piekarnia auchan','placek cebulowy auchan']),
    kcal:261,protein:11,fat:8.6,carbs:33,unit:'g',category:'bakery',
    source:'Baza podstawowa',sourceName:'Karta produktu Piekarnia Auchan — 100 g',
    sourceUrl:'https://zakupy.auchan.pl/products/cebularz-piekarnia-auchan-1-sztuka/00209539',
    verification:'bakery-card',isEstimate:false,
    note:'Wartości z karty Piekarni Auchan. Produkt z innej piekarni może mieć inne makro.'
  }),
  Object.freeze({
    id:'cebularz:leclerc',
    name:'Cebularz E.Leclerc 150 g',
    brand:'E.Leclerc',
    aliases:Object.freeze(['cebularz','cebularz leclerc','cebularz e leclerc','cebularz 150 g']),
    kcal:205,protein:8.07,fat:2.25,carbs:40,fiber:3.35,unit:'g',category:'bakery',
    source:'Baza podstawowa',sourceName:'Karta produktu E.Leclerc — wartości w 100 g, sztuka 150 g',
    sourceUrl:'https://leclerc.com.pl/cebularz',
    verification:'bakery-card',isEstimate:false,
    note:'Wartości na 100 g, mimo że sprzedawana sztuka ma 150 g. Sprawdź wagę swojej porcji.'
  })
]);
