import { Component, input, signal } from '@angular/core';

/**
 * Всплывающая подсказка простым языком (FR-004, Принцип I).
 * Оборачивает любой триггер через проекцию содержимого.
 */
@Component({
  selector: 'app-tooltip',
  template: `
    <span
      class="relative inline-flex"
      (mouseenter)="visible.set(true)"
      (mouseleave)="visible.set(false)"
      (focusin)="visible.set(true)"
      (focusout)="visible.set(false)"
    >
      <ng-content />
      @if (visible()) {
        <span
          role="tooltip"
          class="absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded
                 bg-slate-800 px-3 py-2 text-xs leading-relaxed text-white shadow-lg"
        >
          {{ text() }}
        </span>
      }
    </span>
  `,
})
export class Tooltip {
  /** Текст подсказки. */
  readonly text = input.required<string>();

  protected readonly visible = signal(false);
}
