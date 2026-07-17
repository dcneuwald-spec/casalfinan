/**
 * Instagram Scraper - Tramontina/Guru/Live/Cupom
 *
 * Pré-requisitos (rodar UMA VEZ):
 *   cd C:\scraper
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Como rodar:
 *   cd C:\scraper
 *   node instagram_scraper_local.js
 *
 * ── SELEÇÃO DE DATAS ──────────────────────────────────────────────────────
 * Sem argumentos: coleta de 13/05/2026 até HOJE.
 *
 * Com intervalo personalizado (data inicial e, opcionalmente, data final):
 *   node instagram_scraper_local.js 03/07/2026
 *       → do dia 03/07/2026 até hoje
 *   node instagram_scraper_local.js 03/07/2026 17/07/2026
 *       → do dia 03/07/2026 até 17/07/2026
 *
 * Os resultados são SEMPRE adicionados ao mesmo arquivo, sem apagar o que já
 * existe e sem duplicar posts já coletados (deduplicação pelo link).
 *
 * Resultado: C:\scraper\resultados_instagram.csv
 */

const { chromium } = require('playwright');
const fs = require('fs');

const INSTAGRAM_USER = 'danielcalvo';
const INSTAGRAM_PASS = 'D@ni5552';

// Palavras-chave. wholeWord=true → só casa como palavra inteira (evita falsos
// positivos: "live" dentro de "oliveira", "delivery" etc). As demais casam como
// substring, para pegar hashtags como #tramontinaguru, #gurutramontina, #guru.
const KEYWORDS = [
  { termo: 'tramontina', wholeWord: false },
  { termo: 'guru',       wholeWord: false },
  { termo: 'cupom',      wholeWord: false },
  { termo: 'live',       wholeWord: true  },
];

// ── Datas: lê da linha de comando (DD/MM/AAAA) ou usa padrões ────────────────
function parseDataBR(str, fimDoDia = false) {
  const m = String(str).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (fimDoDia) dt.setHours(23, 59, 59, 999);
  return dt;
}

// Datas definidas em obterDatas() — por argumento OU perguntando no terminal
let DATA_INICIAL = null;
let DATA_FINAL = null;

function pergunta(texto) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(texto, ans => { rl.close(); res(ans.trim()); }));
}

async function obterDatas() {
  const argInicio = process.argv[2];
  const argFim    = process.argv[3];
  const hojeFim = () => { const h = new Date(); h.setHours(23, 59, 59, 999); return h; };

  // Se veio por argumento, usa direto
  if (argInicio) {
    DATA_INICIAL = parseDataBR(argInicio, false);
    DATA_FINAL = argFim ? parseDataBR(argFim, true) : hojeFim();
  } else {
    // Modo interativo: pergunta as datas no terminal
    console.log('\n─── SELEÇÃO DE DATAS (formato DD/MM/AAAA) ───');
    while (!DATA_INICIAL) {
      const r = await pergunta('Data INICIAL: ');
      DATA_INICIAL = parseDataBR(r, false);
      if (!DATA_INICIAL) console.log('  Data inválida. Ex.: 03/07/2026');
    }
    while (!DATA_FINAL) {
      const r = await pergunta('Data FINAL (Enter = hoje): ');
      if (r === '') { DATA_FINAL = hojeFim(); break; }
      DATA_FINAL = parseDataBR(r, true);
      if (!DATA_FINAL) console.log('  Data inválida. Ex.: 17/07/2026');
    }
  }

  if (!DATA_INICIAL || !DATA_FINAL) {
    console.error('[ERRO] Data inválida. Use o formato DD/MM/AAAA. Ex.: 03/07/2026');
    process.exit(1);
  }
  if (DATA_INICIAL > DATA_FINAL) {
    console.error('[ERRO] A data inicial é posterior à data final.');
    process.exit(1);
  }
}

