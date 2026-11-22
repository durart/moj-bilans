# Mój Bilans — plan rozwoju

Aktualizacja: 2026-11-22. Status: kolejka zaakceptowana do planowania; **brak zgody na implementację lub wdrożenie**.

## Zasady
- PWA local-first, GitHub Pages; architektura w 100% darmowa, bez płatnego backendu, serwerowej bazy i płatnych API.
- Funkcje client-side, localStorage/IndexedDB i otwarte API.
- Wsteczna zgodność kopii JSON i ochrona istniejących danych.
- Analiza → projekt → osobna gałąź → testy na telefonie → akceptacja → produkcja wyłącznie po wyraźnej zgodzie.
- Przestrzegaj aktualnego dokumentu „Standard programowania AI — zasady globalne”.

## Kolejka (pierwsze niezrealizowane zadanie jest następne)
- [ ] **1.1 Kreator przepisów i dań złożonych — NASTĘPNE.** Składniki, ilości, masa gotowego dania po obróbce lub liczba porcji; kcal/B/T/W na 100 g i porcję; zapis jako lokalny produkt; zachowanie listy składników do edycji i ponownego przeliczenia. Odróżniać masę przed i po obróbce.
- [ ] **1.2 Kopiowanie posiłków między dniami.** Jeden posiłek lub cały dzień, niezależne kopie rekordów, ochrona przed duplikatami.
- [ ] **2.1 Udostępnianie kopii JSON.** Web Share API (navigator.share/canShare), fallback do pobrania JSON, bez zakładania że udostępnienie równa się skutecznemu zapisowi.
- [ ] **2.2 Lokalny cache Open Food Facts.** Automatyczne zapisywanie produktów po EAN i poprawek użytkownika; ponowne użycie offline; deduplikacja, limity i priorytet korekt.
- [ ] **3.1 Wykres Kalorie vs Trend Masy Ciała.** Dzienne kcal lub średnia krocząca na tle wygładzonej masy; rozdzielne osie; dni bez wpisów nie są zerami.
- [ ] **3.2 Adaptacyjne TDEE.** Szacunek z 3–4 tygodni na podstawie średniego spożycia i zmiany wygładzonej masy. Przybliżenie: TDEE ≈ średnie kcal − 7700 × Δmasa(kg)/dni. Oznaczać niepewność i kompletność danych; nie zmieniać automatycznie celu.
- [ ] **4.1 Google Drive BYOS.** Google Identity Services i Drive API client-side, preferowany scope drive.appdata, konfiguracja OAuth, zapis/odczyt kopii JSON, wykrywanie konfliktów i potwierdzanie nadpisania.

## Reguła dla przyszłych rozmów
Na prośbę „Mój Bilans — pierwszy pomysł z kolejki rozwoju” odczytaj aktualny plik `ROADMAP.md` w repozytorium `durart/moj-bilans`, wskaż pierwszą niezrealizowaną pozycję i przedstaw szczegółowy projekt. **Nie rozpoczynaj implementacji bez osobnego polecenia.** Po zakończeniu zadania zaktualizuj checkbox, datę i odnośnik do PR/commita.

## Historia realizacji
| Zadanie | Status | Data | PR/commit |
|---|---|---|---|
| 1.1 | Oczekuje | — | — |
| 1.2 | Oczekuje | — | — |
| 2.1 | Oczekuje | — | — |
| 2.2 | Oczekuje | — | — |
| 3.1 | Oczekuje | — | — |
| 3.2 | Oczekuje | — | — |
| 4.1 | Oczekuje | — | — |
