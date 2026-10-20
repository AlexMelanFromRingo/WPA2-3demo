/** Справочник WPA2/WPA3 по языкам интерфейса. */
import type { Lang } from '../i18n/ui-text';
import type { GuideContent } from './guide-model';
import { GUIDE_EN } from './guide.en';
import { GUIDE_RU } from './guide.ru';
import { GUIDE_UK } from './guide.uk';

export const GUIDE: Record<Lang, GuideContent> = {
  ru: GUIDE_RU,
  uk: GUIDE_UK,
  en: GUIDE_EN,
};
