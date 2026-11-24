// Key poses for each exercise's animation (see figures.js for what the fields mean).
// The figure faces right. Floor is y = 0, negative y is up.
// mode: "pingpong" (default) goes A → B → A, "loop" goes A → B → C → A.
// dur: seconds for one full cycle.

// ---------- Reusable poses ----------
const STAND = { x: 0, y: -88, t: 180 };

// High plank (hands pinned to the floor)
const PLANK_HIGH = { x: 0, y: -44, t: 113, aN: { at: [46, -3] }, aF: { at: [42, -3] }, lN: [-67, -67], lF: [-67, -67], fN: 20, fF: 20 };
const PUSH_LOW   = { x: 4, y: -22, t: 97,  aN: { at: [46, -3] }, aF: { at: [42, -3] }, lN: [-83, -83], lF: [-83, -83], fN: 20, fF: 20 };
// Forearm plank (elbows under shoulders)
const PLANK_LOW  = { x: 0, y: -27, t: 100, aN: { at: [78, -4] }, aF: { at: [74, -4] }, lN: [-80, -80], lF: [-80, -80], fN: 20, fF: 20 };
// Lying on your back, head to the left, knees bent, feet flat
const SUPINE = { x: 0, y: -9, t: -90, aN: [92, 92], aF: [88, 88], lN: { at: [40, -3] }, lF: { at: [36, -3] } };
// Lying face down, head to the right
const PRONE = { x: 0, y: -9, t: 90, aN: [92, 92], aF: [90, 90], lN: [-90, -90], lF: [-92, -92], fN: -90, fF: -90 };
// On hands and knees
const QUAD = { x: 0, y: -48, t: 96, aN: { at: [52, -3] }, aF: { at: [48, -3] }, lN: [0, -90], lF: [2, -90], fN: -90, fF: -90 };
// Squat (feet pinned, hips back and down)
const SQUAT_LOW = { x: -20, y: -50, t: 148, aN: [85, 92], aF: [81, 88] };
// Plank and downward dog with the same hand/foot spots, so the figure can flow between them
const PLANK_WIDE = { x: 80, y: -42, t: 111, aN: { at: [125, -3] }, aF: { at: [121, -3] }, lN: { at: [0, -11] }, lF: { at: [-4, -11] }, fN: 20, fF: 20 };
const DOG        = { x: 50, y: -75, t: 40,  aN: { at: [125, -3] }, aF: { at: [121, -3] }, lN: { at: [0, -4] },  lF: { at: [-4, -4] } };
// Bent over (rows, kickbacks)
const BENT = { x: -12, y: -80, t: 112, aN: [0, 0], aF: [0, 0] };

const P = (...parts) => Object.assign({}, ...parts);

