<!-- SPECKIT START -->
Active feature: `001-wifi-security-spa` — интерактивная методичка по безопасности
Wi-Fi (WPA2/WPA3/Hashcat 22000).

For technologies, project structure, shell commands, and other important
context, read the current plan: `specs/001-wifi-security-spa/plan.md`
(and its sibling artifacts: `research.md`, `data-model.md`, `quickstart.md`,
`contracts/`).

Stack: Angular 21 + Tailwind CSS v4 + TypeScript; криптовычисления — в Web Worker
на WebCrypto API и `@noble/curves`. NPM-зависимости устанавливать только с
защитным `.npmrc` (`ignore-scripts`, `min-release-age`) — см. research.md R3.
<!-- SPECKIT END -->
