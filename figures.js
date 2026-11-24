// Animated exercise figures, drawn with code (no image or video files).
//
// How it works:
// - A simple "skeleton": hips, torso, head, two arms (upper + forearm) and two legs (thigh + shin + foot).
// - Each exercise has a few key poses. The engine smoothly blends between them in a loop.
// - Angles are in degrees: 0 = pointing down, 90 = forward (the figure faces right), 180 = up, -90 = backward.
// - Instead of angles, a hand or foot can be pinned to a spot (e.g. hands on the floor in a push-up),
//   and the elbow/knee is worked out automatically ("inverse kinematics").
// - The floor is at y = 0. Negative y is up.
//
// Pose fields:
//   x, y      hip position          t     torso angle        hd   head tilt (relative to torso)
//   arch      spine curve (cat/cow) sh    shoulder shrug     lift raise whole body (jumps)
//   aN / aF   near / far arm: [upperArm, forearm] angles, or { at: [x, y] } to pin the hand
//   lN / lF   near / far leg: [thigh, shin] angles, or { at: [x, y] } to pin the ankle
//   fN / fF   foot angles
//
// Views: "side" (default), "front" (facing you), "top" (lying down, seen from above).

const FIGURES = (() => {
  const LEN = { torso: 52, upper: 30, fore: 28, thigh: 44, shin: 42, foot: 12, neck: 17, head: 10 };

  const rad = (a) => (a * Math.PI) / 180;
  const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))];
  const move = (p, a, len) => { const d = dir(a); return [p[0] + d[0] * len, p[1] + d[1] * len]; };

  // Two-bone inverse kinematics: find the elbow/knee so the hand/foot reaches the target
  function ik(base, target, l1, l2, bend) {
    let dx = target[0] - base[0], dy = target[1] - base[1];
    const D = Math.hypot(dx, dy) || 0.001;
    const ux = dx / D, uy = dy / D;
    const d = Math.min(Math.max(D, Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const joint = [base[0] + ux * a + bend * h * uy, base[1] + uy * a - bend * h * ux];
    const ex = target[0] - joint[0], ey = target[1] - joint[1];
    const el = Math.hypot(ex, ey) || 0.001;
    return [joint, [joint[0] + (ex / el) * l2, joint[1] + (ey / el) * l2]];
  }

  function limb(base, spec, l1, l2, defaultBend) {
    if (Array.isArray(spec)) { const j = move(base, spec[0], l1); return [j, move(j, spec[1], l2)]; }
    return ik(base, spec.at, l1, l2, spec.b ?? defaultBend);
  }

  // ------------------------------------------------------------------
  // Blending between poses
  // ------------------------------------------------------------------
  const lerp = (a, b, t) => a + (b - a) * t;
  function blend(a, b, t) {
    if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => lerp(v, b[i], t));
    if (a && b && a.at && b.at) return { at: blend(a.at, b.at, t), b: a.b ?? b.b };
    if (typeof a === "number" && typeof b === "number") return lerp(a, b, t);
    return t < 0.5 ? a : b;
  }
  function blendPose(p, q, t) {
    const out = {};
    for (const k in p) out[k] = blend(p[k], q[k], t);
    return out;
  }
  const ease = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);

  // ------------------------------------------------------------------
  // Pose -> points
  // ------------------------------------------------------------------
  function solve(p, view) {
    const front = view !== "side";
    const H = [p.x, p.y];
    const S = move(H, p.t, LEN.torso);
    const side = dir(p.t - 90); // points to the figure's "near" side in front view
    const off = (pt, w) => (front ? [pt[0] + side[0] * w, pt[1] + side[1] * w] : pt);
    const SN = off(S, 15), SF = off(S, -15);
    if (front && p.sh) { SN[1] -= p.sh; SF[1] -= p.sh; }
    const HN = off(H, 8), HF = off(H, -8);
    const head = move(S, p.t + p.hd, LEN.neck);
    const [eN, hN] = limb(SN, p.aN, LEN.upper, LEN.fore, -1);
    const [eF, hF] = limb(SF, p.aF, LEN.upper, LEN.fore, -1);
    const [kN, anN] = limb(HN, p.lN, LEN.thigh, LEN.shin, 1);
    const [kF, anF] = limb(HF, p.lF, LEN.thigh, LEN.shin, 1);
    const toeN = move(anN, p.fN, LEN.foot), toeF = move(anF, p.fF, LEN.foot);
    // Spine curve control point (for cat/cow, crunches)
    const mid = [(H[0] + S[0]) / 2, (H[1] + S[1]) / 2];
    const perp = dir(p.t + 90);
    const C = [mid[0] + perp[0] * p.arch, mid[1] + perp[1] * p.arch];
    return { H, S, SN, SF, HN, HF, C, head, eN, hN, eF, hF, kN, anN, kF, anF, toeN, toeF };
  }

  function allPoints(f) {
    return [f.H, f.S, f.SN, f.SF, f.HN, f.HF, f.eN, f.hN, f.eF, f.hF, f.kN, f.anN, f.kF, f.anF, f.toeN, f.toeF,
      [f.head[0], f.head[1] + LEN.head], [f.head[0], f.head[1] - LEN.head], [f.head[0] + LEN.head, f.head[1]], [f.head[0] - LEN.head, f.head[1]]];
  }

  function transform(f, fn) {
    for (const k in f) f[k] = fn(f[k]);
    return f;
  }

  // Full figure at a moment in the animation cycle (phase 0..1)
  function frameAt(anim, phase) {
    const seq = anim.seq;
    const pos = phase * (seq.length - 1);
    const i = Math.min(Math.floor(pos), seq.length - 2);
    const pose = blendPose(seq[i], seq[i + 1], ease(pos - i));
    let f = solve(pose, anim.view);
    if (anim.view === "top") {
      f = transform(f, ([x, y]) => [-y, x]); // lay the figure down: head points right
    } else if (anim.ground !== false) {
      const lowest = Math.max(...allPoints(f).map((pt) => pt[1]));
      f = transform(f, ([x, y]) => [x, y - lowest - 4]);
    }
    if (pose.lift) f = transform(f, ([x, y]) => [x, y - pose.lift]);
    return f;
  }

  // ------------------------------------------------------------------
  // Drawing
  // ------------------------------------------------------------------
  const BODY = "#e9ecef";
  const PROP = "#3a4050";
  const line = (a, b, w, c, o = 1) =>
    `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;

  function dumbbell(elbow, hand) {
    const dx = hand[0] - elbow[0], dy = hand[1] - elbow[1];
    const l = Math.hypot(dx, dy) || 1;
    const px = (-dy / l) * 8, py = (dx / l) * 8;
    const a = [hand[0] - px, hand[1] - py], b = [hand[0] + px, hand[1] + py];
    return line(a, b, 4, "#9aa1ad") +
      `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="5" fill="#9aa1ad"/><circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="5" fill="#9aa1ad"/>`;
  }

  function draw(anim, f) {
    const front = anim.view !== "side";
    const hl = anim.highlight;
    const col = (part) => (hl.includes(part) ? anim.color : BODY);
    const farO = front ? 1 : 0.45;
    let s = "";

    // Floor & props
    if (anim.view !== "top") s += line([-400, 2], [400, 2], 3, PROP);
    for (const p of anim.props || []) {
      if (p.box) { const [x, y, w, h] = p.box; s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${PROP}"/>`; }
      if (p.wall !== undefined) s += line([p.wall, 2], [p.wall, -190], 6, PROP);
    }

    // Far limbs (behind the body)
    s += line(f.HF, f.kF, 9, col("legs"), farO) + line(f.kF, f.anF, 8, col("legs"), farO) + line(f.anF, f.toeF, 6, BODY, farO);
    s += line(f.SF, f.eF, 8, col("arms"), farO) + line(f.eF, f.hF, 7, col("arms"), farO);
    if (anim.db) s += dumbbell(f.eF, f.hF);

    // Torso & head
    const tw = front ? 22 : 15;
    s += `<path d="M${f.H[0].toFixed(1)} ${f.H[1].toFixed(1)} Q${f.C[0].toFixed(1)} ${f.C[1].toFixed(1)} ${f.S[0].toFixed(1)} ${f.S[1].toFixed(1)}" stroke="${col("torso")}" stroke-width="${tw}" stroke-linecap="round" fill="none"/>`;
    if (front) s += line(f.SF, f.SN, 10, col(hl.includes("shoulders") ? "shoulders" : "torso")) + line(f.HF, f.HN, 10, col("torso"));
    s += `<circle cx="${f.head[0].toFixed(1)}" cy="${f.head[1].toFixed(1)}" r="${LEN.head}" fill="${BODY}"/>`;

    // Near limbs (in front of the body)
    s += line(f.HN, f.kN, 9, col("legs")) + line(f.kN, f.anN, 8, col("legs")) + line(f.anN, f.toeN, 6, BODY);
    s += line(f.SN, f.eN, 8, col("arms")) + line(f.eN, f.hN, 7, col("arms"));
    if (anim.db) s += dumbbell(f.eN, f.hN);
    return s;
  }

  // ------------------------------------------------------------------
  // Setting up an exercise's animation
  // ------------------------------------------------------------------
  const DEFAULTS = {
    side:  { x: 0, y: -88, t: 180, hd: 0, arch: 0, sh: 0, lift: 0, aN: [8, 14], aF: [-4, 6], lN: { at: [3, -3] }, lF: { at: [-3, -3] }, fN: 90, fF: 90 },
    front: { x: 0, y: -88, t: 180, hd: 0, arch: 0, sh: 0, lift: 0, aN: [12, 6], aF: [-12, -6], lN: { at: [10, -3] }, lF: { at: [-10, -3] }, fN: 90, fF: -90 },
  };
  const HIGHLIGHT = {
    chest: ["torso"], back: ["torso"], core: ["torso"],
    legs: ["legs"], arms: ["arms"], shoulders: ["arms", "shoulders"], mobility: [],
  };

  const cache = {};
  function prepare(exId) {
    if (cache[exId]) return cache[exId];
    let spec = ANIMS[exId];
    if (!spec) return null;
    if (spec.like) spec = { ...ANIMS[spec.like], ...spec };
    const ex = byId[exId];
    const view = spec.view || "side";
    const base = DEFAULTS[view === "side" ? "side" : "front"];
    const frames = spec.frames.map((fr) => ({ ...base, ...fr }));
    const seq = spec.mode === "loop" ? [...frames, frames[0]] : [...frames, ...frames.slice(0, -1).reverse()];
    const anim = {
      ...spec, view, seq, dur: spec.dur || 2,
      db: ex.equip === "dumbbells",
      color: GROUPS[ex.group].color,
      highlight: HIGHLIGHT[ex.group] || [],
    };
    // Fixed camera: fit every moment of the animation
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i <= 40; i++) {
      for (const [x, y] of allPoints(frameAt(anim, i / 40))) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    for (const p of anim.props || []) {
      if (p.box) { minX = Math.min(minX, p.box[0]); maxX = Math.max(maxX, p.box[0] + p.box[2]); }
    }
    if (view !== "top") maxY = Math.max(maxY, 2);
    const pad = 16;
    anim.viewBox = [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2].map((v) => v.toFixed(0)).join(" ");
    return (cache[exId] = anim);
  }

  function phaseNow(anim) {
    return ((performance.now() / 1000) % anim.dur) / anim.dur;
  }

  // HTML for an animated figure. It's drawn immediately (so re-rendering a screen
  // doesn't flicker) and then kept moving by the loop below.
  function html(exId, cls = "") {
    const anim = prepare(exId);
    if (!anim) return "";
    return `<div class="figure ${cls}"><svg viewBox="${anim.viewBox}" preserveAspectRatio="xMidYMid meet" data-fig="${exId}">${draw(anim, frameAt(anim, phaseNow(anim)))}</svg></div>`;
  }

  function tick() {
    document.querySelectorAll("svg[data-fig]").forEach((svg) => {
      const anim = prepare(svg.dataset.fig);
      if (anim) svg.innerHTML = draw(anim, frameAt(anim, phaseNow(anim)));
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // A still frame at a given point in the movement (0..1). Handy for checking poses.
  function still(exId, phase, cls = "") {
    const anim = prepare(exId);
    if (!anim) return "";
    return `<div class="figure ${cls}"><svg viewBox="${anim.viewBox}" preserveAspectRatio="xMidYMid meet">${draw(anim, frameAt(anim, phase))}</svg></div>`;
  }

  return { html, still };
})();
