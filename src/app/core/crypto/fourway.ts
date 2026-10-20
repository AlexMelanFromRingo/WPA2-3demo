/**
 * 4-Way Handshake целиком — сообщения M1–M4 (IEEE 802.11-2020 §12.7.6).
 *
 * Одна реализация для двух AKM:
 *   'psk' — WPA2-Personal (AKM 00-0F-AC:2), Key Descriptor Version 2:
 *           PTK = PRF-384 (HMAC-SHA1), MIC = HMAC-SHA1-128.
 *   'sae' — WPA3-Personal (AKM 00-0F-AC:8), Key Descriptor Version 0:
 *           PTK = KDF-SHA-256-384, MIC = AES-128-CMAC, PMF обязателен (IGTK в M3).
 *
 * Точка доступа и клиент считают всё НЕЗАВИСИМО, каждый из своей копии PMK,
 * и проверяют MIC друг друга — как настоящие стороны рукопожатия.
 */
import {
  buildGtkKde,
  buildIgtkKde,
  buildPmkidKde,
  buildRsne,
  buildRsnxeH2e,
  type EapolKeyFields,
  KEY_INFO,
  padKeyData,
  RSN_CAP_MFPC,
  RSN_CAP_MFPR,
  serializeEapolKey,
  SUITE,
  zeroMic,
} from './eapol';
import {
  aesCmac,
  aesKeyUnwrap,
  aesKeyWrap,
  compareBytes,
  concatBytes,
  equalBytes,
  hmacSha1,
  kdfSha256Blocks,
  prfSha1,
} from './primitives';

export type Akm = 'psk' | 'sae';

/** Входные данные рукопожатия. */
export interface FourWayParams {
  akm: Akm;
  /** PMK точки доступа и клиента (в реальности — у каждого своя копия). */
  pmk: Uint8Array;
  /** PMKID для PMKID KDE в M1. */
  pmkid: Uint8Array;
  /** AA — MAC точки доступа (Authenticator Address). */
  apMac: Uint8Array;
  /** SPA — MAC клиента (Supplicant Address). */
  clientMac: Uint8Array;
  aNonce: Uint8Array;
  sNonce: Uint8Array;
  gtk: Uint8Array;
  /** IGTK — обязателен для 'sae' (PMF). */
  igtk?: Uint8Array;
  /** SAE с H2E: в Key Data M2 и M3 добавляется RSNXE. */
  h2e?: boolean;
  /** Начальное значение Replay Counter (M1, M2); в M3, M4 оно на единицу больше. */
  replayCounter?: number;
}

/** Одно сообщение рукопожатия. */
export interface FourWayMessage {
  name: 'M1' | 'M2' | 'M3' | 'M4';
  from: 'ap' | 'client';
  fields: EapolKeyFields;
  /** Кадр, ушедший в эфир (с MIC, если он есть). */
  frame: Uint8Array;
  /** Кадр с обнулённым MIC — вход функции MIC (нет у M1). */
  micInput?: Uint8Array;
  /** Полный выход функции MIC до усечения (HMAC-SHA1 — 20 байт, CMAC — 16). */
  micRaw?: Uint8Array;
  mic?: Uint8Array;
}

/** Полный результат рукопожатия. */
export interface FourWayResult {
  akm: Akm;
  keyDescriptorVersion: 0 | 2;
  /** B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce). */
  b: Uint8Array;
  /** Сырой выход PRF/KDF до усечения (для PRF-384 это 3 блока HMAC = 60 байт). */
  ptkRaw: Uint8Array;
  ptk: Uint8Array;
  kck: Uint8Array;
  kek: Uint8Array;
  tk: Uint8Array;
  rsneClient: Uint8Array;
  rsneAp: Uint8Array;
  /** Открытое содержимое Key Data в M3 (RSNE [‖ RSNXE] ‖ GTK KDE [‖ IGTK KDE]). */
  m3KeyDataPlain: Uint8Array;
  /** То же после паддинга 0xdd 00… */
  m3KeyDataPadded: Uint8Array;
  /** То же после AES Key Wrap ключом KEK. */
  m3KeyDataWrapped: Uint8Array;
  /** GTK, который клиент достал из M3 своим KEK. */
  gtkUnwrapped: Uint8Array;
  messages: [FourWayMessage, FourWayMessage, FourWayMessage, FourWayMessage];
  checks: {
    /** AP пересчитал MIC сообщения M2 своим KCK — совпал. */
    apVerifiesM2: boolean;
    /** AP сверил RSNE из M2 с RSNE из Association Request. */
    apChecksRsne: boolean;
    /** Клиент пересчитал MIC сообщения M3 — совпал. */
    clientVerifiesM3: boolean;
    /** Клиент сверил RSNE из M3 с RSNE из Beacon / Probe Response. */
    clientChecksRsne: boolean;
    /** Клиент расшифровал Key Data и получил тот же GTK. */
    clientUnwrapsGtk: boolean;
    /** AP пересчитал MIC сообщения M4 — совпал. */
    apVerifiesM4: boolean;
  };
}

