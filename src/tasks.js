/* Data Coach: questions and levels. Every question is built from a data set, so the same kinds of
   question serve the lessons (small sets, made for the level) and the Data Lab (the student's own
   data). A task tells the screen what to show and how to check it:
     prompt (HTML), data ({ list } or { table: { cats, cnts } }, with what), ask ('choice' | 'multi' |
     'answer' | 'tally' | 'table'), choices ([{ html, right, msg }]), check (typed text -> Stats result),
     hints, answer (HTML), steps (a worked example's lines). */
const Tasks = (() => {
  'use strict';
  const { rng, SCENARIOS, make, catsOf, whatOf, kindOf } = Data;
  const { fmt } = Stats;
  const list = v => v.map(fmt).join(', ');
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const seedOf = r => (r() * 4294967296) >>> 0;
  // A data set made until it passes a test (a list with no mode, an even count...), from a seeded generator.
  function makeWhere(key, r, n, ok, o) {
    for (let i = 0; i < 400; i++) { const s = make(key, seedOf(r), n, o); if (ok(s.values)) return s; }
    throw new Error(`no ${key} data set of ${n} passes the test`);
  }
  const dataOf = set => ({ list: set.values, what: whatOf(set), key: set.key, o: set.o });
  const tableOf = (set, cats = catsOf(set)) => ({ table: { cats, cnts: Stats.freq(set.values, cats) }, what: whatOf(set), key: set.key, o: set.o });
  const ROUND = 'Round to the nearest tenth if the division doesn’t end.';
  // How a mean's division is written: exactly when it ends, else its first digits, cut off and marked.
  const divText = m => (Stats.ends(m) ? Stats.exact(m) : Stats.cut(m));

  // ---------- Level 1: Kinds of Data ----------
  // A statistical question expects answers that vary; the others have one answer.
  const STAT_Q = [
    ['How tall are the students in my class?', true], ['How tall am I?', false],
    ['How many pets do the families on my street have?', true], ['How many pets does my family have?', false],
    ['How many minutes do 7th graders spend on homework each night?', true], ['How many days are in a week?', false],
    ['What was the high temperature each day last month?', true], ['What was the high temperature yesterday?', false],
    ['What are the favorite sports of the students in my school?', true], ['What is my teacher’s favorite sport?', false],
    ['How many books did each student read this summer?', true], ['How many pages are in this book?', false],
    ['How long does it take the students in my class to get to school?', true], ['How far is it from school to the library?', false],
  ];
  const STAT_YES = 'It is statistical: the answers vary (from person to person, or day to day), so it takes data to answer it.';
  const STAT_NO = 'It is not statistical: it has one answer. Nothing varies, so there is no data to collect.';
  function statQ(item) {
    const [q, yes] = item, why = yes ? STAT_YES : STAT_NO;
    return {
      prompt: `Is this a statistical question?<br><strong>“${q}”</strong>`, ask: 'choice',
      choices: [{ html: 'Statistical Question', right: yes, msg: `${yes ? 'Right!' : 'Not this one.'} ${why}` }, { html: 'Not a Statistical Question', right: !yes, msg: `${yes ? 'Not this one.' : 'Right!'} ${why}` }],
      hints: ['Would different people (or different days) give different answers?'], answer: why,
    };
  }
  /* What kind of data: categories (words, or numbers used as names), numbers (amounts you could
     average), or numbers over time (one amount, measured again and again). Traps: jersey numbers,
     zip codes and area codes are numbers used as names, so they are categories. */
  const KINDS = [
    ['Favorite fruit of 25 students', 'apple, banana, apple, grape, orange, …', 'cat'],
    ['Eye colors of 24 students', 'brown, blue, brown, hazel, green, …', 'cat'],
    ['Favorite color of 30 students', 'blue, red, green, blue, purple, …', 'cat'],
    ['Birth months of 28 students', 'March, July, March, October, …', 'cat'],
    ['Number of siblings of 25 students', '1, 0, 2, 1, 3, …', 'num'],
    ['Heights of 20 students, in inches', '61, 58, 64, 60, 62, …', 'num'],
    ['Minutes 20 students spent reading last night', '30, 15, 45, 0, 20, …', 'num'],
    ['Goals scored by each team in a tournament', '3, 1, 4, 0, 2, …', 'num'],
    ['High temperature each day for two weeks', 'Mon 61°F, Tue 64°F, Wed 59°F, …', 'time'],
    ['A plant’s height at the end of each week', 'week 1: 2 cm, week 2: 3.5 cm, week 3: 5 cm, …', 'time'],
    ['Money in a savings account at the end of each month', 'Jan $40, Feb $55, Mar $52, …', 'time'],
    ['Jersey numbers on a soccer team', '7, 10, 23, 4, 11, …', 'cat', true],
    ['Zip codes of 30 families', '98102, 98112, 98103, …', 'cat', true],
    ['Area codes of 30 phone numbers', '206, 425, 206, 360, …', 'cat', true],
  ];
  const KIND_NAME = { cat: 'Categories', num: 'Numbers', time: 'Numbers Over Time' };
  const KIND_WHY = {
    cat: 'Categories: each value is a name or a group, not an amount.',
    num: 'Numbers: each value is an amount you could add up and average.',
    time: 'Numbers over time: one amount, measured again and again in order (each day, week or month).',
  };
  const TRAP = 'These are numbers used as names. Adding or averaging them means nothing, so they are categories.';
  // Why a wrong pick does not fit (said about the pick, never giving the answer away).
  const NOT_KIND = {
    cat: 'Categories are names or groups. Could you add these values up and get something that means something?',
    num: 'Numbers are amounts you could add up and average. Would an average of these values mean anything? And is one thing measured again and again over time?',
    time: 'Numbers over time are one amount measured again and again, in order. Is that what these values are?',
  };
  function kindQ(item) {
    const [what, sample, kind, trap] = item, why = trap ? TRAP : KIND_WHY[kind];
    return {
      prompt: `What kind of data is this?<br><strong>${what}</strong><br><span class="muted">${sample}</span>`, ask: 'choice',
      choices: ['cat', 'num', 'time'].map(k => ({ html: KIND_NAME[k], right: k === kind, msg: k === kind ? `Right! ${why}` : `Not this one. ${NOT_KIND[k]}` })),
      hints: ['Could you add the values up and find an average that means something? Is the same thing measured again and again over time?'], answer: why,
    };
  }
  // Which measures make sense: for categories only the mode; for numbers, all three. (Numbers over time
  // are left out here: for them the trend usually matters more, which comes later.)
  function measuresQ(item) {
    const [what, sample, kind] = item, cat = kind === 'cat';
    const msg = cat ? 'Only the mode: you can say which category is most common, but these are names or groups, with no amounts to add or to find the middle of.' :'All three: these are amounts, so you can add them (mean), put them in order (median) and find the most common (mode).';
    return {
      prompt: `Which measures make sense for this data? Choose every one that does.<br><strong>${what}</strong><br><span class="muted">${sample}</span>`, ask: 'multi',
      choices: ['Mean', 'Median', 'Mode'].map(m => ({ html: m, right: m === 'Mode' || !cat })), msg,
      hints: ['The mean adds the values; the median puts them in order; the mode finds the most common. Which of those can you do with these values?'], answer: msg,
    };
  }
  // Left out: data over time (the trend matters more), birth months (categories with an order) and jersey
  // numbers (on one team every number differs, so there is not even a mode).
  const MEASURE_ITEMS = KINDS.filter(k => k[2] !== 'time' && !/^Birth months|^Jersey/.test(k[0]));
  const andList = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

  // ---------- Level 2: Organize It ----------
  function tallyTask(set) {
    return {
      prompt: `Tally the ${whatOf(set)}. Go down the list in order: tap the row for each one.`, ask: 'tally', set, cats: catsOf(set), data: dataOf(set),
      hints: ['Start at the first value. Find its row and tap it once. Then the next value.'],
    };
  }
  function freqTask(set) {
    return {
      prompt: 'Fill in the frequency table: how many of each, and the total.', ask: 'table', set, cats: catsOf(set), data: dataOf(set),
      hints: ['Go down the list in order and keep a tally (or cross off each value as you count it), so no value is counted twice.', 'The total is how many values are in the list.'],
    };
  }
  const TALLY_KEYS = ['coins', 'eyes', 'dice', 'spinner', 'marbles', 'pets', 'siblings'];

  // ---------- Level 3: Center (each from any data set of numbers) ----------
  function meanTask(set) {
    const v = set.values, n = v.length, m = Stats.mean(v), total = Stats.sum(v);
    const add = n <= 15 ? { html: `${v.map(fmt).join(' + ')} = ${fmt(total)}`, why: 'Add all the values.' } : { html: `total of all ${n} values = ${fmt(total)}`, why: 'Add all the values (a frequency table helps: multiply each value by its count).' };
    return {
      prompt: `Find the mean. ${ROUND}`, ask: 'answer', data: dataOf(set), set,
      check: t => Stats.checkMean(t, v),
      hints: ['Add all the values. Then divide by how many values there are.', `The total is ${fmt(total)}, and there are ${n} values.`],
      answer: `The mean is ${Stats.meanText(m)}.`,
      steps: [add, { html: `${n} values`, why: 'Count them.' },
        { html: `${fmt(total)} ÷ ${n} = ${divText(m)}`, why: Stats.ends(m) ? 'Divide the total by the count.' : 'Divide the total by the count. The division doesn’t end.' },
        { html: Stats.ends(m) ? `Mean = ${Stats.exact(m)}` : `Mean ≈ ${fmt(Stats.round(m, 1))}`, why: Stats.ends(m) ? 'The mean shares the total equally among the values.' : `Rounded to the nearest tenth (the next digit, ${Math.trunc(Math.abs(m) * 100 + 1e-9) % 10}, ${Math.trunc(Math.abs(m) * 100 + 1e-9) % 10 >= 5 ? 'rounds up' : 'rounds down'}).` },
      ],
    };
  }
  function medianTask(set) {
    const v = set.values, n = v.length, s = Stats.sorted(v), md = Stats.median(v);
    const mid = n % 2 ? `The middle (value ${(n + 1) / 2} of ${n}) is ${fmt(md)}.` : `The two middle values are ${fmt(s[n / 2 - 1])} and ${fmt(s[n / 2])}; halfway between them is ${fmt(md)}.`;
    return {
      prompt: 'Find the median.', ask: 'answer', data: dataOf(set), set,
      check: t => Stats.checkMedian(t, v),
      hints: ['Put the values in order from least to greatest first.', n % 2 ? 'With an odd count, the median is the one in the middle.' : 'With an even count there are two middle values: the median is halfway between them (add them and divide by 2).'],
      answer: `The median is ${fmt(md)}.`,
      steps: [
        { html: n <= 30 ? list(s) : `${list(s.slice(0, 6))}, … , ${list(s.slice(-6))}`, why: 'Put the values in order.' },
        { html: `${n} values`, why: n % 2 ? 'An odd count: one value is in the middle.' : 'An even count: two values share the middle.' },
        { html: `Median = ${fmt(md)}`, why: mid },
      ],
    };
  }
  // asTable: show the data as its frequency table (a big list), not as the list itself.
  function modeTask(set, asTable) {
    const v = set.values, M = Stats.modes(v), cats = catsOf(set), c = Stats.counts(v);
    const top = M.length ? c.find(p => p[0] === M[0])[1] : 1, name = x => fmt(x);
    const ans = !M.length ? 'There is no mode: no value appears more than once.' : M.length === 1 ? `The mode is ${name(M[0])}: it appears ${top} times.` : `There are ${M.length} modes, ${andList(M.map(name))}: each appears ${top} times.`;
    const isCat = kindOf(set) === 'cat';
    return {
      prompt: `Find the mode. If values tie, give each one (like 3 and 5). If no value repeats, type <strong>no mode</strong>.`, ask: 'answer', data: asTable ? tableOf(set, cats) : dataOf(set), set,
      check: t => Stats.checkMode(t, v, { cats }),
      hints: [isCat ? 'Count how many times each one appears.' : 'Count how many times each value appears. Putting the list in order puts equal values side by side.'],
      answer: ans,
      steps: [
        isCat ? { html: Stats.counts(v).map(p => `${p[0]}: ${p[1]}`).join(', '), why: 'Count each category.' } : { html: v.length <= 30 ? list(Stats.sorted(v)) : 'the values in order (or a frequency table)', why: 'Put the values in order, so equal values sit together.' },
        ...(isCat ? [] : [{ html: c.slice().sort((a, b) => b[1] - a[1]).filter(p => p[1] > 1).slice(0, 4).map(p => `${fmt(p[0])} appears ${p[1]} times`).join('; ') || 'Every value appears once.', why: 'Count the values that repeat.' }]),
        { html: ans.split(':')[0], why: !M.length ? 'With no repeats, no value is most common.' : M.length > 1 ? 'Values that tie for most often are all modes.' : 'The value that appears most often.' },
      ],
    };
  }
  // Mean, median or mode from a frequency table: each value counts as often as the table says.
  function fromTableTask(set, w) {
    const v = set.values, cats = catsOf(set), cnts = Stats.freq(v, cats), ctx = { table: true, cats, cnts };
    const n = v.length, md = Stats.median(v), M = Stats.modes(v), total = Stats.sum(v);
    const rows = cats.map((c, i) => [c, cnts[i]]).filter(p => p[1] > 0);
    const products = rows.length <= 8 ? rows.map(([c, k]) => `${fmt(c)} × ${k}`).join(' + ') : 'each value × its count, added up';
    const Q = {
      mean: {
        prompt: `Find the mean from the table. ${ROUND}`, check: t => Stats.checkMean(t, v, ctx),
        hints: ['Each value counts as many times as the table says: multiply each value by its count, then add.', `Divide that total by the total count (${n}).`],
        answer: `The mean is ${Stats.meanText(Stats.mean(v))}.`,
        steps: [{ html: `${products} = ${fmt(total)}`, why: 'Multiply each value by its count, then add: the total of all the values.' }, { html: `${cnts.join(' + ')} = ${n}`, why: 'Add the counts: how many values there are.' }, { html: `${fmt(total)} ÷ ${n} = ${divText(Stats.mean(v))}`, why: 'Divide.' }, ...(Stats.ends(Stats.mean(v)) ? [] : [{ html: `Mean ≈ ${fmt(Stats.round(Stats.mean(v), 1))}`, why: 'Rounded to the nearest tenth.' }])],
      },
      median: {
        prompt: 'Find the median from the table.', check: t => Stats.checkMedian(t, v, ctx),
        hints: [`There are ${n} values in all. The table already lists them in order: count down to the middle.`, n % 2 ? `The middle one is value number ${(n + 1) / 2}.` : `The middle two are values number ${n / 2} and ${n / 2 + 1}.`],
        answer: `The median is ${fmt(md)}.`,
        steps: [{ html: `${cnts.join(' + ')} = ${n}`, why: 'Add the counts: how many values there are.' }, { html: n % 2 ? `value number ${(n + 1) / 2}` : `values number ${n / 2} and ${n / 2 + 1}`, why: 'Where the middle is.' }, { html: `Median = ${fmt(md)}`, why: 'Count down the table (it is already in order) to the middle.' }],
      },
      mode: {
        prompt: 'Find the mode from the table. If values tie, give each one.', check: t => Stats.checkMode(t, v, ctx),
        hints: ['The mode is the value with the biggest count.'],
        answer: M.length ? `The mode${M.length > 1 ? 's are' : ' is'} ${andList(M.map(fmt))}.` : 'There is no mode: every count is 1.',
        steps: [{ html: `biggest count: ${Math.max(...cnts)}`, why: 'Find the biggest count.' }, { html: M.length ? `Mode = ${andList(M.map(fmt))}` : 'No mode', why: 'The mode is the value in that row, not the count.' }],
      },
    }[w];
    return Object.assign({ ask: 'answer', data: tableOf(set, cats), set }, Q);
  }
  const NUM_KEYS = ['dice', 'height', 'shoes', 'reunion', 'sleep', 'siblings', 'pets', 'points', 'freethrows', 'scores', 'travel'];
  const SPREAD_KEYS = ['height', 'reunion', 'points', 'scores', 'travel'];   // values spread out: lists with no repeats are possible
  const TABLE_KEYS = ['dice', 'shoes', 'siblings', 'pets', 'freethrows'];
  function meanQ(key, seed, n) { const r = rng(seed); return meanTask(makeWhere(key, r, n || r.int(5, 8), v => new Set(v).size > 2)); }
  function medianQ(key, seed, even) {
    const r = rng(seed), n = even === undefined ? r.int(5, 10) : r.int(3, 5) * 2 + (even ? 0 : 1);
    // Not already in order (or the sorting step teaches nothing); with an even count, two different middle values.
    return medianTask(makeWhere(key, r, n, v => { const s = Stats.sorted(v); return s.join() !== v.join() && new Set(v).size > 2 && (n % 2 || s[n / 2 - 1] !== s[n / 2]); }));
  }
  // kase: 'one' (one mode), 'two' (two modes) or 'none' (no value repeats).
  function modeQ(key, seed, kase) {
    const r = rng(seed), c = kase || r.pick(['one', 'one', 'two', 'none']), want = { one: 1, two: 2, none: 0 }[c];
    // No repeats needs values that spread out: a die has only six faces, so heights or ages instead.
    if (c === 'none' && !SPREAD_KEYS.includes(key)) key = r.pick(SPREAD_KEYS);
    return modeTask(makeWhere(key, r, c === 'none' ? r.int(5, 7) : r.int(7, 10), v => Stats.modes(v).length === want));
  }
  function fromTableQ(key, seed, which) {
    const r = rng(seed);
    return fromTableTask(makeWhere(key, r, r.int(12, 20), v => Stats.modes(v).length === 1 && new Set(v).size >= 4), which || r.pick(['mean', 'median', 'mode']));
  }

  // ---------- Checks: which answer is right? ----------
  // The right answer with the named slips around it, each a choice with its reason (repeats dropped).
  function whichRight(prompt, data, right, wrongs, why) {
    const seen = new Set([String(right)]), choices = [{ html: String(right), right: true, msg: `Right! ${why}` }];
    for (const [x, msg] of wrongs) { const k = String(x); if (!seen.has(k)) { seen.add(k); choices.push({ html: k, right: false, msg: `Not this one. ${msg}` }); } }
    return { prompt, data, ask: 'choice', choices, answer: why, shuffle: true };
  }
  function centerCheck(seed, which) {
    const r = rng(seed), key = r.pick(['dice', 'shoes', 'height', 'siblings', 'points']);
    if (which === 'median') {
      // An even count, not in order, with two different middle values.
      const set = makeWhere(key, r, 8, v => { const s = Stats.sorted(v); return s.join() !== v.join() && s[3] !== s[4] && (v[3] + v[4]) / 2 !== Stats.median(v) && new Set(v).size > 4; }), v = set.values, s = Stats.sorted(v);
      return whichRight('What is the median?', dataOf(set), fmt(Stats.median(v)),
        [[fmt((v[3] + v[4]) / 2), 'That is the middle of the list as written. Put the values in order first.'], [fmt(s[3]), 'With 8 values there are two middle values. The median is halfway between them.'], ['4.5', 'That is where the middle is (between values 4 and 5), not the median itself.'], [Stats.meanText(Stats.mean(v)), 'That is the mean.']],
        `In order, the middle two values are ${fmt(s[3])} and ${fmt(s[4])}; halfway between them is ${fmt(Stats.median(v))}.`);
    }
    if (which === 'mode') {
      const kase = r.pick(['one', 'two', 'none']), mk = kase === 'none' ? r.pick(SPREAD_KEYS) : key;
      const set = makeWhere(mk, r, kase === 'none' ? 6 : 9, v => Stats.modes(v).length === { one: 1, two: 2, none: 0 }[kase] && (kase !== 'one' || Stats.counts(v).some(p => p[1] === 1))), v = set.values, M = Stats.modes(v);
      const right = M.length ? andList(M.map(fmt)) : 'No mode';
      const top = M.length ? Stats.counts(v).find(p => p[0] === M[0])[1] : 1;
      const wrongs = [[fmt(Stats.median(v)), 'That is the median.']];
      if (!M.length) wrongs.unshift([fmt(v[0]), 'That value appears only once. When no value repeats, there is no mode.']);
      if (M.length === 1) wrongs.unshift([String(top), 'That is how many times the mode appears. The mode is the value itself.'], ['No mode', 'Some values repeat, so there is a mode.']);
      if (M.length === 2) wrongs.unshift([fmt(M[0]), 'Another value appears just as often: both are modes.'], ['No mode', 'Some values repeat, so there is a mode.']);
      return whichRight('What is the mode?', dataOf(set), right, wrongs,
        !M.length ? 'No value repeats, so there is no mode.' : M.length === 1 ? `${fmt(M[0])} appears most often (${top} times).` : `${fmt(M[0])} and ${fmt(M[1])} each appear ${top} times: two modes.`);
    }
    if (which === 'table') {
      // A count of 10, 16 or 20 makes a mean that ends (a short decimal to choose between).
      const tk = r.pick(TABLE_KEYS), set = makeWhere(tk, r, r.pick([10, 16, 20]), v => Stats.ends(Stats.mean(v)) && !Number.isInteger(Stats.mean(v)) && new Set(v).size >= 3), v = set.values, cats = catsOf(set), cnts = Stats.freq(v, cats);
      return whichRight('What is the mean of the data in the table?', tableOf(set, cats), Stats.exact(Stats.mean(v)),
        [[fmt(Stats.round(Stats.mean(cnts), 2)), 'That is the mean of the counts. Each value counts as many times as its count.'], [fmt(Stats.round(Stats.mean(cats), 2)), 'That is the mean of the values column, as if each value appeared once.'], [fmt(Stats.sum(v)), 'That is the total of all the values. Divide by the total count.']],
        `Value × count, added, is ${fmt(Stats.sum(v))}; divided by the ${v.length} values, the mean is ${Stats.exact(Stats.mean(v))}.`);
    }
    const set = makeWhere(key, r, 6, v => Stats.terminates(Stats.mean(v), 1) && !Number.isInteger(Stats.mean(v)) && Stats.median(v) !== Stats.mean(v)), v = set.values;
    return whichRight('What is the mean?', dataOf(set), fmt(Stats.mean(v)),
      [[fmt(Stats.sum(v)), 'That is the total. Divide it by how many values there are.'], [fmt(Stats.median(v)), 'That is the median.'], [fmt(Stats.round(Stats.sum(v) / 5, 2)), 'Count again: there are 6 values.']],
      `The total is ${fmt(Stats.sum(v))}; divided by 6 values, the mean is ${fmt(Stats.mean(v))}.`);
  }
  /* Which frequency table matches the list? The right one (every row, zeros too), one with a miscounted
     row (its total is off), one with two counts swapped (its total is right, so only checking each row
     finds it), and one that lists each value once. Each is one line of text, so it reads well aloud. */
  function tableCheck(seed) {
    const r = rng(seed), key = r.pick(['coins', 'dice', 'eyes', 'spinner', 'marbles']);
    const set = makeWhere(key, r, r.int(10, 14), v => new Set(Stats.freq(v, catsOf({ key, values: v, o: Data.optsOf(key) }))).size >= 2);
    const cats = catsOf(set), cnts = Stats.freq(set.values, cats);
    const line = c => `${cats.map((k, i) => `${fmt(k)}: ${c[i]}`).join(', ')}. Total: ${c.reduce((s, x) => s + x, 0)}`;
    const off = cnts.slice(), i = cnts.findIndex(x => x > 0); off[i] += 1;
    const sw = cnts.slice(), a = cnts.findIndex(x => x !== cnts[0]); [sw[0], sw[a]] = [sw[a], sw[0]];
    const choices = [{ html: line(cnts), right: true, msg: `Right! Every count matches the list, and the total is ${set.values.length}, the number of values.` },
      { html: line(off), right: false, msg: `Not this one. Count ${fmt(cats[i])} again. (Its total doesn’t match the number of values, ${set.values.length}.)` },
      { html: line(sw), right: false, msg: `Not this one. Its total is right, but check each row: two counts are swapped (${fmt(cats[0])} and ${fmt(cats[a])}).` },
      { html: line(cats.map(() => 1)), right: false, msg: 'Not this one. It lists each value once. A frequency table counts how many times each one appears.' }];
    return { prompt: 'Which frequency table matches the list?', data: dataOf(set), ask: 'choice', shuffle: true,
      choices: choices.filter((c, j) => j === 0 || c.html !== choices[0].html), answer: 'Check every row, not just the total.' };
  }

  // ---------- The levels ----------
  // theme.make(seed, example) returns a task; examples use a fixed seed so they never change.
  const pickBank = (bank, r, filter = () => true) => r.pick(bank.filter(filter));
  const LEVELS = [
    { n: 1, title: 'Kinds of Data', themes: [
      { key: 'statq', title: 'Statistical Questions', make: (seed, ex) => statQ(ex ? STAT_Q[0] : pickBank(STAT_Q, rng(seed))),
        intro: 'A statistical question is one whose answers vary, so it takes data to answer it.' },
      { key: 'kinds', title: 'Kinds of Data', make: (seed, ex) => kindQ(ex ? KINDS[0] : pickBank(KINDS, rng(seed))),
        intro: 'Categories are names or groups. Numbers are amounts. Numbers over time measure one amount again and again.' },
      { key: 'measures', title: 'Which Measures Fit', make: (seed, ex) => measuresQ(ex ? KINDS[1] : pickBank(MEASURE_ITEMS, rng(seed))),
        intro: 'The mean (the average) adds the values and shares the total equally. The median is the middle value in order. The mode is the most common value.' },
    ], check: seed => { const r = rng(seed), wantCat = r() < 0.5; return [statQ(pickBank(STAT_Q, r)), kindQ(pickBank(KINDS, r)), measuresQ(pickBank(MEASURE_ITEMS, r, k => (k[2] === 'cat') === wantCat))]; } },
    { n: 2, title: 'Organize It', themes: [
      { key: 'tally', title: 'Tally It', make: (seed, ex) => (ex ? tallyTask(make('coins', 7, 12)) : tallyTask(make(rng(seed).pick(TALLY_KEYS), seed, rng(seed + 1).int(12, 16)))),
        intro: 'Go down the list in order and make one mark for each value. Every fifth mark crosses the four before it.' },
      { key: 'table', title: 'Frequency Table', make: (seed, ex) => (ex ? freqTask(make('dice', 11, 14)) : freqTask(make(rng(seed).pick(TALLY_KEYS), seed, rng(seed + 1).int(12, 18)))),
        intro: 'A frequency table shows how many times each value appears. The counts add up to the total.' },
    ], check: seed => { const r = rng(seed); return [tableCheck(seedOf(r)), tableCheck(seedOf(r))]; } },
    { n: 3, title: 'Center', themes: [
      { key: 'mean', title: 'Mean', make: (seed, ex) => (ex ? meanTask(EX.mean()) : meanQ(rng(seed).pick(NUM_KEYS), seed)),
        intro: 'The mean shares the total equally: add the values, then divide by how many there are.' },
      { key: 'median', title: 'Median', make: (seed, ex) => (ex ? medianTask(EX.median()) : medianQ(rng(seed).pick(NUM_KEYS), seed)),
        intro: 'The median is the middle value once the list is in order.' },
      { key: 'mode', title: 'Mode', make: (seed, ex) => (ex ? modeQ('shoes', 4, 'two') : modeQ(rng(seed).pick(NUM_KEYS), seed)),
        intro: 'The mode is the value that appears most often. There can be two modes, or none.' },
      { key: 'fromtable', title: 'From a Table', make: (seed, ex) => (ex ? fromTableTask(EX.table(), 'mean') : fromTableQ(rng(seed).pick(TABLE_KEYS), seed)),
        intro: 'In a frequency table each value counts as many times as its count says.' },
    ], check: seed => { const r = rng(seed); return [centerCheck(seedOf(r), 'mean'), centerCheck(seedOf(r), 'median'), centerCheck(seedOf(r), 'mode'), centerCheck(seedOf(r), 'table')]; } },
  ];
  /* The worked examples' data, fixed so they never change: a mean that does not come out even (so the
     example shows rounding), a median with an even count and two different middle values, and the table
     on the Level 2 and 3 pages (12 rolls: 2, 3, 2, 4, 0 and 1 of each face; mean 36 / 12 = 3). */
  const EX = {
    mean: () => ({ key: 'dice', seed: 0, o: { dice: '1' }, values: [4, 6, 2, 5, 3, 5] }),
    median: () => ({ key: 'height', seed: 0, o: { grade: '6' }, values: [61, 57, 63, 59, 62, 56, 60, 58] }),
    table: () => ({ key: 'dice', seed: 0, o: { dice: '1' }, values: [4, 2, 1, 4, 3, 2, 6, 4, 2, 1, 3, 4] }),
  };
  const level = n => LEVELS.find(l => l.n === n);

  // ---------- The Data Lab: questions about the student's own data ----------
  function countTask(set, cat) {
    return { prompt: `How many of the values are <strong>${cat}</strong>?`, ask: 'answer', data: dataOf(set), set,
      check: t => Stats.checkCount(t, set.values, cat), hints: ['Count each one (a tally keeps you from counting one twice).'],
      answer: `${set.values.filter(x => x === cat).length} of the ${set.values.length} values are ${cat}.` };
  }
  // A kind-of-data question about this data set.
  function kindTask(set) {
    const k = kindOf(set), q = kindQ([cap(whatOf(set)), `${list(set.values.slice(0, 5))}, …`, k]);
    const n = set.values.length, some = Math.min(n, 12);
    return Object.assign(q, { data: { list: set.values.slice(0, some), what: whatOf(set) + (n > some ? ` (the first ${some} of ${n})` : ''), key: set.key, o: set.o }, prompt: 'What kind of data is this?' });
  }
  // Big lists are asked from their frequency table, so the work stays by hand.
  function quiz(set, seed) {
    const r = rng(seed), k = kindOf(set), big = set.values.length > 30, cats = catsOf(set);
    // Data over time: what kind of data it is (questions about its trend come with line graphs, a later level).
    // Data over time: what kind of data it is, its trend, or a point or change read from its line graph (Level 7).
    if (k === 'time') { const c = r.int(0, 2); return c === 0 || typeof Spread === 'undefined' ? kindTask(set) : c === 1 && Spread.trendOf(set.values).kind ? Spread.trendTask(set) : Spread.readLineTask(set, seedOf(r)); }
    const pool = k === 'cat' ? (big ? [() => modeTask(set, true), () => kindTask(set)] : [() => modeTask(set), () => countTask(set, r.pick(cats)), () => kindTask(set)])
      : [() => (big ? fromTableTask(set, 'median') : medianTask(set)), () => (big ? fromTableTask(set, 'mode') : modeTask(set)), () => kindTask(set),
        // A mean by hand: from the list up to 30 values, from the table up to 100 (past that it is calculator work).
        ...(set.values.length <= 100 ? [() => (big ? fromTableTask(set, 'mean') : meanTask(set))] : []),
        // A big set with a clear shape: its histogram's shape (Level 8).
        ...(typeof Shape !== 'undefined' && set.values.length >= 100 && Shape.shapeOf(set.values) && Displays.fitOf(set, 'hist').fit ? [() => Shape.shapeTask(set)] : [])];
    return r.pick(pool)();
  }

  return { LEVELS, level, STAT_Q, KINDS, KIND_NAME, statQ, kindQ, measuresQ, tallyTask, freqTask, meanTask, medianTask, modeTask, fromTableTask, countTask, kindTask, quiz,
    meanQ, medianQ, modeQ, fromTableQ, centerCheck, tableCheck, makeWhere, cap, EX, dataOf, tableOf, whichRight, andList, seedOf };
})();
