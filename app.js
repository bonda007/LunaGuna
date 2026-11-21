import {
  LIMITS,
  PHASES,
  addDays,
  buildIcs,
  describeDate,
  formatISODate,
  googleCalendarUrl,
  occurrenceOnOrAfter,
  phaseRanges,
  startOfMonth,
  upcomingPhase,
  validateProfile,
} from './cycle.js';
import { messages } from './i18n.js';

const STORAGE_KEY = 'lunaguna.v1';
const VIEWS = ['today', 'calendar', 'learn', 'settings'];

const state = {
  lang: 'he',
  profile: null,
  view: 'today',
  month: startOfMonth(new Date()),
  selected: null,
  banner: '',
  focusId: null,
};

let viewChanged = false;
let pendingEvent = null;

const copy = () => messages[state.lang];
const main = () => document.getElementById('main');

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && (data.lang === 'he' || data.lang === 'en')) state.lang = data.lang;
    if (data && data.profile && Object.keys(validateProfile(data.profile)).length === 0) {
      state.profile = {
        lastPeriodStart: data.profile.lastPeriodStart,
        cycleLength: data.profile.cycleLength,
        periodLength: data.profile.periodLength,
      };
    }
  } catch {
    state.profile = null;
  }
}

function persist() {
  try {
    const payload = { v: 1, lang: state.lang };
    if (state.profile) payload.profile = state.profile;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function wipe() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* The in-memory copy is cleared either way. */
  }
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function phaseText(name) {
  return copy().phases[name];
}

function primaryName(name) {
  const phase = phaseText(name);
  return state.lang === 'he' ? phase.heName : phase.enName;
}

function secondaryName(name) {
  const phase = phaseText(name);
  return state.lang === 'he' ? phase.enName : phase.heName;
}

function formatLong(date) {
  return new Intl.DateTimeFormat(copy().locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatMonth(date) {
  return new Intl.DateTimeFormat(copy().locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatWeekday(date, width) {
  const chosen = width || (state.lang === 'he' ? 'narrow' : 'short');
  return new Intl.DateTimeFormat(copy().locale, { weekday: chosen }).format(date);
}

function formatSpan(range) {
  return `${range.start}–${range.end}`;
}

function formatRanges(ranges) {
  return PHASES.map((name) => `${primaryName(name)} ${formatSpan(ranges[name])}`).join(' · ');
}

function readInt(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return Number.NaN;
  return Number(value.trim());
}

function render() {
  const text = copy();
  document.documentElement.lang = state.lang;
  document.documentElement.dir = text.dir;
  document.title = state.lang === 'he'
    ? 'LunaGuna — מעקב גונות לסייקל הנשי'
    : 'LunaGuna — a menstrual cycle companion';

  document.getElementById('tagline').textContent = text.tagline;
  document.getElementById('skip').textContent = text.skip;
  const langButton = document.getElementById('lang-toggle');
  langButton.textContent = text.langToggle;
  langButton.setAttribute('aria-label', text.langToggleLabel);
  langButton.lang = state.lang === 'he' ? 'en' : 'he';
  document.getElementById('nav').setAttribute('aria-label', text.navLabel);

  for (const view of VIEWS) {
    const button = document.querySelector(`[data-view="${view}"]`);
    button.querySelector('span').textContent = text.nav[view];
    if (state.view === view) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }

  fillDialogs();

  const root = main();
  root.replaceChildren();
  if (state.banner) {
    const banner = el('p', { class: 'banner', id: 'status-banner', role: 'status', tabindex: '-1' }, [state.banner]);
    root.append(banner);
    state.banner = '';
  }
  if (state.view === 'today') root.append(renderToday());
  if (state.view === 'calendar') root.append(renderCalendar());
  if (state.view === 'learn') root.append(renderLearn());
  if (state.view === 'settings') root.append(renderSettings());
  renderAside();
  document.documentElement.classList.add('ready');

  if (viewChanged) {
    state.focusId = null;
    const heading = root.querySelector('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
    viewChanged = false;
  } else if (state.focusId) {
    const target = document.getElementById(state.focusId);
    if (target) {
      if (!target.hasAttribute('tabindex') && target.tabIndex < 0) target.tabIndex = -1;
      target.focus();
    }
    state.focusId = null;
  }
}

function fillDialogs() {
  const text = copy();
  document.getElementById('calendar-dialog-title').textContent = text.calendarDialogTitle;
  document.getElementById('calendar-dialog-note').textContent = text.calendarNote;
  document.getElementById('calendar-google').textContent = text.calendarGoogle;
  document.getElementById('calendar-ics').textContent = text.calendarIcs;
  document.getElementById('calendar-cancel').textContent = text.close;
  document.getElementById('confirm-title').textContent = text.deleteTitle;
  document.getElementById('confirm-body').textContent = text.deleteBody;
  document.getElementById('confirm-yes').textContent = text.deleteYes;
  document.getElementById('confirm-no').textContent = text.cancel;
}

function disclaimerLine() {
  const text = copy();
  return el('p', { class: 'disclaimer-line' }, [
    text.disclaimerShort,
    ' ',
    el('button', { type: 'button', class: 'text-button', 'data-go': 'settings' }, [text.disclaimerMore]),
  ]);
}

function renderToday() {
  const text = copy();
  if (!state.profile) {
    return el('div', { class: 'stack' }, [
      el('section', { class: 'card intro-card' }, [
        el('h1', {}, [text.todayTitle]),
        el('p', { class: 'lede' }, [text.emptyLead]),
        el('p', { class: 'quiet' }, [text.emptyPrivacy]),
        disclaimerLine(),
        el('button', { type: 'button', class: 'text-button', 'data-go': 'learn' }, [text.openLearn]),
      ]),
      profileForm(null),
      phasePreviewRow(),
    ]);
  }

  const now = today();
  const described = describeDate(now, state.profile);
  if (!described) {
    return el('div', { class: 'stack' }, [
      el('section', { class: 'card' }, [
        el('h1', {}, [text.beforeStartTitle]),
        el('p', { class: 'lede' }, [text.beforeStartBody]),
        el('p', {}, [formatLong(parseDate(state.profile.lastPeriodStart))]),
        disclaimerLine(),
      ]),
    ]);
  }

  const phase = phaseText(described.phase);
  const next = upcomingPhase(now, state.profile);
  return el('div', { class: 'stack' }, [
    el('article', { class: 'hero', 'data-phase': described.phase }, [
      el('p', { class: 'eyebrow' }, [`${text.todayTitle} · ${formatLong(now)}`]),
      dayCount(described.day, described.cycleLength),
      el('h1', {
        class: 'phase-name',
        lang: state.lang === 'he' ? 'he' : 'en',
        dir: state.lang === 'he' ? 'rtl' : 'ltr',
      }, [primaryName(described.phase)]),
      el('p', { class: 'phase-latin' }, [
        el('bdi', {
          lang: state.lang === 'he' ? 'en' : 'he',
          dir: state.lang === 'he' ? 'ltr' : 'rtl',
        }, [secondaryName(described.phase)]),
      ]),
      el('p', { class: 'lede' }, [phase.description]),
      track(described),
      trackLabels(described.ranges),
      el('h2', { class: 'recs-title' }, [text.recommendations]),
      el('ul', { class: 'recs' }, phase.recommendations.map((item) => el('li', {}, [item]))),
      nextLine(next),
      el('p', { class: 'quiet' }, [text.ovulationNote.replace('{day}', String(described.ranges.ovulationDay))]),
      el('button', {
        type: 'button',
        class: 'button',
        'data-action': 'add-phase',
        'data-phase': described.phase,
      }, [text.addPhase]),
    ]),
    disclaimerLine(),
    upcomingStrip(now),
  ]);
}

function dayCount(day, length) {
  const text = copy();
  return el('p', { class: 'day-count' }, [
    `${text.dayWord} `,
    el('bdi', { dir: 'ltr' }, [String(day)]),
    ` ${text.ofWord} `,
    el('bdi', { dir: 'ltr' }, [String(length)]),
  ]);
}

function track(described) {
  const text = copy();
  const parts = PHASES.map((name) => `${primaryName(name)} ${formatSpan(described.ranges[name])}`);
  const label = `${text.dayWord} ${described.day} ${text.ofWord} ${described.cycleLength}. ${parts.join(', ')}`;
  const bar = el('div', { class: 'track', role: 'img', 'aria-label': label });
  for (const name of PHASES) {
    const range = described.ranges[name];
    const segment = el('span', { 'data-phase': name });
    segment.style.flexGrow = String(range.end - range.start + 1);
    bar.append(segment);
  }
  const marker = el('div', { class: 'marker', 'aria-hidden': 'true' });
  marker.style.setProperty('--pos', `${((described.day - 0.5) / described.cycleLength) * 100}%`);
  return el('div', { class: 'track-wrap' }, [bar, marker]);
}

function trackLabels(ranges) {
  return el('p', { class: 'track-legend' }, [formatRanges(ranges)]);
}

function nextLine(next) {
  const text = copy();
  const name = primaryName(next.phase);
  const when = next.daysUntil === 1
    ? (state.lang === 'he' ? `${text.nextTomorrow} ${name}` : `${name} ${text.nextTomorrow}`)
    : `${name} ${text.nextIn} ${next.daysUntil} ${text.days}`;
  return el('p', { class: 'next-phase' }, [
    when,
    ' · ',
    el('span', { class: 'nowrap' }, [formatLong(next.date)]),
  ]);
}

function upcomingStrip(now) {
  const text = copy();
  const items = [];
  for (let offset = 0; offset < 14; offset += 1) {
    const date = addDays(now, offset);
    const iso = formatISODate(date);
    const described = describeDate(date, state.profile);
    const phase = described ? described.phase : 'none';
    const label = described
      ? `${formatWeekday(date, 'long')} ${formatLong(date)}, ${primaryName(described.phase)}, ${text.cycleDay.replace('{day}', String(described.day))}`
      : `${formatWeekday(date, 'long')} ${formatLong(date)}, ${text.beforeTracking}`;
    const chip = el('button', {
      type: 'button',
      class: 'chip',
      'data-date': iso,
      'data-phase': phase,
      'aria-label': label,
    }, [
      el('small', {}, [formatWeekday(date)]),
      el('strong', {}, [String(date.getDate())]),
    ]);
    if (offset === 0) chip.setAttribute('aria-current', 'date');
    items.push(el('li', {}, [chip]));
  }
  return el('section', { class: 'card' }, [
    el('h2', {}, [text.upcoming]),
    el('ol', { class: 'strip' }, items),
  ]);
}

function phasePreviewRow() {
  return el('div', { class: 'preview-row' }, PHASES.map((name) => {
    const phase = phaseText(name);
    return el('article', { class: 'mini', 'data-phase': name }, [
      el('h2', {}, [primaryName(name)]),
      el('p', {}, [phase.summary]),
    ]);
  }));
}

function profileForm(profile) {
  const text = copy();
  const cycle = profile ? profile.cycleLength : LIMITS.defaultCycle;
  const period = profile ? profile.periodLength : LIMITS.defaultPeriod;
  const ranges = phaseRanges(cycle, period);
  const form = el('form', { class: 'card form-card', 'data-profile-form': 'true', novalidate: true }, [
    el('h2', {}, [profile ? text.editTitle : text.formTitle]),
    profile ? null : el('p', { class: 'quiet' }, [text.formHelp]),
    el('div', { class: 'fields' }, [
      field('start', 'date', text.dateLabel, profile ? profile.lastPeriodStart : '', null),
      field('cycle', 'number', text.cycleLabel, String(cycle), text.cycleHint),
      field('period', 'number', text.periodLabel, String(period), text.periodHint),
    ]),
    el('p', { class: 'preview' }, [
      el('span', { class: 'preview-label' }, [`${text.previewLabel}: `]),
      el('span', { 'data-preview': 'true' }, [previewText(ranges, cycle, period)]),
    ]),
    el('button', { type: 'submit', class: 'button' }, [text.save]),
  ]);
  const cycleInput = form.querySelector('[name="cycle"]');
  cycleInput.min = String(LIMITS.cycleMin);
  cycleInput.max = String(LIMITS.cycleMax);
  cycleInput.inputMode = 'numeric';
  const periodInput = form.querySelector('[name="period"]');
  periodInput.min = String(LIMITS.periodMin);
  periodInput.max = String(LIMITS.periodMax);
  periodInput.inputMode = 'numeric';
  form.querySelector('[name="start"]').required = true;
  return form;
}

function previewText(ranges, cycle, period) {
  const base = formatRanges(ranges);
  if (cycle === LIMITS.defaultCycle && period === LIMITS.defaultPeriod) {
    return `${base}. ${copy().classicNote}`;
  }
  return base;
}

function field(name, type, label, value, hint) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : null;
  const errorId = `${id}-error`;
  const input = el('input', {
    id,
    name,
    type,
    value,
    autocomplete: 'off',
    spellcheck: 'false',
    dir: 'ltr',
    'aria-describedby': [hintId, errorId].filter(Boolean).join(' '),
  });
  return el('label', { for: id }, [
    el('span', { class: 'field-label' }, [label]),
    input,
    hint ? el('span', { class: 'hint', id: hintId }, [hint]) : null,
    el('span', { class: 'error', id: errorId, role: 'alert' }, ['']),
  ]);
}

function readDraft(form) {
  return {
    lastPeriodStart: form.querySelector('[name="start"]').value,
    cycleLength: readInt(form.querySelector('[name="cycle"]').value),
    periodLength: readInt(form.querySelector('[name="period"]').value),
  };
}

function refreshPreview(form) {
  const draft = readDraft(form);
  const slot = form.querySelector('[data-preview]');
  try {
    const ranges = phaseRanges(draft.cycleLength, draft.periodLength);
    slot.textContent = previewText(ranges, draft.cycleLength, draft.periodLength);
  } catch {
    slot.textContent = '';
  }
}

function saveFromForm(form) {
  const text = copy();
  const draft = readDraft(form);
  const errors = validateProfile(draft);
  const fields = [
    ['start', errors.lastPeriodStart, text.errDate],
    ['cycle', errors.cycleLength, text.errCycle],
    ['period', errors.periodLength, text.errPeriod],
  ];
  for (const [name, code, message] of fields) {
    const input = form.querySelector(`[name="${name}"]`);
    const slot = form.querySelector(`#field-${name}-error`);
    slot.textContent = code ? message : '';
    input.setAttribute('aria-invalid', code ? 'true' : 'false');
  }
  if (Object.keys(errors).length > 0) {
    const first = form.querySelector('[aria-invalid="true"]');
    first?.focus();
    return;
  }
  state.profile = {
    lastPeriodStart: draft.lastPeriodStart,
    cycleLength: draft.cycleLength,
    periodLength: draft.periodLength,
  };
  const saved = persist();
  state.banner = saved ? text.saved : text.storageBlocked;
  state.focusId = 'status-banner';
  render();
}

function renderCalendar() {
  const text = copy();
  const month = state.month;
  const head = el('div', { class: 'cal-head' }, [
    el('h1', {}, [text.calendarTitle]),
    el('div', { class: 'month-bar' }, [
      el('button', { type: 'button', class: 'button secondary', id: 'prev-month', 'data-action': 'shift', 'data-delta': '-1' }, [text.prevMonth]),
      el('h2', { id: 'month-label' }, [formatMonth(month)]),
      el('button', { type: 'button', class: 'button secondary', id: 'next-month', 'data-action': 'shift', 'data-delta': '1' }, [text.nextMonth]),
    ]),
    el('button', { type: 'button', class: 'text-button', id: 'this-month', 'data-action': 'this-month' }, [text.thisMonth]),
  ]);

  if (!state.profile) {
    return el('div', { class: 'stack' }, [
      head,
      el('p', { class: 'card' }, [text.noProfileCal]),
      disclaimerLine(),
    ]);
  }

  if (!state.selected) {
    const now = today();
    const initial = now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth()
      ? now
      : new Date(month.getFullYear(), month.getMonth(), 1);
    state.selected = formatISODate(initial);
  }

  const headers = el('div', { class: 'weekdays', 'aria-hidden': 'true' });
  const sunday = addDays(today(), -today().getDay());
  for (let index = 0; index < 7; index += 1) {
    headers.append(el('span', {}, [formatWeekday(addDays(sunday, index))]));
  }

  const grid = el('div', { class: 'cal-grid', role: 'group', 'aria-labelledby': 'month-label' });
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  for (let index = 0; index < first.getDay(); index += 1) {
    grid.append(el('span', { class: 'day-pad' }));
  }
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const todayIso = formatISODate(today());
  for (let day = 1; day <= count; day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const iso = formatISODate(date);
    const described = describeDate(date, state.profile);
    const phase = described ? described.phase : 'none';
    const label = described
      ? `${formatLong(date)}, ${primaryName(described.phase)}, ${text.cycleDay.replace('{day}', String(described.day))}`
      : `${formatLong(date)}, ${text.beforeTracking}`;
    const button = el('button', {
      type: 'button',
      class: 'day',
      id: `day-${iso}`,
      'data-date': iso,
      'data-phase': phase,
      'aria-label': label,
    }, [String(day)]);
    if (iso === todayIso) button.setAttribute('aria-current', 'date');
    if (iso === state.selected) button.setAttribute('aria-pressed', 'true');
    grid.append(button);
  }

  return el('div', { class: 'stack' }, [
    head,
    el('div', { class: 'card cal-card' }, [headers, grid]),
    dayDetail(parseDate(state.selected)),
    legend(),
    disclaimerLine(),
  ]);
}

function dayDetail(date) {
  const text = copy();
  const described = describeDate(date, state.profile);
  const body = [el('h2', {}, [formatLong(date)])];
  if (!described) {
    body.push(el('p', {}, [text.beforeTracking]));
  } else {
    const phase = phaseText(described.phase);
    body.push(el('p', { class: 'detail-phase' }, [
      el('span', { lang: state.lang === 'he' ? 'he' : 'en', dir: state.lang === 'he' ? 'rtl' : 'ltr' }, [primaryName(described.phase)]),
      ' · ',
      text.cycleDay.replace('{day}', String(described.day)),
    ]));
    body.push(el('p', {}, [phase.description]));
    body.push(el('button', {
      type: 'button',
      class: 'button secondary',
      'data-action': 'add-phase',
      'data-phase': described.phase,
    }, [text.addPhase]));
  }
  return el('section', { class: 'card', 'data-phase': described ? described.phase : 'none', 'aria-live': 'polite' }, body);
}

function legend() {
  const text = copy();
  const ranges = phaseRanges(state.profile.cycleLength, state.profile.periodLength);
  return el('ul', { class: 'legend' }, [
    el('li', { class: 'legend-title' }, [text.legend]),
    ...PHASES.map((name) => el('li', { 'data-phase': name }, [`${primaryName(name)} ${formatSpan(ranges[name])}`])),
    el('li', { 'data-phase': 'none' }, [text.beforeTracking]),
  ]);
}

function renderLearn() {
  const text = copy();
  const classic = phaseRanges(LIMITS.defaultCycle, LIMITS.defaultPeriod);
  const yours = state.profile ? phaseRanges(state.profile.cycleLength, state.profile.periodLength) : null;
  const cards = PHASES.map((name) => {
    const phase = phaseText(name);
    return el('article', { class: 'card phase-card', 'data-phase': name }, [
      el('h2', {}, [
        el('span', { lang: 'he', dir: 'rtl' }, [phase.heName]),
        ' · ',
        el('span', { lang: 'en', dir: 'ltr' }, [phase.enName]),
      ]),
      el('p', {}, [phase.summary]),
      el('p', {}, [phase.description]),
      el('h3', {}, [text.recommendations]),
      el('ul', { class: 'recs' }, phase.recommendations.map((item) => el('li', {}, [item]))),
      el('p', {}, [`${text.classicRanges}: ${formatSpan(classic[name])}`]),
      yours ? el('p', {}, [`${text.yourRanges}: ${formatSpan(yours[name])}`]) : null,
      name === 'rajas' ? el('p', { class: 'quiet' }, [text.notContraception]) : null,
      state.profile
        ? el('button', { type: 'button', class: 'button secondary', 'data-action': 'add-phase', 'data-phase': name }, [text.addPhase])
        : el('p', { class: 'quiet' }, [text.saveFirst]),
    ]);
  });

  return el('div', { class: 'stack' }, [
    el('section', { class: 'card' }, [
      el('h1', {}, [text.learnTitle]),
      ...text.learnIntro.map((paragraph) => el('p', { class: 'lede' }, [paragraph])),
    ]),
    ...cards,
    el('section', { class: 'card' }, [
      el('p', {}, [text.learnClosing]),
      el('h2', {}, [text.modelTitle]),
      el('p', {}, [text.modelBody]),
    ]),
    el('section', { class: 'callout' }, [
      el('h2', {}, [text.medicalTitle]),
      el('p', {}, [text.bodyNote]),
      el('p', {}, [text.medicalLine]),
    ]),
  ]);
}

function renderSettings() {
  const text = copy();
  return el('div', { class: 'stack' }, [
    el('h1', {}, [text.settingsTitle]),
    el('section', { class: 'card' }, [
      el('h2', {}, [text.privacyTitle]),
      el('p', {}, [text.privacyBody]),
    ]),
    el('section', { class: 'callout' }, [
      el('h2', {}, [text.medicalTitle]),
      el('p', {}, [text.bodyNote]),
      el('p', {}, [text.medicalLine]),
    ]),
    profileForm(state.profile),
    el('button', { type: 'button', class: 'button danger', 'data-action': 'delete' }, [text.delete]),
  ]);
}

function renderAside() {
  const text = copy();
  const ranges = state.profile
    ? phaseRanges(state.profile.cycleLength, state.profile.periodLength)
    : phaseRanges(LIMITS.defaultCycle, LIMITS.defaultPeriod);
  const aside = document.getElementById('aside');
  aside.replaceChildren(
    el('section', { class: 'card aside-card' }, [
      el('h2', {}, [text.nav.learn]),
      ...PHASES.map((name) => el('p', { class: 'aside-phase', 'data-phase': name }, [
        el('strong', {}, [primaryName(name)]),
        ` ${formatSpan(ranges[name])}`,
      ])),
    ]),
    el('p', { class: 'quiet aside-note' }, [text.emptyPrivacy]),
    el('p', { class: 'callout' }, [text.medicalLine]),
  );
}

function shiftMonth(delta, focusId) {
  const month = state.month;
  const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
  state.month = next;
  const now = today();
  state.selected = now.getFullYear() === next.getFullYear() && now.getMonth() === next.getMonth()
    ? formatISODate(now)
    : formatISODate(next);
  state.focusId = focusId;
  render();
}

function openCalendar(phase) {
  if (!state.profile || !PHASES.includes(phase)) return;
  const text = copy();
  const phaseInfo = phaseText(phase);
  const interval = occurrenceOnOrAfter(today(), state.profile, phase);
  pendingEvent = {
    title: `LunaGuna · ${primaryName(phase)}`,
    description: [phaseInfo.description, '', ...phaseInfo.recommendations, '', text.medicalLine].join('\n'),
    start: interval.start,
    endInclusive: interval.end,
  };
  document.getElementById('calendar-dialog').showModal();
}

function downloadIcs(event) {
  const blob = new Blob([buildIcs(event)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: 'lunaguna.ics' });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function onMainClick(event) {
  const go = event.target.closest('[data-go]');
  if (go) {
    location.hash = go.dataset.go;
    return;
  }

  const action = event.target.closest('[data-action]');
  if (action) {
    const name = action.dataset.action;
    if (name === 'shift') shiftMonth(Number(action.dataset.delta), action.id);
    if (name === 'this-month') {
      state.month = startOfMonth(today());
      state.selected = formatISODate(today());
      state.focusId = 'this-month';
      render();
    }
    if (name === 'add-phase') openCalendar(action.dataset.phase);
    if (name === 'delete') document.getElementById('confirm-dialog').showModal();
    return;
  }

  const dateButton = event.target.closest('[data-date]');
  if (!dateButton) return;
  state.selected = dateButton.dataset.date;
  if (dateButton.classList.contains('chip')) {
    state.month = startOfMonth(parseDate(state.selected));
    state.view = 'calendar';
    state.focusId = `day-${state.selected}`;
    if (location.hash !== '#calendar') location.hash = 'calendar';
    else render();
    return;
  }
  state.focusId = dateButton.id;
  render();
}

function onCalendarKey(event) {
  const button = event.target.closest('.day[data-date]');
  if (!button) return;
  const rtl = document.documentElement.dir === 'rtl';
  let delta = 0;
  if (event.key === 'ArrowRight') delta = rtl ? -1 : 1;
  else if (event.key === 'ArrowLeft') delta = rtl ? 1 : -1;
  else if (event.key === 'ArrowDown') delta = 7;
  else if (event.key === 'ArrowUp') delta = -7;
  else return;
  event.preventDefault();
  const date = addDays(parseDate(button.dataset.date), delta);
  state.selected = formatISODate(date);
  state.month = startOfMonth(date);
  state.focusId = `day-${state.selected}`;
  render();
}

function applyHash() {
  const hash = location.hash.replace('#', '');
  const next = VIEWS.includes(hash) ? hash : 'today';
  if (next !== state.view) viewChanged = true;
  state.view = next;
  render();
}

function toggleLang() {
  state.lang = state.lang === 'he' ? 'en' : 'he';
  if (!persist()) state.banner = copy().storageBlocked;
  render();
}

function onConfirmClose() {
  const dialog = document.getElementById('confirm-dialog');
  if (dialog.returnValue !== 'yes') return;
  wipe();
  state.profile = null;
  state.lang = 'he';
  state.selected = null;
  state.view = 'today';
  state.banner = messages.he.deleted;
  state.focusId = 'status-banner';
  if (location.hash !== '#today' && location.hash !== '') {
    location.hash = 'today';
    return;
  }
  render();
}

function onCalendarClose() {
  const choice = document.getElementById('calendar-dialog').returnValue;
  const event = pendingEvent;
  pendingEvent = null;
  if (!event) return;
  if (choice === 'google') {
    window.open(googleCalendarUrl(event), '_blank', 'noopener,noreferrer');
  } else if (choice === 'ics') {
    downloadIcs(event);
  }
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (location.protocol !== 'https:' && !local) return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function bind() {
  document.getElementById('lang-toggle').addEventListener('click', toggleLang);
  document.getElementById('nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    const view = button.dataset.view;
    if (location.hash === `#${view}`) {
      viewChanged = true;
      state.view = view;
      render();
    } else {
      location.hash = view;
    }
  });
  const root = main();
  root.addEventListener('click', onMainClick);
  root.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-profile-form]');
    if (!form) return;
    event.preventDefault();
    saveFromForm(form);
  });
  root.addEventListener('input', (event) => {
    const form = event.target.closest('[data-profile-form]');
    if (!form) return;
    refreshPreview(form);
  });
  root.addEventListener('keydown', onCalendarKey);
  document.getElementById('confirm-dialog').addEventListener('close', onConfirmClose);
  document.getElementById('calendar-dialog').addEventListener('close', onCalendarClose);
  window.addEventListener('hashchange', applyHash);
}

function start() {
  load();
  const hash = location.hash.replace('#', '');
  if (VIEWS.includes(hash)) state.view = hash;
  bind();
  render();
  registerSW();
}

start();
