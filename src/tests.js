/* Tests for the Data Coach engine. Open data-coach-tests.html; results show on the page and in
   window.testSummary. */
(() => {
  'use strict';
  const results = [];
  const t = (name, fn) => {
    try { const r = fn(); results.push({ name, ok: r === true, info: r === true ? '' : String(r) }); }
    catch (e) { results.push({ name, ok: false, info: 'threw: ' + e.message }); }
  };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const { mean, median, modes, read, checkMean, checkMedian, checkMode, fmt } = Stats;
  const st = r => r.status;
  let sets = 0;

  // ---------- The measures, against plain reference calculations ----------
  // Reference: the median by counting (a value with at least half the list at or below it and at or above it).
  const refMedian = v => {
    const s = v.slice().sort((a, b) => a - b), n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  };
  const refModes = v => {
    const c = {}; v.forEach(x => { c[x] = (c[x] || 0) + 1; });
    const top = Math.max(...Object.values(c));
    return top < 2 ? [] : Object.keys(c).filter(k => c[k] === top).map(Number).sort((a, b) => a - b);
  };
  t('mean, median and mode agree with reference calculations on 600 made-up data sets', () => {
    const keys = ['dice', 'height', 'shoes', 'reunion', 'weather'];
    for (let i = 0; i < 600; i++) {
      const s = Data.make(keys[i % keys.length], 1000 + i), v = s.values; sets++;
      const m = v.reduce((a, b) => a + b, 0) / v.length;
      if (!near(mean(v), m)) return `mean of ${v}`;
      if (!near(median(v), refMedian(v))) return `median of ${v}: ${median(v)}`;
      if (modes(v).join() !== refModes(v).join()) return `modes of ${v}: ${modes(v)} vs ${refModes(v)}`;
      if (Stats.range(v) !== Math.max(...v) - Math.min(...v)) return `range of ${v}`;
    }
    return true;
  });
  t('edge cases: even counts, ties, no mode, one value', () => {
    return median([4, 1, 3, 2]) === 2.5 && median([5]) === 5 && modes([1, 2, 3]).length === 0 && modes([2, 2, 3, 3, 1]).join() === '2,3'
      && modes([7, 7, 7]).join() === '7' && modes(['Heads', 'Tails', 'Tails']).join() === 'Tails' && near(mean([1, 2, 2]), 5 / 3) || 'edge case wrong';
  });
  t('a frequency table expands back to its list, and counts every value', () => {
    for (let i = 0; i < 200; i++) {
      const s = Data.make(['coins', 'eyes', 'dice', 'shoes'][i % 4], 50 + i), cats = Data.catsOf(s), c = Stats.freq(s.values, cats);
      if (c.reduce((a, b) => a + b, 0) !== s.values.length) return `counts of ${s.key} ${i} do not add up`;
      if (Stats.sorted(Stats.expand(cats, c)).join() !== Stats.sorted(s.values).join()) return `${s.key} ${i} does not expand back`;
    }
    return true;
  });
  // Every scenario with every setting choice (the others at their defaults).
  const variants = () => Object.entries(Data.SCENARIOS).flatMap(([k, sc]) => [{ k, o: {} }, ...(sc.opts || []).flatMap(op => op.choices.map(([v]) => ({ k, o: { [op.key]: v } })))]);
  t('every scenario and setting makes values of its kind, in its size range, the same way for the same seed', () => {
    for (const { k, o } of variants()) {
      const sc = Data.SCENARIOS[k];
      for (let i = 0; i < 30; i++) {
        const s = Data.make(k, i, undefined, o), again = Data.make(k, i, undefined, o); sets++;
        if (s.values.join() !== again.values.join()) return `${k} is not repeatable`;
        if (s.values.length < sc.n[0] || s.values.length > sc.n[1]) return `${k} made ${s.values.length} values`;
        if (sc.kind === 'cat' ? s.values.some(x => typeof x !== 'string') : s.values.some(x => typeof x !== 'number' || !Number.isFinite(x))) return `${k} made a value of the wrong kind`;
        if (s.values.some(x => !Data.catsOf(s).includes(x))) return `${k} ${JSON.stringify(o)}: a value has no row in its table`;
      }
      for (const n of sc.sizes) if (Data.make(k, 99, n, o).values.length !== n) return `${k} did not make ${n} values`;
    }
    return true;
  });
  t('the scenarios behave like the real thing: a weighted coin, two dice, a growing plant, skewed times', () => {
    const share = (k, o, n, x) => Data.make(k, 5, n, o).values.filter(y => y === x).length / n;
    const fair = share('coins', { heads: '50' }, 500, 'Heads'), trick = share('coins', { heads: '90' }, 500, 'Heads');
    const two = Data.make('dice', 6, 500, { dice: '2' }).values, sevens = two.filter(x => x === 7).length / 500, twos = two.filter(x => x === 2).length / 500;
    const plant = Data.make('plant', 7, 20, { light: 'sun' }).values, grows = plant.every((x, i) => i === 0 || x >= plant[i - 1]);
    const sun = Data.make('plant', 7, 20, { light: 'sun' }).values[19], shade = Data.make('plant', 7, 20, { light: 'shade' }).values[19];
    const scr = Data.make('screen', 8, 300).values, skewRight = mean(scr) > median(scr);
    const big = share('spinner', { kind: 'big' }, 500, 'Red');
    if (!(fair > 0.4 && fair < 0.6 && trick > 0.82)) return `coins: fair ${fair}, trick ${trick}`;
    if (!(Math.min(...two) >= 2 && Math.max(...two) <= 12 && sevens > twos)) return 'two dice';
    if (!(grows && sun > shade)) return 'plant';
    if (!skewRight) return 'screen time is not skewed right';
    if (!(big > 0.3)) return `spinner red share ${big}`;
    return true;
  });
  t('the Lab menu lists every scenario once, in its group', () => {
    const inGroups = Data.GROUPS.flatMap(g => Object.keys(Data.SCENARIOS).filter(k => Data.SCENARIOS[k].group === g));
    return inGroups.length === Object.keys(Data.SCENARIOS).length && Object.keys(Data.SCENARIOS).length >= 20 || `${inGroups.length} of ${Object.keys(Data.SCENARIOS).length}`;
  });

  // ---------- Reading answers ----------
  t('typed answers are read as students write them', () => {
    const cases = [['62', [62]], ['62.5', [62.5]], ['−3', [-3]], ['62 1/2', [62.5]], ['125/2', [62.5]], [' 7 ', [7]], ['3 and 5', [3, 5]], ['3, 5', [3, 5]], ['3 & 5', [3, 5]], ['.5', [0.5]], ['4.', [4]]];
    for (const [s, want] of cases) { const a = read(s); if (!a.nums || a.nums.join() !== want.join()) return `"${s}" read as ${JSON.stringify(a)}`; }
    const loose = [['60 inches', [60]], ['about 4.2', [4.2]], ['≈ 4.2', [4.2]], ['7 or 8', [7, 8]], ['64°F', [64]], ['4.10', [4.1]]];
    for (const [s, want] of loose) { const a = read(s); if (!a.nums || a.nums.join() !== want.join()) return `"${s}" read as ${JSON.stringify(a)}`; }
    return read('no mode').none && read('None').none && read('There is no mode.').none && read('there’s no mode').none && read('no modes').none && read('tails', ['Heads', 'Tails']).cat === 'Tails'
      && read('Blue and Brown', ['Brown', 'Blue']).nums.join() === 'Blue,Brown' && !!read('abc').error && !!read('').error || 'words or errors misread';
  });
  t('reviewer cases: "7, 7" is not two modes; "4.10" is a right rounded mean; a mean that ends is shown exactly', () => {
    const shoes = [8, 7, 6, 8, 9, 8, 7, 11, 5, 7], a = checkMode('7, 7', shoes);       // modes 7 and 8
    const b = checkMean('4.10', Stats.expand([1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 3]));   // 73/18 = 4.0555...
    const c = checkMean('31.6', [30, 31, 32, 33, 30, 31, 32, 34]);                        // 253/8 = 31.625 exactly
    const d = Stats.meanText(253 / 8), e = Stats.cut(62 + 2 / 3);
    return a.status === 'almost' && b.status === 'right' && c.status === 'right' && /Exactly, it is 31.625/.test(c.msg) && d === '31.625' && e === '62.666…' || JSON.stringify([a, b, c, d, e]);
  });
  t('a count given as the mode is named only when it can’t be a value too', () => {
    const v = [3, 5, 3, 5, 2, 8, 9], r = checkMode('2', v);         // 2 is a value here (once), and also how often 3 and 5 appear
    return r.status === 'wrong' && /appears only 1 time/.test(r.msg) || JSON.stringify(r);
  });

  // ---------- Checking: right answers in every form, and the named slips ----------
  t('a right mean is right exactly, as a fraction, or rounded to the tenth or hundredth', () => {
    const v = [3, 4, 4, 6, 7, 9];            // mean 33/6 = 5.5
    const w = [2, 3, 3, 5, 6, 8];            // mean 27/6 = 4.5
    const r = [1, 2, 2, 4];                  // mean 9/4 = 2.25
    const q = [60, 61, 61, 64, 65, 62];      // mean 373/6 = 62.1666...
    const ok = [[v, '5.5'], [v, '5 1/2'], [v, '11/2'], [v, '5.50'], [w, '4.5'], [r, '2.25'], [r, '2 1/4'], [q, '62.2'], [q, '62.17'], [q, '373/6'], [q, '62 1/6']];
    for (const [d, s] of ok) if (st(checkMean(s, d)) !== 'right') return `"${s}" for ${d} gave ${JSON.stringify(checkMean(s, d))}`;
    return true;
  });
  t('mean slips are named: the total, rounding to a whole, cutting off, the wrong count, the median', () => {
    const q = [60, 61, 61, 64, 65, 62];      // total 373, mean 62.1666..., median 61.5
    const want = [['373', 'wrong', /total/], ['62', 'almost', /nearest tenth/], ['62.16', 'almost', /round instead/], ['74.6', 'wrong', /Count the values/], ['61.5', 'wrong', /median/], ['63', 'wrong', /Not quite/], ['no mode', 'wrong', /Every list/]];
    for (const [s, k, re] of want) { const r = checkMean(s, q); if (r.status !== k || !re.test(r.msg)) return `"${s}": ${JSON.stringify(r)}`; }
    return true;
  });
  t('median slips are named: not sorted, one of the two middles, its place, the mean', () => {
    const odd = [9, 2, 7, 4, 5], even = [8, 3, 10, 1, 4, 6];     // sorted 2 4 5 7 9 (median 5); 1 3 4 6 8 10 (median 5; as written, the middle two are 10 and 1)
    const want = [[odd, '5', 'right', /Right/], [odd, '7', 'wrong', /in order first/], [odd, '3', 'wrong', /where the median sits/], [odd, '5.4', 'wrong', /mean/],
      [even, '5', 'right', /Right/], [even, '4', 'almost', /halfway/], [even, '6', 'almost', /halfway/], [even, '5.5', 'wrong', /in order first/], [even, '3.5', 'wrong', /where the middle is/]];
    for (const [d, s, k, re] of want) { const r = checkMedian(s, d); if (r.status !== k || !re.test(r.msg)) return `"${s}" for ${d}: ${JSON.stringify(r)}`; }
    return true;
  });
  t('mode: one, two, none and categories are right; a count, half a tie and a wrong "no mode" are named', () => {
    const want = [[[3, 5, 5, 2, 5], '5', 'right'], [[3, 3, 6, 6, 1], '3 and 6', 'right'], [[3, 3, 6, 6, 1], '6, 3', 'right'], [[3, 3, 6, 6, 1], '3', 'almost'], [[1, 4, 7, 9], 'no mode', 'right'], [[1, 4, 7, 9], '1', 'wrong'],
      [[3, 5, 5, 2, 5], '3', 'wrong'], [[3, 5, 5, 2, 5], 'no mode', 'wrong'], [['Brown', 'Blue', 'Brown'], 'brown', 'right'], [['Brown', 'Blue', 'Brown'], 'Blue', 'wrong']];
    for (const [d, s, k] of want) { const r = checkMode(s, d, { cats: [...new Set(d)] }); if (r.status !== k) return `"${s}" for ${d}: ${JSON.stringify(r)}`; }
    const r = checkMode('3', [3, 5, 5, 2, 5]), c = checkMode('3', [4, 4, 4, 1, 2]);
    return /how many times/.test(c.msg) && c.status === 'wrong' && r.status === 'wrong' || JSON.stringify([r, c]);
  });
  t('from a table: the mean of the counts and the values column, and a count given as the mode, are named', () => {
    const cats = [1, 2, 3, 4, 5, 6], cnts = [2, 5, 3, 1, 1, 0], v = Stats.expand(cats, cnts), ctx = { table: true, cats, cnts };   // 12 values, total 30, mean 2.5, median 2, mode 2
    const a = checkMean('2', v, ctx), b = checkMean('3.5', v, ctx), c = checkMode('5', v, ctx), d = checkMedian('3.5', v, ctx), e = checkMean('2.5', v, ctx);
    return /mean of the counts/.test(a.msg) && /values column/.test(b.msg) && c.status === 'wrong' && /how many times|count/.test(c.msg) && /values column/.test(d.msg) && e.status === 'right' || JSON.stringify([a, b, c, d, e]);
  });

  // ---------- Every lesson question, on many seeds ----------
  // The right answer, typed several ways, is always accepted (the coach never calls a right answer wrong).
  const asTyped = (task) => {
    if (task.want !== undefined) return [task.want];
    const v = task.set.values, out = [];
    if (/mean/i.test(task.prompt)) { const m = mean(v); out.push(String(m)); if (!Stats.terminates(m)) out.push(fmt(Stats.round(m, 1))); }
    else if (/median/i.test(task.prompt)) out.push(String(median(v)));
    else if (/mode/i.test(task.prompt)) { const M = modes(v); out.push(M.length ? M.join(' and ') : 'no mode'); if (M.length > 1) out.push(M.slice().reverse().join(', ')); }
    return out;
  };
  t('every theme makes a question on 150 seeds, and its right answer is accepted', () => {
    let made = 0;
    for (const lv of Tasks.LEVELS) for (const th of lv.themes) for (let s = 0; s < 150; s++) {
      const task = th.make(7000 + s, false); made++;
      if (!task.prompt) return `${lv.n} ${th.key} ${s}: no prompt`;
      if (task.ask === 'choice' && task.choices.filter(c => c.right).length !== 1) return `${lv.n} ${th.key} ${s}: ${task.choices.filter(c => c.right).length} right choices`;
      if (task.ask === 'multi' && !task.choices.some(c => c.right)) return `${lv.n} ${th.key} ${s}: no right choice`;
      if (task.ask === 'answer') for (const a of asTyped(task)) { const r = task.check(a); if (r.status !== 'right') return `${lv.n} ${th.key} ${s}: "${a}" for ${task.set.values} gave ${JSON.stringify(r)}`; }
      if (task.ask === 'tally' || task.ask === 'table') { if (task.set.values.some(x => !task.cats.includes(x))) return `${lv.n} ${th.key} ${s}: a value has no row`; }
    }
    return made > 1000 || made;
  });
  t('worked examples are the same every time, and each one runs to its answer', () => {
    for (const lv of Tasks.LEVELS) for (const th of lv.themes) {
      const a = th.make(0, true), b = th.make(1, true);
      if (a.prompt !== b.prompt || JSON.stringify(a.data) !== JSON.stringify(b.data)) return `${lv.n} ${th.key}: the example changes`;
      if (a.ask === 'answer' && !(a.steps && a.steps.length)) return `${lv.n} ${th.key}: the example has no steps`;
    }
    return true;
  });
  t('the worked examples teach what their theme is about', () => {
    const L3 = Tasks.level(3).themes, ex = k => L3.find(x => x.key === k).make(0, true);
    const mn = ex('mean'), md = ex('median'), mo = ex('mode'), tb = ex('fromtable'), s = Stats.sorted(md.set.values), n = s.length;
    return !Stats.ends(mean(mn.set.values)) && mn.steps.some(x => /≈/.test(x.html))                         // the mean example shows rounding
      && n % 2 === 0 && s[n / 2 - 1] !== s[n / 2] && s.join() !== md.set.values.join()                   // even count, two different middles, not in order
      && modes(mo.set.values).length === 2 && mean(tb.set.values) === 3 && tb.data.table.cnts.join() === '2,3,2,4,0,1'   // the table on the pages
      && Tasks.level(1).themes[2].make(0, true).choices.filter(c => c.right).map(c => c.html).join() === 'Mode' || 'an example misses its point';
  });
  t('a worked mean never writes a rounded number as if it were cut off', () => {
    for (let s = 0; s < 200; s++) {
      const q = Tasks.meanQ('reunion', 800 + s), m = mean(q.set.values), div = q.steps[2].html.split('= ')[1];
      if (Stats.ends(m) ? div !== Stats.exact(m) : !(div.endsWith('…') && parseFloat(div) === Math.trunc(m * 1000) / 1000)) return `${q.set.values}: ${div}`;
    }
    return true;
  });
  t('the Level 2 check keeps zero rows, and has a distractor whose total is right', () => {
    let zeros = 0;
    for (let s = 0; s < 100; s++) {
      const q = Tasks.tableCheck(3000 + s), right = q.choices.find(c => c.right);
      if (!q.choices.some(c => !c.right && /swapped/.test(c.msg))) return `${s}: no swapped-counts choice`;
      if (q.choices.some(c => /<table/.test(c.html))) return 'a table inside a button';
      const totals = q.choices.map(c => c.html.match(/Total: (\d+)/)[1]);
      if (totals.filter(x => x === totals[0]).length < 2) return `${s}: only the right choice has the right total`;
      if (/: 0[,.]/.test(right.html)) zeros++;       // a value nobody had, kept as a row with 0
    }
    return zeros > 0 || 'no check ever showed a zero row';
  });
  t('mode questions come in all three cases: one mode, two modes, no mode', () => {
    const seen = new Set();
    for (let s = 0; s < 120; s++) { const q = Tasks.modeQ('shoes', 300 + s); seen.add(modes(q.set.values).length); }
    return seen.has(0) && seen.has(1) && seen.has(2) || [...seen].join();
  });
  t('median questions come with odd and even counts, never already in order', () => {
    const seen = new Set();
    for (let s = 0; s < 80; s++) { const q = Tasks.medianQ('dice', 500 + s); seen.add(q.set.values.length % 2); if (Stats.sorted(q.set.values).join() === q.set.values.join()) return 'a list was already in order'; }
    return seen.size === 2 || 'only one parity';
  });

  t('oversight case: a mean that ends at the 4th decimal (68.5 ÷ 8 = 8.5625) is shown exactly, never as "doesn’t end"', () => {
    const v = [8, 8.5, 9, 8.5, 9, 9, 8.5, 8], q = Tasks.meanTask({ key: 'sleep', seed: 0, o: { who: 'ms' }, values: v });
    const div = q.steps[2], last = q.steps[3], r = checkMean('8.5625', v), r2 = checkMean('8.6', v);
    return Stats.ends(8.5625) && Stats.meanText(8.5625) === '8.5625' && div.html.endsWith('= 8.5625') && !/doesn’t end/.test(div.why) && last.html === 'Mean = 8.5625'
      && q.answer === 'The mean is 8.5625.' && r.status === 'right' && r2.status === 'right' && /Exactly, it is 8.5625/.test(r2.msg) && !Stats.ends(25 / 6) || JSON.stringify([div, last, q.answer, r2]);
  });
  t('a big repeating mean is never called exact (2260 ÷ 9; 82 games; 30 reaction times), and big means that end are', () => {
    if (Stats.ends(2260 / 9) || /Exactly/.test(checkMean('251.1', [250, 250, 250, 250, 250, 250, 250, 250, 260]).msg)) return '2260/9 called exact';
    for (let k = 4000; k < 6000; k++) if (Stats.ends(k / 82) !== (k % 41 === 0)) return `${k}/82`;
    for (let k = 9000; k < 18000; k += 10) if (Stats.ends(k / 3) !== (k % 3 === 0)) return `${k}/3`;
    for (let s = 0; s < 300; s++) {                     // tenths data, up to 500 values: a mean ends exactly when 10n's leftover factors are 2s and 5s
      const v = Data.make('run', s, [10, 20, 30, 50, 100][s % 5]).values, k = Math.round(v.reduce((a, b) => a + b, 0) * 10), d = 10 * v.length;
      const g = (a, b) => (b ? g(b, a % b) : a); let q = d / g(k, d); while (q % 2 === 0) q /= 2; while (q % 5 === 0) q /= 5;
      if (Stats.ends(mean(v)) !== (q === 1)) return `run times seed ${s}: ${k}/${d}`;
    }
    return true;
  });
  t('no measures reason says categories have "no order" (birth months do), and months and jerseys are left out of Which Measures Fit', () => {
    for (const k of Tasks.KINDS.filter(x => x[2] === 'cat')) { const q = Tasks.measuresQ(k); if (/no order/.test(q.msg)) return k[0]; }
    for (let s = 0; s < 200; s++) { const q = Tasks.level(1).themes[2].make(s, false); if (/Birth months|Jersey/.test(q.prompt)) return `seed ${s}: ${q.prompt}`; }
    return true;
  });
  t('a median slip about the middle’s place is named only when that number isn’t a value in the data', () => {
    const r = checkMedian('4', [2, 6, 5, 1, 6, 4, 6]), r2 = checkMedian('4', [9, 2, 7, 3, 5, 11, 8]);   // medians 5 and 7; 4 is a value in the first list only
    return !/where the median sits/.test(r.msg) && /where the median sits/.test(r2.msg) || JSON.stringify([r, r2]);
  });
  t('daily temperatures stay within real limits, even over 60 days', () => {
    for (let s = 0; s < 300; s++) { const v = Data.make('weather', s, 60).values; if (Math.max(...v) > 95 || Math.min(...v) < 25) return `seed ${s}: ${Math.min(...v)} to ${Math.max(...v)}`; }
    return true;
  });

  // ---------- Pictures ----------
  t('every kind of data has an icon, and every color category has a color', () => {
    for (const k of Object.keys(Data.SCENARIOS)) if (!/<svg/.test(Pics.icon(k))) return `${k} has no icon`;
    for (const { k, o } of variants()) {
      const sc = Data.SCENARIOS[k]; if (sc.kind !== 'cat') continue;
      for (const c of sc.cats(Data.optsOf(k, o))) if (['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Brown', 'Hazel', 'Gray'].includes(c) && !Pics.COLOR[c]) return `${c} has no color`;
    }
    return true;
  });
  t('a picture never hides its value: coins and colors keep their names, a die face carries its number for screen readers', () => {
    const coin = Pics.value({ key: 'coins', o: { heads: '50' } }, 'Heads'), die = Pics.value({ key: 'dice', o: { dice: '1' } }, 4), sum = Pics.value({ key: 'dice', o: { dice: '2' } }, 9);
    const red = Pics.value({ key: 'marbles', o: { bag: 'even' } }, 'Red'), plain = Pics.value({ key: 'height', o: { grade: '6' } }, 61);
    const shown = h => h.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '');
    return /Heads/.test(shown(coin.html)) && die.label === '4' && /aria-hidden/.test(die.html) && sum === null && /Red/.test(shown(red.html)) && plain === null || 'a value is hidden by its picture';
  });

  // ---------- Level 4: bar graphs and pie charts ----------
  t('a bar graph’s scale: too crowded and too few lines are refused, a good step always exists', () => {
    const D = Displays;
    if (D.scaleVerdict(1, 30).ok || D.scaleVerdict(10, 9).ok || !D.scaleVerdict(2, 9).ok || !D.scaleVerdict(1, 9).ok || !D.scaleVerdict(1, 2).ok) return 'verdicts wrong';
    for (let max = 1; max <= 500; max++) { const g = D.goodStep(max); if (!g || !D.scaleVerdict(g, max).ok || !D.stepsFor(max).includes(g) || D.topFor(g, max) <= max) return `max ${max}: step ${g}`; }
    return true;
  });
  t('a bar graph is checked bar by bar; a scale read as 1 per line is named', () => {
    const D = Displays, cats = ['A', 'B', 'C'], counts = [6, 4, 8];
    const right = D.checkBar([6, 4, 8], 2, cats, counts), lines = D.checkBar([3, 2, 4], 2, cats, counts), one = D.checkBar([6, 5, 8], 2, cats, counts);
    return right.status === 'right' && lines.status === 'wrong' && /worth 2/.test(lines.msg) && one.status === 'wrong' && /bar for B/.test(one.msg) || JSON.stringify([right, lines, one]);
  });
  t('a pie chart is checked slice by slice', () => {
    const D = Displays, r = D.checkPie([7, 13], ['Heads', 'Tails'], [7, 13]), w = D.checkPie([10, 10], ['Heads', 'Tails'], [7, 13]);
    return r.status === 'right' && w.status === 'wrong' && /Heads and Tails/.test(w.msg) && /20 equal parts/.test(w.msg) || JSON.stringify([r, w]);
  });
  t('fractions of a whole: 7/20, 0.35, 35%, "7 out of 20" are right; the count alone and an upside-down fraction are named', () => {
    const f = s => Stats.checkFraction(s, 7, 20, 'Red');
    const ok = ['7/20', '0.35', '35%', '35 percent', '7 out of 20', '14/40'].every(s => f(s).status === 'right');
    const near = Stats.checkFraction('33%', 1, 3, 'Red').status === 'right';
    return ok && near && /how many were Red/.test(f('7').msg) && /upside down/.test(f('20/7').msg) && f('0.07').status === 'wrong' || JSON.stringify(['7', '20/7', '0.07'].map(f));
  });
  t('reading a graph: every question’s right answer is accepted, on 200 seeds', () => {
    for (let s = 0; s < 200; s++) {
      const q = Tasks.level(4).themes.find(x => x.key === 'read').make(1000 + s, false), r = q.check(q.want);
      if (r.status !== 'right') return `${q.prompt} "${q.want}": ${JSON.stringify(r)}`;
    }
    return true;
  });
  t('drawing tasks: the counts add up, a good scale exists, and a pie fits by hand (60 values or fewer)', () => {
    for (let s = 0; s < 150; s++) for (const key of ['bar', 'pie']) {
      const q = Tasks.level(4).themes.find(x => x.key === key).make(2000 + s, false);
      if (q.counts.reduce((a, b) => a + b, 0) !== q.set.values.length) return `${key} ${s}: counts`;
      if (key === 'bar' && !q.good) return `${key} ${s}: no good scale`;
      if (key === 'pie' && q.n > 60) return `${key} ${s}: too many parts`;
    }
    return true;
  });
  t('which display fits: categories take bars and pies; numbers no pie; time neither; every misfit has one right reason', () => {
    for (const { k, o } of variants()) for (const type of ['bar', 'pie']) {
      const set = Data.make(k, 21, 30, o), f = Displays.fitOf(set, type), kind = Data.kindOf(set);
      if (kind === 'cat' && !f.fit) return `${k} ${type} should fit`;
      if (kind === 'time' && f.fit) return `${k} ${type} should not fit (time)`;
      if (kind === 'num' && type === 'pie' && f.fit) return `${k}: a pie of numbers`;
      const q = Displays.labTask(set, type);
      if (!f.fit && (q.ask !== 'choice' || q.choices.filter(c => c.right).length !== 1 || !q.data.chart)) return `${k} ${type}: misfit question`;
      if (f.fit && q.ask !== type) return `${k} ${type}: should be drawn by the student`;
    }
    return true;
  });

  // ---------- Level 5: dot plots, histograms, stem-and-leaf plots ----------
  t('histogram bins: every value falls in exactly one bin, labels run first to last, and a good width exists for every histogram', () => {
    const D = Displays;
    for (const key of ['height', 'points', 'scores', 'reaction', 'screen', 'travel', 'run', 'sleep']) for (let s = 0; s < 40; s++) {
      const v = Data.make(key, s, 30).values;
      for (const w of D.widthsFor(v)) {
        const { bins, counts } = D.binsOf(v, w);
        if (counts.reduce((a, b) => a + b, 0) !== v.length) return `${key} ${s} width ${w}: counts add to ${counts.reduce((a, b) => a + b, 0)}`;
        if (bins.some((b, i) => i && Math.abs(b.a - bins[i - 1].a - w) > 1e-9)) return `${key} width ${w}: uneven bins`;
      }
      if (D.fitOf({ key, values: v, o: Data.optsOf(key) }, 'hist').fit && !D.widthVerdict(v, D.goodWidth(v)).ok) return `${key} ${s}: no good width`;
    }
    const v = [52, 55, 60, 61, 64, 65, 69, 70, 74, 79, 80], b5 = D.binsOf(v, 5);
    return b5.bins.map(b => b.label).join() === '50–54,55–59,60–64,65–69,70–74,75–79,80–84' && b5.counts.join() === '1,1,3,2,2,1,1' || JSON.stringify(b5);
  });
  t('stem-and-leaf rows give back every value, leaves in order; unordered leaves are Almost; a missing leaf is named', () => {
    for (let s = 0; s < 100; s++) {
      const v = Data.make('scores', s, 16).values, rows = Displays.stemRows(v), back = rows.flatMap(([st, l]) => l.map(x => st * 10 + x));
      if (back.join() !== Stats.sorted(v).join()) return `scores ${s}`;
    }
    const q = Displays.stemTask({ key: 'scores', seed: 0, o: { test: 'hard' }, values: [61, 58, 73, 66, 61, 70] });   // stems 5, 6, 7: 8 | 1 1 6 | 0 3
    return q.check(['8', '1 1 6', '0 3']).status === 'right' && q.check(['8', '6 1 1', '3 0']).status === 'almost' && q.check(['8', '1 6', '0 3']).status === 'wrong' && q.check(['8', '116', '03']).status === 'right' || 'stem checks';
  });
  t('Level 5: every theme makes a question on 120 seeds, and its right answer is accepted', () => {
    const L5 = Tasks.level(5);
    for (let s = 0; s < 120; s++) for (const th of L5.themes) {
      const q = th.make(3000 + s, false);
      if (q.ask === 'dot' && (q.counts.reduce((a, b) => a + b, 0) !== q.set.values.length || q.check(q.counts.slice()).status !== 'right')) return `dot ${s}`;
      if (q.ask === 'hist' && (!q.good || q.check(q.binsOf(q.good).counts, q.good).status !== 'right')) return `hist ${s}`;
      if (q.ask === 'stem' && q.check(q.rows.map(([st, l]) => l.join(' '))).status !== 'right') return `stem ${s}`;
      if (q.ask === 'answer' && q.check(String(Stats.median(q.set.values))).status !== 'right') return `median ${s}`;
      if (q.ask === 'choice' && q.choices.filter(c => c.right).length !== 1) return `which ${s}`;
    }
    for (let s = 0; s < 100; s++) { const q = Displays.readHistTask(Data.make('points', s, 25), s); if (q.check(q.want).status !== 'right') return `read hist ${s}: ${q.prompt}`; }
    return true;
  });
  t('every display on every kind of data: a fit is drawn by the student, a misfit by the tool, with one right reason that isn’t the longest choice by far', () => {
    for (const { k, o } of variants()) for (const type of ['bar', 'pie', 'dot', 'hist', 'stem']) for (const n of [20, 60]) {
      const set = Data.make(k, 31, n, o), f = Displays.fitOf(set, type), kind = Data.kindOf(set), q = Displays.labTask(set, type);
      if (kind === 'time' && f.fit) return `${k} ${type}: time data fits`;
      if (kind === 'cat' && ['dot', 'hist', 'stem'].includes(type) && f.fit) return `${k} ${type}: categories fit a number display`;
      if (f.fit && q.ask !== type) return `${k} ${type}: should be drawn by the student`;
      if (!f.fit) {
        if (q.ask !== 'choice' || q.choices.filter(c => c.right).length !== 1 || (!q.data.chart && !(type === 'stem' && kind === 'cat'))) return `${k} ${type}: misfit question`;
        const right = q.choices.find(c => c.right).html.length, other = Math.max(...q.choices.filter(c => !c.right).map(c => c.html.length));
        if (right > other * 1.6) return `${k} ${type}: the right reason is much the longest (${right} vs ${other})`;
      }
    }
    return true;
  });

  // ---------- Checkpoint 2 fixes ----------
  t('pie Show Next Step never makes a slice negative (oversight case [4,4,4,4,4] → counts 10,4,4,1,1)', () => {
    const counts = [10, 4, 4, 1, 1];
    let v = [4, 4, 4, 4, 4];
    for (let i = 0; i < 5; i++) { v = Displays.pieStep(v, counts, i); if (v.some(x => x < 0) || v.reduce((a, b) => a + b, 0) !== 20) return `step ${i}: ${v}`; }
    for (let s = 0; s < 300; s++) {
      const q = Tasks.level(4).themes.find(x => x.key === 'pie').make(500 + s, false), k = q.cats.length;
      let w = q.cats.map(() => Math.floor(q.n / k)); w[k - 1] += q.n - w.reduce((a, b) => a + b, 0);
      for (let i = 0; i < k; i++) { w = Displays.pieStep(w, q.counts, i); if (w.some(x => x < 0) || w.reduce((a, b) => a + b, 0) !== q.n) return `seed ${s} step ${i}: ${w}`; }
      if (w.join() !== q.counts.join()) return `seed ${s}: the last step is not the pie`;
    }
    return v.join() === counts.join() || v.join();
  });
  t('pie fractions: a correctly rounded decimal (hundredths) or percent is right (0.33, 33% for 4/12); 28.6% for 29.17%, 0.1 for 1/20 are not', () => {
    const f = (s, p, w) => Stats.checkFraction(s, p, w, 'Red').status;
    return f('0.33', 4, 12) === 'right' && f('33%', 4, 12) === 'right' && f('0.3', 4, 12) === 'wrong' && f('0.42', 5, 12) === 'right' && f('0.417', 5, 12) === 'right'
      && f('29%', 7, 24) === 'right' && f('29.2%', 7, 24) === 'right' && f('28.6%', 7, 24) === 'wrong' && f('0.41', 5, 12) === 'wrong' && f('0', 1, 3) === 'wrong'
      && f('0.1', 1, 20) === 'wrong' && f('0.0', 1, 24) === 'wrong' && f('0.05', 1, 20) === 'right' && f('0.04', 1, 24) === 'right' || 'fraction rounding';
  });
  t('histogram bins always span two or more steps: no label reads like "58–58"', () => {
    for (const key of ['height', 'points', 'scores', 'reaction', 'screen', 'run', 'sleep', 'travel']) for (let s = 0; s < 60; s++) {
      const v = Data.make(key, s, Data.SCENARIOS[key].n[1] + 15).values;
      for (const w of Displays.widthsFor(v)) for (const b of Displays.binsOf(v, w).bins) { const [a, z] = b.label.split('–'); if (a === z) return `${key} ${s} width ${w}: ${b.label}`; }
      const g = Displays.goodWidth(v); if (g) { const k = Displays.binsOf(v, g).bins.length; if (k > 12 || k < 4) return `${key} ${s}: good width ${g} makes ${k} bins`; }
    }
    return true;
  });
  t('stem-and-leaf works for tenths (14 | 7 means 14.7); categories get the question with no empty picture', () => {
    const run = Displays.stemTask({ key: 'run', seed: 0, o: {}, values: [14.7, 13.2, 14.1, 15.9, 13.8] });
    const rowsOk = run.rows.map(([s, l]) => `${s}:${l.join('')}`).join() === '13:28,14:17,15:9' && /tenths/.test(run.prompt) && /14 \| 7 means 14.7|13 \| 2 means 13.2/.test(run.prompt);
    const right = run.check(['2 8', '1 7', '9']).status === 'right';
    const coin = Displays.misfitTask(Data.make('coins', 3, 20), 'stem'), fitsRun = Displays.fitOf(Data.make('run', 4, 30), 'stem').fit;
    return rowsOk && right && !coin.data.chart && !!coin.data.list && fitsRun && /Someone wants/.test(coin.prompt) || JSON.stringify([run.rows, run.prompt, coin.prompt, fitsRun]);
  });
  t('no misfit reason says decimals can’t make a stem-and-leaf plot', () => {
    for (const { k, o } of variants()) { const f = Displays.fitOf(Data.make(k, 8, 30, o), 'stem'); if (!f.fit && /[Dd]ecimal/.test(f.why + f.short)) return k; }
    return true;
  });

  // ---------- Level 6: spread ----------
  t('quartiles leave the median out when the count is odd; the IQR, MAD, fences and five numbers are right', () => {
    const q7 = Stats.quartiles([1, 2, 3, 4, 5, 6, 7]), q8 = Stats.quartiles([8, 1, 7, 2, 6, 3, 5, 4]), w7 = Stats.quartilesWith([1, 2, 3, 4, 5, 6, 7]);
    const travel = [12, 15, 9, 14, 48, 11, 16, 13, 10], f = Stats.fiveNumber(travel);
    return q7.q1 === 2 && q7.q3 === 6 && q8.q1 === 2.5 && q8.q3 === 6.5 && w7.q1 === 2.5 && w7.q3 === 5.5 && Math.abs(Stats.mad([2, 4, 1, 5, 3]) - 1.2) < 1e-9
      && Stats.outliers(travel).join() === '48' && f.lo === 9 && f.q1 === 10.5 && f.med === 13 && f.q3 === 15.5 && f.hi === 16 || JSON.stringify([q7, q8, w7, f]);
  });
  t('Level 6: every theme makes a question on 120 seeds, and its right answer is accepted', () => {
    for (let s = 0; s < 120; s++) for (const th of Tasks.level(6).themes) {
      const q = th.make(5000 + s, false);
      if (q.ask === 'answer' && q.check(q.want).status !== 'right') return `${th.key} ${s}: "${q.want}" for ${q.set.values}: ${JSON.stringify(q.check(q.want))}`;
      if (q.ask === 'box' && q.check(q.want.slice()).status !== 'right') return `box ${s}`;
      if (q.ask === 'box' && (q.want.some(x => x < q.axis.lo || x > q.axis.hi))) return `box ${s}: a value off the axis`;
    }
    for (const lv of [6, 7]) for (let s = 0; s < 80; s++) for (const q of Tasks.level(lv).check(7000 + s)) {
      if (q.ask === 'choice' && q.choices.filter(c => c.right).length !== 1) return `L${lv} check ${s}: ${q.prompt}`;
      if (q.ask === 'answer' && q.want !== undefined && q.check(q.want).status !== 'right') return `L${lv} check ${s}: ${q.prompt} "${q.want}"`;
    }
    return true;
  });
  t('spread slips: the IQR by the other quartile method is Almost; Q3, the range and a total distance are named', () => {
    const v = [3, 9, 4, 12, 7, 6, 10], q = Spread.iqrTask({ key: 'height', seed: 0, o: { grade: '6' }, values: v });   // sorted 3 4 6 7 9 10 12: Q1 4, Q3 10, IQR 6; with the median in, 5 and 9.5, IQR 4.5
    const m = Spread.madTask({ key: 'siblings', seed: 0, o: {}, values: [2, 4, 1, 5, 3] });
    const o = Spread.outlierTask({ key: 'travel', seed: 0, o: {}, values: [12, 15, 9, 14, 48, 11, 16, 13, 10] });
    return q.check('6').status === 'right' && q.check('4.5').status === 'almost' && /Q3/.test(q.check('10').msg) && /range/.test(q.check('9').msg)
      && m.check('1.2').status === 'right' && /total distance/.test(m.check('6').msg) && /never negative/.test(m.check('0').msg)
      && o.check('48').status === 'right' && o.check('none').status === 'wrong' && /inside the fences/.test(o.check('16 and 48').msg) || 'spread slips';
  });

  // ---------- Level 7: change over time ----------
  t('Level 7: trends are clear, lines are drawable, and readings are accepted, on 120 seeds', () => {
    const up = Spread.trendOf([50, 52, 51, 55, 57, 56, 60, 62]).kind, down = Spread.trendOf([70, 66, 67, 62, 60, 58]).kind, flat = Spread.trendOf([60, 62, 59, 61, 60, 62, 59, 61]).kind;
    if (up !== 'up' || down !== 'down' || flat !== 'flat') return `trend kinds ${up} ${down} ${flat}`;
    for (let s = 0; s < 120; s++) for (const th of Tasks.level(7).themes) {
      const q = th.make(6000 + s, false);
      if (q.ask === 'line' && q.check(q.set.values.slice()).status !== 'right') return `line ${s}`;
      if (q.ask === 'line' && q.set.values.some(x => x < q.axis.lo || x > q.axis.hi)) return `line ${s}: a value off the axis`;
      if (q.ask === 'answer' && q.check(q.want).status !== 'right') return `${th.key} ${s}: ${q.prompt} "${q.want}"`;
      if (q.ask === 'choice' && q.choices.filter(c => c.right).length !== 1) return `${th.key} ${s}: ${q.prompt}`;
    }
    return true;
  });
  t('drags can reach every answer: box handles and line points move finely enough, and not too finely, for every scenario and size', () => {
    for (const { k, o } of variants()) for (const n of [9, 14, 20, 37, 60]) for (const s of [3, 8]) {
      const set = Data.make(k, s, n, o), kind = Data.kindOf(set);
      if (kind === 'num') {
        const q = Spread.boxTask(set), { lo, hi } = q.axis, near = q.want.map(x => +(Math.round(x / q.snap) * q.snap).toFixed(6));
        if (q.check(q.want.slice()).status !== 'right' || q.check(near).status !== 'right') return `${k} ${n}: box handles can't reach ${q.want} (snap ${q.snap})`;
        if ((hi - lo) / q.snap > 120) return `${k} ${n}: ${(hi - lo) / q.snap} handle places is too fine to drag`;
      }
      if (kind === 'time') {
        const q = Spread.labTask(set, 'line', s);
        if (n <= Spread.HAND) {
          const near = set.values.map(x => +(Math.round(x / q.snap) * q.snap).toFixed(6));
          if (q.ask !== 'line' || q.check(near).status !== 'right') return `${k} ${n}: line points can't reach the values`;
          if ((q.axis.hi - q.axis.lo) / q.snap > 80) return `${k} ${n}: line snap too fine`;
        } else if (q.ask === 'line') return `${k} ${n}: too many points to drag`;
        else if (q.ask === 'choice' ? q.choices.filter(c => c.right).length !== 1 : q.check(q.want).status !== 'right') return `${k} ${n}: the drawn line's question`;
      }
    }
    return true;
  });
  t('graph readings: a careful reading between lines is right, an exact one always is, and change questions never ask about no change', () => {
    for (let s = 0; s < 150; s++) for (const key of ['weather', 'plant', 'rainfall']) for (const n of [8, 14, 36]) {
      const set = Data.make(key, s, n), q = Spread.readLineTask(set, s), ax = Spread.lineAxis(set.values);
      if (q.ask !== 'answer') continue;
      const w = +q.want;
      if (q.check(q.want).status !== 'right') return `${key} ${s}: exact "${q.want}"`;
      if (/how much/.test(q.prompt) && w === 0) return `${key} ${s}: a change of 0`;
      if (/^About/.test(q.prompt) && q.check(String(+(w + ax.step / 4).toFixed(2))).status !== 'right') return `${key} ${s}: a close reading of ${q.want} (step ${ax.step}) not accepted`;
      const day = (q.prompt.match(/(?:on|in) (Day \d+|Wk \d+|[A-Z][a-z]{2})\?/) || [])[1];
      if (day && n > 20 && Spread.labelsOf(set).indexOf(day) % Math.ceil(n / 12)) return `${key} ${s}: asks about an unlabeled ${day}`;
    }
    for (let s = 0; s < 150; s++) {
      const set = Data.make(['height', 'run', 'sleep', 'reaction'][s % 4], s, 13), q = Spread.readBoxTask(set, s);
      if (q.ask === 'answer' && q.check(q.want).status !== 'right') return `box read ${s}: "${q.want}"`;
    }
    return true;
  });
  t('box plots and line graphs in the Lab: lines fit only data over time, box plots only numbers', () => {
    for (const { k, o } of variants()) for (const type of ['box', 'line']) {
      const set = Data.make(k, 41, type === 'line' ? Spread.HAND : 20, o), f = Spread.fitOf(set, type), kind = Data.kindOf(set), q = Spread.labTask(set, type);
      if (type === 'line' && f.fit !== (kind === 'time')) return `${k} line`;
      if (type === 'box' && f.fit !== (kind === 'num')) return `${k} box`;
      if (!f.fit && (q.ask !== 'choice' || q.choices.filter(c => c.right).length !== 1)) return `${k} ${type}: misfit question`;
      if (f.fit && q.ask !== type) return `${k} ${type}: should be drawn by the student`;
    }
    return true;
  });

  // ---------- Kinds of data ----------
  t('kinds of data: every item has one right kind; numbers used as names are categories', () => {
    for (const k of Tasks.KINDS) { const q = Tasks.kindQ(k); if (q.choices.filter(c => c.right).length !== 1) return k[0]; }
    const traps = Tasks.KINDS.filter(k => k[3]);
    return traps.length >= 3 && traps.every(k => k[2] === 'cat' && /numbers used as names/.test(Tasks.kindQ(k).answer)) || 'trap items wrong';
  });
  t('which measures fit: only the mode for categories; all three for numbers', () => {
    for (const k of Tasks.KINDS) {
      const q = Tasks.measuresQ(k), right = q.choices.filter(c => c.right).map(c => c.html).join();
      if (right !== (k[2] === 'cat' ? 'Mode' : 'Mean,Median,Mode')) return `${k[0]}: ${right}`;
    }
    return true;
  });
  t('statistical questions: the bank has both kinds, in pairs', () => {
    const yes = Tasks.STAT_Q.filter(q => q[1]).length, no = Tasks.STAT_Q.length - yes;
    return yes === no && yes >= 6 || `${yes} yes, ${no} no`;
  });

  // ---------- Checks ----------
  t('level checks: every question has one right answer and no repeated choices, on 100 seeds', () => {
    for (const lv of Tasks.LEVELS) for (let s = 0; s < 100; s++) {
      for (const q of lv.check(900 + s)) {
        if (q.ask === 'choice') {
          if (q.choices.filter(c => c.right).length !== 1) return `L${lv.n} ${s}: ${q.prompt}`;
          const texts = q.choices.map(c => c.html);
          if (new Set(texts).size !== texts.length) return `L${lv.n} ${s}: repeated choices ${texts}`;
          if (q.choices.length < 2) return `L${lv.n} ${s}: only one choice`;
        }
      }
    }
    return true;
  });
  t('Level 3 check: the right choice really is the mean, median, mode or table mean of its data', () => {
    const seen = new Set();
    for (let s = 0; s < 100; s++) {
      for (const which of ['mean', 'median', 'mode', 'table']) {
        const q = Tasks.centerCheck(4000 + s, which), right = q.choices.find(c => c.right).html;
        const v = q.data.list || Stats.expand(q.data.table.cats, q.data.table.cnts), M = modes(v);
        const want = which === 'mean' ? fmt(mean(v)) : which === 'median' ? fmt(median(v)) : which === 'table' ? Stats.exact(mean(v)) : M.length ? M.map(fmt).join(' and ') : 'No mode';
        if (right !== want) return `${which} ${s}: ${right} vs ${want} for ${v}`;
        if (which === 'mode') seen.add(M.length);
        if (which === 'median' && v.length % 2) return 'the median check has an odd count';
      }
    }
    return seen.size === 3 || `mode cases seen: ${[...seen]}`;
  });
  t('the Level 1 check mixes its answers: not always categories, not always all three measures', () => {
    const kinds = new Set(), measures = new Set();
    for (let s = 0; s < 60; s++) { const [, k, m] = Tasks.level(1).check(6000 + s); kinds.add(k.choices.find(c => c.right).html); measures.add(m.choices.filter(c => c.right).length); }
    return kinds.size === 3 && measures.size === 2 || `${[...kinds]} / ${[...measures]}`;
  });
  t('a wrong pick never shows the right answer’s reason (kinds, statistical questions)', () => {
    for (const k of Tasks.KINDS) { const q = Tasks.kindQ(k), right = q.choices.find(c => c.right); for (const c of q.choices.filter(x => !x.right)) if (c.msg === right.msg || /^Right/.test(c.msg)) return k[0]; }
    for (const item of Tasks.STAT_Q) { const q = Tasks.statQ(item); if (!/^Right!/.test(q.choices.find(c => c.right).msg) || !/^Not this one/.test(q.choices.find(c => !c.right).msg)) return item[0]; }
    return true;
  });

  // ---------- The Data Lab: Quiz Me on every scenario, small and large ----------
  t('Quiz Me asks a fitting question about any data, and its right answer is accepted', () => {
    let asked = 0;
    for (const { k, o } of variants()) for (const n of [Data.SCENARIOS[k].sizes[0], Data.SCENARIOS[k].sizes[Data.SCENARIOS[k].sizes.length - 1]]) for (let s = 0; s < 6; s++) {
      const set = Data.make(k, 70 + s, n, o), q = Tasks.quiz(set, 90 + s); asked++;
      const kind = Data.kindOf(set);
      if (kind === 'cat' && /mean|median/i.test(q.prompt)) return `${k}: a mean or median of categories`;
      if (q.ask === 'choice') { if (q.choices.filter(c => c.right).length !== 1) return `${k}: choices`; continue; }
      const v = set.values, p = q.prompt;
      const ans = q.want !== undefined ? q.want : /How many of the values are <strong>(.+?)<\/strong>/.test(p) ?String(v.filter(x => x === p.match(/<strong>(.+?)<\/strong>/)[1]).length)
        : /mean/i.test(p) ? String(mean(v)) : /median/i.test(p) ? String(median(v)) : (modes(v).length ? modes(v).join(' and ') : 'no mode');
      const r = q.check(ans);
      if (r.status !== 'right') return `${k} ${JSON.stringify(o)} n=${n}: "${ans}" gave ${JSON.stringify(r)} for "${p}"`;
      if (n > 30 && q.data.list) return `${k} n=${n}: a big set asked as a list`;
    }
    return asked > 300 || asked;
  });
  t('the Lab’s tally and table work on every scenario: every value has a row', () => {
    for (const { k, o } of variants()) { const set = Data.make(k, 12, 30, o), t1 = Tasks.tallyTask(set), t2 = Tasks.freqTask(set); if (set.values.some(x => !t1.cats.includes(x) || !t2.cats.includes(x))) return k; }
    return true;
  });

  const pass = results.filter(r => r.ok).length;
  window.testSummary = { pass, fail: results.length - pass, failures: results.filter(r => !r.ok), sets };
  const box = document.getElementById('results');
  box.innerHTML = `<p><strong>${pass} of ${results.length} passed.</strong> Data sets checked against reference calculations: ${sets}.</p><ul>` +
    results.map(r => `<li style="color:${r.ok ? '#3d4f1e' : '#7a2418'}">${r.ok ? 'PASS' : 'FAIL'}: ${esc(r.name)}${r.info ? ' <em>' + esc(r.info) + '</em>' : ''}</li>`).join('') + '</ul>';
})();
