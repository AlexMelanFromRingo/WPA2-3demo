import { Component, inject, input } from '@angular/core';
import type { ModuleTheory } from '../../../core/models';
import { LocaleService } from '../../../core/i18n/locale.service';

/**
 * Сворачиваемая панель «Теория» — учебный текст модуля со ссылками на
 * стандарты и RFC (Принципы I, II конституции).
 */
@Component({
  selector: 'app-theory-panel',
  template: `
    <details class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary
        class="flex cursor-pointer select-none items-center gap-2 rounded-xl px-5 py-3
               text-sm font-semibold text-slate-800 hover:bg-slate-50"
      >
        <span class="text-base">📖</span>
        <span>{{ t('tpTheory') }}: {{ theory().title }}</span>
      </summary>

      <div class="border-t border-slate-200 px-5 py-4">
        <p class="text-sm italic leading-relaxed text-slate-500">{{ theory().summary }}</p>

        @for (section of theory().sections; track section.heading) {
          <section class="mt-5">
            <h4 class="text-sm font-semibold text-slate-800">{{ section.heading }}</h4>
            @for (paragraph of split(section.body); track $index) {
              <p class="mt-2 text-sm leading-relaxed text-slate-600">{{ paragraph }}</p>
            }
          </section>
        }

        <div class="mt-6 border-t border-slate-200 pt-4">
          <h4 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ t('tpSources') }}
          </h4>
          <ul class="mt-2 flex flex-col gap-1.5">
            @for (reference of theory().references; track reference.url) {
              <li>
                <a
                  [href]="reference.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-sm text-sky-700 hover:underline"
                >
                  {{ reference.label }} ↗
                </a>
              </li>
            }
          </ul>
        </div>
      </div>
    </details>
  `,
})
export class TheoryPanel {
  /** Теоретический материал модуля. */
  readonly theory = input.required<ModuleTheory>();

  protected readonly t = inject(LocaleService).t;

  /** Делит текст раздела на абзацы. */
  protected split(body: string): string[] {
    return body.split('\n\n');
  }
}
