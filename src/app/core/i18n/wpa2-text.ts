/** Текст шагов модуля WPA2 на трёх языках. */
import type { Lang } from './ui-text';
import type { StepText } from './step-text';

export interface Wpa2Text {
  labels: {
    ssid: string;
    passphrase: string;
    apMac: string;
    clientMac: string;
    blockB: string;
    eapol: string;
  };
  /** Подпись «отброшено» для байтовых диаграмм. */
  droppedLabel: string;
  steps: StepText[];
}

const RU: Wpa2Text = {
  labels: {
    ssid: 'SSID (имя сети)',
    passphrase: 'Пароль сети',
    apMac: 'MAC точки доступа',
    clientMac: 'MAC клиента',
    blockB: 'Блок B',
    eapol: 'Кадр EAPOL (M2)',
  },
  droppedLabel: 'отброшено',
  steps: [
    {
      title: 'Исходные данные',
      tooltip: 'Параметры учебной сети — их можно менять в панели сверху.',
      description:
        'Это все исходные данные, которые участвуют в рукопожатии WPA2: имя сети SSID, ' +
        'пароль, MAC-адреса точки доступа и клиента, два случайных числа ANonce и SNonce. ' +
        'Любой параметр можно изменить в панели «Параметры сети» — расчёт пересчитается.',
      terms: [
        { term: 'SSID', definition: 'имя сети Wi-Fi — то, что вы видите в списке сетей на телефоне.' },
        { term: 'MAC-адрес', definition: 'уникальный аппаратный номер сетевого устройства, 6 байт (например 02:00:00:00:00:01).' },
        { term: 'Пароль (PSK)', definition: 'общий пароль сети. PSK значит Pre-Shared Key — «заранее розданный ключ»: он одинаков у роутера и у всех устройств.' },
        { term: 'ANonce / SNonce', definition: 'случайные числа точки доступа (A) и клиента (S). Слово nonce = «number used once», число для одноразового использования.' },
        { term: 'Байт', definition: 'единица данных из 8 бит; одно двузначное число в hex (например 3f) — это один байт.' },
      ],
      transform: 'Параметры учебной сети',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Пароль      "{passText}"  →  hex {passHex}',
        'MAC AP      {apMacColon}',
        'MAC клиента {clientMacColon}',
        'ANonce      {aNonce}',
        'SNonce      {sNonce}',
      ],
    },
    {
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
        { term: 'XOR (⊕)', definition: 'побитовое «исключающее ИЛИ»: сравнивает числа бит за битом — бит результата равен 1, если биты разные. XOR всех U-значений «перемешивает» их в один блок.' },
      ],
      transform: 'PBKDF2-HMAC-SHA1, 4096 итераций',
      calc: [
        'PBKDF2 — это не одна операция, а длинный ЦИКЛ. Разберём по шагам.',
        '',
        'Цель: получить 256-битный ключ = 32 байта. SHA-1 за раз даёт 20',
        'байт, поэтому ключ собирают из ДВУХ блоков — T1 и T2.',
        '',
        '━━ БЛОК 1 (даёт байты 0–19 ключа) ━━',
        '1) Готовим вход первого HMAC: соль ‖ номер блока.',
        '   Номер блока — 4 байта (big-endian); для блока 1 это 00000001.',
        '   вход = {ssidHex} ‖ 00000001',
        '',
        '2) Цепочка из 4096 шагов HMAC-SHA1 (ключ = пароль = {passHex}):',
        '   U1 = HMAC-SHA1(пароль, вход) = {u1}',
        '   U2 = HMAC-SHA1(пароль, U1)   = {u2}',
        '   U3 = HMAC-SHA1(пароль, U2)   = {u3}',
        '   … каждый следующий U — это HMAC от предыдущего …',
        '   … так до U4096 (всего 4096 шагов) …',
        '',
        '3) XOR: T1 = U1 ⊕ U2 ⊕ U3 ⊕ … ⊕ U4096',
        '   (побитовое исключающее ИЛИ всех 4096 значений)',
        '   T1 = {t1}',
        '',
        '━━ БЛОК 2 (даёт байты 20–31 ключа) ━━',
        '   То же самое, но номер блока = 00000002:',
        '   вход = {ssidHex} ‖ 00000002  →  своя цепочка 4096 HMAC-SHA1  →  T2',
        '   T2 (нужны первые 12 байт) = {t2}…',
        '',
        '━━ СБОРКА ━━',
        '   PMK = (T1 ‖ T2), обрезать до 32 байт',
        '   PMK (32 байта) = {pmk}',
      ],
    },
    {
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
      transform: 'Обмен случайными числами',
      calc: [
        'M1:  точка доступа  →  клиент',
        '     ANonce = {aNonce}',
        '',
        'M2:  клиент  →  точка доступа',
        '     SNonce = {sNonce}',
        '',
        'Оба числа уходят в эфир ОТКРЫТО — они не секрет.',
      ],
      packetLabel: 'M1 — ANonce',
    },
    {
      title: 'Шаг 3 — Сборка входного блока B',
      tooltip: 'MAC-адреса и nonce складывают в строго определённом порядке.',
      description:
        'Чтобы точка доступа и клиент независимо получили один и тот же ключ, исходные ' +
        'данные склеивают (конкатенация ‖) в строго определённом порядке: из каждой пары ' +
        'сначала меньшее значение, затем большее. Так обе стороны соберут одинаковый блок ' +
        'B независимо от того, кто считает первым.',
      formula: 'B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce)',
      terms: [
        { term: 'Блок B', definition: 'склейка исходных данных в одну длинную строку байтов — заготовка для следующего шага.' },
        { term: 'Конкатенация (‖)', definition: 'соединение кусков байт в один — подряд, друг за другом, без разделителей. Знак ‖ означает «приписать следом». Порядок кусков фиксирован.' },
        { term: 'min / max', definition: 'меньшее и большее из двух значений (байты сравниваются как числа). Фиксированный порядок даёт обеим сторонам одинаковый блок.' },
        { term: 'AA / SPA', definition: 'AA — MAC точки доступа (Authenticator Address), SPA — MAC клиента (Supplicant Address).' },
      ],
      transform: 'min/max MAC и nonce',
      calc: [
        'СКЛАДЫВАЕМ четыре куска подряд (‖), из каждой пары — меньший, потом больший:',
        '  MAC AP  {apMac}',
        '  MAC STA {clientMac}',
        '  ANonce  {aNonce}',
        '  SNonce  {sNonce}',
        '',
        'РЕЗУЛЬТАТ — блок B:',
        '  {b}',
      ],
    },
    {
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
      transform: 'PRF-512 (HMAC-SHA1)',
      calc: [
        'ВХОД:',
        '  ключ  = PMK = {pmk}',
        '  данные = B  = {b}',
        '',
        'PRF-512 — тоже цикл, но короткий. Он склеивает выходы HMAC-SHA1',
        'со счётчиком 0, 1, 2, 3 (метка = "Pairwise key expansion"):',
        '  кусок 0 = HMAC-SHA1(PMK, метка ‖ 00 ‖ B ‖ 00) = {prf0}',
        '  кусок 1 = HMAC-SHA1(PMK, метка ‖ 00 ‖ B ‖ 01) = {prf1}',
        '  кусок 2 = HMAC-SHA1(PMK, метка ‖ 00 ‖ B ‖ 02) = {prf2}…',
        '  кусок 3 = HMAC-SHA1(PMK, метка ‖ 00 ‖ B ‖ 03)',
        '',
        'R = кусок0 ‖ кусок1 ‖ кусок2 ‖ кусок3',
        'Для шифрования CCMP берут ПЕРВЫЕ 48 байт R (индексы 0–47):',
        '  PTK = {ptk}',
      ],
      byteCaption:
        'PRF-512 выдаёт 64 байта. Зелёные ячейки (индексы 0–47) — это PTK, их берут. ' +
        'Серые с «✕» (48–63) — отбрасывают.',
    },
    {
      title: 'Шаг 5 — Разбиение PTK на KCK, KEK и TK',
      tooltip: 'PTK делится на три ключа с разными ролями.',
      description:
        'Полученный PTK — это не один ключ, а связка из трёх. PTK режут на три равные ' +
        'части по 16 байт: первые 16 (индексы 0–15) — KCK, следующие 16 (16–31) — KEK, ' +
        'последние 16 (32–47) — TK. У каждого ключа своя роль.',
      formula: 'PTK[0:48] = KCK(16 байт) ‖ KEK(16 байт) ‖ TK(16 байт)',
      terms: [
        { term: 'KCK', definition: 'Key Confirmation Key — «ключ подтверждения». Им вычисляют подпись MIC сообщений рукопожатия.' },
        { term: 'KEK', definition: 'Key Encryption Key — «ключ шифрования ключей». Им шифруют служебные ключи (например GTK) при передаче.' },
        { term: 'TK', definition: 'Temporal Key — «временный ключ». Именно им шифруется ваш реальный трафик (сайты, видео, сообщения).' },
        { term: 'Индекс байта', definition: 'порядковый номер байта, счёт с нуля: первый байт — индекс 0, шестнадцатый — индекс 15.' },
      ],
      transform: 'Разбиение 48 байт: 16 + 16 + 16',
      calc: [
        'PTK = {ptk}',
        '',
        'РЕЖЕМ 48 байт на три части по 16:',
        '  KCK = байты 0..15  = {kck}',
        '  KEK = байты 16..31 = {kek}',
        '  TK  = байты 32..47 = {tk}',
      ],
      byteCaption:
        'PTK (48 байт) делится на три равные части по 16 байт: KCK (индексы 0–15), ' +
        'KEK (16–31), TK (32–47). Каждая часть — отдельный ключ со своей ролью.',
    },
    {
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
        { term: 'Усечение (truncation)', definition: 'обрезка результата до нужной длины. HMAC-SHA1 даёт 20 байт, а для MIC берут только первые 16.' },
        { term: 'Индекс байта', definition: 'порядковый номер байта, счёт с нуля: первый байт — индекс 0, двадцатый — индекс 19.' },
      ],
      transform: 'HMAC-SHA1, усечение до 16 байт',
      calc: [
        'ВХОД:',
        '  KCK        = {kck}',
        '  кадр EAPOL = {eapol}',
        '',
        'ОПЕРАЦИЯ:',
        '  HMAC-SHA1(ключ = KCK, кадр EAPOL) → 20 байт.',
        '  MIC — это ПЕРВЫЕ 16 байт (индексы 0–15);',
        '  последние 4 байта (16–19) ОТБРАСЫВАЮТСЯ.',
        '  Почему 16? В кадре EAPOL-Key поле MIC занимает ровно',
        '  16 байт (IEEE 802.11). См. байтовую диаграмму ниже.',
        '',
        'РЕЗУЛЬТАТ:',
        '  MIC = {mic}',
      ],
      byteCaption:
        'HMAC-SHA1 выдаёт 20 байт. Зелёные ячейки (индексы 0–15) — это MIC, их берут. ' +
        'Серые с «✕» (16–19) — отбрасывают. Поле MIC в кадре EAPOL-Key — ровно 16 байт ' +
        '(IEEE 802.11).',
      packetLabel: 'M2 — SNonce + MIC',
    },
    {
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
      transform: 'Взаимная проверка MIC',
      calc: [
        'M3:  точка доступа  →  клиент   (MIC + зашифрованный GTK)',
        'M4:  клиент  →  точка доступа   (подтверждение)',
        '',
        'MIC рукопожатия = {mic}',
        '',
        'Рукопожатие завершено. Стороны ставят ключ TK и шифруют трафик.',
      ],
      packetLabel: 'M3 — подтверждение + GTK',
    },
  ],
};

