# Quickstart — Интерактивная методичка по безопасности Wi-Fi

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20 (обновлено 2026-10-21)

Запуск проекта и **безопасная** установка зависимостей с защитой от
продолжающейся кампании атак на npm (research.md R3).

## Предпосылки

- **Node.js 24.x LTS** и **npm ≥ 11.10.0** (нужен для `min-release-age`).
  Проверка: `node -v && npm -v`.

## Шаг 1. Защитный `.npmrc` (ДО первой установки)

В корне репозитория должен лежать `.npmrc`:

```ini
# Блокирует главный вектор атак — lifecycle-скрипты pre/post/install
ignore-scripts=true
# «Карантин»: не ставить пакеты моложе 7 дней. Значение в ДНЯХ (npm >= 11.10.0)
min-release-age=7
# Будущие `npm install <pkg>` сохраняют точную версию без ^/~
save-exact=true
# Аудит при установке; без рекламных сообщений
audit=true
fund=false
```

> Почему: кампания Shai-Hulud активна — последняя волна 19.05.2026. `ignore-scripts`
> закрывает автозапуск вредоноса, `min-release-age` исключает только что
> опубликованные (ещё не отозванные) заражённые версии. Подробно — research.md R3.

## Шаг 2. Установка зависимостей

```bash
npm ci                 # строго по package-lock.json, без неконтролируемых апдейтов
npm audit              # отчёт об известных уязвимостях
npm audit signatures   # проверка подписей пакетов в реестре
```

- `package.json` содержит **точные** версии (без `^`/`~`); `package-lock.json`
  закоммичен. Любое обновление зависимостей — отдельным ревью с проверкой поля
  `hasInstallScript` в lock-файле.
- Целевые версии: Angular `21.2.12` (CLI/build `21.2.10`), Tailwind CSS `4.3.0`,
  `@noble/curves`/`@noble/hashes` `2.2.0` (research.md R4).

## Шаг 3. Запуск в режиме разработки

```bash
npm start              # ng serve — http://localhost:4200 (откроется справочник /guide)
```

Разделы: `/guide` — справочник, `/wpa2`, `/wpa3`, `/hashcat` — модули. Язык
(UA/EN/RU) и тема переключаются в шапке и запоминаются в браузере.

## Шаг 4. Тесты криптокорректности

```bash
npm test               # 43 юнит-теста: криптография по эталонным векторам + fillCalc
```

Тесты — главный quality gate техстандарта конституции. Векторы и спеки лежат рядом
с кодом (`src/app/core/crypto/*.vectors.ts`, `*.spec.ts`): IEEE 802.11-2020
Annex J.10 (SAE), IEEE 802.11i Annex H (PBKDF2, PRF), RFC 4493 (AES-CMAC),
RFC 3394 (AES Key Wrap), RFC 5869 (HKDF), реальные строки Hashcat 22000, паритет с
Python-скриптами и якоря кадров M1–M4 (research.md R7, R8).

## Шаг 5. Сборка прод-версии

```bash
npm run build          # статика в dist/ — разворачивается как офлайн SPA
```

GitHub Pages: workflow `.github/workflows/deploy.yml` собирает ветку `001-wifi-security-spa`
с `--base-href=/WPA2-3demo/` при каждом push.

## Шаг 6. Учебные Python-скрипты (по желанию)

```bash
python3 python/wpa2_handshake.py   # PMK → PTK → MIC, PMKID для одного пароля
python3 python/wpa3_sae.py         # SAE (H&P, P-256) → PMK → 4-way → PTK
```

Нужен только stdlib Python 3. Параметры меняются в коде (блок `__main__` и блок
«КОНФИГ»); отличия от стандарта — в `python/README.md` (research.md R10).

## Проверка соответствия конституции (ручные quality gates)

Перед приёмкой функции:

1. **Отзывчивость (Принцип IV)**: набрать текст в полях SSID/Пароль во время
   идущего пересчёта — фризов быть не должно (debounceTime 500 мс + Web Worker).
2. **Наглядность (Принципы I, II)**: каждый криптошаг имеет всплывающую подсказку,
   схему потока данных и доступный hex-инспектор; колонки «Вычисления» выровнены
   на всех трёх языках.
3. **Криптокорректность**: `npm test` — все векторы зелёные.
4. **Справочник и языки**: `/guide` открывается по умолчанию; оглавление и
   диаграммы работают при 360 px и 1280 px в светлой и тёмной теме; при смене
   языка меняются все тексты, включая заголовок вкладки.
5. **Образовательная симуляция (Принцип V)**: в Модуле 3 нет сетевых вызовов;
   присутствует явная образовательная пометка.
6. **Сравнение с эталонами (Принцип III)**: наглядность не ниже TOTP_demo /
   rsa16-edu / rust_aes128_demo.

## Карта основных путей

| Что | Где |
|-----|-----|
| Криптодвижок (Web Worker) | `src/app/core/crypto/` |
| Состояние и шаги | `src/app/core/state/` |
| Модуль 1 — WPA2 | `src/app/components/handshake-visualizer/` |
| Модуль 2 — WPA3 SAE | `src/app/components/sae-visualizer/` |
| Модуль 3 — Hashcat 22000 | `src/app/components/hashcat-sim/` |
| Панель управления шагами | `src/app/components/control-panel/` |
| Справочник | `src/app/components/guide/`, контент — `src/app/core/guide/` |
| Тексты и переводы | `src/app/core/i18n/` |
| Эталонные тестовые векторы | `src/app/core/crypto/*.vectors.ts` |
| Учебные Python-скрипты | `python/` |
