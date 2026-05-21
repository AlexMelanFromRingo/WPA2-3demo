/**
 * Модель шагов визуализации WPA2 4-Way Handshake (T022).
 * Текст шагов берётся из трёхъязычной таблицы `WPA2_TEXT`; реальные hex-значения
 * подставляются в шаблоны блока «Вычисление».
 */
import type { Wpa2HandshakeResult } from '../../core/crypto/crypto-engine.service';
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

function artifact(
  id: string,
  label: string,
  bytes: Uint8Array,
  derivedFrom: string[] = [],
): CryptoArtifact {
  return { id, label, bytes, hex: bytesToHex(bytes), bitLength: bytes.length * 8, derivedFrom };
}

function ref(item: CryptoArtifact): ArtifactRef {
  return { id: item.id, label: item.label };
}

/** Структурная (не зависящая от языка) обвязка шага. */
interface StepWiring {
  inputs: CryptoArtifact[];
  outputs: CryptoArtifact[];
  artifacts: CryptoArtifact[];
  packetFrom?: 'ap' | 'client';
}

/** Строит упорядоченный список шагов модуля WPA2 на выбранном языке. */
export function buildWpa2Steps(
  scenario: NetworkScenario,
  result: Wpa2HandshakeResult,
  lang: Lang,
): VisualizationStep[] {
  const text = WPA2_TEXT[lang];
  const ssid = artifact('ssid', text.labels.ssid, utf8ToBytes(scenario.ssid));
  const passphrase = artifact('passphrase', text.labels.passphrase, utf8ToBytes(scenario.passphrase));
  const apMac = artifact('apMac', text.labels.apMac, parseMac(scenario.apMac));
  const clientMac = artifact('clientMac', text.labels.clientMac, parseMac(scenario.clientMac));
  const aNonce = artifact('aNonce', 'ANonce', hexToBytes(scenario.aNonce));
  const sNonce = artifact('sNonce', 'SNonce', hexToBytes(scenario.sNonce));
  const pmk = artifact('pmk', 'PMK', result.pmk, ['passphrase', 'ssid']);
  const blockB = artifact('b', text.labels.blockB, result.b, ['apMac', 'clientMac', 'aNonce', 'sNonce']);
  const ptk = artifact('ptk', 'PTK', result.ptk, ['pmk', 'b']);
  const kck = artifact('kck', 'KCK', result.kck, ['ptk']);
  const kek = artifact('kek', 'KEK', result.kek, ['ptk']);
  const tk = artifact('tk', 'TK', result.tk, ['ptk']);
  const eapol = artifact('eapol', text.labels.eapol, result.eapolFrame, ['sNonce']);
  const mic = artifact('mic', 'MIC', result.mic, ['kck', 'eapol']);

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
    pmk: pmk.hex,
    b: blockB.hex,
    ptk: ptk.hex,
    kck: kck.hex,
    kek: kek.hex,
    tk: tk.hex,
    eapol: eapol.hex,
    mic: mic.hex,
  };

  const wiring: StepWiring[] = [
    {
      inputs: [],
      outputs: [ssid, passphrase, apMac, clientMac, aNonce, sNonce],
      artifacts: [ssid, passphrase, apMac, clientMac, aNonce, sNonce],
    },
    { inputs: [passphrase, ssid], outputs: [pmk], artifacts: [pmk] },
    { inputs: [apMac, clientMac], outputs: [aNonce, sNonce], artifacts: [aNonce, sNonce], packetFrom: 'ap' },
    {
      inputs: [apMac, clientMac, aNonce, sNonce],
      outputs: [blockB],
      artifacts: [blockB],
    },
    { inputs: [pmk, blockB], outputs: [ptk], artifacts: [ptk] },
    { inputs: [ptk], outputs: [kck, kek, tk], artifacts: [kck, kek, tk] },
    { inputs: [kck, eapol], outputs: [mic], artifacts: [eapol, mic], packetFrom: 'client' },
    { inputs: [mic], outputs: [], artifacts: [], packetFrom: 'ap' },
  ];

  // Байтовые диаграммы для шагов, где байты режут/усекают.
  const byteViewFor = (index: number, caption: string): ByteView | undefined => {
    if (index === 4) {
      return {
        hex: ptk.hex,
        regions: [
          { label: 'PTK', byteCount: 48, tone: 'kept' },
          { label: text.droppedLabel, byteCount: 16, tone: 'drop' },
        ],
        caption,
      };
    }
    if (index === 5) {
      return {
        hex: ptk.hex,
        regions: [
          { label: 'KCK', byteCount: 16, tone: 'kept' },
          { label: 'KEK', byteCount: 16, tone: 'kept2' },
          { label: 'TK', byteCount: 16, tone: 'kept3' },
        ],
        caption,
      };
    }
    if (index === 6) {
      return {
        hex: mic.hex,
        regions: [
          { label: 'MIC', byteCount: 16, tone: 'kept' },
          { label: text.droppedLabel, byteCount: 4, tone: 'drop' },
        ],
        caption,
      };
    }
    return undefined;
  };

  return text.steps.map((step, index) => {
    const w = wiring[index];
    const byteView = step.byteCaption ? byteViewFor(index, step.byteCaption) : undefined;
    return {
      index,
      title: step.title,
      tooltip: step.tooltip,
      description: step.description,
      formula: step.formula,
      terms: step.terms,
      calc: fillCalc(step.calc, vars),
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
    };
  });
}
