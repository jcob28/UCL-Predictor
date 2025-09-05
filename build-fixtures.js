// build-fixtures.js (CommonJS)
// Pobiera feed JSON z FixtureDownload i mapuje do data/fixtures.json
const fs = require('fs/promises');
const fetch = require('node-fetch');

const FEED_URL = 'https://fixturedownload.com/feed/json/champions-league-2025';

// Mapa skrótów nazw (opcjonalnie dopasuj do swoich nazw w UI)
const NAME_MAP = {
    'Man City': 'Manchester City',
    'Paris': 'Paris Saint-Germain',
    'Atleti': 'Atlético de Madrid',
    'Leverkusen': 'Bayer 04 Leverkusen',
    'Frankfurt': 'Eintracht Frankfurt',
    'Sporting CP': 'Sporting CP',
    'Union SG': 'Union Saint-Gilloise',
    'B. Dortmund': 'Borussia Dortmund',
    'Bayern München': 'Bayern München',
    'Qarabag': 'Qarabağ',
    'Copenhagen': 'Copenhagen',
    'Newcastle': 'Newcastle United',
    'Barcelona': 'Barcelona',
    'Inter': 'Inter',
    'Ajax': 'Ajax',
    'Juventus': 'Juventus',
    'Villarreal': 'Villarreal',
    'Benfica': 'Benfica',
    'Marseille': 'Marseille',
    'PSV': 'PSV Eindhoven',
    'Athletic Club': 'Athletic Club',
    'Arsenal': 'Arsenal',
    'Olympiacos': 'Olympiacos',
    'Pafos': 'Pafos',
    'Slavia Praha': 'Slavia Praha',
    'Bodø/Glimt': 'Bodø/Glimt',
    'Chelsea': 'Chelsea',
    'Atalanta': 'Atalanta',
    'Club Brugge': 'Club Brugge',
    'Monaco': 'Monaco',
    'Kairat Almaty': 'Kairat Almaty',
    'Napoli': 'Napoli',
    'Copenhagen': 'Copenhagen',
    'Leverkusen': 'Bayer 04 Leverkusen'
};

function normName(s){
    return NAME_MAP[s] || s;
}

function toISO(dateUtc){
    // wejście np. "2025-09-16 19:00:00Z" -> "2025-09-16"
    const d = (dateUtc || '').slice(0, 10);
    return d || null;
}

(async function main(){
    console.log('Downloading feed:', FEED_URL);
    const res = await fetch(FEED_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Spodziewana struktura elementu:
    // { MatchNumber, RoundNumber, DateUtc, HomeTeam, AwayTeam, ... }
    const fixtures = data.map((m, idx) => ({
        id: `MD${m.RoundNumber}-${String(m.MatchNumber).padStart(3, '0')}`,
        round: m.RoundNumber,
        date: toISO(m.DateUtc),
        home: normName(m.HomeTeam),
        away: normName(m.AwayTeam),
    }));

    // Podstawowa walidacja
    const perMd = {};
    for (const f of fixtures){
        perMd[f.round] = (perMd[f.round] || 0) + 1;
    }
    console.log('Counts per MD:', perMd, 'Total:', fixtures.length);

    await fs.mkdir('data', { recursive: true });
    await fs.writeFile('data/fixtures.json', JSON.stringify(fixtures, null, 2), 'utf-8');
    console.log('Wrote data/fixtures.json');
})().catch(err => {
    console.error(err);
    process.exit(1);
});