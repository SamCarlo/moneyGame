// ──────────────────────────────────────────────────────────
//  The Money Game — single-file game logic
// ──────────────────────────────────────────────────────────

const TOTAL_ROUNDS      = 16;   // 6 monthly + 10 annual
const MONTHLY_PHASE_END = 6;
const MAX_PLAYERS       = 25;

// ──────────────────────────────────────────────────────────
//  Utility helpers
// ──────────────────────────────────────────────────────────

function gauss(mean, stdev) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stdev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randIn(min, max) { return min + Math.random() * (max - min); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function formatMoney(amount) {
  const sign = amount < 0 ? '-' : '';
  return sign + '$' + Math.abs(Math.round(amount)).toLocaleString('en-US');
}
function formatDelta(amount) {
  const sign = amount >= 0 ? '+' : '−';
  return sign + '$' + Math.abs(Math.round(amount)).toLocaleString('en-US');
}

// ──────────────────────────────────────────────────────────
//  Education & starting debt
// ──────────────────────────────────────────────────────────

const EDUCATION = {
  none:    { label: 'No degree required',              debtMin: 0,       debtMax: 0 },
  trade:   { label: 'Trade / vocational school',       debtMin: 5000,    debtMax: 20000 },
  college: { label: '4-year college degree',           debtMin: 25000,   debtMax: 80000 },
  grad:    { label: 'Graduate / professional degree',  debtMin: 100000,  debtMax: 300000 },
};

function rollEducationDebt(educationType) {
  const e = EDUCATION[educationType];
  if (e.debtMax === 0) return 0;
  return Math.round(randIn(e.debtMin, e.debtMax));
}

// ──────────────────────────────────────────────────────────
//  Occupations
// ──────────────────────────────────────────────────────────
// baseMonthly = GROSS (pre-tax) income per month.
// type 'salary'   → stable + rare raise / bonus / dip
// type 'gig'      → highly variable month to month
// type 'mixed'    → moderately variable
// type 'creative' → gig-like PLUS a rare large windfall "score"

const OCCUPATIONS = [
  { id: 'pediatrician', name: 'Pediatrician', education: 'grad',
    type: 'salary', baseMonthly: 22000, noisePct: 0.03,
    bonusChance: 0.04, bonusAmt: 8000, raiseChance: 0.02, raisePct: 0.04, dipChance: 0.01, dipPct: 0.05 },

  { id: 'lawyer', name: 'Attorney / Lawyer', education: 'grad',
    type: 'salary', baseMonthly: 16000, noisePct: 0.05,
    bonusChance: 0.06, bonusAmt: 10000, raiseChance: 0.02, raisePct: 0.05, dipChance: 0.02, dipPct: 0.08 },

  { id: 'software-eng', name: 'Software Engineer (remote)', education: 'college',
    type: 'salary', baseMonthly: 13500, noisePct: 0.04,
    bonusChance: 0.06, bonusAmt: 10000, raiseChance: 0.03, raisePct: 0.05, dipChance: 0.02, dipPct: 0.10 },

  { id: 'nurse', name: 'Nurse + per-diem shifts', education: 'college',
    type: 'mixed', baseMonthly: 9000, noisePct: 0.13,
    bonusChance: 0.05, bonusAmt: 2000, raiseChance: 0.03, raisePct: 0.03 },

  { id: 'accountant', name: 'Accountant / CPA', education: 'college',
    type: 'salary', baseMonthly: 7500, noisePct: 0.04,
    bonusChance: 0.05, bonusAmt: 3000, raiseChance: 0.03, raisePct: 0.03 },

  { id: 'police', name: 'Police officer', education: 'college',
    type: 'salary', baseMonthly: 6800, noisePct: 0.06,
    bonusChance: 0.03, bonusAmt: 1200, raiseChance: 0.02, raisePct: 0.02 },

  { id: 'construction', name: 'Construction (union)', education: 'trade',
    type: 'mixed', baseMonthly: 7200, noisePct: 0.16,
    bonusChance: 0.03, bonusAmt: 1800 },

  { id: 'electrician', name: 'Electrician (licensed)', education: 'trade',
    type: 'mixed', baseMonthly: 6500, noisePct: 0.14,
    bonusChance: 0.04, bonusAmt: 1500 },

  { id: 'plumber', name: 'Plumber (licensed)', education: 'trade',
    type: 'mixed', baseMonthly: 6200, noisePct: 0.15,
    bonusChance: 0.04, bonusAmt: 1400 },

  { id: 'real-estate', name: 'Real estate agent', education: 'trade',
    type: 'gig', baseMonthly: 7000, noisePct: 0.55,
    bonusChance: 0.05, bonusAmt: 8000 },

  { id: 'flight-attendant', name: 'Airline Flight Attendant', education: 'college',
    type: 'mixed', baseMonthly: 5800, noisePct: 0.12,
    bonusChance: 0.05, bonusAmt: 1000, raiseChance: 0.02, raisePct: 0.03 },

  { id: 'teacher', name: 'Public school teacher', education: 'college',
    type: 'salary', baseMonthly: 5200, noisePct: 0.03,
    raiseChance: 0.04, raisePct: 0.02, bonusChance: 0.02, bonusAmt: 800 },

  { id: 'paramedic', name: 'Paramedic / EMT', education: 'trade',
    type: 'salary', baseMonthly: 4800, noisePct: 0.07,
    raiseChance: 0.02, raisePct: 0.02 },

  { id: 'social-worker', name: 'Social worker', education: 'college',
    type: 'salary', baseMonthly: 4600, noisePct: 0.03,
    raiseChance: 0.03, raisePct: 0.02 },

  { id: 'personal-trainer', name: 'Personal trainer / yoga instructor', education: 'trade',
    type: 'gig', baseMonthly: 4500, noisePct: 0.30,
    bonusChance: 0.04, bonusAmt: 1000 },

  { id: 'retail-manager', name: 'Retail store manager', education: 'none',
    type: 'salary', baseMonthly: 4200, noisePct: 0.05,
    raiseChance: 0.03, raisePct: 0.02, bonusChance: 0.04, bonusAmt: 1000 },

  { id: 'bartender-sub', name: 'Bartender + substitute teacher', education: 'college',
    type: 'mixed', baseMonthly: 3800, noisePct: 0.28 },

  { id: 'rideshare', name: 'Rideshare driver + DoorDash', education: 'none',
    type: 'gig', baseMonthly: 3600, noisePct: 0.38 },

  { id: 'small-biz', name: 'Small business owner', education: 'none',
    type: 'mixed', baseMonthly: 6000, noisePct: 0.45,
    bonusChance: 0.05, bonusAmt: 5000, dipChance: 0.07, dipPct: 0.30 },

  // ── Creative jobs: stable base + rare large windfall ──────────────
  { id: 'freelance-design', name: 'Freelance designer', education: 'college',
    type: 'creative', baseMonthly: 4300, noisePct: 0.40,
    bonusChance: 0.04, bonusAmt: 2500,
    scoreChance: 0.03, scoreMin: 8000,  scoreMax: 25000,
    scoreName: 'Major client commission' },

  { id: 'creator', name: 'Content creator / streamer', education: 'none',
    type: 'creative', baseMonthly: 2200, noisePct: 1.20,
    bonusChance: 0.06, bonusAmt: 7000, dipChance: 0.10, dipPct: 0.60,
    scoreChance: 0.04, scoreMin: 15000, scoreMax: 80000,
    scoreName: 'Viral moment' },

  { id: 'musician', name: 'Musician / performer', education: 'none',
    type: 'creative', baseMonthly: 3200, noisePct: 0.80,
    bonusChance: 0.04, bonusAmt: 3000,
    scoreChance: 0.025, scoreMin: 10000, scoreMax: 50000,
    scoreName: 'Licensing deal / big gig' },
];

// ──────────────────────────────────────────────────────────
//  Housing
// ──────────────────────────────────────────────────────────

const HOUSING = [
  { id: 'studio-rent',  name: 'Rent — studio apartment',          baseMonthly: 1450, noisePct: 0.04, own: false },
  { id: 'two-br-rent',  name: 'Rent — 2BR apartment',             baseMonthly: 2250, noisePct: 0.04, own: false },
  { id: 'roomies-rent', name: 'Rent — house with 3 roommates',    baseMonthly: 900,  noisePct: 0.04, own: false },
  { id: 'starter-buy',  name: 'Buying — starter home + mortgage', baseMonthly: 2600, noisePct: 0.00, own: true, maintAvg: 350, maintNoise: 0.8 },
  { id: 'condo-buy',    name: 'Buying — condo with HOA',          baseMonthly: 2100, noisePct: 0.00, own: true, maintAvg: 200, maintNoise: 0.5 },
  { id: 'van-life',     name: 'Van life / transient',             baseMonthly: 320,  noisePct: 0.55, own: false },
];

// ──────────────────────────────────────────────────────────
//  Portfolios
// ──────────────────────────────────────────────────────────
// Annual returns: mean and stdev as decimals.

const PORTFOLIOS = [
  { id: 'steady', name: 'The Steady Anchor', risk: 'low', meanReturn: 0.04, stdev: 0.04,
    blurb: 'Holdings: US Treasury bonds and FDIC-insured CDs form the core, supplemented by dividend-paying blue-chips in utilities, consumer staples, and healthcare — a 70 / 30 bonds-to-stocks split. Boring on purpose. You will almost never have a great year, and almost never a brutal one either.' },

  { id: 'balanced', name: 'The Middle Lane', risk: 'mid', meanReturn: 0.075, stdev: 0.13,
    blurb: 'Holdings: S&P 500 index funds, international developed-market stocks (Europe, Japan), investment-grade corporate bonds, and a slice of REITs (apartment buildings, shopping centers, office towers). Most years you make modestly more than the Steady Anchor, but you will stomach the occasional bad year that wipes out recent gains.' },

  { id: 'aggressive', name: 'The Long Bet', risk: 'high', meanReturn: 0.115, stdev: 0.26,
    blurb: 'Holdings: growth tech (AI, semiconductors, cloud platforms), emerging market equities (India, Brazil, Southeast Asia), small-cap value stocks, and a satellite position in cryptocurrency. The expected return is the highest — but so is the volatility. Expect years that look incredible and years that genuinely hurt.' },
];

// ──────────────────────────────────────────────────────────
//  Living expenses
// ──────────────────────────────────────────────────────────

const BASE_LIVING_MIN = 850;
const BASE_LIVING_MAX = 1900;

// ──────────────────────────────────────────────────────────
//  Life events
// ──────────────────────────────────────────────────────────
// monthlyChance = probability this event fires in any one simulated month.
// descFn(moneyDelta, ongoingAdded) → human-readable string.

const LIFE_EVENTS = [
  { id: 'medical',
    label: 'Medical emergency',
    monthlyChance: 0.02,
    moneyFn: () => -randIn(2500, 12000),
    descFn: (d) => `Hospital bills cost $${Math.abs(Math.round(d)).toLocaleString()}` },

  { id: 'car-repair',
    label: 'Major car repair',
    monthlyChance: 0.04,
    moneyFn: () => -randIn(600, 3500),
    descFn: (d) => `Car breakdown — repairs cost $${Math.abs(Math.round(d)).toLocaleString()}` },

  { id: 'identity-theft',
    label: 'Identity theft',
    monthlyChance: 0.008,
    moneyFn: () => -randIn(1000, 5000),
    descFn: (d) => `Financial losses of $${Math.abs(Math.round(d)).toLocaleString()}` },

  { id: 'job-loss',
    label: 'Layoff / lost gig',
    monthlyChance: 0.015,
    moneyFn: () => -randIn(800, 3500),
    descFn: (d) => `Lost $${Math.abs(Math.round(d)).toLocaleString()} in income` },

  { id: 'natural-disaster',
    label: 'Natural disaster',
    monthlyChance: 0.008,
    moneyFn: () => -randIn(2000, 10000),
    descFn: (d) => `Flood / storm damage — $${Math.abs(Math.round(d)).toLocaleString()} loss` },

  { id: 'inheritance',
    label: 'Inheritance / windfall',
    monthlyChance: 0.010,
    moneyFn: () => randIn(3000, 45000),
    descFn: (d) => `Unexpected gift — +$${Math.round(d).toLocaleString()}` },

  { id: 'tax-refund',
    label: 'Large tax refund',
    monthlyChance: 0.025,
    moneyFn: () => randIn(400, 2200),
    descFn: (d) => `Bigger-than-expected refund — +$${Math.round(d).toLocaleString()}` },

  { id: 'side-hustle',
    label: 'Side hustle pays off',
    monthlyChance: 0.020,
    moneyFn: () => randIn(500, 4000),
    descFn: (d) => `Side project brings in +$${Math.round(d).toLocaleString()}` },

  { id: 'child',
    label: 'New child / dependent',
    monthlyChance: 0.008,
    moneyFn: null,
    ongoingMonthly: true, ongoingMin: 900, ongoingMax: 1800,
    descFn: (_d, ongoing) => `Adds $${ongoing.toLocaleString()}/mo to ongoing expenses` },

  { id: 'disability',
    label: 'Chronic health condition',
    monthlyChance: 0.005,
    moneyFn: null,
    ongoingMonthly: true, ongoingMin: 300, ongoingMax: 900,
    descFn: (_d, ongoing) => `Adds $${ongoing.toLocaleString()}/mo in medical costs` },
];

// ──────────────────────────────────────────────────────────
//  US income tax (2024)
// ──────────────────────────────────────────────────────────
// Annualizes the monthly gross, applies federal brackets + FICA, returns monthly tax.

function computeMonthlyTax(monthlyGross) {
  if (monthlyGross <= 0) return 0;
  const annual = monthlyGross * 12;

  // Federal income tax — 2024 single-filer brackets
  const brackets = [
    { limit: 11600,    rate: 0.10 },
    { limit: 47150,    rate: 0.12 },
    { limit: 100525,   rate: 0.22 },
    { limit: 191950,   rate: 0.24 },
    { limit: 243725,   rate: 0.32 },
    { limit: 609350,   rate: 0.35 },
    { limit: Infinity, rate: 0.37 },
  ];
  let federal = 0, prev = 0;
  for (const b of brackets) {
    if (annual <= prev) break;
    federal += (Math.min(annual, b.limit) - prev) * b.rate;
    prev = b.limit;
  }

  // FICA: Social Security 6.2% (capped at $168,600) + Medicare 1.45%
  const fica = Math.min(annual, 168600) * 0.062 + annual * 0.0145;

  return (federal + fica) / 12;
}

// ──────────────────────────────────────────────────────────
//  Game state
// ──────────────────────────────────────────────────────────

const state = {
  players: [],   // see startBtn handler for shape
  round:   0,
  phase:   'setup-count',
};

// ──────────────────────────────────────────────────────────
//  Lookup helpers
// ──────────────────────────────────────────────────────────

function getOccupation(id) { return OCCUPATIONS.find(o => o.id === id); }
function getHousing(id)    { return HOUSING.find(h => h.id === id); }
function getPortfolio(id)  { return PORTFOLIOS.find(p => p.id === id); }

// ──────────────────────────────────────────────────────────
//  Income / cost rolls
// ──────────────────────────────────────────────────────────

function rollMonthlyIncome(player) {
  const occ = getOccupation(player.occupationId);
  let gross = occ.baseMonthly * player.salaryMultiplier;
  gross = Math.max(gross + gauss(0, gross * occ.noisePct), gross * 0.2);

  const events = [];  // { type: 'score'|'normal', text }

  // Creative windfall — rare high-income moment
  if (occ.scoreChance && Math.random() < occ.scoreChance) {
    const windfall = Math.round(randIn(occ.scoreMin, occ.scoreMax));
    gross += windfall;
    events.push({ type: 'score', text: `${occ.scoreName}: +${formatMoney(windfall)}` });
  }
  if (occ.bonusChance && Math.random() < occ.bonusChance) {
    gross += occ.bonusAmt;
    events.push({ type: 'normal', text: `bonus +${formatMoney(occ.bonusAmt)}` });
  }
  if (occ.raiseChance && Math.random() < occ.raiseChance) {
    player.salaryMultiplier *= (1 + occ.raisePct);
    events.push({ type: 'normal', text: `raise +${(occ.raisePct * 100).toFixed(1)}%` });
  }
  if (occ.dipChance && Math.random() < occ.dipChance) {
    const dip = gross * occ.dipPct;
    gross -= dip;
    events.push({ type: 'normal', text: `income dip −${formatMoney(dip)}` });
  }

  const tax = computeMonthlyTax(gross);
  return { gross, tax, net: gross - tax, events };
}

function rollMonthlyHousingCost(player) {
  const h = getHousing(player.housingId);
  let cost = h.baseMonthly;
  if (h.noisePct) cost += gauss(0, h.baseMonthly * h.noisePct);
  if (h.own && Math.random() < 0.25) cost += h.maintAvg * (1 + gauss(0, h.maintNoise));
  return Math.max(cost, 50);
}

function rollMonthlyLivingCost() {
  return randIn(BASE_LIVING_MIN, BASE_LIVING_MAX);
}

function rollAnnualPortfolioReturn(portfolioId) {
  const pf = getPortfolio(portfolioId);
  return gauss(pf.meanReturn, pf.stdev);
}

function rollLifeEvents(player) {
  const fired = [];
  for (const evt of LIFE_EVENTS) {
    if (Math.random() < evt.monthlyChance) {
      const moneyDelta = Math.round(evt.moneyFn ? evt.moneyFn() : 0);
      let ongoing = 0;
      if (evt.ongoingMonthly) {
        ongoing = Math.round(randIn(evt.ongoingMin, evt.ongoingMax));
        player.extraMonthlyExpenses += ongoing;
      }
      fired.push({
        label:      evt.label,
        desc:       evt.descFn(moneyDelta, ongoing),
        moneyDelta,
        isOngoing:  !!evt.ongoingMonthly,
      });
    }
  }
  return fired;
}

// ──────────────────────────────────────────────────────────
//  Round logic
// ──────────────────────────────────────────────────────────

function runMonthlyRound(player) {
  const income     = rollMonthlyIncome(player);
  const housing    = rollMonthlyHousingCost(player);
  const living     = rollMonthlyLivingCost();
  const lifeEvents = rollLifeEvents(player);

  const lifeEventDelta = lifeEvents.reduce((s, e) => s + e.moneyDelta, 0);
  const extraExpenses  = player.extraMonthlyExpenses;

  const delta = income.net - housing - living - extraExpenses + lifeEventDelta;
  player.money += delta;
  player.lastDelta = delta;
  player.lastBreakdown = {
    gross: income.gross, tax: income.tax, income: income.net,
    housing, living, extraExpenses,
    incomeEvents: income.events, lifeEvents,
  };
}

function runAnnualRound(player) {
  let totalGross = 0, totalTax = 0, totalHousing = 0, totalLiving = 0;
  const allIncomeEvents = [], allLifeEvents = [];
  let totalLifeEventDelta = 0;
  const yearStartExtra = player.extraMonthlyExpenses;  // new ongoing costs take effect next year

  for (let i = 0; i < 12; i++) {
    const inc = rollMonthlyIncome(player);
    totalGross   += inc.gross;
    totalTax     += inc.tax;
    totalHousing += rollMonthlyHousingCost(player);
    totalLiving  += rollMonthlyLivingCost();
    inc.events.forEach(e => allIncomeEvents.push(e));

    const evts = rollLifeEvents(player);
    evts.forEach(e => { totalLifeEventDelta += e.moneyDelta; allLifeEvents.push(e); });
  }

  const totalNet     = totalGross - totalTax;
  const extraExpenses = yearStartExtra * 12;
  const startBalance  = player.money;
  const returnPct     = rollAnnualPortfolioReturn(player.portfolioId);
  const investChange  = startBalance * returnPct;

  const delta = totalNet - totalHousing - totalLiving - extraExpenses + investChange + totalLifeEventDelta;
  player.money += delta;
  player.lastDelta = delta;
  player.lastBreakdown = {
    gross: totalGross, tax: totalTax, income: totalNet,
    housing: totalHousing, living: totalLiving, extraExpenses,
    invest: investChange, returnPct,
    incomeEvents: allIncomeEvents, lifeEvents: allLifeEvents,
  };
}

// ──────────────────────────────────────────────────────────
//  DOM references
// ──────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const els = {
  setupCount:     $('setup-count'),
  setupPlayers:   $('setup-players'),
  dashboard:      $('dashboard'),
  investSetup:    $('invest-setup'),
  widgetGame:     $('widget-game'),
  widgetGrid:     $('widget-grid'),
  widgetTimer:    $('widget-timer-display'),
  widgetEndBtn:   $('widget-end-btn'),
  endScreen:      $('end-screen'),
  headerStats:    $('header-stats'),
  roundDisplay:   $('round-display'),
  phaseDisplay:   $('phase-display'),
  totalDisplay:   $('total-display'),
  countInput:     $('player-count-input'),
  countNext:      $('setup-count-next'),
  formList:       $('player-form-list'),
  startBtn:       $('setup-players-start'),
  advanceBtn:     $('advance-btn'),
  logToggle:      $('log-toggle'),
  log:            $('last-round-log'),
  playerGrid:     $('player-grid'),
  playerPool:     $('player-pool'),
  portfolioZones: $('portfolio-zones'),
  investConfirm:  $('invest-confirm'),
  chart:          $('chart'),
  restartBtn:     $('restart-btn'),
};

