const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const schemaVersion = "1.0.0";
const snapshots = [
  {
    id: "twitch:cs2",
    discipline: "Counter-Strike 2",
    raw: "data/raw/streams-cs2.json",
    panels: "data/processed/cs2-panels.json"
  },
  {
    id: "twitch:cs2-ewc-live",
    discipline: "Counter-Strike 2",
    event: "Esports World Cup 2026",
    raw: "data/raw/streams-cs2-ewc-live.json",
    panels: "data/processed/cs2-ewc-panels.json"
  },
  {
    id: "twitch:dota2",
    discipline: "Dota 2",
    event: "The International 2026",
    raw: "data/raw/streams-dota2.json",
    panels: "data/processed/dota2-panels.json"
  }
];
const brands = [
  { name: "Winline", pattern: /winline|10k\.win|!win(?:\b|line)/iu },
  { name: "BetBoom", pattern: /betboom|betboom-link|betboombaza|!bb\b/iu },
  { name: "PARI", pattern: /\bpari(?:vision)?\b/iu },
  { name: "Fonbet", pattern: /fonbet|fnbt\.link|!fon\b/iu },
  { name: "Liga Stavok", pattern: /liga\s*stavok|ligastavok/iu },
  { name: "1xBet", pattern: /1xbet/iu },
  { name: "Playerok", pattern: /playerok|plrk\.co/iu }
];

const readJson = relativePath =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const compareText = (left, right) =>
  left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
const uniqueSorted = values => [...new Set(values)].sort(compareText);
const round = value => Number(value.toFixed(6));
const brandFromText = text => brands.filter(brand => brand.pattern.test(text)).map(brand => brand.name);
const brandNames = new Set(brands.map(brand => brand.name));
const normalizeBrand = value => {
  const match = brands.find(brand => brand.name.toLowerCase() === String(value).toLowerCase());
  return match ? match.name : null;
};
const sortLinks = links =>
  links.sort((left, right) =>
    compareText(left.url, right.url) ||
    compareText(left.brand || "", right.brand || "") ||
    compareText(left.anchor || "", right.anchor || "")
  );
const normalizePanelLink = link => ({
  url: String(link.url).trim(),
  brand: normalizeBrand(link.brand),
  anchor: link.anchor || null,
  resolved_url: link.resolved || null,
  status: "observed"
});
const sortEvidence = evidence =>
  evidence.sort((left, right) =>
    compareText(left.source, right.source) || compareText(left.value, right.value)
  );

const streamerMap = new Map();
const observations = [];
const snapshotRecords = [];
const coverage = [];

