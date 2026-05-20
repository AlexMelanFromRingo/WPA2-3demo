# Contract — Crypto Web Worker

**Feature**: `001-wifi-security-spa` | **Date**: 2026-05-20
**Файл**: `src/app/core/crypto/crypto.worker.ts`

Контракт сообщений между UI-потоком и Web Worker. Воркер изолирует все тяжёлые
криптовычисления от UI-потока (Принцип IV конституции, research.md R2). Внутри —
WebCrypto API (PBKDF2/HMAC/SHA) и `@noble/curves` (P-256).

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

### `op: "wpa2.pmk"`
- **payload**: `{ passphrase: string, ssid: string }`
- **result**: `{ pmk: Uint8Array }` — PBKDF2-HMAC-SHA1, 4096 итераций, 256 бит.

### `op: "wpa2.ptk"`
- **payload**: `{ pmk: Uint8Array, apMac, clientMac, aNonce, sNonce: Uint8Array }`
- **result**: `{ ptk, kck, kek, tk: Uint8Array }` — PRF-512 + разбиение.

### `op: "wpa2.mic"`
- **payload**: `{ kck: Uint8Array, eapolFrame: Uint8Array }`
- **result**: `{ mic: Uint8Array /* 16 байт */ }`

### `op: "sae.pwe"`
- **payload**: `{ passphrase, ssid: string, apMac, clientMac: Uint8Array }`
- **result**: `{ pweX, pweY: Uint8Array }` — точка P-256 (hash-to-curve / H2E).

### `op: "sae.commit"` / `op: "sae.confirm"`
- **payload**: входы соответствующей фазы (см. data-model.md, цепочка SAE).
- **result**: скаляры/точки фазы + (для confirm) `{ pmk, kck: Uint8Array }`.

### `op: "h22000.crack"`
- **payload**: `{ attackType: "pmkid"|"eapol", ssid, words: string[],
  dump: CapturedDump, fastMode: boolean }`
- **поведение**: для каждого слова — реальный PBKDF2 + сверка (clarify Q2);
  периодически шлёт `WorkerProgress`; в `fastMode` прогресс реже, без покадровой
  анимации (FR-030).
- **result**: `{ outcome: "found"|"not-found", matchIndex: number|-1,
  perWord: Array<{ word, pmk, derived, match }> }`

## Гарантии контракта

- Воркер НЕ обращается к сети (Принцип V, техстандарт «офлайн»).
- Числовые результаты совпадают с эталонными тестовыми векторами (research.md R7).
- Тяжёлая операция не блокирует UI-поток; отмена — через смену `generation`.
- Ошибки возвращаются как `{ ok: false, error }`, воркер не падает молча.
