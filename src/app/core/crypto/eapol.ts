/**
 * Кадры EAPOL-Key и элементы, которые в них передаются (IEEE 802.11-2020 §12.7.2, §9.4.2.24).
 *
 * Все многобайтовые поля кадра EAPOL-Key — big-endian; поля внутри RSNE —
 * little-endian (так устроен сам стандарт, это не ошибка).
 */
import { concatBytes } from './primitives';

/** Биты поля Key Information (IEEE 802.11-2020, рис. 12-33). */
export const KEY_INFO = {
  /** Биты 0–2: Key Descriptor Version. */
  VERSION_MASK: 0x0007,
  /** Бит 3: Key Type — 1 = парный ключ (PTK). */
  PAIRWISE: 0x0008,
  /** Бит 6: Install — «установи ключ». */
  INSTALL: 0x0040,
  /** Бит 7: Key Ack — отправитель (AP) ждёт ответа. */
  ACK: 0x0080,
  /** Бит 8: Key MIC — в кадре есть код целостности. */
  MIC: 0x0100,
  /** Бит 9: Secure — ключи установлены. */
  SECURE: 0x0200,
  /** Бит 12: Encrypted Key Data — поле Key Data зашифровано KEK. */
  ENCRYPTED_KEY_DATA: 0x1000,
} as const;

/** Key Descriptor Version: 2 — HMAC-SHA1-128 + AES Key Wrap (WPA2-CCMP); 0 — задаётся AKM (SAE). */
export type KeyDescriptorVersion = 0 | 2;

/** Поля кадра EAPOL-Key в том порядке, в каком они идут по эфиру. */
export interface EapolKeyFields {
  /** Версия протокола 802.1X: 1 (802.1X-2001) или 2 (802.1X-2004). */
  protocolVersion: number;
  keyInfo: number;
  /** Длина парного ключа шифра (16 для CCMP) — в M1/M3; в M2/M4 — 0. */
  keyLength: number;
  replayCounter: number;
  nonce: Uint8Array;
  keyIv: Uint8Array;
  keyRsc: Uint8Array;
  mic: Uint8Array;
  keyData: Uint8Array;
}

/** Описание одного поля кадра для байтовых диаграмм. */
export interface FrameField {
  id: EapolFieldId;
  offset: number;
  length: number;
}

export type EapolFieldId =
  | 'version'
  | 'type'
  | 'bodyLength'
  | 'descriptor'
  | 'keyInfo'
  | 'keyLength'
  | 'replay'
  | 'nonce'
  | 'iv'
  | 'rsc'
  | 'reserved'
  | 'mic'
  | 'keyDataLength'
  | 'keyData';

/** Смещение поля Key MIC от начала кадра (4 байта заголовка 802.1X + 77). */
export const MIC_OFFSET = 81;

/** Раскладка полей кадра EAPOL-Key по байтам. */
export function eapolLayout(keyDataLength: number): FrameField[] {
  const sizes: [EapolFieldId, number][] = [
    ['version', 1],
    ['type', 1],
    ['bodyLength', 2],
    ['descriptor', 1],
    ['keyInfo', 2],
    ['keyLength', 2],
    ['replay', 8],
    ['nonce', 32],
    ['iv', 16],
    ['rsc', 8],
    ['reserved', 8],
    ['mic', 16],
    ['keyDataLength', 2],
    ['keyData', keyDataLength],
  ];
  let offset = 0;
  return sizes.map(([id, length]) => {
    const field = { id, offset, length };
    offset += length;
    return field;
  });
}

function be16(value: number): Uint8Array {
  return new Uint8Array([(value >> 8) & 0xff, value & 0xff]);
}

