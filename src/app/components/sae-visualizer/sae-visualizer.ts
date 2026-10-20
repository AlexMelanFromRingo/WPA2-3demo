import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, EMPTY, merge, Subject } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import {
  CryptoEngineService,
  type PweMethod,
  type SaeRunResult,
} from '../../core/crypto/crypto-engine.service';
import { SAE_TEXT } from '../../core/i18n/sae-text';
import type { ModuleId, NetworkScenario, VisualizationStep } from '../../core/models';
import { ScenarioStateService } from '../../core/state/scenario-state.service';
import { StepController } from '../../core/state/step-controller.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { MODULE_THEORY } from '../../core/theory';
import { ControlPanel } from '../control-panel/control-panel';
import { validateScenario } from '../handshake-visualizer/wpa2-validation';
import { PacketFlow } from '../shared/packet-flow/packet-flow';
import { StepCard } from '../shared/step-card/step-card';
import { TheoryPanel } from '../shared/theory-panel/theory-panel';
import { buildSaeSteps, SAE_STEP_COUNT } from './sae-steps';

const MODULE: ModuleId = 'wpa3-sae';

/**
 * Модуль 2 — WPA3 SAE (Dragonfly) (T031).
 * Пошаговый плеер реального обмена SAE на кривой P-256 (вычисления — в Web Worker).
 */
@Component({
  selector: 'app-sae-visualizer',
  imports: [ControlPanel, PacketFlow, StepCard, TheoryPanel],
  template: `
    <section>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-semibold text-slate-800">{{ t('m2Title') }}</h2>
          <p class="text-sm text-slate-500">{{ t('m2Subtitle') }}</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          (click)="recompute()"
        >
          {{ t('m2Recompute') }}
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
          <div class="flex flex-wrap items-center gap-3">
            <div
              class="inline-flex rounded-lg border border-slate-300 bg-white p-0.5"
              role="group"
              [attr.aria-label]="'PWE'"
            >
              @for (option of methods; track option) {
                <button
                  type="button"
                  class="rounded px-3 py-1.5 text-sm font-medium"
                  [class.bg-sky-600]="method() === option"
                  [class.text-white]="method() === option"
                  [class.text-slate-600]="method() !== option"
                  [attr.aria-pressed]="method() === option"
                  (click)="method.set(option)"
                >
                  {{ saeText().methodLabel[option] }}
                </button>
              }
            </div>
            <p class="text-xs text-slate-500">{{ saeText().methodHint[method()] }}</p>
          </div>

          <app-control-panel [moduleId]="moduleId" />

          @if (computing()) {
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              {{ t('m2Computing') }}
            </div>
          }

          @if (converged()) {
            <div
              class="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {{ t('m2Converged') }}
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
export class SaeVisualizer {
  private readonly scenarioState = inject(ScenarioStateService);
  private readonly crypto = inject(CryptoEngineService);
  private readonly stepController = inject(StepController);

  private readonly locale = inject(LocaleService);

  protected readonly moduleId = MODULE;
  protected readonly t = this.locale.t;
  protected readonly theory = computed(() => MODULE_THEORY[this.locale.lang()][MODULE]);
  protected readonly computing = signal(false);
  protected readonly errors = signal<readonly string[]>([]);
  /** Способ вывода PWE: Hash-to-Element (по умолчанию) или Hunting-and-Pecking. */
  protected readonly method = signal<PweMethod>('h2e');
  protected readonly methods: readonly PweMethod[] = ['h2e', 'hnp'];
  protected readonly saeText = computed(() => SAE_TEXT[this.locale.lang()]);

  private readonly exchange = signal<{
    scenario: NetworkScenario;
    result: SaeRunResult;
  } | null>(null);

  private readonly recomputeRequests = new Subject<void>();

  protected readonly converged = computed(() => this.exchange()?.result.converged ?? false);

  protected readonly steps = computed<VisualizationStep[]>(() => {
    const current = this.exchange();
    return current ? buildSaeSteps(current.scenario, current.result, this.locale.lang()) : [];
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
    this.stepController.register(MODULE, SAE_STEP_COUNT);

    const scenario$ = this.scenarioState.effective(MODULE);
    const inputs$ = combineLatest([scenario$, toObservable(this.method)]);
    const manualInputs$ = this.recomputeRequests.pipe(
      withLatestFrom(inputs$),
      map(([, inputs]) => inputs),
    );

    merge(inputs$, manualInputs$)
      .pipe(
        switchMap(([scenario, method]) => {
          const validation = validateScenario(scenario, this.locale.lang());
          this.errors.set(validation.errors);
          if (validation.errors.length > 0) {
            this.exchange.set(null);
            this.computing.set(false);
            return EMPTY;
          }
          this.computing.set(true);
          return this.crypto.runSae(scenario, method).pipe(
            map((result) => ({ scenario, result })),
            catchError((err: unknown) => {
              this.errors.set([
                err instanceof Error ? err.message : 'Не удалось выполнить обмен SAE.',
              ]);
              this.exchange.set(null);
              this.computing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((value) => {
        this.exchange.set(value);
        this.computing.set(false);
      });
  }

  protected recompute(): void {
    this.recomputeRequests.next();
  }
}
