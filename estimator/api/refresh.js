/* ─────────────────────────────────────────────────────────────────────────────
   GrantHarvest — Grant Sizing Tool
   api/refresh.js  —  Vercel Serverless Function (Cron + On-Demand)

   DEPLOYMENT: Place in /api/refresh.js at the project root in a Vercel project.
   Add to vercel.json:
   {
     "crons": [{ "path": "/api/refresh", "schedule": "0 6 * * *" }]
   }

   This function:
   1. Fetches live agricultural grants from grants.gov (USDA category)
   2. Fetches supplemental data from USDA NRCS / FSA program pages
   3. Merges with the static baseline from data.js structure
   4. Stores the result in Vercel KV (or falls back to response caching)
   5. The tool's fetchLiveGrants() reads from /api/grants.json (see below)

   ENVIRONMENT VARIABLES required:
     KV_REST_API_URL    — Vercel KV store URL
     KV_REST_API_TOKEN  — Vercel KV auth token
     REFRESH_SECRET     — Optional secret to protect manual triggers
───────────────────────────────────────────────────────────────────────────── */

// ─── CANONICAL FALLBACK URLS (used when a stored URL returns 404/301) ────────
// USDA restructured its website — these stable roots replace broken deep-links.
const CANONICAL_ROOTS = {
  nrcs:    'https://www.nrcs.usda.gov/programs-initiatives/',
  fsa:     'https://www.fsa.usda.gov/resources/',               // FSA reorg (2024-25): /programs-and-services/ retired → /resources/
  rd:      'https://www.rd.usda.gov/programs-services/',
  ams:     'https://www.ams.usda.gov/services/grants/',          // AMS grants moved /grants/ → /services/grants/
  nifa:    'https://www.nifa.usda.gov/grants/',
  usda:    'https://www.usda.gov/topics/farming',
  sare:    'https://www.sare.org/grants/',
  default: 'https://www.grants.gov/search-grants?fundingCategories=AG',
};

// Map program agency strings → canonical root key
function agencyToRoot(agency = '') {
  const a = agency.toLowerCase();
  if (a.includes('nrcs'))             return CANONICAL_ROOTS.nrcs;
  if (a.includes('fsa'))              return CANONICAL_ROOTS.fsa;
  if (a.includes('rural development')) return CANONICAL_ROOTS.rd;
  if (a.includes('ams'))              return CANONICAL_ROOTS.ams;
  if (a.includes('nifa'))             return CANONICAL_ROOTS.nifa;
  if (a.includes('sare'))             return CANONICAL_ROOTS.sare;
  return CANONICAL_ROOTS.usda;
}

// ─── GRANTS.GOV API CONFIG ───────────────────────────────────────────────────

// NOTE (June 2026): grants.gov modernized its API. The legacy apply07 SOAP/REST
// path below still responds, but the supported endpoint is now the unauthenticated
//   POST https://api.grants.gov/v1/api/search2
// with body { keyword, oppStatuses:'posted', fundingCategories:'AG', rows:50 }.
// Its response wraps hits in { data: { oppHits: [...] } } — if you migrate, parse
// data.data.oppHits (see fetchFromGrantsGov). Docs: grants.gov/api/api-guide.
const GRANTS_GOV_URL   = 'https://apply07.grants.gov/grantsws/rest/opportunities/search/';
const GRANTS_GOV_URL_V2 = 'https://api.grants.gov/v1/api/search2'; // modern endpoint (see note above)
const GRANTS_GOV_BODY  = {
  fundingCategories: 'AG',   // Agriculture category code
  oppStatuses: 'posted',     // Only currently open/posted grants
  rows: 50,
  startRecordNum: 0,
};

// USDA program supplement — checked for state-level context
const USDA_RD_URL = 'https://www.rd.usda.gov/newsroom/program-fact-sheets';

