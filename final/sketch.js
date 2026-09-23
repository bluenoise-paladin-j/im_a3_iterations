/* WikiTree — Jared Amuso

   Live edits from Wikipedia arrive as article titles. Each new title binds to
   a word already in the tangle at a letter they share, and that letter's
   phoneme sounds as it lands.

   p5.js 2.3.3 (WEBGL) and p5.sound 0.4.1. */


/* ------------------------------------------------------------------
   CONFIG (p5js)
   ------------------------------------------------------------------ */

const CFG = {
  stream:    'https://stream.wikimedia.org/v2/stream/recentchange',
  maxWords:  16,
  intakeMs:  700,     // gap between titles (time)
  baseSize:  30,

  innerBias:  0.80,
  digitRatio: 0.25,   // filter/skip titles that are mostly numbers

  orbitRate: 0.006,
  zoomRate:  0.0016,
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

  goldenAngle:  2.39996323,
  spiralJitter: 0.14,   // keeps it from feeling mechanical by adding some randomness to the spiral

  twist: 0.62,
  lean:  0.42,

  shellR: 170,
  curl:   0.75,

  fadeSecs:   1.4,
  weightName: 'areal-medium.ttf'
};

const PALETTE = [
  '#ff2e70',
  '#E8412A',
  '#F2A100',
  '#1F8A70',
  '#2E7CC4',
  '#1B3A6B',
  '#6B4BE8'
];

const VIEWS = [
  // main view, framed once then the viewer's to orbit and zoom
  { yaw: 0.42, pitch: 0.24, fill: 0.97, trim: 0.92, manual: true },

  // core view, fixed on the middle of the tangle
  { yaw: 1.5708, pitch: 0.12, still: true, span: 250 }
];

const UP   = new p5.Vector(0, 1, 0);   // p5's y runs down the screen
const CORE = new p5.Vector(0, 0, 0);   // the tangle's fixed heart


/* ------------------------------------------------------------------
   STATE (vanilla js)
   ------------------------------------------------------------------ */

// the tangle
let words  = [];
let fading = [];             // retired, still fading out
let nextId = 1;
let measureG;

// the stream
let pending = null;          // only ever the newest event
let lastIntake = 0;
let status = 'booting';
let seen = 0, bound = 0, refused = 0;

// looking and pointing
let hovered  = null;
let selected = null;         // on touch, the word the first tap picked
let dragging = null;
let grabbing = false;
let pressX = 0, pressY = 0;
let lastX  = 0, lastY  = 0;
let fitPending = true;
let cursorNow  = '';

// touch
let touchUI   = false;
let fingerIds = new Set();   // touches that started on the canvas
let gesture   = null;
let pinched   = false;       // stops the tap that ends a pinch from opening a link
let lastTap   = 0;           // browsers don't send double-tap, so we track it

// page
let canvasEl;
let statEls = {};
let readoutEl, infoEl, infoToggleEl, soundToggleEl, loadingEl;
let readoutKey = '';
let lastHud = 0;

// sound
let started = false;         // audio needs a user gesture first


/* ------------------------------------------------------------------
   SETUP (p5js + vanilla js)
   ------------------------------------------------------------------ */

async function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setAttributes({ antialias: true, depth: false });
  canvasEl = select('canvas').elt;
  textAlign(LEFT, CENTER);
  setOrtho();

  statEls = {
    stream: select('#stat-stream'),
    tangle: select('#stat-tangle'),
    seen:   select('#stat-seen'),
    bound:  select('#stat-bound'),
    fps:    select('#stat-fps')
  };
  readoutEl     = select('#readout');
  infoEl        = select('#info');
  infoToggleEl  = select('#info-toggle');
  soundToggleEl = select('#sound-toggle');
  loadingEl     = select('#loading');

  // p5 has no media queries
  touchUI = window.matchMedia('(pointer: coarse)').matches;

  infoToggleEl.mouseClicked(toggleInfo);

  // new colour each hover, pre-inverted so it flips back on the way out
  infoToggleEl.mouseOver(() => {
    const c = color(random(PALETTE));
    infoToggleEl.style('color', color(255 - red(c), 255 - green(c), 255 - blue(c)));
  });
  infoToggleEl.mouseOut(() => infoToggleEl.style('color', ''));

  soundToggleEl.mouseClicked(() => setMuted(!Voice.muted));

  nameGestures();

  for (const v of VIEWS) {
    v.zoom    = 1;
    v.focus   = CORE.copy();
    v.ready   = false;
    v.touched = false;
  }
  layoutViews();

  // has to be the static font, WEBGL doesn't render variable fonts
  const font = await loadFont(CFG.weightName);
  textFont(font);

  // measure text on a plain 2D buffer, cheaper than WEBGL's textWidth()
  measureG = createGraphics(10, 10);
  measureG.textFont(font);

  connect();
}

