/* ============================================================================
   PONTO DE AMARRAÇÃO DO ACESSO (ainda NÃO implementado — hoje o acesso é aberto)
   ----------------------------------------------------------------------------
   Plano (modelo da Guadagno in Mano; detalhes e o que o painel precisa ganhar em produto/acesso.md):
   1. A Hotmart dispara o webhook da compra (front e cada bump) no painel; o painel anota o hash sha256 do e-mail + produto.
   2. Na primeira abertura o leitor (https://codicedellariconquista.com/leggi/, que também é a página de obrigado) pede «inserisci l'email dell'acquisto»,
      calcula o sha256 e chama GET API_ACESSO_URL?k=CHAVE_OFERTA&e=<hash>  (tudo no CAMINHO e em config.js; nunca token na query da URL do leitor).
   3. A API devolve { s: 'ok'|'reembolsado'|'nao_achei', p: [nomes dos produtos] }. check() abaixo traduz isso em
      { granted, email, bumps } usando PRODUTO_PARA_LIVRO. O leitor (reader.js) já respeita o retorno:
        - granted === false  -> mostra a tela «Accesso non attivo» em vez do livro;
        - bumps[1] / bumps[2] === true -> o livro bônus abre (placeholder) em vez do cadeado.
   4. Reembolso/chargeback: o produto sai de `p` (ou s = 'reembolsado') e o livro volta a trancar na próxima conferência.
      Erro de rede/painel: NÃO trancar quem pagou (usar a última resposta guardada; offline lê normalmente).
   ============================================================================ */
/* Configuração do ponto de amarração: RQIT_CONFIG.API_ACESSO_URL, CHAVE_OFERTA e PRODUTO_PARA_LIVRO (config.js).
   Fluxo completo e o que o painel precisa ganhar: ver produto/acesso.md. */
window.RQIT_ACCESS = {
  check: function () {
    /* PROTÓTIPO: acesso aberto, bumps trancados. */
    return Promise.resolve({ granted: true, mode: 'open', email: null, bumps: { 1: false, 2: false } });
  }
};
