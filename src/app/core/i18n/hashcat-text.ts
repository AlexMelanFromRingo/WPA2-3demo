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
  perWordTerms: GlossaryTerm[];
  /** Блок «Вычисление»: общее начало (шаг A — PBKDF2 → PMK). */
  perWordCalcHead: string[];
  /** Блок «Вычисление»: шаг B для атаки PMKID. */
  perWordCalcOpPmkid: string[];
  /** Блок «Вычисление»: шаг B для атаки EAPOL. */
  perWordCalcOpEapol: string[];
  /** Блок «Вычисление»: общий хвост (шаг C — сверка). */
  perWordCalcTail: string[];
  perWordVerdictMatch: string;
  perWordVerdictNoMatch: string;
  perWordByteCaptionPmkid: string;
  perWordByteCaptionEapol: string;
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
  { term: 'PMK', definition: 'Pairwise Master Key — 256-битный (32 байта) ключ, получаемый из пароля и SSID.' },
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
    'Проверяем слово «{word}» как возможный пароль. Сначала функция PBKDF2 (4096 ' +
    'повторов HMAC-SHA1) превращает слово в 32-байтный мастер-ключ PMK. Затем из PMK по ' +
    'формуле стандарта вычисляется 16-байтный хэш-кандидат. Этот хэш побайтово ' +
    'сравнивается с перехваченным эталоном — и здесь они СОВПАЛИ. Значит, «{word}» и ' +
    'есть пароль сети: перебор останавливается.',
  perWordDescNoMatch:
    'Проверяем слово «{word}» как возможный пароль. Сначала функция PBKDF2 (4096 ' +
    'повторов HMAC-SHA1) превращает слово в 32-байтный мастер-ключ PMK. Затем из PMK по ' +
    'формуле стандарта вычисляется 16-байтный хэш-кандидат. Этот хэш побайтово ' +
    'сравнивается с перехваченным эталоном — и здесь они РАЗОШЛИСЬ хотя бы в одном ' +
    'байте. Значит, «{word}» — не пароль; берётся следующее слово словаря.',
  perWordFormulaPmkid: "PMKID' = HMAC-SHA1(PBKDF2(слово, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)[0:16]",
  perWordFormulaEapol: "MIC' = HMAC-SHA1(KCK из PBKDF2(слово, SSID), кадр EAPOL)[0:16]",
  perWordTransform: 'PBKDF2 → PMK → хэш',
  perWordInputLabel: 'слово «{word}»',
  perWordTerms: [
    ...RU_CRACK,
    { term: 'HMAC-SHA1', definition: 'функция-«подпись»: берёт ключ и сообщение, выдаёт РОВНО 20 байт «отпечатка». Без знания ключа подделать его нельзя.' },
    { term: 'Конкатенация (‖)', definition: 'склейка кусков байт в один — подряд, друг за другом, без разделителей. Знак ‖ читается «приписать следом». Порядок кусков фиксирован и менять его нельзя.' },
    { term: 'Усечение (truncation)', definition: 'обрезка результата до нужной длины. Здесь из 20 байт HMAC-SHA1 оставляют первые 16, а последние 4 отбрасывают.' },
    { term: 'Индекс байта', definition: 'порядковый номер байта, счёт с нуля: первый байт — индекс 0, шестнадцатый — индекс 15, двадцатый — индекс 19.' },
  ],
  perWordCalcHead: [
    'КАНДИДАТ:  "{word}"',
    '',
    'ШАГ A — из слова получаем мастер-ключ PMK',
    '  PBKDF2-HMAC-SHA1(пароль = "{word}", соль = SSID = "{ssid}", 4096 повторов)',
    '  PMK (32 байта) = {pmk}',
    '',
  ],
  perWordCalcOpPmkid: [
    'ШАГ B — из PMK получаем PMKID',
    '  Сначала собираем «сообщение» для HMAC. Это КОНКАТЕНАЦИЯ (‖) —',
    '  три куска байт склеиваются подряд, без разделителей:',
    '    «PMK Name»  = {pmkNameHex}   (8 байт, ASCII-текст)',
    '    MAC AP      = {apMacHex}             (6 байт)',
    '    MAC клиента = {clientMacHex}             (6 байт)',
    '  Порядок строго такой: «PMK Name», затем MAC AP, затем MAC клиента.',
    '  сообщение (20 байт) = {pmkNameHex}{apMacHex}{clientMacHex}',
    '',
    '  HMAC-SHA1(ключ = PMK, сообщение)  →  20 байт.',
    '  PMKID — это ПЕРВЫЕ 16 байт результата (индексы 0–15);',
    '  последние 4 байта (индексы 16–19) ОТБРАСЫВАЮТСЯ.',
    '  Почему 16? Стандарт IEEE 802.11 определяет PMKID как 128-битное',
    '  (т.е. 16-байтное) значение. См. байтовую диаграмму ниже.',
    '  PMKID-кандидат = {hash}',
    '',
  ],
  perWordCalcOpEapol: [
    'ШАГ B — из PMK получаем MIC',
    '  Сначала из PMK выводят рабочий ключ PTK (функцией PRF-512, как в',
    '  Модуле 1), а из PTK берут первые 16 байт — это ключ KCK.',
    '  Затем считают подпись перехваченного кадра рукопожатия:',
    '  HMAC-SHA1(ключ = KCK, кадр EAPOL)  →  20 байт.',
    '  MIC — это ПЕРВЫЕ 16 байт результата (индексы 0–15);',
    '  последние 4 байта (индексы 16–19) ОТБРАСЫВАЮТСЯ.',
    '  Почему 16? В кадре EAPOL-Key поле MIC занимает ровно 16 байт',
    '  (IEEE 802.11). См. байтовую диаграмму ниже.',
    '  MIC-кандидат = {hash}',
    '',
  ],
  perWordCalcTail: [
    'ШАГ C — сверка с перехваченным эталоном',
    '  перехвачено (эталон) = {captured}',
    '  вычислено (кандидат) = {hash}',
    '  Сравниваем побайтово, слева направо. {verdict}',
  ],
  perWordVerdictMatch: 'Все 16 байт совпали → пароль «{word}» найден!',
  perWordVerdictNoMatch: 'Уже в одном из байт расхождение → слово не подходит.',
  perWordByteCaptionPmkid:
    'HMAC-SHA1 всегда выдаёт 20 байт. Зелёные ячейки (индексы 0–15) — это PMKID, их ' +
    'берут. Серые с «✕» (16–19) — отбрасывают. Размер PMKID 16 байт (128 бит) задан ' +
    'стандартом IEEE 802.11.',
  perWordByteCaptionEapol:
    'HMAC-SHA1 всегда выдаёт 20 байт. Зелёные ячейки (индексы 0–15) — это MIC, их берут. ' +
    'Серые с «✕» (16–19) — отбрасывают. Поле MIC в кадре EAPOL-Key — ровно 16 байт ' +
    '(IEEE 802.11).',
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
  { term: 'PMK', definition: 'Pairwise Master Key — 256-бітний (32 байти) ключ, отримуваний із пароля та SSID.' },
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
    'Перевіряємо слово «{word}» як можливий пароль. Спершу функція PBKDF2 (4096 ' +
    'повторів HMAC-SHA1) перетворює слово на 32-байтний майстер-ключ PMK. Потім із PMK ' +
    'за формулою стандарту обчислюється 16-байтний хеш-кандидат. Цей хеш побайтово ' +
    'порівнюється з перехопленим еталоном — і тут вони ЗБІГЛИСЯ. Отже, «{word}» і є ' +
    'пароль мережі: перебір зупиняється.',
  perWordDescNoMatch:
    'Перевіряємо слово «{word}» як можливий пароль. Спершу функція PBKDF2 (4096 ' +
    'повторів HMAC-SHA1) перетворює слово на 32-байтний майстер-ключ PMK. Потім із PMK ' +
    'за формулою стандарту обчислюється 16-байтний хеш-кандидат. Цей хеш побайтово ' +
    'порівнюється з перехопленим еталоном — і тут вони РОЗІЙШЛИСЯ хоча б в одному ' +
    'байті. Отже, «{word}» — не пароль; береться наступне слово словника.',
  perWordFormulaPmkid: "PMKID' = HMAC-SHA1(PBKDF2(слово, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)[0:16]",
  perWordFormulaEapol: "MIC' = HMAC-SHA1(KCK із PBKDF2(слово, SSID), кадр EAPOL)[0:16]",
  perWordTransform: 'PBKDF2 → PMK → хеш',
  perWordInputLabel: 'слово «{word}»',
  perWordTerms: [
    ...UK_CRACK,
    { term: 'HMAC-SHA1', definition: 'функція-«підпис»: бере ключ і повідомлення, видає РІВНО 20 байтів «відбитка». Без знання ключа підробити його не можна.' },
    { term: 'Конкатенація (‖)', definition: 'склейка шматків байтів в один — підряд, один за одним, без роздільників. Знак ‖ читається «дописати слідом». Порядок шматків фіксований і змінювати його не можна.' },
    { term: 'Усічення (truncation)', definition: 'обрізання результату до потрібної довжини. Тут із 20 байтів HMAC-SHA1 лишають перші 16, а останні 4 відкидають.' },
    { term: 'Індекс байта', definition: 'порядковий номер байта, лік із нуля: перший байт — індекс 0, шістнадцятий — індекс 15, двадцятий — індекс 19.' },
  ],
  perWordCalcHead: [
    'КАНДИДАТ:  "{word}"',
    '',
    'КРОК A — зі слова отримуємо майстер-ключ PMK',
    '  PBKDF2-HMAC-SHA1(пароль = "{word}", сіль = SSID = "{ssid}", 4096 повторів)',
    '  PMK (32 байти) = {pmk}',
    '',
  ],
  perWordCalcOpPmkid: [
    'КРОК B — із PMK отримуємо PMKID',
    '  Спершу збираємо «повідомлення» для HMAC. Це КОНКАТЕНАЦІЯ (‖) —',
    '  три шматки байтів склеюються підряд, без роздільників:',
    '    «PMK Name»  = {pmkNameHex}   (8 байтів, ASCII-текст)',
    '    MAC AP      = {apMacHex}             (6 байтів)',
    '    MAC клієнта = {clientMacHex}             (6 байтів)',
    '  Порядок строго такий: «PMK Name», потім MAC AP, потім MAC клієнта.',
    '  повідомлення (20 байтів) = {pmkNameHex}{apMacHex}{clientMacHex}',
    '',
    '  HMAC-SHA1(ключ = PMK, повідомлення)  →  20 байтів.',
    '  PMKID — це ПЕРШІ 16 байтів результату (індекси 0–15);',
    '  останні 4 байти (індекси 16–19) ВІДКИДАЮТЬСЯ.',
    '  Чому 16? Стандарт IEEE 802.11 визначає PMKID як 128-бітне',
    '  (тобто 16-байтне) значення. Див. байтову діаграму нижче.',
    '  PMKID-кандидат = {hash}',
    '',
  ],
  perWordCalcOpEapol: [
    'КРОК B — із PMK отримуємо MIC',
    '  Спершу з PMK виводять робочий ключ PTK (функцією PRF-512, як у',
    '  Модулі 1), а з PTK беруть перші 16 байтів — це ключ KCK.',
    '  Потім рахують підпис перехопленого кадру рукостискання:',
    '  HMAC-SHA1(ключ = KCK, кадр EAPOL)  →  20 байтів.',
    '  MIC — це ПЕРШІ 16 байтів результату (індекси 0–15);',
    '  останні 4 байти (індекси 16–19) ВІДКИДАЮТЬСЯ.',
    '  Чому 16? У кадрі EAPOL-Key поле MIC займає рівно 16 байтів',
    '  (IEEE 802.11). Див. байтову діаграму нижче.',
    '  MIC-кандидат = {hash}',
    '',
  ],
  perWordCalcTail: [
    'КРОК C — звірка з перехопленим еталоном',
    '  перехоплено (еталон) = {captured}',
    '  обчислено (кандидат) = {hash}',
    '  Порівнюємо побайтово, зліва направо. {verdict}',
  ],
  perWordVerdictMatch: 'Усі 16 байтів збіглися → пароль «{word}» знайдено!',
  perWordVerdictNoMatch: 'Уже в одному з байтів розбіжність → слово не підходить.',
  perWordByteCaptionPmkid:
    'HMAC-SHA1 завжди видає 20 байтів. Зелені клітинки (індекси 0–15) — це PMKID, їх ' +
    'беруть. Сірі з «✕» (16–19) — відкидають. Розмір PMKID 16 байтів (128 бітів) задано ' +
    'стандартом IEEE 802.11.',
  perWordByteCaptionEapol:
    'HMAC-SHA1 завжди видає 20 байтів. Зелені клітинки (індекси 0–15) — це MIC, їх ' +
    'беруть. Сірі з «✕» (16–19) — відкидають. Поле MIC у кадрі EAPOL-Key — рівно 16 ' +
    'байтів (IEEE 802.11).',
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
  { term: 'PMK', definition: 'Pairwise Master Key — a 256-bit (32-byte) key derived from the password and the SSID.' },
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
    'We test the word “{word}” as a possible password. First the function PBKDF2 (4096 ' +
    'HMAC-SHA1 repetitions) turns the word into a 32-byte master key PMK. Then, by the ' +
    'standard’s formula, a 16-byte candidate hash is computed from the PMK. This hash is ' +
    'compared byte by byte with the captured reference — and here they MATCHED. So ' +
    '“{word}” is the network password: the search stops.',
  perWordDescNoMatch:
    'We test the word “{word}” as a possible password. First the function PBKDF2 (4096 ' +
    'HMAC-SHA1 repetitions) turns the word into a 32-byte master key PMK. Then, by the ' +
    'standard’s formula, a 16-byte candidate hash is computed from the PMK. This hash is ' +
    'compared byte by byte with the captured reference — and here they DIFFERED in at ' +
    'least one byte. So “{word}” is not the password; the next dictionary word is taken.',
  perWordFormulaPmkid: "PMKID' = HMAC-SHA1(PBKDF2(word, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)[0:16]",
  perWordFormulaEapol: "MIC' = HMAC-SHA1(KCK from PBKDF2(word, SSID), EAPOL frame)[0:16]",
  perWordTransform: 'PBKDF2 → PMK → hash',
  perWordInputLabel: 'word “{word}”',
  perWordTerms: [
    ...EN_CRACK,
    { term: 'HMAC-SHA1', definition: 'a “signature” function: it takes a key and a message and outputs EXACTLY 20 bytes of “fingerprint”. Without the key it cannot be forged.' },
    { term: 'Concatenation (‖)', definition: 'gluing chunks of bytes into one — back to back, with no separators. The ‖ sign reads “append after”. The order of the chunks is fixed and must not be changed.' },
    { term: 'Truncation', definition: 'cutting the result to the required length. Here, of the 20 bytes of HMAC-SHA1 the first 16 are kept and the last 4 are discarded.' },
    { term: 'Byte index', definition: 'the ordinal number of a byte, counting from zero: the first byte is index 0, the sixteenth is index 15, the twentieth is index 19.' },
  ],
  perWordCalcHead: [
    'CANDIDATE:  "{word}"',
    '',
    'STEP A — from the word we get the master key PMK',
    '  PBKDF2-HMAC-SHA1(password = "{word}", salt = SSID = "{ssid}", 4096 repetitions)',
    '  PMK (32 bytes) = {pmk}',
    '',
  ],
  perWordCalcOpPmkid: [
    'STEP B — from the PMK we get the PMKID',
    '  First we build the “message” for HMAC. This is CONCATENATION (‖) —',
    '  three chunks of bytes glued back to back, with no separators:',
    '    "PMK Name"  = {pmkNameHex}   (8 bytes, ASCII text)',
    '    AP MAC      = {apMacHex}             (6 bytes)',
    '    Client MAC  = {clientMacHex}             (6 bytes)',
    '  The order is strictly: "PMK Name", then AP MAC, then Client MAC.',
    '  message (20 bytes) = {pmkNameHex}{apMacHex}{clientMacHex}',
    '',
    '  HMAC-SHA1(key = PMK, message)  →  20 bytes.',
    '  The PMKID is the FIRST 16 bytes of the result (indices 0–15);',
    '  the last 4 bytes (indices 16–19) are DISCARDED.',
    '  Why 16? The IEEE 802.11 standard defines the PMKID as a 128-bit',
    '  (that is, 16-byte) value. See the byte diagram below.',
    '  candidate PMKID = {hash}',
    '',
  ],
  perWordCalcOpEapol: [
    'STEP B — from the PMK we get the MIC',
    '  First the working key PTK is derived from the PMK (by the PRF-512',
    '  function, as in Module 1), and the first 16 bytes of the PTK are',
    '  taken — that is the KCK key. Then the signature of the captured',
    '  handshake frame is computed:',
    '  HMAC-SHA1(key = KCK, EAPOL frame)  →  20 bytes.',
    '  The MIC is the FIRST 16 bytes of the result (indices 0–15);',
    '  the last 4 bytes (indices 16–19) are DISCARDED.',
    '  Why 16? In the EAPOL-Key frame the MIC field is exactly 16 bytes',
    '  (IEEE 802.11). See the byte diagram below.',
    '  candidate MIC = {hash}',
    '',
  ],
  perWordCalcTail: [
    'STEP C — check against the captured reference',
    '  captured (reference) = {captured}',
    '  computed (candidate) = {hash}',
    '  Compare byte by byte, left to right. {verdict}',
  ],
  perWordVerdictMatch: 'All 16 bytes matched → the password “{word}” is found!',
  perWordVerdictNoMatch: 'Already one of the bytes differs → the word does not fit.',
  perWordByteCaptionPmkid:
    'HMAC-SHA1 always outputs 20 bytes. The green cells (indices 0–15) are the PMKID — ' +
    'they are kept. The grey ones with “✕” (16–19) are discarded. The 16-byte (128-bit) ' +
    'size of the PMKID is set by the IEEE 802.11 standard.',
  perWordByteCaptionEapol:
    'HMAC-SHA1 always outputs 20 bytes. The green cells (indices 0–15) are the MIC — they ' +
    'are kept. The grey ones with “✕” (16–19) are discarded. The MIC field in the ' +
    'EAPOL-Key frame is exactly 16 bytes (IEEE 802.11).',
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
