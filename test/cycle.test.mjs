import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LIMITS,
  addDays,
  buildIcs,
  cycleDayNumber,
  daysBetween,
  describeDate,
  formatISODate,
  googleCalendarUrl,
  occurrenceOnOrAfter,
  parseISODate,
  phaseForCycleDay,
  phaseRanges,
  toGoogleAllDay,
  upcomingPhase,
  validateProfile,
} from '../cycle.js';

const classic = {
  lastPeriodStart: '2026-11-01',
  cycleLength: 28,
  periodLength: 5,
};

test('a 28-day cycle with a 5-day period matches the original map', () => {
  const ranges = phaseRanges(28, 5);
  assert.deepEqual(ranges.sattva, { start: 1, end: 5 });
  assert.deepEqual(ranges.rajas, { start: 6, end: 16 });
  assert.deepEqual(ranges.tamas, { start: 17, end: 28 });
  assert.equal(ranges.ovulationDay, 14);
});

test('every valid length covers each day once and keeps Tamas at 12 days', () => {
  for (let cycle = LIMITS.cycleMin; cycle <= LIMITS.cycleMax; cycle += 1) {
    for (let period = LIMITS.periodMin; period <= LIMITS.periodMax; period += 1) {
      const ranges = phaseRanges(cycle, period);
      const seen = new Map();
      for (const name of ['sattva', 'rajas', 'tamas']) {
        assert.ok(ranges[name].end >= ranges[name].start, `${name} is non-empty for ${cycle}/${period}`);
        for (let day = ranges[name].start; day <= ranges[name].end; day += 1) {
          assert.equal(seen.has(day), false);
          seen.set(day, name);
        }
      }
      assert.equal(seen.size, cycle);
      for (let day = 1; day <= cycle; day += 1) {
        assert.equal(phaseForCycleDay(day, ranges), seen.get(day));
      }
      assert.equal(ranges.sattva.start, 1);
      assert.equal(ranges.sattva.end, period);
      assert.equal(ranges.rajas.start, period + 1);
      assert.equal(ranges.rajas.end, cycle - 12);
      assert.equal(ranges.tamas.start, cycle - 11);
      assert.equal(ranges.tamas.end, cycle);
      assert.equal(ranges.tamas.end - ranges.tamas.start + 1, 12);
      assert.equal(ranges.ovulationDay, cycle - 14);
    }
  }
});

test('shorter and longer cycles move only the Rajas window', () => {
  const short = phaseRanges(21, 5);
  assert.deepEqual(short.sattva, { start: 1, end: 5 });
  assert.deepEqual(short.rajas, { start: 6, end: 9 });
  assert.deepEqual(short.tamas, { start: 10, end: 21 });

  const long = phaseRanges(35, 5);
  assert.deepEqual(long.sattva, { start: 1, end: 5 });
  assert.deepEqual(long.rajas, { start: 6, end: 23 });
  assert.deepEqual(long.tamas, { start: 24, end: 35 });
});

test('cycle day is 1 on the start date and wraps to the next cycle', () => {
  const start = parseISODate('2026-11-01');
  assert.equal(cycleDayNumber(start, parseISODate('2026-11-01'), 28), 1);
  assert.equal(cycleDayNumber(start, parseISODate('2026-11-12'), 28), 12);
  assert.equal(cycleDayNumber(start, parseISODate('2026-11-28'), 28), 28);
  assert.equal(cycleDayNumber(start, parseISODate('2026-11-29'), 28), 1);
  assert.equal(describeDate(parseISODate('2026-11-12'), classic).phase, 'rajas');
  assert.equal(describeDate(parseISODate('2026-11-05'), classic).phase, 'sattva');
  assert.equal(describeDate(parseISODate('2026-11-21'), classic).phase, 'tamas');
});

test('dates before the saved start are not assigned a phase', () => {
  assert.equal(describeDate(parseISODate('2026-10-31'), classic), null);
  assert.equal(upcomingPhase(parseISODate('2026-10-31'), classic), null);
});

