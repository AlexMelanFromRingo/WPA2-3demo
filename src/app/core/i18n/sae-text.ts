/** Текст шагов модуля WPA3 SAE на трёх языках. */
import type { Lang } from './ui-text';
import type { StepText } from './step-text';
import { SAE_TEXT_EN } from './sae-text.en';
import { SAE_TEXT_RU } from './sae-text.ru';
import { SAE_TEXT_UK } from './sae-text.uk';

export interface SaeText {
  labels: {
    ssid: string;
    passphrase: string;
    apMac: string;
    clientMac: string;
    pwdSeed: string;
    pt: string;
    pwe: string;
    clCommit: string;
    apCommit: string;
    clScalar: string;
    clElement: string;
    apScalar: string;
    apElement: string;
    sharedK: string;
    keyseed: string;
    saeKck: string;
    pmk: string;
    pmkid: string;
    clConfirm: string;
    apConfirm: string;
    ptk: string;
    m1: string;
    m2: string;
    m3: string;
    m4: string;
    keyDataPlain: string;
    keyDataWrapped: string;
  };
  /** Названия способов вывода PWE для переключателя и блока «Вычисление». */
  methodLabel: { h2e: string; hnp: string };
  /** Однострочное пояснение к способу под переключателем. */
  methodHint: { h2e: string; hnp: string };
  /** Таблица итераций Hunting-and-Pecking; в `masked` подставляются {from} и {to}. */
  hnp: { header: string; yes: string; no: string; found: string; masked: string };
  droppedLabel: string;
  ok: string;
  fail: string;
  /** Итог проверки чужого Commit. */
  passed: string;
  rejected: string;
  /** Подписи полей кадра Commit на байтовой диаграмме. */
  frameFields: { auth: string; group: string; scalar: string; element: string };
  /** 13 шагов; шаги 1 и 2 — вариант H2E. */
  steps: StepText[];
  /** Шаги 1 и 2 для варианта Hunting-and-Pecking. */
  hnpSteps: [StepText, StepText];
}

export const SAE_TEXT: Record<Lang, SaeText> = {
  ru: SAE_TEXT_RU,
  uk: SAE_TEXT_UK,
  en: SAE_TEXT_EN,
};
