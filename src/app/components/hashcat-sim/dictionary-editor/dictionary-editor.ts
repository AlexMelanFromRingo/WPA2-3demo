import { Component, inject, model, signal } from '@angular/core';
import { LocaleService } from '../../../core/i18n/locale.service';

/**
 * Редактор мини-словаря симулятора (FR-024): список слов-кандидатов с
 * добавлением/удалением и отдельным полем «настоящего» пароля сети.
 */
@Component({
  selector: 'app-dictionary-editor',
  template: `
    <div class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium text-slate-600">{{ t('deSecret') }}</span>
        <input
          type="text"
          class="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          [value]="secretPassword()"
          (input)="onSecret($event)"
        />
      </label>

      <div>
        <p class="text-xs font-medium text-slate-600">{{ t('deDict') }} ({{ words().length }})</p>
        <ul class="mt-1 flex flex-col gap-1">
          @for (word of words(); track $index) {
            <li class="flex items-center gap-2">
              <span class="flex-1 rounded bg-slate-100 px-2 py-1 font-mono text-sm">{{ word }}</span>
              <button
                type="button"
                class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                (click)="remove($index)"
              >
                ✕
              </button>
            </li>
          } @empty {
            <li class="text-xs text-slate-400">{{ t('deEmpty') }}</li>
          }
        </ul>
        <div class="mt-2 flex gap-2">
          <input
            type="text"
            class="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
            [placeholder]="t('deNewPlaceholder')"
            [value]="newWord()"
            (input)="onNewWord($event)"
            (keyup.enter)="add()"
          />
          <button
            type="button"
            class="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
            (click)="add()"
          >
            {{ t('deAdd') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DictionaryEditor {
  /** Слова-кандидаты (двусторонняя привязка). */
  readonly words = model<string[]>([]);

  /** «Настоящий» пароль сценария (двусторонняя привязка). */
  readonly secretPassword = model<string>('');

  protected readonly t = inject(LocaleService).t;
  protected readonly newWord = signal('');

  protected onSecret(event: Event): void {
    this.secretPassword.set((event.target as HTMLInputElement).value);
  }

  protected onNewWord(event: Event): void {
    this.newWord.set((event.target as HTMLInputElement).value);
  }

  protected add(): void {
    const word = this.newWord().trim();
    if (word.length > 0) {
      this.words.set([...this.words(), word]);
      this.newWord.set('');
    }
  }

  protected remove(index: number): void {
    this.words.set(this.words().filter((_, i) => i !== index));
  }
}
