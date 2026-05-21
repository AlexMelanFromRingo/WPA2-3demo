import { Injectable, signal } from '@angular/core';
import { type Lang, UI, type UiKey } from './ui-text';

const STORAGE_KEY = 'wifi-demo-lang';

/**
 * Язык интерфейса (UA / EN / RU). Выбор сохраняется в localStorage; при первом
 * визите берётся язык браузера. Метод `t` реактивен — шаблоны, читающие его,
 * перерисовываются при смене языка.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly _lang = signal<Lang>(this.readInitial());

  /** Текущий язык (только чтение). */
  readonly lang = this._lang.asReadonly();

  /** Перевод строки интерфейса (реактивно зависит от текущего языка). */
  readonly t = (key: UiKey): string => UI[this._lang()][key];

  /** Переключает язык интерфейса. */
  setLang(lang: Lang): void {
    this._lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* localStorage недоступен — выбор не сохранится между сессиями */
    }
  }

  /** Начальный язык: сохранённый выбор, иначе язык браузера, иначе русский. */
  private readInitial(): Lang {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'uk' || saved === 'en' || saved === 'ru') {
        return saved;
      }
    } catch {
      /* localStorage недоступен */
    }
    const browser = (globalThis.navigator?.language ?? 'ru').slice(0, 2).toLowerCase();
    return browser === 'uk' ? 'uk' : browser === 'en' ? 'en' : 'ru';
  }
}
