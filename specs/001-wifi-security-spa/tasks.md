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

- [ ] T001 Инициализировать проект Angular 21 (standalone-компоненты, signals) в корне репозитория — `package.json`, `angular.json`, `src/main.ts`, `src/app/app.ts`
- [ ] T002 [P] Создать защитный `.npmrc` в корне репозитория: `ignore-scripts=true`, `min-release-age=10080`, `audit=true`, `fund=false` (research.md R3, quickstart.md Шаг 1)
- [ ] T003 Зафиксировать точные версии зависимостей в `package.json` без `^`/`~` (Angular 21.2.x, Tailwind CSS 4.3.x, `@noble/curves` 1.x, `@noble/hashes` 1.x), установить через `npm ci`, закоммитить `package-lock.json` (research.md R4)
- [ ] T004 [P] Подключить Tailwind CSS v4 (CSS-first конфигурация) в `src/styles.css` и в build-конфигурацию `angular.json`
- [ ] T005 [P] Настроить строгий TypeScript и поддержку Web Worker (`tsconfig.json`, `tsconfig.worker.json`, `angular.json`)
- [ ] T006 [P] Настроить встроенный тест-раннер Angular 21 (на базе Vitest) и создать каталог `tests/vectors/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Базовый UI (сплит-панель), реактивный стейт RxJS с `debounceTime`,
переиспользуемые компоненты и каркас криптодвижка. Соответствует Фазе 1 запроса
пользователя.

**⚠️ CRITICAL**: Ни одна user story не может стартовать до завершения этой фазы.

- [ ] T007 Описать доменные модели в `src/app/core/models.ts`: `NetworkScenario`, `ModuleOverride`, `Module`, `VisualizationStep`, `DataFlow`, `CryptoArtifact`, `Dictionary`, `AttackType`, `CapturedDump`, `AttackProgress` (data-model.md §1–8)
- [ ] T008 [P] Реализовать hex-утилиты в `src/app/core/crypto/hex.ts` (bytes↔hex, разбор MAC-адресов, форматирование дампов)
- [ ] T009 [P] Реализовать `ScenarioStateService` в `src/app/core/state/scenario-state.service.ts`: единый сценарий (`BehaviorSubject`), per-module overrides, метод `effective(module)` (data-model.md §1, contracts/core-services)
- [ ] T010 [P] Реализовать `StepController` в `src/app/core/state/step-controller.service.ts`: `currentStep$`, `next/prev` с зажимом к границам, `canGoNext$/canGoPrev$`, авто-проигрывание play/pause/скорость с авто-остановом на последнем шаге (FR-002, FR-003, clarify Q3)
- [ ] T011 Реализовать оболочку SPA со сплит-панельной вёрсткой Tailwind и навигацией между тремя модулями в `src/app/app.ts` и `src/app/app.routes.ts` (FR-001)
- [ ] T012 [P] Создать переиспользуемый компонент `param-editor` в `src/app/components/shared/param-editor/`: редактируемые поля, валидация (FR-007, FR-011), поток изменений через `debounceTime(500)` (research.md R2)
- [ ] T013 [P] Создать переиспользуемый компонент `tooltip` в `src/app/components/shared/tooltip/` — всплывающие подсказки простым языком (FR-004, Принцип I)
- [ ] T014 [P] Создать переиспользуемый компонент `data-flow-diagram` в `src/app/components/shared/data-flow-diagram/` — SVG-схема «вход → преобразование → выход» (FR-005, Принцип II)
- [ ] T015 [P] Создать переиспользуемый компонент `hex-inspector` в `src/app/components/shared/hex-inspector/` — просмотр промежуточных hex-дампов (FR-006)
- [ ] T016 Создать компонент `control-panel` в `src/app/components/control-panel/`: кнопки «Шаг вперёд/назад» (неактивны на границах), play/pause, регулятор скорости (FR-002, FR-003, clarify Q3)
- [ ] T017 [P] Создать каркас Web Worker и фасад `CryptoEngineService` в `src/app/core/crypto/crypto.worker.ts` и `src/app/core/crypto/crypto-engine.service.ts`: протокол сообщений с `id`/`generation`, отмена устаревших расчётов (contracts/crypto-worker, research.md R2)

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

- [ ] T018 [P] [US1] Создать эталонные тестовые векторы WPA2 (PMK, PTK, MIC) в `tests/vectors/wpa2.vectors.ts` (research.md R7)

### Implementation for User Story 1

- [ ] T019 [US1] Реализовать криптографию WPA2 в `src/app/core/crypto/wpa2.ts`: PMK через PBKDF2-HMAC-SHA1 (4096 итераций, 256 бит), PRF-512/PTK, разбиение на KCK/KEK/TK, MIC через HMAC-SHA1 (data-model.md — цепочка Модуля 1)
- [ ] T020 [US1] Подключить операции WPA2 (`wpa2.pmk`, `wpa2.ptk`, `wpa2.mic`) к Web Worker в `src/app/core/crypto/crypto.worker.ts` (contracts/crypto-worker)
- [ ] T021 [US1] Юнит-тесты криптографии WPA2 против векторов в `tests/unit/wpa2.spec.ts` — сверка PMK/PTK/MIC (FR-017, SC-007)
- [ ] T022 [P] [US1] Построить модель шагов WPA2 в `src/app/components/handshake-visualizer/wpa2-steps.ts`: PMK → обмен ANonce/SNonce → сборка PTK → MIC, сообщения M1–M4; каждый шаг с обязательными `tooltip` и `dataFlow` (FR-012–016, Принципы I, II)
- [ ] T023 [US1] Создать компонент `handshake-visualizer` в `src/app/components/handshake-visualizer/`: пошаговый плеер, Angular Animations для передачи пакетов (Nonce/MAC), интеграция `control-panel` + `data-flow-diagram` + `hex-inspector` + `tooltip` (FR-012–016)
- [ ] T024 [US1] Подключить Модуль 1 к `ScenarioStateService` и `CryptoEngineService`: редактируемые параметры, пересчёт через `debounceTime(500)`, кнопка «Пересчитать ключи», неблокирующий UI (FR-007–010, research.md R2)
- [ ] T025 [US1] Добавить валидацию ввода Модуля 1 с понятными сообщениями: пустой SSID, длина пароля 8–63, не-ASCII символы (FR-011, Edge Cases)

**Checkpoint**: Модуль 1 полностью функционален и тестируется независимо — это MVP.

---

## Phase 4: User Story 3 — WPA3 SAE (Dragonfly) (Priority: P3)

**Запрос пользователя**: Фаза 3 — модуль WPA3, визуализация SAE с инфографикой.

**Goal**: Пользователь видит реальный вывод PWE на P-256, обмены Commit/Confirm и
понимает, почему перехват пароля невозможен.

**Independent Test**: Открыть Модуль 2, пройти шаги SAE, увидеть блок «что видит
перехватчик» и сравнение с WPA2; сверить PWE/Commit/Confirm с эталонными векторами.

### Tests for User Story 3 (криптокорректность — обязательный gate конституции) ⚠️

- [ ] T026 [P] [US3] Создать эталонные тестовые векторы SAE (PWE на P-256 H2E, Commit/Confirm) в `tests/vectors/sae.vectors.ts` (research.md R7)

### Implementation for User Story 3

- [ ] T027 [US3] Реализовать криптографию SAE в `src/app/core/crypto/sae.ts`: вывод PWE через hash-to-curve на P-256 (`@noble/curves`), фаза Commit (scalar/element), фаза Confirm, вывод PMK/KCK из K (data-model.md — цепочка Модуля 2, clarify Q1)
- [ ] T028 [US3] Подключить операции SAE (`sae.pwe`, `sae.commit`, `sae.confirm`) к Web Worker в `src/app/core/crypto/crypto.worker.ts` (contracts/crypto-worker)
- [ ] T029 [US3] Юнит-тесты криптографии SAE против векторов в `tests/unit/sae.spec.ts` — сверка PWE/Commit/Confirm (FR-018, SC-007)
- [ ] T030 [P] [US3] Построить модель шагов SAE в `src/app/components/sae-visualizer/sae-steps.ts`: вывод PWE, Commit, Confirm; каждый шаг с `tooltip` и `dataFlow` (FR-018)
- [ ] T031 [US3] Создать компонент `sae-visualizer` в `src/app/components/sae-visualizer/`: пошаговый плеер с инфографикой, блок «что видит перехватчик», блок сравнения WPA2 ↔ WPA3 (FR-018–020)
- [ ] T032 [US3] Подключить Модуль 2 к `ScenarioStateService` и `CryptoEngineService`: редактируемые параметры, `debounceTime(500)`, неблокирующий UI (FR-007–010)

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

- [ ] T033 [P] [US2] Создать тестовые векторы формата 22000 (разбор/сборка строки `WPA*type*...`) в `tests/vectors/h22000.vectors.ts` (research.md R7)

### Implementation for User Story 2

- [ ] T034 [US2] Реализовать логику Hashcat 22000 в `src/app/core/crypto/hashcat22000.ts`: PMKID = HMAC-SHA1(PMK, "PMK Name"||AA||SPA), путь EAPOL через KCK/MIC, цикл перебора (реальный PBKDF2 на каждое слово), режим ускоренного перебора, сборка строки 22000 (data-model.md — цепочка Модуля 3, clarify Q2)
- [ ] T035 [US2] Подключить операцию `h22000.crack` к Web Worker в `src/app/core/crypto/crypto.worker.ts` с сообщениями прогресса и режимом fast mode (contracts/crypto-worker, FR-030)
- [ ] T036 [US2] Юнит-тесты формата 22000 и исходов перебора в `tests/unit/hashcat22000.spec.ts` — оба типа атаки, исходы «найдено»/«не найдено» (SC-006)
- [ ] T037 [P] [US2] Создать компонент-переключатель типа атаки (PMKID ↔ EAPOL) в `src/app/components/hashcat-sim/attack-switch/`: меняет отображаемый путь данных и набор требуемых полей (FR-021–023, FR-028)
- [ ] T038 [P] [US2] Создать редактор мини-словаря в `src/app/components/hashcat-sim/dictionary-editor/`: добавление/удаление слов, отдельное поле «настоящего» пароля сценария (FR-024, data-model.md §5)
- [ ] T039 [US2] Создать компонент `hashcat-sim` в `src/app/components/hashcat-sim/`: пошаговая анимация брутфорса, красный/зелёный индикатор по каждому слову, исход «найдено»/«не найдено», вывод и пояснение строки 22000, явная образовательная пометка (FR-025–029, Принцип V)
- [ ] T040 [US2] Подключить Модуль 3 к `ScenarioStateService` и `CryptoEngineService`: построение `CapturedDump` из сценария, переключатель fast mode, неблокирующий перебор, отмена при изменении входных данных (FR-008–010, FR-030)

**Checkpoint**: Все три модуля независимо функциональны.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Финальная проверка по конституции и доводка

- [ ] T041 [P] Проверить quality gates конституции по `quickstart.md`: отзывчивость при наборе текста, покрытие 100% криптошагов подсказками и схемами потоков, зелёные криптовекторы, образовательная пометка Модуля 3
- [ ] T042 [P] Прогнать `npm audit` и `npm audit signatures`; проверить поле `hasInstallScript` в `package-lock.json` (research.md R3)
- [ ] T043 [P] Пройтись по доступности и адаптивности: клавиатурная навигация по `control-panel`, контраст, поведение сплит-панели
- [ ] T044 Прогнать сквозную проверку по `quickstart.md` и собрать прод-версию `npm run build`
- [ ] T045 [P] Финальная вычитка всех подсказок и текстов на простоту для абсолютного новичка (Принцип I); сверка наглядности с эталонами TOTP_demo / rsa16-edu / rust_aes128_demo (Принцип III)

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
- Модели шагов → компонент-визуализатор → подключение к стейту/движку → валидация

---

## Parallel Opportunities

- **Setup**: T002, T004, T005, T006 — параллельно после T001/T003
- **Foundational**: после T007 — параллельно T008, T009, T010, T017; параллельно T012, T013, T014, T015
- **US1**: T018 и T022 — параллельно
- **US3**: T026 и T030 — параллельно
- **US2**: T033, T037, T038 — параллельно
- **Polish**: T041, T042, T043, T045 — параллельно

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
  (Принципы I, II конституции — проверяется в T041)
- Тяжёлые вычисления — строго в Web Worker; UI-поток не блокируется (Принцип IV)
- Установка зависимостей — только с защитным `.npmrc` и через `npm ci` (research.md R3)
- Коммит после каждой задачи или логической группы
