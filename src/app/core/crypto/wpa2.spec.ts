import { describe, expect, it } from 'vitest';
import { bytesToHex, hexToBytes } from './hex';
import { buildEapolKeyFrame, computeMic, derivePmk, derivePtk } from './wpa2';
import { WPA2_HANDSHAKE_ANCHOR, WPA2_PMK_REFERENCE } from './wpa2.vectors';

describe('WPA2 — PMK (PBKDF2-HMAC-SHA1)', () => {
  it('совпадает с эталонным вектором IEEE 802.11i', async () => {
    const pmk = await derivePmk(WPA2_PMK_REFERENCE.passphrase, WPA2_PMK_REFERENCE.ssid);
    expect(bytesToHex(pmk)).toBe(WPA2_PMK_REFERENCE.expectedPmkHex);
  });

  it('детерминирован при одинаковых входных данных', async () => {
    const first = await derivePmk('password123', 'DemoNet');
    const second = await derivePmk('password123', 'DemoNet');
    expect(bytesToHex(first)).toBe(bytesToHex(second));
  });
});

describe('WPA2 — PTK и MIC (регрессионный якорь)', () => {
  const s = WPA2_HANDSHAKE_ANCHOR.scenario;

  it('PMK сценария соответствует якорю', async () => {
    const pmk = await derivePmk(s.passphrase, s.ssid);
    expect(bytesToHex(pmk)).toBe(WPA2_HANDSHAKE_ANCHOR.pmkHex);
  });

  it('PTK имеет длину 48 байт и разбивается на KCK | KEK | TK по 16 байт', async () => {
    const pmk = await derivePmk(s.passphrase, s.ssid);
    const result = await derivePtk(pmk, s.apMac, s.clientMac, s.aNonce, s.sNonce);
    expect(result.ptk.length).toBe(48);
    expect(result.kck.length).toBe(16);
    expect(result.kek.length).toBe(16);
    expect(result.tk.length).toBe(16);
    expect(bytesToHex(result.ptk)).toBe(
      WPA2_HANDSHAKE_ANCHOR.kckHex + WPA2_HANDSHAKE_ANCHOR.kekHex + WPA2_HANDSHAKE_ANCHOR.tkHex,
    );
  });

  it('PTK совпадает с регрессионным якорем', async () => {
    const pmk = await derivePmk(s.passphrase, s.ssid);
    const result = await derivePtk(pmk, s.apMac, s.clientMac, s.aNonce, s.sNonce);
    expect(bytesToHex(result.ptk)).toBe(WPA2_HANDSHAKE_ANCHOR.ptkHex);
    expect(bytesToHex(result.kck)).toBe(WPA2_HANDSHAKE_ANCHOR.kckHex);
    expect(bytesToHex(result.kek)).toBe(WPA2_HANDSHAKE_ANCHOR.kekHex);
    expect(bytesToHex(result.tk)).toBe(WPA2_HANDSHAKE_ANCHOR.tkHex);
  });

  it('MIC — 16 байт и совпадает с регрессионным якорем', async () => {
    const pmk = await derivePmk(s.passphrase, s.ssid);
    const { kck } = await derivePtk(pmk, s.apMac, s.clientMac, s.aNonce, s.sNonce);
    const mic = await computeMic(kck, buildEapolKeyFrame(hexToBytes(s.sNonce)));
    expect(mic.length).toBe(16);
    expect(bytesToHex(mic)).toBe(WPA2_HANDSHAKE_ANCHOR.micHex);
  });
});
