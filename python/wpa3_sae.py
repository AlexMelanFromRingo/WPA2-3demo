#!/usr/bin/env python3
"""
WPA3-Personal: имитация ассоциации по стандарту.
SAE (Dragonfly) на кривой NIST P-256 (group 19), метод hunting-and-pecking,
затем 4-way handshake -> PTK. Обе стороны (AP и клиент) считаются независимо,
и в конце проверяется, что они пришли к одному PMK/PTK.

Чистый stdlib. Это учебная модель крипто-ядра SAE, а не сетевой стек.
"""

import hashlib
import hmac
import secrets

# ======================= КОНФИГ — крути что хочешь =======================
SSID      = "HomeNet"
PASSWORD  = "correct horse battery"
BSSID     = "00:11:22:33:44:55"   # MAC точки доступа (Authenticator)
CLIENT    = "66:77:88:99:aa:bb"   # MAC клиента (Supplicant)
# ========================================================================


# ------------------------- NIST P-256 (group 19) -------------------------
P  = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff
A  = P - 3
B  = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b
N  = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551  # порядок
HLEN = 32  # SHA-256


def ec_add(Pt, Q):
    if Pt is None: return Q
    if Q is None: return Pt
    x1, y1 = Pt; x2, y2 = Q
    if x1 == x2 and (y1 + y2) % P == 0:
        return None
    if Pt == Q:
        lam = (3 * x1 * x1 + A) * pow(2 * y1, -1, P) % P
    else:
        lam = (y2 - y1) * pow(x2 - x1, -1, P) % P
    x3 = (lam * lam - x1 - x2) % P
    y3 = (lam * (x1 - x3) - y1) % P
    return (x3, y3)


def ec_mul(k, Pt):
    R = None
    while k:
        if k & 1:
            R = ec_add(R, Pt)
        Pt = ec_add(Pt, Pt)
        k >>= 1
    return R


def ec_neg(Pt):
    return (Pt[0], (-Pt[1]) % P)


# --------------------------- вспомогательное ---------------------------
def mac_bytes(mac: str) -> bytes:
    return bytes.fromhex(mac.replace(":", ""))


