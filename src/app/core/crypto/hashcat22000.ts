/**
 * Симулятор Hashcat (режим 22000) — образовательная модель офлайн-атаки (T034).
 *
 * СТРОГО учебная симуляция математики атаки (Принцип V конституции):
 * работает только с данными, введёнными пользователем; никакого захвата трафика
 * и сетевого взаимодействия.
 *
 * Для каждого слова-кандидата выполняется НАСТОЯЩИЙ PBKDF2 (clarify Q2):
 *   PMKID-атака:  PMKID = HMAC-SHA1(PMK, "PMK Name" || AA || SPA)[0:16]
 *   EAPOL-атака:  MIC   = HMAC-SHA1(KCK, кадр EAPOL)[0:16]
 */
import { bytesToHex, hexToBytes, parseMac, utf8ToBytes } from './hex';
import type { AttackType } from '../models';
import {
  buildEapolKeyFrame,
  computeMic,
  concatBytes,
  derivePmk,
  derivePtk,
  hmacSha1,
} from './wpa2';

/** PMKID = HMAC-SHA1(PMK, "PMK Name" || AA || SPA), усечённый до 16 байт. */
export async function computePmkid(
  pmk: Uint8Array,
  apMac: string,
  clientMac: string,
): Promise<Uint8Array> {
  const data = concatBytes(utf8ToBytes('PMK Name'), parseMac(apMac), parseMac(clientMac));
  return (await hmacSha1(pmk, data)).slice(0, 16);
}

/** Параметры запуска перебора. */
export interface CrackParams {
  attackType: AttackType;
  ssid: string;
  apMac: string;
  clientMac: string;
  aNonce: string;
  sNonce: string;
  /** «Настоящий» пароль перехваченной сети. */
  secretPassword: string;
  /** Мини-словарь слов-кандидатов. */
  words: string[];
}

/** Результат проверки одного слова-кандидата. */
export interface CandidateResult {
  word: string;
  pmkHex: string;
  /** Вычисленный хэш кандидата (PMKID или MIC). */
  hashHex: string;
  /** Совпал ли хэш кандидата с перехваченным. */
  match: boolean;
}

/** Итог перебора. */
export interface CrackResult {
  attackType: AttackType;
  /** Имя сети сценария. */
  ssid: string;
  /** MAC точки доступа. */
  apMac: string;
  /** MAC клиента. */
  clientMac: string;
  /** Перехваченный хэш (PMKID или MIC) в hex. */
  capturedHashHex: string;
  /** Строка формата 22000 для текущего сценария. */
  hash22000Line: string;
  /** Результат по каждому слову словаря. */
  perWord: CandidateResult[];
  /** Индекс совпавшего слова или -1. */
  matchIndex: number;
  outcome: 'found' | 'not-found';
}

/** Вычисляет хэш кандидата (PMKID или MIC) из готового PMK. */
async function hashFromPmk(
  attackType: AttackType,
  pmk: Uint8Array,
  params: CrackParams,
): Promise<Uint8Array> {
  if (attackType === 'pmkid') {
    return computePmkid(pmk, params.apMac, params.clientMac);
  }
  const { kck } = await derivePtk(
    pmk,
    params.apMac,
    params.clientMac,
    params.aNonce,
    params.sNonce,
  );
  return computeMic(kck, buildEapolKeyFrame(hexToBytes(params.sNonce)));
}

/** Собирает строку формата 22000 (`WPA*<type>*...`). */
function build22000Line(capturedHashHex: string, params: CrackParams): string {
  const apMacHex = bytesToHex(parseMac(params.apMac));
  const staMacHex = bytesToHex(parseMac(params.clientMac));
  const essidHex = bytesToHex(utf8ToBytes(params.ssid));
  if (params.attackType === 'pmkid') {
    return `WPA*01*${capturedHashHex}*${apMacHex}*${staMacHex}*${essidHex}`;
  }
  const anonceHex = params.aNonce.replace(/[\s:]/g, '').toLowerCase();
  const eapolHex = bytesToHex(buildEapolKeyFrame(hexToBytes(params.sNonce)));
  return `WPA*02*${capturedHashHex}*${apMacHex}*${staMacHex}*${essidHex}*${anonceHex}*${eapolHex}*02`;
}

/**
 * Прогоняет перебор мини-словаря против перехваченного хэша.
 * Перехваченный хэш вычисляется из «настоящего» пароля сценария.
 */
export async function runCrack(params: CrackParams): Promise<CrackResult> {
  const secretPmk = await derivePmk(params.secretPassword, params.ssid);
  const capturedHash = await hashFromPmk(params.attackType, secretPmk, params);
  const capturedHashHex = bytesToHex(capturedHash);

  const perWord: CandidateResult[] = [];
  let matchIndex = -1;
  for (let i = 0; i < params.words.length; i++) {
    const word = params.words[i];
    const pmk = await derivePmk(word, params.ssid);
    const hashHex = bytesToHex(await hashFromPmk(params.attackType, pmk, params));
    const match = hashHex === capturedHashHex;
    perWord.push({ word, pmkHex: bytesToHex(pmk), hashHex, match });
    if (match && matchIndex === -1) {
      matchIndex = i;
    }
  }

  return {
    attackType: params.attackType,
    ssid: params.ssid,
    apMac: params.apMac,
    clientMac: params.clientMac,
    capturedHashHex,
    hash22000Line: build22000Line(capturedHashHex, params),
    perWord,
    matchIndex,
    outcome: matchIndex >= 0 ? 'found' : 'not-found',
  };
}
