/**
 * Эталонные тестовые векторы WPA2 (T018, research.md R7).
 * Размещены рядом с кодом — тест-раннер Angular 21 ищет спеки в `src/`.
 */

/**
 * Эталонный вектор PBKDF2-HMAC-SHA1 для PMK — широко известный вектор
 * IEEE 802.11i: PMK = PBKDF2("password", "IEEE", 4096, 256 бит).
 * Это внешний, независимый эталон корректности (FR-017, SC-007).
 */
export const WPA2_PMK_REFERENCE = {
  passphrase: 'password',
  ssid: 'IEEE',
  iterations: 4096,
  expectedPmkHex: 'f42c6fc52df0ebef9ebb4b90b38a5f902e83fe1b135a70e23aed762e9710a12e',
} as const;

/**
 * Регрессионный якорь полного рукопожатия для сценария по умолчанию.
 * Значения вычислены независимой реализацией алгоритма IEEE 802.11i на Node
 * WebCrypto; PMK в ней проверен против внешнего эталона WPA2_PMK_REFERENCE.
 * Якорь фиксирует корректные значения и ловит регрессии в `wpa2.ts`.
 */
export const WPA2_HANDSHAKE_ANCHOR = {
  scenario: {
    ssid: 'DemoNet',
    passphrase: 'password123',
    apMac: '02:00:00:00:00:01',
    clientMac: '02:00:00:00:00:02',
    aNonce: '00'.repeat(32),
    sNonce: '11'.repeat(32),
  },
  pmkHex: '5e62782e37be603bca70a262b4392e7ba47db7dcd3badb8515d4c1411b79fcb6',
  ptkHex:
    '6aa11907cf498a9659df15cbcdc714ebf7a566b9abe6091a93d2b2de0a40158d55ac15a14b1585d7104058d2a299062a',
  kckHex: '6aa11907cf498a9659df15cbcdc714eb',
  kekHex: 'f7a566b9abe6091a93d2b2de0a40158d',
  tkHex: '55ac15a14b1585d7104058d2a299062a',
  micHex: '5dacdac56b0a9f626fd7d75aaf166473',
} as const;
