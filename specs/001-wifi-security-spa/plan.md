# Implementation Plan: Интерактивная методичка по безопасности Wi-Fi (WPA2/WPA3/Hashcat 22000)

**Branch**: `001-wifi-security-spa` | **Date**: 2026-05-20 (обновлено 2026-10-21) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-wifi-security-spa/spec.md`

## Summary

Интерактивное одностраничное веб-приложение (SPA) — учебная методичка: справочник
WPA2/WPA3 и три модуля — WPA2 4-Way Handshake, WPA3 SAE (Dragonfly) и симулятор
Hashcat (режим 22000) с переключателем атак PMKID/EAPOL. Технический подход:
Angular 21 + Tailwind CSS v4; все криптовычисления — внутри Web Worker на нативном
WebCrypto API (PBKDF2, HMAC, AES-CBC для CMAC, AES-KW) и `@noble/curves` (сложение и
умножение точек P-256), что гарантирует отзывчивый UI-поток. Реализация следует
IEEE 802.11-2020 (§12.4 SAE, §12.7 ключи и 4-Way Handshake) и проверяется
официальными тест-векторами (research.md R7, R8). Управление шагами — RxJS
`BehaviorSubject` + Angular signals, с `debounceTime(500)` на полях и кнопкой
«Пересчитать ключи». Контент — на трёх языках (UA/EN/RU). Цепочка поставок npm
защищена от продолжающейся кампании Shai-Hulud (см. research.md R3).

**Ревизия 2026-10-21**: криптоядро переписано по стандарту (SAE H&P + H2E,
полное 4-Way M1–M4 для AKM PSK и SAE); модули расширены до 11 (WPA2) и 13 (WPA3)
шагов; добавлен справочник `/guide` (research.md R9); учебные Python-скрипты
пользователя добавлены без изменений (research.md R10); оболочка переработана.

## Technical Context

**Language/Version**: TypeScript 5.9.x, Node.js 24.x LTS (только для сборки/тулинга)
**Primary Dependencies**: Angular 21.2.12 (CLI/build 21.2.10), Tailwind CSS 4.3.0, RxJS 7.8.2 (peer от Angular), `@noble/curves` 2.2.0, `@noble/hashes` 2.2.0
**Storage**: N/A — состояние только в памяти; данные не сохраняются между сессиями и не покидают браузер
**Testing**: Встроенный в Angular 21 тест-раннер (на базе Vitest) — 43 юнит-теста криптокорректности против эталонных векторов (IEEE 802.11-2020 Annex J.10, IEEE 802.11i Annex H, RFC 4493/3394/5869, реальная строка Hashcat 22000) и логики блока «Вычисление»; ручная и Playwright-проверка вёрстки (360–1280 px, светлая/тёмная тема)
**Target Platform**: Современные настольные и мобильные браузеры (Chrome/Edge/Firefox/Safari) с поддержкой WebCrypto (включая AES-KW), Web Workers, BigInt, ES2022
**Project Type**: Одностраничное веб-приложение (только фронтенд, без бэкенда)
**Performance Goals**: Отклик ввода < 100 мс без пропуска кадров (SC-003); UI-поток 60 fps во время PBKDF2(4096) и перебора словаря; debounceTime(500) на текстовых полях
**Constraints**: Полностью клиентское, офлайн-приложение; нет сетевых вызовов в рантайме; данные пользователя не передаются наружу; тяжёлые вычисления строго вне UI-потока
**Scale/Scope**: справочник (14 глав) + 3 модуля (11 / 13 / переменное число шагов), 3 языка, мини-словарь — единицы–десятки слов; целевая аудитория — абсолютные новички

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Конституция v1.0.0 — проверка по пяти принципам и техническим стандартам:

| # | Принцип | Статус | Как обеспечивается планом |
|---|---------|--------|---------------------------|
| I | Понятность для новичка (NON-NEGOTIABLE) | ✅ PASS | Выделенный слой `tooltip`/пояснений; компонент `data-flow-diagram`; простой текст (UA/EN/RU) в порядке «зачем → что → как»; разбор терминов на каждом шаге; справочник с определениями при первом употреблении |
| II | Визуальные подсказки и схемы потоков данных (NON-NEGOTIABLE) | ✅ PASS | Каждый шаг = модель `VisualizationStep` с обязательными полями tooltip + схема потока; байтовые диаграммы кадров EAPOL-Key и Commit; Angular Animations; hex-инспектор на каждом шаге; в справочнике — диаграмма последовательности, дерево ключей, полоса полей кадра |
| III | Превосходство над эталонами | ✅ PASS | Интерактив (редактируемые параметры, авто-проигрывание, hex-инспекция) выше уровня TOTP_demo/rsa16-edu/rust_aes128_demo; сверка наглядности — quality gate |
| IV | Неблокирующий UI и редактируемость (NON-NEGOTIABLE) | ✅ PASS | Web Worker + асинхронный WebCrypto + `debounceTime(500)` + кнопка «Пересчитать ключи» + отмена устаревших расчётов (research.md R2); все параметры редактируемы |
| V | Строго образовательная симуляция (NON-NEGOTIABLE) | ✅ PASS | Модуль 3 — только математика на введённых пользователем данных; нет сети, нет захвата трафика, нет интеграции с реальным Hashcat; явная образовательная пометка (FR-029) |
| — | Техстандарт: браузерное офлайн-приложение | ✅ PASS | SPA без бэкенда; нет рантайм-сети |
| — | Техстандарт: криптокорректность + эталонные векторы | ✅ PASS | Реализация по IEEE 802.11-2020; юнит-тесты против официальных векторов Annex J.10, 802.11i Annex H, RFC 4493/3394/5869 и реальной строки 22000 (research.md R7, R8) |
| — | Техстандарт: формат 22000 | ✅ PASS | Строки `WPA*01*…***` и `WPA*02*…*00` повторяют формат официальных примеров Hashcat; кадр M2 побайтно совпадает с реальным (data-model §7) |
| — | Техстандарт: Web Workers для тяжёлых вычислений | ✅ PASS | Слой `core/crypto` целиком работает в воркере |
| — | Техстандарт: минимальные прозрачные зависимости, WebCrypto где возможно | ✅ PASS | Runtime-зависимости: Angular, Tailwind, `@noble/*`; `crypto-js` исключён (research.md R1) |

**Результат**: все гейты пройдены. Нарушений NON-NEGOTIABLE нет. Одно сознательное
отклонение от пользовательского ввода (отказ от `crypto-js`) зафиксировано в
Complexity Tracking — оно усиливает соответствие конституции, а не нарушает её.

*Post-Design re-check (после Phase 1)*: артефакты Phase 1 (data-model, contracts,
quickstart) не вводят новых зависимостей и не нарушают принципов — **гейт повторно
пройден**.

*Re-check ревизии 2026-10-21*: реализация по IEEE 802.11-2020, справочник и
переработка оболочки не добавили ни одной npm-зависимости (CMAC и AES Key Wrap —
на WebCrypto); офлайн-работа сохранена (нет внешних шрифтов и CDN); образовательная
пометка Модуля 3 на месте — **гейт пройден**.

## Project Structure

### Documentation (this feature)

```text
specs/001-wifi-security-spa/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — технические решения
├── data-model.md        # Phase 1 output — сущности и криптоцепочки
├── quickstart.md        # Phase 1 output — запуск и безопасная установка
├── contracts/           # Phase 1 output — контракты сервисов и Web Worker
│   ├── crypto-worker.contract.md
│   └── core-services.contract.md
├── checklists/
│   └── requirements.md  # Чеклист качества спецификации
└── tasks.md             # Phase 2 output (/speckit-tasks — НЕ создаётся этой командой)
```

### Source Code (repository root)

Одностраничное приложение Angular (только фронтенд). Структура папок следует
указанию пользователя (`core/crypto`, `components/handshake-visualizer`,
`components/hashcat-sim`, `components/control-panel`).

```text
.npmrc                          # ignore-scripts, min-release-age, audit (research.md R3)
.gitattributes                  # python/*.py хранятся байт-в-байт (без EOL-конверсии)
package.json                    # точные версии без ^/~; package-lock.json коммитится
angular.json
python/                         # учебные скрипты пользователя — без изменений (R10)
├── wpa2_handshake.py
├── wpa3_sae.py
└── README.md                   # запуск и отличия от стандарта

src/
├── index.html                  # мета, favicon, тема до старта (без вспышки)
├── styles.css                  # Tailwind v4 + оверрайды тёмной темы, фокус, reduced-motion
└── app/
    ├── app.ts / app.routes.ts / app.config.ts   # оболочка, /guide по умолчанию
    ├── core/
    │   ├── models.ts                    # NetworkScenario (+GTK/IGTK), VisualizationStep, …
    │   ├── theory.ts                    # панели «Теория» модулей по языкам
    │   ├── crypto/                      # криптодвижок (в Web Worker)
    │   │   ├── primitives.ts            # HMAC, HKDF, KDF-SHA-256, PRF-SHA1, AES-CMAC, AES-KW
    │   │   ├── eapol.ts                 # кадр EAPOL-Key, Key Information, RSNE/RSNXE, KDE, паддинг
    │   │   ├── fourway.ts               # 4-Way M1–M4 для AKM PSK и SAE, взаимные проверки
    │   │   ├── wpa2.ts                  # PBKDF2/PMK, PTK, M2, MIC, PMKID, runWpa2
    │   │   ├── sae.ts                   # SAE: H&P, H2E (SSWU), Commit, проверка, ключи, Confirm
    │   │   ├── p256-params.ts           # p и r для подписей в UI-потоке
    │   │   ├── hashcat22000.ts          # учебный перебор, строки 22000
    │   │   ├── crypto.worker.ts         # операции wpa2.run / sae.run / h22000.crack
    │   │   ├── crypto-engine.service.ts # фасад над воркером
    │   │   ├── hex.ts
    │   │   └── *.vectors.ts, *.spec.ts  # эталонные векторы и тесты (раннер ищет в src/)
    │   ├── guide/                       # модель и контент справочника (ru/uk/en), inline-разметка
    │   ├── i18n/                        # тексты UI, шагов, теории, валидации; LocaleService;
    │   │                                # fillCalc (колонки, «байт»); LocalizedTitleStrategy
    │   ├── state/                       # ScenarioStateService, StepController
    │   └── theme.service.ts
    └── components/
        ├── guide/                       # страница справочника, блоки, диаграммы
        ├── handshake-visualizer/        # Модуль 1 (wpa2-steps, frame-view, валидация)
        ├── sae-visualizer/              # Модуль 2 (sae-steps, переключатель H2E/H&P)
        ├── hashcat-sim/                 # Модуль 3 (attack-switch, dictionary-editor)
        ├── control-panel/               # шаг вперёд/назад, play/pause, скорость
        └── shared/                      # step-card, byte-grid, data-flow-diagram, hex-inspector,
                                         # packet-flow, theory-panel, tooltip, param-editor
```

**Structure Decision**: Выбрана структура одиночного фронтенд-проекта Angular
(бэкенда нет). Папки `core/crypto` и `components/*` соответствуют явному указанию
пользователя. Слой `core/state` добавлен для единого сценария и контроллера шагов
(clarify Q3/Q4). `components/shared` выделен, чтобы tooltip, схема потока данных и
hex-инспектор переиспользовались всеми тремя модулями (Принципы I, II). Каталог
`tests/` из исходного плана не используется: тест-раннер Angular 21 ищет спеки
только в `src/`, поэтому векторы и тесты лежат рядом с кодом. Криптоядро разделено
на примитивы, кадры EAPOL-Key и общее 4-Way (`fourway.ts`), которое переиспользуют
WPA2 и SAE. Тексты шагов разнесены по языкам (`*-text.{ru,uk,en}.ts`), чтобы
переводы делались независимо от кода.

## Complexity Tracking

> Заполняется только при отклонениях, требующих обоснования.

| Violation / Отклонение | Why Needed | Simpler Alternative Rejected Because |
|------------------------|------------|--------------------------------------|
| Отказ от `crypto-js`, который пользователь разрешил опционально | `crypto-js` снят с поддержки автором; версии < 4.2.0 несли CVE-2023-46233 (слабый PBKDF2). Конституция требует криптопримитивы из проверяемых источников | Оставить `crypto-js` «для быстрых операций» — отклонено: WebCrypto (нативный, проверяемый, асинхронный) полностью закрывает эти операции без неподдерживаемой зависимости |
| Добавление зависимости `@noble/curves` + `@noble/hashes` | WebCrypto не предоставляет арифметику точек эллиптической кривой, необходимую для реального вывода PWE и обменов Commit/Confirm в WPA3 SAE (clarify Q1 — выбрана полная криптоточность) | Считать SAE только концептуально — отклонено пользователем в clarify Q1; реализовать EC-арифметику вручную — отклонено: выше риск ошибок, ниже доверие, чем у audited-библиотеки |
| Angular 21, а не «самый свежий» Angular 22 | Карантин/«отлёжка» против волн Shai-Hulud (research.md R3): свежевыпущенный мажор не прошёл период наблюдения | Брать Angular 22 сразу при выходе — отклонено: противоречит явному запросу пользователя проверить версии и не наступить на цепочку поставок |
| Собственный код SSWU и цикла H&P поверх `@noble/curves` | Модуль должен показывать промежуточные значения (u, x1/x2, квадратичность, итерации цикла), которые готовые функции библиотеки не отдают | Использовать `mapToCurveSimpleSWU` из `@noble/curves` — отклонено для отображения, но оставлено как независимая проверка в `sae.spec.ts`; итог сверен с Annex J.10 |
| AES-128-CMAC через AES-CBC WebCrypto, без новой зависимости | WebCrypto не предоставляет CMAC, а он нужен для MIC при AKM SAE | Добавить `@noble/ciphers` — отклонено: лишняя зависимость (R3); реализация на 30 строк проверена векторами RFC 4493 |
