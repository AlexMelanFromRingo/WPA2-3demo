# Учебные скрипты WPA2 / WPA3

Два самостоятельных скрипта на чистом stdlib Python 3 (без зависимостей), чтобы
поиграть с параметрами и вспомнить, как работают протоколы. Хранятся как есть.

```bash
python3 python/wpa2_handshake.py   # PBKDF2 → PMK → PTK (KCK/KEK/TK) → MIC, PMKID
python3 python/wpa3_sae.py         # SAE (H&P, P-256) → PMK → 4-way → PTK
```

Параметры меняются прямо в коде: в `wpa2_handshake.py` — в блоке `__main__`,
в `wpa3_sae.py` — в блоке «КОНФИГ» в начале файла.

## Чем скрипты проще стандарта

Скрипты — короткая модель криптоядра. Полная реализация по IEEE 802.11-2020,
сверенная с официальными тест-векторами, живёт на сайте: `src/app/core/crypto/`
(тесты — `*.spec.ts`, запуск `npm test`).

| Где | В скрипте | По стандарту (так на сайте) |
|---|---|---|
| `wpa2_handshake.py` | Кадр EAPOL — заглушка `bytes(99)` | Настоящий кадр M2 с RSNE (121 байт), а также M1, M3 (GTK под AES Key Wrap) и M4 |
| `wpa3_sae.py`, H&P | Цикл выходит на первой удачной итерации | Цикл всегда идёт минимум k = 40 итераций, после находки пароль подменяется случайной строкой (защита от тайминг-атак, Dragonblood) |
| `wpa3_sae.py` | Только Hunting-and-Pecking | Ещё и Hash-to-Element: HKDF + SSWU (RFC 9380) → PT → PWE = val·PT |
| `wpa3_sae.py` | Нет проверки чужого Commit | Проверяется 1 < scalar < r, точка на кривой, защита от «отражения» |
| `wpa3_sae.py` | PMKID не считается | PMKID = первые 16 байт (scalar + peer-scalar) mod r |
| `wpa3_sae.py`, 4-way | PTK через PRF на HMAC-SHA1, как в WPA2 | Для AKM SAE (00-0F-AC:8): PTK = KDF-SHA-256-384, MIC = AES-128-CMAC, в M3 обязателен IGTK (PMF) |

Совпадения проверяются тестами сайта: PMK, PTK и PMKID из `wpa2_handshake.py`
и точка PWE из `wpa3_sae.py` (counter = 1) получаются такими же.
