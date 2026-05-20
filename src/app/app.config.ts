import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

/**
 * Корневая конфигурация приложения.
 * - Zoneless change detection (Angular 21, signal-first) — без zone.js.
 * - Angular Animations — для визуализации передачи пакетов в модулях.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideRouter(routes), provideAnimations()],
};
