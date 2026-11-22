# Mój Bilans — Nutrition Performance v2 (etapy 0–4, TEST)

## Adres
https://durart.github.io/moj-bilans/np-v2/

## Bezpieczeństwo
Zmiany dotykają wyłącznie katalogu np-v2/ i gałęzi feature/nutrition-performance-v2. Dane produkcyjne nie są wczytywane automatycznie: oddzielne nazwy localStorage, IndexedDB, cache, manifest, Service Worker ze scope './'. Nie importuj produkcyjnej kopii do testów. Produkcja / oraz katalog /preview/ są poza zakresem.

## Etap 2 — ekran główny
Kompaktowy bilans, cel i makroskładniki, liczba zapisanych posiłków i produktów oraz status pozostałych kcal oparty na wpisach użytkownika. Szybkie akcje, zapis porcji przy użyciu gramatury i bez zgadywania masy jednej sztuki.

## Etap 3 — wyszukiwarka
Wyniki lokalne podczas wpisywania (debounce 120 ms, bez wywołań sieciowych). Dopiero świadome kliknięcie „Sprawdź OFF” używa internetowego Open Food Facts, jego cache i limitera. Źródła i wartości orientacyjne są oznaczane. EAN, ostatnie wpisy oraz ręczne dodawanie pozostają dostępne.

## Etap 4 — historia i pomiary
SVG trendu kcal wyliczony wyłącznie z rzeczywistych wpisów; brak danych nie jest zerem. Krótkie zakresy = dzień, długie = średnia z dni mających wpisy we wspólnym przedziale. Porównanie dwóch ostatnich ważeń i dwóch ostatnich pomiarów wybranego obwodu; zachowane istniejące wykresy i formularze.

## Testy
- node np-v2/test_np_v2.mjs
- node np-v2/test_np_v2_stages234.mjs
- npm test
- GitHub Actions np-v2-tests.yml na gałęzi feature/nutrition-performance-v2

## Odbiór ręczny (etap 5 — bez wprowadzania na produkcję)
1. Telefon (320, 375, 390, 430 px) i desktop; nawigacja pięciu zakładek.
2. Wpisz „ziemniaki” w wyszukiwarce: wyniki lokalne muszą się pojawić bez przycisku. Kliknij „Sprawdź OFF” dla wyników online. Filtr sklepu i tryb offline.
3. Dodaj testowy posiłek, użyj presetów gramatury 50/100/150/200 g, edytuj i usuń. Nie powinno być przelicznika sztuk bez potwierdzonej gramatury.
4. Przetestuj EAN, ostatnie, ulubione, wodę, kopiowanie posiłku, kopie lokalne.
5. Historia 7/14 dni i własny zakres; słupek dla okresu bez wpisów ma być pusty, średnia nie może zawierać pustych dni.
6. Dodaj dwa testowe ważenia i dwa obwody; sprawdź delty, wpisy i wykresy.
7. Zamknij aplikację, uruchom ponownie, sprawdź zapis i offline; porównaj dane produkcyjne / przed i po (bez zmian).

## Etap 5 — automatyczny odbiór Chromium
Wykonano 10 testów E2E w przeglądarce Chromium: start bez danych, RWD 320/375/390/430/1280 px, ostatnie i EAN, lokalne „ziemniaki” bez wywołań API podczas pisania, porcja 150 g z przeliczeniem kcal, zapis i szczegóły wpisu, trend historii, ważenia i obwody, trwałość danych po odświeżeniu, oddzielne dane produkcji, prawdziwy tryb offline Service Workera oraz brak błędów JavaScript.

Wykryto i naprawiono błąd nasłuchiwania kliknięć w przyciskach gramatury, który blokował inicjalizację dalszych formularzy. Potwierdzono 10/10 testów przeglądarkowych i testy regresyjne. Zmieniono nazwę cache do `moj-bilans-np-v2-cache-stage5` dla bezpiecznej aktualizacji PWA w obrębie własnego scope.

Testy uruchamiane na osobnej gałęzi przez `.github/workflows/np-v2-browser.yml`; screenshoty trzech rozdzielczości dostępne jako artefakty GitHub Actions. Przed zakończeniem odbioru użytkowego zalecana jest kontrola na własnym telefonie z realną klawiaturą dotykową i zgodą aparatu. Nie używać danych produkcyjnych w testach.

