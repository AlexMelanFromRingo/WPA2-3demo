import { Component, computed, inject, input } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import type { VisualizationStep } from '../../../core/models';
import { LocaleService } from '../../../core/i18n/locale.service';
import { ByteGrid } from '../byte-grid/byte-grid';
import { DataFlowDiagram } from '../data-flow-diagram/data-flow-diagram';
import { HexInspector } from '../hex-inspector/hex-inspector';
import { Tooltip } from '../tooltip/tooltip';

/**
 * Карточка одного шага в «лабораторном» стиле (по образцу TOTP_demo / rsa16-edu):
 * левая акцентная полоса, разделы-метки, формула, блок «Вычисление» с реальными
 * значениями, разбор терминов, схема потока и hex-дампы.
 */
@Component({
  selector: 'app-step-card',
  imports: [ByteGrid, DataFlowDiagram, HexInspector, Tooltip],
  animations: [
    trigger('stepChange', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateX(14px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
  template: `
    <article
      [@stepChange]="step().index"
      class="rounded-lg border border-l-4 border-slate-200 border-l-blue-600 bg-white p-5 shadow-sm"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-lg font-semibold text-blue-700">{{ step().title }}</h3>
        <app-tooltip [text]="step().tooltip">
          <span
            class="flex h-5 w-5 cursor-help items-center justify-center rounded-full
                   bg-slate-200 text-xs font-bold text-slate-600"
          >
            ?
          </span>
        </app-tooltip>
        @if (step().badge; as badge) {
          <span
            class="rounded px-2 py-0.5 text-xs font-semibold"
            [class.bg-emerald-100]="badge.tone === 'match'"
            [class.text-emerald-800]="badge.tone === 'match'"
            [class.bg-red-100]="badge.tone === 'no-match'"
            [class.text-red-800]="badge.tone === 'no-match'"
            [class.bg-slate-100]="badge.tone === 'info'"
            [class.text-slate-700]="badge.tone === 'info'"
          >
            {{ badge.text }}
          </span>
        }
        <span class="ml-auto text-xs font-medium text-slate-400">{{ progress() }}</span>
      </div>

      <p class="mt-3 text-sm leading-relaxed text-slate-600">{{ step().description }}</p>

      @if (step().formula; as formula) {
        <div class="mt-4">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{
            t('scFormula')
          }}</span>
          <code
            class="mt-1 block overflow-x-auto rounded-md border-l-4 border-blue-500 bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800"
            >{{ formula }}</code
          >
        </div>
      }

      <div class="mt-4">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{
          t('scCalc')
        }}</span>
        <pre
          class="mt-1 overflow-x-auto rounded-md bg-slate-100 px-3 py-3 font-mono text-xs leading-relaxed text-slate-800"
          >{{ calcText() }}</pre
        >
      </div>

      @if (step().byteView; as byteView) {
        <div class="mt-4">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{
            t('scByteView')
          }}</span>
          <div class="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3">
            <app-byte-grid [view]="byteView" />
          </div>
        </div>
      }

      <div class="mt-4">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{
          t('scFlow')
        }}</span>
        <div class="mt-1">
          <app-data-flow-diagram [flow]="step().dataFlow" />
        </div>
      </div>

      <div class="mt-4">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{
          t('scTerms')
        }}</span>
        <dl class="mt-1 flex flex-col gap-2 rounded-md bg-slate-50 p-3">
          @for (term of step().terms; track term.term) {
            <div class="text-sm leading-relaxed">
              <dt class="inline font-semibold text-slate-800">{{ term.term }}</dt>
              <dd class="inline text-slate-600"> — {{ term.definition }}</dd>
            </div>
          }
        </dl>
      </div>

      <div class="mt-4">
        <app-hex-inspector [artifacts]="step().artifacts" />
      </div>
    </article>
  `,
})
export class StepCard {
  /** Текущий шаг модуля. */
  readonly step = input.required<VisualizationStep>();

  /** Подпись прогресса, напр. «Шаг 3 из 8». */
  readonly progress = input<string>('');

  protected readonly t = inject(LocaleService).t;

  /** Текст блока «Вычисление». */
  protected readonly calcText = computed(() => this.step().calc.join('\n'));
}
