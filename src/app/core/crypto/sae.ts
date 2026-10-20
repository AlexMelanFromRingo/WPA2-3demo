/**
 * WPA3-Personal: SAE (Simultaneous Authentication of Equals, «Dragonfly»)
 * на группе 19 (NIST P-256) — IEEE 802.11-2020 §12.4, RFC 7664.
 *
 * Реализовано по стандарту и сверено с официальными тест-векторами
 * IEEE 802.11-2020 Annex J.10 (sae.spec.ts):
 *   • вывод PWE двумя способами:
 *       Hunting-and-Pecking (§12.4.4.2.2) — цикл минимум k = 40 итераций,
 *         после находки пароль подменяется случайной строкой;
 *       Hash-to-Element (§12.4.4.2.3) — PT через HKDF + SSWU (RFC 9380 §6.6.2),
 *         затем PWE = val·PT;
 *   • Commit: scalar = (rand + mask) mod r, element = −(mask·PWE), rand и mask случайны;
 *   • проверка чужого Commit (диапазон скаляра, точка на кривой, «отражение»);
 *   • k = x(rand·(peer-scalar·PWE + PEER-ELEMENT)), keyseed = HMAC-SHA256(0³², k),
 *     KCK ‖ PMK = KDF-512(keyseed, "SAE KCK and PMK", (scalar + peer-scalar) mod r),
 *     PMKID = первые 16 байт (scalar + peer-scalar) mod r;
 *   • Confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer-scalar ‖ peer-element);
 *   • затем 4-Way Handshake для AKM 00-0F-AC:8 (KDF-SHA-256, AES-128-CMAC, PMF).
 *
 * Эллиптическая арифметика (сложение, умножение точки) — через audited-библиотеку
 * `@noble/curves`; полевые операции SSWU и H&P записаны явно, по формулам стандарта.
 * BigInt в JavaScript не даёт постоянного времени — для учебного стенда это
 * допустимо, но в настоящих реализациях эти шаги обязаны быть constant-time.
 */
import { p256 } from '@noble/curves/nist.js';
import { hexToBytes, parseMac, utf8ToBytes } from './hex';
import { type FourWayResult, runFourWay } from './fourway';
import {
  compareBytes,
  concatBytes,
  equalBytes,
  hkdfExpand,
  hkdfExtract,
  hmacSha256,
  kdfSha256,
  le16,
} from './primitives';

type CurvePoint = typeof p256.Point.BASE;

const CURVE = p256.Point.CURVE();
/** Простое p — модуль поля кривой P-256. */
export const P = CURVE.p;
/** r — порядок группы точек (в стандарте 802.11 он обозначается r). */
export const R = CURVE.n;
const A = CURVE.a;
const B = CURVE.b;
/** Z для SSWU на группе 19 (IEEE 802.11-2020, табл. 12-1; RFC 9380 для P-256). */
const SSWU_Z = mod(-10n, P);

/** Номер группы SAE: 19 = 256-битная эллиптическая кривая NIST P-256. */
export const SAE_GROUP = 19;
/** Минимальное число итераций цикла H&P для группы 19 (защита от тайминг-атак). */
export const HNP_MIN_ITERATIONS = 40;
/** Коды статуса кадра Authentication, важные для SAE. */
export const SAE_STATUS = {
  SUCCESS: 0,
  ANTI_CLOGGING_TOKEN_REQUIRED: 76,
  UNSUPPORTED_GROUP: 77,
  HASH_TO_ELEMENT: 126,
} as const;

// ------------------------------------------------------------------ поле

function mod(value: bigint, modulus: bigint): bigint {
  const result = value % modulus;
  return result >= 0n ? result : result + modulus;
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n;
  let b = mod(base, modulus);
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) {
      result = (result * b) % modulus;
    }
    b = (b * b) % modulus;
    e >>= 1n;
  }
  return result;
}

/** Обратный элемент по модулю p (малая теорема Ферма); inv0(0) = 0, как в RFC 9380. */
function inv0(value: bigint): bigint {
  return modPow(value, P - 2n, P);
}