function ordered(a: Uint8Array, b: Uint8Array): [Uint8Array, Uint8Array] {
  return compareBytes(a, b) <= 0 ? [a, b] : [b, a];
}

/** Блок B — одинаков у обеих сторон благодаря упорядочиванию min/max. */
export function buildPtkInput(
  apMac: Uint8Array,
  clientMac: Uint8Array,
  aNonce: Uint8Array,
  sNonce: Uint8Array,
): Uint8Array {
  const [macLo, macHi] = ordered(apMac, clientMac);
  const [nonceLo, nonceHi] = ordered(aNonce, sNonce);
  return concatBytes(macLo, macHi, nonceLo, nonceHi);
}

/**
 * PTK для CCMP-128: KCK(128) ‖ KEK(128) ‖ TK(128) = 384 бита.
 * 'psk' — PRF-384 на HMAC-SHA1 (3 блока по 20 байт, берутся первые 48);
 * 'sae' — KDF-SHA-256-384 (2 блока по 32 байта, берутся первые 48).
 */
export async function derivePtkFor(
  akm: Akm,
  pmk: Uint8Array,
  b: Uint8Array,
): Promise<{ ptkRaw: Uint8Array; ptk: Uint8Array }> {
  const label = 'Pairwise key expansion';
  if (akm === 'psk') {
    const ptkRaw = await prfSha1(pmk, label, b, 480);
    return { ptkRaw, ptk: ptkRaw.slice(0, 48) };
  }
  const ptkRaw = await kdfSha256Blocks(pmk, label, b, 384);
  return { ptkRaw, ptk: ptkRaw.slice(0, 48) };
}

/** Полный выход функции MIC: HMAC-SHA1 (20 байт) для версии 2 или AES-128-CMAC (16 байт) для SAE. */
async function eapolMicRaw(akm: Akm, kck: Uint8Array, micInput: Uint8Array): Promise<Uint8Array> {
  return akm === 'psk' ? hmacSha1(kck, micInput) : aesCmac(kck, micInput);
}

/** MIC кадра EAPOL-Key: HMAC-SHA1-128 (версия 2) или AES-128-CMAC (SAE) — 16 байт. */
export async function eapolMic(akm: Akm, kck: Uint8Array, micInput: Uint8Array): Promise<Uint8Array> {
  return (await eapolMicRaw(akm, kck, micInput)).slice(0, 16);
}

/** RSNE, который сторона объявляет для выбранного AKM. */
export function rsneFor(akm: Akm): Uint8Array {
  return akm === 'psk'
    ? buildRsne(SUITE.AKM_PSK, 0x0000)
    : buildRsne(SUITE.AKM_SAE, RSN_CAP_MFPR | RSN_CAP_MFPC);
}

function emptyFields(protocolVersion: number, keyInfo: number, replayCounter: number): EapolKeyFields {
  return {
    protocolVersion,
    keyInfo,
    keyLength: 0,
    replayCounter,
    nonce: new Uint8Array(32),
    keyIv: new Uint8Array(16),
    keyRsc: new Uint8Array(8),
    mic: new Uint8Array(16),
    keyData: new Uint8Array(0),
  };
}

/** Сериализует кадр, считает MIC по копии с нулевым MIC и вписывает его. */
async function signed(
  akm: Akm,
  kck: Uint8Array,
  name: FourWayMessage['name'],
  from: FourWayMessage['from'],
  fields: EapolKeyFields,
): Promise<FourWayMessage> {
  const micInput = zeroMic(serializeEapolKey(fields));
  const micRaw = await eapolMicRaw(akm, kck, micInput);
  const mic = micRaw.slice(0, 16);
  const withMic = { ...fields, mic };
  return { name, from, fields: withMic, frame: serializeEapolKey(withMic), micInput, micRaw, mic };
}

/** Проверка MIC принятого кадра: обнулить поле, пересчитать своим KCK, сравнить. */
async function verifyMic(akm: Akm, kck: Uint8Array, message: FourWayMessage): Promise<boolean> {
  const expected = await eapolMic(akm, kck, zeroMic(message.frame));
  return message.mic !== undefined && equalBytes(expected, message.mic);
}