// KV cache key
const CACHE_KEY = 'gh:grants:v1';
const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Security: allow cron (no auth header) or requests with the refresh secret
  const secret = process.env.REFRESH_SECRET;
  if (secret && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (secret && req.headers['x-refresh-secret'] !== secret &&
      req.headers['authorization'] !== `Bearer ${secret}`) {
    // If triggered by Vercel cron, the header won't be present — allow it
    const isCron = req.headers['x-vercel-cron'] === '1';
    if (!isCron) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const programs = await fetchAndMergeGrants();

    const payload = {
      lastUpdated: new Date().toISOString(),
      source: 'grants.gov + GrantHarvest baseline',
      programCount: programs.length,
      programs,
    };

    // ── Store in Vercel KV if available ──────────────────────────────────
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await kvSet(CACHE_KEY, payload, CACHE_TTL);
    }

    return res.status(200).json({
      ok: true,
      programCount: programs.length,
      lastUpdated: payload.lastUpdated,
    });

  } catch (err) {
    console.error('[gh:refresh] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── /api/grants.json READER ──────────────────────────────────────────────────
// Separate endpoint the browser tool calls.  Add this file as /api/grants.js:
//
// export default async function handler(req, res) {
//   res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
//   res.setHeader('Access-Control-Allow-Origin', '*');
//   try {
//     const data = await kvGet('gh:grants:v1');
//     if (!data) return res.status(404).json({ error: 'No cache yet — run /api/refresh first' });
//     return res.status(200).json(data);
//   } catch(e) {
//     return res.status(500).json({ error: e.message });
//   }
// }

// ─── URL VALIDATION ───────────────────────────────────────────────────────────

/**
 * validateUrl(url, agency)
 * HEAD-checks a URL. Returns the original if healthy (2xx/3xx to same host),
 * or the canonical fallback root for the program's agency if it 404s/errors.
 * Times out quickly (3s) to avoid slowing the cron run.
 */
async function validateUrl(url, agency = '') {
  if (!url || url === '#') return agencyToRoot(agency);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 404 || res.status >= 500) {
      console.warn(`[gh:url-check] 404/error on ${url} — swapping to canonical root`);
      return agencyToRoot(agency);
    }
    return url; // healthy
  } catch {
    return agencyToRoot(agency); // timeout or DNS failure → fallback
  }
}

/**
 * validateProgramUrls(programs)
 * Runs URL validation in parallel (batched) across all programs.
 * Updates the url field in-place for any broken links.
 */
async function validateProgramUrls(programs) {
  const BATCH = 8; // concurrent HEAD requests at a time
  for (let i = 0; i < programs.length; i += BATCH) {
    const batch = programs.slice(i, i + BATCH);
    await Promise.all(batch.map(async (p) => {
      p.url = await validateUrl(p.url, p.agency);
    }));
  }
  return programs;
}

// ─── FETCH + MERGE ────────────────────────────────────────────────────────────

async function fetchAndMergeGrants() {
  let livePrograms = [];

  try {
    livePrograms = await fetchFromGrantsGov();
    console.log(`[gh:refresh] grants.gov returned ${livePrograms.length} programs`);
  } catch (err) {
    console.warn('[gh:refresh] grants.gov fetch failed:', err.message, '— using baseline only');
  }

  // Validate all URLs — auto-heal any 404s before caching
  if (livePrograms.length > 0) {
    console.log('[gh:refresh] Validating program URLs…');
    livePrograms = await validateProgramUrls(livePrograms);
    console.log('[gh:refresh] URL validation complete');
  }

  // De-duplicate: live data takes precedence over baseline on same id.
  // Static baseline (data.js) is loaded by the browser tool directly.
  // Here we return ONLY live programs so the tool can overlay them.
  return livePrograms;
}

// ─── GRANTS.GOV FETCH + NORMALIZE ────────────────────────────────────────────

async function fetchFromGrantsGov() {
  const response = await fetch(GRANTS_GOV_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(GRANTS_GOV_BODY),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`grants.gov responded ${response.status}`);
  }

  const data = await response.json();
  const hits  = data.oppHits || data.opportunities || [];

  return hits.map(normalizeGrantsGovRecord).filter(Boolean);
}

/**
 * Map a grants.gov opportunity record to our internal schema.
 * Fields that don't exist in the live record fall back to safe defaults.
 */