/** Квадратичный вычет (критерий Эйлера). Ноль считается квадратом — как is_square в RFC 9380. */
function isSquare(value: bigint): boolean {
  const v = mod(value, P);
  return v === 0n || modPow(v, (P - 1n) / 2n, P) === 1n;
}

/** Квадратный корень: p ≡ 3 (mod 4), поэтому √v = v^((p+1)/4). */
function sqrt(value: bigint): bigint {
  return modPow(value, (P + 1n) / 4n, P);
}

/** Правая часть уравнения кривой: x³ + a·x + b (mod p). */
function curveRhs(x: bigint): bigint {
  return mod(x * x * x + A * x + B, P);
}

function bytesToBigint(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

/** Целое → 32 байта big-endian (скаляры и координаты P-256 < 2²⁵⁶). */
export function bigintToBytes32(value: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let remaining = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return out;
}

function pointFromXY(x: bigint, y: bigint): CurvePoint {
  const point = p256.Point.fromAffine({ x, y });
  point.assertValidity();
  return point;
}

/** Кодирование элемента для кадров SAE: x ‖ y, по 32 байта big-endian (64 байта). */
export function encodeElement(point: CurvePoint): Uint8Array {
  const { x, y } = point.toAffine();
  return concatBytes(bigintToBytes32(x), bigintToBytes32(y));
}

/** Пара MAC в порядке «больший ‖ меньший» — как требует стандарт для SAE. */
function maxMin(macA: Uint8Array, macB: Uint8Array): Uint8Array {
  return compareBytes(macA, macB) > 0 ? concatBytes(macA, macB) : concatBytes(macB, macA);
}

/** Криптостойкое случайное число в диапазоне [2, r−1] (rand и mask ∈ (1, r)). */
function randomScalar(): bigint {
  for (;;) {
    const candidate = bytesToBigint(globalThis.crypto.getRandomValues(new Uint8Array(32)));
    if (candidate > 1n && candidate < R) {
      return candidate;
    }
  }
}

// ------------------------------------------------------- PWE: Hunting-and-Pecking

/** Одна итерация цикла H&P (для визуализации). */
export interface HnpIteration {
  counter: number;
  pwdSeed: Uint8Array;
  pwdValue: Uint8Array;
  /** pwd-value < p — значение годится как координата x. */
  belowP: boolean;
  /** x³ + ax + b — квадратичный вычет: точка с таким x существует. */
  isQr: boolean;
  /** Именно эта итерация дала x (первая удачная). */
  chosen: boolean;
  /** Итерация после находки: вместо пароля — случайная строка (маскировка числа итераций). */
  afterFound: boolean;
}

/** Результат вывода PWE методом Hunting-and-Pecking. */
export interface HnpResult {
  /** Ключ HMAC: max(MAC) ‖ min(MAC). */
  macKey: Uint8Array;
  iterations: HnpIteration[];
  /** Номер итерации, на которой найдено x. */
  foundCounter: number;
  /** pwd-seed удачной итерации (save) — его младший бит выбирает y. */
  save: Uint8Array;
  x: Uint8Array;
  /** y до выбора чётности (√(x³ + ax + b)). */
  yRoot: Uint8Array;
  /** Пришлось взять p − y, чтобы чётность совпала с LSB(save). */
  yFlipped: boolean;
  pwe: Uint8Array;
}

async function deriveHnpInternal(
  password: Uint8Array,
  macA: Uint8Array,
  macB: Uint8Array,
): Promise<{ point: CurvePoint; info: HnpResult }> {
  const macKey = maxMin(macA, macB);
  const prime = bigintToBytes32(P);
  const iterations: HnpIteration[] = [];
  let base: Uint8Array = password;
  let found = false;
  let x = 0n;
  let save: Uint8Array = new Uint8Array(32);
  let foundCounter = 0;

  // Цикл идёт ВСЕГДА минимум k итераций — даже если x найден на первой.
  for (let counter = 1; counter <= HNP_MIN_ITERATIONS || !found; counter++) {
    if (counter > 255) {
      throw new Error('PWE не найден за 255 итераций');
    }
    const pwdSeed = await hmacSha256(macKey, concatBytes(base, new Uint8Array([counter])));
    const pwdValue = await kdfSha256(pwdSeed, 'SAE Hunting and Pecking', prime, 256);
    const candidate = bytesToBigint(pwdValue);
    const belowP = candidate < P;
    const isQr = belowP && isSquare(curveRhs(candidate)) && curveRhs(candidate) !== 0n;
    const chosen = isQr && !found;
    iterations.push({ counter, pwdSeed, pwdValue, belowP, isQr, chosen, afterFound: found });
    if (chosen) {
      x = candidate;
      save = pwdSeed;
      foundCounter = counter;
      found = true;
      // Дальше — случайная строка вместо пароля: внешне итерации неотличимы.
      base = globalThis.crypto.getRandomValues(new Uint8Array(password.length));
    }
  }

  const yRoot = sqrt(curveRhs(x));
  const yFlipped = (yRoot & 1n) !== BigInt(save[31] & 1);
  const y = yFlipped ? P - yRoot : yRoot;
  const point = pointFromXY(x, y);
  return {
    point,
    info: {
      macKey,
      iterations,
      foundCounter,
      save,
      x: bigintToBytes32(x),
      yRoot: bigintToBytes32(yRoot),
      yFlipped,
      pwe: encodeElement(point),
    },
  };
}

/** PWE методом Hunting-and-Pecking (IEEE 802.11-2020 §12.4.4.2.2). */
export async function deriveHnpPwe(
  password: string,
  macA: Uint8Array,
  macB: Uint8Array,
): Promise<HnpResult> {
  return (await deriveHnpInternal(utf8ToBytes(password), macA, macB)).info;
}

// ------------------------------------------------------- PWE: Hash-to-Element

/** Трассировка отображения SSWU (RFC 9380 §6.6.2) для одного u. */
export interface SswuTrace {
  u: Uint8Array;
  /** tv1 = inv0(Z²u⁴ + Zu²) = 0 — исключительный случай. */
  exceptional: boolean;
  x1: Uint8Array;
  gx1: Uint8Array;
  x2: Uint8Array;
  gx2: Uint8Array;
  /** gx1 — квадрат: берём x1, иначе x2. */
  gx1IsSquare: boolean;
  /** Пришлось взять −y, чтобы sgn0(y) = sgn0(u). */
  yNegated: boolean;
  point: Uint8Array;
}

function sswuInternal(u: bigint): { point: CurvePoint; trace: SswuTrace } {
  const u2 = mod(u * u, P);
  const zu2 = mod(SSWU_Z * u2, P);
  const tv1 = inv0(mod(zu2 * zu2 + zu2, P));
  const exceptional = tv1 === 0n;
  const x1 = exceptional
    ? mod(B * inv0(mod(SSWU_Z * A, P)), P)
    : mod(mod(-B * inv0(A), P) * (1n + tv1), P);
  const gx1 = curveRhs(x1);
  const x2 = mod(zu2 * x1, P);
  const gx2 = curveRhs(x2);
  const gx1IsSquare = isSquare(gx1);
  const x = gx1IsSquare ? x1 : x2;
  let y = sqrt(gx1IsSquare ? gx1 : gx2);
  const yNegated = (u & 1n) !== (y & 1n);
  if (yNegated) {
    y = mod(-y, P);
  }
  const point = pointFromXY(x, y);
  return {
    point,
    trace: {
      u: bigintToBytes32(u),
      exceptional,
      x1: bigintToBytes32(x1),
      gx1: bigintToBytes32(gx1),
      x2: bigintToBytes32(x2),
      gx2: bigintToBytes32(gx2),
      gx1IsSquare,
      yNegated,
      point: encodeElement(point),
    },
  };
}

/** SSWU (simplified Shallue–van de Woestijne–Ulas) для P-256: u → точка кривой. */
export function sswu(u: bigint): SswuTrace {
  return sswuInternal(mod(u, P)).trace;
}

/** Результат H2E: PT (зависит от SSID и пароля) и PWE (ещё и от MAC). */
export interface H2eResult {
  /** pwd-seed = HKDF-Extract(SSID, пароль [‖ идентификатор]). */
  pwdSeed: Uint8Array;
  /** pwd-value для u1 и u2 — по 48 байт HKDF-Expand. */
  pwdValue1: Uint8Array;
  pwdValue2: Uint8Array;
  sswu1: SswuTrace;
  sswu2: SswuTrace;
  /** PT = P1 + P2. */
  pt: Uint8Array;
  /** val до приведения: HKDF-Extract(0³², max(MAC) ‖ min(MAC)). */
  valHash: Uint8Array;
  /** val = valHash mod (r − 1) + 1. */
  val: Uint8Array;
  pwe: Uint8Array;
}

async function deriveH2eInternal(
  ssid: Uint8Array,
  password: Uint8Array,
  identifier: Uint8Array | undefined,
  macA: Uint8Array,
  macB: Uint8Array,
): Promise<{ point: CurvePoint; info: H2eResult }> {
  // Длина pwd-value: olen(p) + ⌈olen(p)/2⌉ = 32 + 16 = 48 байт (смещение ≤ 2⁻¹²⁸).
  const pwdSeed = await hkdfExtract(ssid, identifier ? concatBytes(password, identifier) : password);
  const pwdValue1 = await hkdfExpand(pwdSeed, 'SAE Hash to Element u1 P1', 48);
  const pwdValue2 = await hkdfExpand(pwdSeed, 'SAE Hash to Element u2 P2', 48);
  const first = sswuInternal(mod(bytesToBigint(pwdValue1), P));
  const second = sswuInternal(mod(bytesToBigint(pwdValue2), P));
  const pt = first.point.add(second.point);

  const valHash = await hkdfExtract(new Uint8Array(32), maxMin(macA, macB));
  const val = mod(bytesToBigint(valHash), R - 1n) + 1n;
  const pwe = pt.multiply(val);
  return {
    point: pwe,
    info: {
      pwdSeed,
      pwdValue1,
      pwdValue2,
      sswu1: first.trace,
      sswu2: second.trace,
      pt: encodeElement(pt),
      valHash,
      val: bigintToBytes32(val),
      pwe: encodeElement(pwe),
    },
  };
}

/** PWE методом Hash-to-Element (IEEE 802.11-2020 §12.4.4.2.3). */
export async function deriveH2ePwe(
  ssid: string,
  password: string,
  macA: Uint8Array,
  macB: Uint8Array,
  identifier?: string,
): Promise<H2eResult> {
  return (
    await deriveH2eInternal(
      utf8ToBytes(ssid),
      utf8ToBytes(password),
      identifier === undefined ? undefined : utf8ToBytes(identifier),
      macA,
      macB,
    )
  ).info;
}

// ------------------------------------------------------- Commit / Confirm

/** Данные фазы Commit одной стороны. */
interface CommitSecret {
  rand: bigint;
  mask: bigint;
  scalar: bigint;
  element: CurvePoint;
}

function makeCommit(pwe: CurvePoint, rand: bigint, mask: bigint): CommitSecret {
  const scalar = mod(rand + mask, R);
  if (scalar < 2n) {
    throw new Error('commit-scalar должен быть > 1 — нужно выбрать новые rand и mask');
  }
  return { rand, mask, scalar, element: pwe.multiply(mask).negate() };
}

function randomCommit(pwe: CurvePoint): CommitSecret {
  for (;;) {
    const rand = randomScalar();
    const mask = randomScalar();
    if (mod(rand + mask, R) > 1n) {
      return makeCommit(pwe, rand, mask);
    }
  }
}

/**
 * Тело SAE Commit: Group (2, LE) ‖ Scalar (32) ‖ Element (64) — ровно этот
 * фрагмент сверяется с вектором Annex J.10.
 */
export function commitMessage(scalar: Uint8Array, element: Uint8Array): Uint8Array {
  return concatBytes(le16(SAE_GROUP), scalar, element);
}

/** Тело кадра Authentication: Algorithm (3 = SAE) ‖ Transaction Seq ‖ Status ‖ сообщение. */
function authFrameBody(sequence: 1 | 2, status: number, message: Uint8Array): Uint8Array {
  return concatBytes(le16(3), le16(sequence), le16(status), message);
}

/** Результат проверки чужого Commit. */
export interface CommitCheck {
  /** 1 < peer-scalar < r. */
  scalarInRange: boolean;
  /** Координаты < p и точка лежит на кривой, не «бесконечность». */
  elementValid: boolean;
  /** Commit не совпадает с собственным (защита от атаки «отражением»). */
  notReflected: boolean;
  ok: boolean;
}

function decodeElement(bytes: Uint8Array): CurvePoint | null {
  if (bytes.length !== 64) {
    return null;
  }
  const x = bytesToBigint(bytes.slice(0, 32));
  const y = bytesToBigint(bytes.slice(32));
  if (x >= P || y >= P) {
    return null;
  }
  try {
    return pointFromXY(x, y);
  } catch {
    return null;
  }
}

function checkPeerCommit(
  peerScalar: Uint8Array,
  peerElement: Uint8Array,
  own: { scalar: Uint8Array; element: Uint8Array },
): CommitCheck {
  const scalar = bytesToBigint(peerScalar);
  const scalarInRange = scalar > 1n && scalar < R;
  const elementValid = decodeElement(peerElement) !== null;
  const notReflected = !(equalBytes(peerScalar, own.scalar) && equalBytes(peerElement, own.element));
  return { scalarInRange, elementValid, notReflected, ok: scalarInRange && elementValid && notReflected };
}

/** Ключи, выведенные из общего секрета. */
export interface SaeKeys {
  /** k = x(K) — 32 байта. */
  k: Uint8Array;
  /** keyseed = HMAC-SHA256(0³², k). */
  keyseed: Uint8Array;
  /** (scalar + peer-scalar) mod r — 32 байта; контекст KDF и источник PMKID. */
  context: Uint8Array;
  /** Выход KDF-512 целиком: KCK ‖ PMK. */
  kdfOutput: Uint8Array;
  kck: Uint8Array;
  pmk: Uint8Array;
  pmkid: Uint8Array;
}

async function deriveKeys(kx: bigint, scalar: bigint, peerScalar: bigint): Promise<SaeKeys> {
  const k = bigintToBytes32(kx);
  const keyseed = await hmacSha256(new Uint8Array(32), k);
  const context = bigintToBytes32(mod(scalar + peerScalar, R));
  const kdfOutput = await kdfSha256(keyseed, 'SAE KCK and PMK', context, 512);
  return {
    k,
    keyseed,
    context,
    kdfOutput,
    kck: kdfOutput.slice(0, 32),
    pmk: kdfOutput.slice(32, 64),
    pmkid: context.slice(0, 16),
  };
}

/** confirm = HMAC-SHA256(KCK, send-confirm ‖ scalar ‖ element ‖ peer-scalar ‖ peer-element). */
async function computeConfirm(
  kck: Uint8Array,
  sendConfirm: number,
  scalar: Uint8Array,
  element: Uint8Array,
  peerScalar: Uint8Array,
  peerElement: Uint8Array,
): Promise<Uint8Array> {
  return hmacSha256(kck, concatBytes(le16(sendConfirm), scalar, element, peerScalar, peerElement));
}

// ------------------------------------------------------- полный обмен

export type PweMethod = 'h2e' | 'hnp';

/** Параметры обмена SAE + последующего 4-Way Handshake. */
export interface SaeParams {
  ssid: string;
  passphrase: string;
  apMac: string;
  clientMac: string;
  method: PweMethod;
  aNonce: string;
  sNonce: string;
  gtk: string;
  igtk: string;
}

/** Всё, что одна сторона (клиент или AP) отправила и вычислила. */
export interface SaeSide {
  rand: Uint8Array;
  mask: Uint8Array;
  scalar: Uint8Array;
  element: Uint8Array;
  /** Кадр Authentication (Commit), ушедший в эфир. */
  commitFrame: Uint8Array;
  /** Проверка Commit, присланного другой стороной. */
  peerCheck: CommitCheck;
  /** K = rand·(peer-scalar·PWE + peer-element) — x ‖ y. */
  sharedPoint: Uint8Array;
  keys: SaeKeys;
  sendConfirm: number;
  confirm: Uint8Array;
  /** Кадр Authentication (Confirm), ушедший в эфир. */
  confirmFrame: Uint8Array;
  /** Пересчитанный verifier совпал с Confirm, присланным другой стороной. */
  peerConfirmOk: boolean;
}

/** Полный результат SAE с промежуточными значениями для визуализации. */
export interface SaeRunResult {
  method: PweMethod;
  group: number;
  hnp?: HnpResult;
  h2e?: H2eResult;
  /** PWE — x ‖ y (64 байта); одинаков у обеих сторон. */
  pwe: Uint8Array;
  /** PWE, независимо выведенный точкой доступа, совпал с PWE клиента. */
  pweAgreed: boolean;
  client: SaeSide;
  ap: SaeSide;
  /** Стороны независимо пришли к одному k и одному PMK. */
  converged: boolean;
  fourWay: FourWayResult;
}

async function derivePweFor(
  method: PweMethod,
  ssid: string,
  password: string,
  macA: Uint8Array,
  macB: Uint8Array,
): Promise<{ point: CurvePoint; hnp?: HnpResult; h2e?: H2eResult }> {
  if (method === 'hnp') {
    const { point, info } = await deriveHnpInternal(utf8ToBytes(password), macA, macB);
    return { point, hnp: info };
  }
  const { point, info } = await deriveH2eInternal(
    utf8ToBytes(ssid),
    utf8ToBytes(password),
    undefined,
    macA,
    macB,
  );
  return { point, h2e: info };
}

/**
 * Полный обмен SAE между клиентом и точкой доступа:
 * PWE → Commit (клиент, затем AP) → проверка → k → KCK/PMK/PMKID → Confirm →
 * взаимная проверка → 4-Way Handshake на PMK из SAE.
 */
export async function runSae(params: SaeParams): Promise<SaeRunResult> {
  const apMac = parseMac(params.apMac);
  const clientMac = parseMac(params.clientMac);
  const status = params.method === 'h2e' ? SAE_STATUS.HASH_TO_ELEMENT : SAE_STATUS.SUCCESS;

  // Каждая сторона выводит PWE сама — из пароля, SSID и обоих MAC.
  const clientPwe = await derivePweFor(params.method, params.ssid, params.passphrase, clientMac, apMac);
  const apPwe = await derivePweFor(params.method, params.ssid, params.passphrase, apMac, clientMac);
  const pweAgreed = clientPwe.point.equals(apPwe.point);

  // Commit: свои случайные rand и mask у каждой стороны.
  const clientSecret = randomCommit(clientPwe.point);
  const apSecret = randomCommit(apPwe.point);
  const encode = (secret: CommitSecret) => ({
    scalar: bigintToBytes32(secret.scalar),
    element: encodeElement(secret.element),
  });
  const clientPublic = encode(clientSecret);
  const apPublic = encode(apSecret);

  async function side(
    secret: CommitSecret,
    own: { scalar: Uint8Array; element: Uint8Array },
    peer: { scalar: Uint8Array; element: Uint8Array },
    pwe: CurvePoint,
  ) {
    const peerCheck = checkPeerCommit(peer.scalar, peer.element, own);
    if (!peerCheck.ok) {
      throw new Error('Commit другой стороны не прошёл проверку');
    }
    const peerElement = decodeElement(peer.element)!;
    const peerScalar = bytesToBigint(peer.scalar);
    const shared = pwe.multiply(peerScalar).add(peerElement).multiply(secret.rand);
    if (shared.is0()) {
      throw new Error('K — бесконечно удалённая точка: обмен отклоняется');
    }
    const keys = await deriveKeys(shared.toAffine().x, secret.scalar, peerScalar);
    const sendConfirm = 1;
    const confirm = await computeConfirm(
      keys.kck,
      sendConfirm,
      own.scalar,
      own.element,
      peer.scalar,
      peer.element,
    );
    return {
      rand: bigintToBytes32(secret.rand),
      mask: bigintToBytes32(secret.mask),
      scalar: own.scalar,
      element: own.element,
      commitFrame: authFrameBody(1, status, commitMessage(own.scalar, own.element)),
      peerCheck,
      sharedPoint: encodeElement(shared),
      keys,
      sendConfirm,
      confirm,
      confirmFrame: authFrameBody(2, SAE_STATUS.SUCCESS, concatBytes(le16(sendConfirm), confirm)),
    };
  }

  const clientSide = await side(clientSecret, clientPublic, apPublic, clientPwe.point);
  const apSide = await side(apSecret, apPublic, clientPublic, apPwe.point);

  // Взаимная проверка Confirm: verifier = CN(KCK, peer-send-confirm, peer-scalar,
  // peer-element, scalar, element) — тот же HMAC, но «с точки зрения» отправителя.
  const apVerifiesClient = equalBytes(
    await computeConfirm(
      apSide.keys.kck,
      clientSide.sendConfirm,
      clientPublic.scalar,
      clientPublic.element,
      apPublic.scalar,
      apPublic.element,
    ),
    clientSide.confirm,
  );
  const clientVerifiesAp = equalBytes(
    await computeConfirm(
      clientSide.keys.kck,
      apSide.sendConfirm,
      apPublic.scalar,
      apPublic.element,
      clientPublic.scalar,
      clientPublic.element,
    ),
    apSide.confirm,
  );

  const converged =
    equalBytes(clientSide.keys.k, apSide.keys.k) && equalBytes(clientSide.keys.pmk, apSide.keys.pmk);

  const fourWay = await runFourWay({
    akm: 'sae',
    pmk: apSide.keys.pmk,
    pmkid: apSide.keys.pmkid,
    apMac,
    clientMac,
    aNonce: hexToBytes(params.aNonce),
    sNonce: hexToBytes(params.sNonce),
    gtk: hexToBytes(params.gtk),
    igtk: hexToBytes(params.igtk),
    h2e: params.method === 'h2e',
  });

  return {
    method: params.method,
    group: SAE_GROUP,
    hnp: clientPwe.hnp,
    h2e: clientPwe.h2e,
    pwe: encodeElement(clientPwe.point),
    pweAgreed,
    client: { ...clientSide, peerConfirmOk: clientVerifiesAp },
    ap: { ...apSide, peerConfirmOk: apVerifiesClient },
    converged,
    fourWay,
  };
}

// ------------------------------------------------------- для тест-векторов

/**
 * Детерминированный Commit + обработка чужого Commit — ровно то, что делает
 * тест hostapd по вектору IEEE 802.11-2020 Annex J.10 (rand и mask заданы).
 */
export async function saeVectorRun(input: {
  password: string;
  ownMac: Uint8Array;
  peerMac: Uint8Array;
  rand: Uint8Array;
  mask: Uint8Array;
  peerCommit: Uint8Array;
}): Promise<{ pwe: Uint8Array; ownCommit: Uint8Array; keys: SaeKeys }> {
  const { point: pwe } = await deriveHnpInternal(utf8ToBytes(input.password), input.ownMac, input.peerMac);
  const own = makeCommit(pwe, bytesToBigint(input.rand), bytesToBigint(input.mask));
  const ownCommit = commitMessage(bigintToBytes32(own.scalar), encodeElement(own.element));
  const peerScalar = bytesToBigint(input.peerCommit.slice(2, 34));
  const peerElement = decodeElement(input.peerCommit.slice(34, 98));
  if (!peerElement) {
    throw new Error('Некорректный элемент в векторе');
  }
  const shared = pwe.multiply(peerScalar).add(peerElement).multiply(own.rand);
  const keys = await deriveKeys(shared.toAffine().x, own.scalar, peerScalar);
  return { pwe: encodeElement(pwe), ownCommit, keys };
}
