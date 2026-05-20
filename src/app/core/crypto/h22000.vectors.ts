/**
 * Демонстрационные данные и формат строки 22000 (T033, research.md R7).
 *
 * Формат строки режима 22000 (поля разделены `*`):
 *   WPA*<type>*<pmkid|mic>*<apmac>*<stamac>*<essid>*<anonce>*<eapol>*<messagepair>
 *   type 01 = PMKID-атака, type 02 = EAPOL-атака.
 */

/** Предзаполненный мини-словарь Модуля 3 (FR-024); пользователь может его править. */
export const DEFAULT_DICTIONARY: readonly string[] = [
  '12345678',
  'qwertyui',
  'password123',
  'letmein1',
  'admin1234',
  'wifipass',
  'sunshine1',
];

/**
 * «Настоящий» пароль учебной перехваченной сети. Присутствует в словаре по
 * умолчанию — поэтому стартовый сценарий показывает исход «пароль найден».
 * Изменив это поле на слово вне словаря, можно увидеть исход «не найдено».
 */
export const DEFAULT_SECRET_PASSWORD = 'password123';
