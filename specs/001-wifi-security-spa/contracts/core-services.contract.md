# Contract — Core Services & UI

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20 (обновлено 2026-10-21)

Контракты Angular-сервисов и переиспользуемых UI-компонентов. Все сервисы —
`providedIn: 'root'`, standalone-компоненты (Angular 21).

## CryptoEngineService — `core/crypto/crypto-engine.service.ts`

Фасад над Web Worker (см. `crypto-worker.contract.md`).

- `runWpa2Handshake(scenario): Observable<Wpa2RunResult>` — операция `wpa2.run`.
- `runSae(scenario, method: PweMethod): Observable<SaeRunResult>` — операция
  `sae.run`; смена способа PWE или сценария запускает новый расчёт.
- `runCrack(params: CrackParams): Observable<CrackResult>` — операция `h22000.crack`.
- `newGeneration()` / `currentGeneration` — ответы устаревшего поколения
  отбрасываются; в модулях отмену дополняет `switchMap`.
- Гарантия: ни один метод не выполняет криптовычисления в UI-потоке.

## ScenarioStateService — `core/state/scenario-state.service.ts`

- `scenario$: BehaviorSubject<NetworkScenario>` — единый общий сценарий (Q4).
- `override$(module): BehaviorSubject<ModuleOverride>` — локальные переопределения.
- `effective(module): Observable<NetworkScenario>` — мердж общего и локального.
- `update(patch)` / `updateOverride(module, patch)` — точечные изменения.
- Контракт: `updateOverride` НЕ изменяет общий сценарий и другие модули
  (spec.md Edge Cases).

## StepController — `core/state/step-controller.service.ts`

- `currentStep$(module): BehaviorSubject<number>`
- `next(module)` / `prev(module)` — с зажимом к границам `[0, last]` (FR-003).
- `canGoNext$ / canGoPrev$: Observable<boolean>` — для блокировки кнопок.
- `play(module, speed)` / `pause(module)` — авто-проигрывание (Q3, FR-002);
  по достижении `last` авто-останов, без зацикливания (Edge Cases).

## LocaleService и ThemeService — `core/i18n/`, `core/`

- `LocaleService.lang` — сигнал текущего языка (`uk` | `en` | `ru`);
  `t(key)` — реактивный перевод строки UI; `setLang(lang)` сохраняет выбор в
  localStorage (первый визит — язык браузера).
- `LocalizedTitleStrategy` — заголовок вкладки из ключа ui-text в `title`
  маршрута; обновляется при смене языка.
- `ThemeService.theme` / `toggle()` — светлая и тёмная тема (класс `.dark` на
  `<html>`); inline-скрипт в `index.html` ставит тему до старта приложения.
- `fillCalc(calc, vars, lang)` — подставляет значения в шаблоны «Вычисления»,
  выравнивает колонки по табуляции и согласует «N байт» для RU/UK.

## Реактивный контракт ввода (Принцип IV)

Потоки ввода SSID и пароля проходят `debounceTime(500)` перед запуском пересчёта
ключей; альтернативный режим — явная кнопка «Пересчитать ключи» (research.md R2).
Это контрактное требование к `param-editor` и контейнерам модулей.

## Переиспользуемые UI-компоненты — `components/shared/`

| Компонент | Контракт |
|-----------|----------|
| `data-flow-diagram` | Вход: `DataFlow`. Рендерит схему «вход → преобразование → выход» с реальными значениями. Обязателен на каждом криптошаге (Принцип II) |
| `hex-inspector` | Вход: `CryptoArtifact[]`. Показывает hex-дампы; доступен на каждом шаге (FR-006) |
| `tooltip` | Вход: текст подсказки. Всплывающее пояснение простым языком (FR-004) |
| `param-editor` | Двусторонняя привязка к полю сценария; валидация (FR-007, FR-011); поток изменений с `debounceTime(500)` |
| `step-card` | Вход: `VisualizationStep`. Заголовок, подсказка, описание, формула, «Вычисление», байтовая диаграмма, схема потока, термины, hex-инспектор |
| `byte-grid` | Вход: `ByteView`. Ячейки байтов, окрашенные по регионам, легенда и подпись |
| `packet-flow` | Вход: шаг с `packet?`. Сцена «точка доступа ↔ клиент» с летящим пакетом |
| `theory-panel` | Вход: `ModuleTheory`. Сворачиваемая (по умолчанию свёрнута) теория модуля со ссылками на стандарты |

## Справочник — `components/guide/`

| Компонент | Контракт |
|-----------|----------|
| `guide-page` | Маршрут `/guide`: заголовок, «герой»-диаграмма, оглавление (липкое на lg, сворачиваемое на мобильных, подсветка текущей главы), главы |
| `guide-block` | Вход: `GuideBlock`. Рендер всех видов блоков; таблицы с 4+ колонками на узком экране — стопкой карточек |
| `sequence-diagram` | Вход: `SequenceVariant[]`. Переключатель WPA2/WPA3, показ по шагам |
| `key-tree` | Вход: уровни ключей. Дерево «пароль → PMK → PTK → KCK/KEK/TK» и ветка GMK → GTK, IGTK |
| `frame-strip` | Вход: `FrameField[]`. Полоса полей кадра EAPOL-Key |
| `rich-text` | Вход: строка с `**…**` и `` `…` ``. Вывод сегментов без `innerHTML` |

## Контракт модулей

Каждый модуль (`handshake-visualizer`, `sae-visualizer`, `hashcat-sim`):
- Рендерится автономно из текущего `EffectiveScenario` (независимая проверяемость
  user stories).
- Каждый криптошаг ДОЛЖЕН предоставлять `tooltip` + `data-flow-diagram` +
  доступ к `hex-inspector` (gate Принципов I/II — проверяется в quality gate).
- `hashcat-sim` дополнительно: переключатель `AttackType`, редактор `Dictionary`,
  индикатор `AttackProgress`, явная образовательная пометка (FR-029).
- `sae-visualizer` дополнительно: переключатель способа вывода PWE (H2E ↔ H&P),
  сохраняющий номер текущего шага (FR-031).
