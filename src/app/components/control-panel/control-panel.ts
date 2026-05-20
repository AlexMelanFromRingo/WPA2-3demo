import { Component, inject, input, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import type { ModuleId } from '../../core/models';
import { StepController } from '../../core/state/step-controller.service';

/**
 * Панель управления шагами модуля (FR-002, FR-003, clarify Q3):
 * «Шаг вперёд/назад», авто-проигрывание (play/pause), регулятор скорости.
 */
@Component({
  selector: 'app-control-panel',
  imports: [AsyncPipe],
  template: `
    <div class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
      <button
        type="button"
        class="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700
               enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="!(canPrev$ | async)"
        (click)="prev()"
      >
        ← Назад
      </button>

      <button
        type="button"
        class="rounded bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        (click)="togglePlay()"
      >
        {{ playing() ? '⏸ Пауза' : '▶ Авто' }}
      </button>

      <button
        type="button"
        class="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700
               enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="!(canNext$ | async)"
        (click)="next()"
      >
        Вперёд →
      </button>

      <select
        class="ml-auto rounded border border-slate-300 px-2 py-1.5 text-sm"
        [value]="speedMs()"
        (change)="onSpeed($event)"
      >
        <option [value]="2000">Медленно</option>
        <option [value]="1200">Средне</option>
        <option [value]="600">Быстро</option>
      </select>
    </div>
  `,
})
export class ControlPanel {
  /** Модуль, шагами которого управляет панель. */
  readonly moduleId = input.required<ModuleId>();

  private readonly steps = inject(StepController);
  private readonly moduleId$ = toObservable(this.moduleId);

  protected readonly canPrev$ = this.moduleId$.pipe(switchMap((m) => this.steps.canGoPrev$(m)));
  protected readonly canNext$ = this.moduleId$.pipe(switchMap((m) => this.steps.canGoNext$(m)));
  protected readonly playing = signal(false);
  protected readonly speedMs = signal(1200);

  protected prev(): void {
    this.steps.prev(this.moduleId());
  }

  protected next(): void {
    this.steps.next(this.moduleId());
  }

  protected togglePlay(): void {
    const module = this.moduleId();
    if (this.playing()) {
      this.steps.pause(module);
      this.playing.set(false);
    } else {
      this.steps.play(module, this.speedMs());
      this.playing.set(true);
    }
  }

  protected onSpeed(event: Event): void {
    this.speedMs.set(Number((event.target as HTMLSelectElement).value));
  }
}
