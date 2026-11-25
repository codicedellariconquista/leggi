/* Virada de página própria, leve (sem biblioteca). Uma página por vez (retrato), só `transform`/`opacity`
   (compositor). Só as páginas vizinhas ficam no DOM. Eventos de ponteiro únicos (toque, mouse e caneta).
   API compatível com o que o leitor e os testes usam: getCurrentPageIndex, getPageCount, getState,
   flip, flipNext, flipPrev, turnToPage, on('flip'), destroy. */
(function () {
  'use strict';
  var RATIO = 690 / 400;           // altura / largura da página (a mesma da paginação medida)
  var MAX_W = 560;
  var EASE_TAP = 'cubic-bezier(.42,.02,.2,1)';
  var EASE_OUT = 'cubic-bezier(.18,.72,.22,1)';
  var EASE_BACK = 'cubic-bezier(.3,.6,.3,1)';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Turner(host, pageEls, opts) {
    opts = opts || {};
    this.host = host;
    this.n = pageEls.length;
    this.idx = clamp(opts.startPage || 0, 0, this.n - 1);
    this.handlers = {};
    this.trans = null;     // transição em curso
    this.down = null;      // gesto em curso
    this.raf = 0;
    this.leaves = new Array(this.n);
    this.mounted = {};
    this.state = 'read';
    var self = this;

    this.frame = document.createElement('div');
    this.frame.className = 'tn';
    host.appendChild(this.frame);

    for (var i = 0; i < this.n; i++) {
      var leaf = document.createElement('div');
      leaf.className = 'leaf';
      var pg = pageEls[i];
      if (pg.parentNode) pg.parentNode.removeChild(pg);
      leaf.appendChild(pg);
      leaf.insertAdjacentHTML('beforeend', '<i class="lf-gutter"></i><i class="lf-cast"></i><i class="lf-shade"></i>');
      leaf._shade = leaf.querySelector('.lf-shade');
      leaf._cast = leaf.querySelector('.lf-cast');
      leaf._i = i;
      this.leaves[i] = leaf;
    }
    this._layout = function () { self.layout(); };
    if (window.ResizeObserver) { this.ro = new ResizeObserver(this._layout); this.ro.observe(host); }
    else window.addEventListener('resize', this._layout);
    this.layout();
    this.mountWindow();

    this._down = function (e) { self.onDown(e); };
    this._move = function (e) { self.onMove(e); };
    this._up = function (e) { self.onUp(e); };
    this._click = function (e) { if (self.suppressClick) { e.preventDefault(); e.stopPropagation(); self.suppressClick = false; } };
    host.addEventListener('pointerdown', this._down);
    host.addEventListener('click', this._click, true);
    window.addEventListener('pointermove', this._move, { passive: true });
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  var P = Turner.prototype;

  P.layout = function () {
    var cw = this.host.clientWidth, ch = this.host.clientHeight;
    if (!cw || !ch) return;
    var w = Math.min(cw, ch / RATIO, MAX_W);
    var h = w * RATIO;
    this.w = w; this.h = h;
    var s = this.frame.style;
    s.width = Math.round(w) + 'px'; s.height = Math.round(h) + 'px';
    s.left = Math.round((cw - w) / 2) + 'px'; s.top = Math.round((ch - h) / 2) + 'px';
  };

  /* --- janela de páginas no DOM: anterior, atual, 2 seguintes --- */
  P.mountWindow = function () {
    var lo = this.idx - 1, hi = this.idx + 2, i, k;
    for (k in this.mounted) {
      i = +k;
      if (i < lo || i > hi) { var l = this.leaves[i]; if (l.parentNode) l.parentNode.removeChild(l); delete this.mounted[k]; }
    }
    for (i = Math.max(0, lo); i <= Math.min(this.n - 1, hi); i++) {
      var leaf = this.leaves[i];
      if (!this.mounted[i]) { this.frame.appendChild(leaf); this.mounted[i] = true; }
      this.rest(leaf, i);
    }
  };
  /* estado de repouso de uma folha conforme a posição em relação à página atual */
  P.rest = function (leaf, i) {
    var turned = i < this.idx;
    leaf.style.zIndex = turned ? (1100 + i) : (1000 - i);
    leaf.style.transform = turned ? 'rotateY(-90deg)' : 'none';
    leaf.style.visibility = turned ? 'hidden' : 'visible';
    leaf.style.opacity = '';
    leaf._shade.style.opacity = turned ? '1' : '0';
    leaf._cast.style.opacity = '0';
    leaf.classList.remove('is-moving');
  };

  P.on = function (name, cb) { (this.handlers[name] = this.handlers[name] || []).push(cb); };
  P.emit = function (name, data) { (this.handlers[name] || []).forEach(function (f) { try { f({ data: data }); } catch (e) {} }); };
  P.getCurrentPageIndex = function () { return this.idx; };
  P.getPageCount = function () { return this.n; };
  P.getState = function () { return (this.trans || (this.down && this.down.mode === 'drag')) ? 'flipping' : 'read'; };

  /* --- progresso p: 0 = folha plana, 1 = folha virada (a 90°, de lado) --- */
  P.apply = function (leaf, under, p) {
    leaf.style.transform = 'rotateY(' + (-p * 90).toFixed(2) + 'deg)';
    leaf._shade.style.opacity = p.toFixed(3);
    if (under) under._cast.style.opacity = ((1 - p) * 0.34).toFixed(3);
  };
  P.prepare = function (leaf, under) {
    leaf.style.visibility = 'visible';
    leaf.classList.add('is-moving');
    if (under) { under.style.visibility = 'visible'; }
  };
  P.pair = function (dir) {
    // dir 'next': gira a folha atual, por baixo está a seguinte. dir 'prev': volta a anterior, por baixo está a atual.
    if (dir === 'next') return this.idx < this.n - 1 ? { leaf: this.leaves[this.idx], under: this.leaves[this.idx + 1], p0: 0 } : null;
    return this.idx > 0 ? { leaf: this.leaves[this.idx - 1], under: this.leaves[this.idx], p0: 1 } : null;
  };

  P.finishNow = function () { if (this.trans) this.endTrans(this.trans); };

  P.endTrans = function (t) {
    if (t.done) return;
    t.done = true;
    t.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    this.trans = null;
    var moved = false;
    if (t.dir === 'next' && t.p1 === 1) { this.idx++; moved = true; }
    else if (t.dir === 'prev' && t.p1 === 0) { this.idx--; moved = true; }
    this.mountWindow();
    this.state = 'read';
    if (moved) this.emit('flip', this.idx);
  };

  P.animate = function (dir, p0, p1, dur, ease) {
    var pr = this.pair(dir);
    if (!pr) return false;
    var self = this, leaf = pr.leaf, under = pr.under;
    this.prepare(leaf, under);
    this.apply(leaf, under, p0);
    var t = { dir: dir, p1: p1, done: false, anims: [] };
    this.trans = t;
    this.state = 'flipping';
    if (reduce || !leaf.animate) { this.apply(leaf, under, p1); this.endTrans(t); return true; }
    var opt = { duration: dur, easing: ease, fill: 'forwards' };
    function kf(p) { return { transform: 'rotateY(' + (-p * 90) + 'deg)' }; }
    t.anims.push(leaf.animate([kf(p0), kf(p1)], opt));
    t.anims.push(leaf._shade.animate([{ opacity: p0 }, { opacity: p1 }], opt));
    t.anims.push(under._cast.animate([{ opacity: (1 - p0) * 0.34 }, { opacity: (1 - p1) * 0.34 }], opt));
    t.anims[0].finished.then(function () { self.apply(leaf, under, p1); self.endTrans(t); }, function () {});
    return true;
  };

  P.flipNext = function () { this.finishNow(); return this.animate('next', 0, 1, 440, EASE_TAP); };
  P.flipPrev = function () { this.finishNow(); return this.animate('prev', 1, 0, 440, EASE_TAP); };
  P.flip = function (n) {
    n = clamp(n, 0, this.n - 1);
    this.finishNow();
    if (n === this.idx) return;
    if (n === this.idx + 1) return this.flipNext();
    if (n === this.idx - 1) return this.flipPrev();
    this.jump(n, true);
  };
  P.turnToPage = function (n) { this.finishNow(); this.jump(clamp(n, 0, this.n - 1), false); };
  P.jump = function (n, fade) {
    if (n === this.idx) return;
    this.idx = n;
    this.mountWindow();
    var leaf = this.leaves[n];
    if (fade && leaf.animate && !reduce) leaf.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    this.emit('flip', this.idx);
  };

  /* --- gestos --- */
  P.onDown = function (e) {
    if (e.button > 0 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (this.down) return;
    this.finishNow();
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    this.down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), a: a, mode: null, s: [{ x: e.clientX, t: performance.now() }] };
    this.suppressClick = false;
  };

  P.onMove = function (e) {
    var d = this.down;
    if (!d || e.pointerId !== d.id) return;
    var dx = e.clientX - d.x, dy = e.clientY - d.y, now = performance.now();
    if (d.mode === null) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { d.mode = 'none'; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
      d.dir = dx < 0 ? 'next' : 'prev';
      d.pr = this.pair(d.dir);
      if (!d.pr) { d.mode = d.dir === 'next' ? 'end' : 'none'; d.x0 = e.clientX; return; }
      d.mode = 'drag'; d.x0 = e.clientX; d.p = d.pr.p0;
      this.prepare(d.pr.leaf, d.pr.under);
      this.state = 'flipping';
    }
    d.s.push({ x: e.clientX, t: now });
    if (d.s.length > 8) d.s.shift();
    d.last = e.clientX;
    var span = Math.max(180, this.w * 0.78);
    if (d.mode === 'drag') {
      var delta = e.clientX - d.x0;
      d.p = d.dir === 'next' ? clamp(-delta / span, 0, 1) : clamp(1 - delta / span, 0, 1);
      this.schedule();
    } else if (d.mode === 'end') {
      /* última página: resistência curta, sem virar */
      var lf = this.leaves[this.idx], r = clamp(-(e.clientX - d.x0) / span, 0, 1) * 0.12;
      lf.classList.add('is-moving'); lf.style.transform = 'rotateY(' + (-r * 90).toFixed(2) + 'deg)';
    }
  };

  P.schedule = function () {
    if (this.raf) return;
    var self = this;
    this.raf = requestAnimationFrame(function () {
      self.raf = 0;
      var d = self.down;
      if (d && d.mode === 'drag') self.apply(d.pr.leaf, d.pr.under, d.p);
    });
  };

  P.onUp = function (e) {
    var d = this.down;
    if (!d || (e && e.pointerId !== d.id)) return;
    this.down = null;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    var cancelled = e && e.type === 'pointercancel';
    if (d.mode === 'drag') {
      this.suppressClick = true;
      var s = d.s, last = s[s.length - 1], ref = s[0];
      for (var i = s.length - 1; i >= 0; i--) { if (last.t - s[i].t >= 70) { ref = s[i]; break; } }
      var v = last.t > ref.t ? (last.x - ref.x) / (last.t - ref.t) : 0;   // px/ms (negativo = para a esquerda)
      var fwd = d.dir === 'next';
      var progress = fwd ? d.p : 1 - d.p;                       // quanto da viragem já foi feito
      var flingFor = fwd ? v < -0.32 : v > 0.32;
      var flingAgainst = fwd ? v > 0.32 : v < -0.32;
      var complete = !cancelled && (flingFor || (!flingAgainst && progress >= 0.42));
      var p1 = fwd ? (complete ? 1 : 0) : (complete ? 0 : 1);
      var dist = Math.abs(p1 - d.p);
      var dur = Math.round(clamp((140 + 380 * dist) * (flingFor ? 0.78 : 1), 120, 460));
      this.animate(d.dir, d.p, p1, dur, complete ? EASE_OUT : EASE_BACK);
      return;
    }
    if (d.mode === 'end') {
      var lf = this.leaves[this.idx];
      lf.classList.remove('is-moving');
      if (lf.animate && !reduce) lf.animate([{ transform: lf.style.transform }, { transform: 'none' }], { duration: 260, easing: EASE_BACK });
      lf.style.transform = 'none';
      return;
    }
    if (d.mode === null && !cancelled) {
      var dt = performance.now() - d.t;
      if (dt > 600 || d.a) return;                       // toque longo ou em link: o link cuida
      var r = this.host.getBoundingClientRect(), rel = (d.x - r.left) / r.width;
      if (rel > 0.62) this.flipNext(); else if (rel < 0.38) this.flipPrev();
    }
  };

  P.destroy = function () {
    this.host.removeEventListener('pointerdown', this._down);
    this.host.removeEventListener('click', this._click, true);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
    window.removeEventListener('resize', this._layout);
    if (this.ro) this.ro.disconnect();
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.frame && this.frame.parentNode) this.frame.parentNode.removeChild(this.frame);
    this.handlers = {};
  };

  window.RQIT_Turner = Turner;
})();
