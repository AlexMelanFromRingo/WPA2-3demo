/** WPA2/WPA3 guide — English version (translated from the Russian reference, guide.ru.ts). */
import type { GuideContent, SequenceVariant } from './guide-model';

const SEQ_WPA2: SequenceVariant = {
  label: 'WPA2-Personal',
  tag: 'wpa2',
  sta: 'Client (STA)',
  ap: 'Access point (AP)',
  phases: [
    {
      title: 'Network discovery',
      tone: 'discovery',
      messages: [
        { from: 'ap', label: 'Beacon', note: 'SSID and RSNE: which ciphers and sign-in methods are offered' },
        { from: 'sta', label: 'Probe Request', note: '“Is there a network called DemoNet here?”' },
        { from: 'ap', label: 'Probe Response', note: 'RSNE: AKM 00-0F-AC:2 (PSK), cipher CCMP' },
      ],
    },
    {
      title: '802.11 authentication (Open System)',
      tone: 'auth',
      messages: [
        { from: 'sta', label: 'Authentication', note: 'algorithm 0 — a formality, the password is not checked' },
        { from: 'ap', label: 'Authentication', note: 'status 0 — “success”' },
      ],
    },
    {
      title: 'Association',
      tone: 'assoc',
      messages: [
        { from: 'sta', label: 'Association Request', note: 'the client’s RSNE: the chosen AKM and cipher' },
        { from: 'ap', label: 'Association Response', note: 'the client’s number in the network (AID)' },
      ],
    },
    {
      title: '4-Way Handshake — password check and key derivation',
      tone: 'keys',
      messages: [
        { from: 'ap', label: 'EAPOL-Key M1', note: 'ANonce' },
        { from: 'sta', label: 'EAPOL-Key M2', note: 'SNonce + RSNE + MIC' },
        { from: 'ap', label: 'EAPOL-Key M3', note: 'RSNE + GTK (encrypted with KEK) + MIC' },
        { from: 'sta', label: 'EAPOL-Key M4', note: 'confirmation + MIC' },
      ],
    },
    {
      title: 'Group Key Handshake — group key change (on a timer)',
      tone: 'group',
      messages: [
        { from: 'ap', label: 'EAPOL-Key G1', note: 'new GTK, encrypted with KEK', secured: true },
        { from: 'sta', label: 'EAPOL-Key G2', note: 'confirmation + MIC', secured: true },
      ],
    },
    {
      title: 'Encrypted data',
      tone: 'data',
      messages: [
        { from: 'sta', label: 'Data (CCMP)', note: 'encrypted with TK', secured: true },
        { from: 'ap', label: 'Data (CCMP)', note: 'broadcast — encrypted with GTK', secured: true },
      ],
    },
  ],
};

const SEQ_WPA3: SequenceVariant = {
  label: 'WPA3-Personal',
  tag: 'wpa3',
  sta: 'Client (STA)',
  ap: 'Access point (AP)',
  phases: [
    {
      title: 'Network discovery',
      tone: 'discovery',
      messages: [
        { from: 'ap', label: 'Beacon', note: 'RSNE: AKM 00-0F-AC:8 (SAE), PMF required' },
        { from: 'sta', label: 'Probe Request', note: '“Is there a network called DemoNet here?”' },
        { from: 'ap', label: 'Probe Response', note: 'RSNE + a flag showing H2E support' },
      ],
    },
    {
      title: 'SAE authentication (Dragonfly)',
      tone: 'sae',
      messages: [
        { from: 'sta', label: 'SAE Commit', note: 'the client’s scalar + element' },
        { from: 'ap', label: 'SAE Commit', note: 'the access point’s scalar + element' },
        { from: 'sta', label: 'SAE Confirm', note: 'proof: the client knows the password' },
        { from: 'ap', label: 'SAE Confirm', note: 'the AP’s proof → both now share the same PMK' },
      ],
    },
    {
      title: 'Association',
      tone: 'assoc',
      messages: [
        { from: 'sta', label: 'Association Request', note: 'the client’s RSNE: AKM 8, PMF' },
        { from: 'ap', label: 'Association Response', note: 'the client’s number in the network (AID)' },
      ],
    },
    {
      title: '4-Way Handshake using the PMK from SAE',
      tone: 'keys',
      messages: [
        { from: 'ap', label: 'EAPOL-Key M1', note: 'ANonce' },
        { from: 'sta', label: 'EAPOL-Key M2', note: 'SNonce + RSNE + MIC (AES-CMAC)' },
        { from: 'ap', label: 'EAPOL-Key M3', note: 'GTK + IGTK (encrypted with KEK) + MIC' },
        { from: 'sta', label: 'EAPOL-Key M4', note: 'confirmation + MIC' },
      ],
    },
    {
      title: 'Group Key Handshake — group key change',
      tone: 'group',
      messages: [
        { from: 'ap', label: 'EAPOL-Key G1', note: 'new GTK and IGTK', secured: true },
        { from: 'sta', label: 'EAPOL-Key G2', note: 'confirmation + MIC', secured: true },
      ],
    },
    {
      title: 'Encrypted data and protected management frames',
      tone: 'data',
      messages: [
        { from: 'sta', label: 'Data (CCMP)', note: 'encrypted with TK', secured: true },
        { from: 'ap', label: 'Deauth / Disassoc', note: 'signed (PMF) — cannot be forged', secured: true },
      ],
    },
  ],
};

