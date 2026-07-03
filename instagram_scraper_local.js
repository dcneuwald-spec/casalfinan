/**
 * Instagram Scraper - Tramontina/Guru/Live/Cupom
 *
 * Pré-requisitos:
 *   cd C:\scraper
 *   npm install playwright
 *
 * Como rodar (na pasta C:\scraper):
 *   node instagram_scraper_local.js
 *
 * Resultado: C:\scraper\resultados_instagram.csv
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ── Configurações ─────────────────────────────────────────────────────────────
const INSTAGRAM_USER = 'danielcalvo';
const INSTAGRAM_PASS = 'D@ni5552';
const DATA_MINIMA    = new Date('2026-05-13T00:00:00');
const KEYWORDS       = ['tramontina', 'guru', 'live', 'cupom'];

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

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function temKeyword(texto) {
  if (!texto) return false;
  const t = texto.toLowerCase();
  return KEYWORDS.some(k => t.includes(k));
}

function formatarData(date) {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}

function escaparCSV(valor) {
  if (!valor) return '';
  return `"${String(valor).replace(/"/g, '""')}"`;
}

async function screenshot(page, nome) {
  try {
    await page.screenshot({ path: `C:\\scraper\\debug_${nome}.png`, fullPage: false });
    console.log(`  [DEBUG] screenshot salvo: debug_${nome}.png`);
  } catch {}
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function login(page) {
  console.log('\n[LOGIN] Abrindo Instagram...');

  // Usar chrome real instalado no Windows
  // A instância já foi criada com channel:'chrome'
  await page.goto('https://www.instagram.com/', {
    waitUntil: 'load',
    timeout: 90000,
  });
  await sleep(5000);
  await screenshot(page, '01_home');

  // Aceitar banner de cookies — tenta vários textos possíveis
  const cookieBtns = [
    'Aceitar tudo',
    'Allow all cookies',
    'Permitir cookies',
    'Accept All',
    'Aceitar',
    'OK',
  ];
  for (const txt of cookieBtns) {
    try {
      const btns = await page.getByRole('button', { name: new RegExp(txt, 'i') }).all();
      if (btns.length > 0) {
        await btns[0].click();
        console.log(`[LOGIN] Cookie aceito ("${txt}")`);
        await sleep(2500);
        break;
      }
    } catch {}
  }

  await screenshot(page, '02_apos_cookie');

  // Ir direto para login
  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'load',
    timeout: 90000,
  });
  await sleep(5000);
  await screenshot(page, '03_login_page');

  // Aceitar cookies de novo se aparecerem
  for (const txt of cookieBtns) {
    try {
      const btns = await page.getByRole('button', { name: new RegExp(txt, 'i') }).all();
      if (btns.length > 0) { await btns[0].click(); await sleep(2000); break; }
    } catch {}
  }

  // Aguardar campo de usuário — tenta vários seletores
  console.log('[LOGIN] Aguardando campo de usuário (até 60s)...');
  const seletoresInput = [
    'input[name="username"]',
    'input[aria-label*="usuário"]',
    'input[aria-label*="username"]',
    'input[aria-label*="celular"]',
    'input[autocomplete="username"]',
    'input[type="text"]',
  ];

  let inputUsuario = null;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const sel of seletoresInput) {
      try {
        const el = page.locator(sel).first();
        if (await el.count() > 0 && await el.isVisible()) {
          inputUsuario = sel;
          break;
        }
      } catch {}
    }
    if (inputUsuario) break;
    // Logar todos inputs encontrados para debug
    try {
      const inputs = await page.$$eval('input', els =>
        els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, ariaLabel: e.getAttribute('aria-label') }))
      );
      if (inputs.length > 0) {
        console.log('  [DEBUG] Inputs encontrados:', JSON.stringify(inputs));
      }
    } catch {}
    await sleep(3000);
  }

  if (!inputUsuario) {
    await screenshot(page, '04_erro_sem_campo');
    console.error('[ERRO] Campo de usuário não encontrado. Veja debug_04_erro_sem_campo.png em C:\\scraper\\');
    process.exit(1);
  }

  console.log(`[LOGIN] Campo encontrado: ${inputUsuario}`);
  await page.locator(inputUsuario).click();
  await page.locator(inputUsuario).fill(INSTAGRAM_USER);
  await sleep(600);

  // Campo senha: próximo input após o usuário
  const seletoresSenha = [
    'input[name="password"]',
    'input[type="password"]',
    'input[aria-label*="senha"]',
    'input[aria-label*="password"]',
  ];
  let inputSenha = 'input[type="password"]';
  for (const sel of seletoresSenha) {
    try {
      if (await page.locator(sel).count() > 0) { inputSenha = sel; break; }
    } catch {}
  }
  await page.locator(inputSenha).click();
  await page.locator(inputSenha).fill(INSTAGRAM_PASS);
  await sleep(600);
  await screenshot(page, '05_antes_submit');

  await page.locator('button[type="submit"]').click();
  console.log('[LOGIN] Enviado. Aguardando...');
  await sleep(9000);
  await screenshot(page, '06_pos_login');

  // Fechar popups pós-login
  for (let i = 0; i < 4; i++) {
    for (const txt of ['Agora não', 'Not Now', 'Cancelar', 'Skip', 'Não agora', 'Dismiss']) {
      try {
        const btns = await page.getByRole('button', { name: new RegExp(txt, 'i') }).all();
        if (btns.length > 0) { await btns[0].click(); await sleep(1500); }
      } catch {}
    }
  }

  console.log('[LOGIN] OK\n');
}

// ── Extrair texto de um post ──────────────────────────────────────────────────
async function extrairTextoPost(page) {
  let texto = '';
  const seletores = [
    'h1',
    'div._a9zs span',
    'div[data-testid="post-comment-root"] span',
    'article span',
  ];
  for (const s of seletores) {
    try {
      const els = await page.$$(s);
      for (const el of els) texto += ' ' + (await el.textContent().catch(() => ''));
    } catch {}
  }
  try {
    const alts = await page.$$eval('img[alt]', imgs => imgs.map(i => i.alt));
    texto += ' ' + alts.join(' ');
  } catch {}
  return texto;
}

// ── Obter data de um post ─────────────────────────────────────────────────────
async function obterDataPost(page) {
  try {
    const dateAttr = await page.$eval('time[datetime]', el => el.getAttribute('datetime'));
    return dateAttr ? new Date(dateAttr) : null;
  } catch { return null; }
}

// ── Coletar links da grid ─────────────────────────────────────────────────────
async function coletarLinksGrid(page) {
  try {
    return await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', els =>
      [...new Set(els.map(a => a.href))]
    );
  } catch { return []; }
}

// ── Scraping de um perfil ─────────────────────────────────────────────────────
async function scrapePerfil(page, username) {
  const resultados = [];
  console.log(`\n[PERFIL] @${username}`);

  try {
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 40000,
    });
    await sleep(3500);

    if (await page.$('text=Esta página não está disponível') ||
        await page.$('text=Page Not Found')) {
      console.log('  → Perfil não encontrado'); return resultados;
    }
    if (await page.$('h2:has-text("Esta conta é privada")') ||
        await page.$('h2:has-text("This account is private")')) {
      console.log('  → Conta privada'); return resultados;
    }

    const linksVisitados = new Set();
    let pararPerfil = false;
    let scrollSemNovidade = 0;

    while (!pararPerfil && scrollSemNovidade < 5) {
      const links = await coletarLinksGrid(page);
      const novos = links.filter(l => !linksVisitados.has(l));

      if (novos.length === 0) {
        scrollSemNovidade++;
        await page.evaluate(() => window.scrollBy(0, 900));
        await sleep(2500);
        continue;
      }
      scrollSemNovidade = 0;

      for (const postUrl of novos) {
        linksVisitados.add(postUrl);
        try {
          await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await sleep(2000);

          const dataPost = await obterDataPost(page);
          if (dataPost && dataPost < DATA_MINIMA) {
            console.log(`  → Post de ${formatarData(dataPost)} anterior a 13/05 — parando`);
            pararPerfil = true;
            break;
          }

          const texto = await extrairTextoPost(page);
          if (temKeyword(texto)) {
            const dataStr = formatarData(dataPost);
            console.log(`  ✔ ${dataStr} — ${postUrl}`);
            resultados.push({ data: dataStr, perfil: `@${username}`, link: postUrl });
          }

          await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded', timeout: 25000,
          });
          await sleep(2000);
        } catch (err) {
          console.log(`  ! Erro no post: ${err.message.split('\n')[0]}`);
          try {
            await page.goto(`https://www.instagram.com/${username}/`, {
              waitUntil: 'domcontentloaded', timeout: 25000,
            });
            await sleep(2000);
          } catch {}
        }
        if (pararPerfil) break;
      }

      if (!pararPerfil) {
        await page.evaluate(() => window.scrollBy(0, 900));
        await sleep(2500);
      }
    }
  } catch (err) {
    console.log(`  ! Erro geral: ${err.message.split('\n')[0]}`);
  }

  console.log(`  → ${resultados.length} posts relevantes`);
  return resultados;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  // Usa Chromium do Playwright com perfil completamente limpo
  // (evita cookies/sessão do Facebook que causavam redirecionamento)
  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  console.log('[BROWSER] Iniciando com perfil limpo (sem cookies anteriores)');

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR',
    extraHTTPHeaders: {
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });

  const page = await context.newPage();

  // Ocultar sinais de automação
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  await login(page);

  const todos = [];
  for (const perfil of PERFIS) {
    const res = await scrapePerfil(page, perfil);
    todos.push(...res);
    await sleep(3000);
  }

  await browser.close();

  // ── Gerar CSV ─────────────────────────────────────────────────────────────
  const cabecalho = 'Data da Publicação,@ do Perfil,Link da Postagem';
  const linhas = todos.map(r =>
    [escaparCSV(r.data), escaparCSV(r.perfil), escaparCSV(r.link)].join(',')
  );
  const csv = [cabecalho, ...linhas].join('\n');
  const arquivoCSV = 'C:\\scraper\\resultados_instagram.csv';
  fs.writeFileSync(arquivoCSV, '﻿' + csv, 'utf-8');

  console.log('\n════════════════════════════════════');
  console.log(` TOTAL: ${todos.length} posts encontrados`);
  console.log(` Arquivo: ${arquivoCSV}`);
  console.log('════════════════════════════════════');
  console.log('\nImporte no Google Sheets:');
  console.log('  1. Abra sheets.new');
  console.log('  2. Arquivo → Importar → selecione resultados_instagram.csv');
  console.log('  3. Separador: vírgula → OK');
})();
