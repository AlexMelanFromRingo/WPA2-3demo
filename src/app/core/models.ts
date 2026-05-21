/**
 * Доменные модели методички (data-model.md).
 * Состояние клиентское, в памяти — персистентности нет.
 */

/** Идентификатор модуля методички. */
export type ModuleId = 'wpa2-handshake' | 'wpa3-sae' | 'hashcat-22000';

/** Учебный сценарий — единый общий набор параметров сети (data-model.md §1). */
export interface NetworkScenario {
  /** Имя сети, 1–32 байта UTF-8. */
  ssid: string;
  /** Пароль (WPA2-PSK: 8–63 печатных ASCII-символа). */
  passphrase: string;
  /** MAC-адрес точки доступа (AA), формат `aa:bb:cc:dd:ee:ff`. */
  apMac: string;
  /** MAC-адрес клиента (SPA/STA). */
  clientMac: string;
  /** ANonce — 32 байта в hex. */
  aNonce: string;
  /** SNonce — 32 байта в hex. */
  sNonce: string;
}

/** Локальное переопределение параметров модуля поверх общего сценария. */
export type ModuleOverride = Partial<NetworkScenario>;

/** Ссылка на артефакт для схемы потока данных. */
export interface ArtifactRef {
  id: string;
  label: string;
}

/** Схема «вход → преобразование → выход» одного шага (FR-005). */
export interface DataFlow {
  inputs: ArtifactRef[];
  /** Человекочитаемое имя операции, напр. «PBKDF2-HMAC-SHA1, 4096 итераций». */
  transform: string;
  outputs: ArtifactRef[];
}

/** Криптографический артефакт — промежуточное/итоговое значение (data-model.md §4). */
export interface CryptoArtifact {
  id: string;
  label: string;
  bytes: Uint8Array;
  hex: string;
  bitLength: number;
  /** id артефактов-входов. */
  derivedFrom: string[];
}

/** Бейдж шага — наглядный индикатор результата (напр. красный/зелёный в переборе). */
export interface StepBadge {
  text: string;
  tone: 'match' | 'no-match' | 'info';
}

/** Термин шага и его объяснение простым языком («разжёванное»). */
export interface GlossaryTerm {
  term: string;
  definition: string;
}

/** Описание «летящего пакета» для анимации сцены «точка доступа ↔ клиент». */
export interface PacketCue {
  /** Сторона-отправитель. */
  from: 'ap' | 'client';
  /** Подпись на пакете, напр. «M1 — ANonce». */
  label: string;
}

/** Цветовой тон региона байтовой диаграммы. */
export type ByteTone = 'kept' | 'kept2' | 'kept3' | 'drop';

/** Регион байтовой диаграммы — группа подряд идущих байт с подписью. */
export interface ByteRegion {
  /** Подпись региона, напр. «KCK» или «отброшено». */
  label: string;
  /** Сколько байт (ячеек) в регионе. */
  byteCount: number;
  /** Цвет: kept/kept2/kept3 — взятые части, drop — отброшенные. */
  tone: ByteTone;
}

/**
 * Байтовая диаграмма — графический разбор «какие байты берутся» (как
 * byte-diagram в TOTP_demo). Регионы идут подряд; ячейки за пределами `hex`
 * показываются как «✕» (значение неизвестно — байты отброшены).
 */
export interface ByteView {
  /** Hex реально известных байт. */
  hex: string;
  /** Регионы подряд; сумма byteCount задаёт число ячеек диаграммы. */
  regions: ByteRegion[];
  /** Подпись-объяснение под диаграммой: что выделено и почему. */
  caption: string;
}

