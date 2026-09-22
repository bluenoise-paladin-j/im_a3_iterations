/* ===================================================================
   ENTANGLEMENT — v4.3 : loading
   -------------------------------------------------------------------
   The tangle is a single structure in 3D space, shown simultaneously
   from two angles at once. One holds the whole network and belongs to
   the viewer — framed once on load, then theirs to orbit, pan and zoom.
   The other is fixed on the knot at the centre, where the type runs off
   every edge, and answers to nothing.

   The tangle is one tree and never anything else. The only word ever
   removed is a leaf — the oldest word with nothing hanging from it — so
   no word is ever orphaned, nothing is ever re-tied, and no word ever
   moves once placed. Islands cannot form, because there is nothing that
   could come away from the rest.

   A retired word leaves the tangle at once but not the screen: it is
   held apart and taken down over `fadeSecs`, so nothing ever simply
   blinks out.

   New in v4.3 — the loading screen does the same thing the piece does:

     - the spinner is gone. In its place, nine instances of one word,
       `loading`, each leaving a shared centre at its own angle, each in
       a colour from the same palette, overprinting in MULTIPLY where
       they cross. They arrive one after another and turn over
       continuously, which is exactly what the tangle does — so the wait
       is a small, flat, honest picture of the thing being waited for
       rather than a spinner borrowed from somewhere else.

       The angles are the golden angle accumulated, 137.507 degrees at a
       time: the same rotation the real tangle spaces a word's children
       by, and for the same reason — it never lands twice in the same
       place, so nine of them fan out instead of clumping.

     - all CSS. No canvas, no second asset, no JavaScript: it has to be
       on screen before the thing it is covering for has loaded
       anything, so it cannot depend on any of it.

     - and it cannot depend on Areal either, because Areal is one of the
       things being loaded. The face is declared `font-display: block`,
       which renders NOTHING until the file arrives — the loader would
       have been a blank white page for its first moments, which is the
       one thing it exists to prevent. The same file is declared a
       second time under another name with `swap`, so the words appear
       at once in Helvetica and change to Areal the instant it lands.
       Same URL, so the browser still fetches it once.

   From v4.2 — the page chrome, built to the wireframes:

     - THE TITLE CARD IS GONE. It existed because a browser will not
       start audio until the viewer has done something, and reading a
       paragraph before being let in is a high price for a permissions
       problem. The first gesture of any kind now does it: the first
       drag of the tangle, the first tap, the first key. Those happen
       within seconds of arriving, and none of them is a door.

       In its place, only a wheel, and only while something is really
       being waited for — the font, the connection, the first title down
       the wire. It is deliberately NOT held until the tangle is full:
       that takes a dozen seconds, and watching the structure accumulate
       out of nothing is the piece, not a delay before it.

       Until the first gesture the sound reading says `off`, and tapping
       it is itself the gesture that turns it on.

     - the menu moves. The panel grows out of the toggle rather than
       appearing at full size in the middle of itself, and its contents
       arrive just behind it in reading order — the sentence, the
       byline, then the two columns rising row by row. The delays live
       only on the open state, so closing collapses at once instead of
       unwinding in slow motion.

       The square becomes a triangle by actually MORPHING: both shapes
       are four-point percentage polygons, which is the condition for
       `clip-path` to interpolate, and the square's bottom corners
       travel to meet in the middle. The previous pair — an `inset()`
       and a `polygon()` — could not interpolate at all, so what looked
       like a transition was a cut.

       One easing curve for every moving part, so the chrome moves as
       one thing rather than as several. All of it yields to
       `prefers-reduced-motion`, except the spinner, since a loading
       indicator that does not move is not one.

     - the `Info` title is in Areal. It had been reaching for `font:
       inherit`, and `body` carried no family of its own, so the
       shorthand reset the family along with everything else and the
       heading came out in the browser's default serif. The family is
       now set on `body` and named outright on both buttons; the `font`
       shorthand is not used anywhere in the chrome.

     - digits in the readings are tabular. `seen` and `fps` change
       several times a second, and proportional figures change width as
       they go, which makes the whole column twitch.

     - the debug HUD is gone. At rest the page carries two things: the
       word `Info` with a filled square, top left, and the readout, which
       is only there while a word is under the pointer. Everything that
       used to be printed permanently over the artwork — the readings,
       the controls, the attribution — is inside the panel that square
       opens, and the square becomes a down-pointing triangle while it
       is open.

     - the readout is one line in a pill rather than two lines of loose
       text, and the view labels (`network`, `core`) are gone. Neither
       is in the design, and both were notes-to-self rather than parts
       of the piece.

   Three things in the phone design that the wireframe could not know,
   because they are behaviour rather than layout:

     - A TAP CANNOT BOTH ASK AND ANSWER. With a mouse the readout has
       been up for as long as the cursor has been on a word, so the
       click that opens the article is an informed one. A finger gets no
       such thing: the tap that opens Wikipedia would be the same tap
       that first says what Wikipedia would be opened to, so the answer
       arrives as the page is already leaving. On touch the first tap
       now only selects — the readout appears, the word is lifted out of
       the overprinting — and a second tap on that same word opens it.
       The readout says which of the two it is waiting for.

     - THE WIREFRAME LISTS `mute m`, AND A PHONE HAS NO `m`. The sound
       reading is now the sound control: a tappable value that reads
       `on` or `muted`. The key still works, and both go through one
       function so they cannot disagree.

     - the controls list is written from the hardware, not the width. A
       mouse list naming pinch, or a touch list naming scroll, is wrong
       on the device it is wrong on at every window size.

   Two smaller ones: the chrome sits inside `env(safe-area-inset-*)`, so
   nothing hides under a notch or a home indicator, and the tap targets
   are padded out to 44px on coarse pointers while the type stays the
   size it is drawn at.

   The panel's three columns become two stacked blocks under 700px.
   Three columns inside 375px leaves each too narrow to read as a
   column, and the two halves were already a list and a table.

   From v4.1 — the piece stops assuming a mouse:

     - pinch to zoom, two fingers to pan, double-tap to re-frame. One
       finger already orbited, because p5 turns a single pointer into
       its mouse callbacks; it has nothing for two, so the second finger
       is read straight off the pointer stream.

       The pinch scales about the point between the fingers and the
       slide shifts by however far that point travelled, which together
       mean the tangle stays under the hand. It is the same anchored
       zoom the wheel has always used, now reached two ways — `zoomAt`.

       Double-tap is timed by hand rather than left to the browser,
       because `dblclick` on touch is unreliable and `touch-action:
       none` — which the orbit needs — is part of why.

     - none of it is behind a width test. A mouse cannot produce a
       second pointer, so a two-finger gesture can only come from a
       touch screen; a breakpoint would add nothing but a lie on a
       laptop that has both.

     - the control hints name touch verbs where the input is coarse.
       Provisional: what the chrome should say, and whether it should be
       there at all, is the design pass.

   From v4 — the piece stops assuming a landscape window:

     - the two views are no longer always side by side. Whichever way
       the window is proportioned, the split runs across its LONG axis:
       columns while it is wider than it is tall, stacked rows while it
       is taller. On a phone held upright that turns two 187px slivers
       into two full-width bands, which is the shape a line of type is.

       The rest of the drawing never knew about columns to begin with —
       scissoring, framing, picking and the labels all work from a cell
       rectangle — so the arrangement is decided in `layoutViews` and
       nowhere else.

     - a resize re-frames any view the viewer has not taken over. Turning
       a phone changes a cell's shape completely, and a zoom worked out
       against the old one means nothing in the new one. A view that HAS
       been moved by hand is left alone: a resize is not a reason to
       throw away someone's own camera. Double-clicking hands it back.

     - a drag on a touch screen orbits, instead of scrolling the page
       out from under the gesture (`touch-action: none`).

     - fixed, and present since v2.8: the click that dismissed the title
       card was also read as a press on the left view, which marked it as
       taken and cancelled the one-time framing before the tangle had
       ever been framed. The piece opened on an un-framed camera every
       time, which is what the drift and the dead white corner were.
       p5 listens on the window, so presses that land on the page chrome
       are now ignored rather than treated as presses on the artwork.

   `f` still toggles camera-facing from the keyboard. It is deliberately
   not in the controls list or the readings: it was the switch that
   settled the question in v3.2, kept because it costs nothing, and it
   is not part of what the piece offers a viewer.

   From v3.5 — three things decided rather than tried:

     - every word overprints again. The v3.3 coin, which gave half the
       words an opaque pass, is gone: the crossings are the subject, and
       a word that covers is a word whose crossings never happen.

     - the tangle holds 16. 26 was one per letter of the alphabet, which
       is a fact about the alphabet and not about the picture. At 16
       there is enough white for the crossings that remain to be read as
       crossings rather than as density.

     - both of those are now fixed in the source instead of being driven
       from the keyboard. The experiment is over, so the controls that
       ran it come out: `f` (face camera) and `m` (mute) remain.

   From v3.4:

     - horizontal orbiting is inverted. Dragging left now turns the
       structure as though the CAMERA were being swung round it, rather
       than as though the tangle were being spun by hand. Vertical is
       untouched and still works the other way, which sounds inconsistent
       written down and is not: tipping something towards you and
       turning it about its axis are different gestures, and the hands
       expect different things of them.

   From v3.3:

     - a trial of per-word opacity, since reverted in v3.5.

   From v3.2:

     - the type now FACES THE CAMERA. Each word is still a line running
       in a real 3D direction, tied where it always was — but the plane
       it is drawn on is turned about that line until it looks straight
       out at whichever camera is drawing it. The letters keep their
       full height and their proper shapes; only the direction the word
       runs in still foreshortens. The piece reads as flat overlapping
       type rather than type lying about in a room, which is a
       composition rather than a diorama.

       This costs the structure NOTHING, and that is worth saying why.
       `glyphWorld` rotates only the word's x-axis — a glyph's position
       depends on the direction the word runs and nothing else. The roll
       about that line has never been anything but a drawing property,
       so it can be chosen per camera, per frame, and not one tie moves.
       The two views therefore disagree about how a word is rolled, and
       both are right.

       A side effect worth having: a word drawn facing the camera can
       never be seen from behind, so the mirrored titles are gone. What
       is left is that a word whose line runs right-to-left on screen
       now reads upside down instead. That is unavoidable — the glyphs
       sit where they sit, and no roll reorders them — but rotated type
       is a thing typography does on purpose and mirrored type only ever
       looks like a fault.

       `f` toggles it, so it can be judged against the alternative
       rather than argued about.

     - the core view is tighter: `span` 520 to 250. Close enough that
       whole words stop being the unit and letterforms become the unit —
       counters, stems and crossbars, colour where they overlap. The
       left view holds the structure; the right one is no longer a
       second look at it but a texture taken from inside it.

   From v3.1 — all of it about the SHAPE the tangle grows into:

     - a word no longer takes a random attitude in space. Its direction
       is worked out FROM the word it ties to: it leaves its anchor at a
       branch angle drawn from three families centred on square, so the
       two lines of type genuinely cross rather than lying over one
       another at whatever angle chance gave them. Uniformly random
       angles are the reason v3 read as fuzz — every direction equally
       likely is, visually, no direction at all, and it averages out to
       a ball of hair
     - the children of one word are spaced around it by the GOLDEN
       ANGLE, the same 137.5° a sunflower uses. Random azimuths clump
       and leave gaps; the golden angle never repeats and never bunches,
       so a word that many others hang from opens into a rosette instead
       of a knot of overlapping strands
     - every word stands upright, or nearly. The roll about its own
       baseline is no longer random — it is set from world up and then
       leaned over by a little, which is enough variation to keep the
       planes from going parallel while never turning a title upside
       down or edge-on. This is most of what made v3 look untidy: half
       its words were unreadable smears
     - the tangle now curls back on itself. Past `shellR` from the core
       a new word turns inward, hard enough to close the silhouette,
       gently enough that it reads as curvature rather than a wall. The
       structure bounds itself by its own geometry now, and `curl` has
       TAKEN OVER that job rather than joining it: `innerBias`, which
       was the only thing holding the tangle in through v3, is relaxed
       from 0.45 to 0.80 to get out of its way. Both pulling at once
       packed the middle — 38% of glyphs inside r100 against v3's 7%,
       five times the density at the centre — and that, not anything
       stacking up at the ties, was what made it read as a mess. With
       one pull instead of two the shell sits back where v3 had it and
       ties land along the whole of a word instead of at its inner end
     - two words no longer tie to the SAME letter of the same word while
       another letter is free, and among equally good spots the word
       with the fewest children wins. The tree spreads instead of
       growing everything off one busy stem

   From v3:
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

   Run with Live Server. Black on white; the design pass is still to come.
   =================================================================== */


