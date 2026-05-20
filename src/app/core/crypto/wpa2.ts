/**
 * Криптография WPA2 4-Way Handshake (T019).
 *
 * Все примитивы — нативный WebCrypto API (`crypto.subtle`), асинхронно.
 * Числа должны совпадать с эталонными тестовыми векторами (FR-017, SC-007):
 *   PMK = PBKDF2-HMAC-SHA1(пароль, SSID, 4096, 256 бит)
 *   PTK = PRF-512(PMK, "Pairwise key expansion", B)
 *   MIC = HMAC-SHA1(KCK, кадр EAPOL)[0:16]   (WPA2-CCMP, key descriptor v2)
 */
import { hexToBytes, parseMac, utf8ToBytes } from './hex';

/** Число итераций PBKDF2 для WPA2-PSK (фиксировано стандартом IEEE 802.11i). */
export const WPA2_PBKDF2_ITERATIONS = 4096;

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

/**
 * WebCrypto в типизации TS 5.7+ требует ArrayBuffer-бэкенд (а не ArrayBufferLike).
 * Копия в свежий буфер это гарантирует и устраняет неоднозначность типов.
 */
function asBuffer(data: Uint8Array): ArrayBuffer {
  return new Uint8Array(data).buffer;
}

/** Конкатенация байтовых массивов. */
export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Лексикографически упорядочивает два массива равной длины: `[меньший, больший]`. */
function ordered(a: Uint8Array, b: Uint8Array): readonly [Uint8Array, Uint8Array] {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? [a, b] : [b, a];
    }
  }
  return [a, b];
}

/** PMK = PBKDF2-HMAC-SHA1(пароль, SSID, 4096 итераций, 256 бит). */
export async function derivePmk(passphrase: string, ssid: string): Promise<Uint8Array> {
  const baseKey = await subtle().importKey('raw', utf8ToBytes(passphrase), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', salt: utf8ToBytes(ssid), iterations: WPA2_PBKDF2_ITERATIONS, hash: 'SHA-1' },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

/** HMAC-SHA1(ключ, сообщение). */
export async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await subtle().importKey(
    'raw',
    asBuffer(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  return new Uint8Array(await subtle().sign('HMAC', cryptoKey, asBuffer(message)));
}

/**
 * Псевдослучайная функция IEEE 802.11i на HMAC-SHA1.
 * PRF(K, label, data, bits) = конкатенация HMAC-SHA1(K, label || 0x00 || data || i).
 */
async function prf(
  key: Uint8Array,
  label: string,
  data: Uint8Array,
  bits: number,
): Promise<Uint8Array> {
  const neededBytes = bits / 8;
  const labelBytes = utf8ToBytes(label);
  const blocks: Uint8Array[] = [];
  for (let counter = 0; counter * 20 < neededBytes; counter++) {
    const input = concatBytes(
      labelBytes,
      new Uint8Array([0x00]),
      data,
      new Uint8Array([counter]),
    );
    blocks.push(await hmacSha1(key, input));
  }
  return concatBytes(...blocks).slice(0, neededBytes);
}

/** Результат вывода PTK с промежуточными значениями для визуализации. */
export interface PtkResult {
  /** Входной блок PRF: min/max MAC || min/max nonce. */
  readonly b: Uint8Array;
  /** Полный PTK для CCMP — 48 байт. */
  readonly ptk: Uint8Array;
  /** Key Confirmation Key — 16 байт (используется для MIC). */
  readonly kck: Uint8Array;
  /** Key Encryption Key — 16 байт. */
  readonly kek: Uint8Array;
  /** Temporal Key — 16 байт (шифрование трафика). */
  readonly tk: Uint8Array;
}

/**
 * PTK = PRF-512(PMK, "Pairwise key expansion", B), где
 * B = min(AA,SPA) || max(AA,SPA) || min(ANonce,SNonce) || max(ANonce,SNonce).
 * Для CCMP берутся первые 48 байт: KCK(16) || KEK(16) || TK(16).
 */
export async function derivePtk(
  pmk: Uint8Array,
  apMac: string,
  clientMac: string,
  aNonceHex: string,
  sNonceHex: string,
): Promise<PtkResult> {
  const [macLo, macHi] = ordered(parseMac(apMac), parseMac(clientMac));
  const [nonceLo, nonceHi] = ordered(hexToBytes(aNonceHex), hexToBytes(sNonceHex));
  const b = concatBytes(macLo, macHi, nonceLo, nonceHi);
  const full = await prf(pmk, 'Pairwise key expansion', b, 512);
  const ptk = full.slice(0, 48);
  return {
    b,
    ptk,
    kck: ptk.slice(0, 16),
    kek: ptk.slice(16, 32),
    tk: ptk.slice(32, 48),
  };
}

/**
 * Представительный кадр EAPOL-Key (сообщение M2 рукопожатия), поле MIC обнулено.
 * Используется как вход для расчёта MIC в учебных целях.
 */
export function buildEapolKeyFrame(sNonce: Uint8Array): Uint8Array {
  const frame = new Uint8Array(99);
  frame[0] = 0x02; // версия протокола 802.1X
  frame[1] = 0x03; // тип пакета: EAPOL-Key
  frame[2] = 0x00;
  frame[3] = 0x5f; // длина тела = 95 байт
  frame[4] = 0x02; // тип дескриптора ключа: RSN (WPA2)
  frame[5] = 0x01;
  frame[6] = 0x0a; // key information: HMAC-SHA1, pairwise, MIC present
  frame[7] = 0x00;
  frame[8] = 0x10; // длина ключа = 16
  frame[16] = 0x01; // replay counter = 1
  frame.set(sNonce, 17); // key nonce = SNonce, байты 17..48
  // байты 49..80 — IV/RSC/reserved (нули)
  // байты 81..96 — поле MIC (обнулено: MIC рассчитывается отдельно)
  // байты 97..98 — длина key data = 0
  return frame;
}

/** MIC = HMAC-SHA1(KCK, кадр EAPOL с обнулённым MIC), усечённый до 16 байт (WPA2-CCMP). */
export async function computeMic(kck: Uint8Array, eapolFrame: Uint8Array): Promise<Uint8Array> {
  const full = await hmacSha1(kck, eapolFrame);
  return full.slice(0, 16);
}
