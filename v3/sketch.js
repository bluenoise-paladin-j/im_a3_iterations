/* ===================================================================
   ENTANGLEMENT — v3 : voice
   -------------------------------------------------------------------
   The tangle is a single structure in 3D space, shown simultaneously
   from two fixed angles. Neither can be orbited; each continuously
   reframes itself, easing rather than jumping as words arrive, grow
   and expire. Left holds the whole network; right sits in close on the
   knot, where the type runs off every edge.

   The tangle is one tree and never anything else. The only word ever
   removed is a leaf — the oldest word with nothing hanging from it — so
   no word is ever orphaned, nothing is ever re-tied, and no word ever
   moves once placed. Islands cannot form, because there is nothing that
   could come away from the rest.

   A retired word leaves the tangle at once but not the screen: it is
   held apart and taken down over `fadeSecs`, so nothing ever simply
   blinks out.

   New in v3:
     - every tie sounds. The letter that binds two words decides the
       note and the instrument, and the instrument is chosen by how that
       letter is actually made in the mouth — open, closed, hummed or
       hissed. Played rather than spoken: a synthesised voice reciting
       the alphabet is a novelty, this is meant to be listenable
     - everything is pitched to a minor pentatonic, so two letters
       arriving together can never sound like a mistake
     - a title card, because the browser will not start audio without a
       gesture and the piece needed a way in regardless

   From v2.8:
     - the left view no longer frames itself. It is framed once, when the
       tangle first fills, and from then on it belongs to whoever is
       looking at it: drag to orbit, shift-drag to pan, scroll to zoom,
       double-click to frame it again
     - a view looks at a `focus` — a point in the world, not a position
       on screen — so orbiting turns the camera around whatever is being
       looked at rather than sliding it out of frame
     - the right view is untouched by any of it

   From v2.7:
     - the right view no longer reframes. It sits on a fixed point at a
       fixed zoom, because the tangle turns out to have a constant heart
       to sit on: new words are drawn inward toward the world origin, so
       the structure mean-reverts to it instead of wandering
     - that heart is hollow. Measured over a long run, only about 7% of
       glyph positions fall within 100 units of the origin, 64% within
       200 and 93% within 300 — the mass forms a shell. A tight frame at
       the centre cuts through that shell from any angle, which is why it
       is always full of type
     - every word takes a colour of its own, and both views draw in
       MULTIPLY. A word alone reads as its true colour; where two cross,
       the colours darken into a third. The crossings make the colour,
       which is the same coincidence the whole piece is built on.
       (p5 has no DIFFERENCE in WEBGL, and EXCLUSION — the one mode that
       does invert there — turns magenta green, which is not this.)

   From v2.6:
     - drawn in WEBGL, using the static Medium cut. p5 reads outlines
       from the font's `glyf` table, and a variable font keeps its
       outlines as deltas in `gvar` which p5 never applies — load the
       variable file in WEBGL and it silently draws nothing
     - orthographic projection, so the CPU maths used for framing and
       picking matches what the GPU draws

   From v2:
     - split viewport, two fixed cameras, each with its own crop
     - continuous auto-framing (smoothed pan + zoom per view)
     - titles heavy with digits are rejected
     - hover a word to colour it and reveal what it is bound to
     - click a word to open its Wikipedia article

   Run with Live Server. Black on white; the design pass is v4.
   =================================================================== */


/* ------------------------------------------------------------------
   CONFIG
   ------------------------------------------------------------------ */

const CFG = {
  stream:    'https://stream.wikimedia.org/v2/stream/recentchange',
  maxWords:  26,      // one per letter of the alphabet
  intakeMs:  700,     // minimum gap between accepted titles
  baseSize:  30,      // px, at MONO 0 / wght 400

  // When a letter appears in several places, the anchor is drawn from
  // this fraction of them nearest the middle of the tangle. Choosing
  // uniformly makes each new word a free step of a random walk, and a
  // random walk has no stable size — the structure creeps further apart
  // for as long as it runs. Biasing inward makes it mean-reverting.
  innerBias:  0.45,
  digitRatio: 0.25,   // reject titles more than this fraction digits

  // Camera. The left view is driven by hand, so these are input rates
  // rather than easing rates.
  orbitRate: 0.006,   // radians per pixel dragged
  zoomRate:  0.0016,  // per unit of wheel delta
  zoomMin:   0.05,
  zoomMax:   12,

  // Growth. A word's size rises with how many letter connections it
  // holds, eased every frame so the change is continuous.
  //
  // Only the size moves. Glyph offsets scale linearly with it, so they
  // are measured once and multiplied.
  growPerLink: 0.26,
  maxLinks:    5,
  grow:        0.035,

  // Seconds a retired word takes to go. It is held out of the tangle the
  // moment it retires — nothing can bind to it and it counts for
  // nothing — but it stays on screen while it goes out.
  fadeSecs:    1.4,
  weightName: 'areal-medium.ttf'
};

