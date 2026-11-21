# Nutrition Performance v2.1 — wydanie produkcyjne

## Adresy
- Produkcja: https://durart.github.io/moj-bilans/
- Oddzielne środowisko testowe (pozostaje): https://durart.github.io/moj-bilans/np21/

## Zmiany
- Potwierdzenie odczytu danych po zapisie w localStorage, status zapisu w Dzienniku i Ustawieniach
- Fail-closed: gdy JSON jest nieczytelny, zapisy, eksport pustego stanu i przywracanie zostają zablokowane
- Kopie lokalne w IndexedDB są odczytywane po zapisie dla potwierdzenia
- Sprawdzenie ostatniej kopii lokalnej bez przywracania: spójność rozmiaru, JSON i struktury wpisów
- Ręczne sprawdzanie aktualizacji PWA i świadome odświeżanie bez automatycznego przerywania edycji
- Zachowano produkcyjny klucz `moj-bilans-v1`, bazę `moj-bilans-kopie-lokalne-v1`, strukturę kopii v5, PWA manifest `./` i katalogi OFF
- Cache zasobów: `moj-bilans-cache-np-v21-release1` z wersjonowanymi zasobami `?v=np2.1.0`
- Nie przenoszono fikcyjnych wpisów z `/np21/`

## Bezpieczeństwo
Kopia kodu sprzed wdrożenia: `backup/moj-bilans-before-v2.1-20261121`, commit `91d9a54b5a302f4291891b06db37e45d054bf1f2`. W razie problemów cofnij wyłącznie kod. Nie kasuj danych przeglądarki.
Lokalny punkt przywracania jest zapisywany na tym samym urządzeniu. Kontrola integralności nie jest pełnym testem rzeczywistego przywrócenia, a aplikacja nie może potwierdzić zapisania pobranego pliku w folderze telefonu. Po wdrożeniu należy pobrać kopię JSON i sprawdzić jej obecność.

## Testy
Przed publikacją na produkcję uruchomić:
- `node release-tests/np21-prod-safety.mjs`
- `node release-tests/np-v2-safety.mjs`
- `npm test`
- `node release-tests/np-v2-production-acceptance.mjs` (Chromium)
Testy przeglądarkowe używają wyłącznie danych fikcyjnych na `localhost`. Testują też przywrócenie z przykładowej kopii JSON i ochronę nieczytelnego localStorage.

## Odbiór na telefonie
1. Zamknij i otwórz zainstalowany „Mój Bilans” po zakończonej publikacji. Nie odinstalowuj PWA.
2. Sprawdź dotychczasowe wpisy, cele, pomiary, historię i lokalne kopie.
3. Dodaj wpis i sprawdź status zapisu.
4. Ustawienia → Bezpieczeństwo danych → Sprawdź integralność ostatniej kopii.
5. Pobierz kopię JSON i upewnij się, że plik rzeczywiście jest w Pobrane.
