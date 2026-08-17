/**
 * Определяет бэкграунд стримеров из составов букмекеров.
 *
 * Источники:
 *   Liquipedia (dota2, counterstrike, valorant, rainbowsix, leagueoflegends)
 *     — точная проверка существования страницы игрока. Страница есть только
 *       у тех, кто выступал на про-сцене.
 *   Twitch Helix /channels — последняя категория трансляции, отличает
 *     вэрайети-каналы от игровых.
 *
 * Ручные записи в streamer-background.json имеют приоритет: скрипт их не трогает,
 * только дополняет теми, кого там нет.
 *
 * Запуск:  node scripts/enrich-streamer-background.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLIENT_ID = '5p9h9t6kefshzn5pj6p5alx009pd3m';
const token = JSON.parse(fs.readFileSync(path.join(ROOT, 'token.json'), 'utf8')).access_token;

const HELIX = { Authorization: `Bearer ${token}`, 'Client-Id': CLIENT_ID };
const LIQUI = {
  'User-Agent': 'WinlineCyberBrief/1.0 (research; egor.kholov@gmail.com)',
  'Accept-Encoding': 'gzip',
  Accept: 'application/json',
};

const WIKIS = [
  ['dota2', 'dota2'],
  ['counterstrike', 'cs2'],
  ['valorant', 'valorant'],
  ['leagueoflegends', 'lol'],
  ['rainbowsix', 'r6'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

async function liquipediaHits(wiki, titles) {
  const url = `https://liquipedia.net/${wiki}/api.php?action=query&titles=${titles.map(encodeURIComponent).join('%7C')}&format=json`;
  try {
    const res = await fetch(url, { headers: LIQUI });
    if (!res.ok) return new Set();
    const json = await res.json();
    const found = new Set();
    for (const page of Object.values(json.query?.pages || {})) {
      if (page.missing === undefined) found.add(String(page.title).toLowerCase());
    }
    // normalized -> исходное написание могло измениться, поэтому вернём и нормализацию
    return found;
  } catch {
    return new Set();
  }
}

(async () => {
  const stats = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/research/streamer-stats.json'), 'utf8'));
  const bgPath = path.join(ROOT, 'data/research/streamer-background.json');
  const bg = JSON.parse(fs.readFileSync(bgPath, 'utf8'));

  const resolved = stats.records.filter((r) => r.resolved);
  console.log(`каналов для разбора: ${resolved.length}`);

  // 1. категория канала из Helix
  const gameByLogin = new Map();
  for (const part of chunk(resolved, 100)) {
    const query = part.map((r) => `broadcaster_id=${r.user_id}`).join('&');
    const res = await fetch(`https://api.twitch.tv/helix/channels?${query}`, { headers: HELIX });
    if (res.ok) {
      const json = await res.json();
      for (const row of json.data || []) gameByLogin.set(row.broadcaster_login.toLowerCase(), row.game_name || '');
    }
  }
  console.log(`  категорий получено: ${gameByLogin.size}`);

  // 2. страницы на Liquipedia
  const proByWiki = new Map(); // login -> discipline
  const names = resolved.map((r) => r.display_name);
  for (const [wiki, discipline] of WIKIS) {
    let hits = 0;
    for (const part of chunk(names, 50)) {
      const found = await liquipediaHits(wiki, part);
      for (const r of resolved) {
        if (found.has(r.display_name.toLowerCase()) && !proByWiki.has(r.login)) {
          proByWiki.set(r.login, discipline);
          hits += 1;
        }
      }
      await sleep(2500);
    }
    console.log(`  ${wiki.padEnd(16)} найдено страниц: ${hits}`);
  }

  // 3. классификация — ручные записи не трогаем
  const manual = new Set(Object.keys(bg.people).map((k) => k.toLowerCase()));
  let added = 0;
  const counts = {};

  for (const r of resolved) {
    if (manual.has(r.name.toLowerCase()) || manual.has(r.display_name.toLowerCase())) continue;

    const game = gameByLogin.get(r.login) || '';
    const proDiscipline = proByWiki.get(r.login);
    let category;
    let note;
    let discipline = proDiscipline || '';

    if (proDiscipline) {
      category = 'esports_scene';
      note = `есть страница игрока на Liquipedia (${proDiscipline})`;
    } else if (!game || /just chatting|общение/i.test(game)) {
      category = 'variety';
      discipline = 'variety';
      note = 'канал в разделе «Общение», игровой специализации нет';
    } else {
      category = 'game_streamer';
      discipline = /counter-strike|cs2/i.test(game) ? 'cs2' : /dota/i.test(game) ? 'dota2' : game.toLowerCase();
      note = `игровой канал, последняя категория — ${game}`;
    }

    bg.people[r.name] = { category, discipline, note };
    counts[category] = (counts[category] || 0) + 1;
    added += 1;
  }

  bg.categories = {
    pro: 'действующий про-игрок',
    ex_pro: 'бывший про-игрок',
    esports_scene: 'выступал на про-сцене',
    caster: 'комментатор или аналитик',
    game_streamer: 'игровой стример',
    variety: 'вэрайети-стример',
    streamer: 'стример без про-карьеры',
    unknown: 'не определено',
  };
  bg.method =
    'Ручные записи заполнены по публично известной карьере. Остальные размечены автоматически: наличие страницы игрока на Liquipedia означает выступления на про-сцене, категория канала в Twitch отличает вэрайети от игровых. Скрипт scripts/enrich-streamer-background.js.';
  bg.research_cutoff = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(bgPath, JSON.stringify(bg, null, 2) + '\n', 'utf8');

  console.log(`\nдобавлено записей: ${added}`);
  for (const [key, value] of Object.entries(counts)) console.log(`  ${key.padEnd(16)} ${value}`);
  console.log(`всего в справочнике: ${Object.keys(bg.people).length}`);
})();
