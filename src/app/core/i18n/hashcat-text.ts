/** Текст шагов симулятора Hashcat 22000 на трёх языках. */
import type { GlossaryTerm } from '../models';
import type { Lang } from './ui-text';

interface AttackVariant {
  tooltip: string;
  description: string;
  formula: string;
  terms: GlossaryTerm[];
}

export interface HashcatText {
  capturedLabel: string;
  pmkLabel: string;
  hashLabel: string;
  crackTerms: GlossaryTerm[];

  step0Title: string;
  step0Pmkid: AttackVariant;
  step0Eapol: AttackVariant;
  step0Transform: string;
  step0Calc: string[];

  step1Title: string;
  step1Tooltip: string;
  step1Description: string;
  step1Formula: string;
  step1Terms: GlossaryTerm[];
  step1Transform: string;
  step1Calc: string[];

  perWordTitle: string;
  perWordTooltipMatch: string;
  perWordTooltipNoMatch: string;
  perWordDescMatch: string;
  perWordDescNoMatch: string;
  perWordFormulaPmkid: string;
  perWordFormulaEapol: string;
  perWordTransform: string;
  perWordInputLabel: string;
  perWordOpPmkid: string;
  perWordOpEapol: string;
  perWordVerdictMatch: string;
  perWordVerdictNoMatch: string;
  perWordCalc: string[];
  badgeMatch: string;
  badgeNoMatch: string;

  fastTitle: string;
  fastTooltip: string;
  fastDescription: string;
  fastTermName: GlossaryTerm;
  fastTransform: string;
  fastCalc: string[];

  outcomeTitleFound: string;
  outcomeTitleNotFound: string;
  outcomeTooltipFound: string;
  outcomeTooltipNotFound: string;
  outcomeDescFound: string;
  outcomeDescNotFound: string;
  outcomeTerms: GlossaryTerm[];
  outcomeTransform: string;
  outcomeCalcFound: string[];
  outcomeCalcNotFound: string[];
  outcomeBadgeFound: string;
  outcomeBadgeNotFound: string;
}

const RU_CRACK: GlossaryTerm[] = [
  { term: 'PBKDF2', definition: 'функция, превращающая пароль в ключ PMK за 4096 повторов HMAC-SHA1. Та же, что в Модуле 1.' },
  { term: 'PMK', definition: 'Pairwise Master Key — 256-битный ключ, получаемый из пароля и SSID.' },
  { term: 'Хэш кандидата', definition: 'значение (PMKID или MIC), вычисленное из проверяемого слова. Его сверяют с перехваченным.' },
  { term: 'Словарь', definition: 'список слов-кандидатов на роль пароля. В реальной атаке — миллионы строк.' },
];