const PERFIS = [
  'gilneia.bemestar',
  'claudiadenicol',
  'pachecocarina',
  'rochelle.tomasetto',
  'sandrinesander',
  'dalva_heinrichs',
  'feoliveira.inquietas',
  'leocadiataglieber',
  'vitola.julia',
  'aalinejaeger',
  'nessapandolfi.paletas',
  'Jessicafbitencourt',
  'karlafachinellipatisserie',
  'dias_priscila',
  'lelu.casa',
  'nutrihelenawinter',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function temKeyword(texto) {
  if (!texto) return false;
  const t = texto.toLowerCase();
  return KEYWORDS.some(k => {
    if (k.wholeWord) {
      // palavra inteira: limitada por não-letra (inclui #, espaço, início/fim)
      return new RegExp(`(^|[^a-zà-ú])${k.termo}([^a-zà-ú]|$)`, 'i').test(t);
    }
    return t.includes(k.termo);
  });
}

function formatarData(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

function escaparCSV(v) {
  return `"${String(v || '').replace(/"/g, '""')}"`;
}

async function snap(page, nome) {
  try {
    await page.screenshot({ path: `C:\\scraper\\debug_${nome}.png` });
    console.log(`  [snap] ${nome}.png`);
  } catch {}
}

const CSV_PATH = 'C:\\scraper\\resultados_instagram.csv';
const CABECALHO = 'Data da Publicação,@ do Perfil,Link da Postagem,Curtidas,Comentários,Visualizações';

// Lê o CSV existente e retorna { linhas: [linhasBrutas], links: Set }
function lerCSVExistente() {
  const out = { linhas: [], links: new Set() };
  try {
    if (!fs.existsSync(CSV_PATH)) return out;
    const conteudo = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^﻿/, '');
    const linhas = conteudo.split('\n').filter(l => l.trim());
    for (const l of linhas) {
      if (l.startsWith('Data da Publicação')) continue; // cabeçalho
      out.linhas.push(l);
      const m = l.match(/(https?:\/\/[^",]+\/(?:p|reel)\/[^"/,]+)/i);
      if (m) out.links.add(m[1].replace(/\/$/, ''));
    }
  } catch {}
  return out;
}

// Salva complementando: mantém tudo que já existia + adiciona apenas os novos
// (deduplicação pelo link da postagem).
function salvarCSV(todos) {
  const existente = lerCSVExistente();
  const linhasNovas = [];

  for (const r of todos) {
    const linkNorm = String(r.link || '').replace(/\/$/, '');
    if (existente.links.has(linkNorm)) continue; // já estava na planilha
    existente.links.add(linkNorm);
    linhasNovas.push([
      escaparCSV(r.data), escaparCSV(r.perfil), escaparCSV(r.link),
      escaparCSV(r.likes), escaparCSV(r.comentarios), escaparCSV(r.views),
    ].join(','));
  }

  const csv = [CABECALHO, ...existente.linhas, ...linhasNovas].join('\n');
  fs.writeFileSync(CSV_PATH, '﻿' + csv, 'utf-8');
}

// ─── LOGIN MANUAL ─────────────────────────────────────────────────────────────
// O Instagram detecta e bloqueia login automatizado (redireciona ao Facebook).
// Solução: VOCÊ faz o login na janela que abrir. O script espera você entrar
// e só então começa o scraping. A sessão fica salva para as próximas execuções.
async function login(page) {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  LOGIN MANUAL NECESSÁRIO                                  ║');
  console.log('║                                                          ║');
  console.log('║  Uma janela do navegador foi aberta.                     ║');
  console.log('║  1. Faça login normalmente com:                          ║');
  console.log(`║       usuário: ${INSTAGRAM_USER.padEnd(42)}║`);
  console.log(`║       senha:   ${INSTAGRAM_PASS.padEnd(42)}║`);
  console.log('║  2. Resolva qualquer captcha/verificação se aparecer     ║');
  console.log('║  3. Quando estiver logado (vendo o feed), o script       ║');
  console.log('║     detecta automaticamente e começa o scraping.         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Espera até que o login seja concluído (detecta pela ausência do formulário
  // de login e presença de elementos do feed). Até 5 minutos.
  console.log('[LOGIN] Aguardando você concluir o login (até 5 min)...');
  const deadline = Date.now() + 5 * 60 * 1000;

  while (Date.now() < deadline) {
    await sleep(3000);
    try {
      const url = page.url();
      // Ainda na tela de login/challenge?
      const temFormLogin = await page.locator('input[type="password"]').count() > 0;
      const naHomeLogada =
        !temFormLogin &&
        url.includes('instagram.com') &&
        !url.includes('/accounts/login') &&
        !url.includes('/challenge') &&
        !url.includes('facebook.com');

      // Confirma sessão logada procurando ícones do feed (perfil, explorar)
      if (naHomeLogada) {
        const logado =
          (await page.locator('svg[aria-label*="Início"]').count() > 0) ||
          (await page.locator('svg[aria-label*="Home"]').count() > 0) ||
          (await page.locator('a[href="/direct/inbox/"]').count() > 0) ||
          (await page.locator('a[href*="/explore/"]').count() > 0);
        if (logado) {
          console.log('[LOGIN] ✔ Login detectado! Iniciando scraping...\n');
          await sleep(2000);
          return;
        }
      }
    } catch {}
  }

  console.error('[ERRO] Tempo esgotado esperando login manual (5 min).');
  process.exit(1);
}

// Espera aleatória para parecer humano e evitar bloqueio por rate-limit
function randSleep(min, max) {
  return sleep(min + Math.random() * (max - min));
}

// Detecta se a página foi redirecionada para login (bloqueio/sessão expirada)
function estaNaTelaDeLogin(page) {
  const u = page.url();
  return u.includes('/accounts/login') || u.includes('/challenge') || u.includes('facebook.com');
}

// Se bloqueado, pausa e espera você refazer o login manualmente na janela
async function garantirLogado(page) {
  if (!estaNaTelaDeLogin(page)) return true;

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  INSTAGRAM PEDIU LOGIN NOVAMENTE                          ║');
  console.log('║  Faça o login na janela do navegador.                    ║');
  console.log('║  O script retoma sozinho assim que você entrar.          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(3000);
    if (!estaNaTelaDeLogin(page) &&
        (await page.locator('input[type="password"]').count()) === 0) {
      console.log('[LOGIN] ✔ Retomando scraping...\n');
      await sleep(2000);
      return true;
    }
  }
  console.error('[ERRO] Tempo esgotado esperando re-login.');
  return false;
}

// ─── EXTRAIR DADOS DO POST (texto + métricas) ─────────────────────────────────
// Usa a meta og:description que traz "X likes, Y comments - Autor: legenda"
async function extrairDados(page) {
  let ogDesc = '';
  try {
    ogDesc = await page.$eval('meta[property="og:description"]', el => el.content || '');
  } catch {}

  // LEGENDA para busca de palavras-chave.
  // Quando logado, o Instagram carrega como app e a og:description costuma vir
  // GENÉRICA (sem a legenda real). Por isso a fonte principal agora é o DOM.
  let legenda = '';

  // 1) Tenta extrair a legenda da og:description (funciona quando disponível)
  const mCap = ogDesc.match(/(?:on|no|em)\s+instagram\s*:?\s*(.*)$/is);
  if (mCap && mCap[1].trim()) {
    legenda += ' ' + mCap[1].replace(/^["“”']+|["“”'.\s]+$/g, '');
  }

  // 2) Legenda visível no DOM (fonte principal quando logado)
  for (const s of ['h1', 'article h1', 'div[class*="Caption"] span',
                   'div[data-testid="post-caption"]', 'ul li h1', 'span[dir="auto"]']) {
    try {
      const els = await page.$$(s);
      for (const el of els) legenda += ' ' + (await el.textContent().catch(() => ''));
    } catch {}
  }

  // 3) Fallback final: texto do artigo/diálogo inteiro (garante achar a legenda)
  if (legenda.replace(/\s/g, '').length < 5) {
    try {
      legenda += ' ' + await page.evaluate(() => {
        const art = document.querySelector('article') || document.querySelector('main');
        return art ? art.innerText : '';
      });
    } catch {}
  }

  const texto = legenda;

  // DEBUG: mostra o começo do texto analisado (defina DEBUG=1 para ativar)
  if (process.env.DEBUG) {
    console.log(`    [txt] "${texto.replace(/\s+/g, ' ').trim().slice(0, 140)}"`);
  }

  // Likes e comentários do og:description (funciona em pt e en)
  let likes = '', comentarios = '';
  const mLikes = ogDesc.match(/([\d.,]+)\s*(likes|curtidas)/i);
  if (mLikes) likes = mLikes[1];
  const mCom = ogDesc.match(/([\d.,]+)\s*(comments|comentários|comentarios)/i);
  if (mCom) comentarios = mCom[1];

  // Visualizações (vídeos/reels): procura no texto da página
  let views = '';
  try {
    const corpo = await page.evaluate(() => document.body.innerText);
    const mViews = corpo.match(/([\d.,]+)\s*(visualizações|reproduções|views|plays)/i);
    if (mViews) views = mViews[1];
  } catch {}

  // Fallback: contar comentários visíveis se og não trouxe
  if (!comentarios) {
    try {
      const n = await page.locator('ul ul').count();
      if (n > 0) comentarios = String(n) + '+';
    } catch {}
  }

  return { texto, likes, comentarios, views };
}

// ─── OBTER DATA DO POST ───────────────────────────────────────────────────────
async function obterData(page) {
  try {
    const d = await page.$eval('time[datetime]', el => el.getAttribute('datetime'));
    return d ? new Date(d) : null;
  } catch { return null; }
}

// ─── LINKS DA GRID ────────────────────────────────────────────────────────────
async function linksGrid(page) {
  try {
    return await page.$$eval('a[href*="/p/"], a[href*="/reel/"]',
      els => [...new Set(els.map(a => a.href))]
    );
  } catch { return []; }
}

// ─── SCRAPE DE UM PERFIL ──────────────────────────────────────────────────────
async function scrapePerfil(page, username) {
  const found = [];
  console.log(`\n[PERFIL] @${username}`);

  try {
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'domcontentloaded', timeout: 40000,
    });
    await randSleep(4000, 6000);

    if (!await garantirLogado(page)) return found;

    if (await page.$('text=Esta página não está disponível') ||
        await page.$('text=Page Not Found')) {
      console.log('  → Perfil não encontrado'); return found;
    }
    if ((await page.title()).toLowerCase().includes('private') ||
        await page.$('h2:has-text("Esta conta é privada")')) {
      console.log('  → Conta privada'); return found;
    }

    const visitados = new Set();
    let parar = false;
    let semNovidade = 0;
    // Conta posts consecutivos ANTERIORES a 13/05. Só encerra o perfil depois
    // de vários seguidos — assim posts FIXADOS antigos no topo não param a busca.
    let antigosSeguidos = 0;
    const LIMITE_ANTIGOS = 8;

    while (!parar && semNovidade < 5) {
      const links = await linksGrid(page);
      const novos = links.filter(l => !visitados.has(l));

      if (novos.length === 0) {
        semNovidade++;
        await page.evaluate(() => window.scrollBy(0, 1000));
        await randSleep(2500, 4000);
        continue;
      }
      console.log(`  … ${novos.length} novos posts na grade (verificando um a um)`);
      semNovidade = 0;

      for (const url of novos) {
        visitados.add(url);
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await randSleep(3000, 5000);

          // Bloqueio no meio? pausa para re-login e continua
          if (estaNaTelaDeLogin(page)) {
            if (!await garantirLogado(page)) { parar = true; break; }
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
            await randSleep(3000, 5000);
          }

          const data = await obterData(page);

          // Post ANTERIOR à data inicial: pode ser um FIXADO no topo. Pula sem
          // coletar, mas só encerra o perfil após LIMITE_ANTIGOS antigos seguidos.
          if (data && data < DATA_INICIAL) {
            antigosSeguidos++;
            console.log(`  · Post de ${formatarData(data)} (antes de ${formatarData(DATA_INICIAL)}) — ignorado [${antigosSeguidos}/${LIMITE_ANTIGOS}]`);
            if (antigosSeguidos >= LIMITE_ANTIGOS) {
              console.log('  → Vários posts antigos seguidos — fim do perfil');
              parar = true;
            }
            await page.goto(`https://www.instagram.com/${username}/`, {
              waitUntil: 'domcontentloaded', timeout: 25000,
            });
            await randSleep(3000, 5000);
            if (parar) break;
            continue;
          }

          // Post POSTERIOR à data final: fora do intervalo. Pula sem coletar
          // e sem contar como antigo (é mais recente, não mais velho).
          if (data && data > DATA_FINAL) {
            console.log(`  · Post de ${formatarData(data)} (depois de ${formatarData(DATA_FINAL)}) — ignorado`);
            await page.goto(`https://www.instagram.com/${username}/`, {
              waitUntil: 'domcontentloaded', timeout: 25000,
            });
            await randSleep(3000, 5000);
            continue;
          }

          // Post dentro do intervalo: zera o contador de antigos
          antigosSeguidos = 0;

          const { texto, likes, comentarios, views } = await extrairDados(page);
          if (temKeyword(texto)) {
            console.log(`  ✔ MATCH ${formatarData(data)} | ❤ ${likes || '?'} 💬 ${comentarios || '?'} ▶ ${views || '-'} — ${url}`);
            found.push({
              data: formatarData(data),
              perfil: `@${username}`,
              link: url,
              likes, comentarios, views,
            });
          } else {
            // Post no intervalo mas sem palavra-chave — mostra para ver o progresso
            console.log(`  · ${formatarData(data)} sem palavra-chave`);
          }

          await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded', timeout: 25000,
          });
          await randSleep(3000, 5000);
        } catch (e) {
          console.log(`  ! ${e.message.split('\n')[0]}`);
          try {
            await page.goto(`https://www.instagram.com/${username}/`, {
              waitUntil: 'domcontentloaded', timeout: 20000,
            });
            await randSleep(3000, 5000);
          } catch {}
        }
        if (parar) break;
      }

      if (!parar) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await randSleep(2500, 4000);
      }
    }
  } catch (e) {
    console.log(`  ! Erro: ${e.message.split('\n')[0]}`);
  }

  console.log(`  → ${found.length} posts encontrados`);
  return found;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const SESSION_FILE = 'C:\\scraper\\ig_session.json';

