---
description: "Task list for 001-wifi-security-spa implementation"
---

# Tasks: Интерактивная методичка по безопасности Wi-Fi (WPA2/WPA3/Hashcat 22000)

**Input**: Design documents from `/specs/001-wifi-security-spa/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Включены ТОЛЬКО юнит-тесты криптокорректности против эталонных
векторов — это обязательный quality gate конституции (техстандарт, FR-017,
SC-007, research.md R7). Широкие UI/E2E-тесты не генерируются (спецификацией не
запрошены).

**Organization**: Задачи сгруппированы по user story. Порядок фаз реализации
следует явному запросу пользователя: Фаза 2 = WPA2 (US1, MVP), Фаза 3 = WPA3
(US3), Фаза 4 = Hashcat (US2). Метки `[US1]/[US2]/[US3]` сохраняют трассировку к
приоритетам spec.md (US1=P1, US2=P2, US3=P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Можно выполнять параллельно (разные файлы, нет незавершённых зависимостей)
- **[Story]**: К какой user story относится задача (US1, US2, US3)
- Точные пути к файлам указаны в каждой задаче

## Path Conventions

Одностраничное приложение Angular (фронтенд), корень репозитория. Пути из
`plan.md` → Project Structure: `src/app/core/`, `src/app/components/`, `tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Инициализация проекта и безопасная установка зависимостей

