const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "data", "research");
const schemaVersion = "1.0.0";
const observedAt = "2026-08-15";
const source = (sourceId, url, publisher, sourceType, publishedAt = null) => ({
  source_id: sourceId,
  url,
  publisher,
  source_type: sourceType,
  published_at: publishedAt,
  observed_at: observedAt,
  access: "public"
});
const organization = (organizationId, name, organizationType, disciplines = [], officialUrls = []) => ({
  organization_id: organizationId,
  name,
  organization_type: organizationType,
  disciplines,
  official_urls: officialUrls,
  observed_at: observedAt
});

const sources = [
  source("src:winline-about", "https://rabota.winline.ru/about", "Winline", "official"),
  source("src:winline-vp", "https://egw.news/esports/news/12497/winline-becomes-the-general-partner-of-virtuspro-TN0-6GxPa", "EGW.News", "secondary_media", "2022-01-04"),
  source("src:vp-partners", "https://virtus.pro/partners", "Virtus.pro", "official"),
  source("src:winline-tundra", "https://europeangaming.eu/portal/latest-news/2023/06/27/138264/tundra-esports-announces-new-partnership-deal-with-winline/", "Tundra Esports via European Gaming", "press_release", "2023-06-27"),
  source("src:tundra-exit", "https://dotesports.com/dota-2/news/tundra-esports-exits-dota-2", "Dot Esports", "secondary_media", "2026-06-01"),
  source("src:winline-gaimin", "https://www.gaimingladiators.gg/blog/gaimin-gladiators-and-winline-announce-partnership", "Gaimin Gladiators", "official", "2023-06-28"),
  source("src:gaimin-expiry", "https://richardlewis.substack.com/p/gaimin-gladiators-officially-file", "Richard Lewis", "secondary_media", "2025-10-04"),
  source("src:winline-magic", "https://tvgram.ru/counter_strike2/31032", "TVGram archive of WINLINE CS2", "social_archive", "2026-08-11"),
  source("src:winline-magic-secondary", "https://www.sports.ru/betting/industry/1117331198-winline-stal-betting-parterom-cs2-komandy-magic.html", "Sports.ru", "secondary_media", "2026-08-11"),
  source("src:paragon-pgl", "https://www.linkedin.com/posts/paragon-esports-events_paragon-partners-with-pgl-for-exclusive-russian-activity-7177784439706427393-0AlD", "Paragon Events", "official", "2024-03-18"),
  source("src:winline-esl", "https://www.cybersport.ru/tags/other/winline-stala-titulnym-sponsorom-russkoiazychnoi-transliatsii-turnirov-esl-po-dota-2-i-cs-go", "Cybersport.ru", "secondary_media", "2023-05-11"),
  source("src:winline-esl-current", "https://cybersport.metaratings.ru/news/gotika-i-tekhno-kak-winline-pokazhet-iem-cologne-major-russkoyazychnoi-auditorii-621321/", "Metaratings", "secondary_media", "2026-06-01"),
  source("src:winline-buster", "https://cyber.sports.ru/streamers-twitch/1115256016-buster-stal-liczom-winline.html", "Cyber.Sports.ru", "secondary_media", "2023-06-23"),
  source("src:winline-buster-current", "https://bookmaker-ratings.ru/news/buster-stavka-total-balshe-final-chm-2026/", "Рейтинг Букмекеров", "secondary_media", "2026-07-19"),
  source("src:team-spirit-partners", "https://teamspirit.gg/partners", "Team Spirit", "official"),
  source("src:betboom-team-interview", "https://esports.gg/news/counter-strike-2/betboom-ceo-hints-at-roster-changes/", "esports.gg", "secondary_media"),
  source("src:betboom-team-current", "https://betboom.team/", "BetBoom Team", "official"),
  source("src:betboom-cybershoke", "https://cyber.sports.ru/cs/1116601157-bloger-erik-shokov-vmeste-s-brendom-cybershoke-stal-partnerom-betboom-.html", "Cyber.Sports.ru", "secondary_media", "2025-01-16"),
  source("src:parivision", "https://parivision.gg/", "PARIVISION", "official"),
  source("src:parivision-partners", "https://parivision.gg/partners/", "PARIVISION", "official"),
  source("src:liga-gambit", "https://gambit.gg/cases/liga-stavok-x-gambit-esports-press-release", "Gambit Esports", "official", "2021-06-09"),
  source("src:liga-forze", "https://forze.gg/liga-stavok-stala-partnjorom-forze-esports/", "FORZE", "official", "2023-01-01"),
  source("src:liga-l1ga", "https://www.sports.ru/betting/industry/blogs/3381827.html", "Sports.ru", "secondary_media"),
  source("src:liga-l1ga-current", "https://esports.ru/news/mikhail-zhuravskij-rasskazal-chto-daet-lige-stavok-sponsorstvo-sostava-l1ga-team/", "Esports.ru", "secondary_media", "2025-11-26"),
  source("src:aurora-partners", "https://www.linkedin.com/posts/1xaffiliates_aurora-media-esports-activity-7460670278465986563-4weX", "1xBet Affiliates", "official", "2026-05-14"),
  source("src:aurora-current", "https://auroragg.com/partners", "Aurora Gaming", "official"),
  source("src:1xbet-pgl", "https://sbcnews.co.uk/europe/2025/02/14/1xbet-pgl-sponsorship/", "SBC News", "secondary_media", "2025-02-14"),
  source("src:1xbet-esl", "https://eslfaceitgroup.com/blog/2021/03/1xbet-becomes-official-global-betting-partner-for-esl-pro-tour-csgo-and-esl-one-dota-2/", "ESL FACEIT Group", "official", "2021-03-09"),
  source("src:1xbet-esl-extension", "https://www.dexerto.com/esports/esl-tight-lipped-on-controversial-1xbet-partnership-as-deal-is-extended-1918950/", "Dexerto", "secondary_media", "2022-08-25"),
  source("src:mouz-partners", "https://mousesports.com/partners/", "MOUZ", "official"),
  source("src:fonbet-mouz-merch", "https://www.sport-express.net/cybersport/esports/news/fonbet-i-mouz-vypustili-limitirovannuyu-kollekciyu-mercha-dlya-top-klientov-2341226/", "Sport-Express", "secondary_media", "2025-07-07"),
  source("src:fonbet-strogo", "https://sport24.ru/betting/news-745764-ambassador-fonbet-strogo-vyigral-3mln-rubley-na-stavkakh-counter-stike-i-dota-2", "Sport24", "secondary_media"),
  source("src:fonbet-strogo-current", "https://stavka.tv/bookmakers/fonbet/ambassador", "Ставка ТВ", "secondary_media"),
  source("src:fonbet-eleague", "https://cybersport.metaratings.ru/news/fonbet-media-eleague-novyi-kibersportivnyi-turnir-po-dota-2-394146/", "Metaratings", "secondary_media"),
  source("src:wss-dota-s2", "https://liquipedia.net/dota2/Winline_Star_Series/2", "Liquipedia", "database"),
  source("src:wss-cs2-s2", "https://liquipedia.net/counterstrike/Winline_Star_Series/Season_2", "Liquipedia", "database"),
  source("src:wpl-s3", "https://liquipedia.net/counterstrike/Winline_Pro_League/Season_3", "Liquipedia", "database"),
  source("src:wpl-s2-audience", "https://escharts.com/tournaments/csgo/winline-pro-league-season-2", "Esports Charts", "analytics"),
  source("src:wpl-s3-audience", "https://escharts.com/tournaments/csgo/winline-pro-league-season-3", "Esports Charts", "analytics"),
  source("src:d2cl-s17", "https://www.esportsearnings.com/events/10506-d2cl-2022-season-17", "Esports Earnings", "database"),
  source("src:betboom-dacha", "https://blast.tv/dota/tournaments/betboom-dacha-belgrade-2024", "BLAST", "official"),
  source("src:betboom-dacha-audience", "https://escharts.com/tournaments/dota2/betboom-dacha-belgrade-2024-dota2", "Esports Charts", "analytics"),
  source("src:fissure-universe-8", "https://fissure.pro/events/universe-ep8", "FISSURE", "official"),
  source("src:fissure-universe-8-audience", "https://www.offstage.ru/dota2/news/bolee-133-tys-chelovek-v-pike-smotreli-final-nizhnej-setki-fissure-universe-episode-8", "Offstage", "secondary_media"),
  source("src:betboom-streamers-10", "https://liquipedia.net/dota2/BetBoom_Streamers_Battle/10", "Liquipedia", "database"),
  source("src:pari-galaxy", "https://www.vedomosti.ru/sport/rb/news/pari-galaxy-strimnitsa-cs2", "Vedomosti Sport", "secondary_media"),
  source("src:standoff-2023", "https://www.cybersport.ru/tags/standoff-2/saints-stali-chempionami-winline-epic-standoff-2-major", "Cybersport.ru", "secondary_media", "2023-12-10"),
  source("src:standoff-2024", "https://liquipedia.net/lab/Standoff2/EPIC/Major/2024/Summer", "Liquipedia", "database"),
  source("src:standoff-2026", "https://www.cybersport.ru/tags/standoff-2/anonsirovany-otkrytyye-otborochnyye-k-winline-epik-standoff-2-mazhor-2026-1", "Cybersport.ru", "secondary_media", "2026-05-25"),
  source("src:ti-2026", "https://www.dota2.com/newsentry/678505520073540063", "Valve", "official", "2026-07-30"),
  source("src:ewc-2026", "https://esportsworldcup.com/en/press-releases/esports-world-cup-2026-grand-finale-to-be-staged-to-paris-historic-accor-arena-with-counter-strike-2-championship-final", "Esports World Cup", "official", "2026-07-28"),
  source("src:winline-escharts", "https://escharts.com/organizers/winline", "Esports Charts", "analytics")
].sort((left, right) => left.source_id.localeCompare(right.source_id));

