import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CalloutTone, GuideBlock, GuideTag } from '../../core/guide/guide-model';
import { LocaleService } from '../../core/i18n/locale.service';
import { FrameStrip } from './frame-strip';
import { KeyTree } from './key-tree';
import { RichText } from './rich-text';
import { SequenceDiagram } from './sequence-diagram';

type BlockOf<K extends GuideBlock['kind']> = Extract<GuideBlock, { kind: K }>;

/** Классы врезки по тону. */
const CALLOUT: Record<CalloutTone, { box: string; title: string }> = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-900', title: 'text-sky-800' },
  warn: { box: 'border-amber-300 bg-amber-50 text-amber-900', title: 'text-amber-900' },
  danger: { box: 'border-red-300 bg-red-50 text-red-900', title: 'text-red-800' },
  ok: { box: 'border-emerald-300 bg-emerald-50 text-emerald-900', title: 'text-emerald-800' },
};

/** Точка ленты времени по смысловой метке. */
const DOT: Record<GuideTag, string> = {
  common: 'bg-slate-400',
  wpa2: 'bg-blue-600',
  wpa3: 'bg-teal-600',
  attack: 'bg-red-500',
};

/** Ширина прозы — комфортная длина строки. */
const PROSE = 'max-w-[72ch]';

/**
 * Рендер одного блока справочника. Каждая ветка получает уже суженный тип
 * блока через `of(kind)`.
 */
