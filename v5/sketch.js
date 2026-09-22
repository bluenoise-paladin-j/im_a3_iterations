/* WikiTree — v5
   Wikipedia's live edit stream, tangled by shared letters.
   Two words tie at a letter they share, and that letter sounds.
   Run with Live Server. */

/* ------------------------------------------------------------------
   CONFIG
   ------------------------------------------------------------------ */

const CFG = {
  stream:    'https://stream.wikimedia.org/v2/stream/recentchange',
  maxWords:  16,
  intakeMs:  700,     // minimum gap between accepted titles
  baseSize:  30,      // px, at MONO 0 / wght 400

  innerBias:  0.80,
  digitRatio: 0.25,   // reject titles more than this fraction digits

  orbitRate: 0.006,   // radians per pixel dragged
  zoomRate:  0.0016,  // per unit of wheel delta
  zoomMin:   0.05,
  zoomMax:   12,

  growPerLink: 0.26,
  maxLinks:    5,
  grow:        0.035,

  branch: [
    { weight: 0.50, deg:  90, jitter: 15 },   // square across
    { weight: 0.30, deg:  62, jitter: 12 },   // opening away
    { weight: 0.20, deg: 118, jitter: 12 }    // leaning back
  ],

  goldenAngle: 2.39996323,
  spiralJitter: 0.14,   // radians of slop, so it is not mechanical

  twist: 0.62,

  faceCamera: true,

  lean: 0.42,

  shellR: 170,
  curl:   0.75,

  fadeSecs:    1.4,
  weightName: 'areal-medium.ttf'
};

const PALETTE = [
  '#FF2D6F',  // magenta
  '#E8412A',  // red
  '#F2A100',  // amber
  '#1F8A70',  // green
  '#2E7CC4',  // blue
  '#1B3A6B',  // navy
  '#6B4BE8'   // violet
];

const VIEWS = [
  // the network — framed once on load, then the viewer's to orbit and zoom
  { yaw: 0.42, pitch: 0.24, fill: 0.97, trim: 0.92, manual: true },

  // the core — fixed on the middle of the tangle, answers to nothing
  { yaw: 1.5708, pitch: 0.12, still: true, span: 250 }
];

/* ------------------------------------------------------------------
   STATE
   ------------------------------------------------------------------ */

let words  = [];
let fading = [];             // retired, still on screen while they go out

let source  = null;
let pending = null;          // freshest unconsumed event (we keep only one)
let lastIntake = 0;

let status = 'booting';
let seen = 0, bound = 0, refused = 0;

let hovered = null;          // the word under the cursor, if any
let dragging = null;         // the view being dragged, if any
let pressX = 0, pressY = 0;  // where the press started, to tell a click from a drag
let lastX  = 0, lastY  = 0;  // track the pointer here; p5's movedX/movedY report 0
let fitPending = true;       // frame the manual view once, when there is something to frame
let started = false;         // audio cannot begin until the viewer asks for it

let statEls = {};
let readoutEl = null;
let infoEl = null, infoToggleEl = null, soundToggleEl = null;
let loadingEl = null;
let fontReady = false;       // the loading screen waits on this and the stream

let touchUI  = false;
let selected = null;
let readoutKey = '';         // what the pill says now, so it is only rewritten on a change
let lastHud = 0;


let canvasEl;                // to tell a press on the art from one on the chrome over it
let pointers = new Map();    // every finger currently down on the canvas
let gesture  = null;         // the live two-finger gesture, if any
let pinched  = false;        // one happened; swallow the tap that ends it
let lastTap  = 0;            // for double-tap, which no browser sends reliably

let font;                    // the loaded p5.Font, required by WEBGL text()
let measureG;                // a 2D buffer used only for measuring widths


/* ------------------------------------------------------------------
   SETUP
   ------------------------------------------------------------------ */

