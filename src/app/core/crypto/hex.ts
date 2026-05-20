/**
 * Утилиты hex-дампов и преобразований байтов (T008).
 * Используются hex-инспектором и криптомодулями.
 */

const HEX_CHARS = '0123456789abcdef';

/** Байты → строчная hex-строка без разделителей. */
export function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    out += HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f];
  }
  return out;
}

/** Hex-строка (разделители `:` и пробелы допустимы) → байты. */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.replace(/[\s:]/g, '').toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error('Hex-строка должна содержать чётное число символов');
  }
  if (clean.length > 0 && !/^[0-9a-f]+$/.test(clean)) {
    throw new Error('Hex-строка содержит недопустимый символ');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Текст → байты в кодировке UTF-8. */
export function utf8ToBytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

/** Разбирает MAC-адрес в 6 байт. Бросает ошибку при некорректном формате. */
export function parseMac(mac: string): Uint8Array<ArrayBuffer> {
  const clean = mac.replace(/[\s:.-]/g, '').toLowerCase();
  if (clean.length !== 12 || !/^[0-9a-f]{12}$/.test(clean)) {
    throw new Error(`Некорректный MAC-адрес: «${mac}»`);
  }
  return hexToBytes(clean);
}

/** 6 байт → MAC-адрес вида `aa:bb:cc:dd:ee:ff`. */
export function formatMac(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f]).join(':');
}

/** Проверяет, что строка — корректный hex (опционально заданной длины в байтах). */
export function isValidHex(value: string, byteLength?: number): boolean {
  const clean = value.replace(/[\s:]/g, '');
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) {
    return false;
  }
  return byteLength === undefined || clean.length === byteLength * 2;
}

/** Форматирует байты в многострочный hex-дамп со смещениями (для hex-инспектора). */
export function formatHexDump(bytes: Uint8Array, bytesPerRow = 16): string {
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += bytesPerRow) {
    const chunk = bytes.subarray(i, i + bytesPerRow);
    const offset = i.toString(16).padStart(6, '0');
    const hexPart = Array.from(chunk, (b) => HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f]).join(' ');
    rows.push(`${offset}  ${hexPart}`);
  }
  return rows.join('\n');
}
