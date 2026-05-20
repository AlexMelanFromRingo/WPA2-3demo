/**
 * Модель шагов визуализации симулятора Hashcat 22000 (T037).
 * Каждый шаг несёт подсказку и схему потока данных (Принципы I, II;
 * FR-004, FR-005, FR-025–027). Шаги перебора снабжены красным/зелёным бейджем.
 */
import type { CrackResult } from '../../core/crypto/crypto-engine.service';
import { bytesToHex, hexToBytes } from '../../core/crypto/hex';
import type { ArtifactRef, CryptoArtifact, VisualizationStep } from '../../core/models';

function artifact(id: string, label: string, bytes: Uint8Array): CryptoArtifact {
  return { id, label, bytes, hex: bytesToHex(bytes), bitLength: bytes.length * 8, derivedFrom: [] };
}

function ref(item: CryptoArtifact): ArtifactRef {
  return { id: item.id, label: item.label };
}

/**
 * Строит шаги модуля. В режиме `fastMode` пошаговая анимация перебора
 * сворачивается в один сводный шаг (clarify Q2, FR-030).
 */
export function buildHashcatSteps(result: CrackResult, fastMode: boolean): VisualizationStep[] {
  const attackName = result.attackType === 'pmkid' ? 'PMKID' : 'EAPOL';
  const captured = artifact(
    'captured',
    `Перехваченный хэш (${attackName})`,
    hexToBytes(result.capturedHashHex),
  );
  const steps: VisualizationStep[] = [];

  steps.push({
    index: 0,
    title: `Тип атаки — через ${attackName}`,
    tooltip:
      result.attackType === 'pmkid'
        ? 'Атака через PMKID: атакующему достаточно одного пакета от роутера — ' +
          'перехватывать всё рукопожатие не нужно.'
        : 'Атака через EAPOL: нужно перехватить рукопожатие целиком, чтобы получить ' +
          'значение MIC для сверки.',
    dataFlow: {
      inputs: [],
      transform: 'Перехват одного хэша из эфира',
      outputs: [ref(captured)],
    },
    artifacts: [captured],
  });

  steps.push({
    index: 1,
    title: 'Строка хэша формата 22000',
    tooltip:
      'Перехваченные данные Hashcat хранит одной строкой. Поля разделены звёздочками: ' +
      'тип атаки, сам хэш, MAC-адреса точки доступа и клиента, имя сети и далее.',
    dataFlow: {
      inputs: [ref(captured)],
      transform: 'Сборка строки WPA*<тип>*<хэш>*...',
      outputs: [],
    },
    artifacts: [captured],
  });

  if (fastMode) {
    steps.push({
      index: 2,
      title: 'Перебор словаря (ускоренный режим)',
      tooltip:
        `Симулятор быстро прогоняет все ${result.perWord.length} слов словаря: для каждого ` +
        'по-настоящему считается PBKDF2 и сверяется хэш. Пошаговая анимация пропущена.',
      dataFlow: {
        inputs: [],
        transform: `PBKDF2 × ${result.perWord.length} слов`,
        outputs: [ref(captured)],
      },
      artifacts: [],
    });
  } else {
    result.perWord.forEach((candidate, i) => {
      const pmk = artifact(`pmk-${i}`, 'PMK кандидата', hexToBytes(candidate.pmkHex));
      const hash = artifact(`hash-${i}`, 'Хэш кандидата', hexToBytes(candidate.hashHex));
      steps.push({
        index: 2 + i,
        title: `Проверка слова: «${candidate.word}»`,
        tooltip: candidate.match
          ? `Из слова «${candidate.word}» вычислен хэш — и он совпал с перехваченным. ` +
            'Пароль подобран!'
          : `Из слова «${candidate.word}» вычислен хэш — он не совпал с перехваченным. ` +
            'Берём следующее слово.',
        dataFlow: {
          inputs: [{ id: 'word', label: `слово «${candidate.word}»` }],
          transform: 'PBKDF2 → PMK → хэш',
          outputs: [ref(hash)],
        },
        artifacts: [pmk, hash, captured],
        animationCue: 'packet',
        badge: candidate.match
          ? { text: '✓ Хэши совпали', tone: 'match' }
          : { text: '✗ Хэши разные', tone: 'no-match' },
      });
    });
  }

  steps.push({
    index: steps.length,
    title: result.outcome === 'found' ? 'Итог — пароль найден' : 'Итог — пароль не найден',
    tooltip:
      result.outcome === 'found'
        ? `Слово «${result.perWord[result.matchIndex].word}» дало хэш, совпавший с ` +
          'перехваченным — пароль сети раскрыт. Вывод: короткие словарные пароли уязвимы ' +
          'к офлайн-перебору.'
        : 'Ни одно слово словаря не подошло. В реальной атаке злоумышленник просто берёт ' +
          'словарь побольше — поэтому пароль должен быть длинным и несловарным.',
    dataFlow: {
      inputs: [ref(captured)],
      transform: 'Сравнение со всеми кандидатами',
      outputs: [],
    },
    artifacts: [],
    badge:
      result.outcome === 'found'
        ? { text: 'Пароль раскрыт', tone: 'match' }
        : { text: 'Пароль не раскрыт', tone: 'no-match' },
  });

  return steps;
}