async function setup() {
  const c = createCanvas(windowWidth, windowHeight, WEBGL);
  canvasEl = c.elt;
  setAttributes('antialias', true);
  textAlign(LEFT, CENTER);
  setOrtho();

  statEls = {
    stream: document.getElementById('stat-stream'),
    tangle: document.getElementById('stat-tangle'),
    seen:   document.getElementById('stat-seen'),
    bound:  document.getElementById('stat-bound'),
    fps:    document.getElementById('stat-fps')
  };
  readoutEl     = document.getElementById('readout');
  infoEl        = document.getElementById('info');
  infoToggleEl  = document.getElementById('info-toggle');
  soundToggleEl = document.getElementById('sound-toggle');
  loadingEl     = document.getElementById('loading');

  touchUI = window.matchMedia('(pointer: coarse)').matches;

  infoToggleEl.addEventListener('click', toggleInfo);

  // A new palette colour each time the pointer arrives. Inverted first: the
  // brand row draws in difference, which inverts it back on the way out.
  infoToggleEl.addEventListener('pointerenter', () => {
    const [r, g, b] = hexToRgb(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    infoToggleEl.style.setProperty('--hover', `rgb(${255 - r} ${255 - g} ${255 - b})`);
  });

  for (const type of ['pointerdown', 'keydown']) {
    window.addEventListener(type, begin, { once: true });
  }

  soundToggleEl.addEventListener('click', async () => {
    if (!started) { await begin(); return; }
    setMuted(!Voice.muted);
  });

  watchPointers();
  nameGestures();

  for (const v of VIEWS) {
    v.zoom  = 1;
    v.panX  = 0;
    v.panY  = 0;
    v.focus = { x: CORE.x, y: CORE.y, z: CORE.z };
    v.ready = false;
    v.touched = false;          // has the viewer moved this one themselves?
  }
  fitPending = true;
  layoutViews();

  // has to be the static cut. p5 reads outlines from glyf, and a variable
  // font keeps them as deltas in gvar, so it silently draws nothing in WEBGL.
  font = await loadFont(CFG.weightName);
  textFont(font);

  await document.fonts.load(`${CFG.baseSize}px Areal`);
  // widths are measured on a plain 2D buffer — cheaper than WEBGL textWidth()
  // and independent of the 3D transform stack.
  measureG = createGraphics(10, 10);
  measureG.pixelDensity(1);
  measureG.textFont('Areal');
  measureG.textAlign(LEFT, CENTER);
  fontReady = true;

  connect();
}

function layoutViews() {
  const stacked = height > width;
  const n  = VIEWS.length;
  const cw = stacked ? width      : width / n;
  const ch = stacked ? height / n : height;

  VIEWS.forEach((v, i) => {
    v.x  = stacked ? 0      : i * cw;
    v.y  = stacked ? i * ch : 0;
    v.w  = cw;
    v.h  = ch;
    v.cx = v.x + cw / 2;
    v.cy = v.y + ch / 2;
  });
}

// A class rather than `hidden`, so it can animate; `inert` keeps the panel off
// the keyboard while it is shut.
function toggleInfo() {
  const open = !infoEl.classList.contains('open');
  infoEl.classList.toggle('open', open);
  infoEl.inert = !open;
  infoToggleEl.setAttribute('aria-expanded', String(open));
}

function setMuted(muted) {
  Voice.setMuted(muted);
  soundToggleEl.textContent = muted ? 'muted' : 'on';
  soundToggleEl.setAttribute('aria-pressed', String(muted));
}

// Browsers will not start audio without a gesture. The first one of any kind
// does it — see the listeners in setup().
async function begin() {
  if (started) return;
  started = true;

  try { await Voice.start(); } catch { /* no audio; the piece still runs */ }
  setMuted(Voice.muted);      // the reading stops saying `off`
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setOrtho();
  layoutViews();

  for (const v of VIEWS) {
    if (!v.touched && v.ready) fitView(v);
  }
}

// p5 gives a WEBGL canvas a perspective camera by default, which breaks the
// framing and picking maths. Flat projection: one world unit is one pixel.
function setOrtho() {
  ortho(-width / 2, width / 2, -height / 2, height / 2, -8000, 8000);
}


/* ------------------------------------------------------------------
   STREAM
   ------------------------------------------------------------------ */

function connect() {
  status = 'connecting';
  source = new EventSource(CFG.stream);

  source.onopen  = () => { status = 'connected'; };
  source.onerror = () => { status = 'reconnecting'; };   // EventSource retries itself

  source.onmessage = (evt) => {
    let d;
    try { d = JSON.parse(evt.data); } catch { return; }

    seen++;
    if (!accepts(d)) return;

    pending = d;
  };
}

function accepts(d) {
  if (d.type !== 'edit') return false;
  if (d.namespace !== 0) return false;        // main article space only
  if (d.bot) return false;

  const t = d.title;
  if (!t || t.length > 34) return false;

  if (!/\p{L}{3,}/u.test(t)) return false;

  const digits = (t.match(/\d/g) || []).length;
  if (digits / t.length > CFG.digitRatio) return false;

  return isLatin(t);
}

function isLatin(str) {
  if (!/\p{Script=Latin}/u.test(str)) return false;
  return !/\p{L}/u.test(str.replace(/\p{Script=Latin}/gu, ''));
}

function fold(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}


/* ------------------------------------------------------------------
   WORD MODEL
   ------------------------------------------------------------------ */

let nextId = 1;

function makeWord(d) {
  const w = {
    id:     nextId++,
    title:  d.title,
    url:    d.title_url,
    wiki:   d.server_name,

    links:  0,
    size:   CFG.baseSize,

    rgb:    null,           // filled in below

    fade:   1,

    rot:    { rx: 0, ry: 0, rz: 0 },

    spawn:  0,

    phi:    0,

    anchor: null,        // { word, index }
    pivotIndex: 0,
    origin: { x: 0, y: 0, z: 0 },   // only used when there is no anchor
    pos:    { x: 0, y: 0, z: 0 },

    letters: [],
    baseW: 0,
    bindChar: null
  };

  w.rgb = hexToRgb(PALETTE[Math.floor(Math.random() * PALETTE.length)]);

  measure(w);
  return w;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function scaleOf(w)   { return w.size / CFG.baseSize; }
function glyphX(w, k) { return w.letters[k].x * scaleOf(w); }
function wordWidth(w) { return w.baseW * scaleOf(w); }
function pivotOf(w)   { return glyphX(w, w.pivotIndex); }

function measure(w) {
  measureG.textSize(CFG.baseSize);

  w.letters = [];
  let prev = 0;
  for (let k = 0; k < w.title.length; k++) {
    const next = measureG.textWidth(w.title.slice(0, k + 1));
    w.letters.push({
      ch:   w.title[k],
      base: fold(w.title[k]),
      x:    (prev + next) / 2
    });
    prev = next;
  }
  w.baseW = prev;
}

/* ------------------------------------------------------------------
   GROWTH
   ------------------------------------------------------------------ */

function grow(w) {
  const n = Math.min(w.links, CFG.maxLinks);
  const target = CFG.baseSize * (1 + n * CFG.growPerLink);
  w.size = lerp(w.size, target, CFG.grow);
}

function resolvePositions() {
  const placed = new Set();

  const place = (w, depth) => {
    if (placed.has(w)) return;
    placed.add(w);

    if (w.anchor && depth < 64) {
      place(w.anchor.word, depth + 1);
      w.pos = glyphWorld(w.anchor.word, w.anchor.index);
    } else {
      w.pos = w.origin;
    }
  };

  for (const w of words) place(w, 0);
}


/* ------------------------------------------------------------------
   MATRIX MATH
   ------------------------------------------------------------------ */

function rotApply(r, v) {
  let { x, y, z } = v;

  const c1 = Math.cos(r.rx), s1 = Math.sin(r.rx);
  [y, z] = [y * c1 - z * s1, y * s1 + z * c1];

  const c2 = Math.cos(r.ry), s2 = Math.sin(r.ry);
  [x, z] = [x * c2 + z * s2, -x * s2 + z * c2];

  const c3 = Math.cos(r.rz), s3 = Math.sin(r.rz);
  [x, y] = [x * c3 - y * s3, x * s3 + y * c3];

  return { x, y, z };
}

function camApply(view, v) {
  let { x, y, z } = v;

  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  return { x, y, z };
}

/* ------------------------------------------------------------------
   SHAPE
   ------------------------------------------------------------------ */

const UP = { x: 0, y: 1, z: 0 };   // p5's y runs down the screen, so this

function vAdd(a, b)   { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function vMul(a, k)   { return { x: a.x * k,   y: a.y * k,   z: a.z * k   }; }
function vDot(a, b)   { return a.x * b.x + a.y * b.y + a.z * b.z; }
function vLen(a)      { return Math.hypot(a.x, a.y, a.z); }
function vCross(a, b) {
  return { x: a.y * b.z - a.z * b.y,
           y: a.z * b.x - a.x * b.z,
           z: a.x * b.y - a.y * b.x };
}
function vNorm(a) {
  const n = vLen(a);
  return n < 1e-9 ? { x: 1, y: 0, z: 0 } : vMul(a, 1 / n);
}

function dirOf(w) { return rotApply(w.rot, { x: 1, y: 0, z: 0 }); }

function perpFrame(d) {
  const seed = Math.abs(vDot(d, UP)) > 0.95 ? { x: 0, y: 0, z: 1 } : UP;
  const u = vNorm(vCross(d, seed));
  return { u, v: vCross(d, u) };
}

function branchAngle() {
  let r = Math.random();
  for (const b of CFG.branch) {
    if ((r -= b.weight) <= 0) return radians(b.deg + random(-b.jitter, b.jitter));
  }
  const b = CFG.branch[CFG.branch.length - 1];
  return radians(b.deg + random(-b.jitter, b.jitter));
}

function curlInward(d, at) {
  const r = vLen(at);
  if (r < CFG.shellR) return d;

  const k = Math.min((r - CFG.shellR) / CFG.shellR, 1) * CFG.curl;
  const inward = vNorm(vMul(at, -1));
  return vNorm(vAdd(vMul(d, 1 - k), vMul(inward, k)));
}

function eulerFromBasis(ex, ey) {
  const ez = vCross(ex, ey);
  return {
    rz: Math.atan2(ex.y, ex.x),
    ry: Math.atan2(-ex.z, Math.hypot(ex.x, ex.y)),
    rx: Math.atan2(ey.z, ez.z)
  };
}

function orient(w, dir) {
  const ex = vNorm(dir);

  let ey = vAdd(UP, vMul(ex, -vDot(UP, ex)));
  if (vLen(ey) < 1e-6) ey = perpFrame(ex).u;
  ey = vNorm(ey);

  const lean = random(-CFG.lean, CFG.lean);
  const ez   = vCross(ex, ey);
  ey = vNorm(vAdd(vMul(ey, Math.cos(lean)), vMul(ez, Math.sin(lean))));

  w.rot = eulerFromBasis(ex, ey);
}

function branchFrom(anchorWord, at) {
  const p = dirOf(anchorWord);
  const { u, v } = perpFrame(p);

  const phi = anchorWord.phi + CFG.twist
            + anchorWord.spawn++ * CFG.goldenAngle
            + random(-CFG.spiralJitter, CFG.spiralJitter);

  const theta = branchAngle();
  const off = vAdd(vMul(u, Math.cos(phi)), vMul(v, Math.sin(phi)));
  const dir = vAdd(vMul(p, Math.cos(theta)), vMul(off, Math.sin(theta)));

  return { dir: curlInward(vNorm(dir), at), phi };
}


function glyphWorld(w, k) {
  const off = rotApply(w.rot, { x: glyphX(w, k) - pivotOf(w), y: 0, z: 0 });
  return { x: w.pos.x + off.x, y: w.pos.y + off.y, z: w.pos.z + off.z };
}


/* ------------------------------------------------------------------
   PROJECTION
   ------------------------------------------------------------------ */

function project(view, w) {
  const Ex = camApply(view, rotApply(w.rot, { x: 1, y: 0, z: 0 }));

  return { P: camApply(view, w.pos), s: 1, Ex, Ey: upFor(Ex, view, w) };
}

function upFor(Ex, view, w) {
  if (!CFG.faceCamera) {
    return camApply(view, rotApply(w.rot, { x: 0, y: 1, z: 0 }));
  }

  const h = Math.hypot(Ex.x, Ex.y);
  if (h < 1e-6) return camApply(view, rotApply(w.rot, { x: 0, y: 1, z: 0 }));

  return { x: -Ex.y / h, y: Ex.x / h, z: 0 };
}

// A glyph's position depends only on the direction its word runs in, so the
// roll about that line is free — each view picks its own and no tie moves.
function drawRotation(view, w, pr) {
  if (!CFG.faceCamera) return w.rot;
  return eulerFromBasis(dirOf(w), camUnapply(view, pr.Ey));
}

function planePoint(pr, u, v) {
  return {
    x: (pr.P.x + u * pr.Ex.x + v * pr.Ey.x) * pr.s,
    y: (pr.P.y + u * pr.Ex.y + v * pr.Ey.y) * pr.s
  };
}

function affineFor(view, w, pr) {
  const k = view.zoom * pr.s;
  return {
    a: k * pr.Ex.x, b: k * pr.Ex.y,
    c: k * pr.Ey.x, d: k * pr.Ey.y,
    e: view.cx + (pr.P.x * pr.s - view.panX) * view.zoom,
    f: view.cy + (pr.P.y * pr.s - view.panY) * view.zoom
  };
}


/* ------------------------------------------------------------------
   CAMERA
   ------------------------------------------------------------------ */

function syncCamera(view) {
  if (view.still) {
    view.zoom  = view.h / view.span;
    view.focus = CORE;
  }
  const f = camApply(view, view.focus);
  view.panX = f.x;
  view.panY = f.y;
  view.ready = true;
}

function camUnapply(view, v) {
  let { x, y, z } = v;

  const cp = Math.cos(-view.pitch), sp = Math.sin(-view.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  const cy = Math.cos(-view.yaw), sy = Math.sin(-view.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  return { x, y, z };
}

function fitView(view) {
  if (view.still) return;

  const pts = [];
  for (const w of words) {
    const pr = project(view, w);
    if (!pr) continue;

    const piv = pivotOf(w), ww = wordWidth(w), hh = w.size;
    for (const u of [-piv, ww - piv]) {
      for (const v of [-hh / 2, hh / 2]) pts.push(planePoint(pr, u, v));
    }
  }
  if (!pts.length) return;

  const lo = (1 - view.trim) / 2, hi = 1 - lo;

  const xs = pts.map(p => p.x).sort((a, b) => a - b);
  const ys = pts.map(p => p.y).sort((a, b) => a - b);

  const minX = quantile(xs, lo), maxX = quantile(xs, hi);
  const minY = quantile(ys, lo), maxY = quantile(ys, hi);

  view.zoom = constrain(Math.min(
    (view.w * view.fill) / Math.max(maxX - minX, 1),
    (view.h * view.fill) / Math.max(maxY - minY, 1)
  ), CFG.zoomMin, CFG.zoomMax);

  view.focus = camUnapply(view, {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: 0
  });
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const i  = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}


/* ------------------------------------------------------------------
   BINDING
   ------------------------------------------------------------------ */

function anchorSpots(base, limit = words.length) {
  const spots = [];
  for (let j = 0; j < limit; j++) {
    const other = words[j];
    for (let k = 0; k < other.letters.length; k++) {
      if (other.letters[k].base === base) spots.push({ word: other, index: k });
    }
  }
  return spots;
}

// First letter of the title that appears anywhere in the tangle. Among its
// occurrences, one is picked at random.
function findBind(w, limit = words.length) {
  for (let i = 0; i < w.letters.length; i++) {
    const base = w.letters[i].base;
    if (!/[A-Z0-9]/.test(base)) continue;

    const spots = anchorSpots(base, limit);
    if (spots.length) {
      return { localIndex: i, base, spot: pickInner(spots) };
    }
  }
  return null;
}

const CORE = { x: 0, y: 0, z: 0 };

function pickInner(spots) {
  if (spots.length === 1) return spots[0];

  const taken = new Set();
  for (const w of words) {
    if (w.anchor) taken.add(spotKey(w.anchor.word, w.anchor.index));
  }

  let pool = spots.filter(s => !taken.has(spotKey(s.word, s.index)));
  if (!pool.length) pool = spots;
  if (pool.length <= 2) return pool[Math.floor(Math.random() * pool.length)];

  const scored = pool
    .map(s => {
      const g = glyphWorld(s.word, s.index);
      return { s, d: Math.hypot(g.x - CORE.x, g.y - CORE.y, g.z - CORE.z) };
    })
    .sort((a, b) => a.d - b.d);

  const n = Math.max(1, Math.ceil(scored.length * CFG.innerBias));
  const a = scored[Math.floor(Math.random() * n)].s;
  const b = scored[Math.floor(Math.random() * n)].s;

  return a.word.spawn <= b.word.spawn ? a : b;
}

function spotKey(w, index) { return w.id + ':' + index; }

function admit(d) {
  const w = makeWord(d);
  const bind = findBind(w);

  if (!bind) {
    if (words.length) { refused++; return false; }

    w.pivotIndex = Math.floor(w.letters.length / 2);
    w.origin = { x: 0, y: 0, z: 0 };
    w.pos    = w.origin;

    const a = random(TWO_PI);
    orient(w, { x: Math.cos(a), y: 0, z: Math.sin(a) });
  } else {
    w.pivotIndex = bind.localIndex;
    w.anchor     = { word: bind.spot.word, index: bind.spot.index };
    w.bindChar   = bind.base;
    w.pos        = glyphWorld(bind.spot.word, bind.spot.index);

    const branch = branchFrom(bind.spot.word, w.pos);
    w.phi = branch.phi;
    orient(w, branch.dir);

    w.links++;
    bind.spot.word.links++;
    bound++;

    Voice.play(bind.base, {
      pan:   constrain(w.pos.x / 260, -1, 1),
      gain:  0.55 + Math.min(bind.spot.word.links, 5) * 0.09,
      links: bind.spot.word.links
    });
  }

  words.push(w);
  if (words.length > CFG.maxWords) retire();
  return true;
}

// Only ever a leaf — the oldest word with nothing hanging off it — so no word
// is orphaned and the tangle stays one tree.
function retire() {
  const holds = new Set();
  for (const w of words) if (w.anchor) holds.add(w.anchor.word);

  let i = words.findIndex(w => !holds.has(w));
  if (i < 0) i = 0;                 // a finite tree always has a leaf; belt and braces

  const gone = words.splice(i, 1)[0];
  gone.origin = { x: gone.pos.x, y: gone.pos.y, z: gone.pos.z };
  gone.anchor = null;
  fading.push(gone);

  recountLinks();
}

function recountLinks() {
  for (const w of words) w.links = 0;

  const present = new Set(words);
  for (const w of words) {
    if (!w.anchor || !present.has(w.anchor.word)) continue;
    w.links++;
    w.anchor.word.links++;
  }
}

/* ==================================================================
   VOICE
   ================================================================== */

const TONE = {
  root:     130.81,        // C3
  scale:    [0, 3, 5, 7, 10],   // minor pentatonic: no interval can clash
  steps:    14,            // notes spanned by A..Z, about two and a half octaves
  voices:   12,            // simultaneous notes before the oldest is taken
  level:    0.16,
  drone:    0.035
};

const ARTICULATION = {
  vowel:     'AEIOUY',
  nasal:     'MN',
  liquid:    'LRW',
  fricative: 'FSHVZ',
  plosive:   'BPTDKGCQ',
  affricate: 'JX'
};

function articulationOf(ch) {
  for (const kind in ARTICULATION) {
    if (ARTICULATION[kind].includes(ch)) return kind;
  }
  return 'plosive';
}

function noteFor(ch, links) {
  const i = Math.max(0, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(ch));
  const n = Math.round((i / 25) * TONE.steps);

  let octave = Math.floor(n / TONE.scale.length);
  if (links >= 3) octave -= 1;

  const semitones = TONE.scale[n % TONE.scale.length] + octave * 12;
  return TONE.root * Math.pow(2, semitones / 12);
}


const Voice = {
  ctx: null,
  ready: false,
  muted: false,
  playing: [],

  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;

    const master = ctx.createGain();
    master.gain.value = TONE.level;

    const shelf = ctx.createBiquadFilter();
    shelf.type = 'lowpass';
    shelf.frequency.value = 7000;

    master.connect(shelf);
    shelf.connect(limiter);
    limiter.connect(ctx.destination);

    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 2.6, 2.4);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    send.connect(verb);
    verb.connect(master);

    this.master = master;
    this.send   = send;
    this.noise  = noiseBuffer(ctx, 2);

    this.startDrone();
    this.ready = true;
  },

  startDrone() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(TONE.drone, ctx.currentTime + 8);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 2;

    const lfo = ctx.createOscillator();
    const lfoAmt = ctx.createGain();
    lfo.frequency.value = 0.035;
    lfoAmt.gain.value = 170;
    lfo.connect(lfoAmt);
    lfoAmt.connect(lp.frequency);
    lfo.start();

    for (const mult of [1, 1.5, 2.005]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = TONE.root * 0.5 * mult;
      o.detune.value = (Math.random() - 0.5) * 8;
      o.connect(lp);
      o.start();
    }

    lp.connect(g);
    g.connect(this.master);
    this.droneGain = g;
  },

  setMuted(on) {
    this.muted = on;
    if (this.master) {
      this.master.gain.setTargetAtTime(
        on ? 0 : TONE.level, this.ctx.currentTime, 0.05
      );
    }
  },

  play(ch, opts = {}) {
    if (!this.ready || this.muted) return;

    const ctx  = this.ctx;
    const now  = ctx.currentTime;
    const kind = articulationOf(ch);
    const freq = noteFor(ch, opts.links || 0);

    this.playing = this.playing.filter(v => v.until > now);
    if (this.playing.length >= TONE.voices) {
      const oldest = this.playing.shift();
      try { oldest.stop(now); } catch { /* already finished */ }
    }

    const out = ctx.createGain();
    out.gain.value = 0;

    const panner = ctx.createStereoPanner();
    panner.pan.value = constrain(opts.pan || 0, -1, 1);

    out.connect(panner);
    panner.connect(this.master);
    panner.connect(this.send);

    const shaped = SHAPES[kind](ctx, freq, now, out, this.noise);
    const level  = (opts.gain === undefined ? 1 : opts.gain) * shaped.peak;

    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(level, now + shaped.attack);
    out.gain.exponentialRampToValueAtTime(0.0001, now + shaped.length);

    const voice = {
      until: now + shaped.length,
      stop: (t) => shaped.nodes.forEach(n => { try { n.stop(t + 0.05); } catch {} })
    };
    this.playing.push(voice);
    shaped.nodes.forEach(n => n.stop(now + shaped.length + 0.1));
  }
};


/* ------------------------------------------------------------------
   INSTRUMENTS
   ------------------------------------------------------------------ */

const SHAPES = {
  vowel(ctx, freq, now, out) {
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = freq * 4;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.7;
    body.connect(bodyGain);
    bodyGain.connect(out);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.value = Math.min(freq * 3.2, 2600);
    formant.Q.value = 3.5;
    const formantGain = ctx.createGain();
    formantGain.gain.value = 0.8;
    formant.connect(formantGain);
    formantGain.connect(out);

    const nodes = [];
    for (const detune of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(body);
      o.connect(formant);
      o.start(now);
      nodes.push(o);
    }
    return { nodes, attack: 0.09, length: 2.4, peak: 0.5 };
  },

  nasal(ctx, freq, now, out) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq * 2.4;
    lp.connect(out);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq * 0.5;
    o.connect(lp);
    o.start(now);
    return { nodes: [o], attack: 0.14, length: 2.0, peak: 0.7 };
  },

  liquid(ctx, freq, now, out) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = freq * 4;
    lp.connect(out);

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq * 0.72, now);
    o.frequency.exponentialRampToValueAtTime(freq, now + 0.28);
    o.connect(lp);
    o.start(now);
    return { nodes: [o], attack: 0.11, length: 1.8, peak: 0.6 };
  },

  fricative(ctx, freq, now, out, noise) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 + freq * 2;
    bp.Q.value = 0.8;

    src.connect(bp);
    bp.connect(out);
    src.start(now);

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const og = ctx.createGain();
    og.gain.value = 0.16;
    o.connect(og);
    og.connect(out);
    o.start(now);

    return { nodes: [src, o], attack: 0.17, length: 1.1, peak: 0.34 };
  },

  plosive(ctx, freq, now, out, noise) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(freq * 8, now);
    lp.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.25);

    o.connect(lp);
    lp.connect(out);
    o.start(now);

    const src = ctx.createBufferSource();
    src.buffer = noise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.35, now);
    tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    src.connect(hp); hp.connect(tg); tg.connect(out);
    src.start(now);

    return { nodes: [o, src], attack: 0.006, length: 0.9, peak: 0.75 };
  },

  affricate(ctx, freq, now, out, noise) {
    const p = SHAPES.plosive(ctx, freq, now, out, noise);
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3600;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    src.connect(bp); bp.connect(g); g.connect(out);
    src.start(now);
    return { nodes: [...p.nodes, src], attack: 0.008, length: 1.0, peak: 0.7 };
  }
};


function impulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function noiseBuffer(ctx, seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}


/* ------------------------------------------------------------------
   DRAW
   ------------------------------------------------------------------ */

function draw() {
  background(255);

  if (loadingEl && !loadingEl.classList.contains('gone')
      && fontReady && status === 'connected' && words.length > 0) {
    loadingEl.classList.add('gone');   // not waiting for a full tangle, just the first word
  }

  // paint order decides overlap, not depth — coplanar glyph quads fight over
  // the depth buffer. Words are sorted far to near in drawView().
  drawingContext.disable(drawingContext.DEPTH_TEST);

  if (pending && millis() - lastIntake > CFG.intakeMs) {
    if (admit(pending)) lastIntake = millis();
    pending = null;
  }

  for (const w of words) grow(w);
  resolvePositions();
  advanceFades();

  hovered = pickWord();
  document.body.classList.toggle('pointing', !!hovered);

  if (fitPending && words.length >= Math.ceil(CFG.maxWords * 0.85)) {
    for (const view of VIEWS) fitView(view);
    fitPending = false;
  }

  for (const view of VIEWS) {
    syncCamera(view);
    drawView(view);
  }

  drawSplit();
  updateHud();
}

function advanceFades() {
  const step = (deltaTime / 1000) / CFG.fadeSecs;

  for (let i = fading.length - 1; i >= 0; i--) {
    fading[i].fade -= step;
    if (fading[i].fade <= 0) fading.splice(i, 1);
  }
}