const organizations = [
  organization("brand:winline", "Winline", "bookmaker", [], ["https://winline.ru/"]),
  organization("brand:betboom", "BetBoom", "bookmaker", [], ["https://betboom.ru/"]),
  organization("brand:pari", "PARI", "bookmaker", [], ["https://pari.ru/"]),
  organization("brand:liga-stavok", "Liga Stavok", "bookmaker", [], ["https://ligastavok.ru/"]),
  organization("brand:1xbet", "1xBet", "bookmaker", [], ["https://1xbet.com/"]),
  organization("brand:fonbet", "FONBET", "bookmaker", [], ["https://fon.bet/"]),
  organization("org:virtus-pro", "Virtus.pro", "esports_organization", ["cs2", "dota2", "standoff2"], ["https://virtus.pro/"]),
  organization("org:tundra", "Tundra Esports", "esports_organization", ["dota2"], ["https://tundraesports.com/"]),
  organization("org:gaimin", "Gaimin Gladiators", "esports_organization", ["dota2"], ["https://www.gaimingladiators.gg/"]),
  organization("org:magic", "MAGIC", "esports_team", ["cs2"], []),
  organization("org:betboom-team", "BetBoom Team", "esports_organization", ["cs2", "dota2"], ["https://betboom.team/"]),
  organization("org:team-spirit", "Team Spirit", "esports_organization", ["cs2", "dota2"], ["https://teamspirit.gg/"]),
  organization("org:cybershoke", "CYBERSHOKE", "esports_media_brand", ["cs2", "standoff2"], ["https://cybershoke.net/"]),
  organization("org:parivision", "PARIVISION", "esports_organization", ["cs2", "dota2"], ["https://parivision.gg/"]),
  organization("org:l1ga", "L1GA TEAM", "esports_team", ["dota2"], []),
  organization("org:gambit", "Gambit Esports", "esports_organization", ["cs2", "dota2"], ["https://gambit.gg/"]),
  organization("org:aurora", "Aurora Gaming", "esports_organization", ["cs2", "dota2"], ["https://auroragg.com/"]),
  organization("org:mouz", "MOUZ", "esports_organization", ["cs2"], ["https://mousesports.com/"]),
  organization("org:paragon", "Paragon Events", "broadcast_operator", ["cs2", "dota2"], []),
  organization("org:pgl", "PGL", "tournament_operator", ["cs2", "dota2"], ["https://www.pglesports.com/"]),
  organization("org:esl", "ESL FACEIT Group", "tournament_operator", ["cs2", "dota2"], ["https://eslfaceitgroup.com/"]),
  organization("person:buster", "Buster", "streamer", ["cs2"], ["https://www.twitch.tv/buster"]),
  organization("person:strogo", "StRoGo", "streamer", ["cs2", "dota2"], ["https://www.twitch.tv/strogo"])
].sort((left, right) => left.organization_id.localeCompare(right.organization_id));

