# Mój Bilans — v2.1 test bezpieczeństwa

## Testowanie
Po publikacji izolowanej kopii: https://durart.github.io/moj-bilans/np21/

## Wersja bazowa
Zbudowano z produkcyjnego commitu `033e36a834205525ea129e00165958b059ad8ba4`. Kopia działa wyłącznie w katalogu `/np21/`.

## Bezpieczeństwo
- osobny localStorage `moj-bilans-np21-v1`
- osobny IndexedDB `moj-bilans-np21-kopie-v1`
- osobne klucze Open Food Facts, katalogów i pamięci podręcznej
- osobny Service Worker `/np21/sw.js`, tylko scope `/np21/`; cache `moj-bilans-np21-cache-v1`
- manifest z oddzielnym ID / scope `./`
- produkcyjne dane i pliki w katalogu głównym nie są modyfikowane

## Funkcje 2.1
1. Status zapisu w dzienniku i w Ustawieniach: potwierdzony zapis + odczyt localStorage. Status nie oznacza wykonania kopii.
2. Fail-closed: błędna składnia lub format zapisanych danych nie uruchamia nadpisania ich pustym dziennikiem, automatycznej kopii ani eksportu zastępczego stanu.
3. Lokalne kopie w IndexedDB: odczyt weryfikujący zapis po każdej próbie oraz status najnowszej dostępnej kopii.
4. Przycisk **Sprawdź integralność ostatniej kopii**: odczyt, porównanie rozmiaru, parsowanie JSON, walidacja formatu wpisów bez przywracania. To nie jest pełna symulacja procesu przywracania.
5. Aktualizacja PWA: ręczne sprawdzanie i wyraźny przycisk odświeżenia, bez automatycznego przeładowania otwartego formularza.

## Ograniczenia
Nie da się potwierdzić programowo, że plik JSON został zapisany w folderze Pobrane — aplikacja sygnalizuje jedynie rozpoczęcie pobrania. Kopie IndexedDB nie chronią przed usunięciem danych całej witryny; niezależna kopia JSON jest nadal zalecana.

## Testy
`node np21/test_np21.mjs`, `node np21/test_browser_np21.mjs` (Chromium w GitHub Actions), `npm test` (regresja produkcyjnego katalogu).

## Odbiór użytkownika
Zapisz fikcyjny posiłek w `/np21/`. Sprawdź potwierdzenie zapisu, przejdź do Ustawień, użyj „Sprawdź integralność ostatniej kopii”, sprawdź „Pokaż lokalne kopie”, zrestartuj aplikację, zweryfikuj offline. **Nie wgrywaj produkcyjnej kopii JSON do testowej aplikacji i nie usuwaj produkcyjnej aplikacji.**
