# Mój Bilans — v2.2 OCR, prototyp izolowany

Podgląd po publikacji: https://durart.github.io/moj-bilans/np22-ocr/

Funkcje: fotografia z aparatu lub galerii, obrót i kontrast, lokalny OCR Tesseract.js 7.0.0 (języki polski i angielski), parser kcal i B/T/W na 100 g lub 100 ml, edycja odczytu, wybór porcji (np. 20 g), przeliczenie i opcjonalny zapis tylko do testowego dziennika.

Izolacja: zdjęcie jest przetwarzane w przeglądarce. Prototyp używa tylko klucza localStorage moj-bilans-np22-ocr-tests-v1. Nie czyta i nie modyfikuje klucza produkcyjnego moj-bilans-v1 ani bazy kopii w IndexedDB. Brak własnego Service Workera.

Biblioteka OCR, WebAssembly i modele językowe są pobierane z publicznych serwerów CDN przy pierwszym użyciu. Zdjęcie nie jest przesyłane do płatnego API. Zewnętrzny kod jest wykonywany lokalnie. Funkcja OCR wymaga internetu przy pierwszym użyciu; pełna obsługa offline i dokładność na rzeczywistych etykietach pozostają do sprawdzenia.

Parser nie uzupełnia fikcyjnych zer, sygnalizuje brak danych lub podejrzane kolumny. Zawsze sprawdź OCR z oryginalnym opakowaniem. Zapisy są wyłącznie testowe, bez synchronizacji z produkcją.

## v2.2.2 — osobny wybór aparatu i załącznika
Rozdzielono dwie kontrolki: aparat (z capture=environment) i wybór istniejącego zdjęcia z galerii/plików (bez capture). Obie ścieżki mają wspólny handler, czyszczą wartość inputu aby możliwy był ponowny wybór tej samej fotografii, i nie korzystają z produkcyjnego magazynu danych. Testy UI sprawdzają dostępność obu opcji i natywny dialog wyboru pliku.
