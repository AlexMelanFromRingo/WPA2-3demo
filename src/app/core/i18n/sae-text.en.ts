/** Step text for the WPA3 SAE module — English version. */
import type { SaeText } from './sae-text';

export const SAE_TEXT_EN: SaeText = {
  labels: {
    ssid: 'SSID (network name)',
    passphrase: 'Network password',
    apMac: 'Access point MAC',
    clientMac: 'Client MAC',
    pwdSeed: 'pwd-seed',
    pt: 'PT — password point (depends on the SSID)',
    pwe: 'PWE — password element',
    clCommit: 'Client Commit',
    apCommit: 'Access point Commit',
    clScalar: 'client scalar',
    clElement: 'client element',
    apScalar: 'access point scalar',
    apElement: 'access point element',
    sharedK: 'k — shared secret',
    keyseed: 'keyseed',
    saeKck: 'KCK (SAE, 32 bytes)',
    pmk: 'PMK',
    pmkid: 'PMKID',
    clConfirm: 'Client Confirm',
    apConfirm: 'Access point Confirm',
    ptk: 'PTK',
    m1: 'M1 frame',
    m2: 'M2 frame',
    m3: 'M3 frame',
    m4: 'M4 frame',
    keyDataPlain: 'M3 Key Data (plaintext)',
    keyDataWrapped: 'M3 Key Data (encrypted)',
  },
  methodLabel: { h2e: 'Hash-to-Element (H2E)', hnp: 'Hunting-and-Pecking (H&P)' },
  methodHint: {
    h2e: 'the modern method: no loop, constant time; mandatory in the 6 GHz band',
    hnp: 'the original 2012 method: a “search and try” loop; allowed, but needs a careful implementation',
  },
  hnp: {
    header: 'counter\tpwd-value < p\tx³+ax+b — square\tresult',
    yes: 'yes',
    no: 'no',
    found: '← FOUND: take this x',
    masked: 'iterations {from}–{to}: the password is replaced by a random string, the result is not used',
  },
  droppedLabel: 'discarded',
  ok: '✓ match',
  fail: '✗ no match',
  passed: '✓ passed',
  rejected: '✗ rejected',
  frameFields: {
    auth: 'Algorithm ‖ Seq ‖ Status',
    group: 'Group',
    scalar: 'Scalar',
    element: 'Element (x ‖ y)',
  },
  steps: [
    {
      title: 'Input data and choice of method',
      tooltip: 'Password, SSID and MAC addresses. The PWE derivation method is switched with the buttons above.',
      description:
        'Why: in WPA2 anyone who recorded the handshake can try passwords at home. WPA3 ' +
        'closes this hole with the SAE protocol. What: SAE is a PAKE, a “key exchange with ' +
        'password check”: the sides produce a shared secret in such a way that every attempt ' +
        'to guess the password requires a live conversation with the access point. How: SAE ' +
        'runs BEFORE association, using Authentication frames instead of the empty Open ' +
        'System Authentication of WPA2. We work on group 19 — the NIST P-256 elliptic curve. ' +
        'At the top you can choose how the password is turned into a point on the curve.',
      terms: [
        { term: 'SAE', definition: 'Simultaneous Authentication of Equals (IEEE 802.11-2020 §12.4). It is based on the Dragonfly protocol (RFC 7664).' },
        { term: 'PAKE', definition: 'Password-Authenticated Key Exchange — a key exchange in which knowledge of the password is proven, but neither the password nor anything that could be used to check it goes over the air.' },
        { term: 'Equals', definition: 'SAE has no “server” and “client” in the cryptographic sense: both sides perform the same steps, and either one can start first.' },
        { term: 'Elliptic curve', definition: 'the set of points (x, y) that satisfy y² = x³ + a·x + b modulo a large prime p. Points can be added; multiplying a point by a number is easy, but finding that number from the result is practically impossible.' },
        { term: 'Group 19', definition: 'the number of a parameter set in SAE: the NIST P-256 curve (256 bits). All WPA3 devices must support it; there are also groups 20 (P-384) and 21 (P-521).' },
      ],
      transform: 'Demo network parameters',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Password    "{passText}"  →  hex {passHex}',
        'AP MAC      {apMacColon}',
        'Client MAC  {clientMacColon}',
        'Group       19 (NIST P-256)',
        'PWE method  {methodName}',
        '',
        'Curve P-256:  y² = x³ − 3·x + b  (mod p)',
        '  p = {curveP}',
        '  r = {curveR}   (number of points — the “group order”)',
      ],
    },
    {
      title: 'Step 1 — The point PT from the SSID and password (H2E)',
      tooltip: 'HKDF turns the password into two numbers, and SSWU turns each of them into a curve point.',
      description:
        'Why: SAE cryptography works with curve points, not strings, so the password has to ' +
        'be turned into a point — in such a way that the password cannot be recovered from ' +
        'the point. What: H2E (Hash-to-Element) first makes a point PT from the SSID and the ' +
        'password. How: HKDF-Extract mixes the password with the SSID into a 32-byte ' +
        'pwd-seed; HKDF-Expand with two different labels gives two 48-byte numbers u1 and ' +
        'u2; the SSWU mapping from RFC 9380 turns each of them into a curve point, and ' +
        'PT = P1 + P2. No loops and no trials — the computation time does not depend on the ' +
        'password. PT can be computed once and stored: it does not depend on the MAC ' +
        'addresses.',
      formula: 'pwd-seed = HKDF-Extract(SSID, password);  uᵢ = HKDF-Expand(pwd-seed, "SAE Hash to Element uᵢ Pᵢ", 48) mod p;  PT = SSWU(u1) + SSWU(u2)',
      terms: [
        { term: 'HKDF', definition: 'HMAC-based Key Derivation Function (RFC 5869). Extract “squeezes” a uniform key out of the input (here — HMAC-SHA256 with the SSID as the salt), Expand stretches it to the required length with a given label.' },
        { term: 'SSWU', definition: 'simplified Shallue–van de Woestijne–Ulas — a formula that turns any number u into a curve point in a fixed number of operations (RFC 9380 §6.6.2). For P-256 the parameter Z = −10.' },
        { term: 'Quadratic residue', definition: 'a number that has a square root modulo p. A point with coordinate x exists only if x³ + a·x + b is a quadratic residue.' },
        { term: 'mod p', definition: 'the remainder of division by p. All curve computations go “around in a circle” within the range from 0 to p − 1.' },
        { term: 'Why 48 bytes', definition: '48 bytes = 32 + 16: the extra 16 bytes make the remainder of division by p practically uniform, with no bias towards small numbers.' },
      ],
      transform: 'HKDF-SHA256 + SSWU (RFC 9380)',
      calc: [
        '1) pwd-seed = HKDF-Extract(salt = SSID, input = password)',
        '            = HMAC-SHA256("{ssidText}", "{passText}")',
        '            = {pwdSeed}',
        '',
        '2) pwd-value1 = HKDF-Expand(pwd-seed, "SAE Hash to Element u1 P1", 48)',
        '            = {pwdValue1}',
        '   u1 = pwd-value1 mod p = {u1}',
        '   pwd-value2 = HKDF-Expand(pwd-seed, "SAE Hash to Element u2 P2", 48)',
        '            = {pwdValue2}',
        '   u2 = pwd-value2 mod p = {u2}',
        '',
        '3) SSWU(u1): is gx1 a square? {sswu1Square} → x = {sswu1Which}; y sign corrected: {sswu1Neg}',
        '   P1 = ({p1x},',
        '         {p1y})',
        '   SSWU(u2): is gx1 a square? {sswu2Square} → x = {sswu2Which}; y sign corrected: {sswu2Neg}',
        '   P2 = ({p2x},',
        '         {p2y})',
        '',
        '4) PT = P1 + P2 (adding curve points)',
        '   PT.x = {ptx}',
        '   PT.y = {pty}',
      ],
    },
    {
      title: 'Step 2 — PWE = val · PT (H2E)',
      tooltip: 'PT is “bound” to the pair of MAC addresses: it is multiplied by a number made from the MACs.',
      description:
        'Why: the password element must be unique to each pair of devices — then the ' +
        'results of one exchange are useless for another. What: a number val is made from ' +
        'the two MAC addresses, and the point PT is multiplied by it. How: val = ' +
        'HKDF-Extract(32 zero bytes, larger MAC ‖ smaller MAC), brought into the range from ' +
        '1 to r − 1, and PWE = val · PT. Both sides get the same point PWE independently, ' +
        'without sending anything.',
      formula: 'val = HKDF-Extract(0³², max(MAC) ‖ min(MAC)) mod (r − 1) + 1;  PWE = val · PT',
      terms: [
        { term: 'PWE', definition: 'Password Element — the curve point on which the whole SAE exchange is built. Only those who know the password know it.' },
        { term: 'Multiplying a point by a number', definition: 'adding a point to itself many times (val · PT = PT + PT + … + PT). It is fast, while the reverse problem — finding val from the result — is the “discrete logarithm problem” and is practically unsolvable.' },
        { term: 'max / min MAC', definition: 'the larger and the smaller of the two MAC addresses: the order is fixed, so both sides get the same val.' },
      ],
      transform: 'HKDF-Extract(MAC) and point multiplication',
      calc: [
        'max(MAC) ‖ min(MAC) = {macMaxMin}',
        'HKDF-Extract(0³², max ‖ min) = HMAC-SHA256(32 zero bytes, max ‖ min)',
        '  = {valHash}',
        'val = this number mod (r − 1) + 1 = {val}',
        '',
        'PWE = val · PT',
        '  PWE.x = {pwex}',
        '  PWE.y = {pwey}',
        '',
        'The access point derived PWE on its own — comparison: {chkPwe}',
      ],
    },
    {
      title: 'Step 3 — The client’s Commit',
      tooltip: 'The client hides PWE behind two random numbers and sends a scalar and an element.',
      description:
        'Why: each side must contribute its own randomness to the shared secret without ' +
        'revealing PWE. What: the client picks two secret random numbers rand and mask from ' +
        '2 to r − 1 and sends a Commit frame with two public values. How: scalar = (rand + ' +
        'mask) mod r — just a number; element = −(mask · PWE) — a curve point. From them ' +
        'nobody can learn rand, mask or PWE: mask “masks” the password point. rand and mask ' +
        'are single-use — the next connection will have new ones (and so the keys will be ' +
        'new too).',
      formula: 'scalar = (rand + mask) mod r;  element = −(mask · PWE)',
      terms: [
        { term: 'Commit', definition: 'the first SAE message (an Authentication frame, Transaction Sequence = 1): “here are my commitments”. Algorithm = 3 means SAE.' },
        { term: 'rand, mask', definition: 'secret single-use random numbers. rand is needed for the shared secret, mask is there to hide PWE. They are never transmitted.' },
        { term: 'Status 126', definition: 'the SAE_HASH_TO_ELEMENT status code: this is how a side announces that it uses H2E. With H&P the status is 0.' },
        { term: 'Inverse point (−P)', definition: 'the point (x, p − y) — the “mirror image” across the x axis. P + (−P) = the “zero” of the curve.' },
      ],
      transform: 'scalar = rand + mask, element = −mask·PWE',
      calc: [
        'The client’s secrets (never sent over the air):',
        '  rand = {clRand}',
        '  mask = {clMask}',
        '',
        'scalar  = (rand + mask) mod r = {clScalar}',
        'element = −(mask · PWE)',
        '  x = {clElemX}',
        '  y = {clElemY}',
        '',
        'Authentication frame — Commit ({clCommitLen} bytes):',
        '  Algorithm\t0300\t3 = SAE',
        '  Transaction Seq\t{seq1}\t1 = Commit',
        '  Status\t{statusHex}\t{statusDec}',
        '  Group\t1300\t19 = NIST P-256',
        '  Scalar\t{clScalar}',
        '  Element\t{clElemX}',
        '  \t{clElemY}',
      ],
      byteCaption:
        'Body of the Commit frame: service fields (algorithm, message number, status), the ' +
        'group number, the scalar (32 bytes) and the element (64 bytes — the x and y ' +
        'coordinates).',
      packetLabel: 'Commit (scalar, element)',
    },
    {
      title: 'Step 4 — The access point’s Commit',
      tooltip: 'The access point does the same with its own random numbers.',
      description:
        'The sides are equal: the access point performs the same actions — its own rand and ' +
        'mask, its own scalar and element — and sends its own Commit. The order does not ' +
        'matter: in real networks the client usually starts with its Commit, but the ' +
        'standard also allows both to send at the same time. If the access point is ' +
        'overloaded, instead of a Commit it can reply with status 76 and an anti-clogging ' +
        '“token”: the client must repeat its Commit with the token. This filters out flood ' +
        'attacks from fake MAC addresses — SAE computations are expensive.',
      formula: 'scalar_AP = (rand_AP + mask_AP) mod r;  element_AP = −(mask_AP · PWE)',
      terms: [
        { term: 'Anti-clogging token', definition: 'a “token against clogging” (status 76): a short value that the access point hands out in reply to a Commit when it is under load. It proves that the client really receives frames sent to its MAC.' },
        { term: 'Status 77', definition: 'UNSUPPORTED_FINITE_CYCLIC_GROUP — “this group is not supported”: the client repeats the Commit with another group.' },
      ],
      transform: 'Its own rand, mask → scalar, element',
      calc: [
        'The access point’s secrets:',
        '  rand = {apRand}',
        '  mask = {apMask}',
        '',
        'scalar  = {apScalar}',
        'element.x = {apElemX}',
        'element.y = {apElemY}',
        '',
        'The access point’s Commit frame — {apCommitLen} bytes, the same structure.',
      ],
      byteCaption: 'Body of the access point’s Commit frame — the same structure, different values.',
      packetLabel: 'Commit (scalar, element)',
    },
    {
      title: 'Step 5 — Checking the Commit and the shared secret k',
      tooltip: 'Each side checks the other side’s Commit and computes the same point K.',
      description:
        'Why: we need a shared secret known only to those who know PWE. What: first each ' +
        'side checks the other side’s Commit: the scalar must be greater than 1 and less ' +
        'than r, the element must be a real point on the curve, and the Commit itself must ' +
        'not be the same as its own (otherwise it is a “reflection” attack). How: then K = ' +
        'rand · (peer_scalar · PWE + peer_element), and k is the x-coordinate of K. Why the ' +
        'results match: in the sum, one side’s mask cancels out against −mask, and both are ' +
        'left with rand_client · rand_AP · PWE.',
      formula: 'K = rand · (peer_scalar · PWE + peer_element);  k = x(K)',
      terms: [
        { term: 'Reflection attack', definition: 'an attacker “reflects” your own Commit back to you. Checking it against your own Commit blocks this.' },
        { term: 'Point check', definition: 'the coordinates are less than p and the curve equation holds. Without it an attacker could slip in a “point” that is not on the curve and extract the secret (invalid-curve attack).' },
        { term: 'Why k is the same', definition: 'rand_A·(s_B·PWE − mask_B·PWE) = rand_A·rand_B·PWE, and the other side gets the same product in reverse order.' },
      ],
      transform: 'Check + K = rand·(s·PWE + E)',
      calc: [
        'The client checks the access point’s Commit:',
        '  1 < scalar < r: {chkClScalar};  element on the curve: {chkClElement};  not a reflection: {chkClReflect}',
        'The access point checks the client’s Commit:',
        '  1 < scalar < r: {chkApScalar};  element on the curve: {chkApElement};  not a reflection: {chkApReflect}',
        '',
        'Client side: K = rand_client · (scalar_AP · PWE + element_AP)',
        '  k = x(K) = {clK}',
        'Access point side: K = rand_AP · (scalar_client · PWE + element_client)',
        '  k = x(K) = {apK}',
        '',
        'k on both sides: {chkK}',
      ],
    },
    {
      title: 'Step 6 — KCK, PMK and PMKID',
      tooltip: 'The confirmation key KCK and the master key PMK are derived from k.',
      description:
        'Why: the raw shared secret k is not used directly — keys for specific tasks are ' +
        'derived from it. What: the KCK is needed to confirm the exchange in Confirm, and the ' +
        'PMK is the master key for the 4-Way Handshake that follows. How: keyseed = ' +
        'HMAC-SHA256(32 zero bytes, k); then the 802.11 KDF with the label "SAE KCK and PMK" ' +
        'and the context (scalar_client + scalar_AP) mod r outputs 64 bytes: the first 32 ' +
        'are the KCK, the next 32 are the PMK. The PMKID is the first 16 bytes of the ' +
        'context. Important: the PMKID depends only on the public scalars, not on the ' +
        'password, so the PMKID attack is useless against WPA3.',
      formula: 'keyseed = HMAC-SHA256(0³², k);  KCK ‖ PMK = KDF-512(keyseed, "SAE KCK and PMK", (s_client + s_AP) mod r)',
      terms: [
        { term: 'KDF', definition: 'Key Derivation Function of IEEE 802.11 (§12.7.1.6.2): HMAC-SHA256(key, i ‖ label ‖ context ‖ length), where i is the block number (1, 2, …); i and the length are 2 bytes, little-endian.' },
        { term: 'Little-endian', definition: 'byte order “least significant first”: the number 512 = 0x0200 is written as 00 02.' },
        { term: 'Forward secrecy', definition: 'the PMK depends on the single-use rand values, so even if the password leaks later, traffic recorded earlier cannot be decrypted. WPA2-PSK does not have this property.' },
      ],
      transform: 'HMAC-SHA256 + KDF-512',
      calc: [
        'keyseed = HMAC-SHA256(key = 00 × 32, k) = {keyseed}',
        'context = (scalar_client + scalar_AP) mod r = {context}',
        '',
        'KDF-512: 2 blocks of HMAC-SHA256(keyseed, i ‖ "SAE KCK and PMK" ‖ context ‖ 0002)',
        '  block 1 (i = 0100) ‖ block 2 (i = 0200) = {kdfOut}',
        '',
        'KCK   = bytes 0..31  = {saeKck}',
        'PMK   = bytes 32..63 = {pmk}',
        'PMKID = first 16 bytes of the context = {pmkid}',
        '',
        'The access point gets the same values — PMK comparison: {chkPmk}',
      ],
      byteCaption: 'KDF-512 output — 64 bytes: the green ones (0–31) are the KCK, the light blue ones (32–63) are the PMK.',
    },
    {
      title: 'Step 7 — The client’s Confirm',
      tooltip: 'The client proves that it derived the same KCK — with an HMAC over all the exchange values.',
      description:
        'Why: so far nobody has proved that the other side has the same password — whether ' +
        'k matches cannot be checked directly, since k is never transmitted. What: the ' +
        'client sends a Confirm — an HMAC under the KCK key over the send-confirm counter ' +
        'and all four public values of the exchange. How: the order is its own scalar and ' +
        'element first, then the other side’s. A Confirm cannot be forged without the KCK, ' +
        'and the KCK comes out right only with the correct password. If the password is ' +
        'wrong, the Confirm will not match — and the attacker’s attempt is used up: the next ' +
        'guess can only be checked with a new live exchange.',
      formula: 'confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer_scalar ‖ peer_element)',
      terms: [
        { term: 'Confirm', definition: 'the second SAE message (Transaction Sequence = 2): “I will prove that I have the same key”.' },
        { term: 'send-confirm', definition: 'a 2-byte counter of sent Confirm messages (little-endian); the first one has 1. It protects against replays.' },
        { term: 'Online attack', definition: 'checking a password guess “live” — against the real access point. It is slow, noticeable and can be limited; this is the only way to attack SAE.' },
      ],
      transform: 'HMAC-SHA256(KCK, …)',
      calc: [
        'send-confirm = 0100 (= 1)',
        'confirm = HMAC-SHA256(KCK, 0100 ‖ scalar_client ‖ element_client ‖ scalar_AP ‖ element_AP)',
        '        = {clConfirm}',
        '',
        'Authentication frame — Confirm ({clConfirmLen} bytes):',
        '  Algorithm\t0300\t3 = SAE',
        '  Transaction Seq\t0200\t2 = Confirm',
        '  Status\t0000\t0 = success',
        '  Send-Confirm\t0100\t1',
        '  Confirm\t{clConfirm}',
      ],
      packetLabel: 'Confirm',
    },
    {
      title: 'Step 8 — The access point’s Confirm and the mutual check',
      tooltip: 'Both sides recompute the other side’s Confirm — SAE is complete.',
      description:
        'The access point recomputes the client’s Confirm with its KCK (in the order “the ' +
        'other side’s values, then its own”) and compares. A match means the client knows ' +
        'the password. Then it sends its own Confirm, and the client checks it the same ' +
        'way. After this the sides are in the “Accepted” state: both have the same PMK, and ' +
        'it was never transmitted. Next come the usual association and the 4-Way Handshake, ' +
        'but now with a fresh PMK from SAE.',
      formula: 'verifier = HMAC-SHA256(KCK, peer_send-confirm ‖ peer_scalar ‖ peer_element ‖ scalar ‖ element)',
      terms: [
        { term: 'Verifier', definition: 'the value that the receiver computes itself and compares with the Confirm it received.' },
        { term: 'Accepted', definition: 'the final SAE state: the exchange is confirmed by both sides, and the PMK can be used.' },
      ],
      transform: 'Recomputing the other side’s Confirm',
      calc: [
        'Access point’s Confirm = {apConfirm}',
        '',
        'AP checks the client’s Confirm:   {chkApConfirm}',
        'Client checks the AP’s Confirm:   {chkClConfirm}',
        '',
        'SAE result: shared PMK = {pmk}',
      ],
      packetLabel: 'Confirm',
    },
    {
      title: 'Step 9 — Association, M1 and the PTK (KDF-SHA-256)',
      tooltip: 'For the SAE AKM the PTK is derived with a KDF on SHA-256, not with a PRF on SHA-1.',
      description:
        'Why: the PMK from SAE plays the same role as the password-based PMK in WPA2; the ' +
        'session keys are derived by the same 4-Way Handshake. What: the client associates, ' +
        'announcing in its RSNE the AKM 00-0F-AC:8 (SAE) and the MFPR and MFPC flags — PMF ' +
        'protection of management frames is mandatory. The access point sends M1 with ' +
        'ANonce and the PMKID from SAE. How: the difference from WPA2 is that for AKM 8 the ' +
        'PTK is derived by a KDF on HMAC-SHA256 (two 32-byte blocks, with the length of 384 ' +
        'bits included in each block), not by a PRF on SHA-1. Block B is built the same way.',
      formula: 'PTK = KDF-SHA-256-384(PMK, "Pairwise key expansion", min/max(AA,SPA) ‖ min/max(ANonce,SNonce))',
      terms: [
        { term: 'AKM 8', definition: 'the suite 00-0F-AC:8 — “SAE with SHA-256”. It defines how the PTK is derived (KDF-SHA-256) and how the MIC is computed (AES-128-CMAC).' },
        { term: 'PMF', definition: 'Protected Management Frames (802.11w): the management frames for disconnecting (deauth/disassoc) are signed too. Mandatory in WPA3 — hence MFPR = MFPC = 1.' },
        { term: 'RSNXE', definition: 'RSN Extension Element: here it carries the “SAE H2E” flag. It is repeated in M2 and M3 inside signed frames, so that a man in the middle cannot silently force the old H&P.' },
      ],
      transform: 'KDF-SHA-256-384',
      calc: [
        'Client/AP RSNE: {rsne}',
        '  … 00-0f-ac 08 = AKM SAE, RSN Capabilities = c000 (MFPR | MFPC)',
        'RSNXE: {rsnxe}',
        '',
        'M1: ANonce = {aNonce}, Key Information = {m1Info} (descriptor version 0 — “defined by the AKM”)',
        '    Key Data = PMKID KDE with the PMKID from SAE: {m1Kd}',
        '',
        'B = {b}',
        'KDF: block i = HMAC-SHA256(PMK, i ‖ "Pairwise key expansion" ‖ B ‖ 8001)',
        '  (8001 = 384 in little-endian)',
        '  blocks 1 and 2 = {ptkRaw}',
        'PTK = first 48 bytes = {ptk}',
        '  KCK = {kck}   KEK = {kek}   TK = {tk}',
      ],
      byteCaption: 'Two HMAC-SHA256 blocks — 64 bytes: the green ones (0–47) are the PTK, the grey ones (48–63) are discarded.',
      packetLabel: 'M1 — ANonce + PMKID',
    },
    {
      title: 'Step 10 — M2 with an AES-128-CMAC MIC',
      tooltip: 'For the SAE AKM the MIC is computed not with HMAC-SHA1 but with AES-128-CMAC.',
      description:
        'The client replies with M2: SNonce, RSNE and RSNXE (if H2E is used) and a MIC. The ' +
        'difference from WPA2 is the MIC function: for AKM 8 it is AES-128-CMAC under the ' +
        'KCK key over the frame with the MIC zeroed. Its output is exactly 16 bytes, so ' +
        'nothing needs to be truncated. The access point derives the same PTK and ' +
        'recomputes the MIC: a match confirms that the session keys are the same.',
      formula: 'MIC = AES-128-CMAC(KCK, M2 frame with the MIC zeroed)',
      terms: [
        { term: 'AES-128-CMAC', definition: 'a message authentication code built on the AES block cipher (RFC 4493): AES-CBC over all blocks of the frame, with a special correction subkey for the last block. It gives 16 bytes.' },
        { term: 'Key Descriptor Version 0', definition: 'the value “version is defined by the AKM”: the algorithms for the MIC and for Key Data encryption are set by the AKM itself (for SAE — AES-128-CMAC and AES Key Wrap).' },
      ],
      transform: 'AES-128-CMAC(KCK, frame)',
      calc: [
        'M2 frame ({m2Size} bytes): Key Information = {m2Info} (MIC | Pairwise | version 0)',
        '  Key Nonce = SNonce = {sNonce}',
        '  Key Data ({m2KdLenDec} bytes) = {m2Kd}',
        '',
        'MIC = AES-128-CMAC(KCK = {kck}, M2 with zeros) = {m2Mic}',
        'The access point recomputed the MIC: {chkM2}',
      ],
      byteCaption: 'The M2 frame byte by byte: green is SNonce, light blue is the MIC, yellow is Key Data with the RSNE.',
      packetLabel: 'M2 — SNonce + MIC (CMAC)',
    },
    {
      title: 'Step 11 — M3 with GTK and IGTK, M4 and installing the keys',
      tooltip: 'In M3 the access point sends the GTK and the IGTK (the PMF key), encrypted with the KEK.',
      description:
        'M3 is built as in WPA2, but Key Data also holds an IGTK KDE — the key used to sign ' +
        'broadcast management frames (PMF). Key Data is padded to a multiple of 8 and ' +
        'encrypted with AES Key Wrap under the KEK, and the frame is signed with ' +
        'AES-128-CMAC. The client checks the MIC, decrypts the GTK and the IGTK, replies ' +
        'with M4, and both sides install the keys. From this moment both the traffic and the ' +
        'management frames are protected: a fake “deauth” can no longer disconnect the ' +
        'client.',
      formula: 'Key Data = AES-KeyWrap(KEK, RSNE ‖ RSNXE ‖ GTK KDE ‖ IGTK KDE ‖ padding)',
      terms: [
        { term: 'IGTK', definition: 'Integrity Group Temporal Key — the group integrity key for PMF. Broadcast management frames are signed with the BIP-CMAC-128 algorithm.' },
        { term: 'IGTK KDE', definition: 'dd 1c 00-0F-AC 09 ‖ KeyID (2 bytes) ‖ IPN (6 bytes, packet counter) ‖ IGTK (16 bytes) — 30 bytes.' },
        { term: 'Deauth attack', definition: 'sending fake “disconnect” frames. Without PMF they are not signed and they work; with PMF the client rejects them.' },
      ],
      transform: 'AES Key Wrap + AES-128-CMAC',
      calc: [
        'Plaintext Key Data ({m3PlainLen} bytes) → padding to {m3PaddedLen}:',
        '  RSNE [‖ RSNXE]    = {rsneRsnxe}',
        '  GTK KDE           = {gtkKde}',
        '  IGTK KDE          = {igtkKde}',
        '  padding           = {padding}',
        'AES-KeyWrap(KEK) → {m3KdLenDec} bytes: {m3Kd}',
        '',
        'M3: Key Information = {m3Info}, MIC (CMAC) = {m3Mic}',
        '    client checked the MIC: {chkM3}; extracted the GTK: {chkUnwrap}; compared the RSNE: {chkRsneClient}',
        'M4: Key Information = {m4Info}, MIC (CMAC) = {m4Mic}',
        '    the access point checked the MIC: {chkM4}',
        '',
        'Installed: TK = {tk}, GTK = {gtk}, IGTK = {igtk}',
      ],
      byteCaption:
        'Plaintext M3 Key Data before encryption: RSNE, RSNXE, GTK KDE, IGTK KDE and padding.',
      packetLabel: 'M3 — GTK + IGTK (encrypted)',
    },
    {
      title: 'Step 12 — What an eavesdropper sees and why offline cracking does not work',
      tooltip: 'Only scalar, element, Confirm and EAPOL frames are on the air — a password cannot be checked against them.',
      description:
        'Let us sum up through the eyes of an attacker who recorded the whole exchange. ' +
        'They see the scalar and element of both sides, both Confirm messages and frames ' +
        'M1–M4. To check a password guess offline, they need to compute k — and for that ' +
        'they need the secret rand of at least one side; it cannot be computed from the ' +
        'scalar and element (this is the discrete logarithm problem). Without k there is no ' +
        'KCK and no PMK — nothing to compare with the Confirm and the MIC. The PMKID does not ' +
        'depend on the password. All that is left is online guessing: every guess is a new ' +
        'live exchange with the access point, which can be limited and noticed.',
      terms: [
        { term: 'Discrete logarithm problem', definition: 'given the points G and n·G, find the number n. On the P-256 curve the best known algorithms need on the order of 2¹²⁸ operations — out of reach.' },
        { term: 'Offline cracking', definition: 'checking billions of passwords “at home” against recorded data, with no connection to the network. It works against WPA2 (Module 3), but not against SAE.' },
        { term: 'Dragonblood', definition: '2019 attacks on early SAE implementations: timing and cache leaks in the H&P loop, a downgrade in mixed mode. The standard’s answer: H2E, constant time, Transition Disable.' },
      ],
      transform: 'Analysing the captured data',
      calc: [
        'Visible on the air:',
        '  client scalar   {clScalar}',
        '  AP scalar       {apScalar}',
        '  the elements, both Confirms, ANonce, SNonce, MIC in M2–M4, PMKID {pmkid}',
        '',
        'Never visible: password, PWE, rand, mask, k, KCK, PMK, PTK.',
        '',
        'Checking the guess “password = X” offline:',
        '  PWE(X) can be computed → but k = rand · (…) — rand is unknown',
        '  → KCK(X) cannot be obtained → nothing to compare the Confirm with.',
        'PMKID = (scalar_client + scalar_AP) mod r → does not depend on the password.',
      ],
    },
  ],
  hnpSteps: [
    {
      title: 'Step 1 — Searching for x by trial (H&P)',
      tooltip: 'The “hunting and pecking” loop: hash the password with a counter until x lands on the curve.',
      description:
        'Why: the password has to be turned into a curve point. What: the original SAE ' +
        'method is Hunting and Pecking. How: for counter = 1, 2, … compute pwd-seed = ' +
        'HMAC-SHA256(larger MAC ‖ smaller MAC, password ‖ counter), and from it the KDF ' +
        'gives a candidate pwd-value. It is good as x if it is less than p and x³ + a·x + b ' +
        'is a quadratic residue. Important: the loop does not stop when it finds one — it ' +
        'continues for at least k iterations (the standard sets k to at least 40, hostapd ' +
        'uses 40), and after the find the password is replaced by a random string. ' +
        'Otherwise the running time would reveal the number of the successful iteration — ' +
        'and that is already a leak about the password (the Dragonblood attacks).',
      formula: 'pwd-seed = HMAC-SHA256(max(MAC) ‖ min(MAC), password ‖ counter);  pwd-value = KDF-256(pwd-seed, "SAE Hunting and Pecking", p)',
      terms: [
        { term: 'Hunting and Pecking', definition: 'trying candidates one after another until one fits. About half of all numbers give a curve point, so 1–2 attempts are usually enough.' },
        { term: 'k', definition: 'the minimum number of loop iterations (40 here). With a success probability of about ½ per iteration, the chance of not finding a point in 40 attempts is roughly 2⁻⁴⁰.' },
        { term: 'Timing attack', definition: 'extracting secrets from the running time. If the loop stops right after the find, the time gives away the iteration number, and that number depends on the password.' },
        { term: 'counter', definition: 'a 1-byte counter appended to the password; each iteration gives a new candidate.' },
      ],
      transform: 'HMAC-SHA256 + KDF-256, ≥ 40 iterations',
      calc: [
        'HMAC key = max(MAC) ‖ min(MAC) = {macMaxMin}',
        '',
        '{hnpTable}',
        '',
        'Iterations run: {hnpTotal} (minimum 40), x found at counter = {hnpFound}',
        'pwd-seed of the successful iteration (save) = {hnpSave}',
        'x = {hnpX}',
      ],
    },
    {
      title: 'Step 2 — Choosing y and the PWE point (H&P)',
      tooltip: 'y is computed from x; which of the two roots to take is decided by the least significant bit of pwd-seed.',
      description:
        'For the x that was found there are two points on the curve — (x, y) and (x, p − y), ' +
        'the “upper” and the “lower” one. What: both sides need to pick the same one. How: ' +
        'y = √(x³ + a·x + b) mod p; if the least significant bit of y equals the least ' +
        'significant bit of the saved pwd-seed, (x, y) is taken, otherwise (x, p − y). The ' +
        'resulting point is the PWE. Both sides get it independently — the input is the ' +
        'same: the password and the pair of MAC addresses.',
      formula: 'y = √(x³ + ax + b);  PWE = (x, y) if LSB(y) = LSB(save), otherwise (x, p − y)',
      terms: [
        { term: 'Square root mod p', definition: 'for P-256 p ≡ 3 (mod 4), so √v = v^((p+1)/4) mod p — a single exponentiation.' },
        { term: 'LSB', definition: 'Least Significant Bit — the lowest bit of a number: 0 for even numbers, 1 for odd ones.' },
        { term: 'PWE', definition: 'Password Element — the curve point on which the whole SAE exchange is built.' },
      ],
      transform: 'y = √(x³+ax+b), parity choice',
      calc: [
        'x = {hnpX}',
        'y = √(x³ + a·x + b) = {hnpYRoot}',
        'LSB(save) = {hnpSaveLsb}, LSB(y) = {hnpYLsb} → taken {hnpYChoice}',
        '',
        'PWE.x = {pwex}',
        'PWE.y = {pwey}',
        '',
        'The access point derived PWE on its own — comparison: {chkPwe}',
      ],
    },
  ],
};
