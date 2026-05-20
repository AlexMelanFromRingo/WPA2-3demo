# Phase 1 — Data Model: Интерактивная методичка по безопасности Wi-Fi

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20
**Source**: [spec.md](./spec.md) Key Entities + [research.md](./research.md)

Модель данных — клиентская, в памяти (Storage = N/A). Описывается как TypeScript-
ориентированные структуры; «персистентность» отсутствует.

---

## 1. NetworkScenario — учебный сценарий (единый общий)

Единый набор параметров сети, используемый всеми модулями по умолчанию
(clarify Q4). Хранится в `ScenarioStateService` как `BehaviorSubject`.

| Поле | Тип | Правила валидации |
|------|-----|-------------------|
| `ssid` | string | 1–32 байта UTF-8; пустой → блокировка расчёта с пояснением (FR-011) |
| `passphrase` | string | 8–63 печатных ASCII-символа (WPA2-PSK); вне диапазона → понятное предупреждение |
| `apMac` | string | MAC точки доступа (AA), 6 байт, формат `aa:bb:cc:dd:ee:ff` |
| `clientMac` | string | MAC клиента (SPA/STA), 6 байт |
| `aNonce` | hex string | 32 байта; редактируемо; есть «сгенерировать случайный» |
| `sNonce` | hex string | 32 байта; редактируемо; есть «сгенерировать случайный» |

**ModuleOverride** — слой локальных переопределений (clarify Q4): частичная копия
`NetworkScenario`; при чтении модулем мерджится поверх общего сценария и НЕ влияет
на общий сценарий и другие модули.

```
EffectiveScenario(module) = { ...sharedScenario, ...moduleOverride[module] }
```

**State transitions**: `valid` ⇄ `invalid` (по результату валидации) →
`recomputing` (запущен пересчёт) → `ready` (артефакты получены).

---

## 2. Module — модуль методички

| Значение | Описание |
|----------|----------|
| `wpa2-handshake` | Модуль 1 — WPA2 4-Way Handshake |
| `wpa3-sae` | Модуль 2 — WPA3 SAE (Dragonfly) |
| `hashcat-22000` | Модуль 3 — симулятор Hashcat (режим 22000) |

Каждый модуль владеет: упорядоченным списком `VisualizationStep[]`, индексом
текущего шага, опциональным `ModuleOverride`.

---

## 3. VisualizationStep — шаг визуализации

Единица пошагового прохождения. **Поля tooltip и dataFlow обязательны** —
шаг без них недопустим (Принципы I, II конституции; FR-004, FR-005).

| Поле | Тип | Назначение |
|------|-----|------------|
| `index` | number | Порядковый номер в модуле (0-based) |
| `title` | string | Краткий заголовок шага |
| `tooltip` | string | Пояснение простым языком (обязательно) |
| `dataFlow` | DataFlow | Схема «вход → преобразование → выход» (обязательно) |
| `artifacts` | CryptoArtifact[] | Значения, доступные для hex-инспекции на шаге |
| `animationCue` | enum? | Триггер Angular-анимации (передача Nonce/MAC/пакета) |

**DataFlow**: `{ inputs: ArtifactRef[], transform: string, outputs: ArtifactRef[] }`
— `transform` человекочитаемо именует операцию (например, «PBKDF2-HMAC-SHA1,
4096 итераций»).

**Навигация по шагам** (FR-002, FR-003, clarify Q3):
`first → … → last`; кнопка «назад» на `index 0` и «вперёд» на `last` неактивны;
авто-проигрывание останавливается на `last` (не зацикливается).

---

## 4. CryptoArtifact — криптографический артефакт

Промежуточное или итоговое значение криптоцепочки; источник для hex-дампа (FR-006).

| Поле | Тип | Назначение |
|------|-----|------------|
| `id` | string | Уникальный ключ (`pmk`, `ptk`, `kck`, `mic`, `pmkid`, `pwe`, …) |
| `label` | string | Человекочитаемое имя |
| `bytes` | Uint8Array | Сырое значение |
| `hex` | string | Hex-представление для инспектора |
| `bitLength` | number | Длина в битах |
| `derivedFrom` | string[] | id артефактов-входов (для схемы потока) |

---

## 5. Dictionary — мини-словарь (Модуль 3)

| Поле | Тип | Правила |
|------|-----|---------|
| `words` | string[] | Редактируемый список кандидатов (FR-024); предзаполнен; добавление/удаление |
| `secretPassword` | string | «Настоящий» пароль сценария атаки — задаётся отдельно от `words`, чтобы демонстрировать оба исхода (Assumptions спецификации) |

Инвариант для демонстрации: если `secretPassword ∈ words` → исход «найдено»;
иначе → «не найдено».

---

## 6. AttackType — тип атаки (Модуль 3)

| Значение | Описание | Требуемые входные данные |
|----------|----------|--------------------------|
| `pmkid` | «Через PMKID» — современный метод | 1 пакет от роутера → PMKID, SSID, MAC AP, MAC клиента |
| `eapol` | «Через EAPOL» — классика | Перехваченное рукопожатие → кадр EAPOL + MIC, nonce, MAC, SSID |

