/* =====================================================================
 * main.js  —  MEMBER 5 : Integration  (+ glue code with Member 3's UI)
 * ---------------------------------------------------------------------
 * Connects the modules:
 *
 *   presets.js / parser.js  ->  automaton definition
 *   dfa.js / nfa.js         ->  engine.run(input)  ->  trace (list of steps)
 *   animation.js (Player)   ->  walks through the trace, one step at a time
 *   visualization.js        ->  draws the diagram and highlights the step
 *   main.js (this file)     ->  updates tape, table, log, result and buttons
 * ===================================================================== */
(function () {
  'use strict';

  const FA = window.FA;
  const EPS = FA.EPS;
  const $ = (id) => document.getElementById(id);

  const SPEEDS = [
    { label: 'Slow', ms: 2200 },
    { label: 'Relaxed', ms: 1600 },
    { label: 'Normal', ms: 1100 },
    { label: 'Fast', ms: 650 },
    { label: 'Very fast', ms: 320 },
  ];

  const els = {
    segs: Array.from(document.querySelectorAll('.seg')),
    preset: $('preset'),
    description: $('description'),
    title: $('automatonTitle'),
    formal: $('formal'),
    input: $('inputString'),
    inputMsg: $('inputMsg'),
    samples: $('samples'),
    tape: $('tape'),
    stepText: $('stepText'),
    result: $('result'),
    table: $('tableWrap'),
    log: $('log'),
    play: $('btnPlay'),
    prev: $('btnPrev'),
    next: $('btnNext'),
    reset: $('btnReset'),
    speed: $('speed'),
    speedLabel: $('speedLabel'),
    customBox: $('customBox'),
    customText: $('customText'),
    customMsg: $('customMsg'),
    loadCustom: $('btnLoadCustom'),
    undoCustom: $('btnResetCustom'),
  };

  const app = {
    type: 'DFA',
    def: null,
    engine: null,
    trace: null,
    input: '',
    invalid: false,
    tapeCells: [],
    logRows: [],
    cells: {},
    rows: {},
    highlighted: [],
  };

  const viz = new FA.Visualizer($('diagram'));
  const player = new FA.Player({ onStep: handleStep, onPlayState: updateButtons });

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const describeSym = (c) => (c === ' ' ? 'space' : "'" + c + "'");
  const build = (def) => (def.type === 'DFA' ? new FA.DFA(def) : new FA.NFA(def));

  function showMsg(node, text, kind) {
    node.textContent = text || '';
    node.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function make(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ======================= choosing an automaton ======================= */
  function setType(type, keepAutomaton) {
    app.type = type;
    els.segs.forEach((b) => {
      const on = b.dataset.type === type;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    fillPresetList(type);
    if (!keepAutomaton) loadPreset(FA.PRESETS[type][0].id);
  }

  function fillPresetList(type) {
    els.preset.innerHTML = '';
    FA.PRESETS[type].forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      els.preset.appendChild(o);
    });
  }

  function selectCustomOption() {
    let o = els.preset.querySelector('option[value="custom"]');
    if (!o) {
      o = document.createElement('option');
      o.value = 'custom';
      o.textContent = 'Custom (your automaton)';
      els.preset.appendChild(o);
    }
    els.preset.value = 'custom';
  }

  function loadPreset(id) {
    const preset = FA.PRESETS[app.type].find((p) => p.id === id);
    if (!preset) return;
    const def = clone(preset); // clone: dragging states must not change the original
    els.preset.value = id;
    els.customText.value = FA.toText(def);
    showMsg(els.customMsg, '');
    loadAutomaton(def);
  }

  function loadAutomaton(def) {
    app.def = def;
    app.engine = build(def);

    els.title.textContent = `${def.type} · ${def.name}`;
    els.description.textContent = def.description;
    viz.load(def);
    renderFormal();
    renderTable();
    renderSamples();

    const all = def.samples.accept.concat(def.samples.reject).filter((w) => w !== '');
    els.input.value = all.length ? (def.samples.accept.find((w) => w !== '') || all[0]) : '';
    els.input.placeholder = `a string over {${def.alphabet.join(', ')}}`;
    prepare();
  }

  /* --------------------------- custom editor -------------------------- */
  function loadCustom() {
    try {
      const def = FA.parseAutomaton(els.customText.value, app.type);
      const engine = build(def);
      const check = engine.validate();
      if (check.errors.length) throw new Error(check.errors.join('\n'));

      def.samples = FA.suggestSamples(engine, def.alphabet);
      if (def.type !== app.type) setType(def.type, true);
      selectCustomOption();
      loadAutomaton(def);
      if (check.warnings.length) showMsg(els.customMsg, 'Loaded. ' + check.warnings.join(' '), 'warn');
      else showMsg(els.customMsg, 'Automaton loaded.', 'ok');
    } catch (err) {
      showMsg(els.customMsg, err.message, 'error');
    }
  }

  /* ========================= static rendering ========================== */
  function renderFormal() {
    const d = app.def;
    const eps = d.transitions.some((t) => t.symbols.includes(EPS)) ? ' ∪ {ε}' : '';
    els.formal.textContent =
      `Q = {${d.states.map((s) => s.id).join(', ')}}   Σ = {${d.alphabet.join(', ')}}${eps}   ` +
      `q₀ = ${d.start}   F = {${d.finals.join(', ')}}`;
  }

  function renderTable() {
    const d = app.def;
    const eng = app.engine;
    const syms = d.alphabet.slice();
    if (d.transitions.some((t) => t.symbols.includes(EPS))) syms.push(EPS);

    const table = make('table', 'delta');
    const head = make('tr');
    head.appendChild(make('th', '', 'δ'));
    syms.forEach((s) => head.appendChild(make('th', '', s)));
    table.appendChild(make('thead')).appendChild(head);

    const body = make('tbody');
    app.cells = {};
    app.rows = {};
    d.states.forEach((s) => {
      const tr = make('tr');
      const th = make('th');
      if (s.id === d.start) th.appendChild(make('span', 'mark', '→ '));
      if (d.finals.includes(s.id)) th.appendChild(make('span', 'mark', '* '));
      th.appendChild(document.createTextNode(s.id));
      tr.appendChild(th);
      app.rows[s.id] = th;

      syms.forEach((sym) => {
        const targets = (eng.delta[s.id] || {})[sym] || [];
        let text;
        if (!targets.length) text = app.type === 'DFA' ? '—' : '∅';
        else text = app.type === 'DFA' ? targets[0] : '{' + targets.join(', ') + '}';
        const td = make('td', targets.length ? '' : 'none', text);
        tr.appendChild(td);
        app.cells[s.id + '\u0001' + sym] = td;
      });
      body.appendChild(tr);
    });
    table.appendChild(body);

    els.table.innerHTML = '';
    els.table.appendChild(table);
    const note = make('p', 'hint', '→ start state   * final state' + (app.type === 'NFA' ? '   ∅ no transition' : '   — missing transition'));
    els.table.appendChild(note);
  }

  function renderSamples() {
    els.samples.innerHTML = '';
    const add = (w, ok) => {
      const b = make('button', 'chip ' + (ok ? 'ok' : 'bad'), w === '' ? 'ε' : w);
      b.type = 'button';
      b.title = (w === '' ? 'empty string' : '"' + w + '"') + (ok ? ' — accepted' : ' — rejected');
      b.addEventListener('click', () => {
        els.input.value = w;
        prepare();
        player.play();
      });
      els.samples.appendChild(b);
    };
    app.def.samples.accept.forEach((w) => add(w, true));
    app.def.samples.reject.forEach((w) => add(w, false));
  }

  function renderTape() {
    els.tape.innerHTML = '';
    app.tapeCells = [];
    if (app.input === '') {
      els.tape.appendChild(make('div', 'empty', 'ε — the empty string (nothing to read)'));
      return;
    }
    const alphabet = app.def.alphabet;
    Array.from(app.input).forEach((c, i) => {
      const cell = make('div', 'cell' + (alphabet.includes(c) ? '' : ' invalid'));
      cell.appendChild(make('div', 'sym', c === ' ' ? '␣' : c));
      cell.appendChild(make('div', 'idx', String(i + 1)));
      els.tape.appendChild(cell);
      app.tapeCells.push(cell);
    });
  }

  function renderLog() {
    const t = app.trace;
    const table = make('table', 'steps');
    const hr = make('tr');
    ['#', 'Read', 'What happens'].forEach((h) => hr.appendChild(make('th', '', h)));
    table.appendChild(make('thead')).appendChild(hr);
    const body = make('tbody');
    app.logRows = t.steps.map((s) => {
      const tr = make('tr', 'future');
      tr.appendChild(make('td', 'n', String(s.index)));
      tr.appendChild(make('td', '', s.symbol === null ? '—' : s.symbol));
      tr.appendChild(make('td', '', s.description));
      body.appendChild(tr);
      return tr;
    });
    table.appendChild(body);
    els.log.innerHTML = '';
    els.log.appendChild(table);
  }

  /* ========================== running a string ========================= */
  function prepare() {
    const input = els.input.value;
    const alphabet = app.def.alphabet;
    const chars = Array.from(input);
    const bad = chars.findIndex((c) => !alphabet.includes(c));

    app.input = input;
    app.invalid = bad >= 0;
    els.input.classList.toggle('invalid', app.invalid);
    if (app.invalid)
      showMsg(els.inputMsg, `Symbol ${describeSym(chars[bad])} is not in the alphabet {${alphabet.join(', ')}}.`, 'error');
    else showMsg(els.inputMsg, '');

    app.trace = app.engine.run(app.invalid ? '' : input);
    renderTape();
    renderLog();
    player.load(app.trace); // shows the start state (step 0)
  }

  /* ===================== reacting to every new step ==================== */
  function handleStep(step, pos, animate, atEnd) {
    const trace = app.trace;
    const finished = atEnd && !app.invalid;
    const mode = finished ? (trace.accepted ? 'accept' : 'reject') : 'normal';

    viz.showStep(step, {
      animate: animate && !reduceMotion(),
      duration: Math.max(250, Math.min(750, player.delay * 0.6)),
      mode,
      finals: app.def.finals,
    });

    // input tape
    app.tapeCells.forEach((cell, i) => {
      cell.classList.toggle('done', !app.invalid && i < pos - 1);
      cell.classList.toggle('reading', !app.invalid && i === pos - 1 && !step.dead);
      cell.classList.toggle('bad', !app.invalid && i === pos - 1 && step.dead);
    });

    // transition table highlight
    app.highlighted.forEach((n) => n.classList.remove('hl', 'cur'));
    app.highlighted = [];
    step.edges.forEach((e) => {
      const td = app.cells[e.from + '\u0001' + e.symbol];
      if (td) { td.classList.add('hl'); app.highlighted.push(td); }
    });
    (step.active.length ? step.active : step.prevActive || []).forEach((id) => {
      const th = app.rows[id];
      if (th) { th.classList.add('cur'); app.highlighted.push(th); }
    });

    // execution log
    app.logRows.forEach((tr, i) => {
      tr.classList.toggle('future', i > pos);
      tr.classList.toggle('current', i === pos);
    });
    const row = app.logRows[pos];
    if (row) {
      const box = els.log;
      const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      if (top < box.scrollTop + 32) box.scrollTop = Math.max(0, top - 32);
      else if (top + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + row.offsetHeight - box.clientHeight + 6;
    }

    // step description
    if (app.invalid) els.stepText.textContent = 'Fix the input string to continue.';
    else if (pos === 0 && !finished) els.stepText.textContent = step.description + '  Press Start or Next to read the first symbol.';
    else els.stepText.textContent = step.description;

    renderResult(finished);
    updateButtons();
  }

  function renderResult(finished) {
    const box = els.result;
    if (!finished) {
      box.className = 'result hidden';
      box.innerHTML = '';
      return;
    }
    const ok = app.trace.accepted;
    box.className = 'result ' + (ok ? 'accepted' : 'rejected');
    box.innerHTML = '';

    const badge = make('div', 'badge');
    badge.innerHTML = ok
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    const text = make('div');
    text.appendChild(make('div', 'verdict', ok ? 'ACCEPTED' : 'REJECTED'));
    const shown = app.input === '' ? 'ε (the empty string)' : '“' + app.input + '”';
    text.appendChild(make('div', 'why', shown + ' — ' + app.trace.reason));
    box.appendChild(badge);
    box.appendChild(text);
  }

  function updateButtons() {
    const hasSteps = player.trace && player.last > 0;
    els.prev.disabled = app.invalid || player.pos === 0;
    els.next.disabled = app.invalid || player.atEnd;
    els.play.disabled = app.invalid || !hasSteps;
    els.reset.disabled = player.pos === 0 && !player.playing;
    els.play.textContent = player.playing ? 'Pause' : player.pos === 0 ? 'Start' : player.atEnd ? 'Replay' : 'Resume';
  }

  /* ============================== wiring =============================== */
  function wire() {
    els.segs.forEach((b) => b.addEventListener('click', () => b.dataset.type !== app.type && setType(b.dataset.type)));
    els.preset.addEventListener('change', () => (els.preset.value === 'custom' ? loadCustom() : loadPreset(els.preset.value)));

    els.input.addEventListener('input', prepare);
    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        player.toggle();
      }
    });

    els.play.addEventListener('click', () => player.toggle());
    els.next.addEventListener('click', () => player.step());
    els.prev.addEventListener('click', () => player.prev());
    els.reset.addEventListener('click', () => player.reset());

    els.speed.addEventListener('input', () => {
      const s = SPEEDS[Number(els.speed.value) - 1];
      player.delay = s.ms;
      els.speedLabel.textContent = s.label;
    });
    els.speed.dispatchEvent(new Event('input'));

    els.loadCustom.addEventListener('click', loadCustom);
    els.undoCustom.addEventListener('click', () => {
      els.customText.value = FA.toText(app.def);
      showMsg(els.customMsg, '');
    });

    document.addEventListener('keydown', (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === ' ') {
        if (tag === 'BUTTON' || tag === 'SUMMARY') return;
        e.preventDefault();
        player.toggle();
      } else if (e.key === 'ArrowRight') player.step();
      else if (e.key === 'ArrowLeft') player.prev();
      else if (e.key === 'r' || e.key === 'R') player.reset();
    });
  }

  wire();
  setType('DFA');
})();
