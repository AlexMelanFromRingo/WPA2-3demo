import { describe, expect, it } from 'vitest';
import { bytesToHex, hexToBytes } from './hex';
import { runFourWay } from './fourway';
import { buildEapolKeyFrame, computeMic, computePmkid, derivePmk, derivePtk, runWpa2 } from './wpa2';
import {
  HASHCAT_EXAMPLES,
  PYTHON_WPA2_PARITY,
  SAE_FOURWAY_ANCHOR,
  WPA2_HANDSHAKE_ANCHOR,
  WPA2_PMK_REFERENCES,
} from './wpa2.vectors';

describe('WPA2 — PMK (PBKDF2-HMAC-SHA1), IEEE 802.11i-2004 Annex H.4', () => {
  for (const v of WPA2_PMK_REFERENCES) {
    it(`PBKDF2("${v.passphrase.slice(0, 16)}", "${v.ssid.slice(0, 16)}")`, async () => {
      expect(bytesToHex(await derivePmk(v.passphrase, v.ssid))).toBe(v.expectedPmkHex);
    });
  }
});

describe('WPA2 — реальные строки Hashcat 22000 (пароль «hashcat!»)', () => {
  it('EAPOL: PMK → PTK → MIC по реальному кадру M2 совпадает с MIC из строки', async () => {
    const [, , mic, ap, sta, essidHex, aNonce, eapolHex] = HASHCAT_EXAMPLES.eapolLine.split('*');
    const essid = new TextDecoder().decode(hexToBytes(essidHex));
    const eapol = hexToBytes(eapolHex);
    const sNonce = bytesToHex(eapol.slice(17, 49));
    const pmk = await derivePmk(HASHCAT_EXAMPLES.password, essid);
    const { kck } = await derivePtk(pmk, ap, sta, aNonce, sNonce);
    expect(bytesToHex(await computeMic(kck, eapol))).toBe(mic);
  });

  it('PMKID: HMAC-SHA1(PMK, "PMK Name" ‖ AA ‖ SPA) совпадает с PMKID из строки', async () => {
    const [, , pmkid, ap, sta, essidHex] = HASHCAT_EXAMPLES.pmkidLine.split('*');
    const essid = new TextDecoder().decode(hexToBytes(essidHex));
    const pmk = await derivePmk(HASHCAT_EXAMPLES.password, essid);
    expect(bytesToHex(await computePmkid(pmk, ap, sta))).toBe(pmkid);
  });

  it('наш кадр M2 имеет ту же раскладку, что и реальный (версия 1, Key Info 0x010a, RSNE)', () => {
    const eapolHex = HASHCAT_EXAMPLES.eapolLine.split('*')[7];
    const real = hexToBytes(eapolHex);
    const ours = buildEapolKeyFrame(real.slice(17, 49));
    // Совпадает всё, кроме RSN Capabilities (реальный клиент объявил MFPC = 0x0080).
    expect(bytesToHex(ours).slice(0, -4)).toBe(eapolHex.slice(0, -4));
  });
});

describe('WPA2 — паритет с python/wpa2_handshake.py', () => {
  it('PMK, PTK и PMKID совпадают с выводом скрипта', async () => {
    const v = PYTHON_WPA2_PARITY;
    const pmk = await derivePmk(v.passphrase, v.ssid);
    expect(bytesToHex(pmk)).toBe(v.pmkHex);
    const { ptk } = await derivePtk(pmk, v.apMac, v.clientMac, v.aNonce, v.sNonce);
    expect(bytesToHex(ptk)).toBe(v.ptkHex);
    expect(bytesToHex(await computePmkid(pmk, v.apMac, v.clientMac))).toBe(v.pmkidHex);
  });
});

