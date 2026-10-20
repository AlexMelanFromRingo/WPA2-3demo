/**
 * Минимальный разбор инлайн-разметки справочника: `**жирный**` и `` `код` ``.
 * Возвращает сегменты для безопасного рендера шаблоном (без innerHTML).
 */

/** Сегмент строки. */
export interface InlineSegment {
  kind: 'text' | 'strong' | 'code';
  text: string;
}

const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Делит строку на сегменты текста, жирного и кода. */
export function parseInline(source: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ kind: 'text', text: source.slice(last, index) });
    }
    const token = match[0];
    segments.push(
      token.startsWith('**')
        ? { kind: 'strong', text: token.slice(2, -2) }
        : { kind: 'code', text: token.slice(1, -1) },
    );
    last = index + token.length;
  }
  if (last < source.length) {
    segments.push({ kind: 'text', text: source.slice(last) });
  }
  return segments;
}
