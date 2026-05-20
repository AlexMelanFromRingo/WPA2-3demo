/**
 * Криптография WPA3 SAE (Dragonfly) на эллиптической кривой P-256 (T027).
 *
 * Реализация выполняет НАСТОЯЩИЕ вычисления на стандартной кривой P-256
 * (clarify Q1): вывод PWE как реальной точки кривой, реальные обмены
 * Commit/Confirm, реальный общий секрет.
 *
 * Эллиптическая арифметика — через audited-библиотеку `@noble/curves`.
 * PWE выводится детерминированным hash-to-curve по RFC 9380 (SSWU) — это
 * примитив, лежащий в основе современного WPA3 SAE-H2E.
 *
 * Корректность проверяется криптографическим свойством СХОДИМОСТИ: обе стороны
 * (точка доступа и клиент) независимо приходят к одному и тому же общему
 * секрету и PMK. Неверная реализация это свойство не воспроизводит. Примитив
 * hash-to-curve дополнительно сверяется побайтово с официальными тест-векторами
 * RFC 9380 (см. sae.spec.ts).
 *
 * Примечание: значения rand/mask здесь выводятся детерминированно из сценария
 * (ради воспроизводимости и тестируемости); в реальном SAE они случайны —
 * на саму математику это не влияет.
 */
import { p256, p256_hasher } from '@noble/curves/nist.js';
import { parseMac, utf8ToBytes } from './hex';
import { concatBytes } from './wpa2';

/** Тип точки кривой P-256. */
export type CurvePoint = typeof p256.Point.BASE;

/** Порядок группы (число точек) кривой P-256. */
const ORDER = p256.Point.Fn.ORDER;

function mod(value: bigint, modulus: bigint): bigint {
  const result = value % modulus;
  return result >= 0n ? result : result + modulus;
}

