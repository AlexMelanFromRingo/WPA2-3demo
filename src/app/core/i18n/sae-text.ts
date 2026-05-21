/** Текст шагов модуля WPA3 SAE на трёх языках. */
import type { Lang } from './ui-text';
import type { StepText } from './step-text';

export interface SaeText {
  labels: {
    ssid: string;
    passphrase: string;
    apMac: string;
    clientMac: string;
    pwe: string;
    apScalar: string;
    apElement: string;
    clScalar: string;
    clElement: string;
    sharedK: string;
  };
  /** Строки итога схождения для блока «Вычисление» шага 4. */
  convergedYes: string;
  convergedNo: string;
  steps: StepText[];
}

const RU: SaeText = {
  labels: {
    ssid: 'SSID (имя сети)',
    passphrase: 'Пароль сети',
    apMac: 'MAC точки доступа',
    clientMac: 'MAC клиента',
    pwe: 'PWE — точка пароля на P-256',
    apScalar: 'commit-scalar точки доступа',
    apElement: 'commit-element точки доступа',
    clScalar: 'commit-scalar клиента',
    clElement: 'commit-element клиента',
    sharedK: 'Общий секрет K (X-координата)',
  },
  convergedYes: '✓ Стороны сошлись к одному K — пароль совпал.',
  convergedNo: '✗ Стороны не сошлись.',
  steps: [
    {
      title: 'Исходные данные',
      tooltip: 'Параметры сети. Случайные nonce, как в WPA2, здесь не нужны.',
      description:
        'Для SAE нужны пароль, имя сети и MAC-адреса обеих сторон. Случайные числа nonce, ' +
        'которыми обменивались в WPA2, здесь не передаются — секретность обеспечивается ' +
        'математикой эллиптической кривой.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals — способ входа в Wi-Fi по паролю в WPA3, заменяющий рукопожатие WPA2.' },
        { term: 'WPA3', definition: 'третье поколение защиты Wi-Fi (Wi-Fi Alliance, 2018). Главное улучшение для домашних сетей — протокол SAE.' },
        { term: 'Эллиптическая кривая', definition: 'математическое множество точек, на котором умножать точки легко, а «делить» обратно — практически невозможно.' },
        { term: 'P-256', definition: 'конкретная стандартная эллиптическая кривая (NIST P-256), на которой работает этот модуль.' },
      ],
      transform: 'Параметры учебной сети',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Пароль      "{passText}"  →  hex {passHex}',
        'MAC AP      {apMacColon}',
        'MAC клиента {clientMacColon}',
      ],
    },
    {
      title: 'Шаг 1 — Вывод PWE (пароль → точка кривой)',
      tooltip: 'Пароль превращается в точку на эллиптической кривой P-256.',
      description:
        'SAE начинается с превращения пароля в PWE — точку на эллиптической кривой P-256. ' +
        'Метод — hash-to-curve по стандарту RFC 9380 (отображение SSWU), тот же примитив, ' +
        'что в WPA3 SAE-H2E. Операция односторонняя: имея только точку, восстановить пароль ' +
        'невозможно.',
      formula: 'PWE = hash_to_curve(пароль, SSID, MAC-адреса)  — RFC 9380, кривая P-256',
      terms: [
        { term: 'PWE', definition: 'Password Element — «элемент пароля». Точка на кривой P-256, в которую превращается пароль.' },
        { term: 'Точка кривой', definition: 'пара координат (x, y), удовлетворяющая уравнению кривой.' },
        { term: 'hash-to-curve', definition: '«хеширование в кривую» — приём, превращающий произвольные данные в точку кривой строго и предсказуемо.' },
        { term: 'SSWU', definition: 'Simplified SWU — способ отобразить число в точку кривой за постоянное время (без догадок и переборов).' },
        { term: 'Односторонняя функция', definition: 'легко вычислить вперёд (пароль → точка), но практически невозможно обратить.' },
        { term: 'RFC 9380', definition: 'официальный стандарт IETF «Hashing to Elliptic Curves» (2023). На нём построен SAE-H2E.' },
      ],
      transform: 'hash-to-curve на P-256 (SSWU)',
      calc: [
        'ВХОД:',
        '  пароль = {passHex}',
        '  SSID   = {ssidHex}',
        '',
        'ОПЕРАЦИЯ:',
        '  hash-to-curve SSWU на кривой P-256 (RFC 9380)',
        '',
        'РЕЗУЛЬТАТ — точка PWE, её X-координата:',
        '  PWE.x = {pwe}',
      ],
    },
    {
      title: 'Шаг 2 — Commit точки доступа',
      tooltip: 'Точка доступа выбирает два секрета и шлёт пару (scalar, element).',
      description:
        'Точка доступа выбирает два секретных случайных числа — rand и mask — и формирует ' +
        'пару: commit-scalar (сумма rand и mask) и commit-element (точка −mask·PWE). В эфир ' +
        'уходит только эта пара; пароль и секреты наружу не попадают.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'фаза «обязательства»: сторона раскрывает пару чисел, «привязываясь» к секрету, но не выдавая его.' },
        { term: 'scalar (скаляр)', definition: 'обычное целое число (в отличие от точки кривой). commit-scalar = сумма двух секретов по модулю n.' },
        { term: 'element (элемент)', definition: 'точка кривой, передаваемая в фазе Commit. Вычисляется из секрета mask и точки PWE.' },
        { term: 'rand, mask', definition: 'два секретных случайных числа, которые сторона выбирает сама и никому не показывает.' },
        { term: 'mod n', definition: '«остаток от деления на n» (n — порядок группы кривой). Удерживает результат в допустимом диапазоне.' },
        { term: 'Дискретный логарифм', definition: 'задача «по точке k·PWE найти k». На эллиптической кривой неразрешима — на этом держится защита.' },
      ],
      transform: 'Выбор rand, mask → commit',
      calc: [
        'Точка доступа выбирает секреты rand и mask, считает пару:',
        '',
        '  commit-scalar  = {apScalar}',
        '  commit-element = {apElement}',
        '',
        'Именно эта пара уходит в эфир (M-Commit).',
      ],
      packetLabel: 'Commit — (scalar, element)',
    },
    {
      title: 'Шаг 3 — Commit клиента',
      tooltip: 'Клиент симметрично шлёт свою пару (scalar, element).',
      description:
        'Клиент выполняет тот же шаг: выбирает свои секретные rand и mask и отправляет свою ' +
        'пару (scalar, element). В этом смысл названия «равных» — обе стороны делают ' +
        'симметричные действия.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: '«Равных» (of Equals)', definition: 'в SAE обе стороны выполняют одинаковые шаги; нет «сервера» и «клиента» в смысле разных ролей.' },
        { term: 'Симметричный обмен', definition: 'обе стороны отправляют сообщения одного вида; ни одна не зависит от того, кто начал.' },
      ],
      transform: 'Выбор rand, mask → commit',
      calc: [
        'Клиент выбирает свои секреты rand и mask, считает пару:',
        '',
        '  commit-scalar  = {clScalar}',
        '  commit-element = {clElement}',
        '',
        'Пара уходит в эфир навстречу паре точки доступа.',
      ],
      packetLabel: 'Commit — (scalar, element)',
    },
    {
      title: 'Шаг 4 — Общий секрет K',
      tooltip: 'Обе стороны независимо вычисляют ОДИН и тот же секрет K.',
      description:
        'Получив чужую пару, каждая сторона комбинирует её со своим секретом rand и ' +
        'вычисляет общий секрет K. Математика устроена так, что у точки доступа и у клиента ' +
        'K выходит ОДИНАКОВЫМ — хотя секреты разные, и по эфиру K не передавался.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element)',
      terms: [
        { term: 'Общий секрет K', definition: 'точка кривой, которую обе стороны вычисляют независимо и получают одинаковой. В эфир не передаётся.' },
        { term: 'Скалярное умножение', definition: 'умножение точки кривой на число: k·P — сложить точку P саму с собой k раз.' },
        { term: 'peer (пир)', definition: '«партнёр по обмену» — другая сторона. peer_scalar и peer_element — присланная партнёром пара.' },
        { term: 'Сходимость', definition: 'свойство, что K у обеих сторон совпал. Именно оно доказывает знание общего пароля.' },
      ],
      transform: 'Скалярное умножение на P-256',
      calc: [
        'Точка доступа:  K = rand_AP · (scalar_клиента · PWE + element_клиента)',
        'Клиент:         K = rand_кл · (scalar_AP · PWE + element_AP)',
        '',
        'РЕЗУЛЬТАТ — X-координата K (одинакова у обеих сторон):',
        '  K.x = {sharedK}',
        '',
        '{verdict}',
      ],
    },
    {
      title: 'Шаг 5 — Вывод PMK',
      tooltip: 'Из общего секрета K выводится PMK.',
      description:
        'Из общего секрета K функция формирования ключа на HMAC-SHA256 выводит PMK — ' +
        'мастер-ключ той же роли, что и PMK в WPA2. Самое важное уже произошло: пароль ' +
        'подтверждён, а в эфире не осталось данных для офлайн-перебора.',
      formula: 'PMK = KDF-HMAC-SHA256(K, "SAE KCK and PMK")',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — мастер-ключ сети. В WPA3 он получается из секрета K, а не из PBKDF2.' },
        { term: 'KDF', definition: 'Key Derivation Function — превращает «сырой» секрет K в ключ нужной длины и формата.' },
        { term: 'HMAC-SHA256', definition: 'версия HMAC на хеш-функции SHA-256 (32 байта отпечатка). Современнее, чем HMAC-SHA1.' },
      ],
      transform: 'KDF на HMAC-SHA256',
      calc: [
        'ВХОД:',
        '  K.x = {sharedK}',
        '',
        'ОПЕРАЦИЯ:',
        '  KDF на HMAC-SHA256',
        '',
        'РЕЗУЛЬТАТ:',
        '  PMK = {pmk}',
      ],
    },
    {
      title: 'Шаг 6 — Что видит перехватчик',
      tooltip: 'Перехватчик видит только пары (scalar, element) — и всё.',
      description:
        'Поставим себя на место злоумышленника с антенной. Всё, что он перехватил, — две ' +
        'пары (scalar, element). По ним нельзя ни восстановить пароль, ни проверить ' +
        'догадку: для проверки нужен новый живой обмен с точкой доступа, а она ограничивает ' +
        'число попыток.',
      terms: [
        { term: 'Перехватчик', definition: 'злоумышленник, пассивно слушающий эфир и записывающий все пакеты Wi-Fi.' },
        { term: 'Офлайн-перебор', definition: 'подбор пароля на своём компьютере, без связи с сетью. Работает, только если есть что сверять офлайн.' },
        { term: 'Пароль-кандидат', definition: 'очередное слово, которое атакующий проверяет как возможный пароль.' },
        { term: 'Confirm', definition: 'фаза подтверждения в SAE: стороны обмениваются доказательствами, что вычислили одинаковый K.' },
      ],
      transform: 'Перехват эфира',
      calc: [
        'ПЕРЕХВАЧЕНО из эфира — всего две пары:',
        '  AP:      scalar  {apScalar}',
        '           element {apElement}',
        '  Клиент:  scalar  {clScalar}',
        '           element {clElement}',
        '',
        'НЕ перехвачено и НЕ вычислимо офлайн: пароль, rand, mask, K, PMK.',
      ],
    },
    {
      title: 'Шаг 7 — Почему WPA3 устойчив (сравнение с WPA2)',
      tooltip: 'В WPA2 офлайн-перебор возможен, в WPA3 SAE — нет.',
      description:
        'В WPA2 перехваченное рукопожатие содержит MIC — его можно сверять с догадками ' +
        'офлайн сколько угодно. В WPA3 SAE такой проверяемой офлайн величины нет: каждая ' +
        'попытка требует нового живого обмена. Поэтому атака из Модуля 3 против WPA3 ' +
        'неприменима.',
      terms: [
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — протоколы, где стороны доказывают знание пароля, не давая перебрать его офлайн. SAE — один из них.' },
        { term: 'MIC (в WPA2)', definition: 'подпись из рукопожатия WPA2; её можно сверять с догадками офлайн — слабое место WPA2, которого нет в WPA3.' },
        { term: 'Forward secrecy', definition: '«прямая секретность»: даже узнав пароль позже, ранее записанный трафик расшифровать не получится.' },
      ],
      transform: 'Сравнение WPA2 ↔ WPA3',
      calc: [
        'WPA2:  перехват → есть MIC → офлайн-перебор миллионов паролей.',
        'WPA3:  перехват → есть (scalar, element) → офлайн проверить нельзя.',
        '',
        'Каждая догадка в WPA3 = новый живой обмен с точкой доступа,',
        'а она ограничивает число попыток. Офлайн-атака исключена.',
      ],
    },
  ],
};

