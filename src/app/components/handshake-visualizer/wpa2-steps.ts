/**
 * Модель шагов визуализации WPA2 4-Way Handshake: от пароля до установки ключей.
 * Текст шагов берётся из трёхъязычной таблицы `WPA2_TEXT`; реальные hex-значения
 * подставляются в шаблоны блока «Вычисление».
 */
import type { Wpa2RunResult } from '../../core/crypto/crypto-engine.service';
import { buildGtkKde } from '../../core/crypto/eapol';
import { bytesToHex, hexToBytes, parseMac, utf8ToBytes } from '../../core/crypto/hex';
import { fillCalc } from '../../core/i18n/step-text';
import type { Lang } from '../../core/i18n/ui-text';
import { WPA2_TEXT } from '../../core/i18n/wpa2-text';
import type {
  ArtifactRef,
  ByteView,
  CryptoArtifact,
  NetworkScenario,
  VisualizationStep,
} from '../../core/models';
import { frameByteView, frameVars } from './frame-view';

/** Число шагов модуля WPA2 (соответствует тексту `WPA2_TEXT`). */
export const WPA2_STEP_COUNT = 11;

export function artifact(
  id: string,
  label: string,
  bytes: Uint8Array,
  derivedFrom: string[] = [],
): CryptoArtifact {
  return { id, label, bytes, hex: bytesToHex(bytes), bitLength: bytes.length * 8, derivedFrom };
}

export function ref(item: CryptoArtifact): ArtifactRef {
  return { id: item.id, label: item.label };
}

/** Структурная (не зависящая от языка) обвязка шага. */
interface StepWiring {
  inputs: CryptoArtifact[];
  outputs: CryptoArtifact[];
  artifacts: CryptoArtifact[];
  packetFrom?: 'ap' | 'client';
  byteView?: (caption: string) => ByteView;
  badge?: boolean;
}

