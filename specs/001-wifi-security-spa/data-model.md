# Phase 1 — Data Model: Интерактивная методичка по безопасности Wi-Fi

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20 (обновлено 2026-10-21)
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
| `aNonce` | hex string | 32 байта; редактируемо |
| `sNonce` | hex string | 32 байта; редактируемо |
| `gtk` | hex string | 16 байт; групповой ключ, который точка доступа передаёт в M3 |
| `igtk` | hex string | 16 байт; ключ PMF для широковещательных служебных кадров (M3 при AKM SAE) |

Значения по умолчанию: `DemoNet` / `password123`, MAC `02:00:00:00:00:01` и
`02:00:00:00:00:02`, ANonce = `00`×32, SNonce = `11`×32, GTK = `22`×16,
IGTK = `33`×16. Сообщения валидации — на языке интерфейса.

**ModuleOverride** — слой локальных переопределений (clarify Q4): частичная копия
`NetworkScenario`; при чтении модулем мерджится поверх общего сценария и НЕ влияет
на общий сценарий и другие модули.

```
EffectiveScenario(module) = { ...sharedScenario, ...moduleOverride[module] }
```

**State transitions**: `valid` ⇄ `invalid` (по результату валидации) →
`recomputing` (запущен пересчёт) → `ready` (артефакты получены).

**Кэш вычисленных значений (FR-010)**: `ScenarioStateService` хранит вычисленные
артефакты, привязанные к хэшу `EffectiveScenario` каждого модуля; при переходе
между модулями и шагами значения берутся из кэша, а не пересчитываются заново.

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

Единица пошагового прохождения. **Поля tooltip, description, terms, calc и
dataFlow обязательны** — шаг без них недопустим (Принципы I, II конституции;
FR-004, FR-005).

| Поле | Тип | Назначение |
|------|-----|------------|
| `index` | number | Порядковый номер в модуле (0-based) |
| `title` | string | Краткий заголовок шага |
| `tooltip` | string | Короткая подсказка для значка «?» (обязательно) |
| `description` | string | Развёрнутое пояснение «зачем → что → как» |
| `terms` | GlossaryTerm[] | Разбор всех терминов шага |
| `formula` | string? | Ключевая формула шага |
| `calc` | string[] | Блок «Вычисление» с реальными значениями; строки с `\t` выравниваются в колонки |
| `dataFlow` | DataFlow | Схема «вход → преобразование → выход» (обязательно) |
| `artifacts` | CryptoArtifact[] | Значения, доступные для hex-инспекции на шаге |
| `byteView` | ByteView? | Байтовая диаграмма: регионы с подписями и тонами (поля кадра, части ключа) |
| `packet` | PacketCue? | «Летящий» пакет в сцене «точка доступа ↔ клиент» (`from`, `label`) |
| `badge` | StepBadge? | Индикатор результата: совпало / не совпало |

Текст шагов хранится отдельно от кода по языкам (`*-text.{ru,uk,en}.ts`), а
значения подставляются в шаблоны `{ключ}` при построении шага.

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

PMKID: WPA*01*<pmkid>*<ap>*<sta>*<essid>***          (ANonce, EAPOL, messagepair пусты)
EAPOL: WPA*02*<mic>*<ap>*<sta>*<essid>*<anonce>*<M2 с нулевым MIC>*00
                                                    (00 = пара M1 + M2, EAPOL из M2)
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

## 9. EapolKeyFrame и FourWayMessage — кадры 4-Way Handshake

Кадр EAPOL-Key (IEEE 802.11-2020 §12.7.2); многобайтовые поля — big-endian.

