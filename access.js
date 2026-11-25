/* ============================================================================
   ACESSO PELO E-MAIL DA COMPRA 
   1. A Hotmart avisa o painel (webhook) de cada compra; o painel guarda só o sha256 do e-mail + produto.
   2. Na primeira abertura o leitor pede o e-mail, calcula o sha256 no aparelho (o e-mail em texto NÃO viaja nem é guardado)
      e chama GET API_ACESSO_URL?k=CHAVE_OFERTA&e=<hash>.
   3. Resposta: { s: 'ok', p: [nomes dos produtos pagos] } | { s: 'reembolsado' } | { s: 'nao_achei' } | 400/429/503 (erro).
      Cada nome em p é casado com PRODUTO_PARA_LIVRO (config.js): front -> livro principal; bump1/bump2 -> cada bônus.
   4. O estado fica em localStorage na chave própria deste app (STORAGE_PREFIX + 'ativacao'): só hash, produtos e hora.
      NÃO acumula: libera a partir da ÚLTIMA resposta, então reembolso tranca na próxima conferência (a cada ~6 h online,
      na abertura se passou o prazo, e quando o comprador volta de «Sblocca»).
   5. Erro de rede/painel (503, 429, CORS, offline): quem JÁ foi liberado continua liberado com a última resposta boa;
      quem ainda não foi verificado NÃO entra (o leitor não libera no escuro) e vê «riprova».
   ============================================================================ */
(function () {
  'use strict';
  var CFG = window.RQIT_CONFIG || {};
  var KEY = (CFG.STORAGE_PREFIX || 'rqit_leitor_') + 'ativacao';
  var RECHECK_MS = 6 * 60 * 60 * 1000;
  var TIMEOUT_MS = 9000;

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }

  function norm(s) {
    s = String(s || '').toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return s.replace(/\s+/g, ' ').trim();
  }
  function stored() {
    try { var o = JSON.parse(lsGet(KEY) || 'null'); return (o && o.hash) ? o : null; } catch (e) { return null; }
  }
  function save(o) { lsSet(KEY, JSON.stringify(o)); }

  /* nomes dos produtos pagos -> { main, 1, 2 } */
  function livros(p) {
    var map = CFG.PRODUTO_PARA_LIVRO || {}, out = { main: false, 1: false, 2: false };
    (p || []).forEach(function (nome) {
      var n = norm(nome);
      Object.keys(map).forEach(function (k) {
        var m = map[k], re;
        try { re = new RegExp(m.casa, 'i'); } catch (e) { return; }
        if (!re.test(n)) return;
        if (m.livro === 'main') out.main = true;
        else if (m.livro === 'bump1') out[1] = true;
        else if (m.livro === 'bump2') out[2] = true;
      });
    });
    return out;
  }
  function stateFrom(o) {
    var l = livros(o.p);
    return { granted: !!l.main, mode: 'email', estado: o.estado, hash: o.hash, bumps: { 1: !!l[1], 2: !!l[2] } };
  }

  function sha256(text) {
    if (!(window.crypto && window.crypto.subtle && window.TextEncoder)) return Promise.reject(new Error('nocrypto'));
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
    });
  }

  /* consulta ao painel -> { kind: 'ok'|'reembolsado'|'nao_achei'|'erro', p } */
  function ask(hash) {
    var url = CFG.API_ACESSO_URL, key = CFG.CHAVE_OFERTA;
    if (!url || !key || /^</.test(url) || /^</.test(key)) return Promise.resolve({ kind: 'erro', why: 'config' });
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
    return fetch(url + '?k=' + encodeURIComponent(key) + '&e=' + encodeURIComponent(hash), { method: 'GET', cache: 'no-store', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j || {} }; }); })
      .then(function (x) {
        if (timer) clearTimeout(timer);
        var s = x.j.s;
        if (x.status === 200 && s === 'ok' && x.j.p instanceof Array) return { kind: 'ok', p: x.j.p };
        if (x.status === 200 && s === 'reembolsado') return { kind: 'reembolsado' };
        if (x.status === 200 && s === 'nao_achei') return { kind: 'nao_achei' };
        return { kind: 'erro', why: 'http' + x.status };
      })
      .catch(function () { if (timer) clearTimeout(timer); return { kind: 'erro', why: 'rede' }; });
  }

  /* aplica a resposta ao que está guardado; devolve o estado novo (ou null se a resposta foi erro) */
  function apply(hash, res) {
    if (res.kind === 'ok') {
      var o = { estado: 'ativo', hash: hash, p: res.p, em: Date.now() };
      save(o); return stateFrom(o);
    }
    if (res.kind === 'reembolsado') {
      var b = { estado: 'bloqueado', hash: hash, p: [], motivo: 'reembolsado', em: Date.now() };
      save(b); return { granted: false, mode: 'email', estado: 'bloqueado', motivo: 'reembolsado', hash: hash, bumps: { 1: false, 2: false } };
    }
    if (res.kind === 'nao_achei') {
      /* quem já estava liberado e agora não aparece (pedido sumiu): tranca na conferência, como o reembolso */
      var n = { estado: 'bloqueado', hash: hash, p: [], motivo: 'nao_achei', em: Date.now() };
      save(n); return { granted: false, mode: 'email', estado: 'bloqueado', motivo: 'nao_achei', hash: hash, bumps: { 1: false, 2: false } };
    }
    return null;
  }

  window.RQIT_ACCESS = {
    /* chamado na abertura. Devolve o estado usável agora; a reconferência (se vencida) roda por trás e vale na próxima abertura. */
    check: function () {
      if (CFG.ACCESS_MODE === 'open') return Promise.resolve({ granted: true, mode: 'open', bumps: { 1: false, 2: false } });
      var o = stored();
      if (!o) return Promise.resolve({ granted: false, mode: 'email', estado: 'novo', bumps: { 1: false, 2: false } });
      if (o.estado === 'ativo') {
        if (navigator.onLine !== false && Date.now() - (o.em || 0) > RECHECK_MS) {
          /* reconferência vencida: resolve já com a última resposta e atualiza o guardado (o estado novo vale na próxima abertura) */
          ask(o.hash).then(function (res) { apply(o.hash, res); });
        }
        return Promise.resolve(stateFrom(o));
      }
      /* bloqueado (reembolso): refaz a consulta a cada abertura, para quem comprou de novo voltar a entrar */
      return ask(o.hash).then(function (res) {
        var s = apply(o.hash, res);
        return s || { granted: false, mode: 'email', estado: 'bloqueado', motivo: o.motivo || 'nao_achei', hash: o.hash, bumps: { 1: false, 2: false } };
      });
    },
    /* o comprador digitou o e-mail */
    verify: function (email) {
      return sha256(norm(email)).then(function (hash) {
        return ask(hash).then(function (res) {
          var s = apply(hash, res);
          if (s && s.granted) return { ok: true, state: s };
          if (s) return { ok: false, kind: s.motivo === 'reembolsado' ? 'reembolsado' : 'nao_achei', state: s };
          return { ok: false, kind: 'erro' };
        });
      }, function () { return { ok: false, kind: 'erro' }; });
    },
    /* reconferência rápida (ao voltar de «Sblocca»). Devolve o estado novo, ou null se nada mudou/erro. */
    recheck: function () {
      var o = stored();
      if (!o || o.estado !== 'ativo' || navigator.onLine === false) return Promise.resolve(null);
      return ask(o.hash).then(function (res) { return apply(o.hash, res); });
    },
    sair: function () { lsDel(KEY); }
  };
})();
