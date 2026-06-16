/* ─────────────────────────────────────────────────────────────────────────────
   GrantHarvest — Grant Sizing Tool
   js/wizard.js  —  7-Step Wizard Controller
   Depends on: data.js, calculator.js
───────────────────────────────────────────────────────────────────────────── */

'use strict';

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────

const WIZARD_STEPS = [

  // Step 1: Operation Type
  {
    id: 'farmType',
    emoji: '🌾',
    title: 'What type of operation do you run?',
    subtitle: 'Select the one that best describes your agricultural business.',
    multiSelect: false,
    answerKey: 'farmType',
    options: [
      { value:'row-crops',   icon:'🌽', label:'Row Crops',         sublabel:'Corn, wheat, soybeans, cotton, rice' },
      { value:'specialty',   icon:'🍅', label:'Specialty Crops',   sublabel:'Vegetables, fruits, herbs, berries' },
      { value:'livestock',   icon:'🐄', label:'Livestock / Ranch', sublabel:'Beef cattle, hogs, sheep, goats' },
      { value:'dairy',       icon:'🥛', label:'Dairy',             sublabel:'Milk production, cheese, butter' },
      { value:'poultry',     icon:'🐔', label:'Poultry',           sublabel:'Chickens, turkeys, eggs' },
      { value:'aquaculture', icon:'🐟', label:'Aquaculture',       sublabel:'Fish, shellfish, seaweed' },
      { value:'nursery',     icon:'🌸', label:'Nursery / Greenhouse', sublabel:'Plants, flowers, propagation' },
      { value:'organic',     icon:'🌿', label:'Organic Farm',      sublabel:'Certified or transitioning to organic' },
      { value:'mixed',       icon:'🔄', label:'Mixed / Diversified', sublabel:'Multiple enterprise types' },
    ],
  },

  // Step 2: Farm Size
  {
    id: 'farmSize',
    emoji: '📐',
    title: 'How large is your operation?',
    subtitle: 'Select the closest match. Eligibility thresholds vary by program.',
    multiSelect: false,
    answerKey: 'farmSize',
    options: [
      { value:'hobby',  icon:'🏡', label:'Hobby / Urban Farm',  sublabel:'Under 10 acres  ·  < 4 hectares' },
      { value:'small',  icon:'🌿', label:'Small Farm',          sublabel:'10 – 49 acres  ·  4 – 20 hectares' },
      { value:'family', icon:'🚜', label:'Family Farm',         sublabel:'50 – 249 acres  ·  20 – 100 hectares' },
      { value:'mid',    icon:'🌾', label:'Mid-Size Farm',       sublabel:'250 – 999 acres  ·  100 – 400 hectares' },
      { value:'large',  icon:'🏭', label:'Large Commercial',    sublabel:'1,000+ acres  ·  400+ hectares' },
    ],
  },

  // Step 3: State
  {
    id: 'state',
    emoji: '📍',
    title: 'Where is your farm located?',
    subtitle: 'State programs can add significant additional funding on top of federal grants.',
    multiSelect: false,
    answerKey: 'state',
    customRender: renderStateStep,
  },

  // Step 4: Grant Purpose
  {
    id: 'purposes',
    emoji: '🎯',
    title: 'What do you need funding for?',
    subtitle: 'Select everything that applies — more categories unlock more matching grants.',
    multiSelect: true,
    answerKey: 'purposes',
    options: [
      { value:'emergency',       icon:'🚨', label:'Emergency Relief',          sublabel:'Disaster, drought, flood recovery' },
      { value:'equipment',       icon:'🚜', label:'Equipment & Technology',     sublabel:'Machinery, precision ag, sensors' },
      { value:'conservation',    icon:'🌿', label:'Conservation & Soil Health', sublabel:'Cover crops, erosion, water quality' },
      { value:'research',        icon:'🔬', label:'Research & Innovation',      sublabel:'On-farm trials, new practices' },
      { value:'labor',           icon:'👥', label:'Labor & Workforce',          sublabel:'Hiring, training, workforce dev' },
      { value:'land',            icon:'🏗️', label:'Infrastructure & Land',     sublabel:'Buildings, irrigation, drainage' },
      { value:'marketing',       icon:'📦', label:'Marketing & Value-Added',    sublabel:'Processing, farmers markets, branding' },
      { value:'energy',          icon:'⚡', label:'Energy & Renewables',        sublabel:'Solar, wind, biogas, efficiency' },
      { value:'organic',         icon:'🌱', label:'Organic Transition',         sublabel:'Certification, transition support' },
      { value:'beginning-farmer',icon:'🌱', label:'Beginning Farmer Support',   sublabel:'Under 10 years in operation' },
    ],
  },

  // Step 5: Demographics
  {
    id: 'demographics',
    emoji: '🤝',
    title: 'Tell us more about your operation',
    subtitle: 'These factors unlock dedicated funding pools and priority access in USDA programs.',
    multiSelect: true,
    answerKey: 'demographics',
    unlockMode: true, // shows "Bonus Unlocked" badges
    options: [
      { value:'beginning-farmer', icon:'🌱', label:'Beginning Farmer / Rancher', sublabel:'Operating for less than 10 years', unlock:'Unlocks Priority Funding' },
      { value:'veteran',          icon:'🎖️', label:'Veteran-Owned',              sublabel:'Military service member or veteran', unlock:'Unlocks Veteran Set-Asides' },
      { value:'minority',         icon:'🌍', label:'Socially Disadvantaged',     sublabel:'Minority-owned; USDA priority group', unlock:'Unlocks Equity Programs' },
      { value:'women',            icon:'👩‍🌾', label:'Women-Owned',                sublabel:'Majority women-owned operation', unlock:'Unlocks Women-Owned Pools' },
      { value:'none',             icon:'✅', label:'None of the Above',          sublabel:'Standard applicant track', unlock:'' },
    ],
  },

  // Step 6: Revenue
  {
    id: 'revenue',
    emoji: '💰',
    title: 'What is your annual farm revenue?',
    subtitle: 'Used to verify income limits and match you to the right program tiers.',
    multiSelect: false,
    answerKey: 'revenue',
    customRender: renderRevenueStep,
  },

  // Step 7: Current Practices
  {
    id: 'practices',
    emoji: '✅',
    title: 'Which of these describe your operation?',
    subtitle: 'Each one can unlock additional funding categories or increase your match score.',
    multiSelect: true,
    answerKey: 'practices',
    options: [
      { value:'organic',       icon:'🌿', label:'USDA Organic Certified',       sublabel:'Or actively transitioning' },
      { value:'conservation',  icon:'🌱', label:'Conservation Practices',       sublabel:'Cover crops, no-till, buffer strips' },
      { value:'energy',        icon:'☀️', label:'On-Farm Renewable Energy',     sublabel:'Existing or planned solar / wind' },
      { value:'direct-market', icon:'🛒', label:'Direct-to-Consumer Sales',     sublabel:'Farmers market, CSA, farm stand' },
      { value:'value-added',   icon:'🏷️', label:'Value-Added Products',        sublabel:'Processing, artisan, specialty goods' },
      { value:'precision-ag',  icon:'📡', label:'Precision Agriculture',        sublabel:'GPS, sensors, variable rate tech' },
      { value:'solar',         icon:'🔆', label:'Solar Already Installed',      sublabel:'Grid-tied or off-grid system' },
      { value:'none',          icon:'➖', label:'None Currently',               sublabel:'Starting fresh' },
    ],
  },

];