/** Строит упорядоченный список шагов модуля WPA2 на выбранном языке. */
export function buildWpa2Steps(
  scenario: NetworkScenario,
  result: Wpa2RunResult,
  lang: Lang,
): VisualizationStep[] {
  const text = WPA2_TEXT[lang];
  const fw = result.fourWay;
  const [m1, m2, m3, m4] = fw.messages;
  const mark = (ok: boolean) => (ok ? text.ok : text.fail);

  const ssid = artifact('ssid', text.labels.ssid, utf8ToBytes(scenario.ssid));
  const passphrase = artifact('passphrase', text.labels.passphrase, utf8ToBytes(scenario.passphrase));
  const apMac = artifact('apMac', text.labels.apMac, parseMac(scenario.apMac));
  const clientMac = artifact('clientMac', text.labels.clientMac, parseMac(scenario.clientMac));
  const aNonce = artifact('aNonce', 'ANonce', hexToBytes(scenario.aNonce));
  const sNonce = artifact('sNonce', 'SNonce', hexToBytes(scenario.sNonce));
  const gtk = artifact('gtk', text.labels.gtk, hexToBytes(scenario.gtk));
  const pmk = artifact('pmk', 'PMK', result.pmk, ['passphrase', 'ssid']);
  const pmkid = artifact('pmkid', text.labels.pmkid, result.pmkid, ['pmk', 'apMac', 'clientMac']);
  const m1Frame = artifact('m1', text.labels.m1, m1.frame, ['aNonce', 'pmkid']);
  const blockB = artifact('b', text.labels.blockB, fw.b, ['apMac', 'clientMac', 'aNonce', 'sNonce']);
  const ptkRaw = artifact('ptkRaw', text.labels.ptkRaw, fw.ptkRaw, ['pmk', 'b']);
  const ptk = artifact('ptk', 'PTK', fw.ptk, ['ptkRaw']);
  const kck = artifact('kck', 'KCK', fw.kck, ['ptk']);
  const kek = artifact('kek', 'KEK', fw.kek, ['ptk']);
  const tk = artifact('tk', 'TK', fw.tk, ['ptk']);
  const m2Zero = artifact('m2Zero', text.labels.m2Zero, m2.micInput!, ['sNonce']);
  const mic2 = artifact('mic2', 'MIC (M2)', m2.mic!, ['kck', 'm2Zero']);
  const m2Frame = artifact('m2', text.labels.m2, m2.frame, ['m2Zero', 'mic2']);
  const kdPlain = artifact('kdPlain', text.labels.keyDataPlain, fw.m3KeyDataPlain, ['gtk']);
  const kdWrapped = artifact('kdWrapped', text.labels.keyDataWrapped, fw.m3KeyDataWrapped, ['kdPlain', 'kek']);
  const mic3 = artifact('mic3', 'MIC (M3)', m3.mic!, ['kck', 'm3']);
  const m3Frame = artifact('m3', text.labels.m3, m3.frame, ['kdWrapped']);
  const gtkUnwrapped = artifact('gtkOut', text.labels.gtkUnwrapped, fw.gtkUnwrapped, ['kdWrapped', 'kek']);
  const mic4 = artifact('mic4', 'MIC (M4)', m4.mic!, ['kck', 'm4']);
  const m4Frame = artifact('m4', text.labels.m4, m4.frame, ['mic4']);

  const gtkKde = buildGtkKde(hexToBytes(scenario.gtk));
  const vars: Record<string, string> = {
    ssidText: scenario.ssid,
    passText: scenario.passphrase,
    apMacColon: scenario.apMac,
    clientMacColon: scenario.clientMac,
    ssidHex: ssid.hex,
    passHex: passphrase.hex,
    apMac: apMac.hex,
    clientMac: clientMac.hex,
    aNonce: aNonce.hex,
    sNonce: sNonce.hex,
    gtk: gtk.hex,
    pmk: pmk.hex,
    pmkid: pmkid.hex,
    b: blockB.hex,
    ptk: ptk.hex,
    kck: kck.hex,
    kek: kek.hex,
    tk: tk.hex,
    // Трассировка PBKDF2 (шаг 1): звенья цепочки U1, U2, U3 и итоговые блоки.
    u1: bytesToHex(result.pbkdf2Trace.u1),
    u2: bytesToHex(result.pbkdf2Trace.u2),
    u3: bytesToHex(result.pbkdf2Trace.u3),
    t1: pmk.hex.slice(0, 40),
    t2: pmk.hex.slice(40, 64),
    // Трассировка PRF-384 (шаг 4): три блока HMAC-SHA1 со счётчиками 0..2.
    prf0: ptkRaw.hex.slice(0, 40),
    prf1: ptkRaw.hex.slice(40, 80),
    prf2: ptkRaw.hex.slice(80, 120),
    m2MicRaw: bytesToHex(m2.micRaw!),
    rsneAp: bytesToHex(fw.rsneAp),
    gtkKde: bytesToHex(gtkKde),
    m3PlainLen: String(fw.m3KeyDataPlain.length),
    m3PaddedLen: String(fw.m3KeyDataPadded.length),
    padding: bytesToHex(fw.m3KeyDataPadded.slice(fw.m3KeyDataPlain.length)) || '—',
    gtkUnwrapped: gtkUnwrapped.hex,
    chkM2: mark(fw.checks.apVerifiesM2),
    chkRsneAp: mark(fw.checks.apChecksRsne),
    chkM3: mark(fw.checks.clientVerifiesM3),
    chkUnwrap: mark(fw.checks.clientUnwrapsGtk),
    chkRsneClient: mark(fw.checks.clientChecksRsne),
    chkM4: mark(fw.checks.apVerifiesM4),
    ...frameVars('m1', m1),
    ...frameVars('m2', m2),
    ...frameVars('m3', m3),
    ...frameVars('m4', m4),
  };

  const wiring: StepWiring[] = [
    {
      inputs: [],
      outputs: [ssid, passphrase, apMac, clientMac, aNonce, sNonce, gtk],
      artifacts: [ssid, passphrase, apMac, clientMac, aNonce, sNonce, gtk],
    },
    { inputs: [passphrase, ssid], outputs: [pmk], artifacts: [pmk] },
    {
      inputs: [aNonce, pmkid],
      outputs: [m1Frame],
      artifacts: [pmkid, m1Frame],
      packetFrom: 'ap',
      byteView: (caption) => frameByteView(m1, lang, caption),
    },
    { inputs: [apMac, clientMac, aNonce, sNonce], outputs: [blockB], artifacts: [blockB] },
    {
      inputs: [pmk, blockB],
      outputs: [ptk],
      artifacts: [ptkRaw, ptk],
      byteView: (caption) => ({
        hex: ptkRaw.hex,
        regions: [
          { label: 'PTK', byteCount: 48, tone: 'kept' },
          { label: text.droppedLabel, byteCount: fw.ptkRaw.length - 48, tone: 'drop' },
        ],
        caption,
      }),
    },
    {
      inputs: [ptk],
      outputs: [kck, kek, tk],
      artifacts: [kck, kek, tk],
      byteView: (caption) => ({
        hex: ptk.hex,
        regions: [
          { label: 'KCK', byteCount: 16, tone: 'kept' },
          { label: 'KEK', byteCount: 16, tone: 'kept2' },
          { label: 'TK', byteCount: 16, tone: 'kept3' },
        ],
        caption,
      }),
    },
    {
      inputs: [kck, m2Zero],
      outputs: [mic2, m2Frame],
      artifacts: [m2Zero, mic2, m2Frame],
      packetFrom: 'client',
      byteView: (caption) => ({
        hex: bytesToHex(m2.micRaw!),
        regions: [
          { label: 'MIC', byteCount: 16, tone: 'kept' },
          { label: text.droppedLabel, byteCount: m2.micRaw!.length - 16, tone: 'drop' },
        ],
        caption,
      }),
    },
    { inputs: [m2Frame, kck], outputs: [mic2], artifacts: [mic2], badge: fw.checks.apVerifiesM2 },
    {
      inputs: [kdPlain, kek, kck],
      outputs: [kdWrapped, mic3],
      artifacts: [kdPlain, kdWrapped, mic3, m3Frame],
      packetFrom: 'ap',
      byteView: (caption) => ({
        hex: bytesToHex(fw.m3KeyDataPadded),
        regions: [
          { label: 'RSNE', byteCount: fw.rsneAp.length, tone: 'kept' },
          { label: 'GTK KDE', byteCount: gtkKde.length, tone: 'kept2' },
          {
            label: 'dd 00…',
            byteCount: fw.m3KeyDataPadded.length - fw.m3KeyDataPlain.length,
            tone: 'drop',
          },
        ],
        caption,
      }),
    },
    {
      inputs: [m3Frame, kck, kek],
      outputs: [gtkUnwrapped],
      artifacts: [gtkUnwrapped],
      badge: fw.checks.clientVerifiesM3 && fw.checks.clientUnwrapsGtk,
    },
    {
      inputs: [kck],
      outputs: [mic4, tk, gtk],
      artifacts: [m4Frame, mic4],
      packetFrom: 'client',
      badge: fw.checks.apVerifiesM4,
    },
  ];

  return text.steps.map((step, index) => {
    const w = wiring[index];
    const byteView = step.byteCaption && w.byteView ? w.byteView(step.byteCaption) : undefined;
    return {
      index,
      title: step.title,
      tooltip: step.tooltip,
      description: step.description,
      formula: step.formula,
      terms: step.terms,
      calc: fillCalc(step.calc, vars, lang),
      dataFlow: {
        inputs: w.inputs.map(ref),
        transform: step.transform,
        outputs: w.outputs.map(ref),
      },
      artifacts: w.artifacts,
      ...(byteView ? { byteView } : {}),
      ...(step.packetLabel && w.packetFrom
        ? { packet: { from: w.packetFrom, label: step.packetLabel } }
        : {}),
      ...(w.badge !== undefined
        ? { badge: { text: mark(w.badge), tone: w.badge ? ('match' as const) : ('no-match' as const) } }
        : {}),
    };
  });
}
