/* ─────────────────────────────────────────────────────────────────────────────
   GrantHarvest — Grant Sizing Tool
   js/results.js  —  Results Reveal, Grant Cards, Live Data, Lead Capture
   Depends on: data.js, calculator.js
───────────────────────────────────────────────────────────────────────────── */

'use strict';

// ─── LIVE DATA FETCH ─────────────────────────────────────────────────────────

/**
 * Attempts to fetch enriched grant data from the live CDN endpoint.
 * On success, stores it in window._liveGrantData for calculator.js to use.
 * Fails silently — static data.js is always the fallback.
 */
async function fetchLiveGrants() {
  const statusEl = document.getElementById('live-status-text');
  try {
    const res = await fetch('/api/grants.json', {
      headers: { 'Cache-Control': 'max-age=3600' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data.programs) && data.programs.length > 0) {
      window._liveGrantData = data.programs;
      if (statusEl) {
        const updated = data.lastUpdated
          ? new Date(data.lastUpdated).toLocaleDateString()
          : 'today';
        statusEl.innerHTML = `<span class="live-dot"></span> Live data loaded — updated ${updated}`;
      }
      return data;
    }
  } catch (e) {
    // Silently fall back to static baseline
    if (statusEl) {
      statusEl.innerHTML = `<span class="live-dot stale"></span> Showing representative data — <a href="https://grantharvest.com" style="color:var(--sage)">GrantHarvest</a> has live updates`;
    }
  }
  return null;
}

// ─── ANIMATED COUNTER ────────────────────────────────────────────────────────

function animateCounter(element, start, end, duration, prefix = '$', suffix = '') {
  const startTime = performance.now();
  const range = end - start;

  function update(now) {
    const elapsed  = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const value    = Math.round(start + range * eased);

    element.textContent = prefix + formatLargeNumber(value) + suffix;

    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function formatLargeNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000)    return Math.round(n / 1000) + 'K';
  return n.toLocaleString();
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────

function launchConfetti() {
  const colors = ['#C8860A', '#2D6A4F', '#74C69D', '#E8C56A', '#40916C', '#FAF7F0'];
  const canvas  = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const pieces = Array.from({ length: 120 }, () => ({
    x:      Math.random() * canvas.width,
    y:      -20 - Math.random() * 100,
    vx:     (Math.random() - 0.5) * 5,
    vy:     Math.random() * 3 + 2,
    angle:  Math.random() * 360,
    va:     (Math.random() - 0.5) * 8,
    w:      Math.random() * 10 + 6,
    h:      Math.random() * 5 + 3,
    color:  colors[Math.floor(Math.random() * colors.length)],
    alpha:  1,
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.x     += p.vx;
      p.y     += p.vy;
      p.vy    += 0.08;
      p.angle += p.va;
      if (frame > 120) p.alpha = Math.max(0, p.alpha - 0.012);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.angle * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    if (frame < 220) requestAnimationFrame(draw);
    else canvas.remove();
  }
  draw();
}

// ─── GRANT CARD RENDERER ─────────────────────────────────────────────────────

function renderGrantCard(grant, index) {
  const badge   = getStatusBadge(grant.status, grant.urgency);
  const matchPct = Math.min(100, grant.matchScore || 50);
  const delay   = Math.min(index * 60, 400);
  const typeClass = grant.type === 'state' ? 'type-state' : (grant.type === 'private' ? 'type-private' : '');

  return `
    <div class="grant-result-card ${typeClass}" style="animation-delay:${delay}ms">
      <div class="grant-card-header">
        <div>
          <div class="grant-card-name">${escHtml(grant.name)}</div>
          <div class="grant-card-fullname">${escHtml(grant.fullName || '')}</div>
        </div>
        <div class="grant-amount-range">
          ${formatCurrency(grant.amountMin)} – ${formatCurrency(grant.amountMax)}
        </div>
      </div>

      <div class="grant-card-tags">
        <span class="grant-tag federal">${escHtml(grant.type.charAt(0).toUpperCase() + grant.type.slice(1))}</span>
        <span class="grant-tag">${escHtml(grant.agency)}</span>
        ${badge ? `<span class="grant-tag ${badge.cls}">${escHtml(badge.text)}</span>` : ''}
        ${(grant.purposes || []).slice(0, 2).map(p =>
          `<span class="grant-tag">${escHtml(purposeLabel(p))}</span>`
        ).join('')}
      </div>

      <div class="grant-card-desc">${escHtml(grant.description || '')}</div>

      <div class="grant-card-footer">
        <div class="grant-timeline">
          <span>🗓 <strong>${escHtml(grant.applicationWindow || 'See program page')}</strong></span>
          <span>⏱ Decision: <strong>${grant.processingDaysMin}–${grant.processingDaysMax} days</strong></span>
          <span>💳 Payment: <strong>${escHtml(grant.disbursementNote || 'Upon approval')}</strong></span>
        </div>
        <a class="grant-link" href="${escHtml(grant.url || '#')}" target="_blank" rel="noopener">
          Learn more →
        </a>
      </div>

      <div class="match-row">
        <span class="match-label">Match strength</span>
        <div class="match-track">
          <div class="match-fill" style="width:${matchPct}%"></div>
        </div>
        <span class="match-pct">${matchPct}%</span>
      </div>
    </div>`;
}

function purposeLabel(p) {
  const map = {
    conservation: 'Conservation', equipment: 'Equipment', emergency: 'Emergency',
    research: 'Research', marketing: 'Marketing', energy: 'Energy',
    labor: 'Labor', land: 'Land', organic: 'Organic', 'beginning-farmer': 'Beginning Farmer',
  };
  return map[p] || p;
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── MAIN RESULTS RENDERER ────────────────────────────────────────────────────

function showResults(answers) {
  // Hide wizard, show results
  document.getElementById('wizard').classList.remove('active');
  document.getElementById('wizard').style.display = 'none';
  document.getElementById('results').style.display  = 'block';
  document.getElementById('results').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'instant' });

  // Calculate
  const result = calculateGrants(answers);

  // ── Hero range counters ─────────────────────────────────────────────────
  const minEl = document.getElementById('results-min');
  const maxEl = document.getElementById('results-max');

  setTimeout(() => {
    launchConfetti();
    animateCounter(minEl, 0, result.totalMin, 1800);
    animateCounter(maxEl, 0, result.totalMax, 2400);
  }, 300);

  // ── Stat strip ──────────────────────────────────────────────────────────
  document.getElementById('rstat-federal').textContent = result.federalCount;
  document.getElementById('rstat-state').textContent   = result.stateProgramCount + '+';
  document.getElementById('rstat-urgent').textContent  = result.urgentCount;

  // ── Meta line ───────────────────────────────────────────────────────────
  document.getElementById('results-meta').innerHTML =
    `From <strong>${result.federalCount} federal</strong> and <strong>${result.stateProgramCount}+ state</strong> grant programs`;

  // ── Urgency banner ──────────────────────────────────────────────────────
  const urgencyEl = document.getElementById('urgency-banner');
  if (result.urgentCount > 0) {
    urgencyEl.style.display = 'flex';
    document.getElementById('urgency-text').textContent =
      `${result.urgentCount} program${result.urgentCount > 1 ? 's are' : ' is'} currently open or accepting applications — don't wait`;
  } else {
    urgencyEl.style.display = 'none';
  }

  // ── State bonus card ────────────────────────────────────────────────────
  const sd = result.stateData;
  const tierLabel = sd.tier === 1 ? '🌟 Highly Active Grant State' : sd.tier === 2 ? '✅ Active Grant State' : '📋 Standard Grant State';
  document.getElementById('state-bonus-card').innerHTML = `
    <div class="state-bonus-icon">🏛️</div>
    <div>
      <div class="state-bonus-label">State-Level Programs</div>
      <div class="state-bonus-name">${escHtml(sd.name)} — ${tierLabel}</div>
      <div class="state-bonus-range">${formatCurrency(sd.bonusMin)} – ${formatCurrency(sd.bonusMax)} in additional state funding</div>
      <div class="state-bonus-desc">${sd.programCount}+ state agriculture programs available through your state's department of agriculture, USDA state offices, and regional partners.</div>
    </div>`;

  // ── Grant cards ─────────────────────────────────────────────────────────
  const container = document.getElementById('grants-container');
  container.innerHTML = result.topPrograms.map((g, i) => renderGrantCard(g, i)).join('');

  // ── Attempt live data fetch ─────────────────────────────────────────────
  fetchLiveGrants().then(liveData => {
    if (liveData && Array.isArray(liveData.programs) && liveData.programs.length > 0) {
      // Re-calculate with live data and re-render cards
      const liveResult = calculateGrants(answers);
      container.innerHTML = liveResult.topPrograms.map((g, i) => renderGrantCard(g, i)).join('');
    }
  });

  // ── Personalise result headline based on demographics ───────────────────
  const demos = answers.demographics || [];
  const bonusTags = [];
  if (demos.includes('beginning-farmer')) bonusTags.push('Beginning Farmer Priority');
  if (demos.includes('veteran'))          bonusTags.push('Veteran Set-Aside Access');
  if (demos.includes('minority'))         bonusTags.push('Socially Disadvantaged Priority');
  if (demos.includes('women'))            bonusTags.push('Women Farmer Priority');

  const badgeEl = document.getElementById('results-badge');
  if (bonusTags.length > 0) {
    badgeEl.innerHTML = '🎯 ' + bonusTags.join(' · ');
    badgeEl.style.display = 'inline-flex';
  }

  // ── Populate lead capture personalisation ───────────────────────────────
  const stateNameEl = document.getElementById('lead-state-name');
  if (stateNameEl) stateNameEl.textContent = sd.name;
}

// ─── LEAD CAPTURE ────────────────────────────────────────────────────────────

function handleEmailCapture() {
  const emailInput = document.getElementById('capture-email');
  const email = (emailInput && emailInput.value || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (emailInput) {
      emailInput.style.borderColor = 'rgba(239,68,68,0.6)';
      emailInput.placeholder = 'Please enter a valid email';
      setTimeout(() => {
        emailInput.style.borderColor = '';
        emailInput.placeholder = 'Your email address';
      }, 2500);
    }
    return;
  }

  // In production this POSTs to a CRM / email capture endpoint
  // For now, show success state
  const form   = document.getElementById('lead-form-wrap');
  const success = document.getElementById('lead-success');
  if (form)    form.style.display    = 'none';
  if (success) success.style.display = 'block';

  // Optionally fire a tracking event
  if (window.gtag) window.gtag('event', 'lead_capture', { email });
  if (window.fbq)  window.fbq('track', 'Lead', { email });
}
