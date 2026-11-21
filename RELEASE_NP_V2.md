# Nutrition Performance v2.0 — wdrożenie produkcyjne

## Adres
https://durart.github.io/moj-bilans/

## Bezpieczny rollback
Ostatni commit starej produkcji: `c5279b185b5a2888a1f82aa670bf64f5f38694f0`. Zachowana gałąź: `backup/moj-bilans-before-np-v2-20261121`. Odwracaj jedynie kod wdrożenia; nigdy nie usuwaj danych przeglądarki. Przed ewentualnym rollbackiem wyeksportuj dane przez Ustawienia.

## Zachowane identyfikatory danych
- localStorage: `moj-bilans-v1`
- IndexedDB: `moj-bilans-kopie-lokalne-v1`, store `copies`
- Katalog OFF: `moj-bilans:off-food-catalog:v1`
- Stary Biedronka OFF: `moj-bilans:biedronka-off:v1`
- Cache wyszukiwania OFF: `moj-bilans:off-search-cache:v1`
- PWA id, start_url, scope: `./`
- Service Worker: `./sw.js`, cache zasobów offline `moj-bilans-cache-np-v2-release1`

Testowe dane `np-v2` pozostają osobne; nie kopiujemy ich do produkcji.

## Funkcje v2
Nowy Design System, podsumowanie dnia, szybkie akcje, gramatury 50/100/150/200 g, wyniki lokalne podczas pisania, świadome wyszukiwanie Open Food Facts, wykres kalorii z rzeczywistych wpisów, trend masy i obwodów. Zachowano formularze, historię, import/eksport, bazę danych, wodę, EAN, ulubione i kopie lokalne.

## Testy
`release-tests/np-v2-safety.mjs`, `release-tests/np-v2-production-acceptance.mjs` oraz `npm test`, uruchamiane workflow `.github/workflows/np-v2-prod-release.yml` na gałęzi wydania.

## Po publikacji
Otwórz produkcję (również z ikony PWA), sprawdź stare wpisy i masę ciała. Następnie przetestuj nowy produkt i zrób kopię JSON. Gdy widoczny jest stary interfejs, zamknij i otwórz PWA ponownie; nie czyść danych aplikacji.

## Hotfix 2.0.1 — synchronizacja zasobów PWA
Po zmianie wizualnej z 2.0 część urządzeń mogła połączyć nowy HTML ze starszą wersją `app.js`. Nowe kafelki były wtedy wyświetlane z wartościami domyślnymi 0/4, 0 i „—”, podczas gdy główny bilans działał poprawnie. To problem plików interfejsu, a nie reset danych.

Hotfix zmienia adresy nowych skryptów i arkusza CSS na `?v=np2.0.1`, aktualizuje precache usługi Service Worker do `moj-bilans-cache-np-v2-release2` i wyświetla „—” zamiast fałszywych zer, dopóki JavaScript nie odczyta danych. Zachowane klucze localStorage/IndexedDB, manifest PWA, format kopii i dziennika. Dla zainstalowanej PWA po publikacji należy ją zamknąć i ponownie uruchomić przy aktywnym internecie. Nie usuwać danych aplikacji.

## Nowy produkt BakaD'Or Chili 240 g (EAN 5900571906099)
Na podstawie zdjęcia opakowania rozpoznano markę, wariant Chili, masę netto 240 g i EAN z prawidłową cyfrą kontrolną. Z powodu nieczytelnej tabeli odżywczej 515 kcal, B 15 g, T 30 g, W 44 g na 100 g pochodzą z porównywalnego produktu BakaD'Or w chrupkiej skorupce (źródło: FatSecret); to SZACUNEK, nie zweryfikowana etykieta tego wariantu. Produkt jest wyraźnie oznaczony jako orientacyjny w bazie, nie nadaje mu się weryfikacji 'label-photo'. Przy czytelnym zdjęciu tabeli można zaktualizować liczby. Nowa wersja cache PWA release3 i identyfikatory skryptów np2.0.2, klucze danych produkcyjnych bez zmian.
