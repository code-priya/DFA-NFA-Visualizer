/* =====================================================================
 * visualization.js  —  MEMBER 4 : Visualization & Animation (drawing)
 * ---------------------------------------------------------------------
 * Draws an automaton as an SVG diagram:
 *   - states as circles (double circle = final state)
 *   - arrows for transitions (curved when needed, loops for self-transitions)
 *   - an incoming arrow marks the start state
 *   - the current step is highlighted (active states, used arrows) and a
 *     small token glides along every arrow that is used.
 *   - states can be dragged with the mouse / finger to tidy up the layout.
 *
 * Public API (used by main.js):
 *   const viz = new FA.Visualizer(svgElement);
 *   viz.load(def);                       // draw a new automaton
 *   viz.showStep(step, { animate, duration, mode, finals });
 * ===================================================================== */
(function () {
  'use strict';

  const FA = (window.FA = window.FA || {});
  const NS = 'http://www.w3.org/2000/svg';
  const EPS = 'ε';
  const R = 28; // state radius

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const edgeKey = (a, b) => a + '\u0001' + b;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  function distToSegment(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  class Visualizer {
    constructor(svg) {
      this.svg = svg;
      this.def = null;
      this.pos = {};
      this.edges = [];
      this.edgeByKey = {};
      this.stateEls = {};
      this.edgeEls = {};
      this.view = { x: 0, y: 0, w: 800, h: 340 };
      this.current = null; // last {step, opts}, re-applied after a redraw
      this.anim = null;
      this.drag = null;
      this.bindDrag();
    }

    /* ----------------------------- loading ----------------------------- */
    load(def) {
      this.flush();
      this.def = def;
      this.pos = {};
      def.states.forEach((s) => (this.pos[s.id] = s)); // same objects => dragging updates def
      this.buildEdges();
      this.computeView();
      this.current = null;
      this.draw();
    }

    buildEdges() {
      const map = new Map();
      (this.def.transitions || []).forEach((t) => {
        if (!this.pos[t.from] || !this.pos[t.to]) return;
        const key = edgeKey(t.from, t.to);
        let e = map.get(key);
        if (!e) {
          e = { key, from: t.from, to: t.to, symbols: [], bend: undefined, loop: undefined };
          map.set(key, e);
        }
        t.symbols.forEach((s) => e.symbols.indexOf(s) < 0 && e.symbols.push(s));
        if (t.bend !== undefined) e.bend = t.bend;
        if (t.loop !== undefined) e.loop = t.loop;
      });
      this.edges = Array.from(map.values());
      this.edges.forEach((e) => e.symbols.sort((a, b) => (a === EPS) - (b === EPS) || (a > b ? 1 : -1)));
      this.edgeByKey = {};
      this.edges.forEach((e) => (this.edgeByKey[e.key] = e));
    }

    /* ----------------------------- geometry ---------------------------- */
    autoBend(e) {
      if (e.bend !== undefined) return e.bend;
      const A = this.pos[e.from];
      const B = this.pos[e.to];
      const hasReverse = !!this.edgeByKey[edgeKey(e.to, e.from)];
      for (const id in this.pos) {
        if (id === e.from || id === e.to) continue;
        if (distToSegment(this.pos[id], A, B) < R + 12) return hasReverse ? 95 : 75;
      }
      return hasReverse ? 34 : 0;
    }

    /** Path string + label position for one (merged) edge. */
    geometry(e) {
      const A = this.pos[e.from];
      const B = this.pos[e.to];

      if (e.from === e.to) {
        const dir = e.loop === 'bottom' ? 1 : -1;
        const sx = A.x + R * 0.5;
        const sy = A.y + dir * R * 0.866;
        const ex = A.x - R * 0.5;
        const c1 = { x: A.x + R * 1.3, y: A.y + dir * R * 2.7 };
        const c2 = { x: A.x - R * 1.3, y: A.y + dir * R * 2.7 };
        const peak = A.y + dir * R * 2.24;
        return {
          d: `M${sx},${sy} C${c1.x},${c1.y} ${c2.x},${c2.y} ${ex},${sy}`,
          lx: A.x,
          ly: peak + dir * 13,
          px: A.x,
          py: peak,
        };
      }

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const bend = this.autoBend(e);
      const cx = (A.x + B.x) / 2 + nx * bend * 2;
      const cy = (A.y + B.y) / 2 + ny * bend * 2;

      const ua = this.unit(cx - A.x, cy - A.y);
      const ub = this.unit(cx - B.x, cy - B.y);
      const S = { x: A.x + ua.x * R, y: A.y + ua.y * R };
      const E = { x: B.x + ub.x * (R + 2), y: B.y + ub.y * (R + 2) };
      const mid = { x: 0.25 * S.x + 0.5 * cx + 0.25 * E.x, y: 0.25 * S.y + 0.5 * cy + 0.25 * E.y };
      const side = bend < 0 ? -1 : 1;
      return {
        d: `M${S.x},${S.y} Q${cx},${cy} ${E.x},${E.y}`,
        lx: mid.x + nx * side * 15,
        ly: mid.y + ny * side * 15,
        px: mid.x,
        py: mid.y,
      };
    }

    unit(x, y) {
      const l = Math.hypot(x, y) || 1;
      return { x: x / l, y: y / l };
    }

    computeView() {
      const pts = [];
      for (const id in this.pos) {
        const p = this.pos[id];
        const left = id === this.def.start ? R + 70 : R + 10;
        pts.push([p.x - left, p.y - R - 10], [p.x + R + 10, p.y + R + 10]);
      }
      this.edges.forEach((e) => {
        const g = this.geometry(e);
        pts.push([g.lx - 22, g.ly - 14], [g.lx + 22, g.ly + 14], [g.px, g.py]);
      });
      let minX = Math.min(...pts.map((p) => p[0]));
      let maxX = Math.max(...pts.map((p) => p[0]));
      let minY = Math.min(...pts.map((p) => p[1]));
      let maxY = Math.max(...pts.map((p) => p[1]));
      minX -= 20; maxX += 20; minY -= 20; maxY += 20;
      let w = maxX - minX;
      let h = maxY - minY;
      const minW = 620;
      const minH = 300;
      if (w < minW) { minX -= (minW - w) / 2; w = minW; }
      if (h < minH) { minY -= (minH - h) / 2; h = minH; }
      this.view = { x: minX, y: minY, w, h };
    }

    /* ------------------------------ drawing ---------------------------- */
    draw() {
      const svg = this.svg;
      const v = this.view;
      svg.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // arrow-head markers (normal + highlighted)
      const defs = el('defs', null, svg);
      [['arrow', 'arrow-head'], ['arrow-on', 'arrow-head-on']].forEach(([id, cls]) => {
        const m = el('marker', {
          id, viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 11, markerHeight: 11,
          markerUnits: 'userSpaceOnUse', orient: 'auto',
        }, defs);
        el('path', { d: 'M0,0 L10,5 L0,10 z', class: cls }, m);
      });

      const gEdges = el('g', { class: 'edges' }, svg);
      const gStart = el('g', { class: 'start-mark' }, svg);
      const gStates = el('g', { class: 'states' }, svg);
      this.gTokens = el('g', { class: 'tokens' }, svg);

      // edges
      this.edgeEls = {};
      this.edges.forEach((e) => {
        const g = this.geometry(e);
        const onlyEps = e.symbols.every((s) => s === EPS);
        const grp = el('g', { class: 'edge' + (onlyEps ? ' eps' : '') }, gEdges);
        const path = el('path', { d: g.d, class: 'edge-path', 'marker-end': 'url(#arrow)' }, grp);
        const label = el('text', { x: g.lx, y: g.ly, dy: '.35em', class: 'edge-label' }, grp);
        label.textContent = e.symbols.join(',');
        this.edgeEls[e.key] = { grp, path, label };
      });

      // start arrow
      const sp = this.pos[this.def.start];
      if (sp) {
        el('path', {
          d: `M${sp.x - R - 58},${sp.y} L${sp.x - R - 2},${sp.y}`,
          class: 'edge-path start-arrow',
          'marker-end': 'url(#arrow)',
        }, gStart);
      }

      // states
      this.stateEls = {};
      const finals = new Set(this.def.finals);
      this.def.states.forEach((s) => {
        const g = el('g', { class: 'state', transform: `translate(${s.x},${s.y})`, 'data-id': s.id }, gStates);
        el('circle', { r: R, class: 'outer' }, g);
        if (finals.has(s.id)) el('circle', { r: R - 5.5, class: 'inner' }, g);
        const t = el('text', { dy: '.35em', class: s.id.length > 3 ? 'small' : '' }, g);
        t.textContent = s.id;
        this.stateEls[s.id] = g;
      });
    }

    redraw() {
      this.flush();
      this.draw();
      if (this.current) this.showStep(this.current.step, Object.assign({}, this.current.opts, { animate: false }));
    }

    /* ----------------------------- highlighting ------------------------ */
    /**
     * @param step   one step of a trace (see dfa.js / nfa.js)
     * @param opts   { animate, duration, mode: 'normal'|'accept'|'reject', finals: [ids] }
     */
    showStep(step, opts) {
      opts = opts || {};
      this.flush();
      this.current = { step, opts };

      const keys = [];
      step.edges.forEach((e) => {
        const k = edgeKey(e.from, e.to);
        if (keys.indexOf(k) < 0 && this.edgeEls[k]) keys.push(k);
      });

      this.setEdges(keys);
      const apply = () => this.setStates(step, opts);

      if (opts.animate && keys.length) {
        this.sendTokens(keys, opts.duration || 600, apply);
      } else {
        apply();
      }
    }

    setEdges(keys) {
      const on = new Set(keys);
      for (const k in this.edgeEls) {
        const { grp, path } = this.edgeEls[k];
        const active = on.has(k);
        grp.classList.toggle('on', active);
        path.setAttribute('marker-end', active ? 'url(#arrow-on)' : 'url(#arrow)');
      }
    }

    setStates(step, opts) {
      const mode = opts.mode || 'normal';
      const ids = new Set(step.active.length ? step.active : step.prevActive || []);
      const finals = new Set(opts.finals || []);
      for (const id in this.stateEls) {
        const g = this.stateEls[id];
        const here = ids.has(id);
        const accept = mode === 'accept' && here && finals.has(id);
        const reject = mode === 'reject' && here;
        g.classList.toggle('accept', accept);
        g.classList.toggle('reject', reject);
        g.classList.toggle('active', here && !accept && !reject);
      }
    }

    /* ------------------------------ tokens ----------------------------- */
    sendTokens(keys, duration, done) {
      const tokens = keys.map((k) => {
        const path = this.edgeEls[k].path;
        const c = el('circle', { r: 8, class: 'token' }, this.gTokens);
        return { c, path, len: path.getTotalLength() };
      });
      const t0 = performance.now();
      const anim = { raf: 0, tokens, done };
      this.anim = anim;

      const frame = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const k = easeInOut(t);
        tokens.forEach((o) => {
          const p = o.path.getPointAtLength(o.len * k);
          o.c.setAttribute('cx', p.x);
          o.c.setAttribute('cy', p.y);
        });
        if (t < 1) {
          anim.raf = requestAnimationFrame(frame);
        } else {
          this.flush();
        }
      };
      anim.raf = requestAnimationFrame(frame);
    }

    /** Finishes a running token animation immediately (and applies its result). */
    flush() {
      if (!this.anim) return;
      const a = this.anim;
      this.anim = null;
      cancelAnimationFrame(a.raf);
      a.tokens.forEach((o) => o.c.parentNode && o.c.parentNode.removeChild(o.c));
      a.done();
    }

    /* ------------------------------ dragging --------------------------- */
    toSvg(ev) {
      const pt = this.svg.createSVGPoint();
      pt.x = ev.clientX;
      pt.y = ev.clientY;
      const q = pt.matrixTransform(this.svg.getScreenCTM().inverse());
      return { x: q.x, y: q.y };
    }

    bindDrag() {
      const svg = this.svg;
      svg.addEventListener('pointerdown', (ev) => {
        const g = ev.target.closest && ev.target.closest('.state');
        if (!g || !this.def) return;
        this.drag = { id: g.getAttribute('data-id') };
        svg.setPointerCapture(ev.pointerId);
        svg.classList.add('dragging');
        ev.preventDefault();
      });
      svg.addEventListener('pointermove', (ev) => {
        if (!this.drag) return;
        const p = this.toSvg(ev);
        const v = this.view;
        const s = this.pos[this.drag.id];
        s.x = Math.round(Math.max(v.x + R + 8, Math.min(v.x + v.w - R - 8, p.x)));
        s.y = Math.round(Math.max(v.y + R + 8, Math.min(v.y + v.h - R - 8, p.y)));
        this.redraw();
      });
      const end = (ev) => {
        if (!this.drag) return;
        this.drag = null;
        svg.classList.remove('dragging');
        try { svg.releasePointerCapture(ev.pointerId); } catch (err) { /* already released */ }
      };
      svg.addEventListener('pointerup', end);
      svg.addEventListener('pointercancel', end);
    }
  }

  FA.Visualizer = Visualizer;
})();