test('the next phase reports tomorrow and later days', () => {
  const onRajasEdge = upcomingPhase(parseISODate('2026-11-16'), classic);
  assert.equal(onRajasEdge.phase, 'tamas');
  assert.equal(onRajasEdge.daysUntil, 1);
  assert.equal(formatISODate(onRajasEdge.date), '2026-11-17');

  const midRajas = upcomingPhase(parseISODate('2026-11-12'), classic);
  assert.equal(midRajas.phase, 'tamas');
  assert.equal(midRajas.daysUntil, 5);

  const cycleEnd = upcomingPhase(parseISODate('2026-11-28'), classic);
  assert.equal(cycleEnd.phase, 'sattva');
  assert.equal(cycleEnd.daysUntil, 1);
  assert.equal(formatISODate(cycleEnd.date), '2026-11-29');
});

test('phase occurrences stay on calendar dates across the cycle boundary', () => {
  const currentRajas = occurrenceOnOrAfter(parseISODate('2026-11-12'), classic, 'rajas');
  assert.equal(formatISODate(currentRajas.start), '2026-11-06');
  assert.equal(formatISODate(currentRajas.end), '2026-11-16');

  const nextSattva = occurrenceOnOrAfter(parseISODate('2026-11-20'), classic, 'sattva');
  assert.equal(formatISODate(nextSattva.start), '2026-11-29');
  assert.equal(formatISODate(nextSattva.end), '2026-12-03');

  const before = occurrenceOnOrAfter(parseISODate('2026-10-15'), classic, 'sattva');
  assert.equal(formatISODate(before.start), '2026-11-01');
  assert.equal(formatISODate(before.end), '2026-11-05');
});

test('calendar dates do not drift across DST or month boundaries', () => {
  const march = parseISODate('2026-03-27');
  assert.equal(formatISODate(addDays(march, 3)), '2026-03-30');
  assert.equal(daysBetween(march, parseISODate('2026-03-30')), 3);
  assert.equal(formatISODate(addDays(parseISODate('2024-02-28'), 1)), '2024-02-29');
  assert.equal(formatISODate(addDays(parseISODate('2024-02-28'), 2)), '2024-03-01');
  assert.equal(formatISODate(addDays(parseISODate('2026-12-31'), 1)), '2027-01-01');
});

test('invalid dates and lengths are rejected', () => {
  assert.throws(() => parseISODate('2026-02-31'));
  assert.throws(() => parseISODate('2026-13-01'));
  assert.throws(() => parseISODate('11/01/2026'));
  assert.throws(() => phaseRanges(20, 5));
  assert.throws(() => phaseRanges(28, 2));
  assert.throws(() => phaseRanges(28.5, 5));
  const errors = validateProfile({ lastPeriodStart: '', cycleLength: 40, periodLength: 1 });
  assert.deepEqual(errors, { lastPeriodStart: 'date', cycleLength: 'cycle', periodLength: 'period' });
  assert.deepEqual(validateProfile(classic), {});
});

test('all-day calendar exports use exclusive end dates and escape text', () => {
  const start = parseISODate('2026-11-01');
  const end = parseISODate('2026-11-05');
  assert.equal(toGoogleAllDay(start, end), '20261101/20261106');
  const ics = buildIcs({
    title: 'LunaGuna, סאטווה',
    description: 'line one\nline; two',
    start,
    endInclusive: end,
  });
  assert.match(ics, /DTSTART;VALUE=DATE:20261101/);
  assert.match(ics, /DTEND;VALUE=DATE:20261106/);
  assert.match(ics, /SUMMARY:LunaGuna\\, סאטווה/);
  assert.match(ics, /DESCRIPTION:line one\\nline\\; two/);
  assert.equal(ics.includes('\n'), true);
  assert.equal(ics.includes('Z'), false);
  const url = new URL(googleCalendarUrl({
    title: 'LunaGuna',
    description: 'note',
    start,
    endInclusive: end,
  }));
  assert.equal(url.searchParams.get('dates'), '20261101/20261106');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
});