const RU: HashcatText = {
  capturedLabel: 'Перехваченный хэш',
  pmkLabel: 'PMK кандидата',
  hashLabel: 'Хэш кандидата',
  crackTerms: RU_CRACK,
  step0Title: 'Тип атаки — через {attack}',
  step0Pmkid: {
    tooltip: 'PMKID-атаке достаточно одного пакета от роутера.',
    description:
      'Атака через PMKID — современный метод, открытый автором Hashcat в 2018 году. ' +
      'Многие точки доступа в первом же ответе клиенту присылают значение PMKID. ' +
      'Атакующему достаточно одного пакета от роутера. Перехваченный PMKID становится ' +
      '«эталоном» для перебора.',
    formula: 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ MAC_AP ‖ MAC_STA)[0:16]',
    terms: [
      { term: 'PMKID', definition: 'короткое значение, которым роутер «здоровается»; вычислено из PMK и MAC-адресов. Угадан PMK — совпадёт PMKID.' },
      { term: 'Офлайн-атака', definition: 'подбор пароля на своём компьютере, без подключения к сети. Быстро и незаметно.' },
      { term: 'Эталон', definition: 'перехваченное «правильное» значение, с которым сверяют каждый кандидат.' },
      { term: 'Точка доступа', definition: 'роутер, раздающий Wi-Fi.' },
    ],
  },
  step0Eapol: {
    tooltip: 'EAPOL-атаке нужно перехватить рукопожатие целиком.',
    description:
      'Атака через EAPOL — классический метод. Атакующий перехватывает 4-Way Handshake ' +
      'и берёт из него MIC. Чтобы поймать рукопожатие, иногда клиента принудительно ' +
      'отключают (deauth). Перехваченный MIC становится «эталоном» для перебора.',
    formula: 'MIC = HMAC-SHA1(KCK, кадр EAPOL)[0:16]',
    terms: [
      { term: 'EAPOL', definition: 'протокол сообщений рукопожатия WPA2. Из перехваченного кадра EAPOL берут значение MIC.' },
      { term: 'MIC', definition: 'подпись из рукопожатия. Угадан пароль — вычисленный MIC совпадёт с перехваченным.' },
      { term: '4-Way Handshake', definition: 'рукопожатие WPA2 из четырёх сообщений (см. Модуль 1).' },
      { term: 'deauth', definition: 'пакет принудительного отключения; им «сбрасывают» клиента, чтобы тот переподключился и выдал рукопожатие.' },
    ],
  },
  step0Transform: 'Перехват одного хэша из эфира',
  step0Calc: [
    'ПЕРЕХВАЧЕНО из эфира (это всё, что есть у атакующего):',
    '',
    '  тип атаки = {attack}',
    '  MAC точки доступа = {apMac}',
    '  MAC клиента       = {clientMac}',
    '  SSID              = "{ssid}"',
    '',
    '  эталонный хэш ({attack}):',
    '  {captured}',
  ],
  step1Title: 'Строка хэша формата 22000',
  step1Tooltip: 'Перехваченные данные Hashcat хранит одной строкой.',
  step1Description:
    'Режим 22000 («WPA-PBKDF2-PMKID+EAPOL») объединил прежние режимы Hashcat — 16800 ' +
    '(PMKID) и 2500 (EAPOL) — в один универсальный текстовый формат. Вся перехваченная ' +
    'информация записывается одной строкой; поля разделены звёздочками. Именно такую ' +
    'строку «скармливают» утилите Hashcat.',
  step1Formula: 'WPA*<тип>*<хэш>*<MAC AP>*<MAC STA>*<SSID>*<ANonce>*<EAPOL>*<messagepair>',
  step1Terms: [
    { term: 'Hashcat', definition: 'популярная утилита для перебора паролей по хэшам, использующая мощность видеокарт.' },
    { term: 'Режим 22000', definition: 'номер режима Hashcat для паролей Wi-Fi. Объединил прежние режимы 16800 (PMKID) и 2500 (EAPOL).' },
    { term: 'Поле', definition: 'отдельная часть строки. В формате 22000 поля разделяются звёздочкой (*).' },
    { term: 'Тип (01 / 02)', definition: 'первое число после WPA*: 01 — атака через PMKID, 02 — через EAPOL.' },
  ],
  step1Transform: 'Сборка строки WPA*<тип>*<хэш>*...',
  step1Calc: [
    'РАЗБОР перехваченной строки по полям (разделитель — *):',
    '',
    '  WPA      — метка формата',
    '  {typeField}       — тип атаки ({typeName})',
    '  хэш      = {hash}',
    '  MAC AP   = {apMac}',
    '  MAC STA  = {clientMac}',
    '  SSID hex = {ssidHex}',
    '',
    'Полная строка:',
    '  {line}',
  ],
  perWordTitle: 'Проверка слова: «{word}»',
  perWordTooltipMatch: 'Хэш кандидата совпал с перехваченным — пароль найден.',
  perWordTooltipNoMatch: 'Хэш кандидата не совпал — берём следующее слово.',
  perWordDescMatch:
    'Из слова «{word}» функцией PBKDF2 (4096 итераций) получен PMK, а из него — хэш ' +
    'кандидата. Этот хэш совпал с перехваченным эталоном — значит, «{word}» и есть ' +
    'пароль сети. Перебор останавливается.',
  perWordDescNoMatch:
    'Из слова «{word}» функцией PBKDF2 (4096 итераций) получен PMK, а из него — хэш ' +
    'кандидата. Этот хэш не совпал с эталоном — слово не подходит, берётся следующее.',
  perWordFormulaPmkid: "PMKID' = HMAC-SHA1(PBKDF2(слово, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)",
  perWordFormulaEapol: "MIC' = HMAC-SHA1(KCK из PBKDF2(слово, SSID), кадр EAPOL)[0:16]",
  perWordTransform: 'PBKDF2 → PMK → хэш',
  perWordInputLabel: 'слово «{word}»',
  perWordOpPmkid: '2) PMK → HMAC-SHA1(PMK, "PMK Name"‖MAC_AP‖MAC_STA), берём 16 байт',
  perWordOpEapol: '2) PMK → PTK → KCK → HMAC-SHA1(KCK, EAPOL), берём 16 байт',
  perWordVerdictMatch: 'СОВПАЛО ✓ — пароль «{word}» найден!',
  perWordVerdictNoMatch: 'не совпало — слово не подходит',
  perWordCalc: [
    'КАНДИДАТ:  "{word}"',
    '',
    '1) Слово → PBKDF2(слово, SSID="{ssid}", 4096)',
    '   PMK = {pmk}',
    '',
    '{opLine}',
    '   хэш кандидата = {hash}',
    '',
    '3) СВЕРКА с эталоном:',
    '   перехвачено = {captured}',
    '   вычислено   = {hash}',
    '   → {verdict}',
  ],
  badgeMatch: '✓ Хэши совпали',
  badgeNoMatch: '✗ Хэши разные',
  fastTitle: 'Перебор словаря (ускоренный режим)',
  fastTooltip: 'Все слова словаря проверяются разом, без покадровой анимации.',
  fastDescription:
    'Симулятор быстро прогоняет все {count} слов словаря: для каждого по-настоящему ' +
    'вычисляется PBKDF2 (4096 итераций) и сверяется хэш. Пошаговая анимация пропущена, ' +
    'но вычисления и итог настоящие.',
  fastTermName: { term: 'Ускоренный режим', definition: 'режим, в котором пропускается покадровая анимация перебора. Сами вычисления настоящие.' },
  fastTransform: 'PBKDF2 × {count} слов',
  fastCalc: [
    'Прогоняем {count} слов. Для каждого:',
    '  слово → PBKDF2 → PMK → хэш → сверка с эталоном.',
    '',
  ],
  outcomeTitleFound: 'Итог — пароль найден',
  outcomeTitleNotFound: 'Итог — пароль не найден',
  outcomeTooltipFound: 'Слово из словаря дало совпадающий хэш — пароль раскрыт.',
  outcomeTooltipNotFound: 'Ни одно слово не подошло — этого словаря не хватило.',
  outcomeDescFound:
    'Слово «{word}» дало хэш, совпавший с перехваченным, — пароль сети раскрыт. Вывод: ' +
    'короткие и словарные пароли вскрываются офлайн-перебором за минуты. Защита — длинный ' +
    'случайный несловарный пароль, а лучше — переход на WPA3 (Модуль 2).',
  outcomeDescNotFound:
    'Ни одно слово словаря не подошло. Но это не безопасность: в реальной атаке берут ' +
    'словарь побольше (миллионы строк) или перебор по маске. Надёжная защита — длинный ' +
    'несловарный пароль или WPA3.',
  outcomeTerms: [
    { term: 'Словарная атака', definition: 'перебор паролей по готовому списку частых паролей и слов.' },
    { term: 'Перебор по маске', definition: 'перебор всех комбинаций по шаблону (например «8 цифр»).' },
    { term: 'Несловарный пароль', definition: 'пароль, которого нет ни в одном словаре: длинный, случайный, без обычных слов и дат.' },
  ],
  outcomeTransform: 'Сравнение со всеми кандидатами',
  outcomeCalcFound: [
    'РЕЗУЛЬТАТ ПЕРЕБОРА:',
    '',
    '  совпадение на слове № {matchNo}: "{matchWord}"',
    '  эталон     = {captured}',
    '  совпавший  = {matchHash}',
    '',
    '  ПАРОЛЬ СЕТИ РАСКРЫТ.',
  ],
  outcomeCalcNotFound: [
    'РЕЗУЛЬТАТ ПЕРЕБОРА:',
    '',
    '  проверено слов: {count}',
    '  совпадений: нет',
    '',
    '  эталон = {captured}',
    '  ни один кандидат не дал такой хэш.',
  ],
  outcomeBadgeFound: 'Пароль раскрыт',
  outcomeBadgeNotFound: 'Пароль не раскрыт',
};

