import { Injectable, type OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import type { CryptoOp, NetworkScenario, WorkerRequest, WorkerResponse } from '../models';
import type { CrackParams, CrackResult } from './hashcat22000';
import type { PweMethod, SaeRunResult } from './sae';
import type { Wpa2RunResult } from './wpa2';

export type { SaeRunResult, PweMethod } from './sae';
export type { CrackParams, CrackResult, CandidateResult } from './hashcat22000';
export type { Pbkdf2Trace, Wpa2RunResult } from './wpa2';
export type { FourWayResult, FourWayMessage } from './fourway';

interface PendingHandler {
  readonly generation: number;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Фасад над Crypto Web Worker (contracts/crypto-worker.contract.md).
 * Гарантирует, что криптовычисления не блокируют UI-поток (Принцип IV).
 */
@Injectable({ providedIn: 'root' })
export class CryptoEngineService implements OnDestroy {
  private worker?: Worker;
  private generationCounter = 0;
  private requestCounter = 0;
  private readonly handlers = new Map<string, PendingHandler>();

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./crypto.worker', import.meta.url));
      this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) =>
        this.onMessage(event.data),
      );
    }
    return this.worker;
  }

  /** Открывает новое поколение расчёта: ответы прежних поколений будут отброшены. */
  newGeneration(): number {
    return ++this.generationCounter;
  }

  /** Текущее поколение расчёта. */
  get currentGeneration(): number {
    return this.generationCounter;
  }

  /** Отправляет операцию в воркер. Результат устаревшего поколения молча игнорируется. */
  request<T>(op: CryptoOp, payload: unknown, generation = this.generationCounter): Observable<T> {
    return new Observable<T>((subscriber) => {
      const id = `req-${++this.requestCounter}`;
      this.handlers.set(id, {
        generation,
        resolve: (value) => {
          if (generation === this.generationCounter) {
            subscriber.next(value as T);
          }
          subscriber.complete();
        },
        reject: (error) => subscriber.error(error),
      });
      const message: WorkerRequest = { id, generation, op, payload };
      this.ensureWorker().postMessage(message);
      return () => this.handlers.delete(id);
    });
  }

  /** Проверка живости воркера (возвращает «pong»). */
  ping(): Observable<string> {
    return this.request<string>('ping', null);
  }

  /** Полное рукопожатие WPA2-PSK: PBKDF2 → PTK → M1…M4 (в Web Worker). */
  runWpa2Handshake(scenario: NetworkScenario): Observable<Wpa2RunResult> {
    return this.request<Wpa2RunResult>('wpa2.run', {
      ssid: scenario.ssid,
      passphrase: scenario.passphrase,
      apMac: scenario.apMac,
      clientMac: scenario.clientMac,
      aNonce: scenario.aNonce,
      sNonce: scenario.sNonce,
      gtk: scenario.gtk,
    });
  }

  /** Полный обмен WPA3 SAE + 4-Way для AKM 8 (в Web Worker). */
  runSae(scenario: NetworkScenario, method: PweMethod): Observable<SaeRunResult> {
    return this.request<SaeRunResult>('sae.run', { ...scenario, method });
  }

  /** Перебор мини-словаря в симуляторе Hashcat 22000 (в Web Worker). */
  runCrack(params: CrackParams): Observable<CrackResult> {
    return this.request<CrackResult>('h22000.crack', params);
  }

  private onMessage(response: WorkerResponse): void {
    if ('progress' in response) {
      return; // прогресс используется операциями перебора (Фаза 5)
    }
    const handler = this.handlers.get(response.id);
    if (!handler) {
      return;
    }
    this.handlers.delete(response.id);
    if (response.ok) {
      handler.resolve(response.result);
    } else {
      handler.reject(new Error(response.error));
    }
  }

  ngOnDestroy(): void {
    this.worker?.terminate();
    this.handlers.clear();
  }
}
