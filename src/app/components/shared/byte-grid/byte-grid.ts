import { Component, computed, input } from '@angular/core';
import type { ByteTone, ByteView } from '../../../core/models';

interface Cell {
  index: number;
  text: string;
  tone: ByteTone;
}

/** Классы цвета ячейки/легенды по тону. */
const TONE: Record<ByteTone, string> = {
  kept: 'bg-emerald-50 text-emerald-800',
  kept2: 'bg-sky-50 text-sky-800',
  kept3: 'bg-amber-50 text-amber-900',
  drop: 'bg-slate-100 text-slate-400',
};

/**
 * Байтовая диаграмма — графический разбор «какие байты берутся»
 * (по образцу byte-diagram из TOTP_demo). Регионы окрашены по тону, под
 * диаграммой — легенда и подпись-объяснение.
 */
@Component({
  selector: 'app-byte-grid',
  template: `
    <div>
      <div class="flex flex-wrap gap-1">
        @for (cell of cells(); track cell.index) {
          <div class="flex flex-col items-center">
            <span class="text-[10px] leading-none text-slate-400">{{ cell.index }}</span>
            <span [class]="cellClass(cell.tone)">{{ cell.text }}</span>
          </div>
        }
      </div>

      <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        @for (region of view().regions; track $index) {
          <span class="flex items-center gap-1.5 text-xs text-slate-600">
            <span [class]="swatchClass(region.tone)"></span>
            {{ region.label }} · {{ region.byteCount }}
          </span>
        }
      </div>

      <p class="mt-2 text-xs leading-relaxed text-slate-500">{{ view().caption }}</p>
    </div>
  `,
})
export class ByteGrid {
  /** Описание байтовой диаграммы. */
  readonly view = input.required<ByteView>();

  protected readonly cells = computed<Cell[]>(() => {
    const view = this.view();
    const bytes = view.hex.match(/.{2}/g) ?? [];
    const result: Cell[] = [];
    let index = 0;
    for (const region of view.regions) {
      for (let k = 0; k < region.byteCount; k++) {
        result.push({
          index,
          text: index < bytes.length ? bytes[index] : '✕',
          tone: region.tone,
        });
        index++;
      }
    }
    return result;
  });

  /** Полный набор классов ячейки байта. */
  protected cellClass(tone: ByteTone): string {
    return `mt-0.5 flex h-7 w-7 items-center justify-center rounded font-mono text-xs ${TONE[tone]}`;
  }

  /** Классы квадратика-образца в легенде. */
  protected swatchClass(tone: ByteTone): string {
    return `h-3 w-3 shrink-0 rounded-sm ${TONE[tone]}`;
  }
}