// side by side, or stacked when the screen is taller than it is wide
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

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setOrtho();
  layoutViews();

  for (const v of VIEWS) {
    if (!v.touched && v.ready) fitView(v);
  }
}

// WEBGL defaults to a perspective camera, which breaks the framing maths — keep it flat
function setOrtho() {
  ortho(-width / 2, width / 2, -height / 2, height / 2, -8000, 8000);
}


/* ------------------------------------------------------------------
   STREAM (vanilla js)
   ------------------------------------------------------------------ */

// p5 has no server sent events or JSON-from-a-string
function connect() {
  status = 'connecting';
  const source = new EventSource(CFG.stream);

  source.onopen  = () => { status = 'connected'; };
  source.onerror = () => { status = 'reconnecting'; };   // it reconnects on its own

  source.onmessage = (evt) => {
    let d;
    try { d = JSON.parse(evt.data); } catch { return; }

    seen++;
    if (accepts(d)) pending = d;
  };
}

// edits to articles, by people, with short titles that aren't mostly numbers
function accepts(d) {
  if (d.type !== 'edit') return false;
  if (d.namespace !== 0) return false;        // articles only
  if (d.bot) return false;

  const t = d.title;
  if (!t || t.length > 34) return false;

  if (!/\p{L}{3,}/u.test(t)) return false;

  const digits = (t.match(/\d/g) || []).length;
  if (digits / t.length > CFG.digitRatio) return false;

  return isLatin(t);
}

// the font only has Latin letters, so anything else would draw as nothing
function isLatin(str) {
  if (!/\p{Script=Latin}/u.test(str)) return false;
  return !/\p{L}/u.test(str.replace(/\p{Script=Latin}/gu, ''));
}

// accents off and upper case, so é binds with E
function fold(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}


/* ------------------------------------------------------------------
   WORD MODEL (p5js)
   ------------------------------------------------------------------ */

function makeWord(d) {
  const w = {
    id:    nextId++,
    title: d.title,
    url:   d.title_url,
    wiki:  d.server_name,
    col:   color(random(PALETTE)),

    size:  CFG.baseSize,
    links: 0,
    fade:  1,

    anchor:     null,       // { word, index }: the letter it hangs from
    bindChar:   null,
    pivotIndex: 0,          // its own letter that sits on the anchor
    origin:     createVector(0, 0, 0),
    pos:        createVector(0, 0, 0),
    rot:        { rx: 0, ry: 0, rz: 0 },
    phi:        0,          // where it sits on its anchor's spiral
    spawn:      0,          // how many words have branched off it

    letters: [],
    baseW:   0
  };

  measure(w);
  return w;
}

function scaleOf(w)   { return w.size / CFG.baseSize; }
function glyphX(w, k) { return w.letters[k].x * scaleOf(w); }
function wordWidth(w) { return w.baseW * scaleOf(w); }
function pivotOf(w)   { return glyphX(w, w.pivotIndex); }

// every letter's centre along the word, at the base size
function measure(w) {
  measureG.textSize(CFG.baseSize);

  let prev = 0;
  for (let k = 0; k < w.title.length; k++) {
    const next = measureG.textWidth(w.title.slice(0, k + 1));
    w.letters.push({ base: fold(w.title[k]), x: (prev + next) / 2 });
    prev = next;
  }
  w.baseW = prev;
}

function grow(w) {
  const n = min(w.links, CFG.maxLinks);
  const target = CFG.baseSize * (1 + n * CFG.growPerLink);
  w.size = lerp(w.size, target, CFG.grow);
}


/* ------------------------------------------------------------------
   BINDING (p5js + vanilla js)
   ------------------------------------------------------------------ */

function admit(d) {
  const w = makeWord(d);
  const bind = findBind(w);

  if (!bind) {
    if (words.length) { refused++; return false; }   // no free-floating words

    // the first word starts the tangle, lying across the origin
    w.pivotIndex = floor(w.letters.length / 2);
    const a = random(TWO_PI);
    orient(w, createVector(cos(a), 0, sin(a)));
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

    const links = bind.spot.word.links;
    Voice.play(bind.base, {
      pan:  constrain(w.pos.x / 260, -1, 1),
      gain: 0.55 + min(links, 5) * 0.09,
      links
    });
  }

  words.push(w);
  if (words.length > CFG.maxWords) retire();
  return true;
}

