const fs = require('fs');

const CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko'; // Twitch's public web client id, used for anonymous public GQL reads

const BOOKMAKER_RULES = [
  { brand: 'Winline', test: (u) => /10k\.win|winline/i.test(u) },
  { brand: 'BetBoom', test: (u) => /betboom/i.test(u) },
  { brand: '1xBet', test: (u) => /1xbet/i.test(u) },
  { brand: '1win', test: (u) => /1win/i.test(u) },
  { brand: 'PARI', test: (u) => /\bpari\b|pari\.ru|parifs/i.test(u) },
  { brand: 'Fonbet', test: (u) => /fonbet|fnbt\.link|fnbt\b/i.test(u) },
];
const OTHER_RULES = [
  { brand: 'Playerok', test: (u) => /plrk\.co|playerok/i.test(u) },
];

function anchorLabel(brand, url) {
  const u = url.toLowerCase();
  if (/фрибет|freebet/.test(u)) return brand + ' — фрибет';
  if (/winpass/.test(u)) return brand + ' — WinPass';
  if (/pubstomp/.test(u)) return brand + ' — паб-стрим/ивент';
  if (/promo|bonus|bonuscode/.test(u)) return brand + ' — промо/бонус';
  if (brand === 'BetBoom' && /cyberbl|cs2|dota/i.test(u)) return brand + ' — раздел киберспорт';
  return brand + ' — реф. ссылка';
}

async function resolveFinalUrl(url) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`curl -s -o /dev/null -w "%{url_effective}" -L --max-time 5 "${url}"`, (err, stdout) => {
      resolve(!err && stdout && stdout !== url ? stdout : null);
    });
  });
}

async function getPanels(login) {
  const query = `query{user(login:"${login}"){panels{id ... on DefaultPanel{linkURL description}}}}`;
  const res = await fetch('https://gql.twitch.tv/gql', {
    method: 'POST',
    headers: { 'Client-Id': CLIENT_ID, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  const panels = json?.data?.user?.panels || [];
  return panels.map(p => p.linkURL).filter(Boolean);
}

function classifyLinks(links) {
  // dedupe identical URLs (panels sometimes repeat the same banner)
  const seen = new Set();
  const bannerLinks = [];
  for (const link of links) {
    let brand = null;
    for (const rule of BOOKMAKER_RULES) if (rule.test(link)) { brand = rule.brand; break; }
    if (!brand) for (const rule of OTHER_RULES) if (rule.test(link)) { brand = rule.brand; break; }
    if (brand && !seen.has(brand + '|' + link)) {
      seen.add(brand + '|' + link);
      bannerLinks.push({ url: link, brand, anchor: anchorLabel(brand, link) });
    }
  }
  return bannerLinks;
}

async function runGame(gameKey, list) {
  const results = [];
  for (const s of list) {
    const channelUrl = `https://twitch.tv/${s.login}`;
    try {
      const links = await getPanels(s.login);
      const bannerLinks = classifyLinks(links);
      // best-effort: try to resolve final destination for each banner link (many will fail/block, that's fine)
      for (const b of bannerLinks) {
        b.resolved = await resolveFinalUrl(b.url);
      }
      results.push({ name: s.name, login: s.login, channelUrl, viewers: s.viewers, bannerLinks, allLinksCount: links.length });
    } catch (e) {
      results.push({ name: s.name, login: s.login, channelUrl, viewers: s.viewers, bannerLinks: [], allLinksCount: 0, error: e.message });
    }
    await new Promise(r => setTimeout(r, 120));
  }
  fs.writeFileSync(`./${gameKey}_panels_full.json`, JSON.stringify(results, null, 2));
  const withBrand = results.filter(r => r.bannerLinks.length > 0);
  console.log(`\n=== ${gameKey}: ${results.length} channels checked, ${withBrand.length} with a bookmaker panel ===`);
  const counts = {};
  withBrand.forEach(r => r.bannerLinks.forEach(b => counts[b.brand] = (counts[b.brand] || 0) + 1));
  console.log(counts);
  withBrand.sort((a,b)=>b.viewers-a.viewers).forEach(r => {
    console.log(`${r.name.padEnd(20)} ${String(r.viewers).padStart(7)}  ${r.channelUrl}`);
    r.bannerLinks.forEach(b => console.log(`    [${b.brand}] ${b.anchor} -> ${b.url}${b.resolved ? '  (resolves to: '+b.resolved+')' : ''}`));
  });
}

async function main() {
  const snapshot = JSON.parse(fs.readFileSync('./snapshot2.json', 'utf8'));
  await runGame('dota2', snapshot.dota2);
  await runGame('cs2', snapshot.cs2);
}

main();
