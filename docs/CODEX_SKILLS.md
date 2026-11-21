# Skills Codex — Mój Bilans

Te pliki to **lokalne umiejętności Codex**. Są dostarczane z repozytorium w katalogu `.agents/skills/` i nie wymagają płatnej usługi, uruchamiania instalatora ani tworzenia tokenów API.

## Co jest dostępne
| Skill | Kiedy używać |
| --- | --- |
| `pwa-design` | Zmiany wyglądu, UX, dostępności i responsywności — Codex dobiera automatycznie, gdy temat pasuje. |
| `pwa-motion` | Animacje, timery, sygnały i mikrointerakcje — automatycznie, gdy temat pasuje. |
| `pwa-data-safety` | Zapis, import/eksport, odzyskiwanie danych i offline — automatycznie przy takich zmianach. |
| `prototype` | Porównanie 2-3 wariantów interfejsu — wyłącznie na wyraźne polecenie. |
| `pick-ui-library` | Wybór biblioteki do wykresów, powiadomień itp. — wyłącznie na polecenie. |
| `review-animations` | Szczegółowy audyt animacji i dźwięku — wyłącznie na polecenie. |

Przykładowe polecenia w nowej sesji Codex otwartej dla tego repozytorium:

- `Popraw ekran wyboru ćwiczeń, użyj $pwa-design i zachowaj aktualne zapisy.`
- `Użyj $prototype i porównaj trzy wersje tego ekranu, niczego nie publikuj.`
- `Użyj $review-animations i oceń działanie timera przerw bez zmian w kodzie.`
- `Użyj $pick-ui-library i wybierz sposób realizacji wykresu bez dodatkowych zależności, jeśli to możliwe.`

**Uwaga:** w Codex umiejętności wywołuje się zwykle składnią `$nazwa`; nie należy traktować wcześniejszych skrótów `/prototype` itd. jako pewnych poleceń Codex.

## Uruchomienie
1. Po zatwierdzeniu PR scal go do `main` lub uruchom Codex na gałęzi z konfiguracją.
2. Otwórz nową sesję Codex dla tego repozytorium.
3. Poproś Codex o wypisanie wykrytych repo-local skills lub wskaż konkretny skill przez `$pwa-design`.
4. Wykonaj małe zadanie testowe **bez publikacji** i sprawdź, czy Codex odczytał `AGENTS.md` i właściwy `SKILL.md`.

## Zakres i ograniczenia
- To sześć własnych, niewielkich skills dopasowanych do istniejącej PWA, **nie kopie** wszystkich zewnętrznych pakietów ze wcześniejszej listy.
- Repozytorium nie zawiera zewnętrznego kodu skills, instalatorów ani zależności wymagających uruchomienia skryptów z internetu.
- Samo dodanie plików konfiguracyjnych nie zmienia aplikacji pod adresem https://durart.github.io/moj-bilans/.
- Działanie automatycznego doboru umiejętności należy potwierdzić w rzeczywistej sesji Codex; kontrola struktury plików nie jest równoznaczna z wykonaniem takiego testu.