const partnershipSeed = [
  ["winline-vp", "brand:winline", "org:virtus-pro", "general_partner", ["cs2", "dota2"], "2022-01-01", "2024-12-31", "historical", "corroborated", 0.96, ["src:winline-about", "src:winline-vp", "src:vp-partners"], ["jersey", "media", "events", "merchandise"]],
  ["winline-tundra", "brand:winline", "org:tundra", "main_partner", ["dota2"], "2023-06-27", null, "historical", "corroborated", 0.94, ["src:winline-tundra", "src:tundra-exit"], ["jersey", "nickname_tag", "website_branding", "social", "online_activation", "offline_activation"]],
  ["winline-gaimin", "brand:winline", "org:gaimin", "sponsor", ["dota2"], "2023-06-28", null, "reported_expired", "reported", 0.9, ["src:winline-gaimin", "src:gaimin-expiry"], []],
  ["winline-magic", "brand:winline", "org:magic", "sponsor", ["cs2"], "2026-08-11", null, "fresh_public_announcement", "corroborated", 0.96, ["src:winline-magic", "src:winline-magic-secondary"], ["jersey"]],
  ["winline-pgl", "brand:winline", "org:pgl", "broadcast_sponsor", ["cs2", "dota2"], "2024-03-18", null, "current_unverified", "official", 0.97, ["src:paragon-pgl"], ["russian_language_broadcast_sponsorship", "event_activation", "community_cast"]],
  ["winline-esl", "brand:winline", "org:esl", "broadcast_sponsor", ["cs2", "dota2"], "2023-05-11", null, "current_publicly_verified", "corroborated", 0.96, ["src:winline-esl", "src:winline-esl-current"], ["russian_language_broadcast_sponsorship", "viewer_activation", "community_cast"]],
  ["winline-buster", "brand:winline", "person:buster", "ambassador", ["cs2"], "2023-06-23", null, "current_publicly_verified", "corroborated", 0.96, ["src:winline-buster", "src:winline-buster-current"], ["community_cast", "content"]],
  ["betboom-team", "brand:betboom", "org:betboom-team", "general_partner", ["cs2", "dota2"], "2022-04-18", null, "current_unverified", "corroborated", 0.8, ["src:betboom-team-interview", "src:betboom-team-current"], ["naming", "main_sponsorship"]],
  ["betboom-spirit", "brand:betboom", "org:team-spirit", "title_partner", ["cs2", "dota2"], "2024-04-01", null, "current_publicly_verified", "official", 0.98, ["src:team-spirit-partners"], ["jersey", "content"]],
  ["betboom-cybershoke", "brand:betboom", "org:cybershoke", "sponsor", ["cs2", "standoff2"], "2025-01-16", null, "current_unverified", "corroborated", 0.78, ["src:betboom-cybershoke"], ["ambassador", "team", "platform"]],
  ["pari-parivision", "brand:pari", "org:parivision", "general_partner", ["cs2", "dota2"], null, null, "current_publicly_verified", "official", 0.98, ["src:parivision", "src:parivision-partners"], ["team_development", "content"]],
  ["liga-l1ga", "brand:liga-stavok", "org:l1ga", "title_partner", ["dota2"], "2024-01-05", null, "current_unverified", "corroborated", 0.86, ["src:liga-l1ga", "src:liga-l1ga-current"], ["naming", "team_sponsorship"]],
  ["liga-gambit", "brand:liga-stavok", "org:gambit", "general_partner", ["cs2", "dota2"], "2021-06-09", "2022-06-09", "historical", "official", 0.99, ["src:liga-gambit"], ["fan_activation"]],
  ["1xbet-aurora", "brand:1xbet", "org:aurora", "title_partner", ["cs2", "dota2"], "2022-03-01", null, "current_publicly_verified", "official", 0.96, ["src:aurora-partners", "src:aurora-current"], ["jersey", "social", "content"]],
  ["1xbet-pgl", "brand:1xbet", "org:pgl", "betting_partner", ["cs2", "dota2"], "2025-02-14", "2026-12-31", "active_by_public_term", "corroborated", 0.92, ["src:1xbet-pgl"], ["betting_exclusivity", "live_streams", "broadcast_branding"]],
  ["1xbet-esl", "brand:1xbet", "org:esl", "betting_partner", ["cs2", "dota2"], "2021-03-09", null, "active_by_public_term", "reported", 0.82, ["src:1xbet-esl", "src:1xbet-esl-extension"], ["broadcast_segments", "predictions", "brand_placement"]],
  ["fonbet-mouz", "brand:fonbet", "org:mouz", "sponsor", ["cs2"], "2023-12-01", null, "current_publicly_verified", "official", 0.98, ["src:mouz-partners", "src:fonbet-mouz-merch"], ["team_sponsorship", "promotions", "merchandise"]],
  ["fonbet-strogo", "brand:fonbet", "person:strogo", "streamer_partner", ["cs2", "dota2"], null, null, "current_publicly_verified", "corroborated", 0.88, ["src:fonbet-strogo", "src:fonbet-strogo-current"], ["streams", "integrations"]]
];

