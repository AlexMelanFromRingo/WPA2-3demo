/** Текст кроків модуля WPA3 SAE — українська версія. */
import type { SaeText } from './sae-text';

export const SAE_TEXT_UK: SaeText = {
  labels: {
    ssid: 'SSID (ім’я мережі)',
    passphrase: 'Пароль мережі',
    apMac: 'MAC точки доступу',
    clientMac: 'MAC клієнта',
    pwdSeed: 'pwd-seed',
    pt: 'PT — точка пароля (залежить від SSID)',
    pwe: 'PWE — елемент пароля',
    clCommit: 'Commit клієнта',
    apCommit: 'Commit точки доступу',
    clScalar: 'scalar клієнта',
    clElement: 'element клієнта',
    apScalar: 'scalar точки доступу',
    apElement: 'element точки доступу',
    sharedK: 'k — спільний секрет',
    keyseed: 'keyseed',
    saeKck: 'KCK (SAE, 32 байти)',
    pmk: 'PMK',
    pmkid: 'PMKID',
    clConfirm: 'Confirm клієнта',
    apConfirm: 'Confirm точки доступу',
    ptk: 'PTK',
    m1: 'Кадр M1',
    m2: 'Кадр M2',
    m3: 'Кадр M3',
    m4: 'Кадр M4',
    keyDataPlain: 'Key Data M3 (відкрито)',
    keyDataWrapped: 'Key Data M3 (зашифровано)',
  },
  methodLabel: { h2e: 'Hash-to-Element (H2E)', hnp: 'Hunting-and-Pecking (H&P)' },
  methodHint: {
    h2e: 'сучасний спосіб: без циклу, за сталий час; обов’язковий у діапазоні 6 ГГц',
    hnp: 'початковий спосіб 2012 року: цикл «пошуку та спроб»; дозволений, але потребує обережної реалізації',
  },
  hnp: {
    header: 'counter\tpwd-value < p\tx³+ax+b — квадрат\tпідсумок',
    yes: 'так',
    no: 'ні',
    found: '← ЗНАЙДЕНО: беремо цей x',
    masked: 'ітерації {from}–{to}: пароль підмінено випадковим рядком, результат не використовується',
  },
  droppedLabel: 'відкинуто',
  ok: '✓ збіглося',
  fail: '✗ не збіглося',
  passed: '✓ пройдено',
  rejected: '✗ відхилено',
  frameFields: {
    auth: 'Algorithm ‖ Seq ‖ Status',
    group: 'Group',
    scalar: 'Scalar',
    element: 'Element (x ‖ y)',
  },
  steps: [
    {
      title: 'Початкові дані та вибір способу',
      tooltip: 'Пароль, SSID і MAC-адреси. Спосіб виведення PWE перемикається кнопками вище.',
      description:
        'Навіщо: у WPA2 будь-хто, хто записав рукостискання, може вдома перебирати паролі. ' +
        'WPA3 закриває цю діру протоколом SAE. Що: SAE — це PAKE, «обмін ключами з ' +
        'перевіркою пароля»: сторони виробляють спільний секрет так, що кожна спроба ' +
        'вгадати пароль вимагає живої розмови з точкою доступу. Як: SAE виконується ДО ' +
        'асоціації, кадрами Authentication замість порожньої Open System Authentication ' +
        'у WPA2. Працюємо на групі 19 — еліптичній кривій NIST P-256. Угорі можна обрати, ' +
        'у який спосіб пароль перетворюється на точку кривої.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals — «одночасна автентифікація рівних» (IEEE 802.11-2020 §12.4). Заснований на протоколі Dragonfly (RFC 7664).' },
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — обмін ключами, у якому знання пароля доводиться, але сам пароль і все, за чим його можна перевірити, в ефір не потрапляє.' },
        { term: 'Рівні', definition: 'у SAE немає «сервера» й «клієнта» в криптографічному сенсі: обидві сторони виконують однакові кроки, і будь-яка може почати першою.' },
        { term: 'Еліптична крива', definition: 'множина точок (x, y), що задовольняють y² = x³ + a·x + b за модулем великого простого числа p. Точки можна додавати; помножити точку на число легко, а за результатом знайти це число — практично неможливо.' },
        { term: 'Група 19', definition: 'номер набору параметрів у SAE: крива NIST P-256 (256 бітів). Підтримувати її зобов’язані всі пристрої WPA3; бувають також групи 20 (P-384) і 21 (P-521).' },
      ],
      transform: 'Параметри навчальної мережі',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Пароль      "{passText}"  →  hex {passHex}',
        'MAC AP      {apMacColon}',
        'MAC клієнта {clientMacColon}',
        'Група       19 (NIST P-256)',
        'Спосіб PWE  {methodName}',
        '',
        'Крива P-256:  y² = x³ − 3·x + b  (mod p)',
        '  p = {curveP}',
        '  r = {curveR}   (кількість точок — «порядок групи»)',
      ],
    },
    {
      title: 'Крок 1 — Точка PT із SSID і пароля (H2E)',
      tooltip: 'HKDF перетворює пароль на два числа, SSWU — кожне на точку кривої.',
      description:
        'Навіщо: криптографія SAE працює з точками кривої, а не з рядками, тому пароль ' +
        'потрібно перетворити на точку — так, щоб за точкою пароль не відновлювався. Що: ' +
        'H2E (Hash-to-Element) спершу робить із SSID і пароля точку PT. Як: HKDF-Extract ' +
        'змішує пароль із SSID у 32-байтний pwd-seed; HKDF-Expand із двома різними ' +
        'мітками дає два 48-байтні числа u1 і u2; відображення SSWU з RFC 9380 перетворює ' +
        'кожне на точку кривої, і PT = P1 + P2. Жодних циклів і спроб — час обчислення не ' +
        'залежить від пароля. PT можна порахувати один раз і зберігати: він не залежить ' +
        'від MAC-адрес.',
      formula: 'pwd-seed = HKDF-Extract(SSID, пароль);  uᵢ = HKDF-Expand(pwd-seed, "SAE Hash to Element uᵢ Pᵢ", 48) mod p;  PT = SSWU(u1) + SSWU(u2)',
      terms: [
        { term: 'HKDF', definition: 'HMAC-based Key Derivation Function (RFC 5869). Extract «вичавлює» з входу рівномірний ключ (тут — HMAC-SHA256 з SSID у ролі солі), Expand розтягує його до потрібної довжини із заданою міткою.' },
        { term: 'SSWU', definition: 'simplified Shallue–van de Woestijne–Ulas — формула, яка будь-яке число u за фіксовану кількість операцій перетворює на точку кривої (RFC 9380 §6.6.2). Для P-256 параметр Z = −10.' },
        { term: 'Квадратичний лишок', definition: 'число, з якого за модулем p добувається квадратний корінь. Точка з координатою x існує, лише якщо x³ + a·x + b — квадратичний лишок.' },
        { term: 'mod p', definition: 'остача від ділення на p. Усі обчислення на кривій ідуть «по колу» в межах від 0 до p − 1.' },
        { term: 'Чому 48 байтів', definition: '48 байтів = 32 + 16: зайві 16 байтів роблять остачу від ділення на p практично рівномірною, без перекосу на користь малих чисел.' },
      ],
      transform: 'HKDF-SHA256 + SSWU (RFC 9380)',
      calc: [
        '1) pwd-seed = HKDF-Extract(сіль = SSID, вхід = пароль)',
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
        '3) SSWU(u1): gx1 — квадрат? {sswu1Square} → x = {sswu1Which}; знак y скориговано: {sswu1Neg}',
        '   P1 = ({p1x},',
        '         {p1y})',
        '   SSWU(u2): gx1 — квадрат? {sswu2Square} → x = {sswu2Which}; знак y скориговано: {sswu2Neg}',
        '   P2 = ({p2x},',
        '         {p2y})',
        '',
        '4) PT = P1 + P2 (додавання точок кривої)',
        '   PT.x = {ptx}',
        '   PT.y = {pty}',
      ],
    },
    {
      title: 'Крок 2 — PWE = val · PT (H2E)',
      tooltip: 'PT «прив’язують» до пари MAC-адрес: множать на число з MAC.',
      description:
        'Навіщо: елемент пароля має бути свій для кожної пари пристроїв — тоді результати ' +
        'одного обміну марні для іншого. Що: із двох MAC-адрес отримують число val і ' +
        'множать на нього точку PT. Як: val = HKDF-Extract(32 нульові байти, більший MAC ‖ ' +
        'менший MAC), зводиться в діапазон від 1 до r − 1, і PWE = val · PT. Обидві ' +
        'сторони отримують одну й ту саму точку PWE незалежно, нічого не пересилаючи.',
      formula: 'val = HKDF-Extract(0³², max(MAC) ‖ min(MAC)) mod (r − 1) + 1;  PWE = val · PT',
      terms: [
        { term: 'PWE', definition: 'Password Element — «елемент пароля», точка кривої, на якій будується весь обмін SAE. Відома лише тим, хто знає пароль.' },
        { term: 'Множення точки на число', definition: 'додавання точки до самої себе багато разів (val · PT = PT + PT + … + PT). Виконується швидко, а обернена задача — дізнатися val за результатом — «задача дискретного логарифма», практично нерозв’язна.' },
        { term: 'max / min MAC', definition: 'більша й менша з двох MAC-адрес: порядок фіксований, тому обидві сторони отримують однакове val.' },
      ],
      transform: 'HKDF-Extract(MAC) і множення точки',
      calc: [
        'max(MAC) ‖ min(MAC) = {macMaxMin}',
        'HKDF-Extract(0³², max ‖ min) = HMAC-SHA256(32 нульові байти, max ‖ min)',
        '  = {valHash}',
        'val = це число mod (r − 1) + 1 = {val}',
        '',
        'PWE = val · PT',
        '  PWE.x = {pwex}',
        '  PWE.y = {pwey}',
        '',
        'Точка доступу вивела PWE сама — збіг: {chkPwe}',
      ],
    },
    {
      title: 'Крок 3 — Commit клієнта',
      tooltip: 'Клієнт ховає PWE за двома випадковими числами й надсилає scalar і element.',
      description:
        'Навіщо: кожна сторона має внести в спільний секрет свою випадковість, не ' +
        'розкриваючи PWE. Що: клієнт обирає два секретні випадкові числа rand і mask від 2 ' +
        'до r − 1 і надсилає кадр Commit із двома публічними значеннями. Як: scalar = ' +
        '(rand + mask) mod r — просто число; element = −(mask · PWE) — точка кривої. За ' +
        'ними не можна дізнатися ні rand, ні mask, ні PWE: mask «маскує» точку пароля. ' +
        'rand і mask одноразові — у наступному підключенні будуть нові (тому й ключі ' +
        'будуть нові).',
      formula: 'scalar = (rand + mask) mod r;  element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'перше повідомлення SAE (кадр Authentication, Transaction Sequence = 1): «ось мої зобов’язання». Algorithm = 3 означає SAE.' },
        { term: 'rand, mask', definition: 'секретні одноразові випадкові числа. rand потрібен для спільного секрету, mask — щоб сховати PWE. Ніколи не передаються.' },
        { term: 'Status 126', definition: 'код статусу SAE_HASH_TO_ELEMENT: так сторона повідомляє, що використовує H2E. За H&P статус 0.' },
        { term: 'Обернена точка (−P)', definition: 'точка (x, p − y) — «дзеркальна» відносно осі x. P + (−P) = «нуль» кривої.' },
      ],
      transform: 'scalar = rand + mask, element = −mask·PWE',
      calc: [
        'Секрети клієнта (в ефір не йдуть):',
        '  rand = {clRand}',
        '  mask = {clMask}',
        '',
        'scalar  = (rand + mask) mod r = {clScalar}',
        'element = −(mask · PWE)',
        '  x = {clElemX}',
        '  y = {clElemY}',
        '',
        'Кадр Authentication — Commit ({clCommitLen} байтів):',
        '  Algorithm\t0300\t3 = SAE',
        '  Transaction Seq\t{seq1}\t1 = Commit',
        '  Status\t{statusHex}\t{statusDec}',
        '  Group\t1300\t19 = NIST P-256',
        '  Scalar\t{clScalar}',
        '  Element\t{clElemX}',
        '  \t{clElemY}',
      ],
      byteCaption:
        'Тіло кадру Commit: службові поля (алгоритм, номер повідомлення, статус), номер ' +
        'групи, scalar (32 байти) і element (64 байти — координати x та y).',
      packetLabel: 'Commit (scalar, element)',
    },
    {
      title: 'Крок 4 — Commit точки доступу',
      tooltip: 'Точка доступу робить те саме зі своїми випадковими числами.',
      description:
        'Сторони рівні: точка доступу виконує ті самі дії — свої rand і mask, свої scalar ' +
        'і element — і надсилає свій Commit. Порядок не важливий: у справжніх мережах ' +
        'Commit зазвичай починає клієнт, але стандарт допускає й одночасне надсилання. ' +
        'Якщо точка доступу перевантажена, замість Commit вона може відповісти статусом ' +
        '76 і «жетоном» anti-clogging: клієнт зобов’язаний повторити Commit із жетоном. ' +
        'Так відсіюються флуд-атаки з підроблених MAC-адрес — обчислення SAE дорогі.',
      formula: 'scalar_AP = (rand_AP + mask_AP) mod r;  element_AP = −(mask_AP · PWE)',
      terms: [
        { term: 'Anti-clogging token', definition: '«жетон від засмічення» (status 76): коротке значення, яке точка доступу видає у відповідь на Commit під навантаженням. Доводить, що клієнт справді отримує кадри на свій MAC.' },
        { term: 'Status 77', definition: 'UNSUPPORTED_FINITE_CYCLIC_GROUP — «ця група не підтримується»: клієнт повторює Commit з іншою групою.' },
      ],
      transform: 'Свої rand, mask → scalar, element',
      calc: [
        'Секрети точки доступу:',
        '  rand = {apRand}',
        '  mask = {apMask}',
        '',
        'scalar  = {apScalar}',
        'element.x = {apElemX}',
        'element.y = {apElemY}',
        '',
        'Кадр Commit точки доступу — {apCommitLen} байтів, та сама структура.',
      ],
      byteCaption: 'Тіло кадру Commit точки доступу — та сама структура, інші значення.',
      packetLabel: 'Commit (scalar, element)',
    },
    {
      title: 'Крок 5 — Перевірка Commit і спільний секрет k',
      tooltip: 'Кожна сторона перевіряє чужий Commit і обчислює одну й ту саму точку K.',
      description:
        'Навіщо: потрібно отримати спільний секрет, відомий лише тим, хто знає PWE. Що: ' +
        'спершу кожна сторона перевіряє чужий Commit: scalar має бути більшим за 1 і ' +
        'меншим за r, element — справжньою точкою кривої, а сам Commit не повинен ' +
        'збігатися з власним (інакше це атака «відбиттям»). Як: потім K = rand · ' +
        '(scalar_чужий · PWE + element_чужий), і k — x-координата K. Чому результати ' +
        'збігаються: mask однієї сторони в сумі взаємно знищується з −mask, і в обох ' +
        'лишається rand_клієнта · rand_AP · PWE.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element);  k = x(K)',
      terms: [
        { term: 'Атака відбиттям', definition: 'зловмисник «відбиває» ваш же Commit назад. Перевірка на збіг із власним Commit її блокує.' },
        { term: 'Перевірка точки', definition: 'координати менші за p, і рівняння кривої виконується. Без неї зловмисник підсунув би «точку» поза кривою й вивідав би секрет (invalid-curve attack).' },
        { term: 'Чому k однаковий', definition: 'rand_A·(s_B·PWE − mask_B·PWE) = rand_A·rand_B·PWE, і в другої сторони — той самий добуток у зворотному порядку.' },
      ],
      transform: 'Перевірка + K = rand·(s·PWE + E)',
      calc: [
        'Клієнт перевіряє Commit точки доступу:',
        '  1 < scalar < r: {chkClScalar};  element на кривій: {chkClElement};  не відбиття: {chkClReflect}',
        'Точка доступу перевіряє Commit клієнта:',
        '  1 < scalar < r: {chkApScalar};  element на кривій: {chkApElement};  не відбиття: {chkApReflect}',
        '',
        'У клієнта: K = rand_клієнта · (scalar_AP · PWE + element_AP)',
        '  k = x(K) = {clK}',
        'У точки доступу: K = rand_AP · (scalar_клієнта · PWE + element_клієнта)',
        '  k = x(K) = {apK}',
        '',
        'k збігся: {chkK}',
      ],
    },
    {
      title: 'Крок 6 — KCK, PMK і PMKID',
      tooltip: 'З k виводяться ключ підтвердження KCK і майстер-ключ PMK.',
      description:
        'Навіщо: сирий спільний секрет k не використовують напряму — з нього виводять ' +
        'ключі під конкретні завдання. Що: KCK потрібен, щоб підтвердити обмін у Confirm, ' +
        'PMK — майстер-ключ для подальшого 4-Way Handshake. Як: keyseed = ' +
        'HMAC-SHA256(32 нульові байти, k); потім KDF стандарту 802.11 з міткою "SAE KCK and ' +
        'PMK" і контекстом (scalar_клієнта + scalar_AP) mod r видає 64 байти: перші 32 — ' +
        'KCK, наступні 32 — PMK. PMKID — перші 16 байтів контексту. Важливо: PMKID ' +
        'залежить лише від публічних scalar, а не від пароля, тому PMKID-атака проти WPA3 ' +
        'марна.',
      formula: 'keyseed = HMAC-SHA256(0³², k);  KCK ‖ PMK = KDF-512(keyseed, "SAE KCK and PMK", (s_клієнта + s_AP) mod r)',
      terms: [
        { term: 'KDF', definition: 'Key Derivation Function IEEE 802.11 (§12.7.1.6.2): HMAC-SHA256(ключ, i ‖ мітка ‖ контекст ‖ довжина), де i — номер блоку (1, 2, …), i та довжина — 2 байти little-endian.' },
        { term: 'Little-endian', definition: 'порядок байтів «молодший першим»: число 512 = 0x0200 записується як 00 02.' },
        { term: 'Forward secrecy', definition: '«пряма секретність»: PMK залежить від одноразових rand, тому навіть якщо пароль пізніше витече, раніше записаний трафік не розшифрувати. У WPA2-PSK цієї властивості немає.' },
      ],
      transform: 'HMAC-SHA256 + KDF-512',
      calc: [
        'keyseed = HMAC-SHA256(ключ = 00 × 32, k) = {keyseed}',
        'контекст = (scalar_клієнта + scalar_AP) mod r = {context}',
        '',
        'KDF-512: 2 блоки HMAC-SHA256(keyseed, i ‖ "SAE KCK and PMK" ‖ контекст ‖ 0002)',
        '  блок 1 (i = 0100) ‖ блок 2 (i = 0200) = {kdfOut}',
        '',
        'KCK   = байти 0..31  = {saeKck}',
        'PMK   = байти 32..63 = {pmk}',
        'PMKID = перші 16 байтів контексту = {pmkid}',
        '',
        'У точки доступу ті самі значення — PMK збігся: {chkPmk}',
      ],
      byteCaption: 'Вихід KDF-512 — 64 байти: зелені (0–31) — KCK, блакитні (32–63) — PMK.',
    },
    {
      title: 'Крок 7 — Confirm клієнта',
      tooltip: 'Клієнт доводить, що вивів той самий KCK, — HMAC від усіх значень обміну.',
      description:
        'Навіщо: поки що ніхто не довів, що в другої сторони той самий пароль — збіг k ' +
        'перевірити напряму не можна, k не передається. Що: клієнт надсилає Confirm — ' +
        'HMAC ключем KCK від лічильника send-confirm і всіх чотирьох публічних значень ' +
        'обміну. Як: порядок — спершу свої scalar і element, потім чужі. Підробити Confirm ' +
        'без KCK неможливо, а KCK виходить лише за правильного пароля. Якщо пароль ' +
        'неправильний, Confirm не зійдеться — і в зловмисника ця спроба згорить: наступний ' +
        'здогад можна перевірити лише новим живим обміном.',
      formula: 'confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer_scalar ‖ peer_element)',
      terms: [
        { term: 'Confirm', definition: 'друге повідомлення SAE (Transaction Sequence = 2): «доведу, що в мене той самий ключ».' },
        { term: 'send-confirm', definition: '2-байтний лічильник надісланих Confirm (little-endian); у першого — 1. Захищає від повторів.' },
        { term: 'Онлайн-атака', definition: 'перевірка здогаду пароля «наживо» — зі справжньою точкою доступу. Повільно, помітно, обмежується; це єдиний шлях проти SAE.' },
      ],
      transform: 'HMAC-SHA256(KCK, …)',
      calc: [
        'send-confirm = 0100 (= 1)',
        'confirm = HMAC-SHA256(KCK, 0100 ‖ scalar_клієнта ‖ element_клієнта ‖ scalar_AP ‖ element_AP)',
        '        = {clConfirm}',
        '',
        'Кадр Authentication — Confirm ({clConfirmLen} байтів):',
        '  Algorithm\t0300\t3 = SAE',
        '  Transaction Seq\t0200\t2 = Confirm',
        '  Status\t0000\t0 = успіх',
        '  Send-Confirm\t0100\t1',
        '  Confirm\t{clConfirm}',
      ],
      packetLabel: 'Confirm',
    },
    {
      title: 'Крок 8 — Confirm точки доступу та взаємна перевірка',
      tooltip: 'Обидві сторони перераховують чужий Confirm — SAE завершено.',
      description:
        'Точка доступу перераховує Confirm клієнта своїм KCK (у порядку «чужі значення, ' +
        'потім свої») і порівнює. Збіглося — клієнт знає пароль. Потім вона надсилає свій ' +
        'Confirm, а клієнт перевіряє його так само. Після цього сторони перебувають у ' +
        'стані «Accepted»: в обох однаковий PMK, і він жодного разу не передавався. Далі — ' +
        'звичайна асоціація та 4-Way Handshake, але вже на свіжому PMK із SAE.',
      formula: 'verifier = HMAC-SHA256(KCK, peer_send-confirm ‖ peer_scalar ‖ peer_element ‖ scalar ‖ element)',
      terms: [
        { term: 'Verifier', definition: 'значення, яке отримувач обчислює сам і порівнює з надісланим Confirm.' },
        { term: 'Accepted', definition: 'кінцевий стан SAE: обмін підтверджено обома сторонами, PMK можна використовувати.' },
      ],
      transform: 'Перерахунок чужого Confirm',
      calc: [
        'Confirm точки доступу = {apConfirm}',
        '',
        'AP перевіряє Confirm клієнта:     {chkApConfirm}',
        'Клієнт перевіряє Confirm AP:      {chkClConfirm}',
        '',
        'Підсумок SAE: спільний PMK = {pmk}',
      ],
      packetLabel: 'Confirm',
    },
    {
      title: 'Крок 9 — Асоціація, M1 і PTK (KDF-SHA-256)',
      tooltip: 'Для AKM SAE ключ PTK виводиться через KDF на SHA-256, а не через PRF на SHA-1.',
      description:
        'Навіщо: PMK із SAE — це аналог PMK з пароля у WPA2; ключі сеансу виводяться тим ' +
        'самим 4-Way Handshake. Що: клієнт асоціюється, оголошуючи в RSNE AKM 00-0F-AC:8 ' +
        '(SAE) і прапорці MFPR і MFPC — захист службових кадрів PMF обов’язковий. Точка ' +
        'доступу шле M1 з ANonce і PMKID із SAE. Як: відмінність від WPA2 — для AKM 8 PTK ' +
        'виводить KDF на HMAC-SHA256 (два блоки по 32 байти, довжина 384 біти входить у ' +
        'кожен блок), а не PRF на SHA-1. Блок B збирається так само.',
      formula: 'PTK = KDF-SHA-256-384(PMK, "Pairwise key expansion", min/max(AA,SPA) ‖ min/max(ANonce,SNonce))',
      terms: [
        { term: 'AKM 8', definition: 'набір 00-0F-AC:8 — «SAE із SHA-256». Визначає, як виводиться PTK (KDF-SHA-256) і обчислюється MIC (AES-128-CMAC).' },
        { term: 'PMF', definition: 'Protected Management Frames (802.11w): службові кадри відключення (deauth/disassoc) теж підписуються. У WPA3 це обов’язково — тому MFPR = MFPC = 1.' },
        { term: 'RSNXE', definition: 'RSN Extension Element: тут у ньому прапорець «SAE H2E». Він повторюється в M2 і M3 всередині підписаних кадрів, щоб посередник не міг непомітно нав’язати старий H&P.' },
      ],
      transform: 'KDF-SHA-256-384',
      calc: [
        'RSNE клієнта/AP: {rsne}',
        '  … 00-0f-ac 08 = AKM SAE, RSN Capabilities = c000 (MFPR | MFPC)',
        'RSNXE: {rsnxe}',
        '',
        'M1: ANonce = {aNonce}, Key Information = {m1Info} (версія дескриптора 0 — «визначається AKM»)',
        '    Key Data = PMKID KDE з PMKID із SAE: {m1Kd}',
        '',
        'B = {b}',
        'KDF: блок i = HMAC-SHA256(PMK, i ‖ "Pairwise key expansion" ‖ B ‖ 8001)',
        '  (8001 = 384 у little-endian)',
        '  блоки 1 і 2 = {ptkRaw}',
        'PTK = перші 48 байтів = {ptk}',
        '  KCK = {kck}   KEK = {kek}   TK = {tk}',
      ],
      byteCaption: 'Два блоки HMAC-SHA256 — 64 байти: зелені (0–47) — PTK, сірі (48–63) — відкидаються.',
      packetLabel: 'M1 — ANonce + PMKID',
    },
    {
      title: 'Крок 10 — M2 з MIC на AES-128-CMAC',
      tooltip: 'Для AKM SAE MIC обчислюється не HMAC-SHA1, а AES-128-CMAC.',
      description:
        'Клієнт відповідає M2: SNonce, RSNE і RSNXE (якщо H2E) та MIC. Відмінність від ' +
        'WPA2 — функція MIC: для AKM 8 це AES-128-CMAC ключем KCK від кадру з обнуленим ' +
        'MIC. Її вихід — рівно 16 байтів, усікати нічого не потрібно. Точка доступу ' +
        'виводить той самий PTK і перераховує MIC: збіг підтверджує, що ключі сеансу ' +
        'однакові.',
      formula: 'MIC = AES-128-CMAC(KCK, кадр M2 з обнуленим MIC)',
      terms: [
        { term: 'AES-128-CMAC', definition: 'код автентичності повідомлення на блоковому шифрі AES (RFC 4493): AES-CBC за всіма блоками кадру з особливим ключем-поправкою для останнього блоку. Дає 16 байтів.' },
        { term: 'Key Descriptor Version 0', definition: 'значення «версія визначається AKM»: алгоритми MIC і шифрування Key Data задає сам AKM (для SAE — AES-128-CMAC і AES Key Wrap).' },
      ],
      transform: 'AES-128-CMAC(KCK, кадр)',
      calc: [
        'Кадр M2 ({m2Size} байтів): Key Information = {m2Info} (MIC | Pairwise | версія 0)',
        '  Key Nonce = SNonce = {sNonce}',
        '  Key Data ({m2KdLenDec} байтів) = {m2Kd}',
        '',
        'MIC = AES-128-CMAC(KCK = {kck}, M2 з нулями) = {m2Mic}',
        'Точка доступу перерахувала MIC: {chkM2}',
      ],
      byteCaption: 'Кадр M2 побайтно: зеленим — SNonce, блакитним — MIC, жовтим — Key Data з RSNE.',
      packetLabel: 'M2 — SNonce + MIC (CMAC)',
    },
    {
      title: 'Крок 11 — M3 з GTK та IGTK, M4 і встановлення ключів',
      tooltip: 'У M3 точка доступу передає GTK та IGTK (ключ PMF), зашифровані KEK.',
      description:
        'M3 влаштований як у WPA2, але в Key Data додатково лежить IGTK KDE — ключ, яким ' +
        'підписуються широкомовні службові кадри (PMF). Key Data доповнюється до ' +
        'кратного 8 і шифрується AES Key Wrap ключем KEK, кадр підписується AES-128-CMAC. ' +
        'Клієнт перевіряє MIC, розшифровує GTK та IGTK, відповідає M4, і обидві сторони ' +
        'встановлюють ключі. Відтепер захищено і трафік, і службові кадри: підроблений ' +
        '«deauth» більше не відключить клієнта.',
      formula: 'Key Data = AES-KeyWrap(KEK, RSNE ‖ RSNXE ‖ GTK KDE ‖ IGTK KDE ‖ доповнення)',
      terms: [
        { term: 'IGTK', definition: 'Integrity Group Temporal Key — груповий ключ цілісності для PMF. Широкомовні службові кадри підписуються алгоритмом BIP-CMAC-128.' },
        { term: 'IGTK KDE', definition: 'dd 1c 00-0F-AC 09 ‖ KeyID (2 байти) ‖ IPN (6 байтів, лічильник пакетів) ‖ IGTK (16 байтів) — 30 байтів.' },
        { term: 'Deauth-атака', definition: 'розсилання підроблених кадрів «відключись». Без PMF вони не підписані й працюють; із PMF клієнт їх відкидає.' },
      ],
      transform: 'AES Key Wrap + AES-128-CMAC',
      calc: [
        'Відкритий Key Data ({m3PlainLen} байтів) → доповнення до {m3PaddedLen}:',
        '  RSNE [‖ RSNXE]    = {rsneRsnxe}',
        '  GTK KDE           = {gtkKde}',
        '  IGTK KDE          = {igtkKde}',
        '  доповнення        = {padding}',
        'AES-KeyWrap(KEK) → {m3KdLenDec} байтів: {m3Kd}',
        '',
        'M3: Key Information = {m3Info}, MIC (CMAC) = {m3Mic}',
        '    клієнт перевірив MIC: {chkM3}; дістав GTK: {chkUnwrap}; RSNE збігся: {chkRsneClient}',
        'M4: Key Information = {m4Info}, MIC (CMAC) = {m4Mic}',
        '    точка доступу перевірила MIC: {chkM4}',
        '',
        'Встановлено: TK = {tk}, GTK = {gtk}, IGTK = {igtk}',
      ],
      byteCaption:
        'Відкритий Key Data M3 до шифрування: RSNE, RSNXE, GTK KDE, IGTK KDE і доповнення.',
      packetLabel: 'M3 — GTK + IGTK (зашифр.)',
    },
    {
      title: 'Крок 12 — Що бачить перехоплювач і чому офлайн-перебір не працює',
      tooltip: 'В ефірі лише scalar, element, Confirm і кадри EAPOL — пароль за ними не перевірити.',
      description:
        'Підсумуймо очима зловмисника, який записав увесь обмін. Він бачить scalar і ' +
        'element обох сторін, обидва Confirm, кадри M1–M4. Щоб перевірити здогад пароля ' +
        'офлайн, йому потрібно обчислити k — а для цього потрібен секретний rand хоча б ' +
        'однієї сторони; за scalar і element він не обчислюється (це задача дискретного ' +
        'логарифма). Без k немає KCK і PMK — нічого порівнювати з Confirm і MIC. PMKID не ' +
        'залежить від пароля. Лишається тільки онлайн-перебір: кожен здогад — це новий ' +
        'живий обмін із точкою доступу, який можна обмежити й помітити.',
      terms: [
        { term: 'Задача дискретного логарифма', definition: 'за точками G і n·G знайти число n. На кривій P-256 найкращі відомі алгоритми потребують близько 2¹²⁸ операцій — недосяжно.' },
        { term: 'Офлайн-перебір', definition: 'перевірка мільярдів паролів «удома» за записаними даними, без зв’язку з мережею. Проти WPA2 працює (Модуль 3), проти SAE — ні.' },
        { term: 'Dragonblood', definition: 'атаки 2019 року на ранні реалізації SAE: витоки через час виконання й кеш у циклі H&P, даунгрейд у змішаному режимі. Відповідь стандарту — H2E, сталий час, Transition Disable.' },
      ],
      transform: 'Аналіз перехоплених даних',
      calc: [
        'Видно в ефірі:',
        '  scalar клієнта  {clScalar}',
        '  scalar AP       {apScalar}',
        '  element-и, обидва Confirm, ANonce, SNonce, MIC у M2–M4, PMKID {pmkid}',
        '',
        'Не видно ніколи: пароль, PWE, rand, mask, k, KCK, PMK, PTK.',
        '',
        'Перевірка здогаду «пароль = X» офлайн:',
        '  PWE(X) обчислити можна → але k = rand · (…) — rand невідомий',
        '  → KCK(X) не отримати → Confirm нема з чим порівняти.',
        'PMKID = (scalar_клієнта + scalar_AP) mod r → від пароля не залежить.',
      ],
    },
  ],
  hnpSteps: [
    {
      title: 'Крок 1 — Пошук x перебором (H&P)',
      tooltip: 'Цикл «полювання та клювання»: хешуємо пароль із лічильником, доки x не ляже на криву.',
      description:
        'Навіщо: пароль потрібно перетворити на точку кривої. Що: початковий спосіб SAE — ' +
        'Hunting and Pecking, «полювання та клювання». Як: для counter = 1, 2, … ' +
        'обчислюють pwd-seed = HMAC-SHA256(більший MAC ‖ менший MAC, пароль ‖ counter), з ' +
        'нього KDF дає кандидата pwd-value. Він придатний як x, якщо він менший за p і ' +
        'x³ + a·x + b — квадратичний лишок. Важливо: цикл не зупиняється на знахідці — він ' +
        'триває щонайменше k ітерацій (стандарт задає k не менше 40, hostapd використовує ' +
        '40), а після знахідки пароль підміняється випадковим рядком. Інакше за часом ' +
        'роботи можна дізнатися номер вдалої ітерації — а це вже витік інформації про ' +
        'пароль (атаки Dragonblood).',
      formula: 'pwd-seed = HMAC-SHA256(max(MAC) ‖ min(MAC), пароль ‖ counter);  pwd-value = KDF-256(pwd-seed, "SAE Hunting and Pecking", p)',
      terms: [
        { term: 'Hunting and Pecking', definition: '«полювання та клювання» — перебір кандидатів, доки черговий не підійде. Приблизно половина чисел дає точку кривої, тому зазвичай вистачає 1–2 спроб.' },
        { term: 'k', definition: 'мінімальна кількість ітерацій циклу (тут 40). За ймовірності успіху близько ½ на ітерацію шанс не знайти точку за 40 спроб — приблизно 2⁻⁴⁰.' },
        { term: 'Таймінг-атака', definition: 'здобуття секретів за часом роботи. Якщо цикл зупиняється одразу після знахідки, час видає номер ітерації, а він залежить від пароля.' },
        { term: 'counter', definition: '1-байтний лічильник, дописаний до пароля; кожна ітерація дає нового кандидата.' },
      ],
      transform: 'HMAC-SHA256 + KDF-256, ≥ 40 ітерацій',
      calc: [
        'Ключ HMAC = max(MAC) ‖ min(MAC) = {macMaxMin}',
        '',
        '{hnpTable}',
        '',
        'Ітерацій виконано: {hnpTotal} (мінімум 40), x знайдено на counter = {hnpFound}',
        'pwd-seed вдалої ітерації (save) = {hnpSave}',
        'x = {hnpX}',
      ],
    },
    {
      title: 'Крок 2 — Вибір y і точка PWE (H&P)',
      tooltip: 'З x обчислюють y; який із двох коренів узяти, вирішує молодший біт pwd-seed.',
      description:
        'У знайденого x на кривій дві точки — (x, y) і (x, p − y), «верхня» й «нижня». ' +
        'Що: потрібно, щоб обидві сторони обрали одну й ту саму. Як: y = √(x³ + a·x + b) ' +
        'mod p; якщо молодший біт y збігається з молодшим бітом збереженого pwd-seed, ' +
        'беруть (x, y), інакше (x, p − y). Отримана точка і є PWE. Обидві сторони ' +
        'отримують її незалежно — вхід однаковий: пароль і пара MAC-адрес.',
      formula: 'y = √(x³ + ax + b);  PWE = (x, y), якщо LSB(y) = LSB(save), інакше (x, p − y)',
      terms: [
        { term: 'Квадратний корінь mod p', definition: 'для P-256 p ≡ 3 (mod 4), тому √v = v^((p+1)/4) mod p — одна операція піднесення до степеня.' },
        { term: 'LSB', definition: 'Least Significant Bit — молодший біт числа: 0 у парних, 1 у непарних.' },
        { term: 'PWE', definition: 'Password Element — «елемент пароля», точка кривої, на якій будується весь обмін SAE.' },
      ],
      transform: 'y = √(x³+ax+b), вибір парності',
      calc: [
        'x = {hnpX}',
        'y = √(x³ + a·x + b) = {hnpYRoot}',
        'LSB(save) = {hnpSaveLsb}, LSB(y) = {hnpYLsb} → узято {hnpYChoice}',
        '',
        'PWE.x = {pwex}',
        'PWE.y = {pwey}',
        '',
        'Точка доступу вивела PWE сама — збіг: {chkPwe}',
      ],
    },
  ],
};