(async () => {
  await obterDatas();

  console.log('\n════════════════════════════════════════════');
  console.log(` INTERVALO: ${formatarData(DATA_INICIAL)}  até  ${formatarData(DATA_FINAL)}`);
  console.log(` Arquivo:   complementando ${CSV_PATH}`);
  console.log('════════════════════════════════════════════');

  // Usa perfil persistente: guarda a sessão logada numa pasta para
  // não precisar logar de novo nas próximas execuções.
  const USER_DATA_DIR = 'C:\\scraper\\chrome_profile';

  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    slowMo: 60,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  const page = ctx.pages()[0] || await ctx.newPage();

  // Esconder flag de automação
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  // Verifica se já está logado (sessão salva de execução anterior)
  await page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(4000);
  const jaLogado =
    (await page.locator('a[href="/direct/inbox/"]').count() > 0) ||
    (await page.locator('a[href*="/explore/"]').count() > 0) ||
    (await page.locator('svg[aria-label*="Início"]').count() > 0);

  if (jaLogado) {
    console.log('[SESSÃO] Já logado de execução anterior — pulando login\n');
  } else {
    await login(page);
  }

  const todos = [];
  for (const p of PERFIS) {
    todos.push(...await scrapePerfil(page, p));
    // Salva parcial a cada perfil (não perde progresso se travar)
    salvarCSV(todos);
    await randSleep(8000, 12000); // pausa maior entre perfis evita bloqueio
  }

  await ctx.close();
  salvarCSV(todos);

  const totalArquivo = lerCSVExistente().linhas.length;
  console.log('\n════════════════════════════════════════════');
  console.log(` Coletados nesta execução: ${todos.length} posts`);
  console.log(` Total na planilha agora:  ${totalArquivo} posts`);
  console.log(` Intervalo: ${formatarData(DATA_INICIAL)} até ${formatarData(DATA_FINAL)}`);
  console.log(` Arquivo:   ${CSV_PATH}`);
  console.log('════════════════════════════════════════════');
  console.log('\nPara importar no Google Sheets:');
  console.log('  1. Abra sua planilha');
  console.log('  2. Arquivo → Importar → selecione o CSV');
  console.log('  3. Separador: vírgula → OK');
})();
