/**
 * Модель шагов визуализации WPA3 SAE (Dragonfly) и последующего 4-Way Handshake.
 * Текст — из трёхъязычной таблицы `SAE_TEXT`; реальные значения обмена
 * подставляются в шаблоны блока «Вычисление».
 */
import type { SaeRunResult } from '../../core/crypto/crypto-engine.service';
import { buildGtkKde, buildIgtkKde } from '../../core/crypto/eapol';
import { bytesToHex, hexToBytes, parseMac, utf8ToBytes } from '../../core/crypto/hex';
import { P256_P, P256_R } from '../../core/crypto/p256-params';
import { SAE_TEXT } from '../../core/i18n/sae-text';
import { fillCalc, interpolate } from '../../core/i18n/step-text';
import type { Lang } from '../../core/i18n/ui-text';
import type {
  ByteRegion,
  ByteView,
  CryptoArtifact,
  NetworkScenario,
  VisualizationStep,
} from '../../core/models';
import { frameByteView, frameVars } from '../handshake-visualizer/frame-view';
import { artifact, ref } from '../handshake-visualizer/wpa2-steps';

/** Число шагов модуля SAE (соответствует тексту `SAE_TEXT`). */
export const SAE_STEP_COUNT = 13;

interface StepWiring {
  inputs: CryptoArtifact[];
  outputs: CryptoArtifact[];
  artifacts: CryptoArtifact[];
  packetFrom?: 'ap' | 'client';
  byteView?: (caption: string) => ByteView;
  badge?: boolean;
}

const hexOf = (value: bigint) => value.toString(16).padStart(64, '0');