// ──────────────────────────────────────────────────────────
//  Setup phase
// ──────────────────────────────────────────────────────────

els.countNext.addEventListener('click', () => {
  const n = clamp(parseInt(els.countInput.value, 10) || 0, 1, MAX_PLAYERS);
  els.countInput.value = n;
  buildPlayerForms(n);
  showScreen('setup-players');
});

function buildPlayerForms(n) {
  els.formList.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'player-form-row';
    row.innerHTML = `
      <div class="row-index">Player ${i + 1}</div>
      <label>Name
        <input type="text" data-field="name" value="Player ${i + 1}" />
      </label>
      <label>Occupation
        <select data-field="occupation">
          ${OCCUPATIONS.map(o => `<option value="${o.id}">${o.name}</option>`).join('')}
        </select>
      </label>
      <div class="edu-info"></div>
      <label>Housing
        <select data-field="housing">
          ${HOUSING.map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
        </select>
      </label>
    `;

    const occSelect = row.querySelector('[data-field=occupation]');
    const eduInfo   = row.querySelector('.edu-info');

    function updateEduInfo() {
      const occ = getOccupation(occSelect.value);
      const edu = EDUCATION[occ.education];
      if (edu.debtMax === 0) {
        eduInfo.className   = 'edu-info edu-none';
        eduInfo.textContent = `${edu.label} — no student debt`;
      } else {
        eduInfo.className   = 'edu-info edu-debt';
        eduInfo.textContent =
          `${edu.label} — starts with $${edu.debtMin.toLocaleString()}–$${edu.debtMax.toLocaleString()} in student debt`;
      }
    }

    occSelect.addEventListener('change', updateEduInfo);
    occSelect.selectedIndex = i % OCCUPATIONS.length;
    row.querySelector('[data-field=housing]').selectedIndex = i % HOUSING.length;
    updateEduInfo();
    els.formList.appendChild(row);
  }
}

