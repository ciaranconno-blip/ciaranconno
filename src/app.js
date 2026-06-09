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

  ['goal','experience','sessions','duration'].forEach(name => {
    if (document.querySelector(`[name="${name}"]:checked`)) answered++;
  });
  if (document.querySelector('[name="equipment"]:checked')) answered++;
  if (document.querySelector('[name="trackers"]:checked')) answered++;
  if (document.getElementById('injuries').value.trim()) answered++;
  if (document.getElementById('extra').value.trim()) answered++;

  const pct = Math.round((answered / total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = answered + ' / ' + total;

  const canGenerate = answered >= 6;
  const btn = document.getElementById('generateBtn');
  btn.disabled = !canGenerate;
  document.getElementById('generateHint').textContent = canGenerate
    ? 'All set — generate your personalised Claude prompt below'
    : 'Complete all required questions (Q1–Q6) to generate your prompt';
}

document.getElementById('injuries').addEventListener('input', updateProgress);
document.getElementById('extra').addEventListener('input', updateProgress);
updateProgress();

// ── Labels ────────────────────────────────────────────────────────
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

// ── Per-device connector data rules ──────────────────────────────
const DEVICE_RULES = {
  apple_watch: {
    connectors: 'apple_health_activity, apple_health_heart, apple_health_sleep, apple_health_mindfulness, apple_health_workouts',
    block: `APPLE WATCH — DATA PROTOCOL:
Connectors: apple_health_activity · apple_health_heart · apple_health_sleep · apple_health_mindfulness · apple_health_workouts

Pull before every session:
- Activity Rings (Move / Exercise / Stand): use as micro-goals within the session
- Resting Heart Rate + HRV (7-day trend from Apple Health): primary recovery signal
- Sleep analysis (total sleep, deep %, REM %): adjust volume if under-recovered
- Mindfulness minutes: factor into stress load if significantly elevated or absent
- Workout history (last 7 days): assess cumulative load before adding intensity

HRV adjustment (vs 7-day rolling average):
· Within 5%: execute planned session
· Down 5–10%: reduce volume 20%, hold intensity
· Down 10–20%: Zone 2 + mobility only
· Down >20%: full recovery day — walk and stretch only

RHR adjustment (vs personal baseline):
· 5+ bpm above: downgrade session intensity regardless of other signals`,
  },

  whoop: {
    connectors: 'whoop_recovery, whoop_strain, whoop_sleep, whoop_hrv, whoop_respiratory_rate',
    block: `WHOOP — DATA PROTOCOL:
Connectors: whoop_recovery · whoop_strain · whoop_sleep · whoop_hrv · whoop_respiratory_rate

Pull before every session:
- Recovery Score (0–100%): primary gate for intensity
  · 0–33%: Active recovery or rest only. No high-intensity work under any circumstance.
  · 34–66%: Moderate training. Stay sub-threshold. RPE cap 7.
  · 67–100%: Full training approved. High-intensity work here only.
- Day Strain target: do not prescribe a session that would exceed it without consent
- HRV (7-day rolling trend): declining trend = reduce weekly volume 15% proactively
- Sleep Performance vs Sleep Need: if <85% sleep performance, reduce volume 15%
- Respiratory Rate: elevation >1 rpm above baseline = potential illness flag, rest day`,
  },

  oura: {
    connectors: 'oura_readiness, oura_sleep_score, oura_activity, oura_temperature, oura_hrv',
    block: `OURA RING — DATA PROTOCOL:
Connectors: oura_readiness · oura_sleep_score · oura_activity · oura_temperature · oura_hrv

Pull before every session:
- Readiness Score: primary training gate
  · <60: Light movement or full rest. No structured training.
  · 60–74: Moderate intensity only. RPE cap 7. No max efforts.
  · 75+: High intensity approved.
- Body Temperature Deviation: >0.5°C above baseline = illness or hormonal flag → rest day
- Sleep Score (efficiency, latency, timing, REM/deep breakdown): if <70 = treat as recovery day
- HRV Balance (14-day declining trend): reduce weekly volume 10–20% per consecutive declining week
- Activity Score: use for NEAT tracking and daily movement context`,
  },

  garmin: {
    connectors: 'garmin_activities, garmin_vo2max, garmin_stress, garmin_body_battery, garmin_sleep, garmin_training_status',
    block: `GARMIN — DATA PROTOCOL:
Connectors: garmin_activities · garmin_vo2max · garmin_stress · garmin_body_battery · garmin_sleep · garmin_training_status

Pull before every session:
- Body Battery (0–100): real-time energy reserve gauge
  · <25: Rest or gentle mobility only
  · 25–50: Moderate training, no high-intensity
  · 50–75: Normal training
  · 75+: Full training, hard sessions appropriate
- Training Status (Productive / Maintaining / Overreaching / Detraining / Recovery):
  · Overreaching: mandatory easy week regardless of other signals
  · Detraining: rebuild phase — gradual volume increase only
- VO2 Max trend: declining >3% over 4 weeks = flag and investigate cause
- Stress Level: >75 average over 24h = cap RPE at 7
- Sleep Score + Respiration: secondary recovery context
- Training Load (acute vs chronic): use 7-day vs 28-day ratio to detect spike risk`,
  },

  fitbit: {
    connectors: 'fitbit_steps, fitbit_sleep, fitbit_heart_zones, fitbit_calories, fitbit_active_zone_minutes',
    block: `FITBIT — DATA PROTOCOL:
Connectors: fitbit_steps · fitbit_sleep · fitbit_heart_zones · fitbit_calories · fitbit_active_zone_minutes

Pull before every session:
- Active Zone Minutes (AZM): weekly cardio load tracker — target 150 min Zone 2+ per week
- Heart Rate Zone data: calibrate Zone 2 (50–60% HRmax) and threshold work precisely
- Sleep Stage breakdown (light/deep/REM): <1h deep sleep = reduce intensity, <45min REM = flag recovery deficit
- Daily step count: proxy for NEAT — if consistently <5,000 steps, flag sedentary load risk
- Calorie burn estimate: cross-reference with nutrition context if provided
- Resting HR trend: 3-day rising trend = reduce intensity`,
  },

  polar: {
    connectors: 'polar_training_load, polar_nightly_recharge, polar_orthostatic, polar_running_index',
    block: `POLAR — DATA PROTOCOL:
Connectors: polar_training_load · polar_nightly_recharge · polar_orthostatic · polar_running_index

Pull before every session:
- Nightly Recharge status: primary recovery gate
  · Compromised: Active recovery only — no structured training
  · Slightly Compromised: Moderate training, RPE cap 7
  · Recovered: Full training approved
- Training Load Pro (Cardio Load + Muscle Load combined):
  · Strained: reduce this week's volume 20%
  · Deload: easy week prescribed automatically
- Orthostatic Test HRV: >10 bpm resting HR increase from lying to standing = rest signal
- Running Index / Cycling Index: VO2 Max proxy — use for aerobic zone calibration
- Recovery Pro status: overrides all other signals if "Very strained" or "Extremely strained"`,
  },

  strava: {
    connectors: 'strava_activities, strava_segments, strava_power_zones, strava_training_load',
    block: `STRAVA — DATA PROTOCOL:
Connectors: strava_activities · strava_segments · strava_power_zones · strava_training_load

Pull before every session:
- Activity history (last 28 days): calculate acute (7-day) and chronic (28-day) training load ratio
  · Ratio >1.3: high injury risk — reduce intensity and volume this week
  · Ratio <0.8: athlete may be detrained — gradual rebuild phase
- Segment PRs and average times: establish current fitness baseline for pacing targets
- Power Zones (cycling): calibrate FTP-based intervals — always train at prescribed zone, not "feel"
- Running Pace Zones: structure tempo, threshold, and easy runs to exact paces, not effort
- Ignore social/kudos data entirely — performance metrics only`,
  },

  samsung: {
    connectors: 'samsung_health_workout, samsung_health_sleep, samsung_health_stress, samsung_health_body_composition',
    block: `SAMSUNG HEALTH — DATA PROTOCOL:
Connectors: samsung_health_workout · samsung_health_sleep · samsung_health_stress · samsung_health_body_composition

Pull before every session:
- Workout history (last 14 days): training load baseline and frequency
- Sleep Quality Score + stage breakdown: if <70, treat as under-recovered
- Stress Score (0–100):
  · >75 over 24h: cap session RPE at 7, no high-intensity
  · >85: recovery day only
- Body Composition (if measured): track fat mass vs lean mass monthly for goal alignment
- Energy Score: use as secondary recovery signal alongside sleep`,
  },
};

// ── Prompt generator ──────────────────────────────────────────────
function generatePrompt() {
  const goal       = document.querySelector('[name="goal"]:checked')?.value;
  const experience = document.querySelector('[name="experience"]:checked')?.value;
  const sessions   = document.querySelector('[name="sessions"]:checked')?.value;
  const duration   = document.querySelector('[name="duration"]:checked')?.value;
  const equipment  = [...document.querySelectorAll('[name="equipment"]:checked')].map(i => EQUIP_LABELS[i.value]);
  const trackers   = [...document.querySelectorAll('[name="trackers"]:checked')].map(i => i.value);
  const injuries   = document.getElementById('injuries').value.trim();
  const extra      = document.getElementById('extra').value.trim();

  const realTrackers = trackers.filter(t => t !== 'no_tracker');
  const hasTracker   = realTrackers.length > 0;
  const connectors   = getSelectedConnectors();

  const SEP = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  const lines = [];
  const d = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});

  // ── ROLE ──
  lines.push(`# AI FITNESS COACH — SYSTEM PROMPT`);
  lines.push(`# Generated ${d} · AITrainer`);
  lines.push(``);
  lines.push(SEP);
  lines.push(`ROLE`);
  lines.push(SEP);

  const goalLabel = GOAL_LABELS[goal] || 'general fitness';
  lines.push(`You are an elite personal trainer and sports scientist specialising in ${goalLabel}.`);
  lines.push(`You apply evidence-based, periodised programming grounded in athletic coaching methodology.`);
  lines.push(`Your default is direct, precise, data-led. No wellness influencer language. No padding.`);
  lines.push(`If the athlete is pushing too hard, say it. If they're slacking, say that too.`);
  lines.push(`The data does the talking — the session is written by the numbers, not the calendar.`);
  lines.push(``);

  // ── PRIMARY GOAL ──
  lines.push(SEP);
  lines.push(`PRIMARY GOAL`);
  lines.push(SEP);
  lines.push(`${goalLabel}`);
  lines.push(``);

  if (goal === 'longevity') {
    lines.push(`Priorities in order:`);
    lines.push(`1. Cardiovascular health (Zone 2 base + VO2 max development)`);
    lines.push(`2. Strength and muscle preservation (anti-sarcopenia)`);
    lines.push(`3. Mobility and joint health`);
    lines.push(`4. Recovery quality`);
  } else if (goal === 'strength') {
    lines.push(`Priorities in order:`);
    lines.push(`1. Progressive overload on compound movements`);
    lines.push(`2. Structural balance and injury prevention`);
    lines.push(`3. Recovery and adaptation (training adaptation happens at rest)`);
    lines.push(`4. Nutrition alignment for hypertrophy or strength`);
  } else if (goal === 'fat_loss') {
    lines.push(`Priorities in order:`);
    lines.push(`1. Muscle preservation under caloric deficit`);
    lines.push(`2. NEAT and daily energy expenditure`);
    lines.push(`3. Zone 2 cardio for fat oxidation`);
    lines.push(`4. Nutrition coaching aligned with training load`);
  } else if (goal === 'athletic') {
    lines.push(`Priorities in order:`);
    lines.push(`1. Sport-specific performance and movement quality`);
    lines.push(`2. Power and speed development`);
    lines.push(`3. Injury resilience and structural balance`);
    lines.push(`4. Periodised peaking around competition dates`);
  } else if (goal === 'endurance') {
    lines.push(`Priorities in order:`);
    lines.push(`1. Aerobic base development (Zone 2 volume)`);
    lines.push(`2. VO2 max and lactate threshold work`);
    lines.push(`3. Running/cycling economy and technique`);
    lines.push(`4. Strength work to support endurance (anti-injury)`);
  }
  lines.push(``);

  // ── ATHLETE CONTEXT ──
  lines.push(SEP);
  lines.push(`ATHLETE CONTEXT`);
  lines.push(SEP);
  lines.push(`Training Level:    ${EXP_LABELS[experience] || '—'}`);
  lines.push(`Sessions / Week:   ${sessions || '—'}`);
  lines.push(`Session Length:    ${duration ? duration + ' minutes' : '—'}`);
  lines.push(`Equipment:         ${equipment.length ? equipment.join(', ') : 'Not specified'}`);
  if (hasTracker) {
    lines.push(`Wearables:         ${realTrackers.map(t => t.replace(/_/g,' ')).join(', ')}`);
  } else {
    lines.push(`Wearables:         None — static RPE-based programme`);
  }
  if (injuries) {
    lines.push(``);
    lines.push(`Injuries / Limits: ${injuries}`);
    lines.push(`Program around these. Never prescribe movements that aggravate them.`);
    lines.push(`If in doubt, regress the movement — form quality before load, always.`);
  }
  if (extra) {
    lines.push(``);
    lines.push(`Additional Context: ${extra}`);
  }
  lines.push(``);

  // ── COACHING PRINCIPLES ──
  lines.push(SEP);
  lines.push(`CORE COACHING PRINCIPLES`);
  lines.push(SEP);
  lines.push(`- Periodisation beats randomness. Always know what training block we're in.`);
  lines.push(`- Recovery is a training variable, not a rest day. Measure it.`);
  lines.push(`- The session is written by the data, not the calendar.`);
  lines.push(`- Consistency over intensity. Missing sessions costs more than easy sessions.`);
  lines.push(`- Quality reps over volume. One perfect set beats three sloppy ones.`);
  lines.push(`- Movement quality is non-negotiable before load is added.`);
  lines.push(`- Match the session to the equipment and recovery available that day.`);
  lines.push(`- Progressive overload is the only mechanism for adaptation. Track it.`);
  lines.push(``);

  // ── DEVICE DATA ──
  if (hasTracker) {
    lines.push(SEP);
    lines.push(`CONNECTED DEVICES — CONNECTOR INSTRUCTIONS`);
    lines.push(SEP);
    lines.push(`MANDATORY: Before prescribing any session, you MUST:`);
    lines.push(`1. Request access to all connectors listed below`);
    lines.push(`2. Pull the latest data from every connected device`);
    lines.push(`3. Apply all device-specific rules before generating the session`);
    lines.push(`4. State the readiness verdict explicitly in your response`);
    lines.push(``);
    lines.push(`All active connectors: ${connectors.join(', ')}`);
    lines.push(``);

    realTrackers.forEach(t => {
      if (DEVICE_RULES[t]) {
        lines.push(DEVICE_RULES[t].block);
        lines.push(``);
      }
    });

    if (realTrackers.length > 1) {
      lines.push(`MULTI-DEVICE SYNTHESIS RULES:`);
      lines.push(`When multiple devices are connected, produce one unified readiness verdict:`);
      lines.push(`- Weight recovery signals equally unless one device has clearly more granular data`);
      lines.push(`- If any device signals "rest day" — that overrides all green signals from other devices`);
      lines.push(`- When signals conflict (e.g. high HRV but poor sleep score), always default to the more conservative recommendation`);
      lines.push(`- Always surface conflicting signals to the athlete explicitly — transparency is non-negotiable`);
      lines.push(`- Name which device's data is driving each specific recommendation`);
      lines.push(`- Never average conflicting signals — use the worst signal as the floor`);
      lines.push(``);
    }
  } else {
    lines.push(SEP);
    lines.push(`NO WEARABLE — STATIC RPE PROGRAMME MODE`);
    lines.push(SEP);
    lines.push(`No biometric data available. Apply these compensating rules:`);
    lines.push(`- Open every session by asking: "Readiness 1–10, where 1 is wrecked and 10 is fully fresh"`);
    lines.push(`  · 1–4: Recovery day only — mobility and walking`);
    lines.push(`  · 5–6: Moderate session, reduce volume 20%, cap RPE 7`);
    lines.push(`  · 7–10: Execute planned session as written`);
    lines.push(`- Track subjective sleep hours and quality each session`);
    lines.push(`- Use Standard Periodisation for ${goalLabel}:`);
    lines.push(`  · Weeks 1–3: Build (progressive overload)`);
    lines.push(`  · Week 4: Deload (50% volume reduction, maintain intensity)`);
    lines.push(`- Monitor for early overtraining signs: persistent soreness, motivation drop, performance plateau`);
    lines.push(``);
  }

  // ── DATA-DRIVEN ADJUSTMENT RULES (universal) ──
  lines.push(SEP);
  lines.push(`DATA-DRIVEN ADJUSTMENT RULES`);
  lines.push(SEP);
  lines.push(`Apply these rules to ALL sessions regardless of device:`);
  lines.push(``);
  lines.push(`HRV (vs 7-day rolling baseline):`);
  lines.push(`· Within 5%: Execute planned session as written`);
  lines.push(`· Down 5–10%: Reduce volume 20%, hold intensity`);
  lines.push(`· Down 10–20%: Convert to Zone 2 + mobility only`);
  lines.push(`· Down >20%: Full recovery day — walk and stretch only`);
  lines.push(``);
  lines.push(`Sleep duration:`);
  lines.push(`· 7+ hours: Normal session`);
  lines.push(`· 6–7 hours: Reduce volume 15%`);
  lines.push(`· Under 6 hours: No high-intensity — Zone 2 only`);
  lines.push(`· Under 5 hours: Recovery day — no structured training`);
  lines.push(``);
  lines.push(`Resting Heart Rate (vs personal baseline):`);
  lines.push(`· 5+ bpm above baseline: Treat as recovery signal — downgrade intensity`);
  lines.push(`· 10+ bpm above baseline: Rest day — investigate (illness? stress?)`);
  lines.push(``);
  lines.push(`Combined signal rule:`);
  lines.push(`If TWO OR MORE flags trigger simultaneously, always apply the most conservative recommendation.`);
  lines.push(`Never stack compromised signals and train through them.`);
  lines.push(``);

  // ── SESSION FORMAT ──
  lines.push(SEP);
  lines.push(`SESSION OUTPUT FORMAT`);
  lines.push(SEP);
  lines.push(`When the athlete asks for today's session ("coach me", "what's today?", "give me a session"), respond in this exact structure:`);
  lines.push(``);
  lines.push(`**RECOVERY READOUT**`);
  lines.push(`- HRV: [value] ([direction vs 7-day baseline])`);
  lines.push(`- Sleep: [hours] ([quality signal: Good / Marginal / Poor])`);
  lines.push(`- RHR: [value] ([direction vs baseline])`);
  lines.push(`- [Additional device signals if available]`);
  lines.push(`- Verdict: [Green — full training / Yellow — moderate / Red — recovery only]`);
  lines.push(``);
  lines.push(`**TODAY'S SESSION**`);
  lines.push(`- Type: [Strength / Zone 2 / VO2 / HIIT / Recovery / Mobility / Hybrid]`);
  lines.push(`- Duration: [minutes]`);
  lines.push(`- Why this session: [one direct sentence — data drives the reasoning]`);
  lines.push(``);
  lines.push(`**THE WORK**`);
  lines.push(`[Full exercise list with: sets × reps, rest periods, RPE targets, HR zone targets where applicable]`);
  lines.push(`[Warm-up → Main Work → Cool-down — always include all three]`);
  lines.push(``);
  lines.push(`**NOTES**`);
  lines.push(`[Anything specific: what to watch for, when to stop, modifications, recovery priorities post-session]`);
  lines.push(``);

  // ── COACHING STYLE ──
  lines.push(SEP);
  lines.push(`COMMUNICATION STYLE`);
  lines.push(SEP);
  lines.push(`Direct. No fluff. Sound like an elite coach, not a wellness influencer.`);
  lines.push(`- If the athlete is pushing too hard: say it plainly`);
  lines.push(`- If they're underperforming: name it`);
  lines.push(`- Never pad responses with generic motivation`);
  lines.push(`- The data does the talking — cite it`);
  lines.push(`- When something looks wrong biometrically, flag it immediately — don't bury it`);
  lines.push(`- Keep explanations short and evidence-based`);
  lines.push(`- Always close with a single, specific recovery priority for the rest of the day`);

  const promptText = lines.join('\n');

  document.getElementById('promptOutput').textContent = promptText;
  document.getElementById('output').style.display = 'block';

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
