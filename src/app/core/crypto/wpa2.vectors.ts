/**
 * Эталонные тестовые векторы WPA2 (research.md R7).
 * Размещены рядом с кодом — тест-раннер Angular 21 ищет спеки в `src/`.
 */

/**
 * Векторы PBKDF2-HMAC-SHA1 для PSK из IEEE 802.11i-2004, Annex H.4:
 * PMK = PBKDF2(пароль, SSID, 4096, 256 бит). Внешний, независимый эталон.
 */
export const WPA2_PMK_REFERENCES = [
  {
    passphrase: 'password',
    ssid: 'IEEE',
    expectedPmkHex: 'f42c6fc52df0ebef9ebb4b90b38a5f902e83fe1b135a70e23aed762e9710a12e',
  },
  {
    passphrase: 'ThisIsAPassword',
    ssid: 'ThisIsASSID',
    expectedPmkHex: '0dc0d6eb90555ed6419756b9a15ec3e3209b63df707dd508d14581f8982721af',
  },
  {
    passphrase: 'a'.repeat(32),
    ssid: 'Z'.repeat(32),
    expectedPmkHex: 'becb93866bb8c3832cb777c2f559807c8c59afcb6eae734885001300a981cc62',
  },
] as const;

/** Вектор PRF из IEEE 802.11i-2004, Annex H.3 (тест 1): PRF-192(0x0b×20, "prefix", "Hi There"). */
export const WPA2_PRF_REFERENCE = {
  keyHex: '0b'.repeat(20),
  label: 'prefix',
  data: 'Hi There',
  bits: 192,
  expectedHex: 'bcd4c650b30b9684951829e0d75f9d54b862175ed9f00606',
} as const;

/**
 * Настоящие строки режима 22000 из примеров Hashcat (hashcat.net/wiki, example_hashes),
 * пароль «hashcat!». EAPOL — реальный кадр M2 с обнулённым MIC, снятый с устройства:
 * он подтверждает и раскладку полей кадра, и всю цепочку PMK → PTK → MIC.
 */
export const HASHCAT_EXAMPLES = {
  password: 'hashcat!',
  eapolLine:
    'WPA*02*024022795224bffca545276c3762686f*6466b38ec3fc*225edc49b7aa*54502d4c494e4b5f484153484341545f54455354*' +
    '10e3be3b005a629e89de088d6a2fdc489db83ad4764f2d186b9cde15446e972e*' +
    '0103007502010a0000000000000000000148ce2ccba9c1fda130ff2fbbfb4fd3b063d1a93920b0f7df54a5cbf787b161' +
    '710000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000' +
    '00001630140100000fac040100000fac040100000fac028000*a2',
  pmkidLine:
    'WPA*01*4d4fe7aac3a2cecab195321ceb99a7d0*fc690c158264*f4747f87f9f4*686173686361742d6573736964***',
} as const;

/** Паритет с учебным скриптом `python/wpa2_handshake.py` (его данные по умолчанию). */
export const PYTHON_WPA2_PARITY = {
  ssid: 'TestNet',
  passphrase: 'password123',
  apMac: '00:11:22:33:44:55',
  clientMac: '66:77:88:99:aa:bb',
  aNonce: Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join(''),
  sNonce: Array.from({ length: 32 }, (_, i) => (i + 32).toString(16).padStart(2, '0')).join(''),
  pmkHex: '6a5d3731a11bdeee078a17cc3f4c826fc8957c90928e7b5072ad51618d683efc',
  ptkHex:
    '390253dd8a75e44278b12286dc555cb6ed7316c730755bf1346cd9b78d0d43a093ddfb28d404d91a46981d6f123d2007',
  pmkidHex: '83e7a4734ade51945bcbb069d3a6195f',
} as const;

/**
 * Регрессионный якорь полного 4-Way Handshake для сценария по умолчанию.
 * Кадры M1–M4 посчитаны независимой эталонной реализацией на Python
 * (hashlib/hmac + библиотека `cryptography` для AES Key Wrap), см. описание
 * в тесте; PMK в ней проверен против WPA2_PMK_REFERENCES.
 */
export const WPA2_HANDSHAKE_ANCHOR = {
  scenario: {
    ssid: 'DemoNet',
    passphrase: 'password123',
    apMac: '02:00:00:00:00:01',
    clientMac: '02:00:00:00:00:02',
    aNonce: '00'.repeat(32),
    sNonce: '11'.repeat(32),
    gtk: '22'.repeat(16),
  },
  pmkHex: '5e62782e37be603bca70a262b4392e7ba47db7dcd3badb8515d4c1411b79fcb6',
  pmkidHex: '38836f03de37fc292dc36625ab81b4b7',
  ptkHex:
    '6aa11907cf498a9659df15cbcdc714ebf7a566b9abe6091a93d2b2de0a40158d55ac15a14b1585d7104058d2a299062a',
  m1Hex:
    '0203007502008a00100000000000000001' +
    '00'.repeat(32) +
    '00'.repeat(16 + 8 + 8 + 16) +
    '0016dd14000fac0438836f03de37fc292dc36625ab81b4b7',
  m2Hex:
    '0103007502010a00000000000000000001' +
    '11'.repeat(32) +
    '00'.repeat(16 + 8 + 8) +
    'a3a968f9fdaf624f85766fe4d71f10fa' +
    '001630140100000fac040100000fac040100000fac020000',
  m3WrappedKeyDataHex:
    '84bd77708ca3ee5874dac3044c05d318f18101b6d257f551b422488ddabf76715453216e3fa1961b8e32c49c39c519e834808a7e324735c0',
  m3MicHex: 'c5b2041828a8908d73cba151aac5a205',
  m4MicHex: '48d3bf74deb4f31a06424727d5893c86',
} as const;

/**
 * Якорь 4-Way Handshake для AKM SAE (00-0F-AC:8) с H2E: PMK и PMKID взяты из
 * вектора Annex J.10, остальное — из сценария по умолчанию. Посчитано той же
 * эталонной реализацией на Python (KDF-SHA-256, AES-128-CMAC из `cryptography`).
 */
export const SAE_FOURWAY_ANCHOR = {
  pmkHex: '4e4dfab1a2dd8ac1a91790f953faaa452ae5c6873ab75b63605ba663f8a7fe59',
  pmkidHex: '8747a600eea3f9f22475df58ca1e5498',
  igtk: '33'.repeat(16),
  ptkHex:
    '50f94c93ad9487660e8910dab2ada0666ee6f5610868af8fe76c82146fac830d580d846343759fb219f62e10c0d0979f',
  m2Hex:
    '01030078020108000000000000000000011111111111111111111111111111111111111111111111111111111111111111' +
    '00000000000000000000000000000000000000000000000000000000000000004dc448b650b784a773ce40c1e0d8733f' +
    '001930140100000fac040100000fac040100000fac08c000f40120',
  m3WrappedKeyDataHex:
    'be44683c0391f27c6d56ba6ec8acf579cd2620649daa950f17ae8516d9c63194b70a2f555d7345cd0bc4e99c71655941' +
    '498741f61a420555397f17ef89b5adfcb5c3bde11ace1df668b17912db6e471532d92745aea0aad6',
  m3MicHex: 'c70628fab8fbc30eb9c9785834beb73f',
  m4MicHex: '8b25843e1f91313d9a5636e51e25ccd3',
} as const;
