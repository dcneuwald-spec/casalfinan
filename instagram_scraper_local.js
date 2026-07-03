/**
 * Instagram Scraper - Tramontina/Guru/Live/Cupom
 *
 * Pré-requisitos:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Como rodar:
 *   node instagram_scraper_local.js
 *
 * O resultado sai em: resultados_instagram.csv
 */

const { chromium } = require('playwright');
const fs = require('fs');

// ── Configurações ────────────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Login ────────────────────────────────────────────────────────────────────
async function login(page) {
  console.log('\n[LOGIN] Acessando Instagram...');
  await page.goto('https://www.instagram.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await sleep(4000);

  // Aceitar cookies — tenta várias variações de texto e aguarda o botão aparecer
  const cookieTextos = [
    'Aceitar tudo',
    'Allow all cookies',
    'Permitir cookies essenciais e opcionais',
    'Accept All',
    'Aceitar cookies',
  ];
  for (const txt of cookieTextos) {
    try {
      const btn = page.getByRole('button', { name: txt, exact: false });
      if (await btn.count() > 0) {
        await btn.first().click();
        console.log(`[LOGIN] Cookie banner aceito ("${txt}")`);
        await sleep(2000);
        break;
      }
    } catch {}
  }

  // Navegar para login se ainda não estiver lá
  if (!page.url().includes('/accounts/login')) {
    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await sleep(3000);
  }

  // Aguardar campo de usuário com timeout generoso
  console.log('[LOGIN] Aguardando formulário de login...');
  await page.waitForSelector('input[name="username"]', { timeout: 60000 });

  await page.locator('input[name="username"]').fill(INSTAGRAM_USER);
  await sleep(500);
  await page.locator('input[name="password"]').fill(INSTAGRAM_PASS);
  await sleep(500);
  await page.locator('button[type="submit"]').click();
  console.log('[LOGIN] Credenciais enviadas, aguardando...');
  await sleep(8000);

  // Fechar diálogos "Salvar informações" / "Ativar notificações"
  for (let i = 0; i < 4; i++) {
    for (const txt of ['Agora não', 'Not Now', 'Cancelar', 'Skip', 'Não agora']) {
      try {
        const btn = page.getByRole('button', { name: txt, exact: false });
        if (await btn.count() > 0) {
          await btn.first().click();
          await sleep(1500);
        }
      } catch {}
    }
  }
  console.log('[LOGIN] OK\n');
}

// ── Extrair texto de um post ─────────────────────────────────────────────────
async function extrairTextoPost(page) {
  const seletores = [
    // legenda principal
    'div[data-testid="post-comment-root"] span',
    'article div._a9zs span',
    'article div[class*="caption"] span',
    'h1',
    'div[class*="Caption"] span',
  ];
  let texto = '';
  for (const s of seletores) {
    try {
      const el = await page.$(s);
      if (el) { texto += ' ' + (await el.textContent()); }
    } catch {}
  }

  // Textos alternativos das imagens/vídeos (cobrem Reels)
  try {
    const alts = await page.$$eval('img[alt]', imgs => imgs.map(i => i.alt));
    texto += ' ' + alts.join(' ');
  } catch {}

  return texto;
}

// ── Obter data de um post (já aberto) ───────────────────────────────────────
async function obterDataPost(page) {
  try {
    const dateAttr = await page.$eval('time[datetime]', el => el.getAttribute('datetime'));
    return dateAttr ? new Date(dateAttr) : null;
  } catch {
    return null;
  }
}

// ── Coletar links de posts da grid ──────────────────────────────────────────
async function coletarLinksGrid(page) {
  const links = await page.$$eval('a[href*="/p/"], a[href*="/reel/"]', els =>
    [...new Set(els.map(a => a.href))]
  );
  return links;
}

// ── Scraping de um perfil ────────────────────────────────────────────────────
async function scrapePerfil(page, username) {
  const resultados = [];
  console.log(`[PERFIL] @${username}`);

  try {
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await sleep(3000);

    // Perfil inexistente
    if (await page.$('text=Esta página não está disponível') ||
        await page.$('text=Page Not Found')) {
      console.log(`  → Perfil não encontrado`);
      return resultados;
    }

    // Perfil privado
    if (await page.$('h2:has-text("Esta conta é privada")') ||
        await page.$('h2:has-text("This account is private")')) {
      console.log(`  → Conta privada, pulando`);
      return resultados;
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
          await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
          await sleep(2000);

          const dataPost = await obterDataPost(page);

          // Se post for mais antigo que a data mínima → parar este perfil
          if (dataPost && dataPost < DATA_MINIMA) {
            console.log(`  → Post de ${formatarData(dataPost)} anterior a 13/05/2026 — parando`);
            pararPerfil = true;
            break;
          }

          const texto = await extrairTextoPost(page);

          if (temKeyword(texto)) {
            const dataStr = formatarData(dataPost);
            console.log(`  ✔ ${dataStr} — ${postUrl}`);
            resultados.push({
              data: dataStr,
              perfil: `@${username}`,
              link: postUrl,
            });
          }

          // Voltar para o perfil
          await page.goto(`https://www.instagram.com/${username}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
          });
          await sleep(2000);

        } catch (err) {
          console.log(`  ! Erro no post: ${err.message}`);
          try {
            await page.goto(`https://www.instagram.com/${username}/`, {
              waitUntil: 'domcontentloaded',
              timeout: 20000,
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
    console.log(`  ! Erro geral: ${err.message}`);
  }

  console.log(`  → ${resultados.length} posts encontrados`);
  return resultados;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({
    headless: false,   // true = sem janela visível
    slowMo: 50,
    args: ['--start-maximized'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'pt-BR',
  });

  const page = await context.newPage();

  await login(page);

  const todos = [];

  for (const perfil of PERFIS) {
    const resultado = await scrapePerfil(page, perfil);
    todos.push(...resultado);
    await sleep(3000); // pausa entre perfis
  }

  await browser.close();

  // ── Gerar CSV ──────────────────────────────────────────────────────────────
  const cabecalho = 'Data da Publicação,@ do Perfil,Link da Postagem';
  const linhas = todos.map(r =>
    [escaparCSV(r.data), escaparCSV(r.perfil), escaparCSV(r.link)].join(',')
  );
  const csv = [cabecalho, ...linhas].join('\n');
  const arquivoCSV = 'resultados_instagram.csv';
  fs.writeFileSync(arquivoCSV, '﻿' + csv, 'utf-8'); // BOM para Excel/Sheets

  console.log(`\n═══════════════════════════════════`);
  console.log(` TOTAL ENCONTRADO: ${todos.length} posts`);
  console.log(` Arquivo salvo: ${arquivoCSV}`);
  console.log(`═══════════════════════════════════`);
  console.log('\nImporte o CSV no Google Sheets:');
  console.log('  1. Abra sheets.new');
  console.log('  2. Arquivo → Importar → selecione resultados_instagram.csv');
  console.log('  3. Separador: vírgula');
})();
