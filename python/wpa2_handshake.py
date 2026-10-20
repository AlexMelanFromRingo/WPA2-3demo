#!/usr/bin/env python3
"""
WPA2-Personal: демонстрация всех этапов вывода ключей и проверки MIC.
Та же цепочка, что использует hashcat -m 2500/22000, только на одном кандидате.
Чистый stdlib, без сторонних зависимостей.
"""

import hashlib
import hmac
import binascii


def pbkdf2_pmk(passphrase: str, ssid: str) -> bytes:
    """Этап 0: пароль + SSID -> PMK (=PSK). PBKDF2-HMAC-SHA1, 4096 итераций, 32 байта."""
    return hashlib.pbkdf2_hmac("sha1", passphrase.encode(), ssid.encode(), 4096, 32)


def prf(key: bytes, label: bytes, data: bytes, n_bytes: int) -> bytes:
    """WPA PRF-n на HMAC-SHA1. Цикл со счётчиком i, пока не наберётся n_bytes."""
    out = b""
    i = 0
    while len(out) < n_bytes:
        out += hmac.new(key, label + b"\x00" + data + bytes([i]), hashlib.sha1).digest()
        i += 1
    return out[:n_bytes]


def derive_ptk(pmk: bytes, mac_ap: bytes, mac_cl: bytes,
               anonce: bytes, snonce: bytes) -> bytes:
    """Этап 1: PMK + nonce + MAC -> PTK (48 байт для CCMP). min/max для симметрии сторон."""
    data = (min(mac_ap, mac_cl) + max(mac_ap, mac_cl) +
            min(anonce, snonce) + max(anonce, snonce))
    return prf(pmk, b"Pairwise key expansion", data, 48)


def compute_mic(kck: bytes, eapol_frame: bytes) -> bytes:
    """MIC для WPA2 (AKM на SHA1): HMAC-SHA1(KCK, EAPOL с обнулённым полем MIC)[:16]."""
    return hmac.new(kck, eapol_frame, hashlib.sha1).digest()[:16]


def compute_pmkid(pmk: bytes, mac_ap: bytes, mac_cl: bytes) -> bytes:
    """Путь PMKID (режим 16800 / часть 22000): HMAC-SHA1(PMK, "PMK Name"||AP||cl)[:16]."""
    return hmac.new(pmk, b"PMK Name" + mac_ap + mac_cl, hashlib.sha1).digest()[:16]


def h(b: bytes) -> str:
    return binascii.hexlify(b).decode()


if __name__ == "__main__":
    # --- Исходные данные (в реальной атаке всё, кроме пароля, берётся из перехвата) ---
    SSID = "TestNet"
    PASSPHRASE = "password123"          # кандидат, который проверяем

    MAC_AP = binascii.unhexlify("001122334455")   # BSSID точки доступа
    MAC_CL = binascii.unhexlify("66778899aabb")   # MAC клиента
    ANONCE = bytes(range(32))                      # из Message 1
    SNONCE = bytes(range(32, 64))                  # из Message 2
    # Тело EAPOL-кадра из Message 2 с ОБНУЛЁННЫМ полем MIC (здесь — заглушка):
    EAPOL = bytes(99)

    # --- Этап 0: PMK ---
    pmk = pbkdf2_pmk(PASSPHRASE, SSID)
    print(f"PMK   : {h(pmk)}")

    # --- Этап 1: PTK и его части ---
    ptk = derive_ptk(pmk, MAC_AP, MAC_CL, ANONCE, SNONCE)
    kck, kek, tk = ptk[:16], ptk[16:32], ptk[32:48]
    print(f"PTK   : {h(ptk)}")
    print(f"  KCK : {h(kck)}   (подпись MIC)")
    print(f"  KEK : {h(kek)}   (шифрование GTK)")
    print(f"  TK  : {h(tk)}   (шифрование данных)")

    # --- Этап 2: MIC и PMKID ---
    mic = compute_mic(kck, EAPOL)
    pmkid = compute_pmkid(pmk, MAC_AP, MAC_CL)
    print(f"MIC   : {h(mic)}")
    print(f"PMKID : {h(pmkid)}")

    # --- Логика взлома: сравнение с перехваченным значением ---
    captured_mic = mic          # подставь сюда реальный MIC из дампа
    print("\nПароль подошёл!" if compute_mic(kck, EAPOL) == captured_mic
          else "\nMIC не совпал — пароль неверный.")