const partnerships = partnershipSeed.map(item => {
  const [id, brandId, assetId, relationshipType, disciplines, validFrom, validTo, currentStatus, status, confidence, sourceIds, rights] = item;
  return {
    partnership_id: `partnership:${id}`,
    brand_id: brandId,
    asset_id: assetId,
    relationship_type: relationshipType,
    disciplines,
    valid_from: validFrom,
    valid_to: validTo,
    current_status: currentStatus,
    exclusivity: null,
    rights,
    activation_examples: [],
    status,
    confidence,
    observed_at: observedAt,
    claim_ids: [`claim:partnership:${id}`],
    source_ids: sourceIds
  };
}).sort((left, right) => left.partnership_id.localeCompare(right.partnership_id));

const tournamentSeed = [
  ["wss-s2-dota", "WINLINE Star Series Season 2", "dota2", "Winline", "2026-01-22", "2026-02-01", "Online", 3500000, "RUB", "corroborated", 0.94, "src:wss-dota-s2"],
  ["wss-s2-cs2", "WINLINE Star Series Season 2", "cs2", "Winline", "2026-02-25", "2026-03-08", "Online", 3500000, "RUB", "corroborated", 0.95, "src:wss-cs2-s2"],
  ["wpl-s2", "Winline Pro League Season 2", "cs2", "Winline / FACEIT", "2024-10-21", "2024-11-03", "Russia, online", 3580000, "RUB", "corroborated", 0.92, "src:wpl-s2-audience"],
  ["wpl-s3", "Winline Pro League Season 3", "cs2", "Winline / FACEIT", "2025-09-09", "2025-09-21", "Russia, online", 4615000, "RUB", "corroborated", 0.94, "src:wpl-s3"],
  ["d2cl-s17", "Dota 2 Champions League Season 17", "dota2", "Epic Esports Events", "2022-12-01", "2022-12-10", "Online", 50000, "USD", "corroborated", 0.93, "src:d2cl-s17"],
  ["betboom-dacha-2024", "BetBoom Dacha Belgrade 2024", "dota2", "FISSURE / BetBoom", "2024-10-19", "2024-10-26", "Belgrade, Serbia", 1000000, "USD", "corroborated", 0.97, "src:betboom-dacha"],
  ["fissure-universe-8", "FISSURE Universe Episode 8", "dota2", "FISSURE", "2026-01-21", "2026-02-01", "Online", 250000, "USD", "official", 0.99, "src:fissure-universe-8"],
  ["betboom-streamers-10", "BetBoom Streamers Battle 10", "dota2", "FISSURE / BetBoom", "2025-05-29", "2025-06-08", "Online", 5000000, "RUB", "corroborated", 0.9, "src:betboom-streamers-10"],
  ["pari-galaxy", "PARI GALAXY: СТРИМНИЦА", "cs2", "PARI", "2026-02-18", "2026-02-21", "Moscow, final LAN", 1000000, "RUB", "reported", 0.9, "src:pari-galaxy"],
  ["standoff-major-2023", "WINLINE EPIC Standoff 2 Winter Major 2023", "standoff2", "Epic Esports Events", "2023-12-06", "2023-12-10", "Moscow, VK Play Arena", 3000000, "RUB", "corroborated", 0.97, "src:standoff-2023"],
  ["standoff-major-2024", "WINLINE EPIC Standoff 2 Summer Major 2024", "standoff2", "Epic Esports Events", "2024-07-10", "2024-07-14", "Moscow", 3000000, "RUB", "corroborated", 0.94, "src:standoff-2024"],
  ["standoff-major-2026", "WINLINE EPIC Standoff 2 Jumble Rumble Major", "standoff2", "Epic Esports Events", "2026-07-04", "2026-08-02", "Moscow, final LAN", 6000000, "RUB", "corroborated", 0.94, "src:standoff-2026"],
  ["ti-2026", "The International 2026", "dota2", "Valve / PGL", "2026-08-13", "2026-08-23", "Shanghai, China", null, null, "in_progress", 0.99, "src:ti-2026"],
  ["ewc-2026-cs2", "Esports World Cup 2026 — Counter-Strike 2", "cs2", "Esports World Cup", "2026-08-12", "2026-08-23", "Paris, France", 2000000, "USD", "in_progress", 0.98, "src:ewc-2026"]
];

