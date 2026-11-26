/* Data Coach: displays. Level 4, Showing Categories: draw a bar graph (choose the scale, then set each bar)
   and a pie chart (drag the edges; each snaps to whole shares), read them, and judge which display fits.
   Also the rule for the Lab: does a display fit this data? If not, the tool draws it and asks what's wrong. */
const Displays = (() => {
  'use strict';
  const { rng, make, catsOf, whatOf, kindOf } = Data;
  const { fmt } = Stats;
  const T = Tasks;
  const R = (status, msg) => ({ status, msg });

  // ---------- The count scale of a bar graph ----------
  const STEPS = [1, 2, 5, 10, 20, 50, 100];
  // A step is good when it makes 3 to 12 lines up to the biggest count (counting by 1s is always readable if short).
  function scaleVerdict(step, max) {
    const lines = Math.ceil(max / step);
    if (lines > 12) return { ok: false, msg: `Counting by ${step}s needs ${lines} lines to reach ${max}: too crowded to read. Choose a bigger step.` };
    if (lines < 3 && step > 1) return { ok: false, msg: `Counting by ${step}s gives only ${lines} ${lines === 1 ? 'line' : 'lines'} up to ${max}, so most bars would end between lines and be hard to read. Choose a smaller step.` };
    return { ok: true, msg: `Counting by ${step}s works: ${lines} lines reach the biggest count, ${max}.` };
  }
  const stepsFor = max => STEPS.filter(s => Math.ceil(max / s) <= 40 && (s === 1 || s <= max));
  const goodStep = max => STEPS.find(s => scaleVerdict(s, max).ok);
  // The top of the count axis: the first line above the biggest count, so the tallest bar never touches the top.
  const topFor = (step, max) => step * Math.max(1, Math.ceil((max + 1) / step));

  function checkBar(heights, step, cats, counts) {
    const off = cats.map((c, i) => i).filter(i => heights[i] !== counts[i]);
    if (!off.length) return R('right', 'Right! Every bar reaches its count on the scale.');
    const names = T.andList(off.map(i => fmt(cats[i])));
    // Lines counted instead of the scale: a count of 6 by 2s drawn up to the 3rd line's "3".
    if (step > 1 && off.every(i => heights[i] * step === counts[i])) return R('wrong', `Each line on your scale is worth ${step}, not 1. A bar for ${counts[off[0]]} goes up to the line labeled ${counts[off[0]]}.`);
    return R('wrong', `Check the ${off.length === 1 ? 'bar' : 'bars'} for ${names}: each bar’s top should line up with its count from the table.`);
  }
  /* Show Next Step on a pie: slices 0 to i get their counts, and the parts left over are shared out
     over the slices after i (they add up to their counts' total, so no slice is ever negative). */
  function pieStep(values, counts, i) {
    const k = counts.length, v = values.slice(), last = Math.min(i, k - 1);
    for (let j = 0; j <= last; j++) v[j] = counts[j];
    const rest = counts.slice(last + 1).reduce((a, b) => a + b, 0), m = k - last - 1;
    for (let j = last + 1; j < k; j++) v[j] = Math.floor(rest / m) + (j - last - 1 < rest % m ? 1 : 0);
    return v;
  }
  function checkPie(cur, cats, counts) {
    const n = counts.reduce((a, b) => a + b, 0), off = cats.map((c, i) => i).filter(i => cur[i] !== counts[i]);
    if (!off.length) return R('right', `Right! Each slice is its share of the whole: ${T.andList(cats.map((c, i) => `${fmt(c)} ${counts[i]}/${n}`))}.`);
    return R('wrong', `Check the ${off.length === 1 ? 'slice' : 'slices'} for ${T.andList(off.map(i => fmt(cats[i])))}. The circle is cut into ${n} equal parts: each slice gets as many parts as its count.`);
  }

  // ---------- Drawing tasks ----------
  function barTask(set) {
    const cats = catsOf(set), counts = Stats.freq(set.values, cats), max = Math.max(...counts);
    return {
      prompt: 'Draw a bar graph of the table. First choose the scale for the count axis. Then drag each bar (or use the arrow keys) up to its count.',
      ask: 'bar', data: T.tableOf(set, cats), set, cats, counts, max, steps: stepsFor(max), good: goodStep(max),
      scale: s => scaleVerdict(s, max), top: s => topFor(s, max), check: (h, s) => checkBar(h, s, cats, counts),
      hints: ['Choose a step that makes about 4 to 10 lines up to the biggest count.', 'Each bar’s top lines up with its count. A count between two lines goes between them: 7 is halfway between 6 and 8.'],
    };
  }
  function pieTask(set) {
    const cats = catsOf(set), counts = Stats.freq(set.values, cats), n = set.values.length;
    return {
      prompt: `Draw a pie chart of the table. The circle is cut into ${n} equal parts, one for each value. Drag each edge (or use the arrow keys) so each slice gets as many parts as its count.`,
      ask: 'pie', data: T.tableOf(set, cats), set, cats, counts, n, check: cur => checkPie(cur, cats, counts),
      hints: [`Each value is 1 of the ${n} parts. A count of 5 gets 5 parts.`, 'Start at the top and go clockwise: set the first slice’s edge, then the next.'],
    };
  }

  // ---------- Reading displays ----------
  const chartOf = (set, type, step) => { const cats = catsOf(set), counts = Stats.freq(set.values, cats), max = Math.max(...counts), s = step || goodStep(max); return { type, cats, counts, step: s, top: topFor(s, max), n: set.values.length }; };
  function checkNumber(text, want, slips = []) {
    const a = Stats.read(text), x = a.nums && a.nums.length === 1 && typeof a.nums[0] === 'number' ? a.nums[0] : null;
    if (a.error || x === null) return a.empty ? R('info', 'Type an answer first.') : R('info', 'Type one number.');
    if (x === want) return R('right', 'Right!');
    for (const [y, msg] of slips) if (x === y) return R('wrong', msg);
    return R('wrong', 'Not quite. Read the top of each bar against the scale.');
  }
  function readBarTask(set, seed) {
    const r = rng(seed), ch = chartOf(set, 'bar', 2), { cats, counts } = ch, live = cats.map((c, i) => i).filter(i => counts[i] > 0);
    const data = { chart: ch, what: whatOf(set), key: set.key, o: set.o }, kind = live.length >= 2 ? r.pick(['one', 'more', 'more', 'all']) : 'one';
    if (kind === 'more') {
      const [a, b] = r.shuffle(live).slice(0, 2).sort((x, y) => counts[y] - counts[x]), d = counts[a] - counts[b];
      return { prompt: `How many more ${fmt(cats[a])} than ${fmt(cats[b])}?`, ask: 'answer', data, set, want: String(d),
        check: t => checkNumber(t, d, [[counts[a] + counts[b], 'That is both together. “How many more” means subtract: the bigger count minus the smaller.'], [counts[a], `That is how many ${fmt(cats[a])} there are. Subtract the ${fmt(cats[b])} count.`]]),
        hints: ['Read both bars, then subtract the smaller count from the bigger one.'], answer: `${counts[a]} − ${counts[b]} = ${d} more.`,
        steps: [{ html: `${fmt(cats[a])}: ${counts[a]}`, why: 'Read the top of the bar across to the scale.' }, { html: `${fmt(cats[b])}: ${counts[b]}`, why: 'Read the other bar the same way.' }, { html: `${counts[a]} − ${counts[b]} = ${d}`, why: '“How many more” means subtract.' }] };
    }
    if (kind === 'all') return { prompt: 'How many values are there in all?', ask: 'answer', data, set, want: String(set.values.length), check: t => checkNumber(t, set.values.length, [[Math.max(...counts), 'That is the tallest bar. In all means every bar added together.']]), hints: ['Read every bar and add them up.'], answer: `${counts.filter(c => c).join(' + ')} = ${set.values.length}.`, steps: [{ html: counts.filter(c => c).join(', '), why: 'Read every bar against the scale.' }, { html: `${counts.filter(c => c).join(' + ')} = ${set.values.length}`, why: 'In all means add them up.' }] };
    // One bar, preferring one that ends between two lines (the reading skill).
    const between = live.filter(i => counts[i] % ch.step), i = r.pick(between.length ? between : live);
    return { prompt: `How many were ${fmt(cats[i])}?`, ask: 'answer', data, set, want: String(counts[i]),
      check: t => checkNumber(t, counts[i], [[Math.floor(counts[i] / ch.step), `Each line is worth ${ch.step}, not 1: read the numbers on the scale.`], [counts[i] - 1, 'The bar ends halfway between two lines: halfway between 6 and 8 is 7.'], [counts[i] + 1, 'The bar ends halfway between two lines: halfway between 6 and 8 is 7.']]),
      hints: [`Find the top of the ${fmt(cats[i])} bar and read across to the scale. Each line is worth ${ch.step}.`], answer: `${counts[i]} were ${fmt(cats[i])}.`,
      steps: [{ html: `each line = ${ch.step}`, why: 'Read the scale first: the numbers beside the lines.' }, { html: `${fmt(cats[i])}: ${counts[i]}`, why: counts[i] % ch.step ? 'The bar ends halfway between two lines.' : 'The bar ends on a line.' }] };
  }
  function pieFractionTask(set, seed) {
    const r = rng(seed), ch = chartOf(set, 'pie'), { cats, counts, n } = ch, i = r.pick(cats.map((c, j) => j).filter(j => counts[j] > 0));
    return { prompt: `What fraction of all the values are ${fmt(cats[i])}? (A fraction, a decimal or a percent.)`, ask: 'answer', data: { chart: ch, what: whatOf(set), key: set.key, o: set.o }, set, want: `${counts[i]}/${n}`,
      check: t => Stats.checkFraction(t, counts[i], n, fmt(cats[i])), hints: [`The circle is cut into ${n} equal parts. Count the parts in the ${fmt(cats[i])} slice.`],
      answer: `${counts[i]} out of ${n}: ${counts[i]}/${n}, or ${fmt(counts[i] / n * 100)}%.`,
      steps: [{ html: `${counts[i]} parts`, why: `Count the parts in the ${fmt(cats[i])} slice.` }, { html: `${counts[i]}/${n}`, why: `Out of the ${n} equal parts in the whole circle.` }] };
  }

  // ---------- Which display fits? ----------
  const REASON = { 'Bar Graph': 'A bar graph shows each count on a scale.', 'Pie Chart': 'A pie chart shows each part’s share of one whole.', 'Line Graph': 'A line graph shows one amount changing over time.' };
  const WHICH = [
    ['Which display shows each eye color’s share of the whole class?', 'Pie Chart'],
    ['Which display makes it easiest to read exactly how many students chose each subject?', 'Bar Graph'],
    ['Two pet types have almost the same count. Which display makes them easiest to compare?', 'Bar Graph', 'Bars side by side on one scale are easy to compare; pie slices of almost the same size are hard to tell apart.'],
    ['Which display shows what fraction of all the spins landed on Red?', 'Pie Chart'],
    ['Thirty students named their favorite fruit. Which display does NOT fit this data?', 'Line Graph', 'A line graph shows change over time, in order. Favorite fruits have no time order, so a bar graph or a pie chart fits.'],
    ['Which display shows how a city’s rainfall changed from month to month?', 'Line Graph'],
  ];
  function whichQ(item) {
    const [q, right, why] = item, msg = why || REASON[right];
    return { prompt: q, ask: 'choice', choices: ['Bar Graph', 'Pie Chart', 'Line Graph'].map(d => ({ html: d, right: d === right, msg: d === right ? `Right! ${msg}` : `Not this one. ${REASON[d]} Is that what the question asks for?` })),
      hints: ['Counts on a scale: a bar graph. Shares of one whole: a pie chart. Change over time: a line graph.'], answer: msg };
  }


  // ---------- Number displays (Level 5): dot plots, histograms, stem-and-leaf plots ----------
  // A dot plot's number line: every step from the least to the greatest value (whole numbers, or halves). null when too spread out.
  function ticksOf(v) {
    const step = v.every(Number.isInteger) ? 1 : v.every(x => Number.isInteger(x * 2)) ? 0.5 : null;
    if (!step) return null;
    const lo = Math.min(...v), hi = Math.max(...v), n = Math.round((hi - lo) / step) + 1;
    return n > 25 ? null : Array.from({ length: n }, (_, i) => lo + i * step);
  }
  // The smallest step the values come in: 10 (reaction times), 5 (screen time), 1, 0.5 (sleep) or 0.1 (run times).
  const grainOf = v => (v.every(Number.isInteger) ? (v.every(x => x % 10 === 0) ? 10 : v.every(x => x % 5 === 0) ? 5 : 1) : v.every(x => Number.isInteger(x * 2)) ? 0.5 : 0.1);
  const tidy = x => Math.round(x * 10) / 10;
  // Histogram bins of width w, starting at the multiple of w at or below the least value; each bin is labeled by its first and last possible value.
  function binsOf(v, w) {
    const g = grainOf(v), lo = Math.floor(Math.min(...v) / w + 1e-9) * w, hi = Math.max(...v), bins = [];
    for (let a = lo; a <= hi + 1e-9; a = tidy(a + w)) bins.push({ a, b: tidy(a + w - g), label: `${fmt(a)}–${fmt(tidy(a + w - g))}` });
    return { bins, counts: bins.map(bn => v.filter(x => x >= bn.a - 1e-9 && x <= bn.b + 1e-9).length) };
  }
  const WIDTHS = [0.5, 1, 2, 5, 10, 20, 25, 50, 100];
  // A bin width is good when it makes 4 to 12 bars.
  function widthVerdict(v, w) {
    const k = binsOf(v, w).bins.length;
    if (k > 12) return { ok: false, msg: `Bins ${fmt(w)} wide make ${k} bars: so many that most hold only a value or two, and the shape is lost. Choose wider bins.` };
    if (k < 4) return { ok: false, msg: `Bins ${fmt(w)} wide make only ${k} ${k === 1 ? 'bar' : 'bars'}: everything is lumped together, and the shape is lost. Choose narrower bins.` };
    return { ok: true, msg: `Bins ${fmt(w)} wide make ${k} bars.` };
  }
  // Every bin spans at least two steps of the data (never one value, like "58–58").
  const widthsFor = v => { const g = grainOf(v); return WIDTHS.filter(w => Math.abs(w / g - Math.round(w / g)) < 1e-9 && w >= 2 * g - 1e-9 && binsOf(v, w).bins.length >= 2 && binsOf(v, w).bins.length <= 30); };
  // The width the tool would choose: one making 5 to 10 bars if there is one, else any the rule accepts.
  const goodWidth = v => widthsFor(v).find(w => { const k = binsOf(v, w).bins.length; return k >= 5 && k <= 10; }) || widthsFor(v).find(w => widthVerdict(v, w).ok);
  // Stem-and-leaf rows for whole numbers: the stem is everything but the ones digit.
  // Decimals in tenths (run times, half hours of sleep) work too: the stem is the whole number, the leaf the tenths digit.
  const stemUnit = v => (v.every(Number.isInteger) ? 10 : 1);
  const leafOf = (x, u) => (u === 10 ? x % 10 : Math.round((x - Math.floor(x)) * 10));
  const valueOf = (s, l, u) => (u === 10 ? s * 10 + l : s + l / 10);
  function stemRows(v) {
    const u = stemUnit(v), lo = Math.floor(Math.min(...v) / u), hi = Math.floor(Math.max(...v) / u), rows = [];
    for (let s = lo; s <= hi; s++) rows.push([s, v.filter(x => Math.floor(x / u) === s).map(x => leafOf(x, u)).sort((a, b) => a - b)]);
    return rows;
  }

  /* Does a display fit this data? Each misfit has a short reason (a choice to pick) and a longer one (the
     explanation after). Bar graphs and pie charts fit categories; dot plots, histograms and stem-and-leaf
     plots fit numbers; data over time needs a line graph (a later level). */
  function fitOf(set, type) {
    const k = kindOf(set), v = set.values, rows = catsOf(set).length;
    const no = (short, why) => ({ fit: false, short, why });
    if (k === 'time') return no('It loses the order over time.', 'This data is one amount measured over time. This display drops the order of the days, weeks or months, which is the whole point: a line graph fits (a later level).');
    if (k === 'cat') {
      if (type === 'bar' || type === 'pie') return { fit: true };
      if (type === 'dot') return no('Categories have no number line.', 'A dot plot lines values up on a number line. Categories have no numbers to line up: a bar graph shows their counts.');
      if (type === 'hist') return no('Categories can’t be grouped into ranges.', 'A histogram groups numbers into ranges, like 60–64. Categories have no ranges: a bar graph shows their counts.');
      return no('Categories have no digits to split.', 'A stem-and-leaf plot splits numbers into tens and ones. Categories aren’t numbers: a bar graph or a pie chart fits.');
    }
    if (type === 'pie') return no('Amounts aren’t parts of one whole.', 'These values are amounts, not parts of one whole: a slice for each value means nothing. A dot plot or a histogram fits numbers.');
    if (type === 'bar') return rows <= 12 ? { fit: true } : no('Too many different values for bars.', `There are ${rows} different values, most counted only once or twice, so the bars show almost nothing. Group them into ranges (a histogram) or use a dot plot.`);
    if (type === 'dot') return ticksOf(v) ? { fit: true } : no('Too spread out for a dot plot.', 'The values are spread so far apart that nearly every dot would sit alone on a long number line. Group them into ranges with a histogram.');
    if (type === 'hist') return new Set(v).size > 6 && goodWidth(v) ? { fit: true } : no('Too few different values to group.', `With only ${new Set(v).size} different values there is nothing to group into ranges: a dot plot or a bar graph shows each value.`);
    if (stemRows(v).length < 2) return stemUnit(v) === 10 && Math.max(...v) < 10
      ? no('Every value is under 10: one stem.', 'Every value is under 10, so every value has the same stem, 0, and the plot is one long row. A dot plot shows these values better.')
      : no('Every value has the same stem.', 'Every value has the same stem, so the plot is one long row and shows no shape. A dot plot shows these values better.');
    if (stemRows(v).length > 12) return no('So many stems that most rows are empty.', `The values run across ${stemRows(v).length} stems, so most rows hold a leaf or two. A histogram with wide bins fits better.`);
    return { fit: true };
  }

  // The display drawn by the tool (for reading, and for misfits).
  function chartFor(set, type) {
    const v = set.values;
    if (type === 'bar' || type === 'pie') return chartOf(set, type);
    if (type === 'dot') { const t = ticksOf(v) || (kindOf(set) === 'cat' ? catsOf(set) : [...new Set(v)].sort((a, b) => a - b)); return { type: 'dot', ticks: t, counts: t.map(x => v.filter(y => y === x).length) }; }
    if (type === 'hist') {
      const w = goodWidth(v) || widthsFor(v)[0] || 1, nums = v.every(x => typeof x === 'number');
      const { bins, counts } = nums ? binsOf(v, w) : { bins: catsOf(set).map(c => ({ label: c })), counts: Stats.freq(v, catsOf(set)) };
      const max = Math.max(...counts), s = goodStep(max);
      return { type: 'hist', cats: bins.map(b => b.label), counts, step: s, top: topFor(s, max), width: w };
    }
    return { type: 'stem', rows: stemRows(v), key: keyOf(v) };
  }
  // The key, from one of the values: "6 | 1 means 61", or for tenths "14 | 7 means 14.7".
  const keyOf = v => { const u = stemUnit(v), x = (u === 10 && v.find(y => y >= 10)) || v[0]; return `${Math.floor(x / u)} | ${leafOf(x, u)} means ${fmt(x)}`; };

  const NAME = { bar: 'bar graph', pie: 'pie chart', dot: 'dot plot', hist: 'histogram', stem: 'stem-and-leaf plot' };
  const PART = { bar: 'bar', pie: 'slice', dot: 'dot', hist: 'bar', stem: 'row' };
  function misfitTask(set, type) {
    const f = fitOf(set, type);
    // Categories can't even be drawn as a stem-and-leaf plot, so that one is asked about the list, with no picture.
    const blank = type === 'stem' && kindOf(set) === 'cat';
    return { prompt: blank ? `Someone wants to make a stem-and-leaf plot of the ${whatOf(set)}. What’s wrong with that?` : `Here is a ${NAME[type]} of the ${whatOf(set)}. What’s wrong with it?`,
      ask: 'choice', shuffle: true, data: blank ? T.dataOf(set) : { chart: chartFor(set, type), what: whatOf(set), key: set.key, o: set.o }, set,
      choices: [{ html: f.short, right: true, msg: `Right! ${f.why}` },
        { html: 'Nothing: it fits this data.', right: false, msg: `Not this one. Look at what each ${PART[type]} stands for. Does it tell you something about this data?` },
        { html: 'It needs a title and labels.', right: false, msg: 'Not this one. Labels help, but they would not fix it: the problem is the kind of display for this kind of data.' },
        { html: `It needs more ${PART[type]}s.`, right: false, msg: `Not this one. More ${PART[type]}s would not help: the problem is the kind of display for this kind of data.` }],
      answer: f.why };
  }
  // A misfit question on data that really doesn't fit (made until it doesn't: a bar graph of heights can fit when they bunch up).
  function misfitQ(r, keys, type) {
    const key = r.pick(keys);
    return misfitTask(T.makeWhere(key, r, 30, v => !fitOf({ key, values: v, o: Data.optsOf(key) }, type).fit), type);
  }

  // ---------- Level 5 tasks ----------
  function dotTask(set) {
    const v = set.values, ticks = ticksOf(v), counts = ticks.map(x => v.filter(y => y === x).length);
    return { prompt: 'Make a dot plot of the list: tap above a value on the number line to add a dot for it. Turn on Erase Dots to take one away.', ask: 'dot', data: T.dataOf(set), set, ticks, counts,
      check: cur => { const off = ticks.filter((x, i) => cur[i] !== counts[i]); return off.length ? R('wrong', `Check the dots at ${T.andList(off.map(fmt))}: one dot for each time that value is in the list.`) : R('right', `Right! One dot for each of the ${v.length} values.`); },
      hints: ['Go down the list in order: for each value, add one dot above it.', `There should be ${v.length} dots in all.`] };
  }
  function histTask(set) {
    const v = set.values;
    return { prompt: 'Draw a histogram of the list. First choose how wide each bin (range of values) is. Then drag each bar up to how many values fall in its range.', ask: 'hist', data: T.dataOf(set), set,
      widths: widthsFor(v), good: goodWidth(v), verdict: w => widthVerdict(v, w), binsOf: w => binsOf(v, w), topOf: w => { const m = Math.max(...binsOf(v, w).counts); return { step: goodStep(m), top: topFor(goodStep(m), m) }; },
      check: (h, w) => { const { bins, counts } = binsOf(v, w), off = bins.filter((b, i) => h[i] !== counts[i]); return off.length ? R('wrong', `Check the ${off.length === 1 ? 'bar' : 'bars'} for ${T.andList(off.map(b => b.label))}: count the values from the first number to the last.`) : R('right', 'Right! Each bar counts the values in its range.'); },
      hints: ['Choose a width that makes about 5 to 10 bars.', 'A value on an edge, like 60, goes in the bin that starts at 60.'] };
  }
  function stemTask(set) {
    const v = set.values, rows = stemRows(v), u = stemUnit(v), parts = u === 10 ? ['the tens', 'the ones digits'] : ['the whole number', 'the tenths digits'];
    return { prompt: `Make a stem-and-leaf plot: for each stem (${parts[0]}), type the leaves (${parts[1]}), in order from least to greatest. Key: ${keyOf(v)}.`, ask: 'stem', data: T.dataOf(set), set, rows,
      valueOf: (s, l) => valueOf(s, l, u),
      check: typed => {
        const off = [], order = [];
        rows.forEach(([s, want], i) => { const got = (typed[i] || '').replace(/[^0-9]/g, '').split('').map(Number); if (got.slice().sort((a, b) => a - b).join() !== want.join()) off.push(s); else if (got.join() !== want.join()) order.push(s); });
        if (off.length) return R('wrong', `Check the ${off.length === 1 ? 'row' : 'rows'} for stem ${T.andList(off.map(String))}: one leaf for each value in that row (a value used twice gets two leaves).`);
        if (order.length) return R('almost', `Almost: the leaves are right, but put each row in order from least to greatest (stem ${T.andList(order.map(String))}).`);
        return R('right', 'Right! Every value has its leaf, in order.');
      },
      hints: [`${keyOf(v)}: the stem is ${parts[0]}, the leaf is ${u === 10 ? 'the ones digit' : 'the tenths digit'}.`, 'A row with no values stays empty, but keep its stem.'] };
  }
  // The median read from a dot plot: count the dots to the middle.
  function medianDotTask(set) {
    const m = T.medianTask(set), n = set.values.length;
    return Object.assign(m, { prompt: 'Find the median from the dot plot.', data: { chart: chartFor(set, 'dot'), what: whatOf(set), key: set.key, o: set.o },
      hints: [`Count the dots: there are ${n}. The dot plot is already in order, from left to right.`, n % 2 ? `The middle dot is number ${(n + 1) / 2}, counting from the left.` : `The middle two dots are numbers ${n / 2} and ${n / 2 + 1}, counting from the left.`],
      steps: [{ html: `${n} dots`, why: 'Count the dots.' }, { html: n % 2 ? `dot number ${(n + 1) / 2}` : `dots number ${n / 2} and ${n / 2 + 1}`, why: 'Where the middle is.' }, { html: `Median = ${fmt(Stats.median(set.values))}`, why: 'Count from the left (lower values first) to the middle.' }] });
  }
  function readHistTask(set, seed) {
    const r = rng(seed), ch = chartFor(set, 'hist'), { cats, counts } = ch, { bins } = binsOf(set.values, ch.width), live = counts.map((c, i) => i).filter(i => counts[i] > 0);
    const data = { chart: ch, what: whatOf(set), key: set.key, o: set.o };
    if (r() < 0.5 && bins.length > 2) {
      const i = r.int(1, bins.length - 1), want = counts.slice(i).reduce((a, b) => a + b, 0);
      return { prompt: `How many values are ${fmt(bins[i].a)} or more?`, ask: 'answer', data, set, want: String(want),
        check: t => checkNumber(t, want, [[counts[i], `That is only the ${cats[i]} bar. ${fmt(bins[i].a)} or more means that bar and every bar to its right.`]]),
        hints: [`Add the bars from ${cats[i]} to the right end.`], answer: `${counts.slice(i).join(' + ')} = ${want}.`,
        steps: [{ html: counts.slice(i).join(', '), why: `Read the bars from ${cats[i]} to the right.` }, { html: `${counts.slice(i).join(' + ')} = ${want}`, why: 'Add them.' }] };
    }
    const i = r.pick(live);
    return { prompt: `How many values are from ${cats[i].replace('–', ' to ')}?`, ask: 'answer', data, set, want: String(counts[i]),
      check: t => checkNumber(t, counts[i]), hints: [`Find the bar labeled ${cats[i]} and read its top against the scale.`], answer: `${counts[i]} values.`,
      steps: [{ html: `${cats[i]}: ${counts[i]}`, why: 'Read the bar’s top across to the scale.' }] };
  }
  const NREASON = { 'Dot Plot': 'A dot plot shows every value as a dot on a number line.', 'Histogram': 'A histogram groups values into ranges and shows how many fall in each.', 'Stem-and-Leaf Plot': 'A stem-and-leaf plot keeps every value, grouped by its tens.', 'Pie Chart': 'A pie chart shows parts of one whole.' };
  const WHICH_NUM = [
    ['Number of pets in 20 homes (0 to 5). Which display shows every value best?', 'Dot Plot', ['Dot Plot', 'Histogram', 'Pie Chart']],
    ['Reaction times of 300 students, nearly all different. Which display shows their shape best?', 'Histogram', ['Dot Plot', 'Histogram', 'Pie Chart'], 'With 300 values spread out, a dot plot is a long thin line of lonely dots. A histogram groups them into ranges, so the shape shows.'],
    ['Test scores from 52 to 98. Which display keeps every score and groups them by tens?', 'Stem-and-Leaf Plot', ['Histogram', 'Stem-and-Leaf Plot', 'Pie Chart']],
    ['Which display does NOT fit the heights of 25 students?', 'Pie Chart', ['Dot Plot', 'Histogram', 'Pie Chart'], 'Heights are amounts, not parts of one whole, so a pie chart means nothing. Dot plots and histograms fit numbers.'],
    ['Which display lets you find the exact median of 15 shoe sizes by counting?', 'Dot Plot', ['Dot Plot', 'Histogram', 'Pie Chart'], 'A dot plot keeps every value in order, so you can count to the middle one. A histogram only shows ranges.'],
  ];
  function whichNumQ(item) {
    const [q, right, opts, why] = item, msg = why || NREASON[right];
    return { prompt: q, ask: 'choice', choices: opts.map(d => ({ html: d, right: d === right, msg: d === right ? `Right! ${msg}` : `Not this one. ${NREASON[d]} Is that what the question asks for?` })),
      hints: ['Every value on a number line: a dot plot. Ranges: a histogram. Tens and ones: a stem-and-leaf plot.'], answer: msg };
  }
  // ---------- Level 4 ----------
  const CAT_KEYS = ['eyes', 'subject', 'spinner', 'marbles', 'coins'];
  const PIE_N = [12, 20, 24];
  const L4 = { n: 4, title: 'Showing Categories', themes: [
    { key: 'bar', title: 'Bar Graph', make: (seed, ex) => barTask(ex ? make('subject', 3, 24) : make(rng(seed).pick([...CAT_KEYS, 'pets', 'siblings']), seed, rng(seed + 1).int(16, 30))),
      intro: 'A bar graph shows each count as a bar against a scale. Choose a scale that fits, then line each bar up with its count.' },
    { key: 'pie', title: 'Pie Chart', make: (seed, ex) => pieTask(ex ? make('spinner', 5, 20, { kind: 'big' }) : make(rng(seed).pick(CAT_KEYS), seed, rng(seed + 1).pick(PIE_N))),
      intro: 'A pie chart shows each category’s share of one whole. With 20 values, each value is 1/20 of the circle.' },
    { key: 'read', title: 'Read a Graph', make: (seed, ex) => (ex ? readBarTask(make('eyes', 8, 26), 1) : (rng(seed)() < 0.6 ? readBarTask(make(rng(seed).pick(CAT_KEYS), seed, rng(seed + 1).int(18, 30)), seed) : pieFractionTask(make(rng(seed).pick(CAT_KEYS), seed, rng(seed + 1).pick(PIE_N)), seed))),
      intro: 'Read a bar against its scale. Read a slice as its share of the whole.' },
    { key: 'which', title: 'Which Display?', make: (seed, ex) => (ex ? whichQ(WHICH[0]) : rng(seed)() < 0.7 ? whichQ(rng(seed).pick(WHICH)) : misfitQ(rng(seed), ['height', 'reaction', 'scores'], 'pie')),
      intro: 'Counts on a scale: a bar graph. Shares of one whole: a pie chart. Change over time: a line graph.' },
  ], check: seed => { const r = rng(seed), s = () => T.seedOf(r); return [whichQ(r.pick(WHICH)), readBarTask(make(r.pick(CAT_KEYS), s(), r.int(18, 30)), s()), pieFractionTask(make(r.pick(CAT_KEYS), s(), r.pick(PIE_N)), s()), misfitQ(r, ['height', 'reaction', 'screen', 'weather'], r.pick(['pie', 'bar']))]; } };
  T.LEVELS.push(L4);

  // ---------- Level 5 ----------
  const DOT_KEYS = ['dice', 'siblings', 'pets', 'shoes', 'freethrows', 'sleep'];
  const HIST_KEYS = ['height', 'points', 'scores', 'reaction'];
  const STEM_KEYS = ['height', 'points', 'scores', 'reunion'];
  // Data made until the display fits it (and, for histograms, until a good width exists).
  const fitting = (keys, type, nLo, nHi) => seed => { const r = rng(seed), key = r.pick(keys); return T.makeWhere(key, r, r.int(nLo, nHi), v => fitOf({ key, values: v, o: Data.optsOf(key) }, type).fit); };
  const dotSet = fitting(DOT_KEYS, 'dot', 12, 22), histSet = fitting(HIST_KEYS, 'hist', 20, 30), stemSet = fitting(STEM_KEYS, 'stem', 12, 18), medSet = fitting(DOT_KEYS, 'dot', 11, 21);
  const L5 = { n: 5, title: 'Showing Numbers', themes: [
    { key: 'dot', title: 'Dot Plot', make: (seed, ex) => dotTask(ex ? make('siblings', 4, 14) : dotSet(seed)),
      intro: 'A dot plot puts one dot above the number line for each value. Equal values stack up.' },
    { key: 'hist', title: 'Histogram', make: (seed, ex) => histTask(ex ? make('points', 6, 24) : histSet(seed)),
      intro: 'A histogram groups the values into ranges of equal width (bins). Each bar counts the values in its range, and the bars touch.' },
    { key: 'stem', title: 'Stem-and-Leaf', make: (seed, ex) => stemTask(ex ? make('scores', 2, 14, { test: 'hard' }) : stemSet(seed)),
      intro: 'A stem-and-leaf plot splits each value: the tens are the stem, the ones digit is the leaf. It keeps every value, in order.' },
    { key: 'median', title: 'Median on a Dot Plot', make: (seed, ex) => medianDotTask(ex ? make('pets', 9, 15) : medSet(seed)),
      intro: 'A dot plot is already in order from left to right, so the median is the middle dot.' },
    { key: 'which', title: 'Which Display?', make: (seed, ex) => (ex ? whichNumQ(WHICH_NUM[0]) : rng(seed)() < 0.6 ? whichNumQ(rng(seed).pick(WHICH_NUM)) : numMisfit(rng(seed))),
      intro: 'Every value on a number line: a dot plot. Ranges: a histogram. Tens and ones: a stem-and-leaf plot.' },
  ], check: seed => { const r = rng(seed), s = () => T.seedOf(r); return [whichNumQ(r.pick(WHICH_NUM)), medianDotTask(medSet(s())), readHistTask(histSet(s()), s()), numMisfit(r)]; } };
  // A number-display misfit: a dot plot, histogram or stem-and-leaf plot of data it doesn't fit.
  function numMisfit(r) {
    const type = r.pick(['dot', 'hist', 'stem']);
    const keys = { dot: ['eyes', 'reaction', 'screen'], hist: ['dice', 'siblings', 'subject'], stem: ['dice', 'siblings', 'coins'] }[type];
    return misfitQ(r, keys, type);
  }
  T.LEVELS.push(L5);

  // ---------- The Lab: draw a display of your own data ----------
  // A fit is drawn by the student; a misfit is drawn by the tool, with a question.
  function labTask(set, type) {
    if (!fitOf(set, type).fit) return misfitTask(set, type);
    return { bar: barTask, pie: pieTask, dot: dotTask, hist: histTask, stem: stemTask }[type](set);
  }

  return { STEPS, scaleVerdict, stepsFor, goodStep, topFor, checkBar, checkPie, pieStep, barTask, pieTask, readBarTask, pieFractionTask, WHICH, whichQ, fitOf, misfitTask, chartOf, chartFor, labTask, checkNumber,
    ticksOf, binsOf, grainOf, widthVerdict, widthsFor, goodWidth, stemRows, dotTask, histTask, stemTask, medianDotTask, readHistTask, WHICH_NUM, whichNumQ };
})();
