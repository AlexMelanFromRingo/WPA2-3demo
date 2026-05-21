/**
 * Crypto Web Worker — изолирует тяжёлые криптовычисления от UI-потока
 * (Принцип IV конституции, contracts/crypto-worker.contract.md).
 *
 * Реализованы: `ping`, операции WPA2 (`wpa2.pmk`, `wpa2.ptk`, `wpa2.mic`).
 * Операции WPA3 SAE и Hashcat 22000 добавляются в Фазах 4–5.
 */
import { hexToBytes } from './hex';
import type { WorkerRequest, WorkerResponse } from '../models';
import { type CrackParams, runCrack } from './hashcat22000';
import { runSae } from './sae';
import { buildEapolKeyFrame, computeMic, derivePmk, derivePtk, pbkdf2Trace } from './wpa2';

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
      case 'wpa2.pmk': {
        const p = payload as { passphrase: string; ssid: string };
        const pmk = await derivePmk(p.passphrase, p.ssid);
        const trace = await pbkdf2Trace(p.passphrase, p.ssid);
        reply({ id, generation, ok: true, result: { pmk, pbkdf2Trace: trace } });
        return;
      }
      case 'wpa2.ptk': {
        const p = payload as {
          pmk: Uint8Array;
          apMac: string;
          clientMac: string;
          aNonce: string;
          sNonce: string;
        };
        const result = await derivePtk(p.pmk, p.apMac, p.clientMac, p.aNonce, p.sNonce);
        reply({ id, generation, ok: true, result });
        return;
      }
      case 'wpa2.mic': {
        const p = payload as { kck: Uint8Array; sNonce: string };
        const eapolFrame = buildEapolKeyFrame(hexToBytes(p.sNonce));
        const mic = await computeMic(p.kck, eapolFrame);
        reply({ id, generation, ok: true, result: { eapolFrame, mic } });
        return;
      }
      case 'sae.run': {
        const p = payload as {
          passphrase: string;
          ssid: string;
          apMac: string;
          clientMac: string;
        };
        const result = await runSae(p.passphrase, p.ssid, p.apMac, p.clientMac);
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
