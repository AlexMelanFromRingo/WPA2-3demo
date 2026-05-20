/**
 * Модель шагов визуализации симулятора Hashcat 22000 (T037).
 * Каждый шаг несёт подсказку, развёрнутое описание, разбор всех терминов и
 * схему потока данных (Принципы I, II; FR-004, FR-005, FR-025–027).
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
        'Атакующему достаточно одного пакета от роутера — не нужно ждать, пока в сети ' +
        'появится живой клиент. Перехваченный PMKID становится «эталоном» для перебора.'
      : 'Атака через EAPOL — классический метод. Атакующий перехватывает 4-Way Handshake ' +
        'и берёт из него значение MIC. Чтобы поймать рукопожатие, иногда клиента ' +
        'принудительно отключают (deauth), вынуждая переподключиться. Перехваченный MIC ' +
        'становится «эталоном» для перебора.',
    formula: isPmkid
      ? 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ MAC_AP ‖ MAC_STA)[0:16]'
      : 'MIC = HMAC-SHA1(KCK, кадр EAPOL)[0:16]',
    terms: isPmkid
      ? [
          { term: 'PMKID', definition: 'короткое значение, которым роутер «здоровается»; вычислено из PMK и MAC-адресов. Если PMK угадан верно — PMKID совпадёт.' },
          { term: 'Офлайн-атака', definition: 'подбор пароля на своём компьютере, без подключения к сети. Быстро и незаметно.' },
          { term: 'Эталон', definition: 'перехваченное «правильное» значение, с которым сверяют каждый кандидат.' },
          { term: 'Точка доступа', definition: 'роутер, раздающий Wi-Fi.' },
        ]
      : [
          { term: 'EAPOL', definition: 'протокол сообщений рукопожатия WPA2. Из перехваченного кадра EAPOL берут значение MIC.' },
          { term: 'MIC', definition: 'подпись из рукопожатия. Если пароль угадан верно, вычисленный MIC совпадёт с перехваченным.' },
          { term: '4-Way Handshake', definition: 'рукопожатие WPA2 из четырёх сообщений (см. Модуль 1).' },
          { term: 'deauth', definition: 'пакет принудительного отключения. Им атакующий «сбрасывает» клиента, чтобы тот переподключился и выдал рукопожатие.' },
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
      'Режим 22000 («WPA-PBKDF2-PMKID+EAPOL») объединил два прежних режима Hashcat — ' +
      '16800 (PMKID) и 2500 (EAPOL) — в один универсальный текстовый формат. Вся ' +
      'перехваченная информация записывается одной строкой; поля разделены звёздочками: ' +
      'тип атаки (01 — PMKID, 02 — EAPOL), сам хэш, MAC-адреса точки доступа и клиента, ' +
      'имя сети и далее. Именно такую строку «скармливают» утилите Hashcat.',
    formula: 'WPA*<тип>*<хэш>*<MAC AP>*<MAC STA>*<SSID>*<ANonce>*<EAPOL>*<messagepair>',
    terms: [
      { term: 'Hashcat', definition: 'популярная утилита для перебора паролей по хэшам, использующая мощность видеокарт.' },
      { term: 'Режим 22000', definition: 'номер режима Hashcat для паролей Wi-Fi. Объединил прежние режимы 16800 (PMKID) и 2500 (EAPOL).' },
      { term: 'Поле', definition: 'отдельная часть строки. В формате 22000 поля разделяются звёздочкой (*).' },
      { term: 'Тип (01 / 02)', definition: 'первое число после WPA*: 01 — атака через PMKID, 02 — через EAPOL.' },
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
        'Пошаговая анимация промежуточных слов пропущена — но сами вычисления и итог ' +
        'остаются настоящими. Так в реальной атаке Hashcat проходит словари в миллионы ' +
        'строк.',
      formula: candidateFormula,
      terms: [
        { term: 'Ускоренный режим', definition: 'режим, в котором пропускается покадровая анимация перебора. Сами вычисления при этом настоящие.' },
        ...CRACK_TERMS,
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
            `«${candidate.word}» и есть пароль сети. Перебор останавливается: пароль раскрыт.`
          : `Из слова «${candidate.word}» функцией PBKDF2 (4096 итераций) получен PMK, а ` +
            'из него — хэш кандидата. Этот хэш не совпал с перехваченным эталоном — слово ' +
            'не подходит. Атакующий берёт следующее слово словаря и повторяет вычисление.',
        formula: candidateFormula,
        terms: CRACK_TERMS,
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

  steps.push({
    index: steps.length,
    title: result.outcome === 'found' ? 'Итог — пароль найден' : 'Итог — пароль не найден',
    tooltip:
      result.outcome === 'found'
        ? 'Слово из словаря дало совпадающий хэш — пароль раскрыт.'
        : 'Ни одно слово не подошло — этого словаря не хватило.',
    description:
      result.outcome === 'found'
        ? `Слово «${result.perWord[result.matchIndex].word}» дало хэш, совпавший с ` +
          'перехваченным, — пароль сети раскрыт. Главный вывод: короткие и словарные ' +
          'пароли вскрываются офлайн-перебором за минуты. Защита — длинный, случайный, ' +
          'несловарный пароль, а ещё лучше — переход на WPA3 (Модуль 2), где офлайн-атака ' +
          'в принципе невозможна.'
        : 'Ни одно слово словаря не подошло. Но это не значит, что сеть в безопасности: в ' +
          'реальной атаке злоумышленник просто берёт словарь побольше (миллионы и ' +
          'миллиарды строк) или подключает перебор по маске. Надёжная защита — длинный ' +
          'несловарный пароль или WPA3.',
    terms: [
      { term: 'Словарная атака', definition: 'перебор паролей по готовому списку частых паролей и слов. Эффективна против простых паролей.' },
      { term: 'Перебор по маске', definition: 'перебор всех комбинаций по шаблону (например «8 цифр»). Дополняет словарь.' },
      { term: 'Несловарный пароль', definition: 'пароль, которого нет ни в одном словаре: длинный, случайный, без обычных слов и дат.' },
    ],
    dataFlow: {
      inputs: [ref(captured)],
      transform: 'Сравнение со всеми кандидатами',
      outputs: [],
    },
    artifacts: [],
    badge:
      result.outcome === 'found'
        ? { text: 'Пароль раскрыт', tone: 'match' }
        : { text: 'Пароль не раскрыт', tone: 'no-match' },
  });

  return steps;
}