const tournaments = tournamentSeed.map(item => {
  const [id, name, discipline, organizer, startDate, endDate, location, amount, currency, status, confidence, sourceId] = item;
  return {
    tournament_id: `tournament:${id}`,
    name,
    discipline,
    organizer,
    start_date: startDate,
    end_date: endDate,
    location,
    prize_pool: amount === null ? null : { amount, currency },
    team_count: null,
    sponsor_ids: [],
    rights: [],
    status,
    confidence,
    observed_at: observedAt,
    claim_ids: [`claim:tournament:${id}`],
    source_ids: [sourceId]
  };
}).sort((left, right) => left.tournament_id.localeCompare(right.tournament_id));

const audience = [
  ["wpl-s2", 817, 244, 13511, 56, "src:wpl-s2-audience", 0.8],
  ["wpl-s3", 21485, 2448, 150735, 62, "src:wpl-s3-audience", 0.82],
  ["betboom-dacha-2024", 258079, null, 11540642, null, "src:betboom-dacha-audience", 0.88],
  ["fissure-universe-8", 133654, 41006, 2135679, 52.083, "src:fissure-universe-8-audience", 0.91],
  ["standoff-major-2023", 35132, null, 308588, null, "src:winline-escharts", 0.82],
  ["standoff-major-2024", 9856, null, 176257, 42, "src:winline-escharts", 0.82]
].map(item => {
  const [id, peakViewers, averageViewers, hoursWatched, airtimeHours, sourceId, confidence] = item;
  return {
    tournament_id: `tournament:${id}`,
    peak_viewers: peakViewers,
    average_viewers: averageViewers,
    hours_watched: hoursWatched,
    airtime_hours: airtimeHours,
    platform_scope: null,
    language_scope: null,
    geography_scope: null,
    co_stream_scope: null,
    china_scope: null,
    methodology: "public_source_scope_not_fully_disclosed",
    status: "reported",
    confidence,
    observed_at: observedAt,
    source_ids: [sourceId]
  };
});

