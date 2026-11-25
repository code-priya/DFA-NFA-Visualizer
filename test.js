/* =====================================================================
 * tests/test.js  —  MEMBER 5 : testing
 * Run with:   node tests/test.js              (prints a summary)
 *             node tests/test.js --report     (also writes report/test-results.md)
 * No libraries needed, only Node.js.
 * ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

require('../js/dfa.js');
require('../js/nfa.js');
require('../js/presets.js');
require('../js/parser.js');
const FA = globalThis.FA;

let passed = 0;
let failed = 0;
const failures = [];
const rows = []; // for the markdown report

function check(name, cond, detail) {
  if (cond) passed++;
  else {
    failed++;
    failures.push(name + (detail ? '  -> ' + detail : ''));
  }
}

const build = (def) => (def.type === 'DFA' ? new FA.DFA(def) : new FA.NFA(def));

/* ---------- 1. every preset: structure + its own sample strings ---------- */
[...FA.PRESETS.DFA, ...FA.PRESETS.NFA].forEach((def) => {
  const m = build(def);
  const v = m.validate();
  check(`${def.id}: validates`, v.errors.length === 0, v.errors.join('; '));
  def.samples.accept.forEach((w) => {
    const got = m.accepts(w);
    check(`${def.id}: "${w}" accepted`, got === true);
    rows.push([def.type, def.name, w, 'ACCEPT', got ? 'ACCEPT' : 'REJECT']);
  });
  def.samples.reject.forEach((w) => {
    const got = m.accepts(w);
    check(`${def.id}: "${w}" rejected`, got === false);
    rows.push([def.type, def.name, w, 'REJECT', got ? 'ACCEPT' : 'REJECT']);
  });
});

/* ---------- 2. exhaustive comparison with an independent reference ---------- */
function allStrings(alphabet, maxLen) {
  let layer = [''];
  const out = [''];
  for (let i = 0; i < maxLen; i++) {
    const next = [];
    for (const w of layer) for (const a of alphabet) next.push(w + a);
    out.push(...next);
    layer = next;
  }
  return out;
}

const byId = {};
[...FA.PRESETS.DFA, ...FA.PRESETS.NFA].forEach((d) => (byId[d.id] = d));

const references = {
  'dfa-ends-01': (w) => w.endsWith('01'),
  'dfa-even-ones': (w) => (w.match(/1/g) || []).length % 2 === 0,
  'dfa-contains-ab': (w) => w.includes('ab'),
  'dfa-div-3': (w) => (w === '' ? true : parseInt(w, 2) % 3 === 0),
  'nfa-ends-01': (w) => w.endsWith('01'),
  'nfa-contains-101': (w) => w.includes('101'),
  'nfa-eps-012': (w) => /^0*1*2*$/.test(w),
  'nfa-eps-union': (w) => /^a*$/.test(w) || /^b*$/.test(w),
};

Object.keys(references).forEach((id) => {
  const def = byId[id];
  const m = build(def);
  const ws = allStrings(def.alphabet, def.alphabet.length === 3 ? 7 : 10);
  let bad = null;
  for (const w of ws) {
    if (m.accepts(w) !== references[id](w)) {
      bad = w;
      break;
    }
  }
  check(`${id}: agrees with reference on ${ws.length} strings`, bad === null, `first mismatch: "${bad}"`);
});

/* ---------- 3. DFA behaviour details ---------- */
{
  const m = new FA.DFA(byId['dfa-ends-01']);
  const t = m.run('1101');
  const path = t.steps.map((s) => s.active[0]).join('');
  check('DFA 1101 visits q0 q0 q0 q1 q2', path === 'q0q0q0q1q2', path);
  check('DFA trace has len+1 steps', t.steps.length === 5);
  check('DFA accepts => finalStates [q2]', t.accepted && t.finalStates[0] === 'q2');
  check('DFA 1100 rejected in q1', !m.run('1100').accepted && m.run('1100').finalStates[0] === 'q1');

  const dead = m.run('1x1');
  check('DFA symbol outside alphabet => dead + rejected', dead.dead && !dead.accepted);
  check('DFA dead trace stops at the bad symbol', dead.steps.length === 3);
}

