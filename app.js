// Daily Reps: a daily workout app that rotates muscle groups.
// All data is saved in your browser's localStorage (nothing leaves your device).
//
// The home screen offers four ways to train:
//   1. Strength Workout  – today's muscle group, picked by the rotation
//   2. Morning Routine   – a short wake-up stretch & mobility flow
//   3. Custom Workout    – choose your own exercises
//   4. Fitness Check     – a timed self-test that recommends your level

// =====================================================================
// Saved data
// =====================================================================
const STORAGE_KEY = "dailyReps.v1";

const DEFAULT_STATE = {
  settings: {
    name: "",
    level: "intermediate",   // beginner | intermediate | advanced
    equipment: "none",       // none | dumbbells
    length: 5,               // exercises per strength workout
    rest: 45,                // seconds of rest between sets
  },
  sessions: [],      // finished workouts: { date, ts, type, title, emoji, groups, exercises, seconds }
  plan: null,        // today's strength workout
  morningPlan: null, // today's morning routine
  customIds: [],     // the last custom workout you built
  checks: [],        // fitness check results: { ts, pushups, squats, plank }
};

let state = load();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return { ...structuredClone(DEFAULT_STATE), ...saved, settings: { ...DEFAULT_STATE.settings, ...saved.settings } };
  } catch (e) { /* fall through to defaults */ }
  return structuredClone(DEFAULT_STATE);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// =====================================================================
// Small helpers
// =====================================================================
const $ = (sel) => document.querySelector(sel);