function drawView(view) {
  const gl = drawingContext;
  const d  = pixelDensity();

  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(
    Math.round(view.x * d),
    Math.round((height - view.y - view.h) * d),
    Math.round(view.w * d),
    Math.round(view.h * d)
  );

  const shots = [];
  for (const w of words) {
    const pr = project(view, w);
    if (pr) shots.push({ w, pr });
  }
  for (const w of fading) {
    const pr = project(view, w);
    if (pr) shots.push({ w, pr });
  }
  shots.sort((a, b) => a.pr.P.z - b.pr.P.z);

  blendMode(MULTIPLY);

  push();

  translate(view.cx - width / 2, view.cy - height / 2, 0);
  scale(view.zoom);
  translate(-view.panX, -view.panY, 0);
  rotateX(view.pitch);
  rotateY(view.yaw);

  noStroke();

  for (const { w, pr } of shots) {
    const near = isNeighbour(w);

    const alpha = 255 * w.fade;

    if (w === hovered || near) {
      blendMode(BLEND);
      if (w === hovered) fill(0, alpha);
      else               fill(w.rgb[0], w.rgb[1], w.rgb[2], alpha);
    } else {
      blendMode(MULTIPLY);
      fill(w.rgb[0], w.rgb[1], w.rgb[2], alpha);
    }

    const rot = drawRotation(view, w, pr);

    push();
    translate(w.pos.x, w.pos.y, w.pos.z);
    rotateZ(rot.rz);
    rotateY(rot.ry);
    rotateX(rot.rx);
    textSize(w.size);
    text(w.title, -pivotOf(w), 0);
    pop();
  }

  pop();

  blendMode(BLEND);
  gl.disable(gl.SCISSOR_TEST);
}

