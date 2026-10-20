/** Подписи полей кадра EAPOL-Key для байтовых диаграмм (UA / EN / RU). */
import type { Lang } from './ui-text';

/** Группа полей кадра на байтовой диаграмме. */
export type FrameRegionId = 'hdr' | 'info' | 'replay' | 'nonce' | 'zero' | 'mic' | 'keyData';

export const FRAME_LABELS: Record<Lang, Record<FrameRegionId, string>> = {
  ru: {
    hdr: 'заголовок 802.1X',
    info: 'тип ‖ Key Info ‖ Key Length',
    replay: 'Replay Counter',
    nonce: 'Key Nonce',
    zero: 'IV ‖ RSC ‖ резерв (нули)',
    mic: 'Key MIC',
    keyData: 'длина ‖ Key Data',
  },
  uk: {
    hdr: 'заголовок 802.1X',
    info: 'тип ‖ Key Info ‖ Key Length',
    replay: 'Replay Counter',
    nonce: 'Key Nonce',
    zero: 'IV ‖ RSC ‖ резерв (нулі)',
    mic: 'Key MIC',
    keyData: 'довжина ‖ Key Data',
  },
  en: {
    hdr: '802.1X header',
    info: 'type ‖ Key Info ‖ Key Length',
    replay: 'Replay Counter',
    nonce: 'Key Nonce',
    zero: 'IV ‖ RSC ‖ reserved (zeros)',
    mic: 'Key MIC',
    keyData: 'length ‖ Key Data',
  },
};