const UK: SaeText = {
  labels: {
    ssid: 'SSID (ім’я мережі)',
    passphrase: 'Пароль мережі',
    apMac: 'MAC точки доступу',
    clientMac: 'MAC клієнта',
    pwe: 'PWE — точка пароля на P-256',
    apScalar: 'commit-scalar точки доступу',
    apElement: 'commit-element точки доступу',
    clScalar: 'commit-scalar клієнта',
    clElement: 'commit-element клієнта',
    sharedK: 'Спільний секрет K (X-координата)',
  },
  convergedYes: '✓ Сторони зійшлися до одного K — пароль збігся.',
  convergedNo: '✗ Сторони не зійшлися.',
  steps: [
    {
      title: 'Початкові дані',
      tooltip: 'Параметри мережі. Випадкові nonce, як у WPA2, тут не потрібні.',
      description:
        'Для SAE потрібні пароль, ім’я мережі та MAC-адреси обох сторін. Випадкові числа ' +
        'nonce, якими обмінювалися у WPA2, тут не передаються — секретність забезпечується ' +
        'математикою еліптичної кривої.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals — спосіб входу в Wi-Fi за паролем у WPA3, що замінює рукостискання WPA2.' },
        { term: 'WPA3', definition: 'третє покоління захисту Wi-Fi (Wi-Fi Alliance, 2018). Головне покращення для домашніх мереж — протокол SAE.' },
        { term: 'Еліптична крива', definition: 'математична множина точок, на якій множити точки легко, а «ділити» назад — практично неможливо.' },
        { term: 'P-256', definition: 'конкретна стандартна еліптична крива (NIST P-256), на якій працює цей модуль.' },
      ],
      transform: 'Параметри навчальної мережі',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Пароль      "{passText}"  →  hex {passHex}',
        'MAC AP      {apMacColon}',
        'MAC клієнта {clientMacColon}',
      ],
    },
    {
      title: 'Крок 1 — Виведення PWE (пароль → точка кривої)',
      tooltip: 'Пароль перетворюється на точку еліптичної кривої P-256.',
      description:
        'SAE починається з перетворення пароля на PWE — точку еліптичної кривої P-256. ' +
        'Метод — hash-to-curve за стандартом RFC 9380 (відображення SSWU), той самий ' +
        'примітив, що у WPA3 SAE-H2E. Операція одностороння: маючи лише точку, відновити ' +
        'пароль неможливо.',
      formula: 'PWE = hash_to_curve(пароль, SSID, MAC-адреси)  — RFC 9380, крива P-256',
      terms: [
        { term: 'PWE', definition: 'Password Element — «елемент пароля». Точка на кривій P-256, у яку перетворюється пароль.' },
        { term: 'Точка кривої', definition: 'пара координат (x, y), що задовольняє рівняння кривої.' },
        { term: 'hash-to-curve', definition: '«хешування у криву» — прийом, що перетворює довільні дані на точку кривої строго й передбачувано.' },
        { term: 'SSWU', definition: 'Simplified SWU — спосіб відобразити число в точку кривої за сталий час (без здогадів і переборів).' },
        { term: 'Одностороння функція', definition: 'легко обчислити вперед (пароль → точка), але практично неможливо обернути.' },
        { term: 'RFC 9380', definition: 'офіційний стандарт IETF «Hashing to Elliptic Curves» (2023). На ньому побудований SAE-H2E.' },
      ],
      transform: 'hash-to-curve на P-256 (SSWU)',
      calc: [
        'ВХІД:',
        '  пароль = {passHex}',
        '  SSID   = {ssidHex}',
        '',
        'ОПЕРАЦІЯ:',
        '  hash-to-curve SSWU на кривій P-256 (RFC 9380)',
        '',
        'РЕЗУЛЬТАТ — точка PWE, її X-координата:',
        '  PWE.x = {pwe}',
      ],
    },
    {
      title: 'Крок 2 — Commit точки доступу',
      tooltip: 'Точка доступу обирає два секрети й шле пару (scalar, element).',
      description:
        'Точка доступу обирає два секретні випадкові числа — rand і mask — і формує пару: ' +
        'commit-scalar (сума rand і mask) та commit-element (точка −mask·PWE). В ефір іде ' +
        'лише ця пара; пароль і секрети назовні не потрапляють.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'фаза «зобов’язання»: сторона розкриває пару чисел, «прив’язуючись» до секрету, але не видаючи його.' },
        { term: 'scalar (скаляр)', definition: 'звичайне ціле число (на відміну від точки кривої). commit-scalar = сума двох секретів за модулем n.' },
        { term: 'element (елемент)', definition: 'точка кривої, що передається у фазі Commit. Обчислюється із секрету mask і точки PWE.' },
        { term: 'rand, mask', definition: 'два секретні випадкові числа, які сторона обирає сама й нікому не показує.' },
        { term: 'mod n', definition: '«остача від ділення на n» (n — порядок групи кривої). Утримує результат у допустимому діапазоні.' },
        { term: 'Дискретний логарифм', definition: 'задача «за точкою k·PWE знайти k». На еліптичній кривій нерозв’язна — на цьому тримається захист.' },
      ],
      transform: 'Вибір rand, mask → commit',
      calc: [
        'Точка доступу обирає секрети rand і mask, рахує пару:',
        '',
        '  commit-scalar  = {apScalar}',
        '  commit-element = {apElement}',
        '',
        'Саме ця пара йде в ефір (M-Commit).',
      ],
      packetLabel: 'Commit — (scalar, element)',
    },
    {
      title: 'Крок 3 — Commit клієнта',
      tooltip: 'Клієнт симетрично шле свою пару (scalar, element).',
      description:
        'Клієнт виконує той самий крок: обирає свої секретні rand і mask та надсилає свою ' +
        'пару (scalar, element). У цьому сенс назви «рівних» — обидві сторони роблять ' +
        'симетричні дії.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: '«Рівних» (of Equals)', definition: 'у SAE обидві сторони виконують однакові кроки; немає «сервера» й «клієнта» у сенсі різних ролей.' },
        { term: 'Симетричний обмін', definition: 'обидві сторони надсилають повідомлення одного виду; жодна не залежить від того, хто почав.' },
      ],
      transform: 'Вибір rand, mask → commit',
      calc: [
        'Клієнт обирає свої секрети rand і mask, рахує пару:',
        '',
        '  commit-scalar  = {clScalar}',
        '  commit-element = {clElement}',
        '',
        'Пара йде в ефір назустріч парі точки доступу.',
      ],
      packetLabel: 'Commit — (scalar, element)',
    },
    {
      title: 'Крок 4 — Спільний секрет K',
      tooltip: 'Обидві сторони незалежно обчислюють ОДИН і той самий секрет K.',
      description:
        'Отримавши чужу пару, кожна сторона комбінує її зі своїм секретом rand і обчислює ' +
        'спільний секрет K. Математика влаштована так, що в точки доступу та клієнта K ' +
        'виходить ОДНАКОВИМ — хоча секрети різні, і в ефір K не передавався.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element)',
      terms: [
        { term: 'Спільний секрет K', definition: 'точка кривої, яку обидві сторони обчислюють незалежно й отримують однаковою. В ефір не передається.' },
        { term: 'Скалярне множення', definition: 'множення точки кривої на число: k·P — додати точку P саму до себе k разів.' },
        { term: 'peer (пір)', definition: '«партнер з обміну» — інша сторона. peer_scalar і peer_element — надіслана партнером пара.' },
        { term: 'Збіжність', definition: 'властивість, що K в обох сторін збігся. Саме вона доводить знання спільного пароля.' },
      ],
      transform: 'Скалярне множення на P-256',
      calc: [
        'Точка доступу:  K = rand_AP · (scalar_клієнта · PWE + element_клієнта)',
        'Клієнт:         K = rand_кл · (scalar_AP · PWE + element_AP)',
        '',
        'РЕЗУЛЬТАТ — X-координата K (однакова в обох сторін):',
        '  K.x = {sharedK}',
        '',
        '{verdict}',
      ],
    },
    {
      title: 'Крок 5 — Виведення PMK',
      tooltip: 'Зі спільного секрету K виводиться PMK.',
      description:
        'Зі спільного секрету K функція формування ключа на HMAC-SHA256 виводить PMK — ' +
        'майстер-ключ тієї самої ролі, що й PMK у WPA2. Найважливіше вже сталося: пароль ' +
        'підтверджено, а в ефірі не лишилося даних для офлайн-перебору.',
      formula: 'PMK = KDF-HMAC-SHA256(K, "SAE KCK and PMK")',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — майстер-ключ мережі. У WPA3 він отримується із секрету K, а не з PBKDF2.' },
        { term: 'KDF', definition: 'Key Derivation Function — перетворює «сирий» секрет K на ключ потрібної довжини й формату.' },
        { term: 'HMAC-SHA256', definition: 'версія HMAC на хеш-функції SHA-256 (32 байти відбитка). Сучасніша, ніж HMAC-SHA1.' },
      ],
      transform: 'KDF на HMAC-SHA256',
      calc: [
        'ВХІД:',
        '  K.x = {sharedK}',
        '',
        'ОПЕРАЦІЯ:',
        '  KDF на HMAC-SHA256',
        '',
        'РЕЗУЛЬТАТ:',
        '  PMK = {pmk}',
      ],
    },
    {
      title: 'Крок 6 — Що бачить перехоплювач',
      tooltip: 'Перехоплювач бачить лише пари (scalar, element) — і все.',
      description:
        'Поставимо себе на місце зловмисника з антеною. Усе, що він перехопив, — дві пари ' +
        '(scalar, element). За ними не можна ні відновити пароль, ні перевірити здогад: для ' +
        'перевірки потрібен новий живий обмін із точкою доступу, а вона обмежує кількість ' +
        'спроб.',
      terms: [
        { term: 'Перехоплювач', definition: 'зловмисник, що пасивно слухає ефір і записує всі пакети Wi-Fi.' },
        { term: 'Офлайн-перебір', definition: 'підбір пароля на своєму комп’ютері, без зв’язку з мережею. Працює, лише якщо є що звіряти офлайн.' },
        { term: 'Пароль-кандидат', definition: 'чергове слово, яке атакувальник перевіряє як можливий пароль.' },
        { term: 'Confirm', definition: 'фаза підтвердження у SAE: сторони обмінюються доказами, що обчислили однаковий K.' },
      ],
      transform: 'Перехоплення ефіру',
      calc: [
        'ПЕРЕХОПЛЕНО з ефіру — лише дві пари:',
        '  AP:      scalar  {apScalar}',
        '           element {apElement}',
        '  Клієнт:  scalar  {clScalar}',
        '           element {clElement}',
        '',
        'НЕ перехоплено й НЕ обчислюється офлайн: пароль, rand, mask, K, PMK.',
      ],
    },
    {
      title: 'Крок 7 — Чому WPA3 стійкий (порівняння з WPA2)',
      tooltip: 'У WPA2 офлайн-перебір можливий, у WPA3 SAE — ні.',
      description:
        'У WPA2 перехоплене рукостискання містить MIC — його можна звіряти зі здогадами ' +
        'офлайн скільки завгодно. У WPA3 SAE такої придатної до офлайн-перевірки величини ' +
        'немає: кожна спроба вимагає нового живого обміну. Тому атака з Модуля 3 проти WPA3 ' +
        'незастосовна.',
      terms: [
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — протоколи, де сторони доводять знання пароля, не даючи перебрати його офлайн. SAE — один із них.' },
        { term: 'MIC (у WPA2)', definition: 'підпис із рукостискання WPA2; його можна звіряти зі здогадами офлайн — слабке місце WPA2, якого немає у WPA3.' },
        { term: 'Forward secrecy', definition: '«пряма секретність»: навіть дізнавшись пароль пізніше, раніше записаний трафік розшифрувати не вийде.' },
      ],
      transform: 'Порівняння WPA2 ↔ WPA3',
      calc: [
        'WPA2:  перехоплення → є MIC → офлайн-перебір мільйонів паролів.',
        'WPA3:  перехоплення → є (scalar, element) → офлайн перевірити не можна.',
        '',
        'Кожен здогад у WPA3 = новий живий обмін із точкою доступу,',
        'а вона обмежує кількість спроб. Офлайн-атака виключена.',
      ],
    },
  ],
};