| Поле | Байт | Значение |
|------|------|----------|
| Protocol Version | 1 | 2 у точки доступа, 1 у клиента (по умолчанию hostapd / wpa_supplicant) |
| Packet Type | 1 | 3 = EAPOL-Key |
| Body Length | 2 | длина тела |
| Descriptor Type | 1 | 2 = RSN |
| Key Information | 2 | биты: версия дескриптора (0–2), Pairwise (3), Install (6), Ack (7), MIC (8), Secure (9), Encrypted Key Data (12) |
| Key Length | 2 | 16 в M1/M3, 0 в M2/M4 |
| Replay Counter | 8 | r в M1/M2, r+1 в M3/M4 |
| Key Nonce | 32 | ANonce (M1, M3), SNonce (M2), нули (M4) |
| Key IV / Key RSC / Reserved | 16 / 8 / 8 | нули |
| Key MIC | 16 | считается по кадру с нулями в этом поле |
| Key Data Length / Key Data | 2 / n | M1: PMKID KDE; M2: RSNE [+ RSNXE]; M3: AES-KW(RSNE [+ RSNXE] + GTK KDE [+ IGTK KDE] + паддинг) |

Key Information по сообщениям: PSK — `0x008a`, `0x010a`, `0x13ca`, `0x030a`;
SAE — `0x0088`, `0x0108`, `0x13c8`, `0x0308`.

`FourWayMessage = { name: M1…M4, from: ap|client, fields, frame, micInput?, micRaw?, mic? }`.
`FourWayResult` дополнительно хранит B, сырой выход PRF/KDF, PTK и его части,
RSNE сторон, Key Data M3 (открыто / с паддингом / зашифровано), извлечённый GTK и
флаги проверок (MIC M2, M3, M4; RSNE с обеих сторон; извлечение GTK).

---

## 10. PweMethod и SaeRunResult — обмен SAE (Модуль 2)

| Сущность | Содержимое |
|----------|------------|
| `PweMethod` | `h2e` (по умолчанию) \| `hnp` |
| `HnpResult` | ключ HMAC (max ‖ min MAC), итерации `{counter, pwdSeed, pwdValue, belowP, isQr, chosen, afterFound}` (≥ 40), номер удачной, save, x, корень y, признак выбора p − y, PWE |
| `H2eResult` | pwd-seed, pwd-value1/2 (по 48 байт), трассировки SSWU (u, x1, gx1, x2, gx2, квадратичность, смена знака y, точка), PT, val, PWE |
| `SaeSide` | rand, mask, scalar, element, кадр Commit, проверка чужого Commit, точка K, ключи `{k, keyseed, context, kdfOutput, kck, pmk, pmkid}`, send-confirm, confirm, кадр Confirm, результат проверки чужого Confirm |
| `SaeRunResult` | method, group = 19, hnp? / h2e?, PWE, согласие PWE сторон, `client`, `ap`, `converged`, `fourWay` (§9, AKM SAE) |

Через `postMessage` передаются только байты, числа и флаги — объекты точек кривой
в UI-поток не попадают.

---

## 11. GuideContent — справочник

`GuideContent = { title, lead, hero: GuideBlock, chapters: GuideChapter[] }`;
`GuideChapter = { id, title, tag: common|wpa2|wpa3|attack, lead?, blocks }`.
`GuideBlock` — одно из: `p`, `h`, `list`, `formula`, `callout` (info/warn/danger/ok),
`table`, `terms`, `steps`, `timeline`, `sequence` (варианты диаграммы с фазами и
сообщениями), `keytree` (уровни ключей и «боковая» ветка групповых ключей),
`frame` (поля кадра), `proscons`, `links` (внутренний маршрут или внешний адрес).
Неизменяемые при переводе поля: `id`, `tag`, `tone`, `kind`, `part`, `from`,
`secured`, `route`, `href`, `ordered`, `bytes`.

---

## Криптоцепочки (что и из чего вычисляется)

### Модуль 1 — WPA2 4-Way Handshake (FR-012…017)

