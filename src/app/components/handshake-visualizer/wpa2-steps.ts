/**
 * Модель шагов визуализации WPA2 4-Way Handshake (T022).
 * Каждый шаг несёт подсказку, развёрнутое описание, разбор всех терминов и
 * схему потока данных (Принципы I, II конституции; FR-004, FR-005, FR-012–016).
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
      tooltip: 'Параметры учебной сети — их можно менять в панели слева.',
      description:
        'Это все исходные данные, которые участвуют в рукопожатии WPA2: имя сети SSID, ' +
        'пароль, MAC-адреса точки доступа и клиента, два случайных числа ANonce и SNonce. ' +
        'Любой параметр можно изменить в панели слева — расчёт пересчитается автоматически, ' +
        'и вы увидите, как меняются все производные значения.',
      terms: [
        { term: 'SSID', definition: 'имя сети Wi-Fi — то, что вы видите в списке сетей на телефоне.' },
        { term: 'MAC-адрес', definition: 'уникальный аппаратный номер сетевого устройства, 6 байт (например 02:00:00:00:00:01).' },
        { term: 'Пароль (PSK)', definition: 'общий пароль сети. PSK значит Pre-Shared Key — «заранее розданный ключ»: он одинаков у роутера и у всех устройств.' },
        { term: 'ANonce / SNonce', definition: 'случайные числа точки доступа (A) и клиента (S). Слово nonce = «number used once», число для одноразового использования.' },
        { term: 'Байт', definition: 'единица данных из 8 бит; одно двузначное число в hex (например 3f) — это один байт.' },
      ],
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
      tooltip: 'PMK — «главный ключ»: пароль и SSID тысячекратно перемешиваются.',
      description:
        'PMK — 256-битный мастер-ключ, единый для всей сети. Его получают функцией ' +
        'формирования ключа PBKDF2: она 4096 раз прогоняет пароль и SSID через HMAC-SHA1. ' +
        'SSID здесь играет роль «соли» — поэтому один и тот же пароль в сетях с разными ' +
        'именами даёт разные PMK. А 4096 повторов намеренно замедляют вычисление: при ' +
        'честном подключении это незаметно, но злоумышленнику при переборе миллионов ' +
        'паролей те же 4096 повторов на каждый пароль обходятся очень дорого (PKCS #5, ' +
        'RFC 8018).',
      formula: 'PMK = PBKDF2(HMAC-SHA1, пароль, SSID, 4096 итераций, 256 бит)',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — «парный мастер-ключ». 256-битное (32 байта) число, из которого позже выводят рабочие ключи. Сам по себе для шифрования не используется.' },
        { term: 'PBKDF2', definition: 'Password-Based Key Derivation Function 2 — функция, которая «растягивает» короткий пароль в полноценный ключ, многократно его перемешивая.' },
        { term: 'HMAC', definition: 'Hash-based Message Authentication Code — криптофункция: берёт ключ и данные, выдаёт фиксированный «отпечаток». Без знания ключа подделать отпечаток нельзя.' },
        { term: 'SHA-1', definition: 'алгоритм хеширования: из данных любой длины делает ровно 20 байт «отпечатка».' },
        { term: 'Соль (salt)', definition: 'добавка к паролю перед хешированием. Здесь солью служит SSID — поэтому одинаковый пароль в разных сетях даёт разные ключи.' },
        { term: 'Итерация', definition: 'один повтор вычисления. 4096 итераций — это 4096 повторов подряд, чтобы намеренно замедлить перебор паролей.' },
      ],
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
      tooltip: 'Точка доступа и клиент обмениваются случайными числами.',
      description:
        'Сообщением M1 точка доступа отправляет клиенту своё случайное число ANonce; ' +
        'сообщением M2 клиент отвечает своим числом SNonce. Эти одноразовые числа делают ' +
        'каждый сеанс уникальным: даже при одном и том же пароле ключи каждого ' +
        'подключения получаются разными, и перехват вчерашнего трафика не помогает ' +
        'расшифровать сегодняшний.',
      terms: [
        { term: 'nonce', definition: 'случайное число «на один раз» (number used once). Гарантирует, что каждое рукопожатие неповторимо.' },
        { term: 'M1, M2', definition: 'первое и второе сообщения рукопожатия (Message 1 и Message 2). Всего сообщений четыре — отсюда название «4-Way Handshake».' },
        { term: 'Точка доступа (AP)', definition: 'устройство, раздающее Wi-Fi (роутер). AP = Access Point.' },
        { term: 'Клиент (STA)', definition: 'устройство, подключающееся к сети — телефон, ноутбук. STA = Station.' },
      ],
      dataFlow: {
        inputs: [ref(apMac), ref(clientMac)],
        transform: 'Обмен случайными числами',
        outputs: [ref(aNonce), ref(sNonce)],
      },
      artifacts: [aNonce, sNonce],
      packet: { from: 'ap', label: 'M1 — ANonce' },
    },
    {
      index: 3,
      title: 'Шаг 3 — Сборка входного блока B',
      tooltip: 'MAC-адреса и nonce складывают в строго определённом порядке.',
      description:
        'Чтобы точка доступа и клиент независимо получили один и тот же ключ, исходные ' +
        'данные складывают в строго определённом порядке: сначала меньшее значение, затем ' +
        'большее. Так обе стороны соберут одинаковый блок B независимо от того, кто из них ' +
        'считает первым. В блок входят оба MAC-адреса и оба nonce.',
      formula: 'B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce)',
      terms: [
        { term: 'Блок B', definition: 'склейка исходных данных в одну длинную строку байтов — заготовка для следующего шага.' },
        { term: 'Конкатенация (‖)', definition: 'соединение нескольких кусков данных в один, просто друг за другом. Знак ‖ означает «приписать следом».' },
        { term: 'min / max', definition: 'меньшее и большее из двух значений. Байты сравниваются как числа. Фиксированный порядок нужен, чтобы у обеих сторон вышел одинаковый блок.' },
        { term: 'AA / SPA', definition: 'AA — MAC-адрес точки доступа (Authenticator Address), SPA — MAC-адрес клиента (Supplicant Address).' },
      ],
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
      tooltip: 'PTK — рабочий ключ сеанса, выводится из PMK и блока B.',
      description:
        'PTK — рабочий ключ конкретного сеанса. Его «вытягивают» из PMK и блока B ' +
        'псевдослучайной функцией PRF, построенной на HMAC-SHA1 (RFC 2104): функция ' +
        'последовательно хеширует вход с разными счётчиками, пока не наберёт нужное число ' +
        'бит. В отличие от PMK, который живёт годами, PTK существует только до конца ' +
        'текущего подключения.',
      formula: 'PTK = PRF-512(PMK, "Pairwise key expansion", B)',
      terms: [
        { term: 'PTK', definition: 'Pairwise Transient Key — «парный временный ключ». Ключ конкретного подключения; пропадает, когда устройство отключается от сети.' },
        { term: 'PRF', definition: 'Pseudo-Random Function — псевдослучайная функция. «Растягивает» вход в нужное число байт, многократно применяя HMAC со счётчиком.' },
        { term: 'PRF-512', definition: 'вариант PRF, выдающий 512 бит (64 байта); из них для шифрования по протоколу CCMP берут первые 48 байт.' },
        { term: 'Счётчик', definition: 'число (0, 1, 2…), которое подмешивают в каждый повтор HMAC, чтобы блоки результата получались разными.' },
      ],
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
      tooltip: 'PTK делится на три ключа с разными ролями.',
      description:
        'Полученный PTK — это не один ключ, а связка из трёх. Первые 16 байт — KCK — ' +
        'подтверждают подлинность сообщений рукопожатия. Следующие 16 байт — KEK — ' +
        'шифруют служебные ключи. Последние 16 байт — TK — шифруют собственно ваш ' +
        'сетевой трафик.',
      formula: 'PTK[0:48] = KCK(16 байт) ‖ KEK(16 байт) ‖ TK(16 байт)',
      terms: [
        { term: 'KCK', definition: 'Key Confirmation Key — «ключ подтверждения». Им вычисляют подпись MIC, доказывающую подлинность сообщений рукопожатия.' },
        { term: 'KEK', definition: 'Key Encryption Key — «ключ шифрования ключей». Им шифруют служебные ключи (например, групповой GTK) при передаче.' },
        { term: 'TK', definition: 'Temporal Key — «временный ключ». Именно им шифруется ваш реальный сетевой трафик (сайты, видео, сообщения).' },
      ],
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
      tooltip: 'MIC — «контрольная подпись» сообщения по ключу KCK.',
      description:
        'MIC — это криптографическая «подпись» кадра EAPOL, вычисленная функцией ' +
        'HMAC-SHA1 по ключу KCK и усечённая до 16 байт. Клиент кладёт свой MIC в ' +
        'сообщение M2. Точка доступа вычисляет MIC самостоятельно: если её значение ' +
        'совпало с присланным — значит, обе стороны вывели одинаковый PMK, то есть знают ' +
        'один и тот же пароль. Сам пароль при этом ни разу не передаётся.',
      formula: 'MIC = HMAC-SHA1(KCK, кадр EAPOL с обнулённым полем MIC)[0:16]',
      terms: [
        { term: 'MIC', definition: 'Message Integrity Code — «код целостности сообщения». Короткая подпись: совпала — сообщение подлинное и не изменено, не совпала — что-то не так.' },
        { term: 'EAPOL', definition: 'EAP over LAN — протокол, по которому передаются сообщения рукопожатия M1–M4 поверх обычной локальной сети.' },
        { term: 'Кадр', definition: 'один пакет данных в сети — с заголовком и содержимым. Кадр EAPOL — это одно сообщение рукопожатия.' },
        { term: 'Усечение', definition: 'обрезка результата до нужной длины. HMAC-SHA1 даёт 20 байт, а для MIC берут только первые 16.' },
      ],
      dataFlow: {
        inputs: [ref(kck), ref(eapol)],
        transform: 'HMAC-SHA1, усечение до 16 байт',
        outputs: [ref(mic)],
      },
      artifacts: [eapol, mic],
      packet: { from: 'client', label: 'M2 — SNonce + MIC' },
    },
    {
      index: 7,
      title: 'Шаг 7 — Сообщения M3 и M4',
      tooltip: 'M3 и M4 завершают рукопожатие.',
      description:
        'Сообщение M3 (точка доступа → клиент) подтверждает, что MIC совпал, и передаёт ' +
        'групповой ключ GTK; сообщение M4 (клиент → точка доступа) — финальное ' +
        'подтверждение. После M4 обе стороны устанавливают ключ TK и начинают шифровать ' +
        'трафик. Рукопожатие завершено — устройство в сети.',
      terms: [
        { term: 'M3, M4', definition: 'третье и четвёртое сообщения рукопожатия. M3 идёт от точки доступа к клиенту, M4 — обратно.' },
        { term: 'GTK', definition: 'Group Temporal Key — «групповой временный ключ». Им шифруются широковещательные сообщения, которые роутер шлёт сразу всем устройствам сети.' },
        { term: 'Широковещательный трафик', definition: 'данные, адресованные не одному устройству, а всем сразу (например, объявления сети).' },
      ],
      dataFlow: {
        inputs: [ref(mic)],
        transform: 'Взаимная проверка MIC',
        outputs: [],
      },
      artifacts: [],
      packet: { from: 'ap', label: 'M3 — подтверждение + GTK' },
    },
  ];
}