/* ---------- 4. NFA behaviour details ---------- */
{
  const m = new FA.NFA(byId['nfa-ends-01']);
  const t = m.run('01');
  check('NFA 01 step1 active = {q0,q1}', t.steps[1].active.join() === 'q0,q1', t.steps[1].active.join());
  check('NFA 01 step2 active = {q0,q2}', t.steps[2].active.join() === 'q0,q2', t.steps[2].active.join());
  check('NFA 01 accepted, final q2', t.accepted && t.finalStates.join() === 'q2');

  const e = new FA.NFA(byId['nfa-eps-012']);
  const cl = e.epsilonClosure(['q0']);
  check('ε-closure(q0) = {q0,q1,q2}', e.order(cl.states).join() === 'q0,q1,q2');
  check('ε-closure follows 2 ε-edges', cl.edges.length === 2);
  check('ε-NFA initial step already has 3 active states', e.run('').steps[0].active.length === 3);
  check('ε-NFA accepts empty string', e.accepts(''));

  const u = new FA.NFA(byId['nfa-eps-union']);
  check('union NFA: "ab" dies (no active states)', u.run('ab').dead && !u.run('ab').accepted);
}

/* ---------- 5. validation ---------- */
{
  const bad = JSON.parse(JSON.stringify(byId['dfa-ends-01']));
  bad.transitions.push({ from: 'q0', to: 'q2', symbols: ['0'] });
  check('DFA validate catches nondeterminism', new FA.DFA(bad).validate().errors.length > 0);

  const eps = JSON.parse(JSON.stringify(byId['dfa-ends-01']));
  eps.transitions.push({ from: 'q0', to: 'q1', symbols: ['ε'] });
  check('DFA validate rejects ε-transitions', new FA.DFA(eps).validate().errors.length > 0);

  const partial = JSON.parse(JSON.stringify(byId['dfa-ends-01']));
  partial.transitions = partial.transitions.filter((t) => !(t.from === 'q2' && t.to === 'q0'));
  const v = new FA.DFA(partial).validate();
  check('DFA with missing transition: warning, no error', v.errors.length === 0 && v.warnings.length === 1);
}

/* ---------- 6. parser round-trip & custom text ---------- */
{
  [...FA.PRESETS.DFA, ...FA.PRESETS.NFA].forEach((def) => {
    const text = FA.toText(def);
    const parsed = FA.parseAutomaton(text, def.type);
    const a = build(def);
    const b = build(parsed);
    const ws = allStrings(def.alphabet, 6);
    check(`parser round-trip: ${def.id}`, ws.every((w) => a.accepts(w) === b.accepts(w)));
  });

  const custom = FA.parseAutomaton('start: s\nfinal: t\ns, a|b -> s\ns, a -> t', 'NFA');
  const m = new FA.NFA(custom);
  check('custom NFA parsed (inferred states/alphabet)', custom.states.length === 2 && custom.alphabet.join() === 'a,b');
  check('custom NFA: "bba" accepted, "ab" rejected', m.accepts('bba') && !m.accepts('ab'));

  let threw = false;
  try {
    FA.parseAutomaton('states: q0\nq0 0 q1', 'DFA');
  } catch (e) {
    threw = true;
  }
  check('parser reports malformed lines', threw);

  const s = FA.suggestSamples(m, custom.alphabet);
  check('suggestSamples returns accepted and rejected strings', s.accept.length > 0 && s.reject.length > 0);
}

/* ---------- summary ---------- */
console.log(`\nDFA/NFA Visualizer — logic tests`);
console.log(`  passed: ${passed}`);
console.log(`  failed: ${failed}`);
if (failed) {
  console.log('\nFailures:');
  failures.forEach((f) => console.log('  ✗ ' + f));
}

if (process.argv.includes('--report')) {
  const lines = [
    '# Test results',
    '',
    `Generated automatically by \`node tests/test.js --report\` — ${passed} checks passed, ${failed} failed.`,
    '',
    '| # | Type | Automaton | Input string | Expected | Result | Pass |',
    '|---|------|-----------|--------------|----------|--------|------|',
  ];
  rows.forEach((r, i) => {
    const shown = r[2] === '' ? 'ε (empty)' : r[2];
    lines.push(`| ${i + 1} | ${r[0]} | ${r[1]} | \`${shown}\` | ${r[3]} | ${r[4]} | ${r[3] === r[4] ? '✔' : '✘'} |`);
  });
  const out = path.join(__dirname, '..', 'report', 'test-results.md');
  fs.writeFileSync(out, lines.join('\n') + '\n');
  console.log('\nWrote ' + out);
}

process.exit(failed ? 1 : 0);