const claims = [
  ...partnerships.map(partnership => ({
    claim_id: partnership.claim_ids[0],
    subject_id: partnership.brand_id,
    predicate: partnership.relationship_type,
    object_id: partnership.asset_id,
    value: null,
    status: partnership.status,
    confidence: partnership.confidence,
    valid_from: partnership.valid_from,
    valid_to: partnership.valid_to,
    observed_at: observedAt,
    source_ids: partnership.source_ids,
    notes: partnership.current_status
  })),
  ...tournaments.map(tournament => ({
    claim_id: tournament.claim_ids[0],
    subject_id: tournament.tournament_id,
    predicate: "tournament_metadata",
    object_id: null,
    value: {
      discipline: tournament.discipline,
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      prize_pool: tournament.prize_pool
    },
    status: tournament.status,
    confidence: tournament.confidence,
    valid_from: tournament.start_date,
    valid_to: tournament.end_date,
    observed_at: observedAt,
    source_ids: tournament.source_ids,
    notes: null
  })),
  {
    claim_id: "claim:qualification:betboom-team-ownership",
    subject_id: "brand:betboom",
    predicate: "owns",
    object_id: "org:betboom-team",
    value: false,
    status: "rejected",
    confidence: 0.98,
    valid_from: null,
    valid_to: null,
    observed_at: observedAt,
    source_ids: ["src:betboom-team-interview"],
    notes: "Public interview describes separate organizations and a naming-rights sponsorship."
  },
  {
    claim_id: "claim:qualification:parivision-ownership",
    subject_id: "brand:pari",
    predicate: "ownership_status",
    object_id: "org:parivision",
    value: "not_established_in_reviewed_sources",
    status: "reported",
    confidence: 0.9,
    valid_from: null,
    valid_to: null,
    observed_at: observedAt,
    source_ids: ["src:parivision"],
    notes: "General sponsorship is public; legal ownership was not established."
  },
  {
    claim_id: "claim:rumor:gaimin-renewal-value",
    subject_id: "org:gaimin",
    predicate: "reported_lost_renewal_value",
    object_id: "brand:winline",
    value: { amount: 3000000, currency: "USD" },
    status: "rumor",
    confidence: 0.52,
    valid_from: null,
    valid_to: null,
    observed_at: observedAt,
    source_ids: ["src:gaimin-expiry"],
    notes: "Not suitable for fact-only views."
  }
].sort((left, right) => left.claim_id.localeCompare(right.claim_id));

