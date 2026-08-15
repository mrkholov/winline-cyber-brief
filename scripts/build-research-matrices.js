const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const research = path.join(root, "data", "research");
const load = file => JSON.parse(fs.readFileSync(path.join(research, file), "utf8"));
const unique = values => [...new Set(values)].sort((left, right) => left.localeCompare(right));
const partnershipDocument = load("partnerships.json");
const partnerships = partnershipDocument.partnerships;
const tournaments = load("tournaments.json").tournaments;
const audience = load("tournament-audience.json").audience_records;
const observationDocument = load("streamer-observations.json");
const streamerDocument = load("streamers.json");
const disciplines = load("discipline-attractiveness.json").disciplines;
const organizationDocument = load("organizations.json");
const sourceDocument = load("sources.json");
const claimDocument = load("claims.json");
const audienceByTournament = new Map(audience.map(record => [record.tournament_id, record]));
const streamerById = new Map(streamerDocument.streamers.map(record => [record.streamer_id, record]));

const brands = unique(partnerships.map(record => record.brand_id));
const competitorPortfolio = brands.map(brandId => {
  const records = partnerships.filter(record => record.brand_id === brandId);
  return {
    brand_id: brandId,
    sampled_relationship_count: records.length,
    asset_ids: unique(records.map(record => record.asset_id)),
    relationship_types: unique(records.map(record => record.relationship_type)),
    disciplines: unique(records.flatMap(record => record.disciplines)),
    statuses: unique(records.map(record => record.status)),
    current_statuses: unique(records.map(record => record.current_status)),
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

const tournamentMatrix = tournaments.map(tournament => {
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

const streamerSignalMap = new Map();
for (const observation of observationDocument.observations) {
  for (const signal of observation.observed_brand_signals) {
    const key = `${observation.snapshot_id}\u0000${signal.brand}`;
    const current = streamerSignalMap.get(key) || {
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
    streamerSignalMap.set(key, current);
  }
}
const streamerBrandSignals = [...streamerSignalMap.values()]
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

const streamerMatrix = observationDocument.observations
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
      evidence_sources: unique(signal.evidence.map(evidence => evidence.source)),
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

const disciplineMatrix = disciplines.map(discipline => {
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

const dataCompleteness = [
  {
    dataset: "partnerships",
    records: partnerships.length,
    available_fields: ["brand", "asset", "relationship_type", "discipline", "status", "sources"],
    missing_internal_fields: ["contract_value", "full_rights", "exclusivity", "activation_cost", "business_result"]
  },
  {
    dataset: "tournaments",
    records: tournaments.length,
    available_fields: ["dates", "discipline", "organizer", "prize_pool", "selected_audience_metrics"],
    missing_internal_fields: ["rights_cost", "production_cost", "registrations", "ftd", "ngr"]
  },
  {
    dataset: "streamers",
    records: observationDocument.observation_count,
    available_fields: ["point_in_time_viewers", "title", "tags", "selected_panel_links", "brand_signals"],
    missing_internal_fields: ["historical_average", "unique_reach", "age", "geo", "fee", "registrations", "ftd", "ngr"]
  }
];

const matrixDocument = {
  schema_version: "1.0.0",
  research_cutoff: "2026-08-15",
  competitor_portfolio: competitorPortfolio,
  tournament_matrix: tournamentMatrix,
  streamer_brand_signals: streamerBrandSignals,
  streamer_matrix: streamerMatrix,
  discipline_matrix: disciplineMatrix,
  data_completeness: dataCompleteness
};
const presentationDocument = {
  matrices: matrixDocument,
  organizations: organizationDocument,
  sources: sourceDocument,
  claims: claimDocument,
  partnerships: partnershipDocument
};

fs.writeFileSync(path.join(research, "matrices.json"), `${JSON.stringify(matrixDocument, null, 2)}\n`);
fs.writeFileSync(
  path.join(research, "presentation-data.js"),
  `window.WINLINE_RESEARCH_DATA=${JSON.stringify(presentationDocument)};\n`
);

process.stdout.write(`${JSON.stringify({
  competitor_rows: competitorPortfolio.length,
  tournament_rows: tournamentMatrix.length,
  streamer_brand_signal_rows: streamerBrandSignals.length,
  streamer_matrix_rows: streamerMatrix.length,
  discipline_rows: disciplineMatrix.length
}, null, 2)}\n`);