```
passphrase, SSID
   └─PBKDF2-HMAC-SHA1, 4096 итер., 256 бит──────────────▶ PMK
PMK, AA, SPA ──HMAC-SHA1("PMK Name" ‖ AA ‖ SPA)[0:16]──▶ PMKID
M1 (AP→STA): ANonce, Replay Counter = 1, Key Data = PMKID KDE, без MIC
B = min/max(AA,SPA) ‖ min/max(ANonce,SNonce)
PMK, B ──PRF-384 (3 блока HMAC-SHA1, "Pairwise key expansion")──▶ PTK (48 байт)
PTK ─split─▶ KCK[0:16] · KEK[16:32] · TK[32:48]
M2 (STA→AP): SNonce, RSNE; MIC = HMAC-SHA1(KCK, M2 с нулевым MIC)[0:16]
   AP: свой PTK → пересчёт MIC M2, сверка RSNE
M3 (AP→STA): ANonce, Replay Counter = 2, Install | Secure | Encrypted Key Data;
   Key Data = AES-KeyWrap(KEK, RSNE ‖ GTK KDE ‖ dd 00…); MIC по M3
   STA: проверка MIC, AES-KeyUnwrap → GTK, сверка RSNE с Beacon
M4 (STA→AP): Secure | MIC → установка TK и GTK, открытие порта 802.1X
```

### Модуль 2 — WPA3 SAE / Dragonfly на P-256 (FR-018…020, FR-031, FR-032)

```
H2E:  pwd-seed = HKDF-Extract(SSID, passphrase)
      u1, u2   = HKDF-Expand(pwd-seed, "SAE Hash to Element u{1,2} P{1,2}", 48) mod p
      PT       = SSWU(u1) + SSWU(u2)
      val      = HKDF-Extract(0³², max(MAC) ‖ min(MAC)) mod (r − 1) + 1
      PWE      = val · PT
H&P:  для counter = 1…≥40:
        pwd-seed  = HMAC-SHA256(max ‖ min MAC, base ‖ counter)
        pwd-value = KDF-256(pwd-seed, "SAE Hunting and Pecking", p)
        первая удачная (pwd-value < p и x³+ax+b — вычет) → x, save; base := случайная строка
      y = √(x³+ax+b), чётность по LSB(save) → PWE
Commit (каждая сторона): rand, mask ∈ (1, r) случайно
      scalar = (rand + mask) mod r,  element = −(mask · PWE)
      кадр: Algorithm 3, Seq 1, Status 0|126, Group 19, scalar, element
Проверка чужого Commit: 1 < scalar < r, точка на кривой, не отражение
K = rand · (peer_scalar · PWE + peer_element),  k = x(K)
keyseed = HMAC-SHA256(0³², k)
KCK ‖ PMK = KDF-512(keyseed, "SAE KCK and PMK", (scalar + peer_scalar) mod r)
PMKID = первые 16 байт (scalar + peer_scalar) mod r
confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer_scalar ‖ peer_element)
4-Way (AKM 8): PTK = KDF-SHA-256-384(PMK, "Pairwise key expansion", B);
      MIC = AES-128-CMAC(KCK, кадр); M3: GTK KDE + IGTK KDE под AES Key Wrap
Акцент модуля: перехватчик видит scalar, element, Confirm и кадры EAPOL —
без rand нельзя вычислить k, значит нечем проверить догадку о пароле офлайн.
```

### Модуль 3 — Hashcat 22000, перебор (FR-021…030)

```
ДЛЯ каждого word ∈ Dictionary.words:
   PMK' = PBKDF2-HMAC-SHA1(word, SSID, 4096)         ← реальный расчёт (clarify Q2)
   ├─ attackType = pmkid:
   │     PMKID' = HMAC-SHA1(PMK', "PMK Name"||AA||SPA)[0:16]
   │     match  = (PMKID' == CapturedDump.pmkid)
   └─ attackType = eapol:
         PTK' (PRF-384) → KCK';  MIC' = HMAC-SHA1(KCK', кадр M2 с нулевым MIC)[0:16]
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