function normalizeGrantsGovRecord(hit) {
  if (!hit || !hit.id) return null;

  const amountMin = parseInt(hit.awardFloor,   10) || 0;
  const amountMax = parseInt(hit.awardCeiling, 10) || 500000;

  return {
    // Identity
    id:         'gov_' + hit.id,
    name:       truncate(hit.title || 'USDA Grant', 60),
    fullName:   hit.title || '',
    agency:     hit.agencyName || hit.agencyCode || 'Federal',
    type:       'federal',
    liveRecord: true,

    // Eligibility (grants.gov doesn't expose fine-grained eligibility; use safe defaults)
    purposes:   inferPurposes(hit.title || '', hit.synopsis || ''),
    farmTypes:  ['all'],
    sizeMin:    null,
    sizeMax:    null,
    revenueMax: null,

    // Amounts
    amountMin:  amountMin,
    amountMax:  amountMax > 0 ? amountMax : 500000,
    amountAvg:  amountMax > 0 ? Math.round((amountMin + amountMax) / 2) : 100000,

    // Timing
    urgency:    hit.closeDate ? getUrgencyFromDate(hit.closeDate) : 'medium',
    status:     hit.oppStatus === 'posted' ? 'open' : 'rolling',
    applicationWindow: formatDateRange(hit.openDate, hit.closeDate),
    processingDaysMin: 45,
    processingDaysMax: 120,
    disbursementNote:  'See program guidelines',

    // Priority / bonus
    priorityDemographics: [],
    stateSpecific:        null,
    practiceBonus:        [],

    // Display
    description: truncate(hit.synopsis || hit.description || 'Federal agricultural grant opportunity. Visit grants.gov for full details.', 280),
    url:         `https://www.grants.gov/search-results-detail/${hit.id}`,
  };
}

// ─── INFERENCE HELPERS ────────────────────────────────────────────────────────

const PURPOSE_KEYWORDS = {
  conservation: ['conservation', 'eqip', 'csp', 'wildlife', 'wetland', 'soil', 'water quality', 'erosion'],
  equipment:    ['equipment', 'machinery', 'infrastructure', 'facility', 'technology', 'irrigation'],
  emergency:    ['emergency', 'disaster', 'drought', 'flood', 'hurricane', 'wildfire', 'relief'],
  research:     ['research', 'innovation', 'sbir', 'sttr', 'study', 'extension', 'demonstration'],
  marketing:    ['market', 'value-added', 'processing', 'food hub', 'local food', 'farmers market'],
  energy:       ['energy', 'solar', 'renewable', 'reap', 'bioenergy', 'biomass', 'efficiency'],
  labor:        ['labor', 'workforce', 'training', 'outreach', 'education', 'technical assistance'],
  land:         ['land', 'easement', 'acep', 'crp', 'farmland', 'pasture', 'grazing'],
  organic:      ['organic', 'certification', 'transition'],
  'beginning-farmer': ['beginning farmer', 'new farmer', 'young farmer', 'beginning rancher'],
};

function inferPurposes(title, synopsis) {
  const text   = (title + ' ' + synopsis).toLowerCase();
  const matched = [];
  for (const [purpose, keywords] of Object.entries(PURPOSE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) matched.push(purpose);
  }
  return matched.length > 0 ? matched : ['conservation'];
}

function getUrgencyFromDate(closeDateStr) {
  if (!closeDateStr) return 'medium';
  const closeDate = new Date(closeDateStr);
  const daysLeft  = Math.ceil((closeDate - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 14)  return 'urgent';
  if (daysLeft <= 45)  return 'high';
  if (daysLeft <= 120) return 'medium';
  return 'low';
}

function formatDateRange(openStr, closeStr) {
  const fmt = s => {
    try { return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return s || ''; }
  };
  if (openStr && closeStr) return `${fmt(openStr)} – ${fmt(closeStr)}`;
  if (closeStr)            return `Closes ${fmt(closeStr)}`;
  return 'See grants.gov for dates';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ─── VERCEL KV HELPERS ────────────────────────────────────────────────────────

async function kvSet(key, value, ttlSeconds) {
  const url = `${process.env.KV_REST_API_URL}/set/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
  });
  if (!res.ok) throw new Error('KV set failed: ' + res.status);
}

async function kvGet(key) {
  const url = `${process.env.KV_REST_API_URL}/get/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  });
  if (!res.ok) return null;
  const body = await res.json();
  try { return JSON.parse(body.result); }
  catch { return null; }
}
