/**
 * Модель шагов визуализации WPA3 SAE / Dragonfly (T030).
 * Каждый шаг несёт подсказку, развёрнутое описание, разбор всех терминов и
 * схему потока данных (Принципы I, II конституции; FR-004, FR-005, FR-018–020).
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
      tooltip: 'Параметры сети. Случайные nonce, как в WPA2, здесь не нужны.',
      description:
        'Для SAE нужны пароль, имя сети и MAC-адреса обеих сторон. Случайные числа nonce, ' +
        'которыми обменивались в WPA2, здесь не передаются — секретность обеспечивается ' +
        'иначе, математикой эллиптической кривой. Это уже часть силы метода: меньше ' +
        'открытых данных в эфире — меньше зацепок для атакующего.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals — «одновременная аутентификация равных». Способ входа в Wi-Fi по паролю в WPA3, заменяющий рукопожатие WPA2.' },
        { term: 'WPA3', definition: 'третье поколение защиты Wi-Fi (Wi-Fi Alliance, 2018). Главное улучшение для домашних сетей — протокол SAE.' },
        { term: 'Эллиптическая кривая', definition: 'особое математическое множество точек, на котором удобно строить криптографию: умножать точки легко, а «делить» обратно — практически невозможно.' },
        { term: 'P-256', definition: 'конкретная стандартная эллиптическая кривая (NIST P-256), на которой работает этот модуль.' },
      ],
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
      tooltip: 'Пароль превращается в точку на эллиптической кривой P-256.',
      description:
        'SAE начинается с превращения пароля в PWE — точку на эллиптической кривой P-256. ' +
        'Используется метод hash-to-curve по стандарту RFC 9380 (отображение SSWU) — тот ' +
        'же примитив, что лежит в основе современного WPA3 SAE-H2E. Операция ' +
        'односторонняя: имея только точку PWE, восстановить пароль невозможно. Обе стороны ' +
        'из одного пароля получают одну и ту же точку PWE.',
      formula: 'PWE = hash_to_curve(пароль, SSID, MAC-адреса)  — RFC 9380, кривая P-256',
      terms: [
        { term: 'PWE', definition: 'Password Element — «элемент пароля». Точка на кривой P-256, в которую превращается пароль. Дальше работают уже с ней, а не с самим паролем.' },
        { term: 'Точка кривой', definition: 'пара координат (x, y), удовлетворяющая уравнению кривой. У P-256 таких точек астрономически много.' },
        { term: 'hash-to-curve', definition: '«хеширование в кривую» — приём, который превращает произвольные данные (пароль) в точку кривой строго и предсказуемо.' },
        { term: 'SSWU', definition: 'Simplified SWU — конкретный математический способ отобразить число в точку кривой за постоянное время (без догадок и переборов).' },
        { term: 'Односторонняя функция', definition: 'функцию легко вычислить вперёд (пароль → точка), но практически невозможно обратить (точка → пароль).' },
        { term: 'RFC 9380', definition: 'официальный стандарт IETF «Hashing to Elliptic Curves» (2023), описывающий hash-to-curve. На нём построен SAE-H2E.' },
      ],
      dataFlow: {
        inputs: [ref(passphrase), ref(ssid)],
        transform: 'hash-to-curve на P-256 (SSWU)',
        outputs: [ref(pwe)],
      },
      artifacts: [pwe],
    },
    {
      index: 2,
      title: 'Шаг 2 — Commit точки доступа',
      tooltip: 'Точка доступа выбирает два секрета и шлёт пару (scalar, element).',
      description:
        'Точка доступа выбирает два секретных случайных числа — rand и mask — и формирует ' +
        'из них пару: commit-scalar (сумма rand и mask) и commit-element (точка ' +
        '−mask·PWE). В эфир уходит только эта пара. Ни пароль, ни сами секреты rand и mask ' +
        'наружу не попадают: восстановить их из пары — это задача дискретного логарифма, ' +
        'вычислительно неразрешимая.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'фаза «обязательства»: сторона раскрывает пару чисел, «привязываясь» к своему секрету, но не выдавая его.' },
        { term: 'scalar (скаляр)', definition: 'обычное целое число (в отличие от точки кривой). Здесь commit-scalar = сумма двух секретов по модулю n.' },
        { term: 'element (элемент)', definition: 'точка кривой, передаваемая в фазе Commit. Вычисляется из секрета mask и точки PWE.' },
        { term: 'rand, mask', definition: 'два секретных случайных числа, которые сторона выбирает сама и никому не показывает.' },
        { term: 'mod n', definition: '«остаток от деления на n», где n — порядок группы кривой. Так результат удерживается в допустимом диапазоне.' },
        { term: 'Дискретный логарифм', definition: 'задача «по точке k·PWE и точке PWE найти число k». На эллиптической кривой она вычислительно неразрешима — на этом и держится защита.' },
      ],
      dataFlow: {
        inputs: [ref(pwe)],
        transform: 'Выбор rand, mask → commit',
        outputs: [ref(apScalar), ref(apElement)],
      },
      artifacts: [apScalar, apElement],
      packet: { from: 'ap', label: 'Commit — (scalar, element)' },
    },
    {
      index: 3,
      title: 'Шаг 3 — Commit клиента',
      tooltip: 'Клиент симметрично шлёт свою пару (scalar, element).',
      description:
        'Клиент выполняет ровно тот же шаг: выбирает свои секретные rand и mask и ' +
        'отправляет свою пару (scalar, element). В этом и смысл названия «равных» ' +
        '(Simultaneous Authentication of Equals) — в SAE нет деления на «главного» и ' +
        '«подчинённого», обе стороны делают симметричные действия.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: '«Равных» (of Equals)', definition: 'в SAE обе стороны выполняют одинаковые шаги. Нет «сервера» и «клиента» в смысле разных ролей — отсюда слово «равных» в названии.' },
        { term: 'Симметричный обмен', definition: 'обе стороны отправляют сообщения одного вида; ни одна не зависит от того, кто начал первым.' },
      ],
      dataFlow: {
        inputs: [ref(pwe)],
        transform: 'Выбор rand, mask → commit',
        outputs: [ref(clScalar), ref(clElement)],
      },
      artifacts: [clScalar, clElement],
      packet: { from: 'client', label: 'Commit — (scalar, element)' },
    },
    {
      index: 4,
      title: 'Шаг 4 — Общий секрет K',
      tooltip: 'Обе стороны независимо вычисляют ОДИН и тот же секрет K.',
      description:
        'Получив чужую пару (scalar, element), каждая сторона комбинирует её со своим ' +
        'секретом rand и вычисляет общий секрет K. Математика устроена так, что у точки ' +
        'доступа и у клиента K получается ОДИНАКОВЫМ — хотя секреты у них разные, и по ' +
        'эфиру K никогда не передавался. Совпадение K и есть доказательство, что у обеих ' +
        'сторон один пароль.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element)',
      terms: [
        { term: 'Общий секрет K', definition: 'точка кривой, которую обе стороны вычисляют независимо и получают одинаковой. Сам K в эфир не передаётся.' },
        { term: 'Скалярное умножение', definition: 'умножение точки кривой на число: k·P — это сложить точку P саму с собой k раз. Основная операция в этой криптографии.' },
        { term: 'peer (пир)', definition: '«партнёр по обмену» — другая сторона. peer_scalar и peer_element — это пара, присланная партнёром.' },
        { term: 'Сходимость', definition: 'свойство, что K у обеих сторон совпал. Именно сходимость доказывает знание общего пароля.' },
      ],
      dataFlow: {
        inputs: [ref(apScalar), ref(apElement), ref(clScalar), ref(clElement)],
        transform: 'Скалярное умножение на P-256',
        outputs: [ref(sharedK)],
      },
      artifacts: [sharedK],
    },
    {
      index: 5,
      title: 'Шаг 5 — Вывод PMK',
      tooltip: 'Из общего секрета K выводится PMK.',
      description:
        'Из общего секрета K функция формирования ключа на HMAC-SHA256 выводит PMK — ' +
        'мастер-ключ той же роли, что и PMK в WPA2. Дальше подключение продолжается ' +
        'привычным образом, но самое важное уже произошло: пароль подтверждён, а в эфире ' +
        'не осталось данных, пригодных для офлайн-перебора.',
      formula: 'PMK = KDF-HMAC-SHA256(K, "SAE KCK and PMK")',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — мастер-ключ сети. В WPA3 он получается из общего секрета K, а не из PBKDF2, как в WPA2.' },
        { term: 'KDF', definition: 'Key Derivation Function — функция формирования ключа. Превращает «сырой» секрет K в ключ нужной длины и формата.' },
        { term: 'HMAC-SHA256', definition: 'версия HMAC на хеш-функции SHA-256 (даёт 32 байта отпечатка). Современнее и надёжнее, чем HMAC-SHA1.' },
      ],
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
      tooltip: 'Перехватчик видит только пары (scalar, element) — и всё.',
      description:
        'Поставим себя на место злоумышленника с антенной. Всё, что он перехватил, — это ' +
        'две пары (scalar, element). По ним нельзя ни восстановить пароль, ни даже ' +
        'проверить догадку: чтобы убедиться, верен ли пароль-кандидат, нужен новый живой ' +
        'обмен Commit/Confirm с точкой доступа. А точка доступа ограничивает число ' +
        'попыток. Офлайн-перебор, который работал против WPA2, здесь невозможен.',
      terms: [
        { term: 'Перехватчик', definition: 'злоумышленник, который пассивно слушает радиоэфир и записывает все пакеты Wi-Fi.' },
        { term: 'Офлайн-перебор', definition: 'подбор пароля на своём компьютере, без связи с сетью. Работает, только если есть что сверять офлайн.' },
        { term: 'Пароль-кандидат', definition: 'очередное слово, которое атакующий проверяет как возможный пароль.' },
        { term: 'Confirm', definition: 'фаза подтверждения в SAE: стороны обмениваются доказательствами, что вычислили одинаковый K.' },
      ],
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
      tooltip: 'В WPA2 офлайн-перебор возможен, в WPA3 SAE — нет.',
      description:
        'Сравним. В WPA2 перехваченное рукопожатие содержит MIC — значение, которое можно ' +
        'сверять с догадками офлайн, на своём компьютере, сколько угодно. В WPA3 SAE такой ' +
        'проверяемой офлайн величины просто нет: каждая попытка подбора требует нового ' +
        'обмена с точкой доступа в реальном времени. Поэтому атака из Модуля 3 (Hashcat ' +
        '22000) против WPA3 неприменима — это и есть главный смысл перехода на WPA3.',
      terms: [
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — класс протоколов, где стороны доказывают знание пароля, не давая его перехватить или перебрать офлайн. SAE — один из них.' },
        { term: 'MIC (в WPA2)', definition: 'подпись из рукопожатия WPA2. Её можно сверять с догадками офлайн — это и есть слабое место WPA2, которого нет в WPA3.' },
        { term: 'Forward secrecy', definition: '«прямая секретность»: даже если позже узнают пароль, ранее записанный трафик расшифровать не получится. SAE это обеспечивает.' },
      ],
      dataFlow: {
        inputs: [ref(pmk)],
        transform: 'Сравнение WPA2 ↔ WPA3',
        outputs: [],
      },
      artifacts: [],
    },
  ];
}