els.startBtn.addEventListener('click', () => {
  const rows = els.formList.querySelectorAll('.player-form-row');
  state.players = [];
  rows.forEach((row, idx) => {
    const name         = row.querySelector('[data-field=name]').value.trim() || `Player ${idx + 1}`;
    const occupationId = row.querySelector('[data-field=occupation]').value;
    const housingId    = row.querySelector('[data-field=housing]').value;
    const occ          = getOccupation(occupationId);
    const educationDebt = rollEducationDebt(occ.education);
    state.players.push({
      id: idx, name, occupationId, housingId,
      money:                -educationDebt,
      educationDebt,
      salaryMultiplier:     1,
      extraMonthlyExpenses: 0,
      portfolioId:          null,
      lastDelta:            0,
      lastBreakdown:        null,
    });
  });
  state.round = 0;
  state.phase = 'monthly';
  showScreen('dashboard');
  renderHeader();
  renderPlayers();
  renderAdvanceButton();
});

// ──────────────────────────────────────────────────────────
//  Dashboard rendering
// ──────────────────────────────────────────────────────────

function showScreen(name) {
  const map = {
    'setup-count':   els.setupCount,
    'setup-players': els.setupPlayers,
    'dashboard':     els.dashboard,
    'invest-setup':  els.investSetup,
    'widgets':       els.widgetGame,
    'end':           els.endScreen,
  };
  Object.entries(map).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  els.headerStats.classList.toggle('hidden', name === 'setup-count' || name === 'setup-players');
}