/** Строит упорядоченный список шагов модуля SAE на выбранном языке. */
export function buildSaeSteps(
  scenario: NetworkScenario,
  result: SaeRunResult,
  lang: Lang,
): VisualizationStep[] {
  const text = SAE_TEXT[lang];
  const fw = result.fourWay;
  const [m1, m2, m3, m4] = fw.messages;
  const cl = result.client;
  const ap = result.ap;
  const isH2e = result.method === 'h2e';
  const mark = (ok: boolean) => (ok ? text.ok : text.fail);
  const pass = (ok: boolean) => (ok ? text.passed : text.rejected);
  const yesNo = (value: boolean) => (value ? text.hnp.yes : text.hnp.no);

  const ssid = artifact('ssid', text.labels.ssid, utf8ToBytes(scenario.ssid));
  const passphrase = artifact('passphrase', text.labels.passphrase, utf8ToBytes(scenario.passphrase));
  const apMac = artifact('apMac', text.labels.apMac, parseMac(scenario.apMac));
  const clientMac = artifact('clientMac', text.labels.clientMac, parseMac(scenario.clientMac));
  const aNonce = artifact('aNonce', 'ANonce', hexToBytes(scenario.aNonce));
  const sNonce = artifact('sNonce', 'SNonce', hexToBytes(scenario.sNonce));
  const gtk = artifact('gtk', 'GTK', hexToBytes(scenario.gtk));
  const igtk = artifact('igtk', 'IGTK', hexToBytes(scenario.igtk));
  const pwe = artifact('pwe', text.labels.pwe, result.pwe, isH2e ? ['pt', 'apMac', 'clientMac'] : ['hnpX']);
  const pt = result.h2e
    ? artifact('pt', text.labels.pt, result.h2e.pt, ['ssid', 'passphrase'])
    : undefined;
  const pwdSeed = result.h2e
    ? artifact('pwdSeed', text.labels.pwdSeed, result.h2e.pwdSeed, ['ssid', 'passphrase'])
    : undefined;
  const hnpX = result.hnp
    ? artifact('hnpX', 'x (H&P)', result.hnp.x, ['passphrase', 'apMac', 'clientMac'])
    : undefined;
  const clScalar = artifact('clScalar', text.labels.clScalar, cl.scalar, ['pwe']);
  const clElement = artifact('clElement', text.labels.clElement, cl.element, ['pwe']);
  const clCommit = artifact('clCommit', text.labels.clCommit, cl.commitFrame, ['clScalar', 'clElement']);
  const apScalar = artifact('apScalar', text.labels.apScalar, ap.scalar, ['pwe']);
  const apElement = artifact('apElement', text.labels.apElement, ap.element, ['pwe']);
  const apCommit = artifact('apCommit', text.labels.apCommit, ap.commitFrame, ['apScalar', 'apElement']);
  const sharedK = artifact('sharedK', text.labels.sharedK, cl.keys.k, ['apScalar', 'apElement', 'pwe']);
  const keyseed = artifact('keyseed', text.labels.keyseed, cl.keys.keyseed, ['sharedK']);
  const saeKck = artifact('saeKck', text.labels.saeKck, cl.keys.kck, ['keyseed']);
  const pmk = artifact('pmk', text.labels.pmk, cl.keys.pmk, ['keyseed']);
  const pmkid = artifact('pmkid', text.labels.pmkid, cl.keys.pmkid, ['clScalar', 'apScalar']);
  const clConfirm = artifact('clConfirm', text.labels.clConfirm, cl.confirmFrame, ['saeKck']);
  const apConfirm = artifact('apConfirm', text.labels.apConfirm, ap.confirmFrame, ['saeKck']);
  const ptk = artifact('ptk', text.labels.ptk, fw.ptk, ['pmk', 'aNonce', 'sNonce']);
  const kck = artifact('kck', 'KCK', fw.kck, ['ptk']);
  const kek = artifact('kek', 'KEK', fw.kek, ['ptk']);
  const tk = artifact('tk', 'TK', fw.tk, ['ptk']);
  const m1Frame = artifact('m1', text.labels.m1, m1.frame, ['aNonce', 'pmkid']);
  const m2Frame = artifact('m2', text.labels.m2, m2.frame, ['sNonce', 'kck']);
  const mic2 = artifact('mic2', 'MIC (M2, CMAC)', m2.mic!, ['kck', 'm2']);
  const kdPlain = artifact('kdPlain', text.labels.keyDataPlain, fw.m3KeyDataPlain, ['gtk', 'igtk']);
  const kdWrapped = artifact('kdWrapped', text.labels.keyDataWrapped, fw.m3KeyDataWrapped, ['kdPlain', 'kek']);
  const m3Frame = artifact('m3', text.labels.m3, m3.frame, ['kdWrapped']);
  const m4Frame = artifact('m4', text.labels.m4, m4.frame, ['kck']);

  const gtkKde = buildGtkKde(gtk.bytes);
  const igtkKde = buildIgtkKde(igtk.bytes);
  const rsnxeHex = isH2e ? 'f40120' : '';
  const status = isH2e ? 126 : 0;
  const macA = parseMac(scenario.apMac);
  const macB = parseMac(scenario.clientMac);
  const apHigher = bytesToHex(macA) > bytesToHex(macB);
  const macMaxMin = bytesToHex(apHigher ? macA : macB) + bytesToHex(apHigher ? macB : macA);

  const vars: Record<string, string> = {
    ssidText: scenario.ssid,
    passText: scenario.passphrase,
    ssidHex: ssid.hex,
    passHex: passphrase.hex,
    apMacColon: scenario.apMac,
    clientMacColon: scenario.clientMac,
    methodName: text.methodLabel[result.method],
    curveP: hexOf(P256_P),
    curveR: hexOf(P256_R),
    macMaxMin,
    pwex: pwe.hex.slice(0, 64),
    pwey: pwe.hex.slice(64),
    chkPwe: mark(result.pweAgreed),
    clRand: bytesToHex(cl.rand),
    clMask: bytesToHex(cl.mask),
    clScalar: clScalar.hex,
    clElemX: clElement.hex.slice(0, 64),
    clElemY: clElement.hex.slice(64),
    clCommitLen: String(cl.commitFrame.length),
    seq1: '0100',
    statusHex: status === 126 ? '7e00' : '0000',
    statusDec: String(status),
    apRand: bytesToHex(ap.rand),
    apMask: bytesToHex(ap.mask),
    apScalar: apScalar.hex,
    apElemX: apElement.hex.slice(0, 64),
    apElemY: apElement.hex.slice(64),
    apCommitLen: String(ap.commitFrame.length),
    chkClScalar: pass(cl.peerCheck.scalarInRange),
    chkClElement: pass(cl.peerCheck.elementValid),
    chkClReflect: pass(cl.peerCheck.notReflected),
    chkApScalar: pass(ap.peerCheck.scalarInRange),
    chkApElement: pass(ap.peerCheck.elementValid),
    chkApReflect: pass(ap.peerCheck.notReflected),
    clK: bytesToHex(cl.keys.k),
    apK: bytesToHex(ap.keys.k),
    chkK: mark(bytesToHex(cl.keys.k) === bytesToHex(ap.keys.k)),
    keyseed: keyseed.hex,
    context: bytesToHex(cl.keys.context),
    kdfOut: bytesToHex(cl.keys.kdfOutput),
    saeKck: saeKck.hex,
    pmk: pmk.hex,
    pmkid: pmkid.hex,
    chkPmk: mark(result.converged),
    clConfirm: bytesToHex(cl.confirm),
    clConfirmLen: String(cl.confirmFrame.length),
    apConfirm: bytesToHex(ap.confirm),
    chkApConfirm: mark(ap.peerConfirmOk),
    chkClConfirm: mark(cl.peerConfirmOk),
    rsne: bytesToHex(fw.rsneAp),
    rsnxe: rsnxeHex || '—',
    rsneRsnxe: bytesToHex(fw.rsneAp) + rsnxeHex,
    aNonce: aNonce.hex,
    sNonce: sNonce.hex,
    b: bytesToHex(fw.b),
    ptkRaw: bytesToHex(fw.ptkRaw),
    ptk: ptk.hex,
    kck: kck.hex,
    kek: kek.hex,
    tk: tk.hex,
    gtk: gtk.hex,
    igtk: igtk.hex,
    gtkKde: bytesToHex(gtkKde),
    igtkKde: bytesToHex(igtkKde),
    m3PlainLen: String(fw.m3KeyDataPlain.length),
    m3PaddedLen: String(fw.m3KeyDataPadded.length),
    padding: bytesToHex(fw.m3KeyDataPadded.slice(fw.m3KeyDataPlain.length)) || '—',
    chkM2: mark(fw.checks.apVerifiesM2),
    chkM3: mark(fw.checks.clientVerifiesM3),
    chkUnwrap: mark(fw.checks.clientUnwrapsGtk),
    chkRsneClient: mark(fw.checks.clientChecksRsne),
    chkM4: mark(fw.checks.apVerifiesM4),
    ...frameVars('m1', m1),
    ...frameVars('m2', m2),
    ...frameVars('m3', m3),
    ...frameVars('m4', m4),
  };

  if (result.h2e) {
    const h = result.h2e;
    Object.assign(vars, {
      pwdSeed: bytesToHex(h.pwdSeed),
      pwdValue1: bytesToHex(h.pwdValue1),
      pwdValue2: bytesToHex(h.pwdValue2),
      u1: bytesToHex(h.sswu1.u),
      u2: bytesToHex(h.sswu2.u),
      sswu1Square: yesNo(h.sswu1.gx1IsSquare),
      sswu1Which: h.sswu1.gx1IsSquare ? 'x1' : 'x2',
      sswu1Neg: yesNo(h.sswu1.yNegated),
      sswu2Square: yesNo(h.sswu2.gx1IsSquare),
      sswu2Which: h.sswu2.gx1IsSquare ? 'x1' : 'x2',
      sswu2Neg: yesNo(h.sswu2.yNegated),
      p1x: bytesToHex(h.sswu1.point).slice(0, 64),
      p1y: bytesToHex(h.sswu1.point).slice(64),
      p2x: bytesToHex(h.sswu2.point).slice(0, 64),
      p2y: bytesToHex(h.sswu2.point).slice(64),
      ptx: bytesToHex(h.pt).slice(0, 64),
      pty: bytesToHex(h.pt).slice(64),
      valHash: bytesToHex(h.valHash),
      val: bytesToHex(h.val),
    });
  }

  if (result.hnp) {
    const h = result.hnp;
    const rows = h.iterations
      .filter((it) => !it.afterFound)
      .map(
        (it) =>
          `  ${it.counter}\t${yesNo(it.belowP)}\t${yesNo(it.isQr)}\t${it.chosen ? text.hnp.found : ''}`,
      );
    const lastReal = h.foundCounter;
    const masked =
      h.iterations.length > lastReal
        ? [
            '  ' +
              interpolate(text.hnp.masked, {
                from: String(lastReal + 1),
                to: String(h.iterations.length),
              }),
          ]
        : [];
    const yLsb = (BigInt('0x' + bytesToHex(h.yRoot)) & 1n).toString();
    Object.assign(vars, {
      hnpTable: ['  ' + text.hnp.header, ...rows, ...masked].join('\n'),
      hnpTotal: String(h.iterations.length),
      hnpFound: String(h.foundCounter),
      hnpSave: bytesToHex(h.save),
      hnpX: bytesToHex(h.x),
      hnpYRoot: bytesToHex(h.yRoot),
      hnpSaveLsb: String(h.save[31] & 1),
      hnpYLsb: yLsb,
      hnpYChoice: h.yFlipped ? '(x, p − y)' : '(x, y)',
    });
  }

  const commitView = (frame: Uint8Array, caption: string): ByteView => ({
    hex: bytesToHex(frame),
    regions: [
      { label: text.frameFields.auth, byteCount: 6, tone: 'kept3' },
      { label: text.frameFields.group, byteCount: 2, tone: 'drop' },
      { label: text.frameFields.scalar, byteCount: 32, tone: 'kept' },
      { label: text.frameFields.element, byteCount: 64, tone: 'kept2' },
    ],
    caption,
  });

  const m3Regions: ByteRegion[] = [
    { label: 'RSNE', byteCount: fw.rsneAp.length, tone: 'kept' },
    ...(isH2e ? [{ label: 'RSNXE', byteCount: 3, tone: 'kept3' as const }] : []),
    { label: 'GTK KDE', byteCount: gtkKde.length, tone: 'kept2' },
    { label: 'IGTK KDE', byteCount: igtkKde.length, tone: 'kept3' },
    { label: 'dd 00…', byteCount: fw.m3KeyDataPadded.length - fw.m3KeyDataPlain.length, tone: 'drop' },
  ];

  const pweInputs1 = isH2e ? [ssid, passphrase] : [passphrase, apMac, clientMac];
  const pweOutputs1 = isH2e ? [pwdSeed!, pt!] : [hnpX!];
  const wiring: StepWiring[] = [
    { inputs: [], outputs: [ssid, passphrase, apMac, clientMac], artifacts: [ssid, passphrase, apMac, clientMac] },
    { inputs: pweInputs1, outputs: pweOutputs1, artifacts: pweOutputs1 },
    {
      inputs: isH2e ? [pt!, apMac, clientMac] : [hnpX!],
      outputs: [pwe],
      artifacts: [pwe],
      badge: result.pweAgreed,
    },
    {
      inputs: [pwe],
      outputs: [clScalar, clElement],
      artifacts: [clScalar, clElement, clCommit],
      packetFrom: 'client',
      byteView: (caption) => commitView(cl.commitFrame, caption),
    },
    {
      inputs: [pwe],
      outputs: [apScalar, apElement],
      artifacts: [apScalar, apElement, apCommit],
      packetFrom: 'ap',
      byteView: (caption) => commitView(ap.commitFrame, caption),
    },
    {
      inputs: [clScalar, clElement, apScalar, apElement, pwe],
      outputs: [sharedK],
      artifacts: [sharedK],
      badge: bytesToHex(cl.keys.k) === bytesToHex(ap.keys.k),
    },
    {
      inputs: [sharedK, clScalar, apScalar],
      outputs: [saeKck, pmk, pmkid],
      artifacts: [keyseed, saeKck, pmk, pmkid],
      byteView: (caption) => ({
        hex: bytesToHex(cl.keys.kdfOutput),
        regions: [
          { label: 'KCK', byteCount: 32, tone: 'kept' },
          { label: 'PMK', byteCount: 32, tone: 'kept2' },
        ],
        caption,
      }),
    },
    {
      inputs: [saeKck, clScalar, clElement, apScalar, apElement],
      outputs: [clConfirm],
      artifacts: [clConfirm],
      packetFrom: 'client',
    },
    {
      inputs: [saeKck, clConfirm],
      outputs: [apConfirm],
      artifacts: [apConfirm],
      packetFrom: 'ap',
      badge: cl.peerConfirmOk && ap.peerConfirmOk,
    },
    {
      inputs: [pmk, apMac, clientMac, aNonce, sNonce],
      outputs: [ptk, kck, kek, tk],
      artifacts: [m1Frame, ptk, kck, kek, tk],
      packetFrom: 'ap',
      byteView: (caption) => ({
        hex: bytesToHex(fw.ptkRaw),
        regions: [
          { label: 'PTK', byteCount: 48, tone: 'kept' },
          { label: text.droppedLabel, byteCount: fw.ptkRaw.length - 48, tone: 'drop' },
        ],
        caption,
      }),
    },
    {
      inputs: [kck, sNonce],
      outputs: [mic2],
      artifacts: [m2Frame, mic2],
      packetFrom: 'client',
      byteView: (caption) => frameByteView(m2, lang, caption),
      badge: fw.checks.apVerifiesM2,
    },
    {
      inputs: [kek, kck, gtk, igtk],
      outputs: [kdWrapped, tk],
      artifacts: [kdPlain, kdWrapped, m3Frame, m4Frame],
      packetFrom: 'ap',
      byteView: (caption) => ({ hex: bytesToHex(fw.m3KeyDataPadded), regions: m3Regions, caption }),
      badge: Object.values(fw.checks).every(Boolean),
    },
    { inputs: [clScalar, apScalar, pmkid], outputs: [], artifacts: [clScalar, apScalar, pmkid] },
  ];

  const stepTexts = isH2e
    ? text.steps
    : [text.steps[0], text.hnpSteps[0], text.hnpSteps[1], ...text.steps.slice(3)];

  return stepTexts.map((step, index) => {
    const w = wiring[index];
    const byteView = step.byteCaption && w.byteView ? w.byteView(step.byteCaption) : undefined;
    return {
      index,
      title: step.title,
      tooltip: step.tooltip,
      description: step.description,
      formula: step.formula,
      terms: step.terms,
      calc: fillCalc(step.calc, vars, lang),
      dataFlow: {
        inputs: w.inputs.map(ref),
        transform: step.transform,
        outputs: w.outputs.map(ref),
      },
      artifacts: w.artifacts,
      ...(byteView ? { byteView } : {}),
      ...(step.packetLabel && w.packetFrom
        ? { packet: { from: w.packetFrom, label: step.packetLabel } }
        : {}),
      ...(w.badge !== undefined
        ? { badge: { text: mark(w.badge), tone: w.badge ? ('match' as const) : ('no-match' as const) } }
        : {}),
    };
  });
}
