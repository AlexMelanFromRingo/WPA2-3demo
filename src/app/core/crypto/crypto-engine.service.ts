import { Injectable, type OnDestroy } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import type { CryptoOp, NetworkScenario, WorkerRequest, WorkerResponse } from '../models';
import type { CrackParams, CrackResult } from './hashcat22000';
import type { SaeRunResult } from './sae';

export type { SaeRunResult } from './sae';
export type { CrackParams, CrackResult, CandidateResult } from './hashcat22000';

interface PendingHandler {
  readonly generation: number;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

/** Полный результат расчёта рукопожатия WPA2. */
export interface Wpa2HandshakeResult {
  pmk: Uint8Array;
  b: Uint8Array;
  ptk: Uint8Array;
  kck: Uint8Array;
  kek: Uint8Array;
  tk: Uint8Array;
  eapolFrame: Uint8Array;
  mic: Uint8Array;
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

  /**
   * Полный расчёт рукопожатия WPA2: PMK → PTK → MIC.
   * Каждый шаг — отдельная операция воркера; `switchMap` отменяет
   * незавершённую цепочку при новой подписке (FR-009).
   */
  runWpa2Handshake(scenario: NetworkScenario): Observable<Wpa2HandshakeResult> {
    return this.request<{ pmk: Uint8Array }>('wpa2.pmk', {
      passphrase: scenario.passphrase,
      ssid: scenario.ssid,
    }).pipe(
      switchMap(({ pmk }) =>
        this.request<{
          b: Uint8Array;
          ptk: Uint8Array;
          kck: Uint8Array;
          kek: Uint8Array;
          tk: Uint8Array;
        }>('wpa2.ptk', {
          pmk,
          apMac: scenario.apMac,
          clientMac: scenario.clientMac,
          aNonce: scenario.aNonce,
          sNonce: scenario.sNonce,
        }).pipe(
          switchMap((ptk) =>
            this.request<{ eapolFrame: Uint8Array; mic: Uint8Array }>('wpa2.mic', {
              kck: ptk.kck,
              sNonce: scenario.sNonce,
            }).pipe(map((micResult) => ({ pmk, ...ptk, ...micResult }))),
          ),
        ),
      ),
    );
  }

  /** Полный обмен WPA3 SAE (Dragonfly) в Web Worker. */
  runSae(scenario: NetworkScenario): Observable<SaeRunResult> {
    return this.request<SaeRunResult>('sae.run', {
      passphrase: scenario.passphrase,
      ssid: scenario.ssid,
      apMac: scenario.apMac,
      clientMac: scenario.clientMac,
    });
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
