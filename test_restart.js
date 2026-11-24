// Focused test: verifies the Restart button resets the game (score -> 0, snake
// back to start) and a fresh game is playable afterwards.
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

// Deterministic food so the first eaten food raises the score.
// Spawn order: load (13,12), start (13,12), post-eat (14,12 free),
// restart (13,12), post-eat (14,12 free).
const GRID = 24;
const rx = (x) => (x + 0.5) / GRID;
const ry = 12.5 / GRID;
const seq = [rx(13), ry, rx(13), ry, rx(14), ry, rx(13), ry, rx(14), ry];
let idx = 0;
const fakeMath = { floor: Math.floor, max: Math.max, random: () => seq[idx++ % seq.length] };

const handlers = {};
const buttonClicks = {};
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
// capture button click handlers
elements.startBtn.addEventListener = (evt, fn) => { buttonClicks['start'] = fn; };
elements.restartBtn.addEventListener = (evt, fn) => { buttonClicks['restart'] = fn; };

const code = fs.readFileSync(__dirname + '/script.js', 'utf8');
vm.runInNewContext(code, sandbox, { filename: 'script.js' });

const results = [];
const assert = (name, cond) => results.push([name, !!cond]);
const tick = () => intervals[intervals.length - 1].fn();

// Play: start via key, eat one food -> score 1.
handlers['keydown']({ key: 'ArrowRight', preventDefault() {} });
tick();
assert('score = 1 before restart', Number(elements.score.textContent) === 1);

// Click Restart.
buttonClicks['restart']();
assert('score reset to 0 after restart', Number(elements.score.textContent) === 0);
assert('game running after restart (overlay hidden)', elements.overlay.classList.contains('hidden'));

// New game is playable: eat again -> score 1.
tick();
assert('score = 1 again after restart (game works)', Number(elements.score.textContent) === 1);

let pass = 0, fail = 0;
for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
  ok ? pass++ : fail++;
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);