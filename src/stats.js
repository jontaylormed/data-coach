/* Data Coach: the measures (exact), reading a typed answer, and checking it. A check names a known
   slip when the answer matches one; a right answer is never called wrong. Results are
   { status: 'right' | 'almost' | 'wrong' | 'info', msg }. */
const Stats = (() => {
  'use strict';
  const EPS = 1e-9;
  const same = (a, b) => Math.abs(a - b) < EPS * Math.max(1, Math.abs(a), Math.abs(b));

  // ---------- Measures ----------
  const sum = v => v.reduce((s, x) => s + x, 0);
  const mean = v => sum(v) / v.length;
  const sorted = v => v.slice().sort((a, b) => (typeof a === 'number' ? a - b : String(a).localeCompare(String(b))));
  function median(v) {
    const s = sorted(v), n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  // How often each value occurs, in first-seen order: [[value, count], ...].
  function counts(v) {
    const m = new Map();
    for (const x of v) m.set(x, (m.get(x) || 0) + 1);
    return [...m];
  }
  // The modes: every value that occurs most often. No value repeats: no mode ([]).
  function modes(v) {
    const c = counts(v), top = Math.max(...c.map(p => p[1]));
    if (top < 2) return [];
    return sorted(c.filter(p => p[1] === top).map(p => p[0]));
  }
  const range = v => Math.max(...v) - Math.min(...v);
  /* Quartiles (Jon, 2026-11-23): split the ordered list into a lower and an upper half, leaving the median out of
     both when the count is odd; Q1 and Q3 are the halves' medians. (The other method, median in both halves, is
     quartilesWith, for naming that answer as Almost.) */
  function quartiles(v) {
    const s = sorted(v), n = s.length, h = Math.floor(n / 2);
    return { q1: median(s.slice(0, h)), med: median(s), q3: median(s.slice(n - h)) };
  }
  function quartilesWith(v) {
    const s = sorted(v), n = s.length, h = Math.ceil(n / 2);
    return { q1: median(s.slice(0, h)), q3: median(s.slice(n - h)) };
  }
  const iqr = v => { const q = quartiles(v); return q.q3 - q.q1; };
  // Mean absolute deviation: the mean of each value's distance from the mean.
  const mad = v => { const m = mean(v); return mean(v.map(x => Math.abs(x - m))); };
  // Outliers by the 1.5 × IQR rule: below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR.
  function fences(v) { const q = quartiles(v), d = 1.5 * (q.q3 - q.q1); return { lo: q.q1 - d, hi: q.q3 + d }; }
  const outliers = v => { const f = fences(v); return sorted(v).filter(x => x < f.lo - EPS || x > f.hi + EPS); };
  // The five numbers a box plot draws: the whiskers stop at the last value that is not an outlier.
  function fiveNumber(v) { const q = quartiles(v), f = fences(v), inside = sorted(v).filter(x => x >= f.lo - EPS && x <= f.hi + EPS); return { lo: inside[0], q1: q.q1, med: q.med, q3: q.q3, hi: inside[inside.length - 1], out: outliers(v) }; }
  // A frequency table's counts, one per category, in the categories' order.
  const freq = (v, cats) => cats.map(c => v.filter(x => x === c).length);
  // The list a frequency table stands for: each value written out as often as it occurs.
  const expand = (cats, cnts) => cats.flatMap((c, i) => Array(cnts[i]).fill(c));

  // ---------- Numbers as a student writes them ----------
  // Up to two decimal places, without trailing zeros: 62.5, 62.33, 7.
  function fmt(x) {
    if (typeof x !== 'number') return String(x);
    const r = Math.round(x * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−');
  }
  // Does x end within this many decimal places? (62.5 does; 62.333... does not.)
  const terminates = (x, places = 2) => same(Math.round(x * 10 ** places) / 10 ** places, x);
  const round = (x, places) => Math.round(x * 10 ** places + (x >= 0 ? 1e-9 : -1e-9)) / 10 ** places;
  // The first digits of a value that does not end, cut off (never rounded) and marked: 62.166...
  const cut = (x, places = 3) => `${String(Math.trunc(x * 10 ** places + (x >= 0 ? 1e-9 : -1e-9)) / 10 ** places).replace('-', '−')}…`;
  // A mean, written as the answer: exactly when the division ends, else rounded to the nearest tenth. The data here are
  // whole numbers, halves and tenths, so a division that ends does so within six places (68.5 ÷ 8 = 8.5625).
  // An absolute test, not a relative one: a mean here is k / d with d at most 10 × 500, so one that does not end is at
  // least 1 / (d × 10⁶) ≥ 2 × 10⁻¹⁰ away from its 6-place rounding, far above float error (about 10⁻¹³).
  const ends = x => Math.abs(Math.round(x * 1e6) / 1e6 - x) < 1e-11;
  const exact = x => String(Math.round(x * 1e6) / 1e6).replace('-', '−');
  const meanText = x => (ends(x) ? exact(x) : `about ${fmt(round(x, 1))}`);

  /* Read a typed answer: one number (62, 62.5, −3, 62 1/2, 125/2, "about 62.2", "60 inches"), a list
     (3 and 5; 3, 5; 3 or 5), the words "no mode", or a category name. Returns { nums: [...], places }
     or { none: true } or { cat } or { error: true }. */
  const NONE = /^(there(?: is| are|'s|’s) )?(no modes?|none|no)( at all)?$/;
  function read(text, cats = []) {
    const s = String(text || '').trim().toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, ' ').replace(/[.!]$/, '');
    if (!s) return { error: true, empty: true };
    if (NONE.test(s)) return { none: true };
    const named = p => cats.filter(c => typeof c !== 'number').find(c => String(c).toLowerCase() === p || String(c).toLowerCase() + 's' === p);
    if (named(s) !== undefined) return { cat: named(s) };
    const parts = s.split(/\s*(?:,|\band\b|\bor\b|&)\s*/).filter(Boolean), nums = [];
    let places = 0;
    for (const raw of parts) {
      const c = named(raw);
      if (c !== undefined) { nums.push(c); continue; }
      // "about", "≈" and "~" in front, and a unit after (inches, years, °F), are fine.
      const p = raw.replace(/^(about|approximately|around|≈|~)\s*/, '').replace(/\s*(°\s*f|°|%|[a-z]+\.?)$/, '');
      let m;
      if ((m = /^(-?)(\d+) (\d+)\/(\d+)$/.exec(p)) && +m[4]) nums.push((m[1] ? -1 : 1) * (+m[2] + m[3] / m[4]));
      else if ((m = /^(-?\d+)\/(\d+)$/.exec(p)) && +m[2]) nums.push(m[1] / m[2]);
      else if (/^-?(\d+\.?\d*|\.\d+)$/.test(p)) { nums.push(parseFloat(p)); places = Math.max(places, (p.split('.')[1] || '').length); }
      else return { error: true };
    }
    return { nums, places };
  }
  const one = a => (a.nums && a.nums.length === 1 && typeof a.nums[0] === 'number' ? a.nums[0] : null);
  const R = (status, msg) => ({ status, msg });

  // ---------- Checking ----------
  /* ctx (optional) describes where the data came from, for naming slips:
     { table: true, cats, cnts } when the question showed a frequency table instead of a list. */
  const typeOne = R('info', 'Type one number, like 62 or 62.5.');
  function checkMean(text, v, ctx = {}) {
    const a = read(text);
    if (a.error) return a.empty ? R('info', 'Type an answer first.') : typeOne;
    if (a.none) return R('wrong', 'Every list of numbers has a mean. Add the values, then divide by how many there are.');
    const x = one(a);
    if (x === null) return R('info', 'The mean is one number. Type just one.');
    const m = mean(v), n = v.length;
    if (same(x, m)) return R('right', 'Right!');
    // Rounded right to the tenth or finer is right, whatever zeros follow (4.10 is 4.1).
    for (let p = 1; p <= Math.max(1, a.places); p++) {
      if (same(x, round(m, p))) return R('right', ends(m) ? `Right! (Exactly, it is ${exact(m)}.)` : `Right! (It is ${cut(m)}, rounded.)`);
    }
    if (a.places === 0 && !Number.isInteger(m) && same(x, Math.round(m))) return R('almost', 'Almost: that is rounded to a whole number. Give it to the nearest tenth.');
    if (a.places >= 1 && same(x, Math.trunc(m * 10 ** a.places + 1e-9) / 10 ** a.places)) return R('almost', 'Almost: round instead of cutting off the digits. Look at the next digit.');
    if (same(x, sum(v))) return R('wrong', `That is the total. Divide it by how many values there are (${n}).`);
    if (ctx.table) {
      if (same(x, mean(ctx.cnts))) return R('wrong', 'That is the mean of the counts. Each value counts as many times as the table says: multiply each value by its count, add, then divide by the total count.');
      if (ctx.cats.every(c => typeof c === 'number') && same(x, mean(ctx.cats))) return R('wrong', 'That is the mean of the values column, as if each value appeared once. Use the counts: multiply each value by its count first.');
    }
    if (same(x, sum(v) / (n - 1)) || same(x, sum(v) / (n + 1))) return R('wrong', `Count the values again: there are ${n}.`);
    if (same(x, median(v)) && !same(m, median(v))) return R('wrong', 'That is the median (the middle value). The mean shares the total equally: add them all, then divide.');
    return R('wrong', 'Not quite. Add all the values, then divide by how many there are.');
  }

  function checkMedian(text, v, ctx = {}) {
    const a = read(text);
    if (a.error) return a.empty ? R('info', 'Type an answer first.') : typeOne;
    if (a.none) return R('wrong', 'Every list of numbers has a median: the middle value once the list is in order.');
    const x = one(a);
    if (x === null) return R('info', 'The median is one number. Type just one.');
    const md = median(v), n = v.length, s = sorted(v);
    if (same(x, md)) return R('right', 'Right!');
    if (ctx.table) {
      const cs = ctx.cats;
      if (cs.every(c => typeof c === 'number') && same(x, median(cs)) && !same(x, md)) return R('wrong', 'That is the middle of the values column. The counts matter: write the list out (or count down the table) to find the middle of all the values.');
      if (same(x, median(ctx.cnts))) return R('wrong', 'That is the middle count. The median is a value: count down the table to the middle of all the values.');
    } else {
      const raw = n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
      if (same(x, raw)) return R('wrong', 'That is the middle of the list as it is written. Put the values in order first, then find the middle.');
    }
    if (n % 2 === 0 && (same(x, s[n / 2 - 1]) || same(x, s[n / 2]))) return R('almost', `Almost: with ${n} values there are two middle values, ${fmt(s[n / 2 - 1])} and ${fmt(s[n / 2])}. The median is halfway between them.`);
    // The middle's place given instead of its value: named only when that number is not also a value in the data.
    if (same(x, (n + 1) / 2) && !v.some(y => same(y, x))) return R('wrong', n % 2 ? `That is where the median sits (value ${(n + 1) / 2} in the ordered list), not its value. Count to that place and read the value there.` : `That is where the middle is (between values ${n / 2} and ${n / 2 + 1} in the ordered list), not the median itself. The median is halfway between those two values.`);
    if (same(x, mean(v)) && !same(md, mean(v))) return R('wrong', 'That is the mean. The median is the middle value once the list is in order.');
    return R('wrong', 'Not quite. Put the values in order, then find the middle one.');
  }

  function checkMode(text, v, ctx = {}) {
    const cats = ctx.cats || [...new Set(v)];
    const a = read(text, cats);
    if (a.error) return R('info', a.empty ? 'Type an answer first.' : 'Type a value (like 7), two values (like 3 and 5), or no mode.');
    const M = modes(v), c = counts(v), top = Math.max(...c.map(p => p[1]));
    const eq = (x, y) => (typeof x === 'number' && typeof y === 'number' ? same(x, y) : x === y);
    const has = (list, x) => list.some(y => eq(x, y));
    // Each value once: "7, 7" names one mode, not two.
    const given = (a.none ? [] : a.cat !== undefined ? [a.cat] : a.nums).filter((x, i, all) => all.findIndex(y => eq(x, y)) === i);
    if (!M.length) {
      if (a.none) return R('right', 'Right! No value appears more than once, so there is no mode.');
      return R('wrong', 'Look again: does any value appear more than once? If none does, there is no mode.');
    }
    if (a.none) return R('wrong', `Some values appear more than once. The mode is the value that appears most often.`);
    if (given.length === M.length && given.every(x => has(M, x))) return R('right', M.length > 1 ? `Right! ${M.length === 2 ? 'Both' : 'All of them'} appear the same number of times, so there ${M.length === 2 ? 'are two modes' : `are ${M.length} modes`}.` : 'Right!');
    if (given.length && given.every(x => has(M, x))) return R('almost', 'Almost: another value appears just as often. Give every value that ties for most often.');
    // A count given instead of the value: named only when that number is not itself a value in the data (then it can't be a mix-up of the two).
    if (given.length === 1 && typeof given[0] === 'number' && given[0] === top && !has(v, top)) return R('wrong', `That is how many times the mode appears (${top} times). The mode is the value itself.`);
    if (given.length === 1 && typeof given[0] === 'number' && given[0] === top && !has(M, top)) return R('wrong', `${top} appears only ${c.find(p => eq(p[0], top))[1]} ${c.find(p => eq(p[0], top))[1] === 1 ? 'time' : 'times'}. (Is ${top} how many times the mode appears? The mode is the value itself.)`);
    if (ctx.table && given.length === 1 && has(ctx.cnts, given[0]) && !has(M, given[0])) return R('wrong', 'That is a count from the table. The mode is the value with the biggest count.');
    return R('wrong', 'Not quite. Find the value that appears most often.');
  }

  /* A part of a whole, as a student writes it: a fraction (7/20, 7 out of 20), a decimal (0.35) or a percent
     (35%, 35 percent). Right when it equals part/whole; a percent rounded to a whole number is right too. */
  function checkFraction(text, part, whole, name) {
    const s = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!]$/, '');
    if (!s) return R('info', 'Type an answer first.');
    let x = null, pct = false, places = 0, m;
    const placesOf = d => (d.split('.')[1] || '').length;
    if ((m = /^(\d+) ?(?:\/|out of|of) ?(\d+)$/.exec(s)) && +m[2]) x = m[1] / m[2];
    else if ((m = /^(\d+\.?\d*|\.\d+) ?(%|percent)$/.exec(s))) { x = parseFloat(m[1]) / 100; pct = true; places = placesOf(m[1]); }
    else if (/^(\d+\.?\d*|\.\d+)$/.test(s)) { x = parseFloat(s); places = placesOf(s); }
    if (x === null) return R('info', 'Type a fraction (like 7/20), a decimal or a percent.');
    const want = part / whole;
    if (same(x, want)) return R('right', `Right! ${part} of ${whole} is ${fmt(want * 100)}% of the whole.`);
    // Rounded right at the precision typed: 0.33 or 33% for 4 of 12, but not 28.6% for 29.17%. A decimal needs hundredths (a whole
    // percent's precision): 0.1 for 1 of 20 or 0.0 for 1 of 24 would lose the share.
    if (pct ? same(x * 100, round(want * 100, places)) : places >= 2 && same(x, round(want, places))) return R('right', `Right! (It is ${pct ? (ends(want * 100) ? exact(want * 100) : cut(want * 100)) + '%' : ends(want) ? exact(want) : cut(want)}, rounded.)`);
    if (same(x, part) && !pct) return R('wrong', `That is how many were ${name}. As a fraction of the whole, put it over the total: ${part} out of ${whole}.`);
    if (same(x, whole / part)) return R('wrong', 'That fraction is upside down: the part goes on top, the whole underneath.');
    if (same(x, part / 100) && !pct && whole !== 100) return R('wrong', `Out of ${whole}, not out of 100: divide ${part} by ${whole}.`);
    return R('wrong', `Not quite. ${name} is ${part} of the ${whole} values: write it as a fraction of the whole.`);
  }

  // How many of one category (Lab: "How many were Heads?").
  function checkCount(text, v, cat) {
    const a = read(text), x = one(a), want = v.filter(y => y === cat).length;
    if (a.error || x === null) return a.empty ? R('info', 'Type an answer first.') : R('info', 'Type one whole number.');
    if (x === want) return R('right', 'Right!');
    if (x === v.length) return R('wrong', `That is how many values there are in all. Count only ${cat}.`);
    return R('wrong', `Not quite. Count each ${cat} once (a tally or the table helps).`);
  }

  return { sum, mean, median, counts, modes, range, quartiles, quartilesWith, iqr, mad, fences, outliers, fiveNumber, freq, expand, sorted, fmt, round, terminates, ends, exact, cut, meanText, read, checkMean, checkMedian, checkMode, checkCount, checkFraction };
})();