function renderHeader() {
  els.roundDisplay.textContent = `${state.round} / ${TOTAL_ROUNDS}`;
  const phaseLabel = state.phase === 'monthly'      ? 'Month-by-month'
                   : state.phase === 'annual'       ? 'Year-by-year'
                   : state.phase === 'invest-setup' ? 'Choose investments'
                   : state.phase === 'widgets'      ? 'Widget business'
                   : state.phase === 'end'          ? 'Final results'
                   : '—';
  els.phaseDisplay.textContent = phaseLabel;
  const total = state.players.reduce((s, p) => s + p.money, 0);
  els.totalDisplay.textContent = formatMoney(total);
  els.totalDisplay.className = total < 0 ? 'bad' : 'good';
}

function renderAdvanceButton() {
  if (state.phase === 'monthly') {
    els.advanceBtn.textContent = `Live for one month (month ${state.round + 1} of ${MONTHLY_PHASE_END})`;
  } else if (state.phase === 'annual') {
    const year = state.round - MONTHLY_PHASE_END + 1;
    els.advanceBtn.textContent = `Live for one year (year ${year} of 10)`;
  }
}

function renderPlayers() {
  els.playerGrid.innerHTML = '';
  state.players.forEach(p => {
    const occ = getOccupation(p.occupationId);
    const h   = getHousing(p.housingId);
    const pf  = p.portfolioId ? getPortfolio(p.portfolioId) : null;
    const card = document.createElement('div');
    card.className = 'player-card';
    const deltaCls = p.lastDelta === 0 ? '' : (p.lastDelta > 0 ? 'good' : 'bad');
    const moneyCls = p.money < 0 ? 'bad' : '';
    card.innerHTML = `
      <div class="name">
        <span>${escapeHtml(p.name)}</span>
        ${pf ? `<span class="portfolio-tag">${escapeHtml(pf.name)}</span>` : ''}
      </div>
      <div class="meta">${escapeHtml(occ.name)} · ${escapeHtml(h.name)}</div>
      ${p.educationDebt > 0
        ? `<div class="card-tag tag-debt">Student debt at start: ${formatMoney(-p.educationDebt)}</div>`
        : ''}
      ${p.extraMonthlyExpenses > 0
        ? `<div class="card-tag tag-extra">+${formatMoney(p.extraMonthlyExpenses)}/mo extra costs</div>`
        : ''}
      <div class="money ${moneyCls}">${formatMoney(p.money)}</div>
      ${p.lastDelta !== 0
        ? `<div class="delta ${deltaCls}">${formatDelta(p.lastDelta)} this round</div>`
        : ''}
    `;
    els.playerGrid.appendChild(card);
  });
}

