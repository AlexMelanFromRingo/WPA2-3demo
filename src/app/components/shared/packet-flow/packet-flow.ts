import { Component, computed, input } from '@angular/core';
import type { VisualizationStep } from '../../../core/models';

/**
 * Сцена «точка доступа ↔ клиент»: на шагах с переданным `packet`
 * проигрывается анимация летящего между сторонами сообщения (FR-005, Принцип II).
 */
@Component({
  selector: 'app-packet-flow',
  styles: [
    `
      @keyframes pkt-ap-to-client {
        from {
          left: 10%;
        }
        to {
          left: 90%;
        }
      }
      @keyframes pkt-client-to-ap {
        from {
          left: 90%;
        }
        to {
          left: 10%;
        }
      }
      @keyframes pkt-fade {
        from {
          opacity: 0;
        }
        12%,
        100% {
          opacity: 1;
        }
      }
      .pkt {
        animation-duration: 1.2s, 1.2s;
        animation-timing-function: ease-in-out, ease-out;
        animation-fill-mode: both, both;
      }
      .pkt-from-ap {
        animation-name: pkt-ap-to-client, pkt-fade;
      }
      .pkt-from-client {
        animation-name: pkt-client-to-ap, pkt-fade;
      }
      @media (prefers-reduced-motion: reduce) {
        .pkt {
          animation-duration: 0.01s, 0.01s;
        }
      }
    `,
  ],
  template: `
    <div
      class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:gap-4"
    >
      <div class="flex shrink-0 flex-col items-center gap-1">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition"
          [class.border-sky-400]="activeSide() === 'ap'"
          [class.bg-sky-50]="activeSide() === 'ap'"
          [class.border-slate-200]="activeSide() !== 'ap'"
        >
          📡
        </div>
        <span class="text-xs font-medium text-slate-600">Точка доступа</span>
      </div>

      <div class="relative h-12 flex-1">
        <div
          class="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-slate-200"
          aria-hidden="true"
        ></div>
        @for (packet of packets(); track packet.key) {
          <span
            class="pkt absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap
                   rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-md"
            [class.pkt-from-ap]="packet.from === 'ap'"
            [class.pkt-from-client]="packet.from === 'client'"
          >
            {{ packet.label }}
          </span>
        } @empty {
          <span
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-slate-400"
          >
            на этом шаге пакеты по эфиру не передаются
          </span>
        }
      </div>

      <div class="flex shrink-0 flex-col items-center gap-1">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl border text-2xl transition"
          [class.border-sky-400]="activeSide() === 'client'"
          [class.bg-sky-50]="activeSide() === 'client'"
          [class.border-slate-200]="activeSide() !== 'client'"
        >
          📱
        </div>
        <span class="text-xs font-medium text-slate-600">Клиент</span>
      </div>
    </div>
  `,
})
export class PacketFlow {
  /** Текущий шаг модуля (может не содержать пакета). */
  readonly step = input<VisualizationStep | null>(null);

  /** Пакет текущего шага; ключ `index` заставляет анимацию перезапускаться. */
  protected readonly packets = computed(() => {
    const current = this.step();
    return current?.packet
      ? [{ from: current.packet.from, label: current.packet.label, key: current.index }]
      : [];
  });

  protected readonly activeSide = computed(() => this.step()?.packet?.from ?? null);
}