export const GUIDE_EN: GuideContent = {
  title: 'Guide: how Wi‑Fi protects a connection',
  lead:
    'Everything that happens between a phone and a router — from the first “is there a network here?” ' +
    'to the first encrypted byte. The WPA2 and WPA3 standards, authentication steps, keys, handshakes, ' +
    'strengths and weaknesses. You can read it from start to finish, or open any chapter from the contents.',
  hero: {
    kind: 'sequence',
    variants: [SEQ_WPA2, SEQ_WPA3],
    caption:
      'The connection path from finding the network to encrypted data. Switch the variant: in WPA3, the ' +
      'empty “Open System authentication” is replaced by a real SAE exchange, and management frames are ' +
      'protected (PMF).',
  },
  chapters: [
    // ------------------------------------------------------------------ 1
    {
      id: 'why',
      title: 'Why Wi-Fi needs protection',
      tag: 'common',
      lead: 'To listen to a cable, you have to plug into it. Radio waves reach everyone nearby.',
      blocks: [
        {
          kind: 'p',
          text:
            'Wi-Fi is radio. The router and the phone “talk” by sending out waves in all directions: ' +
            'through walls, into the stairwell, into the yard. Any device with a Wi-Fi adapter within ' +
            'range can listen to the air — just as any radio can pick up an FM station. So protection ' +
            'cannot rely on “strangers won’t hear”. It must work even when strangers hear **everything**.',
        },
        {
          kind: 'p',
          text: 'That is why Wi-Fi security solves three tasks. They are easy to remember with the example of a letter:',
        },
        {
          kind: 'list',
          items: [
            '**Confidentiality** — an outsider cannot read the letter. In Wi-Fi this is **encryption**: ' +
              'data is turned into “noise” that only the key holder can understand.',
            '**Integrity** — nobody can secretly change the letter on the way. In Wi-Fi, every frame ' +
              'carries a **MIC** (Message Integrity Code) — a short cryptographic signature; any change ' +
              'breaks it.',
            '**Authentication** — certainty that the letter came from the right sender. In Wi-Fi, the ' +
              'two sides prove to each other that they know a shared secret (a password or a ' +
              'certificate) without revealing it.',
          ],
        },
        {
          kind: 'terms',
          items: [
            {
              term: 'Key',
              definition:
                'a secret number used to encrypt and check data. Like the key to a lock: whoever has ' +
                'it can open the lock.',
            },
            {
              term: 'Encryption',
              definition:
                'a reversible way of turning data into an unreadable form with a key. Without the key, ' +
                'you cannot turn it back.',
            },
            {
              term: 'Frame',
              definition:
                'a single “parcel” sent over the Wi-Fi air: a header with addresses plus the payload. ' +
                'Everything sent over Wi-Fi is cut into frames.',
            },
            {
              term: 'MAC address',
              definition:
                'the hardware address of a network device, 6 bytes long, for example ' +
                '`02:00:00:00:00:01`. It works as the frame’s “return address”.',
            },
            {
              term: 'Byte and hex',
              definition:
                'a byte is 8 bits, a number from 0 to 255. In hexadecimal notation (hex), a byte is ' +
                'written as two characters from 0–9 and a–f: `00` … `ff`.',
            },
          ],
        },
        { kind: 'h', text: 'Personal and Enterprise' },
        {
          kind: 'p',
          text:
            'WPA2 and WPA3 have two modes. In **Personal** mode (home, small office), everyone uses one ' +
            'shared network password. In **Enterprise** mode (companies, universities), each user has ' +
            'their own login or certificate, and a separate server checks them. Traffic encryption is ' +
            'the same in both modes — what differs is where the main key comes from. This guide covers ' +
            'Personal in detail and Enterprise briefly.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Who is who',
          text:
            'In the standards, the user’s device is called the **STA** (station) or the ' +
            '**Supplicant** (the side asking for access), and the router is the **AP** (access point) ' +
            'or the **Authenticator** (the side doing the checking). These are the same participants ' +
            'under different names.',
        },
      ],
    },
    // ------------------------------------------------------------------ 2
    {
      id: 'history',
      title: 'From WEP to WPA3: a short history',
      tag: 'common',
      lead: 'Each new generation of protection appeared because the previous one had been broken.',
      blocks: [
        {
          kind: 'timeline',
          items: [
            {
              year: '1997–1999',
              title: 'WEP',
              tag: 'attack',
              text:
                'Wired Equivalent Privacy — “privacy as good as a wire”, part of the original IEEE ' +
                '802.11 standard. It used the RC4 cipher with a 40- or 104-bit key and a 24-bit ' +
                'initialisation vector (IV); integrity came from a CRC-32 checksum. The IV is too short ' +
                'and repeats, and CRC-32 does not protect against forgery. The FMS attack (2001) ' +
                'recovered the key from captured traffic; the PTW attack (2007) did it in a minute or ' +
                'two. In 2004, IEEE declared WEP deprecated.',
            },
            {
              year: '2003',
              title: 'WPA (TKIP)',
              tag: 'attack',
              text:
                'Wi-Fi Protected Access — an urgent “patch” from the Wi-Fi Alliance, based on a draft of ' +
                'the 802.11i standard. Its TKIP protocol ran on old hardware: the same RC4, but with a ' +
                'separate key for every frame, a counter against replays and the Michael integrity ' +
                'code. It was a temporary measure: the Beck–Tews attack (2008) made it possible to ' +
                'decrypt and forge short frames.',
            },
            {
              year: '2004',
              title: 'WPA2',
              tag: 'wpa2',
              text:
                'Based on the IEEE 802.11i-2004 standard. RC4 is replaced by the **AES** block cipher in ' +
                '**CCMP** mode. It introduced the 4-Way Handshake and the key hierarchy that are still ' +
                'used today. Since 2006, WPA2 support has been mandatory for Wi-Fi device certification.',
            },
            {
              year: '2009',
              title: 'IEEE 802.11w — PMF',
              tag: 'common',
              text:
                'Protected Management Frames — protection for management frames (the service frames ' +
                'that control a connection): a client can no longer be disconnected with a forged ' +
                'deauth command. Optional in WPA2, mandatory in WPA3.',
            },
            {
              year: '2018',
              title: 'WPA3',
              tag: 'wpa3',
              text:
                'The Wi-Fi Alliance introduced WPA3. The main change is the **SAE** protocol (Dragonfly) ' +
                'instead of PSK sign-in: a captured handshake can no longer be used to guess the ' +
                'password offline. PMF is mandatory; for companies there is a 192-bit Enterprise mode. ' +
                'Wi-Fi Enhanced Open (OWE) for open networks appeared at the same time.',
            },
            {
              year: '2019',
              title: 'Dragonblood and the answer to it — H2E',
              tag: 'wpa3',
              text:
                'Researchers found timing leaks and security downgrades in the first SAE ' +
                'implementations. The answer was **Hash-to-Element (H2E)**, a way to derive the PWE that ' +
                'runs in constant time, plus the Transition Disable indication against falling back to ' +
                'WPA2.',
            },
            {
              year: '2020s',
              title: 'Wi-Fi 6E and Wi-Fi 7 (6 GHz)',
              tag: 'wpa3',
              text:
                'In the new 6 GHz band, only WPA3 and OWE are allowed, and SAE only in its H2E variant. ' +
                'Older protocols are not allowed there at all.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          text:
            'WEP and WPA (TKIP) are considered broken today. If your router settings offer such a ' +
            'mode, do not use it — including in the “mixed” WPA/WPA2 variant.',
        },
      ],
    },
    // ------------------------------------------------------------------ 3
    {
      id: 'architecture',
      title: 'The participants and the “language” they negotiate in',
      tag: 'common',
      lead: 'Before computing any keys, the two sides must agree on what protection to use and how.',
      blocks: [
        { kind: 'h', text: 'Three roles' },
        {
          kind: 'list',
          items: [
            '**Supplicant** (client, STA) — the device that wants to connect: a phone, a laptop.',
            '**Authenticator** (access point, AP) — the router. It does not let the client into the ' +
              'network until the client proves it has the right to connect.',
            '**Authentication Server** (usually RADIUS) — exists only in Enterprise: a separate ' +
              'server that checks logins and certificates. In Personal mode, the access point plays ' +
              'this role itself — it knows the password.',
          ],
        },
        { kind: 'h', text: 'The two “doors” of 802.1X' },
        {
          kind: 'p',
          text:
            'For each client, the access point keeps two logical “doors” — in the IEEE 802.1X standard ' +
            'they are called **ports**. The **uncontrolled port** is always open, but it lets through ' +
            'only **EAPOL** authentication frames (EAP over LAN — an authentication protocol carried ' +
            'over a local network). The **controlled port** is the door to the network and the ' +
            'internet; it opens only once both sides have installed keys after the handshake. Until ' +
            'then, any ordinary data from the client is dropped.',
        },
        { kind: 'h', text: 'RSNE — the network’s security “business card”' },
        {
          kind: 'p',
          text:
            'How does a client learn that a network is protected by WPA2 or WPA3? Several times per ' +
            'second, the access point broadcasts a **Beacon** frame (“I am here, my name is DemoNet”), ' +
            'and when a client asks directly (**Probe Request**), it replies with a **Probe Response**. ' +
            'Both frames contain the **RSNE** — RSN Element (RSN stands for Robust Security Network). ' +
            'It is a list of capabilities:',
        },
        {
          kind: 'list',
          items: [
            'the RSN **version** (always 1);',
            'the **group cipher** — what encrypts broadcast traffic addressed to everyone at once;',
            'the **pairwise ciphers** — what encrypts “one-to-one” traffic between the access point ' +
              'and a specific client;',
            '**AKM suites** (Authentication and Key Management) — how a client signs in and how keys ' +
              'are derived: with a password, via SAE, or via an 802.1X server;',
            '**RSN Capabilities** — capability flags, including **MFPC** (“I can protect management ' +
              'frames”) and **MFPR** (“I require it”).',
          ],
        },
        {
          kind: 'p',
          text:
            'The client picks from the list what it supports itself and repeats its choice in the ' +
            '**Association Request**. Later, in message M3 of the handshake, the access point sends ' +
            'its RSNE once more — this time protected by the MIC. If an attacker changed the RSNE in ' +
            'the unprotected beacon to “talk” the client into weak protection, the client will notice ' +
            'the mismatch and drop the connection. This protects against a **downgrade attack**.',
        },
        {
          kind: 'table',
          caption: 'AKM suites — how the sign-in method is “written” (identifiers 00-0F-AC:n from IEEE 802.11)',
          head: ['Code', 'Name', 'Where it is used'],
          rows: [
            ['`00-0F-AC:1`', '802.1X', 'WPA2/WPA3-Enterprise (RADIUS server)'],
            ['`00-0F-AC:2`', 'PSK', 'WPA2-Personal: password, keys based on SHA-1'],
            ['`00-0F-AC:5`', '802.1X-SHA256', 'Enterprise with SHA-256 key derivation'],
            ['`00-0F-AC:6`', 'PSK-SHA256', 'Personal with SHA-256 key derivation (often together with PMF)'],
            ['`00-0F-AC:8`', 'SAE', 'WPA3-Personal'],
            ['`00-0F-AC:12`', '802.1X Suite-B-192', 'WPA3-Enterprise, 192-bit mode'],
            ['`00-0F-AC:18`', 'OWE', 'Wi-Fi Enhanced Open — an open network with encryption'],
          ],
        },
        {
          kind: 'table',
          caption: 'Cipher suites',
          head: ['Code', 'Cipher', 'Status'],
          rows: [
            ['`00-0F-AC:2`', 'TKIP (RC4 + Michael)', 'deprecated, insecure'],
            ['`00-0F-AC:4`', 'CCMP-128 (AES-128 in CCM mode)', 'the main cipher for WPA2 and WPA3-Personal'],
            ['`00-0F-AC:6`', 'BIP-CMAC-128', 'signs broadcast management frames (PMF)'],
            ['`00-0F-AC:9`', 'GCMP-256 (AES-256 in GCM mode)', 'WPA3-Enterprise 192-bit; also found in newer Wi-Fi 7 devices'],
            ['`00-0F-AC:12`', 'BIP-GMAC-256', 'PMF in 192-bit mode'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 4
    {
      id: 'keys',
      title: 'The key hierarchy: from password to cipher',
      tag: 'common',
      lead:
        'Nothing is encrypted with the password directly. Like a seed, it grows a tree of keys — and ' +
        'each key has its own job.',
      blocks: [
        {
          kind: 'p',
          text:
            'Why not encrypt traffic with the password itself? First, a password is short and “human”, ' +
            'while the AES cipher needs a key of 128 random-looking bits. Second, if the same key were ' +
            'used for years and by every device, a single leak would expose everything at once and ' +
            'forever. So WPA builds a **hierarchy**: a long-lived master key gives rise to fresh ' +
            'one-time keys for each connection.',
        },
        {
          kind: 'keytree',
          main: [
            {
              nodes: [
                {
                  name: 'Password + SSID',
                  role: 'what a person types in (WPA2-Personal)',
                  tone: 'secret',
                },
                {
                  name: 'Password + MAC + random numbers',
                  role: 'inputs to the SAE exchange (WPA3-Personal)',
                  tone: 'secret',
                },
              ],
            },
            {
              via: 'WPA2: PBKDF2-HMAC-SHA1, 4096 iterations · WPA3: SAE exchange on an elliptic curve',
              nodes: [
                {
                  name: 'PMK',
                  size: '256 bits',
                  role: 'pairwise master key — the secret shared by the AP and the client',
                  tone: 'master',
                },
              ],
            },
            {
              via: 'WPA2: PRF-384 · WPA3: KDF-SHA256 — from the PMK, MAC addresses, ANonce and SNonce',
              nodes: [
                {
                  name: 'PTK',
                  size: '384 bits',
                  role: 'temporary key for one connection',
                  tone: 'session',
                },
              ],
            },
            {
              via: 'cut into three 128-bit parts',
              nodes: [
                { name: 'KCK', size: '128 bits', role: 'signs handshake messages (MIC)', tone: 'session' },
                { name: 'KEK', size: '128 bits', role: 'encrypts the GTK and IGTK inside M3', tone: 'session' },
                { name: 'TK', size: '128 bits', role: 'encrypts the client’s traffic (CCMP)', tone: 'session' },
              ],
            },
          ],
          asideTitle: 'Group keys — held by the access point',
          aside: [
            {
              nodes: [
                {
                  name: 'GMK',
                  size: '256 bits',
                  role: 'group master key: random, stored only on the AP',
                  tone: 'master',
                },
              ],
            },
            {
              via: 'PRF from the GMK, the access point’s MAC and the GNonce (or simply random)',
              nodes: [
                {
                  name: 'GTK',
                  size: '128 bits',
                  role: 'encrypts broadcast traffic for all clients',
                  tone: 'group',
                },
              ],
            },
            {
              via: 'a separate random key, if PMF is enabled',
              nodes: [
                {
                  name: 'IGTK',
                  size: '128 bits',
                  role: 'signs broadcast management frames',
                  tone: 'group',
                },
              ],
            },
          ],
          caption:
            'Top to bottom — from long-lived to one-time. In WPA2, the PMK is the same for every ' +
            'connection to the network, but each connection has its own PTK, because fresh random ' +
            'numbers go into it.',
        },
        {
          kind: 'terms',
          items: [
            {
              term: 'PSK',
              definition:
                'Pre-Shared Key — a key handed out in advance. In WPA2-Personal, it is the PMK itself: ' +
                '256 bits computed from the password and the SSID. It can also be entered directly as ' +
                '64 hex characters.',
            },
            {
              term: 'PMK',
              definition:
                'Pairwise Master Key, 256 bits. “Pairwise” means it is shared by a pair: “access point ' +
                '+ client”.',
            },
            {
              term: 'PTK',
              definition:
                'Pairwise Transient Key — a temporary pairwise key. It lives for one connection; for ' +
                'the CCMP cipher it is 384 bits long.',
            },
            {
              term: 'KCK',
              definition: 'Key Confirmation Key — the key used to compute the MIC of 4-Way Handshake messages.',
            },
            {
              term: 'KEK',
              definition:
                'Key Encryption Key — a key for encrypting other keys: the access point uses it to ' +
                '“seal” the GTK in message M3.',
            },
            {
              term: 'TK',
              definition:
                'Temporal Key — the working key that encrypts traffic between the access point and this client.',
            },
            {
              term: 'GTK',
              definition:
                'Group Temporal Key — a key shared by all clients for broadcast and multicast frames ' +
                '(for example, ARP broadcasts).',
            },
            {
              term: 'IGTK',
              definition:
                'Integrity Group Temporal Key — the key the access point uses to sign broadcast ' +
                'management frames when PMF is enabled.',
            },
            {
              term: 'GMK',
              definition: 'Group Master Key — the access point’s random secret, from which it can derive the GTK.',
            },
            {
              term: 'Nonce',
              definition:
                'number used once: a random value that makes every handshake unique.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'ok',
          text:
            'The key idea: even with the same password, two laptops on the same network get ' +
            '**different** TKs, and one laptop gets a new TK every time it reconnects.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          text:
            'A WPA2-Personal caveat: the PTK is derived from the PMK plus nonces and MAC addresses that ' +
            'are sent **in the clear**. Anyone who knows the network password and has captured a ' +
            'neighbour’s handshake can compute that neighbour’s PTK and decrypt their traffic. WPA3 ' +
            'closes this gap: each connection has its own PMK.',
        },
      ],
    },
    // ------------------------------------------------------------------ 5
    {
      id: 'wpa2',
      title: 'WPA2-Personal step by step',
      tag: 'wpa2',
      lead: 'How the password “password123” becomes the key that encrypts the video on your phone.',
      blocks: [
        { kind: 'h', text: 'Step 0. The password becomes the PMK' },
        {
          kind: 'p',
          text:
            'A WPA2 password is 8 to 63 printable ASCII characters (or exactly 64 hexadecimal ' +
            'characters — in that case it is already a ready-made 256-bit key). The PMK is computed ' +
            'from the password and the network name with the **PBKDF2** function (Password-Based Key ' +
            'Derivation Function 2, RFC 8018), which “stretches” a short password into a long key:',
        },
        { kind: 'formula', text: 'PMK = PBKDF2(HMAC-SHA1, password, SSID, 4096 iterations, 256 bits)' },
        {
          kind: 'p',
          text:
            '**HMAC-SHA1** (RFC 2104) is a cryptographic “meat grinder with a key”: a key and data go ' +
            'in, a 20-byte fingerprint comes out. PBKDF2 runs it in a chain 4096 times — and does this ' +
            'twice, because 256 bits need two 20-byte blocks: 8192 HMAC computations in total. The ' +
            '**SSID** serves as the **salt** — an extra input that makes the same password give ' +
            'different PMKs on networks with different names. That way, nobody can precompute a single ' +
            '“password → PMK” table for every network in the world at once.',
        },
        {
          kind: 'callout',
          tone: 'info',
          text:
            'The PMK is computed once and does not depend on the device: the router and every client on ' +
            'the network have the same one. The PMK itself is **never** sent over the air.',
        },
        { kind: 'h', text: 'How the connection works' },
        {
          kind: 'sequence',
          variants: [SEQ_WPA2],
          caption: 'All frames before the 4-Way Handshake are sent in plain text. Encryption is switched on only after M4.',
        },
        {
          kind: 'p',
          text:
            'First the client finds the network (Beacon/Probe), then goes through **Open System** ' +
            '“authentication” — a leftover from the 1997 standard: two frames in which nothing is ' +
            'checked. Next the client **associates** — it registers with the access point and reports ' +
            'the ciphers it has chosen. The real password check and key derivation happen only in the ' +
            '**4-Way Handshake** — four EAPOL-Key frames.',
        },
        { kind: 'h', text: '4-Way Handshake: four messages' },
        {
          kind: 'p',
          text:
            'The goals of the handshake: make sure both sides have the same PMK — that is, both know ' +
            'the password — **without sending** either the password or the PMK; derive a fresh PTK for ' +
            'this connection; deliver the group key GTK to the client; and switch on encryption on both ' +
            'sides at the same moment.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'M1 — the access point offers to start',
              meta: 'access point → client · no MIC',
              text:
                'The access point generates a random 32-byte number, the **ANonce**, and sends it to ' +
                'the client together with the **Replay Counter** (let’s call it r). This frame has no ' +
                'MIC: the access point does not have a PTK yet, because it does not know the client’s ' +
                'SNonce. Sometimes the Key Data field carries the **PMKID** — the “name” of the PMK ' +
                '(more on it below; this is exactly what the PMKID attack uses).\n\nAfter receiving M1, ' +
                'the client generates its own **SNonce** and can already compute the PTK: it has the ' +
                'PMK, both MAC addresses and both nonces.',
            },
            {
              title: 'M2 — the client replies and proves it knows the password',
              meta: 'client → access point · MIC',
              text:
                'The client sends the **SNonce**, its RSNE (the same as in the Association Request) and ' +
                'the **MIC** — a signature over the whole frame made with the KCK. The Replay Counter ' +
                'stays the same, r: this tells the access point that this is the reply to its own ' +
                'M1.\n\nOnce the access point has the SNonce, it computes the PTK on its side and checks ' +
                'the MIC. If it matches, the client knows the PMK — and therefore the password. If it ' +
                'does not match, the password is wrong and the frame is dropped.',
              formula: 'MIC = HMAC-SHA1(KCK, EAPOL frame with the MIC field zeroed), first 16 bytes',
            },
            {
              title: 'M3 — the access point proves itself and delivers the GTK',
              meta: 'access point → client · Install + MIC + encrypted data',
              text:
                'The access point sends the ANonce again, Replay Counter **r+1**, the **Install** flag ' +
                '(“install the keys”), and in the Key Data field — its RSNE and the group key **GTK** ' +
                '(with PMF, also the **IGTK**). Key Data is encrypted with the **KEK** using the **AES ' +
                'Key Wrap** algorithm (RFC 3394), and the whole frame is signed with a MIC.\n\nThe ' +
                'client checks the MIC — now the access point has also proved that it knows the PMK ' +
                '(this protects against a fake access point that does not know the password). The ' +
                'client compares the RSNE with the one it saw in the Beacon: a mismatch means someone ' +
                'is trying to downgrade the protection.',
            },
            {
              title: 'M4 — the client confirms that the keys are installed',
              meta: 'client → access point · MIC',
              text:
                'The client sends a short confirmation with Replay Counter r+1 and a MIC, with no data. ' +
                'After that, both sides **install** the TK (for one-to-one traffic) and the GTK (for ' +
                'broadcasts), and the controlled port opens — from then on, all data is encrypted.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Why the Replay Counter is needed',
          text:
            'The replay counter is the number of the current “round of conversation”. Every new ' +
            'request from the access point increases it, and both sides reject frames with an old or ' +
            'repeated number. This protects against a **replay attack**, where an attacker records a ' +
            'real frame and sends it again.',
        },
        { kind: 'h', text: 'How the PTK is computed' },
        {
          kind: 'formula',
          text:
            'PTK = PRF-384(PMK, "Pairwise key expansion",\n' +
            '              min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce))',
        },
        {
          kind: 'p',
          text:
            'The 802.11 **PRF** (pseudo-random function) calls HMAC-SHA1 several times with a growing ' +
            'counter and joins the results until there are enough bytes: 384 bits takes 3 calls of ' +
            '160 bits each, and the extra bits are thrown away. **AA** is the access point’s MAC ' +
            '(Authenticator Address), **SPA** is the client’s MAC (Supplicant Address), and **‖** ' +
            'means joining bytes one after another. **min/max** make both sides put the bytes in the ' +
            'same order, no matter who is computing. The finished PTK is cut up: the first 16 bytes ' +
            'are the KCK, the next 16 the KEK, the last 16 the TK.',
        },
        { kind: 'h', text: 'Inside an EAPOL-Key frame' },
        {
          kind: 'p',
          text:
            'All four messages are frames of the same **EAPOL-Key** format. They differ only in field ' +
            'values and flags.',
        },
        {
          kind: 'frame',
          title: 'EAPOL-Key frame',
          fields: [
            { name: 'Protocol Version', bytes: 1, note: '802.1X version: 1 or 2', part: 'header' },
            { name: 'Packet Type', bytes: 1, note: '3 = EAPOL-Key', part: 'header' },
            { name: 'Body Length', bytes: 2, note: 'length of everything below', part: 'header' },
            { name: 'Descriptor Type', bytes: 1, note: '2 = RSN (WPA2/WPA3)', part: 'body' },
            { name: 'Key Information', bytes: 2, note: 'bit flags (see the table below)', part: 'body' },
            { name: 'Key Length', bytes: 2, note: 'pairwise key length: 16 for CCMP', part: 'body' },
            { name: 'Replay Counter', bytes: 8, note: 'counter against replays', part: 'body' },
            { name: 'Key Nonce', bytes: 32, note: 'ANonce or SNonce', part: 'nonce' },
            { name: 'EAPOL-Key IV', bytes: 16, note: 'not used in RSN — zeros', part: 'body' },
            { name: 'Key RSC', bytes: 8, note: 'starting packet number for the GTK (in M3)', part: 'body' },
            { name: 'Reserved', bytes: 8, note: 'reserved — zeros', part: 'body' },
            { name: 'Key MIC', bytes: 16, note: 'frame signature made with the KCK', part: 'mic' },
            { name: 'Key Data Length', bytes: 2, note: 'length of the Key Data field', part: 'body' },
            { name: 'Key Data', bytes: 'n', note: 'RSNE, GTK, IGTK, PMKID — packed as KDEs', part: 'data' },
          ],
          caption:
            'The first 4 bytes are the 802.1X header, followed by the EAPOL-Key body (95 bytes + Key ' +
            'Data). The MIC is computed over the whole frame, with the Key MIC field temporarily ' +
            'filled with zeros.',
        },
        {
          kind: 'table',
          caption: 'Key Information flags and the contents of each message (WPA2, CCMP cipher)',
          head: ['Field or flag (bit number)', 'M1', 'M2', 'M3', 'M4'],
          rows: [
            ['Key Descriptor Version (bits 0–2)', '2', '2', '2', '2'],
            ['Key Type = Pairwise (3)', '✓', '✓', '✓', '✓'],
            ['Install (6) — “install the key”', '—', '—', '✓', '—'],
            ['Key Ack (7) — “I expect a reply”', '✓', '—', '✓', '—'],
            ['Key MIC (8) — the frame is signed', '—', '✓', '✓', '✓'],
            ['Secure (9) — the keys are ready', '—', '—', '✓', '✓'],
            ['Encrypted Key Data (12)', '—', '—', '✓', '—'],
            ['Whole Key Information field (hex)', '`0x008a`', '`0x010a`', '`0x13ca`', '`0x030a`'],
            ['Replay Counter', 'r', 'r', 'r+1', 'r+1'],
            ['Key Nonce', 'ANonce', 'SNonce', 'ANonce', 'zeros'],
            ['Key Data', 'PMKID (optional)', 'client’s RSNE', 'AP’s RSNE + GTK (+ IGTK)', 'empty'],
          ],
        },
        {
          kind: 'p',
          text:
            '**Key Descriptor Version** sets the algorithms for the MIC and for encrypting Key Data: ' +
            '**1** — HMAC-MD5 and RC4 (legacy TKIP), **2** — HMAC-SHA1-128 and AES Key Wrap (WPA2 with ' +
            'CCMP), **3** — AES-128-CMAC (SHA-256-based AKM suites), **0** — “defined by the AKM”: this ' +
            'value marks WPA3-SAE and newer suites, where the algorithms follow from the chosen AKM ' +
            '(for SAE, AES-128-CMAC).',
        },
        {
          kind: 'p',
          text:
            'The keys inside Key Data are packed into **KDEs** (Key Data Encapsulation) — small ' +
            'containers with a `dd` byte, a length and a type `00-0F-AC:n`: type 1 is the GTK, 4 is ' +
            'the PMKID, 9 is the IGTK. Before AES Key Wrap encryption, the Key Data field is padded to ' +
            'a multiple of 8 bytes (a `dd` byte, then zeros).',
        },
        { kind: 'h', text: 'Group Key Handshake — changing the GTK' },
        {
          kind: 'p',
          text:
            'The GTK is shared by all clients, so it is changed from time to time — on a timer, or when ' +
            'someone leaves the network, so that a client that has left cannot read broadcasts. The ' +
            'access point sends each client a short handshake of **two** EAPOL-Key frames: G1 with the ' +
            'new GTK, encrypted with that client’s KEK, and the reply G2 with a MIC. Both frames ' +
            'already travel inside the encrypted channel.',
        },
        { kind: 'h', text: 'PMKID and PMK caching' },
        { kind: 'formula', text: 'PMKID = HMAC-SHA1(PMK, "PMK Name" ‖ AA ‖ SPA), first 16 bytes' },
        {
          kind: 'p',
          text:
            'The PMKID is a 16-byte “name” for the PMK. When reconnecting (for example, when roaming ' +
            'between access points of the same network), the client can say “we already share a PMK ' +
            'with this name” and skip the long authentication — this is **PMKSA caching** (PMK ' +
            'Security Association). It is especially useful in Enterprise. The downside: the PMKID is ' +
            'computed from the PMK, and the PMK from the password, so a PMKID taken from M1 can be ' +
            'used for offline password guessing.',
        },
        {
          kind: 'callout',
          tone: 'danger',
          title: 'The main weakness of WPA2-Personal',
          text:
            'Everything needed to check a password guess travels over the air in the clear: the SSID, ' +
            'the MAC addresses, ANonce, SNonce and the MIC from M2 (or the PMKID from M1). An attacker ' +
            'records one handshake, leaves, and tries passwords at home — with no limit on the number ' +
            'of attempts. Module 3 of this site models exactly this.',
        },
        {
          kind: 'links',
          items: [
            {
              label: 'Module 1 — WPA2 4-Way Handshake',
              route: '/wpa2',
              note: 'every computation, done on your own network parameters',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 6
    {
      id: 'encryption',
      title: 'How data is encrypted: CCMP and GCMP',
      tag: 'common',
      lead: 'The handshake has produced the TK key. Now every data frame must be encrypted and protected against forgery.',
      blocks: [
        {
          kind: 'p',
          text:
            '**CCMP** (CTR with CBC-MAC Protocol) is the encryption protocol of WPA2 and WPA3-Personal. ' +
            'Inside it is the **AES-128** block cipher in **CCM** mode (RFC 3610), which does two things ' +
            'at once:',
        },
        {
          kind: 'list',
          items: [
            '**CTR** (counter mode) — encryption: AES encrypts successive counter values, which gives ' +
              'a “keystream” — a pseudo-random stream of bytes that is combined with the data bit by ' +
              'bit (XOR).',
            '**CBC-MAC** — the signature: AES “swallows” the data and the unchangeable header fields ' +
              'one block after another and outputs an 8-byte MIC. If even one bit changes, the MIC ' +
              'will not match.',
          ],
        },
        {
          kind: 'p',
          text:
            'The encrypted data is preceded by an 8-byte CCMP header with a 48-bit **PN** (Packet ' +
            'Number). The PN goes up by 1 with every frame and never repeats while the key is in use. ' +
            'The receiver remembers the last PN and drops frames with a lower or equal number — this ' +
            'protects against replays.',
        },
        { kind: 'formula', text: 'CCM nonce (13 bytes) = Priority (1) ‖ A2 — sender address (6) ‖ PN (6)' },
        {
          kind: 'p',
          text:
            'The **nonce** for CCM mode is built from the PN and the address. The unchangeable fields of ' +
            'the MAC header (addresses, frame type) go into the signature as **AAD** (Additional ' +
            'Authenticated Data — data that is not encrypted but is protected against tampering).',
        },
        {
          kind: 'callout',
          tone: 'danger',
          title: 'Why a nonce must never repeat',
          text:
            'If two different frames are encrypted with the same TK and the same nonce, they share the ' +
            'same “keystream”. By XOR-ing the two ciphertexts, an attacker removes the key and gets the ' +
            'XOR of the two plaintexts; from there, known pieces (protocol headers) let them recover ' +
            'the contents. This is exactly what **KRACK** aims for: forcing a device to reinstall a key ' +
            'and reset the PN.',
        },
        {
          kind: 'table',
          caption: 'Traffic ciphers',
          head: ['', 'CCMP-128', 'GCMP-256'],
          rows: [
            ['Cipher', 'AES-128', 'AES-256'],
            ['Mode', 'CCM: CTR + CBC-MAC', 'GCM: CTR + GHASH'],
            ['MIC', '8 bytes', '16 bytes'],
            ['Nonce', '13 bytes: Priority ‖ A2 ‖ PN', '12 bytes: A2 ‖ PN'],
            ['Where it is used', 'WPA2, WPA3-Personal', 'WPA3-Enterprise 192-bit, newer Wi-Fi 7 devices'],
          ],
        },
        {
          kind: 'p',
          text:
            'Broadcast and multicast frames are encrypted with the same CCMP, but with the **GTK** key. ' +
            'When **PMF** is enabled, management frames (for example, the deauth disconnect command) ' +
            'are protected like this: frames addressed to one client are encrypted with its TK, and ' +
            'broadcast ones are signed with the **IGTK** key using the **BIP** protocol (Broadcast ' +
            'Integrity Protocol, based on AES-CMAC).',
        },
      ],
    },
    // ------------------------------------------------------------------ 7
    {
      id: 'enterprise',
      title: 'Enterprise: everyone signs in separately',
      tag: 'common',
      lead: 'In a company, a shared password is a bad idea: an employee who leaves takes it with them.',
      blocks: [
        {
          kind: 'p',
          text:
            'In Enterprise mode there is no shared network password. The client is checked by an ' +
            '**authentication server** (usually RADIUS) using the **EAP** protocol (Extensible ' +
            'Authentication Protocol). The access point only relays EAP messages between the client ' +
            '(in EAPOL frames) and the server (in RADIUS packets).',
        },
        {
          kind: 'list',
          items: [
            '**EAP-TLS** — both sides present certificates. The most reliable option: there are no passwords at all.',
            '**PEAP** and **EAP-TTLS** — first a protected TLS tunnel is set up (the server presents a ' +
              'certificate), and inside the tunnel the client enters a login and password (often with ' +
              'the old MSCHAPv2 protocol).',
          ],
        },
        {
          kind: 'p',
          text:
            'After a successful check, the server and the client each obtain, independently, a shared ' +
            'secret called the **MSK** (Master Session Key). The server passes it to the access point ' +
            'over the protected RADIUS channel, and both sides take **PMK = the first 256 bits of the ' +
            'MSK**. After that comes the same 4-Way Handshake as in Personal. Every user and every ' +
            'session gets its own PMK.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The weak spot is certificate checking',
          text:
            'If a device does not check the server’s certificate (or the user is used to tapping ' +
            '“Trust”), an attacker can set up an “evil twin” of the network with their own RADIUS ' +
            'server, and the client hands over its PEAP/MSCHAPv2 sign-in data, which is then cracked ' +
            'offline. The defence: configure devices to check the server’s certificate and name — or, ' +
            'better, switch to EAP-TLS.',
        },
        {
          kind: 'p',
          text:
            '**WPA3-Enterprise 192-bit** is a mode for organisations with stricter requirements (the ' +
            'CNSA set of algorithms): GCMP-256 for traffic encryption, BIP-GMAC-256 for signing ' +
            'management frames, HMAC-SHA-384 for key derivation, and EAP-TLS with ECDHE and ECDSA on ' +
            'the P-384 curve or RSA of 3072 bits or more. Ordinary WPA3-Enterprise is WPA2-Enterprise ' +
            'with mandatory PMF.',
        },
      ],
    },
    // ------------------------------------------------------------------ 8
    {
      id: 'wpa3',
      title: 'WPA3-Personal: the SAE exchange (Dragonfly)',
      tag: 'wpa3',
      lead: 'How to prove you know the password without giving an eavesdropper a single chance to check their guess.',
      blocks: [
        { kind: 'h', text: 'Why SAE was needed' },
        {
          kind: 'p',
          text:
            'In WPA2, a captured handshake gives the attacker a “test they can mark themselves”: they ' +
            'try passwords from a dictionary and check each one against the MIC at home, millions of ' +
            'times per second. **SAE** (Simultaneous Authentication of Equals, part of the IEEE 802.11 ' +
            'standard, based on the Dragonfly protocol from RFC 7664) is designed so that checking a ' +
            'guess against a recording of the exchange is **impossible**. Every attempt needs a live ' +
            'exchange with the access point — and those can be limited and noticed.',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'An analogy',
          text:
            'Two people want to make sure they know the same secret word while talking in front of ' +
            'witnesses. In WPA2, they in effect write on a board “the word put through a meat grinder”, ' +
            'and a witness can put their own guesses through the same grinder until one matches. In ' +
            'SAE, each person mixes the word with their own one-time random number that only they ' +
            'know. From what is written on the board, the word cannot be separated from the random ' +
            'numbers — even by trying words one by one. Yet the two participants, who both know the ' +
            'word, arrive at the same shared key.',
        },
        {
          kind: 'p',
          text:
            'This class of protocols is called **PAKE** (Password-Authenticated Key Exchange). SAE is ' +
            'built on **elliptic curves**: instead of ordinary numbers, it works with points on the ' +
            'curve y² = x³ + ax + b, which can be “added” and “multiplied by a number”. Multiplying a ' +
            'point by a number is easy, but finding the number from the result is practically ' +
            'impossible (the discrete logarithm problem). By default, **group 19** is used — the NIST ' +
            'P-256 curve, which everyone must support; less often, groups 20 (P-384) and 21 (P-521).',
        },
        {
          kind: 'p',
          text:
            'SAE replaces the “empty” Open System authentication: it uses **Authentication** frames ' +
            'with algorithm number 3, and they run **before association**. The result of SAE is a ' +
            'shared PMK. After that come association and the 4-Way Handshake, as in WPA2.',
        },
        {
          kind: 'sequence',
          variants: [SEQ_WPA3],
          caption:
            'The SAE exchange (four Authentication frames) happens before association. The 4-Way ' +
            'Handshake stays, but it runs on the PMK from SAE.',
        },
        { kind: 'h', text: 'Step 1. The password becomes the PWE point' },
        {
          kind: 'p',
          text:
            'First, both sides independently turn the password into a secret point on the curve — the ' +
            '**PWE** (Password Element). Only someone who knows the password can obtain it. The ' +
            'standard describes two ways to do this.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'Hunting-and-Pecking — “searching by trial” (the original method)',
              meta: 'IEEE 802.11-2020, §12.4.4.2.2',
              text:
                'For counter = 1, 2, 3, … the device computes `pwd-seed = HMAC-SHA256(max(MAC) ‖ ' +
                'min(MAC), password ‖ counter)`, and from it a candidate `x = KDF-256(pwd-seed, "SAE ' +
                'Hunting and Pecking", p)`. If x is less than the curve modulus p and x³ + ax + b is a ' +
                '**quadratic residue** (a square root of it exists), the point is found: y = √(x³ + ax ' +
                '+ b), and of the two roots, the one whose parity matches the lowest bit of pwd-seed is ' +
                'chosen. Otherwise, the next counter is tried.\n\nThe problem: the number of attempts ' +
                'depends on the password. If an implementation leaves the loop as soon as it finds the ' +
                'point, the running time gives away information about the password. So the loop must ' +
                '**always run at least k iterations** (k = 40 in practice), use a random “dummy” in ' +
                'place of the password once the point is found, and blind the residue check with ' +
                'random numbers (as described in RFC 7664). Early implementations did not do this — ' +
                'hence the Dragonblood attacks.',
            },
            {
              title: 'Hash-to-Element (H2E) — no loops, constant time',
              meta: 'IEEE 802.11-2020, §12.4.4.2.3 · mandatory on 6 GHz',
              text:
                'First, a helper point **PT** is computed from the SSID and the password: `pwd-seed = ' +
                'HKDF-Extract(SSID, password)`, then two numbers `u1 = HKDF-Expand(pwd-seed, "SAE Hash to ' +
                'Element u1 P1", 48) mod p` and `u2` (with the label “…u2 P2”). Each one is mapped onto ' +
                'the curve by the **SSWU** function (simplified Shallue–van de Woestijne–Ulas, RFC 9380 ' +
                '§6.6.2; for P-256 the parameter is Z = −10), and PT = SSWU(u1) + SSWU(u2). PT can be ' +
                'computed in advance — it depends only on the network and the password.\n\nThen, for a ' +
                'specific pair of devices: `val = HKDF-Extract(0…0, max(MAC) ‖ min(MAC)) mod (r − 1) + ' +
                '1` and **PWE = val · PT**. No loops and no branches — the time does not depend on the ' +
                'password. A side signals that it uses H2E with status code 126 in the Commit frame.',
            },
          ],
        },
        {
          kind: 'terms',
          items: [
            {
              term: 'HKDF',
              definition:
                'HMAC-based Key Derivation Function (RFC 5869): the “Extract” step compresses the input ' +
                'into a uniform key, and the “Expand” step stretches it to the required length.',
            },
            {
              term: 'Quadratic residue',
              definition:
                'a number that has a square root modulo p. About half of all numbers are residues, so ' +
                '“searching by trial” finds a point in two attempts on average.',
            },
            {
              term: 'r — the group order',
              definition:
                'the total number of points in the curve’s group. All secret numbers (“scalars”) are taken modulo r.',
            },
            { term: 'Scalar', definition: 'an ordinary (very large) number that a curve point is multiplied by.' },
          ],
        },
        { kind: 'h', text: 'Step 2. Commit — each side “throws in” its pair of numbers' },
        { kind: 'formula', text: 'scalar = (rand + mask) mod r\nelement = −(mask · PWE)' },
        {
          kind: 'p',
          text:
            'Each side picks two **random** secret numbers, rand and mask, from the range (1, r) and ' +
            'sends a **Commit** frame: Authentication Algorithm = 3 (SAE), Transaction Sequence = 1, ' +
            'Status (0, or 126 for H2E), the group number (19), the **scalar** (32 bytes) and the ' +
            '**element** — a point with x and y coordinates of 32 bytes each. Adding mask hides rand, ' +
            'and the PWE is hidden inside the element by multiplying it by mask.',
        },
        {
          kind: 'p',
          text:
            'When a side receives the other side’s Commit, it must **validate** it: the scalar lies in ' +
            'the range (1, r), the element really is a point on the curve, and the pair is not the same ' +
            'as its own (otherwise it is a “reflected” Commit: the attacker simply sent the message ' +
            'back to its sender).',
        },
        {
          kind: 'callout',
          tone: 'info',
          title: 'Anti-clogging — protection against flooding',
          text:
            'Curve arithmetic is heavy work. So that nobody can overwhelm the router with thousands of ' +
            'fake Commits from made-up MAC addresses, an overloaded access point replies with status ' +
            '76 and a **token** — the client must repeat its Commit with this token. This checks that ' +
            'the sender really receives replies at its address. If the proposed group is not ' +
            'supported, the access point replies with status 77, and the client tries another one.',
        },
        { kind: 'h', text: 'Step 3. The shared secret and the keys' },
        { kind: 'formula', text: 'K = rand · (peer_scalar · PWE + peer_element)\nk = x-coordinate of point K' },
        {
          kind: 'p',
          text:
            'Let’s plug in what the other side sent: peer_scalar · PWE + peer_element = (rand′ + mask′) ' +
            '· PWE − mask′ · PWE = rand′ · PWE. Multiplying this by its own rand, each side gets ' +
            '**rand · rand′ · PWE** — the same point. Only someone who knows the PWE (that is, the ' +
            'password) **and** one of the secret rand values can compute it. An eavesdropper knows ' +
            'neither.',
        },
        {
          kind: 'formula',
          text:
            'keyseed = HMAC-SHA256(0…0, k)\n' +
            'KCK ‖ PMK = KDF-512(keyseed, "SAE KCK and PMK", (scalar + peer_scalar) mod r)\n' +
            'PMKID = first 16 bytes of the number (scalar + peer_scalar) mod r',
        },
        {
          kind: 'p',
          text:
            'From k, the 802.11 **KDF** function (HMAC-SHA256 with a counter and the output length) ' +
            'produces 64 bytes: the first 32 are the **KCK** used for confirmation, the next 32 are the ' +
            '**PMK**. Note the **PMKID**: in SAE it is computed from the public scalars, not from the ' +
            'password. That is why the PMKID attack is useless against WPA3.',
        },
        { kind: 'h', text: 'Step 4. Confirm — mutual confirmation' },
        {
          kind: 'formula',
          text: 'confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer_scalar ‖ peer_element)',
        },
        {
          kind: 'p',
          text:
            'Each side sends a **Confirm** frame (Transaction Sequence = 2): a 2-byte send-confirm ' +
            'counter and a 32-byte confirm value. The other side recomputes it with its own KCK ' +
            '(swapping the “own” and “peer” fields) and compares. If they match, both sides have the ' +
            'same k — and therefore the same password. If not, the password is wrong, and the ' +
            'eavesdropper has learned nothing except the fact that it failed.',
        },
        { kind: 'h', text: 'Step 5. Association and the 4-Way Handshake' },
        {
          kind: 'p',
          text:
            'After SAE, the client associates (its RSNE has AKM `00-0F-AC:8` and the PMF flags), and ' +
            'the familiar 4-Way Handshake runs on the PMK from SAE. The differences from WPA2 are in ' +
            'the algorithms, which are set by AKM 8:',
        },
        {
          kind: 'list',
          items: [
            'PTK = **KDF-SHA256-384**(PMK, "Pairwise key expansion", the same block of min/max MACs ' +
              'and nonces) — instead of the SHA-1-based PRF;',
            'MIC = **AES-128-CMAC**(KCK, frame) instead of HMAC-SHA1; Key Descriptor Version = 0;',
            'in M3, the **IGTK** must be sent in addition to the GTK — because PMF is enabled.',
          ],
        },
        {
          kind: 'links',
          items: [
            {
              label: 'Module 2 — WPA3 SAE (Dragonfly)',
              route: '/wpa3',
              note: 'PWE, Commit, Confirm and the 4-Way Handshake, using your own password',
            },
          ],
        },
        { kind: 'h', text: 'What else WPA3 brings' },
        {
          kind: 'list',
          items: [
            '**Forward secrecy**: the PMK depends on one-time rand values that are forgotten right ' +
              'away. Even if the network password leaks later, traffic recorded earlier cannot be ' +
              'decrypted. With WPA2-PSK, it can.',
            '**Mandatory PMF** (IEEE 802.11w): deauth and disassoc management frames are signed, so ' +
              'a fake “disconnect” cannot be forged. The **SA Query** mechanism stops a connection ' +
              'from being reset by a fake re-association.',
            '**Transition mode** — a compatibility mode: one network accepts both WPA3 clients (SAE) ' +
              'and older WPA2 clients (PSK) with the same password. It is convenient, but older ' +
              'clients keep all the weaknesses of WPA2, and an attacker may try to “talk” new clients ' +
              'into using WPA2. The countermeasure is the **Transition Disable** indication: the ' +
              'network tells the client “do not agree to WPA2 here any more”.',
            '**SAE-PK** — an extension for public networks with a known password (cafés): the ' +
              'password contains a fingerprint of the access point’s public key, so an “evil twin” ' +
              'that knows the password still cannot pass itself off as the real network.',
            '**OWE** (Opportunistic Wireless Encryption, RFC 8110; certified as Wi-Fi Enhanced Open) ' +
              '— for networks with no password at all: the client and the access point perform a ' +
              'Diffie–Hellman exchange and encrypt the traffic. It does not protect against an evil ' +
              'twin, but a passive eavesdropper can no longer see anything.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 9
    {
      id: 'compare',
      title: 'Comparing the generations',
      tag: 'common',
      lead: 'One table to see exactly what changed from one generation to the next.',
      blocks: [
        {
          kind: 'table',
          head: ['', 'WEP', 'WPA (TKIP)', 'WPA2', 'WPA3'],
          rows: [
            ['Year', '1997', '2003', '2004', '2018'],
            ['Traffic cipher', 'RC4', 'RC4 (TKIP)', 'AES-CCMP', 'AES-CCMP, GCMP-256'],
            ['Integrity', 'CRC-32 — can be forged', 'Michael — weak', 'CBC-MAC (CCMP)', 'CBC-MAC, GMAC'],
            ['Password sign-in', 'the key is used directly', 'PSK + 4-Way', 'PSK + 4-Way', 'SAE + 4-Way'],
            [
              'Offline password cracking',
              'not needed — the key itself can be recovered',
              'yes',
              'yes: handshake, PMKID',
              'no',
            ],
            ['Forward secrecy', 'no', 'no', 'no', 'yes'],
            ['Management frame protection (PMF)', 'no', 'no', 'optional', 'mandatory'],
            ['Status today', 'broken', 'broken, deprecated', 'acceptable with a strong password', 'recommended'],
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 10
    {
      id: 'strengths',
      title: 'Strengths and weaknesses',
      tag: 'common',
      lead: 'An honest summary: what each standard does well and where it is weak.',
      blocks: [
        { kind: 'h', text: 'WPA2' },
        {
          kind: 'proscons',
          columns: [
            {
              title: 'Strengths',
              tone: 'ok',
              items: [
                'A strong AES-CCMP cipher: there are no practical attacks on the cipher itself.',
                'A fresh PTK for every connection — thanks to ANonce and SNonce.',
                'Mutual checking: M2 proves that the client knows the password, M3 proves that the access point does.',
                'Protection against replays (Replay Counter, PN) and against downgrades (RSNE in M3).',
                'Supported by almost every device.',
              ],
            },
            {
              title: 'Weaknesses',
              tone: 'danger',
              items: [
                'Offline password cracking from a single captured handshake or PMKID.',
                'No forward secrecy: anyone who learns the password later can decrypt recorded traffic.',
                'Everyone who knows the password is an “insider”: they can compute another user’s PTK and ' +
                  'set up a fake access point.',
                'PMF is not mandatory — deauth attacks work.',
                'A flaw in the handshake protocol itself (KRACK, 2017) has been fixed by updates, but old devices remain vulnerable.',
              ],
            },
          ],
        },
        { kind: 'h', text: 'WPA3' },
        {
          kind: 'proscons',
          columns: [
            {
              title: 'Strengths',
              tone: 'ok',
              items: [
                'SAE: a password guess cannot be checked against a capture — offline cracking is impossible.',
                'Forward secrecy: each connection has its own PMK.',
                'Even a weak password can only be guessed online, one attempt per exchange — slowly and noticeably.',
                'Mandatory PMF: deauth frames cannot be forged.',
                'H2E runs in constant time; there is a 192-bit mode and OWE for special cases.',
              ],
            },
            {
              title: 'Weaknesses',
              tone: 'danger',
              items: [
                'Transition mode leaves older clients with WPA2’s weaknesses and opens the door to downgrade attacks.',
                'Early SAE implementations (Hunting-and-Pecking) were vulnerable to timing and cache leaks ' +
                  '(Dragonblood).',
                'SAE is computationally heavy — anti-clogging is needed to resist denial of service.',
                'A weak password can still be guessed online, and anyone who knows the password can set up ' +
                  'an evil twin (unless SAE-PK is used).',
                'Not all older devices support WPA3.',
              ],
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 11
    {
      id: 'attacks',
      title: 'Attacks and vulnerabilities',
      tag: 'attack',
      lead:
        'What has been broken in Wi-Fi and how it was fixed. All of this is here to help you understand ' +
        'the defences; on this site, attacks are only simulated on your own data.',
      blocks: [
        {
          kind: 'table',
          head: ['Attack', 'Year', 'Who is affected', 'How it works', 'Defence'],
          rows: [
            [
              'Offline handshake cracking',
              'since 2004',
              'WPA/WPA2-Personal',
              'capture M1 + M2; for each dictionary word, compute PMK → PTK → MIC and compare it with the MIC from M2',
              'a long random password; WPA3',
            ],
            [
              'PMKID attack (Jens Steube)',
              '2018',
              'WPA2-Personal, if the access point puts the PMKID in M1',
              'the PMKID comes from the very first M1 frame — no live client is needed; guess PMK → PMKID',
              'a long password; WPA3 (where the PMKID does not depend on the password)',
            ],
            [
              '“Insider threat” — no forward secrecy',
              '—',
              'WPA2-Personal',
              'someone who knows the password sees a neighbour’s handshake, computes their PTK and reads their traffic',
              'WPA3 (SAE) or Enterprise',
            ],
            [
              'Evil twin',
              '—',
              'PSK networks; Enterprise without certificate checking',
              'a fake access point with the same SSID (and password) lures clients in',
              'SAE-PK; certificate checking in Enterprise',
            ],
            [
              'Deauth / disassoc',
              '—',
              'networks without PMF',
              'a forged “disconnect” command: denial of service and a forced reconnection to catch ' +
                'the handshake',
              'PMF (802.11w), mandatory in WPA3',
            ],
            [
              'KRACK (Mathy Vanhoef)',
              '2017',
              'WPA/WPA2: a flaw in the standard itself; clients were hit hardest',
              'replaying M3 makes the client reinstall a key already in use and reset the PN → ' +
                'nonce and “keystream” reuse → frames can be decrypted and forged',
              'OS and firmware updates',
            ],
            [
              'WPS PIN (Reaver; Pixie Dust)',
              '2011; 2014',
              'routers with WPS enabled',
              'the 8-digit PIN is checked in two halves — at most about 11,000 attempts; Pixie Dust ' +
                'works offline because some chips use weak random numbers',
              'turn off WPS',
            ],
            [
              'Beck–Tews, Ohigashi–Morii',
              '2008; 2009',
              'TKIP (WPA)',
              'decrypting and forging short frames through weaknesses in TKIP and Michael',
              'do not use TKIP',
            ],
            [
              'Hole196',
              '2010',
              'WPA2, attacker inside the network',
              'a client that knows the GTK sends fake broadcast frames pretending to be the access point ' +
                '(for example, for ARP spoofing)',
              'client isolation, ARP monitoring',
            ],
            [
              'Dragonblood (Vanhoef, Ronen)',
              '2019',
              'early WPA3-SAE implementations',
              'timing and cache leaks in Hunting-and-Pecking; downgrade to WPA2 in transition mode; ' +
                'group downgrade; DoS',
              'H2E, constant time, Transition Disable, updates',
            ],
            [
              'FragAttacks (Vanhoef)',
              '2021',
              'all generations, including WPA3',
              'design flaws in frame aggregation and fragmentation plus implementation bugs: frames ' +
                'can be injected, and sometimes extracted',
              'firmware updates',
            ],
            [
              'Online password guessing',
              '—',
              'WPA3 with a weak password',
              'one guess means one full SAE exchange with the access point',
              'a long password, limits on attempts',
            ],
          ],
        },
        { kind: 'h', text: 'What offline cracking costs' },
        {
          kind: 'p',
          text:
            'Cracking WPA2 is held back by PBKDF2: every password takes 8192 HMAC-SHA1 computations. ' +
            'Graphics cards run these in parallel. For an estimate, let’s assume **1 million passwords ' +
            'per second** — roughly what a powerful graphics card can do; the real speed depends on the ' +
            'hardware.',
        },
        {
          kind: 'table',
          head: ['Password', 'Combinations', 'Time to try them all at 10⁶ passwords/s'],
          rows: [
            ['8 digits', '10⁸', '≈ 2 minutes'],
            ['8 lowercase Latin letters', '26⁸ ≈ 2.1·10¹¹', '≈ 2.4 days'],
            ['8 characters: upper- and lowercase letters and digits', '62⁸ ≈ 2.2·10¹⁴', '≈ 7 years'],
            ['12 random lowercase letters', '26¹² ≈ 9.5·10¹⁶', '≈ 3,000 years'],
            ['4 random words from a 7776-word list', '7776⁴ ≈ 3.7·10¹⁵', '≈ 116 years'],
            ['6 random words from the same list', '7776⁶ ≈ 2.2·10²³', '≈ 7 billion years'],
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          text:
            'This table only holds for **random** passwords. Human passwords (“Summer2024!”, ' +
            '“qwerty123”) are found much faster with dictionaries and mutation rules: an attacker first ' +
            'tries what people choose most often.',
        },
        {
          kind: 'links',
          items: [
            {
              label: 'Module 3 — Hashcat 22000 simulator',
              route: '/hashcat',
              note: 'cracking with a mini-dictionary via PMKID and via EAPOL, on your own data',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 12
    {
      id: 'advice',
      title: 'How to set up your network properly',
      tag: 'common',
      lead: 'A short list of what really improves protection at home and in the office.',
      blocks: [
        {
          kind: 'list',
          items: [
            '**WPA3-Personal**, if all your devices support it. Otherwise, WPA2/WPA3 transition mode ' +
              '— not plain WPA2.',
            '**A long random passphrase**: at least 12–16 random characters or 4–6 random words. Not ' +
              'a name, not a date, not a dictionary word.',
            '**Turn off WPS.** The WPS PIN and button bypass even a strong password.',
            '**PMF**: “capable” in transition mode, “required” in pure WPA3.',
            '**AES (CCMP) only.** No WEP, WPA or TKIP, not even in “mixed” modes.',
            '**Update the router firmware and your devices’ OS** — this is how KRACK, FragAttacks and ' +
              'Dragonblood get fixed.',
            '**A guest network** with a separate password and client isolation — for guests and “smart” devices.',
            '**Enterprise**: EAP-TLS with certificates; if passwords are used, be sure to configure ' +
              'devices to check the server’s certificate and name.',
            '**Change the password** if it may have leaked. In WPA2, this also protects future traffic ' +
              'from people who knew the old one.',
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 13
    {
      id: 'hands-on',
      title: 'Try it yourself',
      tag: 'common',
      lead: 'Theory sinks in when you change the password yourself and watch every byte change.',
      blocks: [
        {
          kind: 'links',
          items: [
            {
              label: 'Module 1 — WPA2 4-Way Handshake',
              route: '/wpa2',
              note: 'PMK, PTK, frames M1–M4, MIC and AES Key Wrap — on parameters you set yourself',
            },
            {
              label: 'Module 2 — WPA3 SAE (Dragonfly)',
              route: '/wpa3',
              note: 'PWE, Commit, Confirm, KCK and PMK, then the 4-Way Handshake with AES-CMAC',
            },
            {
              label: 'Module 3 — Hashcat 22000 simulator',
              route: '/hashcat',
              note: 'why a captured WPA2 handshake can be cracked offline',
            },
          ],
        },
        { kind: 'h', text: 'Python scripts for experiments' },
        {
          kind: 'p',
          text:
            'The `python/` folder in the repository contains two teaching scripts with no external ' +
            'dependencies — all you need is the Python 3 standard library:',
        },
        {
          kind: 'list',
          items: [
            '`wpa2_handshake.py` — the WPA2 chain: PMK (PBKDF2), PTK (PRF), KCK/KEK/TK, MIC and PMKID ' +
              'for one candidate password. The same math that Hashcat uses in mode 22000.',
            '`wpa3_sae.py` — a model of SAE on the P-256 curve (Hunting-and-Pecking, Commit, shared ' +
              'secret, KCK and PMK, Confirm), followed by the 4-Way Handshake. Both sides are computed ' +
              'independently and checked against each other.',
          ],
        },
        { kind: 'formula', text: 'python3 python/wpa2_handshake.py\npython3 python/wpa3_sae.py' },
        {
          kind: 'p',
          text:
            'The inputs are easy to change right in the code: in `wpa3_sae.py`, use the block marked ' +
            '“КОНФИГ” (config) at the top of the file (SSID, password, MAC addresses); in ' +
            '`wpa2_handshake.py`, the variables in the section marked “Исходные данные” (input data).',
        },
        {
          kind: 'callout',
          tone: 'info',
          text:
            'The scripts are a compact teaching model, and some details of the standard are simplified ' +
            'in them: the 4-Way Handshake after SAE is computed by WPA2 rules (without KDF-SHA256 and ' +
            'AES-CMAC), the PWE search leaves the loop at the first hit, and the EAPOL frame in the ' +
            'WPA2 script is a placeholder made of zeros. The exact implementation following IEEE ' +
            '802.11-2020, checked against the official test vectors, runs on this site — in Modules ' +
            '1–3.',
        },
        {
          kind: 'links',
          items: [
            {
              label: 'The python/ folder on GitHub',
              href: 'https://github.com/alexmelanfromringo/WPA2-3demo/tree/001-wifi-security-spa/python',
            },
          ],
        },
      ],
    },
    // ------------------------------------------------------------------ 14
    {
      id: 'sources',
      title: 'Sources and standards',
      tag: 'common',
      blocks: [
        {
          kind: 'links',
          items: [
            { label: 'IEEE 802.11-2020 — §12.4 (SAE), §12.7 (keys and the 4-Way Handshake)', href: 'https://standards.ieee.org/ieee/802.11/7028/' },
            { label: 'IEEE 802.11i-2004 — WPA2 / RSN', href: 'https://en.wikipedia.org/wiki/IEEE_802.11i-2004' },
            { label: 'IEEE 802.11w-2009 — Protected Management Frames', href: 'https://en.wikipedia.org/wiki/IEEE_802.11w-2009' },
            { label: 'Wi-Fi Alliance — Wi-Fi security and the WPA3 specification', href: 'https://www.wi-fi.org/discover-wi-fi/security' },
            { label: 'RFC 7664 — Dragonfly Key Exchange', href: 'https://www.rfc-editor.org/rfc/rfc7664' },
            { label: 'RFC 9380 — Hashing to Elliptic Curves (SSWU)', href: 'https://www.rfc-editor.org/rfc/rfc9380' },
            { label: 'RFC 8018 — PKCS #5: PBKDF2', href: 'https://www.rfc-editor.org/rfc/rfc8018' },
            { label: 'RFC 2104 — HMAC', href: 'https://www.rfc-editor.org/rfc/rfc2104' },
            { label: 'RFC 5869 — HKDF', href: 'https://www.rfc-editor.org/rfc/rfc5869' },
            { label: 'RFC 3394 — AES Key Wrap', href: 'https://www.rfc-editor.org/rfc/rfc3394' },
            { label: 'RFC 4493 — AES-CMAC', href: 'https://www.rfc-editor.org/rfc/rfc4493' },
            { label: 'RFC 3610 — Counter with CBC-MAC (CCM)', href: 'https://www.rfc-editor.org/rfc/rfc3610' },
            { label: 'RFC 8110 — Opportunistic Wireless Encryption', href: 'https://www.rfc-editor.org/rfc/rfc8110' },
            { label: 'KRACK — Key Reinstallation Attacks (2017)', href: 'https://www.krackattacks.com/' },
            { label: 'Dragonblood — an analysis of WPA3 SAE (2019)', href: 'https://wpa3.mathyvanhoef.com/' },
            { label: 'FragAttacks (2021)', href: 'https://www.fragattacks.com/' },
            { label: 'PMKID attack — announcement by Jens Steube (2018)', href: 'https://hashcat.net/forum/thread-7717.html' },
            { label: 'hostapd / wpa_supplicant — the reference open-source implementation', href: 'https://w1.fi/' },
          ],
        },
      ],
    },
  ],
};
