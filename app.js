/* UCL 2025/26 Predictor — vanilla JS (1/X/2 + Knockout bracket) */
(function () {
  const matchesEl = document.getElementById('matchesContainer');
  const teamFilterEl = document.getElementById('teamFilter');
  const fileInput = document.getElementById('fileInput');
  const shareBtn = document.getElementById('shareBtn');
  const resetBtn = document.getElementById('resetBtn');
  const standingsTable = document.getElementById('standingsTable').querySelector('tbody');

  let fixtures = [];
  let teams = [];
  let picks = {};
  let koPicks = {};

  const STORAGE_KEY = 'ucl2025_26_picks_v1';
  const STORAGE_KO_KEY = 'ucl2025_26_ko_v1';

  function saveToLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(picks)); } catch {}
    try { localStorage.setItem(STORAGE_KO_KEY, JSON.stringify(koPicks)); } catch {}
  }

  function loadFromLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) picks = JSON.parse(raw) || {};
    } catch {}
    try {
      const rawKO = localStorage.getItem(STORAGE_KO_KEY);
      if (rawKO) koPicks = JSON.parse(rawKO) || {};
    } catch {}
  }

  function encodeStateToURL() {
    try {
      const payload = JSON.stringify({ picks, koPicks });
      const b64 = btoa(unescape(encodeURIComponent(payload)));
      const url = new URL(location.href);
      url.searchParams.set('s', b64);
      history.replaceState(null, '', url.toString());
    } catch {}
  }

  function loadStateFromURL() {
    const url = new URL(location.href);
    const s = url.searchParams.get('s');
    if (!s) return false;
    try {
      const json = decodeURIComponent(escape(atob(s)));
      const obj = JSON.parse(json) || {};
      if (obj.picks) picks = obj.picks;
      if (obj.koPicks) koPicks = obj.koPicks;
      return true;
    } catch { return false; }
  }

  function renderTeamFilter() {
    const prev = teamFilterEl.value || '';
    teamFilterEl.innerHTML = '<option value="">— Filter: club —</option>'
        + teams.map(t => `<option value="${escapeHTML(t)}">${escapeHTML(t)}</option>`).join('');
    teamFilterEl.value = prev;
  }

  function groupByRound(list) {
    const map = new Map();
    list.forEach(m => {
      const r = m.round ?? 0;
      if (!map.has(r)) map.set(r, []);
      map.get(r).push(m);
    });
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        const pa = picks[a.id] ? 1 : 0;
        const pb = picks[b.id] ? 1 : 0;
        if (pa !== pb) return pa - pb;
        const da = a.date || '', db = b.date || '';
        if (da !== db) return da.localeCompare(db);
        return `${a.home}–${a.away}`.localeCompare(`${b.home}–${b.away}`, 'en');
      });
    }
    return map;
  }

  const CRESTS = {
    "Ajax": "img/crests/ajax.svg",
    "Arsenal": "img/crests/arsenal.svg",
    "Atalanta": "img/crests/atalanta.svg",
    "Athletic Club": "img/crests/athletic-club.svg",
    "Atlético de Madrid": "img/crests/atletico-madrid.svg",
    "Barcelona": "img/crests/barcelona.svg",
    "Bayer 04 Leverkusen": "img/crests/bayer-leverkusen.svg",
    "Bayern München": "img/crests/bayern-munchen.svg",
    "Benfica": "img/crests/benfica.svg",
    "Bodø/Glimt": "img/crests/bodo-glimt.svg",
    "Borussia Dortmund": "img/crests/borussia-dortmund.svg",
    "Chelsea": "img/crests/chelsea.svg",
    "Club Brugge": "img/crests/club-brugge.svg",
    "Copenhagen": "img/crests/copenhagen.svg",
    "Eintracht Frankfurt": "img/crests/eintracht-frankfurt.svg",
    "Galatasaray": "img/crests/galatasaray.svg",
    "Inter": "img/crests/inter.svg",
    "Juventus": "img/crests/juventus.svg",
    "Kairat Almaty": "img/crests/kairat.svg",
    "Liverpool": "img/crests/liverpool.svg",
    "Manchester City": "img/crests/manchester-city.svg",
    "Marseille": "img/crests/marseille.svg",
    "Monaco": "img/crests/as-monaco.svg",
    "Napoli": "img/crests/napoli.svg",
    "Olympiacos": "img/crests/olympiacos.svg",
    "Pafos": "img/crests/paphos.svg",
    "Paris Saint-Germain": "img/crests/paris-saint-germain.svg",
    "PSV Eindhoven": "img/crests/psv.svg",
    "Qarabağ": "img/crests/qarabag.svg",
    "Real Madrid": "img/crests/real-madrid.svg",
    "Slavia Praha": "img/crests/slavia-praha.svg",
    "Sporting CP": "img/crests/sporting.svg",
    "Tottenham": "img/crests/tottenham.svg",
    "Union Saint-Gilloise": "img/crests/union-saint-gilloise.svg",
    "Villarreal": "img/crests/villarreal.svg",
    "Newcastle United": "img/crests/newcastle.svg"
  };

  function crestFor(team) {
    return CRESTS[team] || "img/crests/_placeholder.svg";
  }

  function teamChip(name) {
    const safe = escapeHTML(name);
    const src = crestFor(name);
    return `<span class="teamchip">
      <img alt="" src="${src}" width="18" height="18" loading="lazy" />
      <span>${safe}</span>
    </span>`;
  }

  function setPick(matchId, code) {
    if (picks[matchId] === code) delete picks[matchId];
    else picks[matchId] = code;
    saveToLocal();
    encodeStateToURL();
    renderMatches();
    renderStandings();
  }

  function renderMatches() {
    const filter = teamFilterEl.value;
    const frag = document.createDocumentFragment();
    const grouped = groupByRound(fixtures);

    [...grouped.keys()].sort((a, b) => a - b).forEach(round => {
      const section = document.createElement('section');
      section.className = 'md-section';

      const header = document.createElement('div');
      header.className = 'md-header';
      const left = document.createElement('div');
      left.className = 'md-title';
      const total = (grouped.get(round) || []).length;
      const done = (grouped.get(round) || []).filter(m => !!picks[m.id]).length;
      left.innerHTML = `<strong>Matchday #${round}</strong> <span class="md-counter">${done}/${total}</span>`;
      const toggle = document.createElement('button');
      toggle.className = 'md-toggle';
      toggle.textContent = '−';
      const body = document.createElement('div');
      body.className = 'md-body';
      toggle.addEventListener('click', () => {
        body.classList.toggle('collapsed');
        toggle.textContent = body.classList.contains('collapsed') ? '+' : '−';
      });
      header.appendChild(left);
      header.appendChild(toggle);

      (grouped.get(round) || []).forEach(m => {
        if (filter && m.home !== filter && m.away !== filter) return;
        const wrap = document.createElement('div');
        wrap.className = 'match' + (picks[m.id] ? ' picked' : '');
        wrap.dataset.id = m.id;

        const row = document.createElement('div');
        row.className = 'match-row';

        const meta = document.createElement('div');
        meta.className = 'match-meta';
        meta.textContent = m.date ? fmtDate(new Date(m.date)) : '';

        const teamsCol = document.createElement('div');
        teamsCol.className = 'teams-interactive';

        const btnHome = document.createElement('button');
        btnHome.className = 'chip-btn home' + (picks[m.id] === '1' ? ' active' : '');
        btnHome.innerHTML = teamChip(m.home);
        btnHome.title = 'Home win';
        btnHome.addEventListener('click', () => setPick(m.id, '1'));

        const btnDraw = document.createElement('button');
        btnDraw.className = 'chip-btn draw' + ((picks[m.id] || '').toUpperCase() === 'X' ? ' active' : '');
        btnDraw.innerHTML = '<span class="draw-mark">X</span>';
        btnDraw.title = 'Draw';
        btnDraw.addEventListener('click', () => setPick(m.id, 'X'));

        const btnAway = document.createElement('button');
        btnAway.className = 'chip-btn away' + (picks[m.id] === '2' ? ' active' : '');
        btnAway.innerHTML = teamChip(m.away);
        btnAway.title = 'Away win';
        btnAway.addEventListener('click', () => setPick(m.id, '2'));

        teamsCol.append(btnHome, btnDraw, btnAway);
        row.append(meta, teamsCol);
        wrap.appendChild(row);
        body.appendChild(wrap);
      });

      section.append(header, body);
      frag.appendChild(section);
    });

    matchesEl.innerHTML = '';
    matchesEl.appendChild(frag);
  }

  function renderStandings() {
    const table = computeStandings();
    const frag = document.createDocumentFragment();

    table.forEach((row, idx) => {
      const tr = document.createElement('tr');
      const pos = idx + 1;
      if (pos <= 8) tr.classList.add('zone-advance');
      else if (pos <= 24) tr.classList.add('zone-playoff');
      else tr.classList.add('zone-out');

      tr.innerHTML = `
        <td class="rank-badge">${idx+1}</td>
        <td class="team-cell">${teamChip(row.team)}</td>
        <td>${row.M}</td>
        <td>${row.W}</td>
        <td>${row.D}</td>
        <td>${row.L}</td>
        <td><strong>${row.Pts}</strong></td>
      `;
      frag.appendChild(tr);
    });

    standingsTable.innerHTML = '';
    standingsTable.appendChild(frag);
    renderBracket();
  }

  function computeStandings() {
    const table = {};
    teams.forEach(t => table[t] = { team: t, M: 0, W: 0, D: 0, L: 0, Pts: 0 });

    fixtures.forEach(m => {
      const pick = picks[m.id];
      if (!pick) return;
      table[m.home].M++; table[m.away].M++;

      if (pick === '1') {
        table[m.home].W++; table[m.away].L++;
        table[m.home].Pts += 3;
      } else if (pick === '2') {
        table[m.away].W++; table[m.home].L++;
        table[m.away].Pts += 3;
      } else if (String(pick).toUpperCase() === 'X') {
        table[m.home].D++; table[m.away].D++;
        table[m.home].Pts += 1; table[m.away].Pts += 1;
      }
    });

    return Object.values(table).sort((a, b) => {
      if (b.Pts !== a.Pts) return b.Pts - a.Pts;
      if (b.W !== a.W) return b.W - a.W;
      return a.team.localeCompare(b.team, 'en', { sensitivity: 'base' });
    });
  }

  function makeId(...parts) { return parts.join('_'); }

  function buildKnockoutFromTable(table) {
    const seeds = table.slice(0, 8).map(r => r.team);
    const playoffs = table.slice(8, 24).map(r => r.team);

    const PO_pairs = [];
    for (let i = 0; i < playoffs.length / 2; i++) {
      const home = playoffs[i];
      const away = playoffs[playoffs.length - 1 - i];
      PO_pairs.push({ id: makeId('PO', i + 1), round: 'PO', home, away });
    }

    const R16_pairs = seeds.map((seedTeam, i) => ({
      id: makeId('R16', i + 1), round: 'R16',
      home: seedTeam, awayFrom: makeId('PO', i + 1)
    }));

    const QF_pairs = Array.from({ length: 4 }, (_, i) =>
        ({ id: makeId('QF', i + 1), round: 'QF', fromA: makeId('R16', 2 * i + 1), fromB: makeId('R16', 2 * i + 2) }));
    const SF_pairs = Array.from({ length: 2 }, (_, i) =>
        ({ id: makeId('SF', i + 1), round: 'SF', fromA: makeId('QF', 2 * i + 1), fromB: makeId('QF', 2 * i + 2) }));
    const F_pair = [{ id: makeId('F', 1), round: 'F', fromA: makeId('SF', 1), fromB: makeId('SF', 2) }];

    return { PO_pairs, R16_pairs, QF_pairs, SF_pairs, F_pair };
  }

  function KO_winner(tie) { return koPicks[tie.id] || null; }
  function KO_setWinner(tieId, team) {
    if (koPicks[tieId] === team) delete koPicks[tieId]; else koPicks[tieId] = team;
    saveToLocal(); encodeStateToURL(); renderBracket();
  }

  function renderBracket() {
    const bracketEl = document.getElementById('bracket');
    if (!bracketEl) return;

    const table = computeStandings();
    if (table.length < 24) {
      bracketEl.innerHTML = `<div style="padding:12px;color:#8aa0c6">Complete more picks to seed the bracket.</div>`;
      return;
    }

    const { PO_pairs, R16_pairs, QF_pairs, SF_pairs, F_pair } = buildKnockoutFromTable(table);
    const tiesIndex = {};
    [...PO_pairs, ...R16_pairs, ...QF_pairs, ...SF_pairs, ...F_pair].forEach(t => tiesIndex[t.id] = t);

    const pickBtn = (tieId, teamName) => {
      const name = String(teamName);
      const active = koPicks[tieId] === name ? ' active' : '';
      return `
        <button class="pick-btn${active}" data-tie="${tieId}" data-team="${escapeHTML(name)}" title="Pick winner">
          <img alt="" src="${crestFor(name)}" height="18" />
          <span class="name">${escapeHTML(name)}</span>
        </button>`;
    };

    const nameFrom = (refId) => KO_winner(tiesIndex[refId]) || `Winner ${refId}`;

    const col = (title, ties, isFinal = false) => {
      const items = ties.map(t => {
        let A, B;
        if (t.home && (t.away || t.awayFrom)) {
          A = t.home;
          B = t.away || nameFrom(t.awayFrom);
        } else if (t.fromA && t.fromB) {
          A = nameFrom(t.fromA);
          B = nameFrom(t.fromB);
        }
        const note = KO_winner(t) ? `Picked: ${KO_winner(t)}` : 'Pick winner';
        return `
          <div class="tie" data-tie="${t.id}">
            ${pickBtn(t.id, A)}
            ${pickBtn(t.id, B)}
            <div class="note">${escapeHTML(note)}</div>
          </div>`;
      }).join('');
      return `<div class="round-col ${isFinal ? 'final' : ''}">
        <div class="round-title">${title}</div>
        ${items}
      </div>`;
    };

    bracketEl.innerHTML = `
      <div class="bracket-grid">
        ${col('Play-off (9–24)', PO_pairs)}
        ${col('Round of 16', R16_pairs)}
        ${col('Quarter-finals', QF_pairs)}
        ${col('Semi-finals', SF_pairs)}
        ${col('Final', F_pair, true)}
      </div>
    `;

    bracketEl.querySelectorAll('.pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        KO_setWinner(btn.dataset.tie, btn.dataset.team);
      });
    });
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function fmtDate(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
    return `${dd}.${m}.${y}`;
  }

  teamFilterEl.addEventListener('change', renderMatches);

  fileInput.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      setFixtures(data);
    } catch {
      alert('Invalid fixtures.json');
    }
  });

  shareBtn.addEventListener('click', () => {
    encodeStateToURL();
    navigator.clipboard?.writeText(location.href);
    alert('Shareable link copied to clipboard.');
  });

  resetBtn.addEventListener('click', () => {
    if (!confirm('Clear all picks?')) return;
    picks = {};
    koPicks = {};
    saveToLocal();
    encodeStateToURL();
    renderMatches();
    renderStandings();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll(`.tab-panel[data-tab="${btn.dataset.tab}"]`).forEach(p => p.classList.add('active'));
      if (btn.dataset.tab === 'knockout') renderBracket();
    });
  });

  (function init() {
    if (!loadStateFromURL()) loadFromLocal();
    fetch('data/fixtures.json')
        .then(r => { if (!r.ok) throw new Error('fixtures.json not found'); return r.json(); })
        .then(setFixtures)
        .catch(() => fetch('data/fixtures.sample.json')
            .then(r => r.json())
            .then(setFixtures)
            .catch(() => setFixtures([])));
  })();

  function setFixtures(data) {
    fixtures = (data || []).map((m, idx) => ({
      id: m.id ?? `M${idx + 1}`,
      round: m.round ?? null,
      date: m.date ?? null,
      home: m.home,
      away: m.away
    }));
    teams = Array.from(new Set(fixtures.flatMap(m => [m.home, m.away]))).sort((a, b) => a.localeCompare(b, 'en'));
    renderTeamFilter();
    renderMatches();
    renderStandings();
  }
})();