/** Текст шагов модуля WPA2 на трёх языках. */
import type { Lang } from './ui-text';
import type { StepText } from './step-text';
import { WPA2_TEXT_EN } from './wpa2-text.en';
import { WPA2_TEXT_RU } from './wpa2-text.ru';
import { WPA2_TEXT_UK } from './wpa2-text.uk';

export interface Wpa2Text {
  labels: {
    ssid: string;
    passphrase: string;
    apMac: string;
    clientMac: string;
    gtk: string;
    blockB: string;
    pmkid: string;
    ptkRaw: string;
    m1: string;
    m2: string;
    m2Zero: string;
    m3: string;
    m4: string;
    keyDataPlain: string;
    keyDataWrapped: string;
    gtkUnwrapped: string;
  };
  /** Подпись «отброшено» для байтовых диаграмм. */
  droppedLabel: string;
  /** Итог проверки: совпало / не совпало. */
  ok: string;
  fail: string;
  /** 11 шагов: исходные данные, PMK, M1, B, PTK, KCK/KEK/TK, M2, проверка M2, M3, проверка M3, M4. */
  steps: StepText[];
}

export const WPA2_TEXT: Record<Lang, Wpa2Text> = {
  ru: WPA2_TEXT_RU,
  uk: WPA2_TEXT_UK,
  en: WPA2_TEXT_EN,
};
