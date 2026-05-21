/**
 * Модель шагов визуализации симулятора Hashcat 22000 (T037).
 * Текст шагов берётся из трёхъязычной таблицы `HASHCAT_TEXT`; реальные значения
 * подставляются в шаблоны блока «Вычисление».
 */
import type { CrackResult } from '../../core/crypto/crypto-engine.service';
import { bytesToHex, hexToBytes } from '../../core/crypto/hex';
import { HASHCAT_TEXT } from '../../core/i18n/hashcat-text';
import { fillCalc, interpolate } from '../../core/i18n/step-text';
import type { Lang } from '../../core/i18n/ui-text';
import type { ArtifactRef, CryptoArtifact, VisualizationStep } from '../../core/models';

function artifact(id: string, label: string, bytes: Uint8Array): CryptoArtifact {
  return { id, label, bytes, hex: bytesToHex(bytes), bitLength: bytes.length * 8, derivedFrom: [] };
}

function ref(item: CryptoArtifact): ArtifactRef {
  return { id: item.id, label: item.label };
}

/**
 * Строит шаги модуля на выбранном языке. В режиме `fastMode` пошаговая анимация
 * перебора сворачивается в один сводный шаг (clarify Q2, FR-030).
 */
export function buildHashcatSteps(
  result: CrackResult,
  fastMode: boolean,
  lang: Lang,
): VisualizationStep[] {
  const text = HASHCAT_TEXT[lang];
  const isPmkid = result.attackType === 'pmkid';
  const attackName = isPmkid ? 'PMKID' : 'EAPOL';
  const candidateFormula = isPmkid ? text.perWordFormulaPmkid : text.perWordFormulaEapol;
  const captured = artifact(
    'captured',
    `${text.capturedLabel} (${attackName})`,
    hexToBytes(result.capturedHashHex),
  );
  const fields = result.hash22000Line.split('*');
  const steps: VisualizationStep[] = [];

  const variant = isPmkid ? text.step0Pmkid : text.step0Eapol;
  steps.push({
    index: 0,
    title: interpolate(text.step0Title, { attack: attackName }),
    tooltip: variant.tooltip,
    description: variant.description,
    formula: variant.formula,
    terms: variant.terms,
    calc: fillCalc(text.step0Calc, {
      attack: attackName,
      apMac: result.apMac,
      clientMac: result.clientMac,
      ssid: result.ssid,
      captured: result.capturedHashHex,
    }),
    dataFlow: { inputs: [], transform: text.step0Transform, outputs: [ref(captured)] },
    artifacts: [captured],
  });

  steps.push({
    index: 1,
    title: text.step1Title,
    tooltip: text.step1Tooltip,
    description: text.step1Description,
    formula: text.step1Formula,
    terms: text.step1Terms,
    calc: fillCalc(text.step1Calc, {
      typeField: fields[1] ?? '??',
      typeName: attackName,
      hash: fields[2] ?? '',
      apMac: fields[3] ?? '',
      clientMac: fields[4] ?? '',
      ssidHex: fields[5] ?? '',
      line: result.hash22000Line,
    }),
    dataFlow: { inputs: [ref(captured)], transform: text.step1Transform, outputs: [] },
    artifacts: [captured],
  });

  if (fastMode) {
    const count = String(result.perWord.length);
    steps.push({
      index: 2,
      title: text.fastTitle,
      tooltip: text.fastTooltip,
      description: interpolate(text.fastDescription, { count }),
      formula: candidateFormula,
      terms: [text.fastTermName, ...text.crackTerms],
      calc: [
        ...fillCalc(text.fastCalc, { count }),
        ...result.perWord.map(
          (c) => `  ${c.match ? '✓' : '·'} "${c.word}"  →  ${c.hashHex.slice(0, 24)}…`,
        ),
      ],
      dataFlow: {
        inputs: [],
        transform: interpolate(text.fastTransform, { count }),
        outputs: [ref(captured)],
      },
      artifacts: [],
    });
  } else {
    result.perWord.forEach((candidate, i) => {
      const pmk = artifact(`pmk-${i}`, text.pmkLabel, hexToBytes(candidate.pmkHex));
      const hash = artifact(`hash-${i}`, text.hashLabel, hexToBytes(candidate.hashHex));
      const verdict = candidate.match
        ? interpolate(text.perWordVerdictMatch, { word: candidate.word })
        : text.perWordVerdictNoMatch;
      steps.push({
        index: 2 + i,
        title: interpolate(text.perWordTitle, { word: candidate.word }),
        tooltip: candidate.match ? text.perWordTooltipMatch : text.perWordTooltipNoMatch,
        description: interpolate(
          candidate.match ? text.perWordDescMatch : text.perWordDescNoMatch,
          { word: candidate.word },
        ),
        formula: candidateFormula,
        terms: text.crackTerms,
        calc: fillCalc(text.perWordCalc, {
          word: candidate.word,
          ssid: result.ssid,
          pmk: candidate.pmkHex,
          hash: candidate.hashHex,
          captured: result.capturedHashHex,
          opLine: isPmkid ? text.perWordOpPmkid : text.perWordOpEapol,
          verdict,
        }),
        dataFlow: {
          inputs: [{ id: 'word', label: interpolate(text.perWordInputLabel, { word: candidate.word }) }],
          transform: text.perWordTransform,
          outputs: [ref(hash)],
        },
        artifacts: [pmk, hash, captured],
        badge: candidate.match
          ? { text: text.badgeMatch, tone: 'match' }
          : { text: text.badgeNoMatch, tone: 'no-match' },
      });
    });
  }

  const found = result.outcome === 'found';
  const match = found ? result.perWord[result.matchIndex] : undefined;
  steps.push({
    index: steps.length,
    title: found ? text.outcomeTitleFound : text.outcomeTitleNotFound,
    tooltip: found ? text.outcomeTooltipFound : text.outcomeTooltipNotFound,
    description: found
      ? interpolate(text.outcomeDescFound, { word: match?.word ?? '' })
      : text.outcomeDescNotFound,
    terms: text.outcomeTerms,
    calc: found
      ? fillCalc(text.outcomeCalcFound, {
          matchNo: String(result.matchIndex + 1),
          matchWord: match?.word ?? '',
          captured: result.capturedHashHex,
          matchHash: match?.hashHex ?? '',
        })
      : fillCalc(text.outcomeCalcNotFound, {
          count: String(result.perWord.length),
          captured: result.capturedHashHex,
        }),
    dataFlow: { inputs: [ref(captured)], transform: text.outcomeTransform, outputs: [] },
    artifacts: [],
    badge: found
      ? { text: text.outcomeBadgeFound, tone: 'match' }
      : { text: text.outcomeBadgeNotFound, tone: 'no-match' },
  });

  return steps;
}
