import { Component, computed, inject, signal } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { CryptoEngineService } from '../../core/crypto/crypto-engine.service';
import type { SaeRunResult } from '../../core/crypto/sae';
import type { ModuleId, NetworkScenario, VisualizationStep } from '../../core/models';
import { ScenarioStateService } from '../../core/state/scenario-state.service';
import { StepController } from '../../core/state/step-controller.service';
import { MODULE_THEORY } from '../../core/theory';
import { ControlPanel } from '../control-panel/control-panel';
import { validateScenario } from '../handshake-visualizer/wpa2-validation';
import { DataFlowDiagram } from '../shared/data-flow-diagram/data-flow-diagram';
import { HexInspector } from '../shared/hex-inspector/hex-inspector';
import { PacketFlow } from '../shared/packet-flow/packet-flow';
import { TheoryPanel } from '../shared/theory-panel/theory-panel';
import { Tooltip } from '../shared/tooltip/tooltip';
import { buildSaeSteps } from './sae-steps';

const MODULE: ModuleId = 'wpa3-sae';
/** Число шагов модуля SAE (соответствует `buildSaeSteps`). */
const SAE_STEP_COUNT = 8;

/**
 * Модуль 2 — WPA3 SAE (Dragonfly) (T031).
 * Пошаговый плеер реального обмена SAE на кривой P-256 (вычисления — в Web Worker).
 */
@Component({
  selector: 'app-sae-visualizer',
  imports: [ControlPanel, DataFlowDiagram, HexInspector, PacketFlow, TheoryPanel, Tooltip],
  animations: [
    trigger('stepChange', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateX(14px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
    ]),
  ],
  template: `
    <section class="mx-auto max-w-3xl p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-semibold text-slate-800">Модуль 2 — WPA3 SAE (Dragonfly)</h2>
          <p class="text-sm text-slate-500">
            Почему в WPA3 пароль нельзя перехватить и подобрать офлайн.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          (click)="recompute()"
        >
          ↻ Пересчитать обмен
        </button>
      </div>

      <div class="mt-4">
        <app-theory-panel [theory]="theory" />
      </div>

      @if (errors().length > 0) {
        <div class="mt-4 rounded-xl border border-red-300 bg-red-50 p-4">
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

          @if (computing()) {
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              ⏳ Выполняем обмен SAE на кривой P-256 — в фоновом потоке.
            </div>
          }

          @if (converged()) {
            <div
              class="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              ✓ Точка доступа и клиент независимо сошлись к одному общему секрету —
              пароль подтверждён, и при этом он ни разу не «прозвучал» в эфире.
            </div>
          }

          @if (currentStep(); as step) {
            <app-packet-flow [step]="step" />

            <article
              [@stepChange]="currentIndex()"
              class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-semibold text-slate-800">{{ step.title }}</h3>
                <app-tooltip [text]="step.tooltip">
                  <span
                    class="flex h-5 w-5 cursor-help items-center justify-center rounded-full
                           bg-slate-200 text-xs font-bold text-slate-600"
                  >
                    ?
                  </span>
                </app-tooltip>
                <span class="ml-auto text-xs font-medium text-slate-400">{{ progress() }}</span>
              </div>

              <p class="mt-3 text-sm leading-relaxed text-slate-600">{{ step.description }}</p>

              @if (step.formula) {
                <div
                  class="mt-3 overflow-x-auto rounded-lg border-l-4 border-sky-500 bg-sky-50 px-4 py-2.5"
                >
                  <code class="font-mono text-sm text-slate-800">{{ step.formula }}</code>
                </div>
              }

              <div class="mt-4">
                <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Разбор терминов
                </h4>
                <dl class="flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
                  @for (term of step.terms; track term.term) {
                    <div class="text-sm leading-relaxed">
                      <dt class="inline font-semibold text-slate-800">{{ term.term }}</dt>
                      <dd class="inline text-slate-600"> — {{ term.definition }}</dd>
                    </div>
                  }
                </dl>
              </div>

              <div class="mt-4">
                <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
export class SaeVisualizer {
  private readonly scenarioState = inject(ScenarioStateService);
  private readonly crypto = inject(CryptoEngineService);
  private readonly stepController = inject(StepController);

  protected readonly moduleId = MODULE;
  protected readonly theory = MODULE_THEORY[MODULE];
  protected readonly computing = signal(false);
  protected readonly errors = signal<readonly string[]>([]);

  private readonly exchange = signal<{
    scenario: NetworkScenario;
    result: SaeRunResult;
  } | null>(null);

  private readonly recomputeRequests = new Subject<void>();

  protected readonly converged = computed(() => this.exchange()?.result.converged ?? false);

  protected readonly steps = computed<VisualizationStep[]>(() => {
    const current = this.exchange();
    return current ? buildSaeSteps(current.scenario, current.result) : [];
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
    this.stepController.register(MODULE, SAE_STEP_COUNT);

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
          if (validation.errors.length > 0) {
            this.exchange.set(null);
            this.computing.set(false);
            return EMPTY;
          }
          this.computing.set(true);
          return this.crypto.runSae(scenario).pipe(
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