function renderLog() {
  els.log.innerHTML = '';
  state.players.forEach(p => {
    const b = p.lastBreakdown;
    if (!b) return;
    const occName = getOccupation(p.occupationId).name;
    const div = document.createElement('div');
    div.className = 'log-entry';

    let parts = [
      `<b>${escapeHtml(p.name)}</b> (${escapeHtml(occName)})`,
      `gross ${formatMoney(b.gross)}`,
      `<span class="log-tax">tax ${formatMoney(-b.tax)}</span>`,
      `net ${formatMoney(b.income)}`,
      `housing ${formatMoney(-b.housing)}`,
      `living ${formatMoney(-b.living)}`,
    ];
    if (b.extraExpenses > 0) parts.push(`ongoing ${formatMoney(-b.extraExpenses)}`);
    if ('invest' in b) {
      const sign = b.invest >= 0 ? '+' : '';
      parts.push(`investments ${sign}${formatMoney(b.invest)} (${(b.returnPct * 100).toFixed(1)}%)`);
    }
    const cls = p.lastDelta >= 0 ? 'good' : 'bad';
    parts.push(`→ <span class="${cls}">${formatDelta(p.lastDelta)}</span>`);

    if (b.incomeEvents && b.incomeEvents.length) {
      const evtHtml = b.incomeEvents.map(e =>
        e.type === 'score'
          ? `<span class="log-score">${escapeHtml(e.text)}</span>`
          : `<em>${escapeHtml(e.text)}</em>`
      ).join(', ');
      parts.push(evtHtml);
    }

    div.innerHTML = parts.join(' · ');

    if (b.lifeEvents && b.lifeEvents.length) {
      b.lifeEvents.forEach(le => {
        const leDiv = document.createElement('div');
        leDiv.className = 'log-life-event';
        const leClass = le.moneyDelta > 0 ? 'good' : le.moneyDelta < 0 ? 'bad' : 'log-ongoing';
        leDiv.innerHTML =
          `&nbsp;&nbsp;&#8627; <span class="${leClass}">${escapeHtml(le.label)}</span>: <em>${escapeHtml(le.desc)}</em>`;
        div.appendChild(leDiv);
      });
    }

    els.log.appendChild(div);
  });
}

els.logToggle.addEventListener('click', () => {
  const hidden = els.log.classList.toggle('hidden');
  els.logToggle.textContent = hidden ? 'Show last round details' : 'Hide last round details';
});

// ──────────────────────────────────────────────────────────
//  Advancing rounds
// ──────────────────────────────────────────────────────────

els.advanceBtn.addEventListener('click', () => {
  if (state.phase === 'monthly') {
    state.players.forEach(runMonthlyRound);
    state.round += 1;
    if (state.round === MONTHLY_PHASE_END) {
      renderHeader(); renderPlayers(); renderLog();
      state.phase = 'invest-setup';
      showInvestSetup();
      return;
    }
  } else if (state.phase === 'annual') {
    state.players.forEach(runAnnualRound);
    state.round += 1;
    if (state.round >= TOTAL_ROUNDS) {
      state.phase = 'widgets';
      renderHeader();
      startWidgetPhase();
      return;
    }
  }
  renderHeader();
  renderPlayers();
  renderLog();
  renderAdvanceButton();
});

// ──────────────────────────────────────────────────────────
//  Investment setup screen
// ──────────────────────────────────────────────────────────

function showInvestSetup() {
  renderHeader();
  showScreen('invest-setup');

  const pool = els.playerPool.querySelector('.player-chips');
  pool.innerHTML = '';
  state.players.forEach(p => { p.portfolioId = null; pool.appendChild(makeChip(p)); });

  els.portfolioZones.innerHTML = '';
  PORTFOLIOS.forEach(pf => {
    const zone = document.createElement('div');
    zone.className = 'drop-zone portfolio-card';
    zone.dataset.portfolioId = pf.id;
    const riskLabel = pf.risk === 'low' ? 'lower risk' : pf.risk === 'mid' ? 'moderate risk' : 'higher risk';
    zone.innerHTML = `
      <span class="risk-pill risk-${pf.risk}">${riskLabel}</span>
      <h3>${escapeHtml(pf.name)}</h3>
      <div class="pf-blurb">${escapeHtml(pf.blurb)}</div>
      <div class="player-chips"></div>
    `;
    els.portfolioZones.appendChild(zone);
  });

  document.querySelectorAll('.drop-zone').forEach(setupDropZone);
  updateInvestConfirm();
}

