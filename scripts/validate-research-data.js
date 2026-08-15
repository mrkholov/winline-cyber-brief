const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = path.join(root, "data", "research");
const load = file => JSON.parse(fs.readFileSync(path.join(research, file), "utf8"));
const fail = message => {
  throw new Error(message);
};
const unique = (records, field, label) => {
  const values = records.map(record => record[field]);
  if (values.some(value => !value)) fail(`${label} contains an empty ${field}`);
  if (new Set(values).size !== values.length) fail(`${label} contains duplicate ${field}`);
};
const requireFields = (records, fields, label) => {
  for (const record of records) {
    for (const field of fields) {
      if (!(field in record)) fail(`${label} ${JSON.stringify(record)} misses ${field}`);
    }
  }
};
const requireReferences = (records, field, allowed, label) => {
  for (const record of records) {
    for (const value of record[field] || []) {
      if (!allowed.has(value)) fail(`${label} references missing ${field} value ${value}`);
    }
  }
};

const schema = load("schema.json");
const sourceDocument = load("sources.json");
const claimDocument = load("claims.json");
const organizationDocument = load("organizations.json");
const partnershipDocument = load("partnerships.json");
const tournamentDocument = load("tournaments.json");
const audienceDocument = load("tournament-audience.json");
const streamerDocument = load("streamers.json");
const observationDocument = load("streamer-observations.json");
const disciplineDocument = load("discipline-attractiveness.json");
const matrixDocument = load("matrices.json");

const sources = sourceDocument.sources;
const claims = claimDocument.claims;
const organizations = organizationDocument.organizations;
const partnerships = partnershipDocument.partnerships;
const tournaments = tournamentDocument.tournaments;
const audience = audienceDocument.audience_records;
const streamers = streamerDocument.streamers;
const observations = observationDocument.observations;
const disciplines = disciplineDocument.disciplines;
const competitorPortfolio = matrixDocument.competitor_portfolio;
const tournamentMatrix = matrixDocument.tournament_matrix;
const streamerBrandSignals = matrixDocument.streamer_brand_signals;
const streamerMatrix = matrixDocument.streamer_matrix;
const disciplineMatrix = matrixDocument.discipline_matrix;

unique(sources, "source_id", "sources");
unique(claims, "claim_id", "claims");
unique(organizations, "organization_id", "organizations");
unique(partnerships, "partnership_id", "partnerships");
unique(tournaments, "tournament_id", "tournaments");
unique(streamers, "streamer_id", "streamers");
unique(observations, "observation_id", "observations");
unique(disciplines, "discipline", "disciplines");
unique(competitorPortfolio, "brand_id", "competitor portfolio");
unique(tournamentMatrix, "tournament_id", "tournament matrix");
unique(disciplineMatrix, "discipline", "discipline matrix");

requireFields(sources, schema.required_source_fields, "sources");
requireFields(claims, schema.required_claim_fields, "claims");
requireFields(partnerships, schema.required_partnership_fields, "partnerships");
requireFields(audience, [
  "platform_scope",
  "language_scope",
  "geography_scope",
  "co_stream_scope",
  "china_scope"
], "audience");

const statuses = new Set(schema.evidence_statuses);
for (const records of [claims, partnerships, tournaments, audience, disciplines]) {
  for (const record of records) {
    if (!statuses.has(record.status)) fail(`Unsupported status ${record.status}`);
    if (record.confidence < 0 || record.confidence > 1) fail(`Invalid confidence ${record.confidence}`);
  }
}
const relationshipTypes = new Set(schema.relationship_types);
const relationshipCurrentStatuses = new Set(schema.relationship_current_statuses);
for (const partnership of partnerships) {
  if (!relationshipTypes.has(partnership.relationship_type)) fail(`Unsupported relationship type ${partnership.relationship_type}`);
  if (!relationshipCurrentStatuses.has(partnership.current_status)) fail(`Unsupported current status ${partnership.current_status}`);
}

const sourceIds = new Set(sources.map(item => item.source_id));
const claimIds = new Set(claims.map(item => item.claim_id));
const organizationIds = new Set(organizations.map(item => item.organization_id));
const tournamentIds = new Set(tournaments.map(item => item.tournament_id));
const snapshotIds = new Set(observationDocument.snapshots.map(item => item.snapshot_id));
for (const item of sources) {
  const url = new URL(item.url);
  if (!["http:", "https:"].includes(url.protocol)) fail(`Unsupported source URL ${item.url}`);
}
requireReferences(claims, "source_ids", sourceIds, "claims");
requireReferences(partnerships, "source_ids", sourceIds, "partnerships");
requireReferences(partnerships, "claim_ids", claimIds, "partnerships");
requireReferences(tournaments, "source_ids", sourceIds, "tournaments");
requireReferences(tournaments, "claim_ids", claimIds, "tournaments");
requireReferences(audience, "source_ids", sourceIds, "audience");