function isNeighbour(w) {
  if (!hovered || w === hovered) return false;
  if (w.anchor && w.anchor.word === hovered) return true;
  if (hovered.anchor && hovered.anchor.word === w) return true;
  return false;
}

function drawSplit() {
  push();
  resetMatrix();
  stroke(0, 45);
  strokeWeight(1);
  for (let i = 1; i < VIEWS.length; i++) {
    const v = VIEWS[i];
    if (v.x > 0) {
      const x = v.x - width / 2;
      line(x, -height / 2, x, height / 2);
    } else {
      const y = v.y - height / 2;
      line(-width / 2, y, width / 2, y);
    }
  }
  noStroke();
  pop();
}


/* ------------------------------------------------------------------
   TOUCH GESTURES
   ------------------------------------------------------------------ */


// NOT e.offsetX. At pixelDensity 2 — every phone — offsetX comes back in
// backing-store pixels, so it is halved. Off the rect it matches p5's mouseX.
function atCanvas(e) {
  const r = canvasEl.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function watchPointers() {
  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;

    if (pointers.size === 0) pinched = false;

    const at = atCanvas(e);
    pointers.set(e.pointerId, at);
    if (pointers.size === 2) beginGesture();
    else if (pointers.size === 1 && !pinched) tapReframe(at);
  });

  canvasEl.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, atCanvas(e));
    if (gesture) {
      updateGesture();
      e.preventDefault();
    }
  });

  for (const type of ['pointerup', 'pointercancel']) {
    window.addEventListener(type, (e) => {
      if (!pointers.delete(e.pointerId)) return;
      if (gesture && pointers.size < 2) endGesture();
    });
  }
}

