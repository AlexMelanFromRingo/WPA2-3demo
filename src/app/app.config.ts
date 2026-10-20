import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, TitleStrategy } from '@angular/router';
import { LocalizedTitleStrategy } from './core/i18n/localized-title.strategy';
import { routes } from './app.routes';

/**
 * Корневая конфигурация приложения.
 * - Zoneless change detection (Angular 21, signal-first) — без zone.js.
 * - Angular Animations — для визуализации передачи пакетов в модулях.
 * - Заголовок вкладки — на языке интерфейса (LocalizedTitleStrategy).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimations(),
    { provide: TitleStrategy, useClass: LocalizedTitleStrategy },
  ],
};
