import { Component, input } from '@angular/core';
import type { KeyLevel, KeyNode } from '../../core/guide/guide-model';

/** Цвет узла по роли ключа. */
const NODE: Record<KeyNode['tone'], string> = {
  secret: 'border-amber-300 bg-amber-50 text-amber-900',
  master: 'border-blue-200 bg-blue-50 text-blue-900',
  session: 'border-sky-200 bg-sky-50 text-sky-800',
  group: 'border-emerald-300 bg-emerald-50 text-emerald-800',
};

/** Колонка уровней ключей сверху вниз; между уровнями — «как получается». */
@Component({
  selector: 'app-key-column',
  template: `
    <div class="flex flex-col items-center">
      @for (level of levels(); track $index) {
        @if (level.via) {
          <div class="flex flex-col items-center">
            <span class="h-3 w-px bg-slate-300" aria-hidden="true"></span>
            <span
              class="max-w-xs rounded-md bg-slate-100 px-2.5 py-1 text-center text-[11px] leading-snug text-slate-600"
            >
              {{ level.via }}
            </span>
            <span class="h-3 w-px bg-slate-300" aria-hidden="true"></span>
            <span
              class="h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-slate-300"
              aria-hidden="true"
            ></span>
          </div>
        }
        <div class="flex w-full flex-wrap justify-center gap-2">
          @for (node of level.nodes; track node.name) {
            <div
              class="w-full max-w-[11.5rem] rounded-lg border px-3 py-2 text-center sm:w-44"
              [class]="nodeClass(node)"
            >
              <div class="font-mono text-sm font-bold">{{ node.name }}</div>
              @if (node.size) {
                <div class="text-[11px] opacity-80">{{ node.size }}</div>
              }
              <div class="mt-1 text-xs leading-snug">{{ node.role }}</div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class KeyColumn {
  readonly levels = input.required<KeyLevel[]>();

  protected nodeClass(node: KeyNode): string {
    return NODE[node.tone];
  }
}

/**
 * Иерархия ключей: основная ветка (пароль → PMK → PTK → KCK/KEK/TK) и
 * справа (на узких экранах — ниже) ветка групповых ключей точки доступа.
 */
@Component({
  selector: 'app-key-tree',
  imports: [KeyColumn],
  template: `
    <div
      class="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_14rem]"
    >
      <app-key-column [levels]="main()" />
      <div class="rounded-lg border border-dashed border-slate-300 p-3">
        <p class="mb-2 text-center text-xs font-semibold text-slate-600">{{ asideTitle() }}</p>
        <app-key-column [levels]="aside()" />
      </div>
    </div>
  `,
})
export class KeyTree {
  readonly main = input.required<KeyLevel[]>();
  readonly asideTitle = input.required<string>();
  readonly aside = input.required<KeyLevel[]>();
}
