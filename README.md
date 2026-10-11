# Marketing Budget & ROI Planner

Polski planer rocznego budżetu marketingowego napisany w **HTML i zwykłym JavaScript**. Style są osadzone w HTML, a wykresy powstają jako SVG. Aplikacja nie używa frameworków, bibliotek, CDN ani procesu budowania.

## Uruchomienie bez instalacji

Otwórz `index.html` w nowoczesnej przeglądarce. W tym samym folderze muszą znajdować się `app.js` i `model.js`. Wszystkie funkcje działają lokalnie i bez dostępu do Internetu.

Możesz też uruchomić opcjonalny serwer statyczny, korzystając z Node.js 18 lub nowszego — nie wymaga instalacji pakietów:

```bash
cd /workspace/proba1
node scripts/serve.js --port 5173
```

`npm run dev` uruchamia ten sam serwer. Do publikacji na hostingu statycznym wystarczy przesłać **`index.html`, `app.js` i `model.js`**. Nie ma kroku kompilacji.

## Funkcje

- Dziesięć domyślnych kanałów, dodawanie, edycja nazw i usuwanie kategorii.
- Budżet w PLN, udziały procentowe i ROI od −100%, również powyżej 100%.
- Natychmiastowe obliczenia inwestycji, zysku/straty, zwrotu brutto i ważonego ROI.
- Ostrzeżenie o przekroczeniu 100% bez zmieniania udziałów użytkownika.
- Wykres kołowy z nieprzydzieloną częścią oraz wykres zysku lub zwrotu brutto, rysowane przez JavaScript jako SVG.
- Automatyczny zapis `localStorage`, eksport CSV z podsumowaniem i reset z potwierdzeniem.
- Responsywny interfejs, obsługa klawiaturą i przewijane obszary tabeli oraz wykresu na telefonie.

Przykład początkowy z PRD daje 42 000 zł zysku, 142 000 zł zwrotu brutto i ROI 42% przy budżecie 100 000 zł. Pozostałe kategorie mają początkowo udział 0%.

ROI = suma prognozowanych zysków / suma inwestycji × 100. Przy braku inwestycji wyświetlane jest 0%. Wartości są zaokrąglane dopiero przy prezentacji lub eksporcie. Puste pola liczbowe są traktowane jako zero, a pusty lub zerowy budżet wymaga uzupełnienia przed eksportem.

Zachowano klucz i format zapisu wcześniejszej wersji React (`marketing-roi-plan-v1`), więc plany zapisane pod tym samym adresem i w tej samej przeglądarce zostaną odczytane. `localStorage` jest powiązane z adresem strony. Przeniesienie aplikacji pod inny adres, port lub otwarcie jej z dysku może korzystać z osobnego magazynu; obsługa pamięci dla plików lokalnych zależy od przeglądarki. Gdy zapis jest niedostępny, aplikacja pokazuje ostrzeżenie, a obliczenia i eksport CSV nadal działają.

## Testy dla programistów

Testy obliczeń nie wymagają instalacji zależności:

```bash
node --test tests/*.test.js
```

Jedyna zależność deweloperska to Playwright, wykorzystywany wyłącznie do automatycznych testów przeglądarkowych:

```bash
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm test
npm run test:e2e
```

Testy przeglądarkowe domyślnie używają `/usr/bin/chromium` i uruchamiają własny serwer na porcie 5174. Na innym komputerze można wskazać przeglądarkę przez `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` lub wykonać `npx playwright install chromium` i ustawić `PLAYWRIGHT_USE_BUNDLED_CHROMIUM=1`. Przy lokalnej instalacji npm można użyć własnej ścieżki cache albo pominąć parametr `--cache`.

Testy obejmują obliczenia, eksport, trwałość danych, edycję, walidację, wykresy SVG, reset, układ mobilny, usuwanie wszystkich kategorii, bezpieczne wyświetlanie nazw, błędy pamięci przeglądarki oraz działanie offline przy udostępnieniu tylko trzech lokalnych plików przez mechanizm testowy. Bezpośrednia nawigacja `file://` jest zablokowana przez politykę Chromium w środowisku chmurowym, więc tego wariantu tutaj nie zweryfikowano.

Dane pozostają na urządzeniu użytkownika. Reset przywraca przykład początkowy. Prognozy pochodzą z założeń użytkownika i powinny uwzględniać koszty uzyskania sprzedaży. PDF, konta i porównywanie scenariuszy nie należą do MVP.