for (const snapshot of snapshots) {
  const rawDocument = readJson(snapshot.raw);
  const sourceStreams = Array.isArray(rawDocument) ? rawDocument : rawDocument.data;
  const streams = [...new Map(sourceStreams.map(stream => [stream.id, stream])).values()];
  const panels = readJson(snapshot.panels);
  const panelByLogin = new Map(panels.map(panel => [panel.login.toLowerCase(), panel]));
  const viewerCounts = streams.map(stream => stream.viewer_count).sort((left, right) => right - left);
  const totalViewers = viewerCounts.reduce((total, viewers) => total + viewers, 0);
  const topViewers = limit => viewerCounts.slice(0, limit).reduce((total, viewers) => total + viewers, 0);
  const top5Viewers = topViewers(5);
  const top10Viewers = topViewers(10);
  const top50Viewers = topViewers(50);

  snapshotRecords.push({
    snapshot_id: snapshot.id,
    status: "available",
    discipline: snapshot.discipline,
    event: snapshot.event || null,
    observed_at: null,
    observed_at_status: "not_provided_by_source",
    channel_count: streams.length,
    total_viewers: totalViewers,
    top_50_viewers: top50Viewers,
    top_5_concentration: totalViewers ? round(top5Viewers / totalViewers) : 0,
    top_10_concentration: totalViewers ? round(top10Viewers / totalViewers) : 0,
    provenance: {
      raw_source: snapshot.raw,
      raw_record_count: sourceStreams.length,
      unique_stream_count: streams.length,
      duplicate_stream_count: sourceStreams.length - streams.length,
      panel_source: snapshot.panels,
      panel_source_status: panels.length ? "available" : "empty"
    }
  });
  coverage.push({
    subject: `${snapshot.id}:twitch_snapshot`,
    status: "available",
    source: snapshot.raw,
    record_count: sourceStreams.length,
    unique_record_count: streams.length,
    duplicate_record_count: sourceStreams.length - streams.length
  });
  coverage.push({
    subject: `${snapshot.id}:panels`,
    status: panels.length ? "available" : "empty",
    source: snapshot.panels,
    record_count: panels.length
  });

  for (const stream of streams) {
    const streamerId = `twitch:${stream.user_id}`;
    const login = stream.user_login.toLowerCase();
    const panel = panelByLogin.get(login);
    const panelLinks = sortLinks((panel?.bannerLinks || []).map(normalizePanelLink));
    const evidenceByBrand = new Map();
    const addEvidence = (brand, source, value) => {
      if (!brandNames.has(brand)) return;
      if (!evidenceByBrand.has(brand)) evidenceByBrand.set(brand, []);
      evidenceByBrand.get(brand).push({ source, value, status: "observed" });
    };

    for (const brand of brandFromText(stream.title || "")) addEvidence(brand, "title", stream.title);
    for (const tag of stream.tags || []) {
      for (const brand of brandFromText(tag)) addEvidence(brand, "tag", tag);
    }
    for (const link of panelLinks) {
      if (link.brand) addEvidence(link.brand, "panel_url", link.url);
      for (const brand of brandFromText(`${link.url} ${link.anchor || ""}`)) {
        addEvidence(brand, "panel_url", link.url);
      }
    }

    const observedBrandSignals = [...evidenceByBrand]
      .sort(([left], [right]) => compareText(left, right))
      .map(([brand, evidence]) => ({
        brand,
        status: "observed",
        evidence: sortEvidence(
          [...new Map(evidence.map(item => [`${item.source}\u0000${item.value}`, item])).values()]
        )
      }));
    const observation = {
      observation_id: `${snapshot.id}:${streamerId}:${stream.id}`,
      schema_version: schemaVersion,
      status: "observed",
      snapshot_id: snapshot.id,
      streamer_id: streamerId,
      discipline: snapshot.discipline,
      event: snapshot.event || null,
      stream_id: stream.id,
      viewers: stream.viewer_count,
      title: stream.title,
      tags: [...(stream.tags || [])],
      language: stream.language,
      started_at: stream.started_at,
      observed_brand_signals: observedBrandSignals,
      partnerships: [],
      partnership_status: "not_inferred_from_observed_signals",
      panel_evidence_links: panelLinks,
      panel_evidence_status: panels.length ? (panel ? "observed" : "not_collected_for_channel") : "source_empty",
      provenance: {
        raw_source: snapshot.raw,
        raw_record_id: stream.id,
        panel_source: snapshot.panels,
        panel_record_login: panel ? panel.login : null
      }
    };
    observations.push(observation);

    const existing = streamerMap.get(streamerId);
    if (existing) {
      existing.logins.push(login);
      existing.display_names.push(stream.user_name);
      existing.disciplines.push(snapshot.discipline);
      existing.source_snapshots.push(snapshot.id);
      existing.panel_evidence_links.push(...panelLinks);
      existing.observed_brand_signals.push(...observedBrandSignals.map(signal => signal.brand));
    } else {
      streamerMap.set(streamerId, {
        streamer_id: streamerId,
        schema_version: schemaVersion,
        status: "observed",
        platform: "twitch",
        platform_user_id: stream.user_id,
        login,
        display_name: stream.user_name,
        channel_url: `https://twitch.tv/${login}`,
        logins: [login],
        display_names: [stream.user_name],
        disciplines: [snapshot.discipline],
        observed_brand_signals: observedBrandSignals.map(signal => signal.brand),
        partnerships: [],
        partnership_status: "not_inferred_from_observed_signals",
        panel_evidence_links: [...panelLinks],
        source_snapshots: [snapshot.id]
      });
    }
  }
}

coverage.push({
  subject: "twitch:standoff-2:snapshot",
  status: "missing",
  source: null,
  record_count: 0
});

const streamerRecords = [...streamerMap.values()]
  .map(streamer => ({
    ...streamer,
    login: uniqueSorted(streamer.logins)[0],
    display_name: uniqueSorted(streamer.display_names)[0],
    logins: uniqueSorted(streamer.logins),
    display_names: uniqueSorted(streamer.display_names),
    disciplines: uniqueSorted(streamer.disciplines),
    observed_brand_signals: uniqueSorted(streamer.observed_brand_signals),
    panel_evidence_links: sortLinks(
      [...new Map(streamer.panel_evidence_links.map(link => [
        `${link.url}\u0000${link.brand || ""}\u0000${link.anchor || ""}`,
        link
      ])).values()]
    ),
    source_snapshots: uniqueSorted(streamer.source_snapshots)
  }))
  .sort((left, right) => compareText(left.streamer_id, right.streamer_id));

observations.sort((left, right) =>
  compareText(left.snapshot_id, right.snapshot_id) ||
  right.viewers - left.viewers ||
  compareText(left.streamer_id, right.streamer_id)
);
coverage.sort((left, right) => compareText(left.subject, right.subject));

const outputDirectory = path.join(root, "data/research");
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  path.join(outputDirectory, "streamers.json"),
  `${JSON.stringify({
    schema_version: schemaVersion,
    status: "generated",
    entity_count: streamerRecords.length,
    coverage,
    streamers: streamerRecords
  }, null, 2)}\n`
);
fs.writeFileSync(
  path.join(outputDirectory, "streamer-observations.json"),
  `${JSON.stringify({
    schema_version: schemaVersion,
    status: "generated",
    snapshot_count: snapshotRecords.length,
    observation_count: observations.length,
    coverage,
    snapshots: snapshotRecords,
    observations
  }, null, 2)}\n`
);

process.stdout.write(
  `${JSON.stringify({
    streamers: streamerRecords.length,
    observations: observations.length,
    snapshots: snapshotRecords.map(snapshot => ({
      snapshot_id: snapshot.snapshot_id,
      channel_count: snapshot.channel_count,
      total_viewers: snapshot.total_viewers,
      top_50_viewers: snapshot.top_50_viewers,
      top_5_concentration: snapshot.top_5_concentration,
      top_10_concentration: snapshot.top_10_concentration
    }))
  }, null, 2)}\n`
);
