# Mój Bilans — Nutrition Performance v2 (etapy 0 i 1)

## Podgląd
https://durart.github.io/moj-bilans/np-v2/

To kompletna aplikacja oparta na działającej wersji produkcyjnej, ale z nową warstwą CSS i oddzielonymi danymi. W odróżnieniu od wcześniejszego statycznego prototypu zapisuje WYŁĄCZNIE dane testowe we własnej przestrzeni.

## Zabezpieczenia
- np-v2/app.js: localStorage "moj-bilans-np-v2-v1".
- Kopie IndexedDB: "moj-bilans-np-v2-kopie-v1".
- OFF: katalog "moj-bilans:np-v2-off-food-catalog:v1"; starszy katalog "moj-bilans:np-v2-biedronka-off:v1"; cache wyszukiwarki "moj-bilans:np-v2-off-search-cache:v1".
- Service Worker scope "./", cache "moj-bilans-np-v2-cache-stage01", usuwane tylko starsze cache z własnym prefiksem.
- Brak odwołań do produkcyjnych danych; brak automatycznego transferu danych z "/" i "/preview/".
- Nie należy importować do testowej aplikacji prywatnego backupu z produkcji.

## Testy
Z katalogu repo:
- node np-v2/test_np_v2.mjs
- npm test

Kryteria odbioru: 13 kontroli izolacji, kompletności plików, nawigacji, istniejących modali i syntaktyki JS; testy regresyjne katalogu i historii.

## Testy ręczne na telefonie
1. Przy rozdzielczościach 320/375/390/430 px sprawdź bilans, makro i panel trzech szybkich akcji.
2. Kliknij Szukaj, Ostatnie i EAN; panel powinien przełączać istniejące widoki dodawania.
3. Wpisz fikcyjny produkt; zmień gramaturę, zapisz, edytuj i usuń; uruchom ponownie aplikację.
4. Sprawdź dziennik i ulubione/kopiowanie, nawodnienie, historię, wagę, obwody, ustawienia i lokalne kopie.
5. Odśwież aplikację po załadowaniu cache, następnie sprawdź działanie offline.
6. Równolegle otwórz produkcyjny "/" i sprawdź, czy nie zmienił się jego dziennik.
7. Sprawdź obsługę klawiatury, focus i dolny obszar bezpieczny iPhone/Android.

## Zakres obecnego wydania
Etapy 0–1: izolacja, testy, design system, nowy header, kompaktowy bilans, szybkie akcje.
Nie obejmuje jeszcze przebudowy logiki wyszukiwarki ani nowych wykresów (etapy 2–4).
