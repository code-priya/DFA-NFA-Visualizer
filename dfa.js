/* =====================================================================
 * dfa.js  —  MEMBER 1 : DFA Logic Developer
 * ---------------------------------------------------------------------
 * A Deterministic Finite Automaton is a 5-tuple  M = (Q, Σ, δ, q0, F)
 *   Q  = finite set of states
 *   Σ  = input alphabet
 *   δ  = transition function  δ : Q × Σ → Q   (exactly ONE next state)
 *   q0 = start state
 *   F  = set of final (accepting) states
 *
 * This file contains ONLY logic (no HTML, no drawing), so it can be
 * tested in Node (see tests/test.js) and reused by the UI.
 *
 * run(input) returns a "trace" – a list of steps that the visualiser
 * and the player animate one by one:
 *   step = { index, consumed, symbol, prevActive, active, edges, dead,
 *            description }
 * ===================================================================== */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const FA = (root.FA = root.FA || {});
  const EPS = 'ε'; // epsilon (empty-string) symbol, shared with the NFA module
  FA.EPS = EPS;

  class DFA {
    /**
     * @param def automaton definition (see js/presets.js for the format)
     */
    constructor(def) {
      this.def = def;
      this.type = 'DFA';
      this.states = def.states.map((s) => s.id);
      this.alphabet = def.alphabet.slice();
      this.start = def.start;
      this.finals = new Set(def.finals);

      // delta[state][symbol] = [target, ...]   (a DFA must have <= 1 target)
      this.delta = {};
      this.states.forEach((s) => (this.delta[s] = {}));
      (def.transitions || []).forEach((t) => {
        if (!this.delta[t.from]) return;
        t.symbols.forEach((sym) => {
          (this.delta[t.from][sym] = this.delta[t.from][sym] || []).push(t.to);
        });
      });
    }

    /** Checks that the definition really is a DFA. */
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
          if (sym === EPS) errors.push('A DFA cannot have ε-transitions (switch to NFA).');
          else if (!this.alphabet.includes(sym))
            errors.push(`Symbol "${sym}" (on ${t.from}) is not in the alphabet.`);
        });
      });

      const missing = [];
      this.states.forEach((s) => {
        this.alphabet.forEach((a) => {
          const targets = this.delta[s][a] || [];
          if (targets.length > 1)
            errors.push(`Not deterministic: ${s} on "${a}" goes to {${targets.join(', ')}}. Use an NFA instead.`);
          if (targets.length === 0) missing.push(`${s} on "${a}"`);
        });
      });
      if (missing.length)
        warnings.push(`Missing transitions (treated as a rejecting dead state): ${missing.join('; ')}.`);

      return { errors: Array.from(new Set(errors)), warnings };
    }

    /** δ(state, symbol): the single next state, or null if undefined. */
    next(state, symbol) {
      const t = (this.delta[state] || {})[symbol];
      return t && t.length ? t[0] : null;
    }

    /** Processes the string one character at a time and records every step. */
    run(input) {
      const chars = Array.from(input);
      const steps = [];
      let current = this.start;

      steps.push({
        index: 0,
        consumed: 0,
        symbol: null,
        prevActive: [],
        active: [current],
        edges: [],
        dead: false,
        description: `Start in the initial state ${current}.`,
      });

      let dead = false;
      let reason = '';

      for (let i = 0; i < chars.length; i++) {
        const sym = chars[i];
        const target = this.alphabet.includes(sym) ? this.next(current, sym) : null;

        if (target === null) {
          steps.push({
            index: i + 1,
            consumed: i + 1,
            symbol: sym,
            prevActive: [current],
            active: [],
            edges: [],
            dead: true,
            description: `Read '${sym}': no transition from ${current} — the string is rejected.`,
          });
          dead = true;
          reason = `There is no transition from ${current} on '${sym}', so the automaton is stuck (dead state).`;
          break;
        }

        steps.push({
          index: i + 1,
          consumed: i + 1,
          symbol: sym,
          prevActive: [current],
          active: [target],
          edges: [{ from: current, to: target, symbol: sym }],
          dead: false,
          description: `Read '${sym}':  δ(${current}, ${sym}) = ${target}`,
        });
        current = target;
      }

      let accepted = false;
      if (!dead) {
        accepted = this.finals.has(current);
        reason = accepted
          ? `All symbols were read and ${current} is a final state.`
          : `All symbols were read but ${current} is not a final state.`;
      }

      return {
        type: 'DFA',
        input,
        steps,
        accepted,
        dead,
        finalStates: dead ? [] : [current],
        reason,
      };
    }

    accepts(input) {
      return this.run(input).accepted;
    }
  }

  FA.DFA = DFA;
})();
