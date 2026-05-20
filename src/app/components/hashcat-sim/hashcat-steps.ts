/**
 * Модель шагов визуализации симулятора Hashcat 22000 (T037).
 * Каждый шаг несёт подсказку, развёрнутое описание, разбор терминов, формулу и
 * блок «Вычисление» — пошаговый прогон данных с реальными значениями.
 */
import type { CrackResult } from '../../core/crypto/crypto-engine.service';
import { bytesToHex, hexToBytes } from '../../core/crypto/hex';
import type { ArtifactRef, CryptoArtifact, GlossaryTerm, VisualizationStep } from '../../core/models';

function artifact(id: string, label: string, bytes: Uint8Array): CryptoArtifact {
  return { id, label, bytes, hex: bytesToHex(bytes), bitLength: bytes.length * 8, derivedFrom: [] };
}

function ref(item: CryptoArtifact): ArtifactRef {
  return { id: item.id, label: item.label };
}

/** Термины перебора, общие для шагов проверки слов. */
const CRACK_TERMS: GlossaryTerm[] = [
  { term: 'PBKDF2', definition: 'функция, превращающая пароль в ключ PMK за 4096 повторов HMAC-SHA1. Та же, что в Модуле 1.' },
  { term: 'PMK', definition: 'Pairwise Master Key — 256-битный ключ, получаемый из пароля и SSID.' },
  { term: 'Хэш кандидата', definition: 'значение (PMKID или MIC), вычисленное из проверяемого слова. Его сверяют с перехваченным.' },
  { term: 'Словарь', definition: 'список слов-кандидатов на роль пароля. В реальной атаке — миллионы строк.' },
];

/**
 * Строит шаги модуля. В режиме `fastMode` пошаговая анимация перебора
 * сворачивается в один сводный шаг (clarify Q2, FR-030).
 */
