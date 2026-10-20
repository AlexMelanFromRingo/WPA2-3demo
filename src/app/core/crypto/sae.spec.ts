import { mapToCurveSimpleSWU } from '@noble/curves/abstract/weierstrass.js';
import { p256 } from '@noble/curves/nist.js';
import { describe, expect, it } from 'vitest';
import { bytesToHex, hexToBytes, parseMac } from './hex';
import { DEFAULT_SCENARIO } from '../models';
import {
  bigintToBytes32,
  deriveH2ePwe,
  deriveHnpPwe,
  HNP_MIN_ITERATIONS,
  P,
  R,
  runSae,
  saeVectorRun,
  sswu,
} from './sae';
import { P256_P, P256_R } from './p256-params';
import { PYTHON_SAE_PARITY, SAE_J10_H2E, SAE_J10_HNP } from './sae.vectors';

describe('SAE Hunting-and-Pecking — IEEE 802.11-2020 Annex J.10', () => {
  it('Commit (group ‖ scalar ‖ element) совпадает с вектором побайтово', async () => {
    const v = SAE_J10_HNP;
    const result = await saeVectorRun({
      password: v.password,
      ownMac: parseMac(v.ownMac),
      peerMac: parseMac(v.peerMac),
      rand: hexToBytes(v.rand),
      mask: hexToBytes(v.mask),
      peerCommit: hexToBytes(v.peerCommit),
    });
    expect(bytesToHex(result.ownCommit)).toBe(v.ownCommit);
  });

  it('KCK, PMK и PMKID после обработки чужого Commit совпадают с вектором', async () => {
    const v = SAE_J10_HNP;
    const { keys } = await saeVectorRun({
      password: v.password,
      ownMac: parseMac(v.ownMac),
      peerMac: parseMac(v.peerMac),
      rand: hexToBytes(v.rand),
      mask: hexToBytes(v.mask),
      peerCommit: hexToBytes(v.peerCommit),
    });
    expect(bytesToHex(keys.kck)).toBe(v.kck);
    expect(bytesToHex(keys.pmk)).toBe(v.pmk);
    expect(bytesToHex(keys.pmkid)).toBe(v.pmkid);
  });

  it('цикл всегда выполняет не меньше 40 итераций, x берётся из первой удачной', async () => {
    const v = SAE_J10_HNP;
    const result = await deriveHnpPwe(v.password, parseMac(v.ownMac), parseMac(v.peerMac));
    expect(result.iterations.length).toBeGreaterThanOrEqual(HNP_MIN_ITERATIONS);
    const chosen = result.iterations.filter((it) => it.chosen);
    expect(chosen.length).toBe(1);
    expect(chosen[0].counter).toBe(result.foundCounter);
    expect(result.iterations.slice(result.foundCounter).every((it) => it.afterFound)).toBe(true);
  });

  it('PWE совпадает с учебным скриптом python/wpa3_sae.py', async () => {
    const v = PYTHON_SAE_PARITY;
    const result = await deriveHnpPwe(v.password, parseMac(v.bssid), parseMac(v.client));
    expect(result.foundCounter).toBe(v.foundCounter);
    expect(bytesToHex(result.x)).toBe(v.pweX);
  });
});

describe('SAE Hash-to-Element — IEEE 802.11-2020 Annex J.10', () => {
  it('PWE = val·PT совпадает с вектором (SSID, пароль, идентификатор пароля)', async () => {
    const v = SAE_J10_H2E;
    const result = await deriveH2ePwe(
      v.ssid,
      v.password,
      parseMac(v.macA),
      parseMac(v.macB),
      v.identifier,
    );
    expect(bytesToHex(result.pwe)).toBe(v.pweX + v.pweY);
  });

  it('SSWU совпадает с независимой реализацией RFC 9380 из @noble/curves', () => {
    const curve = p256.Point.CURVE();
    const reference = mapToCurveSimpleSWU(p256.Point.Fp, {
      A: curve.a,
      B: curve.b,
      Z: p256.Point.Fp.create(-10n),
    });
    for (const u of [1n, 2n, 12345678901234567890n, P - 5n, (P - 1n) / 3n]) {
      const ours = sswu(u);
      const theirs = reference(u);
      expect(bytesToHex(ours.point)).toBe(
        bytesToHex(bigintToBytes32(theirs.x)) + bytesToHex(bigintToBytes32(theirs.y)),
      );
    }
  });
});

describe('SAE — полный обмен по стандарту', () => {
  const params = { ...DEFAULT_SCENARIO };

  for (const method of ['h2e', 'hnp'] as const) {
    it(`${method}: стороны сходятся к одному k и PMK, Confirm проходит взаимную проверку`, async () => {
      const result = await runSae({ ...params, method });
      expect(result.pweAgreed).toBe(true);
      expect(result.converged).toBe(true);
      expect(result.client.peerCheck.ok).toBe(true);
      expect(result.ap.peerCheck.ok).toBe(true);
      expect(result.client.peerConfirmOk).toBe(true);
      expect(result.ap.peerConfirmOk).toBe(true);
      expect(bytesToHex(result.client.keys.pmkid)).toBe(bytesToHex(result.ap.keys.pmkid));
    });
  }

  it('rand и mask случайны: два запуска дают разные PMK при одном пароле (forward secrecy)', async () => {
    const first = await runSae({ ...params, method: 'h2e' });
    const second = await runSae({ ...params, method: 'h2e' });
    expect(bytesToHex(first.pwe)).toBe(bytesToHex(second.pwe));
    expect(bytesToHex(first.ap.keys.pmk)).not.toBe(bytesToHex(second.ap.keys.pmk));
  });

  it('кадры Commit/Confirm имеют правильную структуру', async () => {
    const result = await runSae({ ...params, method: 'h2e' });
    // Algorithm = 3 (SAE), Seq = 1, Status = 126 (H2E), Group = 19.
    expect(bytesToHex(result.client.commitFrame.slice(0, 8))).toBe('030001007e001300');
    expect(result.client.commitFrame.length).toBe(8 + 32 + 64);
    // Algorithm = 3, Seq = 2, Status = 0, Send-Confirm = 1.
    expect(bytesToHex(result.client.confirmFrame.slice(0, 8))).toBe('0300020000000100');
    expect(result.client.confirmFrame.length).toBe(8 + 32);
  });

  it('4-Way после SAE: AES-CMAC MIC проверяются, GTK доставлен', async () => {
    const result = await runSae({ ...params, method: 'hnp' });
    expect(result.fourWay.keyDescriptorVersion).toBe(0);
    expect(Object.values(result.fourWay.checks).every(Boolean)).toBe(true);
  });
});

describe('Параметры P-256 для интерфейса', () => {
  it('совпадают с параметрами кривой из @noble/curves', () => {
    expect(P256_P).toBe(P);
    expect(P256_R).toBe(R);
  });
});