function makeChip(player) {
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.draggable = true;
  chip.dataset.playerId = player.id;
  chip.textContent = player.name;
  chip.addEventListener('dragstart', e => {
    chip.classList.add('dragging');
    e.dataTransfer.setData('text/plain', String(player.id));
    e.dataTransfer.effectAllowed = 'move';
  });
  chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
  return chip;
}

function setupDropZone(zone) {
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', e => {
    if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const playerId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const player   = state.players.find(p => p.id === playerId);
    if (!player) return;
    const chip = document.querySelector(`.chip[data-player-id="${playerId}"]`);
    if (!chip) return;
    zone.querySelector('.player-chips').appendChild(chip);
    player.portfolioId = zone.dataset.portfolioId || null;
    updateInvestConfirm();
  });
}

function updateInvestConfirm() {
  els.investConfirm.disabled = !state.players.every(p => p.portfolioId);
}

els.investConfirm.addEventListener('click', () => {
  state.phase = 'annual';
  showScreen('dashboard');
  renderHeader(); renderPlayers(); renderLog(); renderAdvanceButton();
});

// ──────────────────────────────────────────────────────────
//  Phase 3 — Widget business
// ──────────────────────────────────────────────────────────
// Tick = 1 real second = 1 game-day for cost accrual purposes.
// Production rates are stated and applied "per second" directly.

const PHASE3_DURATION_SEC = 600;      // 10 minutes
const DAYS_PER_YEAR       = 365;
const RD_REVEAL_WINDOW    = 360;      // efficiencies unlock within 6 min of buying R&D
const LAWSUIT_FIRST_MIN   = 180;
const LAWSUIT_FIRST_MAX   = 420;
const LAWSUIT_REPEAT_CHANCE_PER_SEC = 0.0025;

const BUYABLES = [
  { id: 'loan',          name: 'Business loan',       upfront: 0,        instant: 100000,
    dailyCost: 200,
    blurb: '+$100k cash now. Costs $200/day in interest forever.' },
  { id: 'tools',         name: 'Workshop tools',      upfront: 5000,
    blurb: '+1 widget per click.' },
  { id: 'worker',        name: 'Hire worker',         upfront: 0,        yearlyCost: 53000,
    blurb: '$53k/yr. +1 widget/sec each. Runs factories.' },
  { id: 'smallFactory',  name: 'Small factory',       upfront: 100000,
    blurb: '+10/sec. Needs 5 workers.' },
  { id: 'mediumFactory', name: 'Medium factory',      upfront: 1000000,
    blurb: '+100/sec. Needs 15 workers.' },
  { id: 'largeFactory',  name: 'Large factory',       upfront: 10000000,
    blurb: '+1000/sec. Needs 60 workers.' },
  { id: 'rd',            name: 'R&D Department',      upfront: 0,        yearlyCost: 100000,
    blurb: '$100k/yr. Reveals efficiencies over time.', once: true },
  { id: 'computer',      name: 'Computer automation', upfront: 250000,   locked: true, once: true,
    blurb: 'x2 production. (Unlocks via R&D.)' },
  { id: 'robotics',      name: 'Robotics',            upfront: 1000000,  locked: true, once: true,
    blurb: 'x5 production. (Unlocks via R&D.)' },
  { id: 'logistics',     name: 'Logistical enhancement', upfront: 500000, locked: true, once: true,
    blurb: 'x3 selling rate. (Unlocks via R&D.)' },
  { id: 'lawyer',        name: 'Hire lawyer',         upfront: 0,        yearlyCost: 200000, locked: true,
    blurb: '$200k/yr. Mitigates lawsuit damage.' },
];

let widgetTimer    = null;
let widgetElapsed  = 0;     // seconds
let widgetEnded    = false;

function initBusiness(p) {
  p.biz = {
    produced: 0,
    sold: 0,
    supply: 0,
    revenue: 0,
    price: 1.00,
    counts: {
      loan: 0, tools: 0, worker: 0,
      smallFactory: 0, mediumFactory: 0, largeFactory: 0,
      rd: 0, computer: 0, robotics: 0, logistics: 0,
      lawyer: 0,
    },
    rdElapsed:        0,
    rdUnlockTimes:    null,  // [computerT, roboticsT, logisticsT] in seconds-since-rd
    unlocked:         { computer: false, robotics: false, logistics: false, lawyer: false },
    pendingPulse:     [],
    lawsuitScheduled: LAWSUIT_FIRST_MIN + Math.random() * (LAWSUIT_FIRST_MAX - LAWSUIT_FIRST_MIN),
    lawsuitsFired:    0,
    events:           [],  // {text, kind}
  };
}

function startWidgetPhase() {
  state.players.forEach(initBusiness);
  widgetElapsed = 0;
  widgetEnded   = false;
  showScreen('widgets');
  renderWidgetGrid();
  if (widgetTimer) clearInterval(widgetTimer);
  widgetTimer = setInterval(widgetTick, 1000);
  updateTimerDisplay();
}

function widgetTick() {
  if (widgetEnded) return;
  widgetElapsed += 1;

  state.players.forEach(advanceBusiness);
  updateTimerDisplay();
  renderWidgetGrid();

  if (widgetElapsed >= PHASE3_DURATION_SEC) endWidgetPhase();
}

