import { Injectable, signal } from '@angular/core';

/** Цветовая тема интерфейса. */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'wifi-demo-theme';

/**
 * Управление светлой/тёмной темой. Класс `.dark` на `<html>` включает
 * глобальный оверрайд палитры из styles.css. Выбор сохраняется в localStorage;
 * при первом визите берётся системная тема пользователя.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.readInitial());

  /** Текущая тема (только чтение). */
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.apply();
  }

  /** Переключает светлую ↔ тёмную тему. */
  toggle(): void {
    this._theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
    this.apply();
  }

  /** Применяет тему к DOM и сохраняет выбор. */
  private apply(): void {
    const theme = this._theme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* localStorage недоступен — тема просто не сохранится между сессиями */
    }
  }

  /** Начальная тема: сохранённый выбор, иначе системная настройка. */
  private readInitial(): Theme {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      /* localStorage недоступен */
    }
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
