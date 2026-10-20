import { Component, computed, effect, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import type { NetworkScenario } from './core/models';
import { ScenarioStateService } from './core/state/scenario-state.service';
import { ThemeService } from './core/theme.service';
import { LocaleService } from './core/i18n/locale.service';
import { LANGS, type UiKey } from './core/i18n/ui-text';
import { ParamEditor } from './components/shared/param-editor/param-editor';

/** Вкладка навигации; `active` — цвет активной вкладки (код протокола). */
interface Tab {
  path: string;
  key: UiKey;
  active: string;
}

/** Маршруты интерактивных модулей — на них показывается панель параметров сети. */
const MODULE_ROUTE = /^\/(wpa2|wpa3|hashcat)(\/|\?|#|$)/;

/**
 * Корневая оболочка SPA: шапка с переключателями языка и темы, липкая
 * навигация (на узких экранах прокручивается по горизонтали), справочник на
 * всю ширину и колонка модулей с панелью общих параметров сети.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ParamEditor],
  template: `
    <div class="flex min-h-screen flex-col text-slate-800">
      <header class="bg-white">
        <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a routerLink="/guide" class="flex min-w-0 items-center gap-3 rounded-lg">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white"
              aria-hidden="true"
            >
              <svg viewBox="0 0 32 32" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round">
                <path d="M6.8 13.6a13 13 0 0 1 18.4 0" />
                <path d="M10 16.8a8.5 8.5 0 0 1 12 0" />
                <path d="M13.2 20a4 4 0 0 1 5.6 0" />
                <circle cx="16" cy="23.6" r="1.4" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span class="min-w-0">
              <span class="block text-[15px] font-bold leading-tight text-slate-900 sm:hidden">
                {{ t('appShort') }}
              </span>
              <span class="hidden truncate text-base font-bold leading-tight text-slate-900 sm:block">
                {{ t('appTitle') }}
              </span>
              <span class="hidden truncate text-xs text-slate-500 sm:block">{{ t('appSubtitle') }}</span>
            </span>
          </a>

          <div class="flex shrink-0 items-center gap-2">
            <div
              class="flex overflow-hidden rounded-lg border border-slate-300"
              role="group"
              [attr.aria-label]="t('langLabel')"
            >
              @for (lang of langs; track lang.code) {
                <button
                  type="button"
                  class="px-2 py-1 text-xs font-semibold"
                  [class.bg-blue-600]="locale.lang() === lang.code"
                  [class.text-white]="locale.lang() === lang.code"
                  [class.text-slate-600]="locale.lang() !== lang.code"
                  [attr.aria-pressed]="locale.lang() === lang.code"
                  (click)="locale.setLang(lang.code)"
                >
                  {{ lang.label }}
                </button>
              }
            </div>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              [attr.aria-label]="themeLabel()"
              (click)="theme.toggle()"
            >
              <span class="sm:hidden" aria-hidden="true">{{ theme.theme() === 'dark' ? '☀' : '🌙' }}</span>
              <span class="hidden sm:inline">{{ themeLabel() }}</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        class="sticky top-0 z-30 border-y border-slate-200 bg-white/95 backdrop-blur"
        [attr.aria-label]="t('navLabel')"
      >
        <div class="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-6">
          @for (tab of tabs; track tab.path) {
            <a
              [routerLink]="tab.path"
              routerLinkActive
              #rla="routerLinkActive"
              class="shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors"
              [class]="rla.isActive ? tab.active : 'border-transparent text-slate-500 hover:text-slate-900'"
              [attr.aria-current]="rla.isActive ? 'page' : null"
            >
              {{ t(tab.key) }}
            </a>
          }
        </div>
      </nav>

      <main class="flex-1" [class]="isModule() ? 'mx-auto w-full max-w-4xl px-4 py-6 sm:px-6' : 'w-full'">
        @if (isModule()) {
          <details class="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm" [open]="paramsOpen">
            <summary
              class="cursor-pointer select-none rounded-xl px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              {{ t('paramsTitle') }}
            </summary>
            <div class="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
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
                class="sm:col-span-2"
                [label]="t('paramANonce')"
                [value]="scenario().aNonce"
                (debounced)="setField('aNonce', $event)"
              />
              <app-param-editor
                class="sm:col-span-2"
                [label]="t('paramSNonce')"
                [value]="scenario().sNonce"
                (debounced)="setField('sNonce', $event)"
              />
              <app-param-editor
                class="sm:col-span-2"
                [label]="t('paramGtk')"
                [value]="scenario().gtk"
                (debounced)="setField('gtk', $event)"
              />
              <app-param-editor
                class="sm:col-span-2"
                [label]="t('paramIgtk')"
                [value]="scenario().igtk"
                (debounced)="setField('igtk', $event)"
              />
              <p class="text-xs leading-relaxed text-slate-500 sm:col-span-2 lg:col-span-4">
                {{ t('debounceNote') }}
              </p>
            </div>
          </details>
        }

        <router-outlet />
      </main>

      <footer class="border-t border-slate-200 bg-white">
        <p class="mx-auto max-w-6xl px-4 py-4 text-xs leading-relaxed text-slate-500 sm:px-6">
          {{ t('footerNote') }}
        </p>
      </footer>
    </div>
  `,
})
export class App {
  private readonly scenarioState = inject(ScenarioStateService);
  private readonly router = inject(Router);

  protected readonly theme = inject(ThemeService);
  protected readonly locale = inject(LocaleService);
  protected readonly t = this.locale.t;
  protected readonly langs = LANGS;

  protected readonly scenario = toSignal(this.scenarioState.scenario$, { requireSync: true });

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** Открыт ли интерактивный модуль (а не справочник). */
  protected readonly isModule = computed(() => MODULE_ROUTE.test(this.url()));

  /** Панель параметров раскрыта по умолчанию, кроме узких экранов — там она длинная. */
  protected readonly paramsOpen = globalThis.matchMedia?.('(min-width: 640px)').matches ?? true;

  protected readonly themeLabel = computed(() =>
    this.theme.theme() === 'dark' ? this.t('themeToLight') : this.t('themeToDark'),
  );

  protected readonly tabs: Tab[] = [
    { path: '/guide', key: 'tabGuide', active: 'border-slate-800 text-slate-900' },
    { path: '/wpa2', key: 'tabWpa2', active: 'border-blue-600 text-blue-700' },
    { path: '/wpa3', key: 'tabWpa3', active: 'border-teal-600 text-teal-700' },
    { path: '/hashcat', key: 'tabHashcat', active: 'border-red-600 text-red-700' },
  ];

  constructor() {
    // Язык документа — для экранных дикторов и переносов.
    effect(() => {
      document.documentElement.lang = this.locale.lang();
    });

    // Переход на другой раздел открывает его с начала (якоря глав — не трогаем).
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (!this.router.parseUrl(this.router.url).fragment) {
          window.scrollTo(0, 0);
        }
      });
  }

  protected setField(field: keyof NetworkScenario, value: string): void {
    this.scenarioState.update({ [field]: value });
  }
}
