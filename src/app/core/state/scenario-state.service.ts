import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  type CryptoArtifact,
  DEFAULT_SCENARIO,
  type ModuleId,
  type ModuleOverride,
  type NetworkScenario,
} from '../models';

/**
 * Единый общий сценарий сети + локальные переопределения модулей (clarify Q4).
 * Хранит кэш вычисленных артефактов для сохранения значений при переходах (FR-010).
 */
@Injectable({ providedIn: 'root' })
export class ScenarioStateService {
  private readonly scenarioSubject = new BehaviorSubject<NetworkScenario>({ ...DEFAULT_SCENARIO });
  /** Поток единого общего сценария. */
  readonly scenario$ = this.scenarioSubject.asObservable();

  private readonly overrideSubjects = new Map<ModuleId, BehaviorSubject<ModuleOverride>>();
  private readonly artifactCache = new Map<string, readonly CryptoArtifact[]>();

  /** Текущее значение общего сценария без подписки. */
  get snapshot(): NetworkScenario {
    return this.scenarioSubject.value;
  }

  /** Точечное изменение общего сценария. */
  update(patch: Partial<NetworkScenario>): void {
    this.scenarioSubject.next({ ...this.scenarioSubject.value, ...patch });
  }

  private overrideSubject(module: ModuleId): BehaviorSubject<ModuleOverride> {
    let subject = this.overrideSubjects.get(module);
    if (!subject) {
      subject = new BehaviorSubject<ModuleOverride>({});
      this.overrideSubjects.set(module, subject);
    }
    return subject;
  }

  /** Поток локальных переопределений модуля. */
  override$(module: ModuleId): Observable<ModuleOverride> {
    return this.overrideSubject(module).asObservable();
  }

  /** Локальное переопределение модуля — не затрагивает общий сценарий и другие модули. */
  updateOverride(module: ModuleId, patch: ModuleOverride): void {
    const subject = this.overrideSubject(module);
    subject.next({ ...subject.value, ...patch });
  }

  /** Сбрасывает локальные переопределения модуля. */
  clearOverride(module: ModuleId): void {
    this.overrideSubject(module).next({});
  }

  /** Эффективный сценарий модуля = общий сценарий + локальные переопределения. */
  effective(module: ModuleId): Observable<NetworkScenario> {
    return combineLatest([this.scenario$, this.override$(module)]).pipe(
      map(([base, override]) => ({ ...base, ...override })),
    );
  }

  // --- Кэш вычисленных артефактов (FR-010) ---

  private cacheKey(module: ModuleId, scenario: NetworkScenario): string {
    return [
      module,
      scenario.ssid,
      scenario.passphrase,
      scenario.apMac,
      scenario.clientMac,
      scenario.aNonce,
      scenario.sNonce,
    ].join('|');
  }

  /** Возвращает вычисленные ранее артефакты модуля, если сценарий не менялся. */
  getCached(module: ModuleId, scenario: NetworkScenario): readonly CryptoArtifact[] | undefined {
    return this.artifactCache.get(this.cacheKey(module, scenario));
  }

  /** Сохраняет вычисленные артефакты, чтобы не пересчитывать при возврате к модулю. */
  setCached(
    module: ModuleId,
    scenario: NetworkScenario,
    artifacts: readonly CryptoArtifact[],
  ): void {
    this.artifactCache.set(this.cacheKey(module, scenario), artifacts);
  }
}