const ANIMS = {
  // =============== CHEST ===============
  "pushup": { dur: 2.2, frames: [PLANK_HIGH, PUSH_LOW] },
  "wide-pushup": { like: "pushup" },
  "slow-pushup": { like: "pushup", dur: 4.5 },
  "knee-pushup": { dur: 2.2, frames: [
    { x: 0, y: -30, t: 115, aN: { at: [44, -3] }, aF: { at: [40, -3] }, lN: [-55, -130], lF: [-55, -130], fN: -130, fF: -130 },
    { x: 2, y: -16, t: 98,  aN: { at: [44, -3] }, aF: { at: [40, -3] }, lN: [-70, -130], lF: [-70, -130], fN: -130, fF: -130 },
  ] },
  "incline-pushup": { dur: 2.2, ground: false, props: [{ box: [58, -50, 44, 50] }], frames: [
    { x: -9, y: -59, t: 130, aN: { at: [70, -54] }, aF: { at: [66, -54] }, lN: [-50, -50], lF: [-50, -50], fN: 60, fF: 60 },
    { x: 1,  y: -44, t: 118, aN: { at: [70, -54] }, aF: { at: [66, -54] }, lN: [-62, -62], lF: [-62, -62], fN: 60, fF: 60 },
  ] },
  "decline-pushup": { dur: 2.2, ground: false, props: [{ box: [-104, -40, 40, 40] }], frames: [
    { x: 5, y: -54, t: 97, aN: { at: [46, -3] }, aF: { at: [42, -3] }, lN: [-83, -83], lF: [-83, -83], fN: 20, fF: 20 },
    { x: 5, y: -33, t: 83, aN: { at: [46, -3] }, aF: { at: [42, -3] }, lN: [-97, -97], lF: [-97, -97], fN: 20, fF: 20 },
  ] },
  "db-floor-press": { dur: 2.4, frames: [P(SUPINE, { aN: [100, 185], aF: [96, 182] }), P(SUPINE, { aN: [180, 180], aF: [178, 178] })] },
  "db-floor-fly":   { dur: 2.6, frames: [P(SUPINE, { aN: [125, 150], aF: [235, 210] }), P(SUPINE, { aN: [178, 178], aF: [182, 182] })] },

  // =============== BACK ===============
  "superman": { dur: 2.4, frames: [PRONE, P(PRONE, { t: 100, hd: 6, aN: [108, 108], aF: [106, 106], lN: [-100, -100], lF: [-102, -102] })] },
  "superman-hold": { dur: 3, frames: [
    P(PRONE, { t: 100, hd: 6, aN: [108, 108], aF: [106, 106], lN: [-100, -100], lF: [-102, -102] }),
    P(PRONE, { t: 102, hd: 6, aN: [110, 110], aF: [108, 108], lN: [-102, -102], lF: [-104, -104] }),
  ] },
  "snow-angels": { view: "top", dur: 3.2, frames: [
    { aN: [8, 8], aF: [-8, -8], lN: [4, 4], lF: [-4, -4] },
    { aN: [172, 172], aF: [-172, -172], lN: [4, 4], lF: [-4, -4] },
  ] },
  "ytw": { view: "top", mode: "loop", dur: 4.5, frames: [
    { aN: [150, 150], aF: [-150, -150], lN: [4, 4], lF: [-4, -4] },
    { aN: [90, 90], aF: [-90, -90], lN: [4, 4], lF: [-4, -4] },
    { aN: [55, 145], aF: [-55, -145], lN: [4, 4], lF: [-4, -4] },
  ] },
  "bird-dog": { mode: "loop", dur: 5, frames: [
    QUAD,
    P(QUAD, { aN: { at: [110, -54] }, lF: [-90, -90] }),
    QUAD,
    P(QUAD, { aF: { at: [106, -54] }, lN: [-90, -90] }),
  ] },
  "good-morning": { dur: 2.8, frames: [
    P(STAND, { aN: [120, -100], aF: [116, -104] }),
    { x: -14, y: -84, t: 95, aN: [35, -185], aF: [31, -189] },
  ] },
  "db-row": { dur: 2.2, frames: [BENT, P(BENT, { aN: [-70, 10], aF: [-66, 14] })] },
  "db-single-row": { dur: 2.2, frames: [P(BENT, { aF: [20, 20] }), P(BENT, { aN: [-70, 10], aF: [20, 20] })] },
  "db-pullover": { dur: 3, frames: [P(SUPINE, { aN: [180, 180], aF: [178, 178] }), P(SUPINE, { aN: [262, 262], aF: [260, 260] })] },

  // =============== LEGS ===============
  "squat": { dur: 2.4, frames: [STAND, SQUAT_LOW] },
  "goblet-squat": { dur: 2.6, frames: [P(STAND, { aN: [35, 165], aF: [31, 161] }), P(SQUAT_LOW, { aN: [35, 165], aF: [31, 161] })] },
  "jump-squat": { dur: 1.4, frames: [
    SQUAT_LOW,
    P(STAND, { aN: [170, 175], aF: [166, 172], fN: 30, fF: 30, lift: 26 }),
  ] },
  "reverse-lunge": { dur: 2.6, frames: [
    { x: 10, y: -88, t: 180, lN: { at: [14, -3] }, lF: { at: [8, -3] } },
    { x: -12, y: -48, t: 178, lN: { at: [14, -3] }, lF: { at: [-60, -8] }, fF: 30 },
  ] },
  "wall-sit": { dur: 3, props: [{ wall: -31 }], frames: [
    { x: -22, y: -48, t: 180, aN: [10, 16], aF: [6, 12], lN: { at: [24, -3] }, lF: { at: [20, -3] } },
    { x: -22, y: -49, t: 180, aN: [10, 16], aF: [6, 12], lN: { at: [24, -3] }, lF: { at: [20, -3] } },
  ] },
  "glute-bridge": { dur: 2.4, frames: [
    SUPINE,
    { x: 0, y: -36, t: -62, aN: [95, 95], aF: [91, 91], lN: { at: [40, -3] }, lF: { at: [36, -3] } },
  ] },
  "bulgarian": { dur: 2.6, ground: false, props: [{ box: [-98, -40, 42, 40] }], frames: [
    { x: -4, y: -84, t: 178, lN: { at: [22, -4] }, lF: { at: [-62, -46] }, fF: -95 },
    { x: -10, y: -48, t: 172, lN: { at: [22, -4] }, lF: { at: [-62, -46] }, fF: -95 },
  ] },
  "calf-raise": { dur: 1.8, frames: [
    STAND,
    P(STAND, { y: -99, lN: { at: [3, -14] }, lF: { at: [-3, -14] }, fN: 35, fF: 35 }),
  ] },
  "step-up": { dur: 2.6, ground: false, props: [{ box: [8, -38, 62, 38] }], frames: [
    { x: -4, y: -86, t: 178, lN: { at: [30, -43] }, lF: { at: [-6, -4] } },
    { x: 30, y: -128, t: 180, lN: { at: [34, -43] }, lF: { at: [24, -50] }, fF: 60 },
  ] },
  "db-rdl": { dur: 2.8, frames: [P(STAND, { aN: [0, 0], aF: [0, 0] }), { x: -16, y: -83, t: 100, aN: [0, 0], aF: [0, 0] }] },

  // =============== SHOULDERS ===============
  "pike-pushup": { dur: 2.4, frames: [
    { x: 0, y: -88, t: 55, aN: { at: [68, -3], b: 1 }, aF: { at: [64, -3], b: 1 }, lN: { at: [-30, -4] }, lF: { at: [-34, -4] } },
    { x: 4, y: -78, t: 38, aN: { at: [68, -3], b: 1 }, aF: { at: [64, -3], b: 1 }, lN: { at: [-30, -4] }, lF: { at: [-34, -4] } },
  ] },
  "arm-circles": { view: "front", mode: "loop", dur: 1.2, frames: [
    { aN: [82, 82], aF: [-82, -82] }, { aN: [90, 97], aF: [-90, -97] },
    { aN: [98, 98], aF: [-98, -98] }, { aN: [90, 83], aF: [-90, -83] },
  ] },
  "shoulder-taps": { mode: "loop", dur: 2.4, frames: [
    PLANK_HIGH, P(PLANK_HIGH, { aN: { at: [50, -60] } }), PLANK_HIGH, P(PLANK_HIGH, { aF: { at: [48, -58] } }),
  ] },
  "inchworm": { dur: 5, frames: [
    { x: 0, y: -88, t: 180, aN: { at: [6, -84] }, aF: { at: [2, -84] }, lN: { at: [0, -3] }, lF: { at: [-4, -3] } },
    { x: -14, y: -86, t: 35, hd: -20, aN: { at: [28, -3] }, aF: { at: [24, -3] }, lN: { at: [0, -3] }, lF: { at: [-4, -3] } },
    PLANK_WIDE,
  ] },
  "dog-to-plank": { dur: 3, frames: [PLANK_WIDE, P(DOG, { fN: 90, fF: 90 })] },
  "prone-t": { view: "top", dur: 2, frames: [
    { aN: [84, 84], aF: [-84, -84], lN: [4, 4], lF: [-4, -4] },
    { aN: [96, 96], aF: [-96, -96], lN: [4, 4], lF: [-4, -4] },
  ] },
  "db-ohp": { view: "front", dur: 2.2, frames: [{ aN: [95, 175], aF: [-95, -175] }, { aN: [168, 178], aF: [-168, -178] }] },
  "lateral-raise": { view: "front", dur: 2.2, frames: [{ aN: [12, 12], aF: [-12, -12] }, { aN: [88, 88], aF: [-88, -88] }] },
  "arnold-press": { view: "front", dur: 2.6, frames: [{ aN: [22, 172], aF: [-22, -172] }, { aN: [168, 178], aF: [-168, -178] }] },

  // =============== ARMS ===============
  "diamond-pushup": { like: "pushup" },
  "close-pushup": { like: "knee-pushup" },
  "chair-dip": { dur: 2.4, ground: false, props: [{ box: [-70, -45, 44, 45] }], frames: [
    { x: -14, y: -54, t: 174, aN: { at: [-30, -49] }, aF: { at: [-34, -49] }, lN: { at: [40, -4] }, lF: { at: [36, -4] } },
    { x: -12, y: -30, t: 172, aN: { at: [-30, -49] }, aF: { at: [-34, -49] }, lN: { at: [40, -4] }, lF: { at: [36, -4] } },
  ] },
  "plank-updown": { dur: 2.6, frames: [PLANK_LOW, PLANK_HIGH] },
  "towel-curl": { dur: 1.4, frames: [P(STAND, { aN: [-4, 116], aF: [-8, 112] }), P(STAND, { aN: [-4, 124], aF: [-8, 120] })] },
  "db-curl": { dur: 2.2, frames: [P(STAND, { aN: [-4, 4], aF: [-8, 0] }), P(STAND, { aN: [-8, 150], aF: [-12, 146] })] },
  "hammer-curl": { like: "db-curl" },
  "db-overhead-ext": { dur: 2.4, frames: [P(STAND, { aN: [176, 345], aF: [172, 341] }), P(STAND, { aN: [176, 182], aF: [172, 178] })] },
  "kickback": { dur: 2.2, frames: [P(BENT, { aN: [-75, 5], aF: [-71, 9] }), P(BENT, { aN: [-75, -75], aF: [-71, -71] })] },

  // =============== CORE ===============
  "plank": { dur: 3, frames: [PLANK_LOW, P(PLANK_LOW, { y: -28 })] },
  "crunch": { dur: 2.2, frames: [
    P(SUPINE, { aN: [-150, -30], aF: [-154, -34] }),
    P(SUPINE, { t: -125, hd: -12, arch: 5, aN: [-185, -65], aF: [-189, -69] }),
  ] },
  "bicycle": { dur: 1.8, frames: [
    { x: 0, y: -9, t: -118, hd: -10, aN: [-182, -62], aF: [-186, -66], lN: [188, 98], lF: [100, 100], fN: 100, fF: 100 },
    { x: 0, y: -9, t: -118, hd: -10, aN: [-182, -62], aF: [-186, -66], lN: [100, 100], lF: [188, 98], fN: 100, fF: 100 },
  ] },
  "dead-bug": { mode: "loop", dur: 4.5, frames: [
    { x: 0, y: -9, t: -90, aN: [180, 180], aF: [178, 178], lN: [180, 90], lF: [178, 88] },
    { x: 0, y: -9, t: -90, aN: [262, 262], aF: [178, 178], lN: [180, 90], lF: [98, 98] },
    { x: 0, y: -9, t: -90, aN: [180, 180], aF: [178, 178], lN: [180, 90], lF: [178, 88] },
    { x: 0, y: -9, t: -90, aN: [180, 180], aF: [260, 260], lN: [98, 98], lF: [178, 88] },
  ] },
  "leg-raise": { dur: 2.6, frames: [
    { x: 0, y: -9, t: -90, aN: [92, 92], aF: [88, 88], lN: [96, 96], lF: [94, 94], fN: 180, fF: 180 },
    { x: 0, y: -9, t: -90, aN: [92, 92], aF: [88, 88], lN: [178, 178], lF: [176, 176], fN: 180, fF: 180 },
  ] },
  "side-plank": { view: "front", dur: 3, frames: [
    { x: 0, y: -31, t: 103, aN: [0, 90], aF: [180, 180], lN: [-77, -77], lF: [-75, -75], fN: -77, fF: -75 },
    { x: 0, y: -34, t: 104, aN: [0, 90], aF: [180, 180], lN: [-77, -77], lF: [-75, -75], fN: -77, fF: -75 },
  ] },
  "mountain-climber": { dur: 0.9, frames: [
    P(PLANK_HIGH, { lN: [60, -60], lF: [-67, -67] }),
    P(PLANK_HIGH, { lN: [-67, -67], lF: [60, -60] }),
  ] },
  "hollow-hold": { dur: 3, frames: [
    { x: 0, y: -14, t: -112, arch: -6, aN: [-108, -108], aF: [-106, -106], lN: [104, 104], lF: [102, 102], fN: 110, fF: 110 },
    { x: 0, y: -14, t: -114, arch: -7, aN: [-110, -110], aF: [-108, -108], lN: [106, 106], lF: [104, 104], fN: 112, fF: 112 },
  ] },
  // Seated, leaning back with feet off the floor; hands sweep from one hip to the other
  "russian-twist": { dur: 2, frames: [
    { x: 0, y: -8, t: 203, aN: [25, 60], aF: [35, 70], lN: [130, 80], lF: [126, 76], fN: 110, fF: 106 },
    { x: 0, y: -8, t: 209, aN: [-25, 25], aF: [-15, 35], lN: [130, 80], lF: [126, 76], fN: 110, fF: 106 },
  ] },
  "flutter-kick": { dur: 0.7, frames: [
    { x: 0, y: -9, t: -96, aN: [92, 92], aF: [88, 88], lN: [96, 96], lF: [108, 108], fN: 96, fF: 108 },
    { x: 0, y: -9, t: -96, aN: [92, 92], aF: [88, 88], lN: [108, 108], lF: [96, 96], fN: 108, fF: 96 },
  ] },

  // =============== MOBILITY (Morning Routine) ===============
  "neck-roll": { view: "front", dur: 3.6, frames: [{ hd: -28 }, { hd: 28 }] },
  "shoulder-roll": { view: "front", dur: 1.8, frames: [{ sh: 0 }, { sh: 8 }] },
  "arm-swing": { view: "front", dur: 1.4, frames: [{ aN: [95, 95], aF: [-95, -95] }, { aN: [-25, -25], aF: [25, 25] }] },
  "cat-cow": { dur: 4, frames: [P(QUAD, { arch: 12, hd: -45 }), P(QUAD, { arch: -10, hd: 30, t: 94 })] },
  "worlds-greatest": { dur: 3.5, frames: [
    { x: 0, y: -36, t: 115, aN: { at: [35, -3] }, aF: [10, 10], lN: { at: [42, -3] }, lF: [-67, -67], fF: 20 },
    { x: 0, y: -36, t: 115, hd: 25, aN: { at: [35, -3] }, aF: [178, 178], lN: { at: [42, -3] }, lF: [-67, -67], fF: 20 },
  ] },
  "hip-circles": { view: "front", mode: "loop", dur: 2.4, frames: [
    { x: -7, t: 184, aN: [30, -40], aF: [-30, 40], lN: { at: [12, -3] }, lF: { at: [-12, -3] } },
    { x: 0, y: -86, aN: [30, -40], aF: [-30, 40], lN: { at: [12, -3] }, lF: { at: [-12, -3] } },
    { x: 7, t: 176, aN: [30, -40], aF: [-30, 40], lN: { at: [12, -3] }, lF: { at: [-12, -3] } },
    { x: 0, y: -90, aN: [30, -40], aF: [-30, 40], lN: { at: [12, -3] }, lF: { at: [-12, -3] } },
  ] },
  "hip-flexor": { dur: 3.5, frames: [
    { x: 0, y: -46, t: 180, aN: [170, 176], aF: [166, 174], lN: { at: [38, -3] }, lF: [-26, -90], fF: -90 },
    { x: 8, y: -40, t: 186, aN: [172, 178], aF: [168, 176], lN: { at: [38, -3] }, lF: [-40, -90], fF: -90 },
  ] },
  "open-book": { dur: 4, frames: [P(SUPINE, { aN: [92, 92] }), P(SUPINE, { aN: [180, 180], hd: -20 }), P(SUPINE, { aN: [266, 266], hd: -40 })] },
  "forward-fold": { dur: 3.6, frames: [
    { x: 0, y: -88, t: 180, aN: { at: [6, -84] }, aF: { at: [2, -84] } },
    { x: -14, y: -86, t: 35, hd: -20, aN: { at: [24, -3] }, aF: { at: [20, -3] } },
  ] },
  "down-dog": { dur: 2.2, frames: [
    P(DOG, { lN: { at: [0, -4] }, fN: 90, lF: { at: [-4, -12] }, fF: 40 }),
    P(DOG, { lN: { at: [0, -12] }, fN: 40, lF: { at: [-4, -4] }, fF: 90 }),
  ] },
  "cobra": { dur: 3.5, frames: [
    P(PRONE, { aN: { at: [40, -3] }, aF: { at: [36, -3] } }),
    P(PRONE, { t: 125, hd: 15, aN: { at: [40, -3] }, aF: { at: [36, -3] } }),
  ] },
  "squat-reach": { dur: 2.8, frames: [SQUAT_LOW, P(STAND, { aN: [175, 178], aF: [171, 174] })] },
  "jumping-jacks": { view: "front", dur: 1, frames: [
    { aN: [14, 10], aF: [-14, -10], lN: { at: [8, -3] }, lF: { at: [-8, -3] } },
    { aN: [90, 95], aF: [-90, -95], lN: { at: [20, -3] }, lF: { at: [-20, -3] }, lift: 10 },
    { aN: [165, 170], aF: [-165, -170], lN: { at: [34, -3] }, lF: { at: [-34, -3] } },
  ] },
  "high-knees": { dur: 0.7, frames: [
    { lN: [95, 5], lF: [0, 0], aN: [-30, 40], aF: [40, 120], lift: 3 },
    { lN: [0, 0], lF: [95, 5], aN: [40, 120], aF: [-30, 40], lift: 3 },
  ] },
};