// One is picked at random for each word as it arrives. Flat and
// saturated, so they stay legible once MULTIPLY has darkened the
// overlaps into each other.
const PALETTE = [
  '#FF2D6F',  // magenta
  '#E8412A',  // red
  '#F2A100',  // amber
  '#1F8A70',  // green
  '#2E7CC4',  // blue
  '#1B3A6B',  // navy
  '#6B4BE8'   // violet
];

// Two fixed cameras, side by side. `fill` is how much of its cell the
// tangle is asked to occupy. Below 1 the whole structure stays inside
// the frame; above 1 it is deliberately overscaled so the type runs off
// every edge and the cell reads as a composition rather than a diagram.
// `trim` is the fraction of the tangle a view frames around, measured
// outward from the median. Below 1 it ignores the furthest stragglers,
// which otherwise stretch the frame and shrink everything else to
// nothing — one long title at a shallow angle can span the whole cell.
const VIEWS = [
  // Left: the viewer's. Framed once on load, then theirs to move.
  { name: 'network', yaw: 0.42, pitch: 0.24, fill: 0.97, trim: 0.92,
    manual: true },

  // Right: a fixed camera on the core. `span` is the height of world it
  // covers, in the same units the tangle is built in — smaller is
  // tighter. Nothing about this view responds to what arrives.
  { name: 'core', yaw: 1.5708, pitch: 0.12, still: true, span: 520 }
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
let lastX  = 0, lastY  = 0;  // previous pointer position, tracked here rather than
                             // read from p5's movedX/movedY, which report 0 unless
                             // its own frame bookkeeping has advanced in between
let fitPending = true;       // frame the manual view once, once there is something to frame
let started = false;         // audio cannot begin until the viewer asks for it

let hudEls = {};
let readoutEl = null;
let lastHud = 0;


/* ------------------------------------------------------------------
   SETUP
   ------------------------------------------------------------------ */

let font;                    // the loaded p5.Font, required by WEBGL text()
let measureG;                // a 2D buffer used only for measuring widths

async function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  setAttributes('antialias', true);
  textAlign(LEFT, CENTER);
  setOrtho();

  hudEls = {
    status: document.getElementById('hud-status'),
    count:  document.getElementById('hud-count'),
    seen:   document.getElementById('hud-seen'),
    bound:  document.getElementById('hud-bound'),
    fps:    document.getElementById('hud-fps'),
    sound:  document.getElementById('hud-sound')
  };
  readoutEl = document.getElementById('readout');

  // Browsers will not start audio without a gesture, so the piece needs
  // a way in regardless. That requirement is the title card.
  document.getElementById('enter').addEventListener('click', begin);

  for (const v of VIEWS) {
    v.zoom  = 1;
    v.panX  = 0;
    v.panY  = 0;
    v.focus = { x: CORE.x, y: CORE.y, z: CORE.z };
    v.ready = false;
  }
  fitPending = true;
  layoutViews();

  // WEBGL text() needs a p5.Font with real outlines, which only
  // loadFont() produces — a CSS face is not enough.
  font = await loadFont(CFG.weightName);
  textFont(font);

  // Glyph offsets are still measured on a 2D context: textWidth() in
  // WEBGL goes through the same font but a plain 2D buffer is cheaper
  // and keeps measuring independent of the 3D transform stack.
  await document.fonts.load(`${CFG.baseSize}px Areal`);
  measureG = createGraphics(10, 10);
  measureG.pixelDensity(1);
  measureG.textFont('Areal');
  measureG.textAlign(LEFT, CENTER);

  connect();
}