function nameGestures() {
  const el = document.getElementById('controls');
  if (!el) return;

  const rows = touchUI
    ? ['drag orbit',
       'pinch zoom',
       'two fingers pan',
       'double-tap reframe',
       'tap a word twice to open it']
    : ['drag orbit',
       'shift + drag pan',
       'scroll zoom',
       'double-click reframe',
       'm mute'];

  el.innerHTML = rows.map(r => `<li>${r}</li>`).join('');
}

function midOf(a, b)  { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function gapOf(a, b)  { return Math.hypot(a.x - b.x, a.y - b.y); }

function beginGesture() {
  const [a, b] = [...pointers.values()];
  const mid  = midOf(a, b);
  const view = viewAt(mid.x, mid.y);

  if (!view || !view.manual) return;

  gesture = { view, gap: gapOf(a, b), x: mid.x, y: mid.y };

  dragging = null;
  pinched  = true;

  lastTap = 0;

  view.touched = true;
  fitPending   = false;
}

function updateGesture() {
  const [a, b] = [...pointers.values()];
  const mid  = midOf(a, b);
  const gap  = gapOf(a, b);
  const view = gesture.view;

  if (gesture.gap > 0 && gap > 0) {
    zoomAt(view, constrain(
      view.zoom * (gap / gesture.gap), CFG.zoomMin, CFG.zoomMax
    ), gesture.x, gesture.y);
  }

  pan(view, mid.x - gesture.x, mid.y - gesture.y);

  gesture.gap = gap;
  gesture.x   = mid.x;
  gesture.y   = mid.y;
}

function endGesture() {
  gesture = null;

  dragging = null;
}

function tapReframe(at) {
  const now = performance.now();
  const view = viewAt(at.x, at.y);

  if (now - lastTap < 300 && view && view.manual) {
    fitView(view);
    view.touched = false;
    lastTap = 0;                      // a third tap is not a second one
    return;
  }
  lastTap = now;
}


/* ------------------------------------------------------------------
   HOVER + CLICK
   ------------------------------------------------------------------ */

function viewAt(x, y) {
  for (const v of VIEWS) {
    if (x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h) return v;
  }
  return null;
}

function pickWord() {
  const view = viewAt(mouseX, mouseY);
  if (!view || !view.ready) return null;

  let best = null, bestZ = -Infinity;

  for (const w of words) {
    const pr = project(view, w);
    if (!pr) continue;

    const m = affineFor(view, w, pr);
    const det = m.a * m.d - m.b * m.c;
    if (Math.abs(det) < 1e-6) continue;          // edge-on, nothing to hit

    const dx = mouseX - m.e, dy = mouseY - m.f;
    const u = ( m.d * dx - m.c * dy) / det;
    const v = (-m.b * dx + m.a * dy) / det;

    const piv = pivotOf(w);
    if (u < -piv || u > wordWidth(w) - piv) continue;
    if (v < -w.size / 2 || v > w.size / 2) continue;

    if (pr.P.z > bestZ) { best = w; bestZ = pr.P.z; }
  }
  return best;
}

// p5 listens on the window, so presses on the page chrome arrive here too.
function mousePressed(event) {
  if (event && event.target !== canvasEl) return;

  if (pointers.size >= 2) return;    // two fingers down is a pinch, not an orbit

  const view = viewAt(mouseX, mouseY);
  if (view && view.manual) {
    dragging = view;
    fitPending = false;               // they have taken it; stop waiting to frame it
  }

  pressX = lastX = mouseX;
  pressY = lastY = mouseY;
}

function mouseReleased() {
  dragging = null;
  document.body.classList.remove('grabbing');

  if (pinched) return;

  const moved = Math.hypot(mouseX - pressX, mouseY - pressY);
  if (moved >= 4) return;                       // that was a drag

  if (!hovered || !hovered.url) {
    selected = null;                            // tapped the white
    return;
  }

  if (!touchUI) {
    window.open(hovered.url, '_blank');
    return;
  }

  if (selected === hovered) {
    window.open(hovered.url, '_blank');
    selected = null;
  } else {
    selected = hovered;
  }
}

function mouseDragged(event) {
  if (!dragging || gesture) return;
  document.body.classList.add('grabbing');

  const dx = mouseX - lastX;
  const dy = mouseY - lastY;
  lastX = mouseX;
  lastY = mouseY;

  dragging.touched = true;            // theirs now; resizing will not re-frame it

  if (event && event.shiftKey) {
    pan(dragging, dx, dy);
  } else {
    dragging.yaw   += dx * CFG.orbitRate;
    dragging.pitch -= dy * CFG.orbitRate;
    dragging.pitch  = constrain(dragging.pitch, -HALF_PI + 0.05, HALF_PI - 0.05);
  }
  return false;                       // no text selection while dragging
}

function pan(view, dx, dy) {
  const d = camUnapply(view, { x: -dx / view.zoom, y: -dy / view.zoom, z: 0 });
  view.focus = {
    x: view.focus.x + d.x,
    y: view.focus.y + d.y,
    z: view.focus.z + d.z
  };
}

function zoomAt(view, next, sx, sy) {
  const k = 1 / view.zoom - 1 / next;
  const d = camUnapply(view, {
    x: (sx - view.cx) * k,
    y: (sy - view.cy) * k,
    z: 0
  });

  view.focus = {
    x: view.focus.x + d.x,
    y: view.focus.y + d.y,
    z: view.focus.z + d.z
  };
  view.zoom = next;
}

function mouseWheel(event) {
  const view = viewAt(mouseX, mouseY);
  if (!view || !view.manual) return;
  fitPending = false;
  view.touched = true;

  zoomAt(view, constrain(
    view.zoom * Math.exp(-event.delta * CFG.zoomRate),
    CFG.zoomMin, CFG.zoomMax
  ), mouseX, mouseY);

  return false;                       // keep the page from scrolling
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    CFG.faceCamera = !CFG.faceCamera;
  }

  if (key === 'm' || key === 'M') setMuted(!Voice.muted);
}

