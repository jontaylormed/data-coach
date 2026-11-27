/* Data Coach: Level 8, Shape and the Normal Curve. The shape of a big data set (symmetric, skewed right or
   skewed left) and where the mean and median sit; the standard deviation, both kinds, with each question naming
   which (the population's σ divides by n, a sample's s by n − 1); a histogram of 200 values drawn from a
   frequency table; a normal curve fitted over a histogram by dragging its center and spread; and the
   68–95–99.7 rule. */
const Shape = (() => {
  'use strict';
  const { rng, whatOf, kindOf } = Data;
  const { fmt, mean, median, sd } = Stats;
  const T = Tasks, D = Displays;
  const R = (status, msg) => ({ status, msg });
  const same = (a, b) => Math.abs(a - b) < 1e-9;
  const r1 = x => Stats.round(x, 1);
  // One typed number, or null.
  const one = a => (!a.error && a.nums && a.nums.length === 1 && typeof a.nums[0] === 'number' ? a.nums[0] : null);
  // A typed number matches y exactly, or y rounded to the places typed (2.4 or 2.45 for 2.449…).
  const matches = (a, x, y) => same(x, y) || (a.places >= 1 && same(x, Stats.round(y, a.places)));

  // ---------- Shape ----------
  // The shape, from the skewness: a clear tail one way, clearly none, or (null) not clear enough to ask about.
  const shapeOf = v => { const g = Stats.skewness(v); return g > 0.6 ? 'right' : g < -0.6 ? 'left' : Math.abs(g) < 0.2 ? 'sym' : null; };
  const SHAPE = { sym: 'Symmetric', right: 'Skewed right', left: 'Skewed left' };
  const POOL = {
    sym: [['height', { grade: '9' }], ['height', { grade: '12' }], ['points', {}], ['run', {}], ['scores', { test: 'hard' }]],
    right: [['screen', {}], ['travel', {}], ['reaction', {}]],
    left: [['scores', { test: 'easy' }]],
  };
  // 200 values of a given shape. For questions about the mean and median (strict), they are also clearly apart
  // (skewed) or clearly together (symmetric). Counts of free throws are left out: their few bins look lopsided.
  function shapeSet(seed, want, strict) {
    const r = rng(seed), k = want || r.pick(['sym', 'right', 'left']), [key, o] = r.pick(POOL[k]);
    return T.makeWhere(key, r, 200, v => { const g = (mean(v) - median(v)) / sd(v); return shapeOf(v) === k && (!strict || (k === 'sym' ? Math.abs(g) < 0.05 : k === 'right' ? g > 0.1 : g < -0.1)); }, o);
  }
  const histData = set => ({ chart: D.chartFor(set, 'hist'), what: `${whatOf(set)} (${set.values.length} values)`, key: set.key, o: set.o });
  const WHY = {
    sym: 'The two sides are about mirror images, with the peak in the middle and no long tail.',
    right: 'Most values bunch up at the low end, and a long tail stretches out to the right. The tail names the skew.',
    left: 'Most values bunch up at the high end, and a long tail stretches out to the left. The tail names the skew.',
  };
  function shapeTask(set) {
    const k = shapeOf(set.values);
    return { prompt: 'What is the shape of this histogram?', ask: 'choice', data: histData(set), set,
      choices: ['sym', 'right', 'left'].map(j => ({ html: SHAPE[j], right: j === k, msg: j === k ? `Right! ${WHY[k]}` : 'Not this one. Find the peak, then look for a long, thin tail of bars. The side the tail stretches toward names the skew; no tail on either side is symmetric.' })),
      hints: ['Where is the peak? Is there a long, thin tail of short bars on one side?'], answer: `${SHAPE[k]}. ${WHY[k]}` };
  }
  // The mean is pulled toward the tail; the median (the middle value) hardly moves.
  const PULL = {
    sym: 'With no tail, the balance point and the middle value are in about the same place.',
    right: 'The few large values in the long tail pull the mean up toward them. The median is just the middle value, so it hardly moves: the mean is greater.',
    left: 'The few small values in the long tail pull the mean down toward them. The median is just the middle value, so it hardly moves: the median is greater.',
  };
  function centerTask(set, seed) {
    const k = shapeOf(set.values), v = set.values;
    if (rng(seed)() < 0.5) {
      const right = { sym: 'They are about the same', right: 'The mean', left: 'The median' }[k];
      return { prompt: 'For this data, which is greater: the mean or the median?', ask: 'choice', data: histData(set), set,
        choices: ['The mean', 'The median', 'They are about the same'].map(h => ({ html: h, right: h === right, msg: h === right ? `Right! ${PULL[k]}` : 'Not this one. Look at the shape first. A long tail pulls the mean toward it; the median is just the middle value.' })),
        hints: ['What is the shape? Which way would a long tail pull the mean?'], answer: PULL[k] };
    }
    const m = r1(mean(v)), md = r1(median(v));
    return { prompt: `For the ${whatOf(set)} (${v.length} values), the mean is ${fmt(m)} and the median is ${fmt(md)}. What shape is the histogram most likely to have?`, ask: 'choice', set,
      choices: ['sym', 'right', 'left'].map(j => ({ html: SHAPE[j], right: j === k, msg: j === k ? `Right! ${k === 'sym' ? 'The mean and the median are about the same, so nothing pulls the mean away: about symmetric.' : `The mean is ${k === 'right' ? 'greater' : 'less'} than the median, so a long tail of ${k === 'right' ? 'large' : 'small'} values is pulling it ${k === 'right' ? 'up' : 'down'}: skewed ${k}.`}` : 'Not this one. A long tail pulls the mean toward it, away from the median. Which way has the mean moved?' })),
      hints: ['Is the mean bigger than the median, smaller, or about the same? A tail pulls the mean toward it.'], answer: `${SHAPE[k]}. ${PULL[k]}` };
  }

  // ---------- Standard deviation ----------
  function sdTask(set, sample) {
    const v = set.values, n = v.length, m = mean(v), d = v.map(x => x - m), sq = d.map(x => x * x), ss = Stats.sum(sq);
    const div = sample ? n - 1 : n, want = Math.sqrt(ss / div), other = Math.sqrt(ss / (sample ? n : n - 1)), name = sample ? 's' : 'σ';
    const eq = same(want, r1(want)) ? '=' : '≈';   // σ = 2 when the root comes out even
    const slips = [
      [ss / div, `That is the variance, ${fmt(ss)} ÷ ${div}. The standard deviation is its square root.`],
      [other, sample ? `That divides by n = ${n}: that is σ, for a whole population. These values are a sample, so divide by n − 1 = ${n - 1}.` : `That divides by n − 1 = ${n - 1}: that is s, for a sample. These are all the values, so divide by n = ${n}.`],
      [ss / (sample ? n : n - 1), `That is a variance, and it divides by ${sample ? 'n' : 'n − 1'}. Divide by ${div}, then take the square root.`],
      [Stats.mad(v), 'That is the MAD (the mean of the plain distances). The standard deviation squares each distance first, then takes a square root at the end.'],
      [ss, `That is the total of the squared distances. Divide it by ${div}, then take the square root.`],
      [Math.sqrt(ss), `Divide by ${div} before taking the square root.`],
      [m, 'That is the mean. The standard deviation measures how far the values spread from it.'],
    ];
    return { prompt: `${sample ? 'These values are a <strong>sample</strong> from a bigger group. Find the sample standard deviation, <em>s</em> (divide by n − 1).' : 'These are <strong>all</strong> the values (the whole population). Find the population standard deviation, σ (divide by n).'} Round to the nearest tenth.`,
      ask: 'answer', data: T.dataOf(set), set, want: same(want, r1(want)) ? fmt(want) : r1(want).toFixed(1),
      check: t => {
        const a = Stats.read(t), x = one(a);
        if (x === null) return a.empty ? R('info', 'Type an answer first.') : R('info', 'Type one number.');
        if (matches(a, x, want)) return R('right', `Right! ${name} = √(${fmt(ss)} ÷ ${div}) ${eq} ${fmt(r1(want))}.`);
        for (const [y, msg] of slips) if (matches(a, x, y)) return R('wrong', msg);
        return R('wrong', 'Not quite. Find the mean, each value’s distance from it, square each distance, add the squares, divide, then take the square root.');
      },
      hints: [`First find the mean: ${fmt(Stats.sum(v))} ÷ ${n}.`, `Square each value’s distance from the mean, add the squares, divide by ${div}${sample ? ' (n − 1)' : ' (n)'}, then take the square root.`],
      answer: `${name} = √(${fmt(ss)} ÷ ${div}) ${eq} ${fmt(r1(want))}.`,
      steps: [{ html: `mean = ${fmt(Stats.sum(v))} ÷ ${n} = ${fmt(m)}`, why: 'Find the mean.' }, { html: `distances: ${d.map(fmt).join(', ')}`, why: 'Each value minus the mean (some are negative).' },
        { html: `squared: ${sq.map(fmt).join(', ')}`, why: 'Square each distance, so every one is positive.' }, { html: `${sq.map(fmt).join(' + ')} = ${fmt(ss)}`, why: 'Add the squares.' },
        { html: `${fmt(ss)} ÷ ${div} = ${Stats.meanText(ss / div)}`, why: sample ? `Divide by n − 1 = ${div}, for a sample (the variance).` : `Divide by n = ${div}, for a population (the variance).` },
        { html: `${name} = √${Stats.meanText(ss / div).replace('about ', '')} ${eq} ${fmt(r1(want))}`, why: 'Take the square root: back to the data’s own units.' }] };
  }
  // Whole-number means keep the distances easy.
  const sdOk = v => Number.isInteger(mean(v)) && new Set(v).size > 2;
  const sdSet = seed => { const r = rng(seed); return T.makeWhere(r.pick(['shoes', 'siblings', 'pets', 'dice', 'freethrows']), r, r.int(4, 6), sdOk); };

  // ---------- A histogram of 200 values, from its frequency table ----------
  function tableHistTask(set) {
    const v = set.values, w = D.goodWidth(v), { bins, counts } = D.binsOf(v, w), cats = bins.map(b => b.label), max = Math.max(...counts);
    return { prompt: `The ${v.length} values are grouped into bins ${fmt(w)} wide. Draw the histogram: choose the scale, then drag each bar (or use the arrow keys) up to its count.`,
      ask: 'bar', hist: true, data: { table: { cats, cnts: counts, head: 'Range' }, what: `${whatOf(set)} (${v.length} values)`, key: set.key, o: set.o }, set, cats, counts, max,
      steps: D.stepsFor(max), good: D.goodStep(max), scale: s => D.scaleVerdict(s, max), top: s => D.topFor(s, max), check: (h, s) => D.checkBar(h, s, cats, counts),
      hints: ['Choose a step that makes about 4 to 10 lines up to the biggest count.', 'The bars touch: each one is a range of numbers. Read each count from the table.'] };
  }

  // ---------- Fit a normal curve ----------
  // The curve's handles move in small, tidy steps: about 1/60 of the axis, never finer than the data's own step.
  const NICE = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 20];
  function curveChart(set) {
    // A width the histogram rule likes; data with too few different values (a misfit) still gets some bins.
    const v = set.values, w = D.goodWidth(v) || D.widthsFor(v)[0] || Math.max(1, D.grainOf(v)), { bins, counts } = D.binsOf(v, w), lo = bins[0].a, hi = bins[bins.length - 1].a + w;
    return { type: 'curve', bins: bins.map(b => b.a), labels: bins.map(b => b.label), counts, w, n: v.length, lo, hi };
  }
  function curveTask(set) {
    const v = set.values, ch = curveChart(set), mu = mean(v), sig = sd(v), snap = NICE.find(s => s >= (ch.hi - ch.lo) / 60) || 20;
    const start = { mu: +(Math.round((ch.lo + (ch.hi - ch.lo) * 0.22) / snap) * snap).toFixed(6), sd: Math.max(snap, +(Math.round(((ch.hi - ch.lo) * 0.28) / snap) * snap).toFixed(6)) };   // off to the left and too wide
    return { prompt: 'Fit a normal curve to the histogram: drag the <strong>center</strong> handle to where the curve should peak, and the <strong>spread</strong> handle to one standard deviation from the center (or use the arrow keys).',
      ask: 'curve', data: { what: `${whatOf(set)} (${v.length} values)`, key: set.key, o: set.o }, set, chart: ch, snap, start, mu, sig,
      check: c => {
        // By eye: the center within about a third of an SD of the mean, the spread within a quarter of σ.
        const okC = Math.abs(c.mu - mu) <= 0.35 * sig, okS = Math.abs(c.sd / sig - 1) <= 0.25;
        if (okC && okS) return R('right', `Right! Your curve is centered at ${fmt(r1(c.mu))} with a spread of ${fmt(r1(c.sd))}. The data’s mean is ${fmt(r1(mu))} and its σ is ${fmt(r1(sig))}: about 68% of the values are within one σ of the mean.`);
        const say = [];
        if (!okC) say.push(`Move the center to the ${c.mu < mu ? 'right' : 'left'}: a normal curve peaks at the mean, the histogram’s balance point.`);
        if (!okS) say.push(`Make the curve ${c.sd < sig ? 'wider' : 'narrower'}: about two thirds of the values (68%) should be within one spread of the center.`);
        return R(okC || okS ? 'almost' : 'wrong', say.join(' '));
      },
      hints: ['The curve is symmetric, so put its center where the histogram balances: the middle of the tallest bars.', 'One standard deviation each side of the center should hold about two thirds of the bars’ area.'] };
  }
  const curveSet = seed => shapeSet(seed, 'sym');

  // ---------- The 68–95–99.7 rule ----------
  const MODELS = [
    { key: 'height', o: { grade: '9' }, mu: 65, sd: 3, what: 'heights of 200 pretend 9th graders', unit: 'inches', one: 'inch' },
    { key: 'run', o: {}, mu: 15, sd: 1.5, what: '100 m run times of 200 pretend students', unit: 'seconds', one: 'second' },
    { key: 'points', o: {}, mu: 62, sd: 8, what: 'points a pretend team scored in 200 games', unit: 'points', one: 'point' },
    { key: 'scores', o: { test: 'hard' }, mu: 70, sd: 10, what: 'scores of 200 pretend students on a hard test', unit: 'points', one: 'point' },
    { key: 'sleep', o: { who: 'hs' }, mu: 7, sd: 1, what: 'hours of sleep of 200 pretend high schoolers', unit: 'hours', one: 'hour' },
  ];
  // [type, from, to (in SDs from the mean), percent]
  const RULE = [['between', -1, 1, 68], ['between', -2, 2, 95], ['between', -3, 3, 99.7], ['above', 1, null, 16], ['below', -1, null, 16], ['above', 2, null, 2.5], ['below', -2, null, 2.5],
    ['between', 0, 1, 34], ['between', -2, 0, 47.5], ['between', -1, 2, 81.5], ['between', 1, 2, 13.5]];
  const ruleData = m => ({ chart: { type: 'curve', model: true, mu: m.mu, sd: m.sd, lo: m.mu - 4 * m.sd, hi: m.mu + 4 * m.sd }, what: `${m.what}, in ${m.unit}`, key: m.key, o: m.o });
  function ruleTask(m, item, count) {
    const [type, a, b, p] = item, at = k => fmt(+(m.mu + k * m.sd).toFixed(6)), N = 200, want = count ? (p * N) / 100 : p;
    const where = type === 'between' ? `between ${at(a)} and ${at(b)}` : `${type} ${at(a)}`;
    const prompt = `The ${m.what} follow a normal curve with a mean of ${fmt(m.mu)} ${m.unit} and a standard deviation of ${fmt(m.sd)} ${m.sd === 1 ? m.one : m.unit}. ${count ? `About how many of the ${N}` : 'About what percent of them'} are ${where}?`;
    const half = type === 'between' ? (a === 0 || b === 0) : true;
    const slips = [];
    if (type !== 'between') { const inside = { 1: 68, 2: 95 }[Math.abs(a)]; slips.push([100 - inside, `${fmt(100 - inside)}% is outside on both sides together. ${type === 'above' ? 'Above' : 'Below'} is just one side: half of it.`], [inside, `${inside}% is within ${Math.abs(a)} SD on both sides of the mean. This asks about the part ${type} ${at(a)}.`], [100 - (100 - inside) / 2, `That is the part on the other side. The curve’s tail ${type} ${at(a)} is the small part.`]); }
    if (half && type === 'between') { const k = Math.abs(a || b), whole = { 1: 68, 2: 95, 3: 99.7 }[k]; slips.push([whole, `${whole}% is within ${k} SD on both sides. From the mean to one side is half of that.`]); }
    const scaled = count ? slips.map(([y, msg]) => [(y * N) / 100, msg]) : slips;
    if (count) scaled.push([p, `That is the percent, ${p}%. Find ${p}% of ${N}.`]);
    const tol = count ? 1 : 0.5;
    return { prompt, ask: 'answer', data: ruleData(m), want: fmt(want),
      check: t => {
        const r = Stats.read(t), x = one(r);
        if (x === null) return r.empty ? R('info', 'Type an answer first.') : R('info', 'Type one number.');
        if (Math.abs(x - want) <= tol + 1e-9) return R('right', `Right! ${count ? `${p}% of ${N} is ${fmt(want)}.` : `About ${p}%.`}`);
        for (const [y, msg] of scaled) if (Math.abs(x - y) <= tol + 1e-9) return R('wrong', msg);
        return R('wrong', 'Not quite. Mark the mean and 1, 2 and 3 SDs on each side. Within 1 SD is 68%, within 2 is 95%, within 3 is 99.7%, and each side holds half.');
      },
      hints: [`Mark the mean, ${fmt(m.mu)}, and count SDs out from it: ${at(-2)}, ${at(-1)}, ${at(1)}, ${at(2)}.`, 'Within 1 SD is 68%, within 2 SDs is 95%, within 3 SDs is 99.7%. The curve is symmetric, so each side of the mean holds half.'],
      answer: `${count ? `${p}% of ${N} = ${fmt(want)}` : `About ${p}%`}.`,
      steps: [{ html: `${where}: ${type === 'between' ? `from ${a} to ${b} SDs` : `${type} ${a} SD${Math.abs(a) > 1 ? 's' : ''}`} from the mean`, why: 'Count how many SDs from the mean each number is.' },
        { html: `${fmt(p)}%`, why: type === 'between' && !half && a === -b ? `Within ${b} SD${b > 1 ? 's' : ''} on both sides: ${p}%.` : type === 'between' && half ? `Half of ${fmt({ 1: 68, 2: 95, 3: 99.7 }[Math.abs(a || b)])}%: one side only.` : type === 'between' ? 'Add the two sides: half of 68% on one side and half of 95% on the other, or the difference of two halves.' : `Outside ${Math.abs(a)} SD${Math.abs(a) > 1 ? 's' : ''} is ${fmt(100 - { 1: 68, 2: 95 }[Math.abs(a)])}%; one tail is half of it.` },
        ...(count ? [{ html: `${p}% of ${N} = ${fmt(want)}`, why: 'Find that percent of the whole group.' }] : [])] };
  }
  const ruleQ = seed => { const r = rng(seed); return ruleTask(r.pick(MODELS), r.pick(RULE), r() < 0.35); };

  // ---------- Level 8 ----------
  const L8 = { n: 8, title: 'Shape and the Normal Curve', themes: [
    { key: 'shape', title: 'Shape', make: (seed, ex) => (ex ? shapeTask(shapeSet(3, 'right')) : rng(seed)() < 0.5 ? shapeTask(shapeSet(seed)) : centerTask(shapeSet(seed, null, true), seed)),
      intro: 'A histogram is symmetric when its sides mirror each other. A long tail on one side makes it skewed toward that side, and the tail pulls the mean toward it.' },
    { key: 'sd', title: 'Standard Deviation', make: (seed, ex) => (ex ? sdTask({ key: 'freethrows', seed: 0, o: { skill: '50' }, values: [2, 4, 4, 4, 5, 5, 7, 9] }, false) : sdTask(sdSet(seed), rng(seed)() < 0.5)),
      intro: 'The standard deviation measures how far the values typically are from the mean. Square each distance, find their mean (divide by n, or by n − 1 for a sample), then take the square root.' },
    { key: 'table', title: 'Histogram From a Table', make: (seed, ex) => tableHistTask(ex ? shapeSet(5, 'sym') : shapeSet(seed)),
      intro: 'With 200 values, count them into bins first: the frequency table does that. Then each bar shows a bin’s count.' },
    { key: 'curve', title: 'Fit the Curve', make: (seed, ex) => curveTask(curveSet(ex ? 7 : seed)),
      intro: 'A normal curve is a smooth, symmetric bell. It peaks at the mean, and one standard deviation on each side holds about 68% of the values.' },
    { key: 'rule', title: '68–95–99.7', make: (seed, ex) => (ex ? ruleTask(MODELS[0], RULE[3], false) : ruleQ(seed)),
      intro: 'In a normal curve, about 68% of the values are within 1 standard deviation of the mean, 95% within 2, and 99.7% within 3.' },
  ], check: seed => { const r = rng(seed), s = () => T.seedOf(r); return [shapeTask(shapeSet(s())), centerTask(shapeSet(s(), null, true), s()), sdTask(sdSet(s()), r() < 0.5), ruleQ(s())]; } };
  T.LEVELS.push(L8);

  // ---------- The Lab: a normal curve over the student's own data ----------
  // The shape each scenario is made with (data.js): a bell for these, a long right tail for those.
  const KNOWN = { height: 'sym', points: 'sym', run: 'sym', shoes: 'sym', sleep: 'sym', screen: 'right', travel: 'right', reaction: 'right' };
  const knownShape = set => (set.key === 'scores' ? ((set.o && set.o.test) === 'easy' ? 'left' : 'sym') : KNOWN[set.key]);
  function fitOf(set) {
    const k = kindOf(set), no = (short, why) => ({ fit: false, short, why });
    if (k === 'cat') return no('Categories have no number line.', 'A normal curve sits over a number line. Categories have no numbers and no order: a bar graph fits.');
    if (k === 'time') return no('It loses the order over time.', 'A curve over all the values mixes the days together and drops their order: a line graph fits.');
    const v = set.values;
    if (v.length < 50) return no('Too few values to see a shape.', `With only ${v.length} values the histogram is too bumpy to match a smooth curve. Make 50 or more values.`);
    // Skewed only when it clearly is (the lesson's own test, beyond 0.6), and never for data the tool makes from a
    // symmetric bell: a sample of 50 heights can lean by chance, and calling it skewed would mark "it fits" wrong.
    const s = knownShape(set) === 'sym' ? null : shapeOf(v);
    if (s === 'right' || s === 'left') return no(`The data is skewed ${s}, but a normal curve is symmetric.`, `A normal curve is symmetric. This histogram has a long tail to the ${s}, so the curve misses the peak on one side and the tail on the other.`);
    return { fit: true };
  }
  function misfitTask(set) {
    const f = fitOf(set), k = kindOf(set), pic = k === 'num';
    const chart = pic ? Object.assign(curveChart(set), { mu: mean(set.values), sd: sd(set.values) }) : null;
    return { prompt: pic ? `Here is a normal curve over a histogram of the ${whatOf(set)}. What’s wrong with it?` : `Someone wants to fit a normal curve to the ${whatOf(set)}. What’s wrong with that?`, ask: 'choice', shuffle: true,
      data: pic ? { chart, what: whatOf(set), key: set.key, o: set.o } : T.dataOf(set), set,
      choices: [{ html: f.short, right: true, msg: `Right! ${f.why}` }, { html: 'Nothing: it fits this data.', right: false, msg: 'Not this one. Look at the shape of the data, and at what a normal curve needs.' },
        { html: 'The curve should be taller.', right: false, msg: 'Not this one. A taller curve would not fix it: the problem is whether this data has a normal shape at all.' }, { html: 'It needs a title and labels.', right: false, msg: 'Not this one. Labels help, but the problem is the kind of data for this curve.' }],
      answer: f.why };
  }
  const labTask = set => (fitOf(set).fit ? curveTask(set) : misfitTask(set));

  return { shapeOf, shapeSet, shapeTask, centerTask, sdTask, sdSet, tableHistTask, curveTask, curveChart, ruleTask, ruleQ, RULE, MODELS, fitOf, misfitTask, labTask };
})();