def kdf(key: bytes, label: bytes, context: bytes, bits: int) -> bytes:
    """IEEE 802.11 KDF на HMAC-SHA256. i и Length — 16-bit little-endian."""
    out = b""
    i = 1
    iters = (bits + 255) // 256
    while i <= iters:
        out += hmac.new(key, i.to_bytes(2, "little") + label + context +
                        bits.to_bytes(2, "little"), hashlib.sha256).digest()
        i += 1
    return out[: (bits + 7) // 8]


def is_qr(v: int) -> bool:
    return v != 0 and pow(v, (P - 1) // 2, P) == 1


def modsqrt(v: int) -> int:
    # P = 3 (mod 4): корень = v^((P+1)/4)
    return pow(v, (P + 1) // 4, P)


# ----------------------- SAE: вывод PWE (H&P) -----------------------
def derive_pwe(password: str, mac_a: bytes, mac_b: bytes):
    """Hunting and Pecking: пароль + оба MAC -> точка PWE на кривой."""
    key = max(mac_a, mac_b) + min(mac_a, mac_b)
    counter = 1
    while counter < 256:
        pwd_seed = hmac.new(key, password.encode() + bytes([counter]),
                            hashlib.sha256).digest()
        pwd_value = int.from_bytes(
            kdf(pwd_seed, b"SAE Hunting and Pecking", P.to_bytes(32, "big"), 256),
            "big")
        if pwd_value < P:
            x = pwd_value
            rhs = (pow(x, 3, P) + A * x + B) % P
            if is_qr(rhs):
                y = modsqrt(rhs)
                if (y & 1) != (pwd_seed[-1] & 1):
                    y = P - y
                return (x, y), counter
        counter += 1
    raise RuntimeError("PWE не найдена")


# ----------------------- SAE: commit одной стороны -----------------------
def sae_commit(pwe):
    rand = secrets.randbelow(N - 2) + 2
    mask = secrets.randbelow(N - 2) + 2
    scalar = (rand + mask) % N
    element = ec_neg(ec_mul(mask, pwe))   # -(mask * PWE)
    return rand, scalar, element


def sae_shared(pwe, rand, peer_scalar, peer_element):
    # K = rand * (peer_scalar * PWE + peer_element)  ->  x-координата
    K = ec_mul(rand, ec_add(ec_mul(peer_scalar, pwe), peer_element))
    return K[0]


def sae_keys(k: int, scalar_self: int, scalar_peer: int):
    keyseed = hmac.new(b"\x00" * HLEN, k.to_bytes(32, "big"), hashlib.sha256).digest()
    ctx = ((scalar_self + scalar_peer) % N).to_bytes(32, "big")
    out = kdf(keyseed, b"SAE KCK and PMK", ctx, 512)
    return out[:32], out[32:64]   # KCK, PMK


def sae_confirm(kck, send_confirm, s_self, e_self, s_peer, e_peer):
    def enc(e): return e[0].to_bytes(32, "big") + e[1].to_bytes(32, "big")
    msg = (send_confirm.to_bytes(2, "little") +
           s_self.to_bytes(32, "big") + enc(e_self) +
           s_peer.to_bytes(32, "big") + enc(e_peer))
    return hmac.new(kck, msg, hashlib.sha256).digest()


# ----------------------- 4-way handshake (как в WPA2) -----------------------
def prf(key, label, data, n_bytes):
    out, i = b"", 0
    while len(out) < n_bytes:
        out += hmac.new(key, label + b"\x00" + data + bytes([i]), hashlib.sha1).digest()
        i += 1
    return out[:n_bytes]


def derive_ptk(pmk, aa, sa, anonce, snonce):
    data = min(aa, sa) + max(aa, sa) + min(anonce, snonce) + max(anonce, snonce)
    return prf(pmk, b"Pairwise key expansion", data, 48)


# ------------------------------ прогон ------------------------------
def run():
    aa, sa = mac_bytes(BSSID), mac_bytes(CLIENT)
    hx = lambda b: b.hex()

    print(f"SSID={SSID!r}  BSSID={BSSID}  CLIENT={CLIENT}")
    print(f"PASSWORD={PASSWORD!r}\n")

    # 1. PWE (у обеих сторон одинаковая: вход — пароль + оба MAC)
    pwe, cnt = derive_pwe(PASSWORD, aa, sa)
    print(f"[PWE]   найдена на counter={cnt}")
    print(f"        x={pwe[0]:064x}")

    # 2. Commit с каждой стороны
    rand_ap, sc_ap, el_ap = sae_commit(pwe)
    rand_cl, sc_cl, el_cl = sae_commit(pwe)
    print("[COMMIT] обе стороны обменялись scalar+element")

    # 3. Общий секрет k (должен совпасть)
    k_ap = sae_shared(pwe, rand_ap, sc_cl, el_cl)
    k_cl = sae_shared(pwe, rand_cl, sc_ap, el_ap)
    print(f"[SHARED] k совпал: {k_ap == k_cl}")

    # 4. KCK и PMK
    kck_ap, pmk_ap = sae_keys(k_ap, sc_ap, sc_cl)
    kck_cl, pmk_cl = sae_keys(k_cl, sc_cl, sc_ap)
    print(f"[SAE]   PMK={hx(pmk_ap)}")
    print(f"        PMK совпал: {pmk_ap == pmk_cl}")

    # 5. Confirm (взаимная проверка пароля)
    c_ap = sae_confirm(kck_ap, 1, sc_ap, el_ap, sc_cl, el_cl)
    c_cl = sae_confirm(kck_cl, 1, sc_cl, el_cl, sc_ap, el_ap)
    # каждая сторона проверяет confirm, присланный другой стороной:
    ok_ap = c_cl == sae_confirm(kck_ap, 1, sc_cl, el_cl, sc_ap, el_ap)
    ok_cl = c_ap == sae_confirm(kck_cl, 1, sc_ap, el_ap, sc_cl, el_cl)
    print(f"[CONFIRM] пароль подтверждён обеими сторонами: {ok_ap and ok_cl}")

    # 6. 4-way handshake поверх SAE-PMK
    anonce, snonce = secrets.token_bytes(32), secrets.token_bytes(32)
    ptk = derive_ptk(pmk_ap, aa, sa, anonce, snonce)
    print(f"[4-WAY] PTK={hx(ptk)}")
    print(f"        KCK={hx(ptk[:16])}  KEK={hx(ptk[16:32])}  TK={hx(ptk[32:48])}")


if __name__ == "__main__":
    run()
