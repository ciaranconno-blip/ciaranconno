// ── Nav scroll effect ──────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 60);
});

// ── Option selection (radio + checkbox) ───────────────────────────
document.querySelectorAll('.opts').forEach(group => {
  const type = group.dataset.type;
  group.querySelectorAll('.opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const input = opt.querySelector('input');
      if (type === 'radio') {
        group.querySelectorAll('.opt').forEach(o => {
          o.classList.remove('is-on');
          o.querySelector('input').checked = false;
        });
        input.checked = true;
        opt.classList.add('is-on');
      } else {
        input.checked = !input.checked;
        opt.classList.toggle('is-on', input.checked);
      }
      updateProgress();
      updateTrackerCount();
    });
  });
});

// ── Tracker card selection ─────────────────────────────────────────
document.querySelectorAll('.tracker-card').forEach(card => {
  card.addEventListener('click', () => {
    const input = card.querySelector('input');
    input.checked = !input.checked;
    card.classList.toggle('is-on', input.checked);
    updateProgress();
    updateTrackerCount();
  });
});

// ── Live tracker connector count ──────────────────────────────────
function updateTrackerCount() {
  const selected = [...document.querySelectorAll('[name="trackers"]:checked')]
    .filter(i => i.value !== 'no_tracker');
  const connectors = getSelectedConnectors();
  const el = document.getElementById('connectorCount');
  if (selected.length === 0) {
    el.textContent = '';
    return;
  }
  el.textContent = `◆ ${selected.length} device${selected.length > 1 ? 's' : ''} selected · ${connectors.length} Claude connectors will be activated`;
}

function getSelectedConnectors() {
  const connectors = new Set();
  document.querySelectorAll('[name="trackers"]:checked').forEach(inp => {
    const card = inp.closest('.tracker-card');
    if (card && card.dataset.connectors) {
      card.dataset.connectors.split(',').filter(Boolean).forEach(c => connectors.add(c));
    }
  });
  return [...connectors];
}

