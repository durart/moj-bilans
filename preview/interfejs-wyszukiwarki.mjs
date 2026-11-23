import { defaultFoodSearcher, searchBasicFoods, isBarcode } from './wyszukiwarka.mjs';
import { loadFoodCatalog, loadExpandedFoodCatalog, searchFoodCatalog, searchExpandedFoodCatalog, importExpandedFoodCatalog, FOOD_CATALOG_MAX, storeLabel } from './katalog-produktow.mjs';

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
export function mountFoodSearch({form,input,results,status,onSelect,onFavorite=()=>{},isFavorite=()=>false,searcher=defaultFoodSearcher}) {
  if(!form||!input||!results||!status||typeof onSelect!=='function') throw new TypeError('Brak wymaganych elementów');
  const importBtn=document.getElementById('foodCatalogImport');
  const catalogStatus=document.getElementById('foodCatalogStatus');
  const filter=document.getElementById('foodStoreFilter');
  let currentRequest=0,importing=false,typingTimer=null;
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
      const sourceLabel=item.verification==='bakery-card'?'Pieczywo · dane piekarni / sklepu':
        item.verification==='manufacturer-example'?'Wędlina · wartości orientacyjne':
        item.verification==='label-photo'?'Wartości z etykiety · konkretny EAN':
        item.verification==='manufacturer-web'?'Dane producenta · konkretny EAN':
        item.verification==='ean-photo-macro-estimate'?'EAN ze zdjęcia · makro orientacyjne':
        item.category==='dish'?'Danie domowe · szacunek':
        item.verification==='estimated-generic'?'Produkt bazowy · szacunek':
        item.source==='Baza podstawowa'?(item.category==='fruit'?'Owoc · baza lokalna':item.category==='veg'?'Warzywo · baza lokalna':item.category==='bakery'?'Pieczywo · Biedronka':item.category==='cheese'?'Ser żółty · baza lokalna':'Podstawowe'):
        shops.length?`${shops.join(', ')} · OFF`:'Open Food Facts';
      head.append(heading,node('span','food-source',sourceLabel));
      const label=node('div','np-food-meta');
      label.append(node('span','np-food-chip',item.source==='Baza podstawowa'?'Baza lokalna':'Open Food Facts'));
      if(item.isEstimate || item.category==='dish' || item.verification==='estimated-generic')label.append(node('span','np-food-chip np-food-estimate','Wartości orientacyjne'));
      const macros=node('p','food-macros',`${fmt(item.kcal)} kcal · B ${fmt(item.protein)} g · T ${fmt(item.fat)} g · W ${fmt(item.carbs)} g / 100 ${item.unit||'g'}`);
      const description=item.verification==='bakery-card'?
        '✓ Wartości z karty tego konkretnego cebularza; inne piekarnie mogą stosować odmienną recepturę.':
        item.verification==='manufacturer-example'?
        '⚖️ Przykładowe wartości ze wskazanej karty producenta; Twój baleron może mieć inne makro. Sprawdź etykietę swojego opakowania.':
        item.verification==='label-photo'?
        '✓ Dane odczytane ze zdjęcia opakowania tego wariantu. Inne opakowania Sante mogą mieć zmieniony skład i makro.':
        item.verification==='manufacturer-web'?
        '✓ Makro na 100 g z oficjalnej strony producenta. Kubek ma 200 g; przed zapisem ustaw właściwą porcję.':
        item.verification==='ean-photo-macro-estimate'?
        '⚖️ EAN i smak potwierdzone zdjęciem. Kalorie oraz B/T/W są ORIENTACYJNE, przyjęte z podobnych orzeszków BakaD\'Or — to nie odczyt z tabeli tego opakowania.': 
        item.category==='dish' && item.recipeSummary?
        `⚖️ SZACUNEK dla przykładowej receptury gotowej potrawy: ${item.recipeSummary}. Skład i wchłonięty tłuszcz mogą się różnić; zweryfikuj własną porcję.`:
        item.verification==='estimated-generic'?
        '⚖️ Orientacyjny profil produktu, bez weryfikacji etykiety konkretnej marki. Kcal oszacowane z B/T/W (4/9/4).':
        item.isIncomplete?'Niepełne makro — przepisz dane z etykiety albo wybierz inny produkt.':
        item.isUnreliable?'⚠️ Kalorie nie zgadzają się z makro. Sprawdź etykietę przed dodaniem.':
        item.category==='bakery' && item.verification==='retailer-website'?'Wartości na 100 g z oficjalnej strony Biedronki. Receptura może się zmienić — sprawdź etykietę zakupionego produktu.':
        item.category==='cheese' && item.sourceUrl?'Dane z karty produktu producenta lub sprzedawcy. Receptury mogą się różnić — porównaj z etykietą zakupionego sera.':
        item.source==='Baza podstawowa'?(item.edible?'Orientacyjne / 100 g części jadalnej; W bez błonnika (szacunkowo). Sprawdź gramaturę i sposób przygotowania.':'Orientacyjne wartości referencyjne — sprawdź produkt, sposób przygotowania i porcję.'):
        'Dane społecznościowe Open Food Facts. Kontrola liczb nie zastępuje sprawdzenia etykiety.';
      const detail=node('p','food-detail',description);
      const favorite=node('button','food-action',isFavorite(item)?'★ Ulubiony':'☆ Ulubiony');
      favorite.type='button';
      favorite.setAttribute('aria-pressed',String(isFavorite(item)));
      favorite.addEventListener('click',()=>{
        if(onFavorite(item)) {
          favorite.textContent=isFavorite(item)?'★ Ulubiony':'☆ Ulubiony';
          favorite.setAttribute('aria-pressed',String(isFavorite(item)));
        }
      });
      const blocked=Boolean(item.isIncomplete||item.isUnreliable);
      const action=node('button','food-action',blocked?'Wymaga sprawdzenia':'Wybierz produkt');
      action.type='button';action.disabled=blocked;
      if(!blocked) action.addEventListener('click',()=>onSelect({...item}));
      card.append(head,label,macros,detail,favorite,action);
      if(item.source !== 'Baza podstawowa' && item.code && /^\d{8,14}$/.test(item.code)){
        const link=node('a','food-off-link','Zobacz źródło OFF');
        link.href=`https://world.openfoodfacts.org/product/${item.code}`;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      if (item.verification==='ean-photo-macro-estimate' && item.sourceUrl) {
        const link=node('a','food-off-link','Źródło szacunku — podobny produkt');
        link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      if (item.verification==='manufacturer-web' && item.sourceUrl) {
        const link=node('a','food-off-link','Źródło danych producenta');
        link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      if (item.verification==='manufacturer-example' && item.sourceUrl) {
        const link=node('a','food-off-link','Źródło przykładowych wartości');
        link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      if (item.category==='cheese' && item.sourceUrl) {
        const link=node('a','food-off-link','Źródło danych o serze');
        link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      if (item.category==='bakery' && item.sourceUrl) {
        const link=node('a','food-off-link',item.verification==='bakery-card'?'Źródło wartości odżywczych':item.verification==='estimated-generic'?'Podstawa szacunku':'Dane na stronie Biedronki');
        link.href=item.sourceUrl;link.target='_blank';link.rel='noopener noreferrer';
        card.append(link);
      }
      results.append(card);
    }
  }
  // Podczas pisania filtrujemy WYŁĄCZNIE katalogi lokalne.
  // Wyszukiwanie sieciowe działa po świadomym kliknięciu "Sprawdź OFF".
  function deduplicate(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item.code ? 'ean:' + item.code :
        'name:' + String(item.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pl') +
        '|' + String(item.brand || '').toLocaleLowerCase('pl');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  async function showLocalSuggestions() {
    const serial = ++currentRequest;
    const query = input.value.trim(), store = selectedStore();
    if (query.length < 2) {
      results.replaceChildren();
      status.textContent = messages['too-short'];
      return;
    }
    const legacy = [...searchBasicFoods(query, 30, store), ...searchFoodCatalog(query, { store })];
    render(deduplicate(legacy));
    status.textContent = 'Wyszukiwanie w zapisanych produktach…';
    try {
      const expanded = await searchExpandedFoodCatalog(query, { store });
      if (serial !== currentRequest) return;
      const unique = deduplicate([...legacy, ...expanded]);
      render(unique);
      status.textContent = `Wyniki lokalne: ${unique.length}. Aby wyszukać także w Open Food Facts, kliknij „Sprawdź OFF”.`;
    } catch {
      if (serial !== currentRequest) return;
      status.textContent = `Wyniki lokalne: ${deduplicate(legacy).length}. Aby wyszukać także w Open Food Facts, kliknij „Sprawdź OFF”.`;
    }
  }
  function onInput() {
    currentRequest++;
    clearTimeout(typingTimer);
    if (input.value.trim().length < 2) { void showLocalSuggestions(); return; }
    typingTimer = setTimeout(() => { void showLocalSuggestions(); }, 120);
  }
  async function handleSubmit(event){
    event?.preventDefault();
    clearTimeout(typingTimer);
    const query=input.value.trim(),serial=++currentRequest,store=selectedStore();
    if(query.length<2){render([]);status.textContent=messages['too-short'];return;}
    const local=deduplicate([...searchBasicFoods(query,30,store),...searchFoodCatalog(query,{store})]);
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
  async function refreshCatalog() {
    if (importing) return;
    importing = true;
    if (importBtn) { importBtn.disabled = true; importBtn.textContent = 'Pobieram…'; }
    updateCatalogStatus('Pobieram produkty do rozszerzonej bazy lokalnej…');
    try {
      const result = await importExpandedFoodCatalog({
        normalizeProduct: searcher.normalizeOffProduct,
        onProgress: ({ page, count, read }) =>
          updateCatalogStatus(`Partia ${page}: przejrzano ${read}, zapisano ${count} produktów…`)
      });
      const catalog = await loadExpandedFoodCatalog();
      updateCatalogStatus(`Baza lokalna: ${catalog.items.length} produktów. Nowo pobrane w tej operacji: ${result.imported}. Dane OFF wymagają sprawdzenia z etykietą.`);
      if (input.value.trim().length >= 2) void showLocalSuggestions();
    } catch (error) {
      updateCatalogStatus(`Import nie powiódł się: ${error?.message || 'brak połączenia'}. Dotychczasowe produkty pozostają zapisane.`);
    } finally {
      importing = false;
      if (importBtn) { importBtn.disabled = false; importBtn.textContent = 'Pobierz / odśwież produkty offline'; }
    }
  }
  function onFilterChanged(){currentRequest++;clearTimeout(typingTimer);showLocalSuggestions();}
  form.addEventListener('submit',handleSubmit);
  input.addEventListener('input',onInput);
  importBtn?.addEventListener('click',refreshCatalog);
  filter?.addEventListener('change',onFilterChanged);
  updateCatalogStatus();
  void loadExpandedFoodCatalog().then(catalog => {
    if (importing || !catalogStatus) return;
    catalogStatus.textContent = `Baza lokalna: ${catalog.items.length} produktów · zapis ${catalog.persistence === 'indexeddb' ? 'IndexedDB' : 'lokalny'}. Dane OFF wymagają sprawdzenia z etykietą.`;
  }).catch(() => {});
  return ()=>{currentRequest++;clearTimeout(typingTimer);input.removeEventListener('input',onInput);form.removeEventListener('submit',handleSubmit);importBtn?.removeEventListener('click',refreshCatalog);filter?.removeEventListener('change',onFilterChanged);};
}
