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
 * Resultado: C:\scraper\resultados_instagram.csv
 */

const { chromium } = require('playwright');
const fs = require('fs');

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

function escaparCSV(v) {
  return `"${String(v || '').replace(/"/g, '""')}"`;
}

async function snap(page, nome) {
  try {
    await page.screenshot({ path: `C:\\scraper\\debug_${nome}.png` });
    console.log(`  [snap] ${nome}.png`);
  } catch {}
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function login(page) {
  console.log('\n[LOGIN] Abrindo página de login do Instagram...');

  // Vai direto para a tela de login — sem passar pela home
  await page.goto('https://www.instagram.com/accounts/login/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(4000);
  await snap(page, '01_login');

  // Garantir que estamos no Instagram (não Facebook)
  const url = page.url();
  console.log(`[LOGIN] URL atual: ${url}`);
  if (!url.includes('instagram.com')) {
    console.error('[ERRO] Redirecionado para fora do Instagram. URL:', url);
    await snap(page, 'ERRO_url');
    process.exit(1);
  }

  // Fechar qualquer popup/cookie sem clicar em nada que leve ao Facebook
  // Só aceita se o botão NÃO contiver "Facebook"
  for (const txt of ['Aceitar tudo', 'Allow all cookies', 'Aceitar cookies essenciais']) {
    try {
      const btn = page.getByRole('button', { name: new RegExp(txt, 'i') });
      if (await btn.count() > 0) {
        await btn.first().click();
        console.log(`[LOGIN] Cookie: "${txt}" aceito`);
        await sleep(2000);
        break;
      }
    } catch {}
  }

  // Localizar campo de usuário pelo placeholder (o que aparece nas screenshots)
  console.log('[LOGIN] Procurando campo de usuário...');
  let campoUsuario = null;

  // Tenta por placeholder (mais confiável para o Instagram atual)
  for (const ph of [
    'Número de celular, nome de usuário ou email',
    'Phone number, username, or email',
    'usuário',
    'username',
  ]) {
    try {
      const loc = page.locator(`input[placeholder*="${ph}"]`);
      if (await loc.count() > 0) {
        campoUsuario = loc.first();
        console.log(`[LOGIN] Campo encontrado pelo placeholder: "${ph}"`);
        break;
      }
    } catch {}
  }

  // Fallback: primeiro input de texto visível (que não seja senha)
  if (!campoUsuario) {
    try {
      const inputs = page.locator('input[type="text"], input:not([type="password"]):not([type="submit"])');
      if (await inputs.count() > 0) {
        campoUsuario = inputs.first();
        console.log('[LOGIN] Campo encontrado via fallback (primeiro input de texto)');
      }
    } catch {}
  }

  if (!campoUsuario) {
    await snap(page, 'ERRO_sem_campo');
    // Logar todos os inputs para diagnóstico
    try {
      const todos = await page.$$eval('input', els => els.map(e => ({
        type: e.type, name: e.name, placeholder: e.placeholder,
        id: e.id, className: e.className.substring(0, 40),
      })));
      console.log('[DEBUG] Inputs na página:', JSON.stringify(todos, null, 2));
    } catch {}
    console.error('[ERRO] Campo de usuário não encontrado. Veja debug_ERRO_sem_campo.png');
    process.exit(1);
  }

  // Preencher usuário
  await campoUsuario.click();
  await campoUsuario.fill('');
  await sleep(200);
  await campoUsuario.type(INSTAGRAM_USER, { delay: 80 });
  await sleep(500);

  // Campo senha — pelo tipo password
  const campoSenha = page.locator('input[type="password"]').first();
  await campoSenha.click();
  await campoSenha.fill('');
  await sleep(200);
  await campoSenha.type(INSTAGRAM_PASS, { delay: 80 });
  await sleep(500);

  await snap(page, '02_preenchido');

  // Clicar em Entrar (excluindo o botão "Entrar com o Facebook")
  const btnEntrar = page.locator('button[type="submit"]').first();
  await btnEntrar.click();
  console.log('[LOGIN] Credenciais enviadas...');
  await sleep(8000);

  await snap(page, '03_pos_login');
  console.log(`[LOGIN] URL pós-login: ${page.url()}`);

  // Fechar popups pós-login
  for (let i = 0; i < 3; i++) {
    for (const txt of ['Agora não', 'Not Now', 'Cancelar', 'Skip', 'Não agora']) {
      try {
        const b = page.getByRole('button', { name: new RegExp(txt, 'i') });
        if (await b.count() > 0) { await b.first().click(); await sleep(1500); }
      } catch {}
    }
  }

  console.log('[LOGIN] Concluído\n');
}

// ─── EXTRAIR TEXTO DO POST ────────────────────────────────────────────────────
async function extrairTexto(page) {
  let txt = '';
  for (const s of ['h1', 'article span', 'div[class*="Caption"] span']) {
    try {
      const els = await page.$$(s);
      for (const el of els) txt += ' ' + (await el.textContent().catch(() => ''));
    } catch {}
  }
  try {
    txt += ' ' + (await page.$$eval('img[alt]', imgs => imgs.map(i => i.alt))).join(' ');
  } catch {}
  return txt;
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
    await sleep(3000);

    // Redirigido para login = sessão expirou
    if (page.url().includes('/accounts/login')) {
      console.log('  ! Sessão expirada — encerrando');
      return found;
    }
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

    while (!parar && semNovidade < 5) {
      const links = await linksGrid(page);
      const novos = links.filter(l => !visitados.has(l));

      if (novos.length === 0) {
        semNovidade++;
        await page.evaluate(() => window.scrollBy(0, 1000));
        await sleep(2500);
        continue;
      }
      semNovidade = 0;

      for (const url of novos) {
        visitados.add(url);
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await sleep(2000);

          const data = await obterData(page);
          if (data && data < DATA_MINIMA) {
            console.log(`  → Post de ${formatarData(data)} (anterior a 13/05) — fim do perfil`);
            parar = true; break;
          }

          const texto = await extrairTexto(page);
          if (temKeyword(texto)) {
            console.log(`  ✔ ${formatarData(data)} — ${url}`);
            found.push({ data: formatarData(data), perfil: `@${username}`, link: url });
          }

          await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded', timeout: 25000,
          });
          await sleep(2000);
        } catch (e) {
          console.log(`  ! ${e.message.split('\n')[0]}`);
          try {
            await page.goto(`https://www.instagram.com/${username}/`, {
              waitUntil: 'domcontentloaded', timeout: 20000,
            });
            await sleep(2000);
          } catch {}
        }
        if (parar) break;
      }

      if (!parar) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await sleep(2500);
      }
    }
  } catch (e) {
    console.log(`  ! Erro: ${e.message.split('\n')[0]}`);
  }

  console.log(`  → ${found.length} posts encontrados`);
  return found;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
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

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR',
  });

  const page = await ctx.newPage();

  // Esconder flag de automação
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    window.chrome = { runtime: {} };
  });

  await login(page);

  const todos = [];
  for (const p of PERFIS) {
    todos.push(...await scrapePerfil(page, p));
    await sleep(3000);
  }

  await browser.close();

  const csv = [
    'Data da Publicação,@ do Perfil,Link da Postagem',
    ...todos.map(r => [escaparCSV(r.data), escaparCSV(r.perfil), escaparCSV(r.link)].join(','))
  ].join('\n');

  fs.writeFileSync('C:\\scraper\\resultados_instagram.csv', '﻿' + csv, 'utf-8');

  console.log('\n════════════════════════════════');
  console.log(` TOTAL: ${todos.length} posts`);
  console.log(' Arquivo: C:\\scraper\\resultados_instagram.csv');
  console.log('════════════════════════════════');
  console.log('\nPara importar no Google Sheets:');
  console.log('  1. Abra sheets.new');
  console.log('  2. Arquivo → Importar → selecione o CSV');
  console.log('  3. Separador: vírgula → OK');
})();
