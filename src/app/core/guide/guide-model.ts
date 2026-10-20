/**
 * Модель контента «Справочника WPA2/WPA3» — блочная, на трёх языках.
 *
 * Весь переводимый текст (включая подписи диаграмм) живёт в объектах
 * `GuideContent` (guide.ru.ts / guide.uk.ts / guide.en.ts), чтобы переводчику
 * хватало одного файла. В строках допустима инлайн-разметка:
 * `**жирный**` и `` `код` `` (см. inline.ts).
 */

/** Смысловая метка главы: определяет цветовой код в оглавлении и заголовке. */
export type GuideTag = 'common' | 'wpa2' | 'wpa3' | 'attack';

/** Тон врезки. */
export type CalloutTone = 'info' | 'warn' | 'danger' | 'ok';

/** Термин и его объяснение простым языком. */
export interface GuideTerm {
  term: string;
  definition: string;
}

/** Карточка настоящей последовательности (сообщения рукопожатия, этапы обмена). */
export interface GuideStep {
  title: string;
  /** Короткая служебная подпись, напр. «точка доступа → клиент». */
  meta?: string;
  /** Текст; абзацы разделяются `\n\n`. */
  text: string;
  /** Необязательная формула шага. */
  formula?: string;
}

/** Событие ленты времени. */
export interface GuideTimelineItem {
  year: string;
  title: string;
  text: string;
  tag: GuideTag;
}

/** Одно сообщение диаграммы последовательности. */
export interface SequenceMessage {
  /** Кто отправляет: клиент (STA) или точка доступа (AP). */
  from: 'sta' | 'ap';
  /** Имя кадра, напр. «EAPOL-Key M1». */
  label: string;
  /** Что внутри кадра, коротко. */
  note?: string;
  /** Кадр зашифрован/защищён ключами сеанса. */
  secured?: boolean;
}

/** Цвет фазы диаграммы последовательности. */
export type SequenceTone = 'discovery' | 'auth' | 'sae' | 'assoc' | 'keys' | 'group' | 'data';

/** Фаза подключения — группа сообщений. */
export interface SequencePhase {
  title: string;
  tone: SequenceTone;
  messages: SequenceMessage[];
}

/** Вариант диаграммы последовательности (напр. WPA2-Personal). */
export interface SequenceVariant {
  /** Подпись переключателя. */
  label: string;
  tag: GuideTag;
  sta: string;
  ap: string;
  phases: SequencePhase[];
}

/** Узел дерева ключей. */
export interface KeyNode {
  name: string;
  /** Размер, напр. «256 бит». */
  size?: string;
  /** Зачем нужен ключ — одна короткая фраза. */
  role: string;
  tone: 'secret' | 'master' | 'session' | 'group';
}

/** Уровень дерева ключей; `via` — как он получается из предыдущего. */
export interface KeyLevel {
  via?: string;
  nodes: KeyNode[];
}

/** Поле кадра для «полосы полей». */
export interface FrameField {
  name: string;
  /** Размер в байтах; строка — для переменной длины (напр. «n»). */
  bytes: number | string;
  note: string;
  part: 'header' | 'body' | 'nonce' | 'mic' | 'data';
}

/** Колонка сравнения «плюсы / минусы». */
export interface ProsConsColumn {
  title: string;
  tone: 'ok' | 'danger';
  items: string[];
}

/** Ссылка: внутренняя (маршрут сайта) или внешняя. */
export interface GuideLink {
  label: string;
  /** Внутренний маршрут, напр. `/wpa2`. */
  route?: string;
  /** Внешний адрес. */
  href?: string;
  /** Пояснение под ссылкой. */
  note?: string;
}

/** Блок контента главы. */
export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'formula'; text: string; caption?: string }
  | { kind: 'callout'; tone: CalloutTone; title?: string; text: string }
  | { kind: 'table'; caption?: string; head: string[]; rows: string[][] }
  | { kind: 'terms'; items: GuideTerm[] }
  | { kind: 'steps'; items: GuideStep[] }
  | { kind: 'timeline'; items: GuideTimelineItem[] }
  | { kind: 'sequence'; variants: SequenceVariant[]; caption?: string }
  | { kind: 'keytree'; main: KeyLevel[]; asideTitle: string; aside: KeyLevel[]; caption?: string }
  | { kind: 'frame'; title: string; fields: FrameField[]; caption?: string }
  | { kind: 'proscons'; columns: ProsConsColumn[] }
  | { kind: 'links'; items: GuideLink[] };

/** Глава справочника. */
export interface GuideChapter {
  /** Якорь главы (латиницей, стабилен между языками). */
  id: string;
  title: string;
  tag: GuideTag;
  /** Вводная фраза главы — «зачем». */
  lead?: string;
  blocks: GuideBlock[];
}

/** Весь справочник на одном языке. */
export interface GuideContent {
  title: string;
  lead: string;
  /** Блок-«герой» под заголовком (обычно диаграмма подключения). */
  hero: GuideBlock;
  chapters: GuideChapter[];
}
