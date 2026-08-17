/**
 * Собирает статистику по стримерам из составов букмекеров через Twitch Helix API.
 *
 * Что берём (всё доступно app-токеном без scope):
 *   /users              — id, логин, дата создания канала, описание
 *   /channels/followers — текущее число фолловеров (поле total)
 *   /videos?type=archive — записи трансляций: длительность и просмотры
 *
 * Чего Twitch не отдаёт: средний онлайн за период. Его считают только внешние
 * сервисы, поэтому вместо него берём активность за последние 14 дней —
 * число эфиров, суммарные часы и просмотры записей.
 *
 * Запуск:  node scripts/fetch-streamer-stats.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CLIENT_ID = '5p9h9t6kefshzn5pj6p5alx009pd3m';
const WINDOW_DAYS = 14;

const token = JSON.parse(fs.readFileSync(path.join(ROOT, 'token.json'), 'utf8')).access_token;
const HEADERS = { Authorization: `Bearer ${token}`, 'Client-Id': CLIENT_ID };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function helix(endpoint, attempt = 0) {
  const res = await fetch(`https://api.twitch.tv/helix/${endpoint}`, { headers: HEADERS });
  if (res.status === 429 && attempt < 5) {
    await sleep(2000 * (attempt + 1));
    return helix(endpoint, attempt + 1);
  }
  if (!res.ok) return { error: res.status };
  return res.json();
}

/** Логин Twitch не всегда совпадает с тем, как имя записано в составе. */
function loginCandidates(name) {
  const base = name.trim();
  const out = new Set();
  out.add(base.toLowerCase());
  out.add(base.toLowerCase().replace(/[\s_.-]/g, ''));
  out.add(base.toLowerCase().replace(/\s+/g, '_'));
  return [...out].filter((value) => /^[a-z0-9_]{3,25}$/.test(value));
}

function durationToHours(text) {
  const m = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/.exec(text) || [];
  return (Number(m[1] || 0)) + (Number(m[2] || 0)) / 60 + (Number(m[3] || 0)) / 3600;
}

(async () => {
  const rosters = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/research/rosters.json'), 'utf8'));

  const wanted = [];
  for (const brand of rosters.brands) {
    for (const name of brand.streamers) wanted.push({ brand: brand.brand_id, brandName: brand.name, name });
  }
  console.log(`стримеров в составах: ${wanted.length}`);

  // 1. резолвим логины пачками по 100
  const resolved = new Map();
  const allCandidates = [...new Set(wanted.flatMap((item) => loginCandidates(item.name)))];
  for (let i = 0; i < allCandidates.length; i += 100) {
    const chunk = allCandidates.slice(i, i + 100);
    const query = chunk.map((login) => `login=${encodeURIComponent(login)}`).join('&');
    const data = await helix(`users?${query}`);
    for (const user of data.data || []) resolved.set(user.login.toLowerCase(), user);
    process.stdout.write(`\r  резолв логинов: ${Math.min(i + 100, allCandidates.length)}/${allCandidates.length}`);
  }
  console.log(`\n  найдено каналов: ${resolved.size}`);

  // 2. по каждому стримеру — фолловеры и записи за окно
  const since = Date.now() - WINDOW_DAYS * 24 * 3600 * 1000;
  const records = [];
  let done = 0;

  for (const item of wanted) {
    const user = loginCandidates(item.name).map((l) => resolved.get(l)).find(Boolean);
    done += 1;
    process.stdout.write(`\r  сбор статистики: ${done}/${wanted.length}`);

    if (!user) {
      records.push({ ...item, resolved: false });
      continue;
    }

    const followers = await helix(`channels/followers?broadcaster_id=${user.id}&first=1`);
    const videos = await helix(`videos?user_id=${user.id}&type=archive&first=100`);
    const recent = (videos.data || []).filter((v) => new Date(v.created_at).getTime() >= since);

    records.push({
      brand: item.brand,
      brandName: item.brandName,
      name: item.name,
      resolved: true,
      login: user.login,
      display_name: user.display_name,
      user_id: user.id,
      channel_url: `https://www.twitch.tv/${user.login}`,
      created_at: user.created_at,
      description: user.description || '',
      followers: typeof followers.total === 'number' ? followers.total : null,
      streams_14d: recent.length,
      hours_14d: Number(recent.reduce((sum, v) => sum + durationToHours(v.duration), 0).toFixed(1)),
      vod_views_14d: recent.reduce((sum, v) => sum + (v.view_count || 0), 0),
      last_stream_at: recent[0]?.created_at || (videos.data || [])[0]?.created_at || null,
    });
  }
  console.log();

  const found = records.filter((r) => r.resolved);
  const doc = {
    schema_version: '1.0.0',
    collected_at: new Date().toISOString().slice(0, 10),
    window_days: WINDOW_DAYS,
    source: 'Twitch Helix API',
    method:
      'Фолловеры — текущее значение из /channels/followers. Активность за 14 дней посчитана по записям трансляций (/videos, type=archive): число эфиров, суммарная длительность и просмотры записей. Средний онлайн Twitch в API не отдаёт.',
    requested: records.length,
    resolved_count: found.length,
    records,
  };

  const out = path.join(ROOT, 'data/research/streamer-stats.json');
  fs.writeFileSync(out, JSON.stringify(doc, null, 2) + '\n', 'utf8');

  console.log(`\nзаписан ${path.relative(ROOT, out)}`);
  console.log(`  каналов найдено: ${found.length} из ${records.length}`);
  console.log(`  с эфирами за ${WINDOW_DAYS} дней: ${found.filter((r) => r.streams_14d > 0).length}`);
  console.log('\nтоп-10 по фолловерам:');
  for (const r of found.sort((a, b) => (b.followers || 0) - (a.followers || 0)).slice(0, 10)) {
    console.log(`  ${r.display_name.padEnd(20)} ${String(r.followers).padStart(9)} фолл.  ${r.streams_14d} эфиров / ${r.hours_14d} ч`);
  }
})();
