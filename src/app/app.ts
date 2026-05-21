import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { NetworkScenario } from './core/models';
import { ScenarioStateService } from './core/state/scenario-state.service';
import { ThemeService } from './core/theme.service';
import { LocaleService } from './core/i18n/locale.service';
import { LANGS } from './core/i18n/ui-text';
import { ParamEditor } from './components/shared/param-editor/param-editor';

/**
 * Корневая оболочка SPA — светлая центральная колонка (по образцу
 * TOTP_demo / rsa16-edu): белая шапка с переключателями языка и темы,
 * вкладки, сворачиваемая карточка параметров, контент модуля стопкой.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ParamEditor],
  template: `
    <div class="min-h-screen text-slate-800">
      <header class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-3xl items-start justify-between gap-3 px-4 py-4 sm:px-6">
          <div>
            <h1 class="text-xl font-bold text-blue-700">{{ t('appTitle') }}</h1>
            <p class="mt-0.5 text-sm text-slate-500">{{ t('appSubtitle') }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <div class="flex overflow-hidden rounded-lg border border-slate-300">
              @for (lang of langs; track lang.code) {
                <button
                  type="button"
                  class="px-2 py-1 text-xs font-semibold"
                  [class.bg-blue-600]="locale.lang() === lang.code"
                  [class.text-white]="locale.lang() === lang.code"
                  [class.text-slate-600]="locale.lang() !== lang.code"
                  (click)="locale.setLang(lang.code)"
                >
                  {{ lang.label }}
                </button>
              }
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              (click)="theme.toggle()"
            >
              {{ theme.theme() === 'dark' ? t('themeToLight') : t('themeToDark') }}
            </button>
          </div>
        </div>
      </header>

      <nav class="border-b border-slate-200 bg-white">
        <div class="mx-auto flex max-w-3xl gap-1 px-2 sm:px-6">
          @for (tab of tabs; track tab.path) {
            <a
              [routerLink]="tab.path"
              routerLinkActive="border-blue-600 text-blue-700"
              class="border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-slate-500 hover:text-blue-700"
            >
              {{ t(tab.key) }}
            </a>
          }
        </div>
      </nav>

      <main class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <details class="mb-5 rounded-xl border border-slate-200 bg-white shadow-sm" open>
          <summary
            class="cursor-pointer select-none rounded-xl px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {{ t('paramsTitle') }}
          </summary>
          <div class="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
            <app-param-editor
              [label]="t('paramSsid')"
              [value]="scenario().ssid"
              (debounced)="setField('ssid', $event)"
            />
            <app-param-editor
              [label]="t('paramPass')"
              [value]="scenario().passphrase"
              (debounced)="setField('passphrase', $event)"
            />
            <app-param-editor
              [label]="t('paramApMac')"
              [value]="scenario().apMac"
              (debounced)="setField('apMac', $event)"
            />
            <app-param-editor
              [label]="t('paramClientMac')"
              [value]="scenario().clientMac"
              (debounced)="setField('clientMac', $event)"
            />
            <app-param-editor
              [label]="t('paramANonce')"
              [value]="scenario().aNonce"
              (debounced)="setField('aNonce', $event)"
            />
            <app-param-editor
              [label]="t('paramSNonce')"
              [value]="scenario().sNonce"
              (debounced)="setField('sNonce', $event)"
            />
            <p class="text-xs leading-relaxed text-slate-400 sm:col-span-2">
              {{ t('debounceNote') }}
            </p>
          </div>
        </details>

        <router-outlet />
      </main>
    </div>
  `,
})
export class App {
  private readonly scenarioState = inject(ScenarioStateService);

  protected readonly theme = inject(ThemeService);
  protected readonly locale = inject(LocaleService);
  protected readonly t = this.locale.t;
  protected readonly langs = LANGS;

  protected readonly scenario = toSignal(this.scenarioState.scenario$, { requireSync: true });

  protected readonly tabs = [
    { path: '/wpa2', key: 'tabWpa2' as const },
    { path: '/wpa3', key: 'tabWpa3' as const },
    { path: '/hashcat', key: 'tabHashcat' as const },
  ];

  protected setField(field: keyof NetworkScenario, value: string): void {
    this.scenarioState.update({ [field]: value });
  }
}