const UK: Wpa2Text = {
  labels: {
    ssid: 'SSID (ім’я мережі)',
    passphrase: 'Пароль мережі',
    apMac: 'MAC точки доступу',
    clientMac: 'MAC клієнта',
    blockB: 'Блок B',
    eapol: 'Кадр EAPOL (M2)',
  },
  droppedLabel: 'відкинуто',
  steps: [
    {
      title: 'Початкові дані',
      tooltip: 'Параметри навчальної мережі — їх можна змінювати на панелі вгорі.',
      description:
        'Це всі початкові дані, що беруть участь у рукостисканні WPA2: ім’я мережі SSID, ' +
        'пароль, MAC-адреси точки доступу та клієнта, два випадкові числа ANonce і SNonce. ' +
        'Будь-який параметр можна змінити на панелі «Параметри мережі» — розрахунок ' +
        'оновиться.',
      terms: [
        { term: 'SSID', definition: 'ім’я мережі Wi-Fi — те, що ви бачите у списку мереж на телефоні.' },
        { term: 'MAC-адреса', definition: 'унікальний апаратний номер мережевого пристрою, 6 байтів (наприклад 02:00:00:00:00:01).' },
        { term: 'Пароль (PSK)', definition: 'спільний пароль мережі. PSK означає Pre-Shared Key — «заздалегідь розданий ключ»: він однаковий у маршрутизатора й усіх пристроїв.' },
        { term: 'ANonce / SNonce', definition: 'випадкові числа точки доступу (A) і клієнта (S). Слово nonce = «number used once», число для одноразового використання.' },
        { term: 'Байт', definition: 'одиниця даних із 8 бітів; одне двозначне число у hex (наприклад 3f) — це один байт.' },
      ],
      transform: 'Параметри навчальної мережі',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Пароль      "{passText}"  →  hex {passHex}',
        'MAC AP      {apMacColon}',
        'MAC клієнта {clientMacColon}',
        'ANonce      {aNonce}',
        'SNonce      {sNonce}',
      ],
    },
    {
      title: 'Крок 1 — Виведення PMK',
      tooltip: 'PMK — «головний ключ»: пароль і SSID тисячократно перемішуються.',
      description:
        'PMK — 256-бітний майстер-ключ, єдиний для всієї мережі. Його отримують функцією ' +
        'формування ключа PBKDF2: вона 4096 разів проганяє пароль і SSID через HMAC-SHA1. ' +
        'SSID відіграє роль «солі». 4096 повторів навмисно вповільнюють обчислення: чесному ' +
        'пристрою — непомітно, а зловмиснику при переборі мільйонів паролів дуже дорого ' +
        '(PKCS #5, RFC 8018).',
      formula: 'PMK = PBKDF2(HMAC-SHA1, пароль, SSID, 4096 ітерацій, 256 бітів)',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key — «парний майстер-ключ». 256-бітне (32 байти) число, з якого згодом виводять робочі ключі.' },
        { term: 'PBKDF2', definition: 'Password-Based Key Derivation Function 2 — функція, що «розтягує» короткий пароль у повноцінний ключ, багаторазово його перемішуючи.' },
        { term: 'HMAC', definition: 'Hash-based Message Authentication Code — криптофункція: бере ключ і дані, видає фіксований «відбиток». Без ключа підробити його не можна.' },
        { term: 'SHA-1', definition: 'алгоритм хешування: з даних будь-якої довжини робить рівно 20 байтів «відбитка».' },
        { term: 'Сіль (salt)', definition: 'додаток до пароля перед хешуванням. Тут сіллю слугує SSID — однаковий пароль у різних мережах дає різні ключі.' },
        { term: 'Ітерація', definition: 'один повтор обчислення. 4096 ітерацій — 4096 повторів поспіль, щоб навмисно вповільнити перебір паролів.' },
        { term: 'XOR (⊕)', definition: 'побітове «виключне АБО»: порівнює числа біт за бітом — біт результату дорівнює 1, якщо біти різні. XOR усіх U-значень «перемішує» їх в один блок.' },
      ],
      transform: 'PBKDF2-HMAC-SHA1, 4096 ітерацій',
      calc: [
        'PBKDF2 — це не одна операція, а довгий ЦИКЛ. Розберімо по кроках.',
        '',
        'Мета: отримати 256-бітний ключ = 32 байти. SHA-1 за раз дає 20',
        'байтів, тому ключ збирають із ДВОХ блоків — T1 і T2.',
        '',
        '━━ БЛОК 1 (дає байти 0–19 ключа) ━━',
        '1) Готуємо вхід першого HMAC: сіль ‖ номер блоку.',
        '   Номер блоку — 4 байти (big-endian); для блоку 1 це 00000001.',
        '   вхід = {ssidHex} ‖ 00000001',
        '',
        '2) Ланцюг із 4096 кроків HMAC-SHA1 (ключ = пароль = {passHex}):',
        '   U1 = HMAC-SHA1(пароль, вхід) = {u1}',
        '   U2 = HMAC-SHA1(пароль, U1)   = {u2}',
        '   U3 = HMAC-SHA1(пароль, U2)   = {u3}',
        '   … кожен наступний U — це HMAC від попереднього …',
        '   … так до U4096 (усього 4096 кроків) …',
        '',
        '3) XOR: T1 = U1 ⊕ U2 ⊕ U3 ⊕ … ⊕ U4096',
        '   (побітове виключне АБО всіх 4096 значень)',
        '   T1 = {t1}',
        '',
        '━━ БЛОК 2 (дає байти 20–31 ключа) ━━',
        '   Те саме, але номер блоку = 00000002:',
        '   вхід = {ssidHex} ‖ 00000002  →  свій ланцюг 4096 HMAC-SHA1  →  T2',
        '   T2 (потрібні перші 12 байтів) = {t2}…',
        '',
        '━━ ЗБИРАННЯ ━━',
        '   PMK = (T1 ‖ T2), обрізати до 32 байтів',
        '   PMK (32 байти) = {pmk}',
      ],
    },
    {
      title: 'Крок 2 — Обмін ANonce і SNonce (повідомлення M1, M2)',
      tooltip: 'Точка доступу та клієнт обмінюються випадковими числами.',
      description:
        'Повідомленням M1 точка доступу надсилає клієнту своє випадкове число ANonce; ' +
        'повідомленням M2 клієнт відповідає своїм числом SNonce. Ці одноразові числа роблять ' +
        'кожен сеанс унікальним: навіть за одного пароля ключі кожного підключення різні.',
      terms: [
        { term: 'nonce', definition: 'випадкове число «на один раз» (number used once). Гарантує, що кожне рукостискання неповторне.' },
        { term: 'M1, M2', definition: 'перше та друге повідомлення рукостискання. Усього повідомлень чотири — звідси «4-Way Handshake».' },
        { term: 'Точка доступу (AP)', definition: 'пристрій, що роздає Wi-Fi (маршрутизатор). AP = Access Point.' },
        { term: 'Клієнт (STA)', definition: 'пристрій, що підключається до мережі — телефон, ноутбук. STA = Station.' },
      ],
      transform: 'Обмін випадковими числами',
      calc: [
        'M1:  точка доступу  →  клієнт',
        '     ANonce = {aNonce}',
        '',
        'M2:  клієнт  →  точка доступу',
        '     SNonce = {sNonce}',
        '',
        'Обидва числа йдуть в ефір ВІДКРИТО — вони не секрет.',
      ],
      packetLabel: 'M1 — ANonce',
    },
    {
      title: 'Крок 3 — Збирання вхідного блоку B',
      tooltip: 'MAC-адреси та nonce складають у строго визначеному порядку.',
      description:
        'Щоб точка доступу та клієнт незалежно отримали один і той самий ключ, початкові ' +
        'дані склеюють (конкатенація ‖) у строго визначеному порядку: з кожної пари спершу ' +
        'менше значення, потім більше. Так обидві сторони зберуть однаковий блок B ' +
        'незалежно від того, хто рахує першим.',
      formula: 'B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce)',
      terms: [
        { term: 'Блок B', definition: 'склейка початкових даних в один довгий рядок байтів — заготовка для наступного кроку.' },
        { term: 'Конкатенація (‖)', definition: 'з’єднання шматків байтів в один — підряд, один за одним, без роздільників. Знак ‖ означає «дописати слідом». Порядок шматків фіксований.' },
        { term: 'min / max', definition: 'менше й більше з двох значень (байти порівнюються як числа). Фіксований порядок дає обом сторонам однаковий блок.' },
        { term: 'AA / SPA', definition: 'AA — MAC точки доступу (Authenticator Address), SPA — MAC клієнта (Supplicant Address).' },
      ],
      transform: 'min/max MAC і nonce',
      calc: [
        'СКЛАДАЄМО чотири шматки підряд (‖), з кожної пари — менший, потім більший:',
        '  MAC AP  {apMac}',
        '  MAC STA {clientMac}',
        '  ANonce  {aNonce}',
        '  SNonce  {sNonce}',
        '',
        'РЕЗУЛЬТАТ — блок B:',
        '  {b}',
      ],
    },
    {
      title: 'Крок 4 — Виведення PTK',
      tooltip: 'PTK — робочий ключ сеансу, виводиться з PMK і блоку B.',
      description:
        'PTK — робочий ключ конкретного сеансу. Його «витягують» з PMK і блоку B ' +
        'псевдовипадковою функцією PRF на основі HMAC-SHA1: вона хешує вхід із лічильниками, ' +
        'доки не набере потрібну кількість бітів. PMK живе роками, а PTK — лише до кінця ' +
        'підключення.',
      formula: 'PTK = PRF-512(PMK, "Pairwise key expansion", B)',
      terms: [
        { term: 'PTK', definition: 'Pairwise Transient Key — «парний тимчасовий ключ» конкретного підключення; зникає при відключенні.' },
        { term: 'PRF', definition: 'Pseudo-Random Function — псевдовипадкова функція. «Розтягує» вхід у потрібну кількість байтів, багаторазово застосовуючи HMAC із лічильником.' },
        { term: 'PRF-512', definition: 'варіант PRF, що видає 512 бітів (64 байти); для шифрування CCMP беруть перші 48 байтів.' },
        { term: 'Лічильник', definition: 'число (0, 1, 2…), яке підмішують у кожен повтор HMAC, щоб блоки результату виходили різними.' },
      ],
      transform: 'PRF-512 (HMAC-SHA1)',
      calc: [
        'ВХІД:',
        '  ключ  = PMK = {pmk}',
        '  дані  = B   = {b}',
        '',
        'PRF-512 — теж цикл, але короткий. Він склеює виходи HMAC-SHA1',
        'із лічильником 0, 1, 2, 3 (мітка = "Pairwise key expansion"):',
        '  шматок 0 = HMAC-SHA1(PMK, мітка ‖ 00 ‖ B ‖ 00) = {prf0}',
        '  шматок 1 = HMAC-SHA1(PMK, мітка ‖ 00 ‖ B ‖ 01) = {prf1}',
        '  шматок 2 = HMAC-SHA1(PMK, мітка ‖ 00 ‖ B ‖ 02) = {prf2}…',
        '  шматок 3 = HMAC-SHA1(PMK, мітка ‖ 00 ‖ B ‖ 03)',
        '',
        'R = шматок0 ‖ шматок1 ‖ шматок2 ‖ шматок3',
        'Для шифрування CCMP беруть ПЕРШІ 48 байтів R (індекси 0–47):',
        '  PTK = {ptk}',
      ],
      byteCaption:
        'PRF-512 видає 64 байти. Зелені клітинки (індекси 0–47) — це PTK, їх беруть. ' +
        'Сірі з «✕» (48–63) — відкидають.',
    },
    {
      title: 'Крок 5 — Розбиття PTK на KCK, KEK і TK',
      tooltip: 'PTK ділиться на три ключі з різними ролями.',
      description:
        'Отриманий PTK — це не один ключ, а зв’язка з трьох. PTK ріжуть на три рівні ' +
        'частини по 16 байтів: перші 16 (індекси 0–15) — KCK, наступні 16 (16–31) — KEK, ' +
        'останні 16 (32–47) — TK. У кожного ключа своя роль.',
      formula: 'PTK[0:48] = KCK(16 байтів) ‖ KEK(16 байтів) ‖ TK(16 байтів)',
      terms: [
        { term: 'KCK', definition: 'Key Confirmation Key — «ключ підтвердження». Ним обчислюють підпис MIC повідомлень рукостискання.' },
        { term: 'KEK', definition: 'Key Encryption Key — «ключ шифрування ключів». Ним шифрують службові ключі (наприклад GTK) під час передачі.' },
        { term: 'TK', definition: 'Temporal Key — «тимчасовий ключ». Саме ним шифрується ваш реальний трафік (сайти, відео, повідомлення).' },
        { term: 'Індекс байта', definition: 'порядковий номер байта, лік із нуля: перший байт — індекс 0, шістнадцятий — індекс 15.' },
      ],
      transform: 'Розбиття 48 байтів: 16 + 16 + 16',
      calc: [
        'PTK = {ptk}',
        '',
        'РІЖЕМО 48 байтів на три частини по 16:',
        '  KCK = байти 0..15  = {kck}',
        '  KEK = байти 16..31 = {kek}',
        '  TK  = байти 32..47 = {tk}',
      ],
      byteCaption:
        'PTK (48 байтів) ділиться на три рівні частини по 16 байтів: KCK (індекси 0–15), ' +
        'KEK (16–31), TK (32–47). Кожна частина — окремий ключ зі своєю роллю.',
    },
    {
      title: 'Крок 6 — Створення MIC',
      tooltip: 'MIC — «контрольний підпис» повідомлення за ключем KCK.',
      description:
        'MIC — криптографічний «підпис» кадру EAPOL: HMAC-SHA1 за ключем KCK, усічений до ' +
        '16 байтів. Клієнт кладе свій MIC у повідомлення M2. Точка доступу рахує MIC сама: ' +
        'якщо значення збіглися — обидві сторони вивели однаковий PMK, тобто знають пароль. ' +
        'Сам пароль при цьому не передається.',
      formula: 'MIC = HMAC-SHA1(KCK, кадр EAPOL з обнуленим полем MIC)[0:16]',
      terms: [
        { term: 'MIC', definition: 'Message Integrity Code — «код цілісності повідомлення». Короткий підпис: збігся — повідомлення справжнє, не збігся — щось не так.' },
        { term: 'EAPOL', definition: 'EAP over LAN — протокол, яким передаються повідомлення рукостискання M1–M4.' },
        { term: 'Кадр', definition: 'один пакет даних у мережі — заголовок і вміст. Кадр EAPOL — це одне повідомлення рукостискання.' },
        { term: 'Усічення (truncation)', definition: 'обрізання результату до потрібної довжини. HMAC-SHA1 дає 20 байтів, а для MIC беруть лише перші 16.' },
        { term: 'Індекс байта', definition: 'порядковий номер байта, лік із нуля: перший байт — індекс 0, двадцятий — індекс 19.' },
      ],
      transform: 'HMAC-SHA1, усічення до 16 байтів',
      calc: [
        'ВХІД:',
        '  KCK        = {kck}',
        '  кадр EAPOL = {eapol}',
        '',
        'ОПЕРАЦІЯ:',
        '  HMAC-SHA1(ключ = KCK, кадр EAPOL) → 20 байтів.',
        '  MIC — це ПЕРШІ 16 байтів (індекси 0–15);',
        '  останні 4 байти (16–19) ВІДКИДАЮТЬСЯ.',
        '  Чому 16? У кадрі EAPOL-Key поле MIC займає рівно',
        '  16 байтів (IEEE 802.11). Див. байтову діаграму нижче.',
        '',
        'РЕЗУЛЬТАТ:',
        '  MIC = {mic}',
      ],
      byteCaption:
        'HMAC-SHA1 видає 20 байтів. Зелені клітинки (індекси 0–15) — це MIC, їх беруть. ' +
        'Сірі з «✕» (16–19) — відкидають. Поле MIC у кадрі EAPOL-Key — рівно 16 байтів ' +
        '(IEEE 802.11).',
      packetLabel: 'M2 — SNonce + MIC',
    },
    {
      title: 'Крок 7 — Повідомлення M3 і M4',
      tooltip: 'M3 і M4 завершують рукостискання.',
      description:
        'Повідомлення M3 (точка доступу → клієнт) підтверджує, що MIC збігся, і передає ' +
        'груповий ключ GTK; повідомлення M4 (клієнт → точка доступу) — фінальне ' +
        'підтвердження. Після M4 обидві сторони встановлюють ключ TK і починають шифрувати ' +
        'трафік. Рукостискання завершено.',
      terms: [
        { term: 'M3, M4', definition: 'третє та четверте повідомлення рукостискання. M3 — від точки доступу до клієнта, M4 — назад.' },
        { term: 'GTK', definition: 'Group Temporal Key — «груповий ключ». Ним шифруються широкомовні повідомлення, що йдуть одразу всім пристроям мережі.' },
        { term: 'Широкомовний трафік', definition: 'дані, адресовані не одному пристрою, а всім одразу (наприклад, оголошення мережі).' },
      ],
      transform: 'Взаємна перевірка MIC',
      calc: [
        'M3:  точка доступу  →  клієнт   (MIC + зашифрований GTK)',
        'M4:  клієнт  →  точка доступу   (підтвердження)',
        '',
        'MIC рукостискання = {mic}',
        '',
        'Рукостискання завершено. Сторони ставлять ключ TK і шифрують трафік.',
      ],
      packetLabel: 'M3 — підтвердження + GTK',
    },
  ],
};