const UK_CRACK: GlossaryTerm[] = [
  { term: 'PBKDF2', definition: 'функція, що перетворює пароль на ключ PMK за 4096 повторів HMAC-SHA1. Та сама, що в Модулі 1.' },
  { term: 'PMK', definition: 'Pairwise Master Key — 256-бітний ключ, отримуваний із пароля та SSID.' },
  { term: 'Хеш кандидата', definition: 'значення (PMKID або MIC), обчислене з перевірюваного слова. Його звіряють із перехопленим.' },
  { term: 'Словник', definition: 'список слів-кандидатів на роль пароля. У реальній атаці — мільйони рядків.' },
];

const UK: HashcatText = {
  capturedLabel: 'Перехоплений хеш',
  pmkLabel: 'PMK кандидата',
  hashLabel: 'Хеш кандидата',
  crackTerms: UK_CRACK,
  step0Title: 'Тип атаки — через {attack}',
  step0Pmkid: {
    tooltip: 'PMKID-атаці достатньо одного пакета від маршрутизатора.',
    description:
      'Атака через PMKID — сучасний метод, відкритий автором Hashcat у 2018 році. Багато ' +
      'точок доступу у першій же відповіді клієнту надсилають значення PMKID. ' +
      'Атакувальнику достатньо одного пакета від маршрутизатора. Перехоплений PMKID стає ' +
      '«еталоном» для перебору.',
    formula: 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ MAC_AP ‖ MAC_STA)[0:16]',
    terms: [
      { term: 'PMKID', definition: 'коротке значення, яким маршрутизатор «вітається»; обчислене з PMK і MAC-адрес. Угадано PMK — збіжиться PMKID.' },
      { term: 'Офлайн-атака', definition: 'підбір пароля на своєму комп’ютері, без підключення до мережі. Швидко й непомітно.' },
      { term: 'Еталон', definition: 'перехоплене «правильне» значення, з яким звіряють кожен кандидат.' },
      { term: 'Точка доступу', definition: 'маршрутизатор, що роздає Wi-Fi.' },
    ],
  },
  step0Eapol: {
    tooltip: 'EAPOL-атаці потрібно перехопити рукостискання повністю.',
    description:
      'Атака через EAPOL — класичний метод. Атакувальник перехоплює 4-Way Handshake і ' +
      'бере з нього MIC. Щоб спіймати рукостискання, іноді клієнта примусово відключають ' +
      '(deauth). Перехоплений MIC стає «еталоном» для перебору.',
    formula: 'MIC = HMAC-SHA1(KCK, кадр EAPOL)[0:16]',
    terms: [
      { term: 'EAPOL', definition: 'протокол повідомлень рукостискання WPA2. З перехопленого кадру EAPOL беруть значення MIC.' },
      { term: 'MIC', definition: 'підпис із рукостискання. Угадано пароль — обчислений MIC збіжиться з перехопленим.' },
      { term: '4-Way Handshake', definition: 'рукостискання WPA2 із чотирьох повідомлень (див. Модуль 1).' },
      { term: 'deauth', definition: 'пакет примусового відключення; ним «скидають» клієнта, щоб той перепідключився й видав рукостискання.' },
    ],
  },
  step0Transform: 'Перехоплення одного хешу з ефіру',
  step0Calc: [
    'ПЕРЕХОПЛЕНО з ефіру (це все, що є в атакувальника):',
    '',
    '  тип атаки = {attack}',
    '  MAC точки доступу = {apMac}',
    '  MAC клієнта       = {clientMac}',
    '  SSID              = "{ssid}"',
    '',
    '  еталонний хеш ({attack}):',
    '  {captured}',
  ],
  step1Title: 'Рядок хешу формату 22000',
  step1Tooltip: 'Перехоплені дані Hashcat зберігає одним рядком.',
  step1Description:
    'Режим 22000 («WPA-PBKDF2-PMKID+EAPOL») об’єднав колишні режими Hashcat — 16800 ' +
    '(PMKID) і 2500 (EAPOL) — в один універсальний текстовий формат. Уся перехоплена ' +
    'інформація записується одним рядком; поля розділені зірочками. Саме такий рядок ' +
    '«згодовують» утиліті Hashcat.',
  step1Formula: 'WPA*<тип>*<хеш>*<MAC AP>*<MAC STA>*<SSID>*<ANonce>*<EAPOL>*<messagepair>',
  step1Terms: [
    { term: 'Hashcat', definition: 'популярна утиліта для перебору паролів за хешами, що використовує потужність відеокарт.' },
    { term: 'Режим 22000', definition: 'номер режиму Hashcat для паролів Wi-Fi. Об’єднав колишні режими 16800 (PMKID) і 2500 (EAPOL).' },
    { term: 'Поле', definition: 'окрема частина рядка. У форматі 22000 поля розділяються зірочкою (*).' },
    { term: 'Тип (01 / 02)', definition: 'перше число після WPA*: 01 — атака через PMKID, 02 — через EAPOL.' },
  ],
  step1Transform: 'Збирання рядка WPA*<тип>*<хеш>*...',
  step1Calc: [
    'РОЗБІР перехопленого рядка за полями (роздільник — *):',
    '',
    '  WPA      — мітка формату',
    '  {typeField}       — тип атаки ({typeName})',
    '  хеш      = {hash}',
    '  MAC AP   = {apMac}',
    '  MAC STA  = {clientMac}',
    '  SSID hex = {ssidHex}',
    '',
    'Повний рядок:',
    '  {line}',
  ],
  perWordTitle: 'Перевірка слова: «{word}»',
  perWordTooltipMatch: 'Хеш кандидата збігся з перехопленим — пароль знайдено.',
  perWordTooltipNoMatch: 'Хеш кандидата не збігся — беремо наступне слово.',
  perWordDescMatch:
    'Зі слова «{word}» функцією PBKDF2 (4096 ітерацій) отримано PMK, а з нього — хеш ' +
    'кандидата. Цей хеш збігся з перехопленим еталоном — отже, «{word}» і є пароль ' +
    'мережі. Перебір зупиняється.',
  perWordDescNoMatch:
    'Зі слова «{word}» функцією PBKDF2 (4096 ітерацій) отримано PMK, а з нього — хеш ' +
    'кандидата. Цей хеш не збігся з еталоном — слово не підходить, береться наступне.',
  perWordFormulaPmkid: "PMKID' = HMAC-SHA1(PBKDF2(слово, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)",
  perWordFormulaEapol: "MIC' = HMAC-SHA1(KCK із PBKDF2(слово, SSID), кадр EAPOL)[0:16]",
  perWordTransform: 'PBKDF2 → PMK → хеш',
  perWordInputLabel: 'слово «{word}»',
  perWordOpPmkid: '2) PMK → HMAC-SHA1(PMK, "PMK Name"‖MAC_AP‖MAC_STA), беремо 16 байтів',
  perWordOpEapol: '2) PMK → PTK → KCK → HMAC-SHA1(KCK, EAPOL), беремо 16 байтів',
  perWordVerdictMatch: 'ЗБІГЛОСЯ ✓ — пароль «{word}» знайдено!',
  perWordVerdictNoMatch: 'не збіглося — слово не підходить',
  perWordCalc: [
    'КАНДИДАТ:  "{word}"',
    '',
    '1) Слово → PBKDF2(слово, SSID="{ssid}", 4096)',
    '   PMK = {pmk}',
    '',
    '{opLine}',
    '   хеш кандидата = {hash}',
    '',
    '3) ЗВІРКА з еталоном:',
    '   перехоплено = {captured}',
    '   обчислено   = {hash}',
    '   → {verdict}',
  ],
  badgeMatch: '✓ Хеші збіглися',
  badgeNoMatch: '✗ Хеші різні',
  fastTitle: 'Перебір словника (прискорений режим)',
  fastTooltip: 'Усі слова словника перевіряються разом, без покадрової анімації.',
  fastDescription:
    'Симулятор швидко проганяє всі {count} слів словника: для кожного справді ' +
    'обчислюється PBKDF2 (4096 ітерацій) і звіряється хеш. Покадрову анімацію пропущено, ' +
    'але обчислення та підсумок справжні.',
  fastTermName: { term: 'Прискорений режим', definition: 'режим, у якому пропускається покадрова анімація перебору. Самі обчислення справжні.' },
  fastTransform: 'PBKDF2 × {count} слів',
  fastCalc: [
    'Проганяємо {count} слів. Для кожного:',
    '  слово → PBKDF2 → PMK → хеш → звірка з еталоном.',
    '',
  ],
  outcomeTitleFound: 'Підсумок — пароль знайдено',
  outcomeTitleNotFound: 'Підсумок — пароль не знайдено',
  outcomeTooltipFound: 'Слово зі словника дало хеш, що збігся, — пароль розкрито.',
  outcomeTooltipNotFound: 'Жодне слово не підійшло — цього словника не вистачило.',
  outcomeDescFound:
    'Слово «{word}» дало хеш, що збігся з перехопленим, — пароль мережі розкрито. ' +
    'Висновок: короткі та словникові паролі розкриваються офлайн-перебором за хвилини. ' +
    'Захист — довгий випадковий несловниковий пароль, а краще — перехід на WPA3 ' +
    '(Модуль 2).',
  outcomeDescNotFound:
    'Жодне слово словника не підійшло. Але це не безпека: у реальній атаці беруть ' +
    'словник більший (мільйони рядків) або перебір за маскою. Надійний захист — довгий ' +
    'несловниковий пароль або WPA3.',
  outcomeTerms: [
    { term: 'Словникова атака', definition: 'перебір паролів за готовим списком частих паролів і слів.' },
    { term: 'Перебір за маскою', definition: 'перебір усіх комбінацій за шаблоном (наприклад «8 цифр»).' },
    { term: 'Несловниковий пароль', definition: 'пароль, якого немає в жодному словнику: довгий, випадковий, без звичайних слів і дат.' },
  ],
  outcomeTransform: 'Порівняння з усіма кандидатами',
  outcomeCalcFound: [
    'РЕЗУЛЬТАТ ПЕРЕБОРУ:',
    '',
    '  збіг на слові № {matchNo}: "{matchWord}"',
    '  еталон    = {captured}',
    '  збіглося  = {matchHash}',
    '',
    '  ПАРОЛЬ МЕРЕЖІ РОЗКРИТО.',
  ],
  outcomeCalcNotFound: [
    'РЕЗУЛЬТАТ ПЕРЕБОРУ:',
    '',
    '  перевірено слів: {count}',
    '  збігів: немає',
    '',
    '  еталон = {captured}',
    '  жоден кандидат не дав такого хешу.',
  ],
  outcomeBadgeFound: 'Пароль розкрито',
  outcomeBadgeNotFound: 'Пароль не розкрито',
};