- [X] T001 Инициализировать проект Angular 21 (standalone-компоненты, signals) в корне репозитория — `package.json`, `angular.json`, `src/main.ts`, `src/app/app.ts`
- [X] T002 [P] Создать защитный `.npmrc` в корне репозитория: `ignore-scripts=true`, `min-release-age=7` (значение в ДНЯХ), `save-exact=true`, `audit=true`, `fund=false` (research.md R3, quickstart.md Шаг 1)
- [X] T003 Зафиксировать точные версии зависимостей в `package.json` без `^`/`~` (Angular 21.2.12, Angular CLI/build 21.2.10, Tailwind CSS 4.3.0, `@noble/curves`/`@noble/hashes` 2.2.0, RxJS 7.8.2, TypeScript 5.9.3 — все выдержаны >7 дней), установить и закоммитить `package-lock.json` (research.md R4)
- [X] T004 [P] Подключить Tailwind CSS v4 (CSS-first конфигурация) в `src/styles.css` и в build-конфигурацию `angular.json`
- [X] T005 [P] Настроить строгий TypeScript и поддержку Web Worker (`tsconfig.json`, `tsconfig.worker.json`, `angular.json`)
- [X] T006 [P] Настроить встроенный тест-раннер Angular 21 (на базе Vitest) и создать каталог `tests/vectors/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Базовый UI (сплит-панель), реактивный стейт RxJS с `debounceTime`,
переиспользуемые компоненты и каркас криптодвижка. Соответствует Фазе 1 запроса
пользователя.

**⚠️ CRITICAL**: Ни одна user story не может стартовать до завершения этой фазы.

- [X] T007 Описать доменные модели в `src/app/core/models.ts`: `NetworkScenario`, `ModuleOverride`, `Module`, `VisualizationStep`, `DataFlow`, `CryptoArtifact`, `Dictionary`, `AttackType`, `CapturedDump`, `AttackProgress` (data-model.md §1–8)
- [X] T008 [P] Реализовать hex-утилиты в `src/app/core/crypto/hex.ts` (bytes↔hex, разбор MAC-адресов, форматирование дампов)
- [X] T009 [P] Реализовать `ScenarioStateService` в `src/app/core/state/scenario-state.service.ts`: единый сценарий (`BehaviorSubject`), per-module overrides, метод `effective(module)`, кэш вычисленных артефактов по хэшу `EffectiveScenario` — сохранение вычисленных значений при переходах между модулями и шагами (data-model.md §1, FR-010, contracts/core-services)
- [X] T010 [P] Реализовать `StepController` в `src/app/core/state/step-controller.service.ts`: `currentStep$`, `next/prev` с зажимом к границам, `canGoNext$/canGoPrev$`, авто-проигрывание play/pause/скорость с авто-остановом на последнем шаге (FR-002, FR-003, clarify Q3)
- [X] T011 Реализовать оболочку SPA со сплит-панельной вёрсткой Tailwind и навигацией между тремя модулями в `src/app/app.ts` и `src/app/app.routes.ts` (FR-001)
- [X] T012 [P] Создать переиспользуемый компонент `param-editor` в `src/app/components/shared/param-editor/`: редактируемые поля, валидация (FR-007, FR-011), поток изменений через `debounceTime(500)` (research.md R2)
- [X] T013 [P] Создать переиспользуемый компонент `tooltip` в `src/app/components/shared/tooltip/` — всплывающие подсказки простым языком (FR-004, Принцип I)
- [X] T014 [P] Создать переиспользуемый компонент `data-flow-diagram` в `src/app/components/shared/data-flow-diagram/` — SVG-схема «вход → преобразование → выход» (FR-005, Принцип II)
- [X] T015 [P] Создать переиспользуемый компонент `hex-inspector` в `src/app/components/shared/hex-inspector/` — просмотр промежуточных hex-дампов (FR-006)
- [X] T016 Создать компонент `control-panel` в `src/app/components/control-panel/`: кнопки «Шаг вперёд/назад» (неактивны на границах), play/pause, регулятор скорости (FR-002, FR-003, clarify Q3)
- [X] T017 [P] Создать каркас Web Worker и фасад `CryptoEngineService` в `src/app/core/crypto/crypto.worker.ts` и `src/app/core/crypto/crypto-engine.service.ts`: протокол сообщений с `id`/`generation`, отмена устаревших расчётов (contracts/crypto-worker, research.md R2)

**Checkpoint**: Базовый UI, стейт и каркас криптодвижка готовы — можно начинать user stories.

---

## Phase 3: User Story 1 — WPA2 4-Way Handshake (Priority: P1) 🎯 MVP

**Запрос пользователя**: Фаза 2 — WPA2 крипто-сервис и визуальный плеер
4-way handshake с пошаговой анимацией.

**Goal**: Новичок пошагово проходит цепочку «пароль → PMK → PTK → MIC» с
подсказками, схемами потоков данных и hex-инспекцией.

**Independent Test**: Открыть Модуль 1, пройти все шаги кнопками «вперёд/назад» и
авто-проигрыванием, изменить параметры без фризов, сверить PMK/PTK/MIC с
эталонными векторами.

### Tests for User Story 1 (криптокорректность — обязательный gate конституции) ⚠️

- [X] T018 [P] [US1] Создать эталонные тестовые векторы WPA2 (PMK, PTK, MIC) в `src/app/core/crypto/wpa2.vectors.ts` (research.md R7; перенесено из `tests/` — тест-раннер Angular 21 ищет файлы только в `src/`)

### Implementation for User Story 1

- [X] T019 [US1] Реализовать криптографию WPA2 в `src/app/core/crypto/wpa2.ts`: PMK через PBKDF2-HMAC-SHA1 (4096 итераций, 256 бит), PRF-512/PTK, разбиение на KCK/KEK/TK, MIC через HMAC-SHA1 (data-model.md — цепочка Модуля 1)
- [X] T020 [US1] Подключить операции WPA2 (`wpa2.pmk`, `wpa2.ptk`, `wpa2.mic`) к Web Worker в `src/app/core/crypto/crypto.worker.ts` (contracts/crypto-worker)
- [X] T021 [US1] Юнит-тесты криптографии WPA2 против векторов в `src/app/core/crypto/wpa2.spec.ts` — сверка PMK/PTK/MIC, 6/6 проходят (FR-017, SC-007)
- [X] T022 [P] [US1] Построить модель шагов WPA2 в `src/app/components/handshake-visualizer/wpa2-steps.ts`: PMK → обмен ANonce/SNonce → сборка PTK → MIC, сообщения M1–M4; каждый шаг с обязательными `tooltip` и `dataFlow` (FR-012–016, Принципы I, II)
- [X] T023 [US1] Создать компонент `handshake-visualizer` в `src/app/components/handshake-visualizer/`: пошаговый плеер, Angular Animations для передачи пакетов (Nonce/MAC), интеграция `control-panel` + `data-flow-diagram` + `hex-inspector` + `tooltip` (FR-012–016)
- [X] T024 [US1] Подключить Модуль 1 к `ScenarioStateService` и `CryptoEngineService`: редактируемые параметры, пересчёт через `debounceTime(500)`, кнопка «Пересчитать ключи», индикатор прогресса вычислений, неблокирующий UI (FR-007–010, research.md R2)
- [X] T025 [US1] Добавить валидацию ввода Модуля 1 с понятными сообщениями: пустой SSID, длина пароля 8–63, не-ASCII символы; корректная обработка нетипичных данных — совпадающие MAC-адреса AP/клиента, одинаковые nonce (FR-011, Edge Cases)

**Checkpoint**: Модуль 1 полностью функционален и тестируется независимо — это MVP.

---

## Phase 4: User Story 3 — WPA3 SAE (Dragonfly) (Priority: P3)

**Запрос пользователя**: Фаза 3 — модуль WPA3, визуализация SAE с инфографикой.

**Goal**: Пользователь видит реальный вывод PWE на P-256, обмены Commit/Confirm и
понимает, почему перехват пароля невозможен.

**Independent Test**: Открыть Модуль 2, пройти шаги SAE, увидеть блок «что видит
перехватчик» и сравнение с WPA2; сверить PWE/Commit/Confirm с эталонными векторами.

### Tests for User Story 3 (криптокорректность — обязательный gate конституции) ⚠️

- [X] T026 [P] [US3] Создать регрессионный якорь SAE (PWE/scalar/K/PMK на P-256) в `src/app/core/crypto/sae.vectors.ts` (research.md R7; перенесено из `tests/` — см. T018)

### Implementation for User Story 3

- [X] T027 [US3] Реализовать криптографию SAE в `src/app/core/crypto/sae.ts`: вывод PWE через hash-to-curve на P-256 (`@noble/curves`), фаза Commit (scalar/element), фаза Confirm, вывод PMK/KCK из K (data-model.md — цепочка Модуля 2, clarify Q1)
- [X] T028 [US3] Подключить операцию SAE (`sae.run` — единая операция обмена; EC-точки не передаются через `postMessage`, поэтому вместо трёх ops из контракта — одна) к Web Worker в `src/app/core/crypto/crypto.worker.ts`
- [X] T029 [US3] Юнит-тесты криптографии SAE в `src/app/core/crypto/sae.spec.ts` — сходимость сторон, PWE на кривой, регрессионный якорь; 6/6 проходят (FR-018, SC-007)
- [X] T030 [P] [US3] Построить модель шагов SAE в `src/app/components/sae-visualizer/sae-steps.ts`: вывод PWE, Commit, Confirm; каждый шаг с `tooltip` и `dataFlow` (FR-018)
- [X] T031 [US3] Создать компонент `sae-visualizer` в `src/app/components/sae-visualizer/`: пошаговый плеер с инфографикой, блок «что видит перехватчик», блок сравнения WPA2 ↔ WPA3 (FR-018–020)
- [X] T032 [US3] Подключить Модуль 2 к `ScenarioStateService` и `CryptoEngineService`: редактируемые параметры, `debounceTime(500)`, индикатор прогресса вычислений, неблокирующий UI; валидация ввода Модуля 2 с понятными сообщениями — формат MAC-адресов, корректность параметров P-256 (FR-007–011)

**Checkpoint**: Модули 1 и 2 работают независимо.

---

## Phase 5: User Story 2 — Симулятор Hashcat 22000 (Priority: P2)

**Запрос пользователя**: Фаза 4 — симулятор Hashcat 22000, переключатель
PMKID/EAPOL, пошаговая анимация брутфорса с красным/зелёным индикатором проверки
слов словаря.

**Goal**: Пользователь видит, как офлайн-атака перебирает мини-словарь, строит
реальные ключи из каждого слова и сравнивает хэши с перехваченным дампом.

**Independent Test**: Открыть Модуль 3, переключить PMKID/EAPOL, отредактировать
мини-словарь, запустить перебор и увидеть оба исхода — «найдено» и «не найдено».

### Tests for User Story 2 (формат и исходы — обязательный gate конституции) ⚠️

- [X] T033 [P] [US2] Создать демоданные и описание формата строки 22000 в `src/app/core/crypto/h22000.vectors.ts` (мини-словарь + формат `WPA*type*...`; перенесено из `tests/` — см. T018)

### Implementation for User Story 2

- [X] T034 [US2] Реализовать логику Hashcat 22000 в `src/app/core/crypto/hashcat22000.ts`: PMKID = HMAC-SHA1(PMK, "PMK Name"||AA||SPA), путь EAPOL через KCK/MIC, цикл перебора (реальный PBKDF2 на каждое слово), режим ускоренного перебора, сборка строки 22000 (data-model.md — цепочка Модуля 3, clarify Q2)
- [X] T035 [US2] Подключить операцию `h22000.crack` к Web Worker в `src/app/core/crypto/crypto.worker.ts`. Перебор считается целиком в воркере, UI воспроизводит его пошагово через `StepController`; режим ускоренного перебора реализован на стороне UI (FR-030)
- [X] T036 [US2] Юнит-тесты формата 22000 и исходов перебора в `src/app/core/crypto/hashcat22000.spec.ts` — оба типа атаки, исходы «найдено»/«не найдено»; 6/6 проходят (SC-006)
- [X] T037 [P] [US2] Построить модель шагов Модуля 3 в `src/app/components/hashcat-sim/hashcat-steps.ts`: вводные шаги (настройка PMKID/EAPOL), шаги перебора словаря, шаг сборки и пояснения строки 22000; каждый шаг с обязательными `tooltip` и `dataFlow` (FR-004, FR-005, FR-027, Принцип II)
- [X] T038 [P] [US2] Создать компонент-переключатель типа атаки (PMKID ↔ EAPOL) в `src/app/components/hashcat-sim/attack-switch/`: меняет отображаемый путь данных и набор требуемых полей (FR-021–023, FR-028)
- [X] T039 [P] [US2] Создать редактор мини-словаря в `src/app/components/hashcat-sim/dictionary-editor/`: добавление/удаление слов, отдельное поле «настоящего» пароля сценария (FR-024, data-model.md §5)
- [X] T040 [US2] Создать компонент `hashcat-sim` в `src/app/components/hashcat-sim/`: пошаговый плеер на модели шагов из T037, анимация брутфорса, красный/зелёный индикатор по каждому слову, исход «найдено»/«не найдено», вывод и пояснение строки 22000, явная образовательная пометка; интеграция `control-panel` + `data-flow-diagram` + `hex-inspector` + `tooltip` (FR-025–029, Принцип V)
- [X] T041 [US2] Подключить Модуль 3 к `ScenarioStateService` и `CryptoEngineService`: построение `CapturedDump` из сценария, переключатель режима ускоренного перебора, неблокирующий перебор, отмена при изменении входных данных; валидация ввода Модуля 3 с понятными сообщениями — формат MAC-адресов, граничные значения словаря (FR-008–011, FR-030)

**Checkpoint**: Все три модуля независимо функциональны.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Финальная проверка по конституции и доводка

- [X] T042 [P] Проверить quality gates конституции по `quickstart.md`: 18/18 криптотестов зелёные; 100% криптошагов несут подсказку и схему потока (гарантировано типом `VisualizationStep`); образовательная пометка Модуля 3 на месте
- [X] T043 [P] `npm audit` — 0 уязвимостей; `npm audit signatures` — 484 подписи проверены; 5 зависимостей объявляют install-скрипты — заблокированы `ignore-scripts=true` (research.md R3)
- [X] T044 [P] Архитектура отзывчивости подтверждена: все криптовычисления — в Web Worker, ввод проходит `debounceTime` (500/400 мс); UI-поток не блокируется (SC-003, FR-008). Визуальная проверка кадров — вручную через `npm start`. Accessibility — вне границ MVP (отложено в clarify)
- [X] T045 Сквозная проверка по `quickstart.md`: `npm ci` / `npm audit` / `npm test` / `npm run build` — все зелёные; прод-сборка в `dist/wifi-security-spa` собрана
- [X] T046 [P] Вычитка подсказок выполнена: тексты на простом русском, по схеме «зачем → что → как», без неопределяемого жаргона (Принцип I). Рубрикатор наглядности (Принцип III, SC-008): (а) редактируемые параметры + пошаговый плеер + авто-проигрывание; (б) схема потока данных на каждом криптошаге; (в) hex-инспекция на каждом шаге; (г) простые формулировки — все пункты выполнены
- [X] T050 [P] Адаптивная вёрстка оболочки под мобильные экраны: одноколоночная раскладка на узких экранах, сворачиваемая панель параметров, перенос вкладок навигации (`src/app/app.ts`)
- [X] T051 [P] Углубление наглядности: панели «Теория» со ссылками на RFC, развёрнутые описания и разбор терминов на каждом шаге, формулы; анимации — летящие пакеты в сцене «точка доступа ↔ клиент» и анимированная схема потока данных

---

## Phase 7: Запланированные доработки (Deferred Refinements)

**Purpose**: Уточнения, вынесенные за рамки текущих инкрементов; требуют
отдельного сфокусированного прохода `/speckit-implement`.

- [X] T047 [US3] PWE выводится методом hash-to-curve RFC 9380 (`P256_XMD:SHA-256_SSWU_RO_` — стандартизованный примитив метода IEEE 802.11 SAE-H2E) с явным domain-separation tag в `src/app/core/crypto/sae.ts`
- [X] T048 [US3] Официальные тест-векторы RFC 9380 (Appendix J.1.1, hash-to-curve P-256) получены из репозитория CFRG и встроены в `src/app/core/crypto/sae.vectors.ts` как внешний эталон
- [X] T049 [US3] `sae.spec.ts`: примитив hash-to-curve сверяется побайтово с официальными векторами RFC 9380 (2/2 проходят); FR-018 и SC-007 обновлены до строгой формулировки. Остаток: побайтовая сверка обёртки pwd-seed против собственных annex-векторов IEEE 802.11 — несвободный источник, вне охвата

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Без зависимостей — стартует сразу
- **Foundational (Phase 2)**: Зависит от Setup — БЛОКИРУЕТ все user stories
- **User Story 1 (Phase 3)**: Зависит от Foundational — MVP, без зависимостей от других историй
- **User Story 3 (Phase 4)**: Зависит от Foundational — независима от US1 (порядок выбран по запросу пользователя)
- **User Story 2 (Phase 5)**: Зависит от Foundational — независима; переиспользует PMK-логику из `wpa2.ts` (T019), поэтому планируется после US1
- **Polish (Phase 6)**: Зависит от завершения всех нужных user stories

### User Story Dependencies

- **US1 (P1)** — стартует после Phase 2; зависимостей от других историй нет
- **US3 (P3)** — стартует после Phase 2; зависимостей от других историй нет
- **US2 (P2)** — стартует после Phase 2; функционально переиспользует `wpa2.ts` (PMK) — рекомендуется после US1

### Within Each User Story

- Эталонные векторы → реализация крипто → подключение к воркеру → юнит-тесты
- Модель шагов → компонент-визуализатор → подключение к стейту/движку → валидация

---

## Parallel Opportunities

- **Setup**: T002, T004, T005, T006 — параллельно после T001/T003
- **Foundational**: после T007 — параллельно T008, T009, T010, T017; параллельно T012, T013, T014, T015
- **US1**: T018 и T022 — параллельно
- **US3**: T026 и T030 — параллельно
- **US2**: T033, T037, T038, T039 — параллельно
- **Polish**: T042, T043, T044, T046 — параллельно

### Parallel Example: Foundational shared-компоненты

```bash
# После T007 (модели) запускаются параллельно:
Task: "T012 param-editor in src/app/components/shared/param-editor/"
Task: "T013 tooltip in src/app/components/shared/tooltip/"
Task: "T014 data-flow-diagram in src/app/components/shared/data-flow-diagram/"
Task: "T015 hex-inspector in src/app/components/shared/hex-inspector/"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup
2. Phase 2: Foundational (КРИТИЧНО — блокирует всё)
3. Phase 3: User Story 1 — WPA2 4-Way Handshake
4. **STOP и ВАЛИДАЦИЯ**: проверить Модуль 1 независимо (векторы зелёные, нет фризов)
5. Это уже самостоятельный полезный продукт

### Incremental Delivery

1. Setup + Foundational → каркас готов
2. + User Story 1 (WPA2) → тест → демо (MVP!)
3. + User Story 3 (WPA3 SAE) → тест → демо
4. + User Story 2 (Hashcat 22000) → тест → демо
5. Polish → финальная сверка с конституцией

---

## Notes

- **[P]** = разные файлы, нет незавершённых зависимостей
- Метка **[Story]** связывает задачу с user story для трассировки к spec.md
- Порядок Фаз 4/5 (WPA3 раньше Hashcat) задан явным запросом пользователя и
  отличается от приоритета spec.md (US2=P2 раньше US3=P3) — это намеренно
- Каждый криптошаг ОБЯЗАН иметь подсказку + схему потока данных + hex-инспекцию
  (Принципы I, II конституции — проверяется в T042)
- Тяжёлые вычисления — строго в Web Worker; UI-поток не блокируется (Принцип IV)
- Установка зависимостей — только с защитным `.npmrc` и через `npm ci` (research.md R3)
- Коммит после каждой задачи или логической группы
