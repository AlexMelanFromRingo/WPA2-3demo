import { Component, inject, input } from '@angular/core';
import type { FrameField } from '../../core/guide/guide-model';
import { LocaleService } from '../../core/i18n/locale.service';

/** Подложка поля по части кадра. */
const PART: Record<FrameField['part'], string> = {
  header: 'border-slate-300 bg-slate-100',
  body: 'border-slate-200 bg-white',
  nonce: 'border-sky-200 bg-sky-50',
  mic: 'border-amber-300 bg-amber-50',
  data: 'border-emerald-300 bg-emerald-50',
};

/**
 * «Полоса полей» кадра: ширина плитки растёт с размером поля (с ограничением),
 * поэтому сразу видно, где крупные поля — nonce, MIC, данные.
 */
@Component({
  selector: 'app-frame-strip',
  template: `
    <figure class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <figcaption class="mb-2 text-sm font-semibold text-slate-800">{{ title() }}</figcaption>
      <ol class="flex flex-wrap gap-1">
        @for (field of fields(); track field.name) {
          <li
            class="flex min-w-[6.5rem] flex-col rounded-md border px-2 py-1.5"
            [class]="partClass(field)"
            [style.flex]="grow(field) + ' 1 0'"
          >
            <span class="text-xs font-semibold leading-tight text-slate-800">{{ field.name }}</span>
            <span class="font-mono text-[11px] text-slate-500">{{ field.bytes }} {{ t('gBytesShort') }}</span>
            <span class="mt-0.5 text-[11px] leading-snug text-slate-600">{{ field.note }}</span>
          </li>
        }
      </ol>
    </figure>
  `,
})
export class FrameStrip {
  readonly title = input.required<string>();
  readonly fields = input.required<FrameField[]>();

  protected readonly t = inject(LocaleService).t;

  protected partClass(field: FrameField): string {
    return PART[field.part];
  }

  /** Коэффициент роста плитки: пропорционален размеру, но не больше 16. */
  protected grow(field: FrameField): number {
    return typeof field.bytes === 'number' ? Math.min(Math.max(field.bytes, 1), 16) : 12;
  }
}