/* ------------------------------------------------------------------
   CONFIG
   ------------------------------------------------------------------ */

const CFG = {
  stream:    'https://stream.wikimedia.org/v2/stream/recentchange',
  // How many words the tangle holds. 26 was one per letter of the
  // alphabet — a fact about the alphabet, not about the picture. 16
  // leaves enough white that the crossings read as crossings rather
  // than as density. Settled by eye against the running piece.
  maxWords:  16,
  intakeMs:  700,     // minimum gap between accepted titles
  baseSize:  30,      // px, at MONO 0 / wght 400

  // When a letter appears in several places, the anchor is drawn from
  // this fraction of them nearest the middle of the tangle. Choosing
  // uniformly makes each new word a free step of a random walk, and a
  // random walk has no stable size — the structure creeps further apart
  // for as long as it runs. Biasing inward makes it mean-reverting.
  //
  // 0.45 through v3, where it was the ONLY thing holding the tangle in.
  // v3.1's `curl` now does that job, in world space, and the two pulling
  // together packed the middle: measured on the running piece, 38% of
  // all glyphs fell inside r100 against 7% in v3 — five times the
  // density at the centre, which is what read as letters stacking up.
  // Relaxed to 0.80 so ties land along the whole of a word instead of
  // crowding its inner end. `curl` alone keeps the structure bounded.
  innerBias:  0.80,
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

  // --- SHAPE (v3.1) -------------------------------------------------
  // How far a new word turns away from the one it ties to, in degrees,
  // as three families with a weight and a jitter each. Centred on 90
  // because a right angle is what makes a crossing read AS a crossing:
  // two lines meeting squarely are two lines, two lines meeting at 20
  // degrees are one thick smudge. Nothing below about 40 is offered at
  // all — a word starts ON a glyph of its anchor, so a shallow angle
  // would simply lay its title along the anchor's.
  branch: [
    { weight: 0.50, deg:  90, jitter: 15 },   // square across
    { weight: 0.30, deg:  62, jitter: 12 },   // opening away
    { weight: 0.20, deg: 118, jitter: 12 }    // leaning back
  ],

  // The angle between one child of a word and the next, around the
  // anchor's own axis. 137.507°, the golden angle: the one rotation
  // that never lands twice in the same place however long it runs, and
  // the reason a sunflower head is even rather than patchy.
  goldenAngle: 2.39996323,
  spiralJitter: 0.14,   // radians of slop, so it is not mechanical

  // Every word starts its own spiral from where its anchor started
  // its, advanced by this much. The FIRST word to hang off any word
  // therefore turns the same way, by the same amount, as the one
  // before it did — and a chain of first-borns coils. Without it each
  // generation picks its side afresh and a chain zigzags, which from
  // any distance is just a straight line with noise on it. This is the
  // difference between a tendril and a scribble.
  twist: 0.62,

  // Turn every word about its own baseline until its plane looks
  // straight out at the camera drawing it. `f` toggles it live.
  //
  // Because a glyph's position depends only on the direction its word
  // runs in, the roll is free to be whatever each view wants it to be:
  // nothing about the tangle changes, only how it is drawn.
  faceCamera: true,

  // Roll about the word's own baseline. 0 would stand every word
  // perfectly upright and turn the tangle into a set of parallel
  // planes; this is how far either side of upright it is allowed to
  // lean. Well short of the point where type becomes unreadable.
  //
  // Only consulted while `faceCamera` is off — facing the camera IS a
  // choice of roll, and it overrides this one.
  lean: 0.42,

  // Where the tangle starts pulling itself back in. Measured from the
  // core in world units — inside `shellR` a word goes wherever the
  // branch angle sent it, and beyond it turns toward the middle, by
  // `curl` at its strongest.
  //
  // This is now the only thing bounding the structure, so it starts a
  // little sooner and pulls a little harder than it did. Together with
  // `innerBias` 0.80 it puts the shell back where v3 had it — 14% of
  // glyphs inside r100, 61% inside r200, 92% inside r300, against v3's
  // 7 / 64 / 93 — which is the profile the fixed core camera's `span`
  // of 520 was framed against.
  shellR: 170,
  curl:   0.75,

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
  // 520 through v3.1, which framed whole titles. At 250 the letterform
  // is the unit instead of the word: what fills the cell is stems,
  // counters and crossbars, and the colour where they cross. Tight
  // enough to abstract the type without it becoming a pattern of marks
  // that could have come from anywhere.
  { name: 'core', yaw: 1.5708, pitch: 0.12, still: true, span: 250 }
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

let statEls = {};
let readoutEl = null;
let infoEl = null, infoToggleEl = null, soundToggleEl = null;
let loadingEl = null;
let fontReady = false;       // the loading wheel waits on this and the stream

// On a touch screen there is no hover, so a tap cannot both reveal what a
// word is and commit to leaving the page for it. The first tap selects,
// the second on the same word opens — the readout in between is what the
// hover was. `selected` is the word the last tap landed on.
let touchUI  = false;
let selected = null;
let readoutKey = '';         // what the pill currently says, so it is only
                             // rewritten when it would actually change
let lastHud = 0;


/* ------------------------------------------------------------------
   SETUP
   ------------------------------------------------------------------ */

let canvasEl;                // the canvas itself, to tell a press on the artwork
                             // from one that landed on the page chrome over it

let pointers = new Map();    // every finger currently down on the canvas
let gesture  = null;         // the live two-finger gesture, if any
let pinched  = false;        // one happened; swallow the tap that ends it
let lastTap  = 0;            // for double-tap, which no browser sends reliably
let font;                    // the loaded p5.Font, required by WEBGL text()
let measureG;                // a 2D buffer used only for measuring widths

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

  // The browser will not start audio until the viewer has done
  // something, and the title card used to be what they did. With the
  // card gone, the FIRST gesture of any kind does it — the first drag
  // of the tangle, the first tap, the first press of a key. All of
  // those are things a viewer does within seconds anyway, and none of
  // them is a door to be opened before the piece will start.
  for (const type of ['pointerdown', 'keydown']) {
    window.addEventListener(type, begin, { once: true });
  }

  // Until then the reading says `off` rather than `on`, and tapping it
  // is itself the gesture that turns the sound on.
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
  fontReady = true;

  connect();
}