// Split the canvas into equal columns, one per view.
function layoutViews() {
  const cw = width / VIEWS.length;
  VIEWS.forEach((v, i) => {
    v.x  = i * cw;
    v.y  = 0;
    v.w  = cw;
    v.h  = height;
    v.cx = v.x + cw / 2;
    v.cy = height / 2;
  });
}

async function begin() {
  if (started) return;
  started = true;

  document.getElementById('enter').classList.add('gone');
  try { await Voice.start(); } catch { /* no audio; the piece still runs */ }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setOrtho();
  layoutViews();
}

// p5 gives a WEBGL canvas a PERSPECTIVE camera by default, which would
// shrink whatever sits further from the middle of the screen. The
// framing and picking maths here assumes a flat projection — one world
// unit is one pixel wherever it sits — so the camera is made
// orthographic, with the clip planes opened up enough that the tangle
// cannot fall out of the back of them.
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

    // Keep only the freshest event. The stream runs far ahead of the
    // tangle, so a backlog would show us the past rather than the now.
    pending = d;
  };
}

// Which edits can enter the tangle.
function accepts(d) {
  if (d.type !== 'edit') return false;
  if (d.namespace !== 0) return false;        // main article space only
  if (d.bot) return false;

  const t = d.title;
  if (!t || t.length > 34) return false;

  // Needs a real run of letters. Wikidata's main namespace is bare item
  // IDs (Q97225581), which read as noise rather than language.
  if (!/\p{L}{3,}/u.test(t)) return false;

  // Reject anything number-heavy: list articles, date stubs, catalogue
  // entries. They carry letters but they aren't really words.
  const digits = (t.match(/\d/g) || []).length;
  if (digits / t.length > CFG.digitRatio) return false;

  return isLatin(t);
}

// The font carries extended Latin only (no Cyrillic / Greek / CJK),
// so anything with a non-Latin letter would render as missing glyphs.
function isLatin(str) {
  if (!/\p{Script=Latin}/u.test(str)) return false;
  return !/\p{L}/u.test(str.replace(/\p{Script=Latin}/gu, ''));
}

// é -> E.  The grapheme is the base letter; the diacritic is a variant
// of the same shape, so both bind on the same character.
function fold(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}


/* ------------------------------------------------------------------
   WORD MODEL
   ------------------------------------------------------------------ */