// Draw a screen. Other screens are emptied first, so their old buttons
// (which can share names like "go" or "back") never get mixed up with this one's.
function mount(sel) {
  document.querySelectorAll(".view").forEach((v) => { if (!v.matches(sel)) v.innerHTML = ""; });
  return document.querySelector(sel);
}
const $$ = (sel) => document.querySelectorAll(sel);
const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
const LEVEL_NAMES = ["beginner", "intermediate", "advanced"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Date as "YYYY-MM-DD" in your local time zone
function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function daysAgo(ts) {
  const diff = Math.round((new Date(dayKey()) - new Date(dayKey(new Date(ts)))) / 864e5);
  return diff === 0 ? "today" : diff === 1 ? "yesterday" : `${diff} days ago`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Older saved workouts only had a single "group"; newer ones have a list.
function sessionGroups(s) { return s.groups || (s.group ? [s.group] : []); }
function sessionTitle(s) { return s.title || `${GROUPS[s.group].name} day`; }
function sessionEmoji(s) { return s.emoji || GROUPS[s.group]?.emoji || "💪"; }

// =====================================================================
// Streaks & history
// =====================================================================
function workoutDays() {
  return new Set(state.sessions.map((s) => s.date));
}

function currentStreak() {
  const days = workoutDays();
  let d = new Date();
  // If you haven't trained yet today, the streak is still alive from yesterday
  if (!days.has(dayKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d = addDays(d, -1); }
  return n;
}

function bestStreak() {
  const sorted = [...workoutDays()].sort();
  let best = 0, run = 0, prev = null;
  for (const k of sorted) {
    const date = new Date(k + "T12:00:00");
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

function doneToday() {
  return state.sessions.some((s) => s.date === dayKey());
}

// =====================================================================
// Muscle-group rotation
// =====================================================================

// When was each muscle group last trained? (timestamp, or 0 if never)
// Strength and custom workouts both count.
function lastTrained(group) {
  const s = state.sessions.filter((x) => sessionGroups(x).includes(group));
  return s.length ? Math.max(...s.map((x) => x.ts)) : 0;
}

// 0–100: how recovered a muscle group is since it was last trained
function recovery(group) {
  const last = lastTrained(group);
  if (!last) return 100;
  const hours = (Date.now() - last) / 36e5;
  return Math.min(100, Math.round((hours / GROUPS[group].recoverHours) * 100));
}

// The rotation: always pick the muscle group you trained longest ago.
// Groups you've never trained go first, in GROUP_ORDER.
function suggestedGroup() {
  return [...GROUP_ORDER].sort((a, b) => lastTrained(a) - lastTrained(b))[0];
}

// =====================================================================
// Building workouts
// =====================================================================
const LEVELS = {
  beginner:     { sets: 2, mult: 0.7, maxDiff: 2, minDiff: 1 },
  intermediate: { sets: 3, mult: 1.0, maxDiff: 3, minDiff: 1 },
  advanced:     { sets: 4, mult: 1.3, maxDiff: 3, minDiff: 2 },
};

const equipOk = (e) => e.equip === "none" || state.settings.equipment === "dumbbells";

function exercisePool(group) {
  const lvl = LEVELS[state.settings.level];
  let pool = EXERCISES.filter((e) => e.group === group && equipOk(e) && e.diff <= lvl.maxDiff && e.diff >= lvl.minDiff);
  // Fall back to everything in the group if the filter is too strict
  if (pool.length < 3) pool = EXERCISES.filter((e) => e.group === group && equipOk(e));
  return pool;
}

// How many sets and reps/seconds, based on your level
function dose(ex) {
  const lvl = LEVELS[state.settings.level];
  const raw = ex.base * lvl.mult;
  const amount = ex.type === "time" ? Math.max(15, Math.round(raw / 5) * 5) : Math.max(4, Math.round(raw));
  return { id: ex.id, sets: lvl.sets, amount };
}

// --- 1. Strength workout ---
function buildStrength(group) {
  const pool = exercisePool(group);
  // Prefer exercises you did NOT do last time you trained this group, so it stays fresh
  const last = [...state.sessions].reverse().find((s) => s.type !== "custom" && sessionGroups(s).includes(group));
  const recent = new Set(last ? last.exercises : []);
  const fresh = shuffle(pool.filter((e) => !recent.has(e.id)));
  const repeat = shuffle(pool.filter((e) => recent.has(e.id)));
  const chosen = [...fresh, ...repeat].slice(0, state.settings.length);
  // Put timed holds near the end; they make a nice finisher
  chosen.sort((a, b) => (a.type === "time") - (b.type === "time"));
  const g = GROUPS[group];
  return {
    kind: "strength", date: dayKey(), group, groups: [group],
    title: `${g.name} Strength`, emoji: g.emoji,
    rest: state.settings.rest, items: chosen.map(dose),
  };
}

function strengthPlan() {
  // Make a new plan each day, and also once today's plan has been done (so a bonus
  // workout moves on to the next muscle group instead of repeating the same one)
  const alreadyDone = state.plan && state.sessions.some((s) =>
    s.date === dayKey() && s.type === "strength" && s.group === state.plan.group);
  if (!state.plan || state.plan.date !== dayKey() || state.plan.kind !== "strength" || alreadyDone) {
    state.plan = buildStrength(suggestedGroup());
    save();
  }
  return state.plan;
}

// --- 2. Morning routine ---
// Two gentle wake-up moves, three stretches, two to get the blood flowing.
function buildMorning() {
  const phase = (n) => shuffle(EXERCISES.filter((e) => e.group === "mobility" && e.phase === n));
  const chosen = [...phase(1).slice(0, 2), ...phase(2).slice(0, 3), ...phase(3).slice(0, 2)];
  return {
    kind: "morning", date: dayKey(), groups: ["mobility"],
    title: "Morning Routine", emoji: "🌅",
    rest: 10, autoStart: true,
    items: chosen.map((e) => ({ id: e.id, sets: 1, amount: e.base })),
  };
}

function morningPlan() {
  if (!state.morningPlan || state.morningPlan.date !== dayKey()) {
    state.morningPlan = buildMorning();
    save();
  }
  return state.morningPlan;
}

// --- 3. Custom workout ---
function buildCustom(ids) {
  const items = ids.map((id) => {
    const ex = byId[id];
    // Mobility moves stay a single gentle round
    return ex.group === "mobility" ? { id, sets: 1, amount: ex.base } : dose(ex);
  });
  return {
    kind: "custom", date: dayKey(),
    groups: [...new Set(ids.map((id) => byId[id].group))],
    title: "Custom Workout", emoji: "🛠️",
    rest: state.settings.rest, items,
  };
}

function doseText(item) {
  const ex = byId[item.id];
  const per = ex.side ? " each side" : "";
  const sets = item.sets > 1 ? `${item.sets} × ` : "";
  return ex.type === "time" ? `${sets}${item.amount}s${per}` : `${sets}${item.amount} reps${per}`;
}

function estimateMinutes(plan) {
  let secs = 0;
  for (const it of plan.items) {
    const ex = byId[it.id];
    const work = ex.type === "time" ? it.amount : it.amount * 3; // ~3s per rep
    secs += it.sets * work * (ex.side ? 2 : 1) + it.sets * plan.rest;
  }
  return Math.max(3, Math.round(secs / 60));
}

// =====================================================================
// Motivation
// =====================================================================
const NUDGES = [
  "Showing up is the hardest rep. Let's go.",
  "Ten minutes today beats zero minutes. Every time.",
  "You don't have to feel like it. You just have to start.",
  "Small sessions, done daily, add up to big changes.",
  "Future you is going to be really glad you did this.",
  "Don't break the chain.",
  "Consistency over intensity.",
];
const CHEERS = [
  "Crushed it!", "That's how it's done!", "Another one in the books!",
  "Beast mode: complete.", "You showed up. That's what matters.", "Stronger than yesterday!",
];

function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return state.settings.name ? `${part}, ${escapeHtml(state.settings.name)}` : part;
}

function streakLine(streak) {
  if (doneToday()) return streak > 1 ? `${streak} days in a row. See you tomorrow!` : "Day one, done. See you tomorrow!";
  if (streak > 0) return `Keep your ${streak}-day streak alive today!`;
  return pick(NUDGES);
}

// =====================================================================
// Screen: Home (the four options)
// =====================================================================
function renderToday() {
  const streak = currentStreak();
  const days = workoutDays();
  const sp = strengthPlan();
  const g = GROUPS[sp.group];
  const lastCheck = state.checks[state.checks.length - 1];

  // Last 7 days strip
  let week = "";
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    const done = days.has(dayKey(d));
    week += `<div class="day ${done ? "done" : ""} ${i === 0 ? "today" : ""}">
      ${d.toLocaleDateString(undefined, { weekday: "narrow" })}
      <div class="dot">${done ? "✓" : d.getDate()}</div></div>`;
  }

  const tile = (id, color, emoji, title, sub, badge) => `
    <button class="mode" data-mode="${id}" style="--mode-color:${color}">
      ${badge ? `<span class="badge">${badge}</span>` : ""}
      <div class="m-emoji">${emoji}</div>
      <div class="m-title">${title}</div>
      <div class="m-sub">${sub}</div>
    </button>`;

  mount("#view-today").innerHTML = `
    <div class="header">
      <div>
        <h1>${greeting()}</h1>
        <div class="muted">${streakLine(streak)}</div>
      </div>
      <div class="streak-pill">🔥 ${streak}</div>
    </div>
    <div class="week">${week}</div>
    ${doneToday() ? `
      <div class="card done-strip">
        <div class="big">🏆</div>
        <div><b>You trained today.</b><div class="muted small">Your streak is safe. Anything extra is a bonus!</div></div>
      </div>` : ""}
    <h2>Choose your workout</h2>
    <div class="modes">
      ${tile("strength", g.color, "🏋️", "Strength Workout", `${g.emoji} ${g.name} day · ~${estimateMinutes(sp)} min`, doneToday() ? "" : "Today")}
      ${tile("morning", "#ffd43b", "🌅", "Morning Routine", "7 gentle moves · ~7 min")}
      ${tile("custom", "#4dabf7", "🛠️", "Custom Workout", "Pick your own exercises")}
      ${tile("check", "#cc5de8", "📋", "Fitness Check", lastCheck ? `Last check ${daysAgo(lastCheck.ts)}` : "Find your level · ~5 min")}
    </div>
    ${!doneToday() && new Date().getHours() < 11 ? `<p class="muted small" style="text-align:center;margin-top:16px">Short on time this morning? The Morning Routine keeps your streak alive too.</p>` : ""}`;

  $$("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    const m = b.dataset.mode;
    if (m === "strength") openPreview("strength");
    if (m === "morning") openPreview("morning");
    if (m === "custom") openCustom();
    if (m === "check") startCheck();
  }));
}

// =====================================================================
// Screen: Strength / Morning preview (list of exercises + Start)
// =====================================================================
let previewKind = "strength";

function openPreview(kind) {
  previewKind = kind;
  renderPreview();
  showView("strength");
}

function renderPreview() {
  const isStrength = previewKind === "strength";
  const plan = isStrength ? strengthPlan() : morningPlan();
  const color = isStrength ? GROUPS[plan.group].color : "#ffd43b";

  const why = isStrength
    ? (recovery(plan.group) >= 100
        ? (lastTrained(plan.group) ? "Fully recovered. Time to hit it again." : "Fresh muscles, never trained here yet.")
        : `${recovery(plan.group)}% recovered.`)
    : "Wake up your joints and get the blood moving.";

  const exRows = plan.items.map((it, i) => {
    const ex = byId[it.id];
    return `<div class="ex-row">
      <div class="num">${i + 1}</div>
      <div class="info" data-tip="${it.id}">
        <div class="name">${ex.name}${ex.equip === "dumbbells" ? '<span class="tag">DB</span>' : ""}</div>
        <div class="dose">${doseText(it)}</div>
      </div>
      <button class="icon-btn" data-swap="${i}" title="Swap exercise">🔄</button>
    </div>`;
  }).join("");

  let extra = "";
  if (isStrength) {
    const chips = GROUP_ORDER.map((k) =>
      `<button class="chip ${k === plan.group ? "active" : ""}" data-group="${k}">${GROUPS[k].emoji} ${GROUPS[k].name}</button>`
    ).join("");
    const bars = GROUP_ORDER.map((k) => {
      const r = recovery(k);
      return `<div class="recovery-row">
        <div class="rname">${GROUPS[k].emoji} ${GROUPS[k].name}</div>
        <div class="bar"><div style="width:${r}%;background:${GROUPS[k].color}"></div></div>
        <div class="pct">${r >= 100 ? "Ready" : r + "%"}</div>
      </div>`;
    }).join("");
    extra = `
      <h2>Want a different focus?</h2><div class="chips">${chips}</div>
      <h2>Muscle recovery</h2>
      <div class="card">${bars}
        <p class="small muted" style="margin:10px 0 0">The app picks whichever group you trained longest ago, so each muscle gets time to recover.</p>
      </div>`;
  }

  mount("#view-strength").innerHTML = `
    <button class="back" id="back">‹ Home</button>
    <div class="card focus" style="--group-color:${color}">
      <div class="label">${isStrength ? "Strength workout" : "Morning routine"}</div>
      <div class="title">${plan.emoji} ${isStrength ? GROUPS[plan.group].name : "Rise & Move"}</div>
      <div class="meta">${why} · ~${estimateMinutes(plan)} min · ${plan.items.length} ${isStrength ? "exercises" : "moves"}</div>
      ${exRows}
      <div style="height:14px"></div>
      <button class="btn" id="start">Start ${isStrength ? "workout" : "routine"}</button>
      <button class="btn ghost" id="shuffle">🎲 Shuffle ${isStrength ? "exercises" : "moves"}</button>
    </div>
    ${extra}`;

  const rebuild = (p) => { if (isStrength) state.plan = p; else state.morningPlan = p; save(); renderPreview(); };

  $("#back").addEventListener("click", () => showTab("today"));
  $("#start").addEventListener("click", () => startWorkout(plan));
  $("#shuffle").addEventListener("click", () => rebuild(isStrength ? buildStrength(plan.group) : buildMorning()));
  $$("[data-group]").forEach((b) => b.addEventListener("click", () => rebuild(buildStrength(b.dataset.group))));
  $$("[data-tip]").forEach((b) => b.addEventListener("click", () => showTip(b.dataset.tip)));
  $$("[data-swap]").forEach((b) => b.addEventListener("click", () => {
    const i = +b.dataset.swap;
    const used = new Set(plan.items.map((x) => x.id));
    const current = byId[plan.items[i].id];
    const pool = isStrength
      ? exercisePool(plan.group)
      : EXERCISES.filter((e) => e.group === "mobility" && e.phase === current.phase);
    const options = pool.filter((e) => !used.has(e.id));
    if (!options.length) return alert("No other options for this slot yet");
    const ex = pick(options);
    plan.items[i] = isStrength ? dose(ex) : { id: ex.id, sets: 1, amount: ex.base };
    rebuild(plan);
  }));
}

// =====================================================================
// Screen: Custom workout builder
// =====================================================================
let customSel = new Set();
let customFilter = "all";

function openCustom() {
  customSel = new Set(state.customIds.filter((id) => byId[id] && equipOk(byId[id])));
  customFilter = "all";
  renderCustom();
  showView("custom");
}

function renderCustom() {
  const groups = [...GROUP_ORDER, "mobility"];
  const visible = EXERCISES.filter((e) => equipOk(e) && (customFilter === "all" || e.group === customFilter));

  const chips = [`<button class="chip ${customFilter === "all" ? "active" : ""}" data-filter="all">All</button>`,
    ...groups.map((k) => `<button class="chip ${customFilter === k ? "active" : ""}" data-filter="${k}">${GROUPS[k].emoji} ${GROUPS[k].name}</button>`)
  ].join("");

  // Show exercises grouped by muscle group
  const sections = groups.map((k) => {
    const list = visible.filter((e) => e.group === k);
    if (!list.length) return "";
    const rows = list.map((e) => {
      const on = customSel.has(e.id);
      const order = on ? [...customSel].indexOf(e.id) + 1 : "";
      return `<div class="pick-row ${on ? "on" : ""}" data-pick="${e.id}">
        <div class="check">${order}</div>
        <div class="info">
          <div class="name">${e.name}${e.equip === "dumbbells" ? '<span class="tag">DB</span>' : ""}</div>
          <div class="dose">${doseText(e.group === "mobility" ? { id: e.id, sets: 1, amount: e.base } : dose(e))}</div>
        </div>
        <button class="icon-btn" data-tip="${e.id}" title="How to">ℹ️</button>
      </div>`;
    }).join("");
    return `<h2>${GROUPS[k].emoji} ${GROUPS[k].name}</h2><div class="card">${rows}</div>`;
  }).join("");

  const n = customSel.size;
  mount("#view-custom").innerHTML = `
    <button class="back" id="back">‹ Home</button>
    <h1>Custom Workout</h1>
    <p class="muted">Tap exercises to add them, in the order you want to do them. Or let the app surprise you.</p>
    <div class="chips">${chips}</div>
    <div style="height:12px"></div>
    <div class="row-btns">
      <button class="btn secondary" id="surprise">🎲 Surprise me</button>
      <button class="btn secondary" id="clear" ${n ? "" : "disabled style='opacity:.4'"}>Clear</button>
    </div>
    ${sections}
    <div class="sticky-bottom">
      <button class="btn" id="go" ${n ? "" : "disabled style='opacity:.4'"}>
        ${n ? `Start · ${n} exercise${n > 1 ? "s" : ""} · ~${estimateMinutes(buildCustom([...customSel]))} min` : "Pick at least one exercise"}
      </button>
    </div>`;

  $("#back").addEventListener("click", () => showTab("today"));
  $$("[data-filter]").forEach((b) => b.addEventListener("click", () => { customFilter = b.dataset.filter; renderCustom(); }));
  $$("[data-pick]").forEach((row) => row.addEventListener("click", (e) => {
    if (e.target.closest("[data-tip]")) return; // the ℹ️ button shows the tip instead
    const id = row.dataset.pick;
    customSel.has(id) ? customSel.delete(id) : customSel.add(id);
    renderCustom();
  }));
  $$("[data-tip]").forEach((b) => b.addEventListener("click", () => showTip(b.dataset.tip)));
  $("#surprise").addEventListener("click", () => {
    const pool = visible.filter((e) => e.group !== "mobility" || customFilter === "mobility");
    customSel = new Set(shuffle(pool).slice(0, state.settings.length).map((e) => e.id));
    renderCustom();
  });
  $("#clear").addEventListener("click", () => { customSel.clear(); renderCustom(); });
  $("#go").addEventListener("click", () => {
    if (!customSel.size) return;
    state.customIds = [...customSel];
    save();
    startWorkout(buildCustom([...customSel]));
  });
}

// =====================================================================
// Screen: Progress
// =====================================================================
function renderHistory() {
  const total = state.sessions.length;
  const mins = Math.round(state.sessions.reduce((a, s) => a + (s.seconds || 0), 0) / 60);
  const countFor = (k) => state.sessions.filter((s) => sessionGroups(s).includes(k)).length;
  const groups = [...GROUP_ORDER, "mobility"];
  const max = Math.max(1, ...groups.map(countFor));

  const counts = groups.map((k) => `<div class="recovery-row">
      <div class="rname">${GROUPS[k].emoji} ${GROUPS[k].name}</div>
      <div class="bar"><div style="width:${(countFor(k) / max) * 100}%;background:${GROUPS[k].color}"></div></div>
      <div class="pct">${countFor(k)}</div>
    </div>`).join("");

  const lastCheck = state.checks[state.checks.length - 1];
  const checkCard = lastCheck ? `
    <h2>Latest fitness check</h2>
    <div class="card">
      ${CHECK_TESTS.map((t) => `<div class="recovery-row"><div class="rname" style="width:auto;flex:1">${t.emoji} ${t.short}</div>
        <b>${lastCheck[t.key]}</b>&nbsp;<span class="muted small">${t.unit}</span></div>`).join("")}
      <p class="muted small" style="margin:8px 0 0">${new Date(lastCheck.ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · re-test every few weeks to see your progress.</p>
    </div>` : "";

  const list = [...state.sessions].reverse().slice(0, 30).map((s) => {
    const when = new Date(s.ts).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    const detail = s.type === "check" ? "Fitness test" : `${s.exercises.length} exercises`;
    return `<div class="card history-item">
      <div><b>${sessionEmoji(s)} ${escapeHtml(sessionTitle(s))}</b><div class="when">${when} · ${detail}</div></div>
      <div class="muted">${Math.max(1, Math.round((s.seconds || 0) / 60))} min</div>
    </div>`;
  }).join("");

  mount("#view-history").innerHTML = `
    <h1>Progress</h1>
    <div style="height:16px"></div>
    <div class="stats">
      <div class="stat"><div class="v">🔥 ${currentStreak()}</div><div class="k">Current streak</div></div>
      <div class="stat"><div class="v">${bestStreak()}</div><div class="k">Best streak</div></div>
      <div class="stat"><div class="v">${total}</div><div class="k">Workouts</div></div>
    </div>
    <p class="muted small" style="text-align:center">${mins} total minutes of training</p>
    ${checkCard}
    <h2>Balance by muscle group</h2>
    <div class="card">${counts}</div>
    <h2>Recent workouts</h2>
    ${list || '<p class="muted">No workouts yet. Your first one is waiting on the Today tab!</p>'}`;
}

// =====================================================================
// Screen: Settings
// =====================================================================
function renderSettings() {
  const s = state.settings;
  const chipRow = (key, options) => options.map(([val, label]) =>
    `<button class="chip ${String(s[key]) === String(val) ? "active" : ""}" data-set="${key}" data-val="${val}">${label}</button>`
  ).join("");

  mount("#view-settings").innerHTML = `
    <h1>Settings</h1>
    <div style="height:20px"></div>
    <div class="setting">
      <label>Your name</label>
      <input type="text" id="name" placeholder="Optional" value="${escapeHtml(s.name)}" />
    </div>
    <div class="setting">
      <label>Fitness level</label>
      <div class="chips">${chipRow("level", [["beginner", "🌱 Beginner"], ["intermediate", "💪 Intermediate"], ["advanced", "🔥 Advanced"]])}</div>
      <p class="muted small">Not sure? Take the Fitness Check on the Today tab.</p>
    </div>
    <div class="setting">
      <label>Equipment</label>
      <div class="chips">${chipRow("equipment", [["none", "Bodyweight only"], ["dumbbells", "I have dumbbells"]])}</div>
    </div>
    <div class="setting">
      <label>Exercises per strength workout</label>
      <div class="chips">${chipRow("length", [[3, "3 · Quick"], [4, "4"], [5, "5 · Standard"], [6, "6 · Long"]])}</div>
    </div>
    <div class="setting">
      <label>Rest between sets</label>
      <div class="chips">${chipRow("rest", [[30, "30s"], [45, "45s"], [60, "60s"], [90, "90s"]])}</div>
    </div>
    <p class="muted small">Changing these rebuilds today's strength workout.</p>
    <div style="height:30px"></div>
    <button class="btn secondary" id="reset">Reset all data</button>`;

  $("#name").addEventListener("input", (e) => { s.name = e.target.value.trim(); save(); });
  $$("[data-set]").forEach((b) => b.addEventListener("click", () => {
    const key = b.dataset.set;
    s[key] = ["length", "rest"].includes(key) ? Number(b.dataset.val) : b.dataset.val;
    rebuildStrengthKeepingGroup();
    save();
    renderSettings();
  }));
  $("#reset").addEventListener("click", () => {
    if (confirm("Delete all your workouts and settings? This can't be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      state = structuredClone(DEFAULT_STATE);
      showTab("today");
    }
  });
}

function rebuildStrengthKeepingGroup() {
  if (state.plan && state.plan.kind === "strength") state.plan = buildStrength(state.plan.group);
}

// =====================================================================
// Timer (shared by workouts and the fitness check)
// =====================================================================
let ticker = null;
const clock = { remaining: 0, total: 0, running: false };

function countdown(seconds, { onEnd, render, onTick }) {
  clearInterval(ticker);
  Object.assign(clock, { remaining: seconds, total: seconds, running: true });
  render();
  ticker = setInterval(() => {
    clock.remaining--;
    onTick?.(clock.remaining);
    if (clock.remaining <= 3 && clock.remaining > 0) beep(660, 0.08);
    if (clock.remaining <= 0) {
      stopClock();
      beep(880, 0.25);
      if (navigator.vibrate) navigator.vibrate(200);
      onEnd();
    } else {
      render();
    }
  }, 1000);
}

function stopClock() {
  clearInterval(ticker);
  clock.running = false;
}

function ring(value, label, fraction, small = false) {
  const R = 100, C = 2 * Math.PI * R;
  return `<div class="ring ${small ? "small" : ""}">
    <svg viewBox="0 0 220 220" width="100%" height="100%">
      <circle cx="110" cy="110" r="${R}" stroke="#232733" stroke-width="12" fill="none"/>
      <circle cx="110" cy="110" r="${R}" stroke="url(#grad)" stroke-width="12" fill="none" stroke-linecap="round"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, Math.min(1, fraction)))}" style="transition: stroke-dashoffset .9s linear"/>
      <defs><linearGradient id="grad"><stop offset="0" stop-color="#ff7a1a"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs>
    </svg>
    <div class="center"><div class="v">${value}</div><div class="k">${label}</div></div>
  </div>`;
}

// =====================================================================
// Workout player (Strength, Morning Routine, Custom)
// =====================================================================
let player = null;

// Turn the plan into a flat list of steps: one per set
function stepsFor(plan) {
  const steps = [];
  plan.items.forEach((it, exIndex) => {
    for (let set = 1; set <= it.sets; set++) steps.push({ ...it, exIndex, set });
  });
  return steps;
}

function startWorkout(plan) {
  stopClock();
  player = { plan, steps: stepsFor(plan), i: 0, phase: "work", startedAt: Date.now() };
  unlockAudio();
  showView("player");
  renderPlayer();
}

function renderPlayer() {
  const p = player;
  const step = p.steps[p.i];
  const ex = byId[step.id];
  const pct = (p.i / p.steps.length) * 100;
  const isMorning = p.plan.kind === "morning";
  let body;

  if (p.phase === "rest") {
    const nextEx = byId[step.id];
    body = `
      <div class="phase">${isMorning ? "Next move" : "Rest"}</div>
      <div class="player-name">${isMorning ? "Get ready" : "Breathe"}</div>
      <div class="player-set">Up next: <b>${nextEx.name}</b>${step.sets > 1 ? ` · set ${step.set} of ${step.sets}` : ""}</div>
      ${FIGURES.html(nextEx.id, "mini")}
      ${ring(clock.remaining, "seconds", clock.remaining / clock.total, true)}
      <div class="row-btns">
        <button class="btn secondary" id="plus">+15s</button>
        <button class="btn" id="skip">${isMorning ? "Go now" : "Skip rest"}</button>
      </div>`;
  } else {
    const isTime = ex.type === "time";
    const figure = FIGURES.html(ex.id);
    const small = !!figure;
    let ringHtml, buttons;
    if (isTime) {
      const total = step.amount * (ex.side ? 2 : 1);
      // For "each side" holds, the timer runs both sides back to back
      let label = "seconds";
      if (ex.side) label = !clock.running || clock.remaining > step.amount ? "seconds · 1st side" : "seconds · 2nd side";
      ringHtml = clock.running ? ring(clock.remaining, label, clock.remaining / total, small) : ring(total, label, 1, small);
      buttons = clock.running
        ? `<button class="btn secondary" id="done">Finish early</button>`
        : `<button class="btn" id="go">Start timer</button>`;
    } else {
      ringHtml = ring(step.amount, `reps${ex.side ? " each side" : ""}`, 1, small);
      buttons = `<button class="btn" id="done">Done ✓</button>`;
    }
    body = `
      <div class="phase">${isMorning ? "Move" : "Exercise"} ${step.exIndex + 1} of ${p.plan.items.length}</div>
      <div class="player-name">${ex.name}</div>
      <div class="player-set">${step.sets > 1 ? `Set ${step.set} of ${step.sets}` : "&nbsp;"}</div>
      ${figure}
      ${ringHtml}
      <div class="tip-box">💡 ${ex.tip}</div>
      ${buttons}`;
  }

  mount("#view-player").innerHTML = `
    <div class="player-top">
      <button class="icon-btn" id="quit" title="Quit">✕</button>
      <div class="muted small">${p.plan.emoji} ${escapeHtml(p.plan.title)}</div>
      <div style="width:36px"></div>
    </div>
    <div class="progress"><div style="width:${pct}%"></div></div>
    ${body}`;

  $("#quit").addEventListener("click", quitWorkout);
  $("#done")?.addEventListener("click", completeSet);
  $("#go")?.addEventListener("click", startWorkTimer);
  $("#skip")?.addEventListener("click", endRest);
  $("#plus")?.addEventListener("click", () => { clock.remaining += 15; clock.total += 15; renderPlayer(); });
}

function startWorkTimer() {
  const step = player.steps[player.i];
  const ex = byId[step.id];
  const total = step.amount * (ex.side ? 2 : 1);
  countdown(total, {
    render: renderPlayer,
    onEnd: completeSet,
    onTick: (left) => {
      if (ex.side && left === step.amount) {   // halfway: switch sides
        beep(880, 0.12); setTimeout(() => beep(880, 0.12), 180);
        if (navigator.vibrate) navigator.vibrate([100, 80, 100]);
      }
    },
  });
}

function completeSet() {
  stopClock();
  player.i++;
  if (player.i >= player.steps.length) return finishWorkout();
  // Rest before the next set
  player.phase = "rest";
  countdown(player.plan.rest, { render: renderPlayer, onEnd: endRest });
}

function endRest() {
  stopClock();
  player.phase = "work";
  const ex = byId[player.steps[player.i].id];
  // The morning routine flows straight into the next move
  if (player.plan.autoStart && ex.type === "time") startWorkTimer();
  else renderPlayer();
}

function quitWorkout() {
  if (!confirm("Quit this workout? It won't count toward your streak.")) return;
  stopClock();
  player = null;
  check = null;
  showTab("today");
}

function logSession(entry) {
  state.sessions.push({ date: dayKey(), ts: Date.now(), ...entry });
  save();
}

function finishWorkout() {
  stopClock();
  const plan = player.plan;
  const seconds = Math.round((Date.now() - player.startedAt) / 1000);
  logSession({
    type: plan.kind, title: plan.title, emoji: plan.emoji,
    groups: plan.groups, group: plan.group,
    exercises: plan.items.map((i) => i.id), seconds,
  });
  player = null;
  showFinish(`${plan.emoji} ${plan.title} complete`, seconds);
}

function showFinish(subtitle, seconds, extraHtml = "") {
  const streak = currentStreak();
  const next = GROUPS[suggestedGroup()];
  mount("#view-finish").innerHTML = `
    <div class="finish-emoji">🎉</div>
    <h1 style="margin-top:16px">${pick(CHEERS)}</h1>
    <p class="muted">${escapeHtml(subtitle)}</p>
    <div class="stats" style="margin:28px 0">
      <div class="stat"><div class="v">${Math.max(1, Math.round(seconds / 60))}</div><div class="k">minutes</div></div>
      <div class="stat"><div class="v">🔥 ${streak}</div><div class="k">day streak</div></div>
      <div class="stat"><div class="v">${state.sessions.length}</div><div class="k">total</div></div>
    </div>
    ${extraHtml}
    <p>${streak >= 7 ? "A full week or more. You're building a real habit." :
         streak >= 3 ? "The habit is forming. Keep the chain going!" :
         "Great start. Come back tomorrow to grow your streak!"}</p>
    <p class="muted">Next strength focus: <b>${next.emoji} ${next.name}</b></p>
    <div style="height:20px"></div>
    <button class="btn" id="home">Back home</button>`;
  $("#home").addEventListener("click", () => showTab("today"));
  showView("finish");
  beep(523, 0.15); setTimeout(() => beep(659, 0.15), 160); setTimeout(() => beep(784, 0.3), 320);
}

// =====================================================================
// Fitness Check: three timed tests that recommend your level
// =====================================================================
// "levels" are rough cut-offs between beginner | intermediate | advanced.
const CHECK_TESTS = [
  { key: "pushups", exId: "pushup", short: "Push-ups in 60s", name: "Push-up Test", emoji: "🛡️", mode: "count", seconds: 60, unit: "reps", levels: [10, 25],
    tip: "Do as many push-ups as you can in 60 seconds with good form. Knee push-ups are fine, just use the same kind next time so you can compare." },
  { key: "squats", exId: "squat", short: "Squats in 60s", name: "Squat Test", emoji: "🦵", mode: "count", seconds: 60, unit: "reps", levels: [25, 40],
    tip: "Do as many bodyweight squats as you can in 60 seconds. Thighs at least parallel to the floor, stand fully up each rep." },
  { key: "plank", exId: "plank", short: "Plank hold", name: "Plank Test", emoji: "🎯", mode: "hold", unit: "sec", levels: [30, 90],
    tip: "Hold a forearm plank for as long as you can with a straight body. Tap Stop as soon as your hips sag or you need to drop." },
];

function testLevel(t, value) {
  return value < t.levels[0] ? 1 : value < t.levels[1] ? 2 : 3;
}

let check = null;

function startCheck() {
  stopClock();
  check = { i: 0, phase: "intro", results: {}, startedAt: Date.now(), input: 0 };
  unlockAudio();
  showView("player");
  renderCheck();
}

function renderCheck() {
  const t = CHECK_TESTS[check.i];
  const prev = state.checks[state.checks.length - 1];
  const progress = (check.i / CHECK_TESTS.length) * 100;
  let body = "";

  if (check.phase === "intro") {
    body = `
      <div class="phase">Fitness Check</div>
      <div class="player-name">How fit are you right now?</div>
      <p class="muted">Three quick tests, about 5 minutes. Your results set the right difficulty for your workouts, and you can re-test every few weeks to see your progress.</p>
      <div class="card" style="text-align:left">
        ${CHECK_TESTS.map((x, n) => `<div class="ex-row" ${n === 0 ? 'style="border-top:0"' : ""}><div class="num">${n + 1}</div>
          <div class="info"><div class="name">${x.emoji} ${x.name}</div><div class="dose">${x.mode === "count" ? "Max reps in 60 seconds" : "Hold as long as you can"}${prev ? ` · last time: ${prev[x.key]} ${x.unit}` : ""}</div></div></div>`).join("")}
      </div>
      <p class="muted small">Warm up for a minute first (the Morning Routine is perfect). Stop if anything hurts.</p>
      <button class="btn" id="begin">Let's go</button>`;
  } else if (check.phase === "ready" || check.phase === "running") {
    const running = check.phase === "running";
    let ringHtml, btn;
    if (t.mode === "count") {
      ringHtml = running ? ring(clock.remaining, "seconds", clock.remaining / clock.total, true) : ring(t.seconds, "seconds", 1, true);
      btn = running ? `<button class="btn secondary" id="stop">Stop early</button>` : `<button class="btn" id="go">Start 60s timer</button>`;
    } else {
      ringHtml = ring(check.elapsed || 0, "seconds", running ? ((check.elapsed || 0) % 60) / 60 : 0, true);
      btn = running ? `<button class="btn" id="stop">Stop</button>` : `<button class="btn" id="go">Start stopwatch</button>`;
    }
    body = `
      <div class="phase">Test ${check.i + 1} of ${CHECK_TESTS.length}</div>
      <div class="player-name">${t.emoji} ${t.name}</div>
      <div class="player-set">${t.mode === "count" ? "Count your reps as you go" : "Go as long as you can"}</div>
      ${FIGURES.html(t.exId)}
      ${ringHtml}
      <div class="tip-box">💡 ${t.tip}</div>
      ${btn}`;
  } else if (check.phase === "input") {
    body = `
      <div class="phase">Test ${check.i + 1} of ${CHECK_TESTS.length}</div>
      <div class="player-name">How many did you do?</div>
      <div class="player-set">${t.name}</div>
      <div class="stepper">
        <button class="icon-btn" id="minus">−</button>
        <input type="number" inputmode="numeric" id="count" min="0" value="${check.input}" />
        <button class="icon-btn" id="plus">+</button>
      </div>
      <button class="btn" id="save">Save result</button>`;
  } else if (check.phase === "rest") {
    const nt = CHECK_TESTS[check.i];
    body = `
      <div class="phase">Rest</div>
      <div class="player-name">Catch your breath</div>
      <div class="player-set">Up next: <b>${nt.emoji} ${nt.name}</b></div>
      ${FIGURES.html(nt.exId, "mini")}
      ${ring(clock.remaining, "seconds", clock.remaining / clock.total, true)}
      <button class="btn" id="skip">I'm ready</button>`;
  }

  mount("#view-player").innerHTML = `
    <div class="player-top">
      <button class="icon-btn" id="quit" title="Quit">✕</button>
      <div class="muted small">📋 Fitness Check</div>
      <div style="width:36px"></div>
    </div>
    <div class="progress"><div style="width:${progress}%"></div></div>
    ${body}`;

  $("#quit").addEventListener("click", quitWorkout);
  $("#begin")?.addEventListener("click", () => { check.phase = "ready"; renderCheck(); });
  $("#skip")?.addEventListener("click", () => { stopClock(); check.phase = "ready"; renderCheck(); });

  $("#go")?.addEventListener("click", () => {
    check.phase = "running";
    if (t.mode === "count") {
      countdown(t.seconds, { render: renderCheck, onEnd: () => toInput() });
    } else {
      // Stopwatch: counts up until you tap Stop
      check.elapsed = 0;
      clearInterval(ticker);
      clock.running = true;
      renderCheck();
      ticker = setInterval(() => { check.elapsed++; if (check.elapsed % 15 === 0) beep(660, 0.06); renderCheck(); }, 1000);
    }
  });

  $("#stop")?.addEventListener("click", () => {
    stopClock();
    if (t.mode === "count") toInput();
    else { beep(880, 0.25); saveTestResult(check.elapsed || 0); }
  });

  if (check.phase === "input") {
    const input = $("#count");
    const set = (v) => { check.input = Math.max(0, v); input.value = check.input; };
    $("#minus").addEventListener("click", () => set((+input.value || 0) - 1));
    $("#plus").addEventListener("click", () => set((+input.value || 0) + 1));
    input.addEventListener("input", () => { check.input = Math.max(0, +input.value || 0); });
    $("#save").addEventListener("click", () => saveTestResult(check.input));
  }
}

function toInput() {
  const t = CHECK_TESTS[check.i];
  const prev = state.checks[state.checks.length - 1];
  check.input = prev ? prev[t.key] : t.levels[0]; // start the counter near a sensible number
  check.phase = "input";
  renderCheck();
}

function saveTestResult(value) {
  const t = CHECK_TESTS[check.i];
  check.results[t.key] = value;
  check.i++;
  if (check.i >= CHECK_TESTS.length) return finishCheck();
  check.phase = "rest";
  countdown(60, { render: renderCheck, onEnd: () => { check.phase = "ready"; renderCheck(); } });
}

function finishCheck() {
  stopClock();
  const prev = state.checks[state.checks.length - 1];
  const r = check.results;
  const seconds = Math.round((Date.now() - check.startedAt) / 1000);
  state.checks.push({ ts: Date.now(), ...r });
  logSession({ type: "check", title: "Fitness Check", emoji: "📋", groups: [], exercises: ["pushup", "squat", "plank"], seconds });

  const scores = CHECK_TESTS.map((t) => testLevel(t, r[t.key]));
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const recommended = LEVEL_NAMES[overall - 1];
  check = null;

  const rows = CHECK_TESTS.map((t, n) => {
    const v = r[t.key];
    const diff = prev ? v - prev[t.key] : null;
    const change = diff === null ? "" : diff > 0 ? ` <span class="lvl-1">▲ ${diff}</span>` : diff < 0 ? ` <span class="lvl-3">▼ ${-diff}</span>` : ' <span class="muted">=</span>';
    return `<div class="card result-row">
      <div><b>${t.emoji} ${t.short}</b><div style="margin-top:4px"><span class="level-pill lvl-${scores[n]}">${cap(LEVEL_NAMES[scores[n] - 1])}</span></div></div>
      <div class="score">${v} <span class="muted small">${t.unit}</span>${change}</div>
    </div>`;
  }).join("");

  const same = recommended === state.settings.level;
  const extra = `
    ${rows}
    <div class="card">
      <div class="muted small">Recommended level</div>
      <div style="font-size:24px;font-weight:800;margin:4px 0 12px">${cap(recommended)}</div>
      ${same
        ? `<p class="muted small" style="margin:0">That's already your level. Your workouts are set up right.</p>`
        : `<button class="btn" id="apply">Set my level to ${cap(recommended)}</button>`}
    </div>
    <p class="muted small">These are rough guides for general fitness, not medical advice.</p>`;

  showFinish("Fitness Check complete", seconds, extra);
  $("#apply")?.addEventListener("click", (e) => {
    state.settings.level = recommended;
    rebuildStrengthKeepingGroup();
    save();
    e.target.outerHTML = `<p class="lvl-1" style="margin:0">✓ Level updated. Your workouts now match your fitness.</p>`;
  });
}

// =====================================================================
// Sounds (tiny beeps using the Web Audio API, no files needed)
// =====================================================================
let audio = null;
function unlockAudio() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume(); } catch (e) {}
}
function beep(freq, dur) {
  if (!audio) return;
  const o = audio.createOscillator(), g = audio.createGain();
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.15, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  o.connect(g).connect(audio.destination);
  o.start(); o.stop(audio.currentTime + dur);
}

// =====================================================================
// Navigation
// =====================================================================
function showView(name) {
  $$(".view").forEach((v) => v.classList.add("hidden"));
  $(`#view-${name}`).classList.remove("hidden");
  $("#tabbar").classList.toggle("hidden", name === "player" || name === "finish");
  window.scrollTo(0, 0);
}

function showTab(name) {
  $$("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  ({ today: renderToday, history: renderHistory, settings: renderSettings })[name]();
  showView(name);
}

function showTip(id) {
  const ex = byId[id];
  $("#sheet-title").textContent = ex.name;
  $("#sheet-body").textContent = ex.tip;
  $("#sheet-figure").innerHTML = FIGURES.html(id);
  $("#sheet").classList.remove("hidden");
}

function hideTip() {
  $("#sheet").classList.add("hidden");
  $("#sheet-figure").innerHTML = "";
}

$("#sheet-close").addEventListener("click", hideTip);
$("#sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") hideTip(); });
$$("#tabbar button").forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));

// Refresh the home screen if the app is left open past midnight
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !player && !check && !$("#view-today").classList.contains("hidden")) renderToday();
});

showTab("today");
