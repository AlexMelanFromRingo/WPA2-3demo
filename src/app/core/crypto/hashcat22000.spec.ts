import { describe, expect, it } from 'vitest';
import { computePmkid, runCrack } from './hashcat22000';
import { derivePmk } from './wpa2';

const base = {
  ssid: 'DemoNet',
  apMac: '02:00:00:00:00:01',
  clientMac: '02:00:00:00:00:02',
  aNonce: '00'.repeat(32),
  sNonce: '11'.repeat(32),
};

describe('Hashcat 22000 — атака через PMKID', () => {
  it('пароль есть в словаре → исход «найдено»', async () => {
    const result = await runCrack({
      ...base,
      attackType: 'pmkid',
      secretPassword: 'password123',
      words: ['12345678', 'password123', 'qwertyui'],
    });
    expect(result.outcome).toBe('found');
    expect(result.matchIndex).toBe(1);
    expect(result.perWord[1].match).toBe(true);
    expect(result.perWord[0].match).toBe(false);
  });

  it('пароля нет в словаре → исход «не найдено»', async () => {
    const result = await runCrack({
      ...base,
      attackType: 'pmkid',
      secretPassword: 'verysecret9',
      words: ['12345678', 'qwertyui'],
    });
    expect(result.outcome).toBe('not-found');
    expect(result.matchIndex).toBe(-1);
  });

  it('строка 22000 имеет тип 01, PMKID — 16 байт', async () => {
    const result = await runCrack({
      ...base,
      attackType: 'pmkid',
      secretPassword: 'password123',
      words: ['password123'],
    });
    expect(result.hash22000Line.startsWith('WPA*01*')).toBe(true);
    expect(result.capturedHashHex.length).toBe(32);
  });
});

describe('Hashcat 22000 — атака через EAPOL', () => {
  it('пароль есть в словаре → исход «найдено»', async () => {
    const result = await runCrack({
      ...base,
      attackType: 'eapol',
      secretPassword: 'letmein1',
      words: ['admin1234', 'letmein1'],
    });
    expect(result.outcome).toBe('found');
    expect(result.matchIndex).toBe(1);
  });

  it('пароля нет в словаре → «не найдено»; строка 22000 имеет тип 02', async () => {
    const result = await runCrack({
      ...base,
      attackType: 'eapol',
      secretPassword: 'verysecret9',
      words: ['12345678'],
    });
    expect(result.outcome).toBe('not-found');
    expect(result.hash22000Line.startsWith('WPA*02*')).toBe(true);
  });
});

describe('Hashcat 22000 — PMKID', () => {
  it('PMKID имеет длину 16 байт', async () => {
    const pmk = await derivePmk('password123', base.ssid);
    const pmkid = await computePmkid(pmk, base.apMac, base.clientMac);
    expect(pmkid.length).toBe(16);
  });
});