## Sprint 1 — Historia 2.4 (gałąź robocza)
- Zakresy 7, 14 i **dokładne 30 dni**; zachowane dłuższe i własne okresy.
- Wykres kcal: dzienne słupki dla 7/14/30, kolor względem celu ±10%, linie celu i średniej oraz oznaczenie brakujących wpisów. Dłuższe zakresy agregowane do maks. 28 słupków.
- Panel realizacji celu: średnia względem celu, liczba dni w przedziale i powyżej, pokrycie okresu, rozkład dni oraz porównanie ostatnich 7 dni z przejściem do dziennika.
- Niepełne dane kcal nie są traktowane jako zera; średnie i odchylenia planu są obliczane wyłącznie z dni z pełnymi kcal. Dni bez wpisów nie oznaczają realizacji celu.
- Bez migracji danych, bez zapisu z panelu analiz i bez modyfikowania aplikacji produkcyjnej.
- Testy: `node np-v2/test_np_history_24.mjs`, testy regresji, Chromium E2E oraz offline.
- **Sprint 2 (Pomiary 2.5)** pozostaje kolejnym etapem po weryfikacji Sprintu 1.

## Sprint 2 — Pomiary 2.5 / Body Progress (gałąź robocza)
- Ekran postępu masy ciała: ostatnia waga, trend EMA wygładzany według faktycznych odstępów między ważeniami (półokres 7 dni), procent postępu od pierwszego ważenia do aktualnego celu i dystans do celu.
- Wykres wagi: rzeczywiste pomiary, fioletowa linia trendu i linia celu, bez dopisywania sztucznych pomiarów.
- Karty czterech obwodów: ostatnia wartość i data, różnica od pierwszego i poprzedniego pomiaru; wykres wybranego obwodu i historia nadal działają.
- Bez nowych pól w kopiach JSON, bez modyfikacji localStorage, IndexedDB, bazy produktów i katalogu głównego produkcji. Obsługa braku danych i błędnych dat.
- Testy: `node np-v2/test_np_body_25.mjs`, Chromium E2E oraz offline.

## Korekta zgodności layoutu — 21.11.2026
Po zgłoszeniu różnicy względem wersji głównej przyjęto jako wzorzec **aktualny produkcyjny układ Daily Focus v2.2 i Premium Food Search v2.3**, nie wcześniejszy szablon Nutrition Performance.

- Dziennik i Produkty mają identyczną strukturę HTML jak w produkcji. Przeniesiono aktualne arkusze `style.css`, `np-design.css`, `daily-focus.css`, `premium-food-search.css` oraz nową logikę kafelków i wyszukiwarki.
- Ekrany Historia i Pomiary rozszerzają powyższy layout o zrealizowane funkcje 2.4/2.5, bez duplikacji ekranów.
- Nadal pozostają izolowane: localStorage `moj-bilans-np-v2-v1`, IndexedDB `moj-bilans-np-v2-kopie-v1`, manifest, Service Worker scope `./` i cache `moj-bilans-np-v2-cache-layout-parity-v1`.
- Do testów statycznych: `node np-v2/test_layout_parity.mjs`. Dodatkowe kroki akceptacyjne Chromium obejmują nawigację i modale Daily Focus/Premium Food Search. Testy przeglądarkowe wymagają wykonania w środowisku z Chromium.
- Zmiana obejmuje tylko folder `np-v2/`. Produkcyjny dziennik pozostaje nietknięty.

## Optional calorie and macro calculator — test branch

This feature is available on branch `feature/np-v2-calorie-macro-calculator` only. Production files in the repository root are unchanged.

- **Manual mode:** the existing daily calorie, protein, fat and carbohydrate goals remain fully editable.
- **Calculated proposal:** enter adult age (18–100), height (cm), weight (kg), the applicable Mifflin–St Jeor equation, activity level, goal adjustment and one of three macro distributions.
- **Weights:** the calculator offers the latest saved test-app weight when present, but allows manual override. No age, height, sex, or activity profile is stored by this first version.
- **Energy:** calculate BMR with the Mifflin–St Jeor equation; estimate TDEE with a selected activity factor (1.2 / 1.375 / 1.55 / 1.725). Choose maintain, −10/−15/−20%, or +5/+10%; use 10-kcal rounding.
- **Macros:** choose 25/30/45, 30/25/45, or 20/25/55 percentages (protein/fat/carbs). Display approximate grams using 4/9/4 kcal per gram; small energy discrepancies are caused by integer rounding.
- **Explicit confirmation:** Calculate only shows a preview. Apply copies the proposal to the existing editable inputs, and the user must separately click **Save goals** to persist it. If the page reloads before Save, old goals are retained.
- **No production or schema changes:** use the pre-existing isolated test storage and backup format; no data migration, new storage key, network request, telemetry or API is needed. All calculations are local.
- **Caveat:** TDEE is not a measurement. Activity factors and deficit percentages are modeling assumptions, not guaranteed weight-change results. The feature is intended for adults and does not replace individualized clinical advice.

References: Mifflin MD et al., *Am J Clin Nutr* 1990;51:241–247 (PMID 2305711); adult acceptable macronutrient distribution ranges (National Academies / Health Canada).

Tests: `node np-v2/test_goal_calculator.mjs`, `node np-v2/test_goal_calculator_ui.mjs`, plus layout parity, history/body regressions and browser acceptance (where Chromium is available).
