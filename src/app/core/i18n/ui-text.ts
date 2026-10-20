/**
 * Словарь строк интерфейса на трёх языках (UA / EN / RU).
 * Учебный контент (теория, шаги) переводится отдельными структурами.
 */

/** Поддерживаемые языки. */
export type Lang = 'uk' | 'en' | 'ru';

/** Список языков для переключателя. */
export const LANGS: readonly { code: Lang; label: string }[] = [
  { code: 'uk', label: 'UA' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
];

const RU = {
  appTitle: 'Методичка Wi-Fi: WPA2 · WPA3 · Hashcat 22000',
  appSubtitle: 'Интерактивная визуальная методичка по безопасности Wi-Fi для новичков',
  themeToDark: '🌙 Тёмная',
  themeToLight: '☀ Светлая',
  paramsTitle: '⚙ Параметры сети (общий сценарий для всех модулей)',
  paramSsid: 'SSID (имя сети)',
  paramPass: 'Пароль сети',
  paramApMac: 'MAC точки доступа',
  paramClientMac: 'MAC клиента',
  paramANonce: 'ANonce (hex, 32 байта)',
  paramSNonce: 'SNonce (hex, 32 байта)',
  paramGtk: 'GTK — групповой ключ (hex, 16 байт)',
  paramIgtk: 'IGTK — ключ PMF (hex, 16 байт)',
  debounceNote:
    'Изменения применяются с задержкой 500 мс — тяжёлый пересчёт ключей не запускается ' +
    'на каждое нажатие клавиши.',
  tabWpa2: '1 · WPA2 Handshake',
  tabWpa3: '2 · WPA3 SAE',
  tabHashcat: '3 · Hashcat 22000',
  tabGuide: 'Справочник',
  docGuide: 'Справочник WPA2/WPA3',
  appShort: 'Методичка Wi-Fi',
  footerNote:
    'Учебный проект: все вычисления выполняются в вашем браузере, данные никуда не ' +
    'отправляются. Атаки только моделируются на значениях, которые вы ввели сами.',
  navLabel: 'Разделы методички',
  langLabel: 'Язык интерфейса',
  gToc: 'Содержание',
  gTocMobile: 'Содержание справочника',
  gPlay: '▶ Показать по шагам',
  gShowAll: '■ Показать всё',
  gSecured: 'защищено ключами сеанса',
  gTagCommon: 'основы',
  gTagWpa2: 'WPA2',
  gTagWpa3: 'WPA3',
  gTagAttack: 'атаки',
  gBytesShort: 'Б',
  gToTop: '↑ К началу',
  gTerms: 'Термины',

  errParams: 'Проверьте параметры сети:',
  progStep: 'Шаг',
  progOf: 'из',

  m1Title: 'Модуль 1 — WPA2 4-Way Handshake',
  m1Subtitle: 'Как из пароля сети рождаются ключи сеанса: PMK → PTK → сообщения M1–M4 → установка ключей.',
  m1Recompute: '↻ Пересчитать ключи',
  m1Computing:
    '⏳ Вычисляем ключи… PBKDF2 на 4096 итераций выполняется в фоновом потоке.',

  m2Title: 'Модуль 2 — WPA3 SAE (Dragonfly)',
  m2Subtitle: 'SAE по IEEE 802.11-2020: PWE, Commit, Confirm и 4-Way Handshake — и почему пароль нельзя подобрать офлайн.',
  m2Recompute: '↻ Пересчитать обмен',
  m2Computing: '⏳ Выполняем обмен SAE на кривой P-256 — в фоновом потоке.',
  m2Converged:
    '✓ Точка доступа и клиент независимо сошлись к одному общему секрету — пароль ' +
    'подтверждён, и при этом он ни разу не «прозвучал» в эфире.',

  m3Title: 'Модуль 3 — Симулятор Hashcat 22000',
  m3Subtitle: 'Как офлайн-перебор подбирает пароль Wi-Fi по перехваченному хэшу.',
  m3FastOn: '⏩ Ускоренный перебор: вкл',
  m3FastOff: '⏩ Ускоренный перебор: выкл',
  m3Notice:
    '⚠ Это строго образовательная симуляция математики офлайн-атаки. Реального захвата ' +
    'трафика и сетевого взаимодействия не происходит — все вычисления идут только над ' +
    'данными, которые вы ввели сами.',
  m3Computing:
    '⏳ Идёт перебор словаря — для каждого слова по-настоящему считается PBKDF2.',
  m3LineLabel: 'Строка хэша формата 22000',
  m3ErrParams: 'Проверьте параметры:',
  m3NoWords: 'Добавьте хотя бы одно слово в мини-словарь.',

  cpBack: '← Назад',
  cpForward: 'Вперёд →',
  cpPlay: '▶ Авто',
  cpPause: '⏸ Пауза',
  cpSlow: 'Медленно',
  cpMed: 'Средне',
  cpFast: 'Быстро',
  cpSpeed: 'Скорость авто-проигрывания',

  tpTheory: 'Теория',
  tpSources: 'Источники и стандарты',

  scFormula: 'Формула',
  scCalc: 'Вычисление — что и с чем делаем, как меняются данные',
  scByteView: 'Байтовая диаграмма — какие байты берутся',
  scFlow: 'Схема потока данных',
  scTerms: 'Разбор терминов',

  dfNoInputs: '— нет входов —',

  hexTitle: 'Hex-дамп',
  hexBits: 'бит',
  hexEmpty: 'Нет значений для просмотра на этом шаге.',

  pfAp: 'Точка доступа',
  pfClient: 'Клиент',
  pfIdle: 'на этом шаге пакеты по эфиру не передаются',

  asViaPmkid: 'Через PMKID',
  asViaEapol: 'Через EAPOL',

  deSecret: '«Настоящий» пароль перехваченной сети',
  deDict: 'Мини-словарь',
  deEmpty: 'Словарь пуст — добавьте хотя бы одно слово.',
  deNewPlaceholder: 'новое слово',
  deAdd: 'Добавить',
};

/** Ключ строки интерфейса. */
export type UiKey = keyof typeof RU;

const UK: Record<UiKey, string> = {
  appTitle: 'Методичка Wi-Fi: WPA2 · WPA3 · Hashcat 22000',
  appSubtitle: 'Інтерактивна візуальна методичка з безпеки Wi-Fi для початківців',
  themeToDark: '🌙 Темна',
  themeToLight: '☀ Світла',
  paramsTitle: '⚙ Параметри мережі (спільний сценарій для всіх модулів)',
  paramSsid: 'SSID (ім’я мережі)',
  paramPass: 'Пароль мережі',
  paramApMac: 'MAC точки доступу',
  paramClientMac: 'MAC клієнта',
  paramANonce: 'ANonce (hex, 32 байти)',
  paramSNonce: 'SNonce (hex, 32 байти)',
  paramGtk: 'GTK — груповий ключ (hex, 16 байт)',
  paramIgtk: 'IGTK — ключ PMF (hex, 16 байт)',
  debounceNote:
    'Зміни застосовуються із затримкою 500 мс — важкий перерахунок ключів не запускається ' +
    'на кожне натискання клавіші.',
  tabWpa2: '1 · WPA2 Handshake',
  tabWpa3: '2 · WPA3 SAE',
  tabHashcat: '3 · Hashcat 22000',
  tabGuide: 'Довідник',
  docGuide: 'Довідник WPA2/WPA3',
  appShort: 'Методичка Wi-Fi',
  footerNote:
    'Навчальний проєкт: усі обчислення виконуються у вашому браузері, дані нікуди не ' +
    'надсилаються. Атаки лише моделюються на значеннях, які ви ввели самі.',
  navLabel: 'Розділи методички',
  langLabel: 'Мова інтерфейсу',
  gToc: 'Зміст',
  gTocMobile: 'Зміст довідника',
  gPlay: '▶ Показати по кроках',
  gShowAll: '■ Показати все',
  gSecured: 'захищено ключами сеансу',
  gTagCommon: 'основи',
  gTagWpa2: 'WPA2',
  gTagWpa3: 'WPA3',
  gTagAttack: 'атаки',
  gBytesShort: 'Б',
  gToTop: '↑ На початок',
  gTerms: 'Терміни',

  errParams: 'Перевірте параметри мережі:',
  progStep: 'Крок',
  progOf: 'з',

  m1Title: 'Модуль 1 — WPA2 4-Way Handshake',
  m1Subtitle: 'Як із пароля мережі народжуються ключі сеансу: PMK → PTK → повідомлення M1–M4 → встановлення ключів.',
  m1Recompute: '↻ Перерахувати ключі',
  m1Computing:
    '⏳ Обчислюємо ключі… PBKDF2 на 4096 ітерацій виконується у фоновому потоці.',

  m2Title: 'Модуль 2 — WPA3 SAE (Dragonfly)',
  m2Subtitle: 'SAE за IEEE 802.11-2020: PWE, Commit, Confirm і 4-Way Handshake — і чому пароль не можна підібрати офлайн.',
  m2Recompute: '↻ Перерахувати обмін',
  m2Computing: '⏳ Виконуємо обмін SAE на кривій P-256 — у фоновому потоці.',
  m2Converged:
    '✓ Точка доступу та клієнт незалежно зійшлися до одного спільного секрету — пароль ' +
    'підтверджено, і при цьому він жодного разу не «пролунав» в ефірі.',

  m3Title: 'Модуль 3 — Симулятор Hashcat 22000',
  m3Subtitle: 'Як офлайн-перебір підбирає пароль Wi-Fi за перехопленим хешем.',
  m3FastOn: '⏩ Прискорений перебір: увімк.',
  m3FastOff: '⏩ Прискорений перебір: вимк.',
  m3Notice:
    '⚠ Це суто освітня симуляція математики офлайн-атаки. Реального захоплення трафіку ' +
    'та мережевої взаємодії не відбувається — усі обчислення виконуються лише над ' +
    'даними, які ви ввели самі.',
  m3Computing:
    '⏳ Триває перебір словника — для кожного слова справді обчислюється PBKDF2.',
  m3LineLabel: 'Рядок хешу формату 22000',
  m3ErrParams: 'Перевірте параметри:',
  m3NoWords: 'Додайте хоча б одне слово до міні-словника.',

  cpBack: '← Назад',
  cpForward: 'Уперед →',
  cpPlay: '▶ Авто',
  cpPause: '⏸ Пауза',
  cpSlow: 'Повільно',
  cpMed: 'Середньо',
  cpFast: 'Швидко',
  cpSpeed: 'Швидкість автопрогравання',

  tpTheory: 'Теорія',
  tpSources: 'Джерела та стандарти',

  scFormula: 'Формула',
  scCalc: 'Обчислення — що і з чим робимо, як змінюються дані',
  scByteView: 'Байтова діаграма — які байти беруться',
  scFlow: 'Схема потоку даних',
  scTerms: 'Розбір термінів',

  dfNoInputs: '— немає входів —',

  hexTitle: 'Hex-дамп',
  hexBits: 'біт',
  hexEmpty: 'Немає значень для перегляду на цьому кроці.',

  pfAp: 'Точка доступу',
  pfClient: 'Клієнт',
  pfIdle: 'на цьому кроці пакети в ефір не передаються',

  asViaPmkid: 'Через PMKID',
  asViaEapol: 'Через EAPOL',

  deSecret: '«Справжній» пароль перехопленої мережі',
  deDict: 'Міні-словник',
  deEmpty: 'Словник порожній — додайте хоча б одне слово.',
  deNewPlaceholder: 'нове слово',
  deAdd: 'Додати',
};

const EN: Record<UiKey, string> = {
  appTitle: 'Wi-Fi Security Guide: WPA2 · WPA3 · Hashcat 22000',
  appSubtitle: 'An interactive visual guide to Wi-Fi security for beginners',
  themeToDark: '🌙 Dark',
  themeToLight: '☀ Light',
  paramsTitle: '⚙ Network parameters (shared scenario for all modules)',
  paramSsid: 'SSID (network name)',
  paramPass: 'Network password',
  paramApMac: 'Access point MAC',
  paramClientMac: 'Client MAC',
  paramANonce: 'ANonce (hex, 32 bytes)',
  paramSNonce: 'SNonce (hex, 32 bytes)',
  paramGtk: 'GTK — group key (hex, 16 bytes)',
  paramIgtk: 'IGTK — PMF key (hex, 16 bytes)',
  debounceNote:
    'Changes apply after a 500 ms delay — the heavy key recomputation does not run on ' +
    'every keystroke.',
  tabWpa2: '1 · WPA2 Handshake',
  tabWpa3: '2 · WPA3 SAE',
  tabHashcat: '3 · Hashcat 22000',
  tabGuide: 'Guide',
  docGuide: 'WPA2/WPA3 handbook',
  appShort: 'Wi-Fi Guide',
  footerNote:
    'An educational project: all computation runs in your browser and no data leaves it. ' +
    'Attacks are only simulated on values you entered yourself.',
  navLabel: 'Guide sections',
  langLabel: 'Interface language',
  gToc: 'Contents',
  gTocMobile: 'Guide contents',
  gPlay: '▶ Play step by step',
  gShowAll: '■ Show all',
  gSecured: 'protected by session keys',
  gTagCommon: 'basics',
  gTagWpa2: 'WPA2',
  gTagWpa3: 'WPA3',
  gTagAttack: 'attacks',
  gBytesShort: 'B',
  gToTop: '↑ Back to top',
  gTerms: 'Terms',

  errParams: 'Check the network parameters:',
  progStep: 'Step',
  progOf: 'of',

  m1Title: 'Module 1 — WPA2 4-Way Handshake',
  m1Subtitle: 'How a network password becomes session keys: PMK → PTK → messages M1–M4 → key installation.',
  m1Recompute: '↻ Recompute keys',
  m1Computing:
    '⏳ Computing keys… PBKDF2 with 4096 iterations runs in a background thread.',

  m2Title: 'Module 2 — WPA3 SAE (Dragonfly)',
  m2Subtitle: 'SAE per IEEE 802.11-2020: PWE, Commit, Confirm and the 4-Way Handshake — and why the password cannot be cracked offline.',
  m2Recompute: '↻ Recompute exchange',
  m2Computing: '⏳ Running the SAE exchange on the P-256 curve — in a background thread.',
  m2Converged:
    '✓ The access point and the client independently arrived at the same shared ' +
    'secret — the password is confirmed, yet it was never sent over the air.',

  m3Title: 'Module 3 — Hashcat 22000 simulator',
  m3Subtitle: 'How an offline attack cracks a Wi-Fi password from a captured hash.',
  m3FastOn: '⏩ Fast cracking: on',
  m3FastOff: '⏩ Fast cracking: off',
  m3Notice:
    '⚠ This is a strictly educational simulation of the offline-attack math. No real ' +
    'traffic capture or network activity happens — all computation runs only on the ' +
    'data you entered yourself.',
  m3Computing:
    '⏳ Running the dictionary search — PBKDF2 is genuinely computed for each word.',
  m3LineLabel: 'Hash string, format 22000',
  m3ErrParams: 'Check the parameters:',
  m3NoWords: 'Add at least one word to the mini-dictionary.',

  cpBack: '← Back',
  cpForward: 'Forward →',
  cpPlay: '▶ Auto',
  cpPause: '⏸ Pause',
  cpSlow: 'Slow',
  cpMed: 'Medium',
  cpFast: 'Fast',
  cpSpeed: 'Auto-play speed',

  tpTheory: 'Theory',
  tpSources: 'Sources and standards',

  scFormula: 'Formula',
  scCalc: 'Computation — what we do with what, how the data changes',
  scByteView: 'Byte diagram — which bytes are taken',
  scFlow: 'Data-flow diagram',
  scTerms: 'Term-by-term breakdown',

  dfNoInputs: '— no inputs —',

  hexTitle: 'Hex dump',
  hexBits: 'bits',
  hexEmpty: 'No values to inspect at this step.',

  pfAp: 'Access point',
  pfClient: 'Client',
  pfIdle: 'no packets are sent over the air at this step',

  asViaPmkid: 'Via PMKID',
  asViaEapol: 'Via EAPOL',

  deSecret: 'The “real” password of the captured network',
  deDict: 'Mini-dictionary',
  deEmpty: 'The dictionary is empty — add at least one word.',
  deNewPlaceholder: 'new word',
  deAdd: 'Add',
};

/** Таблица переводов строк интерфейса. */
export const UI: Record<Lang, Record<UiKey, string>> = { ru: RU, uk: UK, en: EN };
