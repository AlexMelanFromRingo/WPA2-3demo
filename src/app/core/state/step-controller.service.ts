import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Observable, type Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { ModuleId } from '../models';

interface ModuleStepState {
  readonly current: BehaviorSubject<number>;
  total: number;
  playSub?: Subscription;
}

/**
 * Управление пошаговым прохождением модулей и авто-проигрыванием (FR-002, FR-003, clarify Q3).
 * Индекс шага зажимается к границам `[0, total - 1]`; авто-проигрывание
 * останавливается на последнем шаге и не зацикливается.
 */
@Injectable({ providedIn: 'root' })
export class StepController {
  private readonly modules = new Map<ModuleId, ModuleStepState>();

  /** Регистрирует число шагов модуля (вызывается при инициализации модуля). */
  register(module: ModuleId, totalSteps: number): void {
    const total = Math.max(1, totalSteps);
    const state = this.modules.get(module);
    if (state) {
      state.total = total;
      if (state.current.value > total - 1) {
        state.current.next(total - 1);
      }
    } else {
      this.modules.set(module, { current: new BehaviorSubject(0), total });
    }
  }

  private state(module: ModuleId): ModuleStepState {
    let state = this.modules.get(module);
    if (!state) {
      state = { current: new BehaviorSubject(0), total: 1 };
      this.modules.set(module, state);
    }
    return state;
  }

  /** Поток текущего индекса шага. */
  current$(module: ModuleId): Observable<number> {
    return this.state(module).current.asObservable();
  }

  /** Шаг вперёд (без выхода за последний шаг). */
  next(module: ModuleId): void {
    const state = this.state(module);
    const target = Math.min(state.current.value + 1, state.total - 1);
    if (target !== state.current.value) {
      state.current.next(target);
    }
  }

  /** Шаг назад (без выхода за первый шаг). */
  prev(module: ModuleId): void {
    const state = this.state(module);
    const target = Math.max(state.current.value - 1, 0);
    if (target !== state.current.value) {
      state.current.next(target);
    }
  }

  /** Перейти к конкретному шагу (индекс зажимается к границам). */
  goTo(module: ModuleId, index: number): void {
    const state = this.state(module);
    state.current.next(Math.min(Math.max(index, 0), state.total - 1));
  }

  /** Можно ли шагнуть вперёд (для блокировки кнопки, FR-003). */
  canGoNext$(module: ModuleId): Observable<boolean> {
    const state = this.state(module);
    return state.current.pipe(
      map((index) => index < state.total - 1),
      distinctUntilChanged(),
    );
  }

  /** Можно ли шагнуть назад (для блокировки кнопки, FR-003). */
  canGoPrev$(module: ModuleId): Observable<boolean> {
    return this.state(module).current.pipe(
      map((index) => index > 0),
      distinctUntilChanged(),
    );
  }

  /** Запускает авто-проигрывание; останавливается на последнем шаге. */
  play(module: ModuleId, speedMs = 1200): void {
    const state = this.state(module);
    this.pause(module);
    state.playSub = interval(speedMs).subscribe(() => {
      if (state.current.value >= state.total - 1) {
        this.pause(module);
        return;
      }
      state.current.next(state.current.value + 1);
    });
  }

  /** Останавливает авто-проигрывание. */
  pause(module: ModuleId): void {
    const state = this.state(module);
    state.playSub?.unsubscribe();
    state.playSub = undefined;
  }

  /** Идёт ли авто-проигрывание. */
  isPlaying(module: ModuleId): boolean {
    return this.state(module).playSub !== undefined;
  }
}