const EN_CRACK: GlossaryTerm[] = [
  { term: 'PBKDF2', definition: 'the function that turns a password into the PMK key in 4096 HMAC-SHA1 repetitions. The same one as in Module 1.' },
  { term: 'PMK', definition: 'Pairwise Master Key — a 256-bit key derived from the password and the SSID.' },
  { term: 'Candidate hash', definition: 'a value (PMKID or MIC) computed from the word being tested. It is compared with the captured one.' },
  { term: 'Dictionary', definition: 'a list of candidate words for the password. In a real attack — millions of lines.' },
];

const EN: HashcatText = {
  capturedLabel: 'Captured hash',
  pmkLabel: 'Candidate PMK',
  hashLabel: 'Candidate hash',
  crackTerms: EN_CRACK,
  step0Title: 'Attack type — via {attack}',
  step0Pmkid: {
    tooltip: 'A PMKID attack needs only one packet from the router.',
    description:
      'The PMKID attack is a modern method, discovered by Hashcat’s author in 2018. Many ' +
      'access points send a PMKID value in their very first reply to a client. The ' +
      'attacker needs only one packet from the router. The captured PMKID becomes the ' +
      '“reference” for cracking.',
    formula: 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ MAC_AP ‖ MAC_STA)[0:16]',
    terms: [
      { term: 'PMKID', definition: 'a short value with which the router “says hello”; computed from the PMK and MAC addresses. Guess the PMK right and the PMKID matches.' },
      { term: 'Offline attack', definition: 'guessing the password on one’s own computer, with no connection to the network. Fast and unnoticeable.' },
      { term: 'Reference', definition: 'the captured “correct” value against which every candidate is checked.' },
      { term: 'Access point', definition: 'a router that broadcasts Wi-Fi.' },
    ],
  },
  step0Eapol: {
    tooltip: 'An EAPOL attack needs to capture the whole handshake.',
    description:
      'The EAPOL attack is the classic method. The attacker captures the 4-Way Handshake ' +
      'and takes the MIC from it. To catch the handshake, the client is sometimes forcibly ' +
      'disconnected (deauth). The captured MIC becomes the “reference” for cracking.',
    formula: 'MIC = HMAC-SHA1(KCK, EAPOL frame)[0:16]',
    terms: [
      { term: 'EAPOL', definition: 'the protocol of WPA2 handshake messages. The MIC value is taken from a captured EAPOL frame.' },
      { term: 'MIC', definition: 'the signature from the handshake. Guess the password right and the computed MIC matches the captured one.' },
      { term: '4-Way Handshake', definition: 'the WPA2 handshake of four messages (see Module 1).' },
      { term: 'deauth', definition: 'a forced-disconnect packet; it “drops” the client so it reconnects and yields a handshake.' },
    ],
  },
  step0Transform: 'Capturing one hash from the air',
  step0Calc: [
    'CAPTURED from the air (this is all the attacker has):',
    '',
    '  attack type = {attack}',
    '  access point MAC = {apMac}',
    '  client MAC       = {clientMac}',
    '  SSID             = "{ssid}"',
    '',
    '  reference hash ({attack}):',
    '  {captured}',
  ],
  step1Title: 'Hash string, format 22000',
  step1Tooltip: 'Hashcat keeps the captured data as a single line.',
  step1Description:
    'Mode 22000 (“WPA-PBKDF2-PMKID+EAPOL”) merged the former Hashcat modes — 16800 ' +
    '(PMKID) and 2500 (EAPOL) — into one universal text format. All captured information ' +
    'is written as a single line; fields are separated by asterisks. This is exactly the ' +
    'line fed to the Hashcat tool.',
  step1Formula: 'WPA*<type>*<hash>*<AP MAC>*<STA MAC>*<SSID>*<ANonce>*<EAPOL>*<messagepair>',
  step1Terms: [
    { term: 'Hashcat', definition: 'a popular tool for cracking passwords from hashes, using the power of GPUs.' },
    { term: 'Mode 22000', definition: 'the Hashcat mode number for Wi-Fi passwords. It merged the former modes 16800 (PMKID) and 2500 (EAPOL).' },
    { term: 'Field', definition: 'a separate part of the line. In the 22000 format fields are separated by an asterisk (*).' },
    { term: 'Type (01 / 02)', definition: 'the first number after WPA*: 01 — a PMKID attack, 02 — an EAPOL attack.' },
  ],
  step1Transform: 'Building the WPA*<type>*<hash>*... line',
  step1Calc: [
    'PARSING the captured line into fields (separator — *):',
    '',
    '  WPA      — format marker',
    '  {typeField}       — attack type ({typeName})',
    '  hash     = {hash}',
    '  AP MAC   = {apMac}',
    '  STA MAC  = {clientMac}',
    '  SSID hex = {ssidHex}',
    '',
    'Full line:',
    '  {line}',
  ],
  perWordTitle: 'Testing the word: “{word}”',
  perWordTooltipMatch: 'The candidate hash matched the captured one — the password is found.',
  perWordTooltipNoMatch: 'The candidate hash did not match — take the next word.',
  perWordDescMatch:
    'From the word “{word}” the function PBKDF2 (4096 iterations) produced a PMK, and from ' +
    'it the candidate hash. This hash matched the captured reference — so “{word}” is the ' +
    'network password. The search stops.',
  perWordDescNoMatch:
    'From the word “{word}” the function PBKDF2 (4096 iterations) produced a PMK, and from ' +
    'it the candidate hash. This hash did not match the reference — the word does not fit, ' +
    'the next one is taken.',
  perWordFormulaPmkid: "PMKID' = HMAC-SHA1(PBKDF2(word, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)",
  perWordFormulaEapol: "MIC' = HMAC-SHA1(KCK from PBKDF2(word, SSID), EAPOL frame)[0:16]",
  perWordTransform: 'PBKDF2 → PMK → hash',
  perWordInputLabel: 'word “{word}”',
  perWordOpPmkid: '2) PMK → HMAC-SHA1(PMK, "PMK Name"‖MAC_AP‖MAC_STA), keep 16 bytes',
  perWordOpEapol: '2) PMK → PTK → KCK → HMAC-SHA1(KCK, EAPOL), keep 16 bytes',
  perWordVerdictMatch: 'MATCHED ✓ — the password “{word}” is found!',
  perWordVerdictNoMatch: 'no match — the word does not fit',
  perWordCalc: [
    'CANDIDATE:  "{word}"',
    '',
    '1) Word → PBKDF2(word, SSID="{ssid}", 4096)',
    '   PMK = {pmk}',
    '',
    '{opLine}',
    '   candidate hash = {hash}',
    '',
    '3) CHECK against the reference:',
    '   captured = {captured}',
    '   computed = {hash}',
    '   → {verdict}',
  ],
  badgeMatch: '✓ Hashes match',
  badgeNoMatch: '✗ Hashes differ',
  fastTitle: 'Dictionary search (fast mode)',
  fastTooltip: 'All dictionary words are checked at once, without frame-by-frame animation.',
  fastDescription:
    'The simulator quickly runs through all {count} dictionary words: for each one PBKDF2 ' +
    '(4096 iterations) is genuinely computed and the hash is checked. The frame-by-frame ' +
    'animation is skipped, but the computation and the result are real.',
  fastTermName: { term: 'Fast mode', definition: 'a mode in which the frame-by-frame animation of the search is skipped. The computation itself is real.' },
  fastTransform: 'PBKDF2 × {count} words',
  fastCalc: [
    'Running through {count} words. For each one:',
    '  word → PBKDF2 → PMK → hash → check against the reference.',
    '',
  ],
  outcomeTitleFound: 'Result — password found',
  outcomeTitleNotFound: 'Result — password not found',
  outcomeTooltipFound: 'A dictionary word produced a matching hash — the password is revealed.',
  outcomeTooltipNotFound: 'No word fit — this dictionary was not enough.',
  outcomeDescFound:
    'The word “{word}” produced a hash matching the captured one — the network password ' +
    'is revealed. Takeaway: short and dictionary passwords are cracked offline in minutes. ' +
    'The defence is a long random non-dictionary password, and better still — switching to ' +
    'WPA3 (Module 2).',
  outcomeDescNotFound:
    'No dictionary word fit. But that is not security: in a real attack one takes a bigger ' +
    'dictionary (millions of lines) or a mask-based search. Reliable protection is a long ' +
    'non-dictionary password or WPA3.',
  outcomeTerms: [
    { term: 'Dictionary attack', definition: 'cracking passwords against a ready-made list of common passwords and words.' },
    { term: 'Mask-based search', definition: 'trying all combinations matching a pattern (for example “8 digits”).' },
    { term: 'Non-dictionary password', definition: 'a password not in any dictionary: long, random, without ordinary words or dates.' },
  ],
  outcomeTransform: 'Comparison against all candidates',
  outcomeCalcFound: [
    'SEARCH RESULT:',
    '',
    '  match on word #{matchNo}: "{matchWord}"',
    '  reference = {captured}',
    '  matched   = {matchHash}',
    '',
    '  THE NETWORK PASSWORD IS REVEALED.',
  ],
  outcomeCalcNotFound: [
    'SEARCH RESULT:',
    '',
    '  words checked: {count}',
    '  matches: none',
    '',
    '  reference = {captured}',
    '  no candidate produced that hash.',
  ],
  outcomeBadgeFound: 'Password revealed',
  outcomeBadgeNotFound: 'Password not revealed',
};

/** Текст шагов Hashcat 22000 по языку. */
export const HASHCAT_TEXT: Record<Lang, HashcatText> = { ru: RU, uk: UK, en: EN };
