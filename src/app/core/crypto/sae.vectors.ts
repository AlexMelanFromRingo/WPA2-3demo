/**
 * Тестовые векторы WPA3 SAE (T026, T048; research.md R7, Phase 7).
 */

/**
 * Официальные тестовые векторы RFC 9380 — hash-to-curve на P-256, набор
 * `P256_XMD:SHA-256_SSWU_RO_` (RFC 9380, Appendix J.1.1). Это внешний эталон
 * стандарта, на котором построен метод вывода PWE в IEEE 802.11 SAE-H2E.
 */
export const RFC9380_P256_HASH_TO_CURVE = {
  dst: 'QUUX-V01-CS02-with-P256_XMD:SHA-256_SSWU_RO_',
  vectors: [
    {
      msg: '',
      x: '2c15230b26dbc6fc9a37051158c95b79656e17a1a920b11394ca91c44247d3e4',
      y: '8a7a74985cc5c776cdfe4b1f19884970453912e9d31528c060be9ab5c43e8415',
    },
    {
      msg: 'abc',
      x: '0bb8b87485551aa43ed54f009230450b492fead5f1cc91658775dac4a3388a0f',
      y: '5c41b3d0731a27a7b14bc0bf0ccded2d8751f83493404c84a88e71ffd424212e',
    },
  ],
} as const;

/**
 * Регрессионный якорь полного обмена SAE для сценария по умолчанию.
 * Значения вычислены независимой реализацией на `@noble/curves` (P-256).
 * Метод вывода PWE (RFC 9380 hash-to-curve) проверен против официальных
 * векторов RFC9380_P256_HASH_TO_CURVE; главная проверка SAE — сходимость сторон.
 */
export const SAE_ANCHOR = {
  scenario: {
    ssid: 'DemoNet',
    passphrase: 'password123',
    apMac: '02:00:00:00:00:01',
    clientMac: '02:00:00:00:00:02',
  },
  pweXHex: '4a00eab5bdc0de8e1634cd7187353cd92970a8ce272abef4dce6e61222143f3c',
  apScalarHex: 'ab540df6395f54baf116506d36533024df156b0f23c703fd2acd312468e55cdb',
  clientScalarHex: '785b5adc72506e38635c8e66b9f781fada1c84d6ff81a93ab28f9243ae9e7d95',
  sharedKxHex: '33b11f1b5c4c9e5312f0c1840e5dd8800350ddd7e9ba1ff1a1dfdcc60ae9ed8b',
  pmkHex: '7afcaf53995282ea5e59d04fde912f958361357c72a40a9c547d60db6773f2c7',
  kckHex: '0fe6d7521cb23f7efc01ab3c5e92ff7f9b2c12b30fb950eb2c7e0261fdc7cf09',
} as const;
