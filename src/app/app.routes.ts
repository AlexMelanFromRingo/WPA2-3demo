import { Routes } from '@angular/router';

/**
 * Навигация между тремя модулями методички без перезагрузки страницы (FR-001).
 * Компоненты модулей подгружаются лениво.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'wpa2' },
  {
    path: 'wpa2',
    title: 'Модуль 1 — WPA2 4-Way Handshake',
    loadComponent: () =>
      import('./components/handshake-visualizer/handshake-visualizer').then(
        (m) => m.HandshakeVisualizer,
      ),
  },
  {
    path: 'wpa3',
    title: 'Модуль 2 — WPA3 SAE (Dragonfly)',
    loadComponent: () =>
      import('./components/sae-visualizer/sae-visualizer').then((m) => m.SaeVisualizer),
  },
  {
    path: 'hashcat',
    title: 'Модуль 3 — Симулятор Hashcat 22000',
    loadComponent: () => import('./components/hashcat-sim/hashcat-sim').then((m) => m.HashcatSim),
  },
  { path: '**', redirectTo: 'wpa2' },
];
