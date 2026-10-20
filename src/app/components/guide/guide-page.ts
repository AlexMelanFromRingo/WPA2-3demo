import { afterNextRender, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { GuideTag } from '../../core/guide/guide-model';
import { GUIDE } from '../../core/guide/guide';
import { LocaleService } from '../../core/i18n/locale.service';
import type { UiKey } from '../../core/i18n/ui-text';
import { GuideBlockView } from './guide-block';

/** Цвет метки главы. */
const TAG: Record<GuideTag, { dot: string; text: string; key: UiKey }> = {
  common: { dot: 'bg-slate-400', text: 'text-slate-500', key: 'gTagCommon' },
  wpa2: { dot: 'bg-blue-600', text: 'text-blue-700', key: 'gTagWpa2' },
  wpa3: { dot: 'bg-teal-600', text: 'text-teal-700', key: 'gTagWpa3' },
  attack: { dot: 'bg-red-500', text: 'text-red-700', key: 'gTagAttack' },
};

/**
 * Справочник WPA2/WPA3 — длинное чтение с оглавлением: липким слева на широких
 * экранах и сворачиваемым на узких. Текущая глава подсвечивается в оглавлении.
 */
@Component({
  selector: 'app-guide-page',
  imports: [GuideBlockView, RouterLink],
  template: `
    <div
      class="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-12"
    >
      <aside class="hidden lg:block">
        <nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pb-6" [attr.aria-label]="t('gToc')">
          <p class="text-sm font-semibold text-slate-900">{{ t('gToc') }}</p>
          <ol class="mt-3 flex flex-col border-l border-slate-200">
            @for (chapter of guide().chapters; track chapter.id) {
              <li>
                <a
                  [routerLink]="[]"
                  [fragment]="chapter.id"
                  (click)="go(chapter.id)"
                  class="-ml-px flex gap-2 border-l-2 py-1.5 pl-3 pr-1 text-[13px] leading-snug transition-colors"
                  [class]="
                    active() === chapter.id
                      ? 'border-blue-600 font-semibold text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  "
                >
                  <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" [class]="tag(chapter.tag).dot"></span>
                  <span>{{ chapter.title }}</span>
                </a>
              </li>
            }
          </ol>
        </nav>
      </aside>

      <article class="min-w-0">
        <header class="max-w-[72ch]">
          <h1 class="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-[2.25rem]">
            {{ guide().title }}
          </h1>
          <p class="mt-3 text-base leading-7 text-slate-600 sm:text-[17px]">{{ guide().lead }}</p>
        </header>

        <div class="mt-6">
          <app-guide-block [block]="guide().hero" />
        </div>

        <details class="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm lg:hidden">
          <summary class="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-slate-800">
            {{ t('gTocMobile') }}
          </summary>
          <ol class="flex flex-col border-t border-slate-200 px-2 py-2">
            @for (chapter of guide().chapters; track chapter.id) {
              <li>
                <a
                  [routerLink]="[]"
                  [fragment]="chapter.id"
                  (click)="go(chapter.id)"
                  class="flex gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" [class]="tag(chapter.tag).dot"></span>
                  <span>{{ chapter.title }}</span>
                </a>
              </li>
            }
          </ol>
        </details>

        @for (chapter of guide().chapters; track chapter.id; let n = $index) {
          <section [id]="chapter.id" class="guide-chapter mt-14 scroll-mt-20 first-of-type:mt-10">
            <h2 class="flex items-baseline gap-3 text-2xl font-bold leading-tight tracking-tight text-slate-900">
              <span
                class="shrink-0 font-mono text-base font-semibold"
                [class]="tag(chapter.tag).text"
                [attr.title]="t(tag(chapter.tag).key)"
                >{{ n + 1 }}</span
              >
              <span>{{ chapter.title }}</span>
            </h2>
            @if (chapter.lead) {
              <p class="mt-2 max-w-[72ch] text-base italic leading-7 text-slate-500">{{ chapter.lead }}</p>
            }
            <div class="mt-5 flex flex-col gap-5">
              @for (block of chapter.blocks; track $index) {
                <app-guide-block [block]="block" />
              }
            </div>
          </section>
        }

        <p class="mt-16 border-t border-slate-200 pt-4 text-sm">
          <button type="button" (click)="toTop()" class="text-blue-700 hover:underline">{{ t('gToTop') }}</button>
        </p>
      </article>
    </div>
  `,
})
export class GuidePage {
  private readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);

  protected readonly t = this.locale.t;
  protected readonly guide = computed(() => GUIDE[this.locale.lang()]);
  /** Якорь главы, которая сейчас в зоне чтения. */
  protected readonly active = signal<string>('');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const fragment = this.route.snapshot.fragment;
      if (fragment) {
        this.go(fragment, true);
      }
      if (typeof IntersectionObserver === 'undefined') {
        return;
      }
      const sections = document.querySelectorAll('section.guide-chapter');
      const first = sections[0];
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((entry) => entry.isIntersecting);
          if (visible.length > 0) {
            this.active.set(visible[0].target.id);
          } else if (entries.some((entry) => entry.boundingClientRect.top > 0 && entry.target === first)) {
            // Вернулись выше первой главы — в оглавлении ничего не подсвечено.
            this.active.set('');
          }
        },
        { rootMargin: '-15% 0px -75% 0px' },
      );
      sections.forEach((section) => observer.observe(section));
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected tag(tag: GuideTag) {
    return TAG[tag];
  }

  /** Прокручивает к главе: плавно по клику, мгновенно — при открытии ссылки и prefers-reduced-motion. */
  protected go(id: string, instant = false): void {
    const target = document.getElementById(id);
    if (!target) {
      return;
    }
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    target.scrollIntoView({ behavior: reduce || instant ? 'auto' : 'smooth', block: 'start' });
    this.active.set(id);
  }

  protected toTop(): void {
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
}
