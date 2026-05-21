/** Theory sections of the guide — English version. */
import type { ModuleId, ModuleTheory } from '../models';

export const THEORY_EN: Record<ModuleId, ModuleTheory> = {
  'wpa2-handshake': {
    title: 'How WPA2 works',
    summary:
      'WPA2 is the Wi-Fi protection standard (IEEE 802.11i, 2004): a fresh encryption ' +
      'key is born from the shared password for every connection.',
    sections: [
      {
        heading: 'History and why it matters',
        body:
          'The first Wi-Fi protection standard, WEP (1997), turned out to be fatally ' +
          'weak: its key could be recovered in minutes. It was replaced by WPA (2003, a ' +
          'stopgap based on TKIP), and then by WPA2 (IEEE 802.11i-2004) — which uses ' +
          'solid AES-CCMP encryption and is still the most widely used.\n\n' +
          'The core idea of WPA2-Personal: the access point and every device share a ' +
          'single password (PSK — Pre-Shared Key). But you cannot encrypt traffic with ' +
          'the password directly — then cracking one device would expose the whole ' +
          'network forever. So every connection runs a “four-message handshake” (4-Way ' +
          'Handshake) that produces unique one-time session keys.',
      },
      {
        heading: '4-Way Handshake — the four-message handshake',
        body:
          'The handshake solves two tasks at once: confirm that both sides know the ' +
          'password, and derive fresh session keys without sending them over the air.\n\n' +
          'The access point (AP) and the client exchange two random numbers — ANonce and ' +
          'SNonce. Thanks to them, even with the same password every session gets ' +
          'different keys: capturing yesterday’s traffic does not help decrypt today’s.' +
          '\n\nMessages M1–M4: M1 (AP → client) carries ANonce; M2 (client → AP) carries ' +
          'SNonce and the authenticity code MIC; M3 and M4 confirm that both sides ' +
          'derived matching keys.',
      },
      {
        heading: 'From password to key: PBKDF2',
        body:
          'The password becomes the 256-bit master key PMK through the key-derivation ' +
          'function PBKDF2 (PKCS #5, RFC 8018):\n\n' +
          'PMK = PBKDF2(HMAC-SHA1, password, SSID, 4096, 256)\n\n' +
          'Here the SSID (network name) acts as the “salt”, and the number 4096 is how ' +
          'many times the inner hash function repeats. The repetitions deliberately make ' +
          'the computation slow: a legitimate device computes PMK once — unnoticeable — ' +
          'but for an attacker brute-forcing millions of passwords, those same 4096 ' +
          'repetitions per password become very expensive. That is protection by ' +
          '“slowing down”.',
      },
      {
        heading: 'PTK and MIC — working keys and signature',
        body:
          'From the PMK, the MAC addresses and the random numbers, a pseudo-random ' +
          'function PRF (based on HMAC-SHA1, RFC 2104) derives the PTK — Pairwise ' +
          'Transient Key. The PTK is split into three parts: KCK confirms the ' +
          'authenticity of handshake messages, KEK encrypts auxiliary keys, TK encrypts ' +
          'the actual network traffic.\n\n' +
          'MIC (Message Integrity Code) is the message “signature”, computed with the ' +
          'KCK key. If the signature sent by the client matches the one the access point ' +
          'computed, then both sides derived the same PMK — that is, they know the same ' +
          'password. The password itself is never transmitted.',
      },
      {
        heading: 'WPA2’s weak spot',
        body:
          'WPA2 has a fundamental vulnerability: everything needed to verify the ' +
          'password (nonces, MAC addresses, MIC) travels over the air in clear text. ' +
          'Having captured a single handshake, an attacker can take it “home” and, ' +
          'offline, with no connection to the network at all, try passwords endlessly — ' +
          'until the MIC matches.\n\n' +
          'This is exactly the attack modelled by Module 3 (the Hashcat 22000 ' +
          'simulator). And Module 2 shows how WPA3 closes it.',
      },
    ],
    references: [
      { label: 'IEEE 802.11i-2004 — WPA2 / RSN', url: 'https://en.wikipedia.org/wiki/IEEE_802.11i-2004' },
      { label: 'RFC 8018 — PKCS #5: PBKDF2', url: 'https://www.rfc-editor.org/rfc/rfc8018' },
      { label: 'RFC 2104 — HMAC', url: 'https://www.rfc-editor.org/rfc/rfc2104' },
      { label: 'FIPS 180-4 — Secure Hash Standard (SHA-1)', url: 'https://csrc.nist.gov/pubs/fips/180-4/upd1/final' },
    ],
  },

  'wpa3-sae': {
    title: 'How WPA3 SAE works',
    summary:
      'WPA3 (Wi-Fi Alliance, 2018) replaces the WPA2 handshake with the SAE protocol ' +
      '(Dragonfly), which makes offline password cracking pointless.',
    sections: [
      {
        heading: 'Why WPA3 was needed',
        body:
          'WPA2 encrypts traffic reliably but, as shown in Module 1, is vulnerable to an ' +
          'offline attack: capture the handshake, then crack passwords at home without ' +
          'limits. For short or dictionary passwords that is a matter of minutes.\n\n' +
          'WPA3 (2018) eliminates exactly this problem. Instead of the 4-Way Handshake, ' +
          'password authentication uses SAE — Simultaneous Authentication of Equals.',
      },
      {
        heading: 'SAE / Dragonfly — a handshake of equals',
        body:
          'SAE is a PAKE (Password-Authenticated Key Exchange), a protocol in which two ' +
          'parties prove to each other that they know the password and at the same time ' +
          'derive a shared key. SAE is built on the Dragonfly scheme described in ' +
          'RFC 7664; it was added to Wi-Fi by the IEEE 802.11 standard.\n\n' +
          'The key word is “Equals”: SAE has no rigid split into “server” and “client” — ' +
          'both sides perform symmetric steps. Security rests on the mathematics of ' +
          'elliptic curves — here the P-256 curve is used.',
      },
      {
        heading: 'PWE — the password as a curve point',
        body:
          'The first SAE step is to turn the password into a PWE (Password Element), a ' +
          'point on an elliptic curve. The modern method — Hash-to-Element (H2E) — ' +
          'deterministically maps the password to a point using hash-to-curve per ' +
          'RFC 9380 (the SSWU method).\n\n' +
          'The early PWE-derivation method (“hunting and pecking” — a trial-and-error ' +
          'search) turned out to be vulnerable to timing and cache attacks (Dragonblood, ' +
          '2019). H2E runs in constant time and closes that gap. Knowing only the PWE ' +
          'point, the password cannot be recovered — it is a one-way operation.',
      },
      {
        heading: 'Commit, Confirm, and why capture is useless',
        body:
          'Each side picks two secret random numbers and sends a (scalar, element) ' +
          'pair — this is the Commit phase. From the other side’s pair and its own ' +
          'secret, each side computes the shared secret K — and it comes out IDENTICAL ' +
          'for both. The Confirm phase verifies the match.\n\n' +
          'The key difference from WPA2: an eavesdropper sees only the (scalar, element) ' +
          'pairs. From them you can neither recover the password nor test a guess ' +
          'offline — every cracking attempt requires a new live exchange with the access ' +
          'point, which limits the number of attempts. The offline attack from Module 3 ' +
          'simply does not apply to WPA3.',
      },
    ],
    references: [
      { label: 'RFC 7664 — Dragonfly Key Exchange (2015)', url: 'https://www.rfc-editor.org/rfc/rfc7664' },
      { label: 'RFC 9380 — Hashing to Elliptic Curves (2023)', url: 'https://www.rfc-editor.org/rfc/rfc9380' },
      { label: 'WPA3 — Wi-Fi Alliance Security', url: 'https://www.wi-fi.org/discover-wi-fi/security' },
      { label: 'Dragonblood — attacks on WPA3 SAE (2019)', url: 'https://wpa3.mathyvanhoef.com/' },
    ],
  },

  'hashcat-22000': {
    title: 'How the Hashcat 22000 attack works',
    summary:
      'Hashcat’s mode 22000 is an offline brute-force of a Wi-Fi password against a ' +
      'captured hash. This section is strictly educational: only the mathematics is ' +
      'simulated.',
    sections: [
      {
        heading: 'What an offline attack is',
        body:
          'Online brute-forcing of a Wi-Fi password is impractical: the access point ' +
          'replies slowly and locks out after a few failures. An offline attack gets ' +
          'around this: the attacker captures the needed data from the air once, then ' +
          'tries passwords on their own computer (or a GPU farm) — with no connection to ' +
          'the network at all, at enormous speed.\n\n' +
          'Brute-forcing works because the entire password check in WPA2 is open data ' +
          '(nonces, MAC, MIC or PMKID) plus deterministic mathematics. It is enough to ' +
          'repeat the same mathematics for every word of a dictionary.',
      },
      {
        heading: 'The PMKID attack',
        body:
          'A modern method, discovered by Hashcat’s author (Jens Steube) in 2018. It ' +
          'turned out that some access points send a PMKID in their very first reply to ' +
          'a client — a value computed by the formula:\n\n' +
          'PMKID = HMAC-SHA1(PMK, "PMK Name" || access point MAC || client MAC)\n\n' +
          'The attacker needs only one packet from the router — no need to wait for a ' +
          'live client to appear and a full handshake to happen. For each dictionary ' +
          'word the PMK is computed, then the PMKID, and the result is compared with the ' +
          'captured one.',
      },
      {
        heading: 'The EAPOL attack',
        body:
          'The classic method: the attacker captures the full 4-Way Handshake (messages ' +
          'M1–M2 are enough). From the captured EAPOL frame they take the MIC value.\n\n' +
          'For each dictionary word PMK → PTK → KCK → MIC is computed, and that MIC is ' +
          'compared with the captured one. A match means the password is found. The ' +
          'method requires catching the handshake, so the attacker sometimes forcibly ' +
          'disconnects the client (deauth) to make it reconnect.',
      },
      {
        heading: 'The 22000 format and protection',
        body:
          'Mode 22000 (“WPA-PBKDF2-PMKID+EAPOL”) merged two former Hashcat modes — ' +
          '16800 (PMKID) and 2500 (EAPOL) — into one universal text format. The line ' +
          'consists of fields separated by asterisks: the attack type, the hash itself, ' +
          'the MAC addresses, the network name, and so on.\n\n' +
          'The takeaway for protection is simple: the length and unpredictability of the ' +
          'password decide everything. A short or dictionary password is cracked offline ' +
          'in minutes or hours; a long random one makes brute-forcing economically ' +
          'pointless. And switching to WPA3 (Module 2) removes the very possibility of ' +
          'offline cracking.',
      },
    ],
    references: [
      { label: 'Hashcat — mode 22000 (WPA-PBKDF2-PMKID+EAPOL)', url: 'https://hashcat.net/wiki/doku.php?id=cracking_wpa-pmkid' },
      { label: 'PMKID attack — announcement by Jens Steube (2018)', url: 'https://hashcat.net/forum/thread-7717.html' },
      { label: 'RFC 2104 — HMAC', url: 'https://www.rfc-editor.org/rfc/rfc2104' },
    ],
  },
};
