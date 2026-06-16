/* ─────────────────────────────────────────────────────────────────────────────
   GrantHarvest — Grant Sizing Tool
   js/data.js  —  Static Baseline Grant Database

   This is the foundation data layer. The live endpoint /api/grants.json
   (served by api/refresh.js on a daily cron) overlays and enriches this
   data when available. If the live endpoint is unreachable, this file
   is the complete fallback.

   Schema v1.0 | Last manual review: June 2026 (all 22 URLs browser-verified live)
   Sources: USDA NRCS, FSA, Rural Development, AMS, SARE, SBA, grants.gov
───────────────────────────────────────────────────────────────────────────── */

'use strict';

// ─── SIZE / REVENUE LOOKUP MAPS ──────────────────────────────────────────────

const FARM_SIZE_ACRES = {
  hobby:       5,
  small:       30,
  family:     150,
  mid:        600,
  large:     2000,
};

const REVENUE_MIDPOINTS = {
  micro:       17500,
  low:         67500,
  small:      175000,
  moderate:   625000,
  large:     3000000,
  commercial:10000000,
};

// ─── FEDERAL & NATIONAL GRANT PROGRAMS ───────────────────────────────────────
/*
  Each record:
    id              unique key
    name            short name / acronym
    fullName        official full program name
    agency          administering agency
    type            federal | state | private
    purposes[]      conservation | equipment | emergency | research |
                    marketing | energy | labor | land | organic | beginning-farmer
    farmTypes[]     all | row-crops | specialty | livestock | dairy |
                    poultry | aquaculture | nursery | organic | mixed
    sizeMin         minimum acres (null = no minimum)
    sizeMax         maximum acres (null = no maximum)
    revenueMax      AGI/revenue ceiling in USD (null = no cap)
    amountMin       lowest realistic single-award amount
    amountMax       highest realistic single-award amount
    amountAvg       typical award for a well-matched applicant
    urgency         urgent | high | medium | low
    status          open | soon | rolling | closed
    applicationWindow  plain-language window description
    processingDaysMin  days from application to decision
    processingDaysMax
    disbursementNote   plain-language payment timing
    priorityDemographics[]  beginning-farmer | veteran | minority | women
    stateSpecific   null (all states) or array of eligible state codes
    practiceBonus[] practices that increase relevance score
    description     2–3 sentence plain-language description
    url             authoritative source URL
*/

