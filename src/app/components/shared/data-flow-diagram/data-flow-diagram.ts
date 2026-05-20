import { Component, input } from '@angular/core';
import type { DataFlow } from '../../../core/models';

/**
 * Анимированная схема перетекания данных «вход → преобразование → выход»
 * (FR-005, Принцип II). По «дорожкам» между блоками непрерывно бежит поток,
 * наглядно показывая движение данных.
 */
@Component({
  selector: 'app-data-flow-diagram',
  styles: [
    `
      @keyframes dfd-flow {
        to {
          background-position-x: -16px;
        }
      }
      @keyframes dfd-pulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(2, 132, 199, 0);
        }
        50% {
          box-shadow: 0 0 0 5px rgba(2, 132, 199, 0.16);
        }
      }
      @keyframes dfd-in {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: none;
        }
      }
      .dfd-lane {
        background-image: linear-gradient(
          90deg,
          #38bdf8 0 9px,
          transparent 9px 16px
        );
        background-size: 16px 100%;
        animation: dfd-flow 0.7s linear infinite;
      }
      .dfd-transform {
        animation: dfd-pulse 2.2s ease-in-out infinite;
      }
      .dfd-chip {
        animation: dfd-in 0.35s ease-out both;
      }
      @media (prefers-reduced-motion: reduce) {
        .dfd-lane,
        .dfd-transform,
        .dfd-chip {
          animation: none;
        }
      }
    `,
  ],
  template: `
    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div class="flex flex-col gap-1">
        @for (input of flow().inputs; track input.id) {
          <span
            class="dfd-chip rounded bg-white px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-300"
            [style.animationDelay]="$index * 70 + 'ms'"
          >
            {{ input.label }}
          </span>
        } @empty {
          <span class="text-xs text-slate-400">— нет входов —</span>
        }
      </div>

      <span class="dfd-lane h-1 min-w-[2rem] flex-1 rounded-full" aria-hidden="true"></span>

      <span
        class="dfd-transform rounded-md bg-sky-600 px-3 py-1.5 text-center text-xs font-semibold text-white"
      >
        {{ flow().transform }}
      </span>

      @if (flow().outputs.length > 0) {
        <span class="dfd-lane h-1 min-w-[2rem] flex-1 rounded-full" aria-hidden="true"></span>

        <div class="flex flex-col gap-1">
          @for (output of flow().outputs; track output.id) {
            <span
              class="dfd-chip rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-300"
              [style.animationDelay]="$index * 70 + 'ms'"
            >
              {{ output.label }}
            </span>
          }
        </div>
      }
    </div>
  `,
})
export class DataFlowDiagram {
  /** Схема потока данных текущего шага. */
  readonly flow = input.required<DataFlow>();
}
