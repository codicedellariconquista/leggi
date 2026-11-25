/* Configuração do leitor «Il Codice della Riconquista». Tudo que muda por ambiente fica aqui. */
window.RQIT_CONFIG = {
  PRODUCT_NAME: 'Il Codice della Riconquista',
  AUTHOR: 'Henrico Feraz',

  /* URL pública do leitor (vive em /leggi/). */
  READER_URL: 'https://codicedellariconquista.com/leggi/',

  /* Links Hotmart dos 2 bumps (livros próprios na estante). Produtos ainda em rascunho:
     o checkout responde errorMessage=005 até o Checkout finalizar — isso é esperado. */
  HOTMART_BUMP_URL_1: 'https://pay.hotmart.com/G108655048J?off=e5jxa7nl',  // «Lei ti ha risposto. E adesso?» (9066787)
  HOTMART_BUMP_URL_2: 'https://pay.hotmart.com/M108655097O?off=lvtwn36t',  // «Il primo incontro dopo la rottura» (9066815)
  /* Checkout do front (produto 9066733); usado na tela «accesso terminato» (reembolso). */
  HOTMART_FRONT_URL: 'https://pay.hotmart.com/R108654940V?off=dbbhjjhv',

  /* Dica de virar (mãozinha + seta no canto da folha): aparece só nas primeiras N viradas, depois some. */
  HINT_MAX_TURNS: 6,

  /* Prefixo das chaves de localStorage (última página lida, dica de virar, etc.). */
  STORAGE_PREFIX: 'rqit_leitor_',

  /* ---- Acesso por e-mail da compra (ACCESS_MODE 'email'). ---- */
  /* Endpoint do painel: GET <API_ACESSO_URL>?k=<CHAVE_OFERTA>&e=<sha256 do e-mail>
     Resposta: { s: 'ok'|'reembolsado'|'nao_achei', p: [nomes dos produtos pagos] }. */
  API_ACESSO_URL: 'https://painel.labofertas.com/api/app/acesso',
  CHAVE_OFERTA: '<CHAVE_OFERTA>',

  /* Mapa produto Hotmart -> LIVRO (não capítulo). IDs: Checkout, 25/11/2026 (rascunho).
     9066733 abre o livro principal (cap. 1–3); 9066787 abre o bump 1; 9066815 abre o bump 2. */
  PRODUTO_PARA_LIVRO: {
    front: { nome: 'Il Codice della Riconquista',                                    casa: '^il codice della riconquista$', hotmart_id: '9066733', codigo: 'R108654940V', oferta: 'dbbhjjhv', livro: 'main' },
    bump1: { nome: 'Il Codice della Riconquista: Lei ti ha risposto. E adesso?',     casa: 'lei ti ha risposto',            hotmart_id: '9066787', codigo: 'G108655048J', oferta: 'e5jxa7nl', livro: 'bump1' },
    bump2: { nome: 'Il Codice della Riconquista: Il primo incontro dopo la rottura', casa: 'primo incontro dopo la rottura', hotmart_id: '9066815', codigo: 'M108655097O', oferta: 'lvtwn36t', livro: 'bump2' }
  },

  /* 'email' = só entra quem comprou (o painel confirma pelo e-mail). 'open' = só para teste local: o principal abre, os bumps ficam trancados. */
  ACCESS_MODE: 'email'
};