const GRANT_PROGRAMS = [

  // ── CONSERVATION ────────────────────────────────────────────────────────

  {
    id: 'eqip',
    name: 'EQIP',
    fullName: 'Environmental Quality Incentives Program',
    agency: 'USDA NRCS',
    type: 'federal',
    purposes: ['conservation', 'equipment', 'land'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: 2000000,
    amountMin: 5000, amountMax: 450000, amountAvg: 75000,
    urgency: 'medium', status: 'rolling',
    applicationWindow: 'Rolling sign-up; county NRCS offices rank applications periodically',
    processingDaysMin: 60, processingDaysMax: 120,
    disbursementNote: 'Cost-share payment upon practice completion; typically 30–90 days after',
    priorityDemographics: ['beginning-farmer', 'veteran', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['conservation', 'energy'],
    description: 'USDA\'s largest conservation program, providing cost-share payments (up to 75%) for improving soil health, water quality, wildlife habitat, and air quality on working agricultural lands. Priority applicants receive higher payment rates.',
    url: 'https://www.nrcs.usda.gov/programs-initiatives/environmental-quality-incentives-program',
  },

  {
    id: 'csp',
    name: 'CSP',
    fullName: 'Conservation Stewardship Program',
    agency: 'USDA NRCS',
    type: 'federal',
    purposes: ['conservation', 'land'],
    farmTypes: ['all'],
    sizeMin: 10, sizeMax: null, revenueMax: 2000000,
    amountMin: 20000, amountMax: 200000, amountAvg: 65000,
    urgency: 'medium', status: 'rolling',
    applicationWindow: 'Annual ranking periods; applications accepted year-round',
    processingDaysMin: 90, processingDaysMax: 180,
    disbursementNote: 'Annual payments over 5-year contract',
    priorityDemographics: ['beginning-farmer', 'veteran', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['conservation'],
    description: 'Annual stewardship payments reward farmers who maintain and build on existing conservation systems. 5-year contracts with performance-based payments for adopting advanced practices beyond the baseline — the more you do, the more you earn.',
    url: 'https://www.nrcs.usda.gov/programs-initiatives/conservation-stewardship-program',
  },

  {
    id: 'rcpp',
    name: 'RCPP',
    fullName: 'Regional Conservation Partnership Program',
    agency: 'USDA NRCS',
    type: 'federal',
    purposes: ['conservation', 'land', 'research'],
    farmTypes: ['all'],
    sizeMin: 50, sizeMax: null, revenueMax: null,
    amountMin: 100000, amountMax: 2000000, amountAvg: 400000,
    urgency: 'low', status: 'soon',
    applicationWindow: 'Competitive NOFA; typically spring — check nrcs.usda.gov',
    processingDaysMin: 120, processingDaysMax: 270,
    disbursementNote: 'Multi-year project disbursement tied to milestones',
    priorityDemographics: ['beginning-farmer', 'minority'],
    stateSpecific: null,
    practiceBonus: ['conservation'],
    description: 'Landscape-scale conservation projects delivered through partner organizations (watershed districts, tribes, land trusts). Best for farms within an active RCPP partnership area — your NRCS office can confirm enrollment opportunities.',
    url: 'https://www.nrcs.usda.gov/programs-initiatives/regional-conservation-partnership-program',
  },

  {
    id: 'acep',
    name: 'ACEP',
    fullName: 'Agricultural Conservation Easement Program',
    agency: 'USDA NRCS',
    type: 'federal',
    purposes: ['land', 'conservation'],
    farmTypes: ['all'],
    sizeMin: 50, sizeMax: null, revenueMax: null,
    amountMin: 100000, amountMax: 3000000, amountAvg: 550000,
    urgency: 'low', status: 'rolling',
    applicationWindow: 'Rolling; county NRCS offices',
    processingDaysMin: 180, processingDaysMax: 365,
    disbursementNote: 'Lump sum or installment at easement closing',
    priorityDemographics: ['beginning-farmer', 'minority'],
    stateSpecific: null,
    practiceBonus: ['conservation'],
    description: 'Pays landowners fair market value to place permanent or long-term easements protecting productive agricultural land and wetlands from development. A major source of capital for retiring farmers transitioning land to the next generation.',
    url: 'https://www.nrcs.usda.gov/programs-initiatives/agricultural-conservation-easement-program',
  },

  {
    id: 'crp',
    name: 'CRP',
    fullName: 'Conservation Reserve Program',
    agency: 'USDA FSA',
    type: 'federal',
    purposes: ['conservation', 'land'],
    farmTypes: ['row-crops', 'mixed', 'all'],
    sizeMin: 10, sizeMax: null, revenueMax: null,
    amountMin: 10000, amountMax: 300000, amountAvg: 45000,
    urgency: 'low', status: 'rolling',
    applicationWindow: 'Annual general sign-up + continuous sign-up for priority practices',
    processingDaysMin: 60, processingDaysMax: 120,
    disbursementNote: 'Annual rental payments for 10–15 year contract',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['conservation'],
    description: 'Annual per-acre rental payments ($50–$300+/acre) for converting environmentally sensitive cropland to conservation cover for 10–15 years. Also includes the CLEAR30 option for 30-year permanent retirement.',
    url: 'https://www.fsa.usda.gov/resources/conservation/conservation-reserve-program',
  },

  // ── VALUE-ADDED & MARKETING ──────────────────────────────────────────────

  {
    id: 'vapg',
    name: 'VAPG',
    fullName: 'Value-Added Producer Grant',
    agency: 'USDA Rural Development',
    type: 'federal',
    purposes: ['marketing', 'equipment'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 25000, amountMax: 200000, amountAvg: 100000,
    urgency: 'high', status: 'soon',
    applicationWindow: 'Annual NOFA; typically December–February',
    processingDaysMin: 90, processingDaysMax: 150,
    disbursementNote: 'Quarterly reimbursements over 2-year project period',
    priorityDemographics: ['beginning-farmer', 'veteran', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['direct-market', 'value-added'],
    description: 'Helps agricultural producers enter new markets or develop value-added products. Planning grants (up to $50K) fund feasibility studies and business plans; working capital grants (up to $200K) fund operating costs of a new venture. Requires a 1:1 matching contribution (cash or in-kind).',
    url: 'https://www.rd.usda.gov/programs-services/business-programs/value-added-producer-grants',
  },

  {
    id: 'fmpp',
    name: 'FMPP',
    fullName: 'Farmers Market Promotion Program',
    agency: 'USDA AMS',
    type: 'federal',
    purposes: ['marketing', 'labor'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 50000, amountMax: 500000, amountAvg: 150000,
    urgency: 'medium', status: 'soon',
    applicationWindow: 'Annual NOFA; typically spring',
    processingDaysMin: 90, processingDaysMax: 180,
    disbursementNote: 'Quarterly reimbursements',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['direct-market'],
    description: 'Develops, coordinates, and expands direct producer-to-consumer markets — farmers markets, CSAs, farm stands, and agritourism. Covers infrastructure, outreach, technology, and operations.',
    url: 'https://www.ams.usda.gov/services/grants/fmpp',
  },

  {
    id: 'lfpp',
    name: 'LFPP',
    fullName: 'Local Food Promotion Program',
    agency: 'USDA AMS',
    type: 'federal',
    purposes: ['marketing', 'equipment', 'labor'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 50000, amountMax: 500000, amountAvg: 175000,
    urgency: 'medium', status: 'soon',
    applicationWindow: 'Annual NOFA; typically spring',
    processingDaysMin: 90, processingDaysMax: 180,
    disbursementNote: 'Quarterly reimbursements',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['direct-market', 'value-added'],
    description: 'Supports development and expansion of regional food systems — aggregation, processing, distribution, storage, and marketing infrastructure. Ideal for mid-tier value-chain projects and food hubs.',
    url: 'https://www.ams.usda.gov/services/grants/lfpp',
  },

  // ── ENERGY ──────────────────────────────────────────────────────────────

  {
    id: 'reap',
    name: 'REAP',
    fullName: 'Rural Energy for America Program',
    agency: 'USDA Rural Development',
    type: 'federal',
    purposes: ['energy', 'equipment'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 2500, amountMax: 1000000, amountAvg: 80000,
    urgency: 'high', status: 'rolling',
    applicationWindow: 'Quarterly application cycles; rolling pre-applications accepted',
    processingDaysMin: 45, processingDaysMax: 90,
    disbursementNote: 'Upon project completion or phased for large projects',
    priorityDemographics: [],
    stateSpecific: null,
    practiceBonus: ['energy', 'solar'],
    description: 'Grants cover up to 25% of eligible project costs for renewable energy systems (solar, wind, biogas) or energy efficiency improvements. The remaining 75% can be financed through the REAP guaranteed loan — making it a powerful combo.',
    url: 'https://www.rd.usda.gov/programs-services/energy-programs/rural-energy-america-program-renewable-energy-systems-energy-efficiency-improvement-grants',
  },

  {
    id: 'high-energy',
    name: 'High Energy Cost Grant',
    fullName: 'High Energy Cost Grant Program',
    agency: 'USDA Rural Utilities Service',
    type: 'federal',
    purposes: ['energy', 'land'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 100000, amountMax: 4000000, amountAvg: 500000,
    urgency: 'low', status: 'soon',
    applicationWindow: 'Annual NOFA; competitive',
    processingDaysMin: 120, processingDaysMax: 240,
    disbursementNote: 'Project-based milestone disbursement',
    priorityDemographics: [],
    stateSpecific: ['AK','HI','MT','ND','SD','WY','ID','NM','NV','ME','VT','NH','WV','MS','AR'],
    practiceBonus: ['energy'],
    description: 'Grants for rural communities and businesses in areas where energy costs are 275% above the national average. Funds improvements to generation, transmission, and distribution infrastructure — a major opportunity for remote agricultural operations.',
    url: 'https://www.rd.usda.gov/programs-services/electric-programs/high-energy-cost-grants',
  },

  // ── RESEARCH ────────────────────────────────────────────────────────────

  {
    id: 'sare-farmer',
    name: 'SARE Farmer/Rancher Grant',
    fullName: 'SARE — Farmer/Rancher Research Grant',
    agency: 'SARE (USDA-funded)',
    type: 'federal',
    purposes: ['research', 'conservation'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 7500, amountMax: 30000, amountAvg: 18000,
    urgency: 'medium', status: 'open',
    applicationWindow: 'Annual; varies by region — fall through winter',
    processingDaysMin: 60, processingDaysMax: 120,
    disbursementNote: 'Milestone-based reimbursements',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['organic', 'conservation'],
    description: 'Small grants for farmers to conduct on-farm research into sustainable practices. Test new crops, compare tillage systems, evaluate pest management strategies, or document innovations — then share results with your region.',
    url: 'https://www.sare.org/grants/',
  },

  {
    id: 'sare-research',
    name: 'SARE Research & Education Grant',
    fullName: 'SARE — Research & Education Grant',
    agency: 'SARE (USDA-funded)',
    type: 'federal',
    purposes: ['research'],
    farmTypes: ['all'],
    sizeMin: 50, sizeMax: null, revenueMax: null,
    amountMin: 75000, amountMax: 200000, amountAvg: 130000,
    urgency: 'medium', status: 'open',
    applicationWindow: 'Annual NOFA; varies by SARE region',
    processingDaysMin: 90, processingDaysMax: 150,
    disbursementNote: 'Quarterly reimbursements over 2-3 year project',
    priorityDemographics: [],
    stateSpecific: null,
    practiceBonus: ['organic', 'conservation'],
    description: 'Larger collaborative grants for farmer-researcher teams addressing regional sustainable agriculture challenges. Requires at least one farmer co-cooperator. Multi-year projects that generate transferable knowledge.',
    url: 'https://www.sare.org/grants/',
  },

  {
    id: 'scbgp',
    name: 'Specialty Crop Block Grant',
    fullName: 'Specialty Crop Block Grant Program',
    agency: 'USDA AMS → State Dept. of Agriculture',
    type: 'federal',
    purposes: ['research', 'marketing', 'conservation'],
    farmTypes: ['specialty', 'organic', 'nursery', 'aquaculture'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 10000, amountMax: 500000, amountAvg: 100000,
    urgency: 'medium', status: 'rolling',
    applicationWindow: 'State-administered; typically spring–summer — check your state dept. of agriculture',
    processingDaysMin: 90, processingDaysMax: 180,
    disbursementNote: 'Varies by state; typically quarterly',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['organic', 'direct-market'],
    description: 'Federal block grants distributed through state agriculture departments exclusively for fruits, vegetables, tree nuts, dried fruits, horticulture, and nursery crops. Apply directly through your state\'s department of agriculture.',
    url: 'https://www.ams.usda.gov/services/grants/scbgp',
  },

  {
    id: 'sbir',
    name: 'SBIR / STTR — Agriculture',
    fullName: 'Small Business Innovation Research / Technology Transfer — USDA NIFA',
    agency: 'USDA NIFA / SBA',
    type: 'federal',
    purposes: ['research', 'equipment'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 150000, amountMax: 1500000, amountAvg: 400000,
    urgency: 'medium', status: 'rolling',
    applicationWindow: 'Multiple solicitations annually; see sbir.gov',
    processingDaysMin: 90, processingDaysMax: 180,
    disbursementNote: 'Phase I then Phase II awards',
    priorityDemographics: ['women', 'minority'],
    stateSpecific: null,
    practiceBonus: ['precision-ag', 'value-added'],
    description: 'Competitive R&D grants for small businesses developing agricultural innovations — precision ag technology, climate resilience tools, food safety systems, or novel crop varieties. Phase I ($150K–$275K) proves feasibility; Phase II (up to $1.5M) commercializes.',
    url: 'https://www.nifa.usda.gov/grants/programs/sbir-sttr',
  },

  // ── ORGANIC ──────────────────────────────────────────────────────────────

  {
    id: 'occsp',
    name: 'OCCSP',
    fullName: 'Organic Certification Cost Share Program',
    agency: 'USDA AMS',
    type: 'federal',
    purposes: ['organic'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 100, amountMax: 750, amountAvg: 450,
    urgency: 'low', status: 'rolling',
    applicationWindow: 'Annual; through state dept. of agriculture',
    processingDaysMin: 30, processingDaysMax: 60,
    disbursementNote: 'Reimbursement within 60 days of application',
    priorityDemographics: [],
    stateSpecific: null,
    practiceBonus: ['organic'],
    description: 'Reimburses up to 75% (max $750 per scope) of USDA organic certification costs. Separate reimbursements for each certification scope — crops, livestock, wild crops, and handling. Stack multiple scopes for higher total reimbursement.',
    url: 'https://www.fsa.usda.gov/resources/programs/organic-certification-cost-share-program-occsp',
  },

  // ── EMERGENCY ────────────────────────────────────────────────────────────

  {
    id: 'ecp',
    name: 'ECP',
    fullName: 'Emergency Conservation Program',
    agency: 'USDA FSA',
    type: 'federal',
    purposes: ['emergency', 'land', 'conservation'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 10000, amountMax: 500000, amountAvg: 80000,
    urgency: 'urgent', status: 'rolling',
    applicationWindow: 'Post-disaster; rolling — contact local FSA office immediately after disaster',
    processingDaysMin: 30, processingDaysMax: 90,
    disbursementNote: 'Upon practice completion; emergency situations expedited',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: [],
    description: 'Cost-share assistance to restore agricultural lands and facilities damaged by natural disasters. Covers debris removal, fence repair, infrastructure restoration, and soil stabilization. Must apply within 60 days of qualifying disaster.',
    url: 'https://www.fsa.usda.gov/resources/disaster-recovery/emergency-conservation-program-ecp',
  },

  {
    id: 'fsa-emergency-loan',
    name: 'FSA Emergency Loan',
    fullName: 'Emergency Farm Loan — USDA FSA',
    agency: 'USDA FSA',
    type: 'federal',
    purposes: ['emergency'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 25000, amountMax: 500000, amountAvg: 150000,
    urgency: 'urgent', status: 'rolling',
    applicationWindow: 'Available in presidentially or SBA-designated disaster counties; rolling',
    processingDaysMin: 30, processingDaysMax: 60,
    disbursementNote: 'Within 30 days of loan approval',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: [],
    description: 'Low-interest emergency loans (up to $500K at ~2.75% fixed) for farmers in disaster-designated counties who suffered physical or production losses and cannot obtain credit elsewhere. Covers real property losses, equipment, and essential family living needs.',
    url: 'https://www.fsa.usda.gov/resources/loans/emergency-farm-loans',
  },

  {
    id: 'lfp',
    name: 'LFP',
    fullName: 'Livestock Forage Disaster Program',
    agency: 'USDA FSA',
    type: 'federal',
    purposes: ['emergency'],
    farmTypes: ['livestock', 'dairy', 'mixed'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 3000, amountMax: 150000, amountAvg: 30000,
    urgency: 'urgent', status: 'rolling',
    applicationWindow: 'Annual, after D2 or higher drought designation in your county',
    processingDaysMin: 30, processingDaysMax: 90,
    disbursementNote: 'Annual payment following application review',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: [],
    description: 'Compensates eligible livestock producers for grazing losses caused by drought or fire on native or improved pastureland. Payment rate based on livestock type (beef, dairy, sheep, horses) and drought severity level.',
    url: 'https://www.fsa.usda.gov/resources/disaster-recovery/livestock-forage-disaster-program-lfp',
  },

  {
    id: 'lip',
    name: 'LIP',
    fullName: 'Livestock Indemnity Program',
    agency: 'USDA FSA',
    type: 'federal',
    purposes: ['emergency'],
    farmTypes: ['livestock', 'dairy', 'poultry', 'mixed'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 2000, amountMax: 200000, amountAvg: 35000,
    urgency: 'urgent', status: 'rolling',
    applicationWindow: 'Apply within 30 days of qualifying loss event',
    processingDaysMin: 20, processingDaysMax: 60,
    disbursementNote: 'Within 30 days of approval',
    priorityDemographics: ['beginning-farmer', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: [],
    description: 'Compensates livestock and poultry producers for losses caused by adverse weather events, attacks by federally-reintroduced predators, or disease outbreaks. Payments at 75% of market value for eligible livestock deaths.',
    url: 'https://www.fsa.usda.gov/resources/disaster-recovery/livestock-indemnity-program-lip',
  },

  // ── BEGINNING FARMER ────────────────────────────────────────────────────

  {
    id: 'bf-direct-loan',
    name: 'Beginning Farmer Direct Loan',
    fullName: 'FSA Beginning Farmer Direct Farm Ownership Loan',
    agency: 'USDA FSA',
    type: 'federal',
    purposes: ['beginning-farmer', 'land'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 25000, amountMax: 600000, amountAvg: 200000,
    urgency: 'medium', status: 'rolling',
    applicationWindow: 'Rolling; local FSA office',
    processingDaysMin: 60, processingDaysMax: 120,
    disbursementNote: 'At land purchase closing',
    priorityDemographics: ['beginning-farmer', 'veteran', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: [],
    description: 'Preferential direct loans for beginning farmers to purchase or enlarge a farm. Reduced down payment (5% vs standard 20%), below-market interest rate, and reserved loan funding pool. Also available for operating expenses via a companion operating loan.',
    url: 'https://www.fsa.usda.gov/resources/loans/farm-ownership-loans',
  },

  // ── RURAL DEVELOPMENT ───────────────────────────────────────────────────

  {
    id: 'rbdg',
    name: 'Rural Business Development Grant',
    fullName: 'Rural Business Development Grant — USDA Rural Development',
    agency: 'USDA Rural Development',
    type: 'federal',
    purposes: ['equipment', 'marketing', 'labor'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 10000, amountMax: 500000, amountAvg: 100000,
    urgency: 'medium', status: 'rolling',
    applicationWindow: 'Rolling through state Rural Development offices',
    processingDaysMin: 60, processingDaysMax: 120,
    disbursementNote: 'Quarterly reimbursements',
    priorityDemographics: ['beginning-farmer', 'veteran', 'minority', 'women'],
    stateSpecific: null,
    practiceBonus: ['value-added', 'direct-market'],
    description: 'Funds rural economic development and job-creation projects. Note: applications are submitted by a public body, federally recognized Tribe, or rural-serving nonprofit — not by individual farms or for-profit businesses directly — but the funded work (revolving loan funds, business incubators, technical assistance, infrastructure) directly benefits farm and value-chain enterprises. Access it by partnering with a local sponsor organization.',
    url: 'https://www.rd.usda.gov/programs-services/business-programs/rural-business-development-grants',
  },

  // ── EQUITY / OUTREACH ────────────────────────────────────────────────────

  {
    id: 'section-2501',
    name: '2501 Outreach Program',
    fullName: 'Outreach & Assistance for Socially Disadvantaged Farmers (Section 2501)',
    agency: 'USDA OPPE',
    type: 'federal',
    purposes: ['beginning-farmer', 'marketing', 'labor'],
    farmTypes: ['all'],
    sizeMin: 1, sizeMax: null, revenueMax: null,
    amountMin: 50000, amountMax: 500000, amountAvg: 150000,
    urgency: 'medium', status: 'soon',
    applicationWindow: 'Annual NOFA; typically fall',
    processingDaysMin: 90, processingDaysMax: 150,
    disbursementNote: 'Quarterly reimbursements to recipient organizations',
    priorityDemographics: ['minority', 'women'],
    stateSpecific: null,
    practiceBonus: [],
    description: 'Funds community-based organizations providing outreach, education, and technical assistance to socially disadvantaged and veteran farmers. Services include farm business planning, credit counseling, land access support, and USDA program navigation.',
    url: 'https://www.nifa.usda.gov/grants/programs/outreach-assistance-veteran-farmers-ranchers-2501-program',
  },

];


// ─── STATE DATA ───────────────────────────────────────────────────────────────
/*
  tier 1: Very active state programs  — bonus $50K–$350K
  tier 2: Active state programs       — bonus $25K–$150K
  tier 3: Moderate programs           — bonus $15K–$75K

  bonusMin / bonusMax: realistic additional state-level grant funding
  programCount: approximate number of distinct state programs
  specialty: farm types with particularly strong state program support
*/

const STATE_DATA = {
  AL:{ name:'Alabama',         tier:3, bonusMin:15000, bonusMax:75000,  programCount:4,  specialty:['row-crops','livestock'] },
  AK:{ name:'Alaska',          tier:2, bonusMin:30000, bonusMax:120000, programCount:5,  specialty:['aquaculture','specialty'] },
  AZ:{ name:'Arizona',         tier:2, bonusMin:25000, bonusMax:100000, programCount:4,  specialty:['specialty','livestock'] },
  AR:{ name:'Arkansas',        tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['row-crops','poultry'] },
  CA:{ name:'California',      tier:1, bonusMin:75000, bonusMax:350000, programCount:12, specialty:['specialty','organic','dairy'] },
  CO:{ name:'Colorado',        tier:1, bonusMin:40000, bonusMax:175000, programCount:7,  specialty:['livestock','specialty','organic'] },
  CT:{ name:'Connecticut',     tier:2, bonusMin:35000, bonusMax:150000, programCount:6,  specialty:['specialty','nursery','organic'] },
  DE:{ name:'Delaware',        tier:2, bonusMin:25000, bonusMax:100000, programCount:4,  specialty:['row-crops','poultry'] },
  FL:{ name:'Florida',         tier:2, bonusMin:30000, bonusMax:130000, programCount:6,  specialty:['specialty','nursery','aquaculture'] },
  GA:{ name:'Georgia',         tier:2, bonusMin:25000, bonusMax:110000, programCount:5,  specialty:['specialty','poultry','row-crops'] },
  HI:{ name:'Hawaii',          tier:1, bonusMin:45000, bonusMax:200000, programCount:7,  specialty:['specialty','organic','aquaculture'] },
  ID:{ name:'Idaho',           tier:2, bonusMin:25000, bonusMax:110000, programCount:5,  specialty:['specialty','dairy','row-crops'] },
  IL:{ name:'Illinois',        tier:2, bonusMin:35000, bonusMax:150000, programCount:6,  specialty:['row-crops','livestock'] },
  IN:{ name:'Indiana',         tier:2, bonusMin:30000, bonusMax:130000, programCount:5,  specialty:['row-crops','livestock'] },
  IA:{ name:'Iowa',            tier:1, bonusMin:45000, bonusMax:200000, programCount:8,  specialty:['row-crops','livestock','dairy'] },
  KS:{ name:'Kansas',          tier:2, bonusMin:25000, bonusMax:100000, programCount:5,  specialty:['row-crops','livestock'] },
  KY:{ name:'Kentucky',        tier:2, bonusMin:25000, bonusMax:110000, programCount:5,  specialty:['specialty','livestock','row-crops'] },
  LA:{ name:'Louisiana',       tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['row-crops','aquaculture'] },
  ME:{ name:'Maine',           tier:1, bonusMin:50000, bonusMax:225000, programCount:8,  specialty:['specialty','organic','aquaculture'] },
  MD:{ name:'Maryland',        tier:2, bonusMin:35000, bonusMax:150000, programCount:6,  specialty:['specialty','poultry','row-crops'] },
  MA:{ name:'Massachusetts',   tier:1, bonusMin:55000, bonusMax:250000, programCount:9,  specialty:['specialty','organic','nursery'] },
  MI:{ name:'Michigan',        tier:1, bonusMin:50000, bonusMax:225000, programCount:8,  specialty:['specialty','dairy','row-crops'] },
  MN:{ name:'Minnesota',       tier:1, bonusMin:55000, bonusMax:250000, programCount:9,  specialty:['row-crops','dairy','specialty'] },
  MS:{ name:'Mississippi',     tier:3, bonusMin:15000, bonusMax:70000,  programCount:4,  specialty:['row-crops','poultry'] },
  MO:{ name:'Missouri',        tier:2, bonusMin:25000, bonusMax:110000, programCount:5,  specialty:['row-crops','livestock'] },
  MT:{ name:'Montana',         tier:2, bonusMin:25000, bonusMax:100000, programCount:5,  specialty:['row-crops','livestock'] },
  NE:{ name:'Nebraska',        tier:2, bonusMin:30000, bonusMax:130000, programCount:6,  specialty:['row-crops','livestock','dairy'] },
  NV:{ name:'Nevada',          tier:3, bonusMin:15000, bonusMax:65000,  programCount:3,  specialty:['livestock','specialty'] },
  NH:{ name:'New Hampshire',   tier:1, bonusMin:40000, bonusMax:175000, programCount:7,  specialty:['specialty','organic','dairy'] },
  NJ:{ name:'New Jersey',      tier:2, bonusMin:35000, bonusMax:150000, programCount:6,  specialty:['specialty','nursery','organic'] },
  NM:{ name:'New Mexico',      tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['specialty','livestock'] },
  NY:{ name:'New York',        tier:1, bonusMin:60000, bonusMax:280000, programCount:10, specialty:['dairy','specialty','organic'] },
  NC:{ name:'North Carolina',  tier:2, bonusMin:30000, bonusMax:130000, programCount:6,  specialty:['specialty','poultry','livestock'] },
  ND:{ name:'North Dakota',    tier:2, bonusMin:25000, bonusMax:100000, programCount:5,  specialty:['row-crops','livestock'] },
  OH:{ name:'Ohio',            tier:2, bonusMin:35000, bonusMax:150000, programCount:6,  specialty:['row-crops','dairy','specialty'] },
  OK:{ name:'Oklahoma',        tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['row-crops','livestock'] },
  OR:{ name:'Oregon',          tier:1, bonusMin:50000, bonusMax:225000, programCount:8,  specialty:['specialty','organic','nursery'] },
  PA:{ name:'Pennsylvania',    tier:1, bonusMin:50000, bonusMax:225000, programCount:8,  specialty:['dairy','specialty','organic'] },
  RI:{ name:'Rhode Island',    tier:2, bonusMin:30000, bonusMax:125000, programCount:5,  specialty:['specialty','aquaculture','organic'] },
  SC:{ name:'South Carolina',  tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['specialty','poultry','row-crops'] },
  SD:{ name:'South Dakota',    tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['row-crops','livestock'] },
  TN:{ name:'Tennessee',       tier:2, bonusMin:25000, bonusMax:100000, programCount:5,  specialty:['specialty','livestock','row-crops'] },
  TX:{ name:'Texas',           tier:2, bonusMin:30000, bonusMax:130000, programCount:6,  specialty:['livestock','row-crops','specialty'] },
  UT:{ name:'Utah',            tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['specialty','livestock'] },
  VT:{ name:'Vermont',         tier:1, bonusMin:55000, bonusMax:250000, programCount:9,  specialty:['dairy','organic','specialty'] },
  VA:{ name:'Virginia',        tier:2, bonusMin:30000, bonusMax:130000, programCount:6,  specialty:['specialty','livestock','poultry'] },
  WA:{ name:'Washington',      tier:1, bonusMin:50000, bonusMax:225000, programCount:8,  specialty:['specialty','organic','dairy'] },
  WV:{ name:'West Virginia',   tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['specialty','livestock'] },
  WI:{ name:'Wisconsin',       tier:1, bonusMin:50000, bonusMax:225000, programCount:8,  specialty:['dairy','specialty','organic'] },
  WY:{ name:'Wyoming',         tier:2, bonusMin:20000, bonusMax:90000,  programCount:4,  specialty:['livestock','row-crops'] },
  DC:{ name:'Washington D.C.', tier:3, bonusMin:15000, bonusMax:60000,  programCount:3,  specialty:['specialty','nursery'] },
};

const STATES_LIST = Object.entries(STATE_DATA)
  .map(([code, d]) => ({ code, name: d.name }))
  .sort((a, b) => a.name.localeCompare(b.name));
