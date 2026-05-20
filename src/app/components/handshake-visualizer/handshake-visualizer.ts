import { Component, computed, inject, signal } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import {
  CryptoEngineService,
  type Wpa2HandshakeResult,
} from '../../core/crypto/crypto-engine.service';
import type { ModuleId, NetworkScenario, VisualizationStep } from '../../core/models';
import { ScenarioStateService } from '../../core/state/scenario-state.service';
import { StepController } from '../../core/state/step-controller.service';
import { ControlPanel } from '../control-panel/control-panel';
import { DataFlowDiagram } from '../shared/data-flow-diagram/data-flow-diagram';
import { HexInspector } from '../shared/hex-inspector/hex-inspector';
import { Tooltip } from '../shared/tooltip/tooltip';
import { buildWpa2Steps } from './wpa2-steps';
import { validateScenario } from './wpa2-validation';

const MODULE: ModuleId = 'wpa2-handshake';
/** Число шагов модуля WPA2 (соответствует `buildWpa2Steps`). */
const WPA2_STEP_COUNT = 8;

/**
 * Модуль 1 — WPA2 4-Way Handshake (T023, T024).
 * Пошаговый плеер: вычисляет рукопожатие в Web Worker (неблокирующе),
 * показывает подсказки, схемы потока данных и hex-дампы каждого шага.
 */
@Component({
  selector: 'app-handshake-visualizer',
  imports: [ControlPanel, DataFlowDiagram, HexInspector, Tooltip],
  animations: [
    trigger('stepChange', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateX(14px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
  template: `
    <section class="p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl font-semibold text-slate-800">Модуль 1 — WPA2 4-Way Handshake</h2>
        <button
          type="button"
          class="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          (click)="recompute()"
        >
          ↻ Пересчитать ключи
        </button>
      </div>

      @if (errors().length > 0) {
        <div class="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
          <p class="text-sm font-semibold text-red-800">Проверьте параметры сети:</p>
          <ul class="mt-1 list-disc pl-5 text-sm text-red-700">
            @for (error of errors(); track error) {
              <li>{{ error }}</li>
            }
          </ul>
        </div>
      } @else {
        <div class="mt-4 flex flex-col gap-4">
          <app-control-panel [moduleId]="moduleId" />

          @if (notes().length > 0) {
            <div class="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              @for (note of notes(); track note) {
                <p>⚠ {{ note }}</p>
              }
            </div>
          }

          @if (computing()) {
            <div class="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              ⏳ Вычисляем ключи… PBKDF2 на 4096 итераций выполняется в фоновом потоке —
              интерфейс остаётся отзывчивым.
            </div>
          }

          @if (currentStep(); as step) {
            <article
              [@stepChange]="currentIndex()"
              class="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold text-slate-800">{{ step.title }}</h3>
                <app-tooltip [text]="step.tooltip">
                  <span
                    class="flex h-5 w-5 cursor-help items-center justify-center rounded-full
                           bg-slate-300 text-xs font-bold text-slate-700"
                  >
                    ?
                  </span>
                </app-tooltip>
                <span class="ml-auto text-xs text-slate-400">{{ progress() }}</span>
              </div>

              <p class="mt-3 text-sm leading-relaxed text-slate-600">{{ step.tooltip }}</p>

              <div class="mt-4">
                <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Поток данных
                </h4>
                <app-data-flow-diagram [flow]="step.dataFlow" />
              </div>

              <div class="mt-4">
                <app-hex-inspector [artifacts]="step.artifacts" />
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class HandshakeVisualizer {
  private readonly scenarioState = inject(ScenarioStateService);
  private readonly crypto = inject(CryptoEngineService);
  private readonly stepController = inject(StepController);

  protected readonly moduleId = MODULE;
  protected readonly computing = signal(false);
  protected readonly errors = signal<readonly string[]>([]);
  protected readonly notes = signal<readonly string[]>([]);

  private readonly handshake = signal<{
    scenario: NetworkScenario;
    result: Wpa2HandshakeResult;
  } | null>(null);

  private readonly recomputeRequests = new Subject<void>();

  protected readonly steps = computed<VisualizationStep[]>(() => {
    const current = this.handshake();
    return current ? buildWpa2Steps(current.scenario, current.result) : [];
  });

  protected readonly currentIndex = toSignal(this.stepController.current$(MODULE), {
    initialValue: 0,
  });

  protected readonly currentStep = computed<VisualizationStep | null>(
    () => this.steps()[this.currentIndex()] ?? null,
  );

  protected readonly progress = computed(() => {
    const total = this.steps().length;
    return total > 0 ? `Шаг ${this.currentIndex() + 1} из ${total}` : '';
  });

  constructor() {
    this.stepController.register(MODULE, WPA2_STEP_COUNT);

    const scenario$ = this.scenarioState.effective(MODULE);
    const manualScenario$ = this.recomputeRequests.pipe(
      withLatestFrom(scenario$),
      map(([, scenario]) => scenario),
    );

    merge(scenario$, manualScenario$)
      .pipe(
        switchMap((scenario) => {
          const validation = validateScenario(scenario);
          this.errors.set(validation.errors);
          this.notes.set(validation.notes);
          if (validation.errors.length > 0) {
            this.handshake.set(null);
            this.computing.set(false);
            return EMPTY;
          }
          this.computing.set(true);
          return this.crypto.runWpa2Handshake(scenario).pipe(
            map((result) => ({ scenario, result })),
            catchError((err: unknown) => {
              this.errors.set([
                err instanceof Error ? err.message : 'Не удалось рассчитать ключи.',
              ]);
              this.handshake.set(null);
              this.computing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        this.handshake.set(value);
        this.computing.set(false);
      });
  }

  protected recompute(): void {
    this.recomputeRequests.next();
  }
}