// Split the canvas into equal cells, one per view.
//
// Side by side while the window is wider than it is tall, stacked while
// it is taller. That is one rule, not two: each view is given whichever
// cell is least of a sliver. Two columns on a phone held upright are
// 187px wide, and a title at 30px runs off both edges of both of them
// before it has said anything; stacked, each view gets the full width
// and half the height, which is the shape a line of type actually is.
//
// Everything downstream — scissoring, framing, picking, the labels —
// already works from the cell rectangle rather than from an assumption
// about columns, so this is the only place the arrangement is decided.
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

// The panel is shut at rest: at any moment the piece is mostly itself,
// and the reading matter is there for whoever goes looking.
// `hidden` cannot be animated — the element is simply not laid out, so
// there is nothing to move. The panel stays in the layout and is taken
// out by opacity and visibility instead, which CAN be transitioned, and
// `inert` keeps it out of the way of the keyboard while it is shut.
function toggleInfo() {
  const open = !infoEl.classList.contains('open');
  infoEl.classList.toggle('open', open);
  infoEl.inert = !open;
  infoToggleEl.setAttribute('aria-expanded', String(open));
}

// One way in for both the `m` key and the tappable reading, so the two
// can never disagree about whether the piece is muted.
function setMuted(muted) {
  Voice.setMuted(muted);
  soundToggleEl.textContent = muted ? 'muted' : 'on';
  soundToggleEl.setAttribute('aria-pressed', String(muted));
}