function updateTimerDisplay() {
  const left = Math.max(0, PHASE3_DURATION_SEC - widgetElapsed);
  const m = Math.floor(left / 60), s = left % 60;
  els.widgetTimer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

function productionMultiplier(biz) {
  let m = 1;
  if (biz.counts.computer)  m *= 2;
  if (biz.counts.robotics)  m *= 5;
  return m;
}
function sellMultiplier(biz) {
  return biz.counts.logistics ? 3 : 1;
}

function computeProductionRate(biz) {
  const c = biz.counts;
  const factoryNeed = c.smallFactory * 5 + c.mediumFactory * 15 + c.largeFactory * 60;
  const workersForFactories = Math.min(c.worker, factoryNeed);

  let factoryShare = 0;
  let remainingW   = workersForFactories;
  if (c.largeFactory && remainingW >= 60) {
    const n = Math.min(c.largeFactory, Math.floor(remainingW / 60));
    factoryShare += n * 1000;
    remainingW -= n * 60;
  }
  if (c.mediumFactory && remainingW >= 15) {
    const n = Math.min(c.mediumFactory, Math.floor(remainingW / 15));
    factoryShare += n * 100;
    remainingW -= n * 15;
  }
  if (c.smallFactory && remainingW >= 5) {
    const n = Math.min(c.smallFactory, Math.floor(remainingW / 5));
    factoryShare += n * 10;
    remainingW -= n * 5;
  }
  const freeWorkers = Math.max(0, c.worker - workersForFactories);
  return (freeWorkers + factoryShare) * productionMultiplier(biz);
}

function computeSellRate(biz) {
  // Base 1/sec at price $1; rate inversely proportional to price.
  const price = Math.max(0.01, biz.price);
  return (1 / price) * sellMultiplier(biz);
}

function dailyOngoingCost(biz) {
  const c = biz.counts;
  const yearly = c.worker * 53000 + c.rd * 100000 + c.lawyer * 200000;
  const daily  = yearly / DAYS_PER_YEAR + c.loan * 200;
  return daily;
}

function pushEvent(biz, text, kind) {
  biz.events.unshift({ text, kind });
  if (biz.events.length > 12) biz.events.length = 12;
}

function advanceBusiness(p) {
  const biz = p.biz;
  if (!biz) return;

  // 1. Production
  const prodRate = computeProductionRate(biz);
  biz.produced += prodRate;
  biz.supply   += prodRate;

  // 2. Selling (capped by supply)
  const wantSell = computeSellRate(biz);
  const sold     = Math.min(wantSell, biz.supply);
  biz.supply   -= sold;
  biz.sold     += sold;
  const revenue  = sold * biz.price;
  biz.revenue  += revenue;
  p.money      += revenue;

  // 3. Ongoing costs
  p.money -= dailyOngoingCost(biz);

  // 4. R&D progress + reveals
  if (biz.counts.rd > 0) {
    biz.rdElapsed += 1;
    if (!biz.rdUnlockTimes) {
      const t1 = Math.random() * RD_REVEAL_WINDOW;
      const t2 = Math.random() * RD_REVEAL_WINDOW;
      const t3 = Math.random() * RD_REVEAL_WINDOW;
      biz.rdUnlockTimes = { computer: t1, robotics: t2, logistics: t3 };
    }
    ['computer', 'robotics', 'logistics'].forEach(eff => {
      if (!biz.unlocked[eff] && biz.rdElapsed >= biz.rdUnlockTimes[eff]) {
        biz.unlocked[eff] = true;
        biz.pendingPulse.push(eff);
        const niceName = BUYABLES.find(b => b.id === eff).name;
        pushEvent(biz, `R&D unlocked: ${niceName}`, 'good');
      }
    });
  }

  // 5. Lawsuits
  if (biz.lawsuitsFired === 0) {
    if (widgetElapsed >= biz.lawsuitScheduled) fireLawsuit(p);
  } else {
    if (Math.random() < LAWSUIT_REPEAT_CHANCE_PER_SEC) fireLawsuit(p);
  }
}

function fireLawsuit(p) {
  const biz = p.biz;
  let damage = randIn(50000, 2000000);
  const lawyerReduction = Math.min(0.9, biz.counts.lawyer * 0.3);
  damage *= (1 - lawyerReduction);
  damage = Math.round(damage);
  p.money -= damage;
  biz.lawsuitsFired += 1;
  pushEvent(biz, `Lawsuit! −${formatMoney(damage)}` + (lawyerReduction > 0 ? ` (lawyers saved ${(lawyerReduction*100).toFixed(0)}%)` : ''), 'bad');
  if (!biz.unlocked.lawyer) {
    biz.unlocked.lawyer = true;
    biz.pendingPulse.push('lawyer');
    pushEvent(biz, `Lawyers are now available for hire.`, 'good');
  }
}

function canShowBuyable(b, biz) {
  if (b.locked && !biz.unlocked[b.id]) return false;
  if (b.once && biz.counts[b.id] > 0) return false;
  return true;
}

function attemptBuy(p, id) {
  const biz = p.biz;
  const b = BUYABLES.find(x => x.id === id);
  if (!b) return;
  if (b.locked && !biz.unlocked[id]) return;
  if (b.once && biz.counts[id] > 0 && id !== 'rd') return;
  if (id === 'rd' && biz.counts.rd > 0) return;
  if (p.money < b.upfront) return;
  p.money -= b.upfront;
  if (b.instant) p.money += b.instant;
  biz.counts[id] += 1;
  pushEvent(biz, `Bought ${b.name} (−${formatMoney(b.upfront)})`, 'good');
  renderWidgetGrid();
}

function makeWidgetClick(p) {
  const biz = p.biz;
  const perClick = 1 + biz.counts.tools;  // tools add +1 each
  biz.produced += perClick;
  biz.supply   += perClick;
  renderWidgetGrid();
}

function setPrice(p, newPrice) {
  const v = parseFloat(newPrice);
  if (!isFinite(v) || v < 0) return;
  p.biz.price = v;
}

function fmtNum(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString('en-US');
}

function renderWidgetGrid() {
  const grid = els.widgetGrid;
  // Build once; subsequent ticks update in place to preserve focus on price inputs.
  if (grid.childElementCount !== state.players.length) {
    grid.innerHTML = '';
    state.players.forEach(p => grid.appendChild(buildBusinessCard(p)));
  } else {
    state.players.forEach((p, i) => updateBusinessCard(grid.children[i], p));
  }
}

function buildBusinessCard(p) {
  const card = document.createElement('div');
  card.className = 'biz-card';
  card.dataset.playerId = p.id;
  card.innerHTML = `
    <div class="biz-head">
      <div class="biz-name">${escapeHtml(p.name)}</div>
      <div class="biz-money"></div>
    </div>
    <div class="biz-stats">
      <div><div class="stat-label">Produced</div><div class="stat-val js-prod">0</div></div>
      <div><div class="stat-label">Sold</div><div class="stat-val js-sold">0</div></div>
      <div><div class="stat-label">Supply</div><div class="stat-val js-supply">0</div></div>
    </div>
    <div class="biz-row">
      <label>Price $<input type="number" class="biz-price" step="0.05" min="0.01" value="1.00" /></label>
      <button class="biz-click-btn">Make widget</button>
    </div>
    <div class="biz-rate-line js-rates"></div>
    <div class="biz-resources"></div>
    <div class="biz-events js-events"></div>
  `;

  const priceInput = card.querySelector('.biz-price');
  priceInput.value = p.biz.price.toFixed(2);
  priceInput.addEventListener('input', e => setPrice(p, e.target.value));

  card.querySelector('.biz-click-btn').addEventListener('click', () => makeWidgetClick(p));

  const resBox = card.querySelector('.biz-resources');
  BUYABLES.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'biz-buy';
    btn.dataset.buyId = b.id;
    btn.addEventListener('click', () => attemptBuy(p, b.id));
    resBox.appendChild(btn);
  });

  updateBusinessCard(card, p);
  return card;
}

