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
