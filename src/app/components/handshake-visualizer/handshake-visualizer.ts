import { Component, computed, inject, signal } from '@angular/core';
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
import { LocaleService } from '../../core/i18n/locale.service';
import { MODULE_THEORY } from '../../core/theory';
import { ControlPanel } from '../control-panel/control-panel';
import { PacketFlow } from '../shared/packet-flow/packet-flow';
import { StepCard } from '../shared/step-card/step-card';
import { TheoryPanel } from '../shared/theory-panel/theory-panel';
import { buildWpa2Steps } from './wpa2-steps';
import { validateScenario } from './wpa2-validation';

const MODULE: ModuleId = 'wpa2-handshake';
/** Число шагов модуля WPA2 (соответствует `buildWpa2Steps`). */
const WPA2_STEP_COUNT = 8;

/**
 * Модуль 1 — WPA2 4-Way Handshake (T023, T024).
 * Пошаговый плеер: вычисляет рукопожатие в Web Worker, показывает теорию,
 * сцену передачи пакетов и карточки шагов с прогоном данных.
 */
@Component({
  selector: 'app-handshake-visualizer',
  imports: [ControlPanel, PacketFlow, StepCard, TheoryPanel],
  template: `
    <section>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-semibold text-slate-800">{{ t('m1Title') }}</h2>
          <p class="text-sm text-slate-500">{{ t('m1Subtitle') }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          (click)="recompute()"
        >
          {{ t('m1Recompute') }}
        </button>
      </div>

      <div class="mt-4">
        <app-theory-panel [theory]="theory()" />
      </div>

      @if (errors().length > 0) {
        <div class="mt-4 rounded-xl border border-red-300 bg-red-50 p-4">
          <p class="text-sm font-semibold text-red-800">{{ t('errParams') }}</p>
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
            <div class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              @for (note of notes(); track note) {
                <p>⚠ {{ note }}</p>
              }
            </div>
          }

          @if (computing()) {
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              {{ t('m1Computing') }}
            </div>
          }

          @if (currentStep(); as step) {
            <app-packet-flow [step]="step" />
            <app-step-card [step]="step" [progress]="progress()" />
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

  private readonly locale = inject(LocaleService);

  protected readonly moduleId = MODULE;
  protected readonly t = this.locale.t;
  protected readonly theory = computed(() => MODULE_THEORY[this.locale.lang()][MODULE]);
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
    return current ? buildWpa2Steps(current.scenario, current.result, this.locale.lang()) : [];
  });

  protected readonly currentIndex = toSignal(this.stepController.current$(MODULE), {
    initialValue: 0,
  });

  protected readonly currentStep = computed<VisualizationStep | null>(
    () => this.steps()[this.currentIndex()] ?? null,
  );

  protected readonly progress = computed(() => {
    const total = this.steps().length;
    return total > 0
      ? `${this.t('progStep')} ${this.currentIndex() + 1} ${this.t('progOf')} ${total}`
      : '';
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
