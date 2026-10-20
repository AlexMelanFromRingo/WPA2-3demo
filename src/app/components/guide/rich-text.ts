import { Component, computed, input } from '@angular/core';
import { parseInline } from '../../core/guide/inline';

/**
 * Строка справочника с инлайн-разметкой `**жирный**` и `` `код` ``.
 * Рендерится сегментами через шаблон — без innerHTML.
 */
@Component({
  selector: 'app-rich-text',
  template: `@for (segment of segments(); track $index) {@switch (segment.kind) {@case ('strong') {<strong class="font-semibold text-slate-900">{{ segment.text }}</strong>}@case ('code') {<code class="rounded bg-slate-100 px-1 py-px font-mono text-[0.86em] text-slate-800">{{ segment.text }}</code>}@default {<ng-container>{{ segment.text }}</ng-container>}}}`,
})
export class RichText {
  /** Исходная строка с разметкой. */
  readonly text = input.required<string>();

  protected readonly segments = computed(() => parseInline(this.text()));
}
