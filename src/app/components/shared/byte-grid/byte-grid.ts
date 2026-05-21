import { Component, computed, input } from '@angular/core';
import type { ByteView } from '../../../core/models';

interface Cell {
  index: number;
  text: string;
  kept: boolean;
}

/**
 * Байтовая диаграмма — графический разбор «какие байты берутся»
 * (по образцу byte-diagram из TOTP_demo). Зелёные ячейки — взятые байты,
 * серые с «✕» — отброшенные. Под диаграммой — подпись с объяснением.
 */
@Component({
  selector: 'app-byte-grid',
  template: `
    <div>
      <div class="flex flex-wrap gap-1">
        @for (cell of cells(); track cell.index) {
          <div class="flex flex-col items-center">
            <span class="text-[10px] leading-none text-slate-400">{{ cell.index }}</span>
            <span
              class="mt-0.5 flex h-7 w-7 items-center justify-center rounded font-mono text-xs"
              [class.bg-emerald-50]="cell.kept"
              [class.text-emerald-800]="cell.kept"
              [class.ring-1]="cell.kept"
              [class.ring-emerald-300]="cell.kept"
              [class.bg-slate-100]="!cell.kept"
              [class.text-slate-400]="!cell.kept"
              >{{ cell.text }}</span
            >
          </div>
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
    const kept = view.keptHex.match(/.{2}/g) ?? [];
    const result: Cell[] = [];
    for (let i = 0; i < view.totalCells; i++) {
      result.push(
        i < kept.length
          ? { index: i, text: kept[i], kept: true }
          : { index: i, text: '✕', kept: false },
      );
    }
    return result;
  });
}
