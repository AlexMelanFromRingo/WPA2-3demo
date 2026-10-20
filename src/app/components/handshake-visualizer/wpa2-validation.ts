import { isValidHex } from '../../core/crypto/hex';
import { VALIDATION_TEXT } from '../../core/i18n/validation-text';
import type { Lang } from '../../core/i18n/ui-text';
import type { NetworkScenario } from '../../core/models';

/** Результат проверки сценария: блокирующие ошибки и необязательные замечания. */
export interface ScenarioValidation {
  /** Блокирующие ошибки — расчёт не запускается (FR-011). */
  errors: string[];
  /** Замечания о нетипичных, но допустимых данных (Edge Cases). */
  notes: string[];
}

const MAC_PATTERN = /^[0-9a-fA-F]{2}([:.-]?[0-9a-fA-F]{2}){5}$/;
const ASCII_PRINTABLE = /^[\x20-\x7e]*$/;

/** Проверяет учебный сценарий и формирует понятные сообщения на языке интерфейса (T025). */
export function validateScenario(scenario: NetworkScenario, lang: Lang = 'ru'): ScenarioValidation {
  const m = VALIDATION_TEXT[lang];
  const errors: string[] = [];
  const notes: string[] = [];

  if (scenario.ssid.length === 0) {
    errors.push(m.ssidEmpty);
  } else if (new TextEncoder().encode(scenario.ssid).length > 32) {
    errors.push(m.ssidLong);
  }

  if (scenario.passphrase.length < 8 || scenario.passphrase.length > 63) {
    errors.push(m.passLength);
  } else if (!ASCII_PRINTABLE.test(scenario.passphrase)) {
    errors.push(m.passAscii);
  }

  if (!MAC_PATTERN.test(scenario.apMac)) {
    errors.push(m.apMac);
  }
  if (!MAC_PATTERN.test(scenario.clientMac)) {
    errors.push(m.clientMac);
  }

  if (!isValidHex(scenario.aNonce, 32)) {
    errors.push(m.aNonce);
  }
  if (!isValidHex(scenario.sNonce, 32)) {
    errors.push(m.sNonce);
  }
  if (!isValidHex(scenario.gtk, 16)) {
    errors.push(m.gtk);
  }
  if (!isValidHex(scenario.igtk, 16)) {
    errors.push(m.igtk);
  }

  // Нетипичные, но не блокирующие ситуации (FR-011, Edge Cases).
  if (errors.length === 0) {
    if (scenario.apMac.toLowerCase() === scenario.clientMac.toLowerCase()) {
      notes.push(m.sameMac);
    }
    if (scenario.aNonce.toLowerCase() === scenario.sNonce.toLowerCase()) {
      notes.push(m.sameNonce);
    }
  }

  return { errors, notes };
}
