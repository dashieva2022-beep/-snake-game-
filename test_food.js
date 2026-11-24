// Focused test: verifies food spawns on a free board cell, is eatable, and the
// score increases as the snake eats. Uses a deterministic food placement that
// always lands one cell ahead of the snake (always free), so the game can eat
// several times in a straight line toward the wall.
const fs = require('fs');
const vm = require('vm');

function makeCtx() {
  return new Proxy({}, {
    get(_, prop) {
      if (prop === 'createLinearGradient') return () => ({ addColorStop: () => {} });
      return () => {};
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
}
function makeClassList() {
  const set = new Set();
  return { add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c) };
}
function makeElement() {
  return {
    textContent: '', classList: makeClassList(), addEventListener() {},
    style: {}, width: 480, height: 480, getContext: makeCtx,
  };
}

const elements = {
  gameCanvas: makeElement(), score: makeElement(), best: makeElement(),
  overlay: makeElement(), 'overlay-title': makeElement(), 'overlay-text': makeElement(),
  startBtn: makeElement(), restartBtn: makeElement(),
};

// Deterministic food placement.
//  randomCell() calls Math.random() twice -> x then y.
//  Snake head starts at (12,12) heading right; food is placed one cell ahead:
//  first at (13,12), then (14,12), (15,12), ... each always free at spawn time.
//  x = floor(r*24)=N  ->  r = (N+0.5)/24 ;  y = floor(r*24)=12  ->  r = 12.5/24.
const GRID = 24;
const rx = (x) => (x + 0.5) / GRID;
const ry = 12.5 / GRID;

const seq = [];
// spawn happens on load AND on game start -> (13,12) twice
seq.push(rx(13), ry, rx(13), ry);
// one spawn per subsequent eaten food, always one cell ahead
for (let n = 14; n <= 20; n++) seq.push(rx(n), ry);

let idx = 0;
const fakeMath = {
  floor: Math.floor,
  max: Math.max,
  random: () => seq[idx++ % seq.length],
};

const handlers = {};
const intervals = [];
const sandbox = {
  Math: fakeMath,
  Number, Object, JSON, console,
  localStorage: { getItem: () => null, setItem: () => {} },
  document: {
    getElementById: (id) => elements[id],
    addEventListener: (evt, fn) => { handlers[evt] = fn; },
  },
  setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length; },
  clearInterval: () => {},
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const code = fs.readFileSync(__dirname + '/script.js', 'utf8');
vm.runInNewContext(code, sandbox, { filename: 'script.js' });

const results = [];
const assert = (name, cond) => results.push([name, !!cond]);

const tick = () => intervals[intervals.length - 1].fn();

// Start the game (overlay hides, snake starts heading right).
handlers['keydown']({ key: 'ArrowRight', preventDefault() {} });
assert('game started (overlay hidden)', elements.overlay.classList.contains('hidden'));

// Eat food three times in a row; score should increment each time.
tick(); // head -> (13,12) eats food #1
assert('score = 1 after first food', Number(elements.score.textContent) === 1);

tick(); // head -> (14,12) eats food #2
assert('score = 2 after second food', Number(elements.score.textContent) === 2);

tick(); // head -> (15,12) eats food #3
assert('score = 3 after third food', Number(elements.score.textContent) === 3);

// Game should not have ended from eating.
assert('no Game Over while eating', !elements['overlay-title'].textContent.includes('Game Over'));

let pass = 0, fail = 0;
for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);