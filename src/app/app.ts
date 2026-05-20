import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { NetworkScenario } from './core/models';
import { ScenarioStateService } from './core/state/scenario-state.service';
import { ParamEditor } from './components/shared/param-editor/param-editor';

/**
 * Корневая оболочка SPA: сплит-панель.
 * Слева — единый редактируемый сценарий сети (общий для всех модулей, FR-007/FR-010),
 * справа — область модуля (`router-outlet`).
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ParamEditor],
  template: `
    <div class="flex h-screen flex-col bg-slate-100 text-slate-800">
      <header class="bg-slate-900 px-5 py-3 text-white">
        <h1 class="text-lg font-semibold">Методичка Wi-Fi: WPA2 · WPA3 · Hashcat 22000</h1>
        <p class="text-xs text-slate-400">Интерактивная визуальная методичка для новичков</p>
      </header>

      <nav class="flex gap-1 border-b border-slate-300 bg-white px-4">
        @for (tab of tabs; track tab.path) {
          <a
            [routerLink]="tab.path"
            routerLinkActive="border-sky-600 text-sky-700"
            class="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-600 hover:text-sky-700"
          >
            {{ tab.label }}
          </a>
        }
      </nav>

      <div class="flex min-h-0 flex-1">
        <aside class="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-slate-300 bg-white p-4">
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Параметры сети (общий сценарий)
          </h2>
          <div class="flex flex-col gap-3">
            <app-param-editor
              label="SSID (имя сети)"
              [value]="scenario().ssid"
              (debounced)="setField('ssid', $event)"
            />
            <app-param-editor
              label="Пароль сети"
              [value]="scenario().passphrase"
              (debounced)="setField('passphrase', $event)"
            />
            <app-param-editor
              label="MAC точки доступа"
              [value]="scenario().apMac"
              (debounced)="setField('apMac', $event)"
            />
            <app-param-editor
              label="MAC клиента"
              [value]="scenario().clientMac"
              (debounced)="setField('clientMac', $event)"
            />
            <app-param-editor
              label="ANonce (hex, 32 байта)"
              [value]="scenario().aNonce"
              (debounced)="setField('aNonce', $event)"
            />
            <app-param-editor
              label="SNonce (hex, 32 байта)"
              [value]="scenario().sNonce"
              (debounced)="setField('sNonce', $event)"
            />
          </div>
          <p class="mt-4 text-xs leading-relaxed text-slate-400">
            Изменения применяются с задержкой 500&nbsp;мс — тяжёлый пересчёт ключей не
            запускается на каждое нажатие клавиши.
          </p>
        </aside>

        <main class="min-w-0 flex-1 overflow-y-auto">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class App {
  private readonly scenarioState = inject(ScenarioStateService);

  protected readonly scenario = toSignal(this.scenarioState.scenario$, { requireSync: true });

  protected readonly tabs = [
    { path: '/wpa2', label: 'Модуль 1 — WPA2 Handshake' },
    { path: '/wpa3', label: 'Модуль 2 — WPA3 SAE' },
    { path: '/hashcat', label: 'Модуль 3 — Hashcat 22000' },
  ];

  protected setField(field: keyof NetworkScenario, value: string): void {
    this.scenarioState.update({ [field]: value });
  }
}
