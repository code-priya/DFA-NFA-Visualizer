/* =====================================================================
 * nfa.js  —  MEMBER 2 : NFA Logic Developer
 * ---------------------------------------------------------------------
 * A Nondeterministic Finite Automaton (with ε-moves) is again a tuple
 *   N = (Q, Σ, δ, q0, F)   but now
 *   δ : Q × (Σ ∪ {ε}) → P(Q)     (a SET of next states, possibly empty)
 *
 * Simulation idea ("set of active states"):
 *   1. Start with the ε-closure of {q0}.
 *   2. For every input symbol a:
 *        moved  = union of δ(q, a) for every active state q
 *        active = ε-closure(moved)
 *   3. Accept if at least one active state is final.
 *
 * The same trace format as dfa.js is produced, but `active` may contain
 * several states and `edges` several transitions per step.
 * ===================================================================== */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const FA = (root.FA = root.FA || {});
  const EPS = 'ε';
  FA.EPS = EPS;

  class NFA {
    constructor(def) {
      this.def = def;
      this.type = 'NFA';
      this.states = def.states.map((s) => s.id);
      this.alphabet = def.alphabet.slice();
      this.start = def.start;
      this.finals = new Set(def.finals);

      this.delta = {}; // delta[state][symbol] = [targets]
      this.states.forEach((s) => (this.delta[s] = {}));
      (def.transitions || []).forEach((t) => {
        if (!this.delta[t.from]) return;
        t.symbols.forEach((sym) => {
          const list = (this.delta[t.from][sym] = this.delta[t.from][sym] || []);
          if (!list.includes(t.to)) list.push(t.to);
        });
      });
    }

    validate() {
      const errors = [];
      const warnings = [];
      const has = (s) => this.states.includes(s);

      if (this.states.length === 0) errors.push('The automaton has no states.');
      if (!has(this.start)) errors.push(`Start state "${this.start}" is not in the state list.`);
      this.finals.forEach((f) => {
        if (!has(f)) errors.push(`Final state "${f}" is not in the state list.`);
      });
      (this.def.transitions || []).forEach((t) => {
        if (!has(t.from)) errors.push(`Transition uses unknown state "${t.from}".`);
        if (!has(t.to)) errors.push(`Transition uses unknown state "${t.to}".`);
        t.symbols.forEach((sym) => {
          if (sym !== EPS && !this.alphabet.includes(sym))
            errors.push(`Symbol "${sym}" (on ${t.from}) is not in the alphabet.`);
        });
      });
      return { errors: Array.from(new Set(errors)), warnings };
    }

    /** Returns the given states in the order they were declared (for stable output). */
    order(set) {
      const s = set instanceof Set ? set : new Set(set);
      return this.states.filter((q) => s.has(q));
    }

    /**
     * ε-closure: every state reachable from `startStates` using only ε-moves
     * (including the start states themselves). Also returns the ε-edges that
     * were followed, so they can be highlighted in the diagram.
     */
    epsilonClosure(startStates) {
      const closure = new Set(startStates);
      const stack = Array.from(startStates);
      const edges = [];
      const seen = new Set();

      while (stack.length) {
        const q = stack.pop();
        const targets = (this.delta[q] || {})[EPS] || [];
        for (const t of targets) {
          const key = q + '\u0001' + t;
          if (!seen.has(key)) {
            seen.add(key);
            edges.push({ from: q, to: t, symbol: EPS });
          }
          if (!closure.has(t)) {
            closure.add(t);
            stack.push(t);
          }
        }
      }
      return { states: closure, edges };
    }

    /** Runs the NFA, tracking ALL possible active states at every step. */
    run(input) {
      const chars = Array.from(input);
      const steps = [];
      const fmt = (ids) => '{' + ids.join(', ') + '}';

      const init = this.epsilonClosure([this.start]);
      let current = init.states;
      const initActive = this.order(current);

      steps.push({
        index: 0,
        consumed: 0,
        symbol: null,
        prevActive: [],
        active: initActive,
        edges: init.edges,
        moved: [this.start],
        dead: false,
        description: init.edges.length
          ? `Start in ${this.start}. Following ε-moves, the active states are ${fmt(initActive)}.`
          : `Start in the initial state ${this.start}.`,
      });

      let dead = false;
      let reason = '';

      for (let i = 0; i < chars.length; i++) {
        const sym = chars[i];
        const before = this.order(current);
        const moved = new Set();
        const edges = [];

        if (this.alphabet.includes(sym)) {
          for (const q of before) {
            for (const t of (this.delta[q] || {})[sym] || []) {
              moved.add(t);
              edges.push({ from: q, to: t, symbol: sym });
            }
          }
        }

        const closure = this.epsilonClosure(Array.from(moved));
        const active = this.order(closure.states);
        const usedEpsilon = closure.edges.length > 0;
        const isDead = active.length === 0;

        steps.push({
          index: i + 1,
          consumed: i + 1,
          symbol: sym,
          prevActive: before,
          active,
          edges: edges.concat(closure.edges),
          moved: this.order(moved),
          dead: isDead,
          description: isDead
            ? `Read '${sym}': none of ${fmt(before)} has a transition on '${sym}' — no active states are left.`
            : `Read '${sym}':  ${fmt(before)}  →  ${fmt(active)}` +
              (usedEpsilon ? '   (including ε-moves)' : ''),
        });

        current = closure.states;
        if (isDead) {
          dead = true;
          reason = `After reading '${sym}' no state is active any more, so every computation path has failed.`;
          break;
        }
      }

      let accepted = false;
      let finalStates = [];
      if (!dead) {
        finalStates = this.order(current).filter((q) => this.finals.has(q));
        accepted = finalStates.length > 0;
        reason = accepted
          ? `All symbols were read and the active states ${fmt(this.order(current))} include the final state ${finalStates.join(', ')}.`
          : `All symbols were read but none of the active states ${fmt(this.order(current))} is a final state.`;
      }

      return { type: 'NFA', input, steps, accepted, dead, finalStates, reason };
    }

    accepts(input) {
      return this.run(input).accepted;
    }
  }

  FA.NFA = NFA;
})();
