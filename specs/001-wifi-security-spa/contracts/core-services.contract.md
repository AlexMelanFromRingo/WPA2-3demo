# Contract — Core Services & UI

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20

Контракты Angular-сервисов и переиспользуемых UI-компонентов. Все сервисы —
`providedIn: 'root'`, standalone-компоненты (Angular 21).

## CryptoEngineService — `core/crypto/crypto-engine.service.ts`

Фасад над Web Worker (см. `crypto-worker.contract.md`).

- `pmk$(scenario): Observable<CryptoArtifact>` — поток PMK; новый ввод отменяет
  предыдущий расчёт (через `generation`).
- `handshake$(scenario): Observable<{ pmk, ptk, kck, kek, tk, mic }>`
- `sae$(scenario): Observable<SaeResult>`
- `crack$(req): Observable<AttackProgress>` — эмитит прогресс перебора.
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

## Контракт модулей

Каждый модуль (`handshake-visualizer`, `sae-visualizer`, `hashcat-sim`):
- Рендерится автономно из текущего `EffectiveScenario` (независимая проверяемость
  user stories).
- Каждый криптошаг ДОЛЖЕН предоставлять `tooltip` + `data-flow-diagram` +
  доступ к `hex-inspector` (gate Принципов I/II — проверяется в quality gate).
- `hashcat-sim` дополнительно: переключатель `AttackType`, редактор `Dictionary`,
  индикатор `AttackProgress`, явная образовательная пометка (FR-029).
