/**
 * Криптографические примитивы IEEE 802.11 на WebCrypto API.
 *
 * Каждая функция реализует ровно то, что описано в стандарте/RFC, и
 * сверяется с официальными тест-векторами (primitives.spec.ts):
 *   HMAC-SHA1 / HMAC-SHA256 ........ RFC 2104
 *   HKDF-Extract / HKDF-Expand ...... RFC 5869
 *   KDF-Hash-Length ................. IEEE 802.11-2020 §12.7.1.6.2
 *   PRF-Length (HMAC-SHA1) .......... IEEE 802.11-2020 §12.7.1.2
 *   AES-128-CMAC .................... RFC 4493 (NIST SP 800-38B)
 *   AES Key Wrap .................... RFC 3394
 */
import { utf8ToBytes } from './hex';

function subtle(): SubtleCrypto {
  return globalThis.crypto.subtle;
}

/**
 * WebCrypto в типизации TS 5.7+ требует ArrayBuffer-бэкенд (а не ArrayBufferLike).
 * Копия в свежий буфер это гарантирует и устраняет неоднозначность типов.
 */
export function asBuffer(data: Uint8Array): ArrayBuffer {
  return new Uint8Array(data).buffer;
}

/** Конкатенация байтовых массивов (‖ в формулах стандарта). */
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

/** Лексикографическое сравнение массивов равной длины (как memcmp). */
export function compareBytes(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return a[i] < b[i] ? -1 : 1;
    }
  }
  return a.length - b.length;
}

/** Побайтовое равенство. */
export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && compareBytes(a, b) === 0;
}

/** 16-битное целое в little-endian (так 802.11 кодирует i и Length в KDF). */
export function le16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >> 8) & 0xff]);
}

/** SHA-256 (FIPS 180-4). */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await subtle().digest('SHA-256', asBuffer(data)));
}

async function hmac(hash: 'SHA-1' | 'SHA-256', key: Uint8Array, message: Uint8Array) {
  // Пустой ключ WebCrypto не принимает, а HMAC (RFC 2104) дополняет ключ нулями
  // до размера блока — поэтому пустой ключ эквивалентен одному нулевому байту.
  const rawKey = key.length > 0 ? key : new Uint8Array(1);
  const cryptoKey = await subtle().importKey(
    'raw',
    asBuffer(rawKey),
    { name: 'HMAC', hash },
    false,
    ['sign'],
  );
  return new Uint8Array(await subtle().sign('HMAC', cryptoKey, asBuffer(message)));
}

/** HMAC-SHA1(ключ, сообщение) — 20 байт. */
export function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  return hmac('SHA-1', key, message);
}

/** HMAC-SHA256(ключ, сообщение) — 32 байта. */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  return hmac('SHA-256', key, message);
}

/** HKDF-Extract(salt, IKM) = HMAC-SHA256(salt, IKM) — RFC 5869 §2.2. */
export function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt, ikm);
}

/**
 * HKDF-Expand(PRK, info, L) — RFC 5869 §2.3:
 * T(i) = HMAC-SHA256(PRK, T(i−1) ‖ info ‖ i), выход = первые L байт T(1) ‖ T(2) ‖ …
 */
export async function hkdfExpand(
  prk: Uint8Array,
  info: string | Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const infoBytes = typeof info === 'string' ? utf8ToBytes(info) : info;
  const blocks: Uint8Array[] = [];
  let previous: Uint8Array = new Uint8Array(0);
  for (let i = 1; blocks.length * 32 < length; i++) {
    previous = await hmacSha256(prk, concatBytes(previous, infoBytes, new Uint8Array([i])));
    blocks.push(previous);
  }
  return concatBytes(...blocks).slice(0, length);
}

/**
 * KDF-SHA-256-Length(K, label, context) — IEEE 802.11-2020 §12.7.1.6.2:
 * result = HMAC-SHA256(K, i ‖ label ‖ context ‖ Length) для i = 1, 2, …,
 * где i и Length (в битах) — 16-битные little-endian.
 */
export async function kdfSha256(
  key: Uint8Array,
  label: string,
  context: Uint8Array,
  bits: number,
): Promise<Uint8Array> {
  return (await kdfSha256Blocks(key, label, context, bits)).slice(0, Math.ceil(bits / 8));
}

/**
 * Все блоки HMAC той же KDF до усечения (⌈bits/256⌉ × 32 байта) — для наглядности.
 * Length входит в КАЖДЫЙ блок, поэтому KDF-384 и KDF-512 дают разные байты.
 */