// ─── WIZARD STATE ─────────────────────────────────────────────────────────────

const wizard = {
  step:      1,         // 1-based, 1–7
  direction: 'forward', // forward | backward
  answers:   {},        // accumulated user answers
};

// ─── INIT ─────────────────────────────────────────────────────────────────────

function initWizard() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('wizard').style.display  = 'block';

  wizard.step    = 1;
  wizard.answers = {};

  renderProgress();
  renderStep(1);
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

function renderProgress() {
  const n       = wizard.step;
  const total   = WIZARD_STEPS.length;
  const pct     = ((n - 1) / total) * 100;

  // Fill bar
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';

  // Dots
  const wrap = document.getElementById('step-indicators');
  if (!wrap) return;
  wrap.innerHTML = '';
  WIZARD_STEPS.forEach((_, i) => {
    const stepNum  = i + 1;
    const dotWrap  = document.createElement('div');
    dotWrap.className = 'step-dot-wrap';
    const dot = document.createElement('div');
    dot.className = 'step-dot' +
      (stepNum < n  ? ' completed' :
       stepNum === n ? ' active'    : '');
    dot.textContent = stepNum < n ? '' : stepNum;
    dotWrap.appendChild(dot);
    wrap.appendChild(dotWrap);
  });

  // Tally
  updateTally();
}

// ─── RUNNING TALLY ───────────────────────────────────────────────────────────

function updateTally() {
  const tallyEl = document.getElementById('progress-tally');
  if (!tallyEl) return;
  if (wizard.step < 3) { tallyEl.classList.remove('visible'); return; }

  const est = quickEstimate(wizard.answers);
  if (!est) return;

  tallyEl.classList.add('visible');
  tallyEl.innerHTML =
    'Est. <span>' + formatCurrency(est.min) + ' – ' + formatCurrency(est.max) + '</span>';
}

