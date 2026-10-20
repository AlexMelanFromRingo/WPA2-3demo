/** Сообщения проверки параметров сети (UA / EN / RU). */
import type { Lang } from './ui-text';

export interface ValidationText {
  ssidEmpty: string;
  ssidLong: string;
  passLength: string;
  passAscii: string;
  apMac: string;
  clientMac: string;
  aNonce: string;
  sNonce: string;
  gtk: string;
  igtk: string;
  sameMac: string;
  sameNonce: string;
}

export const VALIDATION_TEXT: Record<Lang, ValidationText> = {
  ru: {
    ssidEmpty: 'Укажите имя сети (SSID).',
    ssidLong: 'SSID не может быть длиннее 32 байт.',
    passLength: 'Пароль WPA2/WPA3-Personal должен содержать от 8 до 63 символов.',
    passAscii: 'Пароль должен состоять из печатных ASCII-символов.',
    apMac: 'MAC точки доступа — в формате aa:bb:cc:dd:ee:ff.',
    clientMac: 'MAC клиента — в формате aa:bb:cc:dd:ee:ff.',
    aNonce: 'ANonce должен содержать 64 hex-символа (32 байта).',
    sNonce: 'SNonce должен содержать 64 hex-символа (32 байта).',
    gtk: 'GTK должен содержать 32 hex-символа (16 байт).',
    igtk: 'IGTK должен содержать 32 hex-символа (16 байт).',
    sameMac: 'MAC точки доступа и клиента совпадают — необычно, но расчёт выполнится.',
    sameNonce: 'ANonce и SNonce совпадают — в реальной сети так почти не бывает.',
  },
  uk: {
    ssidEmpty: 'Вкажіть ім’я мережі (SSID).',
    ssidLong: 'SSID не може бути довшим за 32 байти.',
    passLength: 'Пароль WPA2/WPA3-Personal має містити від 8 до 63 символів.',
    passAscii: 'Пароль має складатися з друкованих ASCII-символів.',
    apMac: 'MAC точки доступу — у форматі aa:bb:cc:dd:ee:ff.',
    clientMac: 'MAC клієнта — у форматі aa:bb:cc:dd:ee:ff.',
    aNonce: 'ANonce має містити 64 hex-символи (32 байти).',
    sNonce: 'SNonce має містити 64 hex-символи (32 байти).',
    gtk: 'GTK має містити 32 hex-символи (16 байт).',
    igtk: 'IGTK має містити 32 hex-символи (16 байт).',
    sameMac: 'MAC точки доступу й клієнта збігаються — незвично, але розрахунок виконається.',
    sameNonce: 'ANonce і SNonce збігаються — у реальній мережі так майже не буває.',
  },
  en: {
    ssidEmpty: 'Enter the network name (SSID).',
    ssidLong: 'The SSID cannot be longer than 32 bytes.',
    passLength: 'A WPA2/WPA3-Personal password must be 8 to 63 characters long.',
    passAscii: 'The password must consist of printable ASCII characters.',
    apMac: 'Access point MAC — use the format aa:bb:cc:dd:ee:ff.',
    clientMac: 'Client MAC — use the format aa:bb:cc:dd:ee:ff.',
    aNonce: 'ANonce must be 64 hex characters (32 bytes).',
    sNonce: 'SNonce must be 64 hex characters (32 bytes).',
    gtk: 'GTK must be 32 hex characters (16 bytes).',
    igtk: 'IGTK must be 32 hex characters (16 bytes).',
    sameMac: 'The access point and client MACs are the same — unusual, but the computation will run.',
    sameNonce: 'ANonce and SNonce are the same — this almost never happens in a real network.',
  },
};
