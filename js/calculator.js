/* ─────────────────────────────────────────────────────────────────────────────
   GrantHarvest — Grant Sizing Tool
   js/calculator.js  —  Scoring & Calculation Engine
   Depends on: data.js (GRANT_PROGRAMS, STATE_DATA, FARM_SIZE_ACRES, REVENUE_MIDPOINTS)
───────────────────────────────────────────────────────────────────────────── */

'use strict';

// ─── SCORING ─────────────────────────────────────────────────────────────────

/**
 * Score a single grant against user answers.
 * Returns null if the grant is definitively ineligible.
 * Returns a numeric relevance score (0–100) otherwise.
 */
function scoreGrant(grant, answers) {
  const acres   = FARM_SIZE_ACRES[answers.farmSize]   || 30;
  const revenue = REVENUE_MIDPOINTS[answers.revenue]  || 175000;

  // ── Hard eligibility gates ────────────────────────────────────────────────
  if (grant.sizeMin && acres < grant.sizeMin) return null;
  if (grant.sizeMax && acres > grant.sizeMax) return null;
  if (grant.revenueMax && revenue > grant.revenueMax) return null;

  // Farm type gate (only filter if grant is not open to 'all')
  if (!grant.farmTypes.includes('all')) {
    if (!grant.farmTypes.includes(answers.farmType)) return null;
  }

  // State-specific gate
  if (grant.stateSpecific && Array.isArray(grant.stateSpecific)) {
    if (!grant.stateSpecific.includes(answers.state)) return null;
  }

  // ── Relevance scoring ─────────────────────────────────────────────────────
  let score = 40; // base: passes eligibility

  // Purpose match — most important factor
  const purposes    = answers.purposes   || [];
  const demographics = answers.demographics || [];
  const practices   = answers.practices  || [];

  const purposeHits = grant.purposes.filter(p => purposes.includes(p)).length;
  score += purposeHits * 18;
  // Small penalty if no purpose match (grant is eligible but off-target)
  if (purposeHits === 0) score -= 15;

  // Demographics priority
  const demoHits = (grant.priorityDemographics || []).filter(d => demographics.includes(d)).length;
  score += demoHits * 12;

  // Practice bonus
  const practiceHits = (grant.practiceBonus || []).filter(p => practices.includes(p)).length;
  score += practiceHits * 8;

  // Status freshness bonus
  if (grant.status === 'open')    score += 10;
  if (grant.status === 'rolling') score += 8;
  if (grant.urgency === 'urgent') score += 5;
  if (grant.urgency === 'high')   score += 3;

  return Math.max(score, 0);
}

// ─── MAIN CALCULATOR ─────────────────────────────────────────────────────────

/**
 * calculateGrants(answers) → result object
 *
 * answers shape:
 *   farmType   string   (row-crops | specialty | livestock | dairy | poultry |
 *                         aquaculture | nursery | organic | mixed)
 *   farmSize   string   (hobby | small | family | mid | large)
 *   state      string   (2-letter code)
 *   purposes   string[] (conservation | equipment | emergency | research |
 *                         marketing | energy | labor | land | organic | beginning-farmer)
 *   demographics string[] (beginning-farmer | veteran | minority | women)
 *   revenue    string   (micro | low | small | moderate | large | commercial)
 *   practices  string[] (conservation | organic | energy | direct-market |
 *                         value-added | precision-ag | solar)
 */
function calculateGrants(answers) {
  const stateData = STATE_DATA[answers.state] || {
    name: 'Your State', tier: 3, bonusMin: 15000, bonusMax: 75000, programCount: 4
  };

  // Score all programs
  const scored = [];
  const liveData = window._liveGrantData || [];

  // Merge static + any live data (live wins on duplicate id)
  const liveIds = new Set(liveData.map(g => g.id));
  const allPrograms = [...liveData, ...GRANT_PROGRAMS.filter(g => !liveIds.has(g.id))];

  for (const grant of allPrograms) {
    const s = scoreGrant(grant, answers);
    if (s !== null) {
      scored.push({ ...grant, matchScore: s });
    }
  }

  // Sort: score descending, then amountMax descending
  scored.sort((a, b) =>
    b.matchScore !== a.matchScore
      ? b.matchScore - a.matchScore
      : b.amountMax - a.amountMax
  );

  const federal = scored.filter(g => g.type === 'federal');
  const statePrograms = scored.filter(g => g.type === 'state');

  // Range calculation
  // Low:  sum of top-3 matching programs at their min amounts
  // High: sum of top-7 matching programs at their max amounts + state bonus
  const top3  = scored.slice(0, 3);
  const top7  = scored.slice(0, 7);

  const federalMin  = top3.filter(g => g.type === 'federal').reduce((s, g) => s + g.amountMin, 0);
  const federalMax  = top7.filter(g => g.type === 'federal').reduce((s, g) => s + g.amountMax, 0);

  const totalMin = Math.max(top3.reduce((s, g) => s + g.amountMin, 0) + stateData.bonusMin, 0);
  const totalMax = top7.reduce((s, g) => s + g.amountMax, 0) + stateData.bonusMax;

  // Urgency: programs that are open or high urgency
  const urgent = scored.filter(g =>
    g.status === 'open' || g.urgency === 'urgent' || g.urgency === 'high'
  );

  return {
    programs:       scored,
    totalMin,
    totalMax,
    federalMin,
    federalMax,
    stateMin:       stateData.bonusMin,
    stateMax:       stateData.bonusMax,
    federalCount:   federal.length,
    stateCount:     statePrograms.length + 1, // +1 for state bucket
    stateProgramCount: stateData.programCount,
    urgentCount:    urgent.length,
    topPrograms:    scored.slice(0, 10),
    urgentPrograms: urgent.slice(0, 3),
    stateData,
  };
}

// ─── RUNNING TALLY (partial estimate during wizard) ──────────────────────────

/**
 * Returns a rough estimate after step 2+ so we can show a running tally.
 * Uses only the answers collected so far.
 */
function quickEstimate(partialAnswers) {
  if (!partialAnswers.farmSize) return null;

  const stateData = partialAnswers.state
    ? (STATE_DATA[partialAnswers.state] || {bonusMin:15000, bonusMax:75000})
    : {bonusMin:15000, bonusMax:75000};

  const filled = Object.assign({
    farmType: 'mixed', state: 'IA',
    purposes: ['conservation', 'equipment'],
    demographics: [], practices: [], revenue: 'small',
  }, partialAnswers);

  const result = calculateGrants(filled);
  return { min: result.totalMin, max: result.totalMax };
}

// ─── FORMATTING UTILITIES ─────────────────────────────────────────────────────

function formatCurrency(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000)    return '$' + Math.round(n / 1000) + 'K';
  return '$' + n.toLocaleString();
}

function formatCurrencyFull(n) {
  return '$' + Math.round(n).toLocaleString();
}

function getUrgencyLabel(urgency) {
  switch (urgency) {
    case 'urgent': return 'Open Now — Apply ASAP';
    case 'high':   return 'Deadline Approaching';
    case 'medium': return 'Upcoming Cycle';
    case 'low':    return 'Planning Stage';
    default:       return '';
  }
}

function getStatusBadge(status, urgency) {
  if (status === 'open' || urgency === 'urgent') {
    return { text: 'Open Now', cls: 'urgent' };
  }
  if (status === 'rolling') {
    return { text: 'Rolling', cls: 'rolling' };
  }
  if (status === 'soon' || urgency === 'high') {
    return { text: 'Opening Soon', cls: 'urgent' };
  }
  return { text: 'Periodic', cls: '' };
}
