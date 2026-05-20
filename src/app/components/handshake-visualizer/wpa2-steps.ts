/**
 * Модель шагов визуализации WPA2 4-Way Handshake (T022).
 * Каждый шаг несёт подсказку, развёрнутое описание, разбор терминов, формулу и
 * блок «Вычисление» — пошаговый прогон данных с реальными значениями.
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
        'Любой параметр можно изменить в панели слева — расчёт пересчитается автоматически.',
      terms: [
        { term: 'SSID', definition: 'имя сети Wi-Fi — то, что вы видите в списке сетей на телефоне.' },
        { term: 'MAC-адрес', definition: 'уникальный аппаратный номер сетевого устройства, 6 байт (например 02:00:00:00:00:01).' },
        { term: 'Пароль (PSK)', definition: 'общий пароль сети. PSK значит Pre-Shared Key — «заранее розданный ключ»: он одинаков у роутера и у всех устройств.' },
        { term: 'ANonce / SNonce', definition: 'случайные числа точки доступа (A) и клиента (S). Слово nonce = «number used once», число для одноразового использования.' },
        { term: 'Байт', definition: 'единица данных из 8 бит; одно двузначное число в hex (например 3f) — это один байт.' },
      ],
      calc: [
        `SSID        "${scenario.ssid}"  →  hex ${ssid.hex}`,
        `Пароль      "${scenario.passphrase}"  →  hex ${passphrase.hex}`,
        `MAC AP      ${scenario.apMac}`,
        `MAC клиента ${scenario.clientMac}`,
        `ANonce      ${scenario.aNonce}`,
        `SNonce      ${scenario.sNonce}`,
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
        'SSID играет роль «соли». 4096 повторов намеренно замедляют вычисление: честному ' +
        'устройству — незаметно, а злоумышленнику при переборе миллионов паролей очень ' +
        'дорого (PKCS #5, RFC 8018).',
      formula: 'PMK = PBKDF2(HMAC-SHA1, пароль, SSID, 4096 итераций, 256 бит)',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — «парный мастер-ключ». 256-битное (32 байта) число, из которого позже выводят рабочие ключи.' },
        { term: 'PBKDF2', definition: 'Password-Based Key Derivation Function 2 — функция, которая «растягивает» короткий пароль в полноценный ключ, многократно его перемешивая.' },
        { term: 'HMAC', definition: 'Hash-based Message Authentication Code — криптофункция: берёт ключ и данные, выдаёт фиксированный «отпечаток». Без ключа подделать его нельзя.' },
        { term: 'SHA-1', definition: 'алгоритм хеширования: из данных любой длины делает ровно 20 байт «отпечатка».' },
        { term: 'Соль (salt)', definition: 'добавка к паролю перед хешированием. Здесь солью служит SSID — одинаковый пароль в разных сетях даёт разные ключи.' },
        { term: 'Итерация', definition: 'один повтор вычисления. 4096 итераций — 4096 повторов подряд, чтобы намеренно замедлить перебор паролей.' },
      ],
      calc: [
        'ВХОД:',
        `  пароль (UTF-8) = ${passphrase.hex}`,
        `  соль = SSID    = ${ssid.hex}`,
        '',
        'ОПЕРАЦИЯ:',
        '  повторить 4096 раз HMAC-SHA1, собрать 256 бит',
        '',
        'РЕЗУЛЬТАТ:',
        `  PMK = ${pmk.hex}`,
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
        'каждый сеанс уникальным: даже при одном пароле ключи каждого подключения разные.',
      terms: [
        { term: 'nonce', definition: 'случайное число «на один раз» (number used once). Гарантирует, что каждое рукопожатие неповторимо.' },
        { term: 'M1, M2', definition: 'первое и второе сообщения рукопожатия. Всего сообщений четыре — отсюда «4-Way Handshake».' },
        { term: 'Точка доступа (AP)', definition: 'устройство, раздающее Wi-Fi (роутер). AP = Access Point.' },
        { term: 'Клиент (STA)', definition: 'устройство, подключающееся к сети — телефон, ноутбук. STA = Station.' },
      ],
      calc: [
        'M1:  точка доступа  →  клиент',
        `     ANonce = ${aNonce.hex}`,
        '',
        'M2:  клиент  →  точка доступа',
        `     SNonce = ${sNonce.hex}`,
        '',
        'Оба числа уходят в эфир ОТКРЫТО — они не секрет.',
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
        'данные склеивают в строго определённом порядке: сначала меньшее значение, затем ' +
        'большее. Так обе стороны соберут одинаковый блок B независимо от того, кто считает ' +
        'первым.',
      formula: 'B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce)',
      terms: [
        { term: 'Блок B', definition: 'склейка исходных данных в одну длинную строку байтов — заготовка для следующего шага.' },
        { term: 'Конкатенация (‖)', definition: 'соединение кусков данных в один, друг за другом. Знак ‖ означает «приписать следом».' },
        { term: 'min / max', definition: 'меньшее и большее из двух значений (байты сравниваются как числа). Фиксированный порядок даёт обеим сторонам одинаковый блок.' },
        { term: 'AA / SPA', definition: 'AA — MAC точки доступа (Authenticator Address), SPA — MAC клиента (Supplicant Address).' },
      ],
      calc: [
        'СКЛАДЫВАЕМ по порядку «меньший, больший»:',
        `  MAC AP  ${apMac.hex}`,
        `  MAC STA ${clientMac.hex}`,
        `  ANonce  ${aNonce.hex}`,
        `  SNonce  ${sNonce.hex}`,
        '',
        'РЕЗУЛЬТАТ — блок B:',
        `  ${blockB.hex}`,
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
        'псевдослучайной функцией PRF на основе HMAC-SHA1: она хеширует вход со счётчиками, ' +
        'пока не наберёт нужное число бит. PMK живёт годами, а PTK — только до конца ' +
        'подключения.',
      formula: 'PTK = PRF-512(PMK, "Pairwise key expansion", B)',
      terms: [
        { term: 'PTK', definition: 'Pairwise Transient Key — «парный временный ключ» конкретного подключения; пропадает при отключении.' },
        { term: 'PRF', definition: 'Pseudo-Random Function — псевдослучайная функция. «Растягивает» вход в нужное число байт, многократно применяя HMAC со счётчиком.' },
        { term: 'PRF-512', definition: 'вариант PRF, выдающий 512 бит (64 байта); для шифрования CCMP берут первые 48 байт.' },
        { term: 'Счётчик', definition: 'число (0, 1, 2…), которое подмешивают в каждый повтор HMAC, чтобы блоки результата получались разными.' },
      ],
      calc: [
        'ВХОД:',
        `  PMK = ${pmk.hex}`,
        `  B   = ${blockB.hex}`,
        '',
        'ОПЕРАЦИЯ:',
        '  PRF-512 — повторный HMAC-SHA1 со счётчиками 0..3',
        '',
        'РЕЗУЛЬТАТ (первые 48 байт из 64):',
        `  PTK = ${ptk.hex}`,
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
        'подтверждают подлинность сообщений рукопожатия. Следующие 16 — KEK — шифруют ' +
        'служебные ключи. Последние 16 — TK — шифруют ваш сетевой трафик.',
      formula: 'PTK[0:48] = KCK(16 байт) ‖ KEK(16 байт) ‖ TK(16 байт)',
      terms: [
        { term: 'KCK', definition: 'Key Confirmation Key — «ключ подтверждения». Им вычисляют подпись MIC сообщений рукопожатия.' },
        { term: 'KEK', definition: 'Key Encryption Key — «ключ шифрования ключей». Им шифруют служебные ключи (например GTK) при передаче.' },
        { term: 'TK', definition: 'Temporal Key — «временный ключ». Именно им шифруется ваш реальный трафик (сайты, видео, сообщения).' },
      ],
      calc: [
        `PTK = ${ptk.hex}`,
        '',
        'РЕЖЕМ 48 байт на три части по 16:',
        `  KCK = байты 0..15  = ${kck.hex}`,
        `  KEK = байты 16..31 = ${kek.hex}`,
        `  TK  = байты 32..47 = ${tk.hex}`,
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
        'MIC — криптографическая «подпись» кадра EAPOL: HMAC-SHA1 по ключу KCK, усечённый ' +
        'до 16 байт. Клиент кладёт свой MIC в сообщение M2. Точка доступа считает MIC сама: ' +
        'если значения совпали — обе стороны вывели одинаковый PMK, то есть знают пароль. ' +
        'Сам пароль при этом не передаётся.',
      formula: 'MIC = HMAC-SHA1(KCK, кадр EAPOL с обнулённым полем MIC)[0:16]',
      terms: [
        { term: 'MIC', definition: 'Message Integrity Code — «код целостности сообщения». Короткая подпись: совпала — сообщение подлинное, не совпала — что-то не так.' },
        { term: 'EAPOL', definition: 'EAP over LAN — протокол, по которому передаются сообщения рукопожатия M1–M4.' },
        { term: 'Кадр', definition: 'один пакет данных в сети — заголовок и содержимое. Кадр EAPOL — это одно сообщение рукопожатия.' },
        { term: 'Усечение', definition: 'обрезка результата до нужной длины. HMAC-SHA1 даёт 20 байт, а для MIC берут только первые 16.' },
      ],
      calc: [
        'ВХОД:',
        `  KCK        = ${kck.hex}`,
        `  кадр EAPOL = ${eapol.hex}`,
        '',
        'ОПЕРАЦИЯ:',
        '  HMAC-SHA1(KCK, EAPOL) → 20 байт, берём первые 16',
        '',
        'РЕЗУЛЬТАТ:',
        `  MIC = ${mic.hex}`,
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
        'трафик. Рукопожатие завершено.',
      terms: [
        { term: 'M3, M4', definition: 'третье и четвёртое сообщения рукопожатия. M3 — от точки доступа к клиенту, M4 — обратно.' },
        { term: 'GTK', definition: 'Group Temporal Key — «групповой ключ». Им шифруются широковещательные сообщения, идущие сразу всем устройствам сети.' },
        { term: 'Широковещательный трафик', definition: 'данные, адресованные не одному устройству, а всем сразу (например, объявления сети).' },
      ],
      calc: [
        'M3:  точка доступа  →  клиент   (MIC + зашифрованный GTK)',
        'M4:  клиент  →  точка доступа   (подтверждение)',
        '',
        `MIC рукопожатия = ${mic.hex}`,
        '',
        'Рукопожатие завершено. Стороны ставят ключ TK и шифруют трафик.',
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
