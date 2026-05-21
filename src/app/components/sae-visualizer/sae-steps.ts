/**
 * Модель шагов визуализации WPA3 SAE / Dragonfly (T030).
 * Текст шагов берётся из трёхъязычной таблицы `SAE_TEXT`; реальные hex-значения
 * подставляются в шаблоны блока «Вычисление».
 */
import type { SaeRunResult } from '../../core/crypto/sae';
import { bytesToHex, parseMac, utf8ToBytes } from '../../core/crypto/hex';
import { SAE_TEXT } from '../../core/i18n/sae-text';
import { fillCalc } from '../../core/i18n/step-text';
import type { Lang } from '../../core/i18n/ui-text';
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

/** Строит упорядоченный список шагов модуля WPA3 SAE на выбранном языке. */
export function buildSaeSteps(
  scenario: NetworkScenario,
  result: SaeRunResult,
  lang: Lang,
): VisualizationStep[] {
  const text = SAE_TEXT[lang];
  const ssid = artifact('ssid', text.labels.ssid, utf8ToBytes(scenario.ssid));
  const passphrase = artifact('passphrase', text.labels.passphrase, utf8ToBytes(scenario.passphrase));
  const apMac = artifact('apMac', text.labels.apMac, parseMac(scenario.apMac));
  const clientMac = artifact('clientMac', text.labels.clientMac, parseMac(scenario.clientMac));
  const pwe = artifact('pwe', text.labels.pwe, result.pweX, ['passphrase', 'ssid']);
  const apScalar = artifact('apScalar', text.labels.apScalar, result.apScalar, ['pwe']);
  const apElement = artifact('apElement', text.labels.apElement, result.apElement, ['pwe']);
  const clScalar = artifact('clientScalar', text.labels.clScalar, result.clientScalar, ['pwe']);
  const clElement = artifact('clientElement', text.labels.clElement, result.clientElement, ['pwe']);
  const sharedK = artifact('sharedK', text.labels.sharedK, result.sharedKx, ['apScalar', 'clientScalar']);
  const pmk = artifact('pmk', 'PMK', result.pmk, ['sharedK']);

  const vars: Record<string, string> = {
    ssidText: scenario.ssid,
    passText: scenario.passphrase,
    apMacColon: scenario.apMac,
    clientMacColon: scenario.clientMac,
    ssidHex: ssid.hex,
    passHex: passphrase.hex,
    pwe: pwe.hex,
    apScalar: apScalar.hex,
    apElement: apElement.hex,
    clScalar: clScalar.hex,
    clElement: clElement.hex,
    sharedK: sharedK.hex,
    pmk: pmk.hex,
    kck: bytesToHex(result.kck),
    verdict: result.converged ? text.convergedYes : text.convergedNo,
  };

  const wiring: StepWiring[] = [
    {
      inputs: [],
      outputs: [ssid, passphrase, apMac, clientMac],
      artifacts: [ssid, passphrase, apMac, clientMac],
    },
    { inputs: [passphrase, ssid], outputs: [pwe], artifacts: [pwe] },
    { inputs: [pwe], outputs: [apScalar, apElement], artifacts: [apScalar, apElement], packetFrom: 'ap' },
    { inputs: [pwe], outputs: [clScalar, clElement], artifacts: [clScalar, clElement], packetFrom: 'client' },
    {
      inputs: [apScalar, apElement, clScalar, clElement],
      outputs: [sharedK],
      artifacts: [sharedK],
    },
    { inputs: [sharedK], outputs: [pmk], artifacts: [pmk] },
    {
      inputs: [apScalar, apElement, clScalar, clElement],
      outputs: [],
      artifacts: [apScalar, apElement, clScalar, clElement],
    },
    { inputs: [pmk], outputs: [], artifacts: [] },
  ];

  // Байтовая диаграмма шага 5: KDF выдаёт 64 байта = KCK ‖ PMK.
  const byteViewForStep5 = (caption: string): ByteView => ({
    hex: bytesToHex(result.kck) + pmk.hex,
    regions: [
      { label: 'KCK', byteCount: 32, tone: 'kept' },
      { label: 'PMK', byteCount: 32, tone: 'kept2' },
    ],
    caption,
  });

  return text.steps.map((step, index) => {
    const w = wiring[index];
    const byteView = index === 5 && step.byteCaption ? byteViewForStep5(step.byteCaption) : undefined;
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
