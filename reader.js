/* Leitor v2 «Il Codice della Riconquista». Lib: StPageFlip (page-flip 2.0.7, MIT), local em vendor/. Caminhos relativos (funciona em /leggi/). */
(function () {
  'use strict';
  var CFG = window.RQIT_CONFIG || {};
  var PFX = CFG.STORAGE_PREFIX || 'rqit_leitor_';
  var KEY_HINT = PFX + 'dica';
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function show(id) {
    ['intro', 'shelf', 'reader', 'preview'].forEach(function (s) {
      var el = $(s); if (el) el.hidden = (s !== id);
    });
  }

  var C = window.RQIT_CONTENT || {};
  var T = C.titles || {};
  var cap1 = C.cap1Pages || [];
  var cap2 = C.cap2Pages || [];
  var cap3 = C.cap3Pages || [];
  var cap1Title = T.cap1 || 'Capitolo 1';
  var cap2Title = T.cap2 || 'Capitolo 2';
  var cap3Title = T.cap3 || 'Capitolo 3';
  var cap1Short = T.cap1Short || cap1Title;
  var cap2Short = T.cap2Short || cap2Title;
  var cap3Short = T.cap3Short || cap3Title;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function runHead(t) { return '<div class="rh"><span>' + (t || 'Il Codice della Riconquista') + '</span><i></i></div>'; }
  function foot(idx) { return '<div class="foot">' + (idx + 1) + '</div>'; }
  function ph(t) { return '<p class="ph">[[TESTO ' + t + ' — placeholder]]</p>'; }

  function pageCover() {
    return '<section class="page pg-cover" data-density="hard" data-p="0"><div class="pgi cv" style="padding:0">' +
      '<img class="cv-official" src="assets/cover-main.webp" alt="Il Codice della Riconquista" draggable="false">' +
      '</div></section>';
  }
  function pageBumpCover(title, img, idx) {
    return '<section class="page pg-cover" data-density="hard" data-p="' + idx + '"><div class="pgi cv" style="padding:0">' +
      '<img class="cv-official" src="' + img + '" alt="' + title + '" draggable="false">' +
      '</div></section>';
  }
  function pageBack(idx) {
    return '<section class="page pg-back" data-density="hard" data-p="' + idx + '"><div class="pgi">' +
      '<img class="bk-rose" src="assets/rose.png" alt="" draggable="false">' +
      '<div class="bk-t">Il Codice della<br><span>Riconquista</span></div><div class="bk-a">Henrico Feraz</div><div class="bar"></div></div></section>';
  }
  function wrap(idx, inner, cls) {
    return '<section class="page ' + (cls || 'pg-ch') + '" data-p="' + idx + '"><div class="pgi">' + runHead() + inner + foot(idx) + '</div></section>';
  }

  /* páginas do livro principal: capa, índice, cap. 1–3 (copy do Copywriter), fecho */
  function chapterPages(list, start) {
    return list.map(function (html, i) {
      return wrap(start + i, '<div class="ch-body' + (i ? ' cont' : '') + '">' + html + '</div>');
    });
  }
  function buildMain() {
    var h = [pageCover()];
    var c1s = 2;
    var c1 = chapterPages(cap1, c1s);
    var c2s = c1s + c1.length;
    var c2 = chapterPages(cap2, c2s);
    var c3s = c2s + c2.length;
    var c3 = chapterPages(cap3, c3s);
    var scudo = c1s;
    for (var si = 0; si < cap1.length; si++) {
      if (cap1[si].indexOf('data-bonus="scudo"') !== -1) { scudo = c1s + si; break; }
    }
    var toc = '<h2 class="toc-h">Indice</h2><span class="rule"></span><nav class="toc" aria-label="Indice">' +
      '<a href="#p' + c1s + '" data-goto="' + c1s + '"><span class="toc-n">01</span><span class="toc-t">' + cap1Short + '</span><span class="toc-p">' + (c1s + 1) + '</span></a>' +
      '<a class="toc-sub" href="#p' + scudo + '" data-goto="' + scudo + '"><span class="toc-n"><span class="toc-badge">Bonus</span></span><span class="toc-t">5. Lo Scudo Mentale della Riconquista</span><span class="toc-p">' + (scudo + 1) + '</span></a>' +
      '<a href="#p' + c2s + '" data-goto="' + c2s + '"><span class="toc-n">02</span><span class="toc-t">' + cap2Short + '</span><span class="toc-p">' + (c2s + 1) + '</span></a>' +
      '<a href="#p' + c3s + '" data-goto="' + c3s + '"><span class="toc-n">03</span><span class="toc-t">' + cap3Short + '</span><span class="toc-p">' + (c3s + 1) + '</span></a>' +
      '</nav>';
    h.push(wrap(1, toc, 'pg-toc'));
    h = h.concat(c1, c2, c3);
    var end = c3s + c3.length;
    h.push(pageBack(end));
    return { html: h.join(''), count: h.length, tocPage: 1, firstContent: c1s, chapters: { 1: c1s, 2: c2s, 3: c3s, scudo: scudo } };
  }

  function buildBump(id) {
    var meta = id === 'bump1'
      ? { title: 'Lei ti ha risposto. E adesso?', img: 'assets/cover-bump1.webp', tag: 'BUMP 1' }
      : { title: 'Il primo incontro dopo la rottura', img: 'assets/cover-bump2.webp', tag: 'BUMP 2' };
    var h = [pageBumpCover(meta.title, meta.img, 0)];
    h.push(wrap(1, '<p class="ch-kick">Bonus</p><h2 class="ch-title">' + meta.title + '</h2><span class="rule"></span>' + ph('LIBRO ' + meta.tag) + '<blockquote class="qt"><p>[[TESTO CITAZIONE ' + meta.tag + ' — placeholder]]</p></blockquote>'));
    h.push(wrap(2, '<div class="ch-body cont">' + ph('LIBRO ' + meta.tag + ', SEGUE') + '<aside class="box box-tip"><h3>Consiglio</h3>' + ph('CONSIGLIO ' + meta.tag) + '</aside></div>'));
    h.push(pageBack(3));
    return { html: h.join(''), count: h.length, tocPage: -1, firstContent: 1, title: meta.title };
  }

  var BOOKS = {
    main: { id: 'main', title: 'Il Codice della Riconquista', cover: 'assets/cover-main.webp', kicker: '' },
    bump1: { id: 'bump1', title: 'Lei ti ha risposto. E adesso?', cover: 'assets/cover-bump1.webp', kicker: 'Bonus', bump: 1, urlKey: 'HOTMART_BUMP_URL_1' },
    bump2: { id: 'bump2', title: 'Il primo incontro dopo la rottura', cover: 'assets/cover-bump2.webp', kicker: 'Bonus', bump: 2, urlKey: 'HOTMART_BUMP_URL_2' }
  };

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3800);
  }

  var pf = null;
  var currentBook = null;
  var accessState = { granted: true, bumps: { 1: false, 2: false } };

  function isLocked(book) {
    if (!book.bump) return false;
    return !(accessState.bumps && accessState.bumps[book.bump]);
  }

  function destroyFlip() {
    if (pf) { try { pf.destroy(); } catch (e) {} pf = null; }
    window.RQIT_READER = null;
    var book = $('book');
    if (book) { book.classList.remove('is-ready'); book.innerHTML = ''; }
  }

  function startFlip(built, bookId, startPage) {
    var book = $('book');
    book.innerHTML = built.html;
    var pages = book.querySelectorAll('.page');
    var count = pages.length;
    var key = PFX + 'pagina_' + bookId;
    var saved = parseInt(lsGet(key), 10);
    if (startPage == null) startPage = (isNaN(saved) || saved < 0 || saved >= count) ? 0 : saved;

    pf = new St.PageFlip(book, {
      width: 400, height: 690,
      size: 'stretch', minWidth: 260, maxWidth: 560, minHeight: 448, maxHeight: 966,
      showCover: true, usePortrait: true, startPage: startPage,
      drawShadow: true, maxShadowOpacity: 0.55, flippingTime: 750,
      mobileScrollSupport: false, swipeDistance: 24, clickEventForward: false,
      useMouseEvents: true, showPageCorners: true, autoSize: true
    });
    pf.loadFromHTML(pages);
    book.classList.add('is-ready');

    var FLIP_THRESHOLD = 0.55;
    var fc = pf.getFlipController();
    fc.stopMove = function () {
      if (this.calc === null) return;
      var pos = this.calc.getPosition(), rect = this.getBoundsRect();
      var y = this.calc.getCorner() === 'bottom' ? rect.height : 0;
      if (pos.x <= rect.pageWidth * FLIP_THRESHOLD) this.animateFlippingTo(pos, { x: -rect.pageWidth, y: y }, true);
      else this.animateFlippingTo(pos, { x: rect.pageWidth, y: y }, false);
    };

    var tp = null;
    book.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { tp = null; return; }
      var t = e.touches[0];
      tp = { x: t.clientX, y: t.clientY, t: Date.now(), a: e.target.closest ? e.target.closest('a') : null };
    }, { passive: true });
    book.addEventListener('touchend', function (e) {
      var s = tp; tp = null;
      if (!s || !e.changedTouches.length) return;
      var t = e.changedTouches[0];
      if (Math.abs(t.clientX - s.x) > 10 || Math.abs(t.clientY - s.y) > 10 || Date.now() - s.t > 400) return;
      if (pf.getState() !== 'read') return;
      if (s.a) { s.a.click(); return; }
      var r = book.getBoundingClientRect(), rel = (s.x - r.left) / r.width;
      if (rel > 0.62) pf.flipNext(); else if (rel < 0.38) pf.flipPrev();
    }, { passive: true });
    book.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('a')) e.stopPropagation();
    }, true);

    function hideHint() {
      var h = $('hint'); if (h) h.hidden = true;
      lsSet(KEY_HINT, '1');
    }
    function update(i) {
      $('page-ind').textContent = (i + 1) + '  ·  ' + count;
      lsSet(key, String(i));
      if (i > startPage) hideHint();
    }
    update(startPage);
    if (lsGet(KEY_HINT) === '1') $('hint').hidden = true;
    else $('hint').hidden = false;
    pf.on('flip', function (e) { update(e.data); if (e.data !== startPage) hideHint(); });

    book.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      if (a.hasAttribute('data-goto')) {
        e.preventDefault();
        pf.flip(parseInt(a.getAttribute('data-goto'), 10));
      }
    });

    applyApprofondire();
    window.RQIT_READER = { pageFlip: pf, count: count, book: bookId, chapters: built.chapters || null };
    currentBook = bookId;
  }

  /* «Se vuoi approfondire» (cap. 3): visível para quem NÃO tem os dois livros complementares.
     Flag por livro: access.bumps[1] / [2]. Com ACCESS_MODE 'open' os bumps vêm trancados, então a seção aparece. */
  function applyApprofondire() {
    var has1 = !!(accessState.bumps && accessState.bumps[1]);
    var has2 = !!(accessState.bumps && accessState.bumps[2]);
    var show = !(has1 && has2);
    document.querySelectorAll('.approfondire').forEach(function (el) { el.hidden = !show; });
  }

  function openBook(id, startPage) {
    var book = BOOKS[id];
    if (!book) return;
    if (isLocked(book)) { openPreview(id); return; }
    destroyFlip();
    show('reader');
    $('reader-title').textContent = book.title;
    $('btn-index').hidden = (id !== 'main');
    var built = id === 'main' ? buildMain() : buildBump(id);
    startFlip(built, id, startPage);
  }

  function openPreview(id) {
    var book = BOOKS[id];
    if (!book) return;
    var url = CFG[book.urlKey] || '#';
    var img = id === 'bump1' ? 'assets/illust-lettera.webp' : 'assets/illust-sentiero.webp';
    $('preview-brand').textContent = book.title;
    var previewHtml = (id === 'bump1' ? C.bump1Preview : C.bump2Preview) || ph('ANTEPRIMA');
    $('preview-wrap').innerHTML =
      '<article class="preview-page">' +
      '<p class="kick">Anteprima · Bonus</p>' +
      '<h2>' + book.title + '</h2>' +
      '<span class="rule" style="width:72px;margin:12px 0 16px;height:10px;border-top:3px solid #db1726;background:#120d0d;display:block"></span>' +
      '<figure class="fig"><img src="' + img + '" alt=""></figure>' +
      previewHtml +
      '<div class="preview-cta"><a class="lk-btn" href="' + url + '" data-bump="' + book.bump + '" rel="noopener noreferrer">Sblocca</a></div>' +
      '</article>';
    show('preview');
  }

  function renderShelf() {
    var grid = $('shelf-grid');
    grid.innerHTML = ['main', 'bump1', 'bump2'].map(function (id) {
      var b = BOOKS[id];
      var locked = isLocked(b);
      var label = b.title + (locked ? ' (bloccato)' : '');
      return '<button type="button" class="book-card' + (id === 'main' ? ' book-main' : '') + (locked ? ' is-locked' : '') + '" data-book="' + id + '" aria-label="' + label + '">' +
        '<span class="book-cover">' +
        '<img src="' + b.cover + '" alt="">' +
        (locked ? '<span class="book-lock" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10V7.5a5 5 0 0 1 10 0V10h1.2A1.8 1.8 0 0 1 20 11.8v8.4a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 20.2v-8.4A1.8 1.8 0 0 1 5.8 10H7Zm2 0h6V7.5a3 3 0 0 0-6 0V10Z"/></svg></span>' : '') +
        '</span><span class="book-meta"><b>' + b.title + '</b>' + (locked ? 'Bloccato' : 'Disponibile') + '</span></button>';
    }).join('');
  }

  function goShelf() {
    destroyFlip();
    renderShelf();
    show('shelf');
  }

  /* eventos de ecrã (uma vez) */
  $('btn-inizia').addEventListener('click', goShelf);
  $('btn-libreria').addEventListener('click', goShelf);
  $('btn-preview-back').addEventListener('click', goShelf);
  $('btn-index').addEventListener('click', function () { if (pf) pf.flip(1); });
  document.addEventListener('keydown', function (e) {
    if ($('reader').hidden) return;
    if (e.key === 'ArrowRight' && pf) pf.flipNext();
    else if (e.key === 'ArrowLeft' && pf) pf.flipPrev();
    else if (e.key === 'Escape') goShelf();
  });
  $('shelf-grid').addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-book]') : null;
    if (btn) openBook(btn.getAttribute('data-book'));
  });
  $('preview-wrap').addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-bump]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) {
      e.preventDefault();
      toast('[[DEV]] ' + href + ' — link Hotmart ancora non configurato (config.js).');
    } else { a.target = '_blank'; }
  });

  window.RQIT_APP = {
    goShelf: goShelf, openBook: openBook, openPreview: openPreview, show: show,
    books: BOOKS, isLocked: function (id) { return isLocked(BOOKS[id]); }
  };

  function init(acc) {
    accessState = acc || accessState;
    if (acc && acc.granted === false) {
      show('intro');
      $('intro').innerHTML = '<div class="noaccess"><div>Accesso non attivo</div><p>[[Testo placeholder: accesso non attivo per questo indirizzo.]]</p></div>';
      return;
    }
    show('intro');
  }

  function boot() {
    var chk = (window.RQIT_ACCESS && window.RQIT_ACCESS.check) ? window.RQIT_ACCESS.check() : Promise.resolve({ granted: true, bumps: { 1: false, 2: false } });
    Promise.resolve(chk).then(init).catch(function () { init({ granted: false }); });
  }
  if (document.fonts && document.fonts.load) {
    Promise.race([
      Promise.all([document.fonts.load('700 16px "STIX Two Text"'), document.fonts.load('400 16px "STIX Two Text"')]),
      new Promise(function (r) { setTimeout(r, 1500); })
    ]).then(boot, boot);
  } else { boot(); }
})();
