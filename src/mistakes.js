/* Data Coach: Common Mistakes. For each level, the mistakes students make most often. Each one makes a new
   question every time, with that mistake among the choices; a wrong choice names its mistake. Every question has
   exactly one right choice, and no two choices are the same (checked on the tests page). */
const Mistakes = (() => {
  'use strict';
  const { rng, make, whatOf, catsOf } = Data;
  const { fmt, mean, median, sorted } = Stats;
  const T = Tasks;
  const r1 = x => Stats.round(x, 1);
  const named = (name, why) => `<strong>${name}.</strong> ${why}`;
  // A choice question: the right choice, then the wrong ones as [html, message, almost?]. Duplicates are dropped
  // (a wrong choice that equals the right one would be a right answer marked wrong).
  function q(prompt, data, right, why, wrongs, set) {
    const seen = new Set([right]), choices = [{ html: right, right: true, msg: `Right! ${why}` }];
    for (const [html, msg, almost] of wrongs) if (!seen.has(html)) { seen.add(html); choices.push({ html, right: false, msg, almost: !!almost }); }
    return { prompt, ask: 'choice', shuffle: true, data, set, choices, answer: why };
  }
  const tableText = (cats, cnts) => cats.map((c, i) => `${fmt(c)}: ${cnts[i]}`).join(' · ');

  // ---------- Level 1: Kinds of Data ----------
  function namesAsNumbers(seed) {
    const [what, sample] = rng(seed).pick(T.KINDS.filter(k => k[3]));
    return q(`${what}: ${sample} What kind of data is this?`, null, 'Categories', 'These numbers are names (labels), not amounts. Adding or averaging them means nothing, so they are categories.',
      [['Numbers', named('Numbers used as names', 'A number on a jersey or an envelope is a label. You can’t add or average labels: the mean jersey number tells you nothing.')],
        ['Numbers over time', named('Numbers used as names', 'These were not measured over time, and they are not amounts at all: they are labels.')]]);
  }
  function oneAnswer(seed) {
    const r = rng(seed), no = T.STAT_Q.filter(s => !s[1]), yes = T.STAT_Q.filter(s => s[1]), [qn] = r.pick(no), [qy] = r.pick(yes);
    return q(`Which one is a statistical question?`, null, qy, 'Its answers vary from person to person (or day to day), so it takes data to answer it.',
      [[qn, named('A question with one answer', 'It has a single answer, so nothing varies and there is no data to collect. A statistical question expects answers that vary.')]]);
  }
  // ---------- Level 2: Organize It ----------
  function zeroRow(seed) {
    const r = rng(seed), set = T.makeWhere('dice', r, r.int(8, 10), v => [1, 2, 3, 4, 5, 6].filter(f => !v.includes(f)).length === 1, { dice: '1' });
    const cats = catsOf(set), cnts = Stats.freq(set.values, cats), z = cats[cnts.indexOf(0)], keep = cats.map((c, i) => i).filter(i => cnts[i] > 0);
    const j = keep.find(i => cnts[i] > 1), off = cnts.slice(); off[j]--; off[keep.find(i => i !== j)]++;
    return q('Which frequency table matches the rolls?', T.dataOf(set), tableText(cats, cnts), `Every face from 1 to 6 gets a row, even ${z}, which was rolled 0 times. The counts add up to ${set.values.length}.`,
      [[tableText(keep.map(i => cats[i]), keep.map(i => cnts[i])), named('Leaving out a count of 0', `This table skips ${z}. It was rolled 0 times, but it could have come up, so it still gets a row with a count of 0.`)],
        [tableText(cats, off), named('A miscount', `The counts for ${cats[j]} and ${cats[keep.find(i => i !== j)]} are off by one. Tally one roll at a time, in order.`)]], set);
  }
  function twice(seed) {
    const r = rng(seed), set = T.makeWhere('coins', r, r.int(10, 14), v => v.includes('Heads') && v.includes('Tails')), cats = catsOf(set), cnts = Stats.freq(set.values, cats), n = set.values.length;
    const up = cnts.slice(); up[0]++;
    return q('Which frequency table matches the flips?', T.dataOf(set), `${tableText(cats, cnts)} · Total: ${n}`, `The counts add up to ${n}, the number of flips.`,
      [[`${tableText(cats, up)} · Total: ${n + 1}`, named('Counting one value twice', `Its counts add up to ${n + 1}, but there are only ${n} flips. Check that the total matches how many values there are.`)],
        [`${tableText(cats, cnts)} · Total: ${cats.length}`, named('The wrong total', `The total is how many values there are (${n}), not how many rows.`)]], set);
  }
  // ---------- Level 3: Center ----------
  function unsortedFrom(set) {
    const v = set.values, n = v.length, md = median(v);
    return q('Find the median.', T.dataOf(set), fmt(md), `In order, ${sorted(v).map(fmt).join(', ')}: the middle value is ${fmt(md)}.`,
      [[fmt(v[(n - 1) / 2]), named('Not putting the values in order', `${fmt(v[(n - 1) / 2])} is the middle of the list as it was collected. Put the values in order first.`)],
        [fmt(r1(mean(v))), named('The mean instead of the median', 'That is the mean. The median is the middle value, once the values are in order.')]], set);
  }
  function totalAsMean(seed) {
    const r = rng(seed), set = T.makeWhere(r.pick(['dice', 'siblings', 'pets']), r, r.int(5, 7), v => Number.isInteger(mean(v)) && new Set(v).size > 2), v = set.values, s = Stats.sum(v), m = mean(v);
    return q('Find the mean.', T.dataOf(set), fmt(m), `Add the values (${fmt(s)}), then divide by how many there are: ${fmt(s)} ÷ ${v.length} = ${fmt(m)}.`,
      [[fmt(s), named('The total as the mean', `${fmt(s)} is the total. Share it equally: divide by the number of values, ${v.length}.`)],
        [fmt(r1(s / (v.length + 1))), named('Dividing by the wrong count', `There are ${v.length} values. Count them again before dividing.`)]], set);
  }
  function countAsMode(seed) {
    const r = rng(seed), set = T.makeWhere(r.pick(['siblings', 'pets', 'shoes']), r, r.int(14, 20), v => Stats.modes(v).length === 1 && !Stats.counts(v).some(p => p[0] === Math.max(...Stats.counts(v).map(c => c[1])))), cats = catsOf(set), cnts = Stats.freq(set.values, cats);
    const [md] = Stats.modes(set.values), top = Math.max(...cnts);
    return q('Find the mode.', T.tableOf(set, cats), fmt(md), `${fmt(md)} has the biggest count, ${top}, so it is the most common value.`,
      [[fmt(top), named('The count as the mode', `${top} is how many times the mode happened. The mode is the value itself: ${fmt(md)}.`)],
        [fmt(cats[cnts.indexOf(Math.min(...cnts.filter(c => c > 0)))]), named('The least common value', 'The mode is the value with the biggest count.')]], set);
  }
  // ---------- Level 4: Showing Categories ----------
  function linesFrom(set, r) {
    const cats = catsOf(set), cnts = Stats.freq(set.values, cats), ch = Object.assign(Displays.chartOf(set, 'bar', 2), {});
    const i = cats.map((c, j) => j).filter(j => cnts[j] >= 4 && cnts[j] % 2 === 0)[0];
    if (i === undefined) return null;
    const c = cats[i], k = cnts[i];
    return q(`How many are <strong>${fmt(c)}</strong>? (The scale counts by 2s.)`, { chart: ch, what: whatOf(set), key: set.key, o: set.o }, String(k), `The ${fmt(c)} bar reaches the line labeled ${k}.`,
      [[String(k / 2), named('Counting lines, not reading the scale', `The bar’s top is ${k / 2} lines up, but each line is worth 2. Read the number on the scale: ${k}.`)],
        [String(k + 1), named('Reading past the bar', 'Read straight across from the top of the bar to the scale.')]], set);
  }
  function linesQ(seed) {
    const r = rng(seed);
    for (let t = 0; t < 50; t++) { const key = r.pick(['eyes', 'subject', 'marbles']); const s = make(key, T.seedOf(r), r.int(20, 30)); const x = linesFrom(s, r); if (x) return x; }
    throw new Error('no bar to read');
  }
  function partToPart(seed) {
    const r = rng(seed), set = make(r.pick(['eyes', 'subject', 'marbles']), T.seedOf(r), r.int(12, 20)), cats = catsOf(set), cnts = Stats.freq(set.values, cats), n = set.values.length;
    const i = cnts.findIndex(c => c > 0 && c < n), c = cats[i], k = cnts[i];
    return q(`What fraction of the whole is <strong>${fmt(c)}</strong>?`, T.tableOf(set, cats), `${k}/${n}`, `${k} of the ${n} values are ${fmt(c)}: ${k}/${n} of the whole (its share of a pie chart).`,
      [[`${k}/${n - k}`, named('Part to part, not part to whole', `${k}/${n - k} compares ${fmt(c)} with the rest. The whole is all ${n} values, so the fraction is out of ${n}.`)],
        [`${n - k}/${n}`, named('The rest, not the part', `${n - k}/${n} is everything that is not ${fmt(c)}.`)]], set);
  }
  // ---------- Level 5: Showing Numbers ----------
  function edgeValue(seed) {
    const r = rng(seed), w = r.pick([5, 10]), a = r.int(5, 9) * w, x = a + w, bins = [0, 1, 2].map(j => [a - w + j * w, a - w + j * w + w - 1]);
    const label = b => `${b[0]}–${b[1]}`;
    return q(`A histogram has bins ${bins.map(label).join(', ')}. Which bin does the value ${x} go in?`, null, label(bins[2]), `${x} is the first value of ${label(bins[2])}. The bin before it ends at ${x - 1}.`,
      [[label(bins[1]), named('An edge value in the wrong bin', `${label(bins[1])} ends at ${x - 1}, so ${x} is not in it. A value on an edge starts the next bin.`)],
        ['Both of them', named('Counting a value twice', 'Each value goes in exactly one bin; the bins don’t overlap.')]]);
  }
  function oneLeaf(seed) {
    const r = rng(seed), s = r.int(5, 9), l = sorted([r.int(0, 4), r.int(0, 4), r.int(5, 9), r.int(5, 9)]).filter((x, i, A) => A.indexOf(x) === i);
    const rep = l[0], leaves = sorted([rep, ...l]), vals = leaves.map(x => s * 10 + x);
    return q(`Which is the stem-and-leaf row for ${r.shuffle(vals).map(fmt).join(', ')}?`, null, `${s} | ${leaves.join(' ')}`, `Every value gets its own leaf, so ${s * 10 + rep}, which appears twice, gets two ${rep}s. The leaves are in order.`,
      [[`${s} | ${l.join(' ')}`, named('One leaf for a repeated value', `${s * 10 + rep} appears twice, so it needs two leaves. Otherwise the plot loses a value.`)],
        [`${s} | ${leaves.slice().reverse().join(' ')}`, named('Leaves out of order', 'The leaves are right, but put them in order from least to greatest.'), true]]);
  }
  // ---------- Level 6: Spread ----------
  function rangeAsIqr(seed) {
    const r = rng(seed), set = T.makeWhere(r.pick(['height', 'points', 'scores', 'travel']), r, r.int(8, 12), v => { const q4 = Stats.quartiles(v); return Stats.range(v) !== q4.q3 - q4.q1; }), v = set.values, qq = Stats.quartiles(v), iqr = qq.q3 - qq.q1;
    return q('Find the IQR.', T.dataOf(set), fmt(iqr), `Q1 = ${fmt(qq.q1)} and Q3 = ${fmt(qq.q3)}, so the IQR is ${fmt(qq.q3)} − ${fmt(qq.q1)} = ${fmt(iqr)}: the spread of the middle half.`,
      [[fmt(Stats.range(v)), named('The range instead of the IQR', `${fmt(Stats.range(v))} is the greatest minus the least: the range. The IQR uses only the middle half, Q3 − Q1.`)],
        [fmt(qq.q3), named('Q3 instead of the IQR', `${fmt(qq.q3)} is Q3. Subtract Q1 from it.`)]], set);
  }
  function medianIn(seed) {
    const r = rng(seed), set = T.makeWhere(r.pick(['height', 'points', 'scores']), r, r.pick([7, 9, 11]), v => { const a = Stats.quartiles(v), b = Stats.quartilesWith(v); return a.q3 - a.q1 !== b.q3 - b.q1 && Stats.range(v) !== a.q3 - a.q1; }), v = set.values, a = Stats.quartiles(v), b = Stats.quartilesWith(v);
    return q('Find the IQR. (The count is odd.)', T.dataOf(set), fmt(a.q3 - a.q1), `The median, ${fmt(a.med)}, is left out of both halves. Then Q1 = ${fmt(a.q1)} and Q3 = ${fmt(a.q3)}, so the IQR is ${fmt(a.q3 - a.q1)}.`,
      [[fmt(b.q3 - b.q1), named('Keeping the median in the halves', `That counts the median in both halves. Here, when the count is odd, leave the median out before finding Q1 and Q3.`), true],
        [fmt(Stats.range(v)), named('The range instead of the IQR', 'That is the greatest minus the least. The IQR is Q3 − Q1.')]], set);
  }
  // ---------- Level 7: Change Over Time ----------
  const lineData = set => ({ chart: { type: 'line', labels: Spread.labelsOf(set), values: set.values, axis: Spread.lineAxis(set.values) }, what: whatOf(set), key: set.key, o: set.o });
  function lastDay(seed) {
    const r = rng(seed), set = T.makeWhere('weather', r, 14, v => { const k = Spread.trendOf(v).kind; const d = v[13] - v[12]; return (k === 'up' && d < 0) || (k === 'down' && d > 0); }), k = Spread.trendOf(set.values).kind;
    const W = { up: 'Mostly went up', down: 'Mostly went down' }, other = k === 'up' ? 'down' : 'up';
    return q('Over the whole 14 days, what did the temperature do?', lineData(set), W[k], `Day to day it wiggles, and it even ${other === 'down' ? 'dropped' : 'rose'} on the last day, but over the whole two weeks it ${k === 'up' ? 'climbed' : 'fell'}.`,
      [[W[other], named('Reading the last day, not the trend', `The last day went ${other}, but the trend is the overall direction. Compare the start with the end, and look at the whole line.`)],
        ['Stayed about the same', named('Missing the trend', 'Look past the wiggles: does the whole line climb or fall?')]], set);
  }
  function valueNotChange(seed) {
    const r = rng(seed), set = T.makeWhere('weather', r, r.int(7, 10), v => v[v.length - 1] !== v[0]), v = set.values, L = Spread.labelsOf(set), a = 0, b = v.length - 1, d = Math.abs(v[b] - v[a]);
    return q(`From ${L[a]} to ${L[b]}, how much did the temperature ${v[b] > v[a] ? 'go up' : 'go down'}?`, lineData(set), `${fmt(d)} degrees`, `${L[a]} was ${fmt(v[a])}°F and ${L[b]} was ${fmt(v[b])}°F: the change is the difference, ${fmt(d)} degrees.`,
      [[`${fmt(v[b])} degrees`, named('The value, not the change', `${fmt(v[b])}°F is the temperature on ${L[b]}. The change is the difference between the two days.`)],
        [`${fmt(v[a] + v[b])} degrees`, named('Adding, not subtracting', 'The change is the difference: subtract.')]], set);
  }
  // ---------- Level 8: Shape and the Normal Curve ----------
  function tailPull(seed) {
    const set = Shape.shapeSet(seed, rng(seed)() < 0.5 ? 'right' : 'left', true), k = Shape.shapeOf(set.values), big = k === 'right' ? 'The mean' : 'The median';
    return q('For this data, which is greater: the mean or the median?', { chart: Displays.chartFor(set, 'hist'), what: `${whatOf(set)} (200 values)`, key: set.key, o: set.o }, big,
      `It is skewed ${k}: the long tail of ${k === 'right' ? 'large' : 'small'} values pulls the mean ${k === 'right' ? 'up' : 'down'}, but the median, the middle value, hardly moves.`,
      [[k === 'right' ? 'The median' : 'The mean', named('Forgetting that the tail pulls the mean', `In a set skewed ${k}, the mean is pulled toward the long tail, ${k === 'right' ? 'above' : 'below'} the median.`)],
        ['They are about the same', named('Treating skewed data as symmetric', 'That is true only when there is no long tail.')]], set);
  }
  function sampleN(seed) {
    const r = rng(seed), set = T.makeWhere(r.pick(['shoes', 'siblings', 'pets', 'dice']), r, r.int(4, 6), v => Number.isInteger(mean(v)) && new Set(v).size > 2), v = set.values;
    const s = r1(Stats.sd(v, true)), sg = r1(Stats.sd(v)), vr = r1(Stats.variance(v, true));
    return q('These values are a <strong>sample</strong> from a bigger group. Which is the sample standard deviation, <em>s</em>, to the nearest tenth?', T.dataOf(set), fmt(s), `For a sample, divide the total of the squared distances by n − 1 = ${v.length - 1}, then take the square root: s ≈ ${fmt(s)}.`,
      [[fmt(sg), named('Dividing by n for a sample', `That divides by n = ${v.length}: that is σ, for a whole population. A sample divides by n − 1.`)],
        [fmt(vr), named('Forgetting the square root', 'That is the variance. The standard deviation is its square root.')]], set);
  }
  function bothTails(seed) {
    const m = rng(seed).pick(Shape.MODELS), at = k => fmt(+(m.mu + k * m.sd).toFixed(6));
    return q(`The ${m.what} follow a normal curve with a mean of ${fmt(m.mu)} and a standard deviation of ${fmt(m.sd)}. About what percent are above ${at(1)}?`, null, '16%', `${at(1)} is 1 SD above the mean. 68% are within 1 SD, so 32% are outside, split evenly between the two tails: 16% above.`,
      [['32%', named('Both tails, not one', `32% are outside 1 SD on both sides together. Above ${at(1)} is just one tail: half of it.`)],
        ['84%', named('The wrong side', `84% are below ${at(1)}. The part above it is the small tail.`)],
        ['68%', named('Inside, not above', '68% are within 1 SD of the mean, on both sides.')]]);
  }

  const GROUPS = [
    { n: 1, title: 'Kinds of Data', list: [{ name: 'Numbers Used as Names', make: namesAsNumbers }, { name: 'A Question With One Answer', make: oneAnswer }] },
    { n: 2, title: 'Organize It', list: [{ name: 'Leaving Out a Count of 0', make: zeroRow }, { name: 'Counting a Value Twice', make: twice }] },
    { n: 3, title: 'Center', list: [{ name: 'The Median Without Sorting', make: s => unsortedFrom(T.makeWhere(rng(s).pick(['height', 'points', 'scores']), rng(s + 1), 7 + 2 * (s % 2), v => v[(v.length - 1) / 2] !== median(v) && new Set(v).size === v.length && r1(mean(v)) !== median(v) && r1(mean(v)) !== v[(v.length - 1) / 2])) },
      { name: 'The Total as the Mean', make: totalAsMean }, { name: 'The Count as the Mode', make: countAsMode }] },
    { n: 4, title: 'Showing Categories', list: [{ name: 'Counting Lines, Not the Scale', make: linesQ }, { name: 'Part to Part, Not Part to Whole', make: partToPart }] },
    { n: 5, title: 'Showing Numbers', list: [{ name: 'An Edge Value in the Wrong Bin', make: edgeValue }, { name: 'One Leaf for a Repeated Value', make: oneLeaf }] },
    { n: 6, title: 'Spread', list: [{ name: 'The Range Instead of the IQR', make: rangeAsIqr }, { name: 'Keeping the Median in the Halves', make: medianIn }] },
    { n: 7, title: 'Change Over Time', list: [{ name: 'Reading the Last Day, Not the Trend', make: lastDay }, { name: 'The Value, Not the Change', make: valueNotChange }] },
    { n: 8, title: 'Shape and the Normal Curve', list: [{ name: 'Forgetting That the Tail Pulls the Mean', make: tailPull }, { name: 'Dividing by n for a Sample', make: sampleN }, { name: 'Both Tails, Not One', make: bothTails }] },
  ];
  return { GROUPS };
})();
