# Implementation Plan: Интерактивная методичка по безопасности Wi-Fi (WPA2/WPA3/Hashcat 22000)

**Branch**: `001-wifi-security-spa` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-wifi-security-spa/spec.md`

## Summary

Интерактивное одностраничное веб-приложение (SPA) — учебная методичка из трёх
модулей: WPA2 4-Way Handshake, WPA3 SAE (Dragonfly) и симулятор Hashcat (режим
22000) с переключателем атак PMKID/EAPOL. Технический подход: Angular 21 +
Tailwind CSS v4; все криптовычисления (PBKDF2-HMAC-SHA1, HMAC, P-256 EC) — внутри
Web Worker на нативном WebCrypto API и `@noble/curves`, что гарантирует отзывчивый
UI-поток. Управление шагами — RxJS `BehaviorSubject` + Angular signals, с
`debounceTime(500)` на полях SSID/Пароль и кнопкой «Пересчитать ключи». Цепочка
поставок npm защищена от продолжающейся кампании Shai-Hulud (см. research.md R3).

## Technical Context

**Language/Version**: TypeScript 5.9.x, Node.js 24.x LTS (только для сборки/тулинга)
**Primary Dependencies**: Angular 21.2.x, Tailwind CSS 4.3.x, RxJS 7.8.x (peer от Angular), `@noble/curves` 1.x, `@noble/hashes` 1.x
**Storage**: N/A — состояние только в памяти; данные не сохраняются между сессиями и не покидают браузер
**Testing**: Встроенный в Angular 21 тест-раннер (на базе Vitest) — юнит-тесты криптокорректности против эталонных векторов; ручная проверка отзывчивости UI
**Target Platform**: Современные desktop-браузеры (Chrome/Edge/Firefox/Safari) с поддержкой WebCrypto, Web Workers, ES2022
**Project Type**: Одностраничное веб-приложение (только фронтенд, без бэкенда)
**Performance Goals**: Отклик ввода < 100 мс без пропуска кадров (SC-003); UI-поток 60 fps во время PBKDF2(4096) и перебора словаря; debounceTime(500) на текстовых полях
**Constraints**: Полностью клиентское, офлайн-приложение; нет сетевых вызовов в рантайме; данные пользователя не передаются наружу; тяжёлые вычисления строго вне UI-потока
**Scale/Scope**: 3 модуля, ~единицы экранов, мини-словарь — единицы–десятки слов; целевая аудитория — абсолютные новички

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Конституция v1.0.0 — проверка по пяти принципам и техническим стандартам:

| # | Принцип | Статус | Как обеспечивается планом |
|---|---------|--------|---------------------------|
| I | Понятность для новичка (NON-NEGOTIABLE) | ✅ PASS | Выделенный слой `tooltip`/пояснений; компонент `data-flow-diagram`; текст на простом русском; пошаговая подача «зачем → что → как» |
| II | Визуальные подсказки и схемы потоков данных (NON-NEGOTIABLE) | ✅ PASS | Каждый шаг = модель `VisualizationStep` с обязательными полями tooltip + схема потока; SVG-слой + Angular Animations; hex-инспектор на каждом шаге |
| III | Превосходство над эталонами | ✅ PASS | Интерактив (редактируемые параметры, авто-проигрывание, hex-инспекция) выше уровня TOTP_demo/rsa16-edu/rust_aes128_demo; сверка наглядности — quality gate |
| IV | Неблокирующий UI и редактируемость (NON-NEGOTIABLE) | ✅ PASS | Web Worker + асинхронный WebCrypto + `debounceTime(500)` + кнопка «Пересчитать ключи» + отмена устаревших расчётов (research.md R2); все параметры редактируемы |
| V | Строго образовательная симуляция (NON-NEGOTIABLE) | ✅ PASS | Модуль 3 — только математика на введённых пользователем данных; нет сети, нет захвата трафика, нет интеграции с реальным Hashcat; явная образовательная пометка (FR-029) |
| — | Техстандарт: браузерное офлайн-приложение | ✅ PASS | SPA без бэкенда; нет рантайм-сети |
| — | Техстандарт: криптокорректность + эталонные векторы | ✅ PASS | WebCrypto/`@noble` дают точные числа; юнит-тесты против векторов WPA2/WPA3/22000 (research.md R7) |
| — | Техстандарт: формат 22000 | ✅ PASS | Структура строки `WPA*type*...` моделируется по реальному формату (data-model) |
| — | Техстандарт: Web Workers для тяжёлых вычислений | ✅ PASS | Слой `core/crypto` целиком работает в воркере |
| — | Техстандарт: минимальные прозрачные зависимости, WebCrypto где возможно | ✅ PASS | Runtime-зависимости: Angular, Tailwind, `@noble/*`; `crypto-js` исключён (research.md R1) |

**Результат**: все гейты пройдены. Нарушений NON-NEGOTIABLE нет. Одно сознательное
отклонение от пользовательского ввода (отказ от `crypto-js`) зафиксировано в
Complexity Tracking — оно усиливает соответствие конституции, а не нарушает её.

*Post-Design re-check (после Phase 1)*: артефакты Phase 1 (data-model, contracts,
quickstart) не вводят новых зависимостей и не нарушают принципов — **гейт повторно
пройден**.

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
package.json                    # точные версии без ^/~; package-lock.json коммитится
angular.json
styles.css                      # Tailwind v4 (CSS-first конфигурация)

src/
├── app/
│   ├── core/
│   │   ├── crypto/                      # Криптодвижок (Web Worker + WebCrypto + @noble)
│   │   │   ├── crypto.worker.ts         # Воркер: PBKDF2/HMAC/P-256
│   │   │   ├── crypto-engine.service.ts # Фасад над воркером (Promise/Observable)
│   │   │   ├── wpa2.ts                  # PMK, PRF-512/PTK, MIC
│   │   │   ├── sae.ts                   # PWE (hash-to-curve), Commit/Confirm на P-256
│   │   │   ├── hashcat22000.ts          # PMKID/EAPOL-перебор, сборка строки 22000
│   │   │   └── hex.ts                   # Утилиты hex-дампов
│   │   └── state/
│   │       ├── scenario-state.service.ts # Единый общий сценарий (BehaviorSubject)
│   │       └── step-controller.service.ts# Шаги + авто-проигрывание (play/pause)
│   ├── components/
│   │   ├── handshake-visualizer/        # Модуль 1 — WPA2 4-Way Handshake
│   │   ├── sae-visualizer/              # Модуль 2 — WPA3 SAE (Dragonfly)
│   │   ├── hashcat-sim/                 # Модуль 3 — симулятор Hashcat 22000
│   │   ├── control-panel/               # Шаг вперёд/назад, play/pause, скорость
│   │   └── shared/
│   │       ├── data-flow-diagram/       # Схема «вход → преобразование → выход»
│   │       ├── hex-inspector/           # Просмотр промежуточных hex-дампов
│   │       ├── tooltip/                 # Всплывающие подсказки
│   │       └── param-editor/            # Редактируемые поля параметров
│   └── app.ts / app.routes.ts           # Оболочка SPA, навигация между модулями
└── main.ts

tests/
├── unit/                                # Криптокорректность против векторов
└── vectors/                             # wpa2.vectors.ts, sae.vectors.ts, h22000.vectors.ts
```

**Structure Decision**: Выбрана структура одиночного фронтенд-проекта Angular
(бэкенда нет). Папки `core/crypto` и `components/*` соответствуют явному указанию
пользователя. Слой `core/state` добавлен для единого сценария и контроллера шагов
(clarify Q3/Q4). `components/shared` выделен, чтобы tooltip, схема потока данных и
hex-инспектор переиспользовались всеми тремя модулями (Принципы I, II).

## Complexity Tracking

> Заполняется только при отклонениях, требующих обоснования.

| Violation / Отклонение | Why Needed | Simpler Alternative Rejected Because |
|------------------------|------------|--------------------------------------|
| Отказ от `crypto-js`, который пользователь разрешил опционально | `crypto-js` снят с поддержки автором; версии < 4.2.0 несли CVE-2023-46233 (слабый PBKDF2). Конституция требует криптопримитивы из проверяемых источников | Оставить `crypto-js` «для быстрых операций» — отклонено: WebCrypto (нативный, проверяемый, асинхронный) полностью закрывает эти операции без неподдерживаемой зависимости |
| Добавление зависимости `@noble/curves` + `@noble/hashes` | WebCrypto не предоставляет арифметику точек эллиптической кривой, необходимую для реального вывода PWE и обменов Commit/Confirm в WPA3 SAE (clarify Q1 — выбрана полная криптоточность) | Считать SAE только концептуально — отклонено пользователем в clarify Q1; реализовать EC-арифметику вручную — отклонено: выше риск ошибок, ниже доверие, чем у audited-библиотеки |
| Angular 21, а не «самый свежий» Angular 22 | Карантин/«отлёжка» против волн Shai-Hulud (research.md R3): свежевыпущенный мажор не прошёл период наблюдения | Брать Angular 22 сразу при выходе — отклонено: противоречит явному запросу пользователя проверить версии и не наступить на цепочку поставок |