function be64(value: number): Uint8Array {
  const out = new Uint8Array(8);
  let remaining = BigInt(value);
  for (let i = 7; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

/**
 * Сериализует кадр EAPOL-Key: заголовок 802.1X (версия, тип 3 = Key, длина тела)
 * и тело дескриптора RSN (тип 2).
 */
export function serializeEapolKey(fields: EapolKeyFields): Uint8Array {
  const body = concatBytes(
    new Uint8Array([0x02]), // Descriptor Type = 2 (RSN)
    be16(fields.keyInfo),
    be16(fields.keyLength),
    be64(fields.replayCounter),
    fields.nonce,
    fields.keyIv,
    fields.keyRsc,
    new Uint8Array(8), // Reserved
    fields.mic,
    be16(fields.keyData.length),
    fields.keyData,
  );
  return concatBytes(new Uint8Array([fields.protocolVersion, 0x03]), be16(body.length), body);
}

/** Копия кадра с обнулённым полем MIC — именно по ней считается MIC. */
export function zeroMic(frame: Uint8Array): Uint8Array {
  const copy = new Uint8Array(frame);
  copy.fill(0, MIC_OFFSET, MIC_OFFSET + 16);
  return copy;
}

/** Номера наборов (suite) в OUI 00-0F-AC. */
export const SUITE = {
  CCMP_128: 4,
  BIP_CMAC_128: 6,
  AKM_PSK: 2,
  AKM_SAE: 8,
} as const;

/** RSN Capabilities: бит 6 — MFPR (PMF обязателен), бит 7 — MFPC (PMF поддерживается). */
export const RSN_CAP_MFPR = 0x0040;
export const RSN_CAP_MFPC = 0x0080;

/**
 * RSNE (элемент 48): версия 1, групповой шифр, один парный шифр, один AKM,
 * RSN Capabilities. Пример WPA2-PSK: 30 14 01 00 00 0f ac 04 01 00 00 0f ac 04 01 00 00 0f ac 02 00 00.
 */
export function buildRsne(akm: number, capabilities: number): Uint8Array {
  const oui = (type: number) => new Uint8Array([0x00, 0x0f, 0xac, type]);
  const content = concatBytes(
    new Uint8Array([0x01, 0x00]), // Version = 1 (LE)
    oui(SUITE.CCMP_128), // Group Data Cipher Suite
    new Uint8Array([0x01, 0x00]), // Pairwise Cipher Suite Count = 1
    oui(SUITE.CCMP_128),
    new Uint8Array([0x01, 0x00]), // AKM Suite Count = 1
    oui(akm),
    new Uint8Array([capabilities & 0xff, (capabilities >> 8) & 0xff]),
  );
  return concatBytes(new Uint8Array([0x30, content.length]), content);
}

/** RSNXE (элемент 244) с битом 5 «SAE Hash-to-Element» — защищает выбор H2E от даунгрейда. */
export function buildRsnxeH2e(): Uint8Array {
  return new Uint8Array([0xf4, 0x01, 0x20]);
}

function kde(dataType: number, payload: Uint8Array): Uint8Array {
  return concatBytes(new Uint8Array([0xdd, payload.length + 4, 0x00, 0x0f, 0xac, dataType]), payload);
}

/** PMKID KDE (тип 4) — точка доступа кладёт его в Key Data сообщения M1. */
export function buildPmkidKde(pmkid: Uint8Array): Uint8Array {
  return kde(4, pmkid);
}

/** GTK KDE (тип 1): KeyID (биты 0–1) и Tx (бит 2), резервный байт, сам GTK. */
export function buildGtkKde(gtk: Uint8Array, keyId = 1): Uint8Array {
  return kde(1, concatBytes(new Uint8Array([keyId & 0x03, 0x00]), gtk));
}

/** IGTK KDE (тип 9): KeyID (2 байта LE), IPN (6 байт), IGTK — для PMF. */
export function buildIgtkKde(igtk: Uint8Array, keyId = 4): Uint8Array {
  return kde(9, concatBytes(new Uint8Array([keyId & 0xff, (keyId >> 8) & 0xff]), new Uint8Array(6), igtk));
}

/**
 * Паддинг Key Data перед AES Key Wrap (IEEE 802.11-2020 §12.7.2):
 * если длина < 16 или не кратна 8 — дописать 0xdd и затем нули.
 */
export function padKeyData(keyData: Uint8Array): Uint8Array {
  if (keyData.length >= 16 && keyData.length % 8 === 0) {
    return keyData;
  }
  const target = Math.max(16, Math.ceil((keyData.length + 1) / 8) * 8);
  const out = new Uint8Array(target);
  out.set(keyData);
  out[keyData.length] = 0xdd;
  return out;
}