// ── Progress bar ──────────────────────────────────────────────────
function updateProgress() {
  let answered = 0;
  const total = 8;

  // Q1–Q4: radio
  ['goal','experience','sessions','duration'].forEach(name => {
    if (document.querySelector(`[name="${name}"]:checked`)) answered++;
  });
  // Q5: equipment checkbox
  if (document.querySelector('[name="equipment"]:checked')) answered++;
  // Q6: trackers checkbox
  if (document.querySelector('[name="trackers"]:checked')) answered++;
  // Q7+Q8: optional — count if filled
  if (document.getElementById('injuries').value.trim()) answered++;
  if (document.getElementById('extra').value.trim()) answered++;

  const pct = Math.round((answered / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = answered + ' / ' + total;

  const canGenerate = answered >= 6; // at minimum Q1-Q6 answered
  const btn = document.getElementById('generateBtn');
  btn.disabled = !canGenerate;
  document.getElementById('generateHint').textContent = canGenerate
    ? 'All set — generate your personalised Claude prompt below'
    : 'Complete all required questions (Q1–Q6) to generate your prompt';
}

document.getElementById('injuries').addEventListener('input', updateProgress);
document.getElementById('extra').addEventListener('input', updateProgress);
updateProgress();

// ── Prompt generator ──────────────────────────────────────────────
const GOAL_LABELS = {
  longevity: 'Longevity + general health',
  strength:  'Strength + muscle (hypertrophy / powerlifting)',
  fat_loss:  'Fat loss + body composition',
  athletic:  'Athletic performance (returning athlete or sport-specific)',
  endurance: 'Endurance (running, cycling, hybrid)',
};
const EXP_LABELS = {
  beginner:     'Beginner — under 1 year',
  intermediate: 'Intermediate — 1 to 3 years',
  advanced:     'Advanced — 3 to 10 years',
  elite:        'Elite / former competitive athlete',
};
const EQUIP_LABELS = {
  full_gym:   'Full commercial gym',
  home_gym:   'Home gym (rack, barbell, plates)',
  dumbbells:  'Dumbbells / kettlebells',
  bands:      'Resistance bands',
  bodyweight: 'Bodyweight only',
};
const TRACKER_LABELS = {
  apple_watch: 'Apple Watch',
  whoop:       'Whoop',
  oura:        'Oura Ring',
  garmin:      'Garmin',
  fitbit:      'Fitbit',
  polar:       'Polar',
  strava:      'Strava',
  samsung:     'Samsung Health',
  no_tracker:  'No tracker',
};

const TRACKER_INSTRUCTIONS = {
  apple_watch: `
APPLE WATCH INTEGRATION:
- Read the user's Activity Rings (Move, Exercise, Stand) before programming
- Pull latest resting heart rate and HRV trends from Apple Health
- Use sleep data (time asleep, deep/REM stages) to assess recovery
- Factor in mindfulness minutes when gauging stress load
- Recommend closing rings as micro-goals within sessions`,

  whoop: `
WHOOP INTEGRATION:
- Always check Whoop Recovery Score before prescribing training intensity
  · Recovery 0–33%: Active recovery or rest only. No high-intensity work.
  · Recovery 34–66%: Moderate training. Stay below threshold.
  · Recovery 67–100%: Full training. Push hard sessions here.
- Read Day Strain target and do not exceed it without the user's consent
- Use HRV trend (7-day rolling) to detect overreaching
- Use Sleep Coach data (sleep need vs. sleep performance) to adjust volume
- Reference Respiratory Rate for early signs of illness or stress`,

  oura: `
OURA RING INTEGRATION:
- Check Readiness Score at the start of every session recommendation
  · Readiness < 60: Light or rest day only
  · Readiness 60–74: Moderate intensity
  · Readiness 75+: High intensity approved
- Use body temperature deviation to flag illness or hormonal shifts
- Use Sleep Score (efficiency, latency, timing, REM/deep) for recovery context
- HRV balance: declining 14-day trend = reduce volume`,

  garmin: `
GARMIN INTEGRATION:
- Use Body Battery to gauge real-time energy reserves (0–100)
  · Body Battery < 25: Rest or easy movement only
  · Body Battery 25–50: Moderate training
  · Body Battery 50+: Full training appropriate
- Pull VO2 Max estimate to calibrate cardio zones and aerobic load
- Use Training Status (Productive / Maintaining / Overreaching / Detraining) to adjust weekly structure
- Stress Level score: > 75 = reduce session intensity
- Use Sleep score and respiration data for additional recovery context`,

  fitbit: `
FITBIT INTEGRATION:
- Use Active Zone Minutes (AZM) to track weekly cardio load
- Pull Heart Rate Zone data to calibrate Zone 2 and threshold work
- Use Sleep Stage breakdown (light/deep/REM) for recovery scoring
- Daily step count as a proxy for non-exercise activity (NEAT)
- Calorie burn estimate: factor into nutrition guidance`,

  polar: `
POLAR INTEGRATION:
- Use Training Load Pro (Cardio Load + Muscle Load) to prevent overtraining
- Check Nightly Recharge status before prescribing intensity
  · Compromised: Active recovery only
  · Slightly compromised: Moderate training
  · Recovered: Full training
- Orthostatic Test HRV: flag > 10 bpm resting HR increase as a rest signal
- Running Index / Cycling Index as VO2 Max proxy for aerobic benchmarking`,

  strava: `
STRAVA INTEGRATION:
- Pull recent activity history (last 4 weeks) to assess training load baseline
- Use segment PRs and times to identify current fitness benchmarks
- Power Zones (cycling) to calibrate FTP-based intervals
- Running Pace Zones to structure tempo, threshold, and easy runs
- Kudos/social data is irrelevant — focus on performance metrics only`,

  samsung: `
SAMSUNG HEALTH INTEGRATION:
- Use workout history for training load baseline
- Sleep analysis (quality score, stages) for recovery context
- Stress Score (0–100) to modulate session intensity
- Body composition data (if available) to track muscle/fat trends`,
};

function generatePrompt() {
  const goal       = document.querySelector('[name="goal"]:checked')?.value;
  const experience = document.querySelector('[name="experience"]:checked')?.value;
  const sessions   = document.querySelector('[name="sessions"]:checked')?.value;
  const duration   = document.querySelector('[name="duration"]:checked')?.value;
  const equipment  = [...document.querySelectorAll('[name="equipment"]:checked')].map(i => EQUIP_LABELS[i.value]);
  const trackers   = [...document.querySelectorAll('[name="trackers"]:checked')].map(i => i.value);
  const injuries   = document.getElementById('injuries').value.trim();
  const extra      = document.getElementById('extra').value.trim();

  const hasTracker   = trackers.length && !trackers.every(t => t === 'no_tracker');
  const realTrackers = trackers.filter(t => t !== 'no_tracker');
  const connectors   = getSelectedConnectors();

  // Build the system prompt
  const lines = [];

  lines.push(`# AI FITNESS COACH — SYSTEM PROMPT`);
  lines.push(`# Generated by AITrainer · ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}`);
  lines.push(``);
  lines.push(`You are an elite personal trainer and sports scientist with expertise in ${GOAL_LABELS[goal] || 'general fitness'}. Your role is to provide evidence-based, highly personalised training guidance.`);
  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`ATHLETE PROFILE`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Primary Goal:      ${GOAL_LABELS[goal] || '—'}`);
  lines.push(`Training Level:    ${EXP_LABELS[experience] || '—'}`);
  lines.push(`Sessions / Week:   ${sessions || '—'}`);
  lines.push(`Session Length:    ${duration ? duration + ' minutes' : '—'}`);
  lines.push(`Available Equip:   ${equipment.length ? equipment.join(', ') : 'Not specified'}`);
  if (injuries)  lines.push(`Injuries/Limits:   ${injuries}`);
  if (extra)     lines.push(`Additional Notes:  ${extra}`);
  lines.push(``);

  if (hasTracker) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`CONNECTED DEVICES & CONNECTOR INSTRUCTIONS`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`The athlete has the following devices. Before writing any workout, you MUST:`);
    lines.push(`1. Request access to all listed connectors`);
    lines.push(`2. Read the latest data from each device`);
    lines.push(`3. Use the data to personalise every session recommendation`);
    lines.push(``);
    lines.push(`Active Connectors: ${connectors.join(', ')}`);
    lines.push(``);

    realTrackers.forEach(tracker => {
      if (TRACKER_INSTRUCTIONS[tracker]) {
        lines.push(TRACKER_INSTRUCTIONS[tracker].trim());
        lines.push(``);
      }
    });

    if (realTrackers.length > 1) {
      lines.push(`MULTI-DEVICE SYNTHESIS:`);
      lines.push(`When multiple devices are connected, synthesise all signals to produce one unified readiness score:`);
      lines.push(`- Weight recovery signals equally unless one device has significantly more granular data`);
      lines.push(`- When signals conflict (e.g. high HRV but poor sleep), default to the more conservative recommendation`);
      lines.push(`- Always surface the conflicting signals to the athlete transparently`);
      lines.push(`- Mention which device data is driving each recommendation`);
      lines.push(``);
    }
  } else {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`NO WEARABLE — STATIC PROGRAMME MODE`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`No device data is available. Build the programme using:`);
    lines.push(`- RPE (Rate of Perceived Exertion) for intensity guidance`);
    lines.push(`- Standard periodisation principles for ${GOAL_LABELS[goal]}`);
    lines.push(`- Ask the athlete for subjective readiness each session (1–10 scale)`);
    lines.push(``);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`YOUR COACHING RULES`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`1. ALWAYS check device data before prescribing intensity.`);
  lines.push(`2. NEVER suggest high-intensity training on a rest/recovery day signal.`);
  lines.push(`3. Every session must include: warm-up, main work, cool-down, and recovery notes.`);
  lines.push(`4. Adapt sessions in real time — if the athlete reports fatigue, reduce volume/intensity immediately.`);
  lines.push(`5. Explain the WHY behind every recommendation in plain language.`);
  lines.push(`6. Track progress across sessions — reference previous performance when available.`);
  lines.push(`7. Include nutrition guidance aligned with training load when asked.`);
  lines.push(`8. Flag any concerning biometric trends immediately (e.g. HRV crash, rising resting HR).`);
  lines.push(``);

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`HOW TO START EACH SESSION`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`When the athlete says "coach me" or "what's today's session?", do the following:`);
  lines.push(`1. Pull the latest data from all connected devices`);
  lines.push(`2. Report today's readiness summary (e.g. "Your Whoop recovery is 74%, Oura readiness 81% — green light for training")`);
  lines.push(`3. Prescribe today's session with full exercise list, sets, reps/duration, rest periods, and RPE/HR zone targets`);
  lines.push(`4. End with recovery recommendations for the rest of the day`);

  const promptText = lines.join('\n');

  // Show output
  document.getElementById('promptOutput').textContent = promptText;
  document.getElementById('output').style.display = 'block';

  // Connector chips
  const chipsEl = document.getElementById('connectorsActivated');
  chipsEl.innerHTML = '';
  if (connectors.length) {
    const label = document.createElement('span');
    label.style.cssText = 'font-family:"IBM Plex Mono",monospace;font-size:0.72rem;color:var(--text-dim);letter-spacing:1px;margin-right:8px;align-self:center;';
    label.textContent = `◆ ${connectors.length} CONNECTORS ACTIVATED:`;
    chipsEl.appendChild(label);
    connectors.forEach(c => {
      const chip = document.createElement('span');
      chip.className = 'connector-chip';
      chip.textContent = c.replace(/_/g, ' ');
      chipsEl.appendChild(chip);
    });
  }

  // Scroll to output
  setTimeout(() => {
    document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ── Copy prompt ───────────────────────────────────────────────────
function copyPrompt() {
  const text = document.getElementById('promptOutput').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    const label = document.getElementById('copyBtnText');
    btn.classList.add('copied');
    label.textContent = '✓ COPIED!';
    setTimeout(() => {
      btn.classList.remove('copied');
      label.textContent = 'COPY PROMPT';
    }, 2200);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Scroll back to builder ─────────────────────────────────────────
function scrollToBuilder() {
  document.getElementById('builder').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
