import { Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import type { SequenceTone, SequenceVariant } from '../../core/guide/guide-model';
import { LocaleService } from '../../core/i18n/locale.service';

/** Цвета фазы: подложка полосы, подпись, стрелка. */
const PHASE: Record<SequenceTone, { band: string; title: string; arrow: string }> = {
  discovery: { band: 'bg-slate-50', title: 'text-slate-500', arrow: 'text-slate-400' },
  auth: { band: 'bg-slate-50', title: 'text-slate-500', arrow: 'text-slate-400' },
  sae: { band: 'bg-teal-50', title: 'text-teal-700', arrow: 'text-teal-600' },
  assoc: { band: 'bg-slate-50', title: 'text-slate-500', arrow: 'text-slate-500' },
  keys: { band: 'bg-blue-50', title: 'text-blue-700', arrow: 'text-blue-600' },
  group: { band: 'bg-blue-50', title: 'text-blue-700', arrow: 'text-blue-500' },
  data: { band: 'bg-emerald-50', title: 'text-emerald-800', arrow: 'text-emerald-600' },
};

/**
 * Диаграмма последовательности «клиент ↔ точка доступа» по фазам подключения.
 * Несколько вариантов (WPA2 / WPA3) переключаются вкладками; кнопка проигрывает
 * обмен по одному кадру — движение отвечает на действие пользователя.
 */
@Component({
  selector: 'app-sequence-diagram',
  template: `
    <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div class="flex flex-wrap items-center gap-2">
        @if (variants().length > 1) {
          <div class="flex rounded-lg bg-slate-100 p-0.5" role="tablist">
            @for (variant of variants(); track variant.label) {
              <button
                type="button"
                role="tab"
                class="rounded-md px-3 py-1 text-sm font-semibold transition"
                [attr.aria-selected]="selected() === $index"
                [class]="
                  selected() === $index
                    ? variant.tag === 'wpa3'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                "
                (click)="select($index)"
              >
                {{ variant.label }}
              </button>
            }
          </div>
        } @else {
          <span class="text-sm font-semibold text-slate-700">{{ variant().label }}</span>
        }
        <button
          type="button"
          class="ml-auto rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          (click)="togglePlay()"
        >
          {{ playing() ? t('gShowAll') : t('gPlay') }}
        </button>
      </div>

      <div class="relative mx-auto mt-3 max-w-3xl">
        <!-- линии жизни участников -->
        <span
          class="pointer-events-none absolute bottom-0 top-12 left-7 z-10 w-px bg-slate-300 sm:left-9"
          aria-hidden="true"
        ></span>
        <span
          class="pointer-events-none absolute bottom-0 top-12 right-7 z-10 w-px bg-slate-300 sm:right-9"
          aria-hidden="true"
        ></span>

        <div class="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-end sm:grid-cols-[4.5rem_minmax(0,1fr)_4.5rem]">
          <div class="flex flex-col items-center gap-1 text-center">
            <span class="text-xl" aria-hidden="true">📱</span>
            <span class="text-[11px] font-semibold leading-tight text-slate-700">{{ variant().sta }}</span>
          </div>
          <span></span>
          <div class="flex flex-col items-center gap-1 text-center">
            <span class="text-xl" aria-hidden="true">📡</span>
            <span class="text-[11px] font-semibold leading-tight text-slate-700">{{ variant().ap }}</span>
          </div>
        </div>

        <ol class="mt-2 flex flex-col gap-1.5">
          @for (phase of variant().phases; track phase.title; let p = $index) {
            <li class="rounded-lg py-1.5" [class]="tone(phase.tone).band">
              <p class="px-10 text-[11px] font-semibold leading-snug sm:px-[4.75rem]" [class]="tone(phase.tone).title">
                {{ phase.title }}
              </p>
              <ol>
                @for (message of phase.messages; track $index; let m = $index) {
                  <li
                    class="mx-7 px-1.5 py-1 transition-opacity duration-300 sm:mx-9"
                    [class.opacity-20]="dimmed(p, m)"
                  >
                    <div class="text-center font-mono text-xs font-semibold text-slate-800">
                      {{ message.label }}
                      @if (message.secured) {
                        <span [attr.title]="t('gSecured')" [attr.aria-label]="t('gSecured')">🔒</span>
                      }
                    </div>
                    <div class="relative h-2.5" [class]="tone(phase.tone).arrow" aria-hidden="true">
                      <span
                        class="absolute inset-x-0 top-1/2 -translate-y-1/2"
                        [class]="message.secured ? 'border-t-2 border-dotted border-current' : 'h-0.5 bg-current'"
                      ></span>
                      @if (message.from === 'sta') {
                        <span
                          class="absolute right-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-current"
                        ></span>
                      } @else {
                        <span
                          class="absolute left-0 top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-r-[8px] border-y-transparent border-r-current"
                        ></span>
                      }
                    </div>
                    @if (message.note) {
                      <div class="text-center text-[11px] leading-snug text-slate-500">{{ message.note }}</div>
                    }
                  </li>
                }
              </ol>
            </li>
          }
        </ol>
      </div>
    </div>
  `,
})
export class SequenceDiagram {
  /** Варианты диаграммы (один или несколько). */
  readonly variants = input.required<SequenceVariant[]>();

  protected readonly t = inject(LocaleService).t;
  protected readonly selected = signal(0);
  /** Сколько кадров уже показано при проигрывании; `null` — показаны все. */
  protected readonly shown = signal<number | null>(null);
  protected readonly playing = computed(() => this.shown() !== null);

  protected readonly variant = computed(
    () => this.variants()[Math.min(this.selected(), this.variants().length - 1)],
  );

  /** Сквозной номер первого кадра каждой фазы. */
  private readonly offsets = computed(() => {
    let total = 0;
    return this.variant().phases.map((phase) => {
      const start = total;
      total += phase.messages.length;
      return start;
    });
  });

  private readonly total = computed(() =>
    this.variant().phases.reduce((sum, phase) => sum + phase.messages.length, 0),
  );

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected tone(tone: SequenceTone) {
    return PHASE[tone];
  }

  protected dimmed(phase: number, message: number): boolean {
    const shown = this.shown();
    return shown !== null && this.offsets()[phase] + message >= shown;
  }

  protected select(index: number): void {
    this.stop();
    this.selected.set(index);
  }

  protected togglePlay(): void {
    if (this.playing()) {
      this.stop();
      return;
    }
    this.shown.set(1);
    this.timer = setInterval(() => {
      const next = (this.shown() ?? 0) + 1;
      if (next > this.total()) {
        this.stop();
      } else {
        this.shown.set(next);
      }
    }, 900);
  }

  private stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.shown.set(null);
  }
}
