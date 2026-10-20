import { Routes } from '@angular/router';

/**
 * Навигация между справочником и тремя модулями методички без перезагрузки
 * страницы (FR-001). Компоненты подгружаются лениво; `title` — ключ ui-text
 * (см. LocalizedTitleStrategy).
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'guide' },
  {
    path: 'guide',
    title: 'docGuide',
    loadComponent: () => import('./components/guide/guide-page').then((m) => m.GuidePage),
  },
  {
    path: 'wpa2',
    title: 'm1Title',
    loadComponent: () =>
      import('./components/handshake-visualizer/handshake-visualizer').then(
        (m) => m.HandshakeVisualizer,
      ),
  },
  {
    path: 'wpa3',
    title: 'm2Title',
    loadComponent: () =>
      import('./components/sae-visualizer/sae-visualizer').then((m) => m.SaeVisualizer),
  },
  {
    path: 'hashcat',
    title: 'm3Title',
    loadComponent: () => import('./components/hashcat-sim/hashcat-sim').then((m) => m.HashcatSim),
  },
  { path: '**', redirectTo: 'guide' },
];