// first letter already in the tangle, picked at random among its matches
function findBind(w) {
  for (let i = 0; i < w.letters.length; i++) {
    const base = w.letters[i].base;
    if (!/[A-Z0-9]/.test(base)) continue;   // plain regex, p5 2.x has no match()

    const spots = anchorSpots(base);
    if (spots.length) {
      return { localIndex: i, base, spot: pickInner(spots) };
    }
  }
  return null;
}

function anchorSpots(base) {
  const spots = [];
  for (const other of words) {
    for (let k = 0; k < other.letters.length; k++) {
      if (other.letters[k].base === base) spots.push({ word: other, index: k });
    }
  }
  return spots;
}

// prefers free letters near the heart, and words with fewer branches
function pickInner(spots) {
  if (spots.length === 1) return spots[0];

  const taken = new Set();
  for (const w of words) {
    if (w.anchor) taken.add(spotKey(w.anchor.word, w.anchor.index));
  }

  let pool = spots.filter(s => !taken.has(spotKey(s.word, s.index)));
  if (!pool.length) pool = spots;
  if (pool.length <= 2) return random(pool);

  const scored = pool
    .map(s => ({ s, d: glyphWorld(s.word, s.index).dist(CORE) }))
    .sort((a, b) => a.d - b.d);

  const n = max(1, ceil(scored.length * CFG.innerBias));
  const a = scored[floor(random(n))].s;
  const b = scored[floor(random(n))].s;

  return a.word.spawn <= b.word.spawn ? a : b;
}

function spotKey(w, index) { return w.id + ':' + index; }

// only ever retires a leaf, so the tangle stays one tree
function retire() {
  const holds = new Set();
  for (const w of words) if (w.anchor) holds.add(w.anchor.word);

  const gone = words.splice(words.findIndex(w => !holds.has(w)), 1)[0];
  if (gone.anchor) gone.anchor.word.links--;
  gone.anchor = null;   // so it can't light up as a neighbour while it fades
  fading.push(gone);
}

// each word sits on its anchor's letter, so anchors are placed first
function resolvePositions() {
  const placed = new Set();

  const place = (w) => {
    if (placed.has(w)) return;
    placed.add(w);

    if (w.anchor) {
      place(w.anchor.word);
      w.pos = glyphWorld(w.anchor.word, w.anchor.index);
    } else {
      w.pos = w.origin;
    }
  };

  for (const w of words) place(w);
}


/* ------------------------------------------------------------------
   SHAPE (p5js)
   ------------------------------------------------------------------ */

// shared vectors (UP, CORE, a word's pos, a view's focus) go through the
// static p5.Vector.add/sub/mult so they're copied, never changed in place

function dirOf(w) { return rotApply(w.rot, createVector(1, 0, 0)); }

function glyphWorld(w, k) {
  const off = rotApply(w.rot, createVector(glyphX(w, k) - pivotOf(w), 0, 0));
  return p5.Vector.add(w.pos, off);
}

// a new word leaves its anchor at a branch angle, turned round the anchor's
// axis on a golden-angle spiral so siblings spread out
function branchFrom(anchorWord, at) {
  const p = dirOf(anchorWord);
  const { u, v } = perpFrame(p);

  const phi = anchorWord.phi + CFG.twist
            + anchorWord.spawn++ * CFG.goldenAngle
            + random(-CFG.spiralJitter, CFG.spiralJitter);

  const theta = branchAngle();
  const off = p5.Vector.mult(u, cos(phi)).add(p5.Vector.mult(v, sin(phi)));
  const dir = p5.Vector.mult(p, cos(theta)).add(p5.Vector.mult(off, sin(theta)));

  return { dir: curlInward(dir.normalize(), at), phi };
}

function branchAngle() {
  let r = random();
  for (const b of CFG.branch) {
    if ((r -= b.weight) <= 0) return radians(b.deg + random(-b.jitter, b.jitter));
  }
  const b = CFG.branch[CFG.branch.length - 1];
  return radians(b.deg + random(-b.jitter, b.jitter));
}

// past the shell, bend back toward the heart so the tangle doesn't wander off
function curlInward(d, at) {
  const r = at.mag();
  if (r < CFG.shellR) return d;

  const k = map(r, CFG.shellR, CFG.shellR * 2, 0, CFG.curl, true);
  const inward = p5.Vector.mult(at, -1).normalize();
  return p5.Vector.lerp(d, inward, k).normalize();
}