export function buildHashcatSteps(result: CrackResult, fastMode: boolean): VisualizationStep[] {
  const isPmkid = result.attackType === 'pmkid';
  const attackName = isPmkid ? 'PMKID' : 'EAPOL';
  const captured = artifact(
    'captured',
    `Перехваченный хэш (${attackName})`,
    hexToBytes(result.capturedHashHex),
  );
  const candidateFormula = isPmkid
    ? "PMKID' = HMAC-SHA1(PBKDF2(слово, SSID), \"PMK Name\" ‖ MAC_AP ‖ MAC_STA)"
    : "MIC' = HMAC-SHA1(KCK из PBKDF2(слово, SSID), кадр EAPOL)[0:16]";
  const fields = result.hash22000Line.split('*');
  const steps: VisualizationStep[] = [];

  steps.push({
    index: 0,
    title: `Тип атаки — через ${attackName}`,
    tooltip: isPmkid
      ? 'PMKID-атаке достаточно одного пакета от роутера.'
      : 'EAPOL-атаке нужно перехватить рукопожатие целиком.',
    description: isPmkid
      ? 'Атака через PMKID — современный метод, открытый автором Hashcat в 2018 году. ' +
        'Многие точки доступа в первом же ответе клиенту присылают значение PMKID. ' +
        'Атакующему достаточно одного пакета от роутера. Перехваченный PMKID становится ' +
        '«эталоном» для перебора.'
      : 'Атака через EAPOL — классический метод. Атакующий перехватывает 4-Way Handshake ' +
        'и берёт из него MIC. Чтобы поймать рукопожатие, иногда клиента принудительно ' +
        'отключают (deauth). Перехваченный MIC становится «эталоном» для перебора.',
    formula: isPmkid
      ? 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ MAC_AP ‖ MAC_STA)[0:16]'
      : 'MIC = HMAC-SHA1(KCK, кадр EAPOL)[0:16]',
    terms: isPmkid
      ? [
          { term: 'PMKID', definition: 'короткое значение, которым роутер «здоровается»; вычислено из PMK и MAC-адресов. Угадан PMK — совпадёт PMKID.' },
          { term: 'Офлайн-атака', definition: 'подбор пароля на своём компьютере, без подключения к сети. Быстро и незаметно.' },
          { term: 'Эталон', definition: 'перехваченное «правильное» значение, с которым сверяют каждый кандидат.' },
          { term: 'Точка доступа', definition: 'роутер, раздающий Wi-Fi.' },
        ]
      : [
          { term: 'EAPOL', definition: 'протокол сообщений рукопожатия WPA2. Из перехваченного кадра EAPOL берут значение MIC.' },
          { term: 'MIC', definition: 'подпись из рукопожатия. Угадан пароль — вычисленный MIC совпадёт с перехваченным.' },
          { term: '4-Way Handshake', definition: 'рукопожатие WPA2 из четырёх сообщений (см. Модуль 1).' },
          { term: 'deauth', definition: 'пакет принудительного отключения; им «сбрасывают» клиента, чтобы тот переподключился и выдал рукопожатие.' },
        ],
    calc: [
      'ПЕРЕХВАЧЕНО из эфира (это всё, что есть у атакующего):',
      '',
      `  тип атаки = ${attackName}`,
      `  MAC точки доступа = ${result.apMac}`,
      `  MAC клиента       = ${result.clientMac}`,
      `  SSID              = "${result.ssid}"`,
      '',
      `  эталонный хэш (${attackName}):`,
      `  ${result.capturedHashHex}`,
    ],
    dataFlow: {
      inputs: [],
      transform: 'Перехват одного хэша из эфира',
      outputs: [ref(captured)],
    },
    artifacts: [captured],
  });

  steps.push({
    index: 1,
    title: 'Строка хэша формата 22000',
    tooltip: 'Перехваченные данные Hashcat хранит одной строкой.',
    description:
      'Режим 22000 («WPA-PBKDF2-PMKID+EAPOL») объединил прежние режимы Hashcat — 16800 ' +
      '(PMKID) и 2500 (EAPOL) — в один универсальный текстовый формат. Вся перехваченная ' +
      'информация записывается одной строкой; поля разделены звёздочками. Именно такую ' +
      'строку «скармливают» утилите Hashcat.',
    formula: 'WPA*<тип>*<хэш>*<MAC AP>*<MAC STA>*<SSID>*<ANonce>*<EAPOL>*<messagepair>',
    terms: [
      { term: 'Hashcat', definition: 'популярная утилита для перебора паролей по хэшам, использующая мощность видеокарт.' },
      { term: 'Режим 22000', definition: 'номер режима Hashcat для паролей Wi-Fi. Объединил прежние режимы 16800 (PMKID) и 2500 (EAPOL).' },
      { term: 'Поле', definition: 'отдельная часть строки. В формате 22000 поля разделяются звёздочкой (*).' },
      { term: 'Тип (01 / 02)', definition: 'первое число после WPA*: 01 — атака через PMKID, 02 — через EAPOL.' },
    ],
    calc: [
      'РАЗБОР перехваченной строки по полям (разделитель — *):',
      '',
      `  WPA      — метка формата`,
      `  ${fields[1] ?? '??'}       — тип атаки (${fields[1] === '01' ? 'PMKID' : 'EAPOL'})`,
      `  хэш      = ${fields[2] ?? ''}`,
      `  MAC AP   = ${fields[3] ?? ''}`,
      `  MAC STA  = ${fields[4] ?? ''}`,
      `  SSID hex = ${fields[5] ?? ''}`,
      '',
      'Полная строка:',
      `  ${result.hash22000Line}`,
    ],
    dataFlow: {
      inputs: [ref(captured)],
      transform: 'Сборка строки WPA*<тип>*<хэш>*...',
      outputs: [],
    },
    artifacts: [captured],
  });

  if (fastMode) {
    steps.push({
      index: 2,
      title: 'Перебор словаря (ускоренный режим)',
      tooltip: 'Все слова словаря проверяются разом, без покадровой анимации.',
      description:
        `Симулятор быстро прогоняет все ${result.perWord.length} слов словаря: для ` +
        'каждого по-настоящему вычисляется PBKDF2 (4096 итераций) и сверяется хэш. ' +
        'Пошаговая анимация пропущена, но вычисления и итог настоящие.',
      formula: candidateFormula,
      terms: [
        { term: 'Ускоренный режим', definition: 'режим, в котором пропускается покадровая анимация перебора. Сами вычисления настоящие.' },
        ...CRACK_TERMS,
      ],
      calc: [
        `Прогоняем ${result.perWord.length} слов. Для каждого:`,
        '  слово → PBKDF2 → PMK → хэш → сверка с эталоном.',
        '',
        ...result.perWord.map(
          (c) => `  ${c.match ? '✓' : '·'} "${c.word}"  →  ${c.hashHex.slice(0, 24)}…`,
        ),
      ],
      dataFlow: {
        inputs: [],
        transform: `PBKDF2 × ${result.perWord.length} слов`,
        outputs: [ref(captured)],
      },
      artifacts: [],
    });
  } else {
    result.perWord.forEach((candidate, i) => {
      const pmk = artifact(`pmk-${i}`, 'PMK кандидата', hexToBytes(candidate.pmkHex));
      const hash = artifact(`hash-${i}`, 'Хэш кандидата', hexToBytes(candidate.hashHex));
      steps.push({
        index: 2 + i,
        title: `Проверка слова: «${candidate.word}»`,
        tooltip: candidate.match
          ? 'Хэш кандидата совпал с перехваченным — пароль найден.'
          : 'Хэш кандидата не совпал — берём следующее слово.',
        description: candidate.match
          ? `Из слова «${candidate.word}» функцией PBKDF2 (4096 итераций) получен PMK, а ` +
            'из него — хэш кандидата. Этот хэш совпал с перехваченным эталоном — значит, ' +
            `«${candidate.word}» и есть пароль сети. Перебор останавливается.`
          : `Из слова «${candidate.word}» функцией PBKDF2 (4096 итераций) получен PMK, а ` +
            'из него — хэш кандидата. Этот хэш не совпал с эталоном — слово не подходит, ' +
            'берётся следующее.',
        formula: candidateFormula,
        terms: CRACK_TERMS,
        calc: [
          `КАНДИДАТ:  "${candidate.word}"`,
          '',
          `1) Слово → PBKDF2(слово, SSID="${result.ssid}", 4096)`,
          `   PMK = ${candidate.pmkHex}`,
          '',
          isPmkid
            ? `2) PMK → HMAC-SHA1(PMK, "PMK Name"‖MAC_AP‖MAC_STA), берём 16 байт`
            : `2) PMK → PTK → KCK → HMAC-SHA1(KCK, EAPOL), берём 16 байт`,
          `   хэш кандидата = ${candidate.hashHex}`,
          '',
          '3) СВЕРКА с эталоном:',
          `   перехвачено = ${result.capturedHashHex}`,
          `   вычислено   = ${candidate.hashHex}`,
          `   → ${candidate.match ? 'СОВПАЛО ✓ — пароль «' + candidate.word + '» найден!' : 'не совпало — слово не подходит'}`,
        ],
        dataFlow: {
          inputs: [{ id: 'word', label: `слово «${candidate.word}»` }],
          transform: 'PBKDF2 → PMK → хэш',
          outputs: [ref(hash)],
        },
        artifacts: [pmk, hash, captured],
        badge: candidate.match
          ? { text: '✓ Хэши совпали', tone: 'match' }
          : { text: '✗ Хэши разные', tone: 'no-match' },
      });
    });
  }

  const found = result.outcome === 'found';
  steps.push({
    index: steps.length,
    title: found ? 'Итог — пароль найден' : 'Итог — пароль не найден',
    tooltip: found
      ? 'Слово из словаря дало совпадающий хэш — пароль раскрыт.'
      : 'Ни одно слово не подошло — этого словаря не хватило.',
    description: found
      ? `Слово «${result.perWord[result.matchIndex].word}» дало хэш, совпавший с ` +
        'перехваченным, — пароль сети раскрыт. Вывод: короткие и словарные пароли ' +
        'вскрываются офлайн-перебором за минуты. Защита — длинный случайный несловарный ' +
        'пароль, а лучше — переход на WPA3 (Модуль 2).'
      : 'Ни одно слово словаря не подошло. Но это не безопасность: в реальной атаке берут ' +
        'словарь побольше (миллионы строк) или перебор по маске. Надёжная защита — длинный ' +
        'несловарный пароль или WPA3.',
    terms: [
      { term: 'Словарная атака', definition: 'перебор паролей по готовому списку частых паролей и слов.' },
      { term: 'Перебор по маске', definition: 'перебор всех комбинаций по шаблону (например «8 цифр»).' },
      { term: 'Несловарный пароль', definition: 'пароль, которого нет ни в одном словаре: длинный, случайный, без обычных слов и дат.' },
    ],
    calc: found
      ? [
          'РЕЗУЛЬТАТ ПЕРЕБОРА:',
          '',
          `  совпадение на слове № ${result.matchIndex + 1}: "${result.perWord[result.matchIndex].word}"`,
          `  эталон     = ${result.capturedHashHex}`,
          `  совпавший  = ${result.perWord[result.matchIndex].hashHex}`,
          '',
          '  ПАРОЛЬ СЕТИ РАСКРЫТ.',
        ]
      : [
          'РЕЗУЛЬТАТ ПЕРЕБОРА:',
          '',
          `  проверено слов: ${result.perWord.length}`,
          '  совпадений: нет',
          '',
          `  эталон = ${result.capturedHashHex}`,
          '  ни один кандидат не дал такой хэш.',
        ],
    dataFlow: {
      inputs: [ref(captured)],
      transform: 'Сравнение со всеми кандидатами',
      outputs: [],
    },
    artifacts: [],
    badge: found
      ? { text: 'Пароль раскрыт', tone: 'match' }
      : { text: 'Пароль не раскрыт', tone: 'no-match' },
  });

  return steps;
}
