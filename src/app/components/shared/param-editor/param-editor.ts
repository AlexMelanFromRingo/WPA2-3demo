import { Component, input, model, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

/**
 * Редактируемое поле параметра (FR-007).
 * Поток ввода проходит `debounceTime(500)` — тяжёлый пересчёт не запускается
 * на каждое нажатие клавиши (FR-008, research.md R2).
 */
@Component({
  selector: 'app-param-editor',
  template: `
    <label class="flex flex-col gap-1">
      <span class="text-xs font-medium text-slate-600">{{ label() }}</span>
      <input
        type="text"
        class="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
        [class.border-slate-300]="!error()"
        [class.border-red-400]="error()"
        [value]="value()"
        (input)="onInput($event)"
      />
      @if (error()) {
        <span class="text-xs text-red-600">{{ error() }}</span>
      }
    </label>
  `,
})
export class ParamEditor {
  /** Подпись поля. */
  readonly label = input.required<string>();

  /** Текущее значение (двусторонняя привязка). */
  readonly value = model<string>('');

  /** Сообщение об ошибке валидации (FR-011); `null` — ошибок нет. */
  readonly error = input<string | null>(null);

  /** Значение спустя 500 мс после последнего ввода. */
  readonly debounced = output<string>();

  private readonly input$ = new Subject<string>();

  constructor() {
    this.input$
      .pipe(debounceTime(500), takeUntilDestroyed())
      .subscribe((value) => this.debounced.emit(value));
  }

  protected onInput(event: Event): void {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.input$.next(next);
  }
}
