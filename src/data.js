/* Data Coach: pretend data. Every scenario makes its data from a seeded random generator, so a
   test run (and a worked example) is the same every time, while students get fresh data. No real
   person's data is ever used: the classes, teams, families and weather here are made up. */
const Data = (() => {
  'use strict';

  // ---------- Random numbers ----------
  // A small seeded generator (mulberry32), so every check and every test run is repeatable.
  function rng(seed) {
    let s = seed >>> 0;
    const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    r.int = (a, b) => a + Math.floor(r() * (b - a + 1));                       // a whole number from a to b
    r.pick = list => list[Math.floor(r() * list.length)];
    r.weighted = pairs => { let u = r() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { u -= w; if (u < 0) return v; } return pairs[pairs.length - 1][0]; };
    r.normal = (mean, sd) => { const u = 1 - r(), v = r(); return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.shuffle = list => { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return r;
  }
  const freshSeed = () => (Math.random() * 4294967296) >>> 0;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const to = (x, step) => Math.round(x / step) * step;                          // to the nearest step (0.5, 5, 10...)
  const tenth = x => Math.round(x * 10) / 10;
  const times = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  // Skewed right (most values small, a few large): screen time, travel time, reaction time.
  const skew = (r, median, spread) => median * Math.exp(r.normal(0, spread));

  /* ---------- Scenarios ----------
     group: where it sits in the Lab's list. kind: 'cat' (categories: only the mode fits), 'num'
     (numbers), or 'time' (numbers over time, in order). cats(o): the rows of its frequency table,
     when they are known ahead (Heads and Tails; a die's 1 to 6). n: the size of a lesson question.
     sizes: the sizes the Lab offers (for numbers over time: how many days, weeks or months).
     opts: the Lab's settings, each [value, label], the first is the default. what(o): what one data set
     is. make(r, n, o): the values, in the order collected. */
  const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'];
  const BIG = [10, 20, 50, 100, 200, 500];
  const CLASS = [10, 20, 30, 50, 100, 300];
  const SCENARIOS = {
    // Games of chance
    coins: {
      group: 'Games of Chance', title: 'Flip a Coin', kind: 'cat', n: [10, 20], sizes: BIG,
      opts: [{ key: 'heads', label: 'The Coin', choices: [['50', 'A fair coin'], ['70', 'A weighted coin (Heads 70% of the time)'], ['90', 'A trick coin (Heads 90% of the time)']] }],
      what: o => (o.heads === '50' ? 'flips of a coin' : 'flips of a weighted coin'), cats: () => ['Heads', 'Tails'],
      make: (r, n, o) => times(n, () => (r() * 100 < +o.heads ? 'Heads' : 'Tails')),
    },
    dice: {
      group: 'Games of Chance', title: 'Roll Dice', kind: 'num', n: [10, 20], sizes: BIG,
      opts: [{ key: 'dice', label: 'Dice', choices: [['1', 'One number cube'], ['2', 'Two number cubes (the sum)']] }],
      what: o => (o.dice === '1' ? 'rolls of a number cube' : 'sums of two number cubes'),
      cats: o => (o.dice === '1' ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
      make: (r, n, o) => times(n, () => (o.dice === '1' ? r.int(1, 6) : r.int(1, 6) + r.int(1, 6))),
    },
    spinner: {
      group: 'Games of Chance', title: 'Spin a Spinner', kind: 'cat', n: [12, 20], sizes: BIG,
      opts: [{ key: 'kind', label: 'The Spinner', choices: [['4', '4 equal sections'], ['3', '3 equal sections'], ['6', '6 equal sections'], ['big', '4 sections, Red twice as big']] }],
      what: () => 'spins of a spinner', cats: o => COLORS.slice(0, o.kind === 'big' ? 4 : +o.kind),
      make: (r, n, o) => { const k = o.kind === 'big' ? 4 : +o.kind; return times(n, () => (o.kind === 'big' ? r.weighted([['Red', 2], ['Blue', 1], ['Green', 1], ['Yellow', 1]]) : COLORS[r.int(0, k - 1)])); },
    },
    marbles: {
      group: 'Games of Chance', title: 'Draw Marbles From a Bag', kind: 'cat', n: [12, 20], sizes: BIG,
      opts: [{ key: 'bag', label: 'The Bag', choices: [['even', '5 red, 5 blue, 5 green'], ['red', '10 red, 3 blue, 2 green'], ['four', '4 red, 4 blue, 4 green, 4 yellow']] }],
      what: () => 'marbles drawn from a bag (each put back before the next draw)', cats: o => (o.bag === 'four' ? ['Red', 'Blue', 'Green', 'Yellow'] : ['Red', 'Blue', 'Green']),
      make: (r, n, o) => times(n, () => r.weighted(o.bag === 'red' ? [['Red', 10], ['Blue', 3], ['Green', 2]] : o.bag === 'four' ? [['Red', 1], ['Blue', 1], ['Green', 1], ['Yellow', 1]] : [['Red', 1], ['Blue', 1], ['Green', 1]])),
    },
    // People
    eyes: {
      group: 'People', title: 'Eye Colors', kind: 'cat', n: [15, 24], sizes: CLASS,
      what: () => 'eye colors of the students in a pretend class', cats: () => ['Brown', 'Blue', 'Hazel', 'Green', 'Gray'],
      make: (r, n) => times(n, () => r.weighted([['Brown', 50], ['Blue', 22], ['Hazel', 13], ['Green', 10], ['Gray', 5]])),
    },
    height: {
      group: 'People', title: 'Heights', kind: 'num', unit: 'inches', n: [9, 15], sizes: CLASS,
      opts: [{ key: 'grade', label: 'Who', choices: [['6', '6th graders'], ['9', '9th graders'], ['12', '12th graders']] }],
      what: o => `heights of pretend ${o.grade}th graders, in inches`,
      make: (r, n, o) => { const m = { 6: 59, 9: 65, 12: 67 }[o.grade]; return times(n, () => clamp(Math.round(r.normal(m, 3)), m - 10, m + 10)); },
    },
    shoes: {
      group: 'People', title: 'Shoe Sizes', kind: 'num', n: [12, 20], sizes: CLASS,
      what: () => 'shoe sizes of the students in a pretend class',
      make: (r, n) => times(n, () => clamp(Math.round(r.normal(7.5, 1.5)), 4, 11)),
    },
    reunion: {
      // Kids, parents and grandparents: ages at a family reunion spread out (a class's ages hardly do).
      group: 'People', title: 'Ages at a Family Reunion', kind: 'num', unit: 'years', n: [9, 15], sizes: [10, 20, 30, 50, 100],
      what: () => 'ages of the people at a pretend family reunion, in years',
      make: (r, n) => times(n, () => r.weighted([[() => r.int(2, 15), 4], [() => r.int(30, 50), 4], [() => r.int(60, 88), 2]])()),
    },
    // School life
    sleep: {
      group: 'School Life', title: 'Hours of Sleep', kind: 'num', unit: 'hours', n: [8, 14], sizes: CLASS,
      opts: [{ key: 'who', label: 'Who', choices: [['ms', 'Middle schoolers'], ['hs', 'High schoolers']] }],
      what: o => `hours of sleep last night for pretend ${o.who === 'ms' ? 'middle' : 'high'} schoolers, to the nearest half hour`,
      make: (r, n, o) => times(n, () => clamp(to(r.normal(o.who === 'ms' ? 8.8 : 7.2, 1), 0.5), 4, 12)),
    },
    screen: {
      group: 'School Life', title: 'Screen Time', kind: 'num', unit: 'minutes', n: [8, 14], sizes: CLASS,
      what: () => 'minutes of screen time on a school day for pretend students, to the nearest 5',
      make: (r, n) => times(n, () => clamp(to(skew(r, 120, 0.6), 5), 0, 600)),
    },
    travel: {
      group: 'School Life', title: 'Time to Get to School', kind: 'num', unit: 'minutes', n: [8, 14], sizes: CLASS,
      what: () => 'minutes it takes pretend students to get to school',
      make: (r, n) => times(n, () => clamp(Math.round(skew(r, 15, 0.55)), 2, 75)),
    },
    scores: {
      group: 'School Life', title: 'Test Scores', kind: 'num', unit: 'points', n: [8, 14], sizes: CLASS,
      opts: [{ key: 'test', label: 'The Test', choices: [['easy', 'An easy test'], ['hard', 'A hard test']] }],
      what: o => `scores out of 100 on ${o.test === 'easy' ? 'an easy' : 'a hard'} pretend test`,
      make: (r, n, o) => times(n, () => clamp(Math.round(o.test === 'easy' ? 100 - skew(r, 12, 0.6) : r.normal(68, 12)), 20, 100)),
    },
    siblings: {
      group: 'School Life', title: 'Number of Siblings', kind: 'num', n: [10, 16], sizes: CLASS,
      what: () => 'number of brothers and sisters of pretend students', cats: () => [0, 1, 2, 3, 4, 5],
      make: (r, n) => times(n, () => r.weighted([[0, 20], [1, 40], [2, 25], [3, 10], [4, 4], [5, 1]])),
    },
    pets: {
      group: 'School Life', title: 'Number of Pets', kind: 'num', n: [10, 16], sizes: CLASS,
      what: () => 'number of pets in the homes of pretend students', cats: () => [0, 1, 2, 3, 4, 5, 6],
      make: (r, n) => times(n, () => r.weighted([[0, 35], [1, 30], [2, 18], [3, 9], [4, 5], [5, 2], [6, 1]])),
    },
    months: {
      group: 'School Life', title: 'Birth Months', kind: 'cat', n: [15, 24], sizes: CLASS,
      what: () => 'birth months of pretend students', cats: () => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      make: (r, n) => times(n, () => r.pick(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])),
    },
    subject: {
      group: 'School Life', title: 'Favorite Subject', kind: 'cat', n: [15, 24], sizes: CLASS,
      what: () => 'favorite subjects of pretend students', cats: () => ['Math', 'Science', 'English', 'History', 'Art', 'PE', 'Music'],
      make: (r, n) => times(n, () => r.weighted([['Math', 18], ['Science', 17], ['English', 13], ['History', 11], ['Art', 15], ['PE', 17], ['Music', 9]])),
    },
    // Sports
    points: {
      group: 'Sports', title: 'Points per Game', kind: 'num', unit: 'points', n: [8, 14], sizes: [10, 20, 30, 50, 82],
      what: () => 'points a pretend basketball team scored in each game',
      make: (r, n) => times(n, () => clamp(Math.round(r.normal(62, 9)), 35, 95)),
    },
    run: {
      group: 'Sports', title: '100 m Run Times', kind: 'num', unit: 'seconds', n: [8, 12], sizes: [10, 20, 30, 50, 100],
      what: () => '100 m run times of pretend students, in seconds',
      make: (r, n) => times(n, () => clamp(tenth(r.normal(15, 1.3)), 11.5, 20)),
    },
    freethrows: {
      group: 'Sports', title: 'Free Throws Made', kind: 'num', n: [10, 16], sizes: [10, 20, 30, 50, 100],
      opts: [{ key: 'skill', label: 'The Players', choices: [['70', 'Make about 70% of shots'], ['50', 'Make about 50%'], ['90', 'Make about 90%']] }],
      what: () => 'free throws made out of 10 by each pretend player', cats: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      make: (r, n, o) => times(n, () => times(10, () => (r() * 100 < +o.skill ? 1 : 0)).reduce((a, b) => a + b, 0)),
    },
    // Science and nature
    reaction: {
      group: 'Science and Nature', title: 'Reaction Times', kind: 'num', unit: 'milliseconds', n: [8, 12], sizes: [10, 20, 30, 50, 100, 200],
      what: () => 'reaction times of pretend students catching a ruler, in milliseconds (to the nearest 10)',
      make: (r, n) => times(n, () => clamp(to(150 + skew(r, 90, 0.5), 10), 150, 600)),
    },
    weather: {
      // A high temperature for each day: a slow trend plus day-to-day wobble. A longer stretch drifts
      // no further in all than two weeks would, so 60 days stays within real temperatures.
      group: 'Science and Nature', title: 'Daily High Temperatures', kind: 'time', unit: '°F', n: [14, 14], sizes: [7, 14, 30, 60], sizeWord: 'days',
      what: () => 'high temperature each day, in °F',
      make: (r, n) => { const start = r.int(48, 70), slope = (r() - 0.5) * 1.6 * Math.min(1, 14 / n); return times(n, i => Math.round(start + slope * i + r.normal(0, 3))); },
    },
    plant: {
      group: 'Science and Nature', title: 'A Growing Plant', kind: 'time', unit: 'cm', n: [8, 8], sizes: [6, 8, 12, 20], sizeWord: 'weeks',
      opts: [{ key: 'light', label: 'Where It Grows', choices: [['sun', 'In the sun'], ['shade', 'In the shade']] }],
      what: o => `height of a pretend plant ${o.light === 'sun' ? 'in the sun' : 'in the shade'} at the end of each week, in cm`,
      make: (r, n, o) => { let h = 2; return times(n, () => (h = tenth(h + Math.max(0, r.normal(o.light === 'sun' ? 2.4 : 1.1, 0.5))))); },
    },
    rainfall: {
      group: 'Science and Nature', title: 'Monthly Rainfall', kind: 'time', unit: 'inches', n: [12, 12], sizes: [12, 24, 36], sizeWord: 'months',
      opts: [{ key: 'city', label: 'The City', choices: [['rainy', 'A rainy city'], ['dry', 'A dry city']] }],
      what: o => `rainfall each month in ${o.city === 'rainy' ? 'a rainy' : 'a dry'} pretend city, January first, in inches`,
      make: (r, n, o) => times(n, i => Math.max(0, tenth((o.city === 'rainy' ? 3.5 : 0.9) * (1 + 0.7 * Math.cos((2 * Math.PI * i) / 12)) + r.normal(0, o.city === 'rainy' ? 0.6 : 0.25)))),
    },
  };
  const GROUPS = ['Games of Chance', 'People', 'School Life', 'Sports', 'Science and Nature'];

  // A scenario's settings, with every one not given set to its default.
  const optsOf = (key, o = {}) => Object.fromEntries((SCENARIOS[key].opts || []).map(op => [op.key, o[op.key] !== undefined ? String(o[op.key]) : op.choices[0][0]]));
  // Make a data set: { key, seed, o, values }. n is chosen inside the scenario's lesson range unless given.
  function make(key, seed = freshSeed(), n, o) {
    const sc = SCENARIOS[key], r = rng(seed), opts = optsOf(key, o);
    const size = n || r.int(sc.n[0], sc.n[1]);
    return { key, seed, o: opts, values: sc.make(r, size, opts) };
  }
  const whatOf = set => SCENARIOS[set.key].what(set.o || optsOf(set.key));
  const kindOf = set => SCENARIOS[set.key].kind;
  /* The rows a data set is sorted into: a scenario's own list (Heads and Tails; a die's 1 to 6), or for
     whole numbers every value from the least to the greatest, so a value nobody had still shows, with 0.
     Wide-spread or decimal numbers list each value that occurs. */
  function catsOf(set) {
    const sc = SCENARIOS[set.key];
    if (sc.cats) return sc.cats(set.o || optsOf(set.key));
    const v = set.values, lo = Math.min(...v), hi = Math.max(...v);
    if (v.every(Number.isInteger) && hi - lo <= 12) return times(hi - lo + 1, i => lo + i);
    return [...new Set(v)].sort((a, b) => a - b);
  }

  return { rng, freshSeed, SCENARIOS, GROUPS, optsOf, make, whatOf, kindOf, catsOf };
})();
