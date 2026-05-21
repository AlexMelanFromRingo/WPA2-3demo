import { Component, inject, model } from '@angular/core';
import type { AttackType } from '../../../core/models';
import { LocaleService } from '../../../core/i18n/locale.service';

/**
 * Переключатель типа атаки симулятора: «Через PMKID» ↔ «Через EAPOL»
 * (FR-021, FR-028).
 */
@Component({
  selector: 'app-attack-switch',
  template: `
    <div class="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      <button
        type="button"
        class="rounded px-3 py-1.5 text-sm font-medium"
        [class.bg-sky-600]="attackType() === 'pmkid'"
        [class.text-white]="attackType() === 'pmkid'"
        [class.text-slate-600]="attackType() !== 'pmkid'"
        (click)="select('pmkid')"
      >
        {{ t('asViaPmkid') }}
      </button>
      <button
        type="button"
        class="rounded px-3 py-1.5 text-sm font-medium"
        [class.bg-sky-600]="attackType() === 'eapol'"
        [class.text-white]="attackType() === 'eapol'"
        [class.text-slate-600]="attackType() !== 'eapol'"
        (click)="select('eapol')"
      >
        {{ t('asViaEapol') }}
      </button>
    </div>
  `,
})
export class AttackSwitch {
  /** Выбранный тип атаки (двусторонняя привязка). */
  readonly attackType = model<AttackType>('pmkid');

  protected readonly t = inject(LocaleService).t;

  protected select(type: AttackType): void {
    this.attackType.set(type);
  }
}