/** Полное 4-Way Handshake между точкой доступа и клиентом. */
export async function runFourWay(params: FourWayParams): Promise<FourWayResult> {
  const { akm } = params;
  const version: 0 | 2 = akm === 'psk' ? 2 : 0;
  const counter = params.replayCounter ?? 1;
  // Версия 802.1X: hostapd по умолчанию шлёт 2, wpa_supplicant отвечает 1.
  const AP_VERSION = 2;
  const CLIENT_VERSION = 1;

  const rsneAp = rsneFor(akm);
  const rsneClient = rsneFor(akm);
  const rsnxe = akm === 'sae' && params.h2e ? buildRsnxeH2e() : new Uint8Array(0);

  // --- M1: AP → клиент. ANonce, без MIC, Key Data = PMKID KDE.
  const m1Fields = emptyFields(AP_VERSION, version | KEY_INFO.PAIRWISE | KEY_INFO.ACK, counter);
  m1Fields.keyLength = 16;
  m1Fields.nonce = params.aNonce;
  m1Fields.keyData = buildPmkidKde(params.pmkid);
  const m1: FourWayMessage = {
    name: 'M1',
    from: 'ap',
    fields: m1Fields,
    frame: serializeEapolKey(m1Fields),
  };

  // --- Клиент: получив ANonce, выводит PTK из СВОЕЙ копии PMK.
  const b = buildPtkInput(params.apMac, params.clientMac, params.aNonce, params.sNonce);
  const clientKeys = await derivePtkFor(akm, params.pmk, b);
  const clientKck = clientKeys.ptk.slice(0, 16);
  const clientKek = clientKeys.ptk.slice(16, 32);

  // --- M2: клиент → AP. SNonce, RSNE клиента [‖ RSNXE], MIC.
  const m2Fields = emptyFields(CLIENT_VERSION, version | KEY_INFO.PAIRWISE | KEY_INFO.MIC, counter);
  m2Fields.nonce = params.sNonce;
  m2Fields.keyData = concatBytes(rsneClient, rsnxe);
  const m2 = await signed(akm, clientKck, 'M2', 'client', m2Fields);

  // --- AP: получив SNonce, независимо выводит PTK и проверяет MIC M2.
  const apKeys = await derivePtkFor(akm, params.pmk, b);
  const apKck = apKeys.ptk.slice(0, 16);
  const apKek = apKeys.ptk.slice(16, 32);
  const apVerifiesM2 = await verifyMic(akm, apKck, m2);
  const apChecksRsne = equalBytes(m2.fields.keyData.slice(0, rsneClient.length), rsneClient);

  // --- M3: AP → клиент. Install, Secure, Key Data = RSNE AP [‖ RSNXE] ‖ GTK KDE [‖ IGTK KDE],
  //         зашифрованные AES Key Wrap ключом KEK.
  const kdes = [buildGtkKde(params.gtk)];
  if (akm === 'sae') {
    if (!params.igtk) {
      throw new Error('Для SAE (PMF обязателен) нужен IGTK.');
    }
    kdes.push(buildIgtkKde(params.igtk));
  }
  const m3KeyDataPlain = concatBytes(rsneAp, rsnxe, ...kdes);
  const m3KeyDataPadded = padKeyData(m3KeyDataPlain);
  const m3KeyDataWrapped = await aesKeyWrap(apKek, m3KeyDataPadded);
  const m3Fields = emptyFields(
    AP_VERSION,
    version |
      KEY_INFO.PAIRWISE |
      KEY_INFO.INSTALL |
      KEY_INFO.ACK |
      KEY_INFO.MIC |
      KEY_INFO.SECURE |
      KEY_INFO.ENCRYPTED_KEY_DATA,
    counter + 1,
  );
  m3Fields.keyLength = 16;
  m3Fields.nonce = params.aNonce;
  m3Fields.keyData = m3KeyDataWrapped;
  const m3 = await signed(akm, apKck, 'M3', 'ap', m3Fields);

  // --- Клиент: проверяет MIC M3, расшифровывает Key Data своим KEK, достаёт GTK.
  const clientVerifiesM3 = await verifyMic(akm, clientKck, m3);
  const unwrapped = await aesKeyUnwrap(clientKek, m3.fields.keyData);
  const clientChecksRsne = equalBytes(unwrapped.slice(0, rsneAp.length), rsneAp);
  const gtkOffset = rsneAp.length + rsnxe.length + 8; // dd len OUI type KeyID reserved
  const gtkUnwrapped = unwrapped.slice(gtkOffset, gtkOffset + params.gtk.length);

  // --- M4: клиент → AP. Подтверждение, MIC; после него обе стороны ставят ключи.
  const m4Fields = emptyFields(
    CLIENT_VERSION,
    version | KEY_INFO.PAIRWISE | KEY_INFO.MIC | KEY_INFO.SECURE,
    counter + 1,
  );
  const m4 = await signed(akm, clientKck, 'M4', 'client', m4Fields);
  const apVerifiesM4 = await verifyMic(akm, apKck, m4);

  const ptk = apKeys.ptk;
  return {
    akm,
    keyDescriptorVersion: version,
    b,
    ptkRaw: apKeys.ptkRaw,
    ptk,
    kck: ptk.slice(0, 16),
    kek: ptk.slice(16, 32),
    tk: ptk.slice(32, 48),
    rsneClient,
    rsneAp,
    m3KeyDataPlain,
    m3KeyDataPadded,
    m3KeyDataWrapped,
    gtkUnwrapped,
    messages: [m1, m2, m3, m4],
    checks: {
      apVerifiesM2,
      apChecksRsne,
      clientVerifiesM3,
      clientChecksRsne,
      clientUnwrapsGtk: equalBytes(gtkUnwrapped, params.gtk),
      apVerifiesM4,
    },
  };
}
