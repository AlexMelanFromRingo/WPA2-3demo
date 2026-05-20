/**
 * Модель шагов визуализации WPA2 4-Way Handshake (T022).
 * Каждый шаг обязательно несёт всплывающую подсказку и схему потока данных
 * (Принципы I, II конституции; FR-004, FR-005, FR-012–016).
 */
import type { Wpa2HandshakeResult } from '../../core/crypto/crypto-engine.service';
import { bytesToHex, hexToBytes, parseMac, utf8ToBytes } from '../../core/crypto/hex';
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

/** Строит упорядоченный список шагов модуля WPA2 из вычисленного рукопожатия. */
export function buildWpa2Steps(
  scenario: NetworkScenario,
  result: Wpa2HandshakeResult,
): VisualizationStep[] {
  const ssid = artifact('ssid', 'SSID (имя сети)', utf8ToBytes(scenario.ssid));
  const passphrase = artifact('passphrase', 'Пароль сети', utf8ToBytes(scenario.passphrase));
  const apMac = artifact('apMac', 'MAC точки доступа', parseMac(scenario.apMac));
  const clientMac = artifact('clientMac', 'MAC клиента', parseMac(scenario.clientMac));
  const aNonce = artifact('aNonce', 'ANonce', hexToBytes(scenario.aNonce));
  const sNonce = artifact('sNonce', 'SNonce', hexToBytes(scenario.sNonce));
  const pmk = artifact('pmk', 'PMK', result.pmk, ['passphrase', 'ssid']);
  const blockB = artifact('b', 'Блок B', result.b, ['apMac', 'clientMac', 'aNonce', 'sNonce']);
  const ptk = artifact('ptk', 'PTK', result.ptk, ['pmk', 'b']);
  const kck = artifact('kck', 'KCK', result.kck, ['ptk']);
  const kek = artifact('kek', 'KEK', result.kek, ['ptk']);
  const tk = artifact('tk', 'TK', result.tk, ['ptk']);
  const eapol = artifact('eapol', 'Кадр EAPOL (M2)', result.eapolFrame, ['sNonce']);
  const mic = artifact('mic', 'MIC', result.mic, ['kck', 'eapol']);

  return [
    {
      index: 0,
      title: 'Исходные данные',
      tooltip:
        'Это все исходные данные сети. Любой параметр можно изменить в левой панели — ' +
        'расчёт пересчитается автоматически.',
      dataFlow: {
        inputs: [],
        transform: 'Параметры учебной сети',
        outputs: [ref(ssid), ref(passphrase), ref(apMac), ref(clientMac), ref(aNonce), ref(sNonce)],
      },
      artifacts: [ssid, passphrase, apMac, clientMac, aNonce, sNonce],
    },
    {
      index: 1,
      title: 'Шаг 1 — Вывод PMK',
      tooltip:
        'PMK — это «главный ключ». Его получают, тысячекратно перемешивая пароль и имя ' +
        'сети (оно играет роль «соли»). 4096 повторов специально делают перебор пароля медленным.',
      dataFlow: {
        inputs: [ref(passphrase), ref(ssid)],
        transform: 'PBKDF2-HMAC-SHA1, 4096 итераций',
        outputs: [ref(pmk)],
      },
      artifacts: [pmk],
    },
    {
      index: 2,
      title: 'Шаг 2 — Обмен ANonce и SNonce (сообщения M1, M2)',
      tooltip:
        'Точка доступа и клиент обмениваются случайными числами ANonce и SNonce. ' +
        'Благодаря им каждый сеанс получает новые, неповторяющиеся ключи.',
      dataFlow: {
        inputs: [ref(apMac), ref(clientMac)],
        transform: 'Обмен случайными числами',
        outputs: [ref(aNonce), ref(sNonce)],
      },
      artifacts: [aNonce, sNonce],
      animationCue: 'packet',
    },
    {
      index: 3,
      title: 'Шаг 3 — Сборка входного блока B',
      tooltip:
        'Чтобы обе стороны получили одинаковый ключ, MAC-адреса и nonce складывают в ' +
        'строго определённом порядке: сначала меньшее значение, затем большее.',
      dataFlow: {
        inputs: [ref(apMac), ref(clientMac), ref(aNonce), ref(sNonce)],
        transform: 'min/max MAC и nonce',
        outputs: [ref(blockB)],
      },
      artifacts: [blockB],
    },
    {
      index: 4,
      title: 'Шаг 4 — Вывод PTK',
      tooltip:
        'PTK — рабочий ключ сеанса. Его «вытягивают» из PMK и блока B функцией PRF, ' +
        'построенной на HMAC-SHA1.',
      dataFlow: {
        inputs: [ref(pmk), ref(blockB)],
        transform: 'PRF-512 (HMAC-SHA1)',
        outputs: [ref(ptk)],
      },
      artifacts: [ptk],
    },
    {
      index: 5,
      title: 'Шаг 5 — Разбиение PTK на KCK, KEK и TK',
      tooltip:
        'PTK делится на три части: KCK подтверждает подлинность сообщений рукопожатия, ' +
        'KEK шифрует передаваемые ключи, а TK шифрует сам сетевой трафик.',
      dataFlow: {
        inputs: [ref(ptk)],
        transform: 'Разбиение 48 байт: 16 + 16 + 16',
        outputs: [ref(kck), ref(kek), ref(tk)],
      },
      artifacts: [kck, kek, tk],
    },
    {
      index: 6,
      title: 'Шаг 6 — Создание MIC',
      tooltip:
        'MIC — «контрольная подпись» сообщения. Её вычисляют по ключу KCK. Если у обеих ' +
        'сторон подписи совпали — значит, обе действительно знают пароль.',
      dataFlow: {
        inputs: [ref(kck), ref(eapol)],
        transform: 'HMAC-SHA1, усечение до 16 байт',
        outputs: [ref(mic)],
      },
      artifacts: [eapol, mic],
      animationCue: 'packet',
    },
    {
      index: 7,
      title: 'Шаг 7 — Сообщения M3 и M4',
      tooltip:
        'Сообщения M3 и M4 завершают рукопожатие: стороны убеждаются, что MIC совпал, ' +
        'устанавливают ключи и начинают шифровать данные.',
      dataFlow: {
        inputs: [ref(mic)],
        transform: 'Взаимная проверка MIC',
        outputs: [],
      },
      artifacts: [],
    },
  ];
}
