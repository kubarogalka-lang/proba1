# Marketing Budget & ROI Planner

Polski planer rocznego budżetu marketingowego z prognozą zysku i ważonego ROI. MVP zgodne z PRD: React 19, TypeScript, Tailwind CSS 4 i Recharts. Aplikacja działa w przeglądarce, bez backendu i konta.

## Uruchomienie

Wymagany Node.js 24 (testy korzystają z wbudowanej obsługi TypeScript) i npm 11.

```bash
cd /workspace/proba1
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --port 5173 --strictPort
```

## Weryfikacja

```bash
npm test
npm run build
npm run test:e2e
```

Testy przeglądarkowe korzystają z Chromium. Konfiguracja domyślnie wykorzystuje `/usr/bin/chromium` w środowisku chmurowym. Na innym komputerze można wskazać przeglądarkę przez `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` lub wykonać `npx playwright install chromium` i ustawić `PLAYWRIGHT_USE_BUNDLED_CHROMIUM=1`. Testy same uruchamiają serwer deweloperski, jeśli port 5173 jest wolny.

`npm run build` tworzy katalog `dist`, który można opublikować na hostingu statycznym. `npm run preview -- --port 4173 --strictPort` uruchamia lokalną kontrolę wersji produkcyjnej.

## Funkcje

- Dziesięć domyślnych kanałów, dodawanie, edycja nazw i usuwanie kategorii.
- Budżet w PLN, udziały procentowe i ROI od −100%, również powyżej 100%.
- Natychmiastowe obliczenia inwestycji, zysku/straty, zwrotu brutto i ważonego ROI.
- Ostrzeżenie o przekroczeniu 100% bez zmieniania udziałów użytkownika.
- Wykres struktury z nieprzydzieloną częścią oraz wykres zysku lub zwrotu brutto.
- Automatyczny zapis `localStorage`, eksport CSV z podsumowaniem oraz reset z potwierdzeniem.
- Responsywny interfejs i obsługa klawiaturą; tabela oraz wykres słupkowy przewijają się na małych ekranach.

Przykład początkowy z PRD daje 42 000 zł zysku, 142 000 zł zwrotu brutto i ROI 42% przy budżecie 100 000 zł. Pozostałe kategorie mają początkowo udział 0%.

ROI = suma prognozowanych zysków / suma inwestycji × 100. Przy braku inwestycji wyświetlane jest 0%. Wartości są zaokrąglane dopiero przy prezentacji lub eksporcie. Puste pola liczbowe są traktowane jako zero, a pusty lub zerowy budżet wymaga uzupełnienia przed eksportem.

Dane pozostają na tym urządzeniu. Niedostępność pamięci przeglądarki wywołuje ostrzeżenie; do zachowania wyników można użyć CSV. Reset przywraca przykład początkowy. Prognozy pochodzą wyłącznie z założeń użytkownika i powinny uwzględniać koszty uzyskania sprzedaży. PDF, konta i porównywanie scenariuszy nie należą do MVP.
