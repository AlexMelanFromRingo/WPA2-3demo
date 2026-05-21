/**
 * Теоретические разделы методички — учебный текст со ссылками на стандарты,
 * на трёх языках (Принципы I, II конституции). Подаётся в каждом модуле как
 * сворачиваемая панель «Теория».
 */
import type { Lang } from './i18n/ui-text';
import type { ModuleId, ModuleTheory } from './models';
import { THEORY_EN } from './i18n/theory.en';
import { THEORY_RU } from './i18n/theory.ru';
import { THEORY_UK } from './i18n/theory.uk';

/** Теория модулей по языку интерфейса и идентификатору модуля. */
export const MODULE_THEORY: Record<Lang, Record<ModuleId, ModuleTheory>> = {
  ru: THEORY_RU,
  uk: THEORY_UK,
  en: THEORY_EN,
};
