/**
 * Crypto Web Worker — изолирует тяжёлые криптовычисления от UI-потока
 * (Принцип IV конституции, contracts/crypto-worker.contract.md).
 *
 * Операции: `ping`, `wpa2.run` (PBKDF2 → 4-Way M1–M4), `sae.run`
 * (SAE + 4-Way для AKM 8), `h22000.crack` (учебный перебор словаря).
 */
import type { WorkerRequest, WorkerResponse } from '../models';
import { type CrackParams, runCrack } from './hashcat22000';
import { runSae, type SaeParams } from './sae';
import { runWpa2, type Wpa2Params } from './wpa2';

addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handle(event.data);
});

async function handle(request: WorkerRequest): Promise<void> {
  const { id, generation, op, payload } = request;
  try {
    switch (op) {
      case 'ping': {
        reply({ id, generation, ok: true, result: 'pong' });
        return;
      }
      case 'wpa2.run': {
        const result = await runWpa2(payload as Wpa2Params);
        reply({ id, generation, ok: true, result });
        return;
      }
      case 'sae.run': {
        const result = await runSae(payload as SaeParams);
        reply({ id, generation, ok: true, result });
        return;
      }
      case 'h22000.crack': {
        const result = await runCrack(payload as CrackParams);
        reply({ id, generation, ok: true, result });
        return;
      }
      default: {
        reply({ id, generation, ok: false, error: `Операция «${op}» ещё не реализована.` });
      }
    }
  } catch (err) {
    reply({
      id,
      generation,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function reply(message: WorkerResponse): void {
  postMessage(message);
}
