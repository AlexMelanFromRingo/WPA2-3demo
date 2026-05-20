import { isValidHex } from '../../core/crypto/hex';
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

/** Проверяет учебный сценарий WPA2 и формирует понятные сообщения (T025). */
export function validateScenario(scenario: NetworkScenario): ScenarioValidation {
  const errors: string[] = [];
  const notes: string[] = [];

  if (scenario.ssid.length === 0) {
    errors.push('Укажите имя сети (SSID).');
  } else if (new TextEncoder().encode(scenario.ssid).length > 32) {
    errors.push('SSID не может быть длиннее 32 байт.');
  }

  if (scenario.passphrase.length < 8 || scenario.passphrase.length > 63) {
    errors.push('Пароль WPA2 должен содержать от 8 до 63 символов.');
  } else if (!ASCII_PRINTABLE.test(scenario.passphrase)) {
    errors.push('Пароль WPA2 должен состоять из печатных ASCII-символов.');
  }

  if (!MAC_PATTERN.test(scenario.apMac)) {
    errors.push('MAC точки доступа — в формате aa:bb:cc:dd:ee:ff.');
  }
  if (!MAC_PATTERN.test(scenario.clientMac)) {
    errors.push('MAC клиента — в формате aa:bb:cc:dd:ee:ff.');
  }

  if (!isValidHex(scenario.aNonce, 32)) {
    errors.push('ANonce должен содержать 64 hex-символа (32 байта).');
  }
  if (!isValidHex(scenario.sNonce, 32)) {
    errors.push('SNonce должен содержать 64 hex-символа (32 байта).');
  }

  // Нетипичные, но не блокирующие ситуации (FR-011, Edge Cases).
  if (errors.length === 0) {
    if (scenario.apMac.toLowerCase() === scenario.clientMac.toLowerCase()) {
      notes.push('MAC точки доступа и клиента совпадают — необычно, но расчёт выполнится.');
    }
    if (scenario.aNonce.toLowerCase() === scenario.sNonce.toLowerCase()) {
      notes.push('ANonce и SNonce совпадают — в реальной сети так почти не бывает.');
    }
  }

  return { errors, notes };
}
