import { Component, input } from '@angular/core';
import type { DataFlow } from '../../../core/models';

/**
 * Схема перетекания данных «вход → преобразование → выход» (FR-005, Принцип II).
 * Обязательна на каждом криптошаге методички.
 */
@Component({
  selector: 'app-data-flow-diagram',
  template: `
    <div
      class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <div class="flex flex-col gap-1">
        @for (inp of flow().inputs; track inp.id) {
          <span
            class="rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300"
          >
            {{ inp.label }}
          </span>
        }
      </div>

      <span class="text-lg text-slate-400" aria-hidden="true">→</span>

      <span class="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">
        {{ flow().transform }}
      </span>

      <span class="text-lg text-slate-400" aria-hidden="true">→</span>

      <div class="flex flex-col gap-1">
        @for (out of flow().outputs; track out.id) {
          <span
            class="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-300"
          >
            {{ out.label }}
          </span>
        }
      </div>
    </div>
  `,
})
export class DataFlowDiagram {
  /** Схема потока данных текущего шага. */
  readonly flow = input.required<DataFlow>();
}