Переключение типа меняет отображаемый путь данных и набор требуемых полей (FR-028).

---

## 7. CapturedDump — перехваченный дамп (Модуль 3)

Данные, которые «видит» атакующий; формируются внутри приложения из
`EffectiveScenario('hashcat-22000')`.

| Поле | Тип | Применимость |
|------|-----|--------------|
| `pmkid` | hex string (16 байт) | Тип атаки `pmkid` |
| `eapolFrame` | Uint8Array | Тип атаки `eapol` |
| `capturedMic` | hex string (16 байт) | Тип атаки `eapol` |
| `hash22000Line` | string | Строка формата 22000 (см. ниже) |

**Формат строки 22000** (FR-027) — поля, разделённые `*`:

```
WPA*<type>*<pmkid|mic>*<apmac>*<stamac>*<essid>*<anonce>*<eapol>*<messagepair>
       │
       └─ 01 = PMKID-атака,  02 = EAPOL-атака
```

---

## 8. AttackProgress — состояние перебора (Модуль 3)

| Поле | Тип | Назначение |
|------|-----|------------|
| `currentIndex` | number | Индекс текущего слова словаря |
| `candidate` | string | Текущее проверяемое слово |
| `derivedKeys` | CryptoArtifact[] | «Фейковые» ключи из кандидата (реальный расчёт — clarify Q2) |
| `matched` | boolean | Совпал ли хэш кандидата с дампом |
| `outcome` | enum | `running` \| `found` \| `not-found` |
| `fastMode` | boolean | Режим ускоренного перебора (clarify Q2, FR-030) |

---

## Криптоцепочки (что и из чего вычисляется)

### Модуль 1 — WPA2 4-Way Handshake (FR-012…017)

```
passphrase, SSID
   └─PBKDF2-HMAC-SHA1, 4096 итер., 256 бит──▶ PMK
PMK, AA, SPA, ANonce, SNonce
   └─PRF-512 (итеративный HMAC-SHA1,
      "Pairwise key expansion")────────────▶ PTK (384 бита)
PTK ─split─▶ KCK[0:16] · KEK[16:32] · TK[32:48]
KCK, EAPOL-кадр (поле MIC обнулено)
   └─HMAC-SHA1, усечение до 16 байт────────▶ MIC
Сообщения: M1(AP→STA: ANonce) · M2(STA→AP: SNonce+MIC)
         · M3(AP→STA: GTK+MIC) · M4(STA→AP: ACK+MIC)
```

### Модуль 2 — WPA3 SAE / Dragonfly на P-256 (FR-018…020)

```
passphrase, SSID, MAC AP, MAC STA
   └─hash-to-curve (H2E, SSWU на P-256)────▶ PWE (точка кривой)
rand, mask (случайные скаляры)
   commit-scalar  = (rand + mask) mod r
   commit-element = inverse(scalar_mul(mask, PWE))
   ──▶ Commit-обмен: (scalar, element)
peer-scalar, peer-element, rand, PWE
   K = scalar_mul(rand, point_add(scalar_mul(peer-scalar, PWE), peer-element))
   ──▶ из K выводятся KCK и PMK ──▶ Confirm-обмен
Акцент модуля: перехватчик видит только (scalar, element) —
этого недостаточно для офлайн-перебора пароля.
```

### Модуль 3 — Hashcat 22000, перебор (FR-021…030)

```
ДЛЯ каждого word ∈ Dictionary.words:
   PMK' = PBKDF2-HMAC-SHA1(word, SSID, 4096)         ← реальный расчёт (clarify Q2)
   ├─ attackType = pmkid:
   │     PMKID' = HMAC-SHA1(PMK', "PMK Name"||AA||SPA)[0:16]
   │     match  = (PMKID' == CapturedDump.pmkid)
   └─ attackType = eapol:
         PTK' → KCK';  MIC' = HMAC-SHA1(KCK', EAPOL)[0:16]
         match  = (MIC' == CapturedDump.capturedMic)
   ЕСЛИ match → outcome = found, СТОП
ЕСЛИ словарь исчерпан → outcome = not-found
```

---

## Связи сущностей

```
ScenarioState ──общий──▶ NetworkScenario
       │
       ├─ ModuleOverride[wpa2-handshake]  ─▶ EffectiveScenario ─▶ Module 1 steps ─▶ CryptoArtifact[]
       ├─ ModuleOverride[wpa3-sae]        ─▶ EffectiveScenario ─▶ Module 2 steps ─▶ CryptoArtifact[]
       └─ ModuleOverride[hashcat-22000]   ─▶ EffectiveScenario ─▶ CapturedDump
                                                                    │
                                          Dictionary ─▶ AttackProgress ─(сверка)─┘
```

Все три модуля проверяемы независимо: каждый рендерится автономно из текущего
`EffectiveScenario` (User Stories spec.md).