for (const partnership of partnerships) {
  if (!organizationIds.has(partnership.brand_id)) fail(`Missing brand ${partnership.brand_id}`);
  if (!organizationIds.has(partnership.asset_id)) fail(`Missing asset ${partnership.asset_id}`);
}
for (const record of audience) {
  if (!tournamentIds.has(record.tournament_id)) fail(`Missing tournament ${record.tournament_id}`);
}
for (const record of tournamentMatrix) {
  if (!tournamentIds.has(record.tournament_id)) fail(`Matrix references missing tournament ${record.tournament_id}`);
}
for (const record of streamerBrandSignals) {
  if (!snapshotIds.has(record.snapshot_id)) fail(`Matrix references missing snapshot ${record.snapshot_id}`);
}
for (const record of streamerMatrix) {
  if (!snapshotIds.has(record.snapshot_id)) fail(`Streamer matrix references missing snapshot ${record.snapshot_id}`);
  if (!streamers.some(streamer => streamer.streamer_id === record.streamer_id)) fail(`Streamer matrix references missing streamer ${record.streamer_id}`);
}
if (tournamentMatrix.length !== tournaments.length) fail("Tournament matrix coverage mismatch");
if (disciplineMatrix.length !== disciplines.length) fail("Discipline matrix coverage mismatch");

const sortedUnique = values => [...new Set(values)].sort((left, right) => left.localeCompare(right));
const expectedCompetitorPortfolio = sortedUnique(partnerships.map(record => record.brand_id)).map(brandId => {
  const records = partnerships.filter(record => record.brand_id === brandId);
  return {
    brand_id: brandId,
    sampled_relationship_count: records.length,
    asset_ids: sortedUnique(records.map(record => record.asset_id)),
    relationship_types: sortedUnique(records.map(record => record.relationship_type)),
    disciplines: sortedUnique(records.flatMap(record => record.disciplines)),
    statuses: sortedUnique(records.map(record => record.status)),
    current_statuses: sortedUnique(records.map(record => record.current_status)),
    current_public_signal_count: records.filter(record =>
      ["current_publicly_verified", "fresh_public_announcement", "active_by_public_term"].includes(record.current_status)
    ).length,
    needs_verification_count: records.filter(record =>
      record.current_status === "current_unverified"
    ).length,
    ended_or_expired_count: records.filter(record =>
      ["historical", "reported_expired"].includes(record.current_status)
    ).length
  };
});
if (JSON.stringify(expectedCompetitorPortfolio) !== JSON.stringify(competitorPortfolio)) {
  fail("Competitor portfolio matrix is stale");
}

const audienceByTournament = new Map(audience.map(record => [record.tournament_id, record]));
const expectedTournamentMatrix = tournaments.map(tournament => {
  const metric = audienceByTournament.get(tournament.tournament_id);
  return {
    tournament_id: tournament.tournament_id,
    name: tournament.name,
    discipline: tournament.discipline,
    organizer: tournament.organizer,
    start_date: tournament.start_date,
    end_date: tournament.end_date,
    prize_pool: tournament.prize_pool,
    peak_viewers: metric?.peak_viewers ?? null,
    average_viewers: metric?.average_viewers ?? null,
    hours_watched: metric?.hours_watched ?? null,
    audience_scope_complete: metric
      ? ["platform_scope", "language_scope", "geography_scope", "co_stream_scope", "china_scope"]
        .every(field => metric[field] !== null)
      : false,
    status: tournament.status,
    confidence: tournament.confidence
  };
});
if (JSON.stringify(expectedTournamentMatrix) !== JSON.stringify(tournamentMatrix)) {
  fail("Tournament matrix is stale");
}

const signalMap = new Map();
for (const observation of observations) {
  for (const signal of observation.observed_brand_signals) {
    const key = `${observation.snapshot_id}\u0000${signal.brand}`;
    const current = signalMap.get(key) || {
      snapshot_id: observation.snapshot_id,
      discipline: observation.discipline,
      event: observation.event,
      brand: signal.brand,
      channel_ids: new Set(),
      viewers_at_observation: 0,
      evidence_sources: new Set()
    };
    current.channel_ids.add(observation.streamer_id);
    current.viewers_at_observation += observation.viewers;
    for (const evidence of signal.evidence) current.evidence_sources.add(evidence.source);
    signalMap.set(key, current);
  }
}
const expectedSignals = [...signalMap.values()]
  .map(record => ({
    snapshot_id: record.snapshot_id,
    discipline: record.discipline,
    event: record.event,
    brand: record.brand,
    observed_channel_count: record.channel_ids.size,
    viewers_at_observation: record.viewers_at_observation,
    evidence_sources: [...record.evidence_sources].sort(),
    interpretation: "Observed promotion signal, not partnership proof."
  }))
  .sort((left, right) =>
    left.snapshot_id.localeCompare(right.snapshot_id) ||
    right.viewers_at_observation - left.viewers_at_observation ||
    left.brand.localeCompare(right.brand)
  );
if (JSON.stringify(expectedSignals) !== JSON.stringify(streamerBrandSignals)) {
  fail("Streamer brand signal matrix is stale");
}

