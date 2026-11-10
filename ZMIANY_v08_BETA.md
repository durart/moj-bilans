# Mój Bilans v0.8 BETA — owoce i warzywa (wersja robocza)

## Względem poprzedniej v0.8 BETA

- Dodano 37 owoców oraz 49 warzyw/roślin strączkowych, razem 86 nowych lub zastępujących pozycje rekordów.
- Sześć wcześniej zapisanych, uproszczonych owoców/warzyw zastąpiono pozycjami z nowego modułu, aby uniknąć dubli. Cała baza podstawowa liczy teraz **115** rekordów (wcześniej 35).
- Kalorie, B/T/W, błonnik, synonimy, postać produktu, oznaczenie źródła oraz liczby na 100 g części jadalnej.
- Jedna wyszukiwarka; produkty OFF, lokalne produkty podstawowe i nowy moduł mają wspólną listę. Sklepy nadal są tylko opcjonalnym filtrem.
- Buforowanie offline nowego modułu, nowy identyfikator pamięci Service Workera.
- Pojawił się opis ograniczeń: wartości **orientacyjne**, a węglowodany są szacunkiem bez błonnika na podstawie makro USDA.

## Bez zmian

Dziennik, cele, masa i pomiary, edycja gramatury, zapisywanie posiłków, kopie JSON na urządzeniu i przywracanie. Starsze wpisy nie są przeliczane.

## Status

**BETA — bez wdrożenia Netlify.** Logika modułów: 21/21 testów. Nie udało się wykonać testów klikanych w przeglądarce środowiska ze względu na blokadę `localhost`. Pełna walidacja źródłowych liczb dla wszystkich 86 pozycji jest jeszcze do wykonania.
