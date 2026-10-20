/**
 * Наглядный разбор кадров EAPOL-Key: байтовая диаграмма по полям и
 * переменные для блока «Вычисление» (общие для модулей WPA2 и WPA3).
 */
import type { FourWayMessage } from '../../core/crypto/fourway';
import { bytesToHex } from '../../core/crypto/hex';
import { FRAME_LABELS } from '../../core/i18n/frame-text';
import type { Lang } from '../../core/i18n/ui-text';
import type { ByteView } from '../../core/models';

/** Байтовая диаграмма кадра: каждая группа полей окрашена своим тоном. */
export function frameByteView(message: FourWayMessage, lang: Lang, caption: string): ByteView {
  const labels = FRAME_LABELS[lang];
  return {
    hex: bytesToHex(message.frame),
    regions: [
      { label: labels.hdr, byteCount: 4, tone: 'kept3' },
      { label: labels.info, byteCount: 5, tone: 'kept2' },
      { label: labels.replay, byteCount: 8, tone: 'kept3' },
      { label: labels.nonce, byteCount: 32, tone: 'kept' },
      { label: labels.zero, byteCount: 32, tone: 'drop' },
      { label: labels.mic, byteCount: 16, tone: 'kept2' },
      { label: labels.keyData, byteCount: 2 + message.fields.keyData.length, tone: 'kept3' },
    ],
    caption,
  };
}

const hex16 = (value: number) => value.toString(16).padStart(4, '0');

/**
 * Переменные `{<p>Info}`, `{<p>Nonce}`… для шаблонов «Вычисления»:
 * поля кадра по отдельности, чтобы их можно было разобрать построчно.
 */
export function frameVars(prefix: string, message: FourWayMessage): Record<string, string> {
  const f = message.fields;
  const frame = message.frame;
  return {
    [`${prefix}Ver`]: f.protocolVersion.toString(16).padStart(2, '0'),
    [`${prefix}BodyLen`]: hex16(frame.length - 4),
    [`${prefix}BodyLenDec`]: String(frame.length - 4),
    [`${prefix}Info`]: hex16(f.keyInfo),
    [`${prefix}KeyLen`]: hex16(f.keyLength),
    [`${prefix}Replay`]: f.replayCounter.toString(16).padStart(16, '0'),
    [`${prefix}Nonce`]: bytesToHex(f.nonce),
    [`${prefix}Mic`]: bytesToHex(f.mic),
    [`${prefix}KdLen`]: hex16(f.keyData.length),
    [`${prefix}KdLenDec`]: String(f.keyData.length),
    [`${prefix}Kd`]: bytesToHex(f.keyData),
    [`${prefix}Size`]: String(frame.length),
    [`${prefix}Frame`]: bytesToHex(frame),
  };
}