const EN: Wpa2Text = {
  labels: {
    ssid: 'SSID (network name)',
    passphrase: 'Network password',
    apMac: 'Access point MAC',
    clientMac: 'Client MAC',
    blockB: 'Block B',
    eapol: 'EAPOL frame (M2)',
  },
  droppedLabel: 'discarded',
  steps: [
    {
      title: 'Input data',
      tooltip: 'Demo network parameters — you can change them in the panel above.',
      description:
        'These are all the inputs that take part in the WPA2 handshake: the network name ' +
        'SSID, the password, the MAC addresses of the access point and the client, and two ' +
        'random numbers ANonce and SNonce. Any parameter can be changed in the “Network ' +
        'parameters” panel — the computation will rerun.',
      terms: [
        { term: 'SSID', definition: 'the Wi-Fi network name — what you see in the network list on your phone.' },
        { term: 'MAC address', definition: 'a unique hardware number of a network device, 6 bytes (for example 02:00:00:00:00:01).' },
        { term: 'Password (PSK)', definition: 'the shared network password. PSK stands for Pre-Shared Key — it is the same on the router and on every device.' },
        { term: 'ANonce / SNonce', definition: 'random numbers from the access point (A) and the client (S). The word nonce = “number used once”.' },
        { term: 'Byte', definition: 'a unit of data of 8 bits; one two-digit hex number (for example 3f) is one byte.' },
      ],
      transform: 'Demo network parameters',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Password    "{passText}"  →  hex {passHex}',
        'AP MAC      {apMacColon}',
        'Client MAC  {clientMacColon}',
        'ANonce      {aNonce}',
        'SNonce      {sNonce}',
      ],
    },
    {
      title: 'Step 1 — Deriving the PMK',
      tooltip: 'PMK is the “master key”: the password and SSID are mixed thousands of times.',
      description:
        'The PMK is a 256-bit master key, the same for the whole network. It is produced by ' +
        'the key-derivation function PBKDF2, which runs the password and the SSID through ' +
        'HMAC-SHA1 4096 times. The SSID acts as the “salt”. The 4096 repetitions ' +
        'deliberately slow the computation down: unnoticeable for an honest device, but very ' +
        'expensive for an attacker brute-forcing millions of passwords (PKCS #5, RFC 8018).',
      formula: 'PMK = PBKDF2(HMAC-SHA1, password, SSID, 4096 iterations, 256 bits)',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key. A 256-bit (32-byte) number from which the working keys are later derived.' },
        { term: 'PBKDF2', definition: 'Password-Based Key Derivation Function 2 — a function that “stretches” a short password into a full key by mixing it many times.' },
        { term: 'HMAC', definition: 'Hash-based Message Authentication Code — a crypto function: it takes a key and data and produces a fixed “fingerprint”. Without the key it cannot be forged.' },
        { term: 'SHA-1', definition: 'a hash algorithm: from data of any length it produces exactly 20 bytes of “fingerprint”.' },
        { term: 'Salt', definition: 'an addition to the password before hashing. Here the SSID is the salt — the same password in different networks yields different keys.' },
        { term: 'Iteration', definition: 'one repetition of the computation. 4096 iterations means 4096 repetitions in a row, to deliberately slow down password cracking.' },
        { term: 'XOR (⊕)', definition: 'a bitwise “exclusive OR”: it compares numbers bit by bit — a result bit is 1 if the bits differ. XOR of all the U values “mixes” them into one block.' },
      ],
      transform: 'PBKDF2-HMAC-SHA1, 4096 iterations',
      calc: [
        'PBKDF2 is not a single operation but a long LOOP. Step by step.',
        '',
        'Goal: get a 256-bit key = 32 bytes. SHA-1 gives 20 bytes at a',
        'time, so the key is assembled from TWO blocks — T1 and T2.',
        '',
        '━━ BLOCK 1 (gives bytes 0–19 of the key) ━━',
        '1) Prepare the input of the first HMAC: salt ‖ block number.',
        '   The block number is 4 bytes (big-endian); for block 1 — 00000001.',
        '   input = {ssidHex} ‖ 00000001',
        '',
        '2) A chain of 4096 HMAC-SHA1 steps (key = password = {passHex}):',
        '   U1 = HMAC-SHA1(password, input) = {u1}',
        '   U2 = HMAC-SHA1(password, U1)    = {u2}',
        '   U3 = HMAC-SHA1(password, U2)    = {u3}',
        '   … each next U is HMAC of the previous one …',
        '   … and so on up to U4096 (4096 steps in total) …',
        '',
        '3) XOR: T1 = U1 ⊕ U2 ⊕ U3 ⊕ … ⊕ U4096',
        '   (bitwise exclusive-OR of all 4096 values)',
        '   T1 = {t1}',
        '',
        '━━ BLOCK 2 (gives bytes 20–31 of the key) ━━',
        '   The same, but the block number = 00000002:',
        '   input = {ssidHex} ‖ 00000002  →  its own chain of 4096 HMAC-SHA1  →  T2',
        '   T2 (first 12 bytes are needed) = {t2}…',
        '',
        '━━ ASSEMBLY ━━',
        '   PMK = (T1 ‖ T2), truncated to 32 bytes',
        '   PMK (32 bytes) = {pmk}',
      ],
    },
    {
      title: 'Step 2 — Exchanging ANonce and SNonce (messages M1, M2)',
      tooltip: 'The access point and the client exchange random numbers.',
      description:
        'With message M1 the access point sends the client its random number ANonce; with ' +
        'message M2 the client replies with its number SNonce. These one-time numbers make ' +
        'every session unique: even with the same password every connection gets different ' +
        'keys.',
      terms: [
        { term: 'nonce', definition: 'a one-time random number (number used once). It guarantees that every handshake is unrepeatable.' },
        { term: 'M1, M2', definition: 'the first and second handshake messages. There are four messages in all — hence “4-Way Handshake”.' },
        { term: 'Access point (AP)', definition: 'the device that broadcasts Wi-Fi (a router). AP = Access Point.' },
        { term: 'Client (STA)', definition: 'a device connecting to the network — a phone, a laptop. STA = Station.' },
      ],
      transform: 'Exchange of random numbers',
      calc: [
        'M1:  access point  →  client',
        '     ANonce = {aNonce}',
        '',
        'M2:  client  →  access point',
        '     SNonce = {sNonce}',
        '',
        'Both numbers go over the air OPENLY — they are not secret.',
      ],
      packetLabel: 'M1 — ANonce',
    },
    {
      title: 'Step 3 — Building input block B',
      tooltip: 'The MAC addresses and nonces are concatenated in a strictly fixed order.',
      description:
        'So that the access point and the client independently obtain the same key, the ' +
        'inputs are concatenated (‖) in a strictly fixed order: from each pair the smaller ' +
        'value first, then the larger. This way both sides build the same block B ' +
        'regardless of who computes first.',
      formula: 'B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce)',
      terms: [
        { term: 'Block B', definition: 'the inputs glued into one long string of bytes — the raw material for the next step.' },
        { term: 'Concatenation (‖)', definition: 'joining chunks of bytes into one — back to back, with no separators. The ‖ sign means “append after”. The order of the chunks is fixed.' },
        { term: 'min / max', definition: 'the smaller and the larger of two values (bytes compared as numbers). The fixed order gives both sides the same block.' },
        { term: 'AA / SPA', definition: 'AA is the access point MAC (Authenticator Address), SPA is the client MAC (Supplicant Address).' },
      ],
      transform: 'min/max of MAC and nonce',
      calc: [
        'CONCATENATE four chunks back to back (‖); from each pair — smaller, then larger:',
        '  AP MAC   {apMac}',
        '  STA MAC  {clientMac}',
        '  ANonce   {aNonce}',
        '  SNonce   {sNonce}',
        '',
        'RESULT — block B:',
        '  {b}',
      ],
    },
    {
      title: 'Step 4 — Deriving the PTK',
      tooltip: 'The PTK is the session working key, derived from the PMK and block B.',
      description:
        'The PTK is the working key of a specific session. It is “pulled” from the PMK and ' +
        'block B by a pseudo-random function PRF based on HMAC-SHA1: it hashes the input ' +
        'with counters until it has enough bits. The PMK lives for years, but the PTK only ' +
        'until the connection ends.',
      formula: 'PTK = PRF-512(PMK, "Pairwise key expansion", B)',
      terms: [
        { term: 'PTK', definition: 'Pairwise Transient Key — the “transient” key of a specific connection; it disappears on disconnect.' },
        { term: 'PRF', definition: 'Pseudo-Random Function. It “stretches” the input to the required number of bytes by applying HMAC repeatedly with a counter.' },
        { term: 'PRF-512', definition: 'a variant of PRF that outputs 512 bits (64 bytes); CCMP encryption takes the first 48 bytes.' },
        { term: 'Counter', definition: 'a number (0, 1, 2…) mixed into each HMAC repetition so the result blocks come out different.' },
      ],
      transform: 'PRF-512 (HMAC-SHA1)',
      calc: [
        'INPUT:',
        '  key  = PMK = {pmk}',
        '  data = B   = {b}',
        '',
        'PRF-512 is also a loop, but a short one. It concatenates the',
        'outputs of HMAC-SHA1 with counter 0, 1, 2, 3 (label = "Pairwise',
        'key expansion"):',
        '  chunk 0 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 00) = {prf0}',
        '  chunk 1 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 01) = {prf1}',
        '  chunk 2 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 02) = {prf2}…',
        '  chunk 3 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 03)',
        '',
        'R = chunk0 ‖ chunk1 ‖ chunk2 ‖ chunk3',
        'For CCMP encryption the FIRST 48 bytes of R are taken (indices 0–47):',
        '  PTK = {ptk}',
      ],
      byteCaption:
        'PRF-512 outputs 64 bytes. The green cells (indices 0–47) are the PTK — they are ' +
        'kept. The grey ones with “✕” (48–63) are discarded.',
    },
    {
      title: 'Step 5 — Splitting the PTK into KCK, KEK and TK',
      tooltip: 'The PTK is split into three keys with different roles.',
      description:
        'The resulting PTK is not one key but a bundle of three. The PTK is cut into three ' +
        'equal 16-byte parts: the first 16 (indices 0–15) are the KCK, the next 16 (16–31) ' +
        'the KEK, the last 16 (32–47) the TK. Each key has its own role.',
      formula: 'PTK[0:48] = KCK(16 bytes) ‖ KEK(16 bytes) ‖ TK(16 bytes)',
      terms: [
        { term: 'KCK', definition: 'Key Confirmation Key. It is used to compute the MIC signature of handshake messages.' },
        { term: 'KEK', definition: 'Key Encryption Key. It is used to encrypt auxiliary keys (such as the GTK) during transmission.' },
        { term: 'TK', definition: 'Temporal Key. This is the key that actually encrypts your real traffic (websites, video, messages).' },
        { term: 'Byte index', definition: 'the ordinal number of a byte, counting from zero: the first byte is index 0, the sixteenth is index 15.' },
      ],
      transform: 'Splitting 48 bytes: 16 + 16 + 16',
      calc: [
        'PTK = {ptk}',
        '',
        'CUT 48 bytes into three 16-byte parts:',
        '  KCK = bytes 0..15  = {kck}',
        '  KEK = bytes 16..31 = {kek}',
        '  TK  = bytes 32..47 = {tk}',
      ],
      byteCaption:
        'The PTK (48 bytes) is split into three equal 16-byte parts: KCK (indices 0–15), ' +
        'KEK (16–31), TK (32–47). Each part is a separate key with its own role.',
    },
    {
      title: 'Step 6 — Creating the MIC',
      tooltip: 'The MIC is a “check signature” of the message under the KCK key.',
      description:
        'The MIC is a cryptographic “signature” of the EAPOL frame: HMAC-SHA1 under the KCK ' +
        'key, truncated to 16 bytes. The client places its MIC into message M2. The access ' +
        'point computes the MIC itself: if the values match, both sides derived the same ' +
        'PMK — that is, they know the password. The password itself is never transmitted.',
      formula: 'MIC = HMAC-SHA1(KCK, EAPOL frame with the MIC field zeroed)[0:16]',
      terms: [
        { term: 'MIC', definition: 'Message Integrity Code. A short signature: a match means the message is genuine, a mismatch means something is wrong.' },
        { term: 'EAPOL', definition: 'EAP over LAN — the protocol over which handshake messages M1–M4 are sent.' },
        { term: 'Frame', definition: 'one packet of data on the network — a header and content. An EAPOL frame is one handshake message.' },
        { term: 'Truncation', definition: 'cutting the result to the required length. HMAC-SHA1 yields 20 bytes, and the MIC keeps only the first 16.' },
        { term: 'Byte index', definition: 'the ordinal number of a byte, counting from zero: the first byte is index 0, the twentieth is index 19.' },
      ],
      transform: 'HMAC-SHA1, truncated to 16 bytes',
      calc: [
        'INPUT:',
        '  KCK         = {kck}',
        '  EAPOL frame = {eapol}',
        '',
        'OPERATION:',
        '  HMAC-SHA1(key = KCK, EAPOL frame) → 20 bytes.',
        '  The MIC is the FIRST 16 bytes (indices 0–15);',
        '  the last 4 bytes (16–19) are DISCARDED.',
        '  Why 16? In the EAPOL-Key frame the MIC field is exactly',
        '  16 bytes (IEEE 802.11). See the byte diagram below.',
        '',
        'RESULT:',
        '  MIC = {mic}',
      ],
      byteCaption:
        'HMAC-SHA1 outputs 20 bytes. The green cells (indices 0–15) are the MIC — they are ' +
        'kept. The grey ones with “✕” (16–19) are discarded. The MIC field in the EAPOL-Key ' +
        'frame is exactly 16 bytes (IEEE 802.11).',
      packetLabel: 'M2 — SNonce + MIC',
    },
    {
      title: 'Step 7 — Messages M3 and M4',
      tooltip: 'M3 and M4 complete the handshake.',
      description:
        'Message M3 (access point → client) confirms that the MIC matched and delivers the ' +
        'group key GTK; message M4 (client → access point) is the final confirmation. After ' +
        'M4 both sides install the TK key and start encrypting traffic. The handshake is ' +
        'complete.',
      terms: [
        { term: 'M3, M4', definition: 'the third and fourth handshake messages. M3 goes from the access point to the client, M4 back.' },
        { term: 'GTK', definition: 'Group Temporal Key. It encrypts broadcast messages sent to all devices on the network at once.' },
        { term: 'Broadcast traffic', definition: 'data addressed not to one device but to all at once (for example, network announcements).' },
      ],
      transform: 'Mutual MIC check',
      calc: [
        'M3:  access point  →  client   (MIC + encrypted GTK)',
        'M4:  client  →  access point   (confirmation)',
        '',
        'Handshake MIC = {mic}',
        '',
        'The handshake is complete. The sides install the TK key and encrypt traffic.',
      ],
      packetLabel: 'M3 — confirmation + GTK',
    },
  ],
};

/** Текст шагов WPA2 по языку. */
export const WPA2_TEXT: Record<Lang, Wpa2Text> = { ru: RU, uk: UK, en: EN };