function doubleClicked() {
  const view = viewAt(mouseX, mouseY);
  if (view && view.manual) {
    fitView(view);
    view.touched = false;
  }
  return false;
}


/* ------------------------------------------------------------------
   PAGE CHROME
   ------------------------------------------------------------------ */

function updateHud() {
  if (hovered) {
    const key = `${hovered.id}:${hovered.links}:${selected === hovered}`;

    if (key !== readoutKey) {
      readoutKey = key;

      const [r, g, b] = hovered.rgb;
      readoutEl.style.background = `rgb(${r} ${g} ${b})`;
      readoutEl.style.color = readableOn(r, g, b);

      const bind = hovered.bindChar ? `bound on ${hovered.bindChar}` : 'unbound';

      const open = touchUI
        ? (selected === hovered ? 'tap again to open' : 'tap to open')
        : 'click to open';

      // textContent, not innerHTML: the title comes off the wire from
      // Wikipedia, and text that is never parsed as markup needs no escaping.
      readoutEl.textContent =
        `${hovered.title} \u2022 ${hovered.wiki} \u2022 ${bind}` +
        ` \u2022 ${hovered.links} link${hovered.links === 1 ? '' : 's'}` +
        ` \u2022 ${open}`;
    }
    readoutEl.classList.add('on');
  } else {
    readoutKey = '';
    readoutEl.classList.remove('on');
  }

  if (millis() - lastHud < 200) return;
  lastHud = millis();

  statEls.stream.textContent = status;
  statEls.stream.classList.toggle('warn', status !== 'connected');
  statEls.tangle.textContent = `${words.length} / ${CFG.maxWords}`;
  statEls.seen.textContent   = seen;
  statEls.bound.textContent  = `${bound} / ${refused} refused`;
  statEls.fps.textContent    = Math.round(frameRate());
}

// Black or white, whichever has the better contrast ratio against the pill.
// WCAG relative luminance rather than plain brightness, so the greens and
// blues — which the eye reads as lighter than their raw numbers suggest —
// land on the right side of the line.
function readableOn(r, g, b) {
  const lin = c => (c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#000' : '#fff';
}


