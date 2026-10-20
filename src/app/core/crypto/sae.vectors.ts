/**
 * Тестовые векторы WPA3 SAE.
 *
 * Главный внешний эталон — IEEE Std 802.11-2020, Annex J.10 (те же значения
 * использует модульный тест hostapd `sae_tests()` в src/common/common_module_tests.c).
 */

/** Annex J.10, часть 1: Hunting-and-Pecking, группа 19, заданные rand и mask. */
export const SAE_J10_HNP = {
  ownMac: '4d:3f:2f:ff:e3:87',
  peerMac: 'a5:d8:aa:95:8e:3c',
  password: 'mekmitasdigoat',
  rand: '992465fd3daa3c60aa6565b7f62a2a7f2e12dd12f198faf4fbed89d7ff1ace94',
  mask: '9507a90f777a044d6a0830b91ea3d5dd70bece44e1acffb86983b5e1bf9fb322',
  /** Group (LE) ‖ scalar ‖ element — Commit этой стороны. */
  ownCommit:
    '13002e2c0f0db52440ad146d967114ce005ce1eab0aa2c2e5c2871b774f6c2575c65d5ad9e00829707aa36ba8b859738' +
    'fc961d08243505f47c035376d7ac4bc8d7b95083bf43827d0fc31ed778dd3671fd21a46d1091d64b6f9a1e1272621325' +
    'dbe1',
  peerCommit:
    '1300591b96f3397fb945100848e7b550543b6720d88337ee93fc49fd6df7e08b5223e71b9bb048d3873f20556953a96c' +
    '91536fd8ee6ca9b4a68a148b056a909be03e83ae208f60f8ef5537858074db06687032399862999b511e0a1552a5fea3' +
    '17c2',
  kck: '1e733f6d9bd53256287304338831b09a39406d121017073a5c30db36f36cb81a',
  pmk: '4e4dfab1a2dd8ac1a91790f953faaa452ae5c6873ab75b63605ba663f8a7fe59',
  pmkid: '8747a600eea3f9f22475df58ca1e5498',
} as const;

/** Annex J.10, часть 2: Hash-to-Element — PT из SSID/пароля/идентификатора, затем PWE. */
export const SAE_J10_H2E = {
  ssid: 'byteme',
  password: 'mekmitasdigoat',
  identifier: 'psk4internet',
  macA: '00:09:5b:66:ec:1e',
  macB: '00:0b:6b:d9:02:46',
  pweX: 'c93049b9e64000f848201649e999f2b5c22dea69b5632c9df4d633b8aa1f6c1e',
  pweY: '73634e94b53d82e7383a8d258199d9dc1a5ee8269d060382ccbf33e614ff59a0',
} as const;

/**
 * Паритет с учебным скриптом `python/wpa3_sae.py` (конфиг по умолчанию):
 * PWE методом H&P найден на counter = 1, x совпадает с выводом скрипта.
 */
export const PYTHON_SAE_PARITY = {
  ssid: 'HomeNet',
  password: 'correct horse battery',
  bssid: '00:11:22:33:44:55',
  client: '66:77:88:99:aa:bb',
  foundCounter: 1,
  pweX: '2bb8fc294f4142d26c6abfed5928146697f7c5b888c16ecf2df3b8c52fa414eb',
} as const;
