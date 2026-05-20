import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import {
  type CrackParams,
  type CrackResult,
  CryptoEngineService,
} from '../../core/crypto/crypto-engine.service';
import { DEFAULT_DICTIONARY, DEFAULT_SECRET_PASSWORD } from '../../core/crypto/h22000.vectors';
import type { AttackType, ModuleId, VisualizationStep } from '../../core/models';
import { ScenarioStateService } from '../../core/state/scenario-state.service';
import { StepController } from '../../core/state/step-controller.service';
import { MODULE_THEORY } from '../../core/theory';
import { ControlPanel } from '../control-panel/control-panel';
import { validateScenario } from '../handshake-visualizer/wpa2-validation';
import { StepCard } from '../shared/step-card/step-card';
import { TheoryPanel } from '../shared/theory-panel/theory-panel';
import { AttackSwitch } from './attack-switch/attack-switch';
import { DictionaryEditor } from './dictionary-editor/dictionary-editor';
import { buildHashcatSteps } from './hashcat-steps';

const MODULE: ModuleId = 'hashcat-22000';

/**
 * Модуль 3 — Симулятор Hashcat (режим 22000) (T040, T041).
 * Строго образовательная симуляция офлайн-атаки (Принцип V): расчёты идут только
 * над введёнными данными, перебор выполняется в Web Worker.
 */
@Component({
  selector: 'app-hashcat-sim',
  imports: [AttackSwitch, ControlPanel, DictionaryEditor, StepCard, TheoryPanel],
  template: `
    <section class="mx-auto max-w-3xl p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-semibold text-slate-800">Модуль 3 — Симулятор Hashcat 22000</h2>
          <p class="text-sm text-slate-500">
            Как офлайн-перебор подбирает пароль Wi-Fi по перехваченному хэшу.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition"
          [class.bg-sky-600]="fastMode()"
          [class.text-white]="fastMode()"
          [class.bg-slate-100]="!fastMode()"
          [class.text-slate-700]="!fastMode()"
          (click)="toggleFastMode()"
        >
          ⏩ Ускоренный перебор: {{ fastMode() ? 'вкл' : 'выкл' }}
        </button>
      </div>

      <div class="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        ⚠ Это строго образовательная симуляция математики офлайн-атаки. Реального захвата
        трафика и сетевого взаимодействия не происходит — все вычисления идут только над
        данными, которые вы ввели сами.
      </div>

      <div class="mt-3">
        <app-theory-panel [theory]="theory" />
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <app-attack-switch [(attackType)]="attackType" />
      </div>

      <div class="mt-3">
        <app-dictionary-editor [(words)]="words" [(secretPassword)]="secretPassword" />
      </div>

      @if (errors().length > 0) {
        <div class="mt-4 rounded-xl border border-red-300 bg-red-50 p-4">
          <p class="text-sm font-semibold text-red-800">Проверьте параметры:</p>
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
              ⏳ Идёт перебор словаря — для каждого слова по-настоящему считается PBKDF2.
            </div>
          }

          @if (result(); as crack) {
            <div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Строка хэша формата 22000
              </p>
              <p class="mt-1 break-all rounded bg-slate-100 p-2 font-mono text-xs text-slate-800">
                {{ crack.hash22000Line }}
              </p>
            </div>
          }

          @if (currentStep(); as step) {
            <app-step-card [step]="step" [progress]="progress()" />
          }
        </div>
      }
    </section>
  `,
})
export class HashcatSim {
  private readonly scenarioState = inject(ScenarioStateService);
  private readonly crypto = inject(CryptoEngineService);
  private readonly stepController = inject(StepController);

  protected readonly moduleId = MODULE;
  protected readonly theory = MODULE_THEORY[MODULE];
  protected readonly attackType = signal<AttackType>('pmkid');
  protected readonly words = signal<string[]>([...DEFAULT_DICTIONARY]);
  protected readonly secretPassword = signal<string>(DEFAULT_SECRET_PASSWORD);
  protected readonly fastMode = signal(false);
  protected readonly computing = signal(false);
  protected readonly errors = signal<readonly string[]>([]);
  protected readonly result = signal<CrackResult | null>(null);

  private readonly scenario = toSignal(this.scenarioState.effective(MODULE), {
    requireSync: true,
  });

  private readonly crackParams = computed<CrackParams>(() => {
    const sc = this.scenario();
    return {
      attackType: this.attackType(),
      ssid: sc.ssid,
      apMac: sc.apMac,
      clientMac: sc.clientMac,
      aNonce: sc.aNonce,
      sNonce: sc.sNonce,
      secretPassword: this.secretPassword(),
      words: this.words(),
    };
  });

  protected readonly steps = computed<VisualizationStep[]>(() => {
    const crack = this.result();
    return crack ? buildHashcatSteps(crack, this.fastMode()) : [];
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
    this.stepController.register(MODULE, 1);

    toObservable(this.crackParams)
      .pipe(
        debounceTime(400),
        switchMap((params) => {
          const validation = validateScenario({
            ssid: params.ssid,
            passphrase: params.secretPassword,
            apMac: params.apMac,
            clientMac: params.clientMac,
            aNonce: params.aNonce,
            sNonce: params.sNonce,
          });
          const errors = [...validation.errors];
          if (params.words.length === 0) {
            errors.push('Добавьте хотя бы одно слово в мини-словарь.');
          }
          this.errors.set(errors);
          if (errors.length > 0) {
            this.result.set(null);
            this.computing.set(false);
            return EMPTY;
          }
          this.computing.set(true);
          return this.crypto.runCrack(params).pipe(
            catchError((err: unknown) => {
              this.errors.set([
                err instanceof Error ? err.message : 'Не удалось выполнить перебор.',
              ]);
              this.result.set(null);
              this.computing.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((crack) => {
        this.result.set(crack);
        this.computing.set(false);
        this.syncSteps();
      });
  }

  private syncSteps(): void {
    this.stepController.register(MODULE, Math.max(this.steps().length, 1));
    this.stepController.goTo(MODULE, 0);
  }

  protected toggleFastMode(): void {
    this.fastMode.update((value) => !value);
    this.syncSteps();
  }
}