const EN: SaeText = {
  labels: {
    ssid: 'SSID (network name)',
    passphrase: 'Network password',
    apMac: 'Access point MAC',
    clientMac: 'Client MAC',
    pwe: 'PWE — the password point on P-256',
    apScalar: 'access point commit-scalar',
    apElement: 'access point commit-element',
    clScalar: 'client commit-scalar',
    clElement: 'client commit-element',
    sharedK: 'Shared secret K (X-coordinate)',
  },
  convergedYes: '✓ The sides converged to the same K — the password matched.',
  convergedNo: '✗ The sides did not converge.',
  steps: [
    {
      title: 'Input data',
      tooltip: 'Network parameters. Random nonces, as in WPA2, are not needed here.',
      description:
        'SAE needs the password, the network name and the MAC addresses of both sides. The ' +
        'random nonces exchanged in WPA2 are not sent here — secrecy is provided by the ' +
        'mathematics of the elliptic curve.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals — the way to log into Wi-Fi by password in WPA3, replacing the WPA2 handshake.' },
        { term: 'WPA3', definition: 'the third generation of Wi-Fi protection (Wi-Fi Alliance, 2018). The main improvement for home networks is the SAE protocol.' },
        { term: 'Elliptic curve', definition: 'a mathematical set of points on which multiplying points is easy, but “dividing” back is practically impossible.' },
        { term: 'P-256', definition: 'a specific standard elliptic curve (NIST P-256) on which this module operates.' },
      ],
      transform: 'Demo network parameters',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Password    "{passText}"  →  hex {passHex}',
        'AP MAC      {apMacColon}',
        'Client MAC  {clientMacColon}',
      ],
    },
    {
      title: 'Step 1 — Deriving the PWE (password → curve point)',
      tooltip: 'The password is turned into a point on the P-256 elliptic curve.',
      description:
        'SAE begins by turning the password into a PWE — a point on the P-256 elliptic ' +
        'curve. The method is hash-to-curve per the RFC 9380 standard (the SSWU mapping), ' +
        'the same primitive as in WPA3 SAE-H2E. The operation is one-way: with only the ' +
        'point, the password cannot be recovered.',
      formula: 'PWE = hash_to_curve(password, SSID, MAC addresses)  — RFC 9380, curve P-256',
      terms: [
        { term: 'PWE', definition: 'Password Element. The point on curve P-256 into which the password is turned.' },
        { term: 'Curve point', definition: 'a pair of coordinates (x, y) that satisfies the curve equation.' },
        { term: 'hash-to-curve', definition: 'a technique that turns arbitrary data into a curve point strictly and predictably.' },
        { term: 'SSWU', definition: 'Simplified SWU — a way to map a number to a curve point in constant time (no guessing or searching).' },
        { term: 'One-way function', definition: 'easy to compute forward (password → point), but practically impossible to invert.' },
        { term: 'RFC 9380', definition: 'the official IETF standard “Hashing to Elliptic Curves” (2023). SAE-H2E is built on it.' },
      ],
      transform: 'hash-to-curve on P-256 (SSWU)',
      calc: [
        'INPUT:',
        '  password = {passHex}',
        '  SSID     = {ssidHex}',
        '',
        'OPERATION:',
        '  hash-to-curve SSWU on curve P-256 (RFC 9380)',
        '',
        'RESULT — the PWE point, its X-coordinate:',
        '  PWE.x = {pwe}',
      ],
    },
    {
      title: 'Step 2 — The access point’s Commit',
      tooltip: 'The access point picks two secrets and sends a (scalar, element) pair.',
      description:
        'The access point picks two secret random numbers — rand and mask — and forms a ' +
        'pair: commit-scalar (the sum of rand and mask) and commit-element (the point ' +
        '−mask·PWE). Only this pair goes over the air; the password and secrets never ' +
        'leave.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'the “commitment” phase: a side reveals a pair of numbers, “binding” to its secret without disclosing it.' },
        { term: 'scalar', definition: 'an ordinary integer (unlike a curve point). commit-scalar = the sum of two secrets modulo n.' },
        { term: 'element', definition: 'the curve point sent in the Commit phase. Computed from the secret mask and the point PWE.' },
        { term: 'rand, mask', definition: 'two secret random numbers a side picks itself and shows to no one.' },
        { term: 'mod n', definition: '“the remainder of division by n” (n is the order of the curve group). It keeps the result within the allowed range.' },
        { term: 'Discrete logarithm', definition: 'the problem “given the point k·PWE, find k”. On an elliptic curve it is intractable — that is what the security rests on.' },
      ],
      transform: 'Picking rand, mask → commit',
      calc: [
        'The access point picks the secrets rand and mask, computes the pair:',
        '',
        '  commit-scalar  = {apScalar}',
        '  commit-element = {apElement}',
        '',
        'This is exactly the pair that goes over the air (M-Commit).',
      ],
      packetLabel: 'Commit — (scalar, element)',
    },
    {
      title: 'Step 3 — The client’s Commit',
      tooltip: 'The client symmetrically sends its own (scalar, element) pair.',
      description:
        'The client performs the same step: it picks its own secret rand and mask and ' +
        'sends its own (scalar, element) pair. This is the meaning of the word “Equals” — ' +
        'both sides perform symmetric actions.',
      formula: 'scalar = (rand + mask) mod n      element = −(mask · PWE)',
      terms: [
        { term: '“Equals”', definition: 'in SAE both sides perform the same steps; there is no “server” and “client” in the sense of different roles.' },
        { term: 'Symmetric exchange', definition: 'both sides send messages of the same kind; neither depends on who started.' },
      ],
      transform: 'Picking rand, mask → commit',
      calc: [
        'The client picks its own secrets rand and mask, computes the pair:',
        '',
        '  commit-scalar  = {clScalar}',
        '  commit-element = {clElement}',
        '',
        'The pair goes over the air to meet the access point’s pair.',
      ],
      packetLabel: 'Commit — (scalar, element)',
    },
    {
      title: 'Step 4 — The shared secret K',
      tooltip: 'Both sides independently compute the SAME secret K.',
      description:
        'Having received the other party’s pair, each side combines it with its own secret ' +
        'rand and computes the shared secret K. The mathematics is arranged so that the ' +
        'access point and the client get an IDENTICAL K — even though the secrets differ, ' +
        'and K was never sent over the air.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element)',
      terms: [
        { term: 'Shared secret K', definition: 'a curve point both sides compute independently and obtain identical. It is never sent over the air.' },
        { term: 'Scalar multiplication', definition: 'multiplying a curve point by a number: k·P means adding the point P to itself k times.' },
        { term: 'peer', definition: 'the “exchange partner” — the other side. peer_scalar and peer_element are the pair sent by the partner.' },
        { term: 'Convergence', definition: 'the property that K matched on both sides. It is exactly what proves knowledge of the shared password.' },
      ],
      transform: 'Scalar multiplication on P-256',
      calc: [
        'Access point:  K = rand_AP · (client_scalar · PWE + client_element)',
        'Client:        K = rand_cl · (AP_scalar · PWE + AP_element)',
        '',
        'RESULT — the X-coordinate of K (identical on both sides):',
        '  K.x = {sharedK}',
        '',
        '{verdict}',
      ],
    },
    {
      title: 'Step 5 — Deriving the PMK',
      tooltip: 'The PMK is derived from the shared secret K.',
      description:
        'From the shared secret K, a key-derivation function based on HMAC-SHA256 derives ' +
        'the PMK — a master key of the same role as the PMK in WPA2. The most important ' +
        'thing has already happened: the password is confirmed, and no data for an offline ' +
        'attack remains on the air.',
      formula: 'PMK = KDF-HMAC-SHA256(K, "SAE KCK and PMK")',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — the network master key. In WPA3 it comes from the secret K, not from PBKDF2.' },
        { term: 'KDF', definition: 'Key Derivation Function — turns the “raw” secret K into a key of the required length and format.' },
        { term: 'HMAC-SHA256', definition: 'a version of HMAC on the SHA-256 hash (32 bytes of fingerprint). More modern than HMAC-SHA1.' },
      ],
      transform: 'KDF on HMAC-SHA256',
      calc: [
        'INPUT:',
        '  K.x = {sharedK}',
        '',
        'OPERATION:',
        '  KDF on HMAC-SHA256',
        '',
        'RESULT:',
        '  PMK = {pmk}',
      ],
    },
    {
      title: 'Step 6 — What an eavesdropper sees',
      tooltip: 'An eavesdropper sees only the (scalar, element) pairs — that is all.',
      description:
        'Let us put ourselves in the place of an attacker with an antenna. All they ' +
        'captured is two (scalar, element) pairs. From them one can neither recover the ' +
        'password nor test a guess: verification requires a new live exchange with the ' +
        'access point, and it limits the number of attempts.',
      terms: [
        { term: 'Eavesdropper', definition: 'an attacker who passively listens to the air and records all Wi-Fi packets.' },
        { term: 'Offline cracking', definition: 'guessing the password on one’s own computer, with no connection to the network. It works only if there is something to compare against offline.' },
        { term: 'Candidate password', definition: 'the next word the attacker tests as a possible password.' },
        { term: 'Confirm', definition: 'the confirmation phase in SAE: the sides exchange proofs that they computed the same K.' },
      ],
      transform: 'Capturing the air',
      calc: [
        'CAPTURED from the air — only two pairs:',
        '  AP:      scalar  {apScalar}',
        '           element {apElement}',
        '  Client:  scalar  {clScalar}',
        '           element {clElement}',
        '',
        'NOT captured and NOT computable offline: password, rand, mask, K, PMK.',
      ],
    },
    {
      title: 'Step 7 — Why WPA3 holds up (compared with WPA2)',
      tooltip: 'In WPA2 offline cracking is possible; in WPA3 SAE it is not.',
      description:
        'In WPA2 the captured handshake contains the MIC — it can be checked against ' +
        'guesses offline as much as you like. In WPA3 SAE there is no such offline-checkable ' +
        'value: every attempt requires a new live exchange. That is why the attack from ' +
        'Module 3 does not apply to WPA3.',
      terms: [
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — protocols where the sides prove knowledge of the password without letting it be cracked offline. SAE is one of them.' },
        { term: 'MIC (in WPA2)', definition: 'the signature from the WPA2 handshake; it can be checked against guesses offline — the weak spot of WPA2 that WPA3 does not have.' },
        { term: 'Forward secrecy', definition: 'even if the password is learned later, previously recorded traffic still cannot be decrypted.' },
      ],
      transform: 'Comparison WPA2 ↔ WPA3',
      calc: [
        'WPA2:  capture → there is a MIC → offline cracking of millions of passwords.',
        'WPA3:  capture → there is (scalar, element) → cannot be checked offline.',
        '',
        'Every guess in WPA3 = a new live exchange with the access point,',
        'and it limits the number of attempts. An offline attack is ruled out.',
      ],
    },
  ],
};

/** Текст шагов WPA3 SAE по языку. */
export const SAE_TEXT: Record<Lang, SaeText> = { ru: RU, uk: UK, en: EN };
