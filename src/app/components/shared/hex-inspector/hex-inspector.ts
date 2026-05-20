import { Component, input, signal } from '@angular/core';
import { formatHexDump } from '../../../core/crypto/hex';
import type { CryptoArtifact } from '../../../core/models';

/**
 * Просмотр промежуточных hex-дампов криптоартефактов шага (FR-006).
 */
@Component({
  selector: 'app-hex-inspector',
  template: `
    <div class="rounded-lg border border-slate-200">
      <button
        type="button"
        class="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        (click)="open.set(!open())"
      >
        <span>Hex-дамп ({{ artifacts().length }})</span>
        <span aria-hidden="true">{{ open() ? '▾' : '▸' }}</span>
      </button>

      @if (open()) {
        <div class="flex flex-col gap-3 border-t border-slate-200 p-3">
          @for (artifact of artifacts(); track artifact.id) {
            <div>
              <div class="text-xs font-semibold text-slate-600">
                {{ artifact.label }} · {{ artifact.bitLength }} бит
              </div>
              <pre
                class="mt-1 overflow-x-auto rounded bg-slate-100 p-2 text-xs leading-relaxed text-slate-800"
                >{{ dump(artifact) }}</pre
              >
            </div>
          } @empty {
            <p class="text-xs text-slate-400">Нет значений для просмотра на этом шаге.</p>
          }
        </div>
      }
    </div>
  `,
})
export class HexInspector {
  /** Артефакты текущего шага, доступные для инспекции. */
  readonly artifacts = input.required<readonly CryptoArtifact[]>();

  protected readonly open = signal(false);

  protected dump(artifact: CryptoArtifact): string {
    return formatHexDump(artifact.bytes);
  }
}