/** Шаг визуализации. Поля `tooltip`, `description`, `terms`, `dataFlow` обязательны. */
export interface VisualizationStep {
  index: number;
  title: string;
  /** Краткая всплывающая подсказка (одно предложение, для значка «?»). */
  tooltip: string;
  /** Развёрнутое описание простым языком: что и зачем, с примерами. */
  description: string;
  /** Разбор всех терминов, встречающихся на шаге, — каждый объяснён с нуля. */
  terms: GlossaryTerm[];
  /** Ключевая формула шага (абстрактная, в отдельном блоке). */
  formula?: string;
  /**
   * Блок «Вычисление»: пошаговый прогон данных с РЕАЛЬНЫМИ значениями —
   * что, с чем и как делаем, как меняются данные (массив строк-линий).
   */
  calc: string[];
  dataFlow: DataFlow;
  artifacts: CryptoArtifact[];
  /** Если задано — показывается байтовая диаграмма извлечения байт. */
  byteView?: ByteView;
  /** Если задано — на шаге проигрывается анимация передачи пакета. */
  packet?: PacketCue;
  /** Необязательный индикатор результата шага (красный/зелёный/нейтральный). */
  badge?: StepBadge;
}

/** Ссылка на внешний стандарт/RFC в теоретическом разделе. */
export interface TheoryReference {
  /** Подпись, напр. «RFC 7664 — Dragonfly Key Exchange (2015)». */
  label: string;
  url: string;
}

/** Раздел теоретического описания: заголовок + текст (абзацы через \n\n). */
export interface TheorySection {
  heading: string;
  body: string;
}

/** Теоретическая «методичка» модуля — учебный текст со ссылками на стандарты. */
export interface ModuleTheory {
  title: string;
  /** Краткое вводное предложение. */
  summary: string;
  sections: TheorySection[];
  references: TheoryReference[];
}

/** Мини-словарь симулятора Hashcat (data-model.md §5). */
export interface Dictionary {
  words: string[];
  /** «Настоящий» пароль сценария — отдельно от `words`, чтобы показать оба исхода. */
  secretPassword: string;
}

/** Тип атаки симулятора (data-model.md §6). */
export type AttackType = 'pmkid' | 'eapol';

/** Перехваченный дамп — данные, которые «видит» атакующий (data-model.md §7). */
export interface CapturedDump {
  pmkid?: string;
  eapolFrame?: Uint8Array;
  capturedMic?: string;
  /** Строка формата 22000: `WPA*<type>*<mic|pmkid>*...`. */
  hash22000Line: string;
}

/** Исход перебора. */
export type AttackOutcome = 'running' | 'found' | 'not-found';

/** Ход перебора симулятора (data-model.md §8). */
export interface AttackProgress {
  currentIndex: number;
  candidate: string;
  derivedKeys: CryptoArtifact[];
  matched: boolean;
  outcome: AttackOutcome;
  /** Режим ускоренного перебора (FR-030). */
  fastMode: boolean;
}

// --- Протокол сообщений Web Worker (contracts/crypto-worker.contract.md) ---

/** Криптооперация воркера. */
export type CryptoOp =
  | 'ping'
  | 'wpa2.pmk'
  | 'wpa2.ptk'
  | 'wpa2.mic'
  | 'sae.run'
  | 'h22000.crack';

/** Запрос к воркеру. `generation` — токен поколения для отмены устаревших расчётов. */
export interface WorkerRequest {
  id: string;
  generation: number;
  op: CryptoOp;
  payload: unknown;
}

export interface WorkerSuccess {
  id: string;
  generation: number;
  ok: true;
  result: unknown;
}

export interface WorkerFailure {
  id: string;
  generation: number;
  ok: false;
  error: string;
}

export interface WorkerProgress {
  id: string;
  generation: number;
  /** Прогресс от 0 до 1. */
  progress: number;
}

export type WorkerResponse = WorkerSuccess | WorkerFailure | WorkerProgress;

/** Сценарий по умолчанию — стартовые значения учебной сети. */
export const DEFAULT_SCENARIO: NetworkScenario = {
  ssid: 'DemoNet',
  passphrase: 'password123',
  apMac: '02:00:00:00:00:01',
  clientMac: '02:00:00:00:00:02',
  aNonce: '00'.repeat(32),
  sNonce: '11'.repeat(32),
};
