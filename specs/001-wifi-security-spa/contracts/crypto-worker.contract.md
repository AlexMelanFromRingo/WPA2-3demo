# Contract — Crypto Web Worker

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20 (обновлено 2026-10-21)
**Файл**: `src/app/core/crypto/crypto.worker.ts`

Контракт сообщений между UI-потоком и Web Worker. Воркер изолирует все тяжёлые
криптовычисления от UI-потока (Принцип IV конституции, research.md R2). Внутри —
WebCrypto API (PBKDF2, HMAC, SHA-256, AES-CBC для CMAC, AES-KW) и `@noble/curves`
(арифметика точек P-256). Алгоритмы — по IEEE 802.11-2020 (research.md R8).

## Общая форма сообщений

Каждый запрос несёт `id` (uuid) и `generation` (токен поколения). Воркер
возвращает ответ с тем же `id`; UI-поток игнорирует ответы устаревшего поколения
(реализация отмены — FR-009).

```
WorkerRequest  = { id: string; generation: number; op: OpName; payload: object }
WorkerResponse = { id: string; generation: number; ok: true;  result: object }
               | { id: string; generation: number; ok: false; error: string }
WorkerProgress = { id: string; generation: number; progress: number /* 0..1 */ }
```

## Операции

Каждая операция считает сценарий целиком за один запрос: промежуточные точки
кривой не пересекают границу воркера, а результат содержит только байты, числа и
флаги (structured clone).

### `op: "ping"`
- **result**: `"pong"` — проверка живости воркера.

### `op: "wpa2.run"`
- **payload**: `{ ssid, passphrase, apMac, clientMac, aNonce, sNonce, gtk: string }`
  (MAC — `aa:bb:cc:dd:ee:ff`, nonce и GTK — hex).
- **result** (`Wpa2RunResult`): `{ pmk, pbkdf2Trace: { u1, u2, u3 }, pmkid,
  fourWay: FourWayResult }` — PBKDF2-HMAC-SHA1 (4096, 256 бит), PMKID, затем
  4-Way M1–M4 для AKM PSK: PRF-384, HMAC-SHA1-128, AES Key Wrap для Key Data M3,
  взаимные проверки MIC и RSNE (data-model.md §9).

### `op: "sae.run"`
- **payload**: `NetworkScenario & { method: "h2e" | "hnp" }` — нужны ssid,
  passphrase, apMac, clientMac, aNonce, sNonce, gtk, igtk.
- **result** (`SaeRunResult`, data-model.md §10): PWE выбранным способом с
  трассировкой (итерации H&P или шаги HKDF/SSWU), Commit обеих сторон со
  случайными rand/mask, проверки чужого Commit, k, KCK/PMK/PMKID, Confirm и их
  взаимная проверка, затем 4-Way для AKM SAE (KDF-SHA-256, AES-128-CMAC, IGTK).
  Каждый запуск даёт новые rand/mask — повторный вызов возвращает другой PMK при
  том же PWE.

### `op: "h22000.crack"`
- **payload** (`CrackParams`): `{ attackType: "pmkid"|"eapol", ssid, apMac,
  clientMac, aNonce, sNonce, secretPassword, words: string[] }`.
- **поведение**: перехваченный хэш считается из `secretPassword`; для каждого
  слова — реальный PBKDF2 и PMKID или PTK → MIC по кадру M2 (clarify Q2). Перебор
  считается целиком в воркере; режим ускоренного перебора реализован на стороне UI
  (FR-030).
- **result** (`CrackResult`): `{ attackType, ssid, apMac, clientMac,
  capturedHashHex, hash22000Line, perWord: Array<{ word, pmkHex, hashHex, match }>,
  matchIndex: number|-1, outcome: "found"|"not-found" }`; строка 22000 — в формате
  data-model.md §7.

## Гарантии контракта

- Воркер НЕ обращается к сети (Принцип V, техстандарт «офлайн»).
- Числовые результаты совпадают с эталонными тестовыми векторами (research.md R7).
- Тяжёлая операция не блокирует UI-поток; отмена — через смену `generation`.
- Ошибки возвращаются как `{ ok: false, error }`, воркер не падает молча.
