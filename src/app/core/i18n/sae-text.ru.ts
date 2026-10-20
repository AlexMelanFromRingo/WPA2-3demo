/** Текст шагов модуля WPA3 SAE — русская версия (эталон для переводов). */
import type { SaeText } from './sae-text';

export const SAE_TEXT_RU: SaeText = {
  labels: {
    ssid: 'SSID (имя сети)',
    passphrase: 'Пароль сети',
    apMac: 'MAC точки доступа',
    clientMac: 'MAC клиента',
    pwdSeed: 'pwd-seed',
    pt: 'PT — точка пароля (зависит от SSID)',
    pwe: 'PWE — элемент пароля',
    clCommit: 'Commit клиента',
    apCommit: 'Commit точки доступа',
    clScalar: 'scalar клиента',
    clElement: 'element клиента',
    apScalar: 'scalar точки доступа',
    apElement: 'element точки доступа',
    sharedK: 'k — общий секрет',
    keyseed: 'keyseed',
    saeKck: 'KCK (SAE, 32 байта)',
    pmk: 'PMK',
    pmkid: 'PMKID',
    clConfirm: 'Confirm клиента',
    apConfirm: 'Confirm точки доступа',
    ptk: 'PTK',
    m1: 'Кадр M1',
    m2: 'Кадр M2',
    m3: 'Кадр M3',
    m4: 'Кадр M4',
    keyDataPlain: 'Key Data M3 (открыто)',
    keyDataWrapped: 'Key Data M3 (зашифровано)',
  },
  methodLabel: { h2e: 'Hash-to-Element (H2E)', hnp: 'Hunting-and-Pecking (H&P)' },
  methodHint: {
    h2e: 'современный способ: без цикла, за постоянное время; обязателен в диапазоне 6 ГГц',
    hnp: 'исходный способ 2012 года: цикл «поиска и проб»; разрешён, но требует осторожной реализации',
  },
  hnp: {
    header: 'counter\tpwd-value < p\tx³+ax+b — квадрат\tитог',
    yes: 'да',
    no: 'нет',
    found: '← НАЙДЕНО: берём этот x',
    masked: 'итерации {from}–{to}: пароль подменён случайной строкой, результат не используется',
  },
  droppedLabel: 'отброшено',
  ok: '✓ совпало',
  fail: '✗ не совпало',
  passed: '✓ пройдена',
  rejected: '✗ отклонено',
  frameFields: {
    auth: 'Algorithm ‖ Seq ‖ Status',
    group: 'Group',
    scalar: 'Scalar',
    element: 'Element (x ‖ y)',
  },
  steps: [
    {
      title: 'Исходные данные и выбор способа',
      tooltip: 'Пароль, SSID и MAC-адреса. Способ вывода PWE переключается кнопками выше.',
      description:
        'Зачем: в WPA2 любой, кто записал рукопожатие, может дома перебирать пароли. WPA3 ' +
        'закрывает эту дыру протоколом SAE. Что: SAE — это PAKE, «обмен ключами с проверкой ' +
        'пароля»: стороны вырабатывают общий секрет так, что каждая попытка угадать пароль ' +
        'требует живого разговора с точкой доступа. Как: SAE выполняется ДО ассоциации, ' +
        'кадрами Authentication вместо пустой Open System Authentication WPA2. Работаем на ' +
        'группе 19 — эллиптической кривой NIST P-256. Наверху можно выбрать, каким способом ' +
        'пароль превращается в точку кривой.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals — «одновременная аутентификация равных» (IEEE 802.11-2020 §12.4). Основан на протоколе Dragonfly (RFC 7664).' },
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — обмен ключами, в котором знание пароля доказывается, но сам пароль и всё, по чему его можно проверить, в эфир не попадает.' },
        { term: 'Равные', definition: 'у SAE нет «сервера» и «клиента» в криптографическом смысле: обе стороны делают одинаковые шаги, и любая может начать первой.' },
        { term: 'Эллиптическая кривая', definition: 'множество точек (x, y), удовлетворяющих y² = x³ + a·x + b по модулю большого простого числа p. Точки можно складывать; умножить точку на число легко, а по результату найти это число — практически невозможно.' },
        { term: 'Группа 19', definition: 'номер набора параметров в SAE: кривая NIST P-256 (256 бит). Поддерживать её обязаны все устройства WPA3; бывают также группы 20 (P-384) и 21 (P-521).' },
      ],
      transform: 'Параметры учебной сети',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Пароль      "{passText}"  →  hex {passHex}',
        'MAC AP      {apMacColon}',
        'MAC клиента {clientMacColon}',
        'Группа      19 (NIST P-256)',
        'Способ PWE  {methodName}',
        '',
        'Кривая P-256:  y² = x³ − 3·x + b  (mod p)',
        '  p = {curveP}',
        '  r = {curveR}   (число точек — «порядок группы»)',
      ],
    },
    {
      title: 'Шаг 1 — Точка PT из SSID и пароля (H2E)',
      tooltip: 'HKDF превращает пароль в два числа, SSWU — каждое в точку кривой.',
      description:
        'Зачем: криптография SAE работает с точками кривой, а не со строками, поэтому пароль ' +
        'нужно превратить в точку — так, чтобы по точке пароль не восстанавливался. Что: ' +
        'H2E (Hash-to-Element) сначала делает из SSID и пароля точку PT. Как: HKDF-Extract ' +
        'смешивает пароль с SSID в 32-байтовый pwd-seed; HKDF-Expand с двумя разными метками ' +
        'даёт два 48-байтовых числа u1 и u2; отображение SSWU из RFC 9380 превращает каждое в ' +
        'точку кривой, и PT = P1 + P2. Никаких циклов и проб — время вычисления не зависит от ' +
        'пароля. PT можно посчитать один раз и хранить: он не зависит от MAC-адресов.',
      formula: 'pwd-seed = HKDF-Extract(SSID, пароль);  uᵢ = HKDF-Expand(pwd-seed, "SAE Hash to Element uᵢ Pᵢ", 48) mod p;  PT = SSWU(u1) + SSWU(u2)',
      terms: [
        { term: 'HKDF', definition: 'HMAC-based Key Derivation Function (RFC 5869). Extract «выжимает» из входа равномерный ключ (здесь — HMAC-SHA256 с SSID в роли соли), Expand растягивает его до нужной длины с заданной меткой.' },
        { term: 'SSWU', definition: 'simplified Shallue–van de Woestijne–Ulas — формула, которая любое число u за фиксированное число операций превращает в точку кривой (RFC 9380 §6.6.2). Для P-256 параметр Z = −10.' },
        { term: 'Квадратичный вычет', definition: 'число, из которого по модулю p извлекается квадратный корень. Точка с координатой x существует, только если x³ + a·x + b — квадратичный вычет.' },
        { term: 'mod p', definition: 'остаток от деления на p. Все вычисления на кривой идут «по кругу» в пределах от 0 до p − 1.' },
        { term: 'Почему 48 байт', definition: '48 байт = 32 + 16: лишние 16 байт делают остаток от деления на p практически равномерным, без перекоса в пользу малых чисел.' },
      ],
      transform: 'HKDF-SHA256 + SSWU (RFC 9380)',
      calc: [
        '1) pwd-seed = HKDF-Extract(соль = SSID, вход = пароль)',
        '            = HMAC-SHA256("{ssidText}", "{passText}")',
        '            = {pwdSeed}',
        '',
        '2) pwd-value1 = HKDF-Expand(pwd-seed, "SAE Hash to Element u1 P1", 48)',
        '            = {pwdValue1}',
        '   u1 = pwd-value1 mod p = {u1}',
        '   pwd-value2 = HKDF-Expand(pwd-seed, "SAE Hash to Element u2 P2", 48)',
        '            = {pwdValue2}',
        '   u2 = pwd-value2 mod p = {u2}',
        '',
        '3) SSWU(u1): gx1 — квадрат? {sswu1Square} → x = {sswu1Which}; знак y поправлен: {sswu1Neg}',
        '   P1 = ({p1x},',
        '         {p1y})',
        '   SSWU(u2): gx1 — квадрат? {sswu2Square} → x = {sswu2Which}; знак y поправлен: {sswu2Neg}',
        '   P2 = ({p2x},',
        '         {p2y})',
        '',
        '4) PT = P1 + P2 (сложение точек кривой)',
        '   PT.x = {ptx}',
        '   PT.y = {pty}',
      ],
    },
    {
      title: 'Шаг 2 — PWE = val · PT (H2E)',
      tooltip: 'PT «привязывают» к паре MAC-адресов: умножают на число из MAC.',
      description:
        'Зачем: элемент пароля должен быть свой для каждой пары устройств — тогда результаты ' +
        'одного обмена бесполезны для другого. Что: из двух MAC-адресов получают число val и ' +
        'умножают на него точку PT. Как: val = HKDF-Extract(32 нулевых байта, больший MAC ‖ ' +
        'меньший MAC), приводится в диапазон от 1 до r − 1, и PWE = val · PT. Обе стороны ' +
        'получают одну и ту же точку PWE независимо, ничего не пересылая.',
      formula: 'val = HKDF-Extract(0³², max(MAC) ‖ min(MAC)) mod (r − 1) + 1;  PWE = val · PT',
      terms: [
        { term: 'PWE', definition: 'Password Element — «элемент пароля», точка кривой, на которой строится весь обмен SAE. Известна только тем, кто знает пароль.' },
        { term: 'Умножение точки на число', definition: 'сложение точки с самой собой много раз (val · PT = PT + PT + … + PT). Делается быстро, а обратная задача — узнать val по результату — «задача дискретного логарифма», практически нерешаема.' },
        { term: 'max / min MAC', definition: 'больший и меньший из двух MAC-адресов: порядок фиксирован, поэтому обе стороны получают одинаковое val.' },
      ],
      transform: 'HKDF-Extract(MAC) и умножение точки',
      calc: [
        'max(MAC) ‖ min(MAC) = {macMaxMin}',
        'HKDF-Extract(0³², max ‖ min) = HMAC-SHA256(32 нулевых байта, max ‖ min)',
        '  = {valHash}',
        'val = это число mod (r − 1) + 1 = {val}',
        '',
        'PWE = val · PT',
        '  PWE.x = {pwex}',
        '  PWE.y = {pwey}',
        '',
        'Точка доступа вывела PWE сама — совпадение: {chkPwe}',
      ],
    },
    {
      title: 'Шаг 3 — Commit клиента',
      tooltip: 'Клиент прячет PWE за двумя случайными числами и отправляет scalar и element.',
      description:
        'Зачем: каждая сторона должна внести в общий секрет свою случайность, не раскрывая ' +
        'PWE. Что: клиент выбирает два секретных случайных числа rand и mask от 2 до r − 1 и ' +
        'отправляет кадр Commit с двумя публичными значениями. Как: scalar = (rand + mask) mod ' +
        'r — просто число; element = −(mask · PWE) — точка кривой. По ним нельзя узнать ни rand, ' +
        'ни mask, ни PWE: mask «маскирует» точку пароля. rand и mask одноразовые — в следующем ' +
        'подключении будут новые (поэтому и ключи будут новые).',
      formula: 'scalar = (rand + mask) mod r;  element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'первое сообщение SAE (кадр Authentication, Transaction Sequence = 1): «вот мои обязательства». Algorithm = 3 означает SAE.' },
        { term: 'rand, mask', definition: 'секретные одноразовые случайные числа. rand нужен для общего секрета, mask — чтобы спрятать PWE. Никогда не передаются.' },
        { term: 'Status 126', definition: 'код статуса SAE_HASH_TO_ELEMENT: так сторона сообщает, что использует H2E. При H&P статус 0.' },
        { term: 'Обратная точка (−P)', definition: 'точка (x, p − y) — «зеркальная» по оси x. P + (−P) = «ноль» кривой.' },
      ],
      transform: 'scalar = rand + mask, element = −mask·PWE',
      calc: [
        'Секреты клиента (в эфир не уходят):',
        '  rand = {clRand}',
        '  mask = {clMask}',
        '',
        'scalar  = (rand + mask) mod r = {clScalar}',
        'element = −(mask · PWE)',
        '  x = {clElemX}',
        '  y = {clElemY}',
        '',
        'Кадр Authentication — Commit ({clCommitLen} байт):',
        '  Algorithm\t0300\t3 = SAE',
        '  Transaction Seq\t{seq1}\t1 = Commit',
        '  Status\t{statusHex}\t{statusDec}',
        '  Group\t1300\t19 = NIST P-256',
        '  Scalar\t{clScalar}',
        '  Element\t{clElemX}',
        '  \t{clElemY}',
      ],
      byteCaption:
        'Тело кадра Commit: служебные поля (алгоритм, номер сообщения, статус), номер группы, ' +
        'scalar (32 байта) и element (64 байта — координаты x и y).',
      packetLabel: 'Commit (scalar, element)',
    },
    {
      title: 'Шаг 4 — Commit точки доступа',
      tooltip: 'Точка доступа делает то же самое со своими случайными числами.',
      description:
        'Стороны равны: точка доступа выполняет те же действия — свои rand и mask, свой scalar ' +
        'и element — и отправляет свой Commit. Порядок не важен: в настоящих сетях Commit ' +
        'обычно начинает клиент, но стандарт допускает и одновременную отправку. Если точка ' +
        'доступа перегружена, вместо Commit она может ответить статусом 76 и «жетоном» ' +
        'anti-clogging: клиент обязан повторить Commit с жетоном. Так отсеиваются флуд-атаки ' +
        'с поддельных MAC-адресов — вычисления SAE дорогие.',
      formula: 'scalar_AP = (rand_AP + mask_AP) mod r;  element_AP = −(mask_AP · PWE)',
      terms: [
        { term: 'Anti-clogging token', definition: '«жетон от засорения» (status 76): короткое значение, которое точка доступа выдаёт в ответ на Commit под нагрузкой. Доказывает, что клиент действительно получает кадры на свой MAC.' },
        { term: 'Status 77', definition: 'UNSUPPORTED_FINITE_CYCLIC_GROUP — «эта группа не поддерживается»: клиент повторяет Commit с другой группой.' },
      ],
      transform: 'Свои rand, mask → scalar, element',
      calc: [
        'Секреты точки доступа:',
        '  rand = {apRand}',
        '  mask = {apMask}',
        '',
        'scalar  = {apScalar}',
        'element.x = {apElemX}',
        'element.y = {apElemY}',
        '',
        'Кадр Commit точки доступа — {apCommitLen} байт, та же структура.',
      ],
      byteCaption: 'Тело кадра Commit точки доступа — та же структура, другие значения.',
      packetLabel: 'Commit (scalar, element)',
    },
    {
      title: 'Шаг 5 — Проверка Commit и общий секрет k',
      tooltip: 'Каждая сторона проверяет чужой Commit и вычисляет одну и ту же точку K.',
      description:
        'Зачем: нужно получить общий секрет, известный только тем, кто знает PWE. Что: ' +
        'сначала каждая сторона проверяет чужой Commit: scalar должен быть больше 1 и меньше r, ' +
        'element — настоящей точкой кривой, а сам Commit не должен совпадать с собственным ' +
        '(иначе это атака «отражением»). Как: затем K = rand · (scalar_чужой · PWE + ' +
        'element_чужой), и k — x-координата K. Почему результаты совпадают: mask одной стороны ' +
        'в сумме взаимно уничтожается с −mask, и у обеих остаётся rand_клиента · rand_AP · PWE.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element);  k = x(K)',
      terms: [
        { term: 'Атака отражением', definition: 'злоумышленник «отражает» ваш же Commit обратно. Проверка на совпадение с собственным Commit её блокирует.' },
        { term: 'Проверка точки', definition: 'координаты меньше p и уравнение кривой выполняется. Без неё злоумышленник подсунул бы «точку» вне кривой и выведал бы секрет (invalid-curve attack).' },
        { term: 'Почему k одинаков', definition: 'rand_A·(s_B·PWE − mask_B·PWE) = rand_A·rand_B·PWE, и у второй стороны — то же произведение в обратном порядке.' },
      ],
      transform: 'Проверка + K = rand·(s·PWE + E)',
      calc: [
        'Клиент проверяет Commit точки доступа:',
        '  1 < scalar < r: {chkClScalar};  element на кривой: {chkClElement};  не отражение: {chkClReflect}',
        'Точка доступа проверяет Commit клиента:',
        '  1 < scalar < r: {chkApScalar};  element на кривой: {chkApElement};  не отражение: {chkApReflect}',
        '',
        'У клиента: K = rand_клиента · (scalar_AP · PWE + element_AP)',
        '  k = x(K) = {clK}',
        'У точки доступа: K = rand_AP · (scalar_клиента · PWE + element_клиента)',
        '  k = x(K) = {apK}',
        '',
        'k совпал: {chkK}',
      ],
    },
    {
      title: 'Шаг 6 — KCK, PMK и PMKID',
      tooltip: 'Из k выводятся ключ подтверждения KCK и мастер-ключ PMK.',
      description:
        'Зачем: сырой общий секрет k не используют напрямую — из него выводят ключи под ' +
        'конкретные задачи. Что: KCK нужен, чтобы подтвердить обмен в Confirm, PMK — мастер-ключ ' +
        'для последующего 4-Way Handshake. Как: keyseed = HMAC-SHA256(32 нулевых байта, k); ' +
        'затем KDF стандарта 802.11 с меткой "SAE KCK and PMK" и контекстом (scalar_клиента + ' +
        'scalar_AP) mod r выдаёт 64 байта: первые 32 — KCK, следующие 32 — PMK. PMKID — первые ' +
        '16 байт контекста. Важно: PMKID зависит только от публичных scalar, а не от пароля, ' +
        'поэтому PMKID-атака против WPA3 бесполезна.',
      formula: 'keyseed = HMAC-SHA256(0³², k);  KCK ‖ PMK = KDF-512(keyseed, "SAE KCK and PMK", (s_клиента + s_AP) mod r)',
      terms: [
        { term: 'KDF', definition: 'Key Derivation Function IEEE 802.11 (§12.7.1.6.2): HMAC-SHA256(ключ, i ‖ метка ‖ контекст ‖ длина), где i — номер блока (1, 2, …), i и длина — 2 байта little-endian.' },
        { term: 'Little-endian', definition: 'порядок байт «младший первым»: число 512 = 0x0200 записывается как 00 02.' },
        { term: 'Forward secrecy', definition: '«прямая секретность»: PMK зависит от одноразовых rand, поэтому даже если пароль позже утечёт, записанный ранее трафик не расшифровать. В WPA2-PSK этого свойства нет.' },
      ],
      transform: 'HMAC-SHA256 + KDF-512',
      calc: [
        'keyseed = HMAC-SHA256(ключ = 00 × 32, k) = {keyseed}',
        'контекст = (scalar_клиента + scalar_AP) mod r = {context}',
        '',
        'KDF-512: 2 блока HMAC-SHA256(keyseed, i ‖ "SAE KCK and PMK" ‖ контекст ‖ 0002)',
        '  блок 1 (i = 0100) ‖ блок 2 (i = 0200) = {kdfOut}',
        '',
        'KCK   = байты 0..31  = {saeKck}',
        'PMK   = байты 32..63 = {pmk}',
        'PMKID = первые 16 байт контекста = {pmkid}',
        '',
        'У точки доступа те же значения — PMK совпал: {chkPmk}',
      ],
      byteCaption: 'Выход KDF-512 — 64 байта: зелёные (0–31) — KCK, голубые (32–63) — PMK.',
    },
    {
      title: 'Шаг 7 — Confirm клиента',
      tooltip: 'Клиент доказывает, что вывел тот же KCK, — HMAC от всех значений обмена.',
      description:
        'Зачем: пока никто не доказал, что у второй стороны тот же пароль — совпадение k ' +
        'проверить напрямую нельзя, k не передаётся. Что: клиент отправляет Confirm — HMAC ' +
        'ключом KCK от счётчика send-confirm и всех четырёх публичных значений обмена. Как: ' +
        'порядок — сначала свои scalar и element, потом чужие. Подделать Confirm без KCK ' +
        'нельзя, а KCK получается только при правильном пароле. Если пароль неверный, Confirm ' +
        'не сойдётся — и у злоумышленника эта попытка сгорит: следующую догадку можно проверить ' +
        'только новым живым обменом.',
      formula: 'confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer_scalar ‖ peer_element)',
      terms: [
        { term: 'Confirm', definition: 'второе сообщение SAE (Transaction Sequence = 2): «докажу, что у меня тот же ключ».' },
        { term: 'send-confirm', definition: '2-байтовый счётчик отправленных Confirm (little-endian); у первого — 1. Защищает от повторов.' },
        { term: 'Онлайн-атака', definition: 'проверка догадки пароля «вживую» — с настоящей точкой доступа. Медленно, заметно, ограничивается; это единственный путь против SAE.' },
      ],
      transform: 'HMAC-SHA256(KCK, …)',
      calc: [
        'send-confirm = 0100 (= 1)',
        'confirm = HMAC-SHA256(KCK, 0100 ‖ scalar_клиента ‖ element_клиента ‖ scalar_AP ‖ element_AP)',
        '        = {clConfirm}',
        '',
        'Кадр Authentication — Confirm ({clConfirmLen} байт):',
        '  Algorithm\t0300\t3 = SAE',
        '  Transaction Seq\t0200\t2 = Confirm',
        '  Status\t0000\t0 = успех',
        '  Send-Confirm\t0100\t1',
        '  Confirm\t{clConfirm}',
      ],
      packetLabel: 'Confirm',
    },
    {
      title: 'Шаг 8 — Confirm точки доступа и взаимная проверка',
      tooltip: 'Обе стороны пересчитывают чужой Confirm — SAE завершён.',
      description:
        'Точка доступа пересчитывает Confirm клиента своим KCK (в порядке «чужие значения, ' +
        'потом свои») и сравнивает. Совпало — клиент знает пароль. Затем она отправляет свой ' +
        'Confirm, а клиент проверяет его так же. После этого стороны в состоянии «Accepted»: у ' +
        'обеих одинаковый PMK, и он ни разу не передавался. Дальше — обычная ассоциация и ' +
        '4-Way Handshake, но уже на свежем PMK из SAE.',
      formula: 'verifier = HMAC-SHA256(KCK, peer_send-confirm ‖ peer_scalar ‖ peer_element ‖ scalar ‖ element)',
      terms: [
        { term: 'Verifier', definition: 'значение, которое получатель вычисляет сам и сравнивает с присланным Confirm.' },
        { term: 'Accepted', definition: 'конечное состояние SAE: обмен подтверждён обеими сторонами, PMK можно использовать.' },
      ],
      transform: 'Пересчёт чужого Confirm',
      calc: [
        'Confirm точки доступа = {apConfirm}',
        '',
        'AP проверяет Confirm клиента:     {chkApConfirm}',
        'Клиент проверяет Confirm AP:      {chkClConfirm}',
        '',
        'Итог SAE: общий PMK = {pmk}',
      ],
      packetLabel: 'Confirm',
    },
    {
      title: 'Шаг 9 — Ассоциация, M1 и PTK (KDF-SHA-256)',
      tooltip: 'Для AKM SAE ключ PTK выводится через KDF на SHA-256, а не через PRF на SHA-1.',
      description:
        'Зачем: PMK из SAE — это аналог PMK из пароля в WPA2; ключи сеанса выводятся тем же ' +
        '4-Way Handshake. Что: клиент ассоциируется, объявляя в RSNE AKM 00-0F-AC:8 (SAE) и ' +
        'флаги MFPR и MFPC — защита служебных кадров PMF обязательна. Точка доступа шлёт M1 с ' +
        'ANonce и PMKID из SAE. Как: отличие от WPA2 — для AKM 8 PTK выводит KDF на ' +
        'HMAC-SHA256 (два блока по 32 байта, длина 384 бита входит в каждый блок), а не PRF на ' +
        'SHA-1. Блок B собирается так же.',
      formula: 'PTK = KDF-SHA-256-384(PMK, "Pairwise key expansion", min/max(AA,SPA) ‖ min/max(ANonce,SNonce))',
      terms: [
        { term: 'AKM 8', definition: 'набор 00-0F-AC:8 — «SAE с SHA-256». Определяет, как выводятся PTK (KDF-SHA-256) и считается MIC (AES-128-CMAC).' },
        { term: 'PMF', definition: 'Protected Management Frames (802.11w): служебные кадры отключения (deauth/disassoc) тоже подписываются. В WPA3 обязательно — поэтому MFPR = MFPC = 1.' },
        { term: 'RSNXE', definition: 'RSN Extension Element: здесь в нём флаг «SAE H2E». Он повторяется в M2 и M3 внутри подписанных кадров, чтобы посредник не мог незаметно навязать старый H&P.' },
      ],
      transform: 'KDF-SHA-256-384',
      calc: [
        'RSNE клиента/AP: {rsne}',
        '  … 00-0f-ac 08 = AKM SAE, RSN Capabilities = c000 (MFPR | MFPC)',
        'RSNXE: {rsnxe}',
        '',
        'M1: ANonce = {aNonce}, Key Information = {m1Info} (версия дескриптора 0 — «определяется AKM»)',
        '    Key Data = PMKID KDE с PMKID из SAE: {m1Kd}',
        '',
        'B = {b}',
        'KDF: блок i = HMAC-SHA256(PMK, i ‖ "Pairwise key expansion" ‖ B ‖ 8001)',
        '  (8001 = 384 в little-endian)',
        '  блоки 1 и 2 = {ptkRaw}',
        'PTK = первые 48 байт = {ptk}',
        '  KCK = {kck}   KEK = {kek}   TK = {tk}',
      ],
      byteCaption: 'Два блока HMAC-SHA256 — 64 байта: зелёные (0–47) — PTK, серые (48–63) — отбрасываются.',
      packetLabel: 'M1 — ANonce + PMKID',
    },
    {
      title: 'Шаг 10 — M2 с MIC на AES-128-CMAC',
      tooltip: 'Для AKM SAE MIC считается не HMAC-SHA1, а AES-128-CMAC.',
      description:
        'Клиент отвечает M2: SNonce, RSNE и RSNXE (если H2E) и MIC. Отличие от WPA2 — функция ' +
        'MIC: для AKM 8 это AES-128-CMAC ключом KCK от кадра с обнулённым MIC. Её выход — ровно ' +
        '16 байт, усекать ничего не нужно. Точка доступа выводит тот же PTK и пересчитывает ' +
        'MIC: совпадение подтверждает, что ключи сеанса одинаковы.',
      formula: 'MIC = AES-128-CMAC(KCK, кадр M2 с обнулённым MIC)',
      terms: [
        { term: 'AES-128-CMAC', definition: 'код аутентичности сообщения на блочном шифре AES (RFC 4493): AES-CBC по всем блокам кадра с особым ключом-поправкой для последнего блока. Даёт 16 байт.' },
        { term: 'Key Descriptor Version 0', definition: 'значение «версия определяется AKM»: алгоритмы MIC и шифрования Key Data задаёт сам AKM (для SAE — AES-128-CMAC и AES Key Wrap).' },
      ],
      transform: 'AES-128-CMAC(KCK, кадр)',
      calc: [
        'Кадр M2 ({m2Size} байт): Key Information = {m2Info} (MIC | Pairwise | версия 0)',
        '  Key Nonce = SNonce = {sNonce}',
        '  Key Data ({m2KdLenDec} байт) = {m2Kd}',
        '',
        'MIC = AES-128-CMAC(KCK = {kck}, M2 с нулями) = {m2Mic}',
        'Точка доступа пересчитала MIC: {chkM2}',
      ],
      byteCaption: 'Кадр M2 побайтно: зелёным — SNonce, голубым — MIC, жёлтым — Key Data с RSNE.',
      packetLabel: 'M2 — SNonce + MIC (CMAC)',
    },
    {
      title: 'Шаг 11 — M3 с GTK и IGTK, M4 и установка ключей',
      tooltip: 'В M3 точка доступа передаёт GTK и IGTK (ключ PMF), зашифрованные KEK.',
      description:
        'M3 устроен как в WPA2, но в Key Data дополнительно лежит IGTK KDE — ключ, которым ' +
        'подписываются широковещательные служебные кадры (PMF). Key Data дополняется до ' +
        'кратного 8 и шифруется AES Key Wrap ключом KEK, кадр подписывается AES-128-CMAC. ' +
        'Клиент проверяет MIC, расшифровывает GTK и IGTK, отвечает M4, и обе стороны ставят ' +
        'ключи. Начиная с этого момента защищён и трафик, и служебные кадры: поддельный ' +
        '«deauth» больше не отключит клиента.',
      formula: 'Key Data = AES-KeyWrap(KEK, RSNE ‖ RSNXE ‖ GTK KDE ‖ IGTK KDE ‖ паддинг)',
      terms: [
        { term: 'IGTK', definition: 'Integrity Group Temporal Key — групповой ключ целостности для PMF. Широковещательные служебные кадры подписываются алгоритмом BIP-CMAC-128.' },
        { term: 'IGTK KDE', definition: 'dd 1c 00-0F-AC 09 ‖ KeyID (2 байта) ‖ IPN (6 байт, счётчик пакетов) ‖ IGTK (16 байт) — 30 байт.' },
        { term: 'Deauth-атака', definition: 'рассылка поддельных кадров «отключись». Без PMF они не подписаны и работают; с PMF клиент их отвергает.' },
      ],
      transform: 'AES Key Wrap + AES-128-CMAC',
      calc: [
        'Открытый Key Data ({m3PlainLen} байт) → паддинг до {m3PaddedLen}:',
        '  RSNE [‖ RSNXE]    = {rsneRsnxe}',
        '  GTK KDE           = {gtkKde}',
        '  IGTK KDE          = {igtkKde}',
        '  паддинг           = {padding}',
        'AES-KeyWrap(KEK) → {m3KdLenDec} байт: {m3Kd}',
        '',
        'M3: Key Information = {m3Info}, MIC (CMAC) = {m3Mic}',
        '    клиент проверил MIC: {chkM3}; достал GTK: {chkUnwrap}; RSNE совпал: {chkRsneClient}',
        'M4: Key Information = {m4Info}, MIC (CMAC) = {m4Mic}',
        '    точка доступа проверила MIC: {chkM4}',
        '',
        'Установлены: TK = {tk}, GTK = {gtk}, IGTK = {igtk}',
      ],
      byteCaption:
        'Открытый Key Data M3 до шифрования: RSNE, RSNXE, GTK KDE, IGTK KDE и паддинг.',
      packetLabel: 'M3 — GTK + IGTK (шифр.)',
    },
    {
      title: 'Шаг 12 — Что видит перехватчик и почему офлайн-перебор не работает',
      tooltip: 'В эфире только scalar, element, Confirm и кадры EAPOL — пароль по ним не проверить.',
      description:
        'Подведём итог глазами злоумышленника, записавшего весь обмен. Он видит scalar и ' +
        'element обеих сторон, оба Confirm, кадры M1–M4. Чтобы проверить догадку пароля ' +
        'офлайн, ему нужно вычислить k — а для этого нужен секретный rand хотя бы одной ' +
        'стороны; по scalar и element он не вычисляется (это задача дискретного логарифма). ' +
        'Без k нет KCK и PMK — нечего сравнивать с Confirm и MIC. PMKID не зависит от пароля. ' +
        'Остаётся только онлайн-перебор: каждая догадка — это новый живой обмен с точкой ' +
        'доступа, который можно ограничить и заметить.',
      terms: [
        { term: 'Задача дискретного логарифма', definition: 'по точкам G и n·G найти число n. На кривой P-256 лучшие известные алгоритмы требуют порядка 2¹²⁸ операций — недостижимо.' },
        { term: 'Офлайн-перебор', definition: 'проверка миллиардов паролей «дома» по записанным данным, без связи с сетью. Против WPA2 работает (Модуль 3), против SAE — нет.' },
        { term: 'Dragonblood', definition: 'атаки 2019 года на ранние реализации SAE: утечки по времени и кэшу в цикле H&P, даунгрейд в смешанном режиме. Ответ стандарта — H2E, постоянное время, Transition Disable.' },
      ],
      transform: 'Анализ перехваченных данных',
      calc: [
        'Видно в эфире:',
        '  scalar клиента  {clScalar}',
        '  scalar AP       {apScalar}',
        '  element-ы, оба Confirm, ANonce, SNonce, MIC в M2–M4, PMKID {pmkid}',
        '',
        'Не видно никогда: пароль, PWE, rand, mask, k, KCK, PMK, PTK.',
        '',
        'Проверка догадки «пароль = X» офлайн:',
        '  PWE(X) посчитать можно → но k = rand · (…) — rand неизвестен',
        '  → KCK(X) не получить → Confirm сравнить не с чем.',
        'PMKID = (scalar_клиента + scalar_AP) mod r → от пароля не зависит.',
      ],
    },
  ],
  hnpSteps: [
    {
      title: 'Шаг 1 — Поиск x перебором (H&P)',
      tooltip: 'Цикл «охоты и клевания»: хешируем пароль со счётчиком, пока x не ляжет на кривую.',
      description:
        'Зачем: пароль нужно превратить в точку кривой. Что: исходный способ SAE — Hunting ' +
        'and Pecking, «охота и клевание». Как: для counter = 1, 2, … считают pwd-seed = ' +
        'HMAC-SHA256(больший MAC ‖ меньший MAC, пароль ‖ counter), из него KDF даёт ' +
        'кандидата pwd-value. Он годится как x, если он меньше p и x³ + a·x + b — квадратичный ' +
        'вычет. Важно: цикл не останавливается на находке — он продолжается минимум k итераций ' +
        '(стандарт задаёт k не меньше 40, hostapd использует 40), а после находки пароль ' +
        'подменяется случайной строкой. Иначе по времени работы можно узнать номер удачной ' +
        'итерации — а это уже утечка о пароле (атаки Dragonblood).',
      formula: 'pwd-seed = HMAC-SHA256(max(MAC) ‖ min(MAC), пароль ‖ counter);  pwd-value = KDF-256(pwd-seed, "SAE Hunting and Pecking", p)',
      terms: [
        { term: 'Hunting and Pecking', definition: '«охота и клевание» — перебор кандидатов, пока очередной не подойдёт. Примерно половина чисел даёт точку кривой, поэтому обычно хватает 1–2 попыток.' },
        { term: 'k', definition: 'минимальное число итераций цикла (здесь 40). При вероятности успеха около ½ на итерацию шанс не найти точку за 40 попыток — примерно 2⁻⁴⁰.' },
        { term: 'Тайминг-атака', definition: 'вывод секретов из времени работы. Если цикл останавливается сразу после находки, время выдаёт номер итерации, а он зависит от пароля.' },
        { term: 'counter', definition: '1-байтовый счётчик, приписанный к паролю; каждая итерация даёт новый кандидат.' },
      ],
      transform: 'HMAC-SHA256 + KDF-256, ≥ 40 итераций',
      calc: [
        'Ключ HMAC = max(MAC) ‖ min(MAC) = {macMaxMin}',
        '',
        '{hnpTable}',
        '',
        'Итераций выполнено: {hnpTotal} (минимум 40), x найден на counter = {hnpFound}',
        'pwd-seed удачной итерации (save) = {hnpSave}',
        'x = {hnpX}',
      ],
    },
    {
      title: 'Шаг 2 — Выбор y и точка PWE (H&P)',
      tooltip: 'Из x вычисляют y; какой из двух корней взять, решает младший бит pwd-seed.',
      description:
        'У найденного x на кривой две точки — (x, y) и (x, p − y), «верхняя» и «нижняя». Что: ' +
        'нужно, чтобы обе стороны выбрали одну и ту же. Как: y = √(x³ + a·x + b) mod p; если ' +
        'младший бит y совпадает с младшим битом сохранённого pwd-seed, берут (x, y), иначе ' +
        '(x, p − y). Получившаяся точка и есть PWE. Обе стороны получают её независимо — ' +
        'вход одинаков: пароль и пара MAC-адресов.',
      formula: 'y = √(x³ + ax + b);  PWE = (x, y), если LSB(y) = LSB(save), иначе (x, p − y)',
      terms: [
        { term: 'Квадратный корень mod p', definition: 'для P-256 p ≡ 3 (mod 4), поэтому √v = v^((p+1)/4) mod p — одна операция возведения в степень.' },
        { term: 'LSB', definition: 'Least Significant Bit — младший бит числа: 0 у чётных, 1 у нечётных.' },
        { term: 'PWE', definition: 'Password Element — «элемент пароля», точка кривой, на которой строится весь обмен SAE.' },
      ],
      transform: 'y = √(x³+ax+b), выбор чётности',
      calc: [
        'x = {hnpX}',
        'y = √(x³ + a·x + b) = {hnpYRoot}',
        'LSB(save) = {hnpSaveLsb}, LSB(y) = {hnpYLsb} → взят {hnpYChoice}',
        '',
        'PWE.x = {pwex}',
        'PWE.y = {pwey}',
        '',
        'Точка доступа вывела PWE сама — совпадение: {chkPwe}',
      ],
    },
  ],
};
