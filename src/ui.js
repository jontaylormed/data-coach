/* Data Coach screens. The tool opens in the Data Lab: choose a kind of data and its settings, make
   it again and again, and work with it (Quiz Me, Tally It, Build the Table, the frequency table and the
   measures). The levels are the side door: each level's lesson (an example, then your turn, theme by
   theme), its check, and More Practice. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = Stats.fmt;
  const say = (msg, kind = '') => { const f = $('feedback'); f.className = 'feedback ' + kind; f.innerHTML = msg; };
  const KIND = { right: 'good', almost: 'almost', wrong: 'bad', info: 'info' };
  const freshSeed = Data.freshSeed;
  const andList = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
  // A value as students see it: a picture when there is one (a coin, a die face, a color dot with its name),
  // with the value in hidden text when the picture stands alone; otherwise the number or word itself.
  const valueHtml = (d, x) => { const p = Pics.value(d, x); return p ? p.html + (p.label ? `<span class="sr">${esc(p.label)}</span>` : '') : esc(fmt(x)); };
  // A tally row names its value in words too: a die face with its number beside it.
  const rowName = (d, x) => { const p = Pics.value(d, x); return p && p.label ? `${p.html}<span>${esc(p.label)}</span>` : valueHtml(d, x); };
  // The tasks where the student draws a display.
  const DRAW = ['bar', 'pie', 'dot', 'hist', 'stem', 'box', 'line'];
  let booting = true;                       // no focus moves while the page first loads (it would scroll the page the tool is embedded in)
  const focus = el => { if (!booting && el) setTimeout(() => el.focus(), 0); };

  // ---------- Screens ----------
  const SECTIONS = ['lab', 'home', 'lesson', 'done'];
  function show(id) {
    for (const s of SECTIONS) $(s).hidden = s !== id;
    $('menu').hidden = id === 'home';
    window.scrollTo(0, 0);
  }
  function renderHome() {
    $('home-levels').innerHTML = Tasks.LEVELS.map(l => `<button class="big" data-level="${l.n}">Level ${l.n}: ${esc(l.title)}<small>${l.themes.map(t => esc(t.title)).join(' · ')}</small></button>`).join('');
    $('home-levels').querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => startLevel(+b.dataset.level)));
  }
  function home() { show('home'); focus($('home-q')); }

  /* ---------- The Data Lab ----------
     lab.key: the scenario; its settings are read from the form each time the data is made. */
  const lab = { key: 'coins', set: null };
  function renderLabForm() {
    const groups = Data.GROUPS.map(g => `<optgroup label="${esc(g)}">${Object.entries(Data.SCENARIOS).filter(([, s]) => s.group === g).map(([k, s]) => `<option value="${k}"${k === lab.key ? ' selected' : ''}>${esc(s.title)}</option>`).join('')}</optgroup>`).join('');
    $('lab-sc').innerHTML = groups;
    renderLabOpts();
  }
  function renderLabOpts() {
    const sc = Data.SCENARIOS[lab.key];
    $('lab-opts').innerHTML = (sc.opts || []).map(op => `<label class="field" for="opt-${op.key}"><span class="field-name">${esc(op.label)}</span><select id="opt-${op.key}" data-opt="${op.key}">${op.choices.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select></label>`).join('');
    $('lab-n-name').textContent = sc.sizeWord ? `How Many ${Tasks.cap(sc.sizeWord)}` : 'How Many';
    const def = sc.sizes.includes(20) ? 20 : sc.sizes[1] || sc.sizes[0];
    $('lab-n').innerHTML = sc.sizes.map(n => `<option value="${n}"${n === def ? ' selected' : ''}>${n}</option>`).join('');
  }
  function labOpts() { const o = {}; $('lab-opts').querySelectorAll('[data-opt]').forEach(s => { o[s.dataset.opt] = s.value; }); return o; }
  function makeLab() {
    lab.set = Data.make(lab.key, freshSeed(), +$('lab-n').value, labOpts());
    renderLab(!booting);
  }
  // animate: the data was just made, so its icon moves (a coin flips, a die tumbles...) and its values pop in.
  function renderLab(animate) {
    const set = lab.set, v = set.values, n = v.length, kind = Data.kindOf(set), shown = 40;
    $('lab-show').hidden = false;
    const chip = (x, i) => `<li${Pics.value(set, x) ? ' class="pic"' : ''} style="--i:${i}">${valueHtml(set, x)}</li>`;
    const first = `<ul class="chips${animate ? ' pop' : ''}" aria-label="${Math.min(n, shown)} of ${n} values">${v.slice(0, shown).map(chip).join('')}</ul>`;
    const rest = n > shown ? `<details><summary>Show All ${n} Values</summary><ul class="chips" aria-label="values ${shown + 1} to ${n}">${v.slice(shown).map(chip).join('')}</ul></details>` : '';
    const motion = animate && Pics.MOTION[set.key] ? ` anim-${Pics.MOTION[set.key]}` : '';
    $('lab-data').innerHTML = `<div class="data"><p class="data-what"><span class="lab-icon${motion}">${Pics.icon(set.key)}</span><span>${esc(Tasks.cap(Data.whatOf(set)))}: ${n} ${n === 1 ? 'value' : 'values'}${kind === 'time' ? ', in order' : ''}.</span></p>${first}${rest}</div>`;
    // The frequency table, made by the tool.
    const cats = Data.catsOf(set), cnts = Stats.freq(v, cats);
    $('lab-table').innerHTML = `<div class="table-box" tabindex="0" role="region" aria-label="Frequency table"><table class="freq"><thead><tr><th scope="col">Value</th><th scope="col">Count</th></tr></thead><tbody>${cats.map((c, i) => `<tr><th scope="row">${esc(fmt(c))}</th><td>${cnts[i]}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total</th><td>${n}</td></tr></tfoot></table></div>`;
    // The measures that fit this kind of data.
    const M = Stats.modes(v), modeText = M.length ? andList(M.map(fmt)) : 'No mode (no value repeats)';
    const rows = [['Kind of Data', Tasks.KIND_NAME[kind]], ['Count', n]];
    if (kind === 'cat') rows.push([M.length > 1 ? 'Modes' : 'Mode', modeText], ['Mean and Median', 'They don’t fit categories: these are names or groups, with no amounts to add or to find the middle of.']);
    else rows.push(['Mean', Stats.meanText(Stats.mean(v))], ['Median', fmt(Stats.median(v))], [M.length > 1 ? 'Modes' : 'Mode', modeText]);
    $('lab-measures').innerHTML = `<dl class="measures">${rows.map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join('')}</dl>${kind === 'time' ? '<p class="note">For data over time, how it changes (the trend) usually tells more. That comes in a later level.</p>' : ''}`;
    $('lab-measures-box').open = false;
    // By hand: tallies up to 40 values, tables up to 60.
    const tallyOk = n <= 40, buildOk = n <= 60;
    $('lab-tally').setAttribute('aria-disabled', String(!tallyOk));
    $('lab-build').setAttribute('aria-disabled', String(!buildOk));
    // A pie by hand up to 60 values (each share must be big enough to drag to). Only a pie that would fit is held back:
    // a misfit pie is drawn by the tool, whatever the size.
    // Pies, dot plots, histograms and stem-and-leaf plots are drawn by hand up to 60 values. Only a display that would fit is held
    // back: a misfit is drawn by the tool, whatever the size.
    for (const d of ['pie', 'dot', 'hist', 'stem', 'box', 'line']) $('lab-' + d).setAttribute('aria-disabled', String(!buildOk && (d === 'box' || d === 'line' ? Spread : Displays).fitOf(set, d).fit));
    setNote(!buildOk ? 'Tally It, Build the Table and the displays other than a bar graph are by hand: make 60 or fewer values for those, 40 or fewer to tally.' : !tallyOk ? 'Tally It is by hand: make 40 or fewer values to tally.' : '');
  }
  // The Lab's note is a live status: it changes only when its words do (so remaking data doesn't repeat it), and a
  // press of an unavailable button clears it first, so the reason is read out again on every press.
  const setNote = msg => { if ($('lab-note').textContent !== msg) $('lab-note').textContent = msg; };
  const sayNote = msg => { $('lab-note').textContent = ''; setTimeout(() => { $('lab-note').textContent = msg; }, 60); };
  function openLab() { show('lab'); if (!lab.set) makeLab(); focus($('lab-title')); }
  function renderLearn() {
    $('lab-learn').innerHTML = Tasks.LEVELS.map(l => `<button data-learn="${l.n}">Level ${l.n}: ${esc(l.title)}</button>`).join('');
    $('lab-learn').querySelectorAll('[data-learn]').forEach(b => b.addEventListener('click', () => startLevel(+b.dataset.learn)));
  }
  // Work on the Lab's data in the lesson screen: a quiz question, a tally, or a table to build.
  function labWork(kind) {
    const set = lab.set;
    if (kind === 'tally' && $('lab-tally').getAttribute('aria-disabled') === 'true') { sayNote('Make 40 or fewer values to tally by hand.'); return; }
    if (kind === 'build' && $('lab-build').getAttribute('aria-disabled') === 'true') { sayNote('Make 60 or fewer values to build the table by hand.'); return; }
    if (['pie', 'dot', 'hist', 'stem', 'box', 'line'].includes(kind) && $('lab-' + kind).getAttribute('aria-disabled') === 'true') { sayNote('Make 60 or fewer values to draw this display by hand.'); return; }
    cur = { mode: 'lab', labKind: kind, lv: null };
    const task = kind === 'quiz' ? Tasks.quiz(set, freshSeed()) : kind === 'tally' ? Tasks.tallyTask(set) : kind === 'build' ? Tasks.freqTask(set) : (kind === 'box' || kind === 'line' ? Spread.labTask(set, kind, freshSeed()) : Displays.labTask(set, kind));
    open(task, { quiz: 'Quiz Me', tally: 'Tally It', build: 'Build the Table', bar: 'Bar Graph', pie: 'Pie Chart', dot: 'Dot Plot', hist: 'Histogram', stem: 'Stem-and-Leaf Plot', box: 'Box Plot', line: 'Line Graph' }[kind]);
  }

  /* ---------- Lessons: where the student is ----------
     mode: 'lesson' (each theme: an example, then your turn), 'practice' (new questions from any theme),
     'check' (the level's questions, in order) or 'lab' (work on the Lab's data). */
  let cur = null;
  function startLevel(n, ti = 0) {
    const lv = Tasks.level(n);
    cur = { lv, mode: 'lesson', ti, phase: 'example' };
    open(lv.themes[ti].make(0, true), 'Example');
  }
  function yourTurn() { cur.phase = 'turn'; open(cur.lv.themes[cur.ti].make(freshSeed(), false), 'Your Turn'); }
  function startPractice(n) { cur = { lv: Tasks.level(n), mode: 'practice' }; practiceOne(); }
  function practiceOne() {
    cur.ti = Math.floor(Math.random() * cur.lv.themes.length);
    open(cur.lv.themes[cur.ti].make(freshSeed(), false), 'More Practice');
  }
  function startCheck(n) {
    const lv = Tasks.level(n);
    cur = { lv, mode: 'check', list: lv.check(freshSeed()), ci: 0, score: 0 };
    open(cur.list[0], `Check 1 of ${cur.list.length}`);
  }

  // ---------- One task on screen ----------
  function open(task, tag) {
    Object.assign(cur, { task, hintI: 0, stepI: 0, solved: false, tries: 0, solvedAt: 0 });
    show('lesson');
    $('lesson-title').textContent = cur.mode === 'lab' ? 'Data Lab' : `Level ${cur.lv.n}: ${cur.lv.title}`;
    renderThemes();
    $('tag').textContent = tag;
    $('intro').textContent = cur.mode === 'lesson' && cur.phase === 'example' ? cur.lv.themes[cur.ti].intro : '';
    $('prompt').innerHTML = task.prompt;
    $('steps').innerHTML = ''; $('steps').hidden = true;
    say('');
    if (task.ask === 'tally') cur.tally = { i: 0, marks: task.cats.map(() => 0) };
    renderData();
    renderWork();
    const example = cur.mode === 'lesson' && cur.phase === 'example';
    const drawing = DRAW.includes(task.ask);
    $('check').hidden = !['answer', 'multi', 'table', ...DRAW].includes(task.ask);
    $('hint').hidden = !(task.hints && task.hints.length) || example;
    $('step').hidden = !(example || drawing || (task.ask === 'answer' && task.steps));
    $('quick').hidden = !drawing || example;
    // Drawing a graph: the table and the graph sit side by side where there is room (stacked on a phone).
    $('pair').classList.toggle('side', drawing);
    $('back').hidden = cur.mode !== 'lab';
    $('next-row').hidden = true;
    if (example) say('Example: tap <strong>Show Next Step</strong> to see how it is done. You can also try it yourself.', 'info');
    // Focus goes where the student works next: the answer box, or the question itself.
    focus(task.ask === 'answer' ? $('answer') : $('prompt'));
  }
  function renderThemes() {
    const box = $('themes');
    if (cur.mode !== 'lesson') { box.innerHTML = ''; return; }
    box.innerHTML = cur.lv.themes.map((t, i) => `<button data-ti="${i}"${i === cur.ti ? ' aria-current="step"' : ''}>${esc(t.title)}</button>`).join('');
    box.querySelectorAll('[data-ti]').forEach(b => b.addEventListener('click', () => startLevel(cur.lv.n, +b.dataset.ti)));
  }

  // The data: the values in the order they were collected, or a frequency table.
  function renderData() {
    const t = cur.task, d = t.data, box = $('data');
    if (!d) { box.innerHTML = ''; return; }
    const what = `<p class="data-what">${d.key ? `<span class="lab-icon">${Pics.icon(d.key)}</span>` : ""}<span>${esc(Tasks.cap(d.what))}</span></p>`;
    if (d.chart) {
      box.innerHTML = `<div class="data">${what}<div class="chart-box"></div></div>`;
      Charts.show(box.querySelector('.chart-box'), d.chart);
    } else if (d.list) {
      const ty = cur.tally;
      const chips = d.list.map((x, i) => `<li class="${Pics.value(d, x) ? 'pic' : ''}${ty && i === ty.i ? ' now' : ty && i < ty.i ? ' used' : ''}"${ty && i === ty.i ? ' aria-current="true"' : ''}>${valueHtml(d, x)}${ty && i < ty.i ? '<span class="sr"> (tallied)</span>' : ''}</li>`).join('');
      box.innerHTML = `<div class="data">${what}<ul class="chips" aria-label="${d.list.length} values">${chips}</ul></div>`;
    } else {
      const { cats, cnts } = d.table;
      box.innerHTML = `<div class="data">${what}<div class="data-scroll table-box" tabindex="0" role="region" aria-label="Frequency table"><table class="freq"><thead><tr><th scope="col">Value</th><th scope="col">Count</th></tr></thead><tbody>${cats.map((c, i) => `<tr><th scope="row">${esc(fmt(c))}</th><td>${cnts[i]}</td></tr>`).join('')}</tbody></table></div></div>`;
    }
  }

  // The place to answer: choices, typed answer, tally rows, or a table to fill.
  function renderWork() {
    const t = cur.task, box = $('work');
    if (t.ask === 'choice' || t.ask === 'multi') {
      let order = t.choices.map((c, i) => i);
      if (t.shuffle) order = Data.rng(freshSeed()).shuffle(order);
      box.innerHTML = `<div class="choices" role="group" aria-labelledby="prompt">${order.map(i => `<button class="choice" data-c="${i}"${t.ask === 'multi' ? ' aria-pressed="false"' : ''}>${t.choices[i].html}</button>`).join('')}</div>`;
      box.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => (t.ask === 'multi' ? toggle(b) : pick(b))));
    } else if (t.ask === 'answer') {
      box.innerHTML = `<label for="answer" class="answer-label">Your Answer</label><div class="entry-row"><input type="text" id="answer" autocomplete="off" autocapitalize="off" spellcheck="false"></div>`;
      // Enter checks; it must not also press the Next button that a right answer brings up.
      $('answer').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkNow(); } });
    } else if (t.ask === 'tally') {
      renderTally();
    } else if (t.ask === 'table') {
      box.innerHTML = `<div class="data-scroll"><table class="freq"><thead><tr><th scope="col">Value</th><th scope="col">Count</th></tr></thead><tbody>${t.cats.map((c, i) => `<tr><th scope="row">${esc(fmt(c))}</th><td><input type="text" inputmode="numeric" data-row="${i}" aria-label="Count of ${esc(fmt(c))}" autocomplete="off"></td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total</th><td><input type="text" inputmode="numeric" id="total" aria-label="Total count" autocomplete="off"></td></tr></tfoot></table></div>`;
      // Editing a marked box clears its mark, so an old right or wrong never stays on a new number.
      box.querySelectorAll('input').forEach(i => i.addEventListener('input', () => { i.parentElement.className = ''; i.removeAttribute('aria-invalid'); }));
      box.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkNow(); } }));
    } else if (t.ask === 'bar') {
      // Choose the scale first; then the bars can be dragged.
      cur.bar = { step: null, values: t.cats.map(() => 0) };
      box.innerHTML = `<div class="scale-pick" role="group" aria-labelledby="scale-name"><span class="field-name" id="scale-name">Count By</span>${t.steps.map(s => `<button data-step="${s}" aria-pressed="false">${s}s</button>`).join(' ')}</div><div class="chart-box" id="chart-work"></div>`;
      box.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => pickStep(+b.dataset.step)));
      drawBar();
    } else if (t.ask === 'pie') {
      // Equal slices to start (the rest of the parts go to the last slice); the student drags them to size.
      const k = t.cats.length, each = Math.floor(t.n / k);
      cur.pie = { values: t.cats.map((c, i) => (i < k - 1 ? each : t.n - each * (k - 1))) };
      box.innerHTML = '<div class="chart-box" id="chart-work"></div>';
      Charts.pie($('chart-work'), { cats: t.cats, values: cur.pie.values, n: t.n, edit: true, onChange: () => { if (!cur.solved) say(''); } });
    } else if (t.ask === 'dot') {
      // Tap above a value to add a dot; with Erase Dots on, a tap takes one away.
      cur.dot = { values: t.ticks.map(() => 0), erase: false };
      box.innerHTML = '<p class="row"><button id="erase" aria-pressed="false">Erase Dots</button></p><div class="chart-box" id="chart-work"></div>';
      $('erase').addEventListener('click', () => { cur.dot.erase = !cur.dot.erase; $('erase').setAttribute('aria-pressed', String(cur.dot.erase)); });
      drawDot();
    } else if (t.ask === 'hist') {
      // Choose the bin width first; then the bars can be dragged.
      cur.hist = { w: null, values: [] };
      box.innerHTML = `<div class="scale-pick" role="group" aria-labelledby="width-name"><span class="field-name" id="width-name">Bin Width</span>${t.widths.map(w => `<button data-width="${w}" aria-pressed="false">${fmt(w)}</button>`).join(' ')}</div><div class="chart-box" id="chart-work"></div>`;
      box.querySelectorAll('[data-width]').forEach(b => b.addEventListener('click', () => pickWidth(+b.dataset.width)));
      drawHist();
    } else if (t.ask === 'box') {
      // The five handles start spread evenly along the number line; the student drags each to its value.
      const { lo, hi } = t.axis;
      cur.box = { values: [0.1, 0.3, 0.5, 0.7, 0.9].map(f => +(Math.round((lo + (hi - lo) * f) / t.snap) * t.snap).toFixed(6)) };
      box.innerHTML = '<div class="chart-box" id="chart-work"></div>';
      drawBox();
    } else if (t.ask === 'line') {
      cur.line = { values: t.labels.map(() => null) };
      box.innerHTML = '<div class="chart-box" id="chart-work"></div>';
      drawLine();
    } else if (t.ask === 'stem') {
      box.innerHTML = `<div class="data-scroll"><table class="freq stem-in"><thead><tr><th scope="col">Stem</th><th scope="col">Leaves</th></tr></thead><tbody>${t.rows.map(([s], i) => `<tr><th scope="row">${s}</th><td><input type="text" inputmode="numeric" data-stem="${i}" aria-label="Leaves for stem ${s}" autocomplete="off"></td></tr>`).join('')}</tbody></table></div>`;
      box.querySelectorAll('input').forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); checkNow(); } }));
    } else box.innerHTML = '';
  }
  function drawBox() {
    const t = cur.task;
    Charts.boxPlot($('chart-work'), { axis: t.axis, values: cur.box.values, out: t.out, edit: !cur.solved, snap: t.snap, onChange: () => { if (!cur.solved) say(''); } });
  }
  function drawLine() {
    const t = cur.task;
    Charts.line($('chart-work'), { labels: t.labels, values: cur.line.values, axis: t.axis, snap: t.snap, edit: !cur.solved, onChange: () => { if (!cur.solved) say(''); } });
  }
  function drawDot() {
    const t = cur.task;
    Charts.dot($('chart-work'), { ticks: t.ticks, values: cur.dot.values, edit: !cur.solved, erase: () => cur.dot.erase, onChange: () => { if (!cur.solved) say(''); } });
  }
  function drawHist() {
    const t = cur.task, h = cur.hist;
    if (!h.w) { $('chart-work').innerHTML = '<p class="note">Choose a bin width to see the bins.</p>'; return; }
    const { bins } = t.binsOf(h.w), sc = t.topOf(h.w);
    Charts.bar($('chart-work'), { cats: bins.map(b => b.label), values: h.values, step: sc.step, top: sc.top, edit: !cur.solved, hist: true, onChange: () => { if (!cur.solved) say(''); } });
  }
  function pickWidth(w) {
    if (cur.solved) return;
    const t = cur.task, v = t.verdict(w);
    if (!v.ok) { cur.tries++; say(esc(v.msg), 'bad'); return; }
    cur.hist = { w, values: t.binsOf(w).bins.map(() => 0) };
    $('work').querySelectorAll('[data-width]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.width === w)));
    drawHist();
    say(`${esc(v.msg)} Now drag each bar (or use the arrow keys) to how many values are in its range.`, 'info');
  }
  // The current drawing, and the right one, as lists to compare (for Show Next Step and Quick Draw).
  function stemInputs() { return [...$('work').querySelectorAll('[data-stem]')]; }

  // ---------- Drawing a bar graph or a pie chart ----------
  function drawBar() {
    const t = cur.task, b = cur.bar;
    Charts.bar($('chart-work'), { cats: t.cats, values: b.values, step: b.step, top: b.step ? t.top(b.step) : 1, edit: !cur.solved, onChange: () => { if (!cur.solved) say(''); } });
  }
  function pickStep(s) {
    if (cur.solved) return;
    const t = cur.task, v = t.scale(s);
    if (!v.ok) { cur.tries++; say(esc(v.msg), 'bad'); return; }
    cur.bar.step = s;
    const top = t.top(s);
    cur.bar.values = cur.bar.values.map(x => Math.min(x, top));
    $('work').querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.step === s)));
    drawBar();
    say(`${esc(v.msg)} Now drag each bar (or use the arrow keys) to its count.`, 'info');
  }
  function checkDrawing() {
    const t = cur.task;
    if (t.ask === 'bar' && !cur.bar.step) { say('Choose a scale for the count axis first.', 'info'); return; }
    if (t.ask === 'hist' && !cur.hist.w) { say('Choose a bin width first.', 'info'); return; }
    const r = { bar: () => t.check(cur.bar.values, cur.bar.step), pie: () => t.check(cur.pie.values), dot: () => t.check(cur.dot.values), hist: () => t.check(cur.hist.values, cur.hist.w), stem: () => t.check(stemInputs().map(i => i.value)), box: () => t.check(cur.box.values), line: () => t.check(cur.line.values) }[t.ask]();
    if (r.status === 'right') { solved(esc(r.msg)); freeze(); return; }
    cur.tries++;
    say(esc(r.msg), KIND[r.status]);
  }
  // A finished drawing stays on screen but can no longer be changed.
  function freeze() {
    const t = cur.task;
    if (t.ask === 'bar') drawBar();
    else if (t.ask === 'pie') Charts.pie($('chart-work'), { cats: t.cats, values: cur.pie.values, n: t.n, edit: false, legend: true });
    else if (t.ask === 'dot') { drawDot(); if ($('erase')) $('erase').hidden = true; }
    else if (t.ask === 'hist') drawHist();
    else if (t.ask === 'box') drawBox();
    else if (t.ask === 'line') drawLine();
    else stemInputs().forEach(i => { i.readOnly = true; });
  }
  // Show Next Step: the scale first, then one bar (or one pie edge) at a time. Quick Draw does it all at once.
  function drawStep(all) {
    const t = cur.task;
    cur.tries++;
    if (t.ask === 'dot') {
      const v = cur.dot.values, i = t.ticks.findIndex((x, j) => v[j] !== t.counts[j]);
      if (all) t.counts.forEach((c, j) => { v[j] = c; }); else if (i >= 0) v[i] = t.counts[i];
      if (!t.ticks.some((x, j) => v[j] !== t.counts[j])) { solved('That is the dot plot: one dot for each value.', true); freeze(); }
      else { drawDot(); say(`${esc(fmt(t.ticks[i]))} is in the list ${t.counts[i]} ${t.counts[i] === 1 ? 'time' : 'times'}: ${t.counts[i]} ${t.counts[i] === 1 ? 'dot' : 'dots'}.`, 'info'); }
      return;
    }
    if (t.ask === 'hist') {
      if (!cur.hist.w) { pickWidth(t.good); if (!all) return; }
      const { bins, counts } = t.binsOf(cur.hist.w), v = cur.hist.values, i = bins.findIndex((b, j) => v[j] !== counts[j]);
      if (all) counts.forEach((c, j) => { v[j] = c; }); else if (i >= 0) v[i] = counts[i];
      if (!bins.some((b, j) => v[j] !== counts[j])) { solved('That is the histogram: each bar counts the values in its range.', true); freeze(); }
      else { drawHist(); say(`${bins[i].label}: ${counts[i]} ${counts[i] === 1 ? 'value' : 'values'} from ${fmt(bins[i].a)} to ${fmt(bins[i].b)}.`, 'info'); }
      return;
    }
    if (t.ask === 'box') {
      // One handle at a time, middle out: the median, then Q1 and Q3, then the whiskers.
      const order = [2, 1, 3, 0, 4], NAMES = ['The lower whisker', 'Q1', 'The median', 'Q3', 'The upper whisker'], v = cur.box.values;
      const i = order.find(j => v[j] !== t.want[j]);
      if (all) t.want.forEach((x, j) => { v[j] = x; }); else if (i !== undefined) { v[i] = t.want[i]; for (let j = 0; j < 5; j++) if (j < i && v[j] > v[i]) v[j] = v[i]; else if (j > i && v[j] < v[i]) v[j] = v[i]; }
      if (!t.want.some((x, j) => v[j] !== x)) { solved('That is the box plot: the box is the middle half, and the whiskers reach the least and greatest values that aren’t outliers.', true); freeze(); }
      else { drawBox(); say(`${NAMES[i]}: ${fmt(t.want[i])}.`, 'info'); }
      return;
    }
    if (t.ask === 'line') {
      const v = cur.line.values, src = t.set.values, i = v.findIndex((x, j) => x === null || Math.abs(x - src[j]) > t.snap / 2 + 1e-9);
      const near = x => +(Math.round(x / t.snap) * t.snap).toFixed(6);
      if (all) src.forEach((x, j) => { v[j] = near(x); }); else if (i >= 0) v[i] = near(src[i]);
      if (!src.some((x, j) => v[j] === null || Math.abs(v[j] - x) > t.snap / 2 + 1e-9)) { solved('That is the line graph: a point for each value, joined in order.', true); freeze(); }
      else { drawLine(); say(`${esc(t.labels[i])}: ${fmt(src[i])}.`, 'info'); }
      return;
    }
    if (t.ask === 'stem') {
      const ins = stemInputs(), i = t.rows.findIndex(([s, l], j) => ins[j].value.replace(/[^0-9]/g, '') !== l.join(''));
      (all ? t.rows.map((r, j) => j) : [i]).forEach(j => { if (j >= 0) ins[j].value = t.rows[j][1].join(' '); });
      if (!t.rows.some(([s, l], j) => ins[j].value.replace(/[^0-9]/g, '') !== l.join(''))) { solved('That is the stem-and-leaf plot: every value has its leaf, in order.', true); freeze(); }
      else say(`Stem ${t.rows[i][0]}: ${t.rows[i][1].length ? t.rows[i][1].map(l => fmt(t.valueOf(t.rows[i][0], l))).join(', ') : 'no values'}, so the leaves are ${t.rows[i][1].join(' ') || 'none'}.`, 'info');
      return;
    }
    if (t.ask === 'bar') {
      if (!cur.bar.step) { pickStep(t.good); if (!all) return; }
      const i = t.cats.findIndex((c, j) => cur.bar.values[j] !== t.counts[j]);
      if (all) t.counts.forEach((c, j) => { cur.bar.values[j] = c; }); else if (i >= 0) cur.bar.values[i] = t.counts[i];
      drawBar();
      const left = t.cats.some((c, j) => cur.bar.values[j] !== t.counts[j]);
      if (!left) { solved(all ? 'Here is the bar graph: each bar reaches its count.' : 'That is the bar graph: each bar reaches its count.', true); drawBar(); }
      else say(`${esc(fmt(t.cats[i]))}: ${t.counts[i]}, so its bar goes up to ${t.counts[i]} on the scale.`, 'info');
    } else {
      const k = t.cats.length, i = all ? k - 1 : t.cats.findIndex((c, j) => cur.pie.values[j] !== t.counts[j]);
      const v = cur.pie.values = Displays.pieStep(cur.pie.values, t.counts, i);
      if (!t.cats.some((c, j) => v[j] !== t.counts[j])) { solved('That is the pie chart: each slice has as many parts as its count.', true); freeze(); }
      else { say(`${esc(fmt(t.cats[i]))}: ${t.counts[i]} of the ${t.n} parts.`, 'info'); Charts.pie($('chart-work'), { cats: t.cats, values: v, n: t.n, edit: true, onChange: () => { if (!cur.solved) say(''); } }); }
    }
  }

  // ---------- Choices ----------
  // A wrong pick stays focusable (aria-disabled, not disabled), so the student never loses their place.
  function pick(b) {
    if (cur.solved || b.getAttribute('aria-disabled') === 'true') return;
    const c = cur.task.choices[+b.dataset.c];
    if (c.right) {
      b.classList.add('right');
      $('work').querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-disabled', 'true'));
      solved(c.msg || 'Right!');
    } else {
      b.classList.add('wrong'); b.setAttribute('aria-disabled', 'true'); cur.tries++;
      say(c.msg || 'Not this one.', 'bad');
    }
  }
  function toggle(b) {
    if (cur.solved) return;
    b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
  }
  function checkMulti() {
    const t = cur.task, bs = [...$('work').querySelectorAll('[data-c]')];
    if (!bs.some(b => b.getAttribute('aria-pressed') === 'true')) { say('Choose at least one.', 'info'); return; }
    const ok = bs.every(b => (b.getAttribute('aria-pressed') === 'true') === !!t.choices[+b.dataset.c].right);
    if (ok) { bs.forEach(b => { if (t.choices[+b.dataset.c].right) b.classList.add('right'); b.setAttribute('aria-disabled', 'true'); }); solved(`Right! ${t.msg}`); return; }
    cur.tries++;
    say(cur.tries < 2 ? `Not quite. ${t.hints[0]}` : `Not quite. ${t.msg}`, 'bad');
  }

  // ---------- Tally ----------
  function tallySvg(n) {
    const groups = Math.ceil(n / 5), w = Math.max(1, groups) * 38;
    let s = '';
    for (let g = 0; g < groups; g++) {
      const k = Math.min(5, n - g * 5), x0 = g * 38 + 4;
      for (let j = 0; j < Math.min(4, k); j++) s += `<line x1="${x0 + j * 7}" y1="4" x2="${x0 + j * 7}" y2="24"/>`;
      if (k === 5) s += `<line class="slash" x1="${x0 - 3}" y1="20" x2="${x0 + 24}" y2="8"/>`;
    }
    return `<svg viewBox="0 0 ${w} 28" width="${w}" aria-hidden="true">${s}</svg>`;
  }
  function renderTally() {
    const t = cur.task, ty = cur.tally, done = ty.i >= t.set.values.length;
    $('work').innerHTML = `<div class="tally" role="group" aria-label="Tally rows">${t.cats.map((c, i) => `<button data-k="${i}"${done ? ' aria-disabled="true"' : ''} aria-label="${esc(fmt(c))}: ${ty.marks[i]} ${ty.marks[i] === 1 ? 'mark' : 'marks'}"><span class="name">${rowName(t.set, c)}</span>${tallySvg(ty.marks[i])}</button>`).join('')}</div>`;
    $('work').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => tallyTap(+b.dataset.k)));
  }
  function tallyTap(k, quiet) {
    const t = cur.task, ty = cur.tally, v = t.set.values;
    if (cur.solved || ty.i >= v.length) return;
    if (t.cats[k] !== v[ty.i]) { say(`That one is ${esc(fmt(v[ty.i]))}. Find its row.`, 'bad'); return; }
    ty.marks[k]++; ty.i++;
    renderData(); renderTally();
    if (!quiet) { const again = $('work').querySelector(`[data-k="${k}"]`); if (again) again.focus(); }
    if (ty.i === v.length) {
      const summary = t.cats.map((c, i) => `${fmt(c)}: ${ty.marks[i]}`).join(', ');
      solved(`Done! Every value is tallied (${esc(summary)}). The marks add up to ${v.length}, the number of values.`, cur.mode === 'lesson' && cur.phase === 'example');
    } else if (!quiet) say(`Next: ${esc(fmt(v[ty.i]))} (value ${ty.i + 1} of ${v.length}).`, 'info');
  }

  // ---------- Frequency table ----------
  function checkTable() {
    const t = cur.task, ins = [...$('work').querySelectorAll('[data-row]')], want = Stats.freq(t.set.values, t.cats);
    const read = s => (/^\s*\d+\s*$/.test(s) ? +s : null);
    const got = ins.map(i => read(i.value)), total = read($('total').value);
    if (got.some(g => g === null) || total === null) { say('Type a whole number in every row and in Total (0 if there are none).', 'info'); return; }
    const off = [], mark = (inp, ok) => { inp.parentElement.className = ok ? 'ok' : 'off'; inp.setAttribute('aria-invalid', ok ? 'false' : 'true'); };
    ins.forEach((inp, i) => { mark(inp, got[i] === want[i]); if (got[i] !== want[i]) off.push(fmt(t.cats[i])); });
    const totalOk = total === t.set.values.length;
    mark($('total'), totalOk);
    if (!off.length && totalOk) { ins.concat($('total')).forEach(i => { i.readOnly = true; }); solved(`Right! The counts add up to the total, ${total}.`); return; }
    cur.tries++;
    const sumOf = got.reduce((s, x) => s + x, 0), n = t.set.values.length;
    if (off.length) say(`Recount the ${off.length === 1 ? 'row' : 'rows'} for ${esc(andList(off))}.${sumOf !== n ? ` (Your counts add up to ${sumOf}, but there are ${n} values.)` : ''}`, 'bad');
    else say(total === sumOf ? 'The total is how many values there are.' : `The total is all the counts added: ${got.join(' + ')}.`, 'bad');
  }

  // ---------- Typed answers ----------
  function checkAnswer() {
    const box = $('answer'), r = cur.task.check(box.value);
    if (r.status === 'right') { box.readOnly = true; solved(r.msg); return; }
    if (r.status !== 'info') cur.tries++;
    say(esc(r.msg), KIND[r.status]);
  }
  function checkNow() {
    if (cur.solved) return;
    const a = cur.task.ask;
    if (a === 'answer') checkAnswer(); else if (a === 'multi') checkMulti(); else if (a === 'table') checkTable(); else if (DRAW.includes(a)) checkDrawing();
  }

  // ---------- Help: hints, and Show Next Step ----------
  function hint() {
    const h = cur.task.hints || [];
    if (!h.length) return;
    say(h[Math.min(cur.hintI, h.length - 1)], 'info');
    cur.hintI++;
  }
  function addStep(html, why) {
    $('steps').hidden = false;
    $('steps').insertAdjacentHTML('beforeend', `<li><span class="work">${html}</span><span class="why">${esc(why)}</span></li>`);
  }
  function step() {
    if (cur.solved) return;
    const t = cur.task;
    if (DRAW.includes(t.ask)) { drawStep(false); return; }
    cur.tries++;                                    // help used: it no longer counts as right on the first try
    if (t.ask === 'answer') {
      const s = t.steps[cur.stepI++];
      addStep(esc(s.html), s.why);
      if (cur.stepI >= t.steps.length) { $('answer').readOnly = true; solved(esc(t.answer), true); }
      else say(`Step ${cur.stepI} of ${t.steps.length}: ${esc(s.html)}. ${esc(s.why)}`, 'info');
    } else if (t.ask === 'choice') {
      const i = t.choices.findIndex(c => c.right), b = $('work').querySelector(`[data-c="${i}"]`);
      b.classList.add('shown');
      $('work').querySelectorAll('[data-c]').forEach(x => x.setAttribute('aria-disabled', 'true'));
      solved(t.answer || t.choices[i].msg, true);
    } else if (t.ask === 'multi') {
      $('work').querySelectorAll('[data-c]').forEach(b => { const right = t.choices[+b.dataset.c].right; b.setAttribute('aria-pressed', right ? 'true' : 'false'); if (right) b.classList.add('shown'); b.setAttribute('aria-disabled', 'true'); });
      solved(t.msg, true);
    } else if (t.ask === 'tally') {
      // One value at a time for the first five, then the rest the same way.
      const v = t.set.values, go = n => { for (let j = 0; j < n && cur.tally.i < v.length; j++) tallyTap(t.cats.indexOf(v[cur.tally.i]), true); };
      if (cur.stepI++ < 5) { const x = v[cur.tally.i]; go(1); if (!cur.solved) say(`${esc(fmt(x))}: one mark in its row.${cur.stepI === 5 ? ' Show Next Step tallies the rest.' : ''}`, 'info'); }
      else go(v.length);
    } else if (t.ask === 'table') {
      const ins = [...$('work').querySelectorAll('[data-row]')], want = Stats.freq(t.set.values, t.cats), i = cur.stepI++;
      if (i < ins.length) { ins[i].value = want[i]; say(`${esc(fmt(t.cats[i]))} appears ${want[i]} ${want[i] === 1 ? 'time' : 'times'}.`, 'info'); }
      else { $('total').value = t.set.values.length; ins.concat($('total')).forEach(x => { x.readOnly = true; }); solved(`That is the table: the counts add up to the total, ${t.set.values.length}.`, true); }
    }
  }

  // ---------- Finishing a task, and what comes next ----------
  function solved(msg, shown) {
    cur.solved = true; cur.solvedAt = Date.now();
    if (cur.mode === 'check' && !cur.tries && !shown) cur.score++;
    say(msg, shown ? 'info' : 'good');
    $('check').hidden = true; $('hint').hidden = true; $('step').hidden = true; $('quick').hidden = true; $('back').hidden = true;
    let label, label2 = '';
    if (cur.mode === 'lesson') label = cur.phase === 'example' ? 'Your Turn' : cur.ti + 1 < cur.lv.themes.length ? `Next: ${cur.lv.themes[cur.ti + 1].title}` : 'Check Your Understanding';
    else if (cur.mode === 'practice') label = 'Another One';
    else if (cur.mode === 'lab') { label = cur.labKind === 'quiz' ? 'Another Question' : 'Back to the Lab'; label2 = cur.labKind === 'quiz' ? 'Back to the Lab' : ''; }
    else label = cur.ci + 1 < cur.list.length ? 'Next Question' : 'Finish';
    $('next').textContent = label;
    $('next2').textContent = label2; $('next2').hidden = !label2;
    $('next-row').hidden = false;
    focus($('next'));
  }
  function next() {
    if (Date.now() - cur.solvedAt < 400) return;   // the key that solved it must not also press Next
    if (cur.mode === 'lesson') {
      if (cur.phase === 'example') yourTurn();
      else if (cur.ti + 1 < cur.lv.themes.length) startLevel(cur.lv.n, cur.ti + 1);
      else startCheck(cur.lv.n);
    } else if (cur.mode === 'practice') practiceOne();
    else if (cur.mode === 'lab') { if (cur.labKind === 'quiz') labWork('quiz'); else openLab(); }
    else if (cur.ci + 1 < cur.list.length) { cur.ci++; open(cur.list[cur.ci], `Check ${cur.ci + 1} of ${cur.list.length}`); }
    else finished();
  }
  function finished() {
    const n = cur.lv.n, nx = Tasks.level(n + 1), all = cur.list.length, s = cur.score;
    show('done');
    $('done-title').textContent = `Level ${n} Check: ${s} of ${all} Right on the First Try`;
    $('done-body').textContent = s === all ? (nx ? `You’re ready for Level ${nx.n}: ${nx.title}.` : 'You’re ready. Explore more in the Data Lab.') : 'Practice a few more, then try the check again.';
    $('done-next').hidden = !nx;
    $('done-next').textContent = nx ? `Go to Level ${nx.n}` : '';
    focus($('done-title'));
  }

  // ---------- Buttons ----------
  $('menu').addEventListener('click', home);
  $('go-lab').addEventListener('click', openLab);
  // The data on screen always matches the form: changing the data, a setting or the size makes new data at once.
  $('lab-sc').addEventListener('change', e => { lab.key = e.target.value; renderLabOpts(); makeLab(); });
  $('lab-opts').addEventListener('change', makeLab);
  $('lab-n').addEventListener('change', makeLab);
  $('lab-make').addEventListener('click', () => { makeLab(); $('lab-data').querySelector('.data').setAttribute('tabindex', '-1'); focus($('lab-data').querySelector('.data')); });
  $('lab-quiz').addEventListener('click', () => labWork('quiz'));
  $('lab-tally').addEventListener('click', () => labWork('tally'));
  $('lab-build').addEventListener('click', () => labWork('build'));
  $('lab-bar').addEventListener('click', () => labWork('bar'));
  for (const d of ['pie', 'dot', 'hist', 'stem', 'box', 'line']) $('lab-' + d).addEventListener('click', () => labWork(d));
  $('quick').addEventListener('click', () => { if (!cur.solved) drawStep(true); });
  $('check').addEventListener('click', checkNow);
  $('hint').addEventListener('click', hint);
  $('step').addEventListener('click', step);
  $('back').addEventListener('click', openLab);
  $('next').addEventListener('click', next);
  $('next2').addEventListener('click', openLab);
  $('done-next').addEventListener('click', () => startLevel(cur.lv.n + 1));
  $('done-again').addEventListener('click', () => startCheck(cur.lv.n));
  $('done-practice').addEventListener('click', () => startPractice(cur.lv.n));
  $('done-menu').addEventListener('click', home);

  // ---------- Starting: the link's #options (or, in the preview, the frame's name) pick the screen ----------
  // No options: the Data Lab. level=N: that level's lesson (start=practice or start=check for those).
  renderHome(); renderLabForm(); renderLearn();
  (function route() {
    const h = new URLSearchParams((location.hash || '').replace(/^#/, '') || (window.name && window.name.includes('=') ? window.name : ''));
    const n = +h.get('level'), st = h.get('start');
    if (n && Tasks.level(n)) (st === 'practice' ? startPractice(n) : st === 'check' ? startCheck(n) : startLevel(n));
    else if (st === 'menu') home();
    else openLab();
  })();
  booting = false;
})();