async function begin() {
  if (started) return;
  started = true;

  try { await Voice.start(); } catch { /* no audio; the piece still runs */ }
  setMuted(Voice.muted);      // the reading stops saying `off`
}

// A cell can change shape here, and turning a phone changes it utterly —
// a tall narrow column becomes a short wide row. A framing worked out
// against the old cell is meaningless in the new one, so any view the
// viewer has not taken for themselves is framed again. One they HAVE
// moved is left exactly where they put it: a resize is not a reason to
// undo someone's own camera.
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setOrtho();
  layoutViews();

  for (const v of VIEWS) {
    if (!v.touched && v.ready) fitView(v);
  }
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

let nextId = 1;

function makeWord(d) {
  const w = {
    id:     nextId++,
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

    // Attitude in space. Filled in by `orient()` once it is known what
    // this word ties to, because in v3.1 the direction it takes is
    // worked out FROM its anchor rather than drawn out of the air.
    rot:    { rx: 0, ry: 0, rz: 0 },

    // How many words have hung off this one, ever. Counts up and never
    // down — it is the index into the golden-angle spiral, so reusing a
    // number after a retirement would drop a child straight on top of
    // one already there.
    spawn:  0,

    // Where this word sat on its anchor's spiral. Its own children are
    // measured from here, which is what makes a run of words coil
    // rather than wander.
    phi:    0,

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

/* ------------------------------------------------------------------
   SHAPE
   How a word decides which way to point. This is the whole difference
   between v3 and v3.1.

   v3 gave every word three random Euler angles. That sounds like it
   should look like a tangle and it does not: if every direction is
   equally likely then no direction means anything, and what a few
   hundred of them add up to is an even, featureless ball. It also let
   words lie along their anchors instead of across them, and rolled half
   of them onto their side, where a line of type is a smear.

   Here a word's attitude is BUILT, from three things:

     direction  — the anchor's own direction, turned away from it by a
                  branch angle centred on square
     azimuth    — which way round the anchor it turns, stepped by the
                  golden angle so siblings fan instead of clump
     roll       — world up, leaned over a little

   All three are still random inside their limits. The difference is
   that the limits are chosen, so the structure has habits: crossings
   read as crossings, rosettes open around the busy words, and the type
   stays the right way up.
   ------------------------------------------------------------------ */

const UP = { x: 0, y: 1, z: 0 };   // p5's y runs down the screen, so this
                                   // is the direction a letter's own feet
                                   // point — align with it and type stands up

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

// The direction a word's baseline runs, in world space.
function dirOf(w) { return rotApply(w.rot, { x: 1, y: 0, z: 0 }); }

// A stable pair of axes across `d`, so the golden-angle spiral means
// the same thing every time it is consulted for the same word.
function perpFrame(d) {
  const seed = Math.abs(vDot(d, UP)) > 0.95 ? { x: 0, y: 0, z: 1 } : UP;
  const u = vNorm(vCross(d, seed));
  return { u, v: vCross(d, u) };
}

// One of the branch families, chosen by weight, in radians.
function branchAngle() {
  let r = Math.random();
  for (const b of CFG.branch) {
    if ((r -= b.weight) <= 0) return radians(b.deg + random(-b.jitter, b.jitter));
  }
  const b = CFG.branch[CFG.branch.length - 1];
  return radians(b.deg + random(-b.jitter, b.jitter));
}

// Turn `d` toward the core once it is out past the shell. The strength
// ramps in from nothing at `shellR`, so there is no line on which the
// behaviour visibly changes — the tangle simply curves more the further
// out it gets, and closes itself.
function curlInward(d, at) {
  const r = vLen(at);
  if (r < CFG.shellR) return d;

  const k = Math.min((r - CFG.shellR) / CFG.shellR, 1) * CFG.curl;
  const inward = vNorm(vMul(at, -1));
  return vNorm(vAdd(vMul(d, 1 - k), vMul(inward, k)));
}

// The Euler angles the rest of the sketch wants, from a direction and
// the word's own up. `rotApply` and the GPU both build R = Rz.Ry.Rx, so
// the columns of that product are read back out: column 0 is `ex`,
// which fixes ry and rz between them, and what is left over — the roll
// about ex, read off the third row — is rx.
function eulerFromBasis(ex, ey) {
  const ez = vCross(ex, ey);
  return {
    rz: Math.atan2(ex.y, ex.x),
    ry: Math.atan2(-ex.z, Math.hypot(ex.x, ex.y)),
    rx: Math.atan2(ey.z, ez.z)
  };
}

// Stand a word up along `dir`: its feet point as close to world down as
// that direction allows, then the whole thing leans over by a little.
function orient(w, dir) {
  const ex = vNorm(dir);

  // The component of world up that survives across ex. If ex is itself
  // very close to up there is none, and any perpendicular will do.
  let ey = vAdd(UP, vMul(ex, -vDot(UP, ex)));
  if (vLen(ey) < 1e-6) ey = perpFrame(ex).u;
  ey = vNorm(ey);

  const lean = random(-CFG.lean, CFG.lean);
  const ez   = vCross(ex, ey);
  ey = vNorm(vAdd(vMul(ey, Math.cos(lean)), vMul(ez, Math.sin(lean))));

  w.rot = eulerFromBasis(ex, ey);
}

// Point a new word away from the word it ties to. Returns the direction
// and the azimuth it used, because the word has to remember the latter
// for its own children to measure from.
function branchFrom(anchorWord, at) {
  const p = dirOf(anchorWord);
  const { u, v } = perpFrame(p);

  // Two terms, doing two different jobs.
  //
  // `twist` carries the anchor's own azimuth forward, so the first word
  // to hang off this one leaves at a fixed turn from the way its anchor
  // left — step that along a chain and the chain coils.
  //
  // `spawn` steps the golden angle for every word after that. The
  // counter only ever goes up, so no two children of one word leave it
  // along the same line however many have come and gone.
  const phi = anchorWord.phi + CFG.twist
            + anchorWord.spawn++ * CFG.goldenAngle
            + random(-CFG.spiralJitter, CFG.spiralJitter);

  const theta = branchAngle();
  const off = vAdd(vMul(u, Math.cos(phi)), vMul(v, Math.sin(phi)));
  const dir = vAdd(vMul(p, Math.cos(theta)), vMul(off, Math.sin(theta)));

  return { dir: curlInward(vNorm(dir), at), phi };
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
  const Ex = camApply(view, rotApply(w.rot, { x: 1, y: 0, z: 0 }));

  return { P: camApply(view, w.pos), s: 1, Ex, Ey: upFor(Ex, view, w) };
}

// The word's own "up", in camera space.
//
// With `faceCamera` off this is just the roll it was built with, turned
// into camera space like everything else.
//
// With it on, the word is turned about its baseline until its plane
// looks straight out of the screen. In camera space that is a one-line
// answer: the plane faces the eye exactly when the word's up lies flat
// in the screen plane, so take the perpendicular to Ex that has no z.
//
//   Ey = (-Ex.y, Ex.x, 0) / |(Ex.x, Ex.y)|
//
// which is a unit vector, is perpendicular to Ex, and being free of z
// is drawn at its full length — so letters keep their true height and
// only the direction the word RUNS in foreshortens.
//
// The sign is not arbitrary. Taken this way round the affine's
// determinant is |(Ex.x, Ex.y)|^2 > 0, always, so a word can never be
// drawn from behind and no title is ever mirrored. The cost is that a
// word whose line runs right-to-left on screen comes out rotated by
// half a turn. Nothing can fix that — the glyphs sit where they sit —
// and rotated type is the better of the two.
function upFor(Ex, view, w) {
  if (!CFG.faceCamera) {
    return camApply(view, rotApply(w.rot, { x: 0, y: 1, z: 0 }));
  }

  // Pointing within a whisker of straight at the eye: there is no
  // meaningful way to face it, and it is a foreshortened dot anyway.
  const h = Math.hypot(Ex.x, Ex.y);
  if (h < 1e-6) return camApply(view, rotApply(w.rot, { x: 0, y: 1, z: 0 }));

  return { x: -Ex.y / h, y: Ex.x / h, z: 0 };
}

// The same orientation, as the Euler angles the GPU is driven with.
// `project` works in camera space; the draw call sits inside the
// camera's own rotation, so the basis is carried back out to world
// space and read off there.
function drawRotation(view, w, pr) {
  if (!CFG.faceCamera) return w.rot;
  return eulerFromBasis(dirOf(w), camUnapply(view, pr.Ey));
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

// Pick one of the places a letter occurs.
//
// Three filters, in order, each one loosening if it would leave nothing:
//
//   1. a letter already carrying a word is passed over while any free
//      letter of that letter remains. Two words leaving the same glyph
//      still fan apart on the spiral, but they start from one point and
//      that point gets crowded; spreading the ties along the available
//      letters uses the whole word as a place to grow from
//   2. of what is left, the nearer half to the middle. Choosing
//      uniformly makes each word a free step of a random walk, and a
//      random walk has no stable size
//   3. between two of those at random, the one with fewer words already
//      hanging off it. One pass of that is enough to stop everything
//      piling onto whichever stem happened to get busy first, without
//      making the choice deterministic
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

// Identifies one letter of one word, for "is anything already tied here".
function spotKey(w, index) { return w.id + ':' + index; }

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

    // The first word lies across the middle. Which way across is the one
    // free choice in the whole structure — everything after it is
    // measured off this.
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

    // Where it points is decided by what it is tied to: away from its
    // anchor at a branch angle, round the spiral from its siblings,
    // standing upright, and turned back toward the middle if the tie
    // landed out past the shell. Set before anything reads the word's
    // geometry, since every glyph position depends on it.
    const branch = branchFrom(bind.spot.word, w.pos);
    w.phi = branch.phi;
    orient(w, branch.dir);

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

  // The wheel is for the wait that is genuinely a wait — the font, the
  // connection, the first title down the wire. It is NOT held until the
  // tangle is full: that takes a dozen seconds, and watching the
  // structure accumulate from nothing is the piece rather than a delay
  // before it.
  if (loadingEl && !loadingEl.classList.contains('gone')
      && fontReady && status === 'connected' && words.length > 0) {
    loadingEl.classList.add('gone');
  }

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
  // Proportional rather than a fixed `maxWords - 4`, which framed the
  // view on two words back when the count could be driven down to six.
  // It stays proportional so that changing `maxWords` in the config
  // cannot quietly break the framing again.
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

  for (const { w, pr } of shots) {
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

// A word directly tied to the hovered one, either way round.
function isNeighbour(w) {
  if (!hovered || w === hovered) return false;
  if (w.anchor && w.anchor.word === hovered) return true;
  if (hovered.anchor && hovered.anchor.word === w) return true;
  return false;
}

// The line between the cells, drawn along whichever edge they share.
// A cell that starts away from the left edge sits beside its neighbour;
// one that starts at x 0 sits below it.
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

// p5 turns a single finger into its mouse callbacks, so one finger
// already orbits and taps through `mousePressed` / `mouseReleased`
// without anything here. It has nothing for two, and two fingers are
// how a touch screen has meant zoom and pan for as long as touch
// screens have meant anything: pinch to scale, slide to shift. Both are
// read here, straight off the pointer stream.
//
// None of this is behind a width test. A mouse cannot produce a second
// pointer, so a two-finger gesture can only ever come from a touch
// screen — gating it on a breakpoint would do nothing except make it
// lie on a laptop that has both.

// Where a pointer is, in the same units as p5's own `mouseX` / `mouseY`
// — which is what `viewAt` and the zoom anchor are written in.
//
// NOT `offsetX`. On a canvas with a pixel density above 1, which is
// every phone, `offsetX` comes back in BACKING-STORE pixels: measured
// here at density 2, a touch at clientX 200 reported offsetX 100 while
// p5 reported mouseX 200. A gesture read that way lands in the wrong
// half of the screen and scales about the wrong point. Taken off the
// bounding rect it agrees with p5 exactly, at any density.
function atCanvas(e) {
  const r = canvasEl.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function watchPointers() {
  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;

    // A fresh sequence: whatever the last one was, this is not it yet.
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

  // Listened for on the window rather than the canvas: a finger that
  // leaves by the edge of the screen still has to be let go of, or it
  // stays in the map forever and the next single touch looks like a
  // pinch that never ended.
  for (const type of ['pointerup', 'pointercancel']) {
    window.addEventListener(type, (e) => {
      if (!pointers.delete(e.pointerId)) return;
      if (gesture && pointers.size < 2) endGesture();
    });
  }
}

// The controls list is written here rather than in the markup, because
// there are two of them and which one is true depends on the hardware.
// The mouse list names verbs a finger cannot do; the touch list names
// verbs a mouse cannot. Neither is a subset of the other.
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

  // The fixed core view answers to nothing, exactly as it ignores the
  // wheel. Zooming it would be undone by `syncCamera` on the next frame
  // regardless.
  if (!view || !view.manual) return;

  gesture = { view, gap: gapOf(a, b), x: mid.x, y: mid.y };

  // The first finger has been orbiting since it landed. Its partner
  // arriving ends that — otherwise the view turns while it is scaled,
  // and a pinch that also spins the tangle is not a pinch.
  dragging = null;
  pinched  = true;

  // The finger that started this landed a moment ago and was counted as
  // a tap. It was the opening of a pinch, so it cannot also be half of a
  // double-tap: pinching and then tapping would re-frame the view the
  // viewer had just finished framing by hand.
  lastTap = 0;

  view.touched = true;
  fitPending   = false;
}

function updateGesture() {
  const [a, b] = [...pointers.values()];
  const mid  = midOf(a, b);
  const gap  = gapOf(a, b);
  const view = gesture.view;

  // Pinch. The fingers' separation scales the view about the point
  // between them, so whatever sits between the fingers stays there
  // however far they spread.
  if (gesture.gap > 0 && gap > 0) {
    zoomAt(view, constrain(
      view.zoom * (gap / gesture.gap), CFG.zoomMin, CFG.zoomMax
    ), gesture.x, gesture.y);
  }

  // Slide. Both fingers travelling together shift the view by the same
  // distance and direction they went, so the tangle stays under them.
  // Applied after the scale, which was anchored on where they were.
  pan(view, mid.x - gesture.x, mid.y - gesture.y);

  gesture.gap = gap;
  gesture.x   = mid.x;
  gesture.y   = mid.y;
}

function endGesture() {
  gesture = null;

  // The finger left behind does NOT inherit the orbit. p5's idea of
  // where the mouse is went stale while the gesture ran, so handing the
  // drag back mid-flight jumps the view by however far the fingers
  // moved. Lifting and touching down again starts a clean orbit.
  dragging = null;
}

// Double-tap to re-frame, the touch counterpart of double-click. Done by
// hand because a browser's own `dblclick` on touch is unreliable, and
// `touch-action: none` — which the orbit needs — is one of the things
// that makes it so.
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

function mousePressed(event) {
  // p5 listens on the window, so a press anywhere on the page reaches
  // here — including the one on the title card that starts the piece.
  // That press used to count as taking the view, which cancelled the
  // one-time framing before the tangle had ever been framed: the piece
  // opened on an un-framed camera every single time. A press that did
  // not land on the canvas is not a press on the artwork.
  if (event && event.target !== canvasEl) return;

  // A second finger is already down: this is a pinch, not an orbit. p5
  // listens on the WINDOW, so its handler runs after the canvas one that
  // started the gesture — without this it would hand the orbit straight
  // back and the tangle would turn while it was being scaled.
  if (pointers.size >= 2) return;

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

  // Lifting out of a two-finger gesture is not a tap on a word, however
  // little the last finger happened to travel.
  if (pinched) return;

  const moved = Math.hypot(mouseX - pressX, mouseY - pressY);
  if (moved >= 4) return;                       // that was a drag

  if (!hovered || !hovered.url) {
    selected = null;                            // tapped the white
    return;
  }

  // With a mouse, the readout has already been up for as long as the
  // cursor has been on the word, so the click is an informed one.
  if (!touchUI) {
    window.open(hovered.url, '_blank');
    return;
  }

  // With a finger it has not: the tap that would open the article is the
  // same tap that first says what the article is. So the first one only
  // selects — the readout appears, and the word can be seen for what it
  // is — and the second one, on that same word, leaves for it.
  if (selected === hovered) {
    window.open(hovered.url, '_blank');
    selected = null;
  } else {
    selected = hovered;
  }
}

// Drag orbits; shift-drag pans. Orbiting turns the camera around the
// focus, so whatever is being looked at stays being looked at.
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
    // The two axes deliberately disagree.
    //
    // Sideways, the drag swings the CAMERA around the tangle, so pulling
    // left brings what was on the right into view — the way you walk
    // round a thing on a table.
    //
    // Vertically, the drag tips the TANGLE, so pulling down brings its
    // top towards you. Tipping something and walking round it are
    // different gestures and the hand expects different things of them.
    dragging.yaw   += dx * CFG.orbitRate;
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
// Zoom a view to `next` while whatever sits under the screen point
// (sx, sy) stays under it. The wheel anchors on the cursor and a pinch
// anchors on the point between the fingers — one operation, two ways in.
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

// Put it back where it started.
function keyPressed() {
  // Nothing about the tangle changes here — only the roll each view
  // draws with — so it can be flipped mid-run and compared directly.
  if (key === 'f' || key === 'F') {
    CFG.faceCamera = !CFG.faceCamera;
  }

  if (key === 'm' || key === 'M') setMuted(!Voice.muted);
}

// Asking for the framing back also hands the view back: from here on a
// resize may re-frame it again, until it is moved by hand once more.
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
    // Which word, how many links it has now, and whether it is waiting
    // for a second tap. Nothing else in the pill can change, so nothing
    // else needs to be looked at to know whether to rewrite it.
    //
    // This runs every frame, and writing innerHTML every frame costs a
    // style recalculation every frame for a line of text that changes
    // perhaps once a second.
    const key = `${hovered.id}:${hovered.links}:${selected === hovered}`;

    if (key !== readoutKey) {
      readoutKey = key;

      // One line, because it sits in a pill: title, where it came from,
      // the letter it is tied at, and how to open it.
      const bind = hovered.bindChar
        ? `bound on ${escapeHtml(hovered.bindChar)}`
        : 'unbound';

      const open = touchUI
        ? (selected === hovered ? 'tap again to open' : 'tap to open')
        : 'click to open';

      readoutEl.innerHTML =
        `${escapeHtml(hovered.title)}` +
        `<span class="meta"> &middot; ${escapeHtml(hovered.wiki)}` +
        ` &middot; ${bind}` +
        ` &middot; ${hovered.links} link${hovered.links === 1 ? '' : 's'}` +
        ` &middot; ${open}</span>`;
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