describe('WPA2 — полное 4-Way Handshake M1–M4 (якорь независимой реализации)', () => {
  const s = WPA2_HANDSHAKE_ANCHOR.scenario;

  it('PMK, PMKID и PTK', async () => {
    const result = await runWpa2(s);
    expect(bytesToHex(result.pmk)).toBe(WPA2_HANDSHAKE_ANCHOR.pmkHex);
    expect(bytesToHex(result.pmkid)).toBe(WPA2_HANDSHAKE_ANCHOR.pmkidHex);
    expect(bytesToHex(result.fourWay.ptk)).toBe(WPA2_HANDSHAKE_ANCHOR.ptkHex);
    expect(result.fourWay.ptkRaw.length).toBe(60); // PRF-384 = 3 блока HMAC-SHA1
  });

  it('кадры M1 и M2 совпадают побайтово', async () => {
    const { fourWay } = await runWpa2(s);
    expect(bytesToHex(fourWay.messages[0].frame)).toBe(WPA2_HANDSHAKE_ANCHOR.m1Hex);
    expect(bytesToHex(fourWay.messages[1].frame)).toBe(WPA2_HANDSHAKE_ANCHOR.m2Hex);
  });

  it('M3: Key Data (RSNE ‖ GTK KDE ‖ паддинг) зашифровано AES Key Wrap, MIC совпадает', async () => {
    const { fourWay } = await runWpa2(s);
    expect(fourWay.m3KeyDataPlain.length).toBe(46);
    expect(fourWay.m3KeyDataPadded.length).toBe(48);
    expect(bytesToHex(fourWay.m3KeyDataWrapped)).toBe(WPA2_HANDSHAKE_ANCHOR.m3WrappedKeyDataHex);
    expect(bytesToHex(fourWay.messages[2].mic!)).toBe(WPA2_HANDSHAKE_ANCHOR.m3MicHex);
    expect(bytesToHex(fourWay.messages[3].mic!)).toBe(WPA2_HANDSHAKE_ANCHOR.m4MicHex);
  });

  it('обе стороны проверили MIC друг друга, клиент получил GTK', async () => {
    const { fourWay } = await runWpa2(s);
    expect(fourWay.checks).toEqual({
      apVerifiesM2: true,
      apChecksRsne: true,
      clientVerifiesM3: true,
      clientChecksRsne: true,
      clientUnwrapsGtk: true,
      apVerifiesM4: true,
    });
    expect(bytesToHex(fourWay.gtkUnwrapped)).toBe(s.gtk);
  });

  it('другой пароль у клиента → AP отвергает M2', async () => {
    const good = await runWpa2(s);
    const bad = await runWpa2({ ...s, passphrase: 'password124' });
    expect(bytesToHex(bad.fourWay.messages[1].mic!)).not.toBe(bytesToHex(good.fourWay.messages[1].mic!));
  });
});

describe('4-Way для AKM SAE (00-0F-AC:8) — KDF-SHA-256 и AES-128-CMAC', () => {
  it('PTK, M2, зашифрованный Key Data и MIC M3/M4 совпадают с якорем', async () => {
    const s = WPA2_HANDSHAKE_ANCHOR.scenario;
    const a = SAE_FOURWAY_ANCHOR;
    const result = await runFourWay({
      akm: 'sae',
      pmk: hexToBytes(a.pmkHex),
      pmkid: hexToBytes(a.pmkidHex),
      apMac: hexToBytes(s.apMac),
      clientMac: hexToBytes(s.clientMac),
      aNonce: hexToBytes(s.aNonce),
      sNonce: hexToBytes(s.sNonce),
      gtk: hexToBytes(s.gtk),
      igtk: hexToBytes(a.igtk),
      h2e: true,
    });
    expect(bytesToHex(result.ptk)).toBe(a.ptkHex);
    expect(bytesToHex(result.messages[1].frame)).toBe(a.m2Hex);
    expect(bytesToHex(result.m3KeyDataWrapped)).toBe(a.m3WrappedKeyDataHex);
    expect(bytesToHex(result.messages[2].mic!)).toBe(a.m3MicHex);
    expect(bytesToHex(result.messages[3].mic!)).toBe(a.m4MicHex);
    expect(Object.values(result.checks).every(Boolean)).toBe(true);
  });
});
