/**
 * Общие типы и помощник для трёхъязычного текста шагов модулей.
 * Реальные hex-значения подставляются в шаблоны поверх переведённых меток.
 */
import type { GlossaryTerm } from '../models';

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
}

/** Подставляет `{ключ}` → значение из карты переменных. */
export function interpolate(line: string, vars: Record<string, string>): string {
  return line.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

/** Применяет `interpolate` ко всем строкам блока «Вычисление». */
export function fillCalc(calc: readonly string[], vars: Record<string, string>): string[] {
  return calc.map((line) => interpolate(line, vars));
}