// ─── STEP RENDERING ──────────────────────────────────────────────────────────

function renderStep(n) {
  const stepDef = WIZARD_STEPS[n - 1];
  const content = document.getElementById('step-content');
  if (!content || !stepDef) return;

  const animClass = wizard.direction === 'forward' ? 'enter-forward' : 'enter-backward';
  content.className = '';

  // Small delay so transition feels deliberate
  setTimeout(() => {
    content.className = animClass;
    content.innerHTML = buildStepHTML(stepDef);
    attachCardListeners(stepDef);
    restoreSelections(stepDef);
    updateNavButtons();
    renderProgress();
  }, 60);
}

function buildStepHTML(stepDef) {
  let html = `
    <div class="step-header">
      <span class="step-emoji">${stepDef.emoji}</span>
      <h2 class="step-title">${stepDef.title}</h2>
      <p class="step-subtitle">${stepDef.subtitle}</p>
      ${stepDef.multiSelect ? '<span class="step-multi-hint">☑ Select all that apply</span>' : ''}
    </div>
  `;

  if (stepDef.customRender) {
    html += stepDef.customRender(stepDef);
  } else {
    html += buildCardGrid(stepDef);
  }

  return html;
}

function buildCardGrid(stepDef) {
  const gridCls = (stepDef.id === 'purposes' || stepDef.id === 'practices') ? 'wide' : '';
  let html = `<div class="options-grid ${gridCls}">`;
  stepDef.options.forEach(opt => {
    html += `
      <div class="option-card" data-value="${opt.value}">
        ${opt.unlock ? `<div class="card-unlock">${opt.unlock}</div>` : ''}
        <span class="card-icon">${opt.icon}</span>
        <div class="card-label">${opt.label}</div>
        ${opt.sublabel ? `<div class="card-sublabel">${opt.sublabel}</div>` : ''}
        <div class="card-check">✓</div>
      </div>`;
  });
  html += '</div>';
  return html;
}

// ── Custom: State Step ─────────────────────────────────────────────────────

function renderStateStep() {
  const current = wizard.answers.state || '';
  let opts = '<option value="">— Select your state —</option>';
  STATES_LIST.forEach(s => {
    opts += `<option value="${s.code}" ${s.code === current ? 'selected' : ''}>${s.name}</option>`;
  });

  let previewHtml = '';
  if (current && STATE_DATA[current]) {
    previewHtml = buildStatePreview(current);
  }

  return `
    <div class="state-select-wrap">
      <div class="state-select-inner">
        <select id="state-select" onchange="onStateChange(this.value)">
          ${opts}
        </select>
      </div>
      <div id="state-preview-container">${previewHtml}</div>
    </div>`;
}

function buildStatePreview(code) {
  const s = STATE_DATA[code];
  if (!s) return '';
  const tierLabel = ['', 'Very Active Programs', 'Active Programs', 'Standard Programs'][s.tier];
  const tierCls   = ['', 'tier-1', 'tier-2', 'tier-3'][s.tier];
  return `
    <div class="state-preview">
      <span class="state-tier-badge ${tierCls}">${tierLabel}</span>
      <div class="state-preview-name">${s.name} State Programs</div>
      <div class="state-preview-stats">
        <div>
          <div class="sp-stat-num">${formatCurrency(s.bonusMin)} – ${formatCurrency(s.bonusMax)}</div>
          <div class="sp-stat-label">Additional state-level funding</div>
        </div>
        <div>
          <div class="sp-stat-num">${s.programCount}</div>
          <div class="sp-stat-label">State programs available</div>
        </div>
      </div>
    </div>`;
}

function onStateChange(code) {
  wizard.answers.state = code || null;
  const container = document.getElementById('state-preview-container');
  if (container) {
    container.innerHTML = code ? buildStatePreview(code) : '';
  }
  updateNavButtons();
  updateTally();
}

// ── Custom: Revenue Step ───────────────────────────────────────────────────

