import { defaultFoodSearcher, searchBasicFoods, isBarcode } from './wyszukiwarka.mjs';
import { loadFoodCatalog, searchFoodCatalog, importFoodCatalog, FOOD_CATALOG_MAX, storeLabel } from './katalog-produktow.mjs';

const messages = Object.freeze({
  'too-short':'Wpisz przynajmniej 2 znaki lub zeskanuj kod EAN.',
  'local-only':'Produkty zapisane lokalnie.',
  cached:'Produkty lokalne i ostatnie wyniki Open Food Facts.',
  ready:'Wyniki z jednej wyszukiwarki: produkty podstawowe, offline i Open Food Facts.',
  offline:'Brak połączenia z Open Food Facts. Nadal widzisz produkty zapisane lokalnie.',
  'rate-limited':'Limit wyszukiwania online. Produkty lokalne nadal działają.'
});
const fmt = n => n === null || n === undefined ? 'brak danych' : String(n).replace('.',',');
function node(tag, cls, text) {
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);return el;
}
function displayDate(iso){try{return iso?new Date(iso).toLocaleString('pl-PL'):'jeszcze nie pobrano';}catch{return 'brak daty';}}

/** Jeden wynik i jeden formularz niezależnie od źródła/sklepu. */
export function mountFoodSearch({form,input,results,status,onSelect,searcher=defaultFoodSearcher}) {
  if(!form||!input||!results||!status||typeof onSelect!=='function') throw new TypeError('Brak wymaganych elementów');
  const importBtn=document.getElementById('foodCatalogImport');
  const catalogStatus=document.getElementById('foodCatalogStatus');
  const filter=document.getElementById('foodStoreFilter');
  let currentRequest=0,importing=false;
  const selectedStore=()=>filter?.value||'all';
  function updateCatalogStatus(message='') {
    if(!catalogStatus)return;
    const c=loadFoodCatalog();
    catalogStatus.textContent=message || (c.items.length ?
      `Zapisano ${c.items.length}/${FOOD_CATALOG_MAX} produktów offline · aktualizacja ${displayDate(c.fetchedAt)}. Dane OFF nie są automatycznie zweryfikowane z etykietą.` :
      'Katalog offline jest pusty. Możesz pobrać produkty z Open Food Facts, gdy masz internet.');
  }
  function render(items){
    results.replaceChildren();
    if(!items.length) {results.append(node('p','empty','Nie znaleziono pasujących produktów. Spróbuj innej nazwy, wyłącz filtr sklepu lub dodaj produkt ręcznie.'));return;}
    for(const item of items) {
      const card=node('article','food-card'),head=node('div','food-head'),heading=node('div');
      heading.append(node('strong','',item.name));
      if(item.brand) heading.append(node('small','food-brand',item.brand));
      const shops=(item.storeKeys||[]).map(storeLabel).filter(Boolean);
      const sourceLabel=item.source==='Baza podstawowa'?(item.category==='fruit'?'Owoc · baza lokalna':item.category==='veg'?'Warzywo · baza lokalna':'Podstawowe'):
        shops.length?`${shops.join(', ')} · OFF`:'Open Food Facts';
      head.append(heading,node('span','food-source',sourceLabel));
      const macros=node('p','food-macros',`${fmt(item.kcal)} kcal · B ${fmt(item.protein)} g · T ${fmt(item.fat)} g · W ${fmt(item.carbs)} g / 100 ${item.unit||'g'}`);
      const description=item.isIncomplete?'Niepełne makro — przepisz dane z etykiety albo wybierz inny produkt.':
        item.isUnreliable?'⚠️ Kalorie nie zgadzają się z makro. Sprawdź etykietę przed dodaniem.':
        item.source==='Baza podstawowa'?(item.edible?'Orientacyjne / 100 g części jadalnej; W bez błonnika (szacunkowo). Sprawdź gramaturę i sposób przygotowania.':'Orientacyjne wartości referencyjne — sprawdź produkt, sposób przygotowania i porcję.'):
        'Dane społecznościowe Open Food Facts. Kontrola liczb nie zastępuje sprawdzenia etykiety.';
      const detail=node('p','food-detail',description);
      const blocked=Boolean(item.isIncomplete||item.isUnreliable);
      const action=node('button','food-action',blocked?'Wymaga sprawdzenia':'Wybierz produkt');
      action.type='button';action.disabled=blocked;
      if(!blocked) action.addEventListener('click',()=>onSelect({...item}));
      card.append(head,macros,detail,action);
      if(item.code && /^\d{8,14}$/.test(item.code)){
        const link=node('a','food-off-link','Zobacz źródło OFF');
        link.href=`https://world.openfoodfacts.org/product/${item.code}`;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      results.append(card);
    }
  }
  async function handleSubmit(event){
    event?.preventDefault();
    const query=input.value.trim(),serial=++currentRequest,store=selectedStore();
    if(query.length<2){render([]);status.textContent=messages['too-short'];return;}
    const local=[...searchFoodCatalog(query,{store}),...(store==='all'&&!isBarcode(query)?searchBasicFoods(query):[])];
    render(local);
    status.textContent=isBarcode(query)?'Sprawdzam kod kreskowy…':'Pokazano wyniki lokalne. Szukam też w Open Food Facts…';
    try {
      const response=await searcher.search(query,{store});
      if(serial!==currentRequest)return;
      render(response.items);
      status.textContent=messages[response.status]||'Wyniki wyszukiwania.';
    }catch(error){
      if(serial!==currentRequest)return;
      render(local);
      status.textContent='Wyszukiwanie online nie powiodło się. Produkty offline pozostają dostępne.';
    }
  }
  async function refreshCatalog(){
    if(importing)return;
    importing=true;
    if(importBtn){importBtn.disabled=true;importBtn.textContent='Pobieram…';}
    updateCatalogStatus('Łączę z Open Food Facts. Nie zamykaj okna…');
    try{
      const result=await importFoodCatalog({normalizeProduct:searcher.normalizeOffProduct,
        onProgress:({page,count,read})=>updateCatalogStatus(`Partia ${page}: przejrzano ${read}, zaakceptowano ${count} produktów…`)});
      updateCatalogStatus(`Zapisano ${result.items.length}/${FOOD_CATALOG_MAX} popularnych produktów OFF z Polski. Przejrzano ${result.totalSeen}; ${displayDate(result.fetchedAt)}. Sklepy według oznaczeń społeczności.`);
      if(input.value.trim().length>=2)void handleSubmit();
    }catch(e){updateCatalogStatus(`Pobieranie nie powiodło się: ${e?.message||'brak połączenia'}. Poprzednie produkty pozostają zapisane.`);}
    finally{importing=false;if(importBtn){importBtn.disabled=false;importBtn.textContent='Pobierz / odśwież produkty offline';}}
  }
  function onFilterChanged(){currentRequest++;if(input.value.trim().length>=2)void handleSubmit();else{render([]);status.textContent='Wpisz nazwę lub kod produktu, aby wyszukać we wspólnej bazie.';}}
  form.addEventListener('submit',handleSubmit);
  importBtn?.addEventListener('click',refreshCatalog);
  filter?.addEventListener('change',onFilterChanged);
  updateCatalogStatus();
  return ()=>{currentRequest++;form.removeEventListener('submit',handleSubmit);importBtn?.removeEventListener('click',refreshCatalog);filter?.removeEventListener('change',onFilterChanged);};
}