const weights = {
  audience_scale: 0.3,
  calendar_density: 0.2,
  bookmaker_saturation: 0.15,
  winline_presence: 0.15,
  measurement_quality: 0.2
};
const observationDocument = JSON.parse(
  fs.readFileSync(path.join(output, "streamer-observations.json"), "utf8")
);
const scoreByThresholds = (value, thresholds) =>
  1 + thresholds.filter(threshold => value >= threshold).length;
const disciplineNames = ["cs2", "dota2", "standoff2"];
const snapshotDiscipline = value => {
  const normalized = value.toLowerCase().replaceAll(" ", "");
  if (normalized.includes("counter-strike")) return "cs2";
  return normalized;
};
const disciplines = disciplineNames.map(discipline => {
  const snapshots = observationDocument.snapshots.filter(
    snapshot => snapshotDiscipline(snapshot.discipline) === discipline
  );
  const disciplineTournaments = tournaments.filter(tournament => tournament.discipline === discipline);
  const disciplinePartnerships = partnerships.filter(partnership =>
    partnership.disciplines.includes(discipline)
  );
  const bookmakerCount = new Set(disciplinePartnerships.map(partnership => partnership.brand_id)).size;
  const winlineRelationshipCount = disciplinePartnerships.filter(
    partnership => partnership.brand_id === "brand:winline"
  ).length;
  const winlineTournamentCount = disciplineTournaments.filter(tournament =>
    tournament.name.toLowerCase().includes("winline")
  ).length;
  const audienceRecordCount = audience.filter(record =>
    disciplineTournaments.some(tournament => tournament.tournament_id === record.tournament_id)
  ).length;
  const maxTop50Viewers = snapshots.length
    ? Math.max(...snapshots.map(snapshot => snapshot.top_50_viewers))
    : 0;
  const audienceScale = scoreByThresholds(maxTop50Viewers, [10000, 50000, 100000, 200000]);
  const calendarDensity = scoreByThresholds(disciplineTournaments.length, [1, 2, 4, 6]);
  const bookmakerSaturation = scoreByThresholds(bookmakerCount, [1, 2, 4, 6]);
  const winlinePresence = scoreByThresholds(
    winlineRelationshipCount + winlineTournamentCount,
    [1, 2, 4, 6]
  );
  const measurementQuality = scoreByThresholds(
    snapshots.length * 2 + audienceRecordCount,
    [1, 2, 4, 6]
  );
  const snapshotIds = snapshots.map(snapshot => snapshot.snapshot_id);
  const score = Number((
    audienceScale * weights.audience_scale +
    calendarDensity * weights.calendar_density +
    bookmakerSaturation * weights.bookmaker_saturation +
    winlinePresence * weights.winline_presence +
    measurementQuality * weights.measurement_quality
  ).toFixed(2));
  return {
    discipline,
    period: "public_data_available_by_2026-08-15",
    score,
    score_scale: "1..5",
    formula_version: "public-attractiveness-v1",
    weights,
    inputs: {
      audience_scale: audienceScale,
      calendar_density: calendarDensity,
      bookmaker_saturation: bookmakerSaturation,
      winline_presence: winlinePresence,
      measurement_quality: measurementQuality
    },
    input_provenance: {
      max_top_50_viewers: maxTop50Viewers,
      tournament_count: disciplineTournaments.length,
      bookmaker_count: bookmakerCount,
      winline_relationship_count: winlineRelationshipCount,
      winline_tournament_count: winlineTournamentCount,
      twitch_snapshot_count: snapshots.length,
      audience_record_count: audienceRecordCount,
      count_thresholds: [1, 2, 4, 6],
      audience_thresholds: [10000, 50000, 100000, 200000],
      source_files: [
        "data/research/partnerships.json",
        "data/research/tournaments.json",
        "data/research/tournament-audience.json",
        "data/research/streamer-observations.json"
      ]
    },
    twitch_snapshot_ids: snapshotIds,
    status: "inferred",
    confidence: discipline === "standoff2" ? 0.45 : 0.68,
    limitations: [
      "Public-data score, not ROI.",
      "RU-language audience is not equivalent to Russian geography.",
      "Contract costs, FTD, NGR, retention and internal rights are unavailable."
    ],
    observed_at: observedAt
  };
});

const write = (file, key, data, extra = {}) => {
  fs.writeFileSync(path.join(output, file), `${JSON.stringify({
    schema_version: schemaVersion,
    research_cutoff: observedAt,
    ...extra,
    [key]: data
  }, null, 2)}\n`);
};

fs.mkdirSync(output, { recursive: true });
write("sources.json", "sources", sources, { source_count: sources.length });
write("organizations.json", "organizations", organizations, { organization_count: organizations.length });
write("partnerships.json", "partnerships", partnerships, { partnership_count: partnerships.length });
write("tournaments.json", "tournaments", tournaments, { tournament_count: tournaments.length });
write("tournament-audience.json", "audience_records", audience, { audience_record_count: audience.length });
write("claims.json", "claims", claims, { claim_count: claims.length });
write("discipline-attractiveness.json", "disciplines", disciplines, {
  formula_version: "public-attractiveness-v1",
  score_status: "comparative_public_data_score_not_roi"
});

process.stdout.write(`${JSON.stringify({
  sources: sources.length,
  organizations: organizations.length,
  partnerships: partnerships.length,
  tournaments: tournaments.length,
  audience_records: audience.length,
  claims: claims.length,
  disciplines: disciplines.length
}, null, 2)}\n`);
