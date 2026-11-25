/* =====================================================================
 * presets.js  —  ready-made example automata
 * ---------------------------------------------------------------------
 * Format of one automaton definition:
 *   {
 *     id, type: 'DFA' | 'NFA', name, description,
 *     alphabet: ['0','1'],
 *     states:      [{ id:'q0', x:150, y:170 }, ...],   // x,y = position in the diagram
 *     start:       'q0',
 *     finals:      ['q2'],
 *     transitions: [{ from:'q0', to:'q1', symbols:['0'] }, ...],
 *     samples:     { accept:[...], reject:[...] }     // quick-try buttons
 *   }
 * Optional per-transition drawing hints:
 *   bend: number  – curve the arrow sideways (pixels, can be negative)
 *   loop: 'top' | 'bottom' – where a self-loop is drawn
 * 'ε' is the empty-string (epsilon) symbol and is only allowed in NFAs.
 * ===================================================================== */
(function () {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const FA = (root.FA = root.FA || {});

  const DFA_PRESETS = [
    {
      id: 'dfa-ends-01',
      type: 'DFA',
      name: 'Binary strings ending in 01',
      description: 'L = { w ∈ {0,1}* : w ends with 01 }',
      alphabet: ['0', '1'],
      states: [
        { id: 'q0', x: 150, y: 170 },
        { id: 'q1', x: 400, y: 170 },
        { id: 'q2', x: 650, y: 170 },
      ],
      start: 'q0',
      finals: ['q2'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['1'] },
        { from: 'q0', to: 'q1', symbols: ['0'] },
        { from: 'q1', to: 'q1', symbols: ['0'] },
        { from: 'q1', to: 'q2', symbols: ['1'] },
        { from: 'q2', to: 'q1', symbols: ['0'] },
        { from: 'q2', to: 'q0', symbols: ['1'], bend: -125 },
      ],
      samples: { accept: ['1101', '01', '0001', '10101'], reject: ['1100', '', '10', '011'] },
    },
    {
      id: 'dfa-even-ones',
      type: 'DFA',
      name: 'Even number of 1s',
      description: 'L = { w ∈ {0,1}* : the number of 1s in w is even }',
      alphabet: ['0', '1'],
      states: [
        { id: 'q0', x: 200, y: 170 },
        { id: 'q1', x: 500, y: 170 },
      ],
      start: 'q0',
      finals: ['q0'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['0'] },
        { from: 'q0', to: 'q1', symbols: ['1'] },
        { from: 'q1', to: 'q1', symbols: ['0'] },
        { from: 'q1', to: 'q0', symbols: ['1'] },
      ],
      samples: { accept: ['1001', '0', '11', '110011'], reject: ['1', '10', '111', '0100'] },
    },
    {
      id: 'dfa-contains-ab',
      type: 'DFA',
      name: 'Strings containing "ab"',
      description: 'L = { w ∈ {a,b}* : "ab" is a substring of w }',
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', x: 150, y: 170 },
        { id: 'q1', x: 400, y: 170 },
        { id: 'q2', x: 650, y: 170 },
      ],
      start: 'q0',
      finals: ['q2'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['b'] },
        { from: 'q0', to: 'q1', symbols: ['a'] },
        { from: 'q1', to: 'q1', symbols: ['a'] },
        { from: 'q1', to: 'q2', symbols: ['b'] },
        { from: 'q2', to: 'q2', symbols: ['a', 'b'] },
      ],
      samples: { accept: ['baabb', 'ab', 'bbab'], reject: ['ba', 'bbb', 'aaa', ''] },
    },
    {
      id: 'dfa-div-3',
      type: 'DFA',
      name: 'Binary numbers divisible by 3',
      description: 'L = { w ∈ {0,1}* : w, read as a binary number, is divisible by 3 }.  State qr = "remainder r so far".',
      alphabet: ['0', '1'],
      states: [
        { id: 'q0', x: 150, y: 170 },
        { id: 'q1', x: 400, y: 170 },
        { id: 'q2', x: 650, y: 170 },
      ],
      start: 'q0',
      finals: ['q0'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['0'] },
        { from: 'q0', to: 'q1', symbols: ['1'] },
        { from: 'q1', to: 'q0', symbols: ['1'] },
        { from: 'q1', to: 'q2', symbols: ['0'] },
        { from: 'q2', to: 'q1', symbols: ['0'] },
        { from: 'q2', to: 'q2', symbols: ['1'] },
      ],
      samples: { accept: ['110', '11', '1001', '0', ''], reject: ['1', '10', '101', '111'] },
    },
  ];

  const NFA_PRESETS = [
    {
      id: 'nfa-ends-01',
      type: 'NFA',
      name: 'Binary strings ending in 01',
      description: 'L = { w ∈ {0,1}* : w ends with 01 }.  q0 "guesses" when the final 01 begins.',
      alphabet: ['0', '1'],
      states: [
        { id: 'q0', x: 150, y: 170 },
        { id: 'q1', x: 400, y: 170 },
        { id: 'q2', x: 650, y: 170 },
      ],
      start: 'q0',
      finals: ['q2'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['0', '1'] },
        { from: 'q0', to: 'q1', symbols: ['0'] },
        { from: 'q1', to: 'q2', symbols: ['1'] },
      ],
      samples: { accept: ['1101', '01', '0001'], reject: ['1100', '', '10', '011'] },
    },
    {
      id: 'nfa-contains-101',
      type: 'NFA',
      name: 'Strings containing 101',
      description: 'L = { w ∈ {0,1}* : 101 is a substring of w }',
      alphabet: ['0', '1'],
      states: [
        { id: 'q0', x: 120, y: 170 },
        { id: 'q1', x: 330, y: 170 },
        { id: 'q2', x: 540, y: 170 },
        { id: 'q3', x: 750, y: 170 },
      ],
      start: 'q0',
      finals: ['q3'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['0', '1'] },
        { from: 'q0', to: 'q1', symbols: ['1'] },
        { from: 'q1', to: 'q2', symbols: ['0'] },
        { from: 'q2', to: 'q3', symbols: ['1'] },
        { from: 'q3', to: 'q3', symbols: ['0', '1'] },
      ],
      samples: { accept: ['0110110', '101', '11010'], reject: ['1100', '0110', '', '100'] },
    },
    {
      id: 'nfa-eps-012',
      type: 'NFA',
      name: 'ε-NFA: 0*1*2*',
      description: 'L = { 0^i 1^j 2^k : i, j, k ≥ 0 } — dashed arrows are ε-moves that consume no input.',
      alphabet: ['0', '1', '2'],
      states: [
        { id: 'q0', x: 140, y: 170 },
        { id: 'q1', x: 400, y: 170 },
        { id: 'q2', x: 660, y: 170 },
      ],
      start: 'q0',
      finals: ['q2'],
      transitions: [
        { from: 'q0', to: 'q0', symbols: ['0'] },
        { from: 'q0', to: 'q1', symbols: ['ε'] },
        { from: 'q1', to: 'q1', symbols: ['1'] },
        { from: 'q1', to: 'q2', symbols: ['ε'] },
        { from: 'q2', to: 'q2', symbols: ['2'] },
      ],
      samples: { accept: ['0112', '012', '22', ''], reject: ['210', '102', '0201'] },
    },
    {
      id: 'nfa-eps-union',
      type: 'NFA',
      name: 'ε-NFA: a* ∪ b*',
      description: 'L = { a^n } ∪ { b^n }.  From q0 the machine silently (ε) chooses either the "all a" branch or the "all b" branch.',
      alphabet: ['a', 'b'],
      states: [
        { id: 'q0', x: 140, y: 190 },
        { id: 'q1', x: 420, y: 90 },
        { id: 'q2', x: 420, y: 290 },
      ],
      start: 'q0',
      finals: ['q1', 'q2'],
      transitions: [
        { from: 'q0', to: 'q1', symbols: ['ε'] },
        { from: 'q0', to: 'q2', symbols: ['ε'] },
        { from: 'q1', to: 'q1', symbols: ['a'], loop: 'top' },
        { from: 'q2', to: 'q2', symbols: ['b'], loop: 'bottom' },
      ],
      samples: { accept: ['aaa', 'bbbb', ''], reject: ['ab', 'ba', 'aabb'] },
    },
  ];

  FA.PRESETS = { DFA: DFA_PRESETS, NFA: NFA_PRESETS };
})();