function renderRevenueStep() {
  const options = [
    { value:'micro',      icon:'🌱', range:'Under $35,000',        sub:'Micro / hobby farm' },
    { value:'low',        icon:'🌿', range:'$35,000 – $100,000',   sub:'Low-income farm operation' },
    { value:'small',      icon:'🚜', range:'$100,000 – $250,000',  sub:'Small commercial operation' },
    { value:'moderate',   icon:'🌾', range:'$250,000 – $1,000,000', sub:'Mid-size commercial farm' },
    { value:'large',      icon:'🏭', range:'$1M – $5,000,000',     sub:'Large commercial operation' },
    { value:'commercial', icon:'🏢', range:'Over $5,000,000',      sub:'Major commercial enterprise' },
  ];

  let html = '<div class="options-grid revenue-grid">';
  options.forEach(opt => {
    html += `
      <div class="option-card revenue-card" data-value="${opt.value}">
        <span class="revenue-icon">${opt.icon}</span>
        <div class="revenue-text">
          <div class="revenue-range">${opt.range}</div>
          <div class="revenue-sub">${opt.sub}</div>
        </div>
        <div class="card-check" style="position:static; margin-left:auto;">✓</div>
      </div>`;
  });
  html += '</div>';
  return html;
}

// ─── SELECTION HANDLING ──────────────────────────────────────────────────────

function attachCardListeners(stepDef) {
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => selectCard(card, stepDef));
  });
}

function selectCard(card, stepDef) {
  const value = card.dataset.value;
  if (!value) return;

  if (!stepDef.multiSelect) {
    // Single select: deselect all, select this
    document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    wizard.answers[stepDef.answerKey] = value;
  } else {
    // Multi-select: toggle
    const current = wizard.answers[stepDef.answerKey] || [];

    if (value === 'none') {
      // "None" clears other selections
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      wizard.answers[stepDef.answerKey] = ['none'];
    } else {
      // Remove 'none' if selecting something real
      const noneCard = document.querySelector('.option-card[data-value="none"]');
      if (noneCard) noneCard.classList.remove('selected');
      const filtered = current.filter(v => v !== 'none');

      if (card.classList.contains('selected')) {
        card.classList.remove('selected');
        wizard.answers[stepDef.answerKey] = filtered.filter(v => v !== value);
      } else {
        card.classList.add('selected');
        wizard.answers[stepDef.answerKey] = [...filtered, value];
      }
    }

    // Show toast on first demographic unlock
    if (stepDef.id === 'demographics' && value !== 'none' && card.classList.contains('selected')) {
      showDemoToast(value);
    }
  }

  updateNavButtons();
  updateTally();
}

function restoreSelections(stepDef) {
  const val = wizard.answers[stepDef.answerKey];
  if (!val) return;

  if (Array.isArray(val)) {
    val.forEach(v => {
      const card = document.querySelector(`.option-card[data-value="${v}"]`);
      if (card) card.classList.add('selected');
    });
  } else {
    const card = document.querySelector(`.option-card[data-value="${val}"]`);
    if (card) card.classList.add('selected');
  }
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

function canAdvance() {
  const stepDef = WIZARD_STEPS[wizard.step - 1];
  const val = wizard.answers[stepDef.answerKey];
  if (!val) return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

function updateNavButtons() {
  const backBtn = document.getElementById('btn-back');
  const nextBtn = document.getElementById('btn-next');
  if (!nextBtn) return;

  if (backBtn) backBtn.disabled = wizard.step <= 1;
  nextBtn.disabled = !canAdvance();

  const isFinal = wizard.step === WIZARD_STEPS.length;
  nextBtn.textContent = isFinal ? 'See My Grant Potential →' : 'Next →';
  if (isFinal) {
    nextBtn.classList.add('final-step');
  } else {
    nextBtn.classList.remove('final-step');
  }
}

function nextStep() {
  if (!canAdvance()) return;

  if (wizard.step >= WIZARD_STEPS.length) {
    // All steps complete → show results
    showResults(wizard.answers);
    return;
  }

  wizard.direction = 'forward';
  wizard.step++;
  renderStep(wizard.step);
}

function prevStep() {
  if (wizard.step <= 1) return;
  wizard.direction = 'backward';
  wizard.step--;
  renderStep(wizard.step);
}

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────

function showDemoToast(value) {
  const msgs = {
    'beginning-farmer': { title: '🌱 Beginning Farmer Bonus!', body: 'You\'ve unlocked priority funding pools and reserved loan programs worth <strong>$50K–$600K+</strong>.' },
    'veteran':          { title: '🎖️ Veteran Bonus Unlocked!', body: 'Veterans receive priority access and dedicated set-asides across <strong>5+ USDA programs</strong>.' },
    'minority':         { title: '🌍 Equity Program Access!',  body: 'Socially disadvantaged farmers unlock dedicated pools and <strong>higher cost-share rates</strong>.' },
    'women':            { title: '👩‍🌾 Women-Owned Bonus!',      body: 'Women-owned operations get priority ranking in USDA programs with <strong>increased payment rates</strong>.' },
  };
  const msg = msgs[value];
  if (!msg) return;
  showToast(msg.title, msg.body);
}

function showToast(title, body) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${title}</strong><br>${body}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.4s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