function updateBusinessCard(card, p) {
  const biz = p.biz;
  card.classList.toggle('bankrupt', p.money < -1000000);

  const moneyEl = card.querySelector('.biz-money');
  moneyEl.textContent = formatMoney(p.money);
  moneyEl.className = 'biz-money ' + (p.money < 0 ? 'bad' : 'good');

  card.querySelector('.js-prod').textContent   = fmtNum(biz.produced);
  card.querySelector('.js-sold').textContent   = fmtNum(biz.sold);
  card.querySelector('.js-supply').textContent = fmtNum(biz.supply);

  const prod = computeProductionRate(biz);
  const sell = computeSellRate(biz);
  const ongoing = dailyOngoingCost(biz);
  card.querySelector('.js-rates').textContent =
    `Production: ${fmtNum(prod)}/s · Selling: ${sell.toFixed(2)}/s · Costs: ${formatMoney(ongoing)}/day`;

  // Resource buttons
  const buttons = card.querySelectorAll('.biz-buy');
  buttons.forEach(btn => {
    const id = btn.dataset.buyId;
    const b  = BUYABLES.find(x => x.id === id);
    const visible = canShowBuyable(b, biz);
    btn.classList.toggle('hidden', !visible);
    if (!visible) return;

    const owned = biz.counts[id];
    const affordable = p.money >= b.upfront;
    const purchasable =
      (!b.once || (b.once && owned === 0)) ||
      (b.id === 'rd' && owned === 0);
    btn.disabled = !affordable || (b.once && owned > 0);

    btn.innerHTML = `
      <span class="buy-name">${escapeHtml(b.name)}</span>
      <span class="buy-cost">${b.upfront > 0 ? formatMoney(b.upfront) : (b.instant ? `+${formatMoney(b.instant)}` : 'Free')}</span>
      <span class="buy-blurb">${escapeHtml(b.blurb)}</span>
      ${owned > 0 ? `<span class="buy-count">Owned: ${owned}</span>` : ''}
    `;
    if (biz.pendingPulse.includes(id)) {
      btn.classList.add('unlocked-pulse');
      setTimeout(() => btn.classList.remove('unlocked-pulse'), 2500);
    }
  });
  biz.pendingPulse = [];

  // Events log
  const evBox = card.querySelector('.js-events');
  evBox.innerHTML = biz.events.slice(0, 5).map(e =>
    `<div class="evt-${e.kind === 'bad' ? 'bad' : 'good'}">${escapeHtml(e.text)}</div>`
  ).join('');

  // Header total
  renderHeader();
}

function endWidgetPhase() {
  widgetEnded = true;
  if (widgetTimer) { clearInterval(widgetTimer); widgetTimer = null; }
  state.phase = 'end';
  renderHeader();
  showEndScreen();
}

els.widgetEndBtn.addEventListener('click', () => {
  if (confirm('End Phase 3 now and show final results?')) endWidgetPhase();
});

// ──────────────────────────────────────────────────────────
//  End screen — bar chart
// ──────────────────────────────────────────────────────────

function showEndScreen() {
  showScreen('end');
  const sorted = state.players.slice().sort((a, b) => a.money - b.money);
  const minM   = Math.min(0, ...sorted.map(p => p.money));
  const maxM   = Math.max(0, ...sorted.map(p => p.money));
  const span   = Math.max(1, maxM - minM);
  const zeroPct = ((0 - minM) / span) * 100;

  els.chart.innerHTML = '';
  sorted.forEach(p => {
    const row     = document.createElement('div');
    row.className = 'bar-row';
    const widthPct = (Math.abs(p.money) / span) * 100;
    const fillStyle = p.money >= 0
      ? `left:${zeroPct}%; width:${widthPct}%;`
      : `left:${zeroPct - widthPct}%; width:${widthPct}%;`;
    const negCls  = p.money < 0 ? 'neg' : '';
    const occ     = getOccupation(p.occupationId);
    const h       = getHousing(p.housingId);
    const pf      = p.portfolioId ? getPortfolio(p.portfolioId) : null;
    const pfClass = pf ? (pf.risk === 'low' ? 'pf-low' : pf.risk === 'mid' ? 'pf-mid' : 'pf-high') : '';
    row.innerHTML = `
      <div class="bar-label">
        <div class="bar-name">${escapeHtml(p.name)}</div>
        <div class="bar-meta">
          ${escapeHtml(occ.name)} · ${escapeHtml(h.name)}
          ${p.educationDebt > 0 ? `· started ${formatMoney(-p.educationDebt)} in debt` : ''}
          ${pf ? `<span class="pf ${pfClass}">${escapeHtml(pf.name)}</span>` : ''}
        </div>
      </div>
      <div class="bar-track">
        <div class="zero-line" style="left:${zeroPct}%"></div>
        <div class="bar-fill ${negCls}" style="${fillStyle}"></div>
      </div>
      <div class="bar-value ${p.money < 0 ? 'bad' : ''}">${formatMoney(p.money)}</div>
    `;
    els.chart.appendChild(row);
  });
}

els.restartBtn.addEventListener('click', () => {
  if (widgetTimer) { clearInterval(widgetTimer); widgetTimer = null; }
  widgetEnded   = false;
  widgetElapsed = 0;
  state.players = [];
  state.round   = 0;
  state.phase   = 'setup-count';
  showScreen('setup-count');
});

// ──────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

showScreen('setup-count');
