/**
 * Модель шагов визуализации WPA3 SAE / Dragonfly (T030).
 * Каждый шаг несёт всплывающую подсказку и схему потока данных
 * (Принципы I, II конституции; FR-004, FR-005, FR-018–020).
 */
import type { SaeRunResult } from '../../core/crypto/sae';
import { bytesToHex, parseMac, utf8ToBytes } from '../../core/crypto/hex';
import type { ArtifactRef, CryptoArtifact, NetworkScenario, VisualizationStep } from '../../core/models';

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

/** Строит упорядоченный список шагов модуля WPA3 SAE. */
export function buildSaeSteps(
  scenario: NetworkScenario,
  result: SaeRunResult,
): VisualizationStep[] {
  const ssid = artifact('ssid', 'SSID (имя сети)', utf8ToBytes(scenario.ssid));
  const passphrase = artifact('passphrase', 'Пароль сети', utf8ToBytes(scenario.passphrase));
  const apMac = artifact('apMac', 'MAC точки доступа', parseMac(scenario.apMac));
  const clientMac = artifact('clientMac', 'MAC клиента', parseMac(scenario.clientMac));
  const pwe = artifact('pwe', 'PWE — точка пароля на P-256', result.pweX, ['passphrase', 'ssid']);
  const apScalar = artifact('apScalar', 'commit-scalar точки доступа', result.apScalar, ['pwe']);
  const apElement = artifact('apElement', 'commit-element точки доступа', result.apElement, ['pwe']);
  const clScalar = artifact('clientScalar', 'commit-scalar клиента', result.clientScalar, ['pwe']);
  const clElement = artifact('clientElement', 'commit-element клиента', result.clientElement, ['pwe']);
  const sharedK = artifact('sharedK', 'Общий секрет K (X-координата)', result.sharedKx, [
    'apScalar',
    'clientScalar',
  ]);
  const pmk = artifact('pmk', 'PMK', result.pmk, ['sharedK']);

  return [
    {
      index: 0,
      title: 'Исходные данные',
      tooltip:
        'Для SAE нужны пароль, имя сети и MAC-адреса. Случайные nonce, как в WPA2, здесь ' +
        'не передаются — в этом часть силы метода.',
      dataFlow: {
        inputs: [],
        transform: 'Параметры учебной сети',
        outputs: [ref(ssid), ref(passphrase), ref(apMac), ref(clientMac)],
      },
      artifacts: [ssid, passphrase, apMac, clientMac],
    },
    {
      index: 1,
      title: 'Шаг 1 — Вывод PWE (пароль → точка кривой)',
      tooltip:
        'Пароль превращается в точку на эллиптической кривой P-256 — это PWE. Зная только ' +
        'точку, обратно вычислить пароль невозможно.',
      dataFlow: {
        inputs: [ref(passphrase), ref(ssid)],
        transform: 'hash-to-curve на P-256',
        outputs: [ref(pwe)],
      },
      artifacts: [pwe],
    },
    {
      index: 2,
      title: 'Шаг 2 — Commit точки доступа',
      tooltip:
        'Точка доступа выбирает два секретных числа и отправляет пару (scalar, element). ' +
        'Ни пароль, ни сами секреты в эфир не уходят.',
      dataFlow: {
        inputs: [ref(pwe)],
        transform: 'scalar = rand + mask;  element = −(mask · PWE)',
        outputs: [ref(apScalar), ref(apElement)],
      },
      artifacts: [apScalar, apElement],
      animationCue: 'packet',
    },
    {
      index: 3,
      title: 'Шаг 3 — Commit клиента',
      tooltip:
        'Клиент делает то же самое: выбирает свои секретные числа и отправляет свою пару ' +
        '(scalar, element).',
      dataFlow: {
        inputs: [ref(pwe)],
        transform: 'scalar = rand + mask;  element = −(mask · PWE)',
        outputs: [ref(clScalar), ref(clElement)],
      },
      artifacts: [clScalar, clElement],
      animationCue: 'packet',
    },
    {
      index: 4,
      title: 'Шаг 4 — Общий секрет K',
      tooltip:
        'Каждая сторона из чужой пары и своего секрета вычисляет общий секрет K. Главное: ' +
        'у точки доступа и клиента K получается ОДИНАКОВЫМ — это и доказывает, что пароль совпал.',
      dataFlow: {
        inputs: [ref(apScalar), ref(apElement), ref(clScalar), ref(clElement)],
        transform: 'K = rand · (peerScalar · PWE + peerElement)',
        outputs: [ref(sharedK)],
      },
      artifacts: [sharedK],
    },
    {
      index: 5,
      title: 'Шаг 5 — Вывод PMK',
      tooltip:
        'Из общего секрета K выводится PMK — главный ключ сети, такой же по роли, как PMK в WPA2.',
      dataFlow: {
        inputs: [ref(sharedK)],
        transform: 'KDF на HMAC-SHA256',
        outputs: [ref(pmk)],
      },
      artifacts: [pmk],
    },
    {
      index: 6,
      title: 'Шаг 6 — Что видит перехватчик',
      tooltip:
        'Перехватчик видит только пары (scalar, element). По ним нельзя ни восстановить ' +
        'пароль, ни проверить догадку офлайн — для каждой попытки нужен новый живой обмен ' +
        'с точкой доступа.',
      dataFlow: {
        inputs: [ref(apScalar), ref(apElement), ref(clScalar), ref(clElement)],
        transform: 'Перехват эфира',
        outputs: [],
      },
      artifacts: [apScalar, apElement, clScalar, clElement],
    },
    {
      index: 7,
      title: 'Шаг 7 — Почему WPA3 устойчив (сравнение с WPA2)',
      tooltip:
        'В WPA2 перехваченное рукопожатие позволяет перебирать пароли офлайн сколько угодно. ' +
        'В WPA3 SAE офлайн-проверки нет: каждая попытка требует нового живого обмена. Поэтому ' +
        'атака из Модуля 3 (Hashcat) против WPA3 неприменима.',
      dataFlow: {
        inputs: [ref(pmk)],
        transform: 'Сравнение WPA2 ↔ WPA3',
        outputs: [],
      },
      artifacts: [],
    },
  ];
}
