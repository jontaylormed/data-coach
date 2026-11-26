/* Data Coach: Level 6, Spread (range, quartiles and the IQR, the mean absolute deviation, outliers by the
   1.5 × IQR rule, and box plots), and Level 7, Change Over Time (line graphs and their trends). Quartiles
   leave the median out of both halves when the count is odd (Jon, 2026-11-23); box plots draw outliers as
   dots, with whiskers to the last value that is not one; the tool sets up a line graph's axis. */
const Spread = (() => {
  'use strict';
  const { rng, make, whatOf, kindOf, catsOf } = Data;
  const { fmt, sorted } = Stats;
  const T = Tasks, D = Displays;
  const R = (status, msg) => ({ status, msg });
  const list = v => v.map(fmt).join(', ');
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  // One number, typed: right, a named slip, or "not quite".
  function checkOne(text, want, slips = [], almost = []) {
    const a = Stats.read(text), x = a.nums && a.nums.length === 1 && typeof a.nums[0] === 'number' ? a.nums[0] : null;
    if (a.error || x === null) return a.empty ? R('info', 'Type an answer first.') : R('info', 'Type one number.');
    if (same(x, want)) return R('right', 'Right!');
    if (a.places >= 1 && !Stats.ends(want) && same(x, Stats.round(want, a.places))) return R('right', `Right! (It is ${Stats.cut(want)}, rounded.)`);
    for (const [y, msg] of almost) if (same(x, y)) return R('almost', msg);
    for (const [y, msg] of slips) if (same(x, y)) return R('wrong', msg);
    return null;
  }
  const NUM6 = ['height', 'points', 'scores', 'reunion', 'travel', 'shoes', 'siblings'];
  // How finely a handle or point moves on a scale with this step (about five places per step), and how close to the
  // value counts: within half of that.
  const FINE = { 0.5: 0.1, 1: 0.2, 2: 0.5, 5: 1, 10: 2, 20: 5, 50: 10, 100: 20 };
  const near = (x, y, snap) => Math.abs(x - y) <= snap / 2 + 1e-9;
  // A value read off a graph. A mark between the scale's lines (k > 0) is right within k thirds of a step (k = 2 for a
  // difference of two readings); a mark on a line (k = 0) must be read exactly. Near misses are Close.
  function readCheck(t, want, step, k = 1, slips = []) {
    const s = checkOne(t, want);
    if (s) return s;
    const x = Stats.read(t).nums[0];
    // A close reading is right before any slip is named: on a graph, a value near the answer can't be told apart from it.
    if (Math.abs(x - want) <= (k * step) / 3 + 1e-9) return R('right', `Right! It is exactly ${fmt(want)}; a careful reading between the lines is close enough.`);
    for (const [y, msg] of slips) if (same(x, y)) return R('wrong', msg);
    if (Math.abs(x - want) <= (Math.max(1, k) * step) / 2 + 1e-9) return R('almost', `Close: read against the scale more carefully. It is ${fmt(want)}.`);
    return null;
  }
  const onGrid = (x, lo, step) => Math.abs((x - lo) / step - Math.round((x - lo) / step)) < 1e-9;

  // ---------- Range ----------
  function rangeTask(set) {
    const v = set.values, hi = Math.max(...v), lo = Math.min(...v), want = hi - lo;
    return { prompt: 'Find the range.', ask: 'answer', data: T.dataOf(set), set, want: String(want),
      check: t => checkOne(t, want, [[hi, 'That is the greatest value. The range is the greatest minus the least.'], [lo, 'That is the least value. The range is the greatest minus the least.'], [lo - hi, 'Subtract the other way: greatest minus least, so the range is never negative.'], [hi + lo, 'Subtract, don’t add: the range is the greatest minus the least.']]) || R('wrong', 'Not quite. Find the greatest and the least values, then subtract.'),
      hints: ['The range is the greatest value minus the least value.'], answer: `The range is ${fmt(hi)} − ${fmt(lo)} = ${fmt(want)}.`,
      steps: [{ html: `greatest: ${fmt(hi)}`, why: 'Find the greatest value.' }, { html: `least: ${fmt(lo)}`, why: 'Find the least value.' }, { html: `${fmt(hi)} − ${fmt(lo)} = ${fmt(want)}`, why: 'Subtract: how far the values spread.' }] };
  }

  // ---------- Quartiles and the IQR ----------
  function halvesText(v) {
    const s = sorted(v), n = s.length, h = Math.floor(n / 2);
    return { s, low: s.slice(0, h), high: s.slice(n - h), odd: n % 2 === 1 };
  }
  function iqrTask(set) {
    const v = set.values, q = Stats.quartiles(v), w = Stats.quartilesWith(v), want = q.q3 - q.q1, { s, low, high, odd } = halvesText(v);
    const other = w.q3 - w.q1;
    return { prompt: 'Find the interquartile range (IQR).', ask: 'answer', data: T.dataOf(set), set, want: String(want),
      check: t => checkOne(t, want,
        [[q.q3, 'That is Q3. The IQR is Q3 − Q1: the spread of the middle half.'], [q.q1, 'That is Q1. The IQR is Q3 − Q1: the spread of the middle half.'], [Stats.range(v), 'That is the range. The IQR is the spread of the middle half: Q3 − Q1.'], [q.med, 'That is the median. The IQR is Q3 − Q1.']],
        odd && !same(other, want) ? [[other, 'Almost: here, when the count is odd, the median is left out of both halves before finding Q1 and Q3.']] : []) || R('wrong', 'Not quite. Put the values in order, find the median, then the middle of each half (Q1 and Q3). The IQR is Q3 − Q1.'),
      hints: ['Put the values in order and find the median.', odd ? 'Leave the median out. Q1 is the middle of the lower half; Q3 is the middle of the upper half.' : 'Split the list into a lower and an upper half. Q1 is the middle of the lower half; Q3 is the middle of the upper half.'],
      answer: `Q1 = ${fmt(q.q1)}, Q3 = ${fmt(q.q3)}, so the IQR is ${fmt(want)}.`,
      steps: [{ html: list(s), why: 'Put the values in order.' }, { html: `median = ${fmt(q.med)}`, why: odd ? 'The middle value. It is left out of both halves.' : 'Halfway between the two middle values.' },
        { html: `lower half: ${list(low)}; Q1 = ${fmt(q.q1)}`, why: 'Q1 is the median of the lower half.' }, { html: `upper half: ${list(high)}; Q3 = ${fmt(q.q3)}`, why: 'Q3 is the median of the upper half.' },
        { html: `IQR = ${fmt(q.q3)} − ${fmt(q.q1)} = ${fmt(want)}`, why: 'The spread of the middle half of the data.' }] };
  }

  // ---------- Mean absolute deviation ----------
  function madTask(set) {
    const v = set.values, m = Stats.mean(v), d = v.map(x => Math.abs(x - m)), tot = Stats.sum(d), want = Stats.mad(v);
    return { prompt: 'Find the mean absolute deviation (MAD): the average distance of the values from the mean. Round to the nearest tenth if the division doesn’t end.', ask: 'answer', data: T.dataOf(set), set, want: String(want),
      check: t => checkOne(t, want, [[m, 'That is the mean. The MAD is the average distance from the mean: find each value’s distance from it next.'], [0, 'A distance is never negative. Use how far each value is from the mean, ignoring whether it is above or below.'], [tot, `That is the total distance. Divide it by how many values there are (${v.length}).`], [tot / (v.length - 1), `Divide by how many values there are: ${v.length}.`]])
        || R('wrong', 'Not quite. Find the mean, then each value’s distance from it, then the mean of those distances.'),
      hints: [`First find the mean: ${fmt(Stats.sum(v))} ÷ ${v.length}.`, 'Then find how far each value is from the mean (a distance is never negative), and find the mean of those distances.'],
      answer: `The MAD is ${Stats.meanText(want)}.`,
      steps: [{ html: `mean = ${fmt(Stats.sum(v))} ÷ ${v.length} = ${Stats.meanText(m)}`, why: 'Find the mean.' }, { html: `distances: ${d.map(fmt).join(', ')}`, why: 'How far each value is from the mean.' },
        { html: `${d.map(fmt).join(' + ')} = ${fmt(tot)}`, why: 'Add the distances.' }, { html: `${fmt(tot)} ÷ ${v.length} = ${Stats.meanText(want)}`, why: 'Divide by the count: the average distance.' }] };
  }

  // ---------- Outliers ----------
  function outlierTask(set) {
    const v = set.values, q = Stats.quartiles(v), f = Stats.fences(v), out = Stats.outliers(v), iq = q.q3 - q.q1;
    const ans = out.length ? `${T.andList(out.map(fmt))} ${out.length === 1 ? 'is an outlier' : 'are outliers'}.` : 'There are no outliers.';
    return { prompt: 'Which values are outliers by the 1.5 × IQR rule? Type them (like 3 and 95), or type <strong>none</strong>.', ask: 'answer', data: T.dataOf(set), set, want: out.length ? out.join(' and ') : 'none',
      check: t => {
        if (/^\s*(no outliers?|none|there are none|no)\s*\.?\s*$/i.test(t)) return out.length ? R('wrong', `Some values are outside the fences (below ${fmt(f.lo)} or above ${fmt(f.hi)}).`) : R('right', `Right! Every value is between the fences, ${fmt(f.lo)} and ${fmt(f.hi)}.`);
        const a = Stats.read(t);
        if (a.error || !a.nums || a.nums.some(x => typeof x !== 'number')) return R('info', 'Type the outliers (like 3 and 95), or none.');
        const got = [...new Set(a.nums)], has = (L, x) => L.some(y => same(x, y));
        const bad = got.filter(x => !has(out, x));
        if (bad.length) return R('wrong', has(v, bad[0]) ? `${fmt(bad[0])} is inside the fences (${fmt(f.lo)} to ${fmt(f.hi)}), so it is not an outlier.` : `${fmt(bad[0])} isn’t in the data.`);
        if (!out.length) return R('wrong', 'Check the fences again.');
        if (got.length < out.length) return R('almost', 'Almost: another value is outside the fences too.');
        return R('right', `Right! ${ans}`);
      },
      hints: [`Find Q1 and Q3, then the IQR. The fences are Q1 − 1.5 × IQR and Q3 + 1.5 × IQR.`, `Q1 = ${fmt(q.q1)} and Q3 = ${fmt(q.q3)}, so the IQR is ${fmt(iq)}.`],
      answer: ans,
      steps: [{ html: `Q1 = ${fmt(q.q1)}, Q3 = ${fmt(q.q3)}, IQR = ${fmt(iq)}`, why: 'The quartiles and the IQR.' }, { html: `1.5 × ${fmt(iq)} = ${fmt(1.5 * iq)}`, why: '1.5 times the IQR.' },
        { html: `fences: ${fmt(q.q1)} − ${fmt(1.5 * iq)} = ${fmt(f.lo)} and ${fmt(q.q3)} + ${fmt(1.5 * iq)} = ${fmt(f.hi)}`, why: 'Below the lower fence or above the upper fence is an outlier.' },
        { html: out.length ? `outside: ${list(out)}` : 'nothing outside', why: 'Check each value against the fences.' }] };
  }

  // ---------- Box plots ----------
  const PART = ['lower whisker', 'Q1 (the box’s left edge)', 'median (the line in the box)', 'Q3 (the box’s right edge)', 'upper whisker'];
  // The number line a box plot sits on: a little past the least and greatest values, in a sensible step.
  function axisOf(v) {
    const lo = Math.min(...v), hi = Math.max(...v), span = Math.max(1, hi - lo), step = [1, 2, 5, 10, 20, 50, 100].find(s => span / s <= 10) || 100;
    return { lo: Math.floor(lo / step) * step - (lo % step === 0 ? step : 0), hi: Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0), step };
  }
  // The finest step that every one of the values sits on.
  const gridOf = xs => [10, 5, 2, 1, 0.5, 0.25, 0.1, 0.05].find(s => xs.every(x => onGrid(x, 0, s))) || 0.05;
  function boxTask(set) {
    const v = set.values, five = Stats.fiveNumber(v), want = [five.lo, five.q1, five.med, five.q3, five.hi], w = Stats.quartilesWith(v), axis = axisOf(v);
    // Handles move to every value the five numbers can take, but no finer than about five places per scale step (a drag
    // can't hit 14.65 on a scale of 11 to 20); a handle is right within half a move.
    const snap = Math.max(gridOf(want), FINE[axis.step] || 0.5), at = (x, y) => near(x, y, snap);
    return { prompt: `Draw a box plot of the list: drag each of the five handles (or use the arrow keys) to its value.${five.out.length ? ' The outliers are already drawn as dots: each whisker stops at the last value that isn’t one.' : ''}`,
      ask: 'box', data: T.dataOf(set), set, want, out: five.out, axis, snap,
      check: cur => {
        const off = want.map((x, i) => i).filter(i => !at(cur[i], want[i]));
        if (!off.length) return R('right', `Right! ${fmt(five.lo)}, ${fmt(five.q1)}, ${fmt(five.med)}, ${fmt(five.q3)}, ${fmt(five.hi)}.${want.some(x => !onGrid(x, 0, snap)) ? ` (Each handle is as close as it can go.)` : ''}`);
        if (five.out.length && (off.includes(0) || off.includes(4)) && (at(cur[0], Math.min(...v)) || at(cur[4], Math.max(...v)))) return R('wrong', 'A whisker reaches an outlier. Each whisker stops at the last value that isn’t an outlier.');
        if (off.every(i => i === 1 || i === 3) && at(cur[1], w.q1) && at(cur[3], w.q3)) return R('almost', 'Almost: here, when the count is odd, the median is left out of both halves before finding Q1 and Q3.');
        return R('wrong', `Check the ${T.andList(off.map(i => PART[i]))}.`);
      },
      hints: ['Put the values in order. The box runs from Q1 to Q3, with a line at the median; the whiskers reach the least and greatest values that aren’t outliers.'] };
  }
  function readBoxTask(set, seed) {
    const r = rng(seed), five = Stats.fiveNumber(set.values), data = { chart: { type: 'box', five, axis: axisOf(set.values) }, what: whatOf(set), key: set.key, o: set.o };
    const k = r.pick(['median', 'iqr', 'half']);
    if (k === 'half') return { prompt: 'About what part of the values are inside the box (from Q1 to Q3)?', ask: 'choice', data, set,
      choices: [['About a quarter', false], ['About half', true], ['About three quarters', false], ['All of them', false]].map(([h, right]) => ({ html: h, right, msg: right ? 'Right! The box holds the middle half of the values: a quarter from Q1 to the median, and a quarter from the median to Q3.' : 'Not this one. Q1, the median and Q3 split the values into four quarters. How many quarters are inside the box?' })),
      answer: 'The box holds about half of the values.' };
    const want = k === 'median' ? five.med : five.q3 - five.q1, ax = data.chart.axis;
    // "About" when a mark sits between the scale's lines; a reading of a difference may be off by two readings' worth.
    const about = k === 'median' ? !onGrid(five.med, ax.lo, ax.step) : !onGrid(five.q1, ax.lo, ax.step) || !onGrid(five.q3, ax.lo, ax.step);
    return { prompt: `${about ? 'About what' : 'What'} is the ${k === 'median' ? 'median' : 'IQR'}, read from the box plot?`, ask: 'answer', data, set, want: String(want),
      check: t => readCheck(t, want, ax.step, !about ? 0 : k === 'median' ? 1 : 2, k === 'median' ? [[five.q1, 'That is Q1, the box’s left edge. The median is the line inside the box.'], [five.q3, 'That is Q3, the box’s right edge. The median is the line inside the box.']] : [[five.hi - five.lo, 'That is the length from whisker to whisker. The IQR is just the box: Q3 − Q1.'], [five.q3, 'That is Q3. The IQR is Q3 − Q1: the length of the box.']]) || R('wrong', 'Not quite. Read the box plot’s marks against the number line.'),
      hints: [k === 'median' ? 'The median is the line inside the box.' : 'The IQR is the length of the box: Q3 (its right edge) minus Q1 (its left edge).'], answer: k === 'median' ? `The median is ${fmt(want)}.` : `${fmt(five.q3)} − ${fmt(five.q1)} = ${fmt(want)}.`,
      steps: k === 'median' ? [{ html: `median = ${fmt(want)}`, why: 'Read the line inside the box.' }] : [{ html: `Q1 = ${fmt(five.q1)}, Q3 = ${fmt(five.q3)}`, why: 'Read the box’s two edges.' }, { html: `${fmt(five.q3)} − ${fmt(five.q1)} = ${fmt(want)}`, why: 'The IQR is the box’s length.' }] };
  }

  // ---------- Level 6 ----------
  const pickSet = (keys, nLo, nHi, ok = () => true) => seed => { const r = rng(seed), key = r.pick(keys); return T.makeWhere(key, r, r.int(nLo, nHi), ok); };
  // A whole-number mean keeps the distances easy; the MAD itself may be rounded to the nearest tenth.
  const madOk = v => Number.isInteger(Stats.mean(v)) && new Set(v).size > 2;
  const outOk = r => v => (r() < 0.5) === (Stats.outliers(v).length > 0);
  const L6 = { n: 6, title: 'Spread', themes: [
    { key: 'range', title: 'Range', make: (seed, ex) => rangeTask(ex ? make('height', 3, 9) : pickSet(NUM6, 6, 12)(seed)),
      intro: 'The range is the greatest value minus the least: how far the values spread.' },
    { key: 'iqr', title: 'Quartiles and IQR', make: (seed, ex) => iqrTask(ex ? make('points', 9, 11) : pickSet(NUM6, 7, 12)(seed)),
      intro: 'Q1 and Q3 are the middles of the lower and upper halves. The IQR, Q3 − Q1, is the spread of the middle half.' },
    { key: 'mad', title: 'Mean Absolute Deviation', make: (seed, ex) => madTask(ex ? { key: 'siblings', seed: 0, o: {}, values: [2, 4, 1, 5, 3] } : pickSet(['shoes', 'siblings', 'pets', 'dice', 'points'], 4, 6, madOk)(seed)),
      intro: 'The MAD is the average distance of the values from the mean: a small MAD means the values sit close to the mean.' },
    { key: 'outliers', title: 'Outliers', make: (seed, ex) => outlierTask(ex ? { key: 'travel', seed: 0, o: {}, values: [12, 15, 9, 14, 48, 11, 16, 13, 10] } : (() => { const r = rng(seed); return pickSet(['travel', 'reunion', 'screen', 'points', 'scores'], 9, 14, outOk(r))(seed); })()),
      intro: 'An outlier is far from the rest: below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR (the fences).' },
    { key: 'box', title: 'Box Plot', make: (seed, ex) => boxTask(ex ? make('scores', 1, 11, { test: 'hard' }) : pickSet(['height', 'points', 'scores', 'travel', 'reunion'], 9, 15)(seed)),
      intro: 'A box plot shows five numbers: the least, Q1, the median, Q3 and the greatest (outliers as dots). The box is the middle half.' },
  ], check: seed => { const r = rng(seed), s = () => T.seedOf(r); return [iqrTask(pickSet(NUM6, 7, 12)(s())), madTask(pickSet(['shoes', 'siblings', 'pets', 'dice'], 4, 6, madOk)(s())), outlierTask(pickSet(['travel', 'reunion', 'screen'], 9, 14, outOk(r))(s())), readBoxTask(pickSet(['height', 'points', 'scores'], 11, 15)(s()), s())]; } };
  T.LEVELS.push(L6);

  // ---------- Level 7: Change Over Time ----------
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // What each point is called: Day 1, Week 1 or a month.
  const labelsOf = set => set.values.map((x, i) => (set.key === 'rainfall' ? MONTHS[i % 12] : `${set.key === 'plant' ? 'Wk' : 'Day'} ${i + 1}`));
  const unitWord = set => (set.key === 'rainfall' ? 'month' : set.key === 'plant' ? 'week' : 'day');
  // The value axis, set by the tool: 4 to 10 lines, not starting at 0 (a break mark shows the gap).
  function lineAxis(v) {
    const lo = Math.min(...v), hi = Math.max(...v), span = Math.max(1, hi - lo);
    const step = [0.5, 1, 2, 5, 10, 20].find(s => span / s <= 8) || 20;
    return { lo: Math.max(0, Math.floor(lo / step) * step - step), hi: Math.ceil(hi / step) * step + step, step };
  }
  // Points snap to whole numbers; values in tenths snap to about five places per scale step (a drag can't hit a
  // tenth on a scale of 2s), and a point is right within half a snap.
  const snapOf = (v, axis) => (v.every(Number.isInteger) ? 1 : Math.max(0.1, FINE[axis.step] || 0.5));
  // Long stretches label only some days along the bottom (the chart does the same), so a question names a labeled day.
  const HAND = 14;
  const labeled = (n, i) => n <= 20 || i % Math.ceil(n / 12) === 0;
  function lineTask(set) {
    const v = set.values, axis = lineAxis(v), snap = snapOf(v, axis), labels = labelsOf(set);
    return { prompt: `Draw a line graph: drag each ${unitWord(set)}’s point (or use the arrow keys) to its value. The points join into a line.`, ask: 'line', data: T.dataOf(set), set, labels, axis, snap,
      check: cur => {
        if (cur.some(x => x === null)) return R('info', `Place a point for every ${unitWord(set)}.`);
        const off = v.map((x, i) => i).filter(i => !near(cur[i], v[i], snap));
        return off.length ? R('wrong', `Check the ${off.length === 1 ? 'point' : 'points'} for ${T.andList(off.map(i => labels[i]))}.`) : R('right', `Right! Every point is at its value, joined in order.${v.some(x => !onGrid(x, 0, snap)) ? ` (Each point is as close as it can go: to the nearest ${fmt(snap)}.)` : ''}`);
      },
      hints: [`Go in order: ${labels[0]} first. Find its value in the list, then drag its point to that height on the scale.`] };
  }
  // The overall direction: the slope of the best-fit line, over the whole stretch.
  function trendOf(v) {
    const n = v.length, xm = (n - 1) / 2, ym = Stats.mean(v);
    const b = v.reduce((s, y, i) => s + (i - xm) * (y - ym), 0) / v.reduce((s, y, i) => s + (i - xm) ** 2, 0);
    const change = b * (n - 1), spread = Math.max(1, Stats.range(v));
    return { change, kind: change > 0.35 * spread ? 'up' : change < -0.35 * spread ? 'down' : Math.abs(change) < 0.12 * spread ? 'flat' : null };
  }
  const TREND = { up: 'Mostly went up', down: 'Mostly went down', flat: 'Stayed about the same' };
  const timeData = set => ({ chart: { type: 'line', labels: labelsOf(set), values: set.values, axis: lineAxis(set.values) }, what: whatOf(set), key: set.key, o: set.o });
  function trendTask(set) {
    const t = trendOf(set.values).kind;
    return { prompt: `Over the whole ${set.values.length} ${unitWord(set)}s, what did the values do?`, ask: 'choice', data: timeData(set), set,
      choices: ['up', 'down', 'flat'].map(k => ({ html: TREND[k], right: k === t, msg: k === t ? `Right! Ups and downs from one ${unitWord(set)} to the next don’t change the overall direction: compare the start with the end, and look at the whole line.` : `Not this one. Look past the small ups and downs: where does the line start, and where does it end up?` })),
      hints: ['Cover the wiggles with your hand: does the whole line climb, fall, or stay level?'], answer: TREND[t] + '.' };
  }
  function readLineTask(set, seed, only) {
    const r = rng(seed), v = set.values, L = labelsOf(set), n = v.length, data = timeData(set), ax = data.chart.axis;
    const days = v.map((x, i) => i).filter(i => labeled(n, i)), on = set.key === 'rainfall' ? 'in' : 'on';
    const k = only || r.pick(['value', 'change', 'max']);
    if (k === 'max' && n <= HAND) {
      const m = Math.max(...v), i = v.indexOf(m);
      if (v.filter(x => x === m).length === 1) return { prompt: `Which ${unitWord(set)} had the highest value?`, ask: 'choice', shuffle: true, data, set,
        choices: [...new Set([i, v.indexOf(Math.min(...v)), n - 1, 0])].map(j => ({ html: L[j], right: j === i, msg: j === i ? `Right! The highest point is ${L[i]}: ${fmt(m)}.` : 'Not this one. Find the highest point on the line.' })), answer: `${L[i]}, at ${fmt(m)}.` };
    }
    // Two labeled days with different values (if every value is the same, ask for one value instead).
    const pairs = days.flatMap(a => days.filter(b => b > a && !same(v[a], v[b])).map(b => [a, b]));
    if (k === 'change' && pairs.length) {
      const [a, b] = r.pick(pairs);
      const d = Math.abs(v[b] - v[a]), up = v[b] > v[a], about = !onGrid(v[a], ax.lo, ax.step) || !onGrid(v[b], ax.lo, ax.step);
      return { prompt: `From ${L[a]} to ${L[b]}, ${about ? 'about ' : ''}how much did the value ${up ? 'go up' : 'go down'}?`, ask: 'answer', data, set, want: String(d),
        check: t => readCheck(t, d, ax.step, about ? 2 : 0, [[v[b], `That is the value ${on} ${L[b]}. Subtract the two values.`], [v[a], `That is the value ${on} ${L[a]}. Subtract the two values.`], [v[a] + v[b], 'Subtract, don’t add: the change is the difference.']]) || R('wrong', `Not quite. Read both points, then subtract.`),
        hints: [`Read the points for ${L[a]} and ${L[b]}, then find the difference.`], answer: `${fmt(Math.max(v[a], v[b]))} − ${fmt(Math.min(v[a], v[b]))} = ${fmt(d)}.`,
        steps: [{ html: `${L[a]}: ${fmt(v[a])}`, why: 'Read the first point.' }, { html: `${L[b]}: ${fmt(v[b])}`, why: 'Read the second point.' }, { html: `${fmt(Math.max(v[a], v[b]))} − ${fmt(Math.min(v[a], v[b]))} = ${fmt(d)}`, why: 'The change is the difference.' }] };
    }
    const i = r.pick(days), about = !onGrid(v[i], ax.lo, ax.step);
    return { prompt: `${about ? 'About what' : 'What'} was the value ${on} ${L[i]}?`, ask: 'answer', data, set, want: String(v[i]),
      check: t => readCheck(t, v[i], ax.step, about ? 1 : 0) || R('wrong', `Find ${L[i]} along the bottom, go up to its point, and read across to the scale.`),
      hints: [`Find ${L[i]} along the bottom, go up to its point, then read across.`], answer: `${fmt(v[i])}.`, steps: [{ html: `${L[i]}: ${fmt(v[i])}`, why: 'Up to the point, then across to the scale.' }] };
  }
  const WREASON = { 'Line Graph': 'A line graph shows one amount changing over time, in order.', 'Bar Graph': 'A bar graph shows counts of categories.', 'Dot Plot': 'A dot plot shows how often each value happened, but not when.' };
  const WHICH_TIME = [
    ['A city’s rainfall each month for a year. Which display shows how it changed?', 'Line Graph'],
    ['The high temperature each day for two weeks. A dot plot of the temperatures would lose what?', null],
    ['A plant’s height each week. Which display shows it growing?', 'Line Graph'],
    ['How many students chose each sport. Which display fits?', 'Bar Graph', 'Sports are categories, not one amount over time, so a line between them means nothing.'],
  ];
  function whichTimeQ(item) {
    const [q, right, why] = item;
    if (!right) return { prompt: q, ask: 'choice', shuffle: true, choices: [['The order of the days', true], ['The highest temperature', false], ['How many days there were', false], ['The most common temperature', false]].map(([h, ok]) => ({ html: h, right: ok, msg: ok ? 'Right! A dot plot shows how often each temperature happened, but not which day it was, so the change over time is lost. A line graph keeps the order.' : 'Not this one. A dot plot still shows that. What does it leave out about time?' })), answer: 'The order of the days.' };
    return { prompt: q, ask: 'choice', choices: ['Line Graph', 'Bar Graph', 'Dot Plot'].map(d => ({ html: d, right: d === right, msg: d === right ? `Right! ${why || WREASON[d]}` : `Not this one. ${WREASON[d]} Is that what the question asks for?` })), answer: why || WREASON[right] };
  }
  // Data over time with a clear trend (or clearly none), for trend questions.
  const trendSet = seed => { const r = rng(seed); return T.makeWhere('weather', r, 14, v => trendOf(v).kind !== null); };
  const lineSet = seed => { const r = rng(seed); return make('weather', T.seedOf(r), r.int(7, 10)); };
  const readSet = seed => { const r = rng(seed), key = r.pick(['weather', 'weather', 'plant', 'rainfall']); return make(key, T.seedOf(r), key === 'weather' ? r.int(7, 14) : key === 'plant' ? r.int(6, 10) : 12); };
  const L7 = { n: 7, title: 'Change Over Time', themes: [
    { key: 'line', title: 'Line Graph', make: (seed, ex) => lineTask(ex ? make('weather', 12, 7) : lineSet(seed)),
      intro: 'A line graph shows one amount over time: a point for each day (or week, or month), joined in order.' },
    { key: 'trend', title: 'Read the Trend', make: (seed, ex) => trendTask(ex ? trendSet(2) : trendSet(seed)),
      intro: 'The trend is the overall direction: look past the small ups and downs to where the line goes over the whole time.' },
    { key: 'read', title: 'Read a Line Graph', make: (seed, ex) => readLineTask(ex ? make('plant', 3, 8) : readSet(seed), ex ? 7 : seed),
      intro: 'Read a point by going up from its day to the line, then across to the scale. A change is the difference between two points.' },
    { key: 'which', title: 'Which Display?', make: (seed, ex) => whichTimeQ(ex ? WHICH_TIME[0] : rng(seed).pick(WHICH_TIME)),
      intro: 'Change over time: a line graph keeps the order. Counts of categories: a bar graph.' },
  ], check: seed => { const r = rng(seed), s = () => T.seedOf(r); return [trendTask(trendSet(s())), readLineTask(readSet(s()), s()), readLineTask(readSet(s()), s()), whichTimeQ(r.pick(WHICH_TIME))]; } };
  T.LEVELS.push(L7);

  // ---------- The Lab: box plots and line graphs of the student's own data ----------
  function fitOf(set, type) {
    const k = kindOf(set), no = (short, why) => ({ fit: false, short, why });
    if (type === 'line') return k === 'time' ? { fit: true } : no(k === 'cat' ? 'Categories have no order in time.' : 'These values have no order in time.', k === 'cat' ? 'A line graph shows one amount changing over time. Categories aren’t amounts, and they have no time order: a bar graph fits.' : 'A line graph joins values in time order. These values were collected in no particular order, so the line just zigzags and means nothing: a dot plot, histogram or box plot fits.');
    if (k === 'cat') return no('Categories have no number line.', 'A box plot needs numbers in order, to find the median and quartiles. Categories have no order: a bar graph fits.');
    if (k === 'time') return no('It loses the order over time.', 'A box plot mixes all the days together and drops their order, which is the whole point of this data: a line graph fits.');
    return set.values.length >= 5 ? { fit: true } : no('Too few values for quartiles.', 'With fewer than 5 values there is hardly a middle half to draw.');
  }
  const NAME = { box: 'box plot', line: 'line graph' };
  function misfitTask(set, type) {
    const f = fitOf(set, type), blank = kindOf(set) === 'cat';
    const chart = blank ? null : type === 'line' ? { type: 'line', labels: set.values.map((x, i) => String(i + 1)), values: set.values, axis: lineAxis(set.values) } : { type: 'box', five: Stats.fiveNumber(set.values), axis: axisOf(set.values) };
    return { prompt: blank ? `Someone wants to make a ${NAME[type]} of the ${whatOf(set)}. What’s wrong with that?` : `Here is a ${NAME[type]} of the ${whatOf(set)}. What’s wrong with it?`, ask: 'choice', shuffle: true,
      data: blank ? T.dataOf(set) : { chart, what: whatOf(set), key: set.key, o: set.o }, set,
      choices: [{ html: f.short, right: true, msg: `Right! ${f.why}` }, { html: 'Nothing: it fits this data.', right: false, msg: 'Not this one. Think about what kind of data this is, and what this display needs.' },
        { html: 'It needs a title and labels.', right: false, msg: 'Not this one. Labels help, but the problem is the kind of display for this kind of data.' }, { html: 'It needs a bigger scale.', right: false, msg: 'Not this one. A different scale would not fix it: the problem is the kind of display for this kind of data.' }],
      answer: f.why };
  }
  // More than 14 points is too many to drag by hand (each column would be a sliver on a phone): the tool draws the
  // line graph, and the student reads its trend, or a point or a change when the trend isn't clear.
  function labTask(set, type, seed = 1) {
    if (!fitOf(set, type).fit) return misfitTask(set, type);
    if (type === 'box') return boxTask(set);
    if (set.values.length <= HAND) return lineTask(set);
    const q = trendOf(set.values).kind ? trendTask(set) : readLineTask(set, seed, rng(seed)() < 0.5 ? 'value' : 'change');
    return { ...q, prompt: `${set.values.length} ${unitWord(set)}s are too many points to drag, so here is the line graph. ${q.prompt}` };
  }

  return { HAND, rangeTask, iqrTask, madTask, outlierTask, boxTask, readBoxTask, axisOf, lineTask, trendTask, readLineTask, trendOf, lineAxis, labelsOf, whichTimeQ, WHICH_TIME, fitOf, misfitTask, labTask, checkOne };
})();
