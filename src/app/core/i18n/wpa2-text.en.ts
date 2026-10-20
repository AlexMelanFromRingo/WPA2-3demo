/** Step text for the WPA2 module — English version. */
import type { Wpa2Text } from './wpa2-text';

export const WPA2_TEXT_EN: Wpa2Text = {
  labels: {
    ssid: 'SSID (network name)',
    passphrase: 'Network password',
    apMac: 'Access point MAC',
    clientMac: 'Client MAC',
    gtk: 'GTK (group key)',
    blockB: 'Block B',
    pmkid: 'PMKID',
    ptkRaw: 'PRF-384 output (3 blocks)',
    m1: 'M1 frame',
    m2: 'M2 frame',
    m2Zero: 'M2 with the MIC zeroed',
    m3: 'M3 frame',
    m4: 'M4 frame',
    keyDataPlain: 'M3 Key Data (plaintext)',
    keyDataWrapped: 'M3 Key Data (encrypted)',
    gtkUnwrapped: 'GTK decrypted by the client',
  },
  droppedLabel: 'discarded',
  ok: '✓ match',
  fail: '✗ no match',
  steps: [
    {
      title: 'Input data',
      tooltip: 'Demo network parameters — you can change them in the panel above.',
      description:
        'These are all the inputs of the WPA2 handshake: the network name (SSID), the ' +
        'password, the MAC addresses of the access point and the client, two random numbers ' +
        'ANonce and SNonce, and the group key GTK that the access point gives the client at ' +
        'the end. You can change any parameter in the “Network parameters” panel — ' +
        'everything will be recomputed.',
      terms: [
        { term: 'SSID', definition: 'the Wi-Fi network name — what you see in the network list on your phone.' },
        { term: 'MAC address', definition: 'a unique hardware number of a network device, 6 bytes (for example 02:00:00:00:00:01).' },
        { term: 'Password (PSK)', definition: 'the shared network password. PSK stands for Pre-Shared Key — a key handed out in advance: it is the same on the router and on every device. In WPA2 it is 8–63 printable characters.' },
        { term: 'ANonce / SNonce', definition: 'random numbers of the access point (A — Authenticator) and the client (S — Supplicant). Nonce = “number used once”, a number meant to be used only once.' },
        { term: 'GTK', definition: 'Group Temporal Key — the group key. It encrypts traffic sent “to everyone at once” (broadcast). It is shared by all clients of the network, so the access point gives it to every new client.' },
        { term: 'Byte', definition: 'a unit of data of 8 bits; one two-digit hex number (for example 3f) is one byte.' },
      ],
      transform: 'Demo network parameters',
      calc: [
        'SSID        "{ssidText}"  →  hex {ssidHex}',
        'Password    "{passText}"  →  hex {passHex}',
        'AP MAC      {apMacColon}   (in the standard — AA, Authenticator Address)',
        'Client MAC  {clientMacColon}   (in the standard — SPA, Supplicant Address)',
        'ANonce      {aNonce}',
        'SNonce      {sNonce}',
        'GTK         {gtk}',
        '',
        'In a real network ANonce and SNonce are random and new on every',
        'connection, and the access point generates the GTK itself.',
      ],
    },
    {
      title: 'Step 1 — Deriving the PMK from the password',
      tooltip: 'The PMK is the “master key”: the password and SSID are mixed 4096 times.',
      description:
        'Why: the password must not be sent over the air, and encrypting directly with the ' +
        'password is dangerous. So first a long 256-bit master key, the PMK, is made from ' +
        'the password. What: the PBKDF2 function runs the password and the SSID through ' +
        'HMAC-SHA1 4096 times. How this protects: the SSID serves as the “salt” (the same ' +
        'password in different networks gives different PMKs), and the 4096 repetitions ' +
        'make every password guess expensive for anyone brute-forcing passwords. Both sides ' +
        'compute the PMK in advance, each on its own; it is never sent over the air.',
      formula: 'PMK = PBKDF2(HMAC-SHA1, password, SSID, 4096 iterations, 256 bits)',
      terms: [
        { term: 'PMK', definition: 'Pairwise Master Key. 32 bytes from which the working keys are later derived. In WPA2-Personal it is the same for all connections to the network until the password is changed.' },
        { term: 'PBKDF2', definition: 'Password-Based Key Derivation Function 2 (RFC 8018) — a function that “stretches” a short password into a full key by mixing it many times.' },
        { term: 'HMAC', definition: 'Hash-based Message Authentication Code (RFC 2104) — it takes a key and data and produces a fixed “fingerprint”. Without the key it cannot be forged.' },
        { term: 'SHA-1', definition: 'a hash function: from data of any length it makes exactly 20 bytes of “fingerprint”. A hash is a one-way “meat grinder” for data.' },
        { term: 'Salt', definition: 'an addition to the password before hashing. Here the SSID is the salt.' },
        { term: 'Iteration', definition: 'one repetition of the computation. 4096 iterations means 4096 repetitions in a row.' },
        { term: 'XOR (⊕)', definition: 'a bitwise “exclusive OR”: a result bit is 1 if the bits differ. XOR of all the U values combines them into one block.' },
      ],
      transform: 'PBKDF2-HMAC-SHA1, 4096 iterations',
      calc: [
        'PBKDF2 is not a single operation but a long LOOP. Step by step.',
        '',
        'Goal: a 256-bit key = 32 bytes. SHA-1 gives 20 bytes at a time,',
        'so the key is assembled from TWO blocks — T1 and T2.',
        '',
        '━━ BLOCK 1 (gives bytes 0–19 of the key) ━━',
        '1) Input of the first HMAC: salt ‖ block number (4 bytes, big-endian).',
        '   input = {ssidHex} ‖ 00000001',
        '',
        '2) A chain of 4096 HMAC-SHA1 steps (HMAC key = password = {passHex}):',
        '   U1 = HMAC-SHA1(password, input) = {u1}',
        '   U2 = HMAC-SHA1(password, U1)    = {u2}',
        '   U3 = HMAC-SHA1(password, U2)    = {u3}',
        '   … each next U is the HMAC of the previous one, up to U4096 …',
        '',
        '3) T1 = U1 ⊕ U2 ⊕ U3 ⊕ … ⊕ U4096 = {t1}',
        '',
        '━━ BLOCK 2 (gives bytes 20–31 of the key) ━━',
        '   The same with block number 00000002 → its own chain → T2',
        '   first 12 bytes of T2 = {t2}',
        '',
        '━━ ASSEMBLY ━━',
        '   PMK = (T1 ‖ T2), truncated to 32 bytes',
        '   PMK = {pmk}',
      ],
    },
    {
      title: 'Step 2 — Message M1: the access point sends ANonce',
      tooltip: 'M1 carries ANonce and PMKID; it has no integrity code (MIC) yet.',
      description:
        'Why: to make the keys of each connection new, the access point and the client need ' +
        'fresh random numbers. What: after association the access point sends the first ' +
        'handshake message — an EAPOL-Key frame M1 with the number ANonce. How: M1 has the ' +
        'Pairwise flag (this is about the pairwise key) and the Key Ack flag (a reply is ' +
        'expected), but no MIC — there is no shared key yet. Replay Counter = 1: the client ' +
        'repeats this number in its reply, and a repeated old number would reveal an attempt ' +
        'to replay a frame. Many access points put the PMKID into Key Data (the standard ' +
        'allows this) — it tells the client which PMK to use. This is exactly what the PMKID ' +
        'attack captures (Module 3).',
      formula: 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ AA ‖ SPA)[0:16]',
      terms: [
        { term: 'EAPOL-Key', definition: 'a frame of the EAPOL protocol (EAP over LAN, IEEE 802.1X) that carries all four handshake messages. Until the handshake is over, the access point lets through only such frames from the client.' },
        { term: 'Key Information', definition: '16 bits of flags: bits 0–2 — descriptor version (2 = HMAC-SHA1 + AES Key Wrap), bit 3 — Pairwise, bit 6 — Install, bit 7 — Key Ack, bit 8 — Key MIC, bit 9 — Secure, bit 12 — Encrypted Key Data.' },
        { term: 'Replay Counter', definition: 'an 8-byte “letter number” counter. The access point increases it in every new request, and the client replies with the same number — this is how replayed old frames are filtered out.' },
        { term: 'Key Length', definition: 'the length of the pairwise encryption key: 16 bytes for CCMP. It is given in M1 and M3.' },
        { term: 'PMKID', definition: 'PMK Identifier — a 16-byte “name” of the PMK. It lets the PMK be reused (PMKSA caching) without a full new login.' },
        { term: 'KDE', definition: 'Key Data Encapsulation — “packaging” of data in the Key Data field: dd ‖ length ‖ OUI 00-0F-AC ‖ type ‖ content. Type 4 = PMKID, type 1 = GTK.' },
      ],
      transform: 'EAPOL-Key frame M1',
      calc: [
        'M1 frame ({m1Size} bytes), field by field:',
        '  Protocol Version\t{m1Ver}\t802.1X version (access points usually send 2)',
        '  Packet Type\t03\t3 = EAPOL-Key',
        '  Body Length\t{m1BodyLen}\tbody length = {m1BodyLenDec} bytes',
        '  Descriptor Type\t02\t2 = RSN',
        '  Key Information\t{m1Info}\tAck | Pairwise | descriptor version 2',
        '  Key Length\t{m1KeyLen}\t16 bytes — the TK length for CCMP',
        '  Replay Counter\t{m1Replay}\t= 1',
        '  Key Nonce\t{m1Nonce}',
        '  \t↑ ANonce',
        '  IV ‖ RSC ‖ reserved\t00 × 48\tzeros',
        '  Key MIC\t00 × 16\tzeros: M1 has no MIC',
        '  Key Data Length\t{m1KdLen}\t{m1KdLenDec} bytes',
        '  Key Data\t{m1Kd}',
        '  \t↑ PMKID KDE: dd 14 00-0f-ac 04 ‖ PMKID',
        '',
        'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ {apMac} ‖ {clientMac})[0:16]',
        '      = {pmkid}',
        '',
        'All of this goes over the air IN THE CLEAR: ANonce and PMKID are not secret.',
      ],
      byteCaption:
        'The M1 frame byte by byte; the colour shows the field group (see the legend). Green ' +
        'is ANonce, grey is the zero IV, RSC and reserved fields; the MIC field is filled ' +
        'with zeros too — M1 has no MIC.',
      packetLabel: 'M1 — ANonce',
    },
    {
      title: 'Step 3 — The client builds block B',
      tooltip: 'The MAC addresses and nonces are joined in a strictly fixed order.',
      description:
        'Why: the access point and the client must independently get THE SAME key. What: ' +
        'the client has received ANonce and picked its own SNonce — now it has everything ' +
        'it needs to derive the session keys. How: the MAC addresses and the numbers are ' +
        'glued together (concatenation ‖) in a strict order — from each pair the smaller ' +
        'value first, then the larger. This way block B comes out the same on both sides, ' +
        'no matter who computes it.',
      formula: 'B = min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce)',
      terms: [
        { term: 'Block B', definition: 'the inputs glued into one string of bytes (6 + 6 + 32 + 32 = 76 bytes) — the input for deriving the PTK.' },
        { term: 'Concatenation (‖)', definition: 'joining chunks of bytes back to back, with no separators. The order of the chunks is fixed.' },
        { term: 'min / max', definition: 'the smaller and the larger of two values (bytes are compared as numbers, from left to right).' },
        { term: 'AA / SPA', definition: 'AA is the access point MAC (Authenticator Address), SPA is the client MAC (Supplicant Address).' },
      ],
      transform: 'min/max of MAC and nonce',
      calc: [
        'Pairs and their order:',
        '  MAC:   {apMac} and {clientMac}',
        '  nonce: {aNonce}',
        '         {sNonce}',
        '',
        'B = smaller MAC ‖ larger MAC ‖ smaller nonce ‖ larger nonce',
        '  = {b}',
        '  (76 bytes)',
      ],
    },
    {
      title: 'Step 4 — Deriving the PTK (PRF-384)',
      tooltip: 'The PTK is the working session key, made from the PMK and block B.',
      description:
        'Why: the PMK lives a long time and is the same for all connections, but encryption ' +
        'needs a key unique to this session. What: the PTK is the “pairwise transient key” ' +
        'of this connection. How: the pseudo-random function PRF, built on HMAC-SHA1, hashes ' +
        'the PMK, a label and block B with a counter 0, 1, 2… until it has the 384 bits ' +
        '(48 bytes) needed for CCMP. Three HMAC blocks give 60 bytes; the first 48 are the ' +
        'PTK, the rest is discarded.',
      formula: 'PTK = PRF-384(PMK, "Pairwise key expansion", B)',
      terms: [
        { term: 'PTK', definition: 'Pairwise Transient Key — the temporary pairwise key of a specific connection; it disappears on disconnect.' },
        { term: 'PRF', definition: 'Pseudo-Random Function of IEEE 802.11. It “stretches” the input to the required number of bytes by applying HMAC-SHA1 with a counter.' },
        { term: 'PRF-384', definition: 'the 384-bit variant of PRF: that is how much CCMP-128 needs (KCK 128 + KEK 128 + TK 128 bits). For TKIP, PRF-512 was once used.' },
        { term: 'Label', definition: 'the fixed string "Pairwise key expansion" — it separates this key derivation from all others.' },
      ],
      transform: 'PRF-384 (HMAC-SHA1)',
      calc: [
        'INPUT:',
        '  HMAC key = PMK = {pmk}',
        '  data     = "Pairwise key expansion" ‖ 00 ‖ B ‖ counter',
        '',
        'Each block is HMAC-SHA1 (20 bytes), the counter is in the last byte:',
        '  block 0 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 00) = {prf0}',
        '  block 1 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 01) = {prf1}',
        '  block 2 = HMAC-SHA1(PMK, label ‖ 00 ‖ B ‖ 02) = {prf2}',
        '',
        '384 bits = 48 bytes; three blocks give 60 → take the first 48:',
        '  PTK = {ptk}',
      ],
      byteCaption:
        'Three HMAC-SHA1 blocks — 60 bytes. The green cells (indices 0–47) are the PTK, the ' +
        'grey ones (48–59) are discarded.',
    },
    {
      title: 'Step 5 — The PTK is split into KCK, KEK and TK',
      tooltip: 'The PTK is a bundle of three keys with different roles.',
      description:
        'The PTK is not one key but three. It is cut into equal 16-byte parts, and each has ' +
        'its own job: the KCK signs the handshake messages (MIC), the KEK encrypts the group ' +
        'key in M3, and the TK encrypts the traffic itself after the handshake. Separating ' +
        'the roles is good practice: the key used to compute signatures is never used to ' +
        'encrypt data.',
      formula: 'PTK = KCK (16 bytes) ‖ KEK (16 bytes) ‖ TK (16 bytes)',
      terms: [
        { term: 'KCK', definition: 'Key Confirmation Key. It is used to compute the MIC of messages M2, M3 and M4.' },
        { term: 'KEK', definition: 'Key Encryption Key — a key for encrypting keys. The access point uses it to encrypt the Key Data in M3 (that is where the GTK is).' },
        { term: 'TK', definition: 'Temporal Key. CCMP uses it to encrypt your traffic: websites, video, messages.' },
        { term: 'Byte index', definition: 'the ordinal number of a byte, counting from zero: the first byte is index 0, the sixteenth is index 15.' },
      ],
      transform: 'Splitting 48 bytes: 16 + 16 + 16',
      calc: [
        'PTK = {ptk}',
        '',
        '  KCK = bytes 0..15  = {kck}   → MIC',
        '  KEK = bytes 16..31 = {kek}   → encrypts the GTK in M3',
        '  TK  = bytes 32..47 = {tk}   → encrypts traffic (CCMP)',
      ],
      byteCaption:
        'PTK (48 bytes): KCK (indices 0–15), KEK (16–31), TK (32–47).',
    },
    {
      title: 'Step 6 — Message M2: SNonce, RSNE and MIC',
      tooltip: 'M2 carries SNonce and is the first message of the handshake signed with a MIC.',
      description:
        'Why: the access point needs SNonce to derive the same PTK, and proof that the ' +
        'client knows the password. What: the client sends M2 — SNonce, its RSNE (which ' +
        'ciphers and AKM it chose during association) and a MIC. How the MIC is computed: ' +
        'the client builds the frame, writes sixteen zeros into the MIC field, computes ' +
        'HMAC-SHA1 with the KCK key over the whole frame and writes in the first 16 bytes of ' +
        'the result. The password itself is not sent — only a signature that cannot be ' +
        'forged without the password.',
      formula: 'MIC = HMAC-SHA1(KCK, M2 frame with the MIC field zeroed)[0:16]',
      terms: [
        { term: 'MIC', definition: 'Message Integrity Code. If it matches, the frame is genuine and unchanged; if not, the frame is rejected.' },
        { term: 'RSNE', definition: 'RSN Element (element 48) — a “security questionnaire”: version, group and pairwise ciphers (CCMP = 00-0F-AC:4), the AKM login method (PSK = 00-0F-AC:2) and capability flags.' },
        { term: 'AKM', definition: 'Authentication and Key Management — the method of authentication and key generation: PSK (WPA2-Personal), SAE (WPA3-Personal), 802.1X (Enterprise).' },
        { term: 'Truncation', definition: 'HMAC-SHA1 yields 20 bytes, but the MIC field is 16 bytes; the extra 4 bytes are discarded.' },
      ],
      transform: 'HMAC-SHA1(KCK, frame), truncated to 16 bytes',
      calc: [
        'M2 frame ({m2Size} bytes):',
        '  Protocol Version\t{m2Ver}\tversion 1 — this is how wpa_supplicant replies',
        '  Packet Type\t03\t3 = EAPOL-Key',
        '  Body Length\t{m2BodyLen}\t{m2BodyLenDec} bytes',
        '  Descriptor Type\t02\t2 = RSN',
        '  Key Information\t{m2Info}\tMIC | Pairwise | descriptor version 2',
        '  Key Length\t{m2KeyLen}\tnot given in M2',
        '  Replay Counter\t{m2Replay}\tthe same as in M1',
        '  Key Nonce\t{m2Nonce}',
        '  \t↑ SNonce',
        '  IV ‖ RSC ‖ reserved\t00 × 48\tzeros',
        '  Key MIC\t00 × 16\tZEROS for now — the MIC is computed over the frame with zeros',
        '  Key Data Length\t{m2KdLen}\t{m2KdLenDec} bytes',
        '  Key Data\t{m2Kd}',
        '  \t↑ the client’s RSNE: CCMP, AKM PSK',
        '',
        'HMAC-SHA1(KCK = {kck}, frame with zeros) =',
        '  {m2MicRaw}',
        'MIC = first 16 bytes = {m2Mic}',
        'The client writes the MIC in place of the zeros and sends the frame.',
      ],
      byteCaption:
        'HMAC-SHA1 output — 20 bytes. The green ones (indices 0–15) are the MIC, the grey ' +
        'ones (16–19) are discarded: the MIC field in an EAPOL-Key frame is exactly 16 bytes.',
      packetLabel: 'M2 — SNonce + RSNE + MIC',
    },
    {
      title: 'Step 7 — The access point checks M2',
      tooltip: 'The AP derives the PTK itself and recomputes the MIC — this is how it learns that the client knows the password.',
      description:
        'Why: the access point must make sure the client knows the password without asking ' +
        'for the password itself. What: once it has SNonce, the access point builds the same ' +
        'block B ON ITS OWN and derives the PTK from its own copy of the PMK. How: it zeroes ' +
        'the MIC field in the received frame, computes HMAC-SHA1 with its KCK and compares ' +
        'the result with the MIC from the frame. A match means the client has the same PMK, ' +
        'that is, the same password. No match — the frame is silently discarded. The access ' +
        'point also compares the RSNE from M2 with the one the client sent during ' +
        'association: if a man in the middle had swapped the “questionnaire”, it would show ' +
        'up here.',
      terms: [
        { term: 'Independent derivation', definition: 'both sides compute the same keys, each on its own, without sending anything secret. The matching results are the proof.' },
        { term: 'Downgrade attack', definition: 'an attempt by a man in the middle to make the sides choose weaker protection by swapping their “questionnaires”. Comparing the RSNE inside signed frames exposes it.' },
      ],
      transform: 'Recomputing the MIC with its own KCK',
      calc: [
        'The access point received SNonce = {sNonce}',
        'Its own derivation: B → PTK → KCK = {kck}',
        '',
        'MIC from the M2 frame:       {m2Mic}',
        'MIC recomputed by the AP:    {m2Mic}',
        'MIC check result:            {chkM2}',
        'RSNE from M2 = RSNE from Association Request: {chkRsneAp}',
        '',
        'Conclusion: the client knows the password. It can be given the group key.',
      ],
    },
    {
      title: 'Step 8 — Message M3: the encrypted GTK',
      tooltip: 'M3: “install the keys”, plus the GTK encrypted with the KEK (AES Key Wrap).',
      description:
        'Why: the client needs the group key GTK, and the access point must prove that it ' +
        'knows the password too (otherwise it could be an impostor). What: M3 has the ' +
        'Install, Ack, MIC, Secure and Encrypted Key Data flags, and the Replay Counter is ' +
        'increased by 1. How: Key Data holds the access point’s RSNE (the same as in the ' +
        'Beacon) and the GTK KDE; it is padded to a multiple of 8 bytes (dd 00…) and ' +
        'encrypted with the AES Key Wrap algorithm under the KEK. Then the whole frame is ' +
        'signed with a MIC — the same way as M2.',
      formula: 'Key Data = AES-KeyWrap(KEK, RSNE ‖ GTK KDE ‖ padding);  MIC = HMAC-SHA1(KCK, M3)[0:16]',
      terms: [
        { term: 'AES Key Wrap', definition: 'the RFC 3394 algorithm for encrypting keys with a key. It adds 8 bytes for checking: if the KEK is wrong, the decryption will not check out.' },
        { term: 'GTK KDE', definition: 'the GTK packaging: dd 16 00-0F-AC 01 ‖ KeyID ‖ reserved ‖ GTK (16 bytes) — 24 bytes in total.' },
        { term: 'Padding', definition: 'filling up to the required length. For AES Key Wrap the length must be a multiple of 8 and at least 16 — so a dd byte and zeros are appended.' },
        { term: 'Install / Secure', definition: 'Install — “install the pairwise key after this handshake”; Secure — “the keys are ready, the channel is protected”.' },
      ],
      transform: 'AES Key Wrap (KEK) + MIC (KCK)',
      calc: [
        'Plaintext Key Data ({m3PlainLen} bytes):',
        '  AP RSNE  = {rsneAp}',
        '  GTK KDE  = {gtkKde}',
        'Padding to {m3PaddedLen} bytes: {padding}',
        '',
        'AES-KeyWrap(KEK = {kek}) → {m3KdLenDec} bytes:',
        '  {m3Kd}',
        '',
        'M3 frame ({m3Size} bytes):',
        '  Key Information\t{m3Info}\tEncrypted Key Data | Secure | MIC | Ack | Install | Pairwise | v2',
        '  Replay Counter\t{m3Replay}\t= 2, one higher than in M1',
        '  Key Nonce\tANonce\tANonce again',
        '  Key MIC\t{m3Mic}\tHMAC-SHA1(KCK, M3 with zeros)[0:16]',
      ],
      byteCaption:
        'Plaintext Key Data before encryption: green is the access point’s RSNE, light blue ' +
        'is the GTK KDE, grey is the dd 00 padding up to a multiple of 8.',
      packetLabel: 'M3 — GTK (encrypted) + MIC',
    },
    {
      title: 'Step 9 — The client checks M3 and extracts the GTK',
      tooltip: 'The client checks the access point’s MIC and decrypts the GTK with its KEK.',
      description:
        'Why: the client needs to make sure that the other side is the real network just as ' +
        'much as the access point does. What: the client recomputes the MIC of frame M3 with ' +
        'its KCK — a match proves that the access point knows the same PMK. How: then it ' +
        'decrypts the Key Data with its KEK (the AES Key Wrap check also confirms that the ' +
        'KEK is correct), compares the RSNE with the one it saw in the Beacon, and extracts ' +
        'the GTK. Mutual authentication is complete: each side has proved that it knows the ' +
        'password.',
      terms: [
        { term: 'Mutual authentication', definition: 'both sides check each other, not just the network checking the client. It protects against a fake access point that does not know the password.' },
        { term: 'Beacon', definition: 'a “lighthouse” frame that the access point broadcasts about 10 times a second: the network name, the RSNE and other parameters.' },
      ],
      transform: 'MIC check + AES Key Unwrap',
      calc: [
        'MIC from M3 = {m3Mic}',
        'MIC check with its own KCK:        {chkM3}',
        'AES-KeyUnwrap(KEK, Key Data) → integrity check: {chkUnwrap}',
        'RSNE from M3 = RSNE from Beacon:   {chkRsneClient}',
        '',
        'Extracted GTK = {gtkUnwrapped}',
        'Original GTK  = {gtk}',
      ],
    },
    {
      title: 'Step 10 — Message M4 and installing the keys',
      tooltip: 'M4 means “keys installed”; after it, traffic is encrypted with the TK key.',
      description:
        'Why: the access point needs to know that the client has received everything and ' +
        'is ready. What: the client replies with M4 — a short frame with the MIC and Secure ' +
        'flags, without Key Data, and with the same Replay Counter as in M3. How: the access ' +
        'point checks its MIC, and both sides install the keys: the TK for traffic within ' +
        'this pair, the GTK for broadcast traffic. The 802.1X port opens, and from then on ' +
        'every data frame is encrypted with CCMP (AES-128 in CCM mode) with its own growing ' +
        'packet number — this protects against replays.',
      formula: 'MIC = HMAC-SHA1(KCK, M4 with the MIC zeroed)[0:16]',
      terms: [
        { term: '802.1X port', definition: 'the logical “door” of the access point: until the handshake is over, it lets through only EAPOL frames from the client; after M4 — all traffic.' },
        { term: 'CCMP', definition: 'the WPA2 data encryption protocol: AES-128 in CCM mode (encryption + integrity code); the key is the TK.' },
        { term: 'Packet Number (PN)', definition: 'a 48-bit packet number in the CCMP header. It strictly grows, and the receiving side rejects frames with an old number.' },
        { term: 'KRACK', definition: 'a 2017 attack: a resent M3 made old clients reinstall the same key with the PN reset, so the encryption repeated itself. Fixed by updates.' },
      ],
      transform: 'MIC (KCK) → installing TK and GTK',
      calc: [
        'M4 frame ({m4Size} bytes): Key Information = {m4Info} (Secure | MIC | Pairwise | version 2)',
        '  Replay Counter = {m4Replay}, Key Nonce = zeros, Key Data is empty',
        '  MIC = {m4Mic}',
        'MIC check by the access point: {chkM4}',
        '',
        'Installed by both sides:',
        '  TK  = {tk}   → CCMP for this pair’s traffic',
        '  GTK = {gtk}   → CCMP for broadcast traffic',
        '',
        'The handshake is complete, the 802.1X port is open.',
      ],
      packetLabel: 'M4 — confirmation',
    },
  ],
};