// points the word along dir, kept upright, then leaned a little
function orient(w, dir) {
  const ex = p5.Vector.normalize(dir);

  let ey = p5.Vector.sub(UP, p5.Vector.mult(ex, UP.dot(ex)));
  if (ey.mag() < 1e-6) ey = perpFrame(ex).u;
  ey.normalize();

  const lean = random(-CFG.lean, CFG.lean);
  const ez   = ex.cross(ey);
  ey = p5.Vector.mult(ey, cos(lean)).add(p5.Vector.mult(ez, sin(lean))).normalize();

  w.rot = eulerFromBasis(ex, ey);
}

function perpFrame(d) {
  const seed = abs(d.dot(UP)) > 0.95 ? createVector(0, 0, 1) : UP;
  const u = d.cross(seed).normalize();
  return { u, v: d.cross(u) };
}


/* ------------------------------------------------------------------
   MATRIX MATH (p5js — by hand, p5.Vector only rotates in 2D)
   ------------------------------------------------------------------ */

function rotApply(r, v) {
  let { x, y, z } = v;

  const c1 = cos(r.rx), s1 = sin(r.rx);
  [y, z] = [y * c1 - z * s1, y * s1 + z * c1];

  const c2 = cos(r.ry), s2 = sin(r.ry);
  [x, z] = [x * c2 + z * s2, -x * s2 + z * c2];

  const c3 = cos(r.rz), s3 = sin(r.rz);
  [x, y] = [x * c3 - y * s3, x * s3 + y * c3];

  return createVector(x, y, z);
}

function eulerFromBasis(ex, ey) {
  const ez = ex.cross(ey);
  return {
    rz: atan2(ex.y, ex.x),
    ry: atan2(-ex.z, mag(ex.x, ex.y)),
    rx: atan2(ey.z, ez.z)
  };
}

