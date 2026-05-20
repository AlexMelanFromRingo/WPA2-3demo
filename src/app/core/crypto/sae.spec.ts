import { p256_hasher } from '@noble/curves/nist.js';
import { describe, expect, it } from 'vitest';
import { bytesToHex } from './hex';
import { bigintToBytes32, computeSaeSeed, derivePwe, runSae } from './sae';
import { RFC9380_P256_HASH_TO_CURVE, SAE_ANCHOR } from './sae.vectors';

const s = SAE_ANCHOR.scenario;
const utf8 = new TextEncoder();

describe('WPA3 SAE — hash-to-curve (официальные векторы RFC 9380)', () => {
  for (const vector of RFC9380_P256_HASH_TO_CURVE.vectors) {
    it(`P256 SSWU_RO_ для msg="${vector.msg}" совпадает побайтово с эталоном RFC 9380`, () => {
      const point = p256_hasher
        .hashToCurve(utf8.encode(vector.msg), { DST: RFC9380_P256_HASH_TO_CURVE.dst })
        .toAffine();
      expect(bytesToHex(bigintToBytes32(point.x))).toBe(vector.x);
      expect(bytesToHex(bigintToBytes32(point.y))).toBe(vector.y);
    });
  }
});

describe('WPA3 SAE — PWE (hash-to-curve на P-256)', () => {
  it('PWE — корректная точка кривой P-256', async () => {
    const seed = await computeSaeSeed(s.passphrase, s.ssid, s.apMac, s.clientMac);
    const pwe = derivePwe(seed);
    expect(() => pwe.assertValidity()).not.toThrow();
    expect(pwe.is0()).toBe(false);
  });

  it('PWE детерминирован при одинаковых входных данных', async () => {
    const seedA = await computeSaeSeed(s.passphrase, s.ssid, s.apMac, s.clientMac);
    const seedB = await computeSaeSeed(s.passphrase, s.ssid, s.apMac, s.clientMac);
    expect(bytesToHex(bigintToBytes32(derivePwe(seedA).x))).toBe(
      bytesToHex(bigintToBytes32(derivePwe(seedB).x)),
    );
  });

  it('X-координата PWE совпадает с регрессионным якорем', async () => {
    const seed = await computeSaeSeed(s.passphrase, s.ssid, s.apMac, s.clientMac);
    expect(bytesToHex(bigintToBytes32(derivePwe(seed).x))).toBe(SAE_ANCHOR.pweXHex);
  });
});

describe('WPA3 SAE — обмен Commit/Confirm', () => {
  it('обе стороны сходятся к одному секрету — ключевое свойство Dragonfly', async () => {
    const result = await runSae(s.passphrase, s.ssid, s.apMac, s.clientMac);
    expect(result.converged).toBe(true);
  });

  it('PMK и KCK имеют длину 32 байта', async () => {
    const result = await runSae(s.passphrase, s.ssid, s.apMac, s.clientMac);
    expect(result.pmk.length).toBe(32);
    expect(result.kck.length).toBe(32);
  });

  it('значения обмена совпадают с регрессионным якорем', async () => {
    const result = await runSae(s.passphrase, s.ssid, s.apMac, s.clientMac);
    expect(bytesToHex(result.apScalar)).toBe(SAE_ANCHOR.apScalarHex);
    expect(bytesToHex(result.clientScalar)).toBe(SAE_ANCHOR.clientScalarHex);
    expect(bytesToHex(result.sharedKx)).toBe(SAE_ANCHOR.sharedKxHex);
    expect(bytesToHex(result.pmk)).toBe(SAE_ANCHOR.pmkHex);
    expect(bytesToHex(result.kck)).toBe(SAE_ANCHOR.kckHex);
  });
});