export async function kdfSha256Blocks(
  key: Uint8Array,
  label: string,
  context: Uint8Array,
  bits: number,
): Promise<Uint8Array> {
  const labelBytes = utf8ToBytes(label);
  const blocks: Uint8Array[] = [];
  const iterations = Math.ceil(bits / 256);
  for (let i = 1; i <= iterations; i++) {
    blocks.push(await hmacSha256(key, concatBytes(le16(i), labelBytes, context, le16(bits))));
  }
  return concatBytes(...blocks);
}

/**
 * PRF-Length(K, A, B) на HMAC-SHA1 — IEEE 802.11-2020 §12.7.1.2:
 * R = HMAC-SHA1(K, A ‖ 0x00 ‖ B ‖ i) для i = 0, 1, …, результат усекается до Length бит.
 */
export async function prfSha1(
  key: Uint8Array,
  label: string,
  data: Uint8Array,
  bits: number,
): Promise<Uint8Array> {
  const labelBytes = utf8ToBytes(label);
  const blocks: Uint8Array[] = [];
  for (let i = 0; i * 160 < bits; i++) {
    blocks.push(
      await hmacSha1(key, concatBytes(labelBytes, new Uint8Array([0x00]), data, new Uint8Array([i]))),
    );
  }
  return concatBytes(...blocks).slice(0, bits / 8);
}

async function aesCbcKey(key: Uint8Array): Promise<CryptoKey> {
  return subtle().importKey('raw', asBuffer(key), { name: 'AES-CBC' }, false, ['encrypt']);
}

/**
 * CBC-шифрование без добавленного WebCrypto паддинга: WebCrypto всегда
 * дописывает блок PKCS#7, поэтому последний (лишний) блок отбрасывается.
 */
async function aesCbcRaw(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const out = await subtle().encrypt(
    { name: 'AES-CBC', iv: new Uint8Array(16) },
    key,
    asBuffer(data),
  );
  return new Uint8Array(out).slice(0, data.length);
}

/** Сдвиг 128-битного блока влево на 1 бит с условным XOR константы Rb = 0x87. */
function cmacDouble(block: Uint8Array): Uint8Array {
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = ((block[i] << 1) | (i < 15 ? block[i + 1] >> 7 : 0)) & 0xff;
  }
  if (block[0] & 0x80) {
    out[15] ^= 0x87;
  }
  return out;
}

/**
 * AES-128-CMAC(K, M) — RFC 4493. Используется как MIC кадров EAPOL-Key
 * для AKM SAE (00-0F-AC:8) и AKM с SHA-256.
 */
export async function aesCmac(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cbcKey = await aesCbcKey(key);
  // Подключи K1, K2 из L = AES-K(0^128).
  const l = await aesCbcRaw(cbcKey, new Uint8Array(16));
  const k1 = cmacDouble(l);
  const k2 = cmacDouble(k1);

  const blockCount = Math.max(1, Math.ceil(message.length / 16));
  const complete = message.length > 0 && message.length % 16 === 0;
  const padded = new Uint8Array(blockCount * 16);
  padded.set(message);
  const lastOffset = (blockCount - 1) * 16;
  if (!complete) {
    padded[message.length] = 0x80; // паддинг 10…0
  }
  const subkey = complete ? k1 : k2;
  for (let i = 0; i < 16; i++) {
    padded[lastOffset + i] ^= subkey[i];
  }
  const cbc = await aesCbcRaw(cbcKey, padded);
  return cbc.slice(lastOffset, lastOffset + 16);
}

/**
 * AES Key Wrap (RFC 3394) — так KEK шифрует поле Key Data в сообщении M3.
 * Вход — кратен 8 байтам и не короче 16; выход на 8 байт длиннее.
 */
export async function aesKeyWrap(kek: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const wrappingKey = await subtle().importKey('raw', asBuffer(kek), 'AES-KW', false, ['wrapKey']);
  // AES-KW в WebCrypto оборачивает ключи — представляем данные как «сырой» HMAC-ключ.
  const dataKey = await subtle().importKey(
    'raw',
    asBuffer(plaintext),
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign'],
  );
  return new Uint8Array(await subtle().wrapKey('raw', dataKey, wrappingKey, 'AES-KW'));
}

/** Обратная операция AES Key Wrap (RFC 3394); бросает ошибку при неверной проверке целостности. */
export async function aesKeyUnwrap(kek: Uint8Array, wrapped: Uint8Array): Promise<Uint8Array> {
  const unwrappingKey = await subtle().importKey('raw', asBuffer(kek), 'AES-KW', false, [
    'unwrapKey',
  ]);
  const dataKey = await subtle().unwrapKey(
    'raw',
    asBuffer(wrapped),
    unwrappingKey,
    'AES-KW',
    { name: 'HMAC', hash: 'SHA-256', length: (wrapped.length - 8) * 8 },
    true,
    ['sign'],
  );
  return new Uint8Array(await subtle().exportKey('raw', dataKey));
}