function camApply(view, v) {
  let { x, y, z } = v;

  const cy = cos(view.yaw), sy = sin(view.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = cos(view.pitch), sp = sin(view.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  return createVector(x, y, z);
}

function camUnapply(view, v) {
  let { x, y, z } = v;

  const cp = cos(-view.pitch), sp = sin(-view.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  const cy = cos(-view.yaw), sy = sin(-view.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  return createVector(x, y, z);
}


/* ------------------------------------------------------------------
   CAMERA (p5js)
   ------------------------------------------------------------------ */

// a word as the view sees it: its position, and the axes of its plane
function project(view, w) {
  const Ex = camApply(view, dirOf(w));
  return { P: camApply(view, w.pos), Ex, Ey: upFor(Ex, view, w) };
}

// the word's up, turned to face the camera
function upFor(Ex, view, w) {
  const h = mag(Ex.x, Ex.y);
  if (h < 1e-6) return camApply(view, rotApply(w.rot, createVector(0, 1, 0)));   // end-on

  return createVector(-Ex.y / h, Ex.x / h, 0);
}

// the roll around a word's own axis is free, so each view picks its own
function drawRotation(view, w, pr) {
  return eulerFromBasis(dirOf(w), camUnapply(view, pr.Ey));
}

function planePoint(pr, u, v) {
  return createVector(
    pr.P.x + u * pr.Ex.x + v * pr.Ey.x,
    pr.P.y + u * pr.Ex.y + v * pr.Ey.y
  );
}

// a word's plane in screen pixels, for hit testing
function affineFor(view, pr) {
  const k = view.zoom;
  return {
    a: k * pr.Ex.x, b: k * pr.Ex.y,
    c: k * pr.Ey.x, d: k * pr.Ey.y,
    e: view.cx + (pr.P.x - view.panX) * k,
    f: view.cy + (pr.P.y - view.panY) * k
  };
}

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

// zoom and centre on the tangle, ignoring the furthest few percent of it
function fitView(view) {
  if (view.still) return;

  const pts = [];
  for (const w of words) {
    const pr = project(view, w);
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

  view.zoom = constrain(min(
    (view.w * view.fill) / max(maxX - minX, 1),
    (view.h * view.fill) / max(maxY - minY, 1)
  ), CFG.zoomMin, CFG.zoomMax);

  view.focus = camUnapply(view, createVector((minX + maxX) / 2, (minY + maxY) / 2, 0));
}

function quantile(sorted, q) {
  const i  = (sorted.length - 1) * q;
  const lo = floor(i), hi = ceil(i);
  return lerp(sorted[lo], sorted[hi], i - lo);
}

function pan(view, dx, dy) {
  const d = camUnapply(view, createVector(-dx / view.zoom, -dy / view.zoom, 0));
  view.focus = p5.Vector.add(view.focus, d);
}

// zoom about a point on screen, so what's under it stays put
function zoomAt(view, next, sx, sy) {
  const k = 1 / view.zoom - 1 / next;
  const d = camUnapply(view, createVector((sx - view.cx) * k, (sy - view.cy) * k, 0));

  view.focus = p5.Vector.add(view.focus, d);
  view.zoom = next;
}


/* ------------------------------------------------------------------
   DRAW (p5js)
   ------------------------------------------------------------------ */

function draw() {
  background(255);

  if (words.length) loadingEl.addClass('gone');   // just the first word, not a full tangle

  if (pending && millis() - lastIntake > CFG.intakeMs) {
    if (admit(pending)) lastIntake = millis();
    pending = null;
  }

  for (const w of words) grow(w);
  resolvePositions();
  advanceFades();
  Voice.update();

  hovered = pickWord();
  setCursor(grabbing ? 'grabbing' : hovered ? HAND : 'grab');

  if (fitPending && words.length >= ceil(CFG.maxWords * 0.85)) {
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
  // paint order decides overlap, not depth — far to near
  const shots = [...words, ...fading]
    .map(w => ({ w, pr: project(view, w) }))
    .sort((a, b) => a.pr.P.z - b.pr.P.z);

  push();
  noStroke();

  // keep each view inside its own half of the canvas
  beginClip();
  rect(view.x - width / 2, view.y - height / 2, view.w, view.h);
  endClip();

  translate(view.cx - width / 2, view.cy - height / 2, 0);
  scale(view.zoom);
  translate(-view.panX, -view.panY, 0);
  rotateX(view.pitch);
  rotateY(view.yaw);

  for (const { w, pr } of shots) {
    const alpha = 255 * w.fade;

    // the hovered word in black, its neighbours solid, the rest multiplied
    if (w === hovered) {
      blendMode(BLEND);
      fill(0, alpha);
    } else {
      blendMode(isNeighbour(w) ? BLEND : MULTIPLY);
      fill(red(w.col), green(w.col), blue(w.col), alpha);
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
  pop();
}

// cursor() writes canvas.style every call, so only on a change
function setCursor(type) {
  if (type === cursorNow) return;
  cursorNow = type;
  cursor(type);
}


/* ------------------------------------------------------------------
   MOUSE + KEYS (p5js + vanilla js)
   ------------------------------------------------------------------ */

function viewAt(x, y) {
  for (const v of VIEWS) {
    if (x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h) return v;
  }
  return null;
}

// the nearest word whose plane is under the pointer
function pickWord() {
  const view = viewAt(mouseX, mouseY);
  if (!view || !view.ready) return null;

  let best = null, bestZ = -Infinity;

  for (const w of words) {
    const pr = project(view, w);
    const m = affineFor(view, pr);
    const det = m.a * m.d - m.b * m.c;
    if (abs(det) < 1e-6) continue;               // edge-on, nothing to hit

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

// p5 listens on the window, so clicks on the page chrome land here too
function mousePressed(event) {
  begin();
  if (event.target !== canvasEl) return;

  // p5 sends every finger through here, one press each
  if (event.pointerType === 'touch') {
    fingerIds.add(event.pointerId);
    const n = fingers().length;
    if (n === 1) { pinched = false; tapReframe(); }
    if (n === 2) beginGesture();
  }
  if (fingers().length >= 2) return;  // two fingers is a pinch, not an orbit

  const view = viewAt(mouseX, mouseY);
  if (view && view.manual) {
    dragging = view;
    fitPending = false;               // they have taken it; stop waiting to frame it
  }

  pressX = lastX = mouseX;
  pressY = lastY = mouseY;
}

function mouseReleased(event) {
  fingerIds.delete(event.pointerId);
  if (gesture && fingers().length < 2) endGesture();

  dragging = null;
  grabbing = false;

  if (pinched) return;

  const moved = dist(mouseX, mouseY, pressX, pressY);
  if (moved >= 4) return;                       // was a drag

  if (!hovered || !hovered.url) {
    selected = null;
    return;
  }

  // p5 has no way to open a link
  if (!touchUI) {
    window.open(hovered.url, '_blank');
    return;
  }

  // on touch the first tap shows the readout, the second opens it
  if (selected === hovered) {
    window.open(hovered.url, '_blank');
    selected = null;
  } else {
    selected = hovered;
  }
}

function mouseDragged(event) {
  if (gesture) {
    updateGesture();
    return false;
  }
  if (!dragging) return;
  grabbing = true;

  const dx = mouseX - lastX;
  const dy = mouseY - lastY;
  lastX = mouseX;
  lastY = mouseY;

  dragging.touched = true;            // it's theirs now, stop auto-framing it

  if (event.shiftKey) {
    pan(dragging, dx, dy);
  } else {
    dragging.yaw   += dx * CFG.orbitRate;
    dragging.pitch -= dy * CFG.orbitRate;
    dragging.pitch  = constrain(dragging.pitch, -HALF_PI + 0.05, HALF_PI - 0.05);
  }
  return false;
}

function mouseWheel(event) {
  const view = viewAt(mouseX, mouseY);
  if (!view || !view.manual) return;
  fitPending = false;
  view.touched = true;

  zoomAt(view, constrain(
    view.zoom * exp(-event.delta * CFG.zoomRate),
    CFG.zoomMin, CFG.zoomMax
  ), mouseX, mouseY);

  return false;
}

function doubleClicked() {
  const view = viewAt(mouseX, mouseY);
  if (view && view.manual) {
    fitView(view);
    view.touched = false;
  }
  return false;
}

function keyPressed() {
  begin();

  if (key === 'm' || key === 'M') setMuted(!Voice.muted);
}


/* ------------------------------------------------------------------
   TOUCH GESTURES (p5js)
   ------------------------------------------------------------------ */

// p5's touches also lists a mouse that is only hovering, and a cancelled
// touch just drops out of it, so only count fingers that landed on the canvas
function fingers() {
  return touches.filter(t => fingerIds.has(t.id));
}

function midOf(a, b) { return createVector((a.x + b.x) / 2, (a.y + b.y) / 2); }

function beginGesture() {
  const [a, b] = fingers();
  const mid  = midOf(a, b);
  const view = viewAt(mid.x, mid.y);

  if (!view || !view.manual) return;

  gesture = { view, gap: dist(a.x, a.y, b.x, b.y), x: mid.x, y: mid.y };

  dragging = null;
  pinched  = true;
  lastTap  = 0;

  view.touched = true;
  fitPending   = false;
}

// pinch zooms about the fingers, moving them together pans
function updateGesture() {
  const [a, b] = fingers();
  if (!b) { endGesture(); return; }   // a finger was cancelled

  const mid  = midOf(a, b);
  const gap  = dist(a.x, a.y, b.x, b.y);
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
  gesture  = null;
  dragging = null;
}

function tapReframe() {
  const now  = millis();
  const view = viewAt(mouseX, mouseY);

  if (now - lastTap < 300 && view && view.manual) {
    fitView(view);
    view.touched = false;
    lastTap = 0;                      // a third tap is not a second one
    return;
  }
  lastTap = now;
}


/* ------------------------------------------------------------------
   PAGE CHROME (p5js + vanilla js)
   ------------------------------------------------------------------ */

function toggleInfo() {
  infoEl.toggleClass('open');
  const open = infoEl.hasClass('open');

  if (open) infoEl.removeAttribute('inert');
  else      infoEl.attribute('inert', '');
  infoToggleEl.attribute('aria-expanded', String(open));
}

function setMuted(muted) {
  Voice.setMuted(muted);
  soundToggleEl.html(muted ? 'muted' : 'on');
  soundToggleEl.attribute('aria-pressed', String(muted));
}

function nameGestures() {
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

  const list = select('#controls');
  for (const r of rows) createElement('li', r).parent(list);
}

function updateHud() {
  if (hovered) {
    const key = `${hovered.id}:${hovered.links}:${selected === hovered}`;

    if (key !== readoutKey) {
      readoutKey = key;

      readoutEl.style('background', hovered.col);
      readoutEl.style('color', readableOn(hovered.col));

      const bind = hovered.bindChar ? `bound on ${hovered.bindChar}` : 'unbound';

      const open = touchUI
        ? (selected === hovered ? 'tap again to open' : 'tap to open')
        : 'click to open';

      // textContent, not p5's html() — that's innerHTML, and wiki titles come off the stream
      readoutEl.elt.textContent =
        `${hovered.title} • ${hovered.wiki} • ${bind}` +
        ` • ${hovered.links} link${hovered.links === 1 ? '' : 's'}` +
        ` • ${open}`;
    }
    readoutEl.addClass('on');
  } else {
    readoutKey = '';
    readoutEl.removeClass('on');
  }

  if (millis() - lastHud < 200) return;
  lastHud = millis();

  statEls.stream.html(status);
  if (status === 'connected') statEls.stream.removeClass('warn');
  else                        statEls.stream.addClass('warn');
  statEls.tangle.html(`${words.length} / ${CFG.maxWords}`);
  statEls.seen.html(seen);
  statEls.bound.html(`${bound} / ${refused} refused`);
  statEls.fps.html(round(frameRate()));
}

// black or white, whichever reads better — WCAG luminance, which p5 doesn't have
function readableOn(c) {
  const lin = v => (v /= 255) <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(red(c)) + 0.7152 * lin(green(c)) + 0.0722 * lin(blue(c));
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#000' : '#fff';
}


/* ------------------------------------------------------------------
   VOICE (p5js + vanilla js)
   ------------------------------------------------------------------ */

const TONE = {
  root:   130.81,             // C3
  scale:  [0, 3, 5, 7, 10],   // minor pentatonic, nothing clashes
  steps:  14,                 // A..Z spans about two and a half octaves
  voices: 12,
  level:  0.16,
  drone:  0.035
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

// a letter's pitch on the scale, an octave down once its anchor is busy
function noteFor(ch, links) {
  const i = max(0, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(ch));
  const n = round(map(i, 0, 25, 0, TONE.steps));

  let octave = floor(n / TONE.scale.length);
  if (links >= 3) octave -= 1;

  const semitones = TONE.scale[n % TONE.scale.length] + octave * 12;
  return TONE.root * pow(2, semitones / 12);
}

// audio needs a user gesture first — mousePressed() and keyPressed() call this
function begin() {
  if (started) return;
  started = true;

  try { Voice.start(); } catch { /* fine without audio */ }
  setMuted(Voice.muted);
}


// p5.sound 0.4.1 is a thin layer over Tone.js. The few things it can't do
// reach the Tone.js node underneath (.node), and each one says why.

// every p5.sound node plugs itself into the speakers when it's made,
// so unplug it first, then wire it where it belongs
function route(from, ...to) {
  from.disconnect();
  for (const t of to) from.connect(t);
  return from;
}

// p5.sound starts oscillators at -6dB, so bring them back up to full
function makeOsc(freq, type) {
  const o = new p5.Oscillator(freq, type);
  o.amp(1, 0);
  return o;
}

function detuned(freq, cents) { return freq * pow(2, cents / 1200); }


const Voice = {
  ready: false,
  muted: false,
  playing: [],

  start() {
    this.master = new p5.Gain(TONE.level);

    // p5.sound schedules everything 0.1s ahead, so the sound would trail the bind
    this.master.node.context.lookAhead = 0;

    const shelf = new p5.LowPass(7000);

    // p5.sound's Compressor is an empty stub in 0.4.1, so the limiter stays plain Web Audio
    const ctx = getAudioContext();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;
    limiter.connect(ctx.destination);

    route(this.master, shelf);
    route(shelf, limiter);

    // reverb on a send, all wet, back into the master
    const verb = new p5.Reverb(2.6);
    verb.wet(1);
    route(verb, this.master);
    this.send = route(new p5.Gain(0.5), verb);

    this.startDrone();
    this.ready = true;
  },

  startDrone() {
    this.droneFilter = new p5.LowPass(420);
    this.droneFilter.res(2);

    const swell = new p5.Envelope(8, 0.01, 1, 1);   // fades in over 8s, then holds
    const level = route(new p5.Gain(TONE.drone), this.master);
    route(swell, level);
    route(this.droneFilter, swell);

    for (const mult of [1, 1.5, 2.005]) {
      const o = makeOsc(detuned(TONE.root * 0.5 * mult, random(-4, 4)), 'sawtooth');
      route(o, this.droneFilter);
      o.start();
    }

    swell.triggerAttack();
    this.droneStart = millis();
  },

  // called from draw() — p5.sound can't wire an LFO to a filter, so the drone's
  // slow sweep is stepped here, and finished notes get cleared away
  update() {
    if (!this.ready) return;

    const t = (millis() - this.droneStart) / 1000;
    this.droneFilter.freq(420 + 170 * sin(TWO_PI * 0.035 * t));

    this.tidy();
  },

  setMuted(on) {
    this.muted = on;
    // p5.Gain's amp() is broken in 0.4.1, so ramp the Tone.js gain underneath
    if (this.master) this.master.node.gain.rampTo(on ? 0 : TONE.level, 0.05);
  },

  play(ch, { pan, gain, links }) {
    if (!this.ready || this.muted) return;

    const kind = articulationOf(ch);
    const freq = noteFor(ch, links);

    this.tidy();
    if (this.playing.length >= TONE.voices) this.clear(this.playing.shift());

    // each note: its sounds -> one envelope -> its level -> a pan -> master + reverb
    const env    = new p5.Envelope();
    const shaped = SHAPES[kind](freq, env);
    env.setADSR(shaped.attack, shaped.length - shaped.attack, 0, 0.05);

    const level  = new p5.Gain(gain * shaped.peak);
    const panner = new p5.Panner(pan);
    route(env, level);
    route(level, panner);
    route(panner, this.master, this.send);

    env.triggerAttack();

    this.playing.push({
      until: millis() + (shaped.length + 0.1) * 1000,
      nodes: [...shaped.nodes, env, level, panner]
    });
  },

  tidy() {
    const now = millis();
    for (const v of this.playing) if (v.until <= now) this.clear(v);
    this.playing = this.playing.filter(v => v.until > now);
  },

  // p5.sound has no dispose(), and the Tone.js nodes under a note keep signal
  // sources running until they're disposed, so a finished note is cleared by hand
  clear(v) {
    for (const n of v.nodes) {
      n.disconnect();
      n.node.dispose();
    }
  }
};


/* ------------------------------------------------------------------
   INSTRUMENTS (p5js)
   ------------------------------------------------------------------ */

// each one wires its sounds into `out` (the note's envelope) and starts them
const SHAPES = {
  vowel(freq, out) {
    const body = new p5.LowPass(freq * 4);
    const bodyGain = route(new p5.Gain(0.7), out);
    route(body, bodyGain);

    const formant = new p5.BandPass(min(freq * 3.2, 2600));
    formant.res(3.5);
    const formantGain = route(new p5.Gain(0.8), out);
    route(formant, formantGain);

    const nodes = [body, bodyGain, formant, formantGain];
    for (const cents of [-6, 6]) {
      const o = route(makeOsc(detuned(freq, cents), 'sawtooth'), body, formant);
      o.start();
      nodes.push(o);
    }
    return { nodes, attack: 0.09, length: 2.4, peak: 0.5 };
  },

  nasal(freq, out) {
    const lp = route(new p5.LowPass(freq * 2.4), out);
    const o  = route(makeOsc(freq * 0.5, 'sine'), lp);
    o.start();
    return { nodes: [lp, o], attack: 0.14, length: 2.0, peak: 0.7 };
  },

  liquid(freq, out) {
    const lp = route(new p5.LowPass(freq * 4), out);
    const o  = route(makeOsc(freq * 0.72, 'triangle'), lp);
    o.start();
    o.freq(freq, 0.28);   // slides up into the note
    return { nodes: [lp, o], attack: 0.11, length: 1.8, peak: 0.6 };
  },

  fricative(freq, out) {
    const bp = route(new p5.BandPass(2400 + freq * 2), out);
    bp.res(0.8);
    const hiss = route(new p5.Noise('white'), bp);

    const humGain = route(new p5.Gain(0.16), out);
    const hum = route(makeOsc(freq, 'sine'), humGain);

    hiss.start();
    hum.start();
    return { nodes: [bp, hiss, humGain, hum], attack: 0.17, length: 1.1, peak: 0.34 };
  },

  plosive(freq, out) {
    const lp = route(new p5.LowPass(freq * 8), out);
    // p5.sound's freq() can't ramp a filter, so sweep the Tone.js one underneath
    lp.node.frequency.exponentialRampTo(freq * 1.5, 0.25);
    const o = route(makeOsc(freq, 'triangle'), lp);

    // a 50ms tick of noise on the front
    const tickGain = route(new p5.Gain(0.35), out);
    const tick = route(new p5.Envelope(0.001, 0.05, 0, 0.01), tickGain);
    const hp = route(new p5.HighPass(1800), tick);
    const burst = route(new p5.Noise('white'), hp);

    o.start();
    burst.start();
    tick.triggerAttack();
    return { nodes: [lp, o, tickGain, tick, hp, burst], attack: 0.006, length: 0.9, peak: 0.75 };
  },

  affricate(freq, out) {
    const p = SHAPES.plosive(freq, out);

    const hissGain = route(new p5.Gain(0.3), out);
    const fade = route(new p5.Envelope(0.04, 0.46, 0, 0.01), hissGain);
    const bp = route(new p5.BandPass(3600), fade);
    bp.res(1.2);
    const hiss = route(new p5.Noise('white'), bp);

    hiss.start();
    fade.triggerAttack();
    return { nodes: [...p.nodes, hissGain, fade, bp, hiss], attack: 0.008, length: 1.0, peak: 0.7 };
  }
};
