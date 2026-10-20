/**
 * Криптография WPA2-Personal (AKM 00-0F-AC:2, CCMP-128, Key Descriptor Version 2).
 *
 * Все примитивы — нативный WebCrypto API (`crypto.subtle`), асинхронно.
 * Сверено с эталонами (wpa2.spec.ts): векторы PBKDF2 из IEEE 802.11i-2004
 * Annex H и реальная строка Hashcat 22000 (пароль «hashcat!»):
 *   PMK   = PBKDF2-HMAC-SHA1(пароль, SSID, 4096, 256 бит)
 *   PTK   = PRF-384(PMK, "Pairwise key expansion", B)
 *   MIC   = HMAC-SHA1(KCK, кадр EAPOL-Key с обнулённым MIC)[0:16]
 *   PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ AA ‖ SPA)[0:16]
 */
import { hexToBytes, parseMac, utf8ToBytes } from './hex';
import { buildRsne, type EapolKeyFields, KEY_INFO, serializeEapolKey, SUITE } from './eapol';
import { type FourWayResult, buildPtkInput, derivePtkFor, eapolMic, runFourWay } from './fourway';
import { asBuffer, concatBytes, hmacSha1 } from './primitives';

export { concatBytes, hmacSha1 } from './primitives';

/** Число итераций PBKDF2 для WPA2-PSK (фиксировано стандартом IEEE 802.11i). */
export const WPA2_PBKDF2_ITERATIONS = 4096;

/** PMK = PBKDF2-HMAC-SHA1(пароль, SSID, 4096 итераций, 256 бит). */
export async function derivePmk(passphrase: string, ssid: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const baseKey = await subtle.importKey('raw', asBuffer(utf8ToBytes(passphrase)), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: asBuffer(utf8ToBytes(ssid)),
      iterations: WPA2_PBKDF2_ITERATIONS,
      hash: 'SHA-1',
    },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

/** Промежуточные значения цепочки PBKDF2 (блок 1) — для наглядной трассировки. */
export interface Pbkdf2Trace {
  /** U1 = HMAC-SHA1(пароль, соль ‖ 0x00000001). */
  u1: Uint8Array;
  /** U2 = HMAC-SHA1(пароль, U1). */
  u2: Uint8Array;
  /** U3 = HMAC-SHA1(пароль, U2). */
  u3: Uint8Array;
}

/**
 * Первые три звена цепочки PBKDF2 для блока 1 (U1, U2, U3).
 * Показывает, что «4096 итераций» — это цепочка HMAC-SHA1, где каждый
 * следующий U вычисляется из предыдущего.
 */
export async function pbkdf2Trace(passphrase: string, ssid: string): Promise<Pbkdf2Trace> {
  const password = utf8ToBytes(passphrase);
  // Вход первого HMAC: соль (SSID) ‖ номер блока (4 байта big-endian) = 1.
  const block1Input = concatBytes(utf8ToBytes(ssid), new Uint8Array([0, 0, 0, 1]));
  const u1 = await hmacSha1(password, block1Input);
  const u2 = await hmacSha1(password, u1);
  const u3 = await hmacSha1(password, u2);
  return { u1, u2, u3 };
}

/** Результат вывода PTK с промежуточными значениями для визуализации. */
export interface PtkResult {
  /** Входной блок PRF: min/max MAC ‖ min/max nonce. */
  readonly b: Uint8Array;
  /** PTK для CCMP — 48 байт. */
  readonly ptk: Uint8Array;
  /** Key Confirmation Key — 16 байт (используется для MIC). */
  readonly kck: Uint8Array;
  /** Key Encryption Key — 16 байт (шифрует Key Data в M3). */
  readonly kek: Uint8Array;
  /** Temporal Key — 16 байт (шифрование трафика). */
  readonly tk: Uint8Array;
}

/**
 * PTK = PRF-384(PMK, "Pairwise key expansion", B), где
 * B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce).
 * Для CCMP: KCK(16) ‖ KEK(16) ‖ TK(16).
 */
export async function derivePtk(
  pmk: Uint8Array,
  apMac: string,
  clientMac: string,
  aNonceHex: string,
  sNonceHex: string,
): Promise<PtkResult> {
  const b = buildPtkInput(parseMac(apMac), parseMac(clientMac), hexToBytes(aNonceHex), hexToBytes(sNonceHex));
  const { ptk } = await derivePtkFor('psk', pmk, b);
  return { b, ptk, kck: ptk.slice(0, 16), kek: ptk.slice(16, 32), tk: ptk.slice(32, 48) };
}

/**
 * Сообщение M2 рукопожатия WPA2-PSK с обнулённым полем MIC — ровно тот кадр,
 * по которому клиент считает MIC (и который Hashcat кладёт в строку 22000):
 * версия 802.1X = 1, Key Information = 0x010a (MIC | Pairwise | версия 2),
 * Key Length = 0, Replay Counter = 1, Key Nonce = SNonce, Key Data = RSNE клиента.
 */
export function buildEapolKeyFrame(sNonce: Uint8Array): Uint8Array {
  const fields: EapolKeyFields = {
    protocolVersion: 1,
    keyInfo: 2 | KEY_INFO.PAIRWISE | KEY_INFO.MIC,
    keyLength: 0,
    replayCounter: 1,
    nonce: sNonce,
    keyIv: new Uint8Array(16),
    keyRsc: new Uint8Array(8),
    mic: new Uint8Array(16),
    keyData: buildRsne(SUITE.AKM_PSK, 0x0000),
  };
  return serializeEapolKey(fields);
}

/** MIC = HMAC-SHA1(KCK, кадр EAPOL с обнулённым MIC), усечённый до 16 байт (WPA2-CCMP). */
export function computeMic(kck: Uint8Array, eapolFrame: Uint8Array): Promise<Uint8Array> {
  return eapolMic('psk', kck, eapolFrame);
}

/** PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ AA ‖ SPA), усечённый до 16 байт. */
export async function computePmkid(
  pmk: Uint8Array,
  apMac: string,
  clientMac: string,
): Promise<Uint8Array> {
  const data = concatBytes(utf8ToBytes('PMK Name'), parseMac(apMac), parseMac(clientMac));
  return (await hmacSha1(pmk, data)).slice(0, 16);
}

/** Сценарий полного рукопожатия WPA2. */
export interface Wpa2Params {
  ssid: string;
  passphrase: string;
  apMac: string;
  clientMac: string;
  aNonce: string;
  sNonce: string;
  gtk: string;
}

/** Полный результат рукопожатия WPA2-PSK: PMK → PTK → M1…M4. */
export interface Wpa2RunResult {
  pmk: Uint8Array;
  pbkdf2Trace: Pbkdf2Trace;
  pmkid: Uint8Array;
  fourWay: FourWayResult;
}

/** Полное рукопожатие WPA2-Personal от пароля до установки ключей. */
export async function runWpa2(params: Wpa2Params): Promise<Wpa2RunResult> {
  const pmk = await derivePmk(params.passphrase, params.ssid);
  const trace = await pbkdf2Trace(params.passphrase, params.ssid);
  const pmkid = await computePmkid(pmk, params.apMac, params.clientMac);
  const fourWay = await runFourWay({
    akm: 'psk',
    pmk,
    pmkid,
    apMac: parseMac(params.apMac),
    clientMac: parseMac(params.clientMac),
    aNonce: hexToBytes(params.aNonce),
    sNonce: hexToBytes(params.sNonce),
    gtk: hexToBytes(params.gtk),
  });
  return { pmk, pbkdf2Trace: trace, pmkid, fourWay };
}
