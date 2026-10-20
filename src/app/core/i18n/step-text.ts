/**
 * Общие типы и помощник для трёхъязычного текста шагов модулей.
 * Реальные hex-значения подставляются в шаблоны поверх переведённых меток.
 */
import type { GlossaryTerm } from '../models';
import type { Lang } from './ui-text';

/** Переводимый текст одного шага визуализации. */
export interface StepText {
  title: string;
  tooltip: string;
  description: string;
  /** Абстрактная формула шага (необязательна). */
  formula?: string;
  terms: GlossaryTerm[];
  /** Подпись преобразования в схеме потока данных. */
  transform: string;
  /** Строки блока «Вычисление» с плейсхолдерами `{ключ}`. */
  calc: string[];
  /** Подпись летящего пакета (необязательна). */
  packetLabel?: string;
  /** Подпись-объяснение под байтовой диаграммой (необязательна). */
  byteCaption?: string;
}

/** Подставляет `{ключ}` → значение из карты переменных. */
export function interpolate(line: string, vars: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

/**
 * Применяет `interpolate` ко всем строкам блока «Вычисление» и выравнивает
 * колонки: подряд идущие строки с символом табуляции образуют таблицу, ячейки
 * дополняются пробелами до общей ширины колонки. Последняя ячейка строки
 * ширину колонки не задаёт — длинные значения (nonce, Key Data) не сдвигают
 * пояснения у коротких.
 */
export function fillCalc(
  calc: readonly string[],
  vars: Record<string, string>,
  lang?: Lang,
): string[] {
  const lines = calc.flatMap((line) =>
    agreeBytes(interpolate(line, vars), lang).split('\n'),
  );
  const out: string[] = [];
  for (let start = 0; start < lines.length; ) {
    if (!lines[start].includes('\t')) {
      out.push(lines[start++]);
      continue;
    }
    let end = start;
    while (end < lines.length && lines[end].includes('\t')) {
      end++;
    }
    const rows = lines.slice(start, end).map((line) => line.split('\t'));
    const widths: number[] = [];
    for (const cells of rows) {
      cells.slice(0, -1).forEach((cell, i) => (widths[i] = Math.max(widths[i] ?? 0, cell.length)));
    }
    for (const cells of rows) {
      out.push(cells.map((cell, i) => (i < cells.length - 1 ? cell.padEnd(widths[i]) : cell)).join('  '));
    }
    start = end;
  }
  return out;
}

/**
 * Согласует слово «байт» с числом перед ним: в шаблоны подставляются
 * вычисленные длины, и «22 байт» должно стать «22 байта» (RU) / «22 байти» (UK).
 */
function agreeBytes(line: string, lang?: Lang): string {
  const form = (n: number, one: string, few: string, many: string) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) {
      return one;
    }
    return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
  };
  if (lang === 'ru') {
    return line.replace(/(\d+) байт(?:а|ов)?(?![а-яё])/g, (_, n: string) =>
      `${n} ${form(Number(n), 'байт', 'байта', 'байт')}`,
    );
  }
  if (lang === 'uk') {
    return line.replace(/(\d+) байт(?:и|ів)?(?![а-яіїєґ’'])/g, (_, n: string) =>
      `${n} ${form(Number(n), 'байт', 'байти', 'байтів')}`,
    );
  }
  return line;
}
