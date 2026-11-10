# Mój Bilans v0.8 BETA — wspólna baza żywności + owoce i warzywa offline

**Wersja testowa, bez publikacji produkcyjnej.** Kontynuacja v0.7.1 oraz poprzedniej v0.8 BETA.

## Najważniejsze zmiany

- **Jedna wyszukiwarka**: istniejące produkty podstawowe, nowe owoce i warzywa, podręczny katalog Open Food Facts (OFF), wyniki OFF online — bez osobnej zakładki Biedronka.
- Dodano **37 owoców** i **49 warzyw/roślin strączkowych** do pliku `owoce-warzywa.mjs`. Razem z pozostałymi wpisami baza podstawowa zawiera **115 pozycji**. Dodatkowy ręcznie pobierany katalog OFF to inny zbiór (maks. 100 produktów w pamięci przeglądarki).
- Uwzględniono polskie nazwy i synonimy, np. `mandarynki`, `jablka`, `pomarancze`, `brokuly`, `kalarepa`, `ziemniaki`.
- Wszystkie nowe dane są **orientacyjne na 100 g części jadalnej**. Skórka mandarynki i pomarańczy czy niejadalna część banana nie wliczają się do wagi porcji. Sałata, papryka, pieczarki itd. mają wskazaną postać; produkty gotowane są odróżnione od surowych tam, gdzie ma to znaczenie.
- Węglowodany (`W`) dla nowych pozycji stanowią **przybliżenie węglowodanów przyswajalnych**: `węglowodany całkowite USDA - błonnik`, tak żeby nie zaliczać błonnika do W jak na amerykańskich tablicach. Błonnik nie jest doliczany drugi raz. Kalorie pozostają danymi referencyjnymi, a nie wynikiem przeliczenia 4/4/9.
- W wynikach nowe produkty mają oznaczenie **Owoc · baza lokalna** / **Warzywo · baza lokalna** oraz ostrzeżenie, że wartości są orientacyjne.
- Katalog lokalny działa bez internetu i nie wymaga konta, klucza API ani subskrypcji.

## Źródło danych i granice wiarygodności

Punktem odniesienia są standardowe tabele składu produktów, m.in. **USDA FoodData Central / Standard Reference Legacy**, https://fdc.nal.usda.gov/ (CC0/public domain). **Liczby w tym pakiecie są ręcznie zestawione i zaokrąglone, NIE są zweryfikowanym eksportem każdego rekordu USDA z osobnym FDC ID.** Nie są też danymi z etykiety konkretnego produktu. Mogą występować rozbieżności między odmianami, dojrzałością, techniką przygotowania i źródłem tabelarycznym. Jeżeli ważna jest dokładność, porównaj z etykietą lub popraw pola przed dodaniem.

Osobne źródło — produkty markowe OFF — ma licencję ODbL, a ich rekordy nie są nazywane „sprawdzonymi z etykietą”, tylko automatycznie filtrowanymi. https://openfoodfacts.org/data

## Zgodność i bezpieczeństwo

- Format Twoich danych (`moj-bilans-v1`) nie zmienił się. **Nie nadpisujemy starych wpisów** nowymi wartościami owoców i warzyw.
- Kopie JSON na telefon oraz lokalne punkty przywracania pozostają takie jak wcześniej.
- Nowy moduł `owoce-warzywa.mjs` jest dodany do listy plików buforowanych w `sw.js`; zmieniono nazwę pamięci podręcznej Service Workera, aby zainstalowana PWA pobrała nową wersję.
- Nie zmieniano adresu, kont, autoryzacji, lokalnego klucza przechowywania ani interfejsu głównego.
- Przed jakąkolwiek publikacją **zrób lokalną kopię JSON** i sprawdź ją w plikach telefonu.

## Testy i wdrożenie

W katalogu uruchom `node test_v08_produce.mjs`. Zestaw obejmuje unikalność, sensowność makro, wyszukiwanie odmian nazw, wyszukiwanie offline, logikę porcji, zgodność formatu danych i cache Service Workera. **21 testów przeszło.**

Próba testu interfejsu na lokalnym serwerze w przeglądarce tego środowiska została zablokowana (`ERR_BLOCKED_BY_ADMINISTRATOR`). Nie oznaczamy zatem aktualizacji jako przetestowanej na Androidzie lub w rzeczywistym Open Food Facts. Plik `test_browser.py` jest tylko scenariuszem do wykonania w środowisku, w którym dostęp do `localhost` jest dozwolony.

To kompletna statyczna aplikacja PWA. Dopóki nie zdecydujesz się na publikację, zachowaj na Netlify wersję **v0.7.1**.

## Przygotowanie do GitHub

Pliki aplikacji są w katalogu głównym i mogą stanowić bazę przyszłego repozytorium. `create_data.py` i `test_v08_produce.mjs` służą do utrzymania katalogu, `DANE_OWOCE_WARZYWA.json` to przeglądalna kopia danych referencyjnych. **Nie umieszczaj w repozytorium własnych kopii zapasowych JSON z dziennikiem ani innych prywatnych danych.**

Przeniesienie hostingu na **GitHub Pages** zmienia adres strony. Dane zapisane w LocalStorage i IndexedDB **nie migrują automatycznie między domenami**; przed zmianą zrób eksport JSON i zaimportuj go w nowej lokalizacji. Samo umieszczenie kodu na GitHub bez zmiany Netlify nie zmienia adresu aplikacji.
