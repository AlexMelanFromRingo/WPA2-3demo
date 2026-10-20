import { describe, expect, it } from 'vitest';
import { bytesToHex, hexToBytes, utf8ToBytes } from './hex';
import { aesCmac, aesKeyUnwrap, aesKeyWrap, hkdfExpand, hkdfExtract, prfSha1 } from './primitives';
import { WPA2_PRF_REFERENCE } from './wpa2.vectors';

describe('AES-128-CMAC — векторы RFC 4493 §4', () => {
  const key = hexToBytes('2b7e151628aed2a6abf7158809cf4f3c');
  const message = hexToBytes(
    '6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e51' +
      '30c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710',
  );
  const cases: [number, string][] = [
    [0, 'bb1d6929e95937287fa37d129b756746'],
    [16, '070a16b46b4d4144f79bdd9dd04a287c'],
    [40, 'dfa66747de9ae63030ca32611497c827'],
    [64, '51f0bebf7e3b9d92fc49741779363cfe'],
  ];
  for (const [length, expected] of cases) {
    it(`сообщение длиной ${length} байт`, async () => {
      expect(bytesToHex(await aesCmac(key, message.slice(0, length)))).toBe(expected);
    });
  }
});

describe('AES Key Wrap — вектор RFC 3394 §4.1', () => {
  const kek = hexToBytes('000102030405060708090a0b0c0d0e0f');
  const data = hexToBytes('00112233445566778899aabbccddeeff');
  const wrapped = '1fa68b0a8112b447aef34bd8fb5a7b829d3e862371d2cfe5';

  it('wrap', async () => {
    expect(bytesToHex(await aesKeyWrap(kek, data))).toBe(wrapped);
  });

  it('unwrap', async () => {
    expect(bytesToHex(await aesKeyUnwrap(kek, hexToBytes(wrapped)))).toBe(bytesToHex(data));
  });
});

describe('HKDF-SHA256 — RFC 5869, тест A.1', () => {
  it('PRK и OKM совпадают с эталоном', async () => {
    const ikm = hexToBytes('0b'.repeat(22));
    const salt = hexToBytes('000102030405060708090a0b0c');
    const prk = await hkdfExtract(salt, ikm);
    expect(bytesToHex(prk)).toBe('077709362c2e32df0ddc3f0dc47bba6390b6c73bb50f9c3122ec844ad7c2b3e5');
    const okm = await hkdfExpand(prk, hexToBytes('f0f1f2f3f4f5f6f7f8f9'), 42);
    expect(bytesToHex(okm)).toBe(
      '3cb25f25faacd57a90434f64d0362f2a2d2d0a90cf1a5a4c5db02d56ecc4c5bf34007208d5b887185865',
    );
  });
});

describe('PRF на HMAC-SHA1 — IEEE 802.11i-2004 Annex H.3', () => {
  it('PRF-192 совпадает с эталоном', async () => {
    const v = WPA2_PRF_REFERENCE;
    const out = await prfSha1(hexToBytes(v.keyHex), v.label, utf8ToBytes(v.data), v.bits);
    expect(bytesToHex(out)).toBe(v.expectedHex);
  });
});

describe('HKDF-Expand — длина и детерминизм', () => {
  it('выдаёт ровно запрошенное число байт', async () => {
    const prk = new Uint8Array(32).fill(7);
    expect((await hkdfExpand(prk, 'SAE Hash to Element u1 P1', 48)).length).toBe(48);
  });
});
