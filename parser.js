/* =====================================================================
 * parser.js  —  custom automaton support (text  <->  definition)
 * ---------------------------------------------------------------------
 * Lets users type their own automaton in a simple text format:
 *
 *     type: NFA                  (optional: DFA or NFA)
 *     states: q0, q1, q2         (optional – inferred if left out)
 *     alphabet: 0, 1             (optional – inferred if left out)
 *     start: q0
 *     final: q2
 *     # transitions:   from, symbol -> target[, target2 ...]
 *     q0, 0|1 -> q0              ('|' lists several symbols)
 *     q0, 0   -> q1
 *     q1, eps -> q2              (eps / epsilon / ε = empty move, NFA only)
 *
 * '#' starts a comment.
 * ===================================================================== */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const FA = (root.FA = root.FA || {});
  const EPS = 'ε';
  const EPS_WORDS = ['ε', 'eps', 'epsilon', 'λ', 'lambda'];

  const normSym = (s) => (EPS_WORDS.includes(s.trim().toLowerCase()) ? EPS : s.trim());
  const splitList = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);

  /** Places states in rows so a freshly typed automaton has a sensible picture. */
  function autoLayout(states) {
    const n = states.length;
    const perRow = n <= 6 ? n : Math.ceil(n / 2);
    states.forEach((s, i) => {
      s.x = 130 + (i % perRow) * 170;
      s.y = 150 + Math.floor(i / perRow) * 190;
    });
  }

  /** Text -> automaton definition. Throws an Error with a helpful message. */
  function parseAutomaton(text, defaultType) {
    const def = {
      id: 'custom',
      type: defaultType || 'DFA',
      name: 'Custom automaton',
      description: 'The automaton you defined in the editor.',
      alphabet: null,
      states: null,
      start: null,
      finals: [],
      transitions: [],
      samples: { accept: [], reject: [] },
    };
    let stateNames = null;

    text.split(/\r?\n/).forEach((raw, i) => {
      const lineNo = i + 1;
      const line = raw.replace(/#.*$/, '').trim();
      if (!line) return;

      const kv = line.match(/^(type|states|alphabet|start|finals?|accepting|accept)\s*:\s*(.*)$/i);
      if (kv) {
        const key = kv[1].toLowerCase();
        const val = kv[2].trim();
        if (key === 'type') {
          const t = val.toUpperCase();
          if (t !== 'DFA' && t !== 'NFA') throw new Error(`Line ${lineNo}: type must be DFA or NFA.`);
          def.type = t;
        } else if (key === 'states') stateNames = splitList(val);
        else if (key === 'alphabet') def.alphabet = splitList(val).map((s) => s.trim());
        else if (key === 'start') def.start = val;
        else def.finals = splitList(val); // final / finals / accept / accepting
        return;
      }

      const m = line.match(/^(.+?)\s*,\s*(.+?)\s*->\s*(.+)$/);
      if (!m) throw new Error(`Line ${lineNo}: cannot understand "${raw.trim()}". Expected  state, symbol -> target`);
      const from = m[1].trim();
      const symbols = m[2].split('|').map(normSym).filter(Boolean);
      const targets = splitList(m[3]);
      if (!symbols.length || !targets.length) throw new Error(`Line ${lineNo}: missing symbol or target state.`);
      targets.forEach((to) => def.transitions.push({ from, to, symbols: symbols.slice() }));
    });

    if (!def.start) throw new Error('Missing "start: <state>" line.');

    if (!stateNames) {
      const seen = [];
      const add = (s) => s && !seen.includes(s) && seen.push(s);
      add(def.start);
      def.transitions.forEach((t) => (add(t.from), add(t.to)));
      def.finals.forEach(add);
      stateNames = seen;
    }

    if (!def.alphabet) {
      const a = [];
      def.transitions.forEach((t) => t.symbols.forEach((s) => s !== EPS && !a.includes(s) && a.push(s)));
      def.alphabet = a;
    }
    if (def.alphabet.length === 0) throw new Error('The alphabet is empty — add some transitions or an "alphabet:" line.');
    def.alphabet = def.alphabet.map((s) => (EPS_WORDS.includes(s.toLowerCase()) ? EPS : s)).filter((s) => s !== EPS);

    def.states = stateNames.map((id) => ({ id }));
    autoLayout(def.states);
    return def;
  }

  /** Automaton definition -> editable text (round-trips with parseAutomaton). */
  function toText(def) {
    const lines = [
      `type: ${def.type}`,
      `states: ${def.states.map((s) => s.id).join(', ')}`,
      `alphabet: ${def.alphabet.join(', ')}`,
      `start: ${def.start}`,
      `final: ${def.finals.join(', ')}`,
      '',
      '# transitions:  from, symbol -> target',
    ];
    def.transitions.forEach((t) => lines.push(`${t.from}, ${t.symbols.join('|')} -> ${t.to}`));
    return lines.join('\n');
  }

  /** Finds a few short accepted / rejected strings to offer as quick-try buttons. */
  function suggestSamples(engine, alphabet, want) {
    want = want || 3;
    const syms = alphabet.slice(0, 6);
    const accept = [];
    const reject = [];
    let layer = [''];
    for (let len = 0; len <= 7 && (accept.length < want || reject.length < want); len++) {
      for (const w of layer) {
        const ok = engine.accepts(w);
        if (ok && accept.length < want) accept.push(w);
        if (!ok && reject.length < want) reject.push(w);
      }
      const next = [];
      outer: for (const w of layer) {
        for (const s of syms) {
          next.push(w + s);
          if (next.length >= 1500) break outer;
        }
      }
      layer = next;
    }
    return { accept, reject };
  }

  FA.autoLayout = autoLayout;
  FA.parseAutomaton = parseAutomaton;
  FA.toText = toText;
  FA.suggestSamples = suggestSamples;
})();