function makeWord(d) {
  const w = {
    title:  d.title,
    url:    d.title_url,
    wiki:   d.server_name,
    user:   d.user,

    // Growth state. `links` counts the letter connections this word
    // holds; its size is eased toward whatever that implies.
    links:  0,
    size:   CFG.baseSize,

    col:    null,           // filled in below
    rgb:    null,
    fade:   1,
    rot:    { rx: random(TWO_PI), ry: random(TWO_PI), rz: random(TWO_PI) },

    // Position is DERIVED, not stored: a bound word sits on a glyph of
    // its anchor, and that glyph moves whenever the anchor grows.
    anchor: null,        // { word, index }
    pivotIndex: 0,
    origin: { x: 0, y: 0, z: 0 },   // only used when there is no anchor
    pos:    { x: 0, y: 0, z: 0 },

    letters: [],
    baseW: 0,
    born: millis(),
    bindChar: null
  };

  w.col = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  w.rgb = hexToRgb(w.col);

  measure(w);
  return w;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Offsets scale linearly with text size, so they are measured once at
// the base size and multiplied per frame.
function scaleOf(w)   { return w.size / CFG.baseSize; }
function glyphX(w, k) { return w.letters[k].x * scaleOf(w); }
function wordWidth(w) { return w.baseW * scaleOf(w); }
function pivotOf(w)   { return glyphX(w, w.pivotIndex); }

// Run once, when the word is created. Offsets scale linearly with text
// size, so they are taken at the base size and multiplied thereafter.
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
   The more letter connections a word holds, the larger and heavier it
   becomes. Both are eased every frame so a new connection reads as the
   word swelling, not snapping to a new size. Because the weight axis is
   continuous, the letterforms thicken through the change rather than
   stepping between cuts.
   ------------------------------------------------------------------ */

function grow(w) {
  const n = Math.min(w.links, CFG.maxLinks);
  const target = CFG.baseSize * (1 + n * CFG.growPerLink);
  w.size = lerp(w.size, target, CFG.grow);
}

// A word sits on a glyph of its anchor, so its anchor has to be placed
// first. Anchors are not restricted to earlier list positions — that
// made re-tying fail far too often — so the order is worked out here by
// following each chain to its root. `heal()` guarantees there are no
// loops; the depth guard is a belt-and-braces stop.
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
   3D is computed by hand and drawn through a 2D affine transform.
   A 3D-rotated plane of text projects to an EXACT 2D affine, so the
   type stays crisp, native and kerned while genuinely sitting in space.
   ------------------------------------------------------------------ */

// R = Rz . Ry . Rx   applied to a vector
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

// C = Rx(pitch) . Ry(yaw), per view
function camApply(view, v) {
  let { x, y, z } = v;

  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  return { x, y, z };
}

// Where glyph k of word w sits in world space.
function glyphWorld(w, k) {
  const off = rotApply(w.rot, { x: glyphX(w, k) - pivotOf(w), y: 0, z: 0 });
  return { x: w.pos.x + off.x, y: w.pos.y + off.y, z: w.pos.z + off.z };
}


/* ------------------------------------------------------------------
   PROJECTION
   ------------------------------------------------------------------ */

// Camera-space basis and scale for a word in a view. Null if it has
// fallen behind the eye.
// The projection is orthographic, so there is no distance term: `s` is
// always 1. It is kept so the framing and picking maths below reads the
// same as it did under weak perspective.
function project(view, w) {
  return {
    P:  camApply(view, w.pos),
    s:  1,
    Ex: camApply(view, rotApply(w.rot, { x: 1, y: 0, z: 0 })),
    Ey: camApply(view, rotApply(w.rot, { x: 0, y: 1, z: 0 }))
  };
}

// Projected position of a point on the word's own plane, before the
// view's pan and zoom are applied.
function planePoint(pr, u, v) {
  return {
    x: (pr.P.x + u * pr.Ex.x + v * pr.Ey.x) * pr.s,
    y: (pr.P.y + u * pr.Ex.y + v * pr.Ey.y) * pr.s
  };
}

// The 2D affine that puts a word on screen inside a view.
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
   Each view looks at a `focus` — a point in the world, not a position
   on screen. Keeping it in world space is what makes orbiting behave:
   the camera swings around the thing being looked at instead of the
   tangle sliding out of frame as the angle changes.

   Nothing here runs per frame any more. The left view is the viewer's
   to move; the right one never moves at all.
   ------------------------------------------------------------------ */

// Screen position of a view's focus, recomputed each frame because
// orbiting changes where a fixed world point lands.
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

// Undo camApply: camera space back to world space.
function camUnapply(view, v) {
  let { x, y, z } = v;

  const cp = Math.cos(-view.pitch), sp = Math.sin(-view.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  const cy = Math.cos(-view.yaw), sy = Math.sin(-view.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  return { x, y, z };
}

// Frame the whole tangle once. Used to give the viewer a sensible
// starting position, and again whenever they ask for one back.
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

  // Bounds taken as quantiles rather than extremes, so one straggler at
  // a shallow angle cannot shrink everything else to nothing.
  const lo = (1 - view.trim) / 2, hi = 1 - lo;

  const xs = pts.map(p => p.x).sort((a, b) => a - b);
  const ys = pts.map(p => p.y).sort((a, b) => a - b);

  const minX = quantile(xs, lo), maxX = quantile(xs, hi);
  const minY = quantile(ys, lo), maxY = quantile(ys, hi);

  view.zoom = constrain(Math.min(
    (view.w * view.fill) / Math.max(maxX - minX, 1),
    (view.h * view.fill) / Math.max(maxY - minY, 1)
  ), CFG.zoomMin, CFG.zoomMax);

  // The centre of those bounds is a point in camera space; the focus has
  // to be the world point that lands there.
  view.focus = camUnapply(view, {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: 0
  });
}

// Interpolated quantile of an already-sorted array.
function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const i  = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}


/* ------------------------------------------------------------------
   BINDING
   ------------------------------------------------------------------ */

// Every place a given letter appears, across the first `limit` words.
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

// Walk the title left to right. The first letter that exists anywhere in
// the tangle wins; among all its occurrences, pick one at random so
// connections reach across the whole structure.
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

// The world origin, where the very first word is placed.
//
// New words are drawn toward THIS rather than toward the tangle's own
// moving centre. Biasing toward the running centroid is a feedback loop:
// the centroid follows the words, the words follow the centroid, and the
// whole structure wanders off. Pinning the bias to a fixed point makes
// the tangle mean-revert to it, so the web keeps a constant heart that a
// camera can simply sit on.
const CORE = { x: 0, y: 0, z: 0 };

// Pick one of the places a letter occurs, favouring those nearer the
// middle. Still a random choice among many, so connections reach right
// across the structure — but it cannot keep reaching outward for ever.
function pickInner(spots) {
  if (spots.length <= 2) return spots[Math.floor(Math.random() * spots.length)];

  const scored = spots
    .map(s => {
      const g = glyphWorld(s.word, s.index);
      return { s, d: Math.hypot(g.x - CORE.x, g.y - CORE.y, g.z - CORE.z) };
    })
    .sort((a, b) => a.d - b.d);

  const n = Math.max(1, Math.ceil(scored.length * CFG.innerBias));
  return scored[Math.floor(Math.random() * n)].s;
}

// Returns true if the word made it into the tangle.
function admit(d) {
  const w = makeWord(d);
  const bind = findBind(w);

  if (!bind) {
    // Nothing on screen shares a letter with it. It is refused rather
    // than parked somewhere in space: every word in the piece has to be
    // part of the tangle, and free-floating words only ever drifted the
    // composition further apart as the run went on.
    //
    // The one exception is an empty tangle, which needs a first word for
    // anything else to bind to.
    if (words.length) { refused++; return false; }

    w.pivotIndex = Math.floor(w.letters.length / 2);
    w.origin = { x: 0, y: 0, z: 0 };
    w.pos    = w.origin;
  } else {
    w.pivotIndex = bind.localIndex;
    w.anchor     = { word: bind.spot.word, index: bind.spot.index };
    w.bindChar   = bind.base;
    w.pos        = glyphWorld(bind.spot.word, bind.spot.index);

    // Both ends of a connection count it, so a word that many others
    // hang from grows the most.
    w.links++;
    bind.spot.word.links++;
    bound++;

    // The same coincidence that ties them is the one that sounds. Panned
    // by where the tie sits in the world rather than on screen, so it
    // does not swing about as the camera is moved.
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

// Retire the oldest word that has nothing hanging from it.
//
// The tangle is one tree and stays one tree, because the only word ever
// removed is a leaf. A leaf cannot orphan anything, so no word is ever
// re-tied, no word ever moves, and there is nothing that can come away
// from the rest and float on its own.
//
// Taking the oldest word outright would not do: every word descends from
// the first one, so its subtree is the whole tangle and retiring it
// would empty the canvas. Taking the oldest leaf keeps the ordering —
// words still leave roughly in the order they arrived — while the words
// holding the structure together stay until nothing depends on them.
function retire() {
  const holds = new Set();
  for (const w of words) if (w.anchor) holds.add(w.anchor.word);

  let i = words.findIndex(w => !holds.has(w));
  if (i < 0) i = 0;                 // a finite tree always has a leaf; belt and braces

  // Out of the tangle at once — nothing can bind to it, it counts for
  // nothing, it cannot be hovered — but still on screen while it goes.
  // Its position is frozen where it stood, since it no longer has an
  // anchor to be worked out from.
  const gone = words.splice(i, 1)[0];
  gone.origin = { x: gone.pos.x, y: gone.pos.y, z: gone.pos.z };
  gone.anchor = null;
  fading.push(gone);

  recountLinks();
}

// Count each word's ties straight off the graph.
//
// Every place a word is added or removed has to adjust two counts, and
// one missed decrement leaves a word permanently oversized — links drive
// how big it is drawn. Recomputing is 26 words once per retirement and
// cannot drift.
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
   ------------------------------------------------------------------
   Each letter sounds when it ties two words together. The letter still
   decides the sound, and it decides it the way a phoneme is actually
   made — whether the mouth is open, closed, humming or hissing — but
   the result is played rather than spoken. A synthesised voice reciting
   the alphabet is a novelty that wears out in a minute; this keeps the
   same mapping and lets it be music.

   Two things do the musical work:

   Everything is pitched to a minor pentatonic. The letters arrive in an
   order nobody chose, so any two notes may land together; a pentatonic
   has no interval that can clash, which means a coincidence can never
   sound like a mistake.

   A letter's pitch comes from its position in the alphabet — arbitrary,
   and deliberately so. There is nothing about the shape A that makes it
   the sound it makes; that link is convention. Mapping the alphabet
   onto a scale is the same kind of convention, made audible.
   ================================================================== */

const TONE = {
  root:     130.81,        // C3
  scale:    [0, 3, 5, 7, 10],   // minor pentatonic: no interval can clash
  steps:    14,            // notes spanned by A..Z, about two and a half octaves
  voices:   12,            // simultaneous notes before the oldest is taken
  level:    0.16,
  drone:    0.035
};

// How a letter is made in the mouth. This is the phoneme mapping — it
// survives intact, it just chooses an instrument rather than a formant.
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

// Alphabet position -> a note on the scale. Deeper for a word that many
// others hang from, so the busiest letters sit underneath the rest.
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

    // Nothing reaches the speakers without passing the limiter, so a
    // burst of simultaneous ties cannot clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.knee.value = 12;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.2;

    const master = ctx.createGain();
    master.gain.value = TONE.level;

    // Takes the glare off the noise-based letters.
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'lowpass';
    shelf.frequency.value = 7000;

    master.connect(shelf);
    shelf.connect(limiter);
    limiter.connect(ctx.destination);

    // Room. A convolver fed a decaying burst of noise is the cheapest
    // honest reverb there is.
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

  // A held root and fifth, barely there, so the silence between ties is
  // still part of the piece rather than an absence of it.
  startDrone() {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(TONE.drone, ctx.currentTime + 8);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    lp.Q.value = 2;

    // A slow sweep keeps it from sitting completely still.
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

  // Sound one letter.
  play(ch, opts = {}) {
    if (!this.ready || this.muted) return;

    const ctx  = this.ctx;
    const now  = ctx.currentTime;
    const kind = articulationOf(ch);
    const freq = noteFor(ch, opts.links || 0);

    // Oldest note gives way once the cap is reached, so a flurry of ties
    // thins out instead of turning to mud.
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
   The instruments. One per way of making a sound, not one per letter —
   the letter chooses which of these plays and at what pitch.
   ------------------------------------------------------------------ */

const SHAPES = {

  // Open mouth: sung. Two oscillators slightly apart, with a resonant
  // peak near the vowel's own first formant so an A still carries some
  // of an A rather than being only a note.
  //
  // The formant runs ALONGSIDE the voice, not in front of it. In series
  // it is not a formant at all, it is a gate: a bandpass three octaves
  // above the fundamental throws away almost everything the oscillator
  // produced, and the vowels — the most common letters there are —
  // come out inaudible next to every other class.
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

  // Closed mouth: hummed. Dark, round, no edge.
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

  // The mouth moving between two shapes: a note that slides into place.
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

  // Air through a narrow gap: breath. Pitched only faintly, so it reads
  // as texture rather than melody.
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

  // A closure released: struck, then gone. A pluck with a breath of
  // noise on the front for the click of the release.
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

  // Closure and breath together: struck, then hissing away.
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


// A decaying burst of noise, used as a reverb's impulse response.
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

// Plain noise, made once and reused by every breath and every release.
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

  // Paint order decides overlap, not depth. See drawView().
  drawingContext.disable(drawingContext.DEPTH_TEST);

  if (pending && millis() - lastIntake > CFG.intakeMs) {
    // A refused word does not use up the intake slot, so the next title
    // that can connect arrives without waiting another interval.
    if (admit(pending)) lastIntake = millis();
    pending = null;
  }

  for (const w of words) grow(w);
  resolvePositions();
  advanceFades();

  hovered = pickWord();
  document.body.classList.toggle('pointing', !!hovered);

  // Frame once, when the tangle is near full — doing it earlier frames
  // five words and leaves the view uselessly tight. After that, or from
  // the moment the viewer touches it, the left view is theirs.
  if (fitPending && words.length >= CFG.maxWords - 4) {
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

// Take retired words down, and let go of them once they are gone.
// Timed in seconds so the fade lasts as long whatever the frame rate.
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

  // Restrict drawing to this view's half of the canvas. WebGL has no
  // clipping path, but the scissor box does the same job. Its origin is
  // the BOTTOM-left of the drawing buffer, hence the flipped y.
  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(
    Math.round(view.x * d),
    Math.round((height - view.y - view.h) * d),
    Math.round(view.w * d),
    Math.round(view.h * d)
  );

  // Far to near, so nearer words overlap the ones behind them. The depth
  // buffer is off — coplanar glyph quads fight over it — so paint order
  // is what decides overlap, exactly as it did in 2D.
  const shots = [];
  for (const w of words) {
    const pr = project(view, w);
    if (pr) shots.push({ w, pr });
  }
  // Sorted in with the living ones, so a word on its way out is still
  // overlapped by whatever is in front of it.
  for (const w of fading) {
    const pr = project(view, w);
    if (pr) shots.push({ w, pr });
  }
  shots.sort((a, b) => a.pr.P.z - b.pr.P.z);

  // Overprinted: a word alone is its own colour, and two crossing
  // darken into a third. Needs the white ground to work against.
  blendMode(MULTIPLY);

  push();

  // WEBGL puts the origin at the middle of the canvas, so a view's cell
  // is reached as an offset from there. Then zoom, then pan, then the
  // camera's own angle — the same order the CPU maths uses.
  translate(view.cx - width / 2, view.cy - height / 2, 0);
  scale(view.zoom);
  translate(-view.panX, -view.panY, 0);
  rotateX(view.pitch);
  rotateY(view.yaw);

  noStroke();

  for (const { w } of shots) {
    const near = isNeighbour(w);

    const alpha = 255 * w.fade;

    if (w === hovered || near) {
      // Lift the hovered word and whatever it is tied to out of the
      // overprinting, so they read cleanly against a field that has been
      // darkened by everything crossing it. The hovered word goes black;
      // its connections keep their own colour.
      blendMode(BLEND);
      if (w === hovered) fill(0, alpha);
      else               fill(w.rgb[0], w.rgb[1], w.rgb[2], alpha);
    } else {
      blendMode(MULTIPLY);
      fill(w.rgb[0], w.rgb[1], w.rgb[2], alpha);
    }

    push();
    translate(w.pos.x, w.pos.y, w.pos.z);
    rotateZ(w.rot.rz);
    rotateY(w.rot.ry);
    rotateX(w.rot.rx);
    textSize(w.size);
    text(w.title, -pivotOf(w), 0);
    pop();
  }

  pop();

  blendMode(BLEND);

  drawLabel(view);
  gl.disable(gl.SCISSOR_TEST);
}

// A word directly tied to the hovered one, either way round.
function isNeighbour(w) {
  if (!hovered || w === hovered) return false;
  if (w.anchor && w.anchor.word === hovered) return true;
  if (hovered.anchor && hovered.anchor.word === w) return true;
  return false;
}

function drawLabel(view) {
  push();
  resetMatrix();
  noStroke();
  fill(0, 90);
  textSize(10);
  textAlign(LEFT, BASELINE);
  text(view.name,
       view.x + 14 - width / 2,
       view.y + view.h - 14 - height / 2);
  textAlign(LEFT, CENTER);
  pop();
}

function drawSplit() {
  push();
  resetMatrix();
  stroke(0, 45);
  strokeWeight(1);
  for (let i = 1; i < VIEWS.length; i++) {
    const x = (i * width) / VIEWS.length - width / 2;
    line(x, -height / 2, x, height / 2);
  }
  noStroke();
  pop();
}


/* ------------------------------------------------------------------
   HOVER + CLICK
   ------------------------------------------------------------------ */

// Which view the cursor is in.
function viewAt(x, y) {
  for (const v of VIEWS) {
    if (x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h) return v;
  }
  return null;
}

// Invert each word's own affine to put the cursor in the word's local
// space, then test it against the word's box. Nearest word wins.
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

function mousePressed() {
  const view = viewAt(mouseX, mouseY);
  if (view && view.manual) {
    dragging = view;
    fitPending = false;               // they have taken it; stop waiting to frame it
  }

  // A drag is not a click: opening the article is left to mouseReleased,
  // which can tell whether the pointer actually moved.
  pressX = lastX = mouseX;
  pressY = lastY = mouseY;
}

function mouseReleased() {
  dragging = null;
  document.body.classList.remove('grabbing');

  const moved = Math.hypot(mouseX - pressX, mouseY - pressY);
  if (moved < 4 && hovered && hovered.url) window.open(hovered.url, '_blank');
}

// Drag orbits; shift-drag pans. Orbiting turns the camera around the
// focus, so whatever is being looked at stays being looked at.
function mouseDragged(event) {
  if (!dragging) return;
  document.body.classList.add('grabbing');

  const dx = mouseX - lastX;
  const dy = mouseY - lastY;
  lastX = mouseX;
  lastY = mouseY;

  if (event && event.shiftKey) {
    pan(dragging, dx, dy);
  } else {
    // Negated so the tangle follows the cursor: dragging left turns the
    // structure left, as though taking hold of it rather than of the
    // camera around it.
    dragging.yaw   -= dx * CFG.orbitRate;
    dragging.pitch -= dy * CFG.orbitRate;
    dragging.pitch  = constrain(dragging.pitch, -HALF_PI + 0.05, HALF_PI - 0.05);
  }
  return false;                       // no text selection while dragging
}

// Move the focus sideways by a screen distance. The shift is worked out
// in camera space, then turned back into world space so it means the
// same thing whatever angle the view is at.
function pan(view, dx, dy) {
  const d = camUnapply(view, { x: -dx / view.zoom, y: -dy / view.zoom, z: 0 });
  view.focus = {
    x: view.focus.x + d.x,
    y: view.focus.y + d.y,
    z: view.focus.z + d.z
  };
}

// Zoom toward the cursor rather than the middle of the view, so the word
// being pointed at is the one that stays put.
function mouseWheel(event) {
  const view = viewAt(mouseX, mouseY);
  if (!view || !view.manual) return;
  fitPending = false;

  const next = constrain(
    view.zoom * Math.exp(-event.delta * CFG.zoomRate),
    CFG.zoomMin, CFG.zoomMax
  );

  const k = 1 / view.zoom - 1 / next;
  const d = camUnapply(view, {
    x: (mouseX - view.cx) * k,
    y: (mouseY - view.cy) * k,
    z: 0
  });

  view.focus = {
    x: view.focus.x + d.x,
    y: view.focus.y + d.y,
    z: view.focus.z + d.z
  };
  view.zoom = next;

  return false;                       // keep the page from scrolling
}

// Put it back where it started.
function keyPressed() {
  if (key === 'm' || key === 'M') {
    Voice.setMuted(!Voice.muted);
    hudEls.sound.textContent = Voice.muted ? 'muted' : 'on';
    hudEls.sound.classList.toggle('muted', Voice.muted);
  }
}

function doubleClicked() {
  const view = viewAt(mouseX, mouseY);
  if (view && view.manual) fitView(view);
  return false;
}


/* ------------------------------------------------------------------
   PAGE CHROME
   ------------------------------------------------------------------ */

function updateHud() {
  if (hovered) {
    readoutEl.innerHTML =
      `<div class="title">${escapeHtml(hovered.title)}</div>` +
      `<div class="meta">${escapeHtml(hovered.wiki)}` +
      (hovered.bindChar ? ` &middot; bound on ${hovered.bindChar}` : ` &middot; unbound`) +
      ` &middot; ${hovered.links} link${hovered.links === 1 ? '' : 's'}` +
      ` &middot; click to open</div>`;
    readoutEl.classList.add('on');
  } else {
    readoutEl.classList.remove('on');
  }

  if (millis() - lastHud < 200) return;
  lastHud = millis();

  hudEls.status.textContent = status;
  hudEls.status.classList.toggle('warn', status !== 'connected');
  hudEls.count.textContent  = `${words.length} / ${CFG.maxWords}`;
  hudEls.seen.textContent   = seen;
  hudEls.bound.textContent  = `${bound} / ${refused} refused`;
  hudEls.fps.textContent    = Math.round(frameRate());
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