const streamerById = new Map(streamers.map(record => [record.streamer_id, record]));
const expectedStreamerMatrix = observations
  .flatMap(observation => observation.observed_brand_signals.map(signal => {
    const streamer = streamerById.get(observation.streamer_id);
    return {
      snapshot_id: observation.snapshot_id,
      discipline: observation.discipline,
      event: observation.event,
      streamer_id: observation.streamer_id,
      streamer_login: streamer?.login ?? null,
      streamer_display_name: streamer?.display_name ?? observation.streamer_id,
      channel_url: streamer?.channel_url ?? null,
      viewers_at_observation: observation.viewers,
      brand: signal.brand,
      evidence_sources: sortedUnique(signal.evidence.map(evidence => evidence.source)),
      signal_status: signal.status,
      partnership_status: observation.partnership_status,
      interpretation: "Observed promotion signal, not partnership proof."
    };
  }))
  .sort((left, right) =>
    left.snapshot_id.localeCompare(right.snapshot_id) ||
    right.viewers_at_observation - left.viewers_at_observation ||
    left.streamer_display_name.localeCompare(right.streamer_display_name) ||
    left.brand.localeCompare(right.brand)
  );
if (JSON.stringify(expectedStreamerMatrix) !== JSON.stringify(streamerMatrix)) {
  fail("Streamer detail matrix is stale");
}

const expectedDisciplineMatrix = disciplines.map(discipline => {
  const disciplinePartnerships = partnerships.filter(record =>
    record.disciplines.includes(discipline.discipline)
  );
  const disciplineTournaments = tournaments.filter(record =>
    record.discipline === discipline.discipline
  );
  const snapshots = observationDocument.snapshots.filter(snapshot => {
    const normalized = snapshot.discipline.toLowerCase();
    return discipline.discipline === "cs2"
      ? normalized.includes("counter-strike")
      : normalized.replaceAll(" ", "") === discipline.discipline;
  });
  return {
    discipline: discipline.discipline,
    public_attractiveness_score: discipline.score,
    score_confidence: discipline.confidence,
    partnership_count: disciplinePartnerships.length,
    bookmaker_count: new Set(disciplinePartnerships.map(record => record.brand_id)).size,
    tournament_count: disciplineTournaments.length,
    snapshot_count: snapshots.length,
    observed_channels: snapshots.reduce((total, snapshot) => total + snapshot.channel_count, 0),
    viewers_at_observation: snapshots.reduce((total, snapshot) => total + snapshot.total_viewers, 0),
    measurement_quality: discipline.inputs.measurement_quality,
    status: discipline.status,
    caveat: "Public-data comparison, not ROI or unique reach."
  };
});
if (JSON.stringify(expectedDisciplineMatrix) !== JSON.stringify(disciplineMatrix)) {
  fail("Discipline matrix is stale");
}

for (const discipline of disciplines) {
  const weightTotal = Object.values(discipline.weights).reduce((total, value) => total + value, 0);
  if (Math.abs(weightTotal - 1) > 1e-9) fail(`Weights do not sum to one for ${discipline.discipline}`);
  const expected = Object.entries(discipline.weights).reduce(
    (total, [field, weight]) => total + discipline.inputs[field] * weight,
    0
  );
  if (Number(expected.toFixed(2)) !== discipline.score) fail(`Score mismatch for ${discipline.discipline}`);
}

const snapshotFiles = new Map([
  ["twitch:cs2", "data/raw/streams-cs2.json"],
  ["twitch:cs2-ewc-live", "data/raw/streams-cs2-ewc-live.json"],
  ["twitch:dota2", "data/raw/streams-dota2.json"]
]);
for (const snapshot of observationDocument.snapshots) {
  const relativePath = snapshotFiles.get(snapshot.snapshot_id);
  if (!relativePath) fail(`Unknown snapshot ${snapshot.snapshot_id}`);
  const raw = JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  const sourceRecords = Array.isArray(raw) ? raw : raw.data;
  const records = [...new Map(sourceRecords.map(record => [record.id, record])).values()];
  const viewers = records.map(record => record.viewer_count).sort((left, right) => right - left);
  const total = viewers.reduce((sum, value) => sum + value, 0);
  const top50 = viewers.slice(0, 50).reduce((sum, value) => sum + value, 0);
  if (snapshot.channel_count !== records.length) fail(`Channel count mismatch for ${snapshot.snapshot_id}`);
  if (snapshot.total_viewers !== total) fail(`Viewer total mismatch for ${snapshot.snapshot_id}`);
  if (snapshot.top_50_viewers !== top50) fail(`Top-50 mismatch for ${snapshot.snapshot_id}`);
}

if (streamerDocument.entity_count !== streamers.length) fail("Streamer entity count mismatch");
if (observationDocument.observation_count !== observations.length) fail("Observation count mismatch");

process.stdout.write(`${JSON.stringify({
  schema_version: schema.schema_version,
  sources: sources.length,
  claims: claims.length,
  organizations: organizations.length,
  partnerships: partnerships.length,
  tournaments: tournaments.length,
  audience_records: audience.length,
  streamers: streamers.length,
  observations: observations.length,
  disciplines: disciplines.length,
  status: "valid"
}, null, 2)}\n`);