@Component({
  selector: 'app-guide-block',
  imports: [FrameStrip, KeyTree, RichText, RouterLink, SequenceDiagram],
  template: `
    @if (of('p'); as b) {
      <p [class]="prose + ' text-[15px] leading-7 text-slate-700'"><app-rich-text [text]="b.text" /></p>
    }

    @if (of('h'); as b) {
      <h3 class="pt-2 text-lg font-semibold tracking-tight text-slate-900">{{ b.text }}</h3>
    }

    @if (of('list'); as b) {
      <ul
        [class]="prose + ' flex flex-col gap-2 pl-5 text-[15px] leading-7 text-slate-700'"
        [class.list-disc]="!b.ordered"
        [class.list-decimal]="b.ordered"
      >
        @for (item of b.items; track $index) {
          <li class="pl-1 marker:text-slate-400"><app-rich-text [text]="item" /></li>
        }
      </ul>
    }

    @if (of('formula'); as b) {
      <figure>
        <pre
          class="overflow-x-auto whitespace-pre rounded-lg border-l-4 border-blue-500 bg-slate-100 px-4 py-3 font-mono text-[13px] leading-6 text-slate-800"
          >{{ b.text }}</pre
        >
        @if (b.caption) {
          <figcaption class="mt-1 text-xs text-slate-500">{{ b.caption }}</figcaption>
        }
      </figure>
    }

    @if (of('callout'); as b) {
      <aside [class]="prose + ' rounded-xl border px-4 py-3 text-sm leading-6 ' + callout(b.tone).box">
        @if (b.title) {
          <p class="font-semibold" [class]="callout(b.tone).title">{{ b.title }}</p>
        }
        <p [class.mt-1]="!!b.title"><app-rich-text [text]="b.text" /></p>
      </aside>
    }

    @if (of('table'); as b) {
      <figure>
        @if (b.caption) {
          <figcaption class="mb-2 text-sm font-semibold text-slate-800">{{ b.caption }}</figcaption>
        }
        @if (b.head.length >= 4) {
          <!-- на узких экранах широкая таблица превращается в стопку карточек -->
          <div class="flex flex-col gap-2 sm:hidden">
            @for (row of b.rows; track $index) {
              <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p class="text-sm font-semibold text-slate-900"><app-rich-text [text]="row[0]" /></p>
                <dl class="mt-1.5 flex flex-col gap-1">
                  @for (cell of row.slice(1); track $index) {
                    <div class="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2 text-[13px] leading-snug">
                      <dt class="text-slate-500">{{ b.head[$index + 1] }}</dt>
                      <dd class="text-slate-700"><app-rich-text [text]="cell" /></dd>
                    </div>
                  }
                </dl>
              </div>
            }
          </div>
        }
        <div
          class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
          [class]="b.head.length >= 4 ? 'hidden sm:block' : ''"
        >
          <table
            class="w-full border-collapse text-left text-[13px] leading-snug"
            [class]="b.head.length >= 4 ? 'min-w-[34rem]' : ''"
          >
            <thead class="bg-slate-50">
              <tr>
                @for (cell of b.head; track $index) {
                  <th class="border-b border-slate-200 px-3 py-2 font-semibold text-slate-700">{{ cell }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of b.rows; track $index) {
                <tr class="align-top even:bg-slate-50">
                  @for (cell of row; track $index; let first = $first) {
                    <td
                      class="border-b border-slate-200 px-3 py-2 text-slate-700"
                      [class.font-semibold]="first"
                      [class.text-slate-800]="first"
                    >
                      <app-rich-text [text]="cell" />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </figure>
    }

    @if (of('terms'); as b) {
      <dl class="grid gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        @for (item of b.items; track item.term) {
          <div class="text-sm leading-6">
            <dt class="inline font-semibold text-slate-900">{{ item.term }}</dt>
            <dd class="inline text-slate-600"> — <app-rich-text [text]="item.definition" /></dd>
          </div>
        }
      </dl>
    }

    @if (of('steps'); as b) {
      <ol class="flex flex-col gap-3">
        @for (step of b.items; track step.title) {
          <li class="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 font-mono text-xs font-bold text-white"
              aria-hidden="true"
              >{{ $index + 1 }}</span
            >
            <div class="min-w-0 flex-1">
              <h4 class="font-semibold leading-snug text-slate-900">{{ step.title }}</h4>
              @if (step.meta) {
                <p class="mt-0.5 font-mono text-[11px] text-slate-500">{{ step.meta }}</p>
              }
              @for (paragraph of paragraphs(step.text); track $index) {
                <p class="mt-2 max-w-[70ch] text-sm leading-6 text-slate-700">
                  <app-rich-text [text]="paragraph" />
                </p>
              }
              @if (step.formula) {
                <pre
                  class="mt-2 overflow-x-auto rounded-md border-l-4 border-blue-500 bg-slate-100 px-3 py-2 font-mono text-xs text-slate-800"
                  >{{ step.formula }}</pre
                >
              }
            </div>
          </li>
        }
      </ol>
    }

    @if (of('timeline'); as b) {
      <ol class="relative ml-2 border-l-2 border-slate-200">
        @for (item of b.items; track item.year + item.title) {
          <li class="relative pb-5 pl-6 last:pb-0">
            <span
              class="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-(--page-bg)"
              [class]="dot(item.tag)"
              aria-hidden="true"
            ></span>
            <p class="font-mono text-xs font-semibold text-slate-500">{{ item.year }}</p>
            <h4 class="font-semibold text-slate-900">{{ item.title }}</h4>
            <p [class]="prose + ' mt-1 text-sm leading-6 text-slate-700'">
              <app-rich-text [text]="item.text" />
            </p>
          </li>
        }
      </ol>
    }

    @if (of('sequence'); as b) {
      <figure>
        <app-sequence-diagram [variants]="b.variants" />
        @if (b.caption) {
          <figcaption [class]="prose + ' mt-2 text-xs leading-5 text-slate-500'">{{ b.caption }}</figcaption>
        }
      </figure>
    }

    @if (of('keytree'); as b) {
      <figure>
        <app-key-tree [main]="b.main" [asideTitle]="b.asideTitle" [aside]="b.aside" />
        @if (b.caption) {
          <figcaption [class]="prose + ' mt-2 text-xs leading-5 text-slate-500'">{{ b.caption }}</figcaption>
        }
      </figure>
    }

    @if (of('frame'); as b) {
      <div>
        <app-frame-strip [title]="b.title" [fields]="b.fields" />
        @if (b.caption) {
          <p [class]="prose + ' mt-2 text-xs leading-5 text-slate-500'">{{ b.caption }}</p>
        }
      </div>
    }

    @if (of('proscons'); as b) {
      <div class="grid gap-3 sm:grid-cols-2">
        @for (column of b.columns; track column.title) {
          <section
            class="rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm"
            [class.border-l-emerald-500]="column.tone === 'ok'"
            [class.border-l-red-500]="column.tone === 'danger'"
          >
            <h4
              class="text-sm font-semibold"
              [class.text-emerald-800]="column.tone === 'ok'"
              [class.text-red-800]="column.tone === 'danger'"
            >
              {{ column.title }}
            </h4>
            <ul class="mt-2 flex flex-col gap-1.5 text-sm leading-6 text-slate-700">
              @for (item of column.items; track $index) {
                <li class="flex gap-2">
                  <span aria-hidden="true" class="shrink-0">{{ column.tone === 'ok' ? '+' : '−' }}</span>
                  <span><app-rich-text [text]="item" /></span>
                </li>
              }
            </ul>
          </section>
        }
      </div>
    }

    @if (of('links'); as b) {
      <ul class="grid gap-2 sm:grid-cols-2">
        @for (link of b.items; track link.label) {
          <li>
            @if (link.route) {
              <a
                [routerLink]="link.route"
                class="block h-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-400"
              >
                <span class="text-sm font-semibold text-blue-700">{{ link.label }}</span>
                @if (link.note) {
                  <span class="mt-0.5 block text-xs leading-5 text-slate-500">{{ link.note }}</span>
                }
              </a>
            } @else {
              <a
                [href]="link.href"
                target="_blank"
                rel="noopener noreferrer"
                class="block h-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-400"
              >
                <span class="text-sm font-semibold text-sky-700">{{ link.label }} ↗</span>
                @if (link.note) {
                  <span class="mt-0.5 block text-xs leading-5 text-slate-500">{{ link.note }}</span>
                }
              </a>
            }
          </li>
        }
      </ul>
    }
  `,
})
export class GuideBlockView {
  readonly block = input.required<GuideBlock>();

  protected readonly t = inject(LocaleService).t;
  protected readonly prose = PROSE;

  /** Блок нужного вида или `null` — сужает тип для ветки шаблона. */
  protected of<K extends GuideBlock['kind']>(kind: K): BlockOf<K> | null {
    const block = this.block();
    return block.kind === kind ? (block as BlockOf<K>) : null;
  }

  protected callout(tone: CalloutTone) {
    return CALLOUT[tone];
  }

  protected dot(tag: GuideTag): string {
    return DOT[tag];
  }

  protected paragraphs(text: string): string[] {
    return text.split('\n\n');
  }
}
