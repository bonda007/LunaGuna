/**
 * Cycle → guna map.
 *
 * A 28-day cycle with a 5-day period matches the original LunaGuna map exactly:
 * Satva 1–5, Rajas 6–16, Tamas 17–28.
 *
 * Tamas stays 12 days (the original premenstrual window). Estimated ovulation is
 * cycleLength − 14, and Rajas runs through two days after that. Extra or missing
 * days, compared with 28, are added to or taken from Rajas. Satva is the period
 * length (default 5).
 *
 * This is a simple rhythm, not a medical prediction and not contraception.
 */

export const LIMITS = Object.freeze({
  cycleMin: 21,
  cycleMax: 35,
  periodMin: 3,
  periodMax: 8,
  defaultCycle: 28,
  defaultPeriod: 5,
});

export const PHASES = Object.freeze(['sattva', 'rajas', 'tamas']);

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseISODate(iso) {
  if (typeof iso !== 'string') {
    throw new TypeError('Date must be YYYY-MM-DD');
  }
  const match = ISO_DATE.exec(iso);
  if (!match) {
    throw new TypeError('Date must be YYYY-MM-DD');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new TypeError('Date must be a real calendar day');
  }
  return date;
}

export function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Whole calendar days from `from` to `to`. Time of day and DST do not affect it. */
export function daysBetween(from, to) {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86400000);
}

export function validateProfile(profile) {
  const errors = {};
  if (!profile || typeof profile.lastPeriodStart !== 'string') {
    errors.lastPeriodStart = 'date';
  } else {
    try {
      parseISODate(profile.lastPeriodStart);
    } catch {
      errors.lastPeriodStart = 'date';
    }
  }
  if (
    !profile ||
    !Number.isInteger(profile.cycleLength) ||
    profile.cycleLength < LIMITS.cycleMin ||
    profile.cycleLength > LIMITS.cycleMax
  ) {
    errors.cycleLength = 'cycle';
  }
  if (
    !profile ||
    !Number.isInteger(profile.periodLength) ||
    profile.periodLength < LIMITS.periodMin ||
    profile.periodLength > LIMITS.periodMax
  ) {
    errors.periodLength = 'period';
  }
  return errors;
}

export function isValidProfile(profile) {
  return Object.keys(validateProfile(profile)).length === 0;
}

export function phaseRanges(cycleLength, periodLength) {
  if (!Number.isInteger(cycleLength) || cycleLength < LIMITS.cycleMin || cycleLength > LIMITS.cycleMax) {
    throw new RangeError(`cycleLength must be an integer from ${LIMITS.cycleMin} to ${LIMITS.cycleMax}`);
  }
  if (!Number.isInteger(periodLength) || periodLength < LIMITS.periodMin || periodLength > LIMITS.periodMax) {
    throw new RangeError(`periodLength must be an integer from ${LIMITS.periodMin} to ${LIMITS.periodMax}`);
  }
  const ovulationDay = cycleLength - 14;
  const sattvaEnd = periodLength;
  let rajasEnd = ovulationDay + 2;
  if (rajasEnd <= sattvaEnd) rajasEnd = sattvaEnd + 1;
  if (rajasEnd >= cycleLength) rajasEnd = cycleLength - 1;
  return {
    ovulationDay,
    sattva: { start: 1, end: sattvaEnd },
    rajas: { start: sattvaEnd + 1, end: rajasEnd },
    tamas: { start: rajasEnd + 1, end: cycleLength },
  };
}

export function phaseForCycleDay(day, ranges) {
  if (!Number.isInteger(day)) return null;
  for (const name of PHASES) {
    const range = ranges[name];
    if (day >= range.start && day <= range.end) return name;
  }
  return null;
}

/** 1-based day inside the cycle. Dates before the start still wrap; callers decide whether to show them. */
export function cycleDayNumber(start, date, cycleLength) {
  if (!Number.isInteger(cycleLength) || cycleLength < LIMITS.cycleMin || cycleLength > LIMITS.cycleMax) {
    throw new RangeError(`cycleLength must be an integer from ${LIMITS.cycleMin} to ${LIMITS.cycleMax}`);
  }
  const diff = daysBetween(start, date);
  const mod = ((diff % cycleLength) + cycleLength) % cycleLength;
  return mod + 1;
}

/**
 * Phase for a calendar date, or null when the date is before tracking starts.
 * `date` and the profile start are calendar dates, not timestamps.
 */
export function describeDate(date, profile) {
  if (!isValidProfile(profile)) {
    throw new Error('Invalid profile');
  }
  const start = parseISODate(profile.lastPeriodStart);
  if (daysBetween(start, date) < 0) return null;
  const ranges = phaseRanges(profile.cycleLength, profile.periodLength);
  const day = cycleDayNumber(start, date, profile.cycleLength);
  const phase = phaseForCycleDay(day, ranges);
  const cycleStart = addDays(date, -(day - 1));
  return {
    day,
    phase,
    ranges,
    cycleStart,
    cycleLength: profile.cycleLength,
    periodLength: profile.periodLength,
  };
}

export function phaseInterval(cycleStart, range) {
  return {
    start: addDays(cycleStart, range.start - 1),
    end: addDays(cycleStart, range.end - 1),
  };
}

/** The current occurrence of a phase, or the next one if today is already past it. */
export function occurrenceOnOrAfter(date, profile, phase) {
  if (!isValidProfile(profile)) throw new Error('Invalid profile');
  if (!PHASES.includes(phase)) throw new Error('Unknown phase');
  const trackingStart = parseISODate(profile.lastPeriodStart);
  const ranges = phaseRanges(profile.cycleLength, profile.periodLength);
  const anchor = daysBetween(trackingStart, date) < 0 ? trackingStart : date;
  const day = cycleDayNumber(trackingStart, anchor, profile.cycleLength);
  let cycleStart = addDays(anchor, -(day - 1));
  if (day > ranges[phase].end) {
    cycleStart = addDays(cycleStart, profile.cycleLength);
  }
  return phaseInterval(cycleStart, ranges[phase]);
}

export function upcomingPhase(date, profile) {
  const described = describeDate(date, profile);
  if (!described) return null;
  const index = PHASES.indexOf(described.phase);
  const next = PHASES[(index + 1) % PHASES.length];
  const nextStartDay = described.ranges[next].start;
  const daysUntil = nextStartDay > described.day
    ? nextStartDay - described.day
    : described.cycleLength - described.day + nextStartDay;
  return {
    phase: next,
    daysUntil,
    date: addDays(date, daysUntil),
  };
}

export function toAllDayStamp(date) {
  return formatISODate(date).replace(/-/g, '');
}

/** Google Calendar all-day `dates` parameter. The end is exclusive. */
export function toGoogleAllDay(start, endInclusive) {
  return `${toAllDayStamp(start)}/${toAllDayStamp(addDays(endInclusive, 1))}`;
}

function foldLine(line) {
  const limit = 70;
  if (line.length <= limit) return line;
  const parts = [line.slice(0, limit)];
  let index = limit;
  while (index < line.length) {
    const chunk = line.slice(index, index + limit - 1);
    parts.push(` ${chunk}`);
    index += chunk.length;
  }
  return parts.join('\r\n');
}

function escapeIcs(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcs({ title, description, start, endInclusive }) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LunaGuna//Cycle//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${toAllDayStamp(start)}`,
    `DTEND;VALUE=DATE:${toAllDayStamp(addDays(endInclusive, 1))}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function googleCalendarUrl({ title, description, start, endInclusive }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    dates: toGoogleAllDay(start, endInclusive),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