function bytesToBigint(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

/** Кодирует целое в 32 байта big-endian (скаляры и координаты P-256 < 2^256). */
export function bigintToBytes32(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let remaining = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

/** WebCrypto в TS 5.7+ требует ArrayBuffer-бэкенд; копия это гарантирует. */
function asBuffer(data: Uint8Array): ArrayBuffer {
  return new Uint8Array(data).buffer;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', asBuffer(data)));
}

async function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    asBuffer(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', cryptoKey, asBuffer(message)));
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  return 0;
}

/** Детерминированный скаляр в диапазоне [1, ORDER-1] из произвольных данных. */
async function deriveScalar(parts: Uint8Array[]): Promise<bigint> {
  const digest = await sha256(concatBytes(...parts));
  return mod(bytesToBigint(digest), ORDER - 1n) + 1n;
}

/** Общий «затравочный» хэш: пароль + SSID + упорядоченные MAC-адреса. */
export async function computeSaeSeed(
  passphrase: string,
  ssid: string,
  apMac: string,
  clientMac: string,
): Promise<Uint8Array> {
  const m1 = parseMac(apMac);
  const m2 = parseMac(clientMac);
  const [lo, hi] = compareBytes(m1, m2) <= 0 ? [m1, m2] : [m2, m1];
  return sha256(concatBytes(utf8ToBytes(passphrase), utf8ToBytes(ssid), lo, hi));
}

/**
 * Domain-separation tag для вывода PWE. Метод — RFC 9380
 * `P256_XMD:SHA-256_SSWU_RO_`, тот же примитив hash-to-curve, что лежит в
 * основе IEEE 802.11 SAE-H2E. Примитив проверяется побайтово против официальных
 * тест-векторов RFC 9380 (см. sae.vectors.ts → RFC9380_P256_HASH_TO_CURVE).
 */
export const SAE_H2E_DST = 'WPA3-SAE-H2E-EDU-v1-P256_XMD:SHA-256_SSWU_RO_';

/** PWE — точка-представитель пароля на P-256 (RFC 9380 hash-to-curve, метод SSWU). */
export function derivePwe(seed: Uint8Array): CurvePoint {
  return p256_hasher.hashToCurve(seed, { DST: SAE_H2E_DST });
}

/** Данные фазы Commit одной стороны. */
interface SaeCommit {
  readonly rand: bigint;
  readonly mask: bigint;
  /** commit-scalar = (rand + mask) mod n. */
  readonly scalar: bigint;
  /** commit-element = −(mask · PWE). */
  readonly element: CurvePoint;
}

async function makeCommit(pwe: CurvePoint, seed: Uint8Array, peer: string): Promise<SaeCommit> {
  const rand = await deriveScalar([seed, utf8ToBytes(`${peer}:rand`)]);
  const mask = await deriveScalar([seed, utf8ToBytes(`${peer}:mask`)]);
  const scalar = mod(rand + mask, ORDER);
  const element = pwe.multiply(mask).negate();
  return { rand, mask, scalar, element };
}

/** Общий секрет K = rand · (peerScalar · PWE + peerElement). */
function sharedSecret(
  rand: bigint,
  peerScalar: bigint,
  peerElement: CurvePoint,
  pwe: CurvePoint,
): CurvePoint {
  return pwe.multiply(peerScalar).add(peerElement).multiply(rand);
}

async function derivePmkKck(
  sharedK: CurvePoint,
  scalarAp: bigint,
  scalarClient: bigint,
): Promise<{ pmk: Uint8Array; kck: Uint8Array }> {
  const keyseed = await hmacSha256(new Uint8Array(32), bigintToBytes32(sharedK.x));
  const context = bigintToBytes32(mod(scalarAp + scalarClient, ORDER));
  const label = utf8ToBytes('SAE KCK and PMK');
  const pmk = await hmacSha256(keyseed, concatBytes(label, context, new Uint8Array([0x01])));
  const kck = await hmacSha256(keyseed, concatBytes(label, context, new Uint8Array([0x02])));
  return { pmk, kck };
}

/** Полный результат обмена SAE с промежуточными значениями для визуализации. */
export interface SaeRunResult {
  /** PWE — сжатое представление точки (33 байта). */
  pwe: Uint8Array;
  /** X-координата PWE (32 байта). */
  pweX: Uint8Array;
  /** commit-scalar точки доступа. */
  apScalar: Uint8Array;
  /** commit-element точки доступа (сжатая точка). */
  apElement: Uint8Array;
  /** commit-scalar клиента. */
  clientScalar: Uint8Array;
  /** commit-element клиента (сжатая точка). */
  clientElement: Uint8Array;
  /** X-координата общего секрета K (одинакова у обеих сторон). */
  sharedKx: Uint8Array;
  /** Итоговый PMK. */
  pmk: Uint8Array;
  /** Key Confirmation Key. */
  kck: Uint8Array;
  /** Сошлись ли стороны к одному секрету — ключевое свойство SAE. */
  converged: boolean;
}

/**
 * Полный обмен SAE между точкой доступа и клиентом.
 * Вычисляет K для обеих сторон и проверяет их сходимость.
 */
export async function runSae(
  passphrase: string,
  ssid: string,
  apMac: string,
  clientMac: string,
): Promise<SaeRunResult> {
  const seed = await computeSaeSeed(passphrase, ssid, apMac, clientMac);
  const pwe = derivePwe(seed);

  const ap = await makeCommit(pwe, seed, 'AP');
  const client = await makeCommit(pwe, seed, 'CLIENT');

  const kAp = sharedSecret(ap.rand, client.scalar, client.element, pwe);
  const kClient = sharedSecret(client.rand, ap.scalar, ap.element, pwe);
  const converged = kAp.equals(kClient);

  const { pmk, kck } = await derivePmkKck(kAp, ap.scalar, client.scalar);

  return {
    pwe: pwe.toBytes(),
    pweX: bigintToBytes32(pwe.x),
    apScalar: bigintToBytes32(ap.scalar),
    apElement: ap.element.toBytes(),
    clientScalar: bigintToBytes32(client.scalar),
    clientElement: client.element.toBytes(),
    sharedKx: bigintToBytes32(kAp.x),
    pmk,
    kck,
    converged,
  };
}
