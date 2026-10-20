import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { LocaleService } from './locale.service';
import type { UiKey } from './ui-text';

/**
 * Заголовок вкладки браузера на языке интерфейса. В маршрутах `title` — это
 * ключ строки ui-text; при смене языка заголовок обновляется сам.
 */
@Injectable({ providedIn: 'root' })
export class LocalizedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly locale = inject(LocaleService);
  private readonly key = signal<UiKey | null>(null);

  constructor() {
    super();
    effect(() => {
      const key = this.key();
      const app = this.locale.t('appShort');
      this.title.setTitle(key ? `${this.locale.t(key)} — ${app}` : this.locale.t('appTitle'));
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set((this.buildTitle(snapshot) as UiKey | undefined) ?? null);
  }
}
